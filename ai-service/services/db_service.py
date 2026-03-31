import os
import json
import logging
from contextlib import contextmanager
from typing import Optional

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

# Module-level connection pool, initialized lazily
_pool: Optional[psycopg2.pool.ThreadedConnectionPool] = None


def _get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    """Return (and lazily create) the module-level connection pool."""
    global _pool
    if _pool is None:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise RuntimeError("DATABASE_URL environment variable is not set")
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=database_url,
        )
        logger.info("Database connection pool created")
    return _pool


@contextmanager
def _get_connection():
    """Context manager that borrows a connection from the pool and returns it."""
    connection_pool = _get_pool()
    conn = connection_pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        connection_pool.putconn(conn)


def _ensure_table(conn) -> None:
    """Create the face_encodings table (and pgvector extension) if they do not exist."""
    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS face_encodings (
                id          SERIAL PRIMARY KEY,
                student_id  VARCHAR(255) NOT NULL,
                encoding    vector(128)  NOT NULL,
                photo_url   TEXT,
                created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS face_encodings_student_id_idx "
            "ON face_encodings (student_id);"
        )


def save_encoding(student_id: str, encoding: list[float], photo_url: str) -> bool:
    """
    Persist a single 128-dimensional face encoding for *student_id*.

    Parameters
    ----------
    student_id : str
        Unique identifier of the student.
    encoding   : list[float]
        128-element face-encoding vector produced by face_recognition.
    photo_url  : str
        Source URL of the photo this encoding was derived from.

    Returns
    -------
    bool
        True on success, False if an error occurred.
    """
    try:
        with _get_connection() as conn:
            _ensure_table(conn)
            # pgvector accepts a Python list serialised as a string '[x, y, ...]'
            encoding_str = "[" + ",".join(str(v) for v in encoding) + "]"
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO face_encodings (student_id, encoding, photo_url)
                    VALUES (%s, %s::vector, %s)
                    """,
                    (student_id, encoding_str, photo_url),
                )
        logger.debug("Saved encoding for student %s", student_id)
        return True
    except Exception as exc:
        logger.error("Failed to save encoding for student %s: %s", student_id, exc)
        return False


def get_encodings_for_class(
    student_ids: list[str],
) -> dict[str, list[list[float]]]:
    """
    Retrieve all stored face encodings for the given list of student IDs.

    Parameters
    ----------
    student_ids : list[str]
        The student IDs whose encodings should be fetched.

    Returns
    -------
    dict[str, list[list[float]]]
        Mapping of student_id -> list of 128-element encoding vectors.
        Students with no stored encodings are omitted from the result.
    """
    if not student_ids:
        return {}

    result: dict[str, list[list[float]]] = {}

    try:
        with _get_connection() as conn:
            _ensure_table(conn)
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT student_id, encoding::text AS encoding_text
                    FROM   face_encodings
                    WHERE  student_id = ANY(%s)
                    ORDER  BY student_id, created_at
                    """,
                    (student_ids,),
                )
                rows = cur.fetchall()

        for row in rows:
            sid = row["student_id"]
            # pgvector returns encodings as a string like '[0.1,0.2,...]'
            raw = row["encoding_text"].strip("[]")
            encoding = [float(v) for v in raw.split(",")]

            if sid not in result:
                result[sid] = []
            result[sid].append(encoding)

        logger.debug(
            "Loaded encodings for %d/%d students", len(result), len(student_ids)
        )
    except Exception as exc:
        logger.error("Failed to load encodings for class: %s", exc)

    return result

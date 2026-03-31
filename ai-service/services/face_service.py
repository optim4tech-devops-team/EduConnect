import io
import logging
from typing import Optional

import numpy as np
import requests
from PIL import Image
import face_recognition

logger = logging.getLogger(__name__)

# Default request timeout (seconds) when downloading images
_DOWNLOAD_TIMEOUT = 15


def _download_image_as_array(url: str) -> Optional[np.ndarray]:
    """
    Download an image from *url* and return it as an RGB numpy array suitable
    for the face_recognition library.

    Returns None when the download or decoding fails.
    """
    try:
        response = requests.get(url, timeout=_DOWNLOAD_TIMEOUT)
        response.raise_for_status()
        image = Image.open(io.BytesIO(response.content)).convert("RGB")
        return np.array(image)
    except requests.RequestException as exc:
        logger.error("Failed to download image from %s: %s", url, exc)
        return None
    except Exception as exc:
        logger.error("Failed to decode image from %s: %s", url, exc)
        return None


def encode_faces_from_url(photo_url: str) -> list[list[float]]:
    """
    Download the image at *photo_url*, detect all faces, and return a list of
    128-dimensional face encodings (one per detected face).

    Parameters
    ----------
    photo_url : str
        Publicly accessible URL of an image file.

    Returns
    -------
    list[list[float]]
        A (possibly empty) list of 128-element encoding vectors.
    """
    image_array = _download_image_as_array(photo_url)
    if image_array is None:
        logger.warning("encode_faces_from_url: could not load image from %s", photo_url)
        return []

    face_locations = face_recognition.face_locations(image_array, model="hog")
    if not face_locations:
        logger.info("encode_faces_from_url: no faces detected in %s", photo_url)
        return []

    encodings = face_recognition.face_encodings(image_array, known_face_locations=face_locations)
    logger.info(
        "encode_faces_from_url: detected %d face(s) in %s", len(encodings), photo_url
    )
    return [enc.tolist() for enc in encodings]


def match_faces(
    group_photo_url: str,
    known_encodings: dict[str, list[list[float]]],
    tolerance: float = 0.5,
) -> list[tuple[str, float]]:
    """
    Detect all faces in *group_photo_url* and match each one against the
    encodings stored in *known_encodings*.

    Parameters
    ----------
    group_photo_url : str
        URL of the group photo to analyse.
    known_encodings : dict[str, list[list[float]]]
        Mapping of student_id -> list of known 128-dim encoding vectors.
    tolerance : float
        Maximum Euclidean distance to consider a face a match (lower is
        stricter). Defaults to 0.5.

    Returns
    -------
    list[tuple[str, float]]
        List of (student_id, confidence_score) tuples for every face that
        matched a known student.  Confidence is computed as
        ``1 - min_distance`` so that a perfect match gives 1.0.
        Faces that do not match any known student are not included in the
        returned list; the caller can infer unknown-face counts from the
        difference between total detected faces and matches returned.
    """
    image_array = _download_image_as_array(group_photo_url)
    if image_array is None:
        logger.warning("match_faces: could not load group photo from %s", group_photo_url)
        return []

    face_locations = face_recognition.face_locations(image_array, model="hog")
    if not face_locations:
        logger.info("match_faces: no faces detected in %s", group_photo_url)
        return []

    unknown_encodings = face_recognition.face_encodings(
        image_array, known_face_locations=face_locations
    )
    logger.info(
        "match_faces: detected %d face(s) in group photo %s",
        len(unknown_encodings),
        group_photo_url,
    )

    # Flatten known encodings into parallel lists for fast comparison
    all_known_ids: list[str] = []
    all_known_vectors: list[np.ndarray] = []
    for student_id, enc_list in known_encodings.items():
        for enc in enc_list:
            all_known_ids.append(student_id)
            all_known_vectors.append(np.array(enc))

    if not all_known_vectors:
        logger.warning("match_faces: known_encodings is empty – no matches possible")
        return []

    matched: list[tuple[str, float]] = []

    for unknown_enc in unknown_encodings:
        unknown_np = np.array(unknown_enc)

        # Compute Euclidean distances to every known vector
        distances = face_recognition.face_distance(all_known_vectors, unknown_np)

        best_idx = int(np.argmin(distances))
        best_distance = float(distances[best_idx])

        if best_distance <= tolerance:
            best_student_id = all_known_ids[best_idx]
            confidence = round(1.0 - best_distance, 4)
            matched.append((best_student_id, confidence))
            logger.debug(
                "match_faces: face matched student %s with confidence %.4f",
                best_student_id,
                confidence,
            )
        else:
            logger.debug(
                "match_faces: face could not be matched (best distance=%.4f > tolerance=%.4f)",
                best_distance,
                tolerance,
            )

    return matched

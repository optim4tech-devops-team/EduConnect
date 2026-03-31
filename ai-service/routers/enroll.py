import logging
import os

from fastapi import APIRouter, Header, HTTPException, status

from models.schemas import EnrollRequest, EnrollResponse
from services import face_service, db_service

logger = logging.getLogger(__name__)

router = APIRouter()


def _validate_api_key(x_api_key: str | None) -> None:
    """Raise HTTP 401 when the provided key does not match AI_SERVICE_API_KEY."""
    expected = os.getenv("AI_SERVICE_API_KEY", "")
    if not expected:
        # No key configured – allow all requests (useful for local dev)
        return
    if x_api_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )


@router.post(
    "/enroll",
    response_model=EnrollResponse,
    summary="Enroll a student's face encodings",
    description=(
        "Accepts one or more photo URLs for a student, extracts all face encodings "
        "from each photo, and persists them to the database."
    ),
)
async def enroll(
    request: EnrollRequest,
    x_api_key: str | None = Header(default=None, alias="X-Api-Key"),
) -> EnrollResponse:
    _validate_api_key(x_api_key)

    if not request.photo_urls:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="photo_urls must not be empty",
        )

    total_saved = 0
    errors: list[str] = []

    for photo_url in request.photo_urls:
        try:
            encodings = face_service.encode_faces_from_url(photo_url)
        except Exception as exc:
            logger.error(
                "enroll: error encoding faces from %s for student %s: %s",
                photo_url,
                request.student_id,
                exc,
            )
            errors.append(f"Failed to process {photo_url}: {exc}")
            continue

        if not encodings:
            logger.warning(
                "enroll: no faces found in %s for student %s", photo_url, request.student_id
            )
            errors.append(f"No faces detected in {photo_url}")
            continue

        for encoding in encodings:
            saved = db_service.save_encoding(request.student_id, encoding, photo_url)
            if saved:
                total_saved += 1
            else:
                errors.append(f"Failed to save encoding from {photo_url}")

    success = total_saved > 0
    if errors:
        message = f"Enrolled {total_saved} encoding(s). Issues: {'; '.join(errors)}"
    else:
        message = f"Successfully enrolled {total_saved} encoding(s) for student {request.student_id}"

    logger.info(
        "enroll: student=%s saved=%d success=%s", request.student_id, total_saved, success
    )

    return EnrollResponse(
        success=success,
        encodings_count=total_saved,
        message=message,
    )

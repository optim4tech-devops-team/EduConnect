import logging
import os

from fastapi import APIRouter, Header, HTTPException, status

from models.schemas import RecognizeRequest, RecognizeResponse, StudentMatch
from services import face_service, db_service

logger = logging.getLogger(__name__)

router = APIRouter()


def _validate_api_key(x_api_key: str | None) -> None:
    """Raise HTTP 401 when the provided key does not match AI_SERVICE_API_KEY."""
    expected = os.getenv("AI_SERVICE_API_KEY", "")
    if not expected:
        return
    if x_api_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )


@router.post(
    "/recognize",
    response_model=RecognizeResponse,
    summary="Recognize students in a group photo",
    description=(
        "Loads stored face encodings for the specified class students, detects all "
        "faces in the provided group photo, and returns the matched student IDs with "
        "confidence scores along with counts for unknown faces and total faces."
    ),
)
async def recognize(
    request: RecognizeRequest,
    x_api_key: str | None = Header(default=None, alias="X-Api-Key"),
) -> RecognizeResponse:
    _validate_api_key(x_api_key)

    if not request.class_student_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="class_student_ids must not be empty",
        )

    # 1. Load known encodings for all students in the class
    known_encodings = db_service.get_encodings_for_class(request.class_student_ids)
    if not known_encodings:
        logger.warning(
            "recognize: no stored encodings found for class %s (post=%s)",
            request.class_id,
            request.post_id,
        )
        # Still attempt recognition – it will simply return zero matches
        known_encodings = {}

    # 2. Run face matching against the group photo
    try:
        raw_matches = face_service.match_faces(
            group_photo_url=request.photo_url,
            known_encodings=known_encodings,
        )
    except Exception as exc:
        logger.error(
            "recognize: face matching failed for post=%s class=%s: %s",
            request.post_id,
            request.class_id,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Face recognition error: {exc}",
        )

    # 3. Determine total faces detected in the photo so we can report unknowns.
    #    We re-use encode_faces_from_url which performs the same HOG detection.
    try:
        all_face_encodings = face_service.encode_faces_from_url(request.photo_url)
        total_faces_detected = len(all_face_encodings)
    except Exception as exc:
        logger.warning(
            "recognize: could not re-count total faces for post=%s: %s",
            request.post_id,
            exc,
        )
        # Fall back to using the number of matched faces as a lower bound
        total_faces_detected = len(raw_matches)

    matched_count = len(raw_matches)
    unknown_faces_count = max(0, total_faces_detected - matched_count)

    matches = [
        StudentMatch(student_id=student_id, confidence=confidence)
        for student_id, confidence in raw_matches
    ]

    logger.info(
        "recognize: post=%s class=%s total=%d matched=%d unknown=%d",
        request.post_id,
        request.class_id,
        total_faces_detected,
        matched_count,
        unknown_faces_count,
    )

    return RecognizeResponse(
        matches=matches,
        unknown_faces_count=unknown_faces_count,
        total_faces_detected=total_faces_detected,
    )

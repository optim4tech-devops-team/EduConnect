from pydantic import BaseModel


class EnrollRequest(BaseModel):
    student_id: str
    photo_urls: list[str]


class EnrollResponse(BaseModel):
    success: bool
    encodings_count: int
    message: str


class RecognizeRequest(BaseModel):
    post_id: str
    photo_url: str
    class_student_ids: list[str]
    class_id: str


class StudentMatch(BaseModel):
    student_id: str
    confidence: float


class RecognizeResponse(BaseModel):
    matches: list[StudentMatch]
    unknown_faces_count: int
    total_faces_detected: int


class HealthResponse(BaseModel):
    status: str
    version: str

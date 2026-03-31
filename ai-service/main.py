import logging
import os

from dotenv import load_dotenv

# Load .env file before anything else so all env vars are available
load_dotenv()

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from models.schemas import HealthResponse
from routers import enroll, recognize

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="EduLink AI Service",
    description="Face enrollment and recognition service for the EduLink platform.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
_raw_origins = os.getenv("CORS_ORIGINS", "*")
allowed_origins: list[str] = (
    [o.strip() for o in _raw_origins.split(",") if o.strip()]
    if _raw_origins != "*"
    else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# API-key middleware
# ---------------------------------------------------------------------------
# Paths that are always allowed without an API key
_PUBLIC_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}


class ApiKeyMiddleware(BaseHTTPMiddleware):
    """Reject requests that do not carry the correct X-Api-Key header.

    The check is skipped when AI_SERVICE_API_KEY is not configured (handy for
    local development) and for the paths listed in _PUBLIC_PATHS.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        expected_key = os.getenv("AI_SERVICE_API_KEY", "")

        # No key configured → allow everything
        if not expected_key:
            return await call_next(request)

        # Public paths are always allowed
        if request.url.path in _PUBLIC_PATHS:
            return await call_next(request)

        provided_key = request.headers.get("X-Api-Key")
        if provided_key != expected_key:
            logger.warning(
                "ApiKeyMiddleware: rejected request to %s – invalid or missing X-Api-Key",
                request.url.path,
            )
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or missing API key"},
            )

        return await call_next(request)


app.add_middleware(ApiKeyMiddleware)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(enroll.router, tags=["Enrollment"])
app.include_router(recognize.router, tags=["Recognition"])

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    tags=["Health"],
)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", version="1.0.0")

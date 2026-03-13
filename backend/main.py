"""
Tengen — FastAPI application entry point.

Responsibilities:
- App factory
- Middleware registration (security headers, CORS, Request ID)
- Exception handler registration
- Router registration
- DB initialisation on startup
"""

import uuid
import contextvars
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import init_db
from core.config import get_settings
from core.exceptions import AppException, app_exception_handler
from core.logger import get_logger, request_id_var
from auth.router import router as auth_router
from vault.router import router as vault_router
from tools.router import router as tools_router

logger = get_logger(__name__)
settings = get_settings()


# ---------------------------------------------------------------------------
# Lifespan — startup / shutdown
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Starting %s v%s | debug=%s",
        settings.APP_NAME, settings.APP_VERSION, settings.DEBUG,
    )
    init_db()
    yield
    logger.info("%s shutting down", settings.APP_NAME)


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Self-hostable, privacy-first password manager. All data encrypted at rest.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ---------------------------------------------------------------------------
# Middleware — order matters: outermost first
# ---------------------------------------------------------------------------

# 1. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 2. Request ID + Security Headers (custom middleware)
@app.middleware("http")
async def request_lifecycle_middleware(request: Request, call_next):
    # Generate and bind request ID for this request's lifetime
    req_id = str(uuid.uuid4())[:8]  # short 8-char prefix for readability
    token = request_id_var.set(req_id)

    logger.info(
        "→ %s %s",
        request.method,
        request.url.path,
    )

    try:
        response = await call_next(request)
    except Exception as exc:
        logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
        raise
    finally:
        request_id_var.reset(token)

    # Attach security headers
    response.headers["X-Request-ID"] = req_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Content-Security-Policy"] = "default-src 'self'"

    logger.info(
        "← %s %s %d",
        request.method,
        request.url.path,
        response.status_code,
    )
    return response


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------

app.add_exception_handler(AppException, app_exception_handler)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred"},
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(auth_router)
app.include_router(vault_router)
app.include_router(tools_router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["System"], include_in_schema=True)
async def health():
    """Basic liveness check — used by Docker health checks."""
    return {"status": "ok", "version": settings.APP_VERSION}

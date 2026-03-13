from fastapi import Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    """Base application exception. Always returns a consistent JSON error body."""

    def __init__(self, status_code: int, detail: str, log_message: str | None = None):
        self.status_code = status_code
        self.detail = detail
        # log_message can carry internal context not exposed to the client
        self.log_message = log_message or detail
        super().__init__(detail)


class NotFoundException(AppException):
    def __init__(self, resource: str = "Resource"):
        super().__init__(404, f"{resource} not found")


class UnauthorizedException(AppException):
    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(401, detail)


class ForbiddenException(AppException):
    def __init__(self, detail: str = "Access denied"):
        super().__init__(403, detail)


class ConflictException(AppException):
    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(409, detail)


class UnprocessableException(AppException):
    def __init__(self, detail: str = "Unprocessable request"):
        super().__init__(422, detail)


class ServiceUnavailableException(AppException):
    def __init__(self, detail: str = "External service unavailable"):
        super().__init__(503, detail)


# ---------------------------------------------------------------------------
# FastAPI exception handler — registered in main.py
# ---------------------------------------------------------------------------

async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

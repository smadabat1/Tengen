"""
Centralized logging configuration for Tengen backend.

Features:
- Hourly rotating log files (TimedRotatingFileHandler, when="h")
- Separate app log (INFO+) and error log (ERROR+)
- Console output when DEBUG=True
- Request-ID injected into every log line via contextvars + logging.Filter
- Usage: from core.logger import get_logger; logger = get_logger(__name__)
"""

import logging
import os
import contextvars
from logging.handlers import TimedRotatingFileHandler

# ---------------------------------------------------------------------------
# Request ID context variable
# Set by RequestIDMiddleware on every incoming request.
# ---------------------------------------------------------------------------
request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id", default="-"
)


class RequestIDFilter(logging.Filter):
    """Injects the current request_id into every LogRecord."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get("-")
        return True


# ---------------------------------------------------------------------------
# Log format
# Example: 2026-03-13 14:32:01.123 | INFO     | auth.service:login:45 | [req_id=abc123] message
# ---------------------------------------------------------------------------
LOG_FORMAT = (
    "%(asctime)s.%(msecs)03d | %(levelname)-8s | "
    "%(name)s:%(funcName)s:%(lineno)d | "
    "[req_id=%(request_id)s] %(message)s"
)
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Track which loggers have already been configured to avoid duplicate handlers
_configured_loggers: set[str] = set()
_root_configured = False


def _get_log_dir() -> str:
    """Resolve log directory from env or default."""
    return os.environ.get("LOG_DIR", "/app/logs")


def _build_timed_handler(filepath: str, level: int) -> TimedRotatingFileHandler:
    handler = TimedRotatingFileHandler(
        filename=filepath,
        when="h",          # rotate every hour
        interval=1,
        backupCount=168,   # retain 7 days (24 × 7)
        encoding="utf-8",
        utc=True,
    )
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT))
    handler.addFilter(RequestIDFilter())
    return handler


def _configure_root_logger() -> None:
    """Set up root logger with file handlers once."""
    global _root_configured
    if _root_configured:
        return
    _root_configured = True

    log_dir = _get_log_dir()
    os.makedirs(log_dir, exist_ok=True)

    root = logging.getLogger()
    root.setLevel(logging.DEBUG)

    # App log — INFO and above
    app_handler = _build_timed_handler(
        os.path.join(log_dir, "app.log"), logging.INFO
    )
    root.addHandler(app_handler)

    # Error log — ERROR and above only
    error_handler = _build_timed_handler(
        os.path.join(log_dir, "error.log"), logging.ERROR
    )
    root.addHandler(error_handler)

    # Console output when DEBUG env var is set
    debug_mode = os.environ.get("DEBUG", "false").lower() in ("true", "1", "yes")
    if debug_mode:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.DEBUG)
        console_handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT))
        console_handler.addFilter(RequestIDFilter())
        root.addHandler(console_handler)

    # Silence noisy third-party loggers
    for noisy in ("uvicorn.access", "sqlalchemy.engine", "httpx", "httpcore"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Return a configured logger for the given module name.

    Usage:
        from core.logger import get_logger
        logger = get_logger(__name__)
    """
    _configure_root_logger()
    logger = logging.getLogger(name)
    # Ensure the RequestIDFilter is on each logger too (belt-and-suspenders)
    if name not in _configured_loggers:
        logger.addFilter(RequestIDFilter())
        _configured_loggers.add(name)
    return logger

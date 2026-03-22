"""
FastAPI dependencies for authentication.

get_current_user — decodes JWT, retrieves encryption key from session cache,
                   returns (User, encryption_key) tuple for use in protected routes.
"""

from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jwt.exceptions import InvalidTokenError
from sqlalchemy.orm import Session

from database import get_db
from models import User
from core.session_cache import session_cache
from core.exceptions import UnauthorizedException
from core.security import SecurityService
from core.logger import get_logger

logger = get_logger(__name__)

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> tuple[User, bytes]:
    """
    FastAPI dependency used by all protected routes.

    Returns:
        (User ORM object, encryption_key bytes)

    Raises:
        UnauthorizedException — missing/invalid/expired token, or session not in cache
    """
    if credentials is None:
        raise UnauthorizedException("Authorization header missing")

    token = credentials.credentials

    # 1. Decode and validate JWT signature + expiry
    try:
        payload = SecurityService.decode_access_token(token)
    except InvalidTokenError as exc:
        logger.warning("JWT decode failed: %s", str(exc))
        raise UnauthorizedException("Invalid or expired token")

    user_id_str: str | None = payload.get("sub")
    if not user_id_str:
        raise UnauthorizedException("Token missing subject claim")

    # 2. Load user from DB
    try:
        user_id = int(user_id_str)
    except ValueError:
        raise UnauthorizedException("Invalid token subject")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        logger.warning("Authenticated user id=%s not found in DB", user_id_str)
        raise UnauthorizedException("User account not found")

    # 3. Retrieve encryption key from session cache
    encryption_key = session_cache.get(token)
    if encryption_key is None:
        logger.warning("Session key missing for user id=%d — token expired or logged out", user_id)
        raise UnauthorizedException("Session expired. Please log in again.")

    return user, encryption_key

async def get_current_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> tuple[User, bytes, str]:
    """Like get_current_user but also returns the raw bearer token."""
    user, key = await get_current_user(credentials, db)
    token = credentials.credentials if credentials else ""
    return user, key, token

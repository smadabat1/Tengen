"""
Auth router — thin controller.
All logic delegated to AuthService.
"""

from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from schemas import RegisterRequest, RegisterResponse, LoginRequest, LoginResponse, LogoutResponse
from auth.service import AuthService
from core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])
_bearer = HTTPBearer(auto_error=False)


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(
    body: RegisterRequest,
    db: Session = Depends(get_db),
):
    """Create a new user account. Does NOT issue a token — user must login separately."""
    return AuthService.register(body.username, body.master_password, db)


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    db: Session = Depends(get_db),
):
    """Verify master password and return a JWT access token."""
    return AuthService.login(body.username, body.master_password, db)


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
):
    """
    Revoke the session by clearing the encryption key from the in-memory cache.
    Token invalidation is client-side (discard the token); cache removal is server-side.
    """
    token = credentials.credentials if credentials else ""
    return AuthService.logout(token)

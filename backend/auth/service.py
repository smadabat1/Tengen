"""
AuthService — handles user registration, login, and logout.

All business logic lives here; the router is a thin controller.
"""

from sqlalchemy.orm import Session

from models import User
from schemas import RegisterResponse, LoginResponse, LogoutResponse
from core.security import SecurityService
from core.session_cache import session_cache
from core.exceptions import ConflictException, UnauthorizedException
from core.logger import get_logger

logger = get_logger(__name__)


class AuthService:

    # ------------------------------------------------------------------
    # Register
    # ------------------------------------------------------------------

    @staticmethod
    def register(username: str, master_password: str, db: Session) -> RegisterResponse:
        """
        Create a new user account.

        Steps:
        1. Ensure username is unique
        2. Generate two independent salts (auth_salt, encryption_salt)
        3. Derive Argon2id auth hash and store with both salts
        """
        # 1. Uniqueness check
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            logger.warning("Registration failed — username already taken: %s", username)
            raise ConflictException("Username is already taken")

        # 2. Generate salts
        auth_salt = SecurityService.generate_salt()
        encryption_salt = SecurityService.generate_salt()

        # 3. Hash master password
        auth_hash = SecurityService.derive_auth_hash(master_password, auth_salt)

        # 4. Persist user
        user = User(
            username=username,
            auth_hash=auth_hash,
            auth_salt=auth_salt,
            encryption_salt=encryption_salt,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        logger.info("User registered successfully: username=%s id=%d", username, user.id)
        return RegisterResponse(message="Account created. Please log in.")

    # ------------------------------------------------------------------
    # Login
    # ------------------------------------------------------------------

    @staticmethod
    def login(username: str, master_password: str, db: Session) -> LoginResponse:
        """
        Authenticate a user and issue a JWT.

        Steps:
        1. Look up user by username
        2. Verify master password against stored Argon2id hash
        3. Derive the AES encryption key from master password + encryption_salt
        4. Create JWT
        5. Store derived key in session cache keyed by JWT token
        """
        # 1. Look up user
        user = db.query(User).filter(User.username == username).first()
        if not user:
            logger.warning("Login failed — unknown username: %s", username)
            raise UnauthorizedException("Invalid username or password")

        # 2. Verify password
        if not SecurityService.verify_auth_hash(master_password, user.auth_salt, user.auth_hash):
            logger.warning("Login failed — wrong password for username: %s", username)
            raise UnauthorizedException("Invalid username or password")

        # 3. Derive encryption key (never stored in DB or JWT)
        encryption_key = SecurityService.derive_encryption_key(master_password, user.encryption_salt)

        # 4. Create JWT
        token = SecurityService.create_access_token(
            subject=str(user.id),
            username=user.username,
        )

        # 5. Cache the encryption key for this session
        session_cache.store(token, encryption_key)

        logger.info("User logged in: username=%s id=%d", username, user.id)
        return LoginResponse(
            access_token=token,
            token_type="bearer",
            username=user.username,
        )

    # ------------------------------------------------------------------
    # Logout
    # ------------------------------------------------------------------

    @staticmethod
    def logout(token: str) -> LogoutResponse:
        """
        Revoke the session by removing the encryption key from cache.
        JWT validation is stateless; clearing the cache is the security action.
        """
        revoked = session_cache.revoke(token)
        if revoked:
            logger.info("User logged out — session key revoked")
        else:
            logger.debug("Logout called but no active session found in cache")
        return LogoutResponse(message="Logged out successfully")

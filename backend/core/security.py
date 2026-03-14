"""
SecurityService — wraps all cryptographic primitives.

Responsibilities:
- Generating random salts
- Argon2id auth hashing and verification (login credential check)
- Deriving a 256-bit AES encryption key from the master password (never stored)
- JWT creation and decoding
"""

import os
import base64
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from argon2.low_level import hash_secret_raw, Type
import jwt

from core.config import get_settings
from core.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

# Argon2id hasher — parameters come from settings
_ph = PasswordHasher(
    time_cost=settings.ARGON2_TIME_COST,
    memory_cost=settings.ARGON2_MEMORY_COST,
    parallelism=settings.ARGON2_PARALLELISM,
)


class SecurityService:
    """Stateless service — all methods are static or class-level."""

    # ------------------------------------------------------------------
    # Salt generation
    # ------------------------------------------------------------------

    @staticmethod
    def generate_salt() -> str:
        """Generate a cryptographically random 32-byte salt, base64-encoded."""
        return base64.b64encode(os.urandom(32)).decode()

    # ------------------------------------------------------------------
    # Auth hashing (Argon2id)
    # ------------------------------------------------------------------

    @staticmethod
    def derive_auth_hash(password: str, salt: str) -> str:
        """
        Hash the master password concatenated with auth_salt using Argon2id.
        The result is stored in the DB and used to verify logins.
        """
        return _ph.hash(password + salt)

    @staticmethod
    def verify_auth_hash(password: str, salt: str, stored_hash: str) -> bool:
        """
        Verify a login attempt against the stored Argon2id hash.
        Returns False on any mismatch; never raises.
        """
        try:
            return _ph.verify(stored_hash, password + salt)
        except (VerifyMismatchError, VerificationError, InvalidHashError):
            return False
        except Exception as exc:
            logger.error("Unexpected error during auth hash verification: %s", exc, exc_info=True)
            return False

    # ------------------------------------------------------------------
    # Encryption key derivation (Argon2id raw)
    # ------------------------------------------------------------------

    @staticmethod
    def derive_encryption_key(password: str, encryption_salt: str) -> bytes:
        """
        Derive a 256-bit AES key from the master password using Argon2id (raw mode).
        This key is NEVER stored — it lives only in the in-memory session cache.
        """
        salt_bytes = base64.b64decode(encryption_salt)
        key = hash_secret_raw(
            secret=password.encode(),
            salt=salt_bytes,
            time_cost=settings.ARGON2_TIME_COST,
            memory_cost=settings.ARGON2_MEMORY_COST,
            parallelism=settings.ARGON2_PARALLELISM,
            hash_len=32,
            type=Type.ID,
        )
        logger.debug("Encryption key derived for login")
        return key

    # ------------------------------------------------------------------
    # JWT
    # ------------------------------------------------------------------

    @staticmethod
    def create_access_token(subject: str, username: str) -> str:
        """
        Create a signed JWT.
        subject  — typically the user ID (str) used as the `sub` claim.
        username — stored as a convenience claim for the frontend.
        """
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": subject,
            "username": username,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        logger.debug("JWT created for subject=%s", subject)
        return token

    @staticmethod
    def decode_access_token(token: str) -> dict:
        """
        Decode and validate a JWT.
        Returns the payload dict.
        Raises InvalidTokenError (from python-jose) on any validation failure.
        """
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

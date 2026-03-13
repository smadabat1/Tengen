"""
EncryptionService — AES-256-GCM encryption/decryption for vault fields.

Rules enforced here:
- Every encrypt() call generates a fresh random 96-bit IV (never reused)
- One IV is stored per Entry row; username, password, and notes share it
- All ciphertext and IVs are base64-encoded for safe DB storage
- Decryption failures raise ValueError with a log — never silently return garbage
"""

import os
import base64

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag

from core.logger import get_logger

logger = get_logger(__name__)


class EncryptionService:
    """Stateless AES-256-GCM encrypt/decrypt service."""

    # ------------------------------------------------------------------
    # Encrypt
    # ------------------------------------------------------------------

    @staticmethod
    def encrypt(plaintext: str, key: bytes) -> tuple[str, str]:
        """
        Encrypt a plaintext string with AES-256-GCM.

        Returns:
            (ciphertext_b64, iv_b64)

        The IV is randomly generated per call — callers should persist it alongside
        the ciphertext so decryption is possible later.
        """
        iv = os.urandom(12)  # 96-bit IV as per NIST recommendation for AES-GCM
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
        return (
            base64.b64encode(ciphertext).decode("ascii"),
            base64.b64encode(iv).decode("ascii"),
        )

    @staticmethod
    def encrypt_fields(
        key: bytes,
        *,
        password: str,
        username: str | None = None,
        notes: str | None = None,
    ) -> dict:
        """
        Encrypt all sensitive entry fields using a shared IV.

        Returns a dict with keys:
            encrypted_password, username (encrypted), notes (encrypted), iv
        """
        # Generate one IV for this entry row — shared across all encrypted fields
        iv = os.urandom(12)
        iv_b64 = base64.b64encode(iv).decode("ascii")
        aesgcm = AESGCM(key)

        def _enc(plaintext: str) -> str:
            ct = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
            return base64.b64encode(ct).decode("ascii")

        return {
            "encrypted_password": _enc(password),
            "username": _enc(username) if username is not None else None,
            "notes": _enc(notes) if notes is not None else None,
            "iv": iv_b64,
        }

    # ------------------------------------------------------------------
    # Decrypt
    # ------------------------------------------------------------------

    @staticmethod
    def decrypt(ciphertext_b64: str, iv_b64: str, key: bytes) -> str:
        """
        Decrypt a single AES-256-GCM ciphertext.

        Raises:
            ValueError — if decryption fails (wrong key, corrupted data, tampered tag)
        """
        try:
            ciphertext = base64.b64decode(ciphertext_b64)
            iv = base64.b64decode(iv_b64)
            aesgcm = AESGCM(key)
            plaintext = aesgcm.decrypt(iv, ciphertext, None)
            return plaintext.decode("utf-8")
        except InvalidTag as exc:
            logger.error("AES-GCM tag verification failed — possible key mismatch or data corruption")
            raise ValueError("Decryption failed: authentication tag mismatch") from exc
        except Exception as exc:
            logger.error("Unexpected decryption error: %s", exc, exc_info=True)
            raise ValueError(f"Decryption failed: {exc}") from exc

    @staticmethod
    def decrypt_fields(
        key: bytes,
        *,
        encrypted_password: str,
        iv: str,
        username: str | None = None,
        notes: str | None = None,
    ) -> dict:
        """
        Decrypt all sensitive fields for an entry row.

        Returns a dict with keys: password, username, notes (all plaintext).
        """
        aesgcm = AESGCM(key)
        iv_bytes = base64.b64decode(iv)

        def _dec(ciphertext_b64: str) -> str:
            ct = base64.b64decode(ciphertext_b64)
            return aesgcm.decrypt(iv_bytes, ct, None).decode("utf-8")

        try:
            return {
                "password": _dec(encrypted_password),
                "username": _dec(username) if username is not None else None,
                "notes": _dec(notes) if notes is not None else None,
            }
        except InvalidTag as exc:
            logger.error("AES-GCM tag verification failed during field decryption", exc_info=True)
            raise ValueError("Decryption failed: authentication tag mismatch") from exc
        except Exception as exc:
            logger.error("Field decryption error: %s", exc, exc_info=True)
            raise ValueError(f"Field decryption failed: {exc}") from exc

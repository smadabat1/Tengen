"""
HIBPClient — Have I Been Pwned k-anonymity password check.

Privacy guarantee:
- Only the first 5 hex characters of SHA1(password) are sent to HIBP.
- The full hash or plaintext password NEVER leaves the machine.
- The suffix is compared locally.

Reference: https://haveibeenpwned.com/API/v3#PwnedPasswords
"""

import hashlib
from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from models import Entry
from vault.encryption import EncryptionService
from core.logger import get_logger

logger = get_logger(__name__)

HIBP_API_URL = "https://api.pwnedpasswords.com/range/{prefix}"
REQUEST_TIMEOUT = 10  # seconds


class HIBPClient:

    # ------------------------------------------------------------------
    # Core k-anonymity check
    # ------------------------------------------------------------------

    @staticmethod
    async def check_password(password: str) -> bool:
        """
        Check if a password appears in any known data breach.

        Uses k-anonymity: sends only the first 5 chars of the SHA1 hash.
        Returns True if the password is pwned, False if clean or unreachable.
        """
        sha1 = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
        prefix, suffix = sha1[:5], sha1[5:]

        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
                response = await client.get(
                    HIBP_API_URL.format(prefix=prefix),
                    headers={"Add-Padding": "true"},  # Reduces traffic analysis
                )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "HIBP API returned HTTP %d for prefix=%s",
                exc.response.status_code, prefix,
            )
            return False
        except httpx.RequestError as exc:
            logger.warning("HIBP API request failed: %s", str(exc))
            return False

        # Each line: SUFFIX:count (may have extra columns — use >= 2)
        for line in response.text.splitlines():
            parts = line.strip().split(":")
            if len(parts) >= 2 and parts[0] == suffix:
                try:
                    count = int(parts[1])
                except ValueError:
                    count = 0
                if count > 0:
                    logger.info("HIBP: password found in %d breach(es)", count)
                    return True

        return False

    # ------------------------------------------------------------------
    # Entry-level update (called as BackgroundTask from vault router)
    # ------------------------------------------------------------------

    @staticmethod
    async def check_and_update_entry(
        entry_id: int,
        user_id: int,
        key: bytes,
        db: Session,
    ) -> None:
        """
        Fetch the entry, decrypt the password, run HIBP check, update the entry.
        Designed to run as a FastAPI BackgroundTask — never raises to the caller.
        """
        try:
            entry = db.query(Entry).filter(
                Entry.id == entry_id,
                Entry.user_id == user_id,
            ).first()

            if entry is None:
                logger.warning("HIBP: entry_id=%d not found, skipping check", entry_id)
                return

            decrypted = EncryptionService.decrypt_fields(
                key,
                encrypted_password=entry.encrypted_password,
                iv=entry.iv,
            )

            pwned = await HIBPClient.check_password(decrypted["password"])

            entry.hibp_pwned = pwned
            entry.hibp_checked_at = datetime.now(timezone.utc)
            db.commit()

            logger.info(
                "HIBP check complete: entry_id=%d pwned=%s",
                entry_id, pwned,
            )
        except Exception as exc:
            logger.error(
                "HIBP background task failed for entry_id=%d: %s",
                entry_id, exc, exc_info=True,
            )

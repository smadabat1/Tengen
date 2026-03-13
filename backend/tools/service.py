"""
ToolsService — password generation, strength checking, and vault health summary.
"""

import secrets
import string
from datetime import datetime, timezone, timedelta

import zxcvbn as _zxcvbn
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session

from models import Entry, HealthSnapshot, HibpRun
from schemas import (
    GeneratePasswordRequest, GeneratePasswordResponse,
    StrengthCheckRequest, StrengthCheckResponse,
    HealthSummaryResponse,
    HealthSnapshotCreate, HibpRunCreate,
)
from vault.encryption import EncryptionService
from core.exceptions import UnprocessableException
from core.logger import get_logger

logger = get_logger(__name__)

_STRENGTH_LABELS = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"]

# Age threshold for "old" entries
_OLD_THRESHOLD_DAYS = 90


class ToolsService:

    # ------------------------------------------------------------------
    # Password generator
    # ------------------------------------------------------------------

    @staticmethod
    def generate_password(data: GeneratePasswordRequest) -> GeneratePasswordResponse:
        """
        Generate a cryptographically random password.
        At least one character type must be enabled.
        """
        charset = ""
        if data.uppercase:
            charset += string.ascii_uppercase
        if data.lowercase:
            charset += string.ascii_lowercase
        if data.digits:
            charset += string.digits
        if data.symbols:
            charset += "!@#$%^&*()_+-=[]{}|;:,.<>?"

        if not charset:
            raise UnprocessableException("At least one character type must be selected")

        # Guarantee at least one character from each selected category
        guaranteed: list[str] = []
        if data.uppercase:
            guaranteed.append(secrets.choice(string.ascii_uppercase))
        if data.lowercase:
            guaranteed.append(secrets.choice(string.ascii_lowercase))
        if data.digits:
            guaranteed.append(secrets.choice(string.digits))
        if data.symbols:
            guaranteed.append(secrets.choice("!@#$%^&*()_+-=[]{}|;:,.<>?"))

        remaining = data.length - len(guaranteed)
        rest = [secrets.choice(charset) for _ in range(remaining)]

        password_chars = guaranteed + rest
        secrets.SystemRandom().shuffle(password_chars)
        password = "".join(password_chars)

        logger.debug("Password generated: length=%d", data.length)
        return GeneratePasswordResponse(password=password)

    # ------------------------------------------------------------------
    # Strength check
    # ------------------------------------------------------------------

    @staticmethod
    def check_strength(data: StrengthCheckRequest) -> StrengthCheckResponse:
        """Run zxcvbn password strength analysis."""
        result = _zxcvbn.zxcvbn(data.password)
        score = result["score"]
        label = _STRENGTH_LABELS[score]

        feedback_items: list[str] = []
        if result["feedback"]["warning"]:
            feedback_items.append(result["feedback"]["warning"])
        feedback_items.extend(result["feedback"]["suggestions"])

        crack_time = result["crack_times_display"].get(
            "offline_slow_hashing_1e4_per_second", "unknown"
        )

        return StrengthCheckResponse(
            score=score,
            label=label,
            feedback=feedback_items,
            crack_time_display=crack_time,
        )

    # ------------------------------------------------------------------
    # Vault health summary
    # ------------------------------------------------------------------

    @staticmethod
    def get_health_summary(user_id: int, key: bytes, db: Session) -> HealthSummaryResponse:
        """
        Compute health metrics across all vault entries for a user.

        - weak   : strength_score < 2
        - pwned  : hibp_pwned = True
        - reused : duplicate plaintext passwords (detected via hash comparison)
        - old    : updated_at older than 90 days
        """
        entries = db.query(Entry).filter(Entry.user_id == user_id).all()
        total = len(entries)
        weak = 0
        pwned = 0
        old = 0
        password_hashes: dict[str, int] = {}    # sha256 -> occurrence count
        entry_pw_hashes: dict[int, str] = {}    # entry_id -> sha256
        reused = 0

        threshold = datetime.now(timezone.utc) - timedelta(days=_OLD_THRESHOLD_DAYS)

        for entry in entries:
            # Weak
            if entry.strength_score is not None and entry.strength_score < 2:
                weak += 1

            # Pwned
            if entry.hibp_pwned:
                pwned += 1

            # Old — compare timezone-aware datetimes
            updated = entry.updated_at
            if updated is not None:
                if updated.tzinfo is None:
                    updated = updated.replace(tzinfo=timezone.utc)
                if updated < threshold:
                    old += 1

            # Reused — decrypt password once and hash it for comparison
            try:
                import hashlib
                decrypted = EncryptionService.decrypt_fields(
                    key,
                    encrypted_password=entry.encrypted_password,
                    iv=entry.iv,
                )
                pw_hash = hashlib.sha256(decrypted["password"].encode()).hexdigest()
                entry_pw_hashes[entry.id] = pw_hash
                password_hashes[pw_hash] = password_hashes.get(pw_hash, 0) + 1
            except Exception as exc:
                logger.warning("Health: could not decrypt entry_id=%d: %s", entry.id, exc)

        # Count entries sharing a password with at least one other entry
        reused_hashes = {h for h, c in password_hashes.items() if c > 1}
        reused = sum(1 for h in entry_pw_hashes.values() if h in reused_hashes)

        logger.info(
            "Health summary for user_id=%d: total=%d weak=%d pwned=%d reused=%d old=%d",
            user_id, total, weak, pwned, reused, old,
        )
        return HealthSummaryResponse(
            total=total, weak=weak, pwned=pwned, reused=reused, old=old,
        )

    # ------------------------------------------------------------------
    # Health snapshot history
    # ------------------------------------------------------------------

    @staticmethod
    def save_health_snapshot(user_id: int, data: HealthSnapshotCreate, db: Session) -> HealthSnapshot:
        """
        Persist a health snapshot. Skips if last snapshot was within 60 seconds.
        Trims to the most recent 30 snapshots per user.
        """
        last = (
            db.query(HealthSnapshot)
            .filter(HealthSnapshot.user_id == user_id)
            .order_by(desc(HealthSnapshot.created_at))
            .first()
        )
        if last:
            age = (datetime.utcnow() - last.created_at).total_seconds()
            if age < 60:
                return last

        snap = HealthSnapshot(user_id=user_id, **data.model_dump())
        db.add(snap)
        db.commit()
        db.refresh(snap)

        # Trim: keep only the 30 most recent
        old_ids = (
            db.query(HealthSnapshot.id)
            .filter(HealthSnapshot.user_id == user_id)
            .order_by(asc(HealthSnapshot.created_at))
            .offset(30)
            .all()
        )
        if old_ids:
            db.query(HealthSnapshot).filter(
                HealthSnapshot.id.in_([r.id for r in old_ids])
            ).delete(synchronize_session=False)
            db.commit()

        return snap

    @staticmethod
    def get_health_history(user_id: int, db: Session) -> list[HealthSnapshot]:
        """Return all snapshots for a user, oldest first."""
        return (
            db.query(HealthSnapshot)
            .filter(HealthSnapshot.user_id == user_id)
            .order_by(asc(HealthSnapshot.created_at))
            .all()
        )

    # ------------------------------------------------------------------
    # HIBP run history
    # ------------------------------------------------------------------

    @staticmethod
    def save_hibp_run(user_id: int, data: HibpRunCreate, db: Session) -> HibpRun:
        """
        Persist a completed HIBP batch run.
        Trims to the most recent 20 runs per user.
        """
        run = HibpRun(user_id=user_id, **data.model_dump())
        db.add(run)
        db.commit()
        db.refresh(run)

        # Trim: keep only the 20 most recent
        old_ids = (
            db.query(HibpRun.id)
            .filter(HibpRun.user_id == user_id)
            .order_by(asc(HibpRun.created_at))
            .offset(20)
            .all()
        )
        if old_ids:
            db.query(HibpRun).filter(
                HibpRun.id.in_([r.id for r in old_ids])
            ).delete(synchronize_session=False)
            db.commit()

        return run

    @staticmethod
    def get_hibp_runs(user_id: int, db: Session) -> list[HibpRun]:
        """Return all HIBP runs for a user, newest first."""
        return (
            db.query(HibpRun)
            .filter(HibpRun.user_id == user_id)
            .order_by(desc(HibpRun.created_at))
            .all()
        )



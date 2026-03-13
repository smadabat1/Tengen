"""
VaultService — full CRUD for vault entries.

Responsibilities:
- Encrypt sensitive fields on create/update
- Decrypt sensitive fields on every read
- Filtering, searching, and sorting
- Ownership enforcement (users can only access their own entries)
- zxcvbn strength scoring on create/update
- Triggering async HIBP check as a FastAPI BackgroundTask
"""

import json
from datetime import datetime, timezone

import zxcvbn as _zxcvbn
from sqlalchemy.orm import Session

from models import Entry
from schemas import (
    EntryCreateRequest, EntryUpdateRequest, EntryResponse, TagsResponse,
)
from vault.encryption import EncryptionService
from core.exceptions import NotFoundException, ForbiddenException
from core.logger import get_logger

logger = get_logger(__name__)


def _to_response(entry: Entry, key: bytes) -> EntryResponse:
    """Decrypt an Entry ORM object into an EntryResponse schema."""
    decrypted = EncryptionService.decrypt_fields(
        key,
        encrypted_password=entry.encrypted_password,
        iv=entry.iv,
        username=entry.username,
        notes=entry.notes,
    )
    return EntryResponse(
        id=entry.id,
        title=entry.title,
        username=decrypted["username"],
        password=decrypted["password"],
        url=entry.url,
        notes=decrypted["notes"],
        tags=json.loads(entry.tags or "[]"),
        strength_score=entry.strength_score,
        hibp_pwned=entry.hibp_pwned,
        hibp_checked_at=entry.hibp_checked_at,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


class VaultService:

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    @staticmethod
    def create_entry(
        user_id: int,
        data: EntryCreateRequest,
        key: bytes,
        db: Session,
    ) -> EntryResponse:
        # Encrypt sensitive fields
        encrypted = EncryptionService.encrypt_fields(
            key,
            password=data.password,
            username=data.username,
            notes=data.notes,
        )

        # Password strength score
        result = _zxcvbn.zxcvbn(data.password)
        strength_score = result["score"]

        entry = Entry(
            user_id=user_id,
            title=data.title,
            url=data.url,
            tags=json.dumps(data.tags),
            username=encrypted["username"],
            encrypted_password=encrypted["encrypted_password"],
            notes=encrypted["notes"],
            iv=encrypted["iv"],
            strength_score=strength_score,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)

        logger.info("Entry created: id=%d user_id=%d title=%r", entry.id, user_id, entry.title)
        return _to_response(entry, key)

    # ------------------------------------------------------------------
    # List
    # ------------------------------------------------------------------

    @staticmethod
    def list_entries(
        user_id: int,
        key: bytes,
        db: Session,
        *,
        tag: str | None = None,
        search: str | None = None,
        sort: str = "created_at",
        order: str = "desc",
    ) -> list[EntryResponse]:
        query = db.query(Entry).filter(Entry.user_id == user_id)

        # Tag filter — stored as JSON array in text column
        if tag:
            query = query.filter(Entry.tags.like(f'%"{tag}"%'))

        # Title / URL search
        if search:
            like = f"%{search}%"
            query = query.filter(
                (Entry.title.ilike(like)) | (Entry.url.ilike(like))
            )

        # Sorting
        allowed_sort = {"created_at", "updated_at", "title"}
        sort_col = sort if sort in allowed_sort else "created_at"
        col = getattr(Entry, sort_col)
        query = query.order_by(col.desc() if order == "desc" else col.asc())

        entries = query.all()
        logger.info("Listed %d entries for user_id=%d", len(entries), user_id)
        return [_to_response(e, key) for e in entries]

    # ------------------------------------------------------------------
    # Get single
    # ------------------------------------------------------------------

    @staticmethod
    def get_entry(entry_id: int, user_id: int, key: bytes, db: Session) -> EntryResponse:
        entry = db.query(Entry).filter(Entry.id == entry_id).first()
        if not entry:
            raise NotFoundException("Entry")
        if entry.user_id != user_id:
            raise ForbiddenException()
        return _to_response(entry, key)

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    @staticmethod
    def update_entry(
        entry_id: int,
        user_id: int,
        data: EntryUpdateRequest,
        key: bytes,
        db: Session,
    ) -> EntryResponse:
        entry = db.query(Entry).filter(Entry.id == entry_id).first()
        if not entry:
            raise NotFoundException("Entry")
        if entry.user_id != user_id:
            raise ForbiddenException()

        # Determine which fields need re-encryption
        current = EncryptionService.decrypt_fields(
            key,
            encrypted_password=entry.encrypted_password,
            iv=entry.iv,
            username=entry.username,
            notes=entry.notes,
        )

        new_password = data.password if data.password is not None else current["password"]
        new_username = data.username if data.username is not None else current["username"]
        new_notes = data.notes if data.notes is not None else current["notes"]

        # Re-encrypt all sensitive fields with a fresh IV
        encrypted = EncryptionService.encrypt_fields(
            key,
            password=new_password,
            username=new_username,
            notes=new_notes,
        )

        if data.title is not None:
            entry.title = data.title
        if data.url is not None:
            entry.url = data.url
        if data.tags is not None:
            entry.tags = json.dumps(data.tags)

        entry.username = encrypted["username"]
        entry.encrypted_password = encrypted["encrypted_password"]
        entry.notes = encrypted["notes"]
        entry.iv = encrypted["iv"]
        entry.updated_at = datetime.now(timezone.utc)

        # Recalculate strength
        result = _zxcvbn.zxcvbn(new_password)
        entry.strength_score = result["score"]

        db.commit()
        db.refresh(entry)

        logger.info("Entry updated: id=%d user_id=%d", entry_id, user_id)
        return _to_response(entry, key)

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    @staticmethod
    def delete_entry(entry_id: int, user_id: int, db: Session) -> None:
        entry = db.query(Entry).filter(Entry.id == entry_id).first()
        if not entry:
            raise NotFoundException("Entry")
        if entry.user_id != user_id:
            raise ForbiddenException()
        db.delete(entry)
        db.commit()
        logger.info("Entry deleted: id=%d user_id=%d", entry_id, user_id)

    # ------------------------------------------------------------------
    # Tags
    # ------------------------------------------------------------------

    @staticmethod
    def list_tags(user_id: int, db: Session) -> TagsResponse:
        rows = db.query(Entry.tags).filter(Entry.user_id == user_id).all()
        tag_set: set[str] = set()
        for (tags_json,) in rows:
            try:
                tags = json.loads(tags_json or "[]")
                tag_set.update(tags)
            except (json.JSONDecodeError, TypeError):
                pass
        return TagsResponse(tags=sorted(tag_set))

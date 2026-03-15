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

import csv
import io
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
    # Export / Import
    # ------------------------------------------------------------------

    @staticmethod
    def get_all_entries_raw(user_id: int, key: bytes, db: Session) -> list[dict]:
        """Return all entries for a user as a list of plaintext dicts (for export)."""
        entries = db.query(Entry).filter(Entry.user_id == user_id).all()
        result = []
        for e in entries:
            decrypted = EncryptionService.decrypt_fields(
                key,
                encrypted_password=e.encrypted_password,
                iv=e.iv,
                username=e.username,
                notes=e.notes,
            )
            result.append({
                "title": e.title,
                "username": decrypted["username"],
                "password": decrypted["password"],
                "url": e.url,
                "notes": decrypted["notes"],
                "tags": json.loads(e.tags or "[]"),
                "created_at": e.created_at.isoformat() if e.created_at else None,
                "updated_at": e.updated_at.isoformat() if e.updated_at else None,
            })
        logger.info("Exported %d raw entries for user_id=%d", len(result), user_id)
        return result

    @staticmethod
    def bulk_create_entries(user_id: int, key: bytes, entries: list[dict], db: Session) -> int:
        """Encrypt and insert a list of plaintext entry dicts. Returns count inserted."""
        count = 0
        for data in entries:
            password = (data.get("password") or "")[:4096]
            if not password:
                continue
            username = (data.get("username") or None)
            if username is not None:
                username = username[:512] or None
            notes = (data.get("notes") or None)
            if notes is not None:
                notes = notes[:10000] or None
            raw_tags = data.get("tags") or []
            tags = [t.strip().lower()[:64] for t in raw_tags if t.strip()][:20]
            encrypted = EncryptionService.encrypt_fields(
                key,
                password=password,
                username=username,
                notes=notes,
            )
            result = _zxcvbn.zxcvbn(password)
            entry = Entry(
                user_id=user_id,
                title=(data.get("title") or "Untitled")[:256],
                url=(data.get("url") or None) and data["url"][:2048],
                tags=json.dumps(tags),
                username=encrypted["username"],
                encrypted_password=encrypted["encrypted_password"],
                notes=encrypted["notes"],
                iv=encrypted["iv"],
                strength_score=result["score"],
            )
            db.add(entry)
            count += 1
        db.commit()
        logger.info("Bulk imported %d entries for user_id=%d", count, user_id)
        return count

    @staticmethod
    def entries_to_bitwarden(entries: list[dict]) -> dict:
        """Convert a list of plaintext entry dicts to Bitwarden unencrypted JSON format."""
        items = []
        for e in entries:
            uris = []
            if e.get("url"):
                uris.append({"match": None, "uri": e["url"]})
            items.append({
                "type": 1,  # Login
                "name": e.get("title") or "Untitled",
                "notes": e.get("notes"),
                "login": {
                    "username": e.get("username"),
                    "password": e.get("password"),
                    "uris": uris,
                },
                "fields": [],
            })
        return {"encrypted": False, "items": items}

    # ------------------------------------------------------------------
    # External import parsing
    # ------------------------------------------------------------------

    @staticmethod
    def parse_external_import(fmt: str, data: str) -> tuple[list[dict], int]:
        """
        Parse an external password manager export into a normalised list of
        entry dicts.  Returns (entries, skipped_count).

        Normalised dict keys: title, username, password, url, notes
        """
        if fmt == "bitwarden_json":
            return VaultService._parse_bitwarden_json(data)
        return VaultService._parse_csv(fmt, data)

    @staticmethod
    def _parse_bitwarden_json(data: str) -> tuple[list[dict], int]:
        payload = json.loads(data)
        items = payload.get("items") or []
        entries, skipped = [], 0
        for item in items:
            if item.get("type") != 1:          # only Login items
                skipped += 1
                continue
            login = item.get("login") or {}
            password = login.get("password") or ""
            if not password:
                skipped += 1
                continue
            uris = login.get("uris") or []
            url = uris[0].get("uri") if uris else None
            entries.append({
                "title":    item.get("name") or "Untitled",
                "username": login.get("username"),
                "password": password,
                "url":      url,
                "notes":    item.get("notes"),
            })
        return entries, skipped

    # Column mappings: format → {our_key: [possible_csv_headers, ...]}
    _CSV_MAPS: dict[str, dict[str, list[str]]] = {
        "csv_chrome":    {"title": ["name"], "username": ["username"], "password": ["password"], "url": ["url"], "notes": []},
        "csv_lastpass":  {"title": ["name"], "username": ["username"], "password": ["password"], "url": ["url"], "notes": ["extra"]},
        "csv_1password": {"title": ["title"], "username": ["username"], "password": ["password"], "url": ["url", "login_uri"], "notes": ["notes"]},
        "csv_dashlane":  {"title": ["title"], "username": ["username"], "password": ["password"], "url": ["url"], "notes": ["note"]},
        "csv_keepass":   {"title": ["account", "title"], "username": ["login name", "username"], "password": ["password"], "url": ["web site", "url"], "notes": ["comments", "notes"]},
        "csv_generic":   {"title": ["title", "name", "account", "label"], "username": ["username", "login", "email", "login name"], "password": ["password", "pass"], "url": ["url", "uri", "website", "web site", "login_uri"], "notes": ["notes", "note", "comments", "extra"]},
    }

    @staticmethod
    def _parse_csv(fmt: str, data: str) -> tuple[list[dict], int]:
        mapping = VaultService._CSV_MAPS.get(fmt) or VaultService._CSV_MAPS["csv_generic"]
        reader = csv.DictReader(io.StringIO(data))
        if not reader.fieldnames:
            return [], 0

        # Build a lowercase header → actual header lookup once
        header_lower = {h.strip().lower(): h for h in reader.fieldnames}

        def _pick(candidates: list[str]) -> str | None:
            for c in candidates:
                if c in header_lower:
                    return header_lower[c]
            return None

        col = {k: _pick(v) for k, v in mapping.items()}

        entries, skipped = [], 0
        for row in reader:
            password = (row.get(col["password"]) or "").strip() if col["password"] else ""
            if not password:
                skipped += 1
                continue
            entries.append({
                "title":    (row.get(col["title"]) or "").strip() if col["title"] else None,
                "username": (row.get(col["username"]) or "").strip() if col["username"] else None,
                "password": password,
                "url":      (row.get(col["url"]) or "").strip() if col["url"] else None,
                "notes":    (row.get(col["notes"]) or "").strip() if col["notes"] else None,
            })
        return entries, skipped

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

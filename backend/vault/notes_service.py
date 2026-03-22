import base64
import hashlib
import json
import os
from datetime import datetime, timezone
from typing import Any

from argon2.low_level import hash_secret_raw, Type
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sqlalchemy.orm import Session, joinedload

from core.config import get_settings
from core.exceptions import ConflictException, ForbiddenException, NotFoundException
from models import NoteFolder, NoteTag, NoteTagLink, VaultNote
from schemas import (
    NoteCreateRequest,
    NoteFolderCreateRequest,
    NoteFolderResponse,
    NoteFolderUpdateRequest,
    NoteFoldersResponse,
    NoteLockRequest,
    NoteLockResponse,
    NoteResponse,
    NoteTagResponse,
    NoteTagsResponse,
    NoteUnlockRequest,
    NoteUpdateRequest,
)
from vault.encryption import EncryptionService
from vault.notes_unlock_cache import notes_unlock_cache

settings = get_settings()


class NotesService:
    GENERAL_FOLDER_NAME = "General"

    @staticmethod
    def _encrypt_with_iv(plaintext: str, key: bytes, iv_bytes: bytes) -> str:
        ct = AESGCM(key).encrypt(iv_bytes, plaintext.encode("utf-8"), None)
        return base64.b64encode(ct).decode("ascii")

    @staticmethod
    def _decrypt_with_iv(ciphertext_b64: str, key: bytes, iv_b64: str) -> str:
        iv = base64.b64decode(iv_b64)
        ct = base64.b64decode(ciphertext_b64)
        pt = AESGCM(key).decrypt(iv, ct, None)
        return pt.decode("utf-8")

    @staticmethod
    def _derive_lock_key(secret: str, lock_salt_b64: str) -> bytes:
        salt_bytes = base64.b64decode(lock_salt_b64)
        return hash_secret_raw(
            secret=secret.encode(),
            salt=salt_bytes,
            time_cost=settings.ARGON2_TIME_COST,
            memory_cost=settings.ARGON2_MEMORY_COST,
            parallelism=settings.ARGON2_PARALLELISM,
            hash_len=32,
            type=Type.ID,
        )

    @staticmethod
    def _verifier(lock_key: bytes) -> str:
        return base64.b64encode(hashlib.sha256(lock_key).digest()).decode("ascii")

    @staticmethod
    def _ensure_general_folder(user_id: int, key: bytes, db: Session) -> NoteFolder:
        folder = (
            db.query(NoteFolder)
            .filter(NoteFolder.user_id == user_id, NoteFolder.is_default.is_(True))
            .first()
        )
        if folder:
            return folder

        enc_name, iv = EncryptionService.encrypt(NotesService.GENERAL_FOLDER_NAME, key)
        folder = NoteFolder(
            user_id=user_id,
            name_encrypted=enc_name,
            iv=iv,
            is_default=True,
        )
        db.add(folder)
        db.commit()
        db.refresh(folder)
        return folder

    @staticmethod
    def _folder_name(folder: NoteFolder, key: bytes) -> str:
        return EncryptionService.decrypt(folder.name_encrypted, folder.iv, key)

    @staticmethod
    def _note_tag_names(note: VaultNote, key: bytes) -> list[str]:
        names: list[str] = []
        for link in note.tag_links:
            names.append(EncryptionService.decrypt(link.tag.name_encrypted, link.tag.iv, key))
        return sorted(set(names))

    @staticmethod
    def _extract_search_text(content: Any) -> str:
        if content is None:
            return ""
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            return " ".join(NotesService._extract_search_text(x) for x in content)
        if isinstance(content, dict):
            parts: list[str] = []
            for value in content.values():
                parts.append(NotesService._extract_search_text(value))
            return " ".join(parts)
        return str(content)

    @staticmethod
    def _parse_content(content_json: str) -> Any:
        try:
            return json.loads(content_json)
        except json.JSONDecodeError:
            return {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": content_json}]}]}

    @staticmethod
    def _serialize_content(content: Any) -> str:
        return json.dumps(content if content is not None else {}, separators=(",", ":"))

    @staticmethod
    def _load_note(entry_id: int, user_id: int, db: Session) -> VaultNote:
        note = (
            db.query(VaultNote)
            .options(
                joinedload(VaultNote.folder),
                joinedload(VaultNote.tag_links).joinedload(NoteTagLink.tag),
            )
            .filter(VaultNote.id == entry_id)
            .first()
        )
        if not note:
            raise NotFoundException("Note")
        if note.user_id != user_id:
            raise ForbiddenException()
        return note

    @staticmethod
    def _maybe_get_note_key(note: VaultNote, token: str) -> bytes | None:
        if not note.is_locked:
            return None
        return notes_unlock_cache.get(token, note.id)

    @staticmethod
    def _decrypt_note_content(note: VaultNote, vault_key: bytes, token: str) -> tuple[Any | None, bool]:
        if note.is_locked:
            note_key = NotesService._maybe_get_note_key(note, token)
            if note_key is None:
                return None, False
            raw = NotesService._decrypt_with_iv(note.content_encrypted, note_key, note.iv)
            return NotesService._parse_content(raw), True

        raw = NotesService._decrypt_with_iv(note.content_encrypted, vault_key, note.iv)
        return NotesService._parse_content(raw), True

    @staticmethod
    def _to_note_response(note: VaultNote, key: bytes, token: str) -> NoteResponse:
        title = NotesService._decrypt_with_iv(note.title_encrypted, key, note.iv)
        folder_name = NotesService._folder_name(note.folder, key)
        tags = NotesService._note_tag_names(note, key)
        content, unlocked = NotesService._decrypt_note_content(note, key, token)
        return NoteResponse(
            id=note.id,
            title=title,
            content=content,
            folder_id=note.folder_id,
            folder_name=folder_name,
            tags=tags,
            is_locked=note.is_locked,
            is_unlocked=unlocked,
            created_at=note.created_at,
            updated_at=note.updated_at,
        )

    @staticmethod
    def _get_folder(folder_id: int, user_id: int, db: Session) -> NoteFolder:
        folder = db.query(NoteFolder).filter(NoteFolder.id == folder_id).first()
        if not folder:
            raise NotFoundException("Folder")
        if folder.user_id != user_id:
            raise ForbiddenException()
        return folder

    @staticmethod
    def _tag_lookup(user_id: int, key: bytes, db: Session) -> dict[str, NoteTag]:
        tags = db.query(NoteTag).filter(NoteTag.user_id == user_id).all()
        result: dict[str, NoteTag] = {}
        for tag in tags:
            name = EncryptionService.decrypt(tag.name_encrypted, tag.iv, key)
            result[name.lower()] = tag
        return result

    @staticmethod
    def _attach_tags(note: VaultNote, tag_names: list[str], user_id: int, key: bytes, db: Session) -> None:
        normalized = sorted(set(t.strip().lower() for t in tag_names if t.strip()))

        # clear current links
        db.query(NoteTagLink).filter(NoteTagLink.note_id == note.id).delete(synchronize_session=False)

        if not normalized:
            return

        existing = NotesService._tag_lookup(user_id, key, db)

        for name in normalized:
            tag = existing.get(name)
            if tag is None:
                enc, iv = EncryptionService.encrypt(name, key)
                tag = NoteTag(user_id=user_id, name_encrypted=enc, iv=iv)
                db.add(tag)
                db.flush()
                existing[name] = tag
            db.add(NoteTagLink(note_id=note.id, tag_id=tag.id))

    @staticmethod
    def _cleanup_orphan_tags(user_id: int, db: Session) -> None:
        tags = db.query(NoteTag).filter(NoteTag.user_id == user_id).all()
        for tag in tags:
            exists = db.query(NoteTagLink).filter(NoteTagLink.tag_id == tag.id).first()
            if not exists:
                db.delete(tag)

    @staticmethod
    def list_folders(user_id: int, key: bytes, db: Session) -> NoteFoldersResponse:
        NotesService._ensure_general_folder(user_id, key, db)
        folders = (
            db.query(NoteFolder)
            .filter(NoteFolder.user_id == user_id)
            .order_by(NoteFolder.is_default.desc(), NoteFolder.created_at.asc())
            .all()
        )

        folder_ids = [f.id for f in folders]
        counts: dict[int, int] = {fid: 0 for fid in folder_ids}
        if folder_ids:
            rows = db.query(VaultNote.folder_id).filter(VaultNote.user_id == user_id, VaultNote.folder_id.in_(folder_ids)).all()
            for (fid,) in rows:
                counts[fid] = counts.get(fid, 0) + 1

        return NoteFoldersResponse(
            folders=[
                NoteFolderResponse(
                    id=f.id,
                    name=NotesService._folder_name(f, key),
                    is_default=f.is_default,
                    note_count=counts.get(f.id, 0),
                    created_at=f.created_at,
                    updated_at=f.updated_at,
                )
                for f in folders
            ]
        )

    @staticmethod
    def create_folder(user_id: int, body: NoteFolderCreateRequest, key: bytes, db: Session) -> NoteFolderResponse:
        NotesService._ensure_general_folder(user_id, key, db)
        existing = NotesService.list_folders(user_id, key, db).folders
        if body.name.strip().lower() in {f.name.strip().lower() for f in existing}:
            raise ConflictException("Folder name already exists")

        enc_name, iv = EncryptionService.encrypt(body.name.strip(), key)
        folder = NoteFolder(user_id=user_id, name_encrypted=enc_name, iv=iv, is_default=False)
        db.add(folder)
        db.commit()
        db.refresh(folder)

        return NoteFolderResponse(
            id=folder.id,
            name=body.name.strip(),
            is_default=False,
            note_count=0,
            created_at=folder.created_at,
            updated_at=folder.updated_at,
        )

    @staticmethod
    def update_folder(folder_id: int, user_id: int, body: NoteFolderUpdateRequest, key: bytes, db: Session) -> NoteFolderResponse:
        folder = NotesService._get_folder(folder_id, user_id, db)
        if folder.is_default:
            raise ForbiddenException("Default folder cannot be renamed")

        existing = NotesService.list_folders(user_id, key, db).folders
        desired = body.name.strip().lower()
        if desired in {f.name.strip().lower() for f in existing if f.id != folder_id}:
            raise ConflictException("Folder name already exists")

        enc_name, iv = EncryptionService.encrypt(body.name.strip(), key)
        folder.name_encrypted = enc_name
        folder.iv = iv
        folder.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(folder)

        note_count = db.query(VaultNote).filter(VaultNote.user_id == user_id, VaultNote.folder_id == folder.id).count()
        return NoteFolderResponse(
            id=folder.id,
            name=body.name.strip(),
            is_default=folder.is_default,
            note_count=note_count,
            created_at=folder.created_at,
            updated_at=folder.updated_at,
        )

    @staticmethod
    def delete_folder(folder_id: int, user_id: int, key: bytes, db: Session) -> None:
        folder = NotesService._get_folder(folder_id, user_id, db)
        if folder.is_default:
            raise ForbiddenException("Default folder cannot be deleted")

        general = NotesService._ensure_general_folder(user_id, key, db)
        db.query(VaultNote).filter(VaultNote.user_id == user_id, VaultNote.folder_id == folder.id).update(
            {VaultNote.folder_id: general.id}, synchronize_session=False
        )
        db.delete(folder)
        db.commit()

    @staticmethod
    def list_tags(user_id: int, key: bytes, db: Session) -> NoteTagsResponse:
        tags = db.query(NoteTag).filter(NoteTag.user_id == user_id).order_by(NoteTag.created_at.asc()).all()
        result: list[NoteTagResponse] = []
        for tag in tags:
            name = EncryptionService.decrypt(tag.name_encrypted, tag.iv, key)
            note_count = db.query(NoteTagLink).filter(NoteTagLink.tag_id == tag.id).count()
            result.append(
                NoteTagResponse(
                    id=tag.id,
                    name=name,
                    note_count=note_count,
                    created_at=tag.created_at,
                    updated_at=tag.updated_at,
                )
            )
        return NoteTagsResponse(tags=result)

    @staticmethod
    def create_note(user_id: int, body: NoteCreateRequest, key: bytes, token: str, db: Session) -> NoteResponse:
        folder = NotesService._get_folder(body.folder_id, user_id, db) if body.folder_id else NotesService._ensure_general_folder(user_id, key, db)

        iv_bytes = os.urandom(12)
        iv_b64 = base64.b64encode(iv_bytes).decode("ascii")
        title_enc = NotesService._encrypt_with_iv(body.title.strip(), key, iv_bytes)
        content_raw = NotesService._serialize_content(body.content)
        content_enc = NotesService._encrypt_with_iv(content_raw, key, iv_bytes)

        note = VaultNote(
            user_id=user_id,
            folder_id=folder.id,
            title_encrypted=title_enc,
            content_encrypted=content_enc,
            iv=iv_b64,
            is_locked=False,
        )
        db.add(note)
        db.flush()

        NotesService._attach_tags(note, body.tags, user_id, key, db)
        db.commit()

        note = NotesService._load_note(note.id, user_id, db)
        return NotesService._to_note_response(note, key, token)

    @staticmethod
    def get_note(note_id: int, user_id: int, key: bytes, token: str, db: Session) -> NoteResponse:
        note = NotesService._load_note(note_id, user_id, db)
        return NotesService._to_note_response(note, key, token)

    @staticmethod
    def update_note(note_id: int, user_id: int, body: NoteUpdateRequest, key: bytes, token: str, db: Session) -> NoteResponse:
        note = NotesService._load_note(note_id, user_id, db)

        title = NotesService._decrypt_with_iv(note.title_encrypted, key, note.iv)
        if body.title is not None:
            title = body.title.strip()

        if body.folder_id is not None:
            folder = NotesService._get_folder(body.folder_id, user_id, db)
            note.folder_id = folder.id

        current_content, is_unlocked = NotesService._decrypt_note_content(note, key, token)
        if note.is_locked and not is_unlocked and body.content is not None:
            raise ForbiddenException("Unlock note before editing content")

        next_content = current_content
        if body.content is not None:
            next_content = body.content

        iv_bytes = os.urandom(12)
        iv_b64 = base64.b64encode(iv_bytes).decode("ascii")
        note.title_encrypted = NotesService._encrypt_with_iv(title, key, iv_bytes)

        if note.is_locked:
            note_key = notes_unlock_cache.get(token, note.id)
            if note_key is None:
                raise ForbiddenException("Unlock note before editing content")
            note.content_encrypted = NotesService._encrypt_with_iv(NotesService._serialize_content(next_content), note_key, iv_bytes)
        else:
            note.content_encrypted = NotesService._encrypt_with_iv(NotesService._serialize_content(next_content), key, iv_bytes)

        note.iv = iv_b64
        note.updated_at = datetime.now(timezone.utc)

        if body.tags is not None:
            NotesService._attach_tags(note, body.tags, user_id, key, db)
            NotesService._cleanup_orphan_tags(user_id, db)

        db.commit()
        note = NotesService._load_note(note.id, user_id, db)
        return NotesService._to_note_response(note, key, token)

    @staticmethod
    def delete_note(note_id: int, user_id: int, token: str, db: Session) -> None:
        note = NotesService._load_note(note_id, user_id, db)
        db.delete(note)
        NotesService._cleanup_orphan_tags(user_id, db)
        db.commit()
        notes_unlock_cache.revoke_note(token, note_id)

    @staticmethod
    def list_notes(
        user_id: int,
        key: bytes,
        token: str,
        db: Session,
        *,
        folder_id: int | None = None,
        tag: str | None = None,
        search: str | None = None,
        sort: str = "updated_at",
        order: str = "desc",
    ) -> list[NoteResponse]:
        NotesService._ensure_general_folder(user_id, key, db)

        query = (
            db.query(VaultNote)
            .options(
                joinedload(VaultNote.folder),
                joinedload(VaultNote.tag_links).joinedload(NoteTagLink.tag),
            )
            .filter(VaultNote.user_id == user_id)
        )

        if folder_id is not None:
            query = query.filter(VaultNote.folder_id == folder_id)

        allowed_sort = {"created_at", "updated_at", "title"}
        sort_field = sort if sort in allowed_sort else "updated_at"
        if sort_field == "title":
            # title is encrypted; sort post-decrypt below
            sort_field = "updated_at"
        col = getattr(VaultNote, sort_field)
        query = query.order_by(col.desc() if order == "desc" else col.asc())

        notes = query.all()
        responses = [NotesService._to_note_response(n, key, token) for n in notes]

        if tag:
            t = tag.strip().lower()
            responses = [n for n in responses if t in {x.lower() for x in n.tags}]

        if search:
            q = search.strip().lower()

            def _matches(n: NoteResponse) -> bool:
                if q in (n.title or "").lower():
                    return True
                if q in (n.folder_name or "").lower():
                    return True
                if any(q in tg.lower() for tg in n.tags):
                    return True
                # locked note body stays hidden from search unless unlocked
                if n.content is not None:
                    content_text = NotesService._extract_search_text(n.content).lower()
                    if q in content_text:
                        return True
                return False

            responses = [n for n in responses if _matches(n)]

        if sort == "title":
            responses.sort(key=lambda n: (n.title or "").lower(), reverse=(order == "desc"))

        return responses

    @staticmethod
    def set_note_lock(note_id: int, user_id: int, body: NoteLockRequest, key: bytes, token: str, db: Session) -> NoteLockResponse:
        note = NotesService._load_note(note_id, user_id, db)

        content, unlocked = NotesService._decrypt_note_content(note, key, token)
        if note.is_locked and not unlocked:
            raise ForbiddenException("Unlock note before changing lock")

        lock_salt = base64.b64encode(os.urandom(32)).decode("ascii")
        lock_key = NotesService._derive_lock_key(body.secret, lock_salt)
        verifier = NotesService._verifier(lock_key)

        note_key = os.urandom(32)

        iv_bytes = os.urandom(12)
        iv_b64 = base64.b64encode(iv_bytes).decode("ascii")
        title_plain = NotesService._decrypt_with_iv(note.title_encrypted, key, note.iv)

        note.title_encrypted = NotesService._encrypt_with_iv(title_plain, key, iv_bytes)
        note.content_encrypted = NotesService._encrypt_with_iv(NotesService._serialize_content(content), note_key, iv_bytes)
        note.iv = iv_b64

        wrap_iv, wrap_data = EncryptionService.encrypt_blob(note_key, lock_key)
        note.wrapped_note_key = json.dumps({"iv": wrap_iv, "data": wrap_data}, separators=(",", ":"))
        note.lock_salt = lock_salt
        note.lock_verifier = verifier
        note.is_locked = True
        note.updated_at = datetime.now(timezone.utc)

        db.commit()
        notes_unlock_cache.set(token, note.id, note_key)
        return NoteLockResponse(message="Note locked")

    @staticmethod
    def unlock_note(note_id: int, user_id: int, body: NoteUnlockRequest, key: bytes, token: str, db: Session) -> NoteLockResponse:
        note = NotesService._load_note(note_id, user_id, db)
        if not note.is_locked:
            return NoteLockResponse(message="Note is already unlocked")

        if not note.lock_salt or not note.lock_verifier or not note.wrapped_note_key:
            raise ForbiddenException("Lock metadata missing")

        lock_key = NotesService._derive_lock_key(body.secret, note.lock_salt)
        if NotesService._verifier(lock_key) != note.lock_verifier:
            raise ForbiddenException("Invalid PIN/password")

        wrapped = json.loads(note.wrapped_note_key)
        note_key = EncryptionService.decrypt_blob(wrapped["data"], wrapped["iv"], lock_key)
        notes_unlock_cache.set(token, note.id, note_key)
        return NoteLockResponse(message="Note unlocked")

    @staticmethod
    def remove_note_lock(note_id: int, user_id: int, key: bytes, token: str, db: Session) -> NoteLockResponse:
        note = NotesService._load_note(note_id, user_id, db)
        if not note.is_locked:
            return NoteLockResponse(message="Lock already removed")

        note_key = notes_unlock_cache.get(token, note.id)
        if note_key is None:
            raise ForbiddenException("Unlock note before removing lock")

        title_plain = NotesService._decrypt_with_iv(note.title_encrypted, key, note.iv)
        content_plain = NotesService._decrypt_with_iv(note.content_encrypted, note_key, note.iv)

        iv_bytes = os.urandom(12)
        iv_b64 = base64.b64encode(iv_bytes).decode("ascii")
        note.title_encrypted = NotesService._encrypt_with_iv(title_plain, key, iv_bytes)
        note.content_encrypted = NotesService._encrypt_with_iv(content_plain, key, iv_bytes)
        note.iv = iv_b64

        note.is_locked = False
        note.lock_salt = None
        note.lock_verifier = None
        note.wrapped_note_key = None
        note.updated_at = datetime.now(timezone.utc)

        db.commit()
        notes_unlock_cache.revoke_note(token, note.id)
        return NoteLockResponse(message="Lock removed")

    @staticmethod
    def export_notes_raw(user_id: int, key: bytes, db: Session) -> dict[str, Any]:
        NotesService._ensure_general_folder(user_id, key, db)

        folders = db.query(NoteFolder).filter(NoteFolder.user_id == user_id).all()
        notes = (
            db.query(VaultNote)
            .options(joinedload(VaultNote.tag_links).joinedload(NoteTagLink.tag))
            .filter(VaultNote.user_id == user_id)
            .all()
        )

        folder_payload = []
        folder_name_map: dict[int, str] = {}
        for f in folders:
            name = EncryptionService.decrypt(f.name_encrypted, f.iv, key)
            folder_name_map[f.id] = name
            folder_payload.append({
                "name": name,
                "is_default": bool(f.is_default),
                "created_at": f.created_at.isoformat() if f.created_at else None,
                "updated_at": f.updated_at.isoformat() if f.updated_at else None,
            })

        notes_payload = []
        for n in notes:
            title = NotesService._decrypt_with_iv(n.title_encrypted, key, n.iv)
            if n.is_locked:
                content = None
            else:
                content = NotesService._parse_content(NotesService._decrypt_with_iv(n.content_encrypted, key, n.iv))

            tags = NotesService._note_tag_names(n, key)
            notes_payload.append({
                "title": title,
                "content": content,
                "folder_name": folder_name_map.get(n.folder_id, NotesService.GENERAL_FOLDER_NAME),
                "tags": tags,
                "is_locked": n.is_locked,
                "lock_salt": n.lock_salt,
                "lock_verifier": n.lock_verifier,
                "wrapped_note_key": n.wrapped_note_key,
                "content_encrypted": n.content_encrypted if n.is_locked else None,
                "iv": n.iv if n.is_locked else None,
                "created_at": n.created_at.isoformat() if n.created_at else None,
                "updated_at": n.updated_at.isoformat() if n.updated_at else None,
            })

        return {"folders": folder_payload, "notes": notes_payload}

    @staticmethod
    def import_notes_raw(user_id: int, key: bytes, payload: dict[str, Any], db: Session) -> int:
        folders = payload.get("folders") or []
        notes = payload.get("notes") or []

        # reset current notes domain before import for consistency with full backup restore
        db.query(NoteTagLink).filter(NoteTagLink.note_id.in_(db.query(VaultNote.id).filter(VaultNote.user_id == user_id))).delete(synchronize_session=False)
        db.query(VaultNote).filter(VaultNote.user_id == user_id).delete(synchronize_session=False)
        db.query(NoteTag).filter(NoteTag.user_id == user_id).delete(synchronize_session=False)
        db.query(NoteFolder).filter(NoteFolder.user_id == user_id).delete(synchronize_session=False)
        db.flush()

        folder_name_to_id: dict[str, int] = {}
        default_folder_id: int | None = None

        for f in folders:
            name = (f.get("name") or "").strip() or NotesService.GENERAL_FOLDER_NAME
            enc, iv = EncryptionService.encrypt(name, key)
            folder = NoteFolder(user_id=user_id, name_encrypted=enc, iv=iv, is_default=bool(f.get("is_default", False)))
            db.add(folder)
            db.flush()
            folder_name_to_id[name.lower()] = folder.id
            if folder.is_default:
                default_folder_id = folder.id

        if default_folder_id is None:
            general_name_enc, general_iv = EncryptionService.encrypt(NotesService.GENERAL_FOLDER_NAME, key)
            general = NoteFolder(
                user_id=user_id,
                name_encrypted=general_name_enc,
                iv=general_iv,
                is_default=True,
            )
            db.add(general)
            db.flush()
            default_folder_id = general.id
            folder_name_to_id[NotesService.GENERAL_FOLDER_NAME.lower()] = general.id

        created = 0
        for n in notes:
            title = (n.get("title") or "Untitled")[:512]
            folder_name = (n.get("folder_name") or NotesService.GENERAL_FOLDER_NAME).strip().lower()
            folder_id = folder_name_to_id.get(folder_name, default_folder_id)
            if folder_id is None:
                folder_id = default_folder_id

            is_locked = bool(n.get("is_locked"))
            if is_locked:
                # import locked note exactly as backup captured
                iv = n.get("iv")
                content_encrypted = n.get("content_encrypted")
                lock_salt = n.get("lock_salt")
                lock_verifier = n.get("lock_verifier")
                wrapped_note_key = n.get("wrapped_note_key")
                if not iv or not content_encrypted or not lock_salt or not lock_verifier or not wrapped_note_key:
                    continue
                iv_bytes = base64.b64decode(iv)
                title_enc = NotesService._encrypt_with_iv(title, key, iv_bytes)
                note = VaultNote(
                    user_id=user_id,
                    folder_id=folder_id,
                    title_encrypted=title_enc,
                    content_encrypted=content_encrypted,
                    iv=iv,
                    is_locked=True,
                    lock_salt=lock_salt,
                    lock_verifier=lock_verifier,
                    wrapped_note_key=wrapped_note_key,
                )
            else:
                content = n.get("content")
                iv_bytes = os.urandom(12)
                iv_b64 = base64.b64encode(iv_bytes).decode("ascii")
                title_enc = NotesService._encrypt_with_iv(title, key, iv_bytes)
                content_enc = NotesService._encrypt_with_iv(NotesService._serialize_content(content), key, iv_bytes)
                note = VaultNote(
                    user_id=user_id,
                    folder_id=folder_id,
                    title_encrypted=title_enc,
                    content_encrypted=content_enc,
                    iv=iv_b64,
                    is_locked=False,
                )

            db.add(note)
            db.flush()
            NotesService._attach_tags(note, n.get("tags") or [], user_id, key, db)
            created += 1

        NotesService._cleanup_orphan_tags(user_id, db)
        db.commit()
        return created

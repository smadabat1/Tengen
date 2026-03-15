"""
Vault router — thin controller.
All logic delegated to VaultService.
HIBP check is triggered as a FastAPI BackgroundTask after create/update.
"""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, BackgroundTasks, Query, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from schemas import (
    EntryCreateRequest, EntryUpdateRequest,
    EntryResponse, TagsResponse,
    ExportResponse, ImportRequest, ImportResponse,
    ExternalImportRequest, ExternalImportResponse,
    DataAuditLogHistoryResponse,
    MAX_IMPORT_ENTRIES,
)
from models import DataAuditLog
from auth.dependencies import get_current_user
from vault.service import VaultService
from vault.encryption import EncryptionService
from core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/vault", tags=["Vault"])


@router.get("/entries", response_model=list[EntryResponse])
async def list_entries(
    tag: str | None = Query(None, description="Filter by tag"),
    search: str | None = Query(None, description="Search title or URL"),
    sort: str = Query("created_at", description="Sort field: created_at | updated_at | title"),
    order: str = Query("desc", description="Sort order: asc | desc"),
    auth: tuple = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user, key = auth
    return VaultService.list_entries(user.id, key, db, tag=tag, search=search, sort=sort, order=order)


@router.post("/entries", response_model=EntryResponse, status_code=201)
async def create_entry(
    body: EntryCreateRequest,
    background_tasks: BackgroundTasks,
    auth: tuple = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user, key = auth
    entry = VaultService.create_entry(user.id, body, key, db)
    # Trigger HIBP check asynchronously — do not block the response
    _schedule_hibp(background_tasks, entry.id, user.id, key, db)
    return entry


@router.get("/entries/{entry_id}", response_model=EntryResponse)
async def get_entry(
    entry_id: int,
    auth: tuple = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user, key = auth
    return VaultService.get_entry(entry_id, user.id, key, db)


@router.put("/entries/{entry_id}", response_model=EntryResponse)
async def update_entry(
    entry_id: int,
    body: EntryUpdateRequest,
    background_tasks: BackgroundTasks,
    auth: tuple = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user, key = auth
    entry = VaultService.update_entry(entry_id, user.id, body, key, db)
    _schedule_hibp(background_tasks, entry.id, user.id, key, db)
    return entry


@router.delete("/entries/{entry_id}", status_code=204)
async def delete_entry(
    entry_id: int,
    auth: tuple = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user, key = auth
    VaultService.delete_entry(entry_id, user.id, db)


@router.get("/export", response_model=ExportResponse)
async def export_vault(
    auth: tuple = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user, key = auth
    entries = VaultService.get_all_entries_raw(user.id, key, db)
    payload = json.dumps(entries, default=str).encode("utf-8")
    iv_b64, ciphertext_b64 = EncryptionService.encrypt_blob(payload, key)
    _save_audit_log(db, user.id, "export_backup", "success", len(entries))
    return ExportResponse(
        version=1,
        exported_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        entries_count=len(entries),
        iv=iv_b64,
        data=ciphertext_b64,
    )


@router.get("/export/bitwarden")
async def export_bitwarden(
    auth: tuple = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user, key = auth
    entries = VaultService.get_all_entries_raw(user.id, key, db)
    result = VaultService.entries_to_bitwarden(entries)
    _save_audit_log(db, user.id, "export_bitwarden", "success", len(entries))
    return result


@router.post("/import", response_model=ImportResponse)
async def import_vault(
    body: ImportRequest,
    auth: tuple = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user, key = auth
    try:
        plaintext = EncryptionService.decrypt_blob(body.data, body.iv, key)
        entries = json.loads(plaintext)
    except (ValueError, json.JSONDecodeError) as exc:
        _save_audit_log(db, user.id, "import", "error", detail="Invalid or corrupted backup file")
        raise HTTPException(status_code=400, detail="Invalid or corrupted backup file") from exc
    if not isinstance(entries, list):
        _save_audit_log(db, user.id, "import", "error", detail="Invalid backup format")
        raise HTTPException(status_code=400, detail="Invalid backup format")
    if len(entries) > MAX_IMPORT_ENTRIES:
        _save_audit_log(db, user.id, "import", "error", detail=f"Too many entries ({len(entries)})")
        raise HTTPException(status_code=400, detail=f"Too many entries (max {MAX_IMPORT_ENTRIES})")
    count = VaultService.bulk_create_entries(user.id, key, entries, db)
    _save_audit_log(db, user.id, "import", "success", count)
    return ImportResponse(imported=count)


@router.post("/import/external", response_model=ExternalImportResponse)
async def import_external(
    body: ExternalImportRequest,
    auth: tuple = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user, key = auth
    try:
        entries, skipped = VaultService.parse_external_import(body.format, body.data)
    except (ValueError, KeyError, json.JSONDecodeError) as exc:
        _save_audit_log(db, user.id, f"import_{body.format}", "error", detail=str(exc)[:256])
        raise HTTPException(status_code=400, detail="Could not parse the file. Check the format and try again.") from exc
    if len(entries) > MAX_IMPORT_ENTRIES:
        _save_audit_log(db, user.id, f"import_{body.format}", "error", detail=f"Too many entries ({len(entries)})")
        raise HTTPException(status_code=400, detail=f"Too many entries (max {MAX_IMPORT_ENTRIES})")
    count = VaultService.bulk_create_entries(user.id, key, entries, db)
    _save_audit_log(db, user.id, f"import_{body.format}", "success", count)
    return ExternalImportResponse(imported=count, skipped=skipped)


@router.get("/audit-log", response_model=DataAuditLogHistoryResponse)
async def get_audit_log(
    auth: tuple = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user, _ = auth
    logs = (
        db.query(DataAuditLog)
        .filter(DataAuditLog.user_id == user.id)
        .order_by(DataAuditLog.created_at.desc())
        .limit(50)
        .all()
    )
    return DataAuditLogHistoryResponse(logs=logs)


@router.get("/tags", response_model=TagsResponse)
async def list_tags(
    auth: tuple = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user, _ = auth
    return VaultService.list_tags(user.id, db)


# ---------------------------------------------------------------------------
# Internal helper — avoids circular imports with tools/hibp
# ---------------------------------------------------------------------------

def _save_audit_log(
    db: Session,
    user_id: int,
    action: str,
    status: str,
    entries_count: int | None = None,
    detail: str | None = None,
) -> None:
    """Persist a data audit log entry and trim to 50 most recent per user."""
    log = DataAuditLog(
        user_id=user_id,
        action=action,
        status=status,
        entries_count=entries_count,
        detail=detail,
    )
    db.add(log)
    db.flush()  # get the new id without a full commit
    # Trim: keep only the 50 most recent rows for this user
    oldest = (
        db.query(DataAuditLog.id)
        .filter(DataAuditLog.user_id == user_id)
        .order_by(DataAuditLog.created_at.desc())
        .offset(50)
        .all()
    )
    if oldest:
        ids = [r.id for r in oldest]
        db.query(DataAuditLog).filter(DataAuditLog.id.in_(ids)).delete(synchronize_session=False)
    db.commit()


def _schedule_hibp(
    background_tasks: BackgroundTasks,
    entry_id: int,
    user_id: int,
    key: bytes,
    db: Session,
) -> None:
    """Import here to break circular dependency between vault and tools."""
    from tools.hibp import HIBPClient
    background_tasks.add_task(HIBPClient.check_and_update_entry, entry_id, user_id, key, db)

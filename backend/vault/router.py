"""
Vault router — thin controller.
All logic delegated to VaultService.
HIBP check is triggered as a FastAPI BackgroundTask after create/update.
"""

from fastapi import APIRouter, Depends, BackgroundTasks, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import (
    EntryCreateRequest, EntryUpdateRequest,
    EntryResponse, TagsResponse,
)
from auth.dependencies import get_current_user
from vault.service import VaultService
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

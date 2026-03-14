"""
Tools router — thin controller.
All logic delegated to ToolsService and HIBPClient.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas import (
    GeneratePasswordRequest, GeneratePasswordResponse,
    StrengthCheckRequest, StrengthCheckResponse,
    HIBPCheckRequest, HIBPCheckResponse,
    HealthSummaryResponse,
    HealthSnapshotCreate, HealthSnapshotResponse, HealthHistoryResponse,
    HibpRunCreate, HibpRunResponse, HibpRunHistoryResponse,
)
from auth.dependencies import get_current_user
from tools.service import ToolsService
from tools.hibp import HIBPClient
from vault.service import VaultService
from core.exceptions import NotFoundException, ForbiddenException
from models import Entry
from core.logger import get_logger
from datetime import datetime, timezone

logger = get_logger(__name__)

router = APIRouter(prefix="/tools", tags=["Tools"])


@router.post("/generate", response_model=GeneratePasswordResponse)
async def generate_password(body: GeneratePasswordRequest):
    """Generate a cryptographically random password. No auth required."""
    return ToolsService.generate_password(body)


@router.post("/strength", response_model=StrengthCheckResponse)
async def check_strength(body: StrengthCheckRequest):
    """Run zxcvbn strength analysis. No auth required."""
    return ToolsService.check_strength(body)


@router.post("/hibp", response_model=HIBPCheckResponse)
async def hibp_check(
    body: HIBPCheckRequest,
    auth: tuple = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Manually trigger a HIBP check for a specific vault entry.
    Runs synchronously so the caller gets the result immediately.
    """
    user, key = auth

    entry = db.query(Entry).filter(Entry.id == body.entry_id).first()
    if not entry:
        raise NotFoundException("Entry")
    if entry.user_id != user.id:
        raise ForbiddenException()

    # Run the check (synchronous call to async method — use await)
    await HIBPClient.check_and_update_entry(body.entry_id, user.id, key, db)

    # Re-fetch to get updated values
    db.refresh(entry)
    return HIBPCheckResponse(
        entry_id=entry.id,
        pwned=entry.hibp_pwned,
        checked_at=entry.hibp_checked_at or datetime.now(timezone.utc),
    )


@router.get("/health", response_model=HealthSummaryResponse)
async def vault_health(
    auth: tuple = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return a health summary across all vault entries for the authenticated user."""
    user, key = auth
    return ToolsService.get_health_summary(user.id, key, db)


@router.post("/health/snapshot", response_model=HealthSnapshotResponse)
async def save_health_snapshot(
    body: HealthSnapshotCreate,
    auth: tuple = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Persist a health snapshot. Rate-limited to one per 5 minutes per user."""
    user, _ = auth
    return ToolsService.save_health_snapshot(user.id, body, db)


@router.get("/health/history", response_model=HealthHistoryResponse)
async def get_health_history(
    auth: tuple = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all health snapshots for the user, oldest first."""
    user, _ = auth
    snapshots = ToolsService.get_health_history(user.id, db)
    return HealthHistoryResponse(snapshots=snapshots)


@router.post("/hibp/runs", response_model=HibpRunResponse)
async def save_hibp_run(
    body: HibpRunCreate,
    auth: tuple = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Persist a completed HIBP batch scan run."""
    user, _ = auth
    return ToolsService.save_hibp_run(user.id, body, db)


@router.get("/hibp/runs", response_model=HibpRunHistoryResponse)
async def get_hibp_runs(
    auth: tuple = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all HIBP run history for the user, newest first."""
    user, _ = auth
    runs = ToolsService.get_hibp_runs(user.id, db)
    return HibpRunHistoryResponse(runs=runs)

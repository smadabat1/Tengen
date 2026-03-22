from datetime import datetime, timezone
from typing import Any
from pydantic import BaseModel, Field, field_serializer, field_validator


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


# ---------------------------------------------------------------------------
# Auth schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_\-]+$")
    master_password: str = Field(..., min_length=8, max_length=256)


class RegisterResponse(BaseModel):
    message: str


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=64)
    master_password: str = Field(..., min_length=1, max_length=256)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


class LogoutResponse(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# Vault — Entry schemas
# ---------------------------------------------------------------------------

class EntryCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=256)
    username: str | None = Field(None, max_length=512)
    password: str = Field(..., min_length=1, max_length=4096)
    url: str | None = Field(None, max_length=2048)
    notes: str | None = Field(None, max_length=10000)
    tags: list[str] = Field(default_factory=list)

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: list[str]) -> list[str]:
        return [t.strip().lower() for t in v if t.strip()]


class EntryUpdateRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=256)
    username: str | None = Field(None, max_length=512)
    password: str | None = Field(None, min_length=1, max_length=4096)
    url: str | None = Field(None, max_length=2048)
    notes: str | None = Field(None, max_length=10000)
    tags: list[str] | None = None

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        return [t.strip().lower() for t in v if t.strip()]


class EntryResponse(BaseModel):
    id: int
    title: str
    username: str | None
    password: str          # decrypted, returned to authenticated client
    url: str | None
    notes: str | None
    tags: list[str]
    strength_score: int | None
    hibp_pwned: bool
    hibp_checked_at: datetime | None
    created_at: datetime
    updated_at: datetime

    @field_serializer("hibp_checked_at", "created_at", "updated_at", when_used="json")
    def _serialize_entry_datetimes(self, v: datetime | None) -> datetime | None:
        return _as_utc(v)

    model_config = {"from_attributes": True}


class TagsResponse(BaseModel):
    tags: list[str]


# ---------------------------------------------------------------------------
# Tools schemas
# ---------------------------------------------------------------------------

class GeneratePasswordRequest(BaseModel):
    length: int = Field(20, ge=8, le=128)
    uppercase: bool = True
    lowercase: bool = True
    digits: bool = True
    symbols: bool = True


class GeneratePasswordResponse(BaseModel):
    password: str


class StrengthCheckRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=4096)


class StrengthCheckResponse(BaseModel):
    score: int                     # 0–4 (zxcvbn)
    label: str                     # Very Weak / Weak / Fair / Strong / Very Strong
    feedback: list[str]
    crack_time_display: str


class HIBPCheckRequest(BaseModel):
    entry_id: int


class HIBPCheckResponse(BaseModel):
    entry_id: int
    pwned: bool
    checked_at: datetime

    @field_serializer("checked_at", when_used="json")
    def _serialize_checked_at(self, v: datetime) -> datetime:
        # Ensure client gets an ISO timestamp with timezone offset
        return _as_utc(v)  # type: ignore[return-value]


class HealthSummaryResponse(BaseModel):
    total: int
    healthy: int     # entries with no issues
    weak: int        # strength_score < 2
    pwned: int       # hibp_pwned = true
    reused: int      # duplicate passwords across entries
    old: int         # not updated in 90+ days


# ---------------------------------------------------------------------------
# Health history schemas
# ---------------------------------------------------------------------------

class HealthSnapshotCreate(BaseModel):
    score: int
    healthy: int
    weak: int
    pwned: int
    reused: int
    old: int
    total: int


class HealthSnapshotResponse(BaseModel):
    id: int
    score: int
    healthy: int
    weak: int
    pwned: int
    reused: int
    old: int
    total: int
    created_at: datetime

    @field_serializer("created_at", when_used="json")
    def _serialize_created_at(self, v: datetime) -> datetime:
        return _as_utc(v)  # type: ignore[return-value]

    model_config = {"from_attributes": True}


class HealthHistoryResponse(BaseModel):
    snapshots: list[HealthSnapshotResponse]


# ---------------------------------------------------------------------------
# HIBP run history schemas
# ---------------------------------------------------------------------------

class HibpRunCreate(BaseModel):
    total: int
    pwned: int
    clean: int


class HibpRunResponse(BaseModel):
    id: int
    total: int
    pwned: int
    clean: int
    created_at: datetime

    @field_serializer("created_at", when_used="json")
    def _serialize_created_at(self, v: datetime) -> datetime:
        return _as_utc(v)  # type: ignore[return-value]

    model_config = {"from_attributes": True}


class HibpRunHistoryResponse(BaseModel):
    runs: list[HibpRunResponse]


# ---------------------------------------------------------------------------
# Export / Import schemas
# ---------------------------------------------------------------------------

class ExportResponse(BaseModel):
    version: int
    exported_at: str
    entries_count: int
    notes_count: int = 0
    iv: str
    data: str


MAX_IMPORT_ENTRIES = 2000

class ImportRequest(BaseModel):
    version: int = Field(..., ge=1, le=2)
    iv: str = Field(..., min_length=16, max_length=32)
    data: str = Field(..., min_length=1, max_length=10_000_000)


class ImportResponse(BaseModel):
    imported: int


EXTERNAL_IMPORT_FORMATS = {
    "bitwarden_json", "csv_chrome", "csv_lastpass",
    "csv_1password", "csv_dashlane", "csv_keepass", "csv_generic",
}

class ExternalImportRequest(BaseModel):
    format: str = Field(..., description="One of: " + ", ".join(sorted(EXTERNAL_IMPORT_FORMATS)))
    data: str = Field(..., min_length=1, max_length=10_000_000)

    @field_validator("format")
    @classmethod
    def validate_format(cls, v: str) -> str:
        if v not in EXTERNAL_IMPORT_FORMATS:
            raise ValueError(f"Unsupported format. Supported: {', '.join(sorted(EXTERNAL_IMPORT_FORMATS))}")
        return v


class ExternalImportResponse(BaseModel):
    imported: int
    skipped: int


# ---------------------------------------------------------------------------
# Notes schemas
# ---------------------------------------------------------------------------

class NoteFolderCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)

class NoteFolderUpdateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)

class NoteFolderResponse(BaseModel):
    id: int
    name: str
    is_default: bool
    note_count: int = 0
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at", when_used="json")
    def _serialize_note_folder_datetimes(self, v: datetime) -> datetime:
        return _as_utc(v)  # type: ignore[return-value]

class NoteTagResponse(BaseModel):
    id: int
    name: str
    note_count: int = 0
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at", when_used="json")
    def _serialize_note_tag_datetimes(self, v: datetime) -> datetime:
        return _as_utc(v)  # type: ignore[return-value]

class NoteTagsResponse(BaseModel):
    tags: list[NoteTagResponse]

class NoteCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=512)
    content: Any = Field(default_factory=dict)
    folder_id: int | None = None
    tags: list[str] = Field(default_factory=list)

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: list[str]) -> list[str]:
        return [t.strip().lower()[:64] for t in v if t.strip()]

class NoteUpdateRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=512)
    content: Any | None = None
    folder_id: int | None = None
    tags: list[str] | None = None

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        return [t.strip().lower()[:64] for t in v if t.strip()]

class NoteResponse(BaseModel):
    id: int
    title: str
    content: Any | None = None
    folder_id: int
    folder_name: str
    tags: list[str]
    is_locked: bool
    is_unlocked: bool = False
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at", when_used="json")
    def _serialize_note_datetimes(self, v: datetime) -> datetime:
        return _as_utc(v)  # type: ignore[return-value]

class NoteLockRequest(BaseModel):
    secret: str = Field(..., min_length=4, max_length=128)

class NoteUnlockRequest(BaseModel):
    secret: str = Field(..., min_length=4, max_length=128)

class NoteLockResponse(BaseModel):
    message: str

class NoteFoldersResponse(BaseModel):
    folders: list[NoteFolderResponse]

# ---------------------------------------------------------------------------
# Data audit log schemas
# ---------------------------------------------------------------------------

class DataAuditLogResponse(BaseModel):
    id: int
    action: str
    status: str
    entries_count: int | None
    detail: str | None
    created_at: datetime

    @field_serializer("created_at", when_used="json")
    def _serialize_created_at(self, v: datetime) -> datetime:
        return _as_utc(v)  # type: ignore[return-value]

    model_config = {"from_attributes": True}


class DataAuditLogHistoryResponse(BaseModel):
    logs: list[DataAuditLogResponse]


# ---------------------------------------------------------------------------
# Generic error response (used by exception handler)
# ---------------------------------------------------------------------------

class ErrorResponse(BaseModel):
    detail: str

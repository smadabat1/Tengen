from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, field_validator


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


class HealthSummaryResponse(BaseModel):
    total: int
    weak: int        # strength_score < 2
    pwned: int       # hibp_pwned = true
    reused: int      # duplicate passwords across entries
    old: int         # not updated in 90+ days


# ---------------------------------------------------------------------------
# Health history schemas
# ---------------------------------------------------------------------------

class HealthSnapshotCreate(BaseModel):
    score: int
    weak: int
    pwned: int
    reused: int
    old: int
    total: int


class HealthSnapshotResponse(BaseModel):
    id: int
    score: int
    weak: int
    pwned: int
    reused: int
    old: int
    total: int
    created_at: datetime

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

    model_config = {"from_attributes": True}


class HibpRunHistoryResponse(BaseModel):
    runs: list[HibpRunResponse]


# ---------------------------------------------------------------------------
# Generic error response (used by exception handler)
# ---------------------------------------------------------------------------

class ErrorResponse(BaseModel):
    detail: str

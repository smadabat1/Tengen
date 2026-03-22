from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey,
    Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id               = Column(Integer, primary_key=True, index=True)
    username         = Column(String(64), unique=True, nullable=False, index=True)
    auth_hash        = Column(Text, nullable=False)       # Argon2id hash of (password + auth_salt)
    auth_salt        = Column(String(64), nullable=False) # Salt A — used for auth verification
    encryption_salt  = Column(String(64), nullable=False) # Salt B — used for key derivation, never returned to client
    created_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    entries          = relationship("Entry",          back_populates="user", cascade="all, delete-orphan")
    note_folders     = relationship("NoteFolder",     back_populates="user", cascade="all, delete-orphan")
    notes            = relationship("VaultNote",      back_populates="user", cascade="all, delete-orphan")
    note_tags        = relationship("NoteTag",        back_populates="user", cascade="all, delete-orphan")
    health_snapshots = relationship("HealthSnapshot", back_populates="user", cascade="all, delete-orphan")
    hibp_runs        = relationship("HibpRun",        back_populates="user", cascade="all, delete-orphan")
    data_audit_logs  = relationship("DataAuditLog",   back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username!r}>"


class Entry(Base):
    __tablename__ = "entries"

    id                 = Column(Integer, primary_key=True, index=True)
    user_id            = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Plaintext fields
    title              = Column(String(256), nullable=False)
    url                = Column(String(2048), nullable=True)
    tags               = Column(Text, default="[]")        # JSON array stored as text

    # Encrypted fields (AES-256-GCM, base64-encoded)
    username           = Column(Text, nullable=True)
    encrypted_password = Column(Text, nullable=False)
    notes              = Column(Text, nullable=True)

    # Encryption metadata
    iv                 = Column(String(32), nullable=False)  # base64-encoded 96-bit AES-GCM IV

    # Password health
    strength_score     = Column(Integer, nullable=True)      # 0-4, zxcvbn score
    hibp_pwned         = Column(Boolean, default=False, nullable=False)
    hibp_checked_at    = Column(DateTime, nullable=True)

    # Timestamps
    created_at         = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at         = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="entries")

    def __repr__(self) -> str:
        return f"<Entry id={self.id} title={self.title!r} user_id={self.user_id}>"


class NoteFolder(Base):
    __tablename__ = "note_folders"
    __table_args__ = (
        UniqueConstraint("user_id", "name_encrypted", "iv", name="uq_note_folder_user_name_iv"),
    )

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name_encrypted = Column(Text, nullable=False)
    iv            = Column(String(32), nullable=False)
    is_default    = Column(Boolean, default=False, nullable=False)
    created_at    = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at    = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="note_folders")
    notes = relationship("VaultNote", back_populates="folder")


class VaultNote(Base):
    __tablename__ = "vault_notes"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    folder_id        = Column(Integer, ForeignKey("note_folders.id", ondelete="RESTRICT"), nullable=False, index=True)
    title_encrypted  = Column(Text, nullable=False)
    content_encrypted = Column(Text, nullable=False)  # JSON string encrypted
    iv               = Column(String(32), nullable=False)
    is_locked        = Column(Boolean, default=False, nullable=False)
    lock_salt        = Column(String(64), nullable=True)
    lock_verifier    = Column(String(128), nullable=True)
    wrapped_note_key = Column(Text, nullable=True)
    created_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at       = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="notes")
    folder = relationship("NoteFolder", back_populates="notes")
    tag_links = relationship("NoteTagLink", back_populates="note", cascade="all, delete-orphan")


class NoteTag(Base):
    __tablename__ = "note_tags"
    __table_args__ = (
        UniqueConstraint("user_id", "name_encrypted", "iv", name="uq_note_tag_user_name_iv"),
    )

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name_encrypted = Column(Text, nullable=False)
    iv             = Column(String(32), nullable=False)
    created_at     = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at     = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="note_tags")
    note_links = relationship("NoteTagLink", back_populates="tag", cascade="all, delete-orphan")


class NoteTagLink(Base):
    __tablename__ = "note_tag_links"
    __table_args__ = (
        UniqueConstraint("note_id", "tag_id", name="uq_note_tag_link"),
    )

    id         = Column(Integer, primary_key=True, index=True)
    note_id    = Column(Integer, ForeignKey("vault_notes.id", ondelete="CASCADE"), nullable=False, index=True)
    tag_id     = Column(Integer, ForeignKey("note_tags.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    note = relationship("VaultNote", back_populates="tag_links")
    tag = relationship("NoteTag", back_populates="note_links")


class HealthSnapshot(Base):
    __tablename__ = "health_snapshots"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    score      = Column(Integer, nullable=False)
    healthy    = Column(Integer, nullable=False, default=0)
    weak       = Column(Integer, nullable=False, default=0)
    pwned      = Column(Integer, nullable=False, default=0)
    reused     = Column(Integer, nullable=False, default=0)
    old        = Column(Integer, nullable=False, default=0)
    total      = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="health_snapshots")

    def __repr__(self) -> str:
        return f"<HealthSnapshot id={self.id} user_id={self.user_id} score={self.score}>"


class HibpRun(Base):
    __tablename__ = "hibp_runs"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    total      = Column(Integer, nullable=False)
    pwned      = Column(Integer, nullable=False, default=0)
    clean      = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="hibp_runs")

    def __repr__(self) -> str:
        return f"<HibpRun id={self.id} user_id={self.user_id} total={self.total} pwned={self.pwned}>"


class DataAuditLog(Base):
    __tablename__ = "data_audit_logs"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action         = Column(String(32), nullable=False)   # export_backup | export_bitwarden | import
    status         = Column(String(16), nullable=False)   # success | error
    entries_count  = Column(Integer, nullable=True)       # entries exported/imported (None on error)
    detail         = Column(String(512), nullable=True)   # error message or extra context
    created_at     = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="data_audit_logs")

    def __repr__(self) -> str:
        return f"<DataAuditLog id={self.id} user_id={self.user_id} action={self.action!r} status={self.status!r}>"

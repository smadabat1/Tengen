from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey,
    Integer, String, Text,
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
    created_at       = Column(DateTime, default=datetime.utcnow, nullable=False)

    entries          = relationship("Entry",          back_populates="user", cascade="all, delete-orphan")
    health_snapshots = relationship("HealthSnapshot", back_populates="user", cascade="all, delete-orphan")
    hibp_runs        = relationship("HibpRun",        back_populates="user", cascade="all, delete-orphan")

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
    created_at         = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at         = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="entries")

    def __repr__(self) -> str:
        return f"<Entry id={self.id} title={self.title!r} user_id={self.user_id}>"


class HealthSnapshot(Base):
    __tablename__ = "health_snapshots"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    score      = Column(Integer, nullable=False)
    weak       = Column(Integer, nullable=False, default=0)
    pwned      = Column(Integer, nullable=False, default=0)
    reused     = Column(Integer, nullable=False, default=0)
    old        = Column(Integer, nullable=False, default=0)
    total      = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

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
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="hibp_runs")

    def __repr__(self) -> str:
        return f"<HibpRun id={self.id} user_id={self.user_id} total={self.total} pwned={self.pwned}>"

import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from core.config import get_settings
from core.logger import get_logger

logger = get_logger(__name__)

settings = get_settings()

# Ensure data directory exists
os.makedirs(settings.DATA_DIR, exist_ok=True)

DATABASE_URL = f"sqlite:///{settings.DATA_DIR}/tengen.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # required for SQLite + FastAPI
    echo=settings.DEBUG,
)


# Enable WAL mode for better SQLite concurrency
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency — yields a DB session and ensures it is closed after use."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    """Create all tables. Called once at startup."""
    from models import User, Entry, HealthSnapshot, HibpRun, DataAuditLog  # noqa: F401 — imports needed for metadata
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialised at %s", DATABASE_URL)

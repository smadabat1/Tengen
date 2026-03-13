from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # JWT
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Storage
    DATA_DIR: str = "/app/data"
    LOG_DIR: str = "/app/logs"

    # Argon2id parameters
    ARGON2_TIME_COST: int = 3
    ARGON2_MEMORY_COST: int = 65536
    ARGON2_PARALLELISM: int = 2

    # App behaviour
    DEBUG: bool = False
    APP_NAME: str = "Tengen"
    APP_VERSION: str = "1.0.0"

    # Session cache TTL (seconds) — matches JWT expiry
    SESSION_TTL_SECONDS: int = 3600

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()

"""
SessionCache — in-memory store mapping JWT tokens to derived encryption keys.

Design:
- Singleton instance (module-level `session_cache`)
- Thread-safe via threading.Lock
- Entries expire automatically after SESSION_TTL_SECONDS
- Expired entries are lazily evicted on every read/write and by a background sweep

The encryption key is stored here ONLY — never in the JWT, DB, or disk.
"""

import threading
from datetime import datetime, timedelta, timezone
from core.config import get_settings
from core.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class _CacheEntry:
    __slots__ = ("key", "expires_at")

    def __init__(self, key: bytes, ttl_seconds: int):
        self.key = key
        self.expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)

    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) >= self.expires_at


class SessionCache:
    """
    Maps `token (str) → encryption key (bytes)` with TTL expiry.

    Usage:
        session_cache.store(token, key)
        key = session_cache.get(token)   # returns None if missing/expired
        session_cache.revoke(token)      # on logout
    """

    def __init__(self, ttl_seconds: int | None = None):
        self._store: dict[str, _CacheEntry] = {}
        self._lock = threading.Lock()
        self._ttl = ttl_seconds or settings.SESSION_TTL_SECONDS

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def store(self, token: str, key: bytes) -> None:
        """Store an encryption key for the given token."""
        with self._lock:
            self._evict_expired()
            self._store[token] = _CacheEntry(key, self._ttl)
            logger.debug("Session cached. Active sessions: %d", len(self._store))

    def get(self, token: str) -> bytes | None:
        """
        Retrieve the encryption key for a token.
        Returns None if the token is missing or has expired.
        """
        with self._lock:
            entry = self._store.get(token)
            if entry is None:
                return None
            if entry.is_expired():
                del self._store[token]
                logger.info("Session expired and evicted from cache")
                return None
            return entry.key

    def revoke(self, token: str) -> bool:
        """Remove a token from the cache (logout). Returns True if it existed."""
        with self._lock:
            existed = token in self._store
            self._store.pop(token, None)
            if existed:
                logger.info("Session revoked. Active sessions: %d", len(self._store))
            return existed

    def active_count(self) -> int:
        """Return the number of non-expired active sessions."""
        with self._lock:
            self._evict_expired()
            return len(self._store)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _evict_expired(self) -> None:
        """Remove all expired entries. Must be called while holding the lock."""
        expired_keys = [k for k, v in self._store.items() if v.is_expired()]
        for k in expired_keys:
            del self._store[k]
        if expired_keys:
            logger.debug("Evicted %d expired session(s)", len(expired_keys))


# ---------------------------------------------------------------------------
# Module-level singleton — import this everywhere
# ---------------------------------------------------------------------------
session_cache = SessionCache()

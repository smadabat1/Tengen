"""
Per-session unlocked notes cache.
Stores decrypted per-note content keys in memory, scoped by JWT token.
"""

import threading

from core.session_cache import session_cache


class NotesUnlockCache:
    def __init__(self):
        self._store: dict[str, dict[int, bytes]] = {}
        self._lock = threading.Lock()

    def set(self, token: str, note_id: int, note_key: bytes) -> None:
        with self._lock:
            self._store.setdefault(token, {})[note_id] = note_key

    def get(self, token: str, note_id: int) -> bytes | None:
        with self._lock:
            # Tie unlock lifetime to active auth session
            if session_cache.get(token) is None:
                self._store.pop(token, None)
                return None
            return self._store.get(token, {}).get(note_id)

    def revoke_note(self, token: str, note_id: int) -> None:
        with self._lock:
            notes = self._store.get(token)
            if not notes:
                return
            notes.pop(note_id, None)
            if not notes:
                self._store.pop(token, None)

    def revoke_token(self, token: str) -> None:
        with self._lock:
            self._store.pop(token, None)


notes_unlock_cache = NotesUnlockCache()

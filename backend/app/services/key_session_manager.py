# backend/app/services/key_session_manager.py

import threading
import time
import secrets
import hmac
from typing import Optional, Dict, Tuple

# Default key length for AES-256
DEFAULT_KEY_LEN = 32  # bytes


class KeySessionManager:
    """
    Thread-safe in-memory session key manager with optional TTL (expiry).
    NOTE: This is suitable for development / single-process testing.
    For production / multi-instance, replace with Redis or another centralized KVS.

    Stored structure:
      self._sessions: { session_id: (key_bytes, expires_at_timestamp_or_0) }
    """

    def __init__(self, default_ttl_seconds: int = 0, required_key_len: int = DEFAULT_KEY_LEN):
        """
        :param default_ttl_seconds: default TTL for stored keys (0 = never expire)
        :param required_key_len: length in bytes that keys must have (default 32 for AES-256)
        """
        self._sessions: Dict[str, Tuple[bytes, float]] = {}
        self._lock = threading.RLock()
        self._default_ttl = int(default_ttl_seconds)
        self._required_key_len = int(required_key_len)

    def _get_session_id(self, user_id: str, peer_id: str) -> str:
        """
        Creates a consistent, order-independent session ID.
        "alice:bob" will be the same as "bob:alice".
        """
        return ":".join(sorted([user_id.lower(), peer_id.lower()]))

    def _now(self) -> float:
        return time.time()

    def _is_expired(self, expires_at: float) -> bool:
        return expires_at != 0 and self._now() > expires_at

    def store_key(self, user_id: str, peer_id: str, key: bytes, ttl_seconds: Optional[int] = None) -> None:
        """
        Store a key for the given user pair.
        :param key: raw bytes (must be required_key_len bytes)
        :param ttl_seconds: optional TTL for this key; if None, uses default TTL configured at init.
        """
        if not isinstance(key, (bytes, bytearray)):
            raise TypeError("key must be bytes")
        if len(key) != self._required_key_len:
            raise ValueError(f"key must be {self._required_key_len} bytes")

        session_id = self._get_session_id(user_id, peer_id)
        ttl = self._default_ttl if ttl_seconds is None else int(ttl_seconds)
        expires_at = 0.0 if ttl <= 0 else (self._now() + ttl)

        with self._lock:
            self._sessions[session_id] = (bytes(key), expires_at)

    def get_key(self, user_id: str, peer_id: str) -> Optional[bytes]:
        """
        Retrieve the key for the given user pair.
        Returns None if not found or expired.
        """
        session_id = self._get_session_id(user_id, peer_id)
        with self._lock:
            row = self._sessions.get(session_id)
            if not row:
                return None
            key, expires_at = row
            if self._is_expired(expires_at):
                # remove expired entry
                del self._sessions[session_id]
                return None
            return bytes(key)

    def has_key(self, user_id: str, peer_id: str) -> bool:
        """Return True if a non-expired key exists for the pair."""
        return self.get_key(user_id, peer_id) is not None

    def delete_key(self, user_id: str, peer_id: str) -> bool:
        """Delete a stored session key. Returns True if deleted."""
        session_id = self._get_session_id(user_id, peer_id)
        with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]
                return True
            return False

    def rotate_key(self, user_id: str, peer_id: str, ttl_seconds: Optional[int] = None) -> bytes:
        """
        Generate a new key for the session, store it, and return it.
        Useful for forward secrecy / re-keying.
        """
        new_key = self.generate_key()
        self.store_key(user_id, peer_id, new_key, ttl_seconds=ttl_seconds)
        return new_key

    def generate_key(self, length: Optional[int] = None) -> bytes:
        """Generate a cryptographically secure random key of `length` bytes."""
        ln = self._required_key_len if length is None else int(length)
        return secrets.token_bytes(ln)

    def clear_all(self) -> None:
        """Clear all stored sessions (useful for tests)."""
        with self._lock:
            self._sessions.clear()

    # Optional helper for secure comparison if needed elsewhere:
    @staticmethod
    def secure_compare(a: bytes, b: bytes) -> bool:
        """Constant-time comparison of two byte strings."""
        return hmac.compare_digest(a, b)


# Example adapter notes for Redis:
# - Replace store_key/get_key/delete_key with redis.set/get/del using a TTL.
# - Use redis.set(session_id, key_bytes, ex=ttl_seconds) and redis.get(session_id).
# - Make sure to store binary safely (Redis accepts bytes) and consider encryption-at-rest on your Redis host.

class KeySessionManager:
    """
    A simple in-memory store for managing session keys
    between pairs of users.
    
    In a real-world app, this would be a secure, persistent
    database like Redis or a key management system (KMS).
    """
    
    def __init__(self):
        # _sessions stores: {"userA:userB": b'32_byte_key', ...}
        self._sessions = {}

    def _get_session_id(self, user_id: str, peer_id: str) -> str:
        """
        Creates a consistent, order-independent session ID.
        "alice:bob" will be the same as "bob:alice".
        """
        return ":".join(sorted([user_id.lower(), peer_id.lower()]))

    def store_key(self, user_id: str, peer_id: str, key: bytes):
        """Stores a key for a user-peer pair."""
        session_id = self._get_session_id(user_id, peer_id)
        self._sessions[session_id] = key

    def get_key(self, user_id: str, peer_id: str) -> bytes | None:
        """Retrieves a key for a user-peer pair."""
        session_id = self._get_session_id(user_id, peer_id)
        return self._sessions.get(session_id)
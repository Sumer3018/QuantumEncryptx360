from app.core.aes_gcm import AESGCMEncryptor
from app.core.qkd_backends.pennylane_engine import PennylaneQKD
from app.core.dem_mixer import generate_final_key
from app.services.key_session_manager import KeySessionManager

class HybridEncryptor:
    """
    A service facade that orchestrates the entire
    QKD -> DEM -> AES encryption flow.
    """
    
    def __init__(self, key_manager: KeySessionManager):
        self.qkd_engine = PennylaneQKD()
        self.aes_encryptor = AESGCMEncryptor()
        self.key_manager = key_manager
        self.KEY_BIT_LENGTH = 256  # For AES-256
        self.KEY_BYTE_LENGTH = self.KEY_BIT_LENGTH // 8

    def establish_session_key(self, user_id: str, peer_id: str, simulate_eavesdropper: bool = False):
        """
        Runs the full QKD + DEM protocol to establish a key.
        """
        print(f"Establishing key for {user_id}:{peer_id}...")

        # 1. Run QKD protocol, passing the simulation flag
        print("Running QKD protocol...")
        qkd_key_hex = self.qkd_engine.run_protocol(
            self.KEY_BIT_LENGTH,
            simulate_eavesdropper=simulate_eavesdropper
        )
        print("QKD key generated.")

        # 2. Run DEM (HKDF) to finalize the key
        print("Mixing QKD and classical entropy (HKDF)...")
        final_key = generate_final_key(qkd_key_hex, self.KEY_BYTE_LENGTH)
        print("Final key generated.")

        # 3. Store the key in the session manager
        self.key_manager.store_key(user_id, peer_id, final_key)
        print("Session key stored.")

        return True

    def encrypt_data(self, plaintext: bytes, user_id: str, peer_id: str) -> bytes:
        """Encrypts data using the established session key."""
        key = self.key_manager.get_key(user_id, peer_id)
        if not key:
            raise ValueError(f"No session key found for {user_id}:{peer_id}. Please initiate session.")
            
        return self.aes_encryptor.encrypt(plaintext, key)

    def decrypt_data(self, encrypted_data: bytes, user_id: str, peer_id: str) -> bytes:
        """Decrypts data using the established session key."""
        key = self.key_manager.get_key(user_id, peer_id)
        if not key:
            raise ValueError(f"No session key found for {user_id}:{peer_id}. Please initiate session.")
        
        # The ValueError from AESGCMEncryptor (tampering) will be propagated up
        return self.aes_encryptor.decrypt(encrypted_data, key)
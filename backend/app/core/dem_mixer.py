import hashlib
import os
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.backends import default_backend


def generate_final_key(qkd_key_hex: str, key_length_bytes: int = 32) -> bytes:
    """
    Derives a final, cryptographically secure key using HKDF.
    
    This function implements a proper Key Derivation Function (KDF)
    as specified by industry best practices (NIST SP 800-56C).
    
    Args:
        qkd_key_hex: The high-entropy key from the QKD protocol.
                     This serves as the main Input Key Material (IKM).
        key_length_bytes: The desired output key length (32 for AES-256).
        
    Returns:
        The final 32-byte (256-bit) derived key.
    """

    # 1. Convert QKD hex key to bytes. This is our Input Key Material (IKM).
    try:
        qkd_key_bytes = bytes.fromhex(qkd_key_hex)
    except ValueError:
        raise ValueError("Invalid QKD key format. Must be a hex string.")

    # 2. Generate a cryptographically secure, random salt.
    # A salt is crucial for security in KDFs.
    salt = os.urandom(32)

    # 3. Use HKDF to derive the final key.
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=key_length_bytes,
        salt=salt,
        info=b'quantum-hybrid-encryption-v1',  # Context-specific info
        backend=default_backend()
    )

    # 4. Derive the key from our IKM.
    final_key = hkdf.derive(qkd_key_bytes)

    return final_key

import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag


class AESGCMEncryptor:
    """
    Handles AES-256-GCM encryption and decryption.
    This class correctly implements the protocol:
    
    - Generates a random 12-byte nonce for each encryption.
    - Uses the 16-byte authentication tag for integrity.
    - Returns a single bytes object: [12-byte nonce] + [ciphertext] + [16-byte tag]
    - Explicitly catches InvalidTag on decryption.
    """

    def __init__(self, key_size_bytes=32):
        self.KEY_SIZE = key_size_bytes
        self.NONCE_SIZE = 12  # Standard for GCM
        self.TAG_SIZE = 16    # Standard for GCM

    def encrypt(self, plaintext: bytes, key: bytes) -> bytes:
        """
        Encrypts plaintext bytes using AES-256-GCM.
        """
        if len(key) != self.KEY_SIZE:
            raise ValueError(
                f"Invalid key size. Must be {self.KEY_SIZE} bytes.")

        # 1. Generate a secure, random 12-byte nonce
        nonce = os.urandom(self.NONCE_SIZE)

        aesgcm = AESGCM(key)

        # 2. Encrypt. The 'encrypt' method returns (ciphertext + tag).
        ciphertext_with_tag = aesgcm.encrypt(nonce, plaintext, None)

        # 3. Return the combined bytes as per our protocol
        return nonce + ciphertext_with_tag

    def decrypt(self, encrypted_data: bytes, key: bytes) -> bytes:
        """
        Decrypts data encrypted with AES-256-GCM.
        """
        if len(key) != self.KEY_SIZE:
            raise ValueError(
                f"Invalid key size. Must be {self.KEY_SIZE} bytes.")

        try:
            # 1. Extract the components
            nonce = encrypted_data[:self.NONCE_SIZE]
            ciphertext_with_tag = encrypted_data[self.NONCE_SIZE:]

            aesgcm = AESGCM(key)

            # 2. Decrypt. This will automatically verify the tag.
            #    If tampered, this line raises InvalidTag.
            plaintext = aesgcm.decrypt(nonce, ciphertext_with_tag, None)

            return plaintext

        except InvalidTag:
            # 3. THIS IS THE CRITICAL SECURITY CATCH.
            # The data is corrupt or has been tampered with.
            raise ValueError(
                "Decryption failed: Data tampered or invalid key.")
        except Exception as e:
            raise ValueError(f"Decryption error: {e}")

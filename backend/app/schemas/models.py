from pydantic import BaseModel


class SessionInitResponse(BaseModel):
    status: str
    session_id: str

# The response model for the encryption endpoint


class FileEncryptResponse(BaseModel):
    nonce: str
    tag: str
    ciphertext: str

# NEW: The response model for a successful text preview


class TextDecryptPreviewResponse(BaseModel):
    status: str
    plaintext: str

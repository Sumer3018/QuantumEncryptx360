import io
import os
import logging
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException,
    status
)
from fastapi.responses import StreamingResponse, JSONResponse

from app.services.hybrid_encryptor import HybridEncryptor
from app.services.key_session_manager import KeySessionManager
from app.core.exceptions import SecurityError

# Import the models (keeps response schemas unchanged)
from app.schemas.models import (
    SessionInitResponse,
    FileEncryptResponse,
    TextDecryptPreviewResponse
)

router = APIRouter()

# ---------------------------
# Logger
# ---------------------------
logger = logging.getLogger("app.routes.encryption")
if not logger.handlers:
    # Basic configuration; platforms like Render will capture stdout/stderr anyway
    logging.basicConfig(level=logging.INFO)

# ---------------------------
# Dependencies / singletons
# ---------------------------
_key_manager = KeySessionManager()
_encryptor = HybridEncryptor(key_manager=_key_manager)


def get_encryptor() -> HybridEncryptor:
    return _encryptor
# ---------------------------


# ---------------------------
# Config (upload limits, etc.)
# ---------------------------
# Maximum upload size in megabytes (default 50 MB). Can be overridden with env var.
try:
    MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "50"))
except ValueError:
    MAX_UPLOAD_MB = 50
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024


# ---------------------------
# Helpers
# ---------------------------
def _hex_to_bytes(hex_str: str, expected_len: Optional[int] = None, field_name: str = "value") -> bytes:
    """
    Convert a hex string to bytes and optionally validate expected length (in bytes).
    Raises HTTPException(400) on error with a helpful message.
    """
    if not isinstance(hex_str, str) or not hex_str:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Missing or invalid hex string for {field_name}.")

    try:
        b = bytes.fromhex(hex_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Invalid hex encoding for {field_name}.")

    if expected_len is not None and len(b) != expected_len:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be {expected_len} bytes (hex length {expected_len*2}). Got {len(b)} bytes."
        )

    return b


# ---------------------------
# Routes
# ---------------------------

@router.post(
    "/session/initiate",
    response_model=SessionInitResponse,
    summary="Establish a new secure session key"
)
async def initiate_session(
    user_id: str = Form(...),
    peer_id: str = Form(...),
    simulate_eavesdropper: bool = Form(False),
    encryptor: HybridEncryptor = Depends(get_encryptor)
):
    """Initiates a new secure session between two users."""
    logger.info("Initiating session: %s <-> %s (simulate_eavesdropper=%s)",
                user_id, peer_id, simulate_eavesdropper)
    try:
        encryptor.establish_session_key(
            user_id,
            peer_id,
            simulate_eavesdropper=simulate_eavesdropper
        )
        session_id = f"{user_id}:{peer_id}"
        logger.info("Session established: %s", session_id)
        return SessionInitResponse(status="success", session_id=session_id)
    except SecurityError as e:
        logger.warning("SecurityError during session initiation: %s", e)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"Security Error: {e}")
    except Exception as e:
        logger.exception("Unexpected error initiating session:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Key establishment failed: {e}"
        )


@router.post(
    "/encrypt-file",
    response_model=FileEncryptResponse,
    summary="Encrypt a file and return its components"
)
async def encrypt_file(
    user_id: str = Form(...),
    peer_id: str = Form(...),
    file: UploadFile = File(...),
    encryptor: HybridEncryptor = Depends(get_encryptor)
):
    """
    Encrypts an uploaded file and returns the nonce, ciphertext, and
    authentication tag as separate hex-encoded strings in a JSON response.
    """
    filename = getattr(file, "filename", "uploaded_file")
    logger.info("Encrypt request received: file=%s user=%s peer=%s",
                filename, user_id, peer_id)

    plaintext_bytes = await file.read()

    # Basic upload size check to prevent huge memory usage
    if len(plaintext_bytes) > MAX_UPLOAD_BYTES:
        logger.warning("Upload too large: %d bytes (max %d)",
                       len(plaintext_bytes), MAX_UPLOAD_BYTES)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Upload too large. Max supported size is {MAX_UPLOAD_MB} MB."
        )

    try:
        encrypted_data = encryptor.encrypt_data(
            plaintext_bytes, user_id, peer_id)

        # AES-GCM: nonce (12 bytes) at front, tag (16 bytes) at end (as your code expects)
        if len(encrypted_data) < (12 + 16):
            logger.error(
                "Encrypted data unexpectedly small: %d bytes", len(encrypted_data))
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail="Encrypted data is malformed or too small.")

        nonce = encrypted_data[:12]
        tag = encrypted_data[-16:]
        ciphertext = encrypted_data[12:-16]

        logger.info("Encryption successful: file=%s nonce_len=%d tag_len=%d ciphertext_len=%d",
                    filename, len(nonce), len(tag), len(ciphertext))

        return FileEncryptResponse(
            nonce=nonce.hex(),
            tag=tag.hex(),
            ciphertext=ciphertext.hex()
        )

    except ValueError as e:
        logger.warning("ValueError during encryption: %s", e)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.exception("Encryption failed:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Encryption failed: {e}")


@router.post("/decrypt-file", summary="Decrypt components and return the file")
async def decrypt_file(
    user_id: str = Form(...),
    peer_id: str = Form(...),
    nonce: str = Form(...),
    tag: str = Form(...),
    ciphertext: str = Form(...),
    filename: Optional[str] = Form(None),
    encryptor: HybridEncryptor = Depends(get_encryptor)
):
    """
    (Production Endpoint)
    Takes the nonce, ciphertext, and tag as separate form fields,
    reconstructs and decrypts them, and returns the original file.
    """
    logger.info("Decrypt-file called for user=%s peer=%s filename=%s",
                user_id, peer_id, filename)
    try:
        # Validate and convert hex -> bytes (nonce must be 12 bytes, tag 16 bytes)
        nonce_bytes = _hex_to_bytes(nonce, expected_len=12, field_name="nonce")
        tag_bytes = _hex_to_bytes(tag, expected_len=16, field_name="tag")
        ciphertext_bytes = _hex_to_bytes(
            ciphertext, expected_len=None, field_name="ciphertext")

        encrypted_data = nonce_bytes + ciphertext_bytes + tag_bytes

        decrypted_data = encryptor.decrypt_data(
            encrypted_data, user_id, peer_id)

        download_name = filename or "decrypted_file"
        logger.info("Decryption successful, returning file: %s (size=%d bytes)",
                    download_name, len(decrypted_data))

        return StreamingResponse(
            io.BytesIO(decrypted_data),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={download_name}"}
        )
    except (ValueError, TypeError) as e:
        logger.warning("Bad request during decrypt-file: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except SecurityError as e:
        logger.warning("Security error during decrypt-file: %s", e)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except HTTPException:
        # re-raise HTTPExceptions from validation helpers
        raise
    except Exception as e:
        logger.exception("Decryption failed:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Decryption failed: {e}")


# --- NEW DEBUGGING ENDPOINT (unchanged behavior but with validation) ---
@router.post(
    "/decrypt-file-preview",
    response_model=TextDecryptPreviewResponse,
    summary="Decrypt components and preview as text"
)
async def decrypt_file_preview(
    user_id: str = Form(...),
    peer_id: str = Form(...),
    nonce: str = Form(...),
    tag: str = Form(...),
    ciphertext: str = Form(...),
    encryptor: HybridEncryptor = Depends(get_encryptor)
):
    """
    (Debug Endpoint)
    Takes the same inputs as /decrypt-file, but attempts to return
    the decrypted content as a JSON string for preview in Swagger.
    """
    logger.info("Decrypt-file-preview called for user=%s peer=%s",
                user_id, peer_id)
    try:
        nonce_bytes = _hex_to_bytes(nonce, expected_len=12, field_name="nonce")
        tag_bytes = _hex_to_bytes(tag, expected_len=16, field_name="tag")
        ciphertext_bytes = _hex_to_bytes(
            ciphertext, expected_len=None, field_name="ciphertext")

        encrypted_data = nonce_bytes + ciphertext_bytes + tag_bytes

        decrypted_data = encryptor.decrypt_data(
            encrypted_data, user_id, peer_id)

        # --- Smart Preview Logic ---
        try:
            # Try to decode the decrypted bytes as UTF-8 text
            plaintext = decrypted_data.decode('utf-8')
            logger.info("Preview decode successful, length=%d", len(plaintext))
            return TextDecryptPreviewResponse(
                status="success",
                plaintext=plaintext
            )
        except UnicodeDecodeError:
            logger.info("Preview decode failed: binary data")
            # If it fails, it's a binary file (like a .docx or .jpg)
            return JSONResponse(
                status_code=200,  # Still a success, but with a note
                content={
                    "status": "binary_file",
                    "plaintext": "(File decrypted, but it is binary and cannot be previewed as text)"
                }
            )

    except (ValueError, TypeError) as e:
        logger.warning("Bad request during decrypt-file-preview: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except SecurityError as e:
        logger.warning("Security error during decrypt-file-preview: %s", e)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Decryption preview failed:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Decryption failed: {e}")

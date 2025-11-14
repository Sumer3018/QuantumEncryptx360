import io
from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException
)
from fastapi.responses import StreamingResponse, JSONResponse

from app.services.hybrid_encryptor import HybridEncryptor
from app.services.key_session_manager import KeySessionManager
from app.core.exceptions import SecurityError
# Import the new model
from app.schemas.models import (
    SessionInitResponse,
    FileEncryptResponse,
    TextDecryptPreviewResponse
)

router = APIRouter()

# --- Dependency Injection (Unchanged) ---
_key_manager = KeySessionManager()
_encryptor = HybridEncryptor(key_manager=_key_manager)


def get_encryptor() -> HybridEncryptor:
    return _encryptor
# -----------------------------


@router.post(
    "/session/initiate",
    response_model=SessionInitResponse,
    summary="Establish a new secure session key"
)
async def initiate_session(
    user_id: str = Form(...),
    peer_id: str = Form(...),
    # UPDATED: Add the new Form parameter
    simulate_eavesdropper: bool = Form(False),
    encryptor: HybridEncryptor = Depends(get_encryptor)
):
    """Initiates a new secure session between two users."""
    try:
        # Pass the flag to the service
        encryptor.establish_session_key(
            user_id,
            peer_id,
            simulate_eavesdropper=simulate_eavesdropper
        )
        session_id = f"{user_id}:{peer_id}"
        return SessionInitResponse(status="success", session_id=session_id)
    except SecurityError as e:
        # This is the error we *want* to trigger
        raise HTTPException(status_code=403, detail=f"Security Error: {e}")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Key establishment failed: {e}")


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
    plaintext_bytes = await file.read()

    try:
        encrypted_data = encryptor.encrypt_data(
            plaintext_bytes, user_id, peer_id)

        nonce = encrypted_data[:12]
        tag = encrypted_data[-16:]
        ciphertext = encrypted_data[12:-16]

        return FileEncryptResponse(
            nonce=nonce.hex(),
            tag=tag.hex(),
            ciphertext=ciphertext.hex()
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Encryption failed: {e}")


@router.post("/decrypt-file", summary="Decrypt components and return the file")
async def decrypt_file(
    user_id: str = Form(...),
    peer_id: str = Form(...),
    nonce: str = Form(...),
    tag: str = Form(...),
    ciphertext: str = Form(...),
    encryptor: HybridEncryptor = Depends(get_encryptor)
):
    """
    (Production Endpoint)
    Takes the nonce, ciphertext, and tag as separate form fields,
    reconstructs and decrypts them, and returns the original file.
    """
    try:
        nonce_bytes = bytes.fromhex(nonce)
        tag_bytes = bytes.fromhex(tag)
        ciphertext_bytes = bytes.fromhex(ciphertext)

        encrypted_data = nonce_bytes + ciphertext_bytes + tag_bytes

        decrypted_data = encryptor.decrypt_data(
            encrypted_data, user_id, peer_id
        )

        return StreamingResponse(
            io.BytesIO(decrypted_data),
            media_type="application/octet-stream",
            headers={"Content-Disposition": "attachment; filename=decrypted_file"}
        )
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decryption failed: {e}")


# --- NEW DEBUGGING ENDPOINT ---
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
    try:
        nonce_bytes = bytes.fromhex(nonce)
        tag_bytes = bytes.fromhex(tag)
        ciphertext_bytes = bytes.fromhex(ciphertext)

        encrypted_data = nonce_bytes + ciphertext_bytes + tag_bytes

        decrypted_data = encryptor.decrypt_data(
            encrypted_data, user_id, peer_id
        )

        # --- Smart Preview Logic ---
        try:
            # Try to decode the decrypted bytes as UTF-8 text
            plaintext = decrypted_data.decode('utf-8')
            return TextDecryptPreviewResponse(
                status="success",
                plaintext=plaintext
            )
        except UnicodeDecodeError:
            # If it fails, it's a binary file (like a .docx or .jpg)
            return JSONResponse(
                status_code=200,  # Still a success, but with a note
                content={
                    "status": "binary_file",
                    "plaintext": "(File decrypted, but it is binary and cannot be previewed as text)"
                }
            )

    except (ValueError, TypeError) as e:
        # This catches bad hex, tampered data, or wrong keys
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decryption failed: {e}")

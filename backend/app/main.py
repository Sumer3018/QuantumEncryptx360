import os
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# optional: load .env in dev (install python-dotenv)
try:
    from dotenv import load_dotenv
    load_dotenv()  # loads .env file if present (local dev only)
except Exception:
    pass

# import your router
from app.api.routes import encryption

# App metadata
app = FastAPI(
    title="QuantumCrypt Sentinel API",
    description="API for secure file encryption using a Quantum-Resistant Hybrid Protocol.",
    version="1.0.0"
)

# --- CORS configuration (from env or defaults) ---
# Provide FRONTEND_URLS as a comma-separated list, e.g.
# FRONTEND_URLS="http://localhost:5173,https://your-site.netlify.app"
_default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

_frontend_env = os.getenv("FRONTEND_URLS", None)
_allow_all = os.getenv("ALLOW_ALL_ORIGINS",
                       "false").lower() in ("1", "true", "yes")

if _allow_all:
    _origins = ["*"]
else:
    if _frontend_env:
        # split and strip whitespace
        _origins = [u.strip() for u in _frontend_env.split(",") if u.strip()]
    else:
        _origins = _default_origins

# Apply CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Include API Routes ---
app.include_router(
    encryption.router,
    prefix="/api/v1",
    tags=["Encryption Operations"]
)


@app.get("/", tags=["Root"])
def read_root():
    """Root endpoint for API health check."""
    return {"message": "QuantumCrypt Sentinel API is operational."}

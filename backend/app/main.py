from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import encryption

# 1. Give your API a custom, professional title
app = FastAPI(
    title="QuantumCrypt Sentinel API",
    description="API for secure file encryption using a Quantum-Resistant Hybrid Protocol.",
    version="1.0.0"
)

# --- CORS (Cross-Origin Resource Sharing) ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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

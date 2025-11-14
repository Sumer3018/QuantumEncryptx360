# Backend (FastAPI)

Start (local):
  python -m venv venv
  .\venv\Scripts\Activate.ps1   # PowerShell
  pip install -r requirements.txt
  uvicorn main:app --reload --host 127.0.0.1 --port 8000

Production start command (platforms like Render):
  uvicorn main:app --host 0.0.0.0 --port $PORT

Required env vars (add on platform dashboard):
  - SECRET_KEY
  - DATABASE_URL  (if you use DB)
  - ANY_OTHER_SECRETS

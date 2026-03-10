import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend folder or project root
_env_path = Path(__file__).resolve().parent.parent / ".env"
if not _env_path.exists():
    _env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_env_path)

BYNDER_BASE_URL = os.getenv("BYNDER_BASE_URL", os.getenv("VITE_BYNDER_BASE_URL", "")).rstrip("/")
BYNDER_CLIENT_ID = os.getenv("BYNDER_CLIENT_ID", os.getenv("VITE_OAUTH_CLIENT_ID", ""))
BYNDER_CLIENT_SECRET = os.getenv("BYNDER_CLIENT_SECRET", os.getenv("VITE_BYNDER_SECRET", ""))
OAUTH_CALLBACK_URL_DEFAULT = os.getenv("OAUTH_CALLBACK_URL", os.getenv("VITE_OAUTH_CALLBACK_URL", "http://localhost:5173")).rstrip("/") + "/auth/callback"

# Filter: nur Assets, bei denen die Metaproperty (Source) den Wert hat (z. B. POSM).
# Metaproperty-ID aus Bynder (z. B. Source = 6E5384FB-EA16-417E-8629EB2BFCD7C119).
BYNDER_FILTER_METAPROPERTY_ID = (os.getenv("BYNDER_FILTER_METAPROPERTY_ID") or "6E5384FB-EA16-417E-8629EB2BFCD7C119").strip().upper() or None
BYNDER_FILTER_VALUE = (os.getenv("BYNDER_FILTER_VALUE") or "POSM").strip() or None

# Nur Assets anzeigen, die als GLB erkannt werden. Default: aus (Bynder-Felder für Typ oft anders).
BYNDER_FILTER_GLB_ONLY = os.getenv("BYNDER_FILTER_GLB_ONLY", "").strip().lower() in ("1", "true", "yes")

# Nur Assets anzeigen, die einen bestimmten Tag haben (z. B. "AR" für GLB-Dateien). Leer = kein Tag-Filter.
BYNDER_FILTER_TAG = (os.getenv("BYNDER_FILTER_TAG", "").strip() or None)

# Secret to sign short-lived model URLs (so Quick Look / model-viewer can load GLB without Bearer). Required for token-based /model.
MODEL_URL_SECRET = (os.getenv("MODEL_URL_SECRET", "").strip() or None)

import hashlib
import hmac
import logging
import time
from base64 import urlsafe_b64decode, urlsafe_b64encode
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.auth import exchange_code_for_token, refresh_access_token
from app.bynder_client import (
    BynderUnauthorizedError,
    get_asset,
    get_model_bytes,
    get_thumbnail_bytes,
    list_assets,
)
from app.config import MODEL_URL_SECRET
from app.models import AssetResponse, RefreshRequest, TokenRequest, TokenResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def get_bearer_token(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization[7:].strip()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AR Sales Companion Backend started")
    yield
    logger.info("AR Sales Companion Backend shutting down")


app = FastAPI(title="AR Sales Companion Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/auth/token", response_model=TokenResponse)
async def auth_token(body: TokenRequest):
    """Exchange Bynder OAuth authorization code for access token."""
    token, err_status, err_detail = await exchange_code_for_token(body.code, body.redirect_uri)
    if token is not None:
        return token
    status = err_status or 502
    detail = err_detail or "Token exchange failed"
    raise HTTPException(status_code=status, detail=detail)


@app.post("/auth/refresh", response_model=TokenResponse)
async def auth_refresh(body: RefreshRequest):
    """Exchange refresh token for new access token. Use when API returns 401."""
    token, err_status, err_detail = await refresh_access_token(body.refresh_token)
    if token is not None:
        return token
    status = err_status or 401
    detail = err_detail or "Refresh failed"
    raise HTTPException(status_code=status, detail=detail)


@app.get("/api/assets", response_model=list[AssetResponse])
async def api_assets(authorization: str | None = Header(None, alias="Authorization")):
    """List assets from Bynder (catalog). Requires Bearer token from OAuth."""
    token = get_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    try:
        assets = await list_assets(token)
        return assets
    except BynderUnauthorizedError:
        logger.info("API /api/assets: Bynder 401, token expired or invalid")
        raise HTTPException(
            status_code=401,
            detail="Token expired or invalid. Please log in again.",
        )


@app.get("/api/assets/{asset_id}", response_model=AssetResponse)
async def api_asset(asset_id: str, authorization: str | None = Header(None, alias="Authorization")):
    """Get single asset with GLB download URL. Requires Bearer token."""
    token = get_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    try:
        asset = await get_asset(token, asset_id)
    except BynderUnauthorizedError:
        logger.info("API /api/assets/%s: Bynder 401, token expired or invalid", asset_id)
        raise HTTPException(
            status_code=401,
            detail="Token expired or invalid. Please log in again.",
        )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


def _model_token_create(asset_id: str, ttl_seconds: int = 900) -> str:
    """Create a signed token for model URL (valid for ttl_seconds). Requires MODEL_URL_SECRET."""
    if not MODEL_URL_SECRET:
        raise ValueError("MODEL_URL_SECRET is not set")
    expiry = int(time.time()) + ttl_seconds
    payload = f"{asset_id}:{expiry}"
    sig = hmac.new(
        MODEL_URL_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return urlsafe_b64encode(payload.encode("utf-8")).decode("ascii").rstrip("=") + "." + sig


def _model_token_verify(token: str) -> str | None:
    """Verify token and return asset_id if valid, else None."""
    if not MODEL_URL_SECRET or "." not in token:
        return None
    payload_b64, sig = token.rsplit(".", 1)
    try:
        payload = urlsafe_b64decode(payload_b64 + "==").decode("utf-8")
    except Exception:
        return None
    expected_sig = hmac.new(
        MODEL_URL_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected_sig, sig):
        return None
    parts = payload.split(":")
    if len(parts) != 2:
        return None
    asset_id, expiry_str = parts
    try:
        if int(expiry_str) < int(time.time()):
            return None
    except ValueError:
        return None
    return asset_id


# In-memory cache for token -> model bytes (short-lived) so ?token= requests can stream without Bearer.
_model_cache: dict[str, tuple[bytes, int]] = {}
_MODEL_CACHE_TTL = 900  # 15 minutes


def _model_cache_cleanup():
    """Remove expired entries from _model_cache."""
    now = int(time.time())
    expired = [k for k, (_, exp) in _model_cache.items() if exp < now]
    for k in expired:
        del _model_cache[k]


@app.get("/api/assets/{asset_id}/model")
async def api_asset_model(
    asset_id: str,
    authorization: str | None = Header(None, alias="Authorization"),
    token: str | None = Query(None, alias="token"),
):
    """Stream GLB model file. Auth: Bearer header or ?token= (short-lived signed URL for same-origin / Quick Look)."""
    if token:
        verified_id = _model_token_verify(token)
        if not verified_id or verified_id != asset_id:
            logger.warning("Model token invalid or expired for asset_id=%s", asset_id)
            raise HTTPException(status_code=401, detail="Invalid or expired model URL token")
        _model_cache_cleanup()
        cached = _model_cache.get(token)
        if not cached:
            raise HTTPException(
                status_code=410,
                detail="Model URL expired; please reopen the asset and try AR again.",
            )
        body, _ = cached
        return Response(
            content=body,
            media_type="model/gltf-binary",
            headers={
                "Content-Disposition": 'attachment; filename="model.glb"',
                "Cache-Control": "private, max-age=60",
            },
        )
    access_token = get_bearer_token(authorization)
    if not access_token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    try:
        body = await get_model_bytes(access_token, asset_id)
    except BynderUnauthorizedError:
        raise HTTPException(status_code=401, detail="Token expired or invalid. Please log in again.")
    if not body:
        raise HTTPException(status_code=404, detail="Model not found or could not be streamed")
    return Response(
        content=body,
        media_type="model/gltf-binary",
        headers={
            "Content-Disposition": 'attachment; filename="model.glb"',
            "Cache-Control": "private, max-age=300",
        },
    )


@app.get("/api/assets/{asset_id}/model-url")
async def api_asset_model_url(
    asset_id: str,
    request: Request,
    authorization: str | None = Header(None, alias="Authorization"),
):
    """Return a short-lived URL to stream the model (for same-origin / AR). Requires Bearer. Requires MODEL_URL_SECRET."""
    if not MODEL_URL_SECRET:
        logger.warning("Model URL requested but MODEL_URL_SECRET is not set")
        raise HTTPException(
            status_code=503,
            detail="Model URL feature is not configured (MODEL_URL_SECRET).",
        )
    token = get_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    try:
        body = await get_model_bytes(token, asset_id)
    except BynderUnauthorizedError:
        raise HTTPException(status_code=401, detail="Token expired or invalid. Please log in again.")
    if not body:
        raise HTTPException(status_code=404, detail="Model not found or could not be streamed")
    signed = _model_token_create(asset_id, ttl_seconds=_MODEL_CACHE_TTL)
    _model_cache_cleanup()
    _model_cache[signed] = (body, int(time.time()) + _MODEL_CACHE_TTL)
    base = str(request.base_url).rstrip("/")
    model_url = f"{base}/api/assets/{asset_id}/model?token={signed}"
    return {"url": model_url}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/debug/bynder-media")
async def debug_bynder_media(authorization: str | None = Header(None, alias="Authorization")):
    """Diagnose: Was liefert die Bynder Media-API? (Nur für Entwicklung.)"""
    token = get_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization")
    from app.bynder_client import _base, _headers
    import httpx
    url = _base() + "api/v4/media/"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params={"limit": 10, "page": 1}, headers=_headers(token), timeout=15.0)
            data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else None
            if data is None:
                return {"status": resp.status_code, "error": "No JSON", "text": resp.text[:400]}
            keys = list(data.keys()) if isinstance(data, dict) else None
            count = 0
            if isinstance(data, list):
                count = len(data)
            elif isinstance(data, dict):
                for k in ("media", "items", "data", "results", "assets"):
                    if k in data and isinstance(data[k], list):
                        count = len(data[k])
                        break
            return {"status": resp.status_code, "response_keys": keys, "items_count": count}
    except Exception as e:
        logger.exception("Debug Bynder media: %s", e)
        return {"status": "error", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8888, reload=True)

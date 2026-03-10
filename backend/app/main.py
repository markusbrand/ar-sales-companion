import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.auth import exchange_code_for_token, refresh_access_token
from app.bynder_client import BynderUnauthorizedError, get_asset, list_assets
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

import base64
import json
import logging
from urllib.parse import urljoin

import httpx

from app.config import BYNDER_BASE_URL, BYNDER_CLIENT_ID, BYNDER_CLIENT_SECRET
from app.models import TokenResponse

logger = logging.getLogger(__name__)


def _parse_error_detail(status: int, text: str) -> str:
    """Extract a user-facing error message from Bynder response."""
    if status >= 500:
        return (
            "Bynder OAuth-Server meldet einen Fehler (500). "
            "Bitte prüfen: Redirect URI in Bynder OAuth-App = genau die Callback-URL dieser App; "
            "Client-ID und Secret sind korrekt."
        )
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            msg = data.get("error_description") or data.get("error") or data.get("message")
            if msg:
                return str(msg)
    except Exception:
        pass
    return text[:400] if text else "Token-Austausch fehlgeschlagen"


async def exchange_code_for_token(code: str, redirect_uri: str) -> tuple[TokenResponse | None, int | None, str | None]:
    """Returns (token, error_status, error_detail). On success: (token, None, None). On failure: (None, status, body)."""
    if not BYNDER_BASE_URL or not BYNDER_CLIENT_ID or not BYNDER_CLIENT_SECRET:
        logger.error("Missing Bynder config: BYNDER_BASE_URL, BYNDER_CLIENT_ID, or BYNDER_CLIENT_SECRET")
        return (None, 500, "Server config missing")

    body = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "scope": "offline asset:read",
    }
    logger.info(
        "Token exchange: redirect_uri=%s (must match Bynder OAuth app exactly)",
        redirect_uri,
    )
    credentials = base64.b64encode(f"{BYNDER_CLIENT_ID}:{BYNDER_CLIENT_SECRET}".encode()).decode()
    headers = {"Authorization": f"Basic {credentials}", "Content-Type": "application/x-www-form-urlencoded"}

    # Try possible Bynder token endpoint paths (instances differ)
    token_paths = [
        "v6/authentication/oauth2/token",
        "api/v6/authentication/oauth2/token",
    ]

    try:
        async with httpx.AsyncClient() as client:
            resp = None
            last_status = 0
            last_text = ""
            for path in token_paths:
                token_url = urljoin(BYNDER_BASE_URL + "/", path)
                resp = await client.post(token_url, data=body, headers=headers, timeout=15.0)
                last_status = resp.status_code
                last_text = resp.text
                if resp.status_code == 200:
                    break
                if resp.status_code != 404:
                    break
                logger.warning("Bynder token endpoint 404 at %s, trying next path", token_url)
            if resp is None or resp.status_code != 200:
                logger.error(
                    "Bynder token exchange failed: status=%s body=%s",
                    last_status,
                    last_text[:500],
                )
                detail = _parse_error_detail(last_status, last_text)
                return (None, last_status if 400 <= last_status < 600 else 502, detail)
            data = resp.json()
    except Exception as e:
        logger.exception("Bynder token request error: %s", e)
        return (None, 500, str(e))

    access = data.get("access_token")
    if not access:
        logger.error("Bynder response missing access_token: %s", data)
        return (None, 502, "No access_token in response")

    return (
        TokenResponse(
            access_token=access,
            refresh_token=data.get("refresh_token"),
            token_type=data.get("token_type", "Bearer"),
        ),
        None,
        None,
    )


async def refresh_access_token(refresh_token: str) -> tuple[TokenResponse | None, int | None, str | None]:
    """Returns (token, error_status, error_detail). On success: (token, None, None)."""
    if not refresh_token or not refresh_token.strip():
        return (None, 400, "Missing refresh_token")
    if not BYNDER_BASE_URL or not BYNDER_CLIENT_ID or not BYNDER_CLIENT_SECRET:
        logger.error("Missing Bynder config for refresh")
        return (None, 500, "Server config missing")

    body = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token.strip(),
    }
    credentials = base64.b64encode(f"{BYNDER_CLIENT_ID}:{BYNDER_CLIENT_SECRET}".encode()).decode()
    headers = {"Authorization": f"Basic {credentials}", "Content-Type": "application/x-www-form-urlencoded"}

    token_paths = [
        "v6/authentication/oauth2/token",
        "api/v6/authentication/oauth2/token",
    ]

    try:
        async with httpx.AsyncClient() as client:
            resp = None
            last_status = 0
            last_text = ""
            for path in token_paths:
                token_url = urljoin(BYNDER_BASE_URL + "/", path)
                resp = await client.post(token_url, data=body, headers=headers, timeout=15.0)
                last_status = resp.status_code
                last_text = resp.text
                if resp.status_code == 200:
                    break
                if resp.status_code != 404:
                    break
            if resp is None or resp.status_code != 200:
                logger.warning("Bynder token refresh failed: status=%s body=%s", last_status, last_text[:300])
                return (None, last_status or 401, last_text or "Refresh failed")
            data = resp.json()
    except Exception as e:
        logger.exception("Bynder token refresh error: %s", e)
        return (None, 500, str(e))

    access = data.get("access_token")
    if not access:
        logger.error("Bynder refresh response missing access_token: %s", data)
        return (None, 502, "No access_token in response")

    return (
        TokenResponse(
            access_token=access,
            refresh_token=data.get("refresh_token"),
            token_type=data.get("token_type", "Bearer"),
        ),
        None,
        None,
    )

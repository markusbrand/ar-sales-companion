import base64
import logging
from urllib.parse import urljoin

import httpx

from app.config import BYNDER_BASE_URL, BYNDER_CLIENT_ID, BYNDER_CLIENT_SECRET
from app.models import TokenResponse

logger = logging.getLogger(__name__)


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
                return (None, last_status, last_text)
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

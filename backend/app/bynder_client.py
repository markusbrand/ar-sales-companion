"""
Bynder API v4 client: media list, media by id, download URL.
Maps Bynder responses to our Asset shape (thumbnail, glbUrl, posterUrl).
Filtert optional nach Metadaten (z. B. Source=POSM per Metaproperty-ID).
"""
import json
import logging
from urllib.parse import urljoin

import httpx

from app.config import (
    BYNDER_BASE_URL,
    BYNDER_FILTER_GLB_ONLY,
    BYNDER_FILTER_METAPROPERTY_ID,
    BYNDER_FILTER_VALUE,
)
from app.models import AssetResponse

logger = logging.getLogger(__name__)


def _normalize_id(raw: str) -> str:
    return (raw or "").strip().upper().replace(" ", "")


def _item_has_metaproperty_option(item: dict, metaproperty_id: str, option_value: str) -> bool:
    """Prüft, ob ein Media-Item die Metaproperty (per ID) mit dem Optionen-Wert hat (z. B. Source=POSM)."""
    if not metaproperty_id or not option_value:
        return True
    meta_id_norm = _normalize_id(metaproperty_id)
    value_lower = option_value.strip().lower()

    # 1) Dict keyed by metaproperty ID: { "6E5384FB-...": "POSM" } or { "6E5384FB-...": [{ "name": "POSM" }] }
    for key in ("properties", "propertyOptions", "metapropertyOptions", "metaPropertyOptions"):
        data = item.get(key)
        if not isinstance(data, dict):
            continue
        for k, v in data.items():
            if _normalize_id(k) != meta_id_norm:
                continue
            if isinstance(v, str) and v.strip().lower() == value_lower:
                return True
            if isinstance(v, list):
                for opt in v:
                    if isinstance(opt, dict):
                        opt_val = opt.get("option") or opt.get("optionName") or opt.get("value") or opt.get("label") or opt.get("name")
                        if opt_val is not None and str(opt_val).strip().lower() == value_lower:
                            return True
                    elif isinstance(opt, str) and opt.strip().lower() == value_lower:
                        return True
            elif v is not None and str(v).strip().lower() == value_lower:
                return True

    # 2) Flat list of options with metapropertyId on each option
    for key in ("metapropertyOptions", "propertyOptions", "metaPropertyOptions"):
        options = item.get(key)
        if options is None:
            continue
        if isinstance(options, dict):
            options = list(options.values()) if options else []
        if not isinstance(options, list):
            continue
        for opt in options:
            if not isinstance(opt, dict):
                continue
            opt_meta_id = _normalize_id(
                opt.get("metapropertyId") or opt.get("metaproperty_id") or opt.get("id") or ""
            )
            if opt_meta_id != meta_id_norm:
                continue
            opt_val = opt.get("option") or opt.get("optionName") or opt.get("value") or opt.get("label") or opt.get("name")
            if opt_val is not None and str(opt_val).strip().lower() == value_lower:
                return True

    return False


def _base() -> str:
    return (BYNDER_BASE_URL or "").rstrip("/") + "/"


def _headers(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


async def get_media_list(access_token: str) -> list[dict]:
    """Fetch media list from Bynder GET /api/v4/media/."""
    url = urljoin(_base(), "api/v4/media/")
    params = {"limit": 100, "page": 1}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, headers=_headers(access_token), timeout=30.0)
            if resp.status_code != 200:
                logger.error("Bynder media list failed: status=%s body=%s", resp.status_code, resp.text[:500])
                return []
            data = resp.json()
    except Exception as e:
        logger.exception("Bynder media list request error: %s", e)
        return []

    # Bynder can return {"media": [...]}, list, or paginated with various keys
    items = None
    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        for key in ("media", "items", "data", "results", "assets"):
            if key in data and isinstance(data[key], list):
                items = data[key]
                break
        if items is None:
            logger.warning("Bynder media response: unknown structure, keys=%s", list(data.keys())[:20])
    if not items:
        logger.info("Bynder media list: 0 items (response type=%s)", type(data).__name__)
        return []
    logger.info("Bynder media list: %d items", len(items))
    first = items[0] if items else None
    if isinstance(first, dict):
        logger.info("Bynder first item keys: %s", list(first.keys())[:35])
        for key in ("metapropertyOptions", "propertyOptions", "metaPropertyOptions", "properties", "metadata"):
            if key in first and first[key] is not None:
                try:
                    logger.info("Bynder first item %s: %s", key, json.dumps(first[key], default=str)[:800])
                except Exception:
                    logger.info("Bynder first item %s: (serialize failed)", key)
    return items


async def get_media_by_id(access_token: str, media_id: str) -> dict | None:
    """Fetch single media item GET /api/v4/media/{id}."""
    url = urljoin(_base(), f"api/v4/media/{media_id}")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=_headers(access_token), timeout=15.0)
            if resp.status_code != 200:
                logger.error("Bynder media get failed: id=%s status=%s body=%s", media_id, resp.status_code, resp.text[:500])
                return None
            return resp.json()
    except Exception as e:
        logger.exception("Bynder media get request error: %s", e)
        return None


async def get_download_url(access_token: str, media_id: str) -> str | None:
    """Get temporary download URL for asset GET /api/v4/media/{id}/download."""
    url = urljoin(_base(), f"api/v4/media/{media_id}/download")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=_headers(access_token), timeout=15.0)
            if resp.status_code != 200:
                logger.error("Bynder download URL failed: id=%s status=%s body=%s", media_id, resp.status_code, resp.text[:500])
                return None
            data = resp.json()
    except Exception as e:
        logger.exception("Bynder download request error: %s", e)
        return None

    # Response often has "url" or "s3" or "redirect" or similar
    if isinstance(data, dict):
        for key in ("url", "redirect", "download_url", "s3", "location"):
            if key in data and isinstance(data[key], str):
                return data[key]
        if "urls" in data and isinstance(data["urls"], list) and len(data["urls"]) > 0:
            u = data["urls"][0]
            return u.get("url", u.get("location")) if isinstance(u, dict) else None
    return None


def _thumbnail_url(item: dict) -> str:
    """Extract best thumbnail from Bynder media item."""
    thumbs = item.get("thumbnails") or item.get("thumbnail") or {}
    if isinstance(thumbs, str):
        return thumbs
    if isinstance(thumbs, dict):
        # Prefer webp or large
        for key in ("webimage", "webImage", "large", "medium", "thumb"):
            if key in thumbs and thumbs[key]:
                return thumbs[key] if isinstance(thumbs[key], str) else thumbs[key].get("url", "")
        for v in thumbs.values():
            if isinstance(v, str) and v.startswith("http"):
                return v
    return ""


def _name(item: dict) -> str:
    return item.get("name") or item.get("label") or item.get("id") or "Unnamed"


def _item_is_glb(item: dict) -> bool:
    """True if this media item is a GLB file (by extension or type)."""
    # Extension: Bynder often uses "extension" or "type" (e.g. "glb", "GLB")
    for key in ("extension", "type", "fileType", "mediaType", "format"):
        val = item.get(key)
        if isinstance(val, str) and val.strip().lower() == "glb":
            return True
    # Some APIs return type as number or object; check typeName / typeLabel
    type_info = item.get("typeInfo") or item.get("type") or {}
    if isinstance(type_info, dict):
        for k in ("name", "label", "extension", "type"):
            v = type_info.get(k)
            if isinstance(v, str) and v.strip().lower() == "glb":
                return True
    if isinstance(type_info, str) and type_info.strip().lower() == "glb":
        return True
    # Fallback: name or originalFilename ends with .glb
    name = (item.get("name") or item.get("originalFilename") or item.get("filename") or "") or ""
    if isinstance(name, str) and name.strip().lower().endswith(".glb"):
        return True
    return False


def bynder_item_to_asset(item: dict, glb_url: str | None = None) -> AssetResponse:
    """Map a Bynder media item to our Asset response. glb_url can be set from download endpoint."""
    media_id = str(item.get("id", ""))
    return AssetResponse(
        id=media_id,
        name=_name(item),
        thumbnailUrl=_thumbnail_url(item),
        glbUrl=glb_url or "",
        usdzUrl=None,
        posterUrl=_thumbnail_url(item) or None,
        fileSizeBytes=item.get("fileSize") or item.get("fileSizeBytes"),
        metadata=None,
    )


# Bekannte Media-ID zum Testen (z. B. aus Bynder-URL); Fallback wenn Liste leer ist
_FALLBACK_MEDIA_ID = "B68D9E65-4230-4D83-9E9D58954765F26B"


async def list_assets(access_token: str) -> list[AssetResponse]:
    """List assets for catalog grid. Filtert nach Metaproperty-ID und Wert (z. B. Source=POSM)."""
    items = await get_media_list(access_token)
    used_fallback = False
    if not items:
        item = await get_media_by_id(access_token, _FALLBACK_MEDIA_ID)
        if item:
            logger.info("Media list war leer, Fallback: ein Asset per ID geladen (%s)", _FALLBACK_MEDIA_ID)
            items = [item]
            used_fallback = True
    if not used_fallback and BYNDER_FILTER_METAPROPERTY_ID and BYNDER_FILTER_VALUE:
        before = len(items)
        filtered = [
            i for i in items
            if _item_has_metaproperty_option(i, BYNDER_FILTER_METAPROPERTY_ID, BYNDER_FILTER_VALUE)
        ]
        if len(filtered) == 0 and before > 0:
            logger.warning(
                "Filter metaproperty=%s value=%s removed all %d items. Zeige alle Assets.",
                BYNDER_FILTER_METAPROPERTY_ID, BYNDER_FILTER_VALUE, before,
            )
            items = items
        else:
            items = filtered
            logger.info(
                "Filter metaproperty=%s value=%s: %d -> %d assets",
                BYNDER_FILTER_METAPROPERTY_ID, BYNDER_FILTER_VALUE, before, len(items),
            )

    # Optional: nur Assets anzeigen, die als GLB erkannt werden (BYNDER_FILTER_GLB_ONLY=true)
    if BYNDER_FILTER_GLB_ONLY:
        before_glb = len(items)
        items = [i for i in items if _item_is_glb(i)]
        if before_glb != len(items):
            logger.info("GLB-Filter: %d -> %d assets (nur GLB-Dateien)", before_glb, len(items))

    return [bynder_item_to_asset(item, glb_url=None) for item in items]


async def get_asset(access_token: str, asset_id: str) -> AssetResponse | None:
    """Get single asset by id; includes download URL as glbUrl."""
    item = await get_media_by_id(access_token, asset_id)
    if not item:
        return None
    glb_url = await get_download_url(access_token, asset_id)
    return bynder_item_to_asset(item, glb_url=glb_url)

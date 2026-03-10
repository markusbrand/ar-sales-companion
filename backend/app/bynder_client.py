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
    BYNDER_FILTER_TAG,
    BYNDER_FILTER_VALUE,
)
from app.models import AssetResponse

logger = logging.getLogger(__name__)


class BynderUnauthorizedError(Exception):
    """Raised when Bynder API returns 401 (invalid or expired token)."""
    pass


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


def _item_has_tag(item: dict, tag_name: str) -> bool:
    """True if this media item has the given tag (case-insensitive)."""
    if not tag_name or not tag_name.strip():
        return True
    want = tag_name.strip().lower()
    tags = item.get("tags") or item.get("tag") or item.get("tagList") or item.get("tagNames") or []
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",")] if tags else []
    if not isinstance(tags, list):
        return False
    for t in tags:
        if isinstance(t, str) and t.strip().lower() == want:
            return True
        if isinstance(t, dict):
            name = (t.get("name") or t.get("label") or t.get("value") or "").strip().lower()
            if name == want:
                return True
    return False


def _base() -> str:
    return (BYNDER_BASE_URL or "").rstrip("/") + "/"


def _headers(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


async def get_media_list(access_token: str, tag_filter: str | None = None) -> list[dict]:
    """Fetch media list from Bynder GET /api/v4/media/. Optionally request server-side tag filter if API supports it."""
    url = urljoin(_base(), "api/v4/media/")
    params = {"limit": 100, "page": 1}
    if tag_filter and tag_filter.strip():
        params["tag"] = tag_filter.strip()
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, headers=_headers(access_token), timeout=30.0)
            if resp.status_code == 401:
                logger.warning("Bynder media list: 401 Invalid or expired token")
                raise BynderUnauthorizedError("Invalid or expired token")
            if resp.status_code != 200:
                logger.error("Bynder media list failed: status=%s body=%s", resp.status_code, resp.text[:500])
                return []
            data = resp.json()
    except BynderUnauthorizedError:
        raise
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
            if resp.status_code == 401:
                logger.warning("Bynder media get: 401 Invalid or expired token id=%s", media_id)
                raise BynderUnauthorizedError("Invalid or expired token")
            if resp.status_code != 200:
                logger.error("Bynder media get failed: id=%s status=%s body=%s", media_id, resp.status_code, resp.text[:500])
                return None
            return resp.json()
    except BynderUnauthorizedError:
        raise
    except Exception as e:
        logger.exception("Bynder media get request error: %s", e)
        return None


async def get_download_url(access_token: str, media_id: str) -> str | None:
    """Get temporary download URL for asset GET /api/v4/media/{id}/download."""
    url = urljoin(_base(), f"api/v4/media/{media_id}/download")
    logger.info("Bynder download URL request: media_id=%s", media_id)
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=_headers(access_token), timeout=15.0)
            if resp.status_code == 401:
                logger.warning("Bynder download URL: 401 Invalid or expired token id=%s", media_id)
                raise BynderUnauthorizedError("Invalid or expired token")
            if resp.status_code != 200:
                logger.error(
                    "Bynder download URL failed: id=%s status=%s body=%s",
                    media_id, resp.status_code, resp.text[:500],
                )
                return None
            data = resp.json()
    except BynderUnauthorizedError:
        raise
    except Exception as e:
        logger.exception("Bynder download request error: id=%s error=%s", media_id, e)
        return None

    # Response shape: Bynder may return {"url": "..."}, {"s3": {"url": "..."}}, {"urls": [{"url": "..."}]}, etc.
    if not isinstance(data, dict):
        logger.warning("Bynder download URL: response is not a dict for id=%s", media_id)
        return None

    def _get_url(val):
        if isinstance(val, str) and val.startswith("http"):
            return val
        if isinstance(val, dict):
            return val.get("url") or val.get("location") or val.get("href")
        return None

    # Top-level string or nested URL keys
    for key in ("url", "redirect", "download_url", "downloadUrl", "location", "href"):
        if key in data:
            download_url = _get_url(data[key])
            if download_url:
                logger.info(
                    "Bynder download URL ok: media_id=%s key=%s url_len=%d",
                    media_id, key, len(download_url),
                )
                return download_url

    # Nested: e.g. s3: { url: "..." }
    for key in ("s3", "temporary", "download", "files"):
        if key in data and isinstance(data[key], dict):
            download_url = _get_url(data[key])
            if download_url:
                logger.info(
                    "Bynder download URL ok: media_id=%s from %s url_len=%d",
                    media_id, key, len(download_url),
                )
                return download_url

    # Array: urls[0] or items[0]
    for key in ("urls", "items", "downloads"):
        if key in data and isinstance(data[key], list) and len(data[key]) > 0:
            first = data[key][0]
            download_url = first.get("url", first.get("location")) if isinstance(first, dict) else (first if isinstance(first, str) and first.startswith("http") else None)
            if download_url:
                logger.info("Bynder download URL ok: media_id=%s from %s[0] url_len=%d", media_id, key, len(download_url))
                return download_url

    # Fallback: any key whose value is an http string
    for k, v in data.items():
        if isinstance(v, str) and v.startswith("http"):
            logger.info("Bynder download URL ok: media_id=%s key=%s (fallback) url_len=%d", media_id, k, len(v))
            return v

    # Log full structure for debugging (keys and value types, no sensitive data)
    structure = {k: type(v).__name__ if not isinstance(v, (str, type(None))) else ("str(%d)" % len(v) if isinstance(v, str) else "null") for k, v in data.items()}
    logger.warning(
        "Bynder download URL: no url in response for id=%s response_keys=%s structure=%s",
        media_id, list(data.keys()), structure,
    )
    return None


async def get_model_bytes(access_token: str, media_id: str) -> bytes | None:
    """Fetch GLB model bytes by getting download URL and streaming the response. Returns None on failure."""
    logger.info("Model bytes request: media_id=%s", media_id)
    download_url = await get_download_url(access_token, media_id)
    if not download_url:
        logger.error("Model bytes: no download URL for media_id=%s", media_id)
        return None
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(download_url, timeout=60.0)
            if resp.status_code != 200:
                logger.error(
                    "Model stream failed: media_id=%s status=%s response_len=%d",
                    media_id, resp.status_code, len(resp.content),
                )
                return None
            content = resp.content
            content_type = resp.headers.get("content-type", "")
            logger.info(
                "Model stream ok: media_id=%s size=%d content_type=%s",
                media_id, len(content), content_type[:80] if content_type else "none",
            )
            return content
    except Exception as e:
        logger.exception("Model stream error: media_id=%s error=%s", media_id, e)
        return None


async def get_thumbnail_bytes(access_token: str, media_id: str) -> tuple[bytes, str] | None:
    """Fetch thumbnail image for media item; returns (body, content_type) or None. Proxies with Bearer so Bynder accepts."""
    item = await get_media_by_id(access_token, media_id)
    if not item:
        return None
    thumb_url = _thumbnail_url(item)
    if not thumb_url or not thumb_url.startswith("http"):
        return None
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(thumb_url, headers=_headers(access_token), timeout=10.0)
            if resp.status_code != 200:
                logger.debug("Thumbnail fetch failed: id=%s status=%s", media_id, resp.status_code)
                return None
            content_type = resp.headers.get("content-type", "image/jpeg")
            return (resp.content, content_type)
    except Exception as e:
        logger.warning("Thumbnail fetch error for %s: %s", media_id, e)
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


def _value_indicates_glb(val: str) -> bool:
    """True if string value indicates GLB (extension or MIME type)."""
    if not isinstance(val, str):
        return False
    s = val.strip().lower()
    if s == "glb":
        return True
    if s in ("model/gltf-binary", "model/glb"):
        return True
    if s.endswith(".glb"):
        return True
    return False


def _item_is_glb(item: dict) -> bool:
    """True if this media item is a GLB file (by extension, type, or MIME type)."""
    # Direct top-level keys (Bynder may use different names)
    for key in ("extension", "type", "fileType", "mediaType", "format", "fileName"):
        val = item.get(key)
        if isinstance(val, str) and _value_indicates_glb(val):
            return True
    # MIME type fields
    for key in ("mimeType", "mimetype", "contentType", "mediaType"):
        val = item.get(key)
        if isinstance(val, str) and val.strip().lower() in ("model/gltf-binary", "model/glb"):
            return True
    # typeInfo / type as object
    type_info = item.get("typeInfo") or item.get("type")
    if isinstance(type_info, dict):
        for k in ("name", "label", "extension", "type", "mimeType"):
            v = type_info.get(k)
            if isinstance(v, str) and _value_indicates_glb(v):
                return True
    if isinstance(type_info, str) and _value_indicates_glb(type_info):
        return True
    # Name / filename (originalFilename, fileName, filename, name)
    for key in ("name", "originalFilename", "filename", "fileName"):
        val = item.get(key)
        if isinstance(val, str) and val.strip().lower().endswith(".glb"):
            return True
    # Recursively check nested dicts (e.g. type: { extension: "glb" })
    for v in item.values():
        if isinstance(v, dict):
            for k in ("extension", "type", "format", "name"):
                if _value_indicates_glb(v.get(k)):
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
    """List assets for catalog grid. Filtert nach Tag (z. B. AR), Metaproperty und optional GLB."""
    items = await get_media_list(access_token, tag_filter=BYNDER_FILTER_TAG)
    used_fallback = False
    if not items:
        item = await get_media_by_id(access_token, _FALLBACK_MEDIA_ID)
        if item:
            logger.info("Media list war leer, Fallback: ein Asset per ID geladen (%s)", _FALLBACK_MEDIA_ID)
            items = [item]
            used_fallback = True

    # Optional: nur Assets mit bestimmtem Tag (z. B. "AR" für GLB/AR-fähige Dateien)
    if BYNDER_FILTER_TAG:
        before_tag = len(items)
        items = [i for i in items if _item_has_tag(i, BYNDER_FILTER_TAG)]
        if before_tag != len(items):
            logger.info("Tag-Filter '%s': %d -> %d assets", BYNDER_FILTER_TAG, before_tag, len(items))
        if len(items) == 0 and before_tag > 0:
            logger.warning(
                "Tag-Filter '%s' entfernte alle %d Items. Prüfen, ob Tag in Bynder korrekt vergeben ist.",
                BYNDER_FILTER_TAG, before_tag,
            )

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
        items_before_glb = items
        before_glb = len(items)
        items = [i for i in items if _item_is_glb(i)]
        if before_glb != len(items):
            logger.info("GLB-Filter: %d -> %d assets (nur GLB-Dateien)", before_glb, len(items))
        if len(items) == 0 and before_glb > 0:
            # Log type-related fields of first item to diagnose Bynder response shape
            first = items_before_glb[0]
            if isinstance(first, dict):
                type_keys = [k for k in first if "type" in k.lower() or "ext" in k.lower() or "format" in k.lower() or "name" in k.lower() or "file" in k.lower()]
                sample = {k: first[k] for k in type_keys[:20]}
                logger.warning(
                    "GLB-Filter removed all %d items. Bynder may use different field names. "
                    "Sample type-related keys from first item: %s",
                    before_glb, json.dumps(sample, default=str)[:600],
                )
            # Fallback: show all assets so catalog is not empty; single-asset view still gets glbUrl from download endpoint
            logger.warning("GLB-Filter fallback: showing all %d assets (GLB detection may need Bynder-specific fields).", before_glb)
            items = items_before_glb
    return [bynder_item_to_asset(item, glb_url=None) for item in items]


async def get_asset(access_token: str, asset_id: str) -> AssetResponse | None:
    """Get single asset by id; includes download URL as glbUrl."""
    item = await get_media_by_id(access_token, asset_id)
    if not item:
        return None
    glb_url = await get_download_url(access_token, asset_id)
    return bynder_item_to_asset(item, glb_url=glb_url)

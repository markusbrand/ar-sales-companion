import type { Asset } from '@/types/asset';
import { authService } from '@/services/authService';
import { getApiBaseUrl } from '@/services/env';

/** Thrown when the session expired and refresh failed (or no refresh token). Call logout and prompt re-login. */
export class AuthExpiredError extends Error {
  override readonly name = 'AuthExpiredError';
  constructor() {
    super('Sitzung abgelaufen. Bitte erneut anmelden.');
  }
}

export { getApiBaseUrl };

const getBaseUrl = getApiBaseUrl;

function getAuthHeaders(): HeadersInit {
  const token = sessionStorage.getItem('bynder_access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** On 401: try refresh once, then retry request. If still 401 or refresh fails, throw AuthExpiredError. */
async function fetchWithAuthRetry(
  url: string,
  options: RequestInit
): Promise<Response> {
  let res = await fetch(url, options);
  if (res.status !== 401) return res;
  const refreshed = await authService.refreshToken();
  if (!refreshed) throw new AuthExpiredError();
  res = await fetch(url, { ...options, headers: getAuthHeaders() });
  if (res.status === 401) throw new AuthExpiredError();
  return res;
}

export async function fetchAssetList(): Promise<Asset[]> {
  const base = getBaseUrl();
  const url = `${base}/api/assets`;
  const res = await fetchWithAuthRetry(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    const text = await res.text();
    console.error('fetchAssetList failed:', res.status, text);
    throw new Error(`Assets laden fehlgeschlagen: ${res.status}`);
  }
  return res.json();
}

export async function fetchAsset(id: string): Promise<Asset> {
  const base = getBaseUrl();
  const url = `${base}/api/assets/${encodeURIComponent(id)}`;
  const res = await fetchWithAuthRetry(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    const text = await res.text();
    console.error('fetchAsset failed:', id, res.status, text);
    throw new Error(`Asset laden fehlgeschlagen: ${res.status}`);
  }
  return res.json();
}

/** Fetch thumbnail via backend proxy (auth required); returns object URL or null. Caller must revoke the URL when done. */
export async function fetchThumbnailBlobUrl(assetId: string): Promise<string | null> {
  const base = getBaseUrl();
  const url = `${base}/api/assets/${encodeURIComponent(assetId)}/thumbnail`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * Get a short-lived same-origin URL for the model (for AR / Quick Look). Returns null if backend does not support it (503).
 */
export async function fetchModelUrl(assetId: string): Promise<string | null> {
  const base = getBaseUrl();
  const url = `${base}/api/assets/${encodeURIComponent(assetId)}/model-url`;
  const res = await fetchWithAuthRetry(url, { headers: getAuthHeaders() });
  if (res.status === 503) return null;
  if (!res.ok) return null;
  const data = (await res.json()) as { url?: string };
  return data.url ?? null;
}

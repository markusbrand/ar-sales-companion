import type { Asset } from '@/types/asset';

/**
 * In dev, use relative base so Vite proxies /api and /auth/token to the backend (port 8888).
 * In production, use VITE_API_BASE_URL.
 */
export function getApiBaseUrl(): string {
  if (import.meta.env.DEV) return '';
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
}

const getBaseUrl = getApiBaseUrl;

function getAuthHeaders(): HeadersInit {
  const token = sessionStorage.getItem('bynder_access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchAssetList(): Promise<Asset[]> {
  const base = getBaseUrl();
  const url = `${base}/api/assets`;
  const res = await fetch(url, { headers: getAuthHeaders() });
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
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    const text = await res.text();
    console.error('fetchAsset failed:', id, res.status, text);
    throw new Error(`Asset laden fehlgeschlagen: ${res.status}`);
  }
  return res.json();
}

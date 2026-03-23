/**
 * Trim trailing slash for API base URL (pure helper; unit-tested without import.meta).
 */
export function trimTrailingSlash(url: string | undefined): string {
  if (!url) return '';
  return url.replace(/\/$/, '');
}

/**
 * API base URL for backend calls.
 * In dev, use relative base (Vite proxy). In production, use VITE_API_BASE_URL.
 */
export function getApiBaseUrl(): string {
  if (import.meta.env.DEV) return '';
  return trimTrailingSlash(import.meta.env.VITE_API_BASE_URL);
}

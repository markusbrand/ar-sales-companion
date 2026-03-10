/**
 * API base URL for backend calls.
 * In dev, use relative base (Vite proxy). In production, use VITE_API_BASE_URL.
 */
export function getApiBaseUrl(): string {
  if (import.meta.env.DEV) return '';
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
}

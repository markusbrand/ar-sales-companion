import { getApiBaseUrl } from '@/services/api';

const CALLBACK_PATH = '/auth/callback';

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  const base = import.meta.env.VITE_BYNDER_BASE_URL;
  const clientId = import.meta.env.VITE_OAUTH_CLIENT_ID;
  console.log('[Auth] Env check:', {
    hasBynderBase: !!base,
    bynderBaseLength: typeof base === 'string' ? base.length : 0,
    hasClientId: !!clientId,
  });
}

function getCallbackUrl(): string {
  const base = import.meta.env.VITE_OAUTH_CALLBACK_URL;
  if (base) return base.replace(/\/$/, '') + CALLBACK_PATH;
  return `${window.location.origin}${CALLBACK_PATH}`;
}

function getBynderBase(): string {
  const raw = import.meta.env.VITE_BYNDER_BASE_URL;
  return (typeof raw === 'string' ? raw : '').trim().replace(/\/$/, '');
}

let cachedAuthorizeUrl: string | null = null;

/** Returns the Bynder authorize URL (and stores state in sessionStorage). Null if config missing. */
export function getAuthorizeUrl(): string | null {
  if (cachedAuthorizeUrl) return cachedAuthorizeUrl;
  const base = getBynderBase();
  const clientId = typeof import.meta.env.VITE_OAUTH_CLIENT_ID === 'string' ? import.meta.env.VITE_OAUTH_CLIENT_ID.trim() : '';
  if (!base || !clientId) {
    if (import.meta.env.DEV) {
      console.warn('[Auth] getAuthorizeUrl: missing config', { base: base || '(empty)', hasClientId: !!clientId });
    }
    return null;
  }
  const redirectUri = getCallbackUrl();
  const state = crypto.randomUUID();
  sessionStorage.setItem('oauth_state', state);
  const params = new URLSearchParams({
    client_id: String(clientId).trim(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'offline asset:read',
    state,
  });
  cachedAuthorizeUrl = `${base}/v6/authentication/oauth2/auth?${params.toString()}`;
  return cachedAuthorizeUrl;
}

export function clearAuthorizeUrlCache(): void {
  cachedAuthorizeUrl = null;
}

export const authService = {
  async checkSession(): Promise<boolean> {
    const token = sessionStorage.getItem('bynder_access_token');
    if (!token) return false;
    // Token vorhanden: als angemeldet betrachten. Bynder /users/me/ aus dem Browser
    // liefert oft 403 (CORS/Forbidden), daher keine direkte Bynder-Prüfung mehr.
    return true;
  },

  startOAuthFlow(): void {
    const base = getBynderBase();
    const clientId = typeof import.meta.env.VITE_OAUTH_CLIENT_ID === 'string' ? import.meta.env.VITE_OAUTH_CLIENT_ID.trim() : '';
    if (!base || !clientId) {
      console.error('VITE_BYNDER_BASE_URL or VITE_OAUTH_CLIENT_ID not set');
      return;
    }
    const redirectUri = getCallbackUrl();
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'offline asset:read',
      state,
    });
    const url = `${base}/v6/authentication/oauth2/auth?${params.toString()}`;
    window.location.href = url;
  },

  async handleCallback(code: string, state: string): Promise<{ ok: boolean; error?: string }> {
    clearAuthorizeUrlCache();
    const savedState = sessionStorage.getItem('oauth_state');
    sessionStorage.removeItem('oauth_state');
    if (!savedState || savedState !== state) {
      console.error('OAuth state mismatch');
      return { ok: false, error: 'OAuth state mismatch' };
    }
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: getCallbackUrl() }),
    });
    if (!res.ok) {
      const text = await res.text();
      let detail: string = text || res.statusText;
      if (text) {
        try {
          const json = JSON.parse(text);
          detail = json.detail ?? text;
        } catch {
          detail = text;
        }
      }
      console.error('Token exchange failed:', res.status, detail);
      return { ok: false, error: `Token-Austausch fehlgeschlagen (${res.status}): ${detail}` };
    }
    const data = await res.json();
    if (data.access_token) {
      sessionStorage.setItem('bynder_access_token', data.access_token);
      if (data.refresh_token) sessionStorage.setItem('bynder_refresh_token', data.refresh_token);
      return { ok: true };
    }
    return { ok: false, error: 'Kein Zugangstoken in der Antwort' };
  },

  async logout(): Promise<void> {
    sessionStorage.removeItem('bynder_access_token');
    sessionStorage.removeItem('bynder_refresh_token');
  },
};

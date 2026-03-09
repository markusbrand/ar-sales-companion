const CALLBACK_PATH = '/auth/callback';

function getCallbackUrl(): string {
  const base = import.meta.env.VITE_OAUTH_CALLBACK_URL;
  if (base) return base.replace(/\/$/, '') + CALLBACK_PATH;
  return `${window.location.origin}${CALLBACK_PATH}`;
}

function getBynderBase(): string {
  return (import.meta.env.VITE_BYNDER_BASE_URL || '').replace(/\/$/, '');
}

export const authService = {
  async checkSession(): Promise<boolean> {
    const token = sessionStorage.getItem('bynder_access_token');
    if (!token) return false;
    const base = getBynderBase();
    if (!base) return true;
    try {
      const res = await fetch(`${base}/api/v4/users/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  startOAuthFlow(): void {
    const base = getBynderBase();
    const clientId = import.meta.env.VITE_OAUTH_CLIENT_ID;
    if (!base || !clientId) {
      console.error('VITE_BYNDER_BASE_URL or VITE_OAUTH_CLIENT_ID not set');
      return;
    }
    const redirectUri = encodeURIComponent(getCallbackUrl());
    const scope = encodeURIComponent('offline asset:read');
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);
    const url = `${base}/api/v4/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
    window.location.href = url;
  },

  async handleCallback(code: string, state: string): Promise<boolean> {
    const savedState = sessionStorage.getItem('oauth_state');
    sessionStorage.removeItem('oauth_state');
    if (!savedState || savedState !== state) {
      console.error('OAuth state mismatch');
      return false;
    }
    const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
    const res = await fetch(`${apiBase}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: getCallbackUrl() }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('Token exchange failed:', res.status, text);
      return false;
    }
    const data = await res.json();
    if (data.access_token) {
      sessionStorage.setItem('bynder_access_token', data.access_token);
      if (data.refresh_token) sessionStorage.setItem('bynder_refresh_token', data.refresh_token);
      return true;
    }
    return false;
  },

  async logout(): Promise<void> {
    sessionStorage.removeItem('bynder_access_token');
    sessionStorage.removeItem('bynder_refresh_token');
  },
};

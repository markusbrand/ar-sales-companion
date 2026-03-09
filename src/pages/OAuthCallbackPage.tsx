import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { authService } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    if (errorParam) {
      setError(errorDescription || errorParam || 'Bynder hat die Anmeldung abgelehnt.');
      return;
    }
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code || !state) {
      setError('Ungültige OAuth-Antwort (code/state fehlt).');
      return;
    }
    authService
      .handleCallback(code, state)
      .then((result) => {
        if (result.ok) {
          setAuthenticated();
          navigate('/', { replace: true });
        } else {
          setError(result.error ?? 'Anmeldung fehlgeschlagen.');
        }
      })
      .catch((e) => {
        console.error('OAuth callback error:', e);
        setError('Anmeldung fehlgeschlagen.');
      });
  }, [searchParams, navigate, setAuthenticated]);

  if (error) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography color="text.secondary">
          Sie können zur Startseite wechseln und es erneut versuchen.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
      <CircularProgress sx={{ mb: 2 }} />
      <Typography color="text.secondary">Anmeldung wird abgeschlossen…</Typography>
    </Box>
  );
}

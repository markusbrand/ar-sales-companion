import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { authService } from '@/services/authService';

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code || !state) {
      setError('Ungültige OAuth-Antwort (code/state fehlt).');
      return;
    }
    authService
      .handleCallback(code, state)
      .then((ok) => {
        if (ok) navigate('/', { replace: true });
        else setError('Anmeldung fehlgeschlagen.');
      })
      .catch((e) => {
        console.error('OAuth callback error:', e);
        setError('Anmeldung fehlgeschlagen.');
      });
  }, [searchParams, navigate]);

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

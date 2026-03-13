import { useEffect, useState } from 'react';
import {
  Grid,
  Box,
  CircularProgress,
  Typography,
  Alert,
  Button,
} from '@mui/material';
import { fetchAssetList, AuthExpiredError } from '@/services/api';
import { AssetCard } from '@/components/AssetCard';
import { useAuth } from '@/context/AuthContext';
import { useSnackbar } from '@/context/SnackbarContext';
import type { Asset } from '@/types/asset';

export function CatalogPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, logout } = useAuth();
  const { showMessage } = useSnackbar();

  const loadCatalog = () => {
    if (!isAuthenticated) return;
    setError(null);
    setLoading(true);
    fetchAssetList()
      .then((list) => setAssets(list))
      .catch((e) => {
        if (e instanceof AuthExpiredError) {
          logout();
          showMessage('Sitzung abgelaufen. Bitte erneut anmelden.', 'error');
          setError(e.message);
        } else {
          setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
          showMessage('Katalog konnte nicht geladen werden.', 'error');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      setAssets([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAssetList()
      .then((list) => {
        if (!cancelled) setAssets(list);
      })
      .catch((e) => {
        if (!cancelled) {
          if (e instanceof AuthExpiredError) {
            logout();
            showMessage('Sitzung abgelaufen. Bitte erneut anmelden.', 'error');
            setError(e.message);
          } else {
            setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
            showMessage('Katalog konnte nicht geladen werden.', 'error');
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, showMessage, logout]);

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          textAlign: 'center',
          px: 2,
        }}
      >
        <Typography color="text.secondary" variant="body1">
          Bitte melden Sie sich an, um den Katalog zu sehen.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
        }}
      >
        <CircularProgress aria-label="Katalog wird geladen" />
        <Typography color="text.secondary" variant="body2" sx={{ mt: 2 }}>
          Katalog wird geladen…
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          textAlign: 'center',
          px: 2,
        }}
      >
        <Alert severity="error" sx={{ width: '100%', maxWidth: 360, mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={loadCatalog}>
          Erneut versuchen
        </Button>
      </Box>
    );
  }

  if (assets.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          textAlign: 'center',
          px: 2,
        }}
      >
        <Typography color="text.secondary" variant="body1">
          Keine Assets vorhanden.
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {assets.map((asset) => (
        <Grid item xs={6} sm={4} md={3} key={asset.id}>
          <AssetCard asset={asset} />
        </Grid>
      ))}
    </Grid>
  );
}

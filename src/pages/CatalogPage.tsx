import { useEffect, useState } from 'react';
import { Grid, Box, CircularProgress, Typography, Alert } from '@mui/material';
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

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      setAssets([]);
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
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          Bitte melden Sie sich an, um den Katalog zu sehen.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (assets.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        Keine Assets vorhanden.
      </Typography>
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

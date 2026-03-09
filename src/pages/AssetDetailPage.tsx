import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, CircularProgress, Alert, IconButton } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { fetchAsset } from '@/services/api';
import { ModelViewer } from '@/components/ModelViewer';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useSnackbar } from '@/context/SnackbarContext';
import type { Asset } from '@/types/asset';

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineGlbUrl, setOfflineGlbUrl] = useState<string | null>(null);
  const [offlineUsdzUrl, setOfflineUsdzUrl] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const { isFavorite, addFavorite, removeFavorite, getOfflineModelUrl } = useFavorites();
  const { showMessage } = useSnackbar();

  useEffect(() => {
    if (!id || !isAuthenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchAsset(id),
      getOfflineModelUrl(id, 'glb'),
      getOfflineModelUrl(id, 'usdz'),
    ])
      .then(([a, glbUrl, usdzUrl]) => {
        if (!cancelled) {
          setAsset(a);
          setOfflineGlbUrl(glbUrl);
          setOfflineUsdzUrl(usdzUrl);
        } else {
          if (glbUrl) URL.revokeObjectURL(glbUrl);
          if (usdzUrl) URL.revokeObjectURL(usdzUrl);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Asset nicht gefunden');
          showMessage('Asset konnte nicht geladen werden.', 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isAuthenticated, getOfflineModelUrl, showMessage]);

  useEffect(() => {
    return () => {
      if (offlineGlbUrl) URL.revokeObjectURL(offlineGlbUrl);
      if (offlineUsdzUrl) URL.revokeObjectURL(offlineUsdzUrl);
    };
  }, [offlineGlbUrl, offlineUsdzUrl]);

  const fav = asset ? isFavorite(asset.id) : false;

  const handleFav = () => {
    if (!asset) return;
    if (fav) removeFavorite(asset.id);
    else addFavorite(asset);
    showMessage(fav ? 'Aus Favoriten entfernt' : 'Zu Favoriten hinzugefügt', 'success');
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">Bitte anmelden.</Typography>
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

  if (error || !asset) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error || 'Asset nicht gefunden'}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} aria-label="Zurück">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flex: 1 }}>
          {asset.name}
        </Typography>
        <IconButton onClick={handleFav} color={fav ? 'primary' : 'default'} aria-label={fav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}>
          {fav ? <FavoriteIcon /> : <FavoriteBorderIcon />}
        </IconButton>
      </Box>

      <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, overflow: 'hidden', minHeight: 320 }}>
        <ModelViewer
          glbUrl={asset.glbUrl}
          usdzUrl={asset.usdzUrl}
          posterUrl={asset.posterUrl}
          alt={asset.name}
          offlineGlbUrl={offlineGlbUrl}
          offlineUsdzUrl={offlineUsdzUrl}
        />
      </Box>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<ViewInArIcon />}
          onClick={() => {
            const mv = document.querySelector('model-viewer');
            if (mv && (mv as unknown as { activateAR?: () => void }).activateAR) {
              (mv as unknown as { activateAR: () => void }).activateAR();
            }
          }}
        >
          In AR anzeigen
        </Button>
      </Box>
    </Box>
  );
}

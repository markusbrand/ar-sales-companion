import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, CircularProgress, Alert, IconButton } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import { fetchAsset, fetchModelUrl, fetchModelBlob, AuthExpiredError } from '@/services/api';
import { ModelViewer, type ModelViewerElement } from '@/components/ModelViewer';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useSnackbar } from '@/context/SnackbarContext';
import type { Asset } from '@/types/asset';

/** True if running on iPhone/iPad (including Safari). */
function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** True if on iOS and not Safari (e.g. Chrome). AR Quick Look often fails there. */
function isIosNonSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  return isIos() && !isSafari;
}

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineGlbUrl, setOfflineGlbUrl] = useState<string | null>(null);
  const [offlineUsdzUrl, setOfflineUsdzUrl] = useState<string | null>(null);
  const [proxyModelUrl, setProxyModelUrl] = useState<string | null>(null);
  const { isAuthenticated, logout } = useAuth();
  const { isFavorite, addFavorite, removeFavorite, getOfflineModelUrl } = useFavorites();
  const { showMessage } = useSnackbar();
  const modelViewerRef = useRef<ModelViewerElement>(null);
  const showIosSafariHint = useMemo(() => isIosNonSafari(), []);
  const showIosHint = useMemo(() => isIos(), []);

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
          if (e instanceof AuthExpiredError) {
            logout();
            showMessage('Sitzung abgelaufen. Bitte erneut anmelden.', 'error');
            setError(e.message);
          } else {
            setError(e instanceof Error ? e.message : 'Asset nicht gefunden');
            showMessage('Asset konnte nicht geladen werden.', 'error');
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isAuthenticated, getOfflineModelUrl, showMessage, logout]);

  useEffect(() => {
    if (!id || !asset) return;
    let cancelled = false;
    fetchModelUrl(id)
      .then((url) => {
        if (!cancelled && url) setProxyModelUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, asset]);

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
          ref={modelViewerRef}
          glbUrl={asset.glbUrl}
          usdzUrl={asset.usdzUrl}
          posterUrl={asset.posterUrl}
          alt={asset.name}
          offlineGlbUrl={offlineGlbUrl}
          offlineUsdzUrl={offlineUsdzUrl}
          proxyGlbUrl={proxyModelUrl}
        />
      </Box>

      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<ViewInArIcon />}
          onClick={async () => {
            const mv = modelViewerRef.current;
            if (!mv?.activateAR) {
              showMessage('AR wird auf diesem Gerät nicht unterstützt.', 'warning');
              return;
            }
            try {
              const result = mv.activateAR();
              if (result && typeof result.then === 'function') {
                await result;
              }
            } catch {
              showMessage(
                'AR konnte nicht gestartet werden. Auf dem iPhone bitte Safari verwenden – in Chrome tritt oft ein Fehler auf.',
                'error'
              );
            }
          }}
        >
          In AR anzeigen
        </Button>
        {showIosHint && (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 360 }}>
            Auf dem iPhone kann AR (Quick Look) bei iOS 17+ oft nicht geöffnet werden. Sie können das Modell als GLB herunterladen und in einer anderen App ansehen.
          </Typography>
        )}
        {showIosSafariHint && (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 320 }}>
            Tipp: AR funktioniert auf dem iPhone am ehesten in Safari. In Chrome erscheint oft „Objekt konnte nicht geöffnet werden“.
          </Typography>
        )}
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={async () => {
            if (!asset) return;
            try {
              const blob = await fetchModelBlob(asset.id);
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${asset.name.replace(/[^a-zA-Z0-9.-]+/g, '_')}.glb`;
              a.click();
              URL.revokeObjectURL(url);
              showMessage('Download gestartet.', 'success');
            } catch (e) {
              showMessage(e instanceof Error ? e.message : 'Download fehlgeschlagen.', 'error');
            }
          }}
          sx={{ mt: 0.5 }}
        >
          Modell als GLB herunterladen
        </Button>
      </Box>
    </Box>
  );
}

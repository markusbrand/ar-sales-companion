import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { SnackbarProvider } from '@/context/SnackbarContext';
import { AuthProvider } from '@/context/AuthContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { Layout } from '@/components/Layout';

const CatalogPage = lazy(() =>
  import('@/pages/CatalogPage').then((m) => ({ default: m.CatalogPage }))
);
const AssetDetailPage = lazy(() =>
  import('@/pages/AssetDetailPage').then((m) => ({ default: m.AssetDetailPage }))
);
const FavoritesPage = lazy(() =>
  import('@/pages/FavoritesPage').then((m) => ({ default: m.FavoritesPage }))
);
const ARTestPage = lazy(() =>
  import('@/pages/ARTestPage').then((m) => ({ default: m.ARTestPage }))
);
const OAuthCallbackPage = lazy(() =>
  import('@/pages/OAuthCallbackPage').then((m) => ({ default: m.OAuthCallbackPage }))
);

function RouteFallback() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '40vh',
      }}
    >
      <CircularProgress aria-label="Seite wird geladen" />
    </Box>
  );
}

export default function App() {
  return (
    <SnackbarProvider>
      <AuthProvider>
        <FavoritesProvider>
          <Layout>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<CatalogPage />} />
                <Route path="/asset/:id" element={<AssetDetailPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/ar-test" element={<ARTestPage />} />
                <Route path="/auth/callback" element={<OAuthCallbackPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Layout>
        </FavoritesProvider>
      </AuthProvider>
    </SnackbarProvider>
  );
}

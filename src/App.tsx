import { Routes, Route, Navigate } from 'react-router-dom';
import { SnackbarProvider } from '@/context/SnackbarContext';
import { AuthProvider } from '@/context/AuthContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { Layout } from '@/components/Layout';
import { CatalogPage } from '@/pages/CatalogPage';
import { AssetDetailPage } from '@/pages/AssetDetailPage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { ARTestPage } from '@/pages/ARTestPage';
import { OAuthCallbackPage } from '@/pages/OAuthCallbackPage';

export default function App() {
  return (
    <SnackbarProvider>
      <AuthProvider>
        <FavoritesProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<CatalogPage />} />
              <Route path="/asset/:id" element={<AssetDetailPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/ar-test" element={<ARTestPage />} />
              <Route path="/auth/callback" element={<OAuthCallbackPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </FavoritesProvider>
      </AuthProvider>
    </SnackbarProvider>
  );
}

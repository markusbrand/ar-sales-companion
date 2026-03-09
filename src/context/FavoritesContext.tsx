import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { favoritesStore } from '@/services/favoritesStore';
import type { Asset } from '@/types/asset';

interface FavoritesContextValue {
  favoriteIds: Set<string>;
  isFavorite: (id: string) => boolean;
  addFavorite: (asset: Asset) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  getOfflineModelUrl: (id: string, format: 'glb' | 'usdz') => Promise<string | null>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const loadIds = useCallback(async () => {
    try {
      const ids = await favoritesStore.getFavoriteIds();
      setFavoriteIds(new Set(ids));
    } catch (e) {
      console.error('Failed to load favorite IDs:', e);
    }
  }, []);

  useEffect(() => {
    loadIds();
  }, [loadIds]);

  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  const addFavorite = useCallback(async (asset: Asset) => {
    await favoritesStore.addFavorite(asset);
    setFavoriteIds((prev) => new Set([...prev, asset.id]));
  }, []);

  const removeFavorite = useCallback(async (id: string) => {
    await favoritesStore.removeFavorite(id);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const getOfflineModelUrl = useCallback(async (id: string, format: 'glb' | 'usdz'): Promise<string | null> => {
    return favoritesStore.getModelBlobUrl(id, format);
  }, []);

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        isFavorite,
        addFavorite,
        removeFavorite,
        getOfflineModelUrl,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

// Hook in same file is intentional; context + provider + hook are used together
// eslint-disable-next-line react-refresh/only-export-components
export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}

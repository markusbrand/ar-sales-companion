import { get, set, del } from 'idb-keyval';
import type { Asset } from '@/types/asset';

const DB_PREFIX = 'ar-sales-fav-';
const ID_LIST_KEY = 'ar-sales-fav-ids';

async function getStoredIds(): Promise<string[]> {
  const raw = await get<string[]>(ID_LIST_KEY);
  return Array.isArray(raw) ? raw : [];
}

async function setStoredIds(ids: string[]): Promise<void> {
  await set(ID_LIST_KEY, ids);
}

async function fetchBlob(url: string): Promise<Blob> {
  const token = sessionStorage.getItem('bynder_access_token');
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return res.blob();
}

export const favoritesStore = {
  async getFavoriteIds(): Promise<string[]> {
    return getStoredIds();
  },

  async addFavorite(asset: Asset): Promise<void> {
    const ids = await getStoredIds();
    if (ids.includes(asset.id)) return;
    const [glbBlob, usdzBlob] = await Promise.all([
      fetchBlob(asset.glbUrl).catch((e) => {
        console.warn('GLB download failed for', asset.id, e);
        return null;
      }),
      asset.usdzUrl ? fetchBlob(asset.usdzUrl).catch(() => null) : Promise.resolve(null),
    ]);
    if (glbBlob) await set(`${DB_PREFIX}glb-${asset.id}`, glbBlob);
    if (usdzBlob) await set(`${DB_PREFIX}usdz-${asset.id}`, usdzBlob);
    await setStoredIds([...ids, asset.id]);
  },

  async removeFavorite(id: string): Promise<void> {
    await del(`${DB_PREFIX}glb-${id}`);
    await del(`${DB_PREFIX}usdz-${id}`);
    const ids = await getStoredIds();
    await setStoredIds(ids.filter((x) => x !== id));
  },

  async getModelBlobUrl(id: string, format: 'glb' | 'usdz'): Promise<string | null> {
    const key = `${DB_PREFIX}${format}-${id}`;
    const blob = await get<Blob>(key);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  },
};

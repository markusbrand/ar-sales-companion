/**
 * Asset as returned from Bynder / Asset-Broker API.
 */
export interface Asset {
  id: string;
  name: string;
  thumbnailUrl: string;
  /** URL to GLB (Android/Web). */
  glbUrl: string;
  /** URL to USDZ (iOS). Optional, backend provides when available. */
  usdzUrl?: string;
  /** Poster image URL while 3D loads (e.g. WebP from Bynder). */
  posterUrl?: string;
  fileSizeBytes?: number;
  metadata?: Record<string, string>;
}

export interface AssetListItem {
  id: string;
  name: string;
  thumbnailUrl: string;
  /** Only set when asset is in favorites and we have a local blob. */
  offlineGlbBlob?: Blob;
  offlineUsdzBlob?: Blob;
}

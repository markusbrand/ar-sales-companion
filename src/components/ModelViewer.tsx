import type React from 'react';

export interface ModelViewerProps {
  glbUrl: string;
  usdzUrl?: string | null;
  posterUrl?: string | null;
  alt?: string;
  /** Prefer offline blob URL for GLB (from IndexedDB). */
  offlineGlbUrl?: string | null;
  /** Prefer offline blob URL for USDZ (from IndexedDB). */
  offlineUsdzUrl?: string | null;
  onLoad?: () => void;
  onError?: (e: Event) => void;
}

export function ModelViewer({
  glbUrl,
  usdzUrl,
  posterUrl,
  alt = '3D model',
  offlineGlbUrl,
  offlineUsdzUrl,
  onLoad,
  onError,
}: ModelViewerProps) {
  const src = offlineGlbUrl || glbUrl;
  const iosSrc = offlineUsdzUrl || usdzUrl || undefined;
  const poster = posterUrl || undefined;

  return (
    <model-viewer
      src={src}
      ios-src={iosSrc}
      poster={poster}
      alt={alt}
      environment-image="neutral"
      shadow-intensity="1"
      camera-controls
      ar
      ar-modes="webxr scene-viewer quick-look"
      touch-action="pan-y"
      onLoad={onLoad}
      onError={onError ? (e: React.SyntheticEvent) => onError((e as unknown as { nativeEvent?: Event }).nativeEvent ?? (e as unknown as Event)) : undefined}
      style={{ width: '100%', height: '100%', minHeight: 320 }}
    />
  );
}

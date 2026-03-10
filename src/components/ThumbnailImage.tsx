import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { fetchThumbnailBlobUrl } from '@/services/api';

interface ThumbnailImageProps {
  assetId: string;
  alt: string;
  height?: number;
  fallbackUrl?: string;
}

/** Loads thumbnail via backend proxy (auth) and shows image or placeholder. */
export function ThumbnailImage({ assetId, alt, height = 160, fallbackUrl }: ThumbnailImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let blobUrl: string | null = null;
    let cancelled = false;

    fetchThumbnailBlobUrl(assetId)
      .then((url) => {
        if (!cancelled && url) {
          blobUrl = url;
          setSrc(url);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [assetId]);

  if (src) {
    return (
      <Box
        component="img"
        src={src}
        alt={alt}
        loading="lazy"
        sx={{
          width: '100%',
          height,
          objectFit: 'contain',
          bgcolor: 'grey.100',
        }}
      />
    );
  }

  if (fallbackUrl && !failed) {
    return (
      <Box
        component="img"
        src={fallbackUrl}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        sx={{
          width: '100%',
          height,
          objectFit: 'contain',
          bgcolor: 'grey.100',
        }}
      />
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height,
        bgcolor: 'grey.200',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box component="span" sx={{ color: 'grey.500', fontSize: '0.75rem' }}>
        Kein Vorschaubild
      </Box>
    </Box>
  );
}

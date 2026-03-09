import { useNavigate } from 'react-router-dom';
import { Card, CardMedia, CardContent, CardActionArea, Typography, Box } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import type { Asset } from '@/types/asset';
import { useFavorites } from '@/context/FavoritesContext';

interface AssetCardProps {
  asset: Asset;
}

export function AssetCard({ asset }: AssetCardProps) {
  const navigate = useNavigate();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const fav = isFavorite(asset.id);

  const handleFavClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (fav) removeFavorite(asset.id);
    else addFavorite(asset);
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={() => navigate(`/asset/${asset.id}`)} sx={{ flex: 1 }}>
        <CardMedia
          component="img"
          height="160"
          image={asset.thumbnailUrl}
          alt={asset.name}
          loading="lazy"
          sx={{ objectFit: 'contain', bgcolor: 'grey.100' }}
        />
        <CardContent sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} noWrap>
            {asset.name}
          </Typography>
        </CardContent>
      </CardActionArea>
      <Box sx={{ p: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
        <Box
          component="button"
          onClick={handleFavClick}
          sx={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: fav ? 'primary.main' : 'grey.500',
            p: 0.5,
          }}
          aria-label={fav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
        >
          {fav ? <FavoriteIcon /> : <FavoriteBorderIcon />}
        </Box>
      </Box>
    </Card>
  );
}

import { useNavigate } from 'react-router-dom';
import { Box, Typography, List, ListItemButton, ListItemText } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';

export function FavoritesPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { favoriteIds } = useFavorites();
  const ids = Array.from(favoriteIds);

  if (!isAuthenticated) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">Bitte anmelden.</Typography>
      </Box>
    );
  }

  if (ids.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        Noch keine Favoriten. Markieren Sie im Katalog Assets als Favorit, um sie offline zu nutzen.
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Favoriten (offline verfügbar)
      </Typography>
      <List>
        {ids.map((id) => (
          <ListItemButton key={id} onClick={() => navigate(`/asset/${id}`)}>
            <ListItemText primary={id} secondary="Tippen zum Öffnen" />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}

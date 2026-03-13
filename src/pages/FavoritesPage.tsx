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
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          textAlign: 'center',
          px: 2,
        }}
      >
        <Typography color="text.secondary" variant="body1">
          Bitte anmelden.
        </Typography>
      </Box>
    );
  }

  if (ids.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          textAlign: 'center',
          px: 2,
        }}
      >
        <Typography color="text.secondary" variant="body1">
          Noch keine Favoriten. Markieren Sie im Katalog Assets als Favorit, um
          sie offline zu nutzen.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Favoriten (offline verfügbar)
      </Typography>
      <List disablePadding>
        {ids.map((id) => (
          <ListItemButton
            key={id}
            onClick={() => navigate(`/asset/${id}`)}
            sx={{ minHeight: 48 }}
          >
            <ListItemText primary={id} secondary="Tippen zum Öffnen" />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}

import { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, CircularProgress } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ViewListIcon from '@mui/icons-material/ViewList';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '@/context/AuthContext';

export function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, login, logout } = useAuth();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky">
        <Toolbar>
          <Typography
            variant="h6"
            component="button"
            type="button"
            onClick={() => navigate('/')}
            sx={{ flexGrow: 1, cursor: 'pointer', color: 'inherit', background: 'none', border: 'none', textAlign: 'left' }}
          >
            AR Sales Companion
          </Typography>
          <Button type="button" color="inherit" startIcon={<ViewListIcon />} onClick={() => navigate('/')} sx={{ opacity: location.pathname === '/' ? 1 : 0.8 }}>
            Katalog
          </Button>
          <Button type="button" color="inherit" startIcon={<FavoriteIcon />} onClick={() => navigate('/favorites')} sx={{ opacity: location.pathname === '/favorites' ? 1 : 0.8 }}>
            Favoriten
          </Button>
          {isLoading ? (
            <CircularProgress size={24} color="inherit" sx={{ ml: 1 }} />
          ) : isAuthenticated ? (
            <Button type="button" color="inherit" startIcon={<LogoutIcon />} onClick={logout}>
              Abmelden
            </Button>
          ) : (
            <Button type="button" color="inherit" startIcon={<LoginIcon />} onClick={login}>
              Anmelden
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flex: 1, p: 2 }}>
        {children}
      </Box>
    </Box>
  );
}

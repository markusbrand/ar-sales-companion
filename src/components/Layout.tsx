import { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  BottomNavigation,
  BottomNavigationAction,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import ViewListIcon from '@mui/icons-material/ViewList';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '@/context/AuthContext';

const BOTTOM_NAV_HEIGHT = 56;
const SAFE_AREA_BOTTOM = 'env(safe-area-inset-bottom, 0px)';

/** Routes that are considered "root" (show title only, no back button). */
function isRootRoute(pathname: string): boolean {
  return pathname === '/' || pathname.startsWith('/auth/');
}

/** Whether to show the bottom navigation bar. */
function showBottomNav(pathname: string): boolean {
  if (pathname.startsWith('/auth/')) return false;
  if (pathname === '/') return true;
  if (pathname === '/favorites') return true;
  if (pathname === '/ar-test') return true;
  if (pathname.startsWith('/asset/')) return false; // detail: back only, no bottom nav
  return true;
}

/** Value for BottomNavigation from pathname. */
function bottomNavValue(pathname: string): string {
  if (pathname === '/favorites') return '/favorites';
  if (pathname === '/ar-test') return '/ar-test';
  return '/';
}

export function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, login, logout } = useAuth();
  const pathname = location.pathname;
  const showNav = showBottomNav(pathname);
  const navValue = bottomNavValue(pathname);

  const handleBottomNavChange = (_: React.SyntheticEvent, value: string) => {
    if (value) navigate(value);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ minHeight: { xs: 56 } }}>
          {!isRootRoute(pathname) && !pathname.startsWith('/auth/') ? (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="Zurück"
              onClick={() => navigate(-1)}
              sx={{ mr: 1 }}
            >
              <ArrowBackIcon />
            </IconButton>
          ) : null}
          <Typography
            variant="h6"
            component="button"
            type="button"
            onClick={() => navigate('/')}
            sx={{
              flex: 1,
              cursor: 'pointer',
              color: 'inherit',
              background: 'none',
              border: 'none',
              textAlign: 'left',
              fontWeight: 600,
              fontSize: '1.25rem',
            }}
          >
            {pathname.startsWith('/auth/') ? 'Anmeldung' : 'AR Sales Companion'}
          </Typography>
          {pathname.startsWith('/auth/') ? null : isLoading ? (
            <IconButton color="inherit" disabled aria-label="Wird geladen">
              <CircularProgress size={24} color="inherit" />
            </IconButton>
          ) : isAuthenticated ? (
            <IconButton color="inherit" onClick={logout} aria-label="Abmelden">
              <LogoutIcon />
            </IconButton>
          ) : (
            <IconButton color="inherit" onClick={login} aria-label="Anmelden">
              <LoginIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flex: 1,
          p: 2,
          paddingBottom: showNav
            ? `calc(${BOTTOM_NAV_HEIGHT}px + ${SAFE_AREA_BOTTOM} + 8px)`
            : 2,
        }}
      >
        {children}
      </Box>

      {showNav ? (
        <Box
          component="nav"
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: (theme) => theme.zIndex.appBar,
            paddingBottom: SAFE_AREA_BOTTOM,
            backgroundColor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <BottomNavigation
            value={navValue}
            onChange={handleBottomNavChange}
            showLabels
            sx={{ minHeight: BOTTOM_NAV_HEIGHT }}
          >
            <BottomNavigationAction
              label="Katalog"
              value="/"
              icon={<ViewListIcon />}
            />
            <BottomNavigationAction
              label="Favoriten"
              value="/favorites"
              icon={<FavoriteIcon />}
            />
            <BottomNavigationAction
              label="AR testen"
              value="/ar-test"
              icon={<ViewInArIcon />}
            />
          </BottomNavigation>
        </Box>
      ) : null}
    </Box>
  );
}

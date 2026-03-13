import { createTheme } from '@mui/material/styles';

/**
 * Material Design 3–aligned theme with CSS variables and light/dark color schemes.
 * Mobile-first; typography and shape follow M3 guidelines.
 */
export const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    dark: true,
  },
  palette: {
    primary: { main: '#6750A4' },
    secondary: { main: '#625B71' },
    background: { default: '#FEF7FF', paper: '#FFFBFE' },
    error: { main: '#B3261E' },
    warning: { main: '#F9A825' },
    success: { main: '#2E7D32' },
    info: { main: '#1976d2' },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 400, fontSize: '2.125rem', lineHeight: 1.235 },
    h2: { fontWeight: 400, fontSize: '1.5rem', lineHeight: 1.334 },
    h3: { fontWeight: 500, fontSize: '1.25rem', lineHeight: 1.4 },
    h4: { fontWeight: 500, fontSize: '1.125rem', lineHeight: 1.5 },
    h5: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.5 },
    h6: { fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.57 },
    subtitle1: { fontWeight: 500, fontSize: '1rem', lineHeight: 1.5 },
    subtitle2: { fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.43 },
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.43 },
    button: { fontWeight: 500, textTransform: 'none' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          minHeight: 48,
          borderRadius: 20,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 48,
          minHeight: 48,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          boxShadow: '0 -1px 3px rgba(0,0,0,0.08)',
          minHeight: 56,
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 64,
          minHeight: 48,
          paddingTop: 8,
          paddingBottom: 8,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          minHeight: 56,
          minWidth: 56,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          minHeight: 48,
        },
      },
    },
  },
});

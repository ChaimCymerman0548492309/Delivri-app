import { createTheme } from '@mui/material';

export const appTheme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'light',
    primary: { main: '#0d9488', light: '#5eead4', dark: '#0f766e', contrastText: '#fff' },
    secondary: { main: '#6366f1', light: '#a5b4fc', dark: '#4f46e5' },
    success: { main: '#22c55e' },
    warning: { main: '#f59e0b' },
    error: { main: '#ef4444' },
    background: { default: '#f0fdfa', paper: '#ffffff' },
  },
  typography: {
    fontFamily: '"Rubik", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 10 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)',
        },
      },
    },
  },
});

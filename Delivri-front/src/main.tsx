import { ThemeProvider, createTheme } from '@mui/material';
import React from 'react';
import ReactDOM from 'react-dom/client';
import MapViewEnhanced from './components/MapViewEnhanced';
import './index.css';
import AppErrorBoundary from './pages/ErrorBoundary';

const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Rubik", "Helvetica", "Arial", sans-serif',
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <AppErrorBoundary>
        <MapViewEnhanced />
      </AppErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>,
);

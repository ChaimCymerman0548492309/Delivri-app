import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import MapViewEnhanced from './components/MapViewEnhanced';
import AppErrorBoundary from './pages/ErrorBoundary';
import { appTheme } from './theme/appTheme';
import './App.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <AppErrorBoundary>
        <MapViewEnhanced />
      </AppErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
);

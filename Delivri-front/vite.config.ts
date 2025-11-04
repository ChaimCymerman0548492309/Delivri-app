import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/nominatim/, ''),
      },
      '/photon': {
        target: 'https://photon.komoot.io',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/photon/, ''),
      },
      '/osrm': {
        target: 'https://router.project-osrm.org',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/osrm/, ''),
      },
      '/ors': {
        target: 'https://api.openrouteservice.org',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ors/, ''),
      },
    },
  },
});

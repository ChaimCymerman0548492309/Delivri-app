# Delivri Frontend

Frontend application for Delivri, built with React + TypeScript + Vite.

For monorepo-wide setup (backend, database, functions, deployment), see the root [`README.md`](../README.md).

## Stack

- React 19
- TypeScript
- Vite
- MUI
- MapLibre GL
- Recharts

## Development setup

```bash
npm ci
```

Create `.env.local`:

```env
VITE_API_URL=http://localhost:8080/api
VITE_ORS_API_KEY=your_openrouteservice_key
```

Run development server:

```bash
npm run dev
```

## Available scripts

- `npm run dev` - start Vite dev server
- `npm run build` - type-check and create production build
- `npm run preview` - preview the production build
- `npm run lint` - run ESLint

## API and routing behavior

- Analytics API base URL is read from `VITE_API_URL`.
- Geocoding/routing services are proxied in local development through Vite (`/photon`, `/nominatim`, `/osrm`, `/ors`).
- In production, the app uses direct external service URLs for these providers.

## Production deployment

This repository includes a GitHub Actions workflow to deploy this frontend to GitHub Pages:

`/.github/workflows/deploy-frontend-pages.yml`

Required GitHub repo configuration:

- Enable GitHub Pages (build source: **GitHub Actions**)
- Optional:
  - Repository Variable: `VITE_API_URL`
  - Repository Secret: `VITE_ORS_API_KEY`

If Pages is not enabled yet, the workflow skips deployment and prints a clear notice in Actions logs.

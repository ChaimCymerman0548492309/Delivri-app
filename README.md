# Delivri App Monorepo

Delivri is a route-planning and delivery analytics project split into three apps:

- `Delivri-front` - React + Vite web client (map, routing, dashboard)
- `Delivri-beck` - Express + TypeScript API for event tracking and BI stats
- `functions` - Firebase Cloud Functions used as proxy endpoints

This repository is organized as a monorepo so each part can be developed and deployed independently.

## Repository structure

```text
.
|- Delivri-front/    # Frontend (Vite + React + TypeScript)
|- Delivri-beck/     # Backend API (Express + Drizzle + PostgreSQL)
|- functions/        # Firebase Functions (proxy endpoints)
|- firebase.json     # Root Firebase config (functions)
```

## Tech stack

### Frontend (`Delivri-front`)

- React 19
- TypeScript
- Vite
- MUI
- MapLibre GL
- Recharts

### Backend (`Delivri-beck`)

- Node.js + Express 5
- TypeScript
- Drizzle ORM
- PostgreSQL
- Zod validation
- Helmet, CORS, rate limiting, Pino logging

### Serverless proxy (`functions`)

- Firebase Functions
- `node-fetch`

## Prerequisites

- Node.js 22+ (recommended to match functions runtime)
- npm 10+
- PostgreSQL instance (for `Delivri-beck`)

## Local development

Run each service in a separate terminal.

### 1) Backend API (`Delivri-beck`)

```bash
cd Delivri-beck
npm ci
```

Create `.env` in `Delivri-beck`:

```env
PORT=8080
NODE_ENV=development
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB_NAME
LOG_LEVEL=debug
```

Start API:

```bash
npm run dev
```

Build and run production-style:

```bash
npm run build
npm start
```

### 2) Frontend (`Delivri-front`)

```bash
cd Delivri-front
npm ci
```

Create `.env.local` in `Delivri-front`:

```env
VITE_API_URL=http://localhost:8080/api
VITE_ORS_API_KEY=your_openrouteservice_key
```

Start frontend:

```bash
npm run dev
```

Build:

```bash
npm run build
```

### 3) Firebase proxy functions (`functions`, optional for local)

```bash
cd functions
npm ci
npm run serve
```

## Database bootstrap (minimal schema)

If your PostgreSQL database is empty, create the core tables:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text,
  ip_hash text,
  user_agent text,
  first_seen timestamp DEFAULT NOW(),
  last_seen timestamp DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  event_type text NOT NULL,
  event_data jsonb,
  created_at timestamp DEFAULT NOW()
);
```

## API quick reference

Base URL: `http://localhost:8080`

- `POST /api/events`
- `GET /api/stats`
- `GET /api/stats/top-searches`
- `GET /api/stats/active-users`
- `GET /api/stats/event-types`
- `GET /api/stats/city-stats`
- `GET /api/stats/daily-stats`
- `GET /api/stats/usage-metrics`
- `GET /api/stats/user-activities`
- `GET /api/stats/time-stats`
- `GET /api/stats/route-metrics`
- `DELETE /api/events?olderThan=30`

## Free deployment

### Implemented in this repo: frontend GitHub Pages deployment

This repository includes a workflow at:

`/.github/workflows/deploy-frontend-pages.yml`

The workflow:

1. Builds `Delivri-front`
2. Uses a repository-based Vite `base` path (`/<repo-name>/`)
3. Deploys static output to GitHub Pages when Pages is enabled

Required configuration in GitHub:

- Enable Pages with **GitHub Actions** as the build source
- Optional repo variables/secrets:
  - `VITE_API_URL` (Repository Variable)
  - `VITE_ORS_API_KEY` (Repository Secret)

If Pages is not enabled yet, the workflow keeps the build artifact and skips only the deploy job.

### Backend deployment note

`Delivri-beck` needs a Node runtime plus PostgreSQL. A free deployment path is possible (for example Render/Railway free tiers), but it requires provider account setup and database credentials outside this repository.

## Troubleshooting

- CORS errors from frontend to backend:
  - Ensure frontend origin is allowed in backend CORS configuration.
- `DATABASE_URL` errors:
  - Verify SSL and credentials for your PostgreSQL provider.
- ORS routing issues:
  - Confirm `VITE_ORS_API_KEY` is valid.
- Pages route refresh 404:
  - The workflow deploys a SPA build; if needed, verify `index.html` fallback behavior in hosting config.

## License

No license file is currently defined in this repository.

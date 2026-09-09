# SmartDisc

Monorepo with two parts:

- **Application** — Vue 3 + Capacitor frontend (ships as a native iOS/Android app). Always run locally with `npm`, never in Docker.
- **Server** — Symfony 8 API on FrankenPHP, with PostgreSQL. Always run in Docker.

## Prerequisites

- Docker with the Compose plugin (`docker compose ...`, v2 syntax) — for the API
- Node.js `^20.19.0 || >=22.12.0` (see `engines` in `Application/package.json`) — for the frontend

## Run the server (API)

There are exactly two Compose files in this repo: `compose.yaml` (dev) and `compose.prod.yaml` (production). No scripts, no `.env` files required — both ship with safe dev defaults.

From the repo root:

```bash
docker compose up --build
```

This builds and starts the Symfony API + PostgreSQL. First boot also runs the database migrations and generates a JWT keypair automatically.

API: http://localhost:8083

Override any of the following by exporting env vars or dropping a root-level `.env` file before running `docker compose up`:

| Variable | Default |
|---|---|
| `HTTP_PORT` | `8083` |
| `APP_SECRET` | dev placeholder |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `app` / `app` / `app` |
| `JWT_PASSPHRASE` | dev placeholder |
| `CADDY_MERCURE_JWT_SECRET` | dev placeholder |

### Production

`compose.prod.yaml` has no insecure defaults — it refuses to start with a clear error if a required variable is missing.

Required: `SERVER_NAME`, `APP_SECRET`, `POSTGRES_PASSWORD`, `CADDY_MERCURE_JWT_SECRET`, `JWT_PASSPHRASE`. Optional (have defaults): `POSTGRES_DB`, `POSTGRES_USER`, `HTTP_PORT`.

```bash
SERVER_NAME=your-domain.example.com \
APP_SECRET=$(openssl rand -hex 16) \
POSTGRES_PASSWORD=$(openssl rand -hex 12) \
CADDY_MERCURE_JWT_SECRET=$(openssl rand -hex 16) \
JWT_PASSPHRASE=$(openssl rand -hex 16) \
docker compose -f compose.prod.yaml up -d --build
```

## Run the frontend (Application)

The Vue app is never run in Docker — always run it locally with npm:

```bash
cd Application
npm install
npm run dev
```

App (Vite dev server): http://localhost:5173

Copy `.env.example` to `.env` if you need to override `VITE_API_BASE_URL` (defaults to `http://localhost:8083`, matching the Dockerized API's default `HTTP_PORT`).

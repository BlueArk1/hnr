# HNR — Hacker News Reader

Lightweight, mobile-friendly, dark-themed Hacker News client (Vue 3 + Vite + Tailwind CSS) with JWT authentication.

## Features
- Five feeds (Top, New, Show HN, Ask HN, Jobs) with pagination.
- Threaded, collapsible, sanitized comments.
- JWT login (username + password).
- Account creation **only** inside the container (no public signup).

## Local dev
```bash
npm install
npm run dev        # frontend on :5173 (proxies /api to :4000)
npm run server     # auth backend on :4000
```

## Create a user (inside the container)
```bash
docker compose exec hnr npm run create-user -- alice 's3cret' user
# or
docker exec -it hnr npm run create-user -- alice 's3cret' user
```

## Docker
```bash
docker compose up -d
# http://localhost:4000
```

## CI / CD
`.github/workflows/deploy.yml` builds the frontend, then builds & pushes the image to `ghcr.io/blueark1/hnr` on push to `main` or manual dispatch.

## Environment variables
| Var | Default | Purpose |
|-----|---------|---------|
| `JWT_SECRET` | `dev-insecure-secret-change-me` | JWT signing secret — **set in production** |
| `JWT_EXPIRES` | `7d` | Token lifetime |
| `PORT` | `4000` | HTTP port |
| `DATA_DIR` | `/app/data` | Where `users.json` is stored |
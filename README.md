# HNR — Hacker News Reader

Lightweight, mobile-friendly, dark-themed Hacker News client (Vue 3 + Vite + Tailwind CSS) with JWT authentication.

## Features
- Four feeds (Top, New, Show HN, Ask HN) with pagination.
- Threaded, collapsible, sanitized comments.
- JWT login (username + password).
- Account creation **only** inside the container (no public signup).
- Per-user settings: accent color, font family, font scale, password change.

## Local dev
```bash
npm install
npm run dev        # frontend on :5173 (proxies /api to :4000)
npm run server     # auth backend on :4000
```

## Create a user (inside the container)
There is **no public signup** — accounts are created by an admin from the container shell:

```bash
docker compose exec hnr npm run create-user -- alice 's3cret' user
# or
docker exec -it hnr npm run create-user -- alice 's3cret' user
```

- `alice` = username, `'s3cret'` = password (min 6 chars), `user` = role (`user` or `admin`).
- Users are stored in `data/users.json` (persisted via the `hnr-data` volume).

## Docker
```bash
docker compose up -d
# http://localhost:4000
```

> **Security:** the container binds to `127.0.0.1:4000` only — it is **not exposed to the internet**. To serve it publicly, put a reverse proxy (Caddy, nginx, Traefik) in front of it, or use an SSH tunnel. Set a strong `JWT_SECRET` in your `.env`.

## CI / CD
`.github/workflows/deploy.yml` builds the frontend, then builds & pushes the image to `ghcr.io/blueark1/hnr` on push to `main` or manual dispatch.

## Environment variables
| Var | Default | Purpose |
|-----|---------|---------|
| `JWT_SECRET` | `dev-insecure-secret-change-me` | JWT signing secret — **set in production** |
| `JWT_EXPIRES` | `7d` | Token lifetime |
| `PORT` | `4000` | HTTP port |
| `DATA_DIR` | `/app/data` | Where `users.json` is stored |
# HNR — Hacker News Reader: Design Document

## 1. Overview

**HNR** is a lightweight, mobile-friendly, dark-themed web client for
[Hacker News](https://news.ycombinator.com). It reads directly from the
official **Hacker News Firebase API** and renders five feeds (Top, New, Show
HN, Ask HN, Jobs) plus threaded, collapsible comment sections. It is a
single-page application (SPA) built with Vite, served by a small Express
backend that also provides **JWT authentication**. Docker images are published
to GHCR.

The goal for any agent working here: understand the existing, working
codebase, then extend it without breaking its lightweight, no-db constraints.

### Core principles
- **No database.** HN content comes from the public Firebase API; the only
  persisted data is a JSON user store (`data/users.json`) for auth.
- **Fast by default.** Small dependency set, concurrency-limited batched
  fetches, in-memory fetch cache with TTL, code-split route components, manual
  vendor chunking.
- **Static-host friendly.** Built with Vite; Express serves the static bundle
  with SPA fallback and hosts the `/api/auth` endpoints.
- **Safe by default.** User content (comments) is sanitized with DOMPurify;
  passwords are bcrypt-hashed; JWTs are signed with a server secret.
- **Privacy-minded.** No analytics, no cookies, no trackers. Only
  `localStorage` is used (route memory + auth token).

---

## 2. Tech Stack

| Concern           | Choice                                              |
|-------------------|-----------------------------------------------------|
| Framework         | Vue 3 (`<script setup>` Composition API)            |
| Build tool        | Vite 6                                              |
| Routing           | vue-router 4 (`createWebHistory`)                   |
| State management  | Pinia 2 (composition-style store)                   |
| Styling           | Tailwind CSS 3 + Autoprefixer + PostCSS             |
| HTML sanitization | DOMPurify                                           |
| Auth              | Express 4 + JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`) |
| Container         | Multi-stage Docker (node:22-alpine build → node:22-alpine runtime) |
| Deploy target     | GitHub Container Registry (`ghcr.io/blueark1/hnr`)  |
| Package manager   | npm (`npm ci` in CI/container)                      |

`package.json` is minimal on purpose — do not add heavy dependencies.

---

## 3. Project Structure

```
HNR/
├── index.html                 # SPA entry; inline bg to prevent FOUC; meta tags
├── package.json               # scripts: dev / build / preview
├── vite.config.js             # vue plugin, port 5173, manualChunks, drop console logs
├── tailwind.config.js         # custom "m2" color palette (dark Material 2 theme)
├── postcss.config.js          # tailwindcss + autoprefixer
├── Dockerfile                 # build → runtime (node:22-alpine)
├── docker-compose.yml         # runs ghcr.io/blueark1/hnr:latest on :4000
├── .github/workflows/deploy.yml  # push to main / manual → build & push to GHCR
├── server/
│   ├── index.js               # Express: static SPA + /api/auth
│   ├── routes/auth.js         # POST /login, GET /me (JWT verify)
│   └── lib/users.js           # JSON user store, bcrypt hash/verify
├── scripts/
│   └── create-user.js         # CLI: create account (run inside container)
└── src/
    ├── main.js                # createApp + Pinia + router + style.css
    ├── App.vue                # sticky header w/ feed nav, router-view, route memory
    ├── style.css              # Tailwind directives, scrollbar, font stack
    ├── router/index.js        # routes: /, /:feed, /item/:id, catch-all
    ├── stores/news.js         # Pinia store: fetching, caching, pagination, scroll
    ├── views/
    │   ├── NewsView.vue       # feed list + pagination ("Load More")
    │   └── ItemView.vue       # story detail + threaded comments
    └── components/
        ├── NewsCard.vue       # single story row in a feed
        └── CommentTree.vue    # recursive threaded comment (collapsible)
```

---

## 4. Data Model (HN Firebase API)

Base URL: `https://hacker-news.firebaseio.com/v0`

### Feed endpoints (return arrays of numeric IDs)
| Feed  | Endpoint          |
|-------|-------------------|
| top   | `/topstories.json` |
| new   | `/newstories.json` |
| show  | `/showstories.json` |
| ask   | `/askstories.json` |
| job   | `/jobstories.json` |

### Item endpoint (single object by ID)
`GET /item/{id}.json`

```jsonc
{
  "id": 1,
  "title": "Story title",        // stories/jobs
  "url": "https://...",           // external link (absent for Ask HN)
  "score": 42,
  "by": "username",
  "time": 1699999999,             // unix seconds
  "descendants": 12,              // comment count (may be null)
  "text": "<p>HTML body</p>",     // Ask HN / comment bodies (HTML from HN)
  "kids": [2, 3, 4],              // child comment IDs (may be null/absent)
  "type": "story|comment|job",
  "deleted": true,                // comments only, optional
  "dead": true                    // comments only, optional
}
```

Notes:
- Comment text is **HTML straight from HN** → must be sanitized (DOMPurify).
- `time` is in **seconds**; every relative-time computation multiplies by 1000.
- Deep comment nesting is traversed recursively via `kids`.

---

## 5. State Management (Pinia `useNewsStore`)

Defined in `src/stores/news.js` as a **composition store**. Key facts:

- **Module-level cache** `fetchCache: Map<url, {t, v}>` with `CACHE_TTL = 60000`
  (60 s). `cachedFetch(url, ttl)` dedupes/ages responses across ALL store
  consumers — the same story/comment fetched from different views hits cache.
  No automatic cache eviction/trim (small working set; acceptable).
- **Concurrency limit** `CONCURRENCY = 6`: `fetchBatch(ids)` chunks ID arrays
  into slices of 6 and runs each slice with `Promise.all`, sequentially across
  chunks. Protects the HN API from bursts.
- **Pagination**: `allIds` (full feed ID list) is fetched once per feed;
  `loadedCount` tracks how many items have been materialized. `fetchFeed(feed)`
  loads the first `PAGE_SIZE = 30`; `loadBatch()` appends the next 30.
  `hasMore()` = `loadedCount < allIds.length`.
- **State**: `items[]`, `loading`, `loadingMore`, `allIds[]`, `loadedCount`,
  `scrollPositions{}` (per-feed), `error`.
- **Scroll memory**: `saveScroll(key)` / `restoreScroll(key)` record
  `window.scrollY` per feed so back-navigation from an item restores position
  (restore is deferred via `requestAnimationFrame`).
- **Actions**: `fetchFeed`, `loadBatch`, `fetchComment`, `fetchItem`, `hasMore`,
  `saveScroll`, `restoreScroll`.
- All errors collapse into user-facing strings (`error.value`); the store never
  throws into views.

### Store invariants to preserve
- Keep caching + concurrency logic **in the store**, not in components.
- `fetchFeed` resets `items`/`loadedCount`/`error` for the new feed.
- Single source of truth for API base URL, feed map, TTL, page size, concurrency.

---

## 6. Routing

`src/router/index.js` — `createWebHistory()`.

| Path                    | Name   | Component  | Notes                          |
|-------------------------|--------|------------|--------------------------------|
| `/`                     | —      | —          | redirect → `/top`              |
| `/:feed(top|new|show|ask|job)` | `feed` | `NewsView` | param-driven feed            |
| `/item/:id`             | `item` | `ItemView` | story detail + comments        |
| `/:pathMatch(.*)*`      | —      | —          | unknown → redirect `/top`      |

- Route components are **lazy-loaded** (`() => import(...)`) → code splitting.
- `NewsView` is parameterized by `route.params.feed`; a `watch` on that param
  (with `immediate: true`) triggers `fetchFeed`.
- `ItemView` reads `route.params.id`; the originating feed is passed as
  `?from=<feed>` (set in `NewsCard`) so scroll can be restored on the way back.
- **App.vue route memory**: after each navigation, `hnr_last_route` is written
  to `localStorage`; on mount, if it points at a valid route or
  `/item/<digits>`, the router replaces to it (deep-link/refresh restore).

---

## 7. Components

### `App.vue`
- Sticky top header: HNR logo button (triggers `refresh()` — re-push current
  route to re-run watchers/loaders) + nav links for the five feeds.
- Nav link active state uses the custom `m2` palette (`bg-m2-primary/10`,
  `text-m2-primary`).
- Wraps `<router-view />` in a `max-w-4xl` container.
- Contains the `router.afterEach` localStorage hook.

### `NewsCard.vue` (props: `item`, `rank`)
- Renders rank number, title, score, author (links out to
  `news.ycombinator.com/user?id=`), relative time, domain, comment count.
- `domain` derived via `new URL(item.url).hostname.replace('www.', '')`,
  guarded by try/catch (safe for text/Ask posts with no URL).
- `timeAgo` computed: minutes → hours → days.
- Whole card is clickable → `goToItem()` pushes `/item/:id?from=<feed>`.
  Author link uses `@click.stop` so it doesn't navigate the card.

### `ItemView.vue`
- "← Back" button (`router.back()`).
- Loading spinner / error+retry / story states.
- Header card: title + domain, score, author, timestamp, "View Source" button
  (opens `item.url` in new tab via `window.open(..., 'noopener,noreferrer')`).
- Comments section: header with `descendants` count; renders one `CommentTree`
  per top-level ID in `item.kids`; "No comments yet." when none.
- On unmount, saves scroll for `route.query.from` feed.
- `loadItem()` is re-invokable by the Retry button.

### `CommentTree.vue` (props: `commentId`, `depth`)
- **Recursive** component — renders children by mapping `comment.kids` into more
  `CommentTree` nodes with `depth + 1`.
- Each node fetches its own comment via `news.fetchComment(id)` on mount.
- States: loading / `[deleted]`/`[dead]` (strikethrough-style italic, hidden) /
  rendered comment.
- **Collapse/expand**: chevron toggle stores `collapsed` locally; collapsed
  preview strips HTML to plain text (`ALLOWED_TAGS: []`).
- **Sanitization**: `safeHtml` runs comment `text` through a URL-expansion regex
  (replaces truncated `<a>...</a>` inner text with the actual href so users see
  real URLs) then `DOMPurify.sanitize()`. Uses Tailwind `prose`-like overrides
  (`[&_a]`, `[&_pre]`, `[&_img]`, `[&_p]`) instead of @tailwindcss/typography
  (not installed — don't assume it is).
- Indentation via `depth > 0 ? 'pl-3' : ''`.

---

## 8. Styling / Theme

Tailwind config defines the custom **`m2`** palette (Material 2 dark):

| Token                 | Value                           |
|-----------------------|---------------------------------|
| `m2-bg`               | `#121212`                       |
| `m2-surface`          | `#1e1e1e`                       |
| `m2-surface-2`        | `#2c2c2c`                       |
| `m2-primary`          | `#FF6600` (HN orange)           |
| `m2-secondary`        | `#80cbc4`                       |
| `m2-error`            | `#cf6679`                       |
| `m2-on-bg`            | `rgb(255 255 255 / 0.87)`       |
| `m2-on-surface`       | `rgb(255 255 255 / 0.87)`       |
| `m2-on-surface-med`   | `rgb(255 255 255 / 0.60)`       |
| `m2-on-surface-disabled` | `rgb(255 255 255 / 0.38)`    |

- `index.html` sets an inline `background-color: #121212` on `<html>` to prevent
  white flash (FOUC) before CSS loads — **keep this**.
- `style.css`: Tailwind directives, system font stack, custom webkit scrollbar.
- All theme tokens are **hard-coded dark** — there is no light mode and no
  dark/light toggle. Adding one would be a new feature (see Roadmap).
- No `@tailwindcss/typography`; prose styling is done with arbitrary variants.

---

## 9. Security

- **XSS**: all HN comment/story HTML rendered with `v-html` is passed through
  `DOMPurify.sanitize()` (`src/components/CommentTree.vue`). This is the
  critical trust boundary — never remove it. Note: `v-html` is only used in
  `CommentTree`; everywhere else Vue interpolates text.
- **Link targets**: external links open with `target="_blank"` +
  `rel="noopener noreferrer"`.
- **Passwords**: bcrypt-hashed (`bcryptjs`, cost 10) in `data/users.json`;
  plaintext is never stored.
- **JWT**: signed with `JWT_SECRET` (env var). **Must be set in production** —
  the default is a dev-only placeholder. Tokens expire after `JWT_EXPIRES`
  (default `7d`).
- **Account creation is admin-only**: no public signup endpoint. Users are
  created via `npm run create-user -- <user> <pass> [role]` inside the
  container shell.
- **No secrets/keys in the repo**; GitHub Actions auth uses
  `secrets.GITHUB_TOKEN`.

---

## 10. Build & Deployment

### Local dev
```bash
npm install
npm run dev        # http://localhost:5173
```

### Production build
```bash
npm run build      # outputs dist/
npm run preview    # local preview of the build
```

`vite.config.js` specifics:
- `server.port = 5173`.
- `build.rollupOptions.output.manualChunks`: `vendor` (vue/vue-router/pinia)
  and `purify` (dompurify) — keep chunking stable.
- `minify: 'esbuild'`; `esbuild.drop` removes `console.log/info/debug` from
  prod bundles (keep `console.error`/`console.warn`).

### Docker
- Multi-stage `Dockerfile`: `node:22-alpine` builds (`npm ci` → `npm run
  build`), then a `node:22-alpine` runtime stage copies `node_modules`,
  `server/`, `scripts/`, and `dist/`, listens on **port 4000**.
- `docker-compose.yml`: pulls `ghcr.io/blueark1/hnr:latest`, maps
  `4000:4000`, `restart: unless-stopped`, mounts a named volume `hnr-data` at
  `/app/data` (persists `users.json`), and passes `JWT_SECRET`.

### CI/CD (`.github/workflows/deploy.yml`)
- Triggers on `push` to `main` and manual `workflow_dispatch`.
- Buildx + login to GHCR, metadata tags (`sha`, branch, `latest` for default
  branch), build & push with GHA cache. Permissions: `contents: read`,
  `packages: write`.

---

## 11. Design Constraints & Gotchas

1. **Do not add a backend or database.** The design is static-only.
2. **Keep the dependency footprint small.** Only add packages when there is no
   simpler option. Prefer native Web APIs (fetch, `URL`, `localStorage`,
   `requestAnimationFrame`).
3. **Respect the CSP.** Any new network call must be allowed by
   `connect-src` in `nginx.conf` (and the local dev server has no such
   restriction, so test CSP issues against the nginx container).
4. **Sanitize all user HTML.** Any new place rendering HN `text` must use
   DOMPurify.
5. **`time` is seconds.** Use `* 1000` before `Date` math (see
   `timeAgo` in NewsCard and the timestamp in ItemView).
6. **Recursive comments** are fetched one-by-one on mount — deep threads can
   produce many requests (mitigated by the shared 60 s cache). Don't over-refine
   without measuring.
7. **Route memory** uses `localStorage` key `hnr_last_route`; only accept known
   feed paths or `/item/<digits>` to avoid arbitrary redirects on reload.
8. **No `@tailwindcss/typography` plugin** — prose styling relies on arbitrary
   variants; keep consistent.
9. **Scroll restore** is per-feed and relies on `?from=` query; be careful when
   changing navigation patterns.

---

## 12. Verification Checklist (for the building agent)

- [ ] `npm run build` succeeds with no errors and outputs `dist/`.
- [ ] `npm run dev` loads `/` → redirects to `/top`.
- [ ] All five feed tabs load stories; "Load More" paginates 30 at a time.
- [ ] Clicking a card opens `/item/:id`; Back restores feed scroll position.
- [ ] Threaded comments render nested, collapse/expand works, `[deleted]` shown.
- [ ] Comment HTML with `<a>`, `<pre>`, `<img>` renders sanitized + wrapped.
- [ ] Relative times and domains compute correctly (incl. Ask/Job with no URL).
- [ ] Refreshing on `/item/123` or a feed restores that route (localStorage).
- [ ] `docker build -t hnr .` succeeds; container serves on :4000.
- [ ] `npm run create-user -- alice pass` creates a user; login returns a JWT;
      wrong password returns 401.
- [ ] No `console.log/info/debug` in the production bundle.
- [ ] No secrets committed; `.gitignore`/`.dockerignore` exclude
      `node_modules`, `dist`, `data`, `.env`.

---

## 13. Current State & Roadmap

### What works today (shipping baseline)
- Five feed views with pagination and per-feed scroll memory.
- Story detail with external-link handling.
- Recursive, collapsible, sanitized threaded comments with URL expansion.
- Dark Material-2 theme, mobile-first responsive layout.
- Dockerized static deployment on :4000 with security headers + GHCR pipeline.

### Reasonable next steps (untouched — candidates for future agents)
- **Voting / OAuth** — JWT username/password auth is in place; OAuth (GitHub,
  Google) would be a natural extension of the auth backend.
- **Light mode / theme toggle** — palette is currently hard-coded dark.
- **Auto-refresh / live updates** — feeds fetch once; no polling or
  time-based revalidation beyond the 60 s cache.
- **Infinite scroll** instead of "Load More" button.
- **Search** (`/search` via Algolia API) — would need CSP `connect-src` update.
- **Comment polling/upvote counts**, **user profile view**, **pwa/offline
  caching** (service worker — watch CSP implications), **i18n**.
- **Rate-limit/batch improvements**: current fetch is sequential-chunked
  (6 at a time); could parallelize chunks or add a small retry/backoff.

---

## 14. Reference File Map (agent cheat-sheet)

| File | Role |
|------|------|
| `src/stores/news.js` | All API calls, caching, pagination, scroll memory |
| `src/stores/auth.js` | JWT token/user state, login/logout, session restore |
| `src/router/index.js` | Route table (add new routes here) |
| `src/views/LoginView.vue` | Login form (username + password) |
| `src/App.vue` | Shell: header nav, route-memory, refresh, auth status |
| `server/routes/auth.js` | `POST /api/auth/login`, `GET /api/auth/me` |
| `server/lib/users.js` | JSON user store + bcrypt hash/verify |
| `scripts/create-user.js` | Admin CLI to create accounts in-container |
| `src/views/NewsView.vue` | Feed list + Load More |
| `src/views/ItemView.vue` | Story detail + comments mount point |
| `src/components/NewsCard.vue` | Feed row (reuse for search results, etc.) |
| `src/components/CommentTree.vue` | Recursive comments + sanitization |
| `tailwind.config.js` | `m2` theme tokens |
| `nginx.conf` | CSP + headers + SPA fallback |
| `.github/workflows/deploy.yml` | GHCR publish (manual) |

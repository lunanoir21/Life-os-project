# Life OS — Documentation

> The full, formatted documentation lives at
> **[lunanoir21.github.io/Life-os-project/documentation.html](https://lunanoir21.github.io/Life-os-project/documentation.html)**.
> This file is a navigable summary for people reading the repository on
> GitHub.

---

## Table of contents

- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Modules](#modules)
- [Welcome & Setup Wizard](#welcome--setup-wizard)
- [Theming, i18n & accessibility](#theming-i18n--accessibility)
- [Finance — live FX rates](#finance--live-fx-rates)
- [Backend API](#backend-api)
- [Scripts](#scripts)
- [Testing](#testing)
- [Docker & deployment](#docker--deployment)
- [Contributing](#contributing)
- [FAQ](#faq)

---

## Getting started

Three paths, pick whichever fits the day.

### 1. Docker — one command, every platform

```bash
bun run docker:start
```

Checks the Docker engine, builds, starts the stack in the background,
waits for the health probe, then tails logs. Works on Linux, macOS,
Windows (PowerShell/CMD) and WSL. If you don't have Bun or Node yet,
use the shell wrappers:

```bash
./start.sh         # Linux / macOS / WSL
.\start.ps1        # Windows PowerShell
```

Then open <http://localhost:3000>.

### 2. Local dev — both processes in one terminal

```bash
bun run dev:all
```

Starts the Rust backend on `:8080` and the Next.js frontend on `:3000`
together. Forgetting the backend was a common source of "task can't be
created" reports; this prevents that.

### 3. Manual — two terminals

```bash
# Terminal 1
bun run backend:dev

# Terminal 2
bun run dev
```

> **First time?** Run `bun install` once, then `bun run db:push` to
> create `prisma/dev.db` from the Prisma schema.

---

## Configuration

Every variable is optional and has a sensible default.

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:../prisma/dev.db` | SQLite file the Rust backend opens. Accepts `file:` or `sqlite:` prefix. |
| `BACKEND_URL` | `http://localhost:8080` | Where Next.js rewrites `/api/*` requests. |
| `PORT` | `8080` | Rust backend listen port. |
| `API_KEY` | _(unset)_ | If set, every `/api/*` request must send `Authorization: Bearer <key>`. |
| `ALLOWED_ORIGIN` | _(unset)_ | If set, CORS is restricted to this origin. |
| `NEXT_PUBLIC_ENABLE_CURRENCY_CONVERTER` | `true` | Build-time default for the FX converter. Users can still toggle at runtime. |

---

## Architecture

Two independent processes:

1. **Rust backend** — `backend/`, axum + sqlx, port `:8080`.
   Talks raw SQL to SQLite; every domain area lives in a single
   `backend/src/*.rs` file.
2. **Next.js frontend** — `src/`, port `:3000`.
   The `app/` directory only contains `layout.tsx`, `page.tsx` and
   `globals.css`. There are **no** Next API route handlers.

`next.config.ts` rewrites every `/api/*` request to Rust transparently,
so the frontend uses a single `fetch()` and doesn't care that Rust is
on the other side.

### Data flow

```
Page component
  → src/lib/api/hooks.ts          (TanStack Query)
  → apiGet/apiPost/...            (src/lib/api/client.ts)
  → fetch("/api/...")
  → Next.js rewrite → Rust :8080 → SQLite
```

Mutations invalidate the relevant query keys on success; the UI re-reads
the verified server state instead of optimistically guessing.

### Database contract

- **Same file** — Both Prisma (migrations) and Rust (runtime) operate
  on `prisma/dev.db`.
- **Foreign keys** — `backend/src/db.rs` opens the pool with
  `foreign_keys(true)`; SQLite disables them by default and Prisma's
  cascade deletes rely on the opposite.
- **Strict** — `create_if_missing(false)` means the Rust binary refuses
  to start if the DB doesn't exist. Run `bun run db:push` first.

### State management

- **TanStack Query** — single source of truth for server data.
- **Zustand** — local UI state only (active module, selected items,
  filters, theme, language, baseCurrency, etc.) with `persist`
  middleware writing to `localStorage`.

---

## Modules

Every module lives at `src/components/lifeos/<module>/<module>-page.tsx`
and pairs with a single `backend/src/<module>.rs` file.

| Module | Highlights |
|---|---|
| **Dashboard** | Hero bento card (greeting, KPI rail, focus pill), inline quick capture, four one-click widget templates (Minimal / Productivity / Wellness / Everything), draggable widgets. |
| **Tasks** | List + Kanban views; a modern composer with priority pills, due/project/recurrence/tag popovers, Cmd+Enter to submit; the empty-state button opens the composer directly. |
| **Notes** | Folder hierarchy, tags, fast search. |
| **Habits** | Daily tracking, streak calculation, calendar heatmap. |
| **Journal** | Day entries, mood, quick prompts. |
| **Finance** | Multi-currency hero, live ECB rates, currency converter, 7-day sparkline trend, per-currency breakdown bar. Toggleable from Settings. |
| **Goals** | Hierarchical goals + milestones + progress. |
| **Learning** | Courses, resources, progress. |
| **Calendar / Time** | Events, time entries, Pomodoro focus timer. |
| **Settings** | Profile, appearance (theme / accent / font / density), finance preferences, data management, keyboard shortcuts, notifications. |

---

## Welcome & Setup Wizard

First launch is a three-stage flow gated by two persisted flags
(`welcomeSeen`, `setupComplete`):

1. **Welcome screen** — a full-bleed greeting page with animated logo
   orb, rotating tagline, three value cards, and a "Let's begin" CTA.
2. **Setup Wizard** — eight steps: profile, language, storage,
   appearance (themes apply live), modules, dashboard widgets, quick
   setup, summary.
3. **App** — the dashboard.

Gate logic:

- `!setupComplete && !welcomeSeen` → Welcome
- `!setupComplete` → Setup wizard
- otherwise → App

Reset the wizard later via _Settings → Danger Zone → Reset Setup
Wizard_. Your data stays intact.

---

## Theming, i18n & accessibility

### Themes

Three layers: **mode** (light / dark / black-OLED / system, driven by
`next-themes`), **accent colour** (ten curated swatches plus a custom
hex), and **density** (compact / comfortable / spacious).

The `public/logo.svg` mark is reused everywhere: sidebar, welcome
screen, setup wizard (desktop + mobile), the about card, the README,
the docs landing, and as favicon / apple-icon / Open Graph image.

### i18n

Five locales ship out of the box: **en, tr, es, de, fr**. Translation
files live under `src/lib/i18n/translations/*.ts`.

- **Type-safe** — `TranslationKeys` is derived from `en`; other locales
  must satisfy it.
- **English fallback** — Missing keys resolve to the English string
  instead of leaking the raw key path to the UI.
- **Auto-detect** — Browser language is detected on first launch in
  both the welcome screen and the wizard.

---

## Finance — live FX rates

The Finance module is two-layered:

1. **Local** — Accounts, transactions, categories, budgets. Fully
   offline.
2. **Online (optional)** — Mid-market rates from the European Central
   Bank via [Frankfurter](https://www.frankfurter.app/) — free, no API
   key. Powers the multi-currency total, the live rate marquee, the
   per-currency breakdown bar, the 7-day sparkline, and the currency
   converter card.

The whole online layer is gated behind a switch in _Settings → Appearance
→ Finance Preferences_. When off, the converter card disappears, the
breakdown / marquee hide, and `useExchangeRates` / `useExchangeRateHistory`
short-circuit — **no request is ever made to the external API**.

Module path: `src/lib/finance/currency.ts`.

---

## Backend API

Routes are registered in `backend/src/lib.rs` inside `build_app()`.
`AppState` carries only a `SqlitePool`. Errors flow through
`backend/src/error.rs` (`AppError` → axum `IntoResponse`).

| Resource | Methods | Notes |
|---|---|---|
| `/api/tasks`, `/api/tasks/:id` | GET POST PATCH DELETE | Tasks, subtasks, tags. |
| `/api/habits`, `/api/habits/:id/logs` | GET POST PATCH DELETE | Habits + daily logs. |
| `/api/journal` | GET POST PATCH DELETE | Journal entries, mood. |
| `/api/notes`, `/api/note-folders` | GET POST PATCH DELETE | Notes + folder tree. |
| `/api/finance/accounts` `/finance/transactions` `/finance/categories` | GET POST PATCH DELETE | Finance store. |
| `/api/goals` | GET POST PATCH DELETE | Goals + milestones. |
| `/api/events` | GET POST PATCH DELETE | Calendar events. |
| `/api/time-entries` | GET POST PATCH DELETE | Time tracking. |
| `/api/pomodoro` | GET POST | Pomodoro sessions. |
| `/api/courses` | GET POST PATCH DELETE | Learning module. |
| `/api/projects` `/api/tags` | GET POST PATCH DELETE | Projects + tags. |
| `/api/profile` | GET PUT PATCH | User profile. |
| `/api/search` | GET | Cross-module search. |
| `/api/dashboard` | GET | Hero KPIs. |
| `/api/insights` `/api/activity` `/api/weekly-review` | GET | Aggregated views. |
| `/api/notifications` | GET POST | Notification centre. |
| `/api/data/export` `/data/import` `/data/reset` `/data/stats` | GET POST DELETE | Data management. |
| `/health` | GET | Healthcheck (no auth). |

### Authentication

If `API_KEY` is set, an auth middleware demands
`Authorization: Bearer <key>` on every `/api/*` request. Unset, the
middleware is a no-op — safe for local development. CORS is permissive
by default and locked to `ALLOWED_ORIGIN` when set.

---

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Next.js dev server (`:3000`) |
| `bun run dev:all` | **Backend + frontend together, one terminal** |
| `bun run build` | Production build (standalone output) |
| `bun run typecheck` | `tsc --noEmit` — must pass before commit |
| `bun run lint` | ESLint |
| `bun run test` | Vitest (jsdom, single run) |
| `bun run backend:dev` | `cargo run` (Rust, `:8080`) |
| `bun run backend:build` | `cargo build --release` |
| `bun run db:push` | Apply `schema.prisma` to dev.db without a migration file |
| `bun run db:generate` | Regenerate Prisma client |
| `bun run db:seed` | Populate dev.db with demo data |
| `bun run docker:start` | **One-command Docker** (cross-platform) |
| `bun run docker:stop` | Stop containers (data volume kept) |
| `bun run docker:reset` | Stop AND delete the data volume |
| `./start.sh` / `.\start.ps1` | Shell wrappers (no Node/Bun required) |

---

## Testing

### Frontend

Vitest + jsdom + Testing Library. `src/__tests__/setup.ts` mocks
`localStorage` because the Zustand persist middleware reads it on
import. Run a single file:

```bash
bun run test -- src/__tests__/stores/task-store.test.ts
```

### Backend

Rust integration tests live in `backend/tests/`. Each suite spins up an
isolated SQLite database via `tempfile` + `common::setup_test_app()`,
so tests don't interfere with each other or with your dev DB.

```bash
cd backend && cargo test
```

---

## Docker & deployment

The Dockerfile is a multi-stage build:
**rust-builder** → **next-builder** → **runner** (`node:22-slim`).

- The final image bundles the standalone Next.js server, the Prisma
  client + engines, and the Rust binary at
  `/usr/local/bin/lifeos-backend`.
- `docker-entrypoint.sh` runs `prisma migrate deploy`, starts the
  backend in the background, waits for `/health`, then starts the
  frontend. `wget` is installed because both the entrypoint and the
  healthcheck rely on it.
- SQLite data is persisted to the `life-os-data` named volume.
  `docker:reset` removes that volume — **destructive**.
- `init: true` in `docker-compose.yml` makes SIGTERM propagate cleanly.

For deployment, sit a reverse proxy (Caddy, nginx, Traefik) in front
for HTTPS termination, set `API_KEY` and `ALLOWED_ORIGIN`, and back up
the SQLite file (or the whole volume) on whatever cadence fits you.

---

## Contributing

1. Fork and clone.
2. `bun install`, then `bun run db:push`.
3. Create a branch: `git checkout -b feat/<short-description>`.
4. Make the change. `bun run typecheck` and `bun run test` must pass.
5. Use Conventional Commit messages.
6. Open a PR.

### Adding a new module

The pattern is the same every time:

1. `src/components/lifeos/<mod>/<mod>-page.tsx` — UI.
2. `backend/src/<mod>.rs` — handlers and SQL.
3. `backend/src/lib.rs` — route registration in `build_app()`.
4. `src/lib/api/hooks.ts` — TanStack Query hooks.
5. `src/lib/i18n/translations/*.ts` — strings in all five locales.

---

## FAQ

### Where is my data stored?

**On your device only.** A single SQLite file (`prisma/dev.db` in dev,
the `life-os-data` Docker volume in prod). No cloud, no accounts, no
tracking.

### Can I use Life OS on multiple devices?

There's no realtime sync yet. The simplest workaround is to export
from _Settings → Data → Export_ and import on the other device. Or you
can host the container on a VPS and reach it from anywhere.

### Can I turn the currency converter off?

Yes. _Settings → Appearance → Finance Preferences_ → toggle "Enable
currency converter". When off, the Frankfurter API is never contacted
and the app runs fully offline.

### Can I re-open the setup wizard?

_Settings → Danger Zone → Reset Setup Wizard_. Your data stays intact.

### Which browsers are supported?

Modern evergreens: Chrome / Edge 110+, Firefox 110+, Safari 16.4+.

### Does the backend have to be Rust?

No, but the design is two-process by default and the frontend talks to
it over `/api/*`. If you swap the backend, keep the endpoint contract.

---

Built with care for calm, private personal computing.

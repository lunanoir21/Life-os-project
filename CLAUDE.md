# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend
bun run dev          # Next.js dev server on :3000
bun run build        # Production build (standalone output)
bun run typecheck    # tsc --noEmit (must pass before any commit)
bun run lint         # ESLint
bun run test         # Vitest (jsdom, single run)
bun run test:watch   # Vitest watch mode

# Database (Prisma manages schema; Rust backend owns runtime queries)
bun run db:push      # Apply schema.prisma to dev.db without a migration file
bun run db:generate  # Regenerate Prisma client after schema changes
bun run db:seed      # Populate dev.db with demo data

# Rust backend
bun run backend:dev  # cargo run (connects to prisma/dev.db on :8080)
bun run backend:build # cargo build --release

# Docker (production) — single command, works on Linux / macOS / Windows / WSL
bun run docker:start # Detect Docker → build → up → wait healthy → tail logs
bun run docker:stop  # Stop containers (data volume kept)
bun run docker:reset # Stop AND delete the data volume (destructive)
# No-Node fallbacks (run from the repo root):
./start.sh           # Linux / macOS / WSL
./start.ps1          # Windows PowerShell
# Lower-level (raw compose):
bun run docker:up    # docker compose up -d --build
bun run docker:logs  # docker compose logs -f
bun run docker:down  # docker compose down

# Rust tests (integration, uses in-memory SQLite)
cd backend && cargo test
```

To run a single Vitest test file: `bun run test -- src/__tests__/stores/task-store.test.ts`

## Architecture

### Two-process design

The app runs as two separate processes that must be up simultaneously in development:

1. **Rust backend** (`backend/`) — axum + sqlx, listens on `:8080`
2. **Next.js frontend** (`src/`) — listens on `:3000`, acts as a transparent proxy

`next.config.ts` `rewrites()` forwards **every** `/api/*` path to `http://localhost:8080` (or `BACKEND_URL`). There are **no** Next.js API Route handlers — the `src/app/` directory contains only `layout.tsx`, `page.tsx`, and `globals.css`.

The Rust backend opens the **same SQLite file** that Prisma manages (`prisma/dev.db`). Prisma is used only for schema migrations (`db:push`/`db:migrate`); all runtime queries are `sqlx` raw SQL in `backend/src/*.rs`.

### Database sharing contract

- `backend/src/db.rs` opens the pool with `foreign_keys(true)` — mandatory because Prisma's cascade deletes rely on it and SQLite disables FKs by default.
- `backend/src/main.rs` reads `DATABASE_URL`, accepts both `file:` (Prisma style) and `sqlite:` (sqlx style) prefixes.
- `create_if_missing(false)` — the Rust binary refuses to start if the DB file doesn't exist; always run `db:push` first.

### Frontend data flow

```
Page component
  → hooks from src/lib/api/hooks.ts   (TanStack Query)
  → apiGet/apiPost/apiPatch/apiDelete in src/lib/api/client.ts
  → fetch("/api/...")
  → Next.js rewrite → Rust :8080
```

All TanStack Query hooks live in `src/lib/api/hooks.ts`. Each mutation calls `queryClient.invalidateQueries` after success so the UI stays in sync.

Zustand stores (`src/stores/`) hold **local UI state** (selected items, view mode, filters). They are not the source of truth for server data — TanStack Query is.

### Rust backend module layout

Each domain area is a single file in `backend/src/`:
`tasks.rs`, `habits.rs`, `habit_logs.rs`, `journal.rs`, `notes.rs`, `note_folders.rs`, `finance.rs`, `goals.rs`, `events.rs`, `time_entries.rs`, `pomodoro.rs`, `courses.rs`, `projects.rs`, `tags.rs`, `profile.rs`, `search.rs`, `dashboard.rs`, `insights.rs`, `activity.rs`, `weekly_review.rs`, `notifications.rs`, `data.rs`

All routes are registered in `backend/src/lib.rs` `build_app()`. `AppState` carries only the `SqlitePool`. The `auth_middleware` is a no-op unless `API_KEY` env var is set.

Error handling uses `backend/src/error.rs` (`AppError` → axum `IntoResponse`).

### Frontend component structure

`src/components/lifeos/` — one subdirectory per module (dashboard, tasks, habits, journal, finance, goals, learning, calendar, time, settings, setup). Each contains a single large `*-page.tsx` file for the module's UI.

`src/components/ui/` — shadcn/ui primitives (do not edit directly; regenerate via `npx shadcn@latest add <component>`).

### Optional auth / environment variables

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:../prisma/dev.db` | SQLite path for Rust backend |
| `BACKEND_URL` | `http://localhost:8080` | Used by Next.js rewrites |
| `PORT` | `8080` | Rust backend listen port |
| `API_KEY` | _(unset)_ | If set, all `/api/*` requests must carry `Authorization: Bearer <key>` |
| `ALLOWED_ORIGIN` | _(unset)_ | If set, CORS is restricted to this origin |

### Testing

Frontend tests use Vitest + jsdom + `@testing-library/react`. `src/__tests__/setup.ts` mocks `localStorage` (required for Zustand persist middleware).

Rust integration tests are in `backend/tests/` and use `tempfile` to create an isolated in-memory/temp SQLite DB per test suite via `common::setup_test_app()`. Run with `cargo test` from the `backend/` directory.

### Docker

The `Dockerfile` is a multi-stage build: Rust → Next.js standalone. The entrypoint (`docker-entrypoint.sh`) runs `prisma db push` then starts both the Rust binary and the Next.js server. SQLite data is persisted to a named `life-os-data` volume.

### GitHub Pages

The `docs/index.html` is a self-contained landing page served from the `/docs` folder on the `main` branch. Enable it in repo Settings → Pages → Source: `main` / `/docs`.

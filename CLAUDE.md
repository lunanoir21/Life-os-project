# CLAUDE.md — Life OS

Agent instructions for Claude Code. Read this file completely before touching any code.

---

## 0. Non-negotiable rules

- **Never** run `git push` or any remote-sending command. User handles all remote operations.
- **Never** add `Co-Authored-By:` or any Claude attribution to commits.
- **Never** create `*.md` documentation files unless explicitly asked.
- **Never** add comments that describe *what* the code does. Only add comments for non-obvious *why* (hidden constraint, workaround for a specific bug).
- **Never** skip `bun run typecheck` before declaring frontend work done.
- **Never** write multi-line comment blocks or JSDoc/rustdoc paragraphs.
- **Never** add `console.log` debug statements unless the user asks.
- On big tasks: push through to a tested state without stopping for confirmation gates.
- All responses to the user must be in **Turkish**.

---

## 1. Commands

```bash
# === DEV ===
bun run dev:all        # PREFERRED: starts Rust backend (:8080) + Next.js (:3000) together
bun run dev            # Next.js only (use only when backend is already running)
bun run backend:dev    # Rust backend only (cargo run from backend/)

# === QUALITY GATES (run before every commit) ===
bun run typecheck      # tsc --noEmit — must pass, zero tolerance for type errors
bun run lint           # ESLint — fix all errors before committing
bun run test           # Vitest (jsdom) — single run
bun run test:watch     # Vitest watch mode

# === DATABASE ===
bun run db:push        # Apply schema.prisma changes to prisma/dev.db (no migration file)
bun run db:generate    # Regenerate Prisma client after schema.prisma changes
bun run db:seed        # Populate dev.db with demo data (prisma/seed.ts)
bun run db:migrate     # Create a migration file (use for prod-ready schema changes)

# === RUST BACKEND ===
bun run backend:build  # cargo build --release
cd backend && cargo test           # Run all Rust integration tests
cd backend && cargo test <name>    # Run a specific test

# === DOCKER ===
bun run docker:start   # Build + up + wait healthy + tail logs
bun run docker:stop    # Stop containers (data volume kept)
bun run docker:reset   # Stop + delete data volume (DESTRUCTIVE — ask user first)

# === SINGLE TEST FILE ===
bun run test -- src/__tests__/stores/task-store.test.ts
```

**Critical**: `bun run dev:all` prevents the "API works in dev but tasks can't be created" failure that occurs when the backend is forgotten. Always use it.

---

## 2. Architecture overview

### Two-process design

```
Browser
  → fetch("/api/...")
  → Next.js :3000  (next.config.ts rewrites)
  → Rust backend :8080  (axum + sqlx)
  → SQLite  (prisma/dev.db)
```

- **Next.js** (`src/`) — UI only. No API Route handlers. `src/app/` contains only `layout.tsx`, `page.tsx`, `globals.css`.
- **Rust backend** (`backend/`) — owns all runtime API logic. Reads the same SQLite file Prisma manages.
- **Prisma** — schema migrations only (`db:push` / `db:migrate`). Never used for runtime queries.
- **`next.config.ts` rewrites** — every `/api/*` path is proxied to `BACKEND_URL` (default `http://localhost:8080`). There is no mixed routing.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `file:./prisma/dev.db` | SQLite path (Prisma format) |
| `BACKEND_URL` | `http://localhost:8080` | Next.js proxy target |
| `PORT` | `8080` | Rust backend listen port |
| `API_KEY` | _(unset)_ | If set, all `/api/*` needs `Authorization: Bearer <key>` |
| `ALLOWED_ORIGIN` | _(unset)_ | If set, CORS restricted to this origin |
| `NEXT_PUBLIC_ENABLE_CURRENCY_CONVERTER` | `true` | Toggle live FX rates (Frankfurter API) |

---

## 3. Rust backend rules

### Module layout

One file per domain in `backend/src/`. Each module is self-contained:

```
tasks.rs          habits.rs         habit_logs.rs     journal.rs
notes.rs          note_folders.rs   finance.rs        goals.rs
events.rs         time_entries.rs   pomodoro.rs       courses.rs
projects.rs       tags.rs           profile.rs        search.rs
dashboard.rs      insights.rs       activity.rs       weekly_review.rs
notifications.rs  data.rs           widgets.rs
```

- All routes registered in `backend/src/lib.rs` → `build_app()`.
- `AppState` carries only `SqlitePool`. Do not add fields without strong justification.
- `auth_middleware` is a no-op unless `API_KEY` env var is set. Do not change this behavior.

### Database contract

- `backend/src/db.rs` opens the pool with `foreign_keys(true)` — **mandatory**, never remove.
- `create_if_missing(false)` — Rust binary refuses to start if DB file is absent. User must run `db:push` first.
- `backend/src/main.rs` strips both `file:` and `sqlite:` prefixes before passing to sqlx.
- **Never** write Prisma client code in the Rust backend. All runtime queries are raw sqlx SQL.

### Serialization contract

- All output structs use `#[serde(rename_all = "camelCase")]` — field names must match Prisma's camelCase JSON output exactly.
- Timestamps are stored as INTEGER milliseconds in SQLite (Prisma's format). Always use `PrismaDateTime` from `backend/src/prisma_dt.rs` — never serialize raw i64 timestamps.
- `PrismaDateTime` serializes to `"2026-07-15T13:45:00.000Z"` format (`.3fZ` suffix). Match this exactly.

### Error handling

Use `AppError` from `backend/src/error.rs` exclusively:

```rust
AppError::BadRequest(String)   // 400
AppError::NotFound(String)     // 404
AppError::Internal(String)     // 500
```

Response shape is always `{ "error": "<message>" }`. This matches `buildError` in `src/lib/api/client.ts`. Never return error shapes that deviate from this.

`sqlx::Error` auto-converts to `AppError::Internal` via `impl From`.

### Utility functions (backend/src/utils.rs)

Never reinvent these. Use them:

- `gen_id()` — generates CUID for new records
- `now_ms()` — current time as epoch milliseconds
- `value_to_ms(v)` — parses ISO string OR numeric ms to epoch ms
- `opt_ms(body, key)` — `body[key]` → optional epoch ms
- `truthy_str(body, key)` — empty string → None
- `str_or(body, key, default)` — missing/empty → default string
- `patch_str / patch_ms / patch_bool / patch_i64` — PATCH presence detection (outer `Some` = key was in body, `None` = key absent → don't touch DB column)
- `row_f64(row, col)` — reads REAL columns that SQLite may have stored as INTEGER affinity
- `push_set!(qb, first, col, val)` macro — builds dynamic `UPDATE … SET` clauses

### Adding a new endpoint

1. Create `backend/src/<module>.rs` with output structs, handler functions.
2. Add `mod <module>;` to `backend/src/lib.rs`.
3. Add routes in `build_app()` in `backend/src/lib.rs`.
4. Add proxy rule in `next.config.ts` `rewrites()`.
5. Add TanStack Query hooks in `src/lib/api/hooks.ts`.
6. Add i18n keys in all 5 translation files (`en.ts`, `tr.ts`, `de.ts`, `fr.ts`, `es.ts`).

---

## 4. Frontend rules

### Data flow — inviolable

```
Page component
  → hook from src/lib/api/hooks.ts   (TanStack Query)
  → apiGet/apiPost/apiPatch/apiDelete from src/lib/api/client.ts
  → fetch("/api/...")
  → Next.js rewrite → Rust :8080
```

- **All** server data lives in TanStack Query. Never cache server data in Zustand.
- **All** TanStack Query hooks live in `src/lib/api/hooks.ts`. Never put `useQuery`/`useMutation` calls inline in components.
- Every mutation **must** call `queryClient.invalidateQueries` in `onSuccess` to keep UI in sync.
- Zustand stores (`src/stores/`) hold **only** local UI state: selected items, view mode, filters, modal open/close. Not source-of-truth for server data.

### API client

`src/lib/api/client.ts` exports:
- `apiGet<T>(path, params?)` — GET with optional query params
- `apiPost<T>(path, body?)` — POST with JSON body
- `apiPatch<T>(path, body)` — PATCH with JSON body
- `apiPut<T>(path, body)` — PUT with JSON body
- `apiDelete(path)` — DELETE, returns void

Errors thrown as `Error` with `data.error` message from backend. Do not add auth headers here unless `API_KEY` flow demands it.

### Component structure

```
src/components/lifeos/
  dashboard/    habits/    journal/    finance/
  goals/        learning/  calendar/   time/
  notes/        tasks/     settings/   setup/
  sidebar.tsx   header.tsx  providers.tsx  app-shell.tsx
  command-palette.tsx  global-search-panel.tsx
  notification-center.tsx  focus-mode-overlay.tsx

src/components/ui/           ← shadcn/ui primitives — DO NOT edit directly
```

Each module has a single large `*-page.tsx`. Add new UI to the appropriate page file.

**shadcn/ui**: Never edit files in `src/components/ui/` by hand. Add components with:
```bash
npx shadcn@latest add <component>
```

### Styling rules

- Use Tailwind CSS classes exclusively. No inline `style=` props unless strictly necessary (dynamic values that can't be expressed as classes).
- Dark mode via `dark:` prefix — the theme is toggled via `next-themes` using the `class` strategy.
- CSS variables for colors: `bg-background`, `text-foreground`, `bg-card`, etc. (defined in `src/app/globals.css`). Match the existing palette.
- Animations: use `framer-motion` for complex animations, `tailwindcss-animate` for simple ones.
- Icons: `lucide-react` only. No other icon libraries.

### State management (Zustand)

Stores in `src/stores/` use Zustand with persist middleware (backed by `localStorage`). `src/__tests__/setup.ts` mocks `localStorage` for tests — this mock must remain.

Available stores:
- `app-store.ts` — global UI (sidebar, theme, locale, active module)
- `task-store.ts`, `habit-store.ts`, `journal-store.ts`, `note-store.ts` — module-specific UI state
- `finance-store.ts`, `goal-store.ts`, `calendar-store.ts`, `learning-store.ts`

### i18n

Translations live in `src/lib/i18n/translations/`. Supported locales: `en`, `tr`, `de`, `fr`, `es`.

**Rule**: Every user-visible string must have a key in all 5 files. Never hardcode English strings in components. Always add to all 5 files simultaneously.

---

## 5. Testing rules

### Frontend (Vitest)

- Test files: `src/__tests__/**/*.test.ts(x)`.
- Environment: jsdom. Setup: `src/__tests__/setup.ts` (mocks `localStorage`).
- Test stores and hooks, not implementation details.
- Never mock the database layer. Mock at the `fetch` / API boundary.

### Rust integration tests

- Test files: `backend/tests/*_test.rs`.
- Each test suite calls `common::setup_test_app()` which creates an isolated temp SQLite DB.
- Tests use `tempfile` crate — fully isolated, no shared state between suites.
- Run: `cd backend && cargo test` or `cd backend && cargo test <test_name>`.
- When adding a new module, add a corresponding `backend/tests/<module>_test.rs`.

### E2E (Playwright)

- Test files: `e2e/`.
- Config: `playwright.config.ts`.
- Run: `bun run test:e2e` (requires both processes running).
- Timeout: 20000ms per test.

---

## 6. Docker

### Build

Multi-stage `Dockerfile`:
1. Rust stage → compiles `lifeos-backend`
2. Next.js stage → `next build` (standalone output)
3. Final stage → copies both binaries

### Entrypoint

`docker-entrypoint.sh`:
1. Runs `prisma db push` (applies schema)
2. Starts Rust binary
3. Starts Next.js server

SQLite data persisted to Docker volume `life-os-data`.

### Rules

- **Never** run `bun run docker:reset` without confirming with user — it deletes the data volume.
- Use `bun run docker:start` for the full managed flow (detect → build → up → health → logs).

---

## 7. Schema changes

When modifying `prisma/schema.prisma`:

1. Edit `prisma/schema.prisma`.
2. Run `bun run db:push` to apply to dev.db.
3. Run `bun run db:generate` to regenerate Prisma client.
4. Update the corresponding Rust handler in `backend/src/<module>.rs` — add/remove columns from SELECT, INSERT, UPDATE queries.
5. Update output structs in the Rust module to match new shape.
6. Update TanStack Query hooks in `src/lib/api/hooks.ts` if response shape changed.
7. Run `cd backend && cargo test` to verify Rust integration tests still pass.
8. Run `bun run typecheck` to verify frontend types still pass.

**Important**: Prisma stores `DateTime` as INTEGER epoch-milliseconds in SQLite. New DateTime columns in Rust structs must use `PrismaDateTime`, not `String` or `i64`.

---

## 8. Prisma datetime invariant

Prisma writes `DateTime` fields to SQLite as INTEGER milliseconds since Unix epoch (not ISO strings, not TEXT). The `PrismaDateTime` newtype in `backend/src/prisma_dt.rs` bridges this:

- **Reading**: `row.get::<i64, _>("column")` → wrap in `PrismaDateTime(ms)`.
- **Writing**: `PrismaDateTime::now().0` gives the raw i64 to INSERT/UPDATE.
- **Serializing**: `PrismaDateTime` implements `Serialize` → emits `"2026-07-15T13:45:00.000Z"`.

Never bypass this by using raw i64 in output structs — the frontend expects ISO strings.

---

## 9. Security

- Content-Security-Policy is set in `next.config.ts`. Do not loosen `connect-src 'self'` — adding external origins requires explicit user approval.
- `API_KEY` env var enables bearer-token auth on all `/api/*` routes. When set, every request must carry `Authorization: Bearer <key>`.
- `ALLOWED_ORIGIN` restricts CORS. Leave unset in dev; set to exact domain in production.
- Max request body: 10 MB (enforced by `DefaultBodyLimit` in `build_app()`).
- Max concurrency: 200 in-flight requests (`ConcurrencyLimitLayer`).
- X-Frame-Options: DENY — no iframing.

---

## 10. What NOT to do

- Do not create Next.js API Route handlers (`src/app/api/`). All API logic lives in Rust.
- Do not use Prisma client for runtime queries. Prisma is migration-only.
- Do not put `useQuery`/`useMutation` directly in page/component files. All hooks go in `src/lib/api/hooks.ts`.
- Do not store server data in Zustand. TanStack Query is the cache.
- Do not edit `src/components/ui/` files by hand. Use `npx shadcn@latest add`.
- Do not add new environment variables without adding them to `.env.example`.
- Do not use `any` in TypeScript without `// eslint-disable-line` and user approval.
- Do not run `cargo build --release` during regular development. `cargo run` is sufficient.
- Do not open the SQLite file with a separate connection while the Rust backend is running — WAL mode handles concurrent reads but a second writer will corrupt state.
- Do not hardcode user-visible strings. All strings go through the i18n system.
- Do not add error handling for impossible cases. Trust internal code and framework guarantees.
- Do not introduce abstractions beyond what the task requires. Three similar lines > premature helper.

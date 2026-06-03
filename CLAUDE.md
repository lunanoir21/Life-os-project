# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Bun is the preferred runtime. `npm`/`yarn` work but scripts in `package.json` assume Bun.

```bash
bun install               # Install dependencies
bun run dev               # Dev server on :3000
bun run build             # prisma generate, then next build (standalone output)
bun run start             # Production server (next start)
bun run lint              # ESLint
bun run db:push           # Push schema → SQLite (creates prisma/dev.db from DATABASE_URL)
bun run db:generate       # Generate Prisma client
bun run db:migrate        # Run prisma migrate dev
bun run db:reset          # Reset DB and reapply migrations (destructive)
bun run db:seed           # Run prisma/seed.ts (demo data)

bun run docker:up         # Build image + start via docker compose (port 3000)
bun run docker:down       # Stop and remove the container
bun run docker:logs       # Follow container logs
```

There is **no test runner configured** — `package.json` has no `test` script and no test files exist. Don't claim "tests pass"; verify changes by running the app.

For containerized deployment, the repo ships a multi-stage `Dockerfile`, `docker-compose.yml`, and `docker-entrypoint.sh` (runs `prisma db push` then starts the standalone server). SQLite data persists in the `life-os-data` volume. See "Deployment (Docker)" below.

## Architecture

### Single-page shell, not route-based navigation

This is a Next.js 16 App Router project, but it behaves like an SPA. `src/app/page.tsx` renders `<AppShell />`, and **module switching is driven by `activeModule` in the Zustand `app-store`**, not by URLs. There is no `/tasks` route — `tasks-page.tsx` is mounted/unmounted by `app-shell.tsx` based on store state. The module-component map lives in [src/components/lifeos/app-shell.tsx](src/components/lifeos/app-shell.tsx).

Consequences:
- Deep linking to a module doesn't exist out of the box.
- The setup wizard gates the entire shell: if `setupComplete` is false in the persisted store, `<SetupWizard />` renders instead of any module.
- All "pages" are client components.

### Data flow: REST API + TanStack Query + Zustand

Three layers, each with a distinct purpose — don't mix them:

1. **REST API** under `src/app/api/<module>/route.ts` — Next.js route handlers (`GET`/`POST`/`PATCH`/`DELETE`) that hit Prisma directly via the singleton `db` from [src/lib/db.ts](src/lib/db.ts). ~23 module directories under `src/app/api/`.
2. **TanStack Query hooks** in [src/lib/api/hooks.ts](src/lib/api/hooks.ts) — the **only** client-side data-fetching surface. Wraps thin `apiGet/apiPost/apiPatch/apiDelete` helpers from [src/lib/api/client.ts](src/lib/api/client.ts). Mutations invalidate queries by key — match existing patterns when adding new ones. `QueryClient` is created in `providers.tsx` with `staleTime: 60s` and `refetchOnWindowFocus: false`.
3. **Zustand stores** in `src/stores/` — UI state only (active module, sidebar collapsed, theme prefs, focus mode, search input). **Server data does not live in Zustand.** `app-store` is persisted to localStorage as `lifeos-app-store` via `zustand/middleware`; other stores are in-memory.

When adding a feature: create the API route, add a TanStack hook, consume the hook from the module component. Don't store fetched lists in Zustand.

### Prisma & SQLite

[prisma/schema.prisma](prisma/schema.prisma) defines the data model with SQLite as the sole provider (`DATABASE_URL=file:./dev.db`). The project uses the schema-push workflow (`prisma db push`) rather than migration files — there is no `prisma/migrations/` directory. IDs use `@default(cuid())` throughout.

`db` is a global singleton (HMR-safe) — import `{ db } from '@/lib/db'` in API routes; never `new PrismaClient()` directly.

### Theming

`next-themes` provides dark/light/system via class. On top of that, a custom `AccentProvider` ([src/components/lifeos/accent-provider.tsx](src/components/lifeos/accent-provider.tsx)) reads accent color, theme variant, font size, UI density, border radius, and animation toggle from `app-store` and applies them as CSS variables. When building UI components: use CSS variables / Tailwind tokens, not hard-coded colors, so they respond to the theming system.

### Path alias

`@/*` → `src/*` (see [tsconfig.json](tsconfig.json)).

### Deployment (Docker)

`next.config.ts` sets `output: "standalone"`, so `next build` emits a self-contained server at `.next/standalone/server.js`. The multi-stage [Dockerfile](Dockerfile) builds with Bun, then runs on `node:22-slim`; static assets, `public/`, the Prisma schema, and the generated client/engine are copied into the runner. [docker-entrypoint.sh](docker-entrypoint.sh) runs `prisma db push --skip-generate` on boot (idempotent) before `node server.js`. `DATABASE_URL` points at `file:/app/data/prod.db`, persisted via the `life-os-data` volume in [docker-compose.yml](docker-compose.yml).

## Conventions specific to this codebase

- **TypeScript strictness is relaxed**: `next.config.ts` sets `typescript.ignoreBuildErrors: true`, and [eslint.config.mjs](eslint.config.mjs) disables most TS and React rules (`no-explicit-any`, `no-unused-vars`, `exhaustive-deps`, etc.). `bun run lint` mostly checks formatting/structural issues — it will not catch missing dependencies or `any` leaks. Don't rely on the build to catch type errors; read the code.
- **`reactStrictMode: false`** in `next.config.ts` — effects won't double-fire in dev; don't assume strict-mode semantics.
- **Named exports** for components (see CONTRIBUTING.md). Module page components are named `<Module>Page` and exported from `src/components/lifeos/<module>/<module>-page.tsx`.
- **Commit style**: Conventional Commits with module-name scopes (e.g. `feat(tasks):`, `fix(finance):`).
- **i18n**: EN + TR translations under `src/lib/i18n/translations/`. Use the existing `index.ts` helper, don't hardcode strings in user-facing components.

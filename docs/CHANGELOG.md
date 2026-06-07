# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-06-04

### Added

#### Core Architecture
- **Rust backend** (axum 0.8 + sqlx 0.8 + SQLite) replacing all Next.js API route handlers
- All 22 API modules ported: tasks, projects, notes, note-folders, tags, journal, habits, habit-logs, goals, events, time-entries, pomodoro-sessions, courses, finance, profile, notifications, search, activity, dashboard, insights, weekly-review, data
- Next.js `rewrites()` proxy — all `/api/*` traffic transparently forwarded to Rust backend on `:8080`
- Optional bearer-token auth via `API_KEY` environment variable
- Concurrency limit (200 in-flight) + 10 MB body limit on data import endpoint
- `GET /health` endpoint for Docker healthchecks

#### Docker
- Multi-stage `Dockerfile` (Rust builder → Node.js builder → minimal runtime)
- `docker-compose.yml` with named `life-os-data` volume for SQLite persistence
- `docker-entrypoint.sh` — runs `prisma migrate deploy` then starts both processes
- Automatic schema migration on container boot

#### Database
- Prisma migrations introduced (`prisma/migrations/`) replacing `db push` for production
- `bun run db:deploy` script added for production migration deployment
- `prisma migrate deploy` in Docker entrypoint (replaces `db push`)

#### Tasks Module
- Recurring task support: `recurrence` field (`none` | `daily` | `weekly` | `monthly`)
- Sub-tasks: nested `Task[]` relationship
- Bulk operations: multi-select mode in list view with "Complete all" / "Delete all" floating action bar
- Selection mode toggle with per-row checkboxes and "Select all / Deselect all" header

#### Habits Module
- Counter habits: `targetCount > 1` shows `− count/targetCount +` stepper UI with mini progress bar
- Streak protection: 1-day gap forgiveness in streak calculation
- Motivational banners now use Lucide icons (`Flame`, `AlertTriangle`, `Sparkles`, `Trophy`, `Star`, `Target`) instead of emoji

#### Journal Module
- Template picker: Morning Routine, Daily Reflection, Weekly Summary
- Dropdown integrated into entry creation dialog

#### Finance Module
- Budget alerts: amber banner (≥80%) and red banner (≥100%) above budget list
- CSV import: FileReader-based parser, maps description/amount/date columns to transactions
- Analytics view: grouped BarChart (income vs expense per month) + PieChart for category spending

#### Dashboard Module
- Real weekly activity data from habits and tasks APIs (replaces `Math.random()`)
- Drag-and-drop widget reordering via `@dnd-kit/sortable`
- Widget visibility toggle (enable/disable per widget) persisted in customize popover
- `SortableWidgetRow` component with drag handle

#### GitHub Pages Landing Page (`docs/`)
- Professional single-file landing page (`docs/index.html`)
- Pure black theme (`#050508` background, `#00e87a` accent)
- Real app screenshots (Dashboard, Tasks, Habits, Journal, Finance) with auto-rotating tab switcher
- Browser chrome frame with 3D tilt effect on hover
- Infinite CSS marquee strip
- Module cards with Lucide SVG icons and mouse-tracking radial glow
- Tech stack section with real logos via Simple Icons CDN (Next.js, React, TypeScript, Tailwind, Rust, SQLite, Prisma, TanStack Query, Framer Motion, Docker, Bun, shadcn/ui)
- Comparison table, FAQ accordion, install guide, command palette overlay
- i18n: Turkish / English toggle

#### Developer Experience
- `CLAUDE.md` — codebase guidance for AI assistants
- `TESTING.md` — test strategy documentation
- Vitest + jsdom frontend test setup
- Rust integration tests with `tempfile` in-memory SQLite isolation
- GitHub Actions CI: typecheck + lint + test + build (frontend) · fmt + clippy + test (backend)
- `QUICKSTART.md` — 3-step setup guide

### Changed
- Sidebar uses Lucide React icons throughout (no emoji in navigation)
- `docker-entrypoint.sh`: `prisma db push` → `prisma migrate deploy`
- Landing page: all decorative emoji replaced with Lucide SVG icons

### Removed
- All Next.js API route handlers (replaced by Rust backend)
- Z.ai / GLM integration artifacts
- Multi-database support (PostgreSQL/MySQL) — SQLite-only architecture
- Unused UI components tied to removed dependencies

---

## [0.1.0] - 2026-05-01

### Added
- Initial project structure with Next.js 16, TypeScript 5, Tailwind CSS 4
- 11 life management modules: Dashboard, Tasks, Notes, Habits, Journal, Finance, Goals, Learning, Calendar, Time Tracker, Settings
- Zustand state management + TanStack Query data fetching
- shadcn/ui component library integration
- Internationalization (EN, TR, ES, DE, FR)
- SQLite database via Prisma ORM
- Theming system: dark/light/system + 10+ accent colors + 8 theme variants
- Command palette (`⌘K`), global search, focus mode, keyboard shortcuts
- Setup wizard for first-run onboarding

[1.0.0]: https://github.com/lunanoir21/Life-os-project/releases/tag/v1.0.0
[0.1.0]: https://github.com/lunanoir21/Life-os-project/releases/tag/v0.1.0

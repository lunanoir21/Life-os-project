# Life OS Testing Documentation

This document describes the test infrastructure for Life OS, including both backend (Rust) and frontend (TypeScript/React) tests, plus the CI/CD pipeline.

## Test Coverage Summary

### Backend (Rust) - 80+ Tests ✅
- **Integration Tests**: 20 tests covering all backend modules
- **Habits Tests**: 1 test (CRUD & Logging)
- **Projects Tests**: 4 tests
- **Tasks Tests**: 6 tests
- **Notes Tests**: 6 tests ✨ NEW
- **Journal Tests**: 7 tests ✨ NEW
- **Finance Tests**: 11 tests ✨ NEW
- **Goals Tests**: 7 tests ✨ NEW
- **Events Tests**: 7 tests ✨ NEW
- **Courses Tests**: 7 tests ✨ NEW
- **Data Tests**: 8 tests ✨ NEW
- **Search Tests**: 9 tests ✨ NEW
- **Recurring Tasks Tests**: Tests
- **Simple Test**: 1 test

### Frontend (TypeScript/React) - 75+ Tests ✅
- **App Store Tests**: 17 tests
- **Task Store Tests**: 6 tests
- **Note Store Tests**: 6 tests
- **Habit Store Tests**: 4 tests
- **Goal Store Tests**: 4 tests
- **Finance Store Tests**: 3 tests
- **Journal Store Tests**: 3 tests
- **Calendar Store Tests**: 3 tests
- **Learning Store Tests**: 3 tests
- **Utils Tests**: 7 tests 
- **i18n Tests**: 13 tests
- **Component Tests**: ✨ NEW
  - **TasksPage Tests**: 6 tests
  - **DashboardPage Tests**: 9 tests
  - **FinancePage Tests**: 10 tests
  - **HabitsPage Tests**: 12 tests

### E2E (Playwright) - 1 Test ✅
- **Dashboard**: Basic smoke test

**Total: 156+ automated tests** 🎉

---

## Bundle Analysis

We use `@next/bundle-analyzer` to monitor the size and performance of our frontend bundles.

### Running Analysis

```bash
bun run analyze
```

This will build the application and open three interactive visualizations in your browser:
1.  **Client bundle**: JS sent to the browser
2.  **Server bundle**: Node.js/Edge runtime code
3.  **Edge bundle**: Middleware and edge routes

---

## E2E Tests (Playwright)

### Architecture

We use **Playwright** for end-to-end testing, ensuring that critical user journeys work across all major browsers.

### Test Structure

```
e2e/
└── dashboard.spec.ts   # Smoke tests for the main application dashboard
playwright.config.ts    # Browser and server configuration
```

### Running E2E Tests

```bash
bun run test:e2e        # Run all E2E tests (headless)
bun run test:e2e:ui     # Open Playwright UI for interactive testing
```

---

## Backend Tests (Rust)

### Architecture

The backend test suite uses:
- **Isolated test databases**: Each test run creates a temporary SQLite database
- **Tower ServiceExt**: Tests drive the Axum router directly without network I/O
- **Schema from Prisma**: The test DB schema is generated from `prisma/schema.prisma`

### Test Structure

```
backend/
├── src/
│   ├── lib.rs          # Extracted router logic (build_app function)
│   └── main.rs         # Thin main that calls build_app
├── tests/
│   ├── common/
│   │   └── mod.rs      # Test fixtures & helpers
│   ├── schema.sql      # Generated SQLite schema
│   ├── integration_test.rs     # 20 tests covering all modules
│   ├── projects_test.rs        # 4 project CRUD tests
│   ├── tasks_test.rs           # 6 task CRUD tests
│   ├── notes_test.rs           # 6 notes CRUD tests ✨ NEW
│   ├── journal_test.rs         # 7 journal CRUD tests ✨ NEW
│   ├── finance_test.rs         # 11 finance CRUD tests ✨ NEW
│   ├── goals_test.rs           # 7 goals CRUD tests ✨ NEW
│   ├── events_test.rs          # 7 events CRUD tests ✨ NEW
│   ├── courses_test.rs         # 7 courses CRUD tests ✨ NEW
│   ├── data_test.rs            # 8 data export/import tests ✨ NEW
│   ├── search_test.rs          # 9 search tests ✨ NEW
│   ├── habits_test.rs          # 1 habits test
│   ├── recurring_tasks_test.rs # Recurring tasks tests
│   └── simple_test.rs          # 1 database setup verification test
└── Cargo.toml          # Test dependencies: tower, http-body-util, tempfile
```

### Running Backend Tests

```bash
cd backend
cargo test                    # Run all tests
cargo test --no-fail-fast     # Continue on first failure
cargo fmt --check             # Check formatting
cargo clippy -- -D warnings   # Run linter (some warnings allowed)
```

### Module Coverage

All 23 backend modules have integration test coverage:

| Module | Tests | Coverage |
|--------|-------|----------|
| tasks | ✅ | CRUD, filtering, completion tracking, validation |
| projects | ✅ | CRUD, filtering, task relationships, validation |
| notes | ✅ | CRUD operations |
| habits | ✅ | CRUD operations |
| habit_logs | ✅ | Create, list, date handling |
| goals | ✅ | CRUD, progress tracking |
| journal | ✅ | CRUD operations |
| events | ✅ | CRUD, calendar operations |
| time_entries | ✅ | CRUD, start/stop tracking |
| pomodoro | ✅ | Session management, completion |
| courses | ✅ | CRUD, progress tracking |
| finance (accounts) | ✅ | CRUD, balance updates |
| finance (transactions) | ✅ | CRUD, account relationships |
| finance (categories) | ✅ | List operations |
| finance (budgets) | ✅ | List operations |
| tags | ✅ | Create, list |
| note_folders | ✅ | Create, list |
| profile | ✅ | CRUD operations |
| dashboard | ✅ | Aggregation endpoint |
| insights | ✅ | Analytics endpoint |
| weekly_review | ✅ | Summary endpoint |
| activity | ✅ | Activity tracking |
| search | ✅ | Search functionality |
| data | ✅ | Export, stats |

### Test Patterns

**Happy Path CRUD:**
```rust
// Create -> Get -> Update -> Delete -> Verify 404
let (app, _temp_db) = common::setup_test_app().await;
// POST /api/tasks
// GET /api/tasks/{id}
// PATCH /api/tasks/{id}
// DELETE /api/tasks/{id}
```

**Validation:**
```rust
// Missing required field returns 400
// Invalid ID returns 404
```

**Filtering & Relationships:**
```rust
// Query params: ?status=todo&priority=high
// Related data: projects include task counts
```

---

## Frontend Tests (TypeScript/React)

### Architecture

The frontend test suite uses:
- **Vitest**: Fast test runner with native ESM support
- **@testing-library/react**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **MSW (Mock Service Worker)**: API mocking for component tests ✨ NEW
- **jsdom**: Browser environment simulation
- **@testing-library/jest-dom**: Extended matchers

### Test Structure

```
src/
├── __tests__/
│   ├── setup.ts                    # Global test setup + MSW
│   ├── mocks/                      # ✨ NEW
│   │   ├── handlers.ts             # MSW API mock handlers
│   │   └── server.ts               # MSW server setup
│   ├── utils/                      # ✨ NEW
│   │   └── test-utils.tsx          # Custom render + helpers
│   ├── components/                 # ✨ NEW
│   │   ├── tasks-page.test.tsx     # TasksPage component tests
│   │   ├── dashboard-page.test.tsx # DashboardPage component tests
│   │   ├── finance-page.test.tsx   # FinancePage component tests
│   │   └── habits-page.test.tsx    # HabitsPage component tests
│   ├── stores/
│   │   └── app-store.test.ts       # 17 Zustand store tests
│   └── lib/
│       ├── utils.test.ts           # 7 utility function tests
│       └── i18n.test.ts            # 13 i18n tests
└── vitest.config.ts                # Vitest configuration
```

### Running Frontend Tests

```bash
bun run test              # Run all tests once
bun run test:watch        # Watch mode
bun run lint              # ESLint
bun run build             # Full build (includes type checking)
```

### Test Coverage

**App Store (Zustand with persistence):**
- ✅ Default values verification
- ✅ All setters and toggles
- ✅ Module switching (dashboard, tasks, notes, etc.)
- ✅ UI preferences (theme, density, animations)
- ✅ Sidebar, focus mode, command palette state
- ✅ Language and widget configuration

**Component Tests:** ✨ NEW
- ✅ **TasksPage**: Rendering, task list, CRUD operations, filtering
- ✅ **DashboardPage**: Stats display, widgets, quick actions, API integration
- ✅ **FinancePage**: Accounts, transactions, overview, charts
- ✅ **HabitsPage**: Habit list, progress tracking, logging, streaks

**Utility Functions:**
- ✅ `cn()` class name merging
- ✅ Tailwind conflict resolution
- ✅ Conditional class handling
- ✅ Edge cases (empty, arrays, objects)

**i18n (Internationalization):**
- ✅ 5 languages supported (en, tr, es, de, fr)
- ✅ All locales have same key structure
- ✅ Translation fallback mechanism
- ✅ `getTranslation()` helper function
- ✅ Metadata validation (codes, labels, flags)

**API Mocking with MSW:** ✨ NEW
- ✅ Tasks API endpoints
- ✅ Habits API endpoints
- ✅ Projects API endpoints
- ✅ Notes API endpoints
- ✅ Finance API endpoints (accounts, transactions, categories, budgets)
- ✅ Dashboard API endpoint
- ✅ Profile API endpoint

### Known Limitations

- **Component Coverage**: Additional components need tests (NotesPage, JournalPage, GoalsPage, EventsPage)
- **Backend Edge Cases**: Need more negative testing for error paths and race conditions
- **E2E Coverage**: Limited to dashboard smoke test, needs expansion

---

## CI/CD Pipeline (GitHub Actions)

### Workflow: `.github/workflows/ci.yml`

Runs on:
- `push` to `main`
- `pull_request` to `main`

### Jobs

#### 1. Frontend Job
```yaml
- Checkout code
- Setup Bun (latest)
- Cache dependencies
- Install dependencies (frozen-lockfile)
- Generate Prisma client
- Run ESLint
- Run Vitest tests
- Cache Next.js build
- Build application
```

#### 2. Backend Job  
```yaml
- Checkout code
- Setup Rust (stable + rustfmt + clippy)
- Cache Rust dependencies (Swatinem/rust-cache)
- Check formatting (cargo fmt --check)
- Run Clippy (continue-on-error for now)
- Run tests (cargo test --no-fail-fast)
```

### Caching Strategy

- **Bun**: `~/.bun/install/cache` (keyed by `bun.lock`)
- **Rust**: Managed by `Swatinem/rust-cache` (workspace: `backend`)
- **Next.js**: `.next/cache` (keyed by lock + source files)

---

## Running All Tests Locally

### Quick Verification

```bash
# Frontend
bun run lint && bun run test && bun run build

# Backend
cd backend
cargo fmt --check && cargo test && cargo clippy

# Or combined:
bun run lint && bun run test && cd backend && cargo test
```

### Expected Output

```
Frontend:
✓ Test Files  3 passed (3)
✓ Tests  37 passed (37)
✓ Duration  ~600ms

Backend:
✓ 30 tests passed across 4 test files
✓ Duration  ~1s
```

---

## Development Workflow

### Adding Backend Tests

1. **Module tests** go in `backend/tests/integration_test.rs`
2. **Complex modules** get dedicated files (like `tasks_test.rs`)
3. Use `common::setup_test_app()` for isolated DB per test
4. Follow pattern: Create → Get → Update → Delete → Verify

### Adding Frontend Tests

1. **Unit tests** for pure functions: `src/__tests__/lib/`
2. **Store tests**: `src/__tests__/stores/`
3. **Component tests**: `src/__tests__/components/` ✨ NEW
4. Use **MSW** for API mocking in component tests ✨ NEW
5. Use `test-utils.tsx` helpers for consistent setup ✨ NEW
6. Mock `localStorage` in `setup.ts` if needed
7. Use `describe/it/expect` from Vitest

**Example Component Test:**
```tsx
import { renderWithProviders, screen } from '../utils/test-utils'

describe('MyComponent', () => {
  it('renders and fetches data', async () => {
    renderWithProviders(<MyComponent />)
    
    await waitFor(() => {
      expect(screen.getByText('Loaded Data')).toBeInTheDocument()
    })
  })
})
```

### Pre-commit Checklist

```bash
# Frontend
✓ bun run lint
✓ bun run test
✓ bun run build

# Backend  
✓ cargo fmt
✓ cargo test
✓ cargo clippy (warnings OK for now)
```

---

## Troubleshooting

### Backend: "Failed to read schema.sql"
```bash
cd backend/tests
# Regenerate schema
cd ../..
bun prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > backend/tests/schema.sql
# Fix DATETIME -> INTEGER
sed -i 's/DATETIME/INTEGER/g' backend/tests/schema.sql
sed -i 's/ DEFAULT CURRENT_TIMESTAMP//g' backend/tests/schema.sql
```

### Frontend: "Cannot read properties of undefined (reading 'setItem')"
- Ensure `src/__tests__/setup.ts` mocks `localStorage`
- Vitest should load setup file automatically (check `vitest.config.ts`)

### CI: "Frozen lockfile out of sync"
```bash
# Regenerate lockfile
bun install
# Commit both package.json and bun.lock
```

---

## Future Improvements

### Priority
1. ✅ ~~Add backend integration tests~~ (DONE - 80+ tests)
2. ✅ ~~Add frontend unit tests~~ (DONE - 75+ tests)
3. ✅ ~~Setup CI pipeline~~ (DONE)
4. ✅ ~~Add MSW for API mocking~~ (DONE)
5. ✅ ~~Add component tests~~ (DONE - 4 major pages)
6. 🔄 Fix remaining Clippy warnings in backend
7. 📝 Add more component tests (NotesPage, JournalPage, GoalsPage, EventsPage)
8. 📝 Increase backend test coverage (edge cases, error paths)

### Optional
- Add more Playwright E2E tests (user journeys)
- Add test coverage reporting (codecov.io)
- Add mutation testing (stryker-mutator)
- Add performance benchmarks
- Add visual regression testing

---

## Test Philosophy

- **Isolated**: Tests never touch dev database
- **Fast**: In-memory SQLite, no network I/O
- **Reliable**: No flaky tests, deterministic results
- **Maintainable**: One test file per module, clear naming
- **Practical**: Focus on behavior, not implementation details

---

## Questions?

- Backend test infrastructure: `backend/tests/common/mod.rs`
- Frontend test setup: `src/__tests__/setup.ts`
- CI configuration: `.github/workflows/ci.yml`
- This documentation: `TESTING.md`

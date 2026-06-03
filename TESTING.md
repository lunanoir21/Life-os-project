# Life OS Testing Documentation

This document describes the test infrastructure for Life OS, including both backend (Rust) and frontend (TypeScript/React) tests, plus the CI/CD pipeline.

## Test Coverage Summary

### Backend (Rust) - 30 Tests ✅
- **Integration Tests**: 20 tests covering all backend modules
- **Projects Tests**: 4 tests
- **Tasks Tests**: 5 tests  
- **Database Tests**: 1 test

### Frontend (TypeScript/React) - 37 Tests ✅
- **App Store Tests**: 17 tests for Zustand state management
- **Utils Tests**: 7 tests for utility functions
- **i18n Tests**: 13 tests for internationalization

**Total: 67 automated tests**

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
│   ├── integration_test.rs  # 20 tests covering all modules
│   ├── projects_test.rs     # 4 project CRUD tests
│   ├── tasks_test.rs        # 5 task CRUD tests
│   └── simple_test.rs       # 1 database setup verification test
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
- **jsdom**: Browser environment simulation
- **@testing-library/jest-dom**: Extended matchers

### Test Structure

```
src/
├── __tests__/
│   ├── setup.ts              # Global test setup (localStorage mock)
│   ├── stores/
│   │   └── app-store.test.ts # 17 Zustand store tests
│   ├── lib/
│   │   ├── utils.test.ts     # 7 utility function tests
│   │   └── i18n.test.ts      # 13 i18n tests
└── vitest.config.ts          # Vitest configuration
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

### Known Limitations

- **React Hooks**: `useTranslation` tests are limited because hooks can't be called outside React components. We test the non-hook functions instead.
- **Component Tests**: No component smoke tests yet (setup wizard, settings) - these would require complex mocking of TanStack Query and API calls.
- **E2E Tests**: No Playwright tests included (lower priority).

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
3. Mock `localStorage` in `setup.ts` if needed
4. Use `describe/it/expect` from Vitest

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
1. ✅ ~~Add backend integration tests~~ (DONE)
2. ✅ ~~Add frontend unit tests~~ (DONE)
3. ✅ ~~Setup CI pipeline~~ (DONE)
4. 🔄 Fix remaining Clippy warnings in backend
5. 📝 Add component smoke tests (setup wizard, dashboard)
6. 📝 Increase backend test coverage (edge cases, error paths)

### Optional
- Add Playwright E2E tests (separate job, non-blocking)
- Add test coverage reporting (codecov.io)
- Add mutation testing (stryker-mutator)
- Add performance benchmarks

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

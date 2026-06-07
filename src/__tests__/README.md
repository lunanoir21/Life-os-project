# Frontend Tests

This directory contains unit and component tests for the Life OS frontend application.

## Test Structure

```
__tests__/
├── components/          # Component tests
│   ├── dashboard-page.test.tsx
│   ├── finance-page.test.tsx
│   ├── habits-page.test.tsx
│   └── tasks-page.test.tsx
├── lib/                 # Library utility tests
├── stores/              # Zustand store tests
├── mocks/               # MSW mock handlers
│   ├── handlers.ts      # API mock handlers
│   └── server.ts        # MSW server setup
├── utils/               # Test utilities
│   └── test-utils.tsx   # Custom render functions and helpers
├── setup.ts             # Global test setup
└── README.md            # This file
```

## Running Tests

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run E2E tests
bun run test:e2e

# Run E2E tests with UI
bun run test:e2e:ui
```

## Writing Tests

### Component Tests

Component tests use `@testing-library/react` and mock API calls with MSW (Mock Service Worker).

Example:

```tsx
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '../utils/test-utils'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithProviders(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Using Test Utils

The `test-utils.tsx` file provides helpful utilities:

- `renderWithProviders`: Renders components with all necessary providers
- `createTestQueryClient`: Creates a QueryClient for testing
- `mockGenerators`: Factory functions for creating mock data
- `waitFor`: Helper functions for async operations

Example:

```tsx
import { renderWithProviders, mockGenerators } from '../utils/test-utils'

const mockTask = mockGenerators.task({ 
  title: 'Custom Task',
  status: 'done' 
})
```

### Mocking API Calls

API calls are mocked using MSW. Add new handlers to `mocks/handlers.ts`:

```tsx
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/my-endpoint', () => {
    return HttpResponse.json({ data: 'mock data' })
  }),
]
```

### Testing User Interactions

Use `@testing-library/user-event` for simulating user interactions:

```tsx
import userEvent from '@testing-library/user-event'

it('handles button click', async () => {
  const user = userEvent.setup()
  renderWithProviders(<MyComponent />)
  
  await user.click(screen.getByRole('button', { name: 'Submit' }))
  
  expect(screen.getByText('Submitted')).toBeInTheDocument()
})
```

### Testing Async Operations

Use `waitFor` from testing library:

```tsx
import { waitFor } from '@testing-library/react'

it('loads data', async () => {
  renderWithProviders(<MyComponent />)
  
  await waitFor(() => {
    expect(screen.getByText('Loaded Data')).toBeInTheDocument()
  })
})
```

## Test Coverage

Current test coverage:

### Backend Integration Tests ✅
- ✅ tasks_test.rs
- ✅ habits_test.rs
- ✅ projects_test.rs
- ✅ notes_test.rs
- ✅ journal_test.rs
- ✅ finance_test.rs
- ✅ goals_test.rs
- ✅ events_test.rs
- ✅ courses_test.rs
- ✅ data_test.rs
- ✅ search_test.rs
- ✅ simple_test.rs
- ✅ recurring_tasks_test.rs

### Frontend Component Tests 🟡
- ✅ TasksPage
- ✅ DashboardPage
- ✅ FinancePage
- ✅ HabitsPage
- 🟡 NotesPage (TODO)
- 🟡 JournalPage (TODO)
- 🟡 GoalsPage (TODO)
- 🟡 EventsPage (TODO)

### Store Tests ✅
- ✅ Store tests already exist

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the user sees and does
2. **Use Semantic Queries**: Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Avoid Testing Internal State**: Test public API and rendered output
4. **Keep Tests Simple**: One concept per test
5. **Use Descriptive Test Names**: Clearly state what is being tested
6. **Mock External Dependencies**: Use MSW for API calls
7. **Clean Up**: Tests should not affect each other

## Common Patterns

### Testing Forms

```tsx
it('submits form data', async () => {
  const user = userEvent.setup()
  renderWithProviders(<MyForm />)
  
  await user.type(screen.getByLabelText('Name'), 'John Doe')
  await user.click(screen.getByRole('button', { name: 'Submit' }))
  
  await waitFor(() => {
    expect(screen.getByText('Success')).toBeInTheDocument()
  })
})
```

### Testing Loading States

```tsx
it('shows loading spinner', () => {
  renderWithProviders(<MyComponent />)
  expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
})
```

### Testing Error States

```tsx
it('displays error message', async () => {
  server.use(
    http.get('/api/data', () => {
      return HttpResponse.json(
        { error: 'Something went wrong' },
        { status: 500 }
      )
    })
  )
  
  renderWithProviders(<MyComponent />)
  
  await waitFor(() => {
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})
```

## Debugging Tests

```bash
# Run specific test file
bun test src/__tests__/components/tasks-page.test.tsx

# Run tests matching pattern
bun test tasks

# Run with coverage
bun test --coverage

# Debug with console output
bun test --reporter=verbose
```

## Resources

- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Docs](https://vitest.dev/)
- [MSW Docs](https://mswjs.io/)
- [User Event Docs](https://testing-library.com/docs/user-event/intro)

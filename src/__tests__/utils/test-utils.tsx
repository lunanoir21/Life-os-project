import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Creates a new QueryClient instance for testing
 * with disabled retries for faster test execution
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Suppress error logs in tests
    },
  })
}

/**
 * Creates a wrapper component with QueryClientProvider
 */
export function createQueryWrapper() {
  const queryClient = createTestQueryClient()
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

interface AllTheProvidersProps {
  children: React.ReactNode
  queryClient?: QueryClient
}

/**
 * Wrapper component with all necessary providers for testing
 */
export function AllTheProviders({ children, queryClient }: AllTheProvidersProps) {
  const client = queryClient || createTestQueryClient()
  
  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  )
}

/**
 * Custom render function with all providers
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient,
    ...renderOptions
  }: RenderOptions & { queryClient?: QueryClient } = {}
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
  )

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: queryClient || createTestQueryClient(),
  }
}

/**
 * Mock data generators
 */
export const mockGenerators = {
  task: (overrides = {}) => ({
    id: `task-${Date.now()}`,
    title: 'Test Task',
    description: 'Test description',
    status: 'todo',
    priority: 'medium',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }),

  habit: (overrides = {}) => ({
    id: `habit-${Date.now()}`,
    name: 'Test Habit',
    description: 'Test habit description',
    color: 'blue',
    frequency: 'daily',
    targetCount: 1,
    unit: 'times',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }),

  project: (overrides = {}) => ({
    id: `project-${Date.now()}`,
    name: 'Test Project',
    description: 'Test project description',
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }),

  note: (overrides = {}) => ({
    id: `note-${Date.now()}`,
    title: 'Test Note',
    content: 'Test note content',
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }),

  account: (overrides = {}) => ({
    id: `account-${Date.now()}`,
    name: 'Test Account',
    type: 'checking',
    balance: 1000.0,
    currency: 'USD',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }),

  transaction: (overrides = {}) => ({
    id: `transaction-${Date.now()}`,
    accountId: 'account-1',
    type: 'expense',
    amount: 50.0,
    description: 'Test transaction',
    date: new Date().toISOString(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }),
}

/**
 * Wait for element helpers
 */
export const waitFor = {
  loading: () => new Promise((resolve) => setTimeout(resolve, 100)),
  animation: () => new Promise((resolve) => setTimeout(resolve, 300)),
  debounce: () => new Promise((resolve) => setTimeout(resolve, 500)),
}

/**
 * Test data constants
 */
export const TEST_IDS = {
  LOADING_SPINNER: 'loading-spinner',
  ERROR_MESSAGE: 'error-message',
  EMPTY_STATE: 'empty-state',
  MODAL: 'modal',
  DIALOG: 'dialog',
  TOAST: 'toast',
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

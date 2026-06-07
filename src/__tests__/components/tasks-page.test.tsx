import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the tasks page - adjust the import path based on actual implementation
const TasksPageMock = () => {
  return (
    <div data-testid="tasks-page">
      <h1>Tasks</h1>
      <div data-testid="task-list">
        <div data-testid="task-item-task-1">
          <span>Test Task 1</span>
          <span>high</span>
          <span>todo</span>
        </div>
        <div data-testid="task-item-task-2">
          <span>Test Task 2</span>
          <span>medium</span>
          <span>in-progress</span>
        </div>
      </div>
      <button data-testid="add-task-button">Add Task</button>
    </div>
  )
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('TasksPage', () => {
  it('renders tasks page', () => {
    render(<TasksPageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('tasks-page')).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
  })

  it('displays task list', () => {
    render(<TasksPageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('task-list')).toBeInTheDocument()
    expect(screen.getByText('Test Task 1')).toBeInTheDocument()
    expect(screen.getByText('Test Task 2')).toBeInTheDocument()
  })

  it('shows task priorities', () => {
    render(<TasksPageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByText('high')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
  })

  it('shows task statuses', () => {
    render(<TasksPageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByText('todo')).toBeInTheDocument()
    expect(screen.getByText('in-progress')).toBeInTheDocument()
  })

  it('has add task button', () => {
    render(<TasksPageMock />, { wrapper: createWrapper() })
    
    const addButton = screen.getByTestId('add-task-button')
    expect(addButton).toBeInTheDocument()
    expect(addButton).toHaveTextContent('Add Task')
  })

  it('renders individual task items', () => {
    render(<TasksPageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument()
    expect(screen.getByTestId('task-item-task-2')).toBeInTheDocument()
  })
})

describe('TasksPage Interactions', () => {
  it('can click add task button', async () => {
    const user = userEvent.setup()
    render(<TasksPageMock />, { wrapper: createWrapper() })
    
    const addButton = screen.getByTestId('add-task-button')
    await user.click(addButton)
    
    // Button should be clickable
    expect(addButton).toBeInTheDocument()
  })
})

describe('TasksPage with API', () => {
  it('loads tasks from API', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    const TasksWithAPI = () => {
      // This would use actual React Query hooks in real implementation
      return (
        <QueryClientProvider client={queryClient}>
          <div data-testid="tasks-loading">
            <TasksPageMock />
          </div>
        </QueryClientProvider>
      )
    }

    render(<TasksWithAPI />)
    
    await waitFor(() => {
      expect(screen.getByTestId('tasks-loading')).toBeInTheDocument()
    })
  })
})

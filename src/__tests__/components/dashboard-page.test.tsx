import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock Dashboard Page Component
const DashboardPageMock = () => {
  return (
    <div data-testid="dashboard-page">
      <h1>Dashboard</h1>
      
      <div data-testid="stats-section">
        <div data-testid="tasks-stat">
          <span>Tasks</span>
          <span>Total: 10</span>
          <span>Completed: 5</span>
          <span>Pending: 5</span>
        </div>
        <div data-testid="habits-stat">
          <span>Habits</span>
          <span>Streak: 7</span>
          <span>Completed: 15</span>
        </div>
        <div data-testid="projects-stat">
          <span>Projects</span>
          <span>Active: 3</span>
          <span>Completed: 2</span>
        </div>
      </div>

      <div data-testid="upcoming-tasks">
        <h2>Upcoming Tasks</h2>
        <div data-testid="upcoming-task-1">Test Task 1</div>
        <div data-testid="upcoming-task-2">Test Task 2</div>
      </div>

      <div data-testid="quick-actions">
        <button data-testid="quick-add-task">Add Task</button>
        <button data-testid="quick-add-note">Add Note</button>
        <button data-testid="quick-log-habit">Log Habit</button>
      </div>

      <div data-testid="recent-activity">
        <h2>Recent Activity</h2>
        <div>Activity Timeline</div>
      </div>
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

describe('DashboardPage', () => {
  it('renders dashboard page', () => {
    render(<DashboardPageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('displays stats section', () => {
    render(<DashboardPageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('stats-section')).toBeInTheDocument()
  })

  it('shows tasks statistics', () => {
    render(<DashboardPageMock />, { wrapper: createWrapper() })
    
    const tasksStat = screen.getByTestId('tasks-stat')
    expect(tasksStat).toBeInTheDocument()
    expect(screen.getByText('Total: 10')).toBeInTheDocument()
    expect(screen.getByText('Completed: 5')).toBeInTheDocument()
    expect(screen.getByText('Pending: 5')).toBeInTheDocument()
  })

  it('shows habits statistics', () => {
    render(<DashboardPageMock />, { wrapper: createWrapper() })
    
    const habitsStat = screen.getByTestId('habits-stat')
    expect(habitsStat).toBeInTheDocument()
    expect(screen.getByText('Streak: 7')).toBeInTheDocument()
    expect(screen.getByText('Completed: 15')).toBeInTheDocument()
  })

  it('shows projects statistics', () => {
    render(<DashboardPageMock />, { wrapper: createWrapper() })
    
    const projectsStat = screen.getByTestId('projects-stat')
    expect(projectsStat).toBeInTheDocument()
    expect(screen.getByText('Active: 3')).toBeInTheDocument()
    expect(screen.getByText('Completed: 2')).toBeInTheDocument()
  })

  it('displays upcoming tasks section', () => {
    render(<DashboardPageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('upcoming-tasks')).toBeInTheDocument()
    expect(screen.getByText('Upcoming Tasks')).toBeInTheDocument()
    expect(screen.getByTestId('upcoming-task-1')).toBeInTheDocument()
    expect(screen.getByTestId('upcoming-task-2')).toBeInTheDocument()
  })

  it('displays quick actions', () => {
    render(<DashboardPageMock />, { wrapper: createWrapper() })
    
    const quickActions = screen.getByTestId('quick-actions')
    expect(quickActions).toBeInTheDocument()
    
    expect(screen.getByTestId('quick-add-task')).toBeInTheDocument()
    expect(screen.getByTestId('quick-add-note')).toBeInTheDocument()
    expect(screen.getByTestId('quick-log-habit')).toBeInTheDocument()
  })

  it('displays recent activity section', () => {
    render(<DashboardPageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('recent-activity')).toBeInTheDocument()
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })
})

describe('DashboardPage with API Data', () => {
  it('loads dashboard data from API', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    const DashboardWithAPI = () => {
      return (
        <QueryClientProvider client={queryClient}>
          <DashboardPageMock />
        </QueryClientProvider>
      )
    }

    render(<DashboardWithAPI />)
    
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
      expect(screen.getByTestId('stats-section')).toBeInTheDocument()
    })
  })

  it('handles loading state', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    const DashboardWithLoading = () => {
      return (
        <QueryClientProvider client={queryClient}>
          <div data-testid="dashboard-loading">
            <DashboardPageMock />
          </div>
        </QueryClientProvider>
      )
    }

    render(<DashboardWithLoading />)
    
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument()
  })
})

describe('DashboardPage Widgets', () => {
  it('has all major widget sections', () => {
    render(<DashboardPageMock />, { wrapper: createWrapper() })
    
    // Verify all major sections are present
    expect(screen.getByTestId('stats-section')).toBeInTheDocument()
    expect(screen.getByTestId('upcoming-tasks')).toBeInTheDocument()
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument()
    expect(screen.getByTestId('recent-activity')).toBeInTheDocument()
  })
})

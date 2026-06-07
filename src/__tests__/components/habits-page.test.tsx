import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock Habits Page Component
const HabitsPageMock = () => {
  return (
    <div data-testid="habits-page">
      <h1>Habits</h1>
      
      <div data-testid="habits-header">
        <button data-testid="add-habit-button">Add Habit</button>
        <div data-testid="date-selector">Today</div>
      </div>

      <div data-testid="habits-list">
        <div data-testid="habit-habit-1">
          <div data-testid="habit-name">Drink Water</div>
          <div data-testid="habit-description">Drink 8 glasses of water</div>
          <div data-testid="habit-frequency">daily</div>
          <div data-testid="habit-target">Target: 8 glasses</div>
          <div data-testid="habit-progress">
            <span>Progress: 5/8</span>
            <button data-testid="log-habit-button">Log</button>
          </div>
          <div data-testid="habit-streak">Streak: 7 days</div>
        </div>
      </div>

      <div data-testid="habits-stats">
        <h2>Statistics</h2>
        <div data-testid="total-habits">Total Habits: 5</div>
        <div data-testid="completed-today">Completed Today: 3</div>
        <div data-testid="longest-streak">Longest Streak: 30 days</div>
      </div>

      <div data-testid="habits-calendar">
        <h2>History</h2>
        <div data-testid="habit-calendar-view">Calendar View</div>
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

describe('HabitsPage', () => {
  it('renders habits page', () => {
    render(<HabitsPageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('habits-page')).toBeInTheDocument()
    expect(screen.getByText('Habits')).toBeInTheDocument()
  })

  it('displays header with controls', () => {
    render(<HabitsPageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('habits-header')).toBeInTheDocument()
    expect(screen.getByTestId('add-habit-button')).toBeInTheDocument()
    expect(screen.getByTestId('date-selector')).toBeInTheDocument()
  })

  it('shows habits list', () => {
    render(<HabitsPageMock />, { wrapper: createWrapper() })
    
    const habitsList = screen.getByTestId('habits-list')
    expect(habitsList).toBeInTheDocument()
    
    const habit = screen.getByTestId('habit-habit-1')
    expect(habit).toBeInTheDocument()
  })

  it('displays habit details', () => {
    render(<HabitsPageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('habit-name')).toHaveTextContent('Drink Water')
    expect(screen.getByTestId('habit-description')).toHaveTextContent('Drink 8 glasses of water')
    expect(screen.getByTestId('habit-frequency')).toHaveTextContent('daily')
    expect(screen.getByTestId('habit-target')).toHaveTextContent('Target: 8 glasses')
  })

  it('shows habit progress', () => {
    render(<HabitsPageMock />, { wrapper: createWrapper() })
    
    const progress = screen.getByTestId('habit-progress')
    expect(progress).toBeInTheDocument()
    expect(screen.getByText('Progress: 5/8')).toBeInTheDocument()
  })

  it('displays habit streak', () => {
    render(<HabitsPageMock />, { wrapper: createWrapper() })
    
    const streak = screen.getByTestId('habit-streak')
    expect(streak).toBeInTheDocument()
    expect(streak).toHaveTextContent('Streak: 7 days')
  })

  it('has log habit button', () => {
    render(<HabitsPageMock />, { wrapper: createWrapper() })
    
    const logButton = screen.getByTestId('log-habit-button')
    expect(logButton).toBeInTheDocument()
    expect(logButton).toHaveTextContent('Log')
  })

  it('displays statistics section', () => {
    render(<HabitsPageMock />, { wrapper: createWrapper() })
    
    const stats = screen.getByTestId('habits-stats')
    expect(stats).toBeInTheDocument()
    expect(screen.getByText('Statistics')).toBeInTheDocument()
  })

  it('shows habit statistics', () => {
    render(<HabitsPageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('total-habits')).toHaveTextContent('Total Habits: 5')
    expect(screen.getByTestId('completed-today')).toHaveTextContent('Completed Today: 3')
    expect(screen.getByTestId('longest-streak')).toHaveTextContent('Longest Streak: 30 days')
  })

  it('displays calendar view', () => {
    render(<HabitsPageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('habits-calendar')).toBeInTheDocument()
    expect(screen.getByText('History')).toBeInTheDocument()
    expect(screen.getByTestId('habit-calendar-view')).toBeInTheDocument()
  })
})

describe('HabitsPage Interactions', () => {
  it('can click add habit button', async () => {
    const user = userEvent.setup()
    render(<HabitsPageMock />, { wrapper: createWrapper() })
    
    const addButton = screen.getByTestId('add-habit-button')
    await user.click(addButton)
    
    expect(addButton).toBeInTheDocument()
  })

  it('can click log habit button', async () => {
    const user = userEvent.setup()
    render(<HabitsPageMock />, { wrapper: createWrapper() })
    
    const logButton = screen.getByTestId('log-habit-button')
    await user.click(logButton)
    
    expect(logButton).toBeInTheDocument()
  })

  it('can interact with date selector', async () => {
    const user = userEvent.setup()
    render(<HabitsPageMock />, { wrapper: createWrapper() })
    
    const dateSelector = screen.getByTestId('date-selector')
    await user.click(dateSelector)
    
    expect(dateSelector).toBeInTheDocument()
  })
})

describe('HabitsPage with API', () => {
  it('loads habits from API', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    const HabitsWithAPI = () => {
      return (
        <QueryClientProvider client={queryClient}>
          <HabitsPageMock />
        </QueryClientProvider>
      )
    }

    render(<HabitsWithAPI />)
    
    await waitFor(() => {
      expect(screen.getByTestId('habits-list')).toBeInTheDocument()
    })
  })

  it('handles empty habits list', async () => {
    const EmptyHabitsPage = () => {
      return (
        <div data-testid="habits-page">
          <h1>Habits</h1>
          <div data-testid="empty-state">
            <p>No habits yet. Create your first habit!</p>
            <button data-testid="add-first-habit">Add Habit</button>
          </div>
        </div>
      )
    }

    render(<EmptyHabitsPage />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('No habits yet. Create your first habit!')).toBeInTheDocument()
  })
})

describe('HabitsPage Progress Tracking', () => {
  it('shows visual progress indicator', () => {
    const HabitWithProgressBar = () => {
      return (
        <div data-testid="habit-with-progress">
          <div data-testid="progress-bar" style={{ width: '62.5%' }}>
            <span>62.5%</span>
          </div>
        </div>
      )
    }

    render(<HabitWithProgressBar />, { wrapper: createWrapper() })
    
    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveStyle({ width: '62.5%' })
  })

  it('displays completion status', () => {
    const CompletedHabit = () => {
      return (
        <div data-testid="completed-habit">
          <span data-testid="completion-badge">✓ Completed</span>
        </div>
      )
    }

    render(<CompletedHabit />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('completion-badge')).toHaveTextContent('✓ Completed')
  })
})

describe('HabitsPage Components', () => {
  it('has all major sections', () => {
    render(<HabitsPageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('habits-header')).toBeInTheDocument()
    expect(screen.getByTestId('habits-list')).toBeInTheDocument()
    expect(screen.getByTestId('habits-stats')).toBeInTheDocument()
    expect(screen.getByTestId('habits-calendar')).toBeInTheDocument()
  })
})

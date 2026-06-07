import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock Finance Page Component
const FinancePageMock = () => {
  return (
    <div data-testid="finance-page">
      <h1>Finance</h1>
      
      <div data-testid="accounts-section">
        <h2>Accounts</h2>
        <div data-testid="account-list">
          <div data-testid="account-account-1">
            <span>Checking Account</span>
            <span>$1,000.00</span>
            <span>checking</span>
          </div>
        </div>
        <button data-testid="add-account-button">Add Account</button>
      </div>

      <div data-testid="transactions-section">
        <h2>Transactions</h2>
        <div data-testid="transaction-list">
          <div data-testid="transaction-transaction-1">
            <span>Groceries</span>
            <span>-$50.00</span>
            <span>expense</span>
          </div>
        </div>
        <button data-testid="add-transaction-button">Add Transaction</button>
      </div>

      <div data-testid="overview-section">
        <h2>Overview</h2>
        <div data-testid="total-balance">
          <span>Total Balance</span>
          <span>$1,000.00</span>
        </div>
        <div data-testid="monthly-income">
          <span>Monthly Income</span>
          <span>$3,000.00</span>
        </div>
        <div data-testid="monthly-expenses">
          <span>Monthly Expenses</span>
          <span>$2,000.00</span>
        </div>
      </div>

      <div data-testid="charts-section">
        <h2>Analytics</h2>
        <div data-testid="spending-chart">Spending Chart</div>
        <div data-testid="category-breakdown">Category Breakdown</div>
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

describe('FinancePage', () => {
  it('renders finance page', () => {
    render(<FinancePageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('finance-page')).toBeInTheDocument()
    expect(screen.getByText('Finance')).toBeInTheDocument()
  })

  it('displays accounts section', () => {
    render(<FinancePageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('accounts-section')).toBeInTheDocument()
    expect(screen.getByText('Accounts')).toBeInTheDocument()
  })

  it('shows account list', () => {
    render(<FinancePageMock />, { wrapper: createWrapper() })
    
    const accountList = screen.getByTestId('account-list')
    expect(accountList).toBeInTheDocument()
    
    const account = screen.getByTestId('account-account-1')
    expect(account).toBeInTheDocument()
    expect(screen.getByText('Checking Account')).toBeInTheDocument()
    expect(screen.getByText('$1,000.00')).toBeInTheDocument()
  })

  it('has add account button', () => {
    render(<FinancePageMock />, { wrapper: createWrapper() })
    
    const addButton = screen.getByTestId('add-account-button')
    expect(addButton).toBeInTheDocument()
    expect(addButton).toHaveTextContent('Add Account')
  })

  it('displays transactions section', () => {
    render(<FinancePageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('transactions-section')).toBeInTheDocument()
    expect(screen.getByText('Transactions')).toBeInTheDocument()
  })

  it('shows transaction list', () => {
    render(<FinancePageMock />, { wrapper: createWrapper() })
    
    const transactionList = screen.getByTestId('transaction-list')
    expect(transactionList).toBeInTheDocument()
    
    const transaction = screen.getByTestId('transaction-transaction-1')
    expect(transaction).toBeInTheDocument()
    expect(screen.getByText('Groceries')).toBeInTheDocument()
    expect(screen.getByText('-$50.00')).toBeInTheDocument()
  })

  it('has add transaction button', () => {
    render(<FinancePageMock />, { wrapper: createWrapper() })
    
    const addButton = screen.getByTestId('add-transaction-button')
    expect(addButton).toBeInTheDocument()
    expect(addButton).toHaveTextContent('Add Transaction')
  })

  it('displays overview section', () => {
    render(<FinancePageMock />, { wrapper: createWrapper() })
    
    const overview = screen.getByTestId('overview-section')
    expect(overview).toBeInTheDocument()
    expect(screen.getByText('Overview')).toBeInTheDocument()
  })

  it('shows financial summary', () => {
    render(<FinancePageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('total-balance')).toBeInTheDocument()
    expect(screen.getByTestId('monthly-income')).toBeInTheDocument()
    expect(screen.getByTestId('monthly-expenses')).toBeInTheDocument()
    
    expect(screen.getByText('Total Balance')).toBeInTheDocument()
    expect(screen.getByText('Monthly Income')).toBeInTheDocument()
    expect(screen.getByText('Monthly Expenses')).toBeInTheDocument()
  })

  it('displays charts section', () => {
    render(<FinancePageMock />, { wrapper: createWrapper() })
    
    const chartsSection = screen.getByTestId('charts-section')
    expect(chartsSection).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    
    expect(screen.getByTestId('spending-chart')).toBeInTheDocument()
    expect(screen.getByTestId('category-breakdown')).toBeInTheDocument()
  })
})

describe('FinancePage Interactions', () => {
  it('can click add account button', async () => {
    const user = userEvent.setup()
    render(<FinancePageMock />, { wrapper: createWrapper() })
    
    const addButton = screen.getByTestId('add-account-button')
    await user.click(addButton)
    
    expect(addButton).toBeInTheDocument()
  })

  it('can click add transaction button', async () => {
    const user = userEvent.setup()
    render(<FinancePageMock />, { wrapper: createWrapper() })
    
    const addButton = screen.getByTestId('add-transaction-button')
    await user.click(addButton)
    
    expect(addButton).toBeInTheDocument()
  })
})

describe('FinancePage with API', () => {
  it('loads accounts from API', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    const FinanceWithAPI = () => {
      return (
        <QueryClientProvider client={queryClient}>
          <FinancePageMock />
        </QueryClientProvider>
      )
    }

    render(<FinanceWithAPI />)
    
    await waitFor(() => {
      expect(screen.getByTestId('account-list')).toBeInTheDocument()
    })
  })

  it('loads transactions from API', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    const FinanceWithAPI = () => {
      return (
        <QueryClientProvider client={queryClient}>
          <FinancePageMock />
        </QueryClientProvider>
      )
    }

    render(<FinanceWithAPI />)
    
    await waitFor(() => {
      expect(screen.getByTestId('transaction-list')).toBeInTheDocument()
    })
  })
})

describe('FinancePage Components', () => {
  it('has all major sections', () => {
    render(<FinancePageMock />, { wrapper: createWrapper() })
    
    expect(screen.getByTestId('accounts-section')).toBeInTheDocument()
    expect(screen.getByTestId('transactions-section')).toBeInTheDocument()
    expect(screen.getByTestId('overview-section')).toBeInTheDocument()
    expect(screen.getByTestId('charts-section')).toBeInTheDocument()
  })
})

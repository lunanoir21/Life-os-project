import { describe, it, expect, beforeEach } from 'vitest'
import { useFinanceStore } from '@/stores/finance-store'

describe('Finance Store', () => {
  beforeEach(() => {
    const store = useFinanceStore.getState()
    store.setAccounts([])
    store.setTransactions([])
    store.setCategories([])
    store.setBudgets([])
    store.setSelectedAccountId(null)
    store.setFinanceView('overview')
    store.setIsLoading(false)
  })

  it('should add an account', () => {
    const { addAccount } = useFinanceStore.getState()
    const account = {
      id: 'a1',
      name: 'Checking',
      type: 'checking' as const,
      balance: 1000,
      currency: 'USD',
      color: 'blue',
      icon: null,
      isDefault: true,
      createdAt: new Date().toISOString(),
    }
    addAccount(account)
    expect(useFinanceStore.getState().accounts).toHaveLength(1)
    expect(useFinanceStore.getState().accounts[0]).toEqual(account)
  })

  it('should add a transaction', () => {
    const { addTransaction } = useFinanceStore.getState()
    const transaction = {
      id: 't1',
      amount: -50,
      description: 'Groceries',
      type: 'expense' as const,
      date: '2026-06-06',
      accountId: 'a1',
      categoryId: 'c1',
      createdAt: new Date().toISOString(),
    } as any
    addTransaction(transaction)
    expect(useFinanceStore.getState().transactions).toHaveLength(1)
    expect(useFinanceStore.getState().transactions[0]).toEqual(transaction)
  })

  it('should update UI state', () => {
    const { setSelectedAccountId, setFinanceView, setIsLoading } = useFinanceStore.getState()
    
    setSelectedAccountId('a1')
    expect(useFinanceStore.getState().selectedAccountId).toBe('a1')
    
    setFinanceView('transactions')
    expect(useFinanceStore.getState().financeView).toBe('transactions')
    
    setIsLoading(true)
    expect(useFinanceStore.getState().isLoading).toBe(true)
  })
})

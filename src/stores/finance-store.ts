'use client'

import { create } from 'zustand'

export interface FinanceAccount {
  id: string
  name: string
  type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment' | 'loan'
  balance: number
  currency: string
  color: string | null
  icon: string | null
  isDefault: boolean
  createdAt: string
}

export interface Transaction {
  id: string
  amount: number
  description: string
  type: 'income' | 'expense' | 'transfer'
  date: string
  note: string | null
  accountId: string
  categoryId: string | null
  categoryName: string | null
  categoryIcon: string | null
  categoryColor: string | null
  createdAt: string
}

export interface TransactionCategory {
  id: string
  name: string
  icon: string | null
  color: string
  type: 'income' | 'expense' | 'transfer'
}

export interface Budget {
  id: string
  name: string
  period: 'weekly' | 'monthly' | 'yearly'
  startDate: string
  endDate: string | null
  items: BudgetItem[]
}

export interface BudgetItem {
  id: string
  categoryId: string
  categoryName: string
  categoryColor: string
  amount: number
  spent: number
}

interface FinanceState {
  accounts: FinanceAccount[]
  transactions: Transaction[]
  categories: TransactionCategory[]
  budgets: Budget[]
  selectedAccountId: string | null
  financeView: 'overview' | 'transactions' | 'budget' | 'analytics'
  dateRange: { start: string; end: string }
  isLoading: boolean
  
  setAccounts: (accounts: FinanceAccount[]) => void
  addAccount: (account: FinanceAccount) => void
  updateAccount: (id: string, updates: Partial<FinanceAccount>) => void
  
  setTransactions: (transactions: Transaction[]) => void
  addTransaction: (transaction: Transaction) => void
  deleteTransaction: (id: string) => void
  
  setCategories: (categories: TransactionCategory[]) => void
  setBudgets: (budgets: Budget[]) => void
  
  setSelectedAccountId: (id: string | null) => void
  setFinanceView: (view: FinanceState['financeView']) => void
  setDateRange: (range: { start: string; end: string }) => void
  setIsLoading: (loading: boolean) => void
}

export const useFinanceStore = create<FinanceState>()((set) => ({
  accounts: [],
  transactions: [],
  categories: [],
  budgets: [],
  selectedAccountId: null,
  financeView: 'overview',
  dateRange: { start: '', end: '' },
  isLoading: false,
  
  setAccounts: (accounts) => set({ accounts }),
  addAccount: (account) => set((state) => ({ accounts: [...state.accounts, account] })),
  updateAccount: (id, updates) => set((state) => ({
    accounts: state.accounts.map((a) => a.id === id ? { ...a, ...updates } : a)
  })),
  
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (transaction) => set((state) => ({ 
    transactions: [transaction, ...state.transactions] 
  })),
  deleteTransaction: (id) => set((state) => ({
    transactions: state.transactions.filter((t) => t.id !== id)
  })),
  
  setCategories: (categories) => set({ categories }),
  setBudgets: (budgets) => set({ budgets }),
  
  setSelectedAccountId: (id) => set({ selectedAccountId: id }),
  setFinanceView: (view) => set({ financeView: view }),
  setDateRange: (range) => set({ dateRange: range }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}))

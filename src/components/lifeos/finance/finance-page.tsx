'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Plus,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  CreditCard,
  PiggyBank,
  Search,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { motion } from 'framer-motion'
import type { FinanceAccount, Transaction, TransactionCategory, Budget } from '@/stores/finance-store'
import { useAppStore } from '@/stores/app-store'
import { useFinanceAccounts, useFinanceTransactions, useFinanceCategories, useCreateTransaction, useDeleteTransaction, useCreateAccount } from '@/lib/api/hooks'
import { useTranslation } from '@/lib/i18n'
import { showToast } from '@/lib/toast'
function cn(...inputs: (string | undefined | false)[]) { return inputs.filter(Boolean).join(' ') }

// Map API data to local types
function mapApiAccount(a: Record<string, unknown>): FinanceAccount {
  return {
    id: a.id as string,
    name: a.name as string,
    type: (a.type as string) || 'checking',
    balance: (a.balance as number) || 0,
    currency: (a.currency as string) || 'USD',
    color: (a.color as string) || '#6b7280',
    icon: (a.icon as string) || null,
    isDefault: (a.isDefault as boolean) || false,
    createdAt: new Date(a.createdAt as string).toISOString(),
  }
}

function mapApiTransaction(t: Record<string, unknown>): Transaction {
  const cat = t.category as Record<string, unknown> | null
  return {
    id: t.id as string,
    amount: (t.amount as number) || 0,
    description: (t.description as string) || '',
    type: (t.type as string) || 'expense',
    date: new Date(t.date as string).toISOString().split('T')[0],
    note: (t.note as string) || null,
    accountId: (t.accountId as string) || '',
    categoryId: (cat?.id as string) || null,
    categoryName: (cat?.name as string) || null,
    categoryIcon: (cat?.icon as string) || null,
    categoryColor: (cat?.color as string) || null,
    createdAt: new Date(t.createdAt as string).toISOString(),
  }
}

function mapApiCategory(c: Record<string, unknown>): TransactionCategory {
  return {
    id: c.id as string,
    name: c.name as string,
    icon: (c.icon as string) || '📦',
    color: (c.color as string) || '#6b7280',
    type: (c.type as string) || 'expense',
  }
}

const accentHexMap: Record<string, string> = {
  emerald: '#10b981', teal: '#14b8a6', amber: '#f59e0b',
  rose: '#f43f5e', violet: '#8b5cf6', cyan: '#06b6d4',
  indigo: '#6366f1', pink: '#ec4899', lime: '#84cc16', sky: '#0ea5e9',
}

export function FinancePage() {
  const accentColor = useAppStore((s) => s.accentColor)
  const { t } = useTranslation()
  const accentHex = accentHexMap[accentColor] || '#10b981'
  const { data: apiAccounts, isLoading: accountsLoading } = useFinanceAccounts()
  const { data: apiTransactions, isLoading: transactionsLoading } = useFinanceTransactions()
  const { data: apiCategories, isLoading: categoriesLoading } = useFinanceCategories()
  const createTransactionMutation = useCreateTransaction()
  const deleteTransactionMutation = useDeleteTransaction()
  const createAccountMutation = useCreateAccount()

  const accounts: FinanceAccount[] = useMemo(() => {
    if (!apiAccounts) return []
    return (apiAccounts as Record<string, unknown>[]).map(mapApiAccount)
  }, [apiAccounts])

  const transactions: Transaction[] = useMemo(() => {
    if (!apiTransactions) return []
    return ((apiTransactions as { transactions: unknown[]; total: number }).transactions as Record<string, unknown>[]).map(mapApiTransaction)
  }, [apiTransactions])

  const categories: TransactionCategory[] = useMemo(() => {
    if (!apiCategories) return []
    return (apiCategories as Record<string, unknown>[]).map(mapApiCategory)
  }, [apiCategories])

  const [financeView, setFinanceView] = useState<'overview' | 'transactions' | 'budget' | 'analytics'>('overview')
  const [createAccountDialogOpen, setCreateAccountDialogOpen] = useState(false)
  const [newAccount, setNewAccount] = useState({ name: '', type: 'checking', balance: '', currency: 'USD', color: '#10b981' })

  // Budget data (derived from categories with realistic defaults)
  const budgetData = useMemo(() => {
    const categoryBudgets: Record<string, number> = {
      'Housing': 2000, 'Rent': 2000, 'Mortgage': 2000,
      'Food': 600, 'Groceries': 500, 'Dining': 200, 'Restaurants': 200,
      'Transportation': 300, 'Gas': 200, 'Car': 400,
      'Entertainment': 150, 'Subscriptions': 50, 'Streaming': 30,
      'Healthcare': 200, 'Medical': 200,
      'Shopping': 300, 'Clothing': 150,
      'Utilities': 250, 'Insurance': 300,
      'Education': 200, 'Personal': 200,
      'Savings': 500, 'Investment': 500,
    }
    return categories.filter(c => c.type === 'expense').map(cat => {
      const spent = transactions.filter(t => t.categoryId === cat.id && t.type === 'expense').reduce((acc, t) => acc + Math.abs(t.amount), 0)
      // Find matching budget by category name, fallback to proportional budget based on total expenses
      const budget = categoryBudgets[cat.name] || Math.max(500, Math.ceil((spent * 1.5) / 100) * 100)
      return { id: cat.id, name: cat.name, icon: cat.icon, color: cat.color, spent, budget, percentage: Math.min(100, Math.round((spent / budget) * 100)) }
    })
  }, [categories, transactions])
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newTransaction, setNewTransaction] = useState({ description: '', amount: '', type: 'expense' as Transaction['type'], categoryId: '', accountId: '', date: new Date().toISOString().split('T')[0] })

  const isLoading = accountsLoading || transactionsLoading || categoriesLoading

  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0)
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Math.abs(t.amount), 0)
  const netSavings = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0

  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return transactions
    const q = searchQuery.toLowerCase()
    return transactions.filter(t => t.description.toLowerCase().includes(q) || t.categoryName?.toLowerCase().includes(q))
  }, [transactions, searchQuery])

  // Spending by category for pie chart
  const spendingByCategory = useMemo(() => {
    const byCategory: Record<string, { name: string; value: number; color: string }> = {}
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const catName = t.categoryName || 'Other'
      const catColor = t.categoryColor || '#6b7280'
      if (byCategory[catName]) {
        byCategory[catName].value += Math.abs(t.amount)
      } else {
        byCategory[catName] = { name: catName, value: Math.abs(t.amount), color: catColor }
      }
    })
    return Object.values(byCategory)
  }, [transactions])

  // Monthly spending for bar chart
  const monthlySpending = useMemo(() => {
    const byMonth: Record<string, number> = {}
    transactions.forEach(t => {
      if (t.type === 'expense') {
        const month = t.date.slice(0, 7)
        byMonth[month] = (byMonth[month] || 0) + Math.abs(t.amount)
      }
    })
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }), amount }))
  }, [transactions])

  const handleAddAccount = useCallback(() => {
    if (!newAccount.name.trim()) return
    createAccountMutation.mutate({
      name: newAccount.name,
      type: newAccount.type,
      balance: parseFloat(newAccount.balance) || 0,
      currency: newAccount.currency,
      color: newAccount.color,
    }, {
      onSuccess: () => {
        setNewAccount({ name: '', type: 'checking', balance: '', currency: 'USD', color: '#10b981' })
        setCreateAccountDialogOpen(false)
        showToast.success(t('toast.created'))
      }
    })
  }, [newAccount, createAccountMutation, t])

  const handleAddTransaction = useCallback(() => {
    if (!newTransaction.description.trim() || !newTransaction.amount || !newTransaction.accountId) return
    const cat = categories.find(c => c.id === newTransaction.categoryId)
    const amount = parseFloat(newTransaction.amount)
    createTransactionMutation.mutate({
      amount: newTransaction.type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
      description: newTransaction.description,
      type: newTransaction.type,
      date: newTransaction.date,
      accountId: newTransaction.accountId,
      categoryId: newTransaction.categoryId || null,
    }, {
      onSuccess: () => {
        setNewTransaction({ description: '', amount: '', type: 'expense', categoryId: '', accountId: '', date: new Date().toISOString().split('T')[0] })
        setCreateDialogOpen(false)
        showToast.success('Transaction added')
      }
    })
  }, [newTransaction, categories, createTransactionMutation])

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 animate-page-enter">
      {/* Account Cards */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('finance.accounts')}</h2>
        <Dialog open={createAccountDialogOpen} onOpenChange={setCreateAccountDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
              <Plus className="h-3.5 w-3.5" />{t('finance.newAccount')}
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader><DialogTitle>{t('finance.newAccount')}</DialogTitle><DialogDescription className="sr-only">Add a new finance account</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              <div><label className="text-sm font-medium mb-1.5 block">{t('finance.accountName')}</label><Input placeholder={t('finance.accountNamePlaceholder')} value={newAccount.name} onChange={e => setNewAccount(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1.5 block">{t('finance.type')}</label><Select value={newAccount.type} onValueChange={v => setNewAccount(p => ({ ...p, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="checking">{t('finance.checking')}</SelectItem><SelectItem value="savings">{t('finance.savings')}</SelectItem><SelectItem value="credit">{t('finance.credit')}</SelectItem><SelectItem value="investment">{t('finance.investment')}</SelectItem><SelectItem value="cash">{t('finance.cash')}</SelectItem></SelectContent></Select></div>
                <div><label className="text-sm font-medium mb-1.5 block">{t('finance.initialBalance')}</label><Input type="number" placeholder="0.00" value={newAccount.balance} onChange={e => setNewAccount(p => ({ ...p, balance: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1.5 block">{t('finance.currency')}</label><Select value={newAccount.currency} onValueChange={v => setNewAccount(p => ({ ...p, currency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD ($)</SelectItem><SelectItem value="EUR">EUR (€)</SelectItem><SelectItem value="GBP">GBP (£)</SelectItem><SelectItem value="TRY">TRY (₺)</SelectItem><SelectItem value="JPY">JPY (¥)</SelectItem></SelectContent></Select></div>
                <div><label className="text-sm font-medium mb-1.5 block">{t('finance.color')}</label><div className="flex gap-1.5 mt-1 flex-wrap">{['#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'].map(c => (<button key={c} className={cn('w-6 h-6 rounded-full transition-all', newAccount.color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105')} style={{ backgroundColor: c }} onClick={() => setNewAccount(p => ({ ...p, color: c }))} />))}</div></div>
              </div>
            </div>
            <DialogFooter><DialogClose asChild><Button variant="outline">{t('cancel')}</Button></DialogClose><Button onClick={handleAddAccount} disabled={createAccountMutation.isPending}>{t('create')}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {accounts.map(account => (
            <motion.div key={account.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}>
              <Card className="overflow-hidden hover:shadow-md transition-all duration-200 hover-lift" style={{ borderImage: `linear-gradient(to bottom, ${account.color}, ${account.color}88) 1`, borderTopWidth: '2px' }}>
                <div className="h-1" style={{ background: `linear-gradient(to right, ${account.color}, ${account.color}88)` }} />
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md" style={{ backgroundColor: account.color + '15' }}>
                      {account.type === 'checking' ? <CreditCard className="h-4 w-4" style={{ color: account.color }} /> :
                       account.type === 'savings' ? <PiggyBank className="h-4 w-4" style={{ color: account.color }} /> :
                       <Wallet className="h-4 w-4" style={{ color: account.color }} />}
                    </div>
                    <span className="text-sm font-medium">{account.name}</span>
                  </div>
                  <p className={cn('text-2xl font-bold', account.balance < 0 && 'text-red-500')}>
                    {account.balance >= 0 ? <span style={{ color: accentHex }}>↑</span> : <span className="text-red-500">↓</span>}
                    ${Math.abs(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    {account.balance < 0 && <span className="text-sm ml-1">CR</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{t('finance.accountType', { type: account.type.charAt(0).toUpperCase() + account.type.slice(1) })}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="overflow-hidden hover-lift"><div className="h-1" style={{ background: `linear-gradient(to right, ${accentHex}, ${accentHex}cc)` }} /><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4" style={{ color: accentHex }} /><span className="text-xs text-muted-foreground">{t('finance.totalBalance')}</span></div>{isLoading ? <Skeleton className="h-6 w-24" /> : <p className="text-xl font-bold">${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>}</CardContent></Card>
        <Card className="overflow-hidden hover-lift"><div className="h-1" style={{ background: `linear-gradient(to right, ${accentHex}, ${accentHex}aa)` }} /><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><ArrowUpRight className="h-4 w-4" style={{ color: accentHex }} /><span className="text-xs text-muted-foreground">{t('finance.income')}</span></div>{isLoading ? <Skeleton className="h-6 w-24" /> : <p className="text-xl font-bold" style={{ color: accentHex }}>↑ +${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>}</CardContent></Card>
        <Card className="overflow-hidden hover-lift"><div className="h-1 bg-gradient-to-r from-orange-400 to-red-400" /><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><ArrowDownRight className="h-4 w-4 text-red-500" /><span className="text-xs text-muted-foreground">{t('finance.monthlyExpenses')}</span></div>{isLoading ? <Skeleton className="h-6 w-24" /> : <p className="text-xl font-bold text-red-500">↓ -${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>}</CardContent></Card>
        <Card className="overflow-hidden hover-lift"><div className="h-1" style={{ background: `linear-gradient(to right, ${accentHex}cc, ${accentHex})` }} /><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><TrendingUp className={cn('h-4 w-4', netSavings >= 0 && 'animate-trend-up')} style={{ color: accentHex }} /><span className="text-xs text-muted-foreground">{t('finance.savingsRate')}</span></div>{isLoading ? <Skeleton className="h-6 w-12" /> : <><p className={cn('text-xl font-bold', netSavings >= 0 ? '' : 'text-red-500')} style={netSavings >= 0 ? { color: accentHex } : undefined}>{netSavings >= 0 ? '↑' : '↓'}{savingsRate}%</p><div className="h-1.5 bg-muted/50 rounded-full overflow-hidden mt-2"><div className="h-full rounded-full animate-savings-fill" style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%`, background: savingsRate >= 20 ? `linear-gradient(to right, ${accentHex}, ${accentHex}cc)` : savingsRate >= 10 ? 'linear-gradient(to right, #f59e0b, #f97316)' : 'linear-gradient(to right, #ef4444, #f97316)' }} /></div></>}</CardContent></Card>
      </div>

      {/* View Tabs */}
      <div className="flex items-center justify-between">
        <Tabs value={financeView} onValueChange={v => setFinanceView(v as typeof financeView)}>
          <TabsList className="h-8"><TabsTrigger value="overview" className="text-xs px-3 h-6 tab-transition">{t('nav.overview')}</TabsTrigger><TabsTrigger value="budget" className="text-xs px-3 h-6 tab-transition">{t('finance.budgets')}</TabsTrigger><TabsTrigger value="transactions" className="text-xs px-3 h-6 tab-transition">{t('finance.transactions')}</TabsTrigger><TabsTrigger value="analytics" className="text-xs px-3 h-6 tab-transition">{t('finance.analytics')}</TabsTrigger></TabsList>
        </Tabs>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />{t('finance.newTransaction')}</Button></DialogTrigger>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader><DialogTitle>{t('finance.newTransaction')}</DialogTitle><DialogDescription className="sr-only">Add a new financial transaction</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              <div><label className="text-sm font-medium mb-1.5 block">{t('finance.description')}</label><Input placeholder={t('finance.whatWasThisFor')} value={newTransaction.description} onChange={e => setNewTransaction(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1.5 block">{t('finance.amount')}</label><Input type="number" placeholder="0.00" value={newTransaction.amount} onChange={e => setNewTransaction(p => ({ ...p, amount: e.target.value }))} /></div>
                <div><label className="text-sm font-medium mb-1.5 block">{t('finance.type')}</label><Select value={newTransaction.type} onValueChange={v => setNewTransaction(p => ({ ...p, type: v as Transaction['type'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="expense">{t('finance.expense')}</SelectItem><SelectItem value="income">{t('finance.income')}</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1.5 block">{t('finance.category')}</label><Select value={newTransaction.categoryId} onValueChange={v => setNewTransaction(p => ({ ...p, categoryId: v }))}><SelectTrigger><SelectValue placeholder={t('finance.select')} /></SelectTrigger><SelectContent>{categories.filter(c => c.type === newTransaction.type || c.type === 'transfer').map(c => (<SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>))}</SelectContent></Select></div>
                <div><label className="text-sm font-medium mb-1.5 block">{t('finance.account')}</label><Select value={newTransaction.accountId} onValueChange={v => setNewTransaction(p => ({ ...p, accountId: v }))}><SelectTrigger><SelectValue placeholder={t('finance.select')} /></SelectTrigger><SelectContent>{accounts.map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent></Select></div>
              </div>
              <div><label className="text-sm font-medium mb-1.5 block">{t('finance.date')}</label><Input type="date" value={newTransaction.date} onChange={e => setNewTransaction(p => ({ ...p, date: e.target.value }))} /></div>
            </div>
            <DialogFooter><DialogClose asChild><Button variant="outline">{t('cancel')}</Button></DialogClose><Button onClick={handleAddTransaction} disabled={createTransactionMutation.isPending}>{t('add')}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content Views */}
      {isLoading ? (
        <Card><CardContent className="p-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
      ) : financeView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">{t('finance.spendingByCategory')}</CardTitle></CardHeader><CardContent><div className="h-64">{spendingByCategory.length > 0 ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={spendingByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: $${value.toFixed(0)}`}>{spendingByCategory.map((entry, index) => (<Cell key={index} fill={entry.color} />))}</Pie><Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} /></PieChart></ResponsiveContainer> : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t('finance.noExpenseData')}</div>}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">{t('finance.recentTransactions')}</CardTitle></CardHeader><CardContent><ScrollArea className="h-64"><div className="space-y-2">{transactions.slice(0, 8).map(t => (<div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"><span className="text-lg">{t.categoryIcon || '💵'}</span><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{t.description}</p><p className="text-xs text-muted-foreground">{t.date}</p></div><span className={cn('text-sm font-semibold', t.type === 'income' ? '' : 'text-red-500')} style={t.type === 'income' ? { color: accentHex } : undefined}>{t.type === 'income' ? '+' : '-'}${Math.abs(t.amount).toFixed(2)}</span></div>))}</div></ScrollArea></CardContent></Card>
        </div>
      )}

      {financeView === 'budget' && (
        <div className="space-y-4">
          {budgetData.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <div className="text-4xl mb-3">💰</div>
              <p className="text-sm font-medium">{t('finance.noBudgetCategories')}</p>
              <p className="text-xs mt-1">{t('finance.addExpenseCategories')}</p>
            </CardContent></Card>
          ) : (
            budgetData.map((item, idx) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card className="shadow-card hover:shadow-md transition-all duration-200 overflow-hidden">
                  <div className="h-1" style={{ background: `linear-gradient(to right, ${item.color}, ${item.color}88)` }} />
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">${item.spent.toFixed(0)}</span>
                        <span className="text-xs text-muted-foreground">/ ${item.budget}</span>
                      </div>
                    </div>
                    <Progress 
                      value={item.percentage} 
                      className={cn('h-2', item.percentage >= 90 ? '[&>div]:bg-gradient-to-r [&>div]:from-red-500 [&>div]:to-orange-500' : item.percentage >= 70 ? '[&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500' : '')}
                      data-budget-item={item.percentage < 70 ? item.id : undefined}
                    />
                    {item.percentage < 70 && (
                      <style>{`[data-budget-item="${item.id}"] > div { background: linear-gradient(to right, ${accentHex}, ${accentHex}cc) !important; }`}</style>
                    )}
                    <div className="flex justify-between mt-1.5">
                      <span className={cn('text-xs font-medium', item.percentage >= 90 ? 'text-red-500' : item.percentage >= 70 ? 'text-amber-500' : '')} style={item.percentage < 70 ? { color: accentHex } : undefined}>{item.percentage}% {t('finance.used')}</span>
                      <span className="text-xs text-muted-foreground">${Math.max(0, item.budget - item.spent).toFixed(0)} {t('finance.remaining')}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}

      {financeView === 'transactions' && (
        <Card className="shadow-card"><CardContent className="p-0"><div className="p-4 border-b"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={t('finance.searchTransactions')} className="pl-9 h-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div></div><div className="divide-y">{filteredTransactions.map((tx, idx) => (<div key={tx.id} className={cn('flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors', idx % 2 === 0 && 'row-even')}><div className="p-1.5 rounded-md" style={{ backgroundColor: (tx.categoryColor || '#888') + '15' }}><span className="text-base">{tx.categoryIcon || '💵'}</span></div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{tx.description}</p><p className="text-xs text-muted-foreground">{tx.categoryName || t('finance.uncategorized')} • {tx.date}</p></div><div className="flex items-center gap-2"><span className={cn('text-sm font-semibold shrink-0', tx.type === 'income' ? '' : 'text-red-500')} style={tx.type === 'income' ? { color: accentHex } : undefined}>{tx.type === 'income' ? <ArrowUpRight className="h-3 w-3 inline mr-0.5" /> : <ArrowDownRight className="h-3 w-3 inline mr-0.5" />}{tx.type === 'income' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}</span><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 hover:text-destructive" onClick={() => deleteTransactionMutation.mutate(tx.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></div>))}</div></CardContent></Card>
      )}

      {financeView === 'analytics' && (
        <Card><CardHeader><CardTitle className="text-base">{t('finance.monthlySpendingTrend')}</CardTitle></CardHeader><CardContent><div className="h-72 bg-gradient-to-b from-muted/20 to-transparent rounded-lg p-2">{monthlySpending.length > 0 ? <ResponsiveContainer width="100%" height="100%"><BarChart data={monthlySpending}><defs><linearGradient id="financeBarGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={accentHex} stopOpacity={0.8} /><stop offset="95%" stopColor={accentHex} stopOpacity={0.4} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="month" className="text-xs" /><YAxis className="text-xs" /><Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} /><Bar dataKey="amount" fill="url(#financeBarGradient)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t('finance.noSpendingData')}</div>}</div></CardContent></Card>
      )}
    </div>
  )
}

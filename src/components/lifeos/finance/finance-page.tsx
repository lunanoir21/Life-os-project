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
  AlertTriangle,
  Upload,
  ArrowLeftRight,
  RefreshCw,
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
import { SUPPORTED_CURRENCIES, useExchangeRates, convert, formatCurrency, symbolFor } from '@/lib/finance/currency'
function cn(...inputs: (string | undefined | false)[]) { return inputs.filter(Boolean).join(' ') }

// Map API data to local types
function mapApiAccount(a: Record<string, unknown>): FinanceAccount {
  return {
    id: a.id as string,
    name: a.name as string,
    type: ((a.type as string) || 'checking') as FinanceAccount['type'],
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
    type: ((t.type as string) || 'expense') as Transaction['type'],
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
    type: ((c.type as string) || 'expense') as TransactionCategory['type'],
  }
}

const accentHexMap: Record<string, string> = {
  emerald: '#10b981', teal: '#14b8a6', amber: '#f59e0b',
  rose: '#f43f5e', violet: '#8b5cf6', cyan: '#06b6d4',
  indigo: '#6366f1', pink: '#ec4899', lime: '#84cc16', sky: '#0ea5e9',
}

export function FinancePage() {
  const accentColor = useAppStore((s) => s.accentColor)
  const baseCurrency = useAppStore((s) => s.baseCurrency)
  const setBaseCurrency = useAppStore((s) => s.setBaseCurrency)
  const { t } = useTranslation()
  const accentHex = accentHexMap[accentColor] || '#10b981'
  const { data: ratesData, isLoading: ratesLoading, isError: ratesError, refetch: refetchRates } = useExchangeRates(baseCurrency)
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

  // Cross-currency total balance — convert every account into the user's
  // base currency using the live ECB rate table. Falls back to a raw sum
  // when rates aren't available yet so the UI never goes blank.
  const totalBalanceBase = useMemo(() => {
    if (!ratesData) return totalBalance
    return accounts.reduce((sum, a) => {
      const converted = convert(a.balance, a.currency || 'USD', baseCurrency, ratesData)
      return sum + (converted ?? a.balance)
    }, 0)
  }, [accounts, ratesData, baseCurrency, totalBalance])

  const incomeBase = useMemo(() => {
    if (!ratesData) return totalIncome
    return transactions.filter(t => t.type === 'income').reduce((sum, tx) => {
      // Transactions inherit the account currency; fall back to base.
      const acc = accounts.find(a => a.id === tx.accountId)
      const c = convert(tx.amount, acc?.currency || baseCurrency, baseCurrency, ratesData)
      return sum + (c ?? tx.amount)
    }, 0)
  }, [transactions, accounts, ratesData, baseCurrency, totalIncome])

  const expenseBase = useMemo(() => {
    if (!ratesData) return totalExpenses
    return transactions.filter(t => t.type === 'expense').reduce((sum, tx) => {
      const acc = accounts.find(a => a.id === tx.accountId)
      const c = convert(Math.abs(tx.amount), acc?.currency || baseCurrency, baseCurrency, ratesData)
      return sum + (c ?? Math.abs(tx.amount))
    }, 0)
  }, [transactions, accounts, ratesData, baseCurrency, totalExpenses])

  const netSavingsBase = incomeBase - expenseBase
  const savingsRateBase = incomeBase > 0 ? Math.round((netSavingsBase / incomeBase) * 100) : 0

  // ─── Currency converter widget state ──────────────────────────────
  const [convFrom, setConvFrom] = useState<string>('USD')
  const [convTo, setConvTo] = useState<string>('EUR')
  const [convAmount, setConvAmount] = useState<string>('100')
  // Use a dedicated rate fetch keyed on convFrom so the converter is
  // independent of the user's base currency selection.
  const { data: convRates } = useExchangeRates(convFrom)
  const convAmountNum = parseFloat(convAmount) || 0
  const convResult = convRates ? convert(convAmountNum, convFrom, convTo, convRates) : null
  const convUnitRate = convRates ? convert(1, convFrom, convTo, convRates) : null

  const swapConverter = useCallback(() => {
    setConvFrom(prev => {
      const next = convTo
      setConvTo(prev)
      return next
    })
  }, [convTo])

  // Top rate badges for the hero footer — show the most common currencies
  // relative to the chosen base, but skip the base itself.
  const topRateBadges = useMemo(() => {
    if (!ratesData) return [] as { code: string; rate: number }[]
    const wanted = ['USD', 'EUR', 'GBP', 'TRY', 'JPY']
    return wanted
      .filter(c => c !== baseCurrency.toUpperCase())
      .map(c => ({ code: c, rate: ratesData.rates[c] }))
      .filter(r => typeof r.rate === 'number')
  }, [ratesData, baseCurrency])

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

  // Monthly income vs expense for grouped bar chart
  const monthlySpending = useMemo(() => {
    const byMonth: Record<string, { income: number; expense: number }> = {}
    transactions.forEach(t => {
      const month = t.date.slice(0, 7)
      if (!byMonth[month]) byMonth[month] = { income: 0, expense: 0 }
      if (t.type === 'income') byMonth[month].income += Math.abs(t.amount)
      else byMonth[month].expense += Math.abs(t.amount)
    })
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { income, expense }]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
        income,
        expense,
        net: income - expense,
      }))
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
                      {account.type === 'checking' ? <CreditCard className="h-4 w-4" style={{ color: account.color ?? undefined }} /> :
                       account.type === 'savings' ? <PiggyBank className="h-4 w-4" style={{ color: account.color ?? undefined }} /> :
                       <Wallet className="h-4 w-4" style={{ color: account.color ?? undefined }} />}
                    </div>
                    <span className="text-sm font-medium">{account.name}</span>
                  </div>
                  <p className={cn('text-2xl font-bold', account.balance < 0 && 'text-red-500')}>
                    {account.balance >= 0 ? <span style={{ color: accentHex }}>↑</span> : <span className="text-red-500">↓</span>}
                    {formatCurrency(Math.abs(account.balance), account.currency || 'USD')}
                    {account.balance < 0 && <span className="text-sm ml-1">CR</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{t('finance.accountType', { type: account.type.charAt(0).toUpperCase() + account.type.slice(1) })}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* ─── Finance hero — cross-currency total + KPIs + live rates ─── */}
      <div className="relative rounded-2xl border border-border/70 bg-card overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accentHex}22, transparent 60%)`, filter: 'blur(40px)' }}
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accentHex}14, transparent 60%)`, filter: 'blur(40px)' }}
        />

        <div className="relative p-5 md:p-7 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 lg:gap-8 items-start">
          {/* Total balance + base currency selector */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {t('finance.hero.totalLabel')}
              </span>
              <Select value={baseCurrency} onValueChange={(v) => setBaseCurrency(v)}>
                <SelectTrigger className="h-6 px-2 text-[11px] gap-1 w-auto border-border/60 bg-background/60">
                  <span className="text-muted-foreground/70">{t('finance.hero.base')}:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="font-mono">{c.code}</span>
                      <span className="text-muted-foreground ml-1.5">{c.symbol}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => refetchRates()}
                className="inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-accent/40"
                title={t('finance.hero.ratesLoading')}
              >
                <RefreshCw className={cn('h-3 w-3', ratesLoading && 'animate-spin')} />
              </button>
            </div>
            {isLoading ? (
              <Skeleton className="h-10 w-56" />
            ) : (
              <h2 className="text-3xl md:text-[40px] font-semibold tracking-tight">
                {formatCurrency(totalBalanceBase, baseCurrency)}
              </h2>
            )}
            <p className="text-[11px] text-muted-foreground/70 mt-1.5">
              {ratesError ? t('finance.hero.ratesUnavailable')
                : ratesLoading || !ratesData ? t('finance.hero.ratesLoading')
                : t('finance.hero.ratesUpdated', { date: ratesData.date })}
            </p>
          </div>

          {/* KPI rail — income / expense / savings, all in base currency */}
          <div className="grid grid-cols-3 gap-2 lg:gap-3 w-full lg:w-auto">
            {[
              {
                icon: ArrowUpRight,
                label: t('finance.income'),
                value: formatCurrency(incomeBase, baseCurrency),
                color: accentHex,
              },
              {
                icon: ArrowDownRight,
                label: t('finance.monthlyExpenses'),
                value: formatCurrency(expenseBase, baseCurrency),
                color: '#ef4444',
              },
              {
                icon: TrendingUp,
                label: t('finance.savingsRate'),
                value: `${savingsRateBase}%`,
                color: savingsRateBase >= 0 ? accentHex : '#ef4444',
              },
            ].map(kpi => {
              const Icon = kpi.icon
              return (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-border/60 bg-background/60 backdrop-blur px-3 py-3 lg:px-4 lg:py-3.5 min-w-[110px] lg:min-w-[140px]"
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3 w-3" style={{ color: kpi.color }} />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">{kpi.label}</span>
                  </div>
                  {isLoading ? <Skeleton className="h-6 w-20 mt-1.5" />
                    : <p className="mt-1.5 text-base lg:text-lg font-semibold tabular-nums truncate" style={{ color: kpi.color }}>{kpi.value}</p>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Live rate marquee */}
        <div className="relative border-t border-border/60 bg-muted/20 px-5 md:px-7 py-2.5 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 shrink-0">
            1 {baseCurrency} =
          </span>
          {topRateBadges.length === 0 ? (
            <span className="text-[11px] text-muted-foreground/60">
              {ratesError ? t('finance.hero.ratesUnavailable') : t('finance.hero.ratesLoading')}
            </span>
          ) : topRateBadges.map(({ code, rate }) => (
            <span
              key={code}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-0.5 text-[11px] font-mono tabular-nums shrink-0"
              style={{ backgroundColor: 'hsl(var(--background) / 0.6)' }}
            >
              <span className="text-muted-foreground/60">{code}</span>
              <span>{rate.toLocaleString('en-US', { maximumFractionDigits: 4 })}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ─── Currency converter ─── */}
      <Card className="overflow-hidden">
        <div className="h-1" style={{ background: `linear-gradient(to right, ${accentHex}, ${accentHex}66)` }} />
        <CardContent className="p-4 md:p-5">
          <div className="flex items-center gap-2 mb-3.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${accentHex}1a`, color: accentHex }}
            >
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">{t('finance.converter.title')}</h3>
              <p className="text-[11px] text-muted-foreground/70 truncate">{t('finance.converter.subtitle')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-end gap-3">
            {/* From */}
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {t('finance.converter.from')}
              </label>
              <div className="mt-1 flex items-stretch gap-1.5">
                <Select value={convFrom} onValueChange={setConvFrom}>
                  <SelectTrigger className="w-[88px] shrink-0 font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="font-mono">{c.code}</span>
                        <span className="text-muted-foreground ml-1.5">{c.symbol}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1 min-w-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/60 pointer-events-none">
                    {symbolFor(convFrom)}
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={convAmount}
                    onChange={e => setConvAmount(e.target.value)}
                    className="pl-7 font-mono tabular-nums text-right"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Swap */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={swapConverter}
              className="h-9 w-9 self-end md:self-center md:mt-5 shrink-0"
              aria-label={t('finance.converter.swap')}
              title={t('finance.converter.swap')}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </Button>

            {/* To */}
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {t('finance.converter.to')}
              </label>
              <div className="mt-1 flex items-stretch gap-1.5">
                <Select value={convTo} onValueChange={setConvTo}>
                  <SelectTrigger className="w-[88px] shrink-0 font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="font-mono">{c.code}</span>
                        <span className="text-muted-foreground ml-1.5">{c.symbol}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div
                  className="flex-1 min-w-0 h-9 px-3 rounded-md border border-border/60 bg-muted/40 flex items-center justify-end font-mono tabular-nums text-sm"
                  aria-live="polite"
                >
                  {convResult === null
                    ? <span className="text-muted-foreground/60 text-xs">{t('finance.hero.ratesLoading')}</span>
                    : <span className="font-semibold" style={{ color: accentHex }}>
                        {formatCurrency(convResult, convTo)}
                      </span>}
                </div>
              </div>
            </div>
          </div>

          {convUnitRate !== null && (
            <p className="mt-3 text-[11px] text-muted-foreground/70 text-center font-mono tabular-nums">
              {t('finance.converter.rateLine', {
                from: convFrom,
                value: convUnitRate.toLocaleString('en-US', { maximumFractionDigits: 4 }),
                to: convTo,
              })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* View Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tabs value={financeView} onValueChange={v => setFinanceView(v as typeof financeView)}>
            <TabsList className="h-8"><TabsTrigger value="overview" className="text-xs px-3 h-6 tab-transition">{t('nav.overview')}</TabsTrigger><TabsTrigger value="budget" className="text-xs px-3 h-6 tab-transition">{t('finance.budgets')}</TabsTrigger><TabsTrigger value="transactions" className="text-xs px-3 h-6 tab-transition">{t('finance.transactions')}</TabsTrigger><TabsTrigger value="analytics" className="text-xs px-3 h-6 tab-transition">{t('finance.analytics')}</TabsTrigger></TabsList>
          </Tabs>
          {financeView === 'transactions' && (
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = (ev) => {
                    const text = ev.target?.result as string
                    if (!text) return
                    const lines = text.split('\n').filter(Boolean)
                    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
                    let imported = 0
                    const defaultAccountId = accounts[0]?.id
                    if (!defaultAccountId) { showToast.error('Önce bir hesap ekleyin'); return }
                    lines.slice(1).forEach(line => {
                      const cols = line.split(',').map(c => c.trim().replace(/"/g, ''))
                      const row: Record<string, string> = {}
                      headers.forEach((h, i) => { row[h] = cols[i] || '' })
                      const amount = parseFloat(row['amount'] || row['miktar'] || '0')
                      const description = row['description'] || row['aciklama'] || row['tanım'] || 'Import'
                      const date = row['date'] || row['tarih'] || new Date().toISOString().split('T')[0]
                      if (!isNaN(amount) && amount !== 0) {
                        createTransactionMutation.mutate({
                          amount: amount < 0 ? amount : -amount,
                          description,
                          type: amount > 0 ? 'income' : 'expense',
                          date,
                          accountId: defaultAccountId,
                          categoryId: null,
                        })
                        imported++
                      }
                    })
                    showToast.success(`${imported} işlem içe aktarıldı`)
                    e.target.value = ''
                  }
                  reader.readAsText(file)
                }}
              />
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs pointer-events-none">
                <Upload className="h-3.5 w-3.5" />CSV İçe Aktar
              </Button>
            </label>
          )}
        </div>
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
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">{t('finance.recentTransactions')}</CardTitle></CardHeader><CardContent><ScrollArea className="h-64"><div className="space-y-2">{transactions.slice(0, 8).map(t => (<div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"><span className="text-lg">{t.categoryIcon || '💵'}</span><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{t.description}</p><p className="text-xs text-muted-foreground">{t.date}</p></div><span className={cn('text-sm font-semibold', t.type === 'income' ? '' : 'text-red-500')} style={t.type === 'income' ? { color: accentHex } : undefined}>{t.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(t.amount), accounts.find(a => a.id === t.accountId)?.currency || baseCurrency)}</span></div>))}</div></ScrollArea></CardContent></Card>
        </div>
      )}

      {financeView === 'budget' && (
        <div className="space-y-4">
          {/* Budget Alerts */}
          {(() => {
            const overBudget = budgetData.filter(b => b.percentage >= 100)
            const nearBudget = budgetData.filter(b => b.percentage >= 80 && b.percentage < 100)
            if (overBudget.length === 0 && nearBudget.length === 0) return null
            return (
              <div className="space-y-2">
                {overBudget.map(b => (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                    <span className="text-sm text-red-700 dark:text-red-300 font-medium">
                      {b.icon} <strong>{b.name}</strong> bütçesi aşıldı — harcanan: ${b.spent.toFixed(0)} / limit: ${b.budget}
                    </span>
                  </div>
                ))}
                {nearBudget.map(b => (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="text-sm text-amber-700 dark:text-amber-300">
                      {b.icon} <strong>{b.name}</strong> bütçesinin {b.percentage}% kullanıldı — ${Math.max(0, b.budget - b.spent).toFixed(0)} kaldı
                    </span>
                  </div>
                ))}
              </div>
            )
          })()}
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
        <Card className="shadow-card"><CardContent className="p-0"><div className="p-4 border-b"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={t('finance.searchTransactions')} className="pl-9 h-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div></div><div className="divide-y">{filteredTransactions.map((tx, idx) => (<div key={tx.id} className={cn('flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors', idx % 2 === 0 && 'row-even')}><div className="p-1.5 rounded-md" style={{ backgroundColor: (tx.categoryColor || '#888') + '15' }}><span className="text-base">{tx.categoryIcon || '💵'}</span></div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{tx.description}</p><p className="text-xs text-muted-foreground">{tx.categoryName || t('finance.uncategorized')} • {tx.date}</p></div><div className="flex items-center gap-2"><span className={cn('text-sm font-semibold shrink-0', tx.type === 'income' ? '' : 'text-red-500')} style={tx.type === 'income' ? { color: accentHex } : undefined}>{tx.type === 'income' ? <ArrowUpRight className="h-3 w-3 inline mr-0.5" /> : <ArrowDownRight className="h-3 w-3 inline mr-0.5" />}{tx.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount), accounts.find(a => a.id === tx.accountId)?.currency || baseCurrency)}</span><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 hover:text-destructive" onClick={() => deleteTransactionMutation.mutate(tx.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></div>))}</div></CardContent></Card>
      )}

      {financeView === 'analytics' && (
        <div className="space-y-4">
          {/* Income vs Expense grouped bar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('finance.monthlySpendingTrend')}</CardTitle>
              <CardDescription className="text-xs">Gelir (yeşil) vs Harcama (kırmızı)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 bg-gradient-to-b from-muted/20 to-transparent rounded-lg p-2">
                {monthlySpending.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlySpending}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                      <Bar dataKey="income" fill={accentHex} radius={[3, 3, 0, 0]} name="Gelir" />
                      <Bar dataKey="expense" fill="#ef4444" radius={[3, 3, 0, 0]} name="Harcama" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t('finance.noSpendingData')}</div>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Category pie chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">{t('finance.spendingByCategory')}</CardTitle></CardHeader>
              <CardContent>
                <div className="h-56">
                  {spendingByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={spendingByCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" paddingAngle={2}>
                          {spendingByCategory.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t('finance.noExpenseData')}</div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Kategori Dağılımı</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {spendingByCategory.slice(0, 6).map(cat => {
                    const total = spendingByCategory.reduce((a, b) => a + b.value, 0)
                    const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0
                    return (
                      <div key={cat.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{cat.name}</span>
                          <span className="text-muted-foreground">${cat.value.toFixed(0)} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

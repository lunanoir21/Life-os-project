'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from './client'

// ============================================
// Dashboard
// ============================================
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiGet<Record<string, unknown>>('/api/dashboard'),
  })
}

// ============================================
// Insights
// ============================================
export interface Insight {
  id: string
  category: 'productivity' | 'wellness' | 'finance' | 'goals'
  title: string
  description: string
  trend: 'up' | 'down' | 'stable'
  trendValue?: string
  module: string
}

export interface InsightsData {
  productivityScore: number
  wellnessScore: number
  productivityTrend: 'up' | 'down' | 'stable'
  wellnessTrend: 'up' | 'down' | 'stable'
  insights: Insight[]
  generatedAt: string
}

export function useInsights() {
  return useQuery({
    queryKey: ['insights'],
    queryFn: () => apiGet<InsightsData>('/api/insights'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ============================================
// Tasks
// ============================================
export function useTasks(filters?: { status?: string; priority?: string; projectId?: string }) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => apiGet<unknown[]>('/api/tasks', filters as Record<string, string>),
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost('/api/tasks', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiPatch(`/api/tasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

// ============================================
// Projects
// ============================================
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => apiGet<unknown[]>('/api/projects'),
  })
}

// ============================================
// Notes
// ============================================
export function useNotes(filters?: { folderId?: string; type?: string; search?: string }) {
  return useQuery({
    queryKey: ['notes', filters],
    queryFn: () => apiGet<unknown[]>('/api/notes', filters as Record<string, string>),
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost('/api/notes', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiPatch(`/api/notes/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}

// ============================================
// Note Folders
// ============================================
export function useNoteFolders() {
  return useQuery({
    queryKey: ['note-folders'],
    queryFn: () => apiGet<unknown[]>('/api/note-folders'),
  })
}

// ============================================
// Habits
// ============================================
export function useHabits() {
  return useQuery({
    queryKey: ['habits'],
    queryFn: () => apiGet<unknown[]>('/api/habits'),
  })
}

export function useCreateHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost('/api/habits', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

export function useUpdateHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiPatch(`/api/habits/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

export function useDeleteHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/habits/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

// ============================================
// Habit Logs
// ============================================
export function useHabitLogs(filters?: { date?: string; habitId?: string }) {
  return useQuery({
    queryKey: ['habit-logs', filters],
    queryFn: () => apiGet<unknown[]>('/api/habit-logs', filters as Record<string, string>),
  })
}

export function useLogHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { habitId: string; date: string; count?: number; note?: string }) =>
      apiPost('/api/habit-logs', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['habit-logs'] })
    },
  })
}

// ============================================
// Journal
// ============================================
export function useJournal(filters?: { mood?: string; isFavorite?: string }) {
  return useQuery({
    queryKey: ['journal', filters],
    queryFn: () => apiGet<{ entries: unknown[]; total: number }>('/api/journal', filters as Record<string, string>),
  })
}

export function useCreateJournalEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost('/api/journal', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal'] }),
  })
}

export function useUpdateJournalEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiPatch(`/api/journal/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal'] }),
  })
}

export function useDeleteJournalEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/journal/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal'] }),
  })
}

// ============================================
// Finance - Accounts
// ============================================
export function useFinanceAccounts() {
  return useQuery({
    queryKey: ['finance-accounts'],
    queryFn: () => apiGet<unknown[]>('/api/finance/accounts'),
  })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost('/api/finance/accounts', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-accounts'] }),
  })
}

export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiPatch(`/api/finance/accounts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-accounts'] }),
  })
}

// ============================================
// Finance - Transactions
// ============================================
export function useFinanceTransactions(filters?: { accountId?: string; categoryId?: string; type?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['finance-transactions', filters],
    queryFn: () => apiGet<{ transactions: unknown[]; total: number }>('/api/finance/transactions', filters as Record<string, string>),
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost('/api/finance/transactions', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-transactions'] })
      qc.invalidateQueries({ queryKey: ['finance-accounts'] })
    },
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/finance/transactions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-transactions'] }),
  })
}

// ============================================
// Finance - Categories
// ============================================
export function useFinanceCategories() {
  return useQuery({
    queryKey: ['finance-categories'],
    queryFn: () => apiGet<unknown[]>('/api/finance/categories'),
  })
}

// ============================================
// Finance - Budgets
// ============================================
export function useFinanceBudgets() {
  return useQuery({
    queryKey: ['finance-budgets'],
    queryFn: () => apiGet<unknown[]>('/api/finance/budgets'),
  })
}

export function useCreateBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost('/api/finance/budgets', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-budgets'] }),
  })
}

// ============================================
// Goals
// ============================================
export function useGoals(filters?: { category?: string; status?: string }) {
  return useQuery({
    queryKey: ['goals', filters],
    queryFn: () => apiGet<unknown[]>('/api/goals', filters as Record<string, string>),
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost('/api/goals', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiPatch(`/api/goals/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/goals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

// ============================================
// Courses (Learning)
// ============================================
export function useCourses(filters?: { status?: string; provider?: string }) {
  return useQuery({
    queryKey: ['courses', filters],
    queryFn: () => apiGet<unknown[]>('/api/courses', filters as Record<string, string>),
  })
}

export function useCreateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost('/api/courses', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })
}

export function useUpdateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiPatch(`/api/courses/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })
}

export function useDeleteCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/courses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })
}

// ============================================
// Time Entries
// ============================================
export function useTimeEntries(filters?: { taskId?: string; isRunning?: string }) {
  return useQuery({
    queryKey: ['time-entries', filters],
    queryFn: () => apiGet<unknown[]>('/api/time-entries', filters as Record<string, string>),
  })
}

export function useCreateTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost('/api/time-entries', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] }),
  })
}

export function useStopTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { id: string; endTime?: string; duration?: number }) =>
      apiPatch('/api/time-entries', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] }),
  })
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/time-entries/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] }),
  })
}

// ============================================
// Pomodoro Sessions
// ============================================
export function usePomodoroSessions(filters?: { type?: string; completed?: string; date?: string; taskId?: string }) {
  return useQuery({
    queryKey: ['pomodoro-sessions', filters],
    queryFn: () => apiGet<unknown[]>('/api/pomodoro-sessions', filters as Record<string, string>),
  })
}

export function useCreatePomodoroSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost('/api/pomodoro-sessions', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pomodoro-sessions'] }),
  })
}

export function useUpdatePomodoroSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiPatch(`/api/pomodoro-sessions/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pomodoro-sessions'] }),
  })
}

export function useDeletePomodoroSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/pomodoro-sessions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pomodoro-sessions'] }),
  })
}

// ============================================
// Weekly Review
// ============================================
export interface WeeklyReviewData {
  weekRange: { start: string; end: string }
  tasksCompleted: number
  tasksCreated: number
  taskCompletionRate: number
  topCompletedTasks: { id: string; title: string; priority: string }[]
  habitsCompleted: number
  habitCompletionRate: number
  longestHabitStreak: { name: string; streak: number }
  totalFocusTime: number
  pomodoroSessions: number
  moodTrend: 'improving' | 'stable' | 'declining'
  avgMoodScore: number
  avgEnergyScore: number
  avgSleepQuality: number
  totalCaloriesBurned: number
  financialSummary: {
    income: number
    expenses: number
    netSavings: number
    topExpenseCategory: string
  }
  goalsProgress: { id: string; title: string; progressChange: number }[]
  highlights: string[]
  weekScore: number
}

export function useWeeklyReview() {
  return useQuery({
    queryKey: ['weekly-review'],
    queryFn: () => apiGet<WeeklyReviewData>('/api/weekly-review'),
    staleTime: 5 * 60 * 1000,
  })
}

// ============================================
// Notifications
// ============================================
export interface NotificationItem {
  id: string
  type:
    | 'overdue-task' | 'task-due-today' | 'task-completed'
    | 'habit-reminder' | 'streak-milestone' | 'habit-missed'
    | 'goal-deadline' | 'goal-progress' | 'goal-completed'
    | 'budget-alert' | 'large-transaction'
    | 'writing-reminder' | 'mood-insight'
    | 'data-backup' | 'update-notification'
  title: string
  description: string
  module: string
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  read: boolean
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiGet<NotificationItem[]>('/api/notifications'),
    staleTime: 2 * 60 * 1000,
  })
}

// ============================================
// Activity Timeline
// ============================================
export interface ActivityItem {
  id: string
  type: 'task' | 'note' | 'journal' | 'habit' | 'transaction'
  title: string
  description: string
  timestamp: string
  module: string
}

export function useActivity() {
  return useQuery({
    queryKey: ['activity'],
    queryFn: () => apiGet<{ activities: ActivityItem[] }>('/api/activity'),
    staleTime: 30 * 1000, // 30 seconds
  })
}

// ============================================
// Global Search
// ============================================
export interface SearchResult {
  id: string
  type: string
  title: string
  description: string
  updatedAt: string
  module: string
  icon: string
  color: string
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => apiGet<{ results: SearchResult[]; query: string }>('/api/search', { q: query }),
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  })
}

// ============================================
// Calendar Events
// ============================================
export function useEvents(filters?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => apiGet<{ events: unknown[]; total: number }>('/api/events', filters as Record<string, string>),
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost('/api/events', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiPatch(`/api/events/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

// ============================================
// Profile
// ============================================
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => apiGet<{ name?: string; email?: string; avatar?: string }>('/api/profile'),
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPatch('/api/profile', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })
}

// ============================================
// Dashboard Widget Layout (DB persistence)
// ============================================

/** Load saved widget order from the database.
 *  Returns `{ widgets: string[] }` — empty array = no saved layout yet. */
export function useDashboardWidgets() {
  return useQuery({
    queryKey: ['dashboard-widgets'],
    queryFn: () => apiGet<{ widgets: string[] }>('/api/dashboard/widgets'),
    staleTime: Infinity, // layout rarely changes — no need to re-fetch
  })
}

/** Persist widget order to the database. */
export function useSaveDashboardWidgets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (widgets: string[]) =>
      apiPut('/api/dashboard/widgets', { widgets }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard-widgets'] }),
  })
}

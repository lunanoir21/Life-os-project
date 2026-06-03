'use client'

import { create } from 'zustand'

export interface Habit {
  id: string
  name: string
  description: string
  icon: string | null
  color: string
  frequency: 'daily' | 'weekly' | 'custom'
  targetCount: number
  unit: string | null
  tags: string[]
  logs: HabitLog[]
  streak: number
  completionRate: number
  createdAt: string
  updatedAt: string
}

export interface HabitLog {
  id: string
  habitId: string
  date: string
  count: number
  note: string | null
}

interface HabitState {
  habits: Habit[]
  selectedHabitId: string | null
  habitView: 'list' | 'calendar' | 'analytics'
  dateFilter: string // ISO date
  isLoading: boolean
  
  setHabits: (habits: Habit[]) => void
  addHabit: (habit: Habit) => void
  updateHabit: (id: string, updates: Partial<Habit>) => void
  deleteHabit: (id: string) => void
  logHabit: (habitId: string, date: string, count: number) => void
  
  setSelectedHabitId: (id: string | null) => void
  setHabitView: (view: HabitState['habitView']) => void
  setDateFilter: (date: string) => void
  setIsLoading: (loading: boolean) => void
}

export const useHabitStore = create<HabitState>()((set) => ({
  habits: [],
  selectedHabitId: null,
  habitView: 'list',
  dateFilter: new Date().toISOString().split('T')[0],
  isLoading: false,
  
  setHabits: (habits) => set({ habits }),
  addHabit: (habit) => set((state) => ({ habits: [...state.habits, habit] })),
  updateHabit: (id, updates) => set((state) => ({
    habits: state.habits.map((h) => h.id === id ? { ...h, ...updates } : h)
  })),
  deleteHabit: (id) => set((state) => ({
    habits: state.habits.filter((h) => h.id !== id)
  })),
  logHabit: (habitId, date, count) => set((state) => ({
    habits: state.habits.map((h) => {
      if (h.id !== habitId) return h
      const existingLog = h.logs.find(l => l.date === date)
      if (existingLog) {
        return { ...h, logs: h.logs.map(l => l.date === date ? { ...l, count } : l) }
      }
      return { ...h, logs: [...h.logs, { id: `log-${Date.now()}`, habitId, date, count, note: null }] }
    })
  })),
  
  setSelectedHabitId: (id) => set({ selectedHabitId: id }),
  setHabitView: (view) => set({ habitView: view }),
  setDateFilter: (date) => set({ dateFilter: date }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}))

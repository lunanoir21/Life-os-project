'use client'

import { create } from 'zustand'

export interface Goal {
  id: string
  title: string
  description: string
  category: 'personal' | 'career' | 'health' | 'financial' | 'education' | 'social'
  status: 'not-started' | 'in-progress' | 'completed' | 'abandoned'
  progress: number
  startDate: string | null
  targetDate: string | null
  completedAt: string | null
  parentGoalId: string | null
  tags: string[]
  milestones: Milestone[]
  createdAt: string
  updatedAt: string
}

export interface Milestone {
  id: string
  goalId: string
  title: string
  completed: boolean
  completedAt: string | null
  order: number
}

interface GoalState {
  goals: Goal[]
  selectedGoalId: string | null
  goalView: 'list' | 'tree' | 'timeline'
  categoryFilter: string | null
  isLoading: boolean
  
  setGoals: (goals: Goal[]) => void
  addGoal: (goal: Goal) => void
  updateGoal: (id: string, updates: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  
  setSelectedGoalId: (id: string | null) => void
  setGoalView: (view: GoalState['goalView']) => void
  setCategoryFilter: (category: string | null) => void
  setIsLoading: (loading: boolean) => void
}

export const useGoalStore = create<GoalState>()((set) => ({
  goals: [],
  selectedGoalId: null,
  goalView: 'list',
  categoryFilter: null,
  isLoading: false,
  
  setGoals: (goals) => set({ goals }),
  addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
  updateGoal: (id, updates) => set((state) => ({
    goals: state.goals.map((g) => g.id === id ? { ...g, ...updates } : g)
  })),
  deleteGoal: (id) => set((state) => ({
    goals: state.goals.filter((g) => g.id !== id)
  })),
  
  setSelectedGoalId: (id) => set({ selectedGoalId: id }),
  setGoalView: (view) => set({ goalView: view }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}))

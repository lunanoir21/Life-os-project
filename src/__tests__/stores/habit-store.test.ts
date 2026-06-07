import { describe, it, expect, beforeEach } from 'vitest'
import { useHabitStore } from '@/stores/habit-store'

describe('Habit Store', () => {
  beforeEach(() => {
    const store = useHabitStore.getState()
    store.setHabits([])
    store.setSelectedHabitId(null)
    store.setHabitView('list')
    store.setDateFilter(new Date().toISOString().split('T')[0])
    store.setIsLoading(false)
  })

  it('should have correct initial state', () => {
    const state = useHabitStore.getState()
    expect(state.habits).toEqual([])
    expect(state.selectedHabitId).toBeNull()
    expect(state.habitView).toBe('list')
    expect(state.isLoading).toBe(false)
  })

  it('should add a habit', () => {
    const { addHabit } = useHabitStore.getState()
    const habit = {
      id: 'h1',
      name: 'Exercise',
      description: 'Daily workout',
      icon: null,
      color: 'green',
      frequency: 'daily' as const,
      targetCount: 1,
      unit: 'times',
      tags: [],
      logs: [],
      streak: 0,
      completionRate: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addHabit(habit)
    expect(useHabitStore.getState().habits).toHaveLength(1)
    expect(useHabitStore.getState().habits[0]).toEqual(habit)
  })

  it('should log a habit', () => {
    const { addHabit, logHabit } = useHabitStore.getState()
    const habit = { id: 'h1', name: 'Exercise', logs: [] } as any
    addHabit(habit)
    
    const date = '2026-06-06'
    logHabit('h1', date, 1)
    
    expect(useHabitStore.getState().habits[0].logs).toHaveLength(1)
    expect(useHabitStore.getState().habits[0].logs[0].count).toBe(1)
    expect(useHabitStore.getState().habits[0].logs[0].date).toBe(date)
    
    // Update log
    logHabit('h1', date, 2)
    expect(useHabitStore.getState().habits[0].logs).toHaveLength(1)
    expect(useHabitStore.getState().habits[0].logs[0].count).toBe(2)
  })

  it('should update UI state', () => {
    const { setSelectedHabitId, setHabitView, setDateFilter, setIsLoading } = useHabitStore.getState()
    
    setSelectedHabitId('h1')
    expect(useHabitStore.getState().selectedHabitId).toBe('h1')
    
    setHabitView('calendar')
    expect(useHabitStore.getState().habitView).toBe('calendar')
    
    const date = '2026-01-01'
    setDateFilter(date)
    expect(useHabitStore.getState().dateFilter).toBe(date)
    
    setIsLoading(true)
    expect(useHabitStore.getState().isLoading).toBe(true)
  })
})

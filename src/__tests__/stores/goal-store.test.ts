import { describe, it, expect, beforeEach } from 'vitest'
import { useGoalStore } from '@/stores/goal-store'

describe('Goal Store', () => {
  beforeEach(() => {
    const store = useGoalStore.getState()
    store.setGoals([])
    store.setSelectedGoalId(null)
    store.setGoalView('list')
    store.setCategoryFilter(null)
    store.setIsLoading(false)
  })

  it('should have correct initial state', () => {
    const state = useGoalStore.getState()
    expect(state.goals).toEqual([])
    expect(state.selectedGoalId).toBeNull()
    expect(state.goalView).toBe('list')
    expect(state.categoryFilter).toBeNull()
    expect(state.isLoading).toBe(false)
  })

  it('should add a goal', () => {
    const { addGoal } = useGoalStore.getState()
    const goal = {
      id: 'g1',
      title: 'Test Goal',
      description: 'Test Desc',
      category: 'personal' as const,
      status: 'not-started' as const,
      progress: 0,
      startDate: null,
      targetDate: null,
      completedAt: null,
      parentGoalId: null,
      tags: [],
      milestones: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addGoal(goal)
    expect(useGoalStore.getState().goals).toHaveLength(1)
    expect(useGoalStore.getState().goals[0]).toEqual(goal)
  })

  it('should update a goal', () => {
    const { addGoal, updateGoal } = useGoalStore.getState()
    const goal = { id: 'g1', title: 'Test Goal' } as any
    addGoal(goal)
    updateGoal('g1', { progress: 50 })
    expect(useGoalStore.getState().goals[0].progress).toBe(50)
  })

  it('should update UI state', () => {
    const { setSelectedGoalId, setGoalView, setCategoryFilter, setIsLoading } = useGoalStore.getState()
    
    setSelectedGoalId('g1')
    expect(useGoalStore.getState().selectedGoalId).toBe('g1')
    
    setGoalView('tree')
    expect(useGoalStore.getState().goalView).toBe('tree')
    
    setCategoryFilter('career')
    expect(useGoalStore.getState().categoryFilter).toBe('career')
    
    setIsLoading(true)
    expect(useGoalStore.getState().isLoading).toBe(true)
  })
})

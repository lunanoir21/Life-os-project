import { describe, it, expect, beforeEach } from 'vitest'
import { useTaskStore } from '@/stores/task-store'

describe('Task Store', () => {
  beforeEach(() => {
    const store = useTaskStore.getState()
    store.setTasks([])
    store.setProjects([])
    store.setSelectedProjectId(null)
    store.setTaskFilter('all')
    store.setTaskView('list')
    store.setIsLoading(false)
  })

  it('should have correct initial state', () => {
    const state = useTaskStore.getState()
    expect(state.tasks).toEqual([])
    expect(state.projects).toEqual([])
    expect(state.selectedProjectId).toBeNull()
    expect(state.taskFilter).toBe('all')
    expect(state.taskView).toBe('list')
    expect(state.isLoading).toBe(false)
  })

  it('should add a task', () => {
    const { addTask } = useTaskStore.getState()
    const task = {
      id: '1',
      title: 'Test Task',
      description: 'Test Description',
      status: 'todo' as const,
      priority: 'medium' as const,
      dueDate: null,
      startDate: null,
      completedAt: null,
      estimatedMinutes: null,
      actualMinutes: null,
      projectId: null,
      parentTaskId: null,
      recurrence: 'none' as const,
      recurrenceConfig: null,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addTask(task)
    expect(useTaskStore.getState().tasks).toHaveLength(1)
    expect(useTaskStore.getState().tasks[0]).toEqual(task)
  })

  it('should update a task', () => {
    const { addTask, updateTask } = useTaskStore.getState()
    const task = {
      id: '1',
      title: 'Test Task',
      status: 'todo' as const,
      // ... rest
    } as any
    addTask(task)
    updateTask('1', { title: 'Updated Task' })
    expect(useTaskStore.getState().tasks[0].title).toBe('Updated Task')
  })

  it('should delete a task', () => {
    const { addTask, deleteTask } = useTaskStore.getState()
    const task = { id: '1', title: 'Test Task' } as any
    addTask(task)
    deleteTask('1')
    expect(useTaskStore.getState().tasks).toHaveLength(0)
  })

  it('should add a project', () => {
    const { addProject } = useTaskStore.getState()
    const project = {
      id: 'p1',
      name: 'Test Project',
      description: 'Desc',
      color: 'blue',
      icon: null,
      status: 'active' as const,
      startDate: null,
      endDate: null,
      taskCount: 0,
      completedCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addProject(project)
    expect(useTaskStore.getState().projects).toHaveLength(1)
    expect(useTaskStore.getState().projects[0]).toEqual(project)
  })

  it('should update UI state', () => {
    const { setSelectedProjectId, setTaskFilter, setTaskView, setIsLoading } = useTaskStore.getState()
    
    setSelectedProjectId('p1')
    expect(useTaskStore.getState().selectedProjectId).toBe('p1')
    
    setTaskFilter('done')
    expect(useTaskStore.getState().taskFilter).toBe('done')
    
    setTaskView('board')
    expect(useTaskStore.getState().taskView).toBe('board')
    
    setIsLoading(true)
    expect(useTaskStore.getState().isLoading).toBe(true)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { useLearningStore } from '@/stores/learning-store'

describe('Learning Store', () => {
  beforeEach(() => {
    const store = useLearningStore.getState()
    store.setCourses([])
    store.setSelectedCourseId(null)
    store.setLearningView('grid')
    store.setStatusFilter(null)
    store.setIsLoading(false)
  })

  it('should add a course', () => {
    const { addCourse } = useLearningStore.getState()
    const course = {
      id: 'c1',
      title: 'Rust Programming',
      description: 'Learn Rust',
      provider: 'Udemy',
      url: null,
      status: 'in-progress' as const,
      progress: 10,
      startDate: null,
      endDate: null,
      rating: null,
      notes: null,
      resources: [],
      createdAt: new Date().toISOString(),
    }
    addCourse(course)
    expect(useLearningStore.getState().courses).toHaveLength(1)
    expect(useLearningStore.getState().courses[0]).toEqual(course)
  })

  it('should update and delete courses', () => {
    const { addCourse, updateCourse, deleteCourse } = useLearningStore.getState()
    const course = { id: 'c1', title: 'Rust' } as any
    addCourse(course)
    
    updateCourse('c1', { progress: 50 })
    expect(useLearningStore.getState().courses[0].progress).toBe(50)
    
    deleteCourse('c1')
    expect(useLearningStore.getState().courses).toHaveLength(0)
  })

  it('should update UI state', () => {
    const { setSelectedCourseId, setLearningView, setStatusFilter, setIsLoading } = useLearningStore.getState()
    
    setSelectedCourseId('c1')
    expect(useLearningStore.getState().selectedCourseId).toBe('c1')
    
    setLearningView('list')
    expect(useLearningStore.getState().learningView).toBe('list')
    
    setStatusFilter('completed')
    expect(useLearningStore.getState().statusFilter).toBe('completed')
    
    setIsLoading(true)
    expect(useLearningStore.getState().isLoading).toBe(true)
  })
})

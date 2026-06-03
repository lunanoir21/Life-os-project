'use client'

import { create } from 'zustand'

export interface Course {
  id: string
  title: string
  description: string
  provider: string | null
  url: string | null
  status: 'not-started' | 'in-progress' | 'completed' | 'paused'
  progress: number
  startDate: string | null
  endDate: string | null
  rating: number | null
  notes: string | null
  resources: CourseResource[]
  createdAt: string
}

export interface CourseResource {
  id: string
  title: string
  type: 'video' | 'article' | 'book' | 'podcast' | 'exercise'
  url: string | null
  completed: boolean
  notes: string | null
  order: number
}

interface LearningState {
  courses: Course[]
  selectedCourseId: string | null
  learningView: 'grid' | 'list' | 'progress'
  statusFilter: string | null
  isLoading: boolean
  
  setCourses: (courses: Course[]) => void
  addCourse: (course: Course) => void
  updateCourse: (id: string, updates: Partial<Course>) => void
  deleteCourse: (id: string) => void
  
  setSelectedCourseId: (id: string | null) => void
  setLearningView: (view: LearningState['learningView']) => void
  setStatusFilter: (status: string | null) => void
  setIsLoading: (loading: boolean) => void
}

export const useLearningStore = create<LearningState>()((set) => ({
  courses: [],
  selectedCourseId: null,
  learningView: 'grid',
  statusFilter: null,
  isLoading: false,
  
  setCourses: (courses) => set({ courses }),
  addCourse: (course) => set((state) => ({ courses: [...state.courses, course] })),
  updateCourse: (id, updates) => set((state) => ({
    courses: state.courses.map((c) => c.id === id ? { ...c, ...updates } : c)
  })),
  deleteCourse: (id) => set((state) => ({
    courses: state.courses.filter((c) => c.id !== id)
  })),
  
  setSelectedCourseId: (id) => set({ selectedCourseId: id }),
  setLearningView: (view) => set({ learningView: view }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}))

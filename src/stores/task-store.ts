'use client'

import { create } from 'zustand'

export interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in-progress' | 'done' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate: string | null
  startDate: string | null
  completedAt: string | null
  estimatedMinutes: number | null
  actualMinutes: number | null
  projectId: string | null
  parentTaskId: string | null
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | null
  recurrenceConfig: string | null
  subtasks?: Task[]
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description: string
  color: string
  icon: string | null
  status: 'active' | 'on-hold' | 'completed' | 'cancelled'
  startDate: string | null
  endDate: string | null
  taskCount: number
  completedCount: number
  createdAt: string
  updatedAt: string
}

interface TaskState {
  tasks: Task[]
  projects: Project[]
  selectedProjectId: string | null
  taskFilter: 'all' | 'todo' | 'in-progress' | 'done' | 'cancelled'
  taskView: 'list' | 'board' | 'calendar'
  isLoading: boolean
  
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  
  setSelectedProjectId: (id: string | null) => void
  setTaskFilter: (filter: TaskState['taskFilter']) => void
  setTaskView: (view: TaskState['taskView']) => void
  setIsLoading: (loading: boolean) => void
}

export const useTaskStore = create<TaskState>()((set) => ({
  tasks: [],
  projects: [],
  selectedProjectId: null,
  taskFilter: 'all',
  taskView: 'list',
  isLoading: false,
  
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((t) => t.id === id ? { ...t, ...updates } : t)
  })),
  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id)
  })),
  
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (id, updates) => set((state) => ({
    projects: state.projects.map((p) => p.id === id ? { ...p, ...updates } : p)
  })),
  deleteProject: (id) => set((state) => ({
    projects: state.projects.filter((p) => p.id !== id)
  })),
  
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  setTaskFilter: (filter) => set({ taskFilter: filter }),
  setTaskView: (view) => set({ taskView: view }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}))

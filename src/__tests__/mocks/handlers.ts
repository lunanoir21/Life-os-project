import { http, HttpResponse } from 'msw'

const API_URL = 'http://localhost:8080/api'

// Mock data
const mockTasks = [
  {
    id: 'task-1',
    title: 'Test Task 1',
    description: 'Test description',
    status: 'todo',
    priority: 'high',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'task-2',
    title: 'Test Task 2',
    status: 'in-progress',
    priority: 'medium',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]

const mockHabits = [
  {
    id: 'habit-1',
    name: 'Drink Water',
    description: 'Drink 8 glasses of water',
    color: 'blue',
    frequency: 'daily',
    targetCount: 8,
    unit: 'glasses',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]

const mockProjects = [
  {
    id: 'project-1',
    name: 'Test Project',
    description: 'A test project',
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]

const mockNotes = [
  {
    id: 'note-1',
    title: 'Test Note',
    content: 'Test content',
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]

const mockFinanceAccounts = [
  {
    id: 'account-1',
    name: 'Checking Account',
    type: 'checking',
    balance: 1000.0,
    currency: 'USD',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]

const mockTransactions = [
  {
    id: 'transaction-1',
    accountId: 'account-1',
    type: 'expense',
    amount: 50.0,
    description: 'Groceries',
    date: new Date().toISOString(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]

const mockDashboardData = {
  stats: {
    tasks: { total: 10, completed: 5, pending: 5 },
    habits: { streak: 7, completed: 15 },
    projects: { active: 3, completed: 2 },
  },
  upcomingTasks: mockTasks.slice(0, 3),
  recentActivity: [],
}

export const handlers = [
  // Tasks
  http.get(`${API_URL}/tasks`, () => {
    return HttpResponse.json(mockTasks)
  }),

  http.get(`${API_URL}/tasks/:id`, ({ params }) => {
    const task = mockTasks.find((t) => t.id === params.id)
    if (!task) {
      return HttpResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    return HttpResponse.json(task)
  }),

  http.post(`${API_URL}/tasks`, async ({ request }) => {
    const body = await request.json() as any
    const newTask = {
      id: `task-${Date.now()}`,
      ...body,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    return HttpResponse.json(newTask, { status: 201 })
  }),

  http.patch(`${API_URL}/tasks/:id`, async ({ params, request }) => {
    const body = await request.json() as any
    const task = mockTasks.find((t) => t.id === params.id)
    if (!task) {
      return HttpResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    const updatedTask = { ...task, ...body, updatedAt: Date.now() }
    return HttpResponse.json(updatedTask)
  }),

  http.delete(`${API_URL}/tasks/:id`, ({ params }) => {
    const task = mockTasks.find((t) => t.id === params.id)
    if (!task) {
      return HttpResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    return HttpResponse.json({ success: true })
  }),

  // Habits
  http.get(`${API_URL}/habits`, () => {
    return HttpResponse.json(mockHabits)
  }),

  http.post(`${API_URL}/habits`, async ({ request }) => {
    const body = await request.json() as any
    const newHabit = {
      id: `habit-${Date.now()}`,
      ...body,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    return HttpResponse.json(newHabit, { status: 201 })
  }),

  // Projects
  http.get(`${API_URL}/projects`, () => {
    return HttpResponse.json(mockProjects)
  }),

  http.post(`${API_URL}/projects`, async ({ request }) => {
    const body = await request.json() as any
    const newProject = {
      id: `project-${Date.now()}`,
      ...body,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    return HttpResponse.json(newProject, { status: 201 })
  }),

  // Notes
  http.get(`${API_URL}/notes`, () => {
    return HttpResponse.json(mockNotes)
  }),

  http.post(`${API_URL}/notes`, async ({ request }) => {
    const body = await request.json() as any
    const newNote = {
      id: `note-${Date.now()}`,
      ...body,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    return HttpResponse.json(newNote, { status: 201 })
  }),

  // Finance
  http.get(`${API_URL}/finance/accounts`, () => {
    return HttpResponse.json(mockFinanceAccounts)
  }),

  http.get(`${API_URL}/finance/transactions`, () => {
    return HttpResponse.json(mockTransactions)
  }),

  http.post(`${API_URL}/finance/accounts`, async ({ request }) => {
    const body = await request.json() as any
    const newAccount = {
      id: `account-${Date.now()}`,
      ...body,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    return HttpResponse.json(newAccount, { status: 201 })
  }),

  http.post(`${API_URL}/finance/transactions`, async ({ request }) => {
    const body = await request.json() as any
    const newTransaction = {
      id: `transaction-${Date.now()}`,
      ...body,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    return HttpResponse.json(newTransaction, { status: 201 })
  }),

  // Dashboard
  http.get(`${API_URL}/dashboard`, () => {
    return HttpResponse.json(mockDashboardData)
  }),

  // Profile
  http.get(`${API_URL}/profile`, () => {
    return HttpResponse.json({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      timezone: 'UTC',
    })
  }),
]

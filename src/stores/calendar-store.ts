'use client'

import { create } from 'zustand'

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  allDay: boolean
  color: string
  location: string | null
  recurrence: string | null
  taskId: string | null
  createdAt: string
}

export interface TimeEntry {
  id: string
  description: string
  startTime: string
  endTime: string | null
  duration: number | null
  taskId: string | null
  billable: boolean
  createdAt: string
}

interface CalendarState {
  events: CalendarEvent[]
  timeEntries: TimeEntry[]
  selectedDate: string
  calendarView: 'month' | 'week' | 'day' | 'agenda'
  isLoading: boolean
  
  setEvents: (events: CalendarEvent[]) => void
  addEvent: (event: CalendarEvent) => void
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void
  deleteEvent: (id: string) => void
  
  setTimeEntries: (entries: TimeEntry[]) => void
  addTimeEntry: (entry: TimeEntry) => void
  stopTimeEntry: (id: string, endTime: string, duration: number) => void
  
  setSelectedDate: (date: string) => void
  setCalendarView: (view: CalendarState['calendarView']) => void
  setIsLoading: (loading: boolean) => void
}

export const useCalendarStore = create<CalendarState>()((set) => ({
  events: [],
  timeEntries: [],
  selectedDate: new Date().toISOString().split('T')[0],
  calendarView: 'month',
  isLoading: false,
  
  setEvents: (events) => set({ events }),
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  updateEvent: (id, updates) => set((state) => ({
    events: state.events.map((e) => e.id === id ? { ...e, ...updates } : e)
  })),
  deleteEvent: (id) => set((state) => ({
    events: state.events.filter((e) => e.id !== id)
  })),
  
  setTimeEntries: (entries) => set({ timeEntries: entries }),
  addTimeEntry: (entry) => set((state) => ({ timeEntries: [...state.timeEntries, entry] })),
  stopTimeEntry: (id, endTime, duration) => set((state) => ({
    timeEntries: state.timeEntries.map((e) => e.id === id ? { ...e, endTime, duration } : e)
  })),
  
  setSelectedDate: (date) => set({ selectedDate: date }),
  setCalendarView: (view) => set({ calendarView: view }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}))

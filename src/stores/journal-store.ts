'use client'

import { create } from 'zustand'

export interface JournalEntry {
  id: string
  title: string | null
  content: string
  mood: 'amazing' | 'good' | 'okay' | 'bad' | 'terrible' | null
  moodScore: number | null
  energy: number | null
  stress: number | null
  tags: string[]
  isFavorite: boolean
  date: string
  createdAt: string
  updatedAt: string
}

interface JournalState {
  entries: JournalEntry[]
  selectedEntryId: string | null
  journalView: 'timeline' | 'calendar' | 'list'
  searchQuery: string
  isLoading: boolean
  
  setEntries: (entries: JournalEntry[]) => void
  addEntry: (entry: JournalEntry) => void
  updateEntry: (id: string, updates: Partial<JournalEntry>) => void
  deleteEntry: (id: string) => void
  
  setSelectedEntryId: (id: string | null) => void
  setJournalView: (view: JournalState['journalView']) => void
  setSearchQuery: (query: string) => void
  setIsLoading: (loading: boolean) => void
}

export const useJournalStore = create<JournalState>()((set) => ({
  entries: [],
  selectedEntryId: null,
  journalView: 'timeline',
  searchQuery: '',
  isLoading: false,
  
  setEntries: (entries) => set({ entries }),
  addEntry: (entry) => set((state) => ({ entries: [entry, ...state.entries] })),
  updateEntry: (id, updates) => set((state) => ({
    entries: state.entries.map((e) => e.id === id ? { ...e, ...updates } : e)
  })),
  deleteEntry: (id) => set((state) => ({
    entries: state.entries.filter((e) => e.id !== id),
    selectedEntryId: state.selectedEntryId === id ? null : state.selectedEntryId
  })),
  
  setSelectedEntryId: (id) => set({ selectedEntryId: id }),
  setJournalView: (view) => set({ journalView: view }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}))

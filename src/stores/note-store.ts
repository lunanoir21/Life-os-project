'use client'

import { create } from 'zustand'

export interface Note {
  id: string
  title: string
  content: string
  type: 'note' | 'article' | 'reference' | 'idea' | 'daily-note'
  icon: string | null
  color: string | null
  isPinned: boolean
  isFavorite: boolean
  wordCount: number
  folderId: string | null
  tags: string[]
  links: string[]
  backlinks: string[]
  createdAt: string
  updatedAt: string
}

export interface NoteFolder {
  id: string
  name: string
  icon: string | null
  color: string | null
  parentId: string | null
  order: number
  children: NoteFolder[]
  noteCount: number
}

interface NoteState {
  notes: Note[]
  folders: NoteFolder[]
  selectedNoteId: string | null
  selectedFolderId: string | null
  searchQuery: string
  noteView: 'grid' | 'list'
  editorMode: 'edit' | 'preview' | 'split'
  isLoading: boolean
  
  setNotes: (notes: Note[]) => void
  addNote: (note: Note) => void
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => void
  
  setFolders: (folders: NoteFolder[]) => void
  addFolder: (folder: NoteFolder) => void
  updateFolder: (id: string, updates: Partial<NoteFolder>) => void
  deleteFolder: (id: string) => void
  
  setSelectedNoteId: (id: string | null) => void
  setSelectedFolderId: (id: string | null) => void
  setSearchQuery: (query: string) => void
  setNoteView: (view: NoteState['noteView']) => void
  setEditorMode: (mode: NoteState['editorMode']) => void
  setIsLoading: (loading: boolean) => void
}

export const useNoteStore = create<NoteState>()((set) => ({
  notes: [],
  folders: [],
  selectedNoteId: null,
  selectedFolderId: null,
  searchQuery: '',
  noteView: 'grid',
  editorMode: 'edit',
  isLoading: false,
  
  setNotes: (notes) => set({ notes }),
  addNote: (note) => set((state) => ({ notes: [...state.notes, note] })),
  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map((n) => n.id === id ? { ...n, ...updates } : n)
  })),
  deleteNote: (id) => set((state) => ({
    notes: state.notes.filter((n) => n.id !== id),
    selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId
  })),
  
  setFolders: (folders) => set({ folders }),
  addFolder: (folder) => set((state) => ({ folders: [...state.folders, folder] })),
  updateFolder: (id, updates) => set((state) => ({
    folders: state.folders.map((f) => f.id === id ? { ...f, ...updates } : f)
  })),
  deleteFolder: (id) => set((state) => ({
    folders: state.folders.filter((f) => f.id !== id)
  })),
  
  setSelectedNoteId: (id) => set({ selectedNoteId: id }),
  setSelectedFolderId: (id) => set({ selectedFolderId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setNoteView: (view) => set({ noteView: view }),
  setEditorMode: (mode) => set({ editorMode: mode }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}))

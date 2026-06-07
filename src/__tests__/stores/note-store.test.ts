import { describe, it, expect, beforeEach } from 'vitest'
import { useNoteStore } from '@/stores/note-store'

describe('Note Store', () => {
  beforeEach(() => {
    const store = useNoteStore.getState()
    store.setNotes([])
    store.setFolders([])
    store.setSelectedNoteId(null)
    store.setSelectedFolderId(null)
    store.setSearchQuery('')
    store.setNoteView('grid')
    store.setEditorMode('edit')
    store.setIsLoading(false)
  })

  it('should have correct initial state', () => {
    const state = useNoteStore.getState()
    expect(state.notes).toEqual([])
    expect(state.folders).toEqual([])
    expect(state.selectedNoteId).toBeNull()
    expect(state.selectedFolderId).toBeNull()
    expect(state.searchQuery).toBe('')
    expect(state.noteView).toBe('grid')
    expect(state.editorMode).toBe('edit')
    expect(state.isLoading).toBe(false)
  })

  it('should add a note', () => {
    const { addNote } = useNoteStore.getState()
    const note = {
      id: 'n1',
      title: 'Test Note',
      content: 'Content',
      type: 'note' as const,
      icon: null,
      color: null,
      isPinned: false,
      isFavorite: false,
      wordCount: 0,
      folderId: null,
      tags: [],
      links: [],
      backlinks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addNote(note)
    expect(useNoteStore.getState().notes).toHaveLength(1)
    expect(useNoteStore.getState().notes[0]).toEqual(note)
  })

  it('should update a note', () => {
    const { addNote, updateNote } = useNoteStore.getState()
    const note = { id: 'n1', title: 'Test Note' } as any
    addNote(note)
    updateNote('n1', { title: 'Updated Note' })
    expect(useNoteStore.getState().notes[0].title).toBe('Updated Note')
  })

  it('should delete a note and reset selectedNoteId if it matches', () => {
    const { addNote, deleteNote, setSelectedNoteId } = useNoteStore.getState()
    const note = { id: 'n1', title: 'Test Note' } as any
    addNote(note)
    setSelectedNoteId('n1')
    deleteNote('n1')
    expect(useNoteStore.getState().notes).toHaveLength(0)
    expect(useNoteStore.getState().selectedNoteId).toBeNull()
  })

  it('should add a folder', () => {
    const { addFolder } = useNoteStore.getState()
    const folder = {
      id: 'f1',
      name: 'Test Folder',
      icon: null,
      color: null,
      parentId: null,
      order: 0,
      children: [],
      noteCount: 0,
    }
    addFolder(folder)
    expect(useNoteStore.getState().folders).toHaveLength(1)
    expect(useNoteStore.getState().folders[0]).toEqual(folder)
  })

  it('should update UI state', () => {
    const { setSelectedFolderId, setSearchQuery, setNoteView, setEditorMode, setIsLoading } = useNoteStore.getState()
    
    setSelectedFolderId('f1')
    expect(useNoteStore.getState().selectedFolderId).toBe('f1')
    
    setSearchQuery('search term')
    expect(useNoteStore.getState().searchQuery).toBe('search term')
    
    setNoteView('list')
    expect(useNoteStore.getState().noteView).toBe('list')
    
    setEditorMode('preview')
    expect(useNoteStore.getState().editorMode).toBe('preview')
    
    setIsLoading(true)
    expect(useNoteStore.getState().isLoading).toBe(true)
  })
})

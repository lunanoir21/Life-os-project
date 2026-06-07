import { describe, it, expect, beforeEach } from 'vitest'
import { useJournalStore } from '@/stores/journal-store'

describe('Journal Store', () => {
  beforeEach(() => {
    const store = useJournalStore.getState()
    store.setEntries([])
    store.setSelectedEntryId(null)
    store.setJournalView('timeline')
    store.setSearchQuery('')
    store.setIsLoading(false)
  })

  it('should add an entry', () => {
    const { addEntry } = useJournalStore.getState()
    const entry = {
      id: 'j1',
      title: 'Today',
      content: 'A good day',
      mood: 'amazing' as const,
      moodScore: 5,
      energy: 5,
      stress: 1,
      tags: [],
      isFavorite: false,
      date: '2026-06-06',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addEntry(entry)
    expect(useJournalStore.getState().entries).toHaveLength(1)
    expect(useJournalStore.getState().entries[0]).toEqual(entry)
  })

  it('should update and delete entries', () => {
    const { addEntry, updateEntry, deleteEntry, setSelectedEntryId } = useJournalStore.getState()
    const entry = { id: 'j1', content: 'Old content' } as any
    addEntry(entry)
    setSelectedEntryId('j1')
    
    updateEntry('j1', { content: 'New content' })
    expect(useJournalStore.getState().entries[0].content).toBe('New content')
    
    deleteEntry('j1')
    expect(useJournalStore.getState().entries).toHaveLength(0)
    expect(useJournalStore.getState().selectedEntryId).toBeNull()
  })

  it('should update UI state', () => {
    const { setJournalView, setSearchQuery, setIsLoading } = useJournalStore.getState()
    
    setJournalView('calendar')
    expect(useJournalStore.getState().journalView).toBe('calendar')
    
    setSearchQuery('test')
    expect(useJournalStore.getState().searchQuery).toBe('test')
    
    setIsLoading(true)
    expect(useJournalStore.getState().isLoading).toBe(true)
  })
})

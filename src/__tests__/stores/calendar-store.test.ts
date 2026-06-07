import { describe, it, expect, beforeEach } from 'vitest'
import { useCalendarStore } from '@/stores/calendar-store'

describe('Calendar Store', () => {
  beforeEach(() => {
    const store = useCalendarStore.getState()
    store.setEvents([])
    store.setTimeEntries([])
    store.setSelectedDate(new Date().toISOString().split('T')[0])
    store.setCalendarView('month')
    store.setIsLoading(false)
  })

  it('should add an event', () => {
    const { addEvent } = useCalendarStore.getState()
    const event = {
      id: 'e1',
      title: 'Meeting',
      description: 'Work meeting',
      startDate: new Date().toISOString(),
      endDate: null,
      allDay: false,
      color: 'red',
      location: null,
      taskId: null,
      createdAt: new Date().toISOString(),
    }
    addEvent(event)
    expect(useCalendarStore.getState().events).toHaveLength(1)
    expect(useCalendarStore.getState().events[0]).toEqual(event)
  })

  it('should add and stop time entries', () => {
    const { addTimeEntry, stopTimeEntry } = useCalendarStore.getState()
    const entry = { id: 't1', description: 'Coding', startTime: new Date().toISOString() } as any
    addTimeEntry(entry)
    
    const endTime = new Date().toISOString()
    stopTimeEntry('t1', endTime, 60)
    expect(useCalendarStore.getState().timeEntries[0].endTime).toBe(endTime)
    expect(useCalendarStore.getState().timeEntries[0].duration).toBe(60)
  })

  it('should update UI state', () => {
    const { setSelectedDate, setCalendarView, setIsLoading } = useCalendarStore.getState()
    
    setSelectedDate('2026-06-06')
    expect(useCalendarStore.getState().selectedDate).toBe('2026-06-06')
    
    setCalendarView('week')
    expect(useCalendarStore.getState().calendarView).toBe('week')
    
    setIsLoading(true)
    expect(useCalendarStore.getState().isLoading).toBe(true)
  })
})

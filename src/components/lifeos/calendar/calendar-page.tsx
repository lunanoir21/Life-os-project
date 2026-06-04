'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays, Clock, MapPin, Trash2, CalendarCheck, Timer, ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import type { CalendarEvent } from '@/stores/calendar-store'
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from '@/lib/api/hooks'
import { useAppStore } from '@/stores/app-store'
import { showToast } from '@/lib/toast'
import { useTranslation } from '@/lib/i18n'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, isSameMonth, isSameDay, isToday } from 'date-fns'

const eventColors = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

function cn(...inputs: (string | undefined | false)[]) {
  return inputs.filter(Boolean).join(' ')
}

function mapApiEvent(apiEvent: Record<string, unknown>): CalendarEvent {
  return {
    id: apiEvent.id as string,
    title: apiEvent.title as string,
    description: (apiEvent.description as string) || null,
    startDate: apiEvent.startDate as string,
    endDate: (apiEvent.endDate as string) || null,
    allDay: (apiEvent.allDay as boolean) || false,
    color: (apiEvent.color as string) || '#6b7280',
    location: (apiEvent.location as string) || null,
    taskId: (apiEvent.taskId as string) || null,
    createdAt: new Date(apiEvent.createdAt as string).toISOString(),
  }
}

// Event Pill with left border color
function EventPill({ event, compact = false }: { event: CalendarEvent; compact?: boolean }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const startTime = event.allDay ? '' : format(new Date(event.startDate), 'H:mm')

  const pill = (
    <div
      className={cn(
        'text-[10px] leading-tight px-1.5 py-0.5 rounded truncate transition-all duration-200 cursor-pointer hover:opacity-80',
        compact ? 'border-l-2' : 'border-l-[3px]'
      )}
      style={{
        borderLeftColor: event.color,
        backgroundColor: event.color + '18',
        color: event.color,
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {startTime && <span className="font-medium">{startTime} </span>}
      {event.title}
    </div>
  )

  if (showTooltip && event.description) {
    return (
      <Tooltip open={showTooltip}>
        <TooltipTrigger asChild>{pill}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-xs">
          <p className="font-medium">{event.title}</p>
          {startTime && <p className="text-muted-foreground mt-0.5">{startTime}{event.endDate && ` - ${format(new Date(event.endDate), 'H:mm')}`}</p>}
          {event.description && <p className="text-muted-foreground mt-1 line-clamp-3">{event.description}</p>}
        </TooltipContent>
      </Tooltip>
    )
  }

  return pill
}

export function CalendarPage() {
  const { accentColor } = useAppStore()
  const { t } = useTranslation()
  const accentHexMap: Record<string, string> = {
    emerald: '#10b981', teal: '#14b8a6', amber: '#f59e0b',
    rose: '#f43f5e', violet: '#8b5cf6', cyan: '#06b6d4',
    indigo: '#6366f1', pink: '#ec4899', lime: '#84cc16', sky: '#0ea5e9',
  }
  const accentHex = accentHexMap[accentColor] || '#10b981'
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Fetch events for a wide date range
  const startDate = useMemo(() => {
    const d = new Date(currentDate)
    d.setMonth(d.getMonth() - 2)
    return d.toISOString().split('T')[0]
  }, [currentDate])

  const endDate = useMemo(() => {
    const d = new Date(currentDate)
    d.setMonth(d.getMonth() + 2)
    return d.toISOString().split('T')[0]
  }, [currentDate])

  const { data: apiEvents, isLoading } = useEvents({ startDate, endDate })
  const createEventMutation = useCreateEvent()
  const updateEventMutation = useUpdateEvent()
  const deleteEventMutation = useDeleteEvent()

  const events: CalendarEvent[] = useMemo(() => {
    if (!apiEvents) return []
    return ((apiEvents as { events: unknown[]; total: number }).events as Record<string, unknown>[]).map(mapApiEvent)
  }, [apiEvents])

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<{ id: string; title: string; description: string; color: string; location: string } | null>(null)
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00', endTime: '10:00', allDay: false, color: '#10b981', location: '',
  })

  const navigateBack = () => {
    if (calendarView === 'month') setCurrentDate(prev => subMonths(prev, 1))
    else if (calendarView === 'week') setCurrentDate(prev => subWeeks(prev, 1))
    else setCurrentDate(prev => subDays(prev, 1))
  }

  const navigateForward = () => {
    if (calendarView === 'month') setCurrentDate(prev => addMonths(prev, 1))
    else if (calendarView === 'week') setCurrentDate(prev => addWeeks(prev, 1))
    else setCurrentDate(prev => addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  const handleAddEvent = useCallback(() => {
    if (!newEvent.title.trim()) return
    const startDateTime = newEvent.allDay ? newEvent.date : `${newEvent.date}T${newEvent.startTime}:00`
    const endDateTime = newEvent.allDay ? null : `${newEvent.date}T${newEvent.endTime}:00`
    createEventMutation.mutate({
      title: newEvent.title,
      description: newEvent.description || null,
      startDate: startDateTime,
      endDate: endDateTime,
      allDay: newEvent.allDay,
      color: newEvent.color,
      location: newEvent.location || null,
    }, {
      onSuccess: () => {
        setNewEvent({ title: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), startTime: '09:00', endTime: '10:00', allDay: false, color: '#10b981', location: '' })
        setCreateDialogOpen(false)
        showToast.success(t('toast.created'))
      }
    })
  }, [newEvent, createEventMutation, t])

  const openEditEvent = useCallback((event: CalendarEvent) => {
    setEditEvent({ id: event.id, title: event.title, description: event.description || '', color: event.color, location: event.location || '' })
    setEditDialogOpen(true)
  }, [])

  const handleUpdateEvent = useCallback(() => {
    if (!editEvent || !editEvent.title.trim()) return
    updateEventMutation.mutate({
      id: editEvent.id,
      title: editEvent.title,
      description: editEvent.description || null,
      color: editEvent.color,
      location: editEvent.location || null,
    }, {
      onSuccess: () => {
        setEditDialogOpen(false)
        setEditEvent(null)
        showToast.success(t('toast.saved'))
      }
    })
  }, [editEvent, updateEventMutation, t])

  const deleteEvent = useCallback((id: string) => {
    deleteEventMutation.mutate(id)
    showToast.info(t('toast.deleted'))
  }, [deleteEventMutation, t])

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return events.filter(e => e.startDate.slice(0, 10) === dateStr)
  }

  // Calendar mini stats
  const calendarStats = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const monthEvents = events.filter(e => {
      const eventDate = new Date(e.startDate)
      return eventDate >= monthStart && eventDate <= monthEnd
    })
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const todayEvents = events.filter(e => e.startDate.slice(0, 10) === todayStr)
    const now = new Date()
    const upcomingEvents = events
      .filter(e => new Date(e.startDate) > now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    const nextEvent = upcomingEvents[0] || null
    return { monthCount: monthEvents.length, todayCount: todayEvents.length, nextEvent }
  }, [events, currentDate])

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    return (
      <div className="rounded-xl border border-border/30 overflow-hidden">
        <div className="grid grid-cols-7">
          {[t('days.sun'), t('days.mon'), t('days.tue'), t('days.wed'), t('days.thu'), t('days.fri'), t('days.sat')].map(d => (
            <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground border-b border-border/30 bg-muted/30">
              {d}
            </div>
          ))}
          {isLoading ? (
            Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="min-h-[80px] md:min-h-[100px] p-1.5 border-b border-r border-border/30">
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
            ))
          ) : days.map(day => {
            const dayEvents = getEventsForDate(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isCurrentDay = isToday(day)
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'min-h-[80px] md:min-h-[100px] p-1.5 border-b border-r border-border/30 cursor-pointer hover:bg-accent/20 transition-colors',
                  !isCurrentMonth && 'opacity-40'
                )}
                onClick={() => { setCurrentDate(day); setCalendarView('day') }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    'text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors',
                    isCurrentDay && 'text-white shadow-sm animate-pulse-border'
                  )} style={isCurrentDay ? { background: `linear-gradient(to bottom right, ${accentHex}, ${accentHex}cc)`, boxShadow: `0 1px 3px ${accentHex}40` } : undefined}>
                    {format(day, 'd')}
                  </span>
                  {/* Event color dots */}
                  {dayEvents.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: event.color }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(event => (
                    <EventPill key={event.id} event={event} compact />
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} {t('calendar.more')}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate)
    const weekEnd = endOfWeek(currentDate)
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const hours = Array.from({ length: 13 }, (_, i) => i + 7)

    return (
      <div className="overflow-auto rounded-xl border border-border/30">
        <div className="grid grid-cols-8 min-w-[700px]">
          <div className="p-2 border-b border-r border-border/30 bg-muted/30" />
          {days.map(day => {
            const isCurrentDay = isToday(day)
            return (
              <div key={day.toISOString()} className={cn(
                'p-2 text-center border-b border-r border-border/30 transition-colors',
              )} style={isCurrentDay ? { backgroundColor: `${accentHex}15` } : undefined}>
                <p className="text-[10px] text-muted-foreground">{format(day, 'EEE')}</p>
                <p className={cn(
                  'text-sm font-semibold',
                  isCurrentDay && 'inline-flex items-center justify-center w-7 h-7 rounded-full text-white'
                )} style={isCurrentDay ? { background: `linear-gradient(to bottom right, ${accentHex}, ${accentHex}cc)` } : undefined}>
                  {format(day, 'd')}
                </p>
              </div>
            )
          })}
          {hours.map(hour => (
            <div key={hour} className="contents">
              <div className="p-1 text-[10px] text-muted-foreground text-right border-r border-border/30 pr-2">
                {hour > 12 ? hour - 12 : hour}{hour >= 12 ? 'PM' : 'AM'}
              </div>
              {days.map(day => {
                const dayEvents = getEventsForDate(day).filter(e => {
                  if (e.allDay) return false
                  const eventHour = new Date(e.startDate).getHours()
                  return eventHour === hour
                })
                return (
                  <div key={`${day.toISOString()}-${hour}`} className="min-h-[40px] border-b border-r border-border/20 p-0.5">
                    {dayEvents.map(event => (
                      <EventPill key={event.id} event={event} />
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate)
    const allDayEvents = dayEvents.filter(e => e.allDay)
    const timedEvents = dayEvents.filter(e => !e.allDay).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    const hours = Array.from({ length: 15 }, (_, i) => i + 6)

    return (
      <div className="space-y-4">
        {allDayEvents.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t('calendar.allDay')}</p>
            {allDayEvents.map(event => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 p-2.5 rounded-lg border-l-[3px]"
                style={{ borderLeftColor: event.color, backgroundColor: event.color + '15' }}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: event.color }} />
                <span className="text-sm font-medium" style={{ color: event.color }}>{event.title}</span>
                {event.location && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{event.location}
                  </span>
                )}
                <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto hover:text-destructive" onClick={() => deleteEvent(event.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
        <div className="space-y-0">
          {hours.map(hour => {
            const hourEvents = timedEvents.filter(e => new Date(e.startDate).getHours() === hour)
            return (
              <div key={hour} className="flex min-h-[48px] border-b border-border/20">
                <div className="w-16 shrink-0 py-1 text-right pr-3 text-xs text-muted-foreground border-r border-border/10">
                  {hour > 12 ? hour - 12 : hour}{hour >= 12 ? 'PM' : 'AM'}
                </div>
                <div className="flex-1 py-0.5 space-y-1">
                  {hourEvents.map(event => (
                    <div
                      key={event.id}
                      className="flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm hover-lift border-l-[3px]"
                      style={{ borderLeftColor: event.color, backgroundColor: event.color + '15' }}
                      onClick={() => openEditEvent(event)}
                    >
                      <div className="w-1 h-full min-h-[20px] rounded-full" style={{ backgroundColor: event.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: event.color }}>{event.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(event.startDate), 'h:mm a')}
                          {event.endDate && ` - ${format(new Date(event.endDate), 'h:mm a')}`}
                        </p>
                      </div>
                      {event.location && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />{event.location}
                        </span>
                      )}
                      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 hover:text-destructive" onClick={() => deleteEvent(event.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const headerLabel = calendarView === 'month'
    ? format(currentDate, 'MMMM yyyy')
    : calendarView === 'week'
    ? `${t('calendar.weekOf')} ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`
    : format(currentDate, 'EEEE, MMMM d, yyyy')

  return (
    <TooltipProvider delayDuration={300}>
      {/* Edit Event Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{t('edit')} {t('calendar.title')}</DialogTitle><DialogDescription className="sr-only">Edit event</DialogDescription></DialogHeader>
          {editEvent && (
            <div className="space-y-4 py-2">
              <div><label className="text-sm font-medium mb-1.5 block">{t('calendar.titleField')}</label><Input value={editEvent.title} onChange={e => setEditEvent(p => p && ({ ...p, title: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">{t('calendar.description')}</label><Input placeholder={t('calendar.optionalDescription')} value={editEvent.description} onChange={e => setEditEvent(p => p && ({ ...p, description: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">{t('calendar.location')}</label><Input placeholder={t('calendar.optional')} value={editEvent.location} onChange={e => setEditEvent(p => p && ({ ...p, location: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">{t('calendar.color')}</label><div className="flex gap-1.5 mt-1 flex-wrap">{eventColors.map(c => (<button key={c} className={cn('w-6 h-6 rounded-full transition-all', editEvent.color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105')} style={{ backgroundColor: c }} onClick={() => setEditEvent(p => p && ({ ...p, color: c }))} />))}</div></div>
            </div>
          )}
          <DialogFooter><DialogClose asChild><Button variant="outline">{t('cancel')}</Button></DialogClose><Button onClick={handleUpdateEvent} disabled={updateEventMutation.isPending}>{t('save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="p-[var(--lifeos-card-padding)] max-w-6xl mx-auto space-y-[var(--lifeos-section-gap)] animate-page-enter">
        {/* Mini Stats Row */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs font-medium">
            <CalendarCheck className="h-3.5 w-3.5" style={{ color: accentHex }} />
            {calendarStats.monthCount} {t('calendar.eventsThisMonth')}
          </Badge>
          <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs font-medium">
            <Timer className="h-3.5 w-3.5 text-amber-500" />
            {calendarStats.todayCount} {t('calendar.todayCount')}
          </Badge>
          {calendarStats.nextEvent && (
            <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs font-medium max-w-[280px]">
              <ArrowRight className="h-3.5 w-3.5 text-violet-500 shrink-0" />
              <span className="truncate">{calendarStats.nextEvent.title}</span>
              <span className="text-muted-foreground shrink-0">
                {calendarStats.nextEvent.allDay
                  ? t('calendar.allDay')
                  : format(new Date(calendarStats.nextEvent.startDate), 'h:mm a')}
              </span>
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigateBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigateForward}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold min-w-[200px]">{headerLabel}</h2>
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">W{format(currentDate, 'w')}</span>
            <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={goToToday}>{t('calendar.today')}</Button>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={calendarView} onValueChange={v => setCalendarView(v as typeof calendarView)}>
              <TabsList className="h-8">
                <TabsTrigger value="month" className="text-xs px-3 h-6">{t('calendar.month')}</TabsTrigger>
                <TabsTrigger value="week" className="text-xs px-3 h-6">{t('calendar.week')}</TabsTrigger>
                <TabsTrigger value="day" className="text-xs px-3 h-6">{t('calendar.day')}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />{t('calendar.newEvent')}
                </Button>
              </DialogTrigger>
              <DialogContent aria-describedby={undefined}>
                <DialogHeader><DialogTitle>{t('calendar.newEvent')}</DialogTitle><DialogDescription className="sr-only">{t('calendar.createEventSrOnly')}</DialogDescription></DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{t('calendar.titleField')}</label>
                    <Input placeholder={t('calendar.eventTitlePlaceholder')} value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{t('calendar.description')}</label>
                    <Input placeholder={t('calendar.optionalDescription')} value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('calendar.date')}</label>
                      <Input type="date" value={newEvent.date} onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('calendar.location')}</label>
                      <Input placeholder={t('calendar.optional')} value={newEvent.location} onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('calendar.start')}</label>
                      <Input type="time" value={newEvent.startTime} onChange={e => setNewEvent(p => ({ ...p, startTime: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('calendar.end')}</label>
                      <Input type="time" value={newEvent.endTime} onChange={e => setNewEvent(p => ({ ...p, endTime: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('calendar.color')}</label>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {eventColors.map(c => (
                          <button
                            key={c}
                            className={cn('w-6 h-6 rounded-full transition-all duration-200', newEvent.color === c ? 'ring-2 ring-offset-2 ring-primary scale-110 shadow-sm' : 'hover:scale-105')}
                            style={{ backgroundColor: c }}
                            onClick={() => setNewEvent(p => ({ ...p, color: c }))}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">{t('cancel')}</Button></DialogClose>
                  <Button onClick={handleAddEvent} disabled={createEventMutation.isPending}>{t('create')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={calendarView + format(currentDate, 'yyyy-MM-dd')}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {calendarView === 'month' && renderMonthView()}
            {calendarView === 'week' && renderWeekView()}
            {calendarView === 'day' && renderDayView()}
          </motion.div>
        </AnimatePresence>
      </div>
    </TooltipProvider>
  )
}

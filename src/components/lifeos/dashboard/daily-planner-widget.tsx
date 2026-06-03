'use client'

import { useState, useMemo } from 'react'
import { CalendarCheck, Clock, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app-store'
import { useTasks, useEvents } from '@/lib/api/hooks'
import { format, addDays } from 'date-fns'

const timeSlots = [
  { label: 'Morning', hours: '6:00 - 9:00', emoji: '🌅' },
  { label: 'Mid-Morning', hours: '9:00 - 12:00', emoji: '☀️' },
  { label: 'Afternoon', hours: '12:00 - 15:00', emoji: '🌤️' },
  { label: 'Late Afternoon', hours: '15:00 - 18:00', emoji: '🌇' },
  { label: 'Evening', hours: '18:00 - 21:00', emoji: '🌙' },
]

export function DailyPlannerWidget() {
  const { accentColor, setActiveModule } = useAppStore()
  const accentColorMap: Record<string, string> = {
    emerald: '#10b981', teal: '#14b8a6', amber: '#f59e0b',
    rose: '#f43f5e', violet: '#8b5cf6', cyan: '#06b6d4',
  }
  const accentHex = accentColorMap[accentColor] || '#10b981'
  const [isCollapsed, setIsCollapsed] = useState(false)

  const { data: tasks } = useTasks()
  const { data: apiEvents } = useEvents({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
  })

  const todayTasks = useMemo(() => {
    if (!tasks) return []
    return (tasks as Record<string, unknown>[])
      .filter(t => (t.status as string) !== 'done')
      .slice(0, 4)
  }, [tasks])

  const todayEvents = useMemo(() => {
    if (!apiEvents) return []
    const evts = (apiEvents as { events: unknown[] }).events as Record<string, unknown>[]
    return evts.slice(0, 3)
  }, [apiEvents])

  const getSlotContent = (slotIndex: number) => {
    // Map tasks to morning/afternoon slots
    if (slotIndex < 2 && todayTasks.length > slotIndex) {
      const task = todayTasks[slotIndex]
      return (
        <div className="flex items-center gap-2 p-1.5 rounded-md bg-accent/30 text-xs">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accentHex }} />
          <span className="truncate">{task.title as string}</span>
        </div>
      )
    }
    if (slotIndex >= 2 && todayEvents.length > slotIndex - 2) {
      const event = todayEvents[slotIndex - 2]
      return (
        <div className="flex items-center gap-2 p-1.5 rounded-md bg-accent/30 text-xs">
          <Clock className="h-3 w-3 shrink-0 text-muted-foreground/50" />
          <span className="truncate">{event.title as string}</span>
        </div>
      )
    }
    return <div className="h-6 rounded-md border border-dashed border-border/50" />
  }

  return (
    <Card className="rounded-xl shadow-sm overflow-hidden">
      <div className="h-1" style={{ background: `linear-gradient(to right, ${accentHex}66, ${accentHex})` }} />
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" style={{ color: accentHex }} />
            <CardTitle className="text-sm font-semibold">Today&apos;s Plan</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setIsCollapsed(!isCollapsed)}>
              {isCollapsed ? 'Expand' : 'Collapse'}
            </Button>
          </div>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="pt-0 px-5 pb-4">
          <div className="space-y-2">
            {timeSlots.map((slot, i) => (
              <div key={slot.label} className="flex items-start gap-2.5">
                <div className="w-16 shrink-0 text-right">
                  <span className="text-[10px]">{slot.emoji}</span>
                  <p className="text-[10px] font-medium text-muted-foreground">{slot.label}</p>
                  <p className="text-[9px] text-muted-foreground/50">{slot.hours}</p>
                </div>
                <div className="flex-1 min-w-0">
                  {getSlotContent(i)}
                </div>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs h-7"
            onClick={() => setActiveModule('calendar')}
          >
            <Plus className="h-3 w-3 mr-1" /> Add event
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

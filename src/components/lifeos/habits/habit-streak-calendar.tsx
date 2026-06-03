'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Flame } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns'

interface HabitStreakCalendarProps {
  habitLogs: Array<{ date: string; count?: number }>
  streak: number
}

export function HabitStreakCalendar({ habitLogs, streak }: HabitStreakCalendarProps) {
  const { accentColor } = useAppStore()
  const accentColorMap: Record<string, string> = {
    emerald: '#10b981', teal: '#14b8a6', amber: '#f59e0b',
    rose: '#f43f5e', violet: '#8b5cf6', cyan: '#06b6d4',
  }
  const accentHex = accentColorMap[accentColor] || '#10b981'

  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDay = getDay(monthStart) // 0=Sun

  // Create a set of logged dates for quick lookup
  const logDates = useMemo(() => {
    const dates = new Set<string>()
    habitLogs.forEach(log => {
      const d = log.date?.split('T')[0]
      if (d) dates.add(d)
    })
    return dates
  }, [habitLogs])

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  return (
    <Card className="rounded-xl shadow-sm overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4" style={{ color: accentHex }} />
            Streak Calendar
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold" style={{ color: accentHex }}>{streak}</span>
            <span className="text-[10px] text-muted-foreground">days</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">{format(today, 'MMMM yyyy')}</p>
      </CardHeader>
      <CardContent className="pt-1 px-4 pb-4">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-[9px] font-medium text-muted-foreground/60">{day}</div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for offset */}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {/* Day cells */}
          {daysInMonth.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const isLogged = logDates.has(dateStr)
            const isToday = dateStr === format(today, 'yyyy-MM-dd')
            const isFuture = day > today

            return (
              <div
                key={dateStr}
                className={`
                  aspect-square rounded-md flex items-center justify-center text-[10px] transition-all duration-200 relative
                  ${isToday ? 'font-bold' : ''}
                  ${isFuture ? 'text-muted-foreground/20' : 'text-muted-foreground/70'}
                `}
                style={isLogged ? {
                  backgroundColor: `${accentHex}30`,
                  color: accentHex,
                } : isToday ? {
                  border: `1.5px solid ${accentHex}`,
                } : undefined}
              >
                {format(day, 'd')}
                {isLogged && (
                  <div
                    className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: accentHex }}
                  />
                )}
              </div>
            )
          })}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/30">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: `${accentHex}30` }} />
            <span className="text-[9px] text-muted-foreground">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm border" style={{ borderColor: accentHex }} />
            <span className="text-[9px] text-muted-foreground">Today</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

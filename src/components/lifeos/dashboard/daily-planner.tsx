'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import {
  CheckSquare,
  Repeat,
  CalendarDays,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Sun,
  CloudSun,
  Moon,
  Clock,
  Flame,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/stores/app-store'
import { useTasks, useHabits, useEvents } from '@/lib/api/hooks'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

function cn(...inputs: (string | undefined | false)[]) {
  return inputs.filter(Boolean).join(' ')
}

// Circular Day Progress ring
function DayProgressRing({ value, size = 100, strokeWidth = 6 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-muted/15"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#dayGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="dayGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold">{value}%</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Day</span>
      </div>
    </div>
  )
}

interface PlannerSection {
  id: string
  title: string
  icon: React.ElementType
  timeRange: string
  gradient: string
  bgAccent: string
  borderAccent: string
  items: Array<{
    id: string
    title: string
    subtitle?: string
    badge?: string
    badgeColor?: string
    completed?: boolean
    priority?: string
    module: string
  }>
}

export function DailyPlanner() {
  const { setActiveModule } = useAppStore()
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const { data: tasks } = useTasks()
  const { data: habits } = useHabits()
  const { data: apiEvents } = useEvents({
    startDate: today,
    endDate: today,
  })

  // Calculate day progress (6am to midnight)
  const dayProgress = useMemo(() => {
    const now = new Date()
    const startOfDay = new Date(now)
    startOfDay.setHours(6, 0, 0, 0)
    const endOfDay = new Date(now)
    endOfDay.setHours(24, 0, 0, 0)
    const total = endOfDay.getTime() - startOfDay.getTime()
    const elapsed = now.getTime() - startOfDay.getTime()
    return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)))
  }, [])

  // Filter tasks due today
  const todayTasks = useMemo(() => {
    if (!tasks) return []
    const allTasks = tasks as Record<string, unknown>[]
    return allTasks
      .filter((t) => {
        const dueDate = t.dueDate as string | null
        if (!dueDate) return false
        return dueDate.startsWith(today)
      })
      .map((t) => ({
        id: t.id as string,
        title: t.title as string,
        priority: (t.priority as string) || 'medium',
        status: (t.status as string) || 'todo',
        completed: (t.status as string) === 'done',
        module: 'tasks',
      }))
  }, [tasks, today])

  // Filter events for today
  const todayEvents = useMemo(() => {
    if (!apiEvents) return []
    const evts = (apiEvents as { events: unknown[]; total: number }).events as Record<string, unknown>[]
    return evts.map((e) => ({
      id: e.id as string,
      title: e.title as string,
      startDate: e.startDate as string,
      allDay: (e.allDay as boolean) || false,
      color: (e.color as string) || '#10b981',
      module: 'calendar',
    }))
  }, [apiEvents])

  // Habits with completion status
  const habitItems = useMemo(() => {
    if (!habits) return []
    const allHabits = habits as Record<string, unknown>[]
    return allHabits
      .filter((h) => !(h.archived as boolean))
      .map((h) => {
        const logs = (h.logs as Record<string, unknown>[]) || []
        const completedToday = logs.some((l: Record<string, unknown>) => {
          const logDate = l.date as string
          if (!logDate) return false
          return logDate.startsWith(today)
        })
        return {
          id: h.id as string,
          name: h.name as string,
          icon: (h.icon as string) || '✅',
          completed: completedToday,
          streak: logs.length,
          module: 'habits',
        }
      })
  }, [habits, today])

  // Get current time period
  const currentHour = new Date().getHours()
  const currentPeriod = currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening'

  // Build sections
  const sections: PlannerSection[] = useMemo(() => [
    {
      id: 'morning',
      title: 'Morning',
      icon: Sun,
      timeRange: '6:00 – 12:00',
      gradient: 'from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-yellow-950/20',
      bgAccent: 'bg-amber-100 dark:bg-amber-900/30',
      borderAccent: 'border-amber-200 dark:border-amber-800',
      items: todayTasks.map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: t.completed ? 'Completed' : `Priority: ${t.priority}`,
        badge: t.priority,
        badgeColor:
          t.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
          t.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
          t.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        completed: t.completed,
        priority: t.priority,
        module: 'tasks',
      })),
    },
    {
      id: 'afternoon',
      title: 'Afternoon',
      icon: CloudSun,
      timeRange: '12:00 – 18:00',
      gradient: 'from-sky-50 via-cyan-50 to-teal-50 dark:from-sky-950/20 dark:via-cyan-950/20 dark:to-teal-950/20',
      bgAccent: 'bg-sky-100 dark:bg-sky-900/30',
      borderAccent: 'border-sky-200 dark:border-sky-800',
      items: todayEvents.map((e) => ({
        id: e.id,
        title: e.title,
        subtitle: e.allDay ? 'All day' : format(new Date(e.startDate), 'h:mm a'),
        badge: 'Event',
        badgeColor: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
        module: 'calendar',
      })),
    },
    {
      id: 'evening',
      title: 'Evening',
      icon: Moon,
      timeRange: '18:00 – 24:00',
      gradient: 'from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950/20 dark:via-purple-950/20 dark:to-fuchsia-950/20',
      bgAccent: 'bg-violet-100 dark:bg-violet-900/30',
      borderAccent: 'border-violet-200 dark:border-violet-800',
      items: [
        ...habitItems.map((h) => ({
          id: h.id,
          title: `${h.icon} ${h.name}`,
          subtitle: h.completed ? 'Done ✓' : (h.streak > 0 ? `${h.streak} day streak` : 'Not yet completed'),
          badge: h.completed ? 'Done' : 'Pending',
          badgeColor: h.completed
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
          completed: h.completed,
          module: 'habits',
        })),
        {
          id: 'journal-prompt',
          title: '📝 Journal Reflection',
          subtitle: 'Write about your day',
          badge: 'Journal',
          badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
          module: 'journal',
        },
      ],
    },
  ], [todayTasks, todayEvents, habitItems])

  // Toggle section collapse
  const toggleSection = (id: string) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Summary stats
  const tasksCompleted = todayTasks.filter(t => t.completed).length
  const totalTasks = todayTasks.length
  const habitsCompleted = habitItems.filter(h => h.completed).length
  const totalHabits = habitItems.length
  const totalEvents = todayEvents.length

  const overallCompletion = useMemo(() => {
    const total = totalTasks + totalHabits
    if (total === 0) return 0
    const completed = tasksCompleted + habitsCompleted
    return Math.round((completed / total) * 100)
  }, [tasksCompleted, totalTasks, habitsCompleted, totalHabits])

  return (
    <Card className="col-span-full overflow-hidden micro-hover gradient-border-subtle">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-violet-500 text-white">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Daily Planner</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(), 'EEEE, MMMM d')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Mini stats */}
            <div className="hidden sm:flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <CheckSquare className="h-3 w-3" />
                {tasksCompleted}/{totalTasks}
              </span>
              <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                <Repeat className="h-3 w-3" />
                {habitsCompleted}/{totalHabits}
              </span>
              <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                <CalendarDays className="h-3 w-3" />
                {totalEvents}
              </span>
            </div>
            <DayProgressRing value={dayProgress} size={56} strokeWidth={4} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {sections.map((section, sectionIdx) => {
            const SectionIcon = section.icon
            const isCollapsed = collapsedSections[section.id]
            const isActive = currentPeriod === section.id

            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: sectionIdx * 0.1 }}
                className={cn(
                  'rounded-xl border p-3 transition-all duration-300',
                  section.gradient,
                  section.borderAccent,
                  isActive && 'ring-2 ring-primary/30 shadow-md'
                )}
              >
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex items-center justify-between w-full text-left group"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn('p-1.5 rounded-lg', section.bgAccent)}>
                      <SectionIcon className={cn('h-4 w-4', section.id === 'morning' ? 'text-amber-600 dark:text-amber-400' : section.id === 'afternoon' ? 'text-sky-600 dark:text-sky-400' : 'text-violet-600 dark:text-violet-400')} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{section.title}</span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{section.timeRange}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {section.items.length}
                    </Badge>
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                    )}
                  </div>
                </button>

                {/* Section items */}
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2.5 space-y-1.5">
                        {section.items.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground">
                            <p className="text-xs">Nothing scheduled</p>
                          </div>
                        ) : (
                          section.items.map((item, idx) => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.15, delay: idx * 0.03 }}
                              className={cn(
                                'flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-background/60 transition-colors cursor-pointer group',
                                item.completed && 'opacity-60'
                              )}
                              onClick={() => setActiveModule(item.module as 'tasks' | 'habits' | 'calendar' | 'journal')}
                            >
                              {item.completed !== undefined && (
                                <div className={cn(
                                  'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                                  item.completed
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'border-muted-foreground/30'
                                )}>
                                  {item.completed && (
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  'text-xs font-medium truncate',
                                  item.completed && 'line-through text-muted-foreground'
                                )}>
                                  {item.title}
                                </p>
                                {item.subtitle && (
                                  <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>
                                )}
                              </div>
                              {item.badge && (
                                <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0', item.badgeColor)}>
                                  {item.badge}
                                </span>
                              )}
                            </motion.div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

        {/* Progress bar at bottom */}
        {overallCompletion > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 pt-3 border-t border-border/30"
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground font-medium">Today&apos;s Completion</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{overallCompletion}%</span>
            </div>
            <Progress value={overallCompletion} className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:via-emerald-500 [&>div]:to-violet-500" />
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}

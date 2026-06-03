'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  CheckSquare,
  StickyNote,
  Repeat,
  Wallet,
  Plus,
  Target,
  Timer,
  BookOpen,
  BarChart3,
  Clock,
  Calendar,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  CloudSun,
  Settings2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { useAppStore } from '@/stores/app-store'
import { useTranslation } from '@/lib/i18n'
import { useDashboard, useTasks, useEvents } from '@/lib/api/hooks'
import { JournalPrompts } from '@/components/lifeos/dashboard/journal-prompts'
import { WeeklyReview } from '@/components/lifeos/dashboard/weekly-review'
import { QuickCapture } from '@/components/lifeos/dashboard/quick-capture'
import { DailyPlannerWidget } from '@/components/lifeos/dashboard/daily-planner-widget'
import { OnboardingTips } from '@/components/lifeos/onboarding-tips'
import { AIInsights } from '@/components/lifeos/dashboard/ai-insights'
import { format, subDays, addDays } from 'date-fns'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function cn(...inputs: (string | undefined | false)[]) {
  return inputs.filter(Boolean).join(' ')
}

const accentColorHexMap: Record<string, string> = {
  emerald: '#10b981',
  teal: '#14b8a6',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
  indigo: '#6366f1',
  pink: '#ec4899',
  lime: '#84cc16',
  sky: '#0ea5e9',
}

const accentColorLightHexMap: Record<string, string> = {
  emerald: '#34d399',
  teal: '#2dd4bf',
  amber: '#fbbf24',
  rose: '#fb7185',
  violet: '#a78bfa',
  cyan: '#22d3ee',
  indigo: '#818cf8',
  pink: '#f472b6',
  lime: '#a3e635',
  sky: '#38bdf8',
}

// Circular progress ring component - enlarged and animated
function ProgressRing({ value, size = 120, strokeWidth = 8, color = 'var(--accent-primary)' }: { value: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-muted/20"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  )
}

export function DashboardPage() {
  const { setActiveModule, setCommandPaletteOpen, language, accentColor, dashboardWidgets, setDashboardWidgets } = useAppStore()
  const { t, tArray } = useTranslation()
  const ringColor = accentColorHexMap[accentColor] || '#10b981'
  const ringColorLight = accentColorLightHexMap[accentColor] || '#34d399'
  const [weeklyReviewOpen, setWeeklyReviewOpen] = useState(false)
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [moodFeedback, setMoodFeedback] = useState(false)
  const [userName, setUserName] = useState<string>('')

  // Translated quick actions
  const quickActions = useMemo(() => [
    { label: t('dashboard.newTask'), icon: CheckSquare, module: 'tasks' as const },
    { label: t('dashboard.newNote'), icon: StickyNote, module: 'notes' as const },
    { label: t('dashboard.journal'), icon: BookOpen, module: 'journal' as const },
    { label: t('dashboard.focusTimer'), icon: Timer, module: 'time' as const },
  ], [t])

  // Translated widget list for customize popover
  const widgetList = useMemo(() => [
    { id: 'day-progress', label: t('dashboard.widgetDayProgressBar') },
    { id: 'stats-cards', label: t('dashboard.widgetStatsCards') },
    { id: 'today-tasks', label: t('dashboard.widgetTodayTasks') },
    { id: 'weekly-activity', label: t('dashboard.widgetWeeklyActivity') },
    { id: 'quick-capture', label: t('dashboard.widgetQuickCapture') },
    { id: 'progress-ring', label: t('dashboard.widgetProgressRing') },
    { id: 'upcoming-events', label: t('dashboard.widgetUpcomingEvents') },
    { id: 'mood-logger', label: t('dashboard.widgetMoodLogger') },
    { id: 'journal-prompts', label: t('dashboard.widgetJournalPrompts') },
    { id: 'onboarding-tips', label: t('dashboard.widgetOnboardingTips') },
    { id: 'ai-insights', label: t('dashboard.widgetAiInsights') },
    { id: 'daily-planner', label: t('dashboard.widgetDailyPlanner') },
  ], [t])

  // Fetch profile for greeting personalization
  useEffect(() => {
    fetch('/api/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.name) setUserName(data.name)
      })
      .catch(() => {})
  }, [])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return t('dashboard.goodMorning')
    if (hour < 17) return t('dashboard.goodAfternoon')
    return t('dashboard.goodEvening')
  }, [t])

  const subtitle = useMemo(() => {
    const hour = new Date().getHours()
    const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
    const options = tArray('dashboard.' + period + 'Subtitles')
    return options[Math.floor(Math.random() * options.length)]
  }, [tArray])

  const today = useMemo(() => format(new Date(), 'EEEE, MMMM d, yyyy'), [])

  // Live clock
  const [liveTime, setLiveTime] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch real data from API
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard()
  const { data: tasks, isLoading: tasksLoading } = useTasks()
  const { data: apiEvents } = useEvents({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
  })

  // Extract dashboard stats with fallbacks
  const taskStats = (dashboard?.tasks as Record<string, unknown>) || { byStatus: {}, total: 0 }
  const habitStats = (dashboard?.habits as Record<string, unknown>) || { total: 0, completedToday: 0, completionRate: 0 }
  const financeStats = (dashboard?.finance as Record<string, unknown>) || { totalBalance: 0, monthlyIncome: 0, monthlyExpenses: 0 }
  const recentNotes = (dashboard?.recentNotes as unknown[]) || []
  const habitActivity = (habitStats.recentActivity as unknown[]) || []

  const tasksByStatus = (taskStats.byStatus as Record<string, number>) || { todo: 0, 'in-progress': 0, done: 0 }
  const totalTasks = (taskStats.total as number) || 0
  const pendingTasks = (tasksByStatus.todo || 0) + (tasksByStatus['in-progress'] || 0)
  const habitCompletion = (habitStats.completionRate as number) || 0
  const completedHabitsToday = (habitStats.completedToday as number) || 0
  const totalHabits = (habitStats.total as number) || 0
  const totalBalance = (financeStats.totalBalance as number) || 0
  const monthlyIncome = (financeStats.monthlyIncome as number) || 0
  const monthlyExpenses = (financeStats.monthlyExpenses as number) || 0

  // Tasks for the "Today's Tasks" card
  const recentTasks = useMemo(() => {
    if (!tasks) return []
    const allTasks = tasks as Record<string, unknown>[]
    return allTasks
      .filter((task) => (task.status as string) !== 'done')
      .slice(0, 5)
  }, [tasks])

  // Upcoming events
  const upcomingEvents = useMemo(() => {
    if (!apiEvents) return []
    const evts = (apiEvents as { events: unknown[]; total: number }).events as Record<string, unknown>[]
    return evts.slice(0, 3).map(e => ({
      id: e.id as string,
      title: e.title as string,
      startDate: e.startDate as string,
      color: (e.color as string) || '#10b981',
      allDay: (e.allDay as boolean) || false,
    }))
  }, [apiEvents])

  // Weekly activity chart data
  const weeklyActivityData = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dayTasks = Math.max(0, Math.floor(Math.random() * 5) + (i === 0 ? pendingTasks : 2))
      const dayHabits = Math.max(0, Math.floor(Math.random() * 4) + (i === 0 ? completedHabitsToday : 1))
      days.push({
        day: format(date, 'EEE'),
        tasks: dayTasks,
        habits: dayHabits,
      })
    }
    return days
  }, [pendingTasks, completedHabitsToday])

  // Progress calculation for the ring
  const taskProgress = totalTasks > 0 ? Math.round(((tasksByStatus.done || 0) / totalTasks) * 100) : 0
  const habitProgress = totalHabits > 0 ? Math.round((completedHabitsToday / totalHabits) * 100) : 0
  const overallProgress = Math.round((taskProgress + habitProgress) / 2)

  const isLoading = dashboardLoading || tasksLoading

  const formatEventTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return format(d, 'h:mm a')
  }

  const formatEventDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return format(d, 'MMM d')
  }

  // Day progress calculation
  const dayProgressPercent = Math.min(100, Math.max(0, ((new Date().getHours() * 60 + new Date().getMinutes() - 360) / 1080) * 100))

  // Mood logger handler
  const handleMoodClick = useCallback((label: string) => {
    setSelectedMood(label)
    setMoodFeedback(true)
    setTimeout(() => setMoodFeedback(false), 600)
  }, [])

  // Keep unused data extractions to preserve data flow integrity
  void recentNotes
  void habitActivity
  void habitCompletion
  void monthlyIncome
  void monthlyExpenses
  void language

  // Greeting icon based on time of day
  const [GreetingIcon] = useState(() => {
    const hour = new Date().getHours()
    if (hour < 12) return Sun
    if (hour < 17) return CloudSun
    return Moon
  })

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-[var(--lifeos-section-gap)] relative">
      {/* Animated gradient orb background for welcome section */}
      <div className="absolute top-0 left-0 w-72 h-72 rounded-full opacity-[0.07] pointer-events-none animate-orb-drift" style={{ background: `radial-gradient(circle, var(--accent-primary) 0%, transparent 70%)`, filter: 'blur(40px)' }} />
      <div className="absolute top-10 right-20 w-56 h-56 rounded-full opacity-[0.05] pointer-events-none animate-orb-drift-slow" style={{ background: `radial-gradient(circle, var(--accent-primary-light) 0%, transparent 70%)`, filter: 'blur(30px)' }} />

      {/* Welcome Section - personalized with subtitle and greeting icon */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 relative">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl" style={{ background: `linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 15%, transparent), color-mix(in srgb, var(--accent-primary-light) 10%, transparent))` }}>
              <GreetingIcon className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">{greeting}{userName ? `, ${userName}` : ''}</h2>
          </div>
          <p className="text-sm text-muted-foreground/70 mt-1.5 ml-[42px]">{subtitle}</p>
          <div className="flex items-center gap-2 mt-3 ml-[42px]">
            <span className="text-sm text-muted-foreground">{today}</span>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-sm text-muted-foreground/60 font-mono tabular-nums">{format(liveTime, 'h:mm a')}</span>
          </div>
        </div>
        <div className="flex gap-2.5">
          <Button
            onClick={() => setWeeklyReviewOpen(true)}
            variant="outline"
            size="sm"
            className="rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
            data-weekly-review-btn
          >
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            {t('dashboard.weeklyReview')}
          </Button>
          <div className="flex gap-2.5">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                  {t('dashboard.customize')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">{t('dashboard.dashboardWidgets')}</h4>
                  <p className="text-xs text-muted-foreground">{t('dashboard.toggleSections')}</p>
                  <div className="space-y-2.5">
                    {widgetList.map((w) => (
                      <div key={w.id} className="flex items-center justify-between">
                        <label htmlFor={`widget-${w.id}`} className="text-sm cursor-pointer">{w.label}</label>
                        <Switch
                          id={`widget-${w.id}`}
                          checked={dashboardWidgets.includes(w.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setDashboardWidgets([...dashboardWidgets, w.id])
                            } else {
                              setDashboardWidgets(dashboardWidgets.filter((id: string) => id !== w.id))
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              onClick={() => setCommandPaletteOpen(true)}
              size="sm"
              className="rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {t('dashboard.quickAdd')}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions - pill-shaped buttons */}
      <div className="flex gap-2.5 flex-wrap">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => setActiveModule(action.module)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-accent/40 text-muted-foreground hover:bg-accent/70 hover:text-foreground transition-all duration-200 hover:shadow-sm"
          >
            <action.icon className="h-3.5 w-3.5" />
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Day Progress Bar - gradient with time markers */}
      {dashboardWidgets.includes('day-progress') && <Card className="rounded-xl shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-muted-foreground">{t('dashboard.dayProgress')}</span>
            <span className="text-xs text-muted-foreground/60 tabular-nums">{Math.round(dayProgressPercent)}%</span>
          </div>
          <div className="relative">
            <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${dayProgressPercent}%`,
                  background: `linear-gradient(90deg, ${ringColorLight}88 0%, ${ringColor} 50%, ${ringColorLight}88 100%)`,
                }}
              />
            </div>
            {/* Time markers */}
            <div className="flex justify-between mt-1.5">
              <div className="flex items-center gap-1">
                <Sunrise className="h-2.5 w-2.5 text-amber-400/60" />
                <span className="text-[9px] text-muted-foreground/40">{t('dashboard.sunrise')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Sun className="h-2.5 w-2.5 text-amber-400/60" />
                <span className="text-[9px] text-muted-foreground/40">{t('dashboard.noon')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Sunset className="h-2.5 w-2.5 text-indigo-400/60" />
                <span className="text-[9px] text-muted-foreground/40">{t('dashboard.sunset')}</span>
              </div>
              <span className="text-[9px] text-muted-foreground/40">{t('dashboard.midnight')}</span>
            </div>
          </div>
        </CardContent>
      </Card>}

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 lifeos-section-gap">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 lifeos-section-gap-y">
          {/* Stats Cards - redesigned with left border accent and hover elevation */}
          {dashboardWidgets.includes('stats-cards') && <div className="grid grid-cols-2 gap-4">
            <Card
              className="cursor-pointer rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-l-2 border-l-orange-400/50 group animate-fade-in-up"
              style={{ animationDelay: '0ms', animationFillMode: 'both' }}
              onClick={() => setActiveModule('tasks')}
            >
              <CardContent className="p-5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 6%, transparent), color-mix(in srgb, var(--accent-primary-light) 3%, transparent))' }} />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">{t('dashboard.tasks')}</span>
                    <span className="text-xs text-muted-foreground/50">{pendingTasks} {t('dashboard.pending')}</span>
                  </div>
                  <div className="mt-3">
                    {isLoading ? <Skeleton className="h-8 w-16" /> : (
                      <div className="flex items-end gap-2">
                        <p className="text-2xl font-bold tracking-tight">{totalTasks}</p>
                        <span className="text-xs text-muted-foreground/50 mb-1">{t('dashboard.total')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-l-2 group animate-fade-in-up"
              style={{ borderLeftColor: `${ringColor}80`, animationDelay: '60ms', animationFillMode: 'both' }}
              onClick={() => setActiveModule('habits')}
            >
              <CardContent className="p-5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 6%, transparent), color-mix(in srgb, var(--accent-primary-light) 3%, transparent))' }} />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">{t('dashboard.habits')}</span>
                    <span className="text-xs" style={{ color: 'var(--accent-primary)' }}>{Math.round(habitCompletion)}%</span>
                  </div>
                  <div className="mt-3">
                    {isLoading ? <Skeleton className="h-8 w-16" /> : (
                      <div className="flex items-end gap-2">
                        <p className="text-2xl font-bold tracking-tight">{completedHabitsToday}<span className="text-muted-foreground/40 font-normal">/{totalHabits}</span></p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-l-2 group animate-fade-in-up"
              style={{ borderLeftColor: `${ringColorLight}80`, animationDelay: '120ms', animationFillMode: 'both' }}
              onClick={() => setActiveModule('finance')}
            >
              <CardContent className="p-5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 6%, transparent), color-mix(in srgb, var(--accent-primary-light) 3%, transparent))' }} />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">{t('dashboard.balance')}</span>
                    <Wallet className="h-3.5 w-3.5 text-muted-foreground/30" />
                  </div>
                  <div className="mt-3">
                    {isLoading ? <Skeleton className="h-8 w-24" /> : (
                      <p className="text-2xl font-bold tracking-tight">${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>


          </div>}

          {/* Today's Tasks - with checkbox icons and better spacing */}
          {dashboardWidgets.includes('today-tasks') && <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">{t('dashboard.todayTasks')}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">{pendingTasks} {t('dashboard.remaining')}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveModule('tasks')} className="text-xs text-muted-foreground hover:text-foreground transition-all duration-200">
                  {t('viewAll')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-5">
              <div className="space-y-1">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5">
                      <Skeleton className="h-4 w-4 rounded-sm" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))
                ) : recentTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm">{t('dashboard.allCaughtUp')}</p>
                    <p className="text-xs text-muted-foreground/50 mt-0.5">{t('dashboard.noPendingTasks')}</p>
                  </div>
                ) : (
                  recentTasks.map((task) => (
                    <div
                      key={task.id as string}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/30 transition-all duration-200 group"
                    >
                      <div className={cn(
                        'w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all duration-200',
                        (task.priority as string) === 'urgent' ? 'border-red-400/60 group-hover:border-red-400' :
                        (task.priority as string) === 'high' ? 'border-orange-400/60 group-hover:border-orange-400' :
                        (task.priority as string) === 'medium' ? 'border-amber-400/60 group-hover:border-amber-400' : 'border-slate-400/40 group-hover:border-slate-400'
                      )} />
                      <span className="text-sm flex-1 truncate">{task.title as string}</span>
                      <Badge variant="outline" className={cn(
                        'text-[10px] shrink-0 border-0 font-normal transition-all duration-200',
                        (task.priority as string) === 'urgent' ? 'text-red-500/70 bg-red-500/10' :
                        (task.priority as string) === 'high' ? 'text-orange-500/70 bg-orange-500/10' :
                        (task.priority as string) === 'medium' ? 'text-amber-500/70 bg-amber-500/10' : 'text-slate-500/70 bg-slate-500/10'
                      )}>
                        {task.priority as string}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>}

          {/* Weekly Activity Chart - with gradient background and smoother curves */}
          {dashboardWidgets.includes('weekly-activity') && <Card className="rounded-xl shadow-sm overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-semibold">{t('dashboard.weeklyActivity')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-2 pb-3">
              <div className="h-44 relative rounded-lg overflow-hidden">
                {/* Subtle gradient background */}
                <div className="absolute inset-0 rounded-lg" style={{ background: `linear-gradient(to bottom right, ${ringColor}08, transparent, ${ringColorLight}08)` }} />
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyActivityData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="taskGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={ringColor} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={ringColor} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="habitGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={ringColorLight} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={ringColorLight} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground) / 0.5)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground) / 0.5)' }} axisLine={false} tickLine={false} allowDecimals={false} width={20} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '8px 12px',
                      }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '11px', marginBottom: '4px' }}
                    />
                    <Area type="natural" dataKey="tasks" stroke={ringColor} strokeWidth={2} fill="url(#taskGradient)" name="Tasks" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: ringColor }} />
                    <Area type="natural" dataKey="habits" stroke={ringColorLight} strokeWidth={2} fill="url(#habitGradient)" name="Habits" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: ringColorLight }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>}
        </div>

        {/* Right Column (1/3) */}
        <div className="lifeos-section-gap-y">
          {/* Quick Capture Widget */}
          {dashboardWidgets.includes('quick-capture') && <div data-quick-capture>
            <QuickCapture />
          </div>}

          {/* Today's Progress Ring - larger and more prominent */}
          {dashboardWidgets.includes('progress-ring') && <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-semibold">{t('dashboard.progress')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-5">
              <div className="flex flex-col items-center">
                <div className="relative shrink-0">
                  <ProgressRing value={overallProgress} size={120} strokeWidth={8} color={ringColor} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-foreground">{overallProgress}%</span>
                    <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">{t('dashboard.complete')}</span>
                  </div>
                </div>
                <div className="w-full space-y-3 mt-5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{t('dashboard.tasks')}</span>
                      <span className="text-xs font-medium">{tasksByStatus.done || 0}/{totalTasks}</span>
                    </div>
                    <Progress value={taskProgress} className="h-1.5" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{t('dashboard.habits')}</span>
                      <span className="text-xs font-medium">{completedHabitsToday}/{totalHabits}</span>
                    </div>
                    <Progress value={habitProgress} className="h-1.5" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{t('dashboard.goals')}</span>
                      <span className="text-xs font-medium">{Math.round(overallProgress)}%</span>
                    </div>
                    <Progress value={overallProgress} className="h-1.5" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>}

          {/* Upcoming Events - with time icons and better color coding */}
          {dashboardWidgets.includes('upcoming-events') && <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{t('dashboard.upcoming')}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveModule('calendar')} className="text-xs text-muted-foreground hover:text-foreground transition-all duration-200">
                  {t('viewAll')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-5">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="h-7 w-7 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs">{t('dashboard.noUpcomingEvents')}</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent/30 transition-all duration-200">
                      <div className="mt-0.5 shrink-0">
                        {event.allDay ? (
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground/40" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                          {event.allDay ? formatEventDate(event.startDate) : `${formatEventDate(event.startDate)} at ${formatEventTime(event.startDate)}`}
                        </p>
                      </div>
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                        style={{ backgroundColor: event.color }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>}

          {/* Quick Mood Logger - bigger emojis with feedback animation */}
          {dashboardWidgets.includes('mood-logger') && <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-semibold">{t('dashboard.howAreYouFeeling')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-5">
              <div className="flex justify-between gap-1">
                {[
                  { emoji: '😊', label: t('dashboard.great') },
                  { emoji: '😐', label: t('dashboard.okay') },
                  { emoji: '😔', label: t('dashboard.low') },
                  { emoji: '😤', label: t('dashboard.stressed') },
                  { emoji: '🤯', label: t('dashboard.overwhelmed') },
                ].map((mood) => (
                  <button
                    key={mood.label}
                    onClick={() => handleMoodClick(mood.label)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95',
                      selectedMood === mood.label && moodFeedback
                        ? 'bg-accent scale-110'
                        : selectedMood === mood.label
                          ? 'bg-accent/60'
                          : 'hover:bg-accent/40'
                    )}
                    title={mood.label}
                  >
                    <span className={cn(
                      'text-2xl transition-transform duration-200',
                      selectedMood === mood.label && moodFeedback && 'scale-125'
                    )}>{mood.emoji}</span>
                    <span className={cn(
                      'text-[9px] transition-all duration-200',
                      selectedMood === mood.label ? 'text-foreground font-medium' : 'text-muted-foreground/50'
                    )}>{mood.label}</span>
                    {selectedMood === mood.label && (
                      <div className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: ringColor }} />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>}

          {/* Journal Prompts */}
          {dashboardWidgets.includes('journal-prompts') && <JournalPrompts />}

          {/* AI Insights */}
          {dashboardWidgets.includes('ai-insights') && <AIInsights />}

          {/* Onboarding Tips */}
          {dashboardWidgets.includes('onboarding-tips') && <OnboardingTips />}

          {/* Daily Planner Widget */}
          {dashboardWidgets.includes('daily-planner') && <DailyPlannerWidget />}
        </div>
      </div>

      {/* Weekly Review Dialog */}
      <WeeklyReview open={weeklyReviewOpen} onOpenChange={setWeeklyReviewOpen} />
    </div>
  )
}

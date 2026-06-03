'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Play,
  Pause,
  Square,
  Timer,
  Clock,
  Trash2,
  TrendingUp,
  CalendarDays,
  List,
  BarChart3,
  Link2,
  ArrowRight,
  RotateCcw,
  SkipForward,
  Settings,
  Volume2,
  VolumeX,
  Flame,
  Target,
  Coffee,
  Brain,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { useTimeEntries, useCreateTimeEntry, useStopTimeEntry, useDeleteTimeEntry, useTasks, usePomodoroSessions } from '@/lib/api/hooks'
import { usePomodoro, type PomodoroMode, type PomodoroSettings } from '@/hooks/use-pomodoro'
import { useAppStore } from '@/stores/app-store'
import { showToast } from '@/lib/toast'
import { useTranslation } from '@/lib/i18n'
import { format, subDays, startOfDay, isToday } from 'date-fns'

function cn(...inputs: (string | undefined | false)[]) {
  return inputs.filter(Boolean).join(' ')
}

interface TimeEntryData {
  id: string
  description: string
  startTime: string
  endTime: string | null
  duration: number | null
  billable: boolean
  taskId: string | null
  task: { id: string; title: string; status: string } | null
  createdAt: string
}

function mapApiTimeEntry(apiEntry: Record<string, unknown>): TimeEntryData {
  return {
    id: apiEntry.id as string,
    description: (apiEntry.description as string) || '',
    startTime: new Date(apiEntry.startTime as string).toISOString(),
    endTime: apiEntry.endTime ? new Date(apiEntry.endTime as string).toISOString() : null,
    duration: (apiEntry.duration as number) || null,
    billable: (apiEntry.billable as boolean) || false,
    taskId: (apiEntry.taskId as string) || null,
    task: apiEntry.task as { id: string; title: string; status: string } | null,
    createdAt: new Date(apiEntry.createdAt as string).toISOString(),
  }
}

function formatElapsedTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function formatTimerDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

// ============================================
// Mode config helpers
// ============================================
const MODE_CONFIG: Record<PomodoroMode, {
  label: string
  icon: typeof Brain
  gradient: string
  bgGradient: string
  ringColor: string
  textColor: string
  glowColor: string
}> = {
  'focus': {
    label: 'Focus',
    icon: Brain,
    gradient: 'from-emerald-500 to-teal-600',
    bgGradient: 'from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/30 dark:to-teal-950/30',
    ringColor: 'stroke-emerald-500',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    glowColor: 'shadow-emerald-500/20',
  },
  'short-break': {
    label: 'Short Break',
    icon: Coffee,
    gradient: 'from-cyan-500 to-sky-600',
    bgGradient: 'from-cyan-50/80 to-sky-50/80 dark:from-cyan-950/30 dark:to-sky-950/30',
    ringColor: 'stroke-cyan-500',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    glowColor: 'shadow-cyan-500/20',
  },
  'long-break': {
    label: 'Long Break',
    icon: Sparkles,
    gradient: 'from-violet-500 to-purple-600',
    bgGradient: 'from-violet-50/80 to-purple-50/80 dark:from-violet-950/30 dark:to-purple-950/30',
    ringColor: 'stroke-violet-500',
    textColor: 'text-violet-600 dark:text-violet-400',
    glowColor: 'shadow-violet-500/20',
  },
}

// ============================================
// Circular Progress Ring Component
// ============================================
function CircularProgress({ progress, mode, size = 260 }: { progress: number; mode: PomodoroMode; size?: number }) {
  const config = MODE_CONFIG[mode]
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted/30"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={config.ringColor}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease',
          }}
        />
      </svg>
    </div>
  )
}

// ============================================
// Settings Dialog Component
// ============================================
function PomodoroSettingsDialog({
  settings,
  onUpdate,
}: {
  settings: PomodoroSettings
  onUpdate: (updates: Partial<PomodoroSettings>) => void
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pomodoro Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Duration Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Timer Durations
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-2">
                  <Brain className="h-3.5 w-3.5 text-emerald-500" />
                  Focus
                </Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[settings.focusDuration]}
                    onValueChange={([v]) => onUpdate({ focusDuration: v })}
                    min={5}
                    max={60}
                    step={5}
                    className="w-24"
                  />
                  <span className="text-sm font-mono w-10 text-right">{settings.focusDuration}m</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-2">
                  <Coffee className="h-3.5 w-3.5 text-cyan-500" />
                  Short Break
                </Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[settings.shortBreakDuration]}
                    onValueChange={([v]) => onUpdate({ shortBreakDuration: v })}
                    min={1}
                    max={30}
                    step={1}
                    className="w-24"
                  />
                  <span className="text-sm font-mono w-10 text-right">{settings.shortBreakDuration}m</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                  Long Break
                </Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[settings.longBreakDuration]}
                    onValueChange={([v]) => onUpdate({ longBreakDuration: v })}
                    min={5}
                    max={45}
                    step={5}
                    className="w-24"
                  />
                  <span className="text-sm font-mono w-10 text-right">{settings.longBreakDuration}m</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Sessions before long break</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[settings.sessionsBeforeLongBreak]}
                    onValueChange={([v]) => onUpdate({ sessionsBeforeLongBreak: v })}
                    min={2}
                    max={8}
                    step={1}
                    className="w-24"
                  />
                  <span className="text-sm font-mono w-10 text-right">{settings.sessionsBeforeLongBreak}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Behavior Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Behavior
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Auto-start breaks</Label>
                <Switch
                  checked={settings.autoStartBreaks}
                  onCheckedChange={(v) => onUpdate({ autoStartBreaks: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Auto-start focus</Label>
                <Switch
                  checked={settings.autoStartFocus}
                  onCheckedChange={(v) => onUpdate({ autoStartFocus: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-2">
                  {settings.soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  Sound notifications
                </Label>
                <Switch
                  checked={settings.soundEnabled}
                  onCheckedChange={(v) => onUpdate({ soundEnabled: v })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Daily Goal */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Daily Goal
            </h4>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Target pomodoros per day</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[settings.dailyGoal]}
                  onValueChange={([v]) => onUpdate({ dailyGoal: v })}
                  min={1}
                  max={16}
                  step={1}
                  className="w-24"
                />
                <span className="text-sm font-mono w-10 text-right">{settings.dailyGoal}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Main Time Page Component
// ============================================
export function TimePage() {
  const { accentColor } = useAppStore()
  const { t } = useTranslation()
  const accentHexMap: Record<string, string> = {
    emerald: '#10b981', teal: '#14b8a6', amber: '#f59e0b',
    rose: '#f43f5e', violet: '#8b5cf6', cyan: '#06b6d4',
    indigo: '#6366f1', pink: '#ec4899', lime: '#84cc16', sky: '#0ea5e9',
  }
  const accentHex = accentHexMap[accentColor] || '#10b981'
  const { data: apiEntries, isLoading } = useTimeEntries()
  const { data: apiTasks } = useTasks()

  // Pomodoro sessions for stats
  const today = new Date().toISOString().split('T')[0]
  const { data: pomodoroData } = usePomodoroSessions({ date: today })

  const createTimeEntryMutation = useCreateTimeEntry()
  const stopTimeEntryMutation = useStopTimeEntry()
  const deleteTimeEntryMutation = useDeleteTimeEntry()

  // Pomodoro timer
  const pomodoro = usePomodoro()

  const entries: TimeEntryData[] = useMemo(() => {
    if (!apiEntries) return []
    return (apiEntries as Record<string, unknown>[]).map(mapApiTimeEntry)
  }, [apiEntries])

  const tasks = useMemo(() => {
    if (!apiTasks) return [] as { id: string; title: string }[]
    return (apiTasks as Record<string, unknown>[]).map(t => ({
      id: t.id as string,
      title: t.title as string,
    }))
  }, [apiTasks])

  // Compute pomodoro stats
  const pomodoroSessions = useMemo(() => {
    if (!pomodoroData) return [] as Record<string, unknown>[]
    return pomodoroData as Record<string, unknown>[]
  }, [pomodoroData])

  const todayCompletedPomodoros = useMemo(() => {
    return pomodoroSessions.filter(s => s.completed && s.type === 'focus').length
  }, [pomodoroSessions])

  const todayFocusSeconds = useMemo(() => {
    return pomodoroSessions
      .filter(s => s.type === 'focus' && s.completed)
      .reduce((acc, s) => acc + ((s.duration as number) || 0), 0)
  }, [pomodoroSessions])

  const todayFocusMinutes = Math.round(todayFocusSeconds / 60)

  // Manual timer state (for the classic time tracker)
  const [timerDescription, setTimerDescription] = useState('')
  const [timerTaskId, setTimerTaskId] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [timeView, setTimeView] = useState<'entries' | 'weekly'>('entries')
  const [mainView, setMainView] = useState<'pomodoro' | 'tracker'>('pomodoro')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Timer tick for manual tracker
  useEffect(() => {
    if (isRunning && !isPaused && startedAt) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startedAt.getTime()) / 1000))
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, isPaused, startedAt])

  // Check for running entries on load
  useEffect(() => {
    const runningEntry = entries.find(e => !e.endTime)
    if (runningEntry && !activeEntryId) {
      setActiveEntryId(runningEntry.id)
      setIsRunning(true)
      setIsPaused(false)
      setTimerDescription(runningEntry.description)
      setTimerTaskId(runningEntry.taskId || '')
      setStartedAt(new Date(runningEntry.startTime))
      setElapsedSeconds(Math.floor((Date.now() - new Date(runningEntry.startTime).getTime()) / 1000))
    }
  }, [entries, activeEntryId])

  const handleStart = useCallback(() => {
    createTimeEntryMutation.mutate(
      {
        description: timerDescription || 'Untitled timer',
        startTime: new Date().toISOString(),
        taskId: timerTaskId || null,
      },
      {
        onSuccess: (data) => {
          const created = data as Record<string, unknown>
          setActiveEntryId(created.id as string)
          setIsRunning(true)
          setIsPaused(false)
          setStartedAt(new Date())
          setElapsedSeconds(0)
        },
      }
    )
  }, [timerDescription, timerTaskId, createTimeEntryMutation])

  const handleStop = useCallback(() => {
    if (!activeEntryId) return
    stopTimeEntryMutation.mutate(
      { id: activeEntryId },
      {
        onSuccess: () => {
          setIsRunning(false)
          setIsPaused(false)
          setActiveEntryId(null)
          setTimerDescription('')
          setTimerTaskId('')
          setElapsedSeconds(0)
          setStartedAt(null)
          showToast.success('Time entry saved')
        },
      }
    )
  }, [activeEntryId, stopTimeEntryMutation])

  const handlePause = useCallback(() => {
    setIsPaused(true)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const handleResume = useCallback(() => {
    if (startedAt) {
      const pausedTime = elapsedSeconds * 1000
      const newStartedAt = new Date(Date.now() - pausedTime)
      setStartedAt(newStartedAt)
    }
    setIsPaused(false)
  }, [elapsedSeconds, startedAt])

  const deleteEntry = useCallback((id: string) => {
    deleteTimeEntryMutation.mutate(id)
    showToast.info('Time entry deleted')
  }, [deleteTimeEntryMutation])

  // Today's entries
  const todayEntries = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return entries.filter(e => e.startTime.startsWith(today))
  }, [entries])

  // Stats
  const todayTotalMinutes = useMemo(() => {
    return todayEntries.reduce((acc, e) => {
      if (e.duration) return acc + e.duration
      if (!e.endTime) {
        return acc + Math.floor((Date.now() - new Date(e.startTime).getTime()) / (1000 * 60))
      }
      return acc + Math.floor((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / (1000 * 60))
    }, 0)
  }, [todayEntries])

  const weekTotalMinutes = useMemo(() => {
    const weekAgo = subDays(new Date(), 7)
    return entries
      .filter(e => new Date(e.startTime) >= weekAgo)
      .reduce((acc, e) => {
        if (e.duration) return acc + e.duration
        if (!e.endTime) return acc + Math.floor((Date.now() - new Date(e.startTime).getTime()) / (1000 * 60))
        return acc + Math.floor((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / (1000 * 60))
      }, 0)
  }, [entries])

  const avgDailyMinutes = useMemo(() => {
    const last7 = subDays(new Date(), 7)
    const recentEntries = entries.filter(e => new Date(e.startTime) >= last7 && e.duration)
    if (recentEntries.length === 0) return 0
    const total = recentEntries.reduce((acc, e) => acc + (e.duration || 0), 0)
    return Math.round(total / 7)
  }, [entries])

  // Weekly chart data
  const weeklyChartData = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayEntries = entries.filter(e => e.startTime.startsWith(dateStr))
      const totalMin = dayEntries.reduce((acc, e) => {
        if (e.duration) return acc + e.duration
        if (!e.endTime) return acc + Math.floor((Date.now() - new Date(e.startTime).getTime()) / (1000 * 60))
        return acc + Math.floor((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / (1000 * 60))
      }, 0)
      days.push({
        day: format(date, 'EEE'),
        date: dateStr,
        hours: Math.round((totalMin / 60) * 10) / 10,
        isToday: i === 0,
      })
    }
    return days
  }, [entries])

  // Mode config for current pomodoro mode
  const currentModeConfig = MODE_CONFIG[pomodoro.mode]
  const ModeIcon = currentModeConfig.icon

  // Daily goal progress
  const dailyGoalProgress = pomodoro.settings.dailyGoal > 0
    ? Math.min(100, (todayCompletedPomodoros / pomodoro.settings.dailyGoal) * 100)
    : 0

  return (
    <div className="p-[var(--lifeos-card-padding)] max-w-7xl mx-auto space-y-[var(--lifeos-section-gap)] animate-page-enter">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <Tabs value={mainView} onValueChange={v => setMainView(v as 'pomodoro' | 'tracker')}>
          <TabsList className="h-9">
            <TabsTrigger value="pomodoro" className="text-xs px-4 h-7">
              <Brain className="h-3.5 w-3.5 mr-1.5" />{t('timeTracker.pomodoro')}
            </TabsTrigger>
            <TabsTrigger value="tracker" className="text-xs px-4 h-7">
              <Timer className="h-3.5 w-3.5 mr-1.5" />{t('timeTracker.timer')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {mainView === 'pomodoro' ? (
        /* ============================================
           POMODORO VIEW
           ============================================ */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Main Pomodoro Timer */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className={cn(
                'overflow-hidden transition-all duration-700',
                `bg-gradient-to-br ${currentModeConfig.bgGradient}`,
                pomodoro.isRunning && `shadow-xl ${currentModeConfig.glowColor} ring-1 ring-current`
              )}>
                {/* Top gradient bar */}
                <div className={cn(
                  'h-1.5 transition-all duration-700',
                  `bg-gradient-to-r ${currentModeConfig.gradient}`
                )} />

                <CardContent className="p-6 md:p-8">
                  {/* Mode Tabs */}
                  <div className="flex items-center justify-center gap-2 mb-6">
                    {(['focus', 'short-break', 'long-break'] as PomodoroMode[]).map((m) => {
                      const mConfig = MODE_CONFIG[m]
                      const MIcon = mConfig.icon
                      return (
                        <Button
                          key={m}
                          variant={pomodoro.mode === m ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => pomodoro.switchMode(m)}
                          className={cn(
                            'transition-all duration-300',
                            pomodoro.mode === m && `bg-gradient-to-r ${mConfig.gradient} text-white shadow-md`
                          )}
                        >
                          <MIcon className="h-3.5 w-3.5 mr-1.5" />
                          {mConfig.label}
                        </Button>
                      )
                    })}
                  </div>

                  {/* Circular Timer */}
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <CircularProgress
                        progress={pomodoro.progress}
                        mode={pomodoro.mode}
                        size={260}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={pomodoro.mode}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-center"
                          >
                            <p className={cn(
                              'text-6xl md:text-7xl font-mono font-bold tracking-wider transition-colors duration-500',
                              currentModeConfig.textColor
                            )}>
                              {formatTimerDisplay(pomodoro.timeRemaining)}
                            </p>
                            <div className="flex items-center justify-center gap-1.5 mt-2">
                              <ModeIcon className={cn('h-4 w-4', currentModeConfig.textColor)} />
                              <span className={cn('text-sm font-semibold uppercase tracking-wider', currentModeConfig.textColor)}>
                                {currentModeConfig.label}
                              </span>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                        {pomodoro.isRunning && (
                          <motion.div
                            className="flex items-center justify-center gap-1.5 mt-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <span className={cn(
                              'w-2 h-2 rounded-full animate-pulse',
                              pomodoro.mode === 'focus' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' :
                              pomodoro.mode === 'short-break' ? 'bg-cyan-500 shadow-sm shadow-cyan-500/50' :
                              'bg-violet-500 shadow-sm shadow-violet-500/50'
                            )} />
                            <span className={cn('text-[10px] font-semibold tracking-wider', currentModeConfig.textColor)}>
                              RUNNING
                            </span>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Session Counter */}
                    <div className="flex items-center gap-2 mt-4 mb-6">
                      {Array.from({ length: pomodoro.sessionsInCycle }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'w-3 h-3 rounded-full transition-all duration-300',
                            i < (pomodoro.completedSessions % pomodoro.sessionsInCycle)
                              ? `bg-gradient-to-r ${currentModeConfig.gradient} shadow-sm`
                              : i === (pomodoro.completedSessions % pomodoro.sessionsInCycle) && pomodoro.mode === 'focus'
                              ? 'ring-2 ring-current scale-110 ' + currentModeConfig.textColor
                              : 'bg-muted-foreground/20'
                          )}
                        />
                      ))}
                      <span className="text-xs text-muted-foreground ml-2">
                        Session {(pomodoro.completedSessions % pomodoro.sessionsInCycle) + (pomodoro.mode === 'focus' ? 1 : 0)} of {pomodoro.sessionsInCycle}
                      </span>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={pomodoro.reset}
                        className="h-10 w-10 rounded-full"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>

                      <Button
                        onClick={pomodoro.togglePlayPause}
                        size="lg"
                        className={cn(
                          'rounded-full h-14 w-14 shadow-lg transition-all duration-300',
                          `bg-gradient-to-r ${currentModeConfig.gradient} hover:opacity-90 text-white`
                        )}
                      >
                        {pomodoro.isRunning ? (
                          <Pause className="h-6 w-6" />
                        ) : (
                          <Play className="h-6 w-6 ml-0.5" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={pomodoro.skip}
                        className="h-10 w-10 rounded-full"
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>

                      <div className="w-px h-6 bg-border mx-1" />

                      <PomodoroSettingsDialog
                        settings={pomodoro.settings}
                        onUpdate={pomodoro.updateSettings}
                      />
                    </div>

                    <p className="text-[10px] text-muted-foreground/60 mt-3">
                      Press Space to play/pause
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Stats Cards - Pomodoro specific */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="overflow-hidden hover-lift">
                <div className="h-1" style={{ background: `linear-gradient(to right, ${accentHex}, ${accentHex}cc)` }} />
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="h-4 w-4" style={{ color: accentHex }} />
                    <span className="text-xs text-muted-foreground">Pomodoros</span>
                  </div>
                  <p className="text-2xl font-bold">{todayCompletedPomodoros}</p>
                  <p className="text-xs text-muted-foreground">completed today</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden hover-lift">
                <div className="h-1" style={{ background: `linear-gradient(to right, ${accentHex}cc, ${accentHex})` }} />
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4" style={{ color: accentHex }} />
                    <span className="text-xs text-muted-foreground">Focus Time</span>
                  </div>
                  <p className="text-2xl font-bold">{formatDuration(todayFocusMinutes)}</p>
                  <p className="text-xs text-muted-foreground">today</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden hover-lift">
                <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-amber-500" />
                    <span className="text-xs text-muted-foreground">Daily Goal</span>
                  </div>
                  <p className="text-2xl font-bold">{todayCompletedPomodoros}/{pomodoro.settings.dailyGoal}</p>
                  <Progress value={dailyGoalProgress} className="h-1.5 mt-1" />
                </CardContent>
              </Card>
              <Card className="overflow-hidden hover-lift">
                <div className="h-1 bg-gradient-to-r from-rose-400 to-rose-600" />
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-rose-500" />
                    <span className="text-xs text-muted-foreground">Total Tracked</span>
                  </div>
                  <p className="text-2xl font-bold">{formatDuration(todayTotalMinutes)}</p>
                  <p className="text-xs text-muted-foreground">{todayEntries.length} entries</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right: Session Stats & History */}
          <div className="space-y-4">
            {/* Daily Goal Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-500" />
                  Daily Goal Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">{todayCompletedPomodoros}</span>
                  <span className="text-muted-foreground text-sm mb-1">/ {pomodoro.settings.dailyGoal} pomodoros</span>
                </div>
                <Progress value={dailyGoalProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {dailyGoalProgress >= 100
                    ? '🎉 Goal reached! Great work!'
                    : `${pomodoro.settings.dailyGoal - todayCompletedPomodoros} more to reach your goal`
                  }
                </p>
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Timer className="h-4 w-4" style={{ color: accentHex }} />
                  Today&apos;s Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-80">
                  <div className="px-6 pb-4 space-y-2">
                    {pomodoroSessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No sessions yet. Start your first pomodoro!
                      </p>
                    ) : (
                      pomodoroSessions.slice(0, 20).map((session, idx) => {
                        const sType = session.type as string
                        const sCompleted = session.completed as boolean
                        const sDuration = session.duration as number
                        const sStartedAt = session.startedAt as string
                        const sConfig = MODE_CONFIG[sType as PomodoroMode] || MODE_CONFIG['focus']
                        const SIcon = sConfig.icon

                        return (
                          <motion.div
                            key={session.id as string}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors"
                          >
                            <div className={cn(
                              'p-1.5 rounded-lg',
                              sType === 'focus' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                              sType === 'short-break' ? 'bg-cyan-100 dark:bg-cyan-900/30' :
                              'bg-violet-100 dark:bg-violet-900/30'
                            )}>
                              <SIcon className={cn('h-3.5 w-3.5', sConfig.textColor)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">{sConfig.label}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {format(new Date(sStartedAt), 'h:mm a')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono">{formatDuration(Math.round(sDuration / 60))}</span>
                              {sCompleted ? (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[9px] px-1.5">
                                  Done
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] px-1.5">
                                  Skip
                                </Badge>
                              )}
                            </div>
                          </motion.div>
                        )
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" style={{ color: accentHex }} />
                  This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Total tracked</span>
                    <span className="text-sm font-semibold">{formatDuration(weekTotalMinutes)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Avg daily</span>
                    <span className="text-sm font-semibold">{formatDuration(avgDailyMinutes)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Time entries</span>
                    <span className="text-sm font-semibold">{entries.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* ============================================
           CLASSIC TIME TRACKER VIEW
           ============================================ */
        <>
          {/* Active Timer */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className={cn(
              'overflow-hidden transition-all duration-500',
              isRunning && !isPaused ? 'ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10 animate-glow bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20' : ''
            )}>
              <div className={cn(
                'h-1.5 transition-all duration-500',
                isRunning && !isPaused
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                  : isPaused
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                  : 'bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700'
              )} />
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  {/* Timer Input */}
                  <div className="flex-1 w-full space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2 rounded-xl transition-all duration-300',
                        isRunning && !isPaused
                          ? 'bg-emerald-100 dark:bg-emerald-900/30'
                          : 'bg-muted'
                      )}>
                        <Timer className={cn(
                          'h-5 w-5 transition-colors duration-300',
                          isRunning && !isPaused
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-muted-foreground'
                        )} />
                      </div>
                      <Input
                        placeholder="What are you working on?"
                        value={timerDescription}
                        onChange={e => setTimerDescription(e.target.value)}
                        disabled={isRunning}
                        className="text-base font-medium border-0 focus-visible:ring-1 focus-visible:ring-emerald-500/30 p-0 h-auto placeholder:text-muted-foreground/50"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={timerTaskId} onValueChange={setTimerTaskId} disabled={isRunning}>
                        <SelectTrigger className="w-48 h-8 text-xs">
                          <Link2 className="h-3 w-3 mr-1 text-muted-foreground" />
                          <SelectValue placeholder="Link to task..." />
                        </SelectTrigger>
                        <SelectContent>
                          {tasks.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Timer Display */}
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[120px]">
                      <p className={cn(
                        'text-5xl font-mono font-bold tracking-wider transition-colors duration-300',
                        isRunning && !isPaused ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                      )}>
                        {formatElapsedTime(elapsedSeconds)}
                      </p>
                      {isRunning && !isPaused && (
                        <motion.div
                          className="flex items-center justify-center gap-1 mt-1"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider">RECORDING</span>
                        </motion.div>
                      )}
                      {isPaused && (
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">PAUSED</span>
                        </div>
                      )}
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center gap-2">
                      {!isRunning ? (
                        <Button
                          onClick={handleStart}
                          size="lg"
                          className="text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-xl px-6"
                          style={{ background: `linear-gradient(to right, ${accentHex}, ${accentHex}cc)` }}
                        >
                          <Play className="h-5 w-5 mr-2" />
                          Start
                        </Button>
                      ) : (
                        <>
                          {isPaused ? (
                            <Button
                              onClick={handleResume}
                              size="lg"
                              className="text-white shadow-md rounded-xl"
                              style={{ background: `linear-gradient(to right, ${accentHex}, ${accentHex}cc)` }}
                            >
                              <Play className="h-4 w-4 mr-1.5" />
                              Resume
                            </Button>
                          ) : (
                            <Button
                              onClick={handlePause}
                              size="lg"
                              variant="outline"
                              className="border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30 rounded-xl"
                            >
                              <Pause className="h-4 w-4 mr-1.5" />
                              Pause
                            </Button>
                          )}
                          <Button
                            onClick={handleStop}
                            size="lg"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30 rounded-xl"
                          >
                            <Square className="h-4 w-4 mr-1.5" />
                            Stop
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="overflow-hidden hover-lift">
              <div className="h-1" style={{ background: `linear-gradient(to right, ${accentHex}, ${accentHex}cc)` }} />
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4" style={{ color: accentHex }} />
                  <span className="text-xs text-muted-foreground">Today</span>
                </div>
                {isLoading ? <Skeleton className="h-7 w-16" /> : (
                  <p className="text-2xl font-bold">{formatDuration(todayTotalMinutes)}</p>
                )}
                <p className="text-xs text-muted-foreground">{todayEntries.length} entries</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden hover-lift">
              <div className="h-1" style={{ background: `linear-gradient(to right, ${accentHex}cc, ${accentHex})` }} />
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="h-4 w-4" style={{ color: accentHex }} />
                  <span className="text-xs text-muted-foreground">This Week</span>
                </div>
                {isLoading ? <Skeleton className="h-7 w-16" /> : (
                  <p className="text-2xl font-bold">{formatDuration(weekTotalMinutes)}</p>
                )}
              </CardContent>
            </Card>
            <Card className="overflow-hidden hover-lift">
              <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Avg Daily</span>
                </div>
                {isLoading ? <Skeleton className="h-7 w-16" /> : (
                  <p className="text-2xl font-bold">{formatDuration(avgDailyMinutes)}</p>
                )}
                <p className="text-xs text-muted-foreground">last 7 days</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden hover-lift">
              <div className="h-1 bg-gradient-to-r from-rose-400 to-rose-600" />
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <List className="h-4 w-4 text-rose-500" />
                  <span className="text-xs text-muted-foreground">Today&apos;s Entries</span>
                </div>
                {isLoading ? <Skeleton className="h-7 w-8" /> : (
                  <p className="text-2xl font-bold">{todayEntries.length}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* View Toggle */}
          <div className="flex items-center justify-between">
            <Tabs value={timeView} onValueChange={v => setTimeView(v as 'entries' | 'weekly')}>
              <TabsList className="h-8">
                <TabsTrigger value="entries" className="text-xs px-3 h-6">
                  <List className="h-3.5 w-3.5 mr-1" />Entries
                </TabsTrigger>
                <TabsTrigger value="weekly" className="text-xs px-3 h-6">
                  <BarChart3 className="h-3.5 w-3.5 mr-1" />Weekly
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {todayEntries.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Total today: <span className="font-semibold" style={{ color: accentHex }}>{formatDuration(todayTotalMinutes)}</span>
              </p>
            )}
          </div>
        </>
      )}

      {/* ============================================
          BOTTOM: Time Entries (shared between views)
          ============================================ */}
      {mainView === 'tracker' && (
        isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : timeView === 'entries' ? (
          <div className="space-y-2">
            <AnimatePresence>
              {todayEntries.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-muted-foreground"
                >
                  <Timer className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No time entries today. Start tracking!</p>
                </motion.div>
              ) : (
                todayEntries.map((entry, idx) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <Card className={cn(
                      'hover:shadow-md transition-all duration-200 overflow-hidden',
                      !entry.endTime && 'ring-1 ring-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10'
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            !entry.endTime ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30'
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{entry.description}</p>
                              {!entry.endTime && (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px]">
                                  Active
                                </Badge>
                              )}
                              {entry.task && (
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                  <Link2 className="h-2.5 w-2.5 mr-0.5" />
                                  {entry.task.title}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{formatTime(entry.startTime)}</span>
                              {entry.endTime && (
                                <>
                                  <ArrowRight className="h-3 w-3" />
                                  <span>{formatTime(entry.endTime)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold">
                              {entry.duration
                                ? formatDuration(entry.duration)
                                : !entry.endTime
                                ? formatElapsedTime(elapsedSeconds)
                                : '—'}
                            </p>
                          </div>
                          {entry.endTime && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 hover:text-destructive"
                              onClick={() => deleteEntry(entry.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </AnimatePresence>

            {/* Older entries */}
            {entries.filter(e => !isToday(new Date(e.startTime))).length > 0 && (
              <>
                <Separator className="my-4" />
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">Earlier</h3>
                <div className="space-y-2">
                  {entries
                    .filter(e => !isToday(new Date(e.startTime)))
                    .slice(0, 10)
                    .map(entry => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/30 transition-colors"
                      >
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/20 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{entry.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.startTime), 'MMM d')} • {formatTime(entry.startTime)}
                            {entry.endTime && ` → ${formatTime(entry.endTime)}`}
                          </p>
                        </div>
                        <span className="text-sm font-medium shrink-0">
                          {entry.duration ? formatDuration(entry.duration) : '—'}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 hover:text-destructive"
                          onClick={() => deleteEntry(entry.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        ) : (
          /* Weekly Chart */
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Weekly Overview</CardTitle>
              <CardDescription>Hours tracked per day, last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChartData} barCategoryGap="20%">
                    <defs>
                      <linearGradient id="timeBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={accentHex} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={accentHex} stopOpacity={0.3} />
                      </linearGradient>
                      <linearGradient id="timeBarGradientToday" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={accentHex} stopOpacity={1} />
                        <stop offset="95%" stopColor={accentHex} stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis
                      dataKey="day"
                      className="text-xs"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      label={{ value: 'hrs', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'var(--color-muted-foreground)' } }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value}h`, 'Hours']}
                      labelFormatter={(label) => {
                        const item = weeklyChartData.find(d => d.day === label)
                        return item?.isToday ? `${label} (Today)` : label
                      }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {weeklyChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.isToday ? 'url(#timeBarGradientToday)' : 'url(#timeBarGradient)'}
                          opacity={entry.isToday ? 1 : 0.6}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  )
}

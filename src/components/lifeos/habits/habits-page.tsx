'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Plus,
  Flame,
  TrendingUp,
  CalendarDays,
  CheckCircle2,
  Circle,
  List,
  Calendar,
  BarChart3,
  Trash2,
  Pencil,
  Volume2,
  Trophy,
  Sparkles,
  PartyPopper,
  X,
  Minus,
  Hash,
  AlertTriangle,
  Target,
  Star,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { useHabits, useCreateHabit, useUpdateHabit, useDeleteHabit, useLogHabit } from '@/lib/api/hooks'
import { HabitStreakCalendar } from './habit-streak-calendar'
import { useAppStore } from '@/stores/app-store'
import { useTranslation } from '@/lib/i18n'
import { showToast } from '@/lib/toast'

const habitColors = [
  'bg-emerald-500', 'bg-amber-500', 'bg-teal-500', 'bg-rose-500',
  'bg-cyan-500', 'bg-orange-500', 'bg-pink-500', 'bg-lime-500',
]

const habitColorMap: Record<string, string> = {
  'bg-emerald-500': '#10b981', 'bg-amber-500': '#f59e0b', 'bg-teal-500': '#14b8a6',
  'bg-rose-500': '#f43f5e', 'bg-cyan-500': '#06b6d4', 'bg-orange-500': '#f97316',
  'bg-pink-500': '#ec4899', 'bg-lime-500': '#84cc16',
}

function cn(...inputs: (string | undefined | false)[]) {
  return inputs.filter(Boolean).join(' ')
}

// Map API habit to local format
function mapApiHabit(apiHabit: Record<string, unknown>) {
  const logs = (apiHabit.logs as Record<string, unknown>[]) || []
  const color = (apiHabit.color as string) || '#10b981'
  const colorClass = Object.entries(habitColorMap).find(([_, hex]) => hex === color)?.[0] || 'bg-emerald-500'

  const today = new Date().toISOString().split('T')[0]
  const logDates = logs.map((l: Record<string, unknown>) => {
    const d = l.date as string
    return d ? d.split('T')[0] : ''
  }).filter(Boolean).sort().reverse()

  const targetCount = (apiHabit.targetCount as number) || 1

  // Get today's actual count
  const todayLog = logs.find((l: Record<string, unknown>) => {
    const d = l.date as string
    return d && d.split('T')[0] === today
  })
  const todayCount = (todayLog?.count as number) || 0

  // Streak: allow 1-day gap (streak protection)
  let streak = 0
  const checkDate = new Date()
  let allowedGap = 1 // one missed day is forgiven per streak
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0]
    if (logDates.includes(dateStr)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (i === 0) {
      // Today not yet logged — still OK (grace period)
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (allowedGap > 0) {
      // Allow one missed day per streak
      allowedGap--
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  const last30 = logs.filter((l: Record<string, unknown>) => {
    const d = new Date(l.date as string)
    const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 30
  }).length
  const completionRate = Math.round((last30 / 30) * 100)

  const isCompletedToday = targetCount > 1 ? todayCount >= targetCount : logDates.includes(today)

  return {
    id: apiHabit.id as string,
    name: apiHabit.name as string,
    description: (apiHabit.description as string) || '',
    icon: (apiHabit.icon as string) || '✅',
    color: colorClass,
    colorHex: color,
    frequency: (apiHabit.frequency as string) || 'daily',
    targetCount,
    unit: (apiHabit.unit as string) || 'session',
    todayCount,
    tags: (apiHabit.tags as Record<string, unknown>[])?.map((t: Record<string, unknown>) => ((t.tag as Record<string, unknown>)?.name as string) || '').filter(Boolean) || [],
    logs: logDates,
    streak,
    completionRate,
    isCompletedToday,
    createdAt: apiHabit.createdAt as string,
    updatedAt: apiHabit.updatedAt as string,
  }
}

function CircularProgress({ value, size = 44, strokeWidth = 3.5, color = 'var(--accent-primary)' }: { value: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700 ease-out" />
    </svg>
  )
}

// Sound feedback component
function SoundIndicator({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="absolute -top-1 -right-1 flex items-center justify-center"
        >
          <div className="relative">
            <Volume2 className="h-3 w-3 text-emerald-500" />
            <div className="absolute inset-0 animate-sound-pulse">
              <Volume2 className="h-3 w-3 text-emerald-500 opacity-50" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Habit streak reminder banner
function StreakReminderBanner({ habits }: { habits: { streak: number; name: string; isCompletedToday: boolean; icon: string }[] }) {
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('lifeos-streak-banner-dismissed') === 'true' } catch { return false }
  })

  if (dismissed || habits.length === 0) return null

  // Find habits with active streaks >= 3
  const streakHabits = habits.filter(h => h.streak >= 3)
  const maxStreakHabit = streakHabits.length > 0
    ? streakHabits.reduce((max, h) => h.streak > max.streak ? h : max, streakHabits[0])
    : null

  // Find habits at risk (streak > 0, not completed today)
  const atRiskHabits = habits.filter(h => h.streak > 0 && !h.isCompletedToday)
  const highestRiskHabit = atRiskHabits.length > 0
    ? atRiskHabits.reduce((max, h) => h.streak > max.streak ? h : max, atRiskHabits[0])
    : null

  let message = ''
  let StreakIcon: React.ComponentType<{ className?: string }> = Sparkles

  if (maxStreakHabit) {
    StreakIcon = Flame
    message = t('habits.streakOnFire', { count: String(maxStreakHabit.streak) })
  } else if (highestRiskHabit) {
    StreakIcon = AlertTriangle
    message = t('habits.streakAtRisk', { count: String(highestRiskHabit.streak), name: highestRiskHabit.name })
  } else {
    StreakIcon = Sparkles
    message = t('habits.startNewHabit')
  }

  const handleDismiss = () => {
    setDismissed(true)
    try { sessionStorage.setItem('lifeos-streak-banner-dismissed', 'true') } catch {}
  }

  return (
    <Card className="motivational-gradient overflow-hidden relative">
      <CardContent className="p-4 pr-10">
        <div className="flex items-center gap-3">
          <StreakIcon className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{message}</p>
        </div>
      </CardContent>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-emerald-600/50 hover:text-emerald-600 dark:text-emerald-400/50 dark:hover:text-emerald-400"
        onClick={handleDismiss}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </Card>
  )
}

// Motivational message component
function MotivationalBanner({ show, habitCount }: { show: boolean; habitCount: number }) {
  const { t } = useTranslation()
  if (!show) return null

  const messages: Array<{ icon: React.ComponentType<{ className?: string }>; text: string; subtext: string }> = [
    { icon: Trophy, text: t('habits.allHabitsComplete'), subtext: t('habits.keepTomorrow') },
    { icon: Star, text: t('habits.perfectDay'), subtext: t('habits.habitsCheckedOff', { count: String(habitCount) }) },
    { icon: Target, text: t('habits.hundredPercent'), subtext: t('habits.consistencyKey') },
  ]
  const msg = messages[Math.floor(Math.random() * messages.length)]

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
      className="motivational-gradient rounded-xl p-4 border border-emerald-200/50 dark:border-emerald-800/30"
    >
      <div className="flex items-center gap-3">
        <msg.icon className="size-7 shrink-0 text-emerald-500 dark:text-emerald-400 animate-bounce-in" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{msg.text}</p>
          </div>
          <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60 mt-0.5">{msg.subtext}</p>
        </div>
        <Sparkles className="h-5 w-5 text-emerald-500/40" />
      </div>
    </motion.div>
  )
}

export function HabitsPage() {
  const { accentColor } = useAppStore()
  const { t } = useTranslation()
  const accentHexMap: Record<string, string> = {
    emerald: '#10b981', teal: '#14b8a6', amber: '#f59e0b',
    rose: '#f43f5e', violet: '#8b5cf6', cyan: '#06b6d4',
    indigo: '#6366f1', pink: '#ec4899', lime: '#84cc16', sky: '#0ea5e9',
  }
  const accentHex = accentHexMap[accentColor] || '#10b981'
  const { data: apiHabits, isLoading } = useHabits()
  const createHabitMutation = useCreateHabit()
  const updateHabitMutation = useUpdateHabit()
  const deleteHabitMutation = useDeleteHabit()
  const logHabitMutation = useLogHabit()

  const habits = useMemo(() => {
    if (!apiHabits) return []
    return (apiHabits as Record<string, unknown>[]).map(mapApiHabit)
  }, [apiHabits])

  const [habitView, setHabitView] = useState<'list' | 'calendar' | 'analytics'>('list')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editHabit, setEditHabit] = useState<{ id: string; name: string; description: string; frequency: string; color: string; icon: string; targetCount: number; unit: string } | null>(null)
  const [newHabit, setNewHabit] = useState({ name: '', description: '', frequency: 'daily', color: '#10b981', icon: '✅', targetCount: 1, unit: 'session' })
  const [soundIndicator, setSoundIndicator] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const todayCompleted = useMemo(() => habits.filter(h => h.isCompletedToday).length, [habits])
  const overallCompletion = useMemo(() => habits.length > 0 ? Math.round((todayCompleted / habits.length) * 100) : 0, [todayCompleted, habits.length])
  const bestStreak = useMemo(() => Math.max(...habits.map(h => h.streak), 0), [habits])
  const longestStreakHabit = useMemo(() => habits.find(h => h.streak === bestStreak), [habits, bestStreak])
  const avgCompletion = useMemo(() => habits.length > 0 ? Math.round(habits.reduce((acc, h) => acc + h.completionRate, 0) / habits.length) : 0, [habits])
  const allCompleted = useMemo(() => habits.length > 0 && todayCompleted === habits.length, [habits.length, todayCompleted])

  const toggleHabitToday = useCallback((habitId: string) => {
    const habit = habits.find(h => h.id === habitId)
    if (!habit) return
    if (!habit.isCompletedToday) {
      logHabitMutation.mutate({ habitId, date: today, count: 1 })
      setSoundIndicator(habitId)
      setTimeout(() => setSoundIndicator(null), 600)
      showToast.success(t('toast.completed'))
    }
  }, [habits, logHabitMutation, today, t])

  const incrementHabitCount = useCallback((habitId: string) => {
    const habit = habits.find(h => h.id === habitId)
    if (!habit || habit.todayCount >= habit.targetCount) return
    const newCount = habit.todayCount + 1
    logHabitMutation.mutate({ habitId, date: today, count: newCount })
    if (newCount >= habit.targetCount) {
      setSoundIndicator(habitId)
      setTimeout(() => setSoundIndicator(null), 600)
      showToast.success(t('toast.completed'))
    }
  }, [habits, logHabitMutation, today, t])

  const decrementHabitCount = useCallback((habitId: string) => {
    const habit = habits.find(h => h.id === habitId)
    if (!habit || habit.todayCount <= 0) return
    logHabitMutation.mutate({ habitId, date: today, count: Math.max(0, habit.todayCount - 1) })
  }, [habits, logHabitMutation, today])

  const handleAddHabit = useCallback(() => {
    if (!newHabit.name.trim()) return
    createHabitMutation.mutate({
      name: newHabit.name,
      description: newHabit.description,
      icon: newHabit.icon,
      color: newHabit.color,
      frequency: newHabit.frequency,
      targetCount: newHabit.targetCount,
      unit: newHabit.unit,
    }, {
      onSuccess: () => {
        setNewHabit({ name: '', description: '', frequency: 'daily', color: '#10b981', icon: '✅', targetCount: 1, unit: 'session' })
        setCreateDialogOpen(false)
        showToast.success(t('toast.created'))
      }
    })
  }, [newHabit, createHabitMutation, t])

  const openEditDialog = useCallback((habit: typeof habits[0]) => {
    setEditHabit({ id: habit.id, name: habit.name, description: habit.description, frequency: habit.frequency, color: habit.colorHex, icon: habit.icon, targetCount: habit.targetCount, unit: habit.unit })
    setEditDialogOpen(true)
  }, [])

  const handleUpdateHabit = useCallback(() => {
    if (!editHabit || !editHabit.name.trim()) return
    updateHabitMutation.mutate({
      id: editHabit.id,
      name: editHabit.name,
      description: editHabit.description,
      frequency: editHabit.frequency,
      color: editHabit.color,
      icon: editHabit.icon,
      targetCount: editHabit.targetCount,
      unit: editHabit.unit,
    }, {
      onSuccess: () => {
        setEditDialogOpen(false)
        setEditHabit(null)
        showToast.success(t('toast.saved'))
      }
    })
  }, [editHabit, updateHabitMutation, t])

  const deleteHabit = useCallback((id: string) => {
    deleteHabitMutation.mutate(id)
    showToast.info(t('toast.deleted'))
  }, [deleteHabitMutation, t])

  const heatmapData = useMemo(() => {
    const weeks = 12; const data: number[][] = []; const todayDate = new Date()
    for (let w = weeks - 1; w >= 0; w--) { const week: number[] = []; for (let d = 0; d < 7; d++) { const date = new Date(todayDate); date.setDate(date.getDate() - (w * 7 + (6 - d))); const dateStr = date.toISOString().split('T')[0]; week.push(habits.filter(h => h.logs.includes(dateStr)).length) } data.push(week) }
    return data
  }, [habits])

  const heatmapMax = useMemo(() => Math.max(...heatmapData.flat(), 1), [heatmapData])

  const weeklyRate = useMemo(() => {
    const last7 = habits.map(h => h.logs.filter(d => { const diff = (Date.now() - new Date(d).getTime()) / (1000*60*60*24); return diff <= 7 }).length)
    return habits.length > 0 ? Math.round(last7.reduce((a, b) => a + b, 0) / (habits.length * 7) * 100) : 0
  }, [habits])

  // Heatmap color scale - improved with better gradients
  const getHeatmapColor = (count: number, max: number) => {
    if (count === 0) return 'var(--color-muted)'
    const intensity = count / max
    if (intensity <= 0.2) return `${accentHex}26`
    if (intensity <= 0.4) return `${accentHex}4d`
    if (intensity <= 0.6) return `${accentHex}8c`
    if (intensity <= 0.8) return `${accentHex}bf`
    return `${accentHex}e6`
  }

  return (
    <div className="p-[var(--lifeos-card-padding)] max-w-5xl mx-auto space-y-[var(--lifeos-section-gap)] animate-page-enter">
      {/* Streak Reminder Banner */}
      <StreakReminderBanner habits={habits} />

      {/* Motivational Banner - shows when all habits completed */}
      <MotivationalBanner show={allCompleted} habitCount={habits.length} />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[var(--lifeos-list-gap)]">
        <Card className="overflow-hidden relative micro-hover">
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(to right, ${accentHex}, ${accentHex}cc)` }} />
          <CardContent className="p-[var(--lifeos-card-padding)]">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4" style={{ color: accentHex }} />
              <span className="text-xs text-muted-foreground">{t('habits.today')}</span>
            </div>
            <p className="text-2xl font-bold">{todayCompleted}/{habits.length}</p>
            <Progress value={overallCompletion} className="h-1.5 mt-2" data-today-progress />
            <style>{`[data-today-progress] > div { background: linear-gradient(to right, ${accentHex}, ${accentHex}cc) !important; }`}</style>
          </CardContent>
        </Card>
        <Card className="overflow-hidden relative micro-hover">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-red-500" />
          <CardContent className="p-[var(--lifeos-card-padding)]">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">{t('habits.bestStreak')}</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{bestStreak} <span className="text-sm font-normal text-muted-foreground">{t('habits.days')}</span></p>
              {bestStreak >= 7 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 text-[10px] font-medium" style={{ '--flame-scale': `${Math.min(1 + bestStreak * 0.03, 1.5)}` } as React.CSSProperties}>
                  <Flame className="h-3 w-3 animate-fire animate-flame-grow" />
                </div>
              )}
            </div>
            {longestStreakHabit && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{longestStreakHabit.icon} {longestStreakHabit.name}</p>}
          </CardContent>
        </Card>
        <Card className="overflow-hidden relative micro-hover">
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(to right, ${accentHex}cc, ${accentHex})` }} />
          <CardContent className="p-[var(--lifeos-card-padding)]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4" style={{ color: accentHex }} />
              <span className="text-xs text-muted-foreground">{t('habits.completionRate')}</span>
            </div>
            <p className="text-2xl font-bold">{avgCompletion}%</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden relative micro-hover">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <CardContent className="p-[var(--lifeos-card-padding)]">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">{t('habits.thisWeek')}</span>
            </div>
            <p className="text-2xl font-bold">{weeklyRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Habit Streak Calendar */}
      {longestStreakHabit && (
        <HabitStreakCalendar
          habitLogs={longestStreakHabit.logs.map(d => ({ date: d }))}
          streak={longestStreakHabit.streak}
        />
      )}

      {/* Edit Habit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{t('edit')} {t('habits.title')}</DialogTitle><DialogDescription className="sr-only">Edit habit</DialogDescription></DialogHeader>
          {editHabit && (
            <div className="space-y-4 py-2">
              <div><label className="text-sm font-medium mb-1.5 block">{t('habits.name')}</label><Input value={editHabit.name} onChange={e => setEditHabit(p => p && ({ ...p, name: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">{t('habits.description')}</label><Input placeholder={t('habits.briefDescription')} value={editHabit.description} onChange={e => setEditHabit(p => p && ({ ...p, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1.5 block">{t('habits.frequency')}</label><Select value={editHabit.frequency} onValueChange={v => setEditHabit(p => p && ({ ...p, frequency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">{t('habits.daily')}</SelectItem><SelectItem value="weekly">{t('habits.weekly')}</SelectItem><SelectItem value="custom">{t('custom')}</SelectItem></SelectContent></Select></div>
                <div><label className="text-sm font-medium mb-1.5 block">{t('habits.color')}</label><div className="flex gap-1.5 mt-1">{habitColors.map(c => { const hex = habitColorMap[c]; return <button key={c} className={cn('w-6 h-6 rounded-full transition-transform', c, editHabit.color === hex ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105')} onClick={() => setEditHabit(p => p && ({ ...p, color: hex }))} /> })}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5"><Hash className="h-3.5 w-3.5 text-muted-foreground" />Günlük Hedef</label>
                  <div className="flex items-center gap-2">
                    <button className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-accent" onClick={() => setEditHabit(p => p && ({ ...p, targetCount: Math.max(1, p.targetCount - 1) }))}><Minus className="h-3 w-3" /></button>
                    <span className="text-sm font-medium w-8 text-center">{editHabit.targetCount}</span>
                    <button className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-accent" onClick={() => setEditHabit(p => p && ({ ...p, targetCount: Math.min(99, p.targetCount + 1) }))}><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Birim</label>
                  <Input placeholder="glass, km, min..." value={editHabit.unit} onChange={e => setEditHabit(p => p && ({ ...p, unit: e.target.value }))} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter><DialogClose asChild><Button variant="outline">{t('cancel')}</Button></DialogClose><Button onClick={handleUpdateHabit} disabled={updateHabitMutation.isPending}>{t('save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Tabs & Add Button */}
      <div className="flex items-center justify-between">
        <Tabs value={habitView} onValueChange={v => setHabitView(v as typeof habitView)}>
          <TabsList className="h-8">
            <TabsTrigger value="list" className="text-xs px-3 h-6"><List className="h-3.5 w-3.5 mr-1" />{t('tasks.list')}</TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs px-3 h-6"><Calendar className="h-3.5 w-3.5 mr-1" />{t('calendar.title')}</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs px-3 h-6"><BarChart3 className="h-3.5 w-3.5 mr-1" />{t('habits.heatmap')}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />{t('habits.newHabit')}</Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader><DialogTitle>{t('habits.newHabit')}</DialogTitle><DialogDescription className="sr-only">{t('habits.createHabitSrOnly')}</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              <div><label className="text-sm font-medium mb-1.5 block">{t('habits.name')}</label><Input placeholder={t('habits.habitName') + '...'} value={newHabit.name} onChange={e => setNewHabit(p => ({ ...p, name: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">{t('habits.description')}</label><Input placeholder={t('habits.briefDescription')} value={newHabit.description} onChange={e => setNewHabit(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1.5 block">{t('habits.frequency')}</label><Select value={newHabit.frequency} onValueChange={v => setNewHabit(p => ({ ...p, frequency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">{t('habits.daily')}</SelectItem><SelectItem value="weekly">{t('habits.weekly')}</SelectItem><SelectItem value="custom">{t('custom')}</SelectItem></SelectContent></Select></div>
                <div><label className="text-sm font-medium mb-1.5 block">{t('habits.color')}</label><div className="flex gap-1.5 mt-1">{habitColors.map(c => { const hex = habitColorMap[c]; return <button key={c} className={cn('w-6 h-6 rounded-full transition-transform', c, newHabit.color === hex ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105')} onClick={() => setNewHabit(p => ({ ...p, color: hex }))} /> })}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5"><Hash className="h-3.5 w-3.5 text-muted-foreground" />Günlük Hedef</label>
                  <div className="flex items-center gap-2">
                    <button className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-accent" onClick={() => setNewHabit(p => ({ ...p, targetCount: Math.max(1, p.targetCount - 1) }))}><Minus className="h-3 w-3" /></button>
                    <span className="text-sm font-medium w-8 text-center">{newHabit.targetCount}</span>
                    <button className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-accent" onClick={() => setNewHabit(p => ({ ...p, targetCount: Math.min(99, p.targetCount + 1) }))}><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Birim</label>
                  <Input placeholder="glass, km, min..." value={newHabit.unit} onChange={e => setNewHabit(p => ({ ...p, unit: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter><DialogClose asChild><Button variant="outline">{t('cancel')}</Button></DialogClose><Button onClick={handleAddHabit} disabled={createHabitMutation.isPending}>{t('create')}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : habitView === 'list' && (
        <div className="space-y-3">
          {habits.map((habit, idx) => {
            const color = habitColorMap[habit.color] || habit.colorHex || '#10b981'
            return (
              <motion.div key={habit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card className="hover:shadow-md transition-all duration-200 overflow-hidden relative micro-hover">
                  <div className={cn('absolute left-0 top-0 bottom-0 w-1', habit.color)} />
                  <CardContent className="p-4 pl-5">
                    <div className="flex items-center gap-4">
                      {/* Counter UI for targetCount > 1, checkbox for simple habits */}
                      {habit.targetCount > 1 ? (
                        <div className="relative shrink-0 flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <button
                              className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-40"
                              onClick={() => decrementHabitCount(habit.id)}
                              disabled={habit.todayCount <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <div className="w-10 text-center">
                              <span className="text-sm font-bold" style={{ color }}>{habit.todayCount}</span>
                              <span className="text-xs text-muted-foreground">/{habit.targetCount}</span>
                            </div>
                            <button
                              className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-40"
                              onClick={() => incrementHabitCount(habit.id)}
                              disabled={habit.todayCount >= habit.targetCount}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="w-16 h-1 rounded-full bg-muted/50 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (habit.todayCount / habit.targetCount) * 100)}%`, background: color }} />
                          </div>
                          <SoundIndicator show={soundIndicator === habit.id} />
                        </div>
                      ) : (
                      <button
                        className="relative shrink-0 cursor-pointer"
                        onClick={() => toggleHabitToday(habit.id)}
                      >
                        <CircularProgress
                          value={habit.isCompletedToday ? 100 : habit.completionRate}
                          size={48}
                          strokeWidth={3.5}
                          color={color}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          {habit.isCompletedToday ? (
                            <CheckCircle2 className={cn("h-5 w-5 animate-check-pop")} style={{ color }} />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground/30" />
                          )}
                        </div>
                        {/* Sound feedback indicator */}
                        <SoundIndicator show={soundIndicator === habit.id} />
                      </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{habit.icon}</span>
                          <h3 className={cn('font-medium text-sm', habit.isCompletedToday && 'line-through text-muted-foreground')}>{habit.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{habit.description}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Flame className={cn('h-4 w-4', habit.streak >= 7 ? 'text-orange-500 animate-fire' : habit.streak > 0 ? 'text-orange-400' : 'text-muted-foreground')} />
                          <span className={cn('text-sm font-semibold', habit.streak >= 7 && 'text-orange-600 dark:text-orange-400')}>{habit.streak}</span>
                          <span className="text-xs text-muted-foreground">{t('habits.days')}</span>
                        </div>
                        <div className="text-right min-w-[48px]">
                          <p className="text-sm font-semibold">{habit.completionRate}%</p>
                          <p className="text-[10px] text-muted-foreground">{t('habits.completion')}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(habit)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => deleteHabit(habit.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
          {habits.length === 0 && (
            <div className="text-center py-12 text-muted-foreground animate-bounce-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, ${accentHex}20, ${accentHex}10)` }}>
                <Flame className="h-8 w-8" style={{ color: accentHex }} />
              </div>
              <p className="text-sm font-semibold">{t('habits.noHabits')}</p>
              <p className="text-xs mt-1 max-w-[200px] mx-auto text-muted-foreground/70">{t('habits.noHabitsDesc')}</p>
              <div className="mt-3 flex items-center justify-center gap-1 text-xs" style={{ color: accentHex }}>
                <Plus className="h-3 w-3" />
                <span>{t('habits.newHabit')}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {habitView === 'calendar' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('habits.heatmap')}</CardTitle>
            <CardDescription>{t('habits.thisMonth')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="w-8" />
                {[t('days.mon'), t('days.tue'), t('days.wed'), t('days.thu'), t('days.fri'), t('days.sat'), t('days.sun')].map(d => (<span key={d} className="w-6 text-center">{d.slice(0, 2)}</span>))}
              </div>
              {heatmapData.map((week, wi) => (
                <div key={wi} className="flex items-center gap-1">
                  <span className="w-8 text-xs text-muted-foreground">{wi % 2 === 0 ? `W${wi + 1}` : ''}</span>
                  {week.map((count, di) => {
                    const todayDate = new Date()
                    return (
                      <motion.div
                        key={di}
                        whileHover={{ scale: 1.3, zIndex: 10 }}
                        className="w-6 h-6 rounded-sm transition-colors duration-200 cursor-pointer hover:ring-2 relative group"
                        style={{ backgroundColor: getHeatmapColor(count, heatmapMax) }}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center px-2 py-1 rounded-md bg-popover text-popover-foreground text-[10px] font-medium shadow-md border border-border whitespace-nowrap z-20">
                          {count} {count !== 1 ? t('habits.habitCountPlural') : t('habits.habitCount')}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ))}
              {/* Improved heatmap legend */}
              <div className="flex items-center gap-2 pt-3">
                <span className="text-xs text-muted-foreground">{t('habits.less')}</span>
                <div className="flex gap-1">
                  {[0, 0.15, 0.3, 0.55, 0.9].map((intensity, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-sm transition-colors"
                      style={{ backgroundColor: intensity === 0 ? 'var(--color-muted)' : `${accentHex}${Math.round(intensity * 255).toString(16).padStart(2, '0')}` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{t('habits.more')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {habitView === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {habits.map(habit => {
            const color = habitColorMap[habit.color] || habit.colorHex || '#10b981'
            return (
              <Card key={habit.id} className="overflow-hidden shadow-card hover:shadow-md transition-all duration-200 micro-hover">
                <div className={cn('h-1', habit.color)} />
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span>{habit.icon}</span>
                    <h3 className="font-medium text-sm">{habit.name}</h3>
                    <Badge variant="outline" className="text-[10px] ml-auto">{habit.frequency}</Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">{t('habits.completionRate')}</span><span className="font-semibold" style={{ color }}>{habit.completionRate}%</span></div>
                    <Progress value={habit.completionRate} className="h-2" />
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="text-center p-2 rounded-lg bg-accent/50"><p className="text-lg font-bold">{habit.streak}</p><p className="text-[10px] text-muted-foreground">{t('habits.streak')}</p></div>
                      <div className="text-center p-2 rounded-lg bg-accent/50"><p className="text-lg font-bold">{habit.logs.length}</p><p className="text-[10px] text-muted-foreground">{t('habits.days')}</p></div>
                      <div className="text-center p-2 rounded-lg bg-accent/50"><p className="text-lg font-bold">{habit.isCompletedToday ? '✓' : '○'}</p><p className="text-[10px] text-muted-foreground">{t('habits.today')}</p></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

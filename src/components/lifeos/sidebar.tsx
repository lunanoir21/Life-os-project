'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAppStore, type ModuleId } from '@/stores/app-store'
import { useTranslation } from '@/lib/i18n'
import {
  LayoutDashboard,
  CheckSquare,
  StickyNote,
  Repeat,
  BookOpen,
  Wallet,
  Target,
  GraduationCap,
  CalendarDays,
  Timer,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  Maximize2,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useIsMobile } from '@/hooks/use-mobile'
import { useTasks, useHabits } from '@/lib/api/hooks'
import { motion, AnimatePresence } from 'framer-motion'

interface NavItem {
  id: ModuleId
  label: string
  icon: React.ElementType
  color: string
}

// Animated counter component for quick stats
function AnimatedStat({ value, label, icon: Icon, color }: { value: number; label: string; icon: React.ElementType; color: string }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (value === 0) return
    const duration = 600
    const steps = 20
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])

  return (
    <div className="flex items-center gap-2">
      <div className={cn('p-1.5 rounded-md', color)}>
        <Icon className="h-3 w-3" />
      </div>
      <div>
        <p className="text-sm font-bold leading-none">{displayValue}</p>
        <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// Mini circular progress ring for productivity score
function MiniProgressRing({ percentage, size = 24, strokeWidth = 3 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted-foreground/20"
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
        style={{ color: 'var(--accent-primary)' }}
      />
    </svg>
  )
}

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const { activeModule, setActiveModule, setMobileSidebarOpen, enabledModules } = useAppStore()
  const { t } = useTranslation()
  const { data: apiTasks } = useTasks()
  const { data: apiHabits } = useHabits()

  // Nav sections with translated labels
  const navSections = useMemo(() => [
    {
      title: t('nav.overview'),
      items: [
        { id: 'dashboard' as ModuleId, label: t('nav.dashboard'), icon: LayoutDashboard, color: 'text-emerald-500' },
      ],
    },
    {
      title: t('nav.productivity'),
      items: [
        { id: 'tasks' as ModuleId, label: t('nav.tasks'), icon: CheckSquare, color: 'text-orange-500' },
        { id: 'notes' as ModuleId, label: t('nav.notes'), icon: StickyNote, color: 'text-amber-500' },
        { id: 'calendar' as ModuleId, label: t('nav.calendar'), icon: CalendarDays, color: 'text-sky-600' },
        { id: 'time' as ModuleId, label: t('nav.timeTracker'), icon: Timer, color: 'text-slate-500' },
      ],
    },
    {
      title: t('nav.wellness'),
      items: [
        { id: 'habits' as ModuleId, label: t('nav.habits'), icon: Repeat, color: 'text-teal-500' },
        { id: 'journal' as ModuleId, label: t('nav.journal'), icon: BookOpen, color: 'text-rose-500' },
      ],
    },
    {
      title: t('nav.growth'),
      items: [
        { id: 'goals' as ModuleId, label: t('nav.goals'), icon: Target, color: 'text-violet-500' },
        { id: 'learning' as ModuleId, label: t('nav.learning'), icon: GraduationCap, color: 'text-cyan-600' },
        { id: 'finance' as ModuleId, label: t('nav.finance'), icon: Wallet, color: 'text-emerald-600' },
      ],
    },
  ], [t])

  // Calculate quick stats
  const taskCount = (() => {
    if (!apiTasks) return 0
    const tasks = apiTasks as Record<string, unknown>[]
    return tasks.filter(t => (t.status as string) !== 'done').length
  })()

  const completedTaskCount = (() => {
    if (!apiTasks) return 0
    const tasks = apiTasks as Record<string, unknown>[]
    return tasks.filter(t => (t.status as string) === 'done').length
  })()

  const totalTaskCount = (() => {
    if (!apiTasks) return 0
    return (apiTasks as Record<string, unknown>[]).length
  })()

  const bestStreak = (() => {
    if (!apiHabits) return 0
    const habits = apiHabits as Record<string, unknown>[]
    let maxStreak = 0
    for (const habit of habits) {
      const logs = (habit.logs as Record<string, unknown>[]) || []
      const logDates = logs.map((l: Record<string, unknown>) => {
        const d = l.date as string
        return d ? d.split('T')[0] : ''
      }).filter(Boolean).sort().reverse()

      let streak = 0
      const checkDate = new Date()
      for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0]
        if (logDates.includes(dateStr)) {
          streak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else if (i === 0) {
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }
      maxStreak = Math.max(maxStreak, streak)
    }
    return maxStreak
  })()

  // Calculate productivity score
  const productivityScore = useMemo(() => {
    const totalHabits = apiHabits ? (apiHabits as Record<string, unknown>[]).length : 0
    const today = new Date().toISOString().split('T')[0]
    const completedHabits = apiHabits
      ? (apiHabits as Record<string, unknown>[]).filter(h => {
          const logs = (h.logs as Record<string, unknown>[]) || []
          return logs.some(l => {
            const d = l.date as string
            return d && d.split('T')[0] === today
          })
        }).length
      : 0

    if (totalTaskCount === 0 && totalHabits === 0) return 0

    const taskScore = totalTaskCount > 0 ? (completedTaskCount / totalTaskCount) * 100 : 0
    const habitScore = totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0

    // Average only the sections that have data
    const scores: number[] = []
    if (totalTaskCount > 0) scores.push(taskScore)
    if (totalHabits > 0) scores.push(habitScore)

    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  }, [apiTasks, apiHabits, completedTaskCount, totalTaskCount])

  const handleNav = (id: ModuleId) => {
    setActiveModule(id)
    setMobileSidebarOpen(false)
  }

  // Filter nav sections based on enabled modules (always show dashboard and settings)
  const filteredSections = navSections.map(section => ({
    ...section,
    items: section.items.filter(item =>
      enabledModules.includes(item.id) || item.id === 'dashboard'
    )
  })).filter(section => section.items.length > 0)

  return (
    <div className="flex flex-col h-full">
      {/* Logo area - Workspace indicator with user avatar */}
      <div className={cn(
        'flex items-center gap-3 px-4 h-16 border-b border-border/50 shrink-0',
        collapsed && 'justify-center px-2'
      )}>
        <div className="relative shrink-0">
          <Avatar className="h-8 w-8 ring-2" style={{ '--tw-ring-color': 'var(--accent-primary)' } as React.CSSProperties}>
            <AvatarFallback className="text-white text-xs font-bold" style={{ background: `linear-gradient(135deg, var(--accent-primary), var(--accent-primary-light))` }}>
              U
            </AvatarFallback>
          </Avatar>
          {/* Online status indicator */}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-background animate-live-dot" style={{ backgroundColor: 'var(--accent-primary)' }} />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm tracking-tight truncate">{t('appName')}</span>
            <div className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" style={{ color: 'var(--accent-primary)' }} />
              <span className="text-[10px] text-muted-foreground tabular-nums font-mono">{new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-4 px-2">
          <TooltipProvider delayDuration={0}>
            {filteredSections.map((section) => (
              <div key={section.title}>
                {!collapsed && (
                  <div className="px-3 mb-1 pt-2 border-t border-border/20 first:border-t-0 first:pt-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                      {section.title}
                    </p>
                  </div>
                )}
                <div className="space-y-0.5">
                  {section.items.map((mod) => {
                    const isActive = activeModule === mod.id
                    const Icon = mod.icon
                    const bgColorClass = mod.color.replace('text-', 'bg-')

                    const buttonContent = (
                      <>
                        {isActive && (
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-7 rounded-r-full transition-all duration-300 sidebar-active-glow"
                            style={{ background: `linear-gradient(to bottom, var(--accent-primary), var(--accent-primary-light))` }}
                          />
                        )}
                        <Icon className={cn(
                          'h-[18px] w-[18px] shrink-0 transition-all duration-200',
                          isActive ? mod.color : 'group-hover:text-foreground'
                        )} />
                        {!collapsed && (
                          <span className="truncate transition-all duration-200">{mod.label}</span>
                        )}
                        {!collapsed && isActive && (
                          <div className={cn('ml-auto w-1.5 h-1.5 rounded-full animate-pulse-soft', bgColorClass)} />
                        )}
                      </>
                    )

                    if (collapsed) {
                      return (
                        <Tooltip key={mod.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleNav(mod.id)}
                              className={cn(
                                'w-full flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative animate-nav-ripple',
                                isActive
                                  ? 'bg-accent text-accent-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 active:scale-[0.96]'
                              )}
                            >
                              {buttonContent}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="font-medium">
                            {mod.label}
                          </TooltipContent>
                        </Tooltip>
                      )
                    }

                    return (
                      <motion.button
                        key={mod.id}
                        onClick={() => handleNav(mod.id)}
                        whileHover={{ scale: 1.01, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 group relative px-3 py-2 animate-nav-ripple hover-left-glow',
                          isActive
                            ? 'bg-accent text-accent-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                        )}
                      >
                        {buttonContent}
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            ))}
          </TooltipProvider>
        </nav>
      </ScrollArea>

      {/* Quick Stats Mini-Section */}
      {!collapsed && (
        <div className="shrink-0 px-3 py-2 border-t border-border/30">
          <div className="flex items-center justify-between gap-2">
            <AnimatedStat value={taskCount} label={t('sidebarStats.openTasks')} icon={CheckSquare} color="bg-orange-500/10 text-orange-500" />
            <AnimatedStat value={bestStreak} label={t('sidebarStats.bestStreak')} icon={Flame} color="bg-orange-500/10 text-orange-500" />
          </div>
        </div>
      )}
      {collapsed && (
        <div className="shrink-0 px-2 py-2 border-t border-border/30">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center gap-1.5 py-1">
                  <CheckCircle2 className="h-3 w-3 text-orange-500" />
                  <span className="text-[10px] font-bold">{taskCount}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{taskCount} {t('sidebarStats.openTasks').toLowerCase()}, {bestStreak} {t('sidebarStats.bestStreak').toLowerCase()}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Productivity Score Indicator */}
      {!collapsed && (
        <div className="shrink-0 px-3 py-2.5 border-t border-border/30">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1.5">{t('sidebarStats.productivity')}</p>
          <div className="flex items-center gap-2.5">
            <MiniProgressRing percentage={productivityScore} size={24} strokeWidth={3} />
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                {productivityScore}%
              </span>
              <TrendingUp className="h-3 w-3 text-muted-foreground/40" />
            </div>
          </div>
        </div>
      )}
      {collapsed && (
        <div className="shrink-0 px-2 py-2 border-t border-border/30">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center gap-1 py-0.5">
                  <MiniProgressRing percentage={productivityScore} size={20} strokeWidth={2.5} />
                  <span className="text-[8px] font-bold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                    {productivityScore}%
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{t('sidebarStats.productivity')}: {productivityScore}%</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Bottom section - Settings & Focus Mode */}
      <div className="shrink-0 border-t border-border/50 p-2 space-y-1">
        {!collapsed && (
          <button
            onClick={() => useAppStore.getState().toggleFocusMode()}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 relative hover-left-glow text-muted-foreground hover:text-foreground hover:bg-accent/50"
          >
            <Maximize2 className="h-[18px] w-[18px] shrink-0" />
            <span>{t('nav.focusMode')}</span>
          </button>
        )}
        {collapsed && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => useAppStore.getState().toggleFocusMode()}
                  className="w-full flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative hover:shadow-sm hover:shadow-emerald-500/5 text-muted-foreground hover:text-foreground hover:bg-accent/50"
                >
                  <Maximize2 className="h-[18px] w-[18px] shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{t('nav.focusMode')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <TooltipProvider delayDuration={0}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleNav('settings')}
                  className={cn(
                    'w-full flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative hover:shadow-sm hover:shadow-emerald-500/5 animate-nav-ripple',
                    activeModule === 'settings'
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  {activeModule === 'settings' && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-6 rounded-r-full sidebar-active-glow" style={{ background: `linear-gradient(to bottom, var(--accent-primary), var(--accent-primary-light))` }} />
                  )}
                  <Settings className="h-[18px] w-[18px] shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{t('nav.settings')}</TooltipContent>
            </Tooltip>
          ) : (
            <motion.button
              onClick={() => handleNav('settings')}
              whileHover={{ scale: 1.01, x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative hover:shadow-sm animate-nav-ripple',
                activeModule === 'settings'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              {activeModule === 'settings' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-6 rounded-r-full sidebar-active-glow" style={{ background: `linear-gradient(to bottom, var(--accent-primary), var(--accent-primary-light))` }} />
              )}
              <Settings className="h-[18px] w-[18px] shrink-0" />
              <span>{t('nav.settings')}</span>
            </motion.button>
          )}
        </TooltipProvider>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useAppStore()
  const isMobile = useIsMobile()

  // Mobile sidebar - Sheet/drawer
  if (isMobile) {
    return (
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-background">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent collapsed={false} />
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop sidebar
  return (
    <aside
      className={cn(
        'relative h-screen border-r border-border/50 transition-all duration-300 shrink-0',
        sidebarCollapsed ? 'w-[68px]' : 'w-60'
      )}
      style={{ background: 'linear-gradient(to bottom, color-mix(in srgb, var(--accent-primary) 8%, var(--background)), var(--background))' }}
    >
      <SidebarContent collapsed={sidebarCollapsed} />
      {/* Collapse toggle button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute -right-3 top-20 z-10 h-6 w-6 rounded-full border bg-background shadow-sm hover:bg-accent transition-all duration-200"
        onClick={toggleSidebar}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </aside>
  )
}

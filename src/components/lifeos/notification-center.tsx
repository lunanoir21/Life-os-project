'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Bell,
  CheckSquare,
  Repeat,
  Target,
  Wallet,
  BookOpen,
  Info,
  CheckCheck,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNotifications, type NotificationItem } from '@/lib/api/hooks'
import { useAppStore, type ModuleId } from '@/stores/app-store'
import { motion, AnimatePresence } from 'framer-motion'

function cn(...inputs: (string | undefined | false)[]) {
  return inputs.filter(Boolean).join(' ')
}

// ─── Category System ───────────────────────────────────────────────

type NotificationCategory = 'tasks' | 'habits' | 'goals' | 'finance' | 'journal' | 'system'

interface CategoryConfig {
  label: string
  icon: typeof Bell
  color: string
  bgColor: string
  borderColor: string
  dotColor: string
  hoverBg: string
}

const categoryConfig: Record<NotificationCategory, CategoryConfig> = {
  tasks: {
    label: 'Tasks',
    icon: CheckSquare,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-950/40',
    borderColor: 'border-l-orange-500',
    dotColor: 'bg-orange-500',
    hoverBg: 'hover:bg-orange-50 dark:hover:bg-orange-950/20',
  },
  habits: {
    label: 'Habits',
    icon: Repeat,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-100 dark:bg-teal-950/40',
    borderColor: 'border-l-teal-500',
    dotColor: 'bg-teal-500',
    hoverBg: 'hover:bg-teal-50 dark:hover:bg-teal-950/20',
  },
  goals: {
    label: 'Goals',
    icon: Target,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-100 dark:bg-violet-950/40',
    borderColor: 'border-l-violet-500',
    dotColor: 'bg-violet-500',
    hoverBg: 'hover:bg-violet-50 dark:hover:bg-violet-950/20',
  },
  finance: {
    label: 'Finance',
    icon: Wallet,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-950/40',
    borderColor: 'border-l-emerald-500',
    dotColor: 'bg-emerald-500',
    hoverBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20',
  },
  journal: {
    label: 'Journal',
    icon: BookOpen,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-100 dark:bg-rose-950/40',
    borderColor: 'border-l-rose-500',
    dotColor: 'bg-rose-500',
    hoverBg: 'hover:bg-rose-50 dark:hover:bg-rose-950/20',
  },
  system: {
    label: 'System',
    icon: Info,
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800/40',
    borderColor: 'border-l-slate-400',
    dotColor: 'bg-slate-400',
    hoverBg: 'hover:bg-slate-50 dark:hover:bg-slate-800/20',
  },
}

// Map notification types to categories
const typeToCategory: Record<NotificationItem['type'], NotificationCategory> = {
  'overdue-task': 'tasks',
  'task-due-today': 'tasks',
  'task-completed': 'tasks',
  'habit-reminder': 'habits',
  'streak-milestone': 'habits',
  'habit-missed': 'habits',
  'goal-deadline': 'goals',
  'goal-progress': 'goals',
  'goal-completed': 'goals',
  'budget-alert': 'finance',
  'large-transaction': 'finance',
  'writing-reminder': 'journal',
  'mood-insight': 'journal',
  'data-backup': 'system',
  'update-notification': 'system',
}

// Map module to valid ModuleId for navigation
const moduleToModuleId: Record<string, ModuleId> = {
  tasks: 'tasks',
  habits: 'habits',
  goals: 'goals',
  finance: 'finance',
  journal: 'journal',
  settings: 'settings',
  dashboard: 'dashboard',
}

// ─── Relative Time ─────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// ─── Single Notification Card ───────────────────────────────────────

function NotificationCard({
  notification,
  onMarkRead,
  onNavigate,
}: {
  notification: NotificationItem & { clientRead: boolean }
  onMarkRead: (id: string) => void
  onNavigate: (module: string) => void
}) {
  const category = typeToCategory[notification.type] || 'system'
  const config = categoryConfig[category]
  const Icon = config.icon
  const isUnread = !notification.clientRead

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'relative flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 border-l-[3px]',
        config.borderColor,
        isUnread ? 'bg-accent/40' : 'bg-transparent',
        config.hoverBg,
      )}
      onClick={() => {
        onMarkRead(notification.id)
        onNavigate(notification.module)
      }}
    >
      {/* Category Icon */}
      <div className={cn('p-1.5 rounded-md shrink-0 mt-0.5', config.bgColor)}>
        <Icon className={cn('h-3.5 w-3.5', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-[13px] leading-tight',
            isUnread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground',
          )}>
            {notification.title}
          </p>
          {isUnread && (
            <div className={cn('w-2 h-2 rounded-full shrink-0 mt-1.5', config.dotColor)} />
          )}
        </div>
        <p className="text-xs text-muted-foreground/80 leading-relaxed mt-0.5 line-clamp-2">
          {notification.description}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-muted-foreground/60">
            {formatRelativeTime(notification.createdAt)}
          </span>
          <Badge
            variant="outline"
            className={cn('text-[9px] h-4 px-1.5 border-0 font-medium', config.bgColor, config.color)}
          >
            {config.label}
          </Badge>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Category Group ─────────────────────────────────────────────────

function CategoryGroup({
  category,
  notifications,
  onMarkRead,
  onNavigate,
  defaultExpanded,
}: {
  category: NotificationCategory
  notifications: Array<NotificationItem & { clientRead: boolean }>
  onMarkRead: (id: string) => void
  onNavigate: (module: string) => void
  defaultExpanded: boolean
}) {
  const config = categoryConfig[category]
  const Icon = config.icon
  const [expanded, setExpanded] = useState(defaultExpanded)
  const unreadCount = notifications.filter((n) => !n.clientRead).length

  return (
    <div className="px-2">
      {/* Category Header */}
      <button
        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent/30 transition-colors duration-150"
        onClick={() => setExpanded(!expanded)}
      >
        <Icon className={cn('h-3 w-3', config.color)} />
        <span className="flex-1 text-left">{config.label}</span>
        {unreadCount > 0 && (
          <span className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
            config.bgColor, config.color,
          )}>
            {unreadCount}
          </span>
        )}
        {expanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground/50" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
        )}
      </button>

      {/* Notification Cards */}
      <AnimatePresence mode="popLayout">
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 mt-0.5">
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkRead={onMarkRead}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Empty State ────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-10 px-4">
      <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mb-3">
        <CheckCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
      <p className="text-xs text-muted-foreground/60 mt-1">No pending notifications</p>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────

// Content-based stable key — backend IDs change every request, so we hash
// type+module+description to survive page reloads and request churn.
function notifKey(n: NotificationItem): string {
  return `${n.type}|${n.module}|${n.description}`
}

const READ_STORAGE_KEY = 'lifeos-notif-read'
const READ_MAX_KEEP = 200 // cap stored entries to avoid unbounded growth

export function NotificationCenter() {
  const { data, isLoading } = useNotifications()
  const { setActiveModule } = useAppStore()
  // Read state is stored as a content-key set, persisted to localStorage so
  // marking-as-read survives page reloads while the notification still exists.
  const [readKeys, setReadKeys] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const raw = localStorage.getItem(READ_STORAGE_KEY)
      if (!raw) return new Set()
      const arr = JSON.parse(raw) as string[]
      return new Set(arr)
    } catch {
      return new Set()
    }
  })
  const [open, setOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lifeos-notif-sound') !== 'false'
    }
    return true
  })

  const notifications = (data as NotificationItem[] | undefined) || []

  // Persist sound preference
  useEffect(() => {
    try {
      localStorage.setItem('lifeos-notif-sound', String(soundEnabled))
    } catch {
      // ignore localStorage errors
    }
  }, [soundEnabled])

  // Persist read keys to localStorage
  useEffect(() => {
    try {
      const arr = Array.from(readKeys).slice(-READ_MAX_KEEP)
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(arr))
    } catch {
      // ignore localStorage errors
    }
  }, [readKeys])

  // Mark a single notification as read (by content key, not transient id)
  const markRead = useCallback(
    (id: string) => {
      const n = notifications.find((x) => x.id === id)
      if (!n) return
      const key = notifKey(n)
      setReadKeys((prev) => {
        if (prev.has(key)) return prev
        const next = new Set(prev)
        next.add(key)
        return next
      })
    },
    [notifications],
  )

  // Mark all as read
  const markAllRead = useCallback(() => {
    setReadKeys((prev) => {
      const next = new Set(prev)
      for (const n of notifications) next.add(notifKey(n))
      return next
    })
  }, [notifications])

  // Apply read state
  const enrichedNotifications = notifications.map((n) => ({
    ...n,
    clientRead: n.read || readKeys.has(notifKey(n)),
  }))

  const unreadCount = enrichedNotifications.filter((n) => !n.clientRead).length

  // Group by category
  const grouped = enrichedNotifications.reduce((acc, n) => {
    const category = typeToCategory[n.type] || 'system'
    if (!acc[category]) acc[category] = []
    acc[category].push(n)
    return acc
  }, {} as Record<NotificationCategory, typeof enrichedNotifications>)

  // Category order
  const categoryOrder: NotificationCategory[] = ['tasks', 'habits', 'goals', 'finance', 'journal', 'system']

  // Navigate to module
  const handleNavigate = (module: string) => {
    const moduleId = moduleToModuleId[module]
    if (moduleId) {
      setActiveModule(moduleId)
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative hover:scale-105 transition-transform duration-150">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold px-1 ring-2 ring-background animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 gap-0 overflow-hidden shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-0">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {enrichedNotifications.length > 0 && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={markAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-[440px] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="space-y-1 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg animate-pulse">
                  <div className="w-7 h-7 rounded-md bg-muted/50 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-muted/50 rounded w-3/4" />
                    <div className="h-3 bg-muted/50 rounded w-full" />
                    <div className="h-2.5 bg-muted/50 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : enrichedNotifications.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="py-2 space-y-1">
              {categoryOrder.map((category) => {
                const items = grouped[category]
                if (!items || items.length === 0) return null
                // Expand first category with unread items, collapse the rest
                const hasUnread = items.some((n) => !n.clientRead)
                return (
                  <CategoryGroup
                    key={category}
                    category={category}
                    notifications={items}
                    onMarkRead={markRead}
                    onNavigate={handleNavigate}
                    defaultExpanded={hasUnread}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Footer with Sound Toggle */}
        {enrichedNotifications.length > 0 && (
          <div className="border-t px-3 py-2 flex items-center justify-between bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setActiveModule('dashboard')
                setOpen(false)
              }}
            >
              Go to Dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 w-7 p-0',
                soundEnabled
                  ? 'text-muted-foreground hover:text-foreground'
                  : 'text-muted-foreground/40 hover:text-muted-foreground',
              )}
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute notification sounds' : 'Unmute notification sounds'}
            >
              {soundEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

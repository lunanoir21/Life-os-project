'use client'

import { useActivity, type ActivityItem } from '@/lib/api/hooks'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import {
  CheckSquare,
  StickyNote,
  BookOpen,
  Repeat,
  Wallet,
  ArrowRight,
} from 'lucide-react'

const typeConfig: Record<ActivityItem['type'], {
  icon: React.ElementType
  color: string
  bgColor: string
  dotColor: string
  label: string
}> = {
  task: {
    icon: CheckSquare,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
    dotColor: 'bg-orange-500',
    label: 'Task',
  },
  note: {
    icon: StickyNote,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
    dotColor: 'bg-amber-500',
    label: 'Note',
  },
  journal: {
    icon: BookOpen,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-500/10',
    dotColor: 'bg-rose-500',
    label: 'Journal',
  },
  habit: {
    icon: Repeat,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    dotColor: 'bg-emerald-500',
    label: 'Habit',
  },
  transaction: {
    icon: Wallet,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-500/10',
    dotColor: 'bg-teal-500',
    label: 'Finance',
  },
}

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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ActivityTimeline() {
  const { data, isLoading } = useActivity()
  const { setActiveModule } = useAppStore()

  const activities = data?.activities || []

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 view-all-link"
            onClick={() => {/* Could navigate to a dedicated activity page */}}
          >
            View All <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-1" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <div className="text-3xl mb-2">📋</div>
            <p className="font-medium">No activity yet</p>
            <p className="text-xs mt-1">Start using Life OS to see your activity here</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />

            <div className="space-y-0 max-h-80 overflow-y-auto custom-scrollbar">
              {activities.map((activity, idx) => {
                const config = typeConfig[activity.type]
                const Icon = config.icon

                return (
                  <motion.div
                    key={`${activity.type}-${activity.id}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.04 }}
                    className="flex items-start gap-3 py-2 px-1 rounded-lg hover:bg-accent/30 transition-colors cursor-pointer group relative"
                    onClick={() => setActiveModule(activity.module as Parameters<typeof setActiveModule>[0])}
                  >
                    {/* Timeline dot */}
                    <div className={cn(
                      'w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 z-10 ring-2 ring-background',
                      config.dotColor
                    )} />

                    {/* Icon */}
                    <div className={cn(
                      'p-1.5 rounded-md shrink-0 transition-transform group-hover:scale-110',
                      config.bgColor
                    )}>
                      <Icon className={cn('h-3 w-3', config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{activity.description}</span>
                        <span className="text-xs text-muted-foreground/50">•</span>
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(activity.timestamp)}</span>
                      </div>
                    </div>

                    {/* Module badge */}
                    <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:inline-flex">
                      {config.label}
                    </Badge>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function cn(...inputs: (string | undefined | false)[]) {
  return inputs.filter(Boolean).join(' ')
}

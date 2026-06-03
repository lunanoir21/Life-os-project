'use client'

import { useState } from 'react'
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Brain,
  Zap,
  Heart,
  Target,
  Wallet,
  TrendingUp,
  CheckSquare,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useInsights, type Insight, type InsightsData } from '@/lib/api/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/stores/app-store'
import { motion, AnimatePresence } from 'framer-motion'

function cn(...inputs: (string | undefined | false)[]) {
  return inputs.filter(Boolean).join(' ')
}

// Category config
const categoryConfig: Record<
  Insight['category'],
  {
    icon: typeof Brain
    label: string
    gradient: string
    textColor: string
    bgColor: string
    borderColor: string
    ringColor: string
  }
> = {
  productivity: {
    icon: Zap,
    label: 'Productivity',
    gradient: 'from-orange-400 to-amber-500',
    textColor: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200/60 dark:border-orange-800/30',
    ringColor: '#f97316',
  },
  wellness: {
    icon: Heart,
    label: 'Wellness',
    gradient: 'from-emerald-400 to-teal-500',
    textColor: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200/60 dark:border-emerald-800/30',
    ringColor: '#10b981',
  },
  finance: {
    icon: Wallet,
    label: 'Finance',
    gradient: 'from-teal-400 to-emerald-500',
    textColor: 'text-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    borderColor: 'border-teal-200/60 dark:border-teal-800/30',
    ringColor: '#0d9488',
  },
  goals: {
    icon: Target,
    label: 'Goals',
    gradient: 'from-violet-400 to-purple-500',
    textColor: 'text-violet-500',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    borderColor: 'border-violet-200/60 dark:border-violet-800/30',
    ringColor: '#8b5cf6',
  },
}

// Circular progress ring for scores
function ScoreRing({
  value,
  size = 100,
  strokeWidth = 8,
  color = '#10b981',
  label,
  trend,
}: {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  label: string
  trend: 'up' | 'down' | 'stable'
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
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
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>
            {value}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">/ 100</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <TrendIcon trend={trend} size={14} />
      </div>
    </div>
  )
}

// Trend indicator icon
function TrendIcon({ trend, size = 16 }: { trend: 'up' | 'down' | 'stable'; size?: number }) {
  if (trend === 'up') {
    return <ArrowUpRight className="text-emerald-500" style={{ width: size, height: size }} />
  }
  if (trend === 'down') {
    return <ArrowDownRight className="text-red-500" style={{ width: size, height: size }} />
  }
  return <Minus className="text-muted-foreground" style={{ width: size, height: size }} />
}

// Single insight card
function InsightCard({
  insight,
  index,
  onNavigate,
}: {
  insight: Insight
  index: number
  onNavigate: (module: string) => void
}) {
  const config = categoryConfig[insight.category]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ y: -2, boxShadow: '0 4px 16px -4px rgba(0,0,0,0.1)' }}
    >
      <Card
        className={cn(
          'cursor-pointer overflow-hidden transition-all duration-200 hover:scale-[1.01]',
          config.borderColor
        )}
        onClick={() => onNavigate(insight.module)}
      >
        <div className={cn('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r', config.gradient)} />
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn('p-2 rounded-lg shrink-0', config.bgColor)}>
              <Icon className={cn('h-4 w-4', config.textColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-sm font-semibold truncate">{insight.title}</h4>
                <div className="flex items-center gap-1 shrink-0">
                  {insight.trendValue && (
                    <span
                      className={cn(
                        'text-xs font-medium',
                        insight.trend === 'up'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : insight.trend === 'down'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-muted-foreground'
                      )}
                    >
                      {insight.trendValue}
                    </span>
                  )}
                  <TrendIcon trend={insight.trend} size={14} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {insight.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Loading skeleton
function InsightsSkeleton() {
  return (
    <Card className="overflow-hidden border-emerald-200/40 dark:border-emerald-800/20">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <div className="flex justify-center gap-12 mb-6">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-[100px] w-[100px] rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-[100px] w-[100px] rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Error state
function InsightsError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="overflow-hidden border-red-200/40 dark:border-red-800/20">
      <CardContent className="p-6 text-center">
        <Brain className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-3">Unable to generate insights right now</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  )
}

export function SmartInsights() {
  const { data, isLoading, isError, refetch, isFetching } = useInsights()
  const queryClient = useQueryClient()
  const { setActiveModule } = useAppStore()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['insights'] })
    await refetch()
    setTimeout(() => setIsRefreshing(false), 600)
  }

  const handleNavigate = (module: string) => {
    setActiveModule(module as 'tasks' | 'habits' | 'goals' | 'finance' | 'journal')
  }

  if (isLoading) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <SparklesIcon />
          <h3 className="text-lg font-semibold">Smart Insights</h3>
        </div>
        <InsightsSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <SparklesIcon />
          <h3 className="text-lg font-semibold">Smart Insights</h3>
        </div>
        <InsightsError onRetry={handleRefresh} />
      </div>
    )
  }

  const insightsData = data as InsightsData | undefined

  if (!insightsData) return null

  const generatedTime = new Date(insightsData.generatedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon />
          <h3 className="text-lg font-semibold">Smart Insights</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Updated {generatedTime}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching || isRefreshing}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', (isFetching || isRefreshing) && 'animate-spin')}
            />
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={insightsData.generatedAt}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="overflow-hidden border-emerald-200/40 dark:border-emerald-800/20 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-violet-400" />
            <CardContent className="p-6">
              {/* Score Rings */}
              <div className="flex justify-center gap-8 sm:gap-16 mb-6">
                <ScoreRing
                  value={insightsData.productivityScore}
                  color={categoryConfig.productivity.ringColor}
                  label="Productivity"
                  trend={insightsData.productivityTrend}
                />
                <ScoreRing
                  value={insightsData.wellnessScore}
                  color={categoryConfig.wellness.ringColor}
                  label="Wellness"
                  trend={insightsData.wellnessTrend}
                />
              </div>

              {/* Insight Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insightsData.insights.map((insight, index) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    index={index}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function SparklesIcon() {
  return (
    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500">
      <Brain className="h-3.5 w-3.5 text-white" />
    </div>
  )
}

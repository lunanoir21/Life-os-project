'use client'

import { useState } from 'react'
import {
  CheckSquare,
  Repeat,
  Clock,
  Brain,
  Flame,
  Target,
  Wallet,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  Loader2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { useWeeklyReview, type WeeklyReviewData } from '@/lib/api/hooks'
import { useAppStore } from '@/stores/app-store'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

function cn(...inputs: (string | undefined | false)[]) {
  return inputs.filter(Boolean).join(' ')
}

// Large circular progress ring for the week score
function WeekScoreRing({ value, size = 140, strokeWidth = 10 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  const color = value >= 80 ? '#10b981' : value >= 60 ? '#f59e0b' : value >= 40 ? '#f97316' : '#ef4444'

  return (
    <div className="relative">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-muted/15" strokeWidth={strokeWidth} />
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
        <span className="text-4xl font-bold" style={{ color }}>{value}</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">Week Score</span>
      </div>
    </div>
  )
}

// Stat card for the grid
function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
  delay,
}: {
  icon: typeof CheckSquare
  label: string
  value: string | number
  subtitle?: string
  color: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="p-4 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-md" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </motion.div>
  )
}

// Trend icon
function TrendIcon({ trend }: { trend: 'improving' | 'stable' | 'declining' }) {
  if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-emerald-500" />
  if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-500" />
  return <Minus className="h-4 w-4 text-muted-foreground" />
}

// Mini sparkline chart
function MiniSparkline({ data, color = '#10b981', height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return <div style={{ height }} className="flex items-center justify-center text-xs text-muted-foreground">No data</div>
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 120
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ')
  const areaPoints = `0,${height} ${points} ${width},${height}`

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-grad-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Mini bar chart for finance
function MiniBarChart({ income, expenses, height = 50 }: { income: number; expenses: number; height?: number }) {
  const max = Math.max(income, expenses, 1)
  const incomeHeight = (income / max) * (height - 20)
  const expenseHeight = (expenses / max) * (height - 20)

  return (
    <div className="flex items-end gap-3 justify-center" style={{ height }}>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] text-muted-foreground">Income</span>
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: incomeHeight }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-12 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-md min-h-[2px]"
        />
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] text-muted-foreground">Expenses</span>
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: expenseHeight }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-12 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-md min-h-[2px]"
        />
      </div>
    </div>
  )
}

// Highlight card
function HighlightCard({ text, index }: { text: string; index: number }) {
  const colors = [
    { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200/60 dark:border-emerald-800/30', dot: 'bg-emerald-500' },
    { bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-200/60 dark:border-teal-800/30', dot: 'bg-teal-500' },
    { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200/60 dark:border-orange-800/30', dot: 'bg-orange-500' },
    { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200/60 dark:border-amber-800/30', dot: 'bg-amber-500' },
  ]
  const c = colors[index % colors.length]

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 + index * 0.08 }}
      className={cn('flex items-start gap-3 p-3 rounded-lg border', c.bg, c.border)}
    >
      <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', c.dot)} />
      <p className="text-sm text-foreground/90">{text}</p>
    </motion.div>
  )
}

// Loading skeleton
function WeeklyReviewSkeleton() {
  return (
    <div className="space-y-6 p-2">
      <div className="flex items-center justify-center gap-6">
        <Skeleton className="h-[140px] w-[140px] rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  )
}

interface WeeklyReviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WeeklyReview({ open, onOpenChange }: WeeklyReviewProps) {
  const { data, isLoading, isError, refetch } = useWeeklyReview()
  const { setActiveModule } = useAppStore()

  const review = data as WeeklyReviewData | undefined

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy')
    } catch {
      return dateStr
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="sr-only">Weekly Review</DialogTitle>
          <DialogDescription className="sr-only">Your comprehensive weekly summary</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <WeeklyReviewSkeleton />
        ) : isError ? (
          <div className="text-center py-12">
            <Brain className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Unable to generate weekly review</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : !review ? null : (
          <AnimatePresence mode="wait">
            <motion.div
              key={review.weekRange.start}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 pb-2"
            >
              {/* Header with Week Score */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left"
              >
                <WeekScoreRing value={review.weekScore} />
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold gradient-text">Weekly Review</h2>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    <span className="text-sm">
                      {formatDate(review.weekRange.start)} — {formatDate(review.weekRange.end)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-muted-foreground">
                      {review.weekScore >= 80 ? 'Amazing week!' : review.weekScore >= 60 ? 'Good progress this week' : review.weekScore >= 40 ? 'Room for improvement' : 'Challenging week — next week will be better'}
                    </span>
                  </div>
                </div>
              </motion.div>

              <Separator />

              {/* Stats Grid - 2x4 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  icon={CheckSquare}
                  label="Tasks Completed"
                  value={review.tasksCompleted}
                  subtitle={`${review.taskCompletionRate}% rate`}
                  color="#f97316"
                  delay={0.05}
                />
                <StatCard
                  icon={Repeat}
                  label="Habit Rate"
                  value={`${review.habitCompletionRate}%`}
                  subtitle={`${review.habitsCompleted} logs`}
                  color="#10b981"
                  delay={0.1}
                />
                <StatCard
                  icon={Clock}
                  label="Focus Time"
                  value={review.totalFocusTime > 0 ? `${(review.totalFocusTime / 60).toFixed(1)}h` : '0h'}
                  subtitle={`${review.pomodoroSessions} pomodoros`}
                  color="#0d9488"
                  delay={0.15}
                />
                <StatCard
                  icon={Brain}
                  label="Mood"
                  value={review.avgMoodScore > 0 ? `${review.avgMoodScore}/5` : 'N/A'}
                  subtitle={review.moodTrend}
                  color="#8b5cf6"
                  delay={0.2}
                />
                <StatCard
                  icon={Flame}
                  label="Energy"
                  value={review.avgEnergyScore > 0 ? `${review.avgEnergyScore}/5` : 'N/A'}
                  subtitle="average"
                  color="#f59e0b"
                  delay={0.25}
                />
                <StatCard
                  icon={Target}
                  label="Best Streak"
                  value={review.longestHabitStreak.streak > 0 ? `${review.longestHabitStreak.streak}d` : '0d'}
                  subtitle={review.longestHabitStreak.name || 'No streaks'}
                  color="#ef4444"
                  delay={0.4}
                />
              </div>

              <Separator />

              {/* Highlights Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold">Week Highlights</h3>
                </div>
                <div className="space-y-2">
                  {review.highlights.map((highlight, idx) => (
                    <HighlightCard key={idx} text={highlight} index={idx} />
                  ))}
                </div>
              </div>

              <Separator />

              {/* Mood & Energy Trend + Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mood & Energy Trend */}
                <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-violet-500" />
                      <h3 className="text-sm font-semibold">Mood & Energy Trend</h3>
                    </div>
                    <TrendIcon trend={review.moodTrend} />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Mood</span>
                        <span className="text-xs font-medium">{review.avgMoodScore > 0 ? `${review.avgMoodScore}/5` : 'No data'}</span>
                      </div>
                      <Progress value={review.avgMoodScore * 20} className="h-2 [&>div]:bg-violet-500" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Energy</span>
                        <span className="text-xs font-medium">{review.avgEnergyScore > 0 ? `${review.avgEnergyScore}/5` : 'No data'}</span>
                      </div>
                      <Progress value={review.avgEnergyScore * 20} className="h-2 [&>div]:bg-amber-500" />
                    </div>

                  </div>
                </div>

                {/* Financial Summary */}
                <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="h-4 w-4 text-teal-500" />
                    <h3 className="text-sm font-semibold">Financial Summary</h3>
                  </div>
                  <MiniBarChart income={review.financialSummary.income} expenses={review.financialSummary.expenses} />
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Income</span>
                      <span className="text-sm font-semibold text-emerald-600">+${review.financialSummary.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Expenses</span>
                      <span className="text-sm font-semibold text-orange-600">-${review.financialSummary.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Net Savings</span>
                      <span className={cn('text-sm font-bold', review.financialSummary.netSavings >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {review.financialSummary.netSavings >= 0 ? '+' : ''}${review.financialSummary.netSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {review.financialSummary.topExpenseCategory !== 'N/A' && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Top Category</span>
                        <Badge variant="outline" className="text-[10px]">{review.financialSummary.topExpenseCategory}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Goals Progress */}
              {review.goalsProgress.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="h-4 w-4 text-violet-500" />
                      <h3 className="text-sm font-semibold">Goals Progress</h3>
                    </div>
                    <div className="space-y-2">
                      {review.goalsProgress.map((goal, idx) => (
                        <motion.div
                          key={goal.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: idx * 0.05 }}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{goal.title}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {goal.progressChange > 0 ? (
                              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                            ) : goal.progressChange < 0 ? (
                              <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                            ) : (
                              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span className={cn(
                              'text-sm font-semibold',
                              goal.progressChange > 0 ? 'text-emerald-600' : goal.progressChange < 0 ? 'text-red-500' : 'text-muted-foreground'
                            )}>
                              {goal.progressChange > 0 ? '+' : ''}{goal.progressChange}%
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Top Completed Tasks */}
              {review.topCompletedTasks.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckSquare className="h-4 w-4 text-orange-500" />
                      <h3 className="text-sm font-semibold">Top Completed Tasks</h3>
                    </div>
                    <div className="space-y-1">
                      {review.topCompletedTasks.map((task, idx) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.05 }}
                          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/30 transition-colors"
                        >
                          <div className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            task.priority === 'urgent' ? 'bg-red-500' :
                            task.priority === 'high' ? 'bg-orange-500' :
                            task.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-400'
                          )} />
                          <span className="text-sm flex-1 truncate">{task.title}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">{task.priority}</Badge>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Close Button */}
              <div className="flex justify-center pt-2">
                <Button
                  onClick={() => onOpenChange(false)}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm px-8"
                >
                  Close Review
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </DialogContent>
    </Dialog>
  )
}

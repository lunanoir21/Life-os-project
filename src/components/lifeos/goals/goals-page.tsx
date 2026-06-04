'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Plus, Target, CalendarDays, Trash2, CheckCircle2, Circle, Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import type { Goal, Milestone } from '@/stores/goal-store'
import { useAppStore } from '@/stores/app-store'
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/lib/api/hooks'
import { useTranslation } from '@/lib/i18n'
import { showToast } from '@/lib/toast'

const categoryColors: Record<string, string> = {
  personal: 'bg-emerald-500', career: 'bg-amber-500', health: 'bg-pink-500',
  financial: 'bg-teal-500', education: 'bg-cyan-600', social: 'bg-rose-500',
}

const categoryHexColors: Record<string, string> = {
  personal: '#10b981', career: '#f59e0b', health: '#ec4899',
  financial: '#14b8a6', education: '#0891b2', social: '#f43f5e',
}

const categoryIcons: Record<string, string> = {
  personal: '👤', career: '💼', health: '❤️', financial: '💰', education: '📚', social: '🤝',
}

const categoryGradientFrom: Record<string, string> = {
  personal: 'from-emerald-400', career: 'from-amber-400', health: 'from-pink-400',
  financial: 'from-teal-400', education: 'from-cyan-400', social: 'from-rose-400',
}

const categoryGradientTo: Record<string, string> = {
  personal: 'to-teal-500', career: 'to-orange-500', health: 'to-rose-500',
  financial: 'to-emerald-500', education: 'to-blue-500', social: 'to-pink-500',
}

function cn(...inputs: (string | undefined | false)[]) { return inputs.filter(Boolean).join(' ') }

function mapApiGoal(apiGoal: Record<string, unknown>): Goal {
  const milestones: Milestone[] = ((apiGoal.milestones as Record<string, unknown>[]) || []).map(m => ({
    id: m.id as string,
    goalId: (m.goalId as string) || '',
    title: m.title as string,
    completed: (m.completed as boolean) || false,
    completedAt: m.completedAt ? new Date(m.completedAt as string).toISOString().split('T')[0] : null,
    order: (m.order as number) || 0,
  }))

  const tags = (apiGoal.tags as Record<string, unknown>[])?.map((t: Record<string, unknown>) => ((t.tag as Record<string, unknown>)?.name as string) || '').filter(Boolean) || []

  // Calculate progress from milestones
  const completedCount = milestones.filter(m => m.completed).length
  const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : ((apiGoal.progress as number) || 0)

  return {
    id: apiGoal.id as string,
    title: apiGoal.title as string,
    description: (apiGoal.description as string) || '',
    category: ((apiGoal.category as string) || 'personal') as Goal['category'],
    status: ((apiGoal.status as string) || 'not-started') as Goal['status'],
    progress,
    startDate: apiGoal.startDate ? new Date(apiGoal.startDate as string).toISOString().split('T')[0] : null,
    targetDate: apiGoal.targetDate ? new Date(apiGoal.targetDate as string).toISOString().split('T')[0] : null,
    completedAt: apiGoal.completedAt ? new Date(apiGoal.completedAt as string).toISOString().split('T')[0] : null,
    parentGoalId: (apiGoal.parentGoalId as string) || null,
    tags,
    milestones,
    createdAt: new Date(apiGoal.createdAt as string).toISOString(),
    updatedAt: new Date(apiGoal.updatedAt as string).toISOString(),
  }
}

// Progress Ring SVG Component
function ProgressRing({ progress, size = 48, strokeWidth = 4, color = 'var(--accent-primary)', glow = false }: { progress: number; size?: number; strokeWidth?: number; color?: string; glow?: boolean }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {glow && progress > 0 && (
        <div className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 ${size * 0.3}px ${color}40, 0 0 ${size * 0.15}px ${color}20` }} />
      )}
      <svg width={size} height={size} className="-rotate-90 relative z-10">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
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
          className="transition-all duration-700 ease-out"
          style={glow ? { filter: `drop-shadow(0 0 3px ${color}60)` } : undefined}
        />
      </svg>
      <span className="absolute text-[10px] font-bold z-10" style={{ color }}>{progress}%</span>
    </div>
  )
}

const accentHexMap: Record<string, string> = {
  emerald: '#10b981', teal: '#14b8a6', amber: '#f59e0b',
  rose: '#f43f5e', violet: '#8b5cf6', cyan: '#06b6d4',
  indigo: '#6366f1', pink: '#ec4899', lime: '#84cc16', sky: '#0ea5e9',
}

export function GoalsPage() {
  const accentColor = useAppStore((s) => s.accentColor)
  const { t } = useTranslation()
  const accentHex = accentHexMap[accentColor] || '#10b981'
  const { data: apiGoals, isLoading } = useGoals()
  const createGoalMutation = useCreateGoal()
  const updateGoalMutation = useUpdateGoal()
  const deleteGoalMutation = useDeleteGoal()

  const goals: Goal[] = useMemo(() => {
    if (!apiGoals) return []
    return (apiGoals as Record<string, unknown>[]).map(mapApiGoal)
  }, [apiGoals])

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [celebratingMilestone, setCelebratingMilestone] = useState<string | null>(null)
  const [milestoneReachedGoalId, setMilestoneReachedGoalId] = useState<string | null>(null)
  const [newGoal, setNewGoal] = useState({ title: '', description: '', category: 'personal' as Goal['category'], targetDate: '' })

  const filteredGoals = useMemo(() => categoryFilter ? goals.filter(g => g.category === categoryFilter) : goals, [goals, categoryFilter])
  const activeGoals = filteredGoals.filter(g => g.status === 'in-progress').length
  const completedGoals = filteredGoals.filter(g => g.status === 'completed').length
  const avgProgress = filteredGoals.length > 0 ? Math.round(filteredGoals.reduce((acc, g) => acc + g.progress, 0) / filteredGoals.length) : 0

  const toggleMilestone = useCallback((goalId: string, milestoneId: string) => {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return
    const milestone = goal.milestones.find(m => m.id === milestoneId)
    if (!milestone) return
    const completed = !milestone.completed
    updateGoalMutation.mutate({
      id: goalId,
      milestones: goal.milestones.map(m => ({
        id: m.id,
        title: m.title,
        completed: m.id === milestoneId ? completed : m.completed,
        order: m.order,
      })),
    })
    if (completed) {
      setCelebratingMilestone(milestoneId)
      setTimeout(() => setCelebratingMilestone(null), 600)
      // Check if milestone completion triggered a progress threshold (25/50/75/100%)
      const updatedMilestones = goal.milestones.map(m => ({ ...m, completed: m.id === milestoneId ? true : m.completed }))
      const newCompletedCount = updatedMilestones.filter(m => m.completed).length
      const newProgress = goal.milestones.length > 0 ? Math.round((newCompletedCount / goal.milestones.length) * 100) : 0
      const milestones = [25, 50, 75, 100] as const
      const oldProgress = Math.round(((newCompletedCount - 1) / goal.milestones.length) * 100)
      for (const m of milestones) {
        if (newProgress >= m && oldProgress < m) {
          setMilestoneReachedGoalId(goalId)
          setTimeout(() => setMilestoneReachedGoalId(null), 1200)
          showToast.success(t('goals.milestoneReached'), `${m}% progress achieved 🎯`)
          break
        }
      }
    }
    showToast.success(t('toast.updated'))
  }, [goals, updateGoalMutation, t])

  const deleteGoal = useCallback((id: string) => {
    deleteGoalMutation.mutate(id)
    showToast.info(t('toast.deleted'))
  }, [deleteGoalMutation, t])

  const handleAddGoal = useCallback(() => {
    if (!newGoal.title.trim()) return
    createGoalMutation.mutate({
      title: newGoal.title,
      description: newGoal.description,
      category: newGoal.category,
      targetDate: newGoal.targetDate || null,
    }, {
      onSuccess: () => {
        setNewGoal({ title: '', description: '', category: 'personal', targetDate: '' })
        setCreateDialogOpen(false)
        showToast.success(t('toast.created'))
      }
    })
  }, [newGoal, createGoalMutation, t])

  // Category color picker for create dialog
  const categoryColorPicker = (
    <div className="space-y-2">
      <label className="text-sm font-medium mb-1.5 block">{t('goals.category')}</label>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(categoryIcons).map(([key, icon]) => (
          <button
            key={key}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm transition-all duration-200',
              newGoal.category === key
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border/50 hover:border-primary/30 hover:bg-accent/50'
            )}
            onClick={() => setNewGoal(p => ({ ...p, category: key as Goal['category'] }))}
          >
            <span>{icon}</span>
            <span className="truncate">{t(`goals.${key}`)}</span>
            <div className={cn('w-2 h-2 rounded-full ml-auto', categoryColors[key])} />
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 animate-page-enter">
      {/* Stats with Progress Ring */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="overflow-hidden hover-lift">
          <div className="h-1.5" style={{ background: `linear-gradient(to right, ${accentHex}, ${accentHex}cc)` }} />
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 mx-auto mb-1" style={{ color: accentHex }} />
            <p className="text-2xl font-bold">{activeGoals}</p>
            <p className="text-xs text-muted-foreground">{t('goals.activeGoals')}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden hover-lift">
          <div className="h-1.5" style={{ background: `linear-gradient(to right, ${accentHex}cc, ${accentHex})` }} />
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1" style={{ color: accentHex }} />
            <p className="text-2xl font-bold">{completedGoals}</p>
            <p className="text-xs text-muted-foreground">{t('goals.completed')}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden hover-lift">
          <div className="h-1.5" style={{ background: `linear-gradient(to right, ${accentHex}aa, ${accentHex})` }} />
          <CardContent className="p-4 flex items-center justify-center gap-3">
            <ProgressRing progress={avgProgress} size={48} strokeWidth={4} color={accentHex} glow />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t('goals.avgProgress')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Add */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap border-l-2 pl-3" style={{ borderLeftColor: `${accentHex}4D` }}>
          <Button variant={categoryFilter === null ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setCategoryFilter(null)}>{t('all')}</Button>
          {Object.entries(categoryColors).map(([key, color]) => (
            <Button key={key} variant={categoryFilter === key ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs gap-1.5" onClick={() => setCategoryFilter(categoryFilter === key ? null : key)}>
              <span className="text-sm">{categoryIcons[key]}</span>
              {t(`goals.${key}`)}
            </Button>
          ))}
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />{t('goals.newGoal')}</Button></DialogTrigger>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader><DialogTitle>{t('goals.newGoal')}</DialogTitle><DialogDescription className="sr-only">{t('goals.createGoalSrOnly')}</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              <div><label className="text-sm font-medium mb-1.5 block">{t('goals.goalTitle')}</label><Input placeholder={t('goals.whatDoYouWantToAchieve')} value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">{t('goals.description')}</label><Textarea placeholder={t('goals.describeYourGoal')} value={newGoal.description} onChange={e => setNewGoal(p => ({ ...p, description: e.target.value }))} /></div>
              {categoryColorPicker}
              <div><label className="text-sm font-medium mb-1.5 block">{t('goals.targetDate')}</label><Input type="date" value={newGoal.targetDate} onChange={e => setNewGoal(p => ({ ...p, targetDate: e.target.value }))} /></div>
            </div>
            <DialogFooter><DialogClose asChild><Button variant="outline">{t('cancel')}</Button></DialogClose><Button onClick={handleAddGoal} disabled={createGoalMutation.isPending}>{t('create')}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Goals List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>)}
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredGoals.map((goal, idx) => {
              const isExpanded = expandedGoalId === goal.id
              const completedMilestones = goal.milestones.filter(m => m.completed).length
              const hexColor = categoryHexColors[goal.category]
              const gradientFrom = categoryGradientFrom[goal.category]
              const gradientTo = categoryGradientTo[goal.category]
              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.97 }}
                  transition={{ delay: idx * 0.06, duration: 0.3, ease: 'easeOut' }}
                  layout
                >
                  <Card className={cn('hover:shadow-md transition-all duration-200 overflow-hidden hover-lift animate-card-entrance', milestoneReachedGoalId === goal.id && 'ring-2 shadow-lg')} style={{
                    ...(milestoneReachedGoalId === goal.id ? { '--tw-ring-color': `${accentHex}4D`, boxShadow: `0 10px 15px -3px ${accentHex}1A` } : {}),
                    ...(goal.progress === 100 ? { boxShadow: `0 0 20px ${accentHex}30, 0 0 40px ${accentHex}15` } : {}),
                  } as React.CSSProperties}>
                    {/* Gradient top border matching category */}
                    <div className={cn('h-1.5 bg-gradient-to-r', gradientFrom, gradientTo)} />
                    {/* Milestone celebration overlay */}
                    {milestoneReachedGoalId === goal.id && (
                      <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
                          transition={{ duration: 1.2, ease: 'easeOut' }}
                          className="text-6xl"
                        >
                          🎯
                        </motion.div>
                      </div>
                    )}
                    <CardContent className="p-4 relative">
                      <div className="flex items-start gap-4 cursor-pointer" onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}>
                        <div className="shrink-0 mt-0.5">
                          <ProgressRing progress={goal.progress} size={40} strokeWidth={3} color={goal.progress === 100 ? accentHex : hexColor} glow={goal.progress === 100} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{categoryIcons[goal.category]}</span>
                            <h3 className="font-medium text-sm">{goal.title}</h3>
                            <Badge className={cn('text-[10px] shrink-0 rounded-full border-0', goal.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : goal.status === 'in-progress' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400')}>{goal.status === 'completed' ? t('completed') : goal.status === 'in-progress' ? t('active') : t('goals.notStarted')}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex-1">
                              <Progress
                                value={goal.progress}
                                className="h-2.5 [&>div]:bg-gradient-to-r"
                                style={{
                                  '--progress-from': hexColor,
                                  '--progress-to': hexColor + '88',
                                } as React.CSSProperties}
                              />
                              <style>{`
                                [data-goal-id="${goal.id}"] > div > div {
                                  background: linear-gradient(to right, ${hexColor}, ${hexColor}88) !important;
                                }
                              `}</style>
                            </div>
                            <span className="text-sm font-semibold shrink-0" style={{ color: hexColor }}>{goal.progress}%</span>
                          </div>
                          {goal.milestones.length > 0 && <p className="text-xs text-muted-foreground mt-1">{completedMilestones}/{goal.milestones.length} {t('goals.milestones').toLowerCase()}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {goal.targetDate && <Badge variant="outline" className="text-[10px]"><CalendarDays className="h-3 w-3 mr-1" />{goal.targetDate}</Badge>}
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteGoal(goal.id) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      <AnimatePresence>
                        {isExpanded && goal.milestones.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-3 border-t space-y-2">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 border-l-2 pl-2" style={{ borderLeftColor: `${accentHex}4D` }}>{t('goals.milestones')}</h4>
                              {goal.milestones.map(milestone => (
                                <div
                                  key={milestone.id}
                                  className={cn(
                                    'flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-all duration-200',
                                    celebratingMilestone === milestone.id && 'animate-milestone bg-emerald-50 dark:bg-emerald-950/20'
                                  )}
                                  onClick={() => toggleMilestone(goal.id, milestone.id)}
                                >
                                  {milestone.completed ? (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                    >
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                    </motion.div>
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground shrink-0 hover:scale-110 transition-transform duration-200" />
                                  )}
                                  <span className={cn('text-sm', milestone.completed && 'line-through text-muted-foreground')}>{milestone.title}</span>
                                  {milestone.completedAt && <span className="text-xs text-muted-foreground ml-auto">{milestone.completedAt}</span>}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
          {filteredGoals.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center shadow-sm" style={{ background: `linear-gradient(to bottom right, ${accentHex}20, ${accentHex}10)` }}>
                <Target className="h-10 w-10" style={{ color: accentHex }} />
              </div>
              <p className="text-base font-semibold text-foreground">{t('goals.noGoals')}</p>
              <p className="text-sm mt-1.5 max-w-[240px] mx-auto">{t('goals.noGoalsDesc')}</p>
              <div className="mt-4 flex items-center justify-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full" style={{ color: accentHex, backgroundColor: `${accentHex}18` }}>
                <Plus className="h-3 w-3" />
                <span>{t('goals.clickNewGoal')}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

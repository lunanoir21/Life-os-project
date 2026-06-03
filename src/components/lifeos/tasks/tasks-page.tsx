'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Plus,
  Search,
  List,
  LayoutGrid,
  Calendar,
  Flag,
  Trash2,
  Edit3,
  X,
  Filter,
  GripVertical,
  ChevronRight,
  ChevronLeft,
  Clock,
  AlertCircle,
  CheckSquare,
  LayoutTemplate,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useTaskStore, type Task, type Project } from '@/stores/task-store'
import { useAppStore } from '@/stores/app-store'
import { useTranslation } from '@/lib/i18n'
import { showToast } from '@/lib/toast'
import { useTasks, useProjects, useCreateTask, useUpdateTask, useDeleteTask } from '@/lib/api/hooks'
import { useIsMobile } from '@/hooks/use-mobile'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useDndContext,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/10 text-red-600 dark:text-red-400 priority-glow-urgent',
  high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 priority-glow-high',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 priority-glow-medium',
  low: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
}

const priorityDots: Record<string, string> = {
  urgent: 'bg-red-500 animate-pulse-urgent',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-400',
}

const priorityBorderColors: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-amber-500',
  low: 'border-l-green-400',
}

const priorityStripColors: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-green-400',
}

const taskTemplates = [
  { title: 'Bug Fix', priority: 'high' as const, description: 'Fix the reported bug in...', status: 'todo' as const },
  { title: 'Feature Request', priority: 'medium' as const, description: 'Implement the new feature...', status: 'todo' as const },
  { title: 'Code Review', priority: 'medium' as const, description: 'Review pull request for...', status: 'todo' as const },
  { title: 'Meeting Prep', priority: 'low' as const, description: 'Prepare agenda for...', status: 'todo' as const },
  { title: 'Documentation', priority: 'low' as const, description: 'Write documentation for...', status: 'todo' as const },
  { title: 'Release', priority: 'high' as const, description: 'Prepare release version...', status: 'todo' as const },
]

const filterBadgeColors: Record<string, string> = {
  all: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
  todo: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
  'in-progress': 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  done: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
}

// statusLabels moved inside component for i18n

function cn(...inputs: (string | undefined | false)[]) {
  return inputs.filter(Boolean).join(' ')
}

// Map API task to local Task type
function mapApiTask(apiTask: Record<string, unknown>): Task {
  const dueDate = apiTask.dueDate ? new Date(apiTask.dueDate as string).toISOString().split('T')[0] : null
  const startDate = apiTask.startDate ? new Date(apiTask.startDate as string).toISOString().split('T')[0] : null
  const completedAt = apiTask.completedAt ? new Date(apiTask.completedAt as string).toISOString() : null
  const tags = (apiTask.tags as Record<string, unknown>[])?.map((t: Record<string, unknown>) => {
    const tag = t.tag as Record<string, unknown>
    return tag?.name as string || ''
  }).filter(Boolean) || []

  return {
    id: apiTask.id as string,
    title: apiTask.title as string,
    description: (apiTask.description as string) || '',
    status: apiTask.status as Task['status'],
    priority: apiTask.priority as Task['priority'],
    dueDate,
    startDate,
    completedAt,
    estimatedMinutes: (apiTask.estimatedMinutes as number) || null,
    actualMinutes: (apiTask.actualMinutes as number) || null,
    projectId: (apiTask.projectId as string) || null,
    parentTaskId: (apiTask.parentTaskId as string) || null,
    tags,
    createdAt: new Date(apiTask.createdAt as string).toISOString(),
    updatedAt: new Date(apiTask.updatedAt as string).toISOString(),
  }
}

function mapApiProject(apiProject: Record<string, unknown>): Project {
  return {
    id: apiProject.id as string,
    name: apiProject.name as string,
    description: (apiProject.description as string) || '',
    color: (apiProject.color as string) || '#6b7280',
    icon: (apiProject.icon as string) || null,
    status: (apiProject.status as string) || 'active',
    startDate: apiProject.startDate ? new Date(apiProject.startDate as string).toISOString().split('T')[0] : null,
    endDate: apiProject.endDate ? new Date(apiProject.endDate as string).toISOString().split('T')[0] : null,
    taskCount: 0,
    completedCount: 0,
    createdAt: new Date(apiProject.createdAt as string).toISOString(),
    updatedAt: new Date(apiProject.updatedAt as string).toISOString(),
  }
}

function getDueDateStatus(dueDate: string | null) {
  if (!dueDate) return { label: '', className: '' }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { label: 'Overdue', className: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' }
  if (diffDays === 0) return { label: 'Due today', className: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' }
  if (diffDays === 1) return { label: 'Tomorrow', className: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' }
  return { label: dueDate, className: 'text-muted-foreground' }
}

// Sortable Task Card Component
function SortableTaskCard({
  task,
  selectedTaskId,
  celebratingTaskId,
  onSelectTask,
  onMoveTask,
  onDeleteTask,
  columnStatus,
}: {
  task: Task
  selectedTaskId: string | null
  celebratingTaskId: string | null
  onSelectTask: (id: string) => void
  onMoveTask: (id: string, status: Task['status']) => void
  onDeleteTask: (id: string) => void
  columnStatus: Task['status']
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { status: columnStatus } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    scale: isDragging ? 1.03 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  const dueStatus = getDueDateStatus(task.dueDate)
  const isCelebrating = celebratingTaskId === task.id

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200 border-l-[3px] hover:shadow-md micro-hover shadow-card',
          priorityBorderColors[task.priority],
          selectedTaskId === task.id ? 'ring-2 ring-primary/20 shadow-md' : '',
          isCelebrating && 'animate-celebrate',
          isDragging && 'shadow-xl ring-2 ring-primary/30 rotate-1'
        )}
        onClick={() => onSelectTask(task.id)}
      >
        <CardContent className="p-3.5 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <div {...attributes} {...listeners} className="mt-0.5 cursor-grab active:cursor-grabbing touch-none">
                <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0 hover:text-muted-foreground/60 transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium leading-snug', task.status === 'done' && 'line-through-animate text-muted-foreground')}>
                  {task.title}
                </p>
              </div>
            </div>
            <Badge className={cn(`${priorityColors[task.priority]} text-[10px] shrink-0 px-2 py-0.5 rounded-full font-semibold`, task.priority === 'urgent' && 'animate-pulse-urgent')}>
              {task.priority}
            </Badge>
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 pl-7 leading-relaxed">{task.description}</p>
          )}
          <div className="flex items-center justify-between pl-7 pt-0.5">
            {task.dueDate && (
              <Badge variant="outline" className={cn('text-[10px] border', dueStatus.className)}>
                <Clock className="h-2.5 w-2.5 mr-1" />
                {dueStatus.label || task.dueDate}
              </Badge>
            )}
            <div className="flex items-center gap-0.5 ml-auto">
              {columnStatus !== 'todo' && (
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-accent" onClick={(e) => { e.stopPropagation(); onMoveTask(task.id, columnStatus === 'in-progress' ? 'todo' : 'in-progress') }}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
              )}
              {columnStatus !== 'done' && (
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-accent" onClick={(e) => { e.stopPropagation(); onMoveTask(task.id, columnStatus === 'todo' ? 'in-progress' : 'done') }}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-accent hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id) }}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pl-7">
              {task.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5">{tag}</Badge>
              ))}
              {task.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{task.tags.length - 3}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Drop zone column component that detects drag-over
function DroppableColumn({
  status,
  isOver,
  children,
  className,
}: {
  status: Task['status']
  isOver: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        className,
        isOver && 'ring-2 ring-primary/40 ring-offset-1 bg-primary/5'
      )}
      data-column-status={status}
    >
      {children}
    </div>
  )
}

const accentHexMap: Record<string, string> = {
  emerald: '#10b981', teal: '#14b8a6', amber: '#f59e0b',
  rose: '#f43f5e', violet: '#8b5cf6', cyan: '#06b6d4',
  indigo: '#6366f1', pink: '#ec4899', lime: '#84cc16', sky: '#0ea5e9',
}

export function TasksPage() {
  const { taskView, setTaskView, taskFilter, setTaskFilter } = useTaskStore()
  const accentColor = useAppStore((s) => s.accentColor)
  const { t } = useTranslation()
  const statusLabels: Record<string, string> = useMemo(() => ({
    'todo': t('tasks.todo'),
    'in-progress': t('tasks.inProgress'),
    'done': t('tasks.done'),
  }), [t])
  const accentHex = accentHexMap[accentColor] || '#10b981'
  const { data: apiTasks, isLoading } = useTasks()
  const { data: apiProjects } = useProjects()
  const createTaskMutation = useCreateTask()
  const updateTaskMutation = useUpdateTask()
  const deleteTaskMutation = useDeleteTask()

  const tasks: Task[] = useMemo(() => {
    if (!apiTasks) return []
    return (apiTasks as Record<string, unknown>[]).map(mapApiTask)
  }, [apiTasks])

  const projects: Project[] = useMemo(() => {
    if (!apiProjects) return []
    return (apiProjects as Record<string, unknown>[]).map(mapApiProject)
  }, [apiProjects])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' as Task['priority'], dueDate: '', projectId: '', tags: '' })
  const isMobile = useIsMobile()

  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId), [tasks, selectedTaskId])

  const filteredTasks = useMemo(() => {
    let result = tasks
    if (taskFilter !== 'all') {
      result = result.filter(t => t.status === taskFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
    }
    return result
  }, [tasks, taskFilter, searchQuery])

  const todoTasks = filteredTasks.filter(t => t.status === 'todo')
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in-progress')
  const doneTasks = filteredTasks.filter(t => t.status === 'done')

  // Productivity Score & Completion Progress
  const taskCompletionPct = tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0
  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false
    const due = new Date(t.dueDate)
    due.setHours(0, 0, 0, 0)
    return due < new Date(new Date().toISOString().split('T')[0])
  })

  const handleAddTask = useCallback(() => {
    if (!newTask.title.trim()) return
    createTaskMutation.mutate({
      title: newTask.title,
      description: newTask.description,
      status: 'todo',
      priority: newTask.priority,
      dueDate: newTask.dueDate || null,
      projectId: newTask.projectId || null,
    }, {
      onSuccess: () => {
        setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', projectId: '', tags: '' })
        setCreateDialogOpen(false)
        showToast.success('Task created', 'New task has been added')
      }
    })
  }, [newTask, createTaskMutation])

  const handleTemplateSelect = useCallback((template: typeof taskTemplates[number]) => {
    createTaskMutation.mutate({
      title: template.title,
      description: template.description,
      status: template.status,
      priority: template.priority,
      dueDate: null,
      projectId: null,
    }, {
      onSuccess: () => {
        showToast.success('Task created from template', `"${template.title}" task added`)
      }
    })
  }, [createTaskMutation])

  const [celebratingTaskId, setCelebratingTaskId] = useState<string | null>(null)

  const toggleTaskStatus = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    updateTaskMutation.mutate({ id, status: newStatus })
    if (newStatus === 'done') {
      setCelebratingTaskId(id)
      setTimeout(() => setCelebratingTaskId(null), 500)
      showToast.success('Task updated', 'Task marked as done 🎉')
    }
  }, [tasks, updateTaskMutation])

  const deleteTask = useCallback((id: string) => {
    deleteTaskMutation.mutate(id)
    if (selectedTaskId === id) setSelectedTaskId(null)
    showToast.info('Task deleted', 'Task has been removed')
  }, [deleteTaskMutation, selectedTaskId])

  const moveTask = useCallback((id: string, newStatus: Task['status']) => {
    updateTaskMutation.mutate({ id, status: newStatus })
  }, [updateTaskMutation])

  const taskDetailContent = selectedTask ? (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <h3 className="font-semibold">{selectedTask.title}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSelectedTaskId(null)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={`${priorityColors[selectedTask.priority]} text-xs rounded-full border-0`}>{selectedTask.priority}</Badge>
        <Badge className={cn('text-xs rounded-full border-0', selectedTask.status === 'done' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : selectedTask.status === 'in-progress' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400')}>{selectedTask.status === 'in-progress' ? t('tasks.inProgress') : selectedTask.status === 'todo' ? t('tasks.todo') : t('tasks.done')}</Badge>
        {selectedTask.dueDate && (
          <Badge variant="outline" className={cn('text-xs', getDueDateStatus(selectedTask.dueDate).className)}>
            <Calendar className="h-3 w-3 mr-1" />{selectedTask.dueDate}
          </Badge>
        )}
      </div>
      <Separator />
      <div>
        <p className="text-sm text-muted-foreground leading-relaxed">{selectedTask.description}</p>
      </div>
      <div className="space-y-3">
        {selectedTask.estimatedMinutes && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t('tasks.estimated')}</span>
            <span className="font-medium">{selectedTask.estimatedMinutes} {t('tasks.min')}</span>
            {selectedTask.actualMinutes && (
              <>
                <span className="text-muted-foreground ml-2">{t('tasks.actual')}</span>
                <span className="font-medium">{selectedTask.actualMinutes} {t('tasks.min')}</span>
              </>
            )}
          </div>
        )}
      </div>
      {selectedTask.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTask.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )}
      <Separator />
      <div className="space-y-2">
        <Button variant="outline" size="sm" className="w-full" onClick={() => toggleTaskStatus(selectedTask.id)}>
          {selectedTask.status === 'done' ? t('tasks.markIncomplete') : t('tasks.markComplete')}
        </Button>
        <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive" onClick={() => deleteTask(selectedTask.id)}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />{t('tasks.deleteTask')}
        </Button>
      </div>
    </div>
  ) : null

  return (
    <div className="flex h-full animate-page-enter">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Productivity Score + Progress Bar */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-xs font-bold text-foreground bg-muted/40">
                {taskCompletionPct}%
              </div>
              <div>
                <p className="text-xs font-semibold">{t('tasks.productivityScore')}</p>
                <p className="text-[10px] text-muted-foreground">{tasks.filter(t => t.status === 'done').length} of {tasks.length} {t('tasks.tasksDone')}</p>
              </div>
            </div>
            <div className="flex-1">
              <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                <div className="h-full rounded-full animate-day-progress" style={{ width: `${taskCompletionPct}%`, background: `linear-gradient(to right, ${accentHex}, ${accentHex}cc)` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Overdue Section */}
        {overdueTasks.length > 0 && (
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse-red" />
              <span className="text-xs font-medium text-red-600 dark:text-red-400">{overdueTasks.length} {overdueTasks.length > 1 ? t('tasks.overdueTasksPlural') : t('tasks.overdueTasks')}</span>
              <div className="flex-1" />
              <span className="text-[10px] text-red-500/70">{t('tasks.reviewDueDates')}</span>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="p-4 border-b border-border/50 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Tabs value={taskView} onValueChange={(v) => setTaskView(v as 'list' | 'board')}>
                <TabsList className="h-8">
                  <TabsTrigger value="list" className="text-xs px-3 h-6">
                    <List className="h-3.5 w-3.5 mr-1" />{t('tasks.list')}
                  </TabsTrigger>
                  <TabsTrigger value="board" className="text-xs px-3 h-6">
                    <LayoutGrid className="h-3.5 w-3.5 mr-1" />{t('tasks.board')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-1">
                {(['all', 'todo', 'in-progress', 'done'] as const).map((filter) => {
                  const count = filter === 'all' ? tasks.length : tasks.filter(t => t.status === filter).length
                  const isActive = taskFilter === filter
                  return (
                    <Button
                      key={filter}
                      variant={isActive ? 'secondary' : 'ghost'}
                      size="sm"
                      className={cn('h-7 text-xs gap-1.5 tab-transition', isActive && 'border-l-2')}
                      style={isActive ? { borderLeftColor: accentHex } : undefined}
                      onClick={() => setTaskFilter(filter)}
                    >
                      {filter === 'all' ? t('tasks.all') : filter === 'in-progress' ? t('tasks.inProgress') : filter === 'todo' ? t('tasks.todo') : filter === 'done' ? t('tasks.done') : filter.charAt(0).toUpperCase() + filter.slice(1)}
                      <motion.span
                        key={`${filter}-${count}`}
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={cn(
                          'inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-medium transition-colors',
                          taskFilter === filter ? (filterBadgeColors[filter] || filterBadgeColors.all) : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {count}
                      </motion.span>
                    </Button>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <LayoutTemplate className="h-4 w-4" />{t('tasks.templates')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="end">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground px-2 py-1">{t('tasks.addTask')}</p>
                    {taskTemplates.map((template) => (
                      <button
                        key={template.title}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left hover:bg-accent transition-colors text-sm group"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <Badge className={cn(`${priorityColors[template.priority]} text-[9px] shrink-0 px-1.5 py-0 rounded-full font-semibold`)}>
                          {template.priority}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{template.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{template.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1.5" />{t('tasks.addTask')}
                  </Button>
                </DialogTrigger>
              <DialogContent aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle>{t('tasks.newTask')}</DialogTitle>
                  <DialogDescription className="sr-only">Create a new task for your workflow</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{t('tasks.taskTitle')}</label>
                    <Input
                      placeholder={t('tasks.taskTitle')}
                      value={newTask.title}
                      onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{t('tasks.description')}</label>
                    <Textarea
                      placeholder={t('tasks.description')}
                      value={newTask.description}
                      onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('tasks.priority')}</label>
                      <Select value={newTask.priority} onValueChange={(v) => setNewTask(prev => ({ ...prev, priority: v as Task['priority'] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">{t('tasks.low')}</SelectItem>
                          <SelectItem value="medium">{t('tasks.medium')}</SelectItem>
                          <SelectItem value="high">{t('tasks.high')}</SelectItem>
                          <SelectItem value="urgent">{t('tasks.urgent')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('tasks.dueDate')}</label>
                      <Input
                        type="date"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('tasks.project')}</label>
                      <Select value={newTask.projectId} onValueChange={(v) => setNewTask(prev => ({ ...prev, projectId: v }))}>
                        <SelectTrigger><SelectValue placeholder={t('none')} /></SelectTrigger>
                        <SelectContent>
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('tasks.tags')}</label>
                      <Input
                        placeholder={t('tasks.tags')}
                        value={newTask.tags}
                        onChange={(e) => setNewTask(prev => ({ ...prev, tags: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">{t('cancel')}</Button>
                  </DialogClose>
                  <Button onClick={handleAddTask} disabled={createTaskMutation.isPending}>{t('tasks.createTask')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`${t('search')}...`}
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Task Content */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : taskView === 'list' ? (
            <Listview
              tasks={filteredTasks}
              selectedTaskId={selectedTaskId}
              celebratingTaskId={celebratingTaskId}
              onSelectTask={setSelectedTaskId}
              onToggleStatus={toggleTaskStatus}
              onDeleteTask={deleteTask}
              accentHex={accentHex}
            />
          ) : (
            <Boardview
              todoTasks={todoTasks}
              inProgressTasks={inProgressTasks}
              doneTasks={doneTasks}
              selectedTaskId={selectedTaskId}
              celebratingTaskId={celebratingTaskId}
              onSelectTask={setSelectedTaskId}
              onMoveTask={moveTask}
              onDeleteTask={deleteTask}
            />
          )}
        </div>
      </div>

      {/* Detail Panel - Desktop */}
      {selectedTask && !isMobile && (
        <div className="w-80 border-l border-border/50 bg-background shrink-0">
          <div className="p-5">{taskDetailContent}</div>
        </div>
      )}

      {/* Detail Panel - Mobile Sheet */}
      {selectedTask && isMobile && (
        <Sheet open={!!selectedTaskId} onOpenChange={(open) => { if (!open) setSelectedTaskId(null) }}>
          <SheetContent side="right" className="w-80 p-5">
            <SheetHeader className="sr-only">
              <SheetTitle>{t('tasks.taskDetails')}</SheetTitle>
            </SheetHeader>
            {taskDetailContent}
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

function Listview({ tasks, selectedTaskId, celebratingTaskId, onSelectTask, onToggleStatus, onDeleteTask, accentHex = '#10b981' }: {
  tasks: Task[]
  selectedTaskId: string | null
  celebratingTaskId: string | null
  onSelectTask: (id: string) => void
  onToggleStatus: (id: string) => void
  onDeleteTask: (id: string) => void
  accentHex?: string
}) {
  const { t } = useTranslation()
  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-muted-foreground">
        <div className="text-center animate-bounce-in">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/40 dark:to-amber-950/40 flex items-center justify-center shadow-sm">
            <CheckSquare className="h-10 w-10 text-orange-500" />
          </div>
          <p className="text-base font-semibold text-foreground">{t('tasks.noTasks')}</p>
          <p className="text-sm mt-1.5 text-muted-foreground/70 max-w-[240px] mx-auto">{t('tasks.noTasksDesc')}</p>
          <div className="mt-4 flex items-center justify-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full" style={{ color: accentHex, backgroundColor: `${accentHex}18` }}>
            <Plus className="h-3 w-3" />
            <span>{t('tasks.addTask')}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border/50">
      {tasks.map((task) => {
        const dueStatus = getDueDateStatus(task.dueDate)
        const isCelebrating = celebratingTaskId === task.id
        return (
          <motion.div
            key={task.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              'flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-all duration-200 cursor-pointer border-l-[3px]',
              priorityBorderColors[task.priority],
              task.status === 'done' && 'opacity-60',
              isCelebrating && 'animate-celebrate'
            )}
            style={selectedTaskId === task.id ? { borderLeftColor: accentHex, backgroundColor: 'var(--accent)' } : undefined}
            onClick={() => onSelectTask(task.id)}
          >
            <Checkbox
              checked={task.status === 'done'}
              onCheckedChange={() => onToggleStatus(task.id)}
              onClick={(e) => e.stopPropagation()}
              className={cn("transition-all duration-200", task.status === 'done' && 'animate-check-pop')}
            />
            <div className={cn('w-2 h-2 rounded-full shrink-0', priorityDots[task.priority])} />
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm truncate', task.status === 'done' && 'line-through-animate text-muted-foreground')}>
                {task.title}
              </p>
            </div>
            {task.dueDate && (
              <Badge variant="outline" className={cn('text-[10px] shrink-0 border', dueStatus.className)}>
                {dueStatus.label || task.dueDate}
              </Badge>
            )}
            <Badge className={cn(
              'text-[10px] shrink-0 rounded-full border-0',
              task.status === 'done' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
              task.status === 'in-progress' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
            )}>
              {task.status === 'in-progress' ? t('tasks.inProgress') : task.status === 'todo' ? t('tasks.todo') : t('tasks.done')}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id) }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </motion.div>
        )
      })}
    </div>
  )
}

function Boardview({ todoTasks, inProgressTasks, doneTasks, selectedTaskId, celebratingTaskId, onSelectTask, onMoveTask, onDeleteTask }: {
  todoTasks: Task[]
  inProgressTasks: Task[]
  doneTasks: Task[]
  selectedTaskId: string | null
  celebratingTaskId: string | null
  onSelectTask: (id: string) => void
  onMoveTask: (id: string, status: Task['status']) => void
  onDeleteTask: (id: string) => void
}) {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overColumn, setOverColumn] = useState<Task['status'] | null>(null)
  const [localTasks, setLocalTasks] = useState<Record<string, { status: Task['status'] }>>({})

  const columns = [
    { title: t('tasks.toDoColumn'), tasks: todoTasks, status: 'todo' as const, color: 'bg-slate-400', headerBg: '', colBg: 'bg-muted/20', emptyIcon: '📋', emptyText: t('tasks.noTasks'), borderColor: 'border-slate-200 dark:border-slate-800', topBorder: 'bg-slate-300 dark:bg-slate-700' },
    { title: t('tasks.inProgressColumn'), tasks: inProgressTasks, status: 'in-progress' as const, color: 'bg-amber-500', headerBg: '', colBg: 'bg-amber-50/30 dark:bg-amber-950/10', emptyIcon: '🔨', emptyText: t('tasks.nothingInProgress'), borderColor: 'border-amber-200 dark:border-amber-900', topBorder: 'bg-amber-400' },
    { title: t('tasks.doneColumn'), tasks: doneTasks, status: 'done' as const, color: 'bg-emerald-500', headerBg: '', colBg: 'bg-emerald-50/20 dark:bg-emerald-950/10', emptyIcon: '🎉', emptyText: t('tasks.completeSomeTasks'), borderColor: 'border-emerald-200 dark:border-emerald-900', topBorder: 'bg-emerald-400' },
  ]

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Build all task IDs for SortableContext
  const allTaskIds = useMemo(() => [
    ...todoTasks.map(t => t.id),
    ...inProgressTasks.map(t => t.id),
    ...doneTasks.map(t => t.id),
  ], [todoTasks, inProgressTasks, doneTasks])

  const activeTask = useMemo(() => {
    if (!activeId) return null
    const allTasks = [...todoTasks, ...inProgressTasks, ...doneTasks]
    return allTasks.find(t => t.id === activeId)
  }, [activeId, todoTasks, inProgressTasks, doneTasks])

  const findColumnForTask = useCallback((taskId: string): Task['status'] | null => {
    if (todoTasks.find(t => t.id === taskId)) return 'todo'
    if (inProgressTasks.find(t => t.id === taskId)) return 'in-progress'
    if (doneTasks.find(t => t.id === taskId)) return 'done'
    return null
  }, [todoTasks, inProgressTasks, doneTasks])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    if (!over) {
      setOverColumn(null)
      return
    }

    // Check if we're over a column (by checking the over data)
    const overData = over.data.current
    if (overData?.status) {
      setOverColumn(overData.status as Task['status'])
      return
    }

    // We're over a task card - find which column that card belongs to
    const overTaskId = over.id as string
    const overTaskStatus = findColumnForTask(overTaskId)
    if (overTaskStatus) {
      setOverColumn(overTaskStatus)
    }
  }, [findColumnForTask])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverColumn(null)

    if (!over || !active) return

    const taskId = active.id as string
    const currentStatus = findColumnForTask(taskId)
    if (!currentStatus) return

    // Determine the target column
    let targetStatus: Task['status'] | null = null

    // Check if dropped on a column container
    const overData = over.data.current
    if (overData?.status) {
      targetStatus = overData.status as Task['status']
    } else {
      // Dropped on another task - find that task's column
      const overTaskStatus = findColumnForTask(over.id as string)
      if (overTaskStatus) {
        targetStatus = overTaskStatus
      }
    }

    if (targetStatus && targetStatus !== currentStatus) {
      onMoveTask(taskId, targetStatus)
      showToast.success('Task moved', `Task moved to ${statusLabels[targetStatus]}`)
    }
  }, [findColumnForTask, onMoveTask])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setOverColumn(null)
  }, [])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="p-4 h-full">
        <div className="grid grid-cols-3 gap-4 h-full">
          {columns.map((col) => {
            const isOver = overColumn === col.status && activeId !== null
            const taskIds = col.tasks.map(t => t.id)
            return (
              <SortableContext key={col.status} items={taskIds} strategy={verticalListSortingStrategy}>
                <DroppableColumn
                  status={col.status}
                  isOver={isOver}
                  className={cn(
                    'flex flex-col rounded-xl bg-muted/30 border-2 transition-all duration-200',
                    isOver ? 'border-primary/50 bg-primary/5' : 'border-border/30',
                    col.colBg
                  )}
                >
                  {/* Colored top border */}
                  <div className={cn('h-1.5 rounded-t-xl', col.topBorder)} />
                  {/* Column Header */}
                  <div className={cn('px-3 py-2.5 border-b border-border/30', col.headerBg)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2.5 h-2.5 rounded-full', col.color)} />
                        <h3 className="text-sm font-semibold">{col.title}</h3>
                      </div>
                      <span className={cn(
                        'inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold',
                        col.color, 'text-white'
                      )}>
                        {col.tasks.length}
                      </span>
                    </div>
                  </div>
                  {/* Column Content */}
                  <ScrollArea className="flex-1 p-2">
                    <div className="space-y-2 min-h-[60px]">
                      {col.tasks.map((task) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          selectedTaskId={selectedTaskId}
                          celebratingTaskId={celebratingTaskId}
                          onSelectTask={onSelectTask}
                          onMoveTask={onMoveTask}
                          onDeleteTask={onDeleteTask}
                          columnStatus={col.status}
                        />
                      ))}
                      {col.tasks.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          <div className="text-3xl mb-2">{col.emptyIcon}</div>
                          <p className="font-medium">{col.emptyText}</p>
                          {isOver && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="mt-2 p-3 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-primary text-xs font-medium"
                            >
                              Drop here
                            </motion.div>
                          )}
                        </div>
                      )}
                      {/* Drop indicator at the bottom of non-empty columns */}
                      {col.tasks.length > 0 && isOver && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="p-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-primary text-xs font-medium text-center"
                        >
                          Drop here
                        </motion.div>
                      )}
                    </div>
                  </ScrollArea>
                </DroppableColumn>
              </SortableContext>
            )
          })}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask ? (
          <Card className="shadow-2xl border-l-[3px] rotate-2 scale-105 w-64 opacity-95" style={{ borderColor: undefined }}>
            <CardContent className="p-3 space-y-1.5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{activeTask.title}</p>
                </div>
                <Badge className={cn(`${priorityColors[activeTask.priority]} text-[10px] shrink-0 ml-2`)}>
                  {activeTask.priority}
                </Badge>
              </div>
              {activeTask.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 pl-6">{activeTask.description}</p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

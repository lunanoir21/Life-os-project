'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Plus, GraduationCap, BookOpen, Video, FileText, Headphones, Dumbbell, Clock, Star, Trash2, ExternalLink, CheckCircle2, Circle, ArrowLeft, Play, Flame, Search, Map, X,
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
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import type { Course, CourseResource } from '@/stores/learning-store'
import { useAppStore } from '@/stores/app-store'
import { useCourses, useCreateCourse, useUpdateCourse, useDeleteCourse } from '@/lib/api/hooks'
import { useTranslation } from '@/lib/i18n'
import { showToast } from '@/lib/toast'
import { learningPaths, categoryGradients, categoryAccentColors, categoryKeys, searchPaths, type LearningPath, type PathCategory } from '@/lib/learning-paths'

const statusColors: Record<string, string> = { 'not-started': 'bg-slate-400', 'in-progress': 'bg-teal-500', 'completed': 'bg-emerald-500', 'paused': 'bg-amber-500' }
const statusHexColors: Record<string, string> = { 'not-started': '#94a3b8', 'in-progress': '#14b8a6', 'completed': '#10b981', 'paused': '#f59e0b' }
const statusBgColors: Record<string, string> = {
  'not-started': 'bg-slate-50 dark:bg-slate-950/30',
  'in-progress': 'bg-teal-50 dark:bg-teal-950/30',
  'completed': 'bg-emerald-50 dark:bg-emerald-950/30',
  'paused': 'bg-amber-50 dark:bg-amber-950/30',
}
const statusTextColors: Record<string, string> = {
  'not-started': 'text-slate-600 dark:text-slate-400',
  'in-progress': 'text-teal-600 dark:text-teal-400',
  'completed': 'text-emerald-600 dark:text-emerald-400',
  'paused': 'text-amber-600 dark:text-amber-400',
}
const statusBorderColors: Record<string, string> = {
  'not-started': 'border-slate-300 dark:border-slate-700',
  'in-progress': 'border-teal-300 dark:border-teal-700',
  'completed': 'border-emerald-300 dark:border-emerald-700',
  'paused': 'border-amber-300 dark:border-amber-700',
}

const resourceTypeIcons: Record<string, React.ElementType> = { video: Video, article: FileText, book: BookOpen, podcast: Headphones, exercise: Dumbbell }
const resourceTypeEmojis: Record<string, string> = { video: '🎬', article: '📄', book: '📖', podcast: '🎧', exercise: '💪' }

const difficultyColors: Record<string, { bg: string; text: string }> = {
  beginner: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  intermediate: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  advanced: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
}

function cn(...inputs: (string | undefined | false)[]) { return inputs.filter(Boolean).join(' ') }

function mapApiCourse(apiCourse: Record<string, unknown>): Course {
  const resources: CourseResource[] = ((apiCourse.resources as Record<string, unknown>[]) || []).map(r => ({
    id: r.id as string,
    title: r.title as string,
    type: (r.type as string) || 'video',
    url: (r.url as string) || null,
    completed: (r.completed as boolean) || false,
    notes: (r.notes as string) || null,
    order: (r.order as number) || 0,
  }))

  const completedResources = resources.filter(r => r.completed).length
  const progress = resources.length > 0 ? Math.round((completedResources / resources.length) * 100) : ((apiCourse.progress as number) || 0)

  return {
    id: apiCourse.id as string,
    title: apiCourse.title as string,
    description: (apiCourse.description as string) || '',
    provider: (apiCourse.provider as string) || null,
    url: (apiCourse.url as string) || null,
    status: (apiCourse.status as string) || 'not-started',
    progress,
    startDate: apiCourse.startDate ? new Date(apiCourse.startDate as string).toISOString().split('T')[0] : null,
    endDate: apiCourse.endDate ? new Date(apiCourse.endDate as string).toISOString().split('T')[0] : null,
    rating: (apiCourse.rating as number) || null,
    notes: (apiCourse.notes as string) || null,
    resources,
    createdAt: new Date(apiCourse.createdAt as string).toISOString(),
  }
}

// Progress Ring SVG Component
function CourseProgressRing({ progress, size = 44, strokeWidth = 3, color = 'var(--accent-primary)' }: { progress: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/20" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700 ease-out" />
      </svg>
      <span className="absolute text-[9px] font-bold" style={{ color }}>{progress}%</span>
    </div>
  )
}

// Rating Stars Component
function RatingStars({ rating, size = 14 }: { rating: number | null; size?: number }) {
  if (rating === null) return null
  const clampedRating = Math.min(5, Math.max(0, rating))
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'transition-colors duration-200',
            i < Math.floor(clampedRating)
              ? 'text-amber-500 fill-amber-500'
              : i < clampedRating
                ? 'text-amber-400 fill-amber-200 dark:fill-amber-900/50'
                : 'text-muted/30'
          )}
          style={{ width: size, height: size }}
        />
      ))}
      <span className="text-xs font-medium ml-1 text-muted-foreground">{rating}</span>
    </div>
  )
}

const accentHexMap: Record<string, string> = {
  emerald: '#10b981', teal: '#14b8a6', amber: '#f59e0b',
  rose: '#f43f5e', violet: '#8b5cf6', cyan: '#06b6d4',
  indigo: '#6366f1', pink: '#ec4899', lime: '#84cc16', sky: '#0ea5e9',
}

export function LearningPage() {
  const accentColor = useAppStore((s) => s.accentColor)
  const { t } = useTranslation()
  const accentHex = accentHexMap[accentColor] || '#10b981'
  const { data: apiCourses, isLoading } = useCourses()
  const createCourseMutation = useCreateCourse()
  const updateCourseMutation = useUpdateCourse()
  const deleteCourseMutation = useDeleteCourse()

  const courses: Course[] = useMemo(() => {
    if (!apiCourses) return []
    return (apiCourses as Record<string, unknown>[]).map(mapApiCourse)
  }, [apiCourses])

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newCourse, setNewCourse] = useState({ title: '', description: '', provider: '', url: '' })

  // Learning Paths state
  const [activeTab, setActiveTab] = useState<'courses' | 'paths'>('courses')
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null)
  const [pathCategoryFilter, setPathCategoryFilter] = useState<PathCategory | 'all'>('all')
  const [pathSearch, setPathSearch] = useState('')

  const selectedCourse = useMemo(() => courses.find(c => c.id === selectedCourseId), [courses, selectedCourseId])
  const filteredCourses = useMemo(() => statusFilter ? courses.filter(c => c.status === statusFilter) : courses, [courses, statusFilter])
  const inProgressCount = courses.filter(c => c.status === 'in-progress').length
  const completedCount = courses.filter(c => c.status === 'completed').length
  const totalHours = courses.filter(c => c.status === 'completed').length * 10

  // Filtered learning paths
  const filteredPaths = useMemo(() => {
    let paths = pathCategoryFilter === 'all' ? learningPaths : learningPaths.filter(p => p.category === pathCategoryFilter)
    if (pathSearch.trim()) {
      paths = searchPaths(pathSearch).filter(p => pathCategoryFilter === 'all' || p.category === pathCategoryFilter)
    }
    return paths
  }, [pathCategoryFilter, pathSearch])

  // Find most recently accessed course (in-progress with most recent createdAt)
  const continueLearningCourse = useMemo(() => {
    const inProgress = courses.filter(c => c.status === 'in-progress')
    if (inProgress.length === 0) return null
    return inProgress.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  }, [courses])

  const toggleResource = useCallback((courseId: string, resourceId: string) => {
    const course = courses.find(c => c.id === courseId)
    if (!course) return
    const resource = course.resources.find(r => r.id === resourceId)
    if (!resource) return
    const completed = !resource.completed
    updateCourseMutation.mutate({
      id: courseId,
      resources: course.resources.map(r => ({
        id: r.id,
        title: r.title,
        type: r.type,
        completed: r.id === resourceId ? completed : r.completed,
        order: r.order,
      })),
    })
    showToast.success('Progress updated')
  }, [courses, updateCourseMutation])

  const deleteCourse = useCallback((id: string) => {
    deleteCourseMutation.mutate(id)
    if (selectedCourseId === id) setSelectedCourseId(null)
    showToast.info('Course deleted')
  }, [deleteCourseMutation, selectedCourseId])

  const handleAddCourse = useCallback(() => {
    if (!newCourse.title.trim()) return
    createCourseMutation.mutate({
      title: newCourse.title,
      description: newCourse.description,
      provider: newCourse.provider || null,
      url: newCourse.url || null,
    }, {
      onSuccess: () => {
        setNewCourse({ title: '', description: '', provider: '', url: '' })
        setCreateDialogOpen(false)
        showToast.success('Course added')
      }
    })
  }, [newCourse, createCourseMutation])

  const handleStartPath = useCallback((path: LearningPath) => {
    createCourseMutation.mutate({
      title: path.title,
      description: path.description,
      provider: path.category,
      status: 'in-progress',
      resources: path.resources.map((r, i) => ({
        title: r.title,
        type: r.type,
        url: r.url,
        completed: false,
        order: i,
      })),
    }, {
      onSuccess: () => {
        showToast.success(t('learning.pathAdded'))
        setSelectedPath(null)
        setActiveTab('courses')
      }
    })
  }, [createCourseMutation, t])

  // Learning Path Detail View
  if (selectedPath) {
    const catColor = categoryAccentColors[selectedPath.category]
    const diffStyle = difficultyColors[selectedPath.difficulty]
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 animate-page-enter">
        <Button variant="ghost" size="sm" onClick={() => setSelectedPath(null)}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          {t('learning.learningPaths')}
        </Button>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-sm" style={{ background: `linear-gradient(to bottom right, ${catColor}20, ${catColor}10)` }}>
                {selectedPath.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedPath.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedPath.description}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className={cn('text-xs rounded-full border-0', diffStyle.bg, diffStyle.text)}>
                    {t(`learning.${selectedPath.difficulty}`)}
                  </Badge>
                  <Badge variant="outline" className="text-xs rounded-full">
                    <Clock className="h-3 w-3 mr-1" />
                    {selectedPath.estimatedHours} {t('learning.hours')}
                  </Badge>
                  <Badge variant="outline" className="text-xs rounded-full" style={{ borderColor: catColor, color: catColor }}>
                    {t(`learning.categories.${selectedPath.category}`)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {selectedPath.tags.map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('learning.resources')} ({selectedPath.resources.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {selectedPath.resources.map((resource, idx) => {
                  const emoji = resourceTypeEmojis[resource.type] || '📄'
                  return (
                    <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors">
                      <span className="text-lg">{emoji}</span>
                      <span className="text-sm flex-1">{resource.title}</span>
                      <Badge className="text-[10px] rounded-full border-0 bg-slate-500/10 text-slate-600 dark:text-slate-400">{resource.type}</Badge>
                      {resource.url && (
                        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              className="text-white shadow-sm"
              style={{ background: `linear-gradient(to right, ${catColor}, ${catColor}cc)` }}
              onClick={() => handleStartPath(selectedPath)}
              disabled={createCourseMutation.isPending}
            >
              <Play className="h-4 w-4 mr-1.5" />
              {t('learning.startPath')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Course Detail View
  if (selectedCourse) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 animate-page-enter">
        <Button variant="ghost" size="sm" onClick={() => setSelectedCourseId(null)}><ArrowLeft className="h-4 w-4 mr-1.5" />{t('learning.backToCourses')}</Button>
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{selectedCourse.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{selectedCourse.description}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {selectedCourse.provider && <Badge variant="outline" className="text-xs">{selectedCourse.provider}</Badge>}
                <Badge className={cn('text-xs rounded-full border-0', selectedCourse.status === 'in-progress' ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : selectedCourse.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : selectedCourse.status === 'paused' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400')}>{selectedCourse.status}</Badge>
                <RatingStars rating={selectedCourse.rating} size={14} />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => deleteCourse(selectedCourse.id)}><Trash2 className="h-3.5 w-3.5 mr-1.5" />{t('learning.deleteCourse')}</Button>
          </div>
          <div className="flex items-center gap-4"><div className="flex-1"><Progress value={selectedCourse.progress} className="h-3" /></div><span className="text-sm font-semibold">{selectedCourse.progress}%</span></div>
          {selectedCourse.notes && <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{selectedCourse.notes}</p></CardContent></Card>}
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">{t('learning.resources')} ({selectedCourse.resources.length})</CardTitle></CardHeader><CardContent><div className="space-y-2">{selectedCourse.resources.map(resource => { const IconComp = resourceTypeIcons[resource.type] || FileText; const emoji = resourceTypeEmojis[resource.type] || '📄'; return (<div key={resource.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => toggleResource(selectedCourse.id, resource.id)}>{resource.completed ? <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /></motion.div> : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}<span className="text-lg">{emoji}</span><span className={cn('text-sm flex-1', resource.completed && 'line-through text-muted-foreground')}>{resource.title}</span><Badge className="text-[10px] rounded-full border-0 bg-slate-500/10 text-slate-600 dark:text-slate-400">{resource.type}</Badge></div>) })}{selectedCourse.resources.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t('learning.noResources')}</p>}</div></CardContent></Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 animate-page-enter">
      {/* Tab System */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        <button
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
            activeTab === 'courses'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setActiveTab('courses')}
        >
          <GraduationCap className="h-4 w-4" />
          {t('learning.myCourses')}
        </button>
        <button
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
            activeTab === 'paths'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setActiveTab('paths')}
        >
          <Map className="h-4 w-4" />
          {t('learning.learningPaths')}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'courses' ? (
          <motion.div
            key="courses"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="overflow-hidden hover-lift"><div className="h-1" style={{ background: `linear-gradient(to right, ${accentHex}, ${accentHex}cc)` }} /><CardContent className="p-4 text-center"><GraduationCap className="h-5 w-5 mx-auto mb-1" style={{ color: accentHex }} /><p className="text-2xl font-bold">{inProgressCount}</p><p className="text-xs text-muted-foreground">{t('learning.inProgress')}</p></CardContent></Card>
              <Card className="overflow-hidden hover-lift"><div className="h-1" style={{ background: `linear-gradient(to right, ${accentHex}cc, ${accentHex})` }} /><CardContent className="p-4 text-center"><CheckCircle2 className="h-5 w-5 mx-auto mb-1" style={{ color: accentHex }} /><p className="text-2xl font-bold">{completedCount}</p><p className="text-xs text-muted-foreground">{t('learning.completed')}</p></CardContent></Card>
              <Card className="overflow-hidden hover-lift"><div className="h-1" style={{ background: `linear-gradient(to right, ${accentHex}aa, ${accentHex})` }} /><CardContent className="p-4 text-center"><div className="flex items-center justify-center gap-1"><Clock className="h-5 w-5" style={{ color: accentHex }} /><Flame className="h-4 w-4 text-orange-500 animate-fire" /></div><p className="text-2xl font-bold">{totalHours}h</p><p className="text-xs text-muted-foreground">{t('learning.studyStreak')}</p></CardContent></Card>
            </div>

            {/* Continue Learning Quick Action */}
            {continueLearningCourse && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className={cn('border-2 overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 glow-border-teal', statusBorderColors['in-progress'])} onClick={() => setSelectedCourseId(continueLearningCourse.id)}>
                  <div className="flex items-center gap-4 p-4">
                    <div className="shrink-0">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ background: `linear-gradient(to bottom right, ${accentHex}, ${accentHex}cc)` }}>
                        <Play className="h-5 w-5 text-white fill-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: accentHex }}>{t('learning.continueLearning')}</p>
                      <h3 className="text-sm font-semibold truncate">{continueLearningCourse.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex-1 max-w-[200px]">
                          <Progress value={continueLearningCourse.progress} className="h-1.5" data-continue-progress />
                        </div>
                        <span className="text-xs font-medium" style={{ color: accentHex }}>{continueLearningCourse.progress}%</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <CourseProgressRing progress={continueLearningCourse.progress} size={40} strokeWidth={3} color={accentHex} />
                    </div>
                  </div>
                  <style>{`[data-continue-progress] > div { background: linear-gradient(to right, ${accentHex}, ${accentHex}cc) !important; }`}</style>
                </Card>
              </motion.div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">{['all', 'not-started', 'in-progress', 'completed', 'paused'].map(status => (<Button key={status} variant={(status === 'all' ? !statusFilter : statusFilter === status) ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setStatusFilter(status === 'all' ? null : status)}>{status === 'all' ? t('all') : status === 'not-started' ? t('learning.notStarted') : status === 'in-progress' ? t('learning.inProgress') : status === 'completed' ? t('learning.completed') : t('learning.paused')}</Button>))}</div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}><DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />{t('learning.newCourse')}</Button></DialogTrigger><DialogContent aria-describedby={undefined}><DialogHeader><DialogTitle>{t('learning.newCourse')}</DialogTitle><DialogDescription className="sr-only">Add a new course to track</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div><label className="text-sm font-medium mb-1.5 block">{t('learning.courseTitle')}</label><Input placeholder={t('learning.courseName')} value={newCourse.title} onChange={e => setNewCourse(p => ({ ...p, title: e.target.value }))} /></div><div><label className="text-sm font-medium mb-1.5 block">{t('learning.whatWillYouLearn')}</label><Textarea placeholder={t('learning.whatWillYouLearn')} value={newCourse.description} onChange={e => setNewCourse(p => ({ ...p, description: e.target.value }))} /></div><div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium mb-1.5 block">{t('learning.provider')}</label><Input placeholder="e.g. Coursera" value={newCourse.provider} onChange={e => setNewCourse(p => ({ ...p, provider: e.target.value }))} /></div><div><label className="text-sm font-medium mb-1.5 block">{t('learning.url')}</label><Input placeholder="https://..." value={newCourse.url} onChange={e => setNewCourse(p => ({ ...p, url: e.target.value }))} /></div></div></div><DialogFooter><DialogClose asChild><Button variant="outline">{t('cancel')}</Button></DialogClose><Button onClick={handleAddCourse} disabled={createCourseMutation.isPending}>{t('add')}</Button></DialogFooter></DialogContent></Dialog>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredCourses.map((course, idx) => {
                    const completedResources = course.resources.filter(r => r.completed).length
                    const hexColor = course.status === 'completed' ? accentHex : statusHexColors[course.status]
                    const bgColor = statusBgColors[course.status]
                    const textColor = statusTextColors[course.status]
                    return (
                      <motion.div
                        key={course.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.06, duration: 0.25, ease: 'easeOut' }}
                        whileHover={{ y: -4 }}
                        layout
                      >
                        <Card className={cn('hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden h-full border-2', statusBorderColors[course.status])} onClick={() => setSelectedCourseId(course.id)}>
                          <div className="h-1 bg-gradient-to-r" style={{ background: `linear-gradient(to right, ${hexColor}, ${hexColor}88)` }} />
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <Badge className={cn('text-[10px] rounded-full border-0', course.status === 'in-progress' ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : course.status === 'completed' ? '' : course.status === 'paused' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400')} style={course.status === 'completed' ? { color: accentHex, backgroundColor: `${accentHex}1A` } : undefined}>{course.status}</Badge>
                              <CourseProgressRing progress={course.progress} size={36} strokeWidth={3} color={hexColor} />
                            </div>
                            <div>
                              <h3 className="font-medium text-sm line-clamp-2">{course.title}</h3>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
                            </div>
                            {course.provider && <div className="flex items-center gap-1.5"><span className="text-xs">📚</span><span className="text-xs text-muted-foreground">{course.provider}</span></div>}
                            <div>
                              <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">{completedResources}/{course.resources.length} {t('learning.resourcesCount')}</span><span className="font-semibold" style={{ color: hexColor }}>{course.progress}%</span></div>
                              <Progress value={course.progress} className="h-1.5 [&>div]:bg-gradient-to-r" style={{ '--tw-gradient-from': hexColor } as React.CSSProperties} />
                            </div>
                            <RatingStars rating={course.rating} size={12} />
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
                {filteredCourses.length === 0 && (
                  <div className="col-span-full text-center py-16 text-muted-foreground">
                    <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center shadow-sm" style={{ background: `linear-gradient(to bottom right, ${accentHex}20, ${accentHex}10)` }}>
                      <GraduationCap className="h-10 w-10" style={{ color: accentHex }} />
                    </div>
                    <p className="text-base font-semibold text-foreground">{t('learning.noCourses')}</p>
                    <p className="text-sm mt-1.5 max-w-[240px] mx-auto">{t('learning.noCoursesDesc')}</p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <div className="flex items-center justify-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full cursor-pointer" style={{ color: accentHex, backgroundColor: `${accentHex}18` }} onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-3 w-3" />
                        <span>{t('learning.newCourse')}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full cursor-pointer" style={{ color: accentHex, backgroundColor: `${accentHex}18` }} onClick={() => setActiveTab('paths')}>
                        <Map className="h-3 w-3" />
                        <span>{t('learning.learningPaths')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="paths"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('learning.searchPaths')}
                  className="pl-9 h-9"
                  value={pathSearch}
                  onChange={e => setPathSearch(e.target.value)}
                />
                {pathSearch && (
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setPathSearch('')}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant={pathCategoryFilter === 'all' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPathCategoryFilter('all')}
                >
                  {t('learning.allCategories')}
                </Button>
                {categoryKeys.map(cat => (
                  <Button
                    key={cat}
                    variant={pathCategoryFilter === cat ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setPathCategoryFilter(cat)}
                  >
                    {t(`learning.categories.${cat}`)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Learning Paths Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredPaths.map((path, idx) => {
                  const catColor = categoryAccentColors[path.category]
                  const catGradient = categoryGradients[path.category]
                  const diffStyle = difficultyColors[path.difficulty]
                  return (
                    <motion.div
                      key={path.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.04, duration: 0.25, ease: 'easeOut' }}
                      whileHover={{ y: -4 }}
                      layout
                    >
                      <Card
                        className="hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden h-full border group"
                        onClick={() => setSelectedPath(path)}
                      >
                        <div className={`h-1.5 bg-gradient-to-r ${catGradient}`} style={{ background: `linear-gradient(to right, ${catColor}, ${catColor}88)` }} />
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: `linear-gradient(to bottom right, ${catColor}20, ${catColor}10)` }}>
                                {path.icon}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-medium text-sm line-clamp-2 group-hover:text-foreground transition-colors">{path.title}</h3>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{path.description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={cn('text-[10px] rounded-full border-0', diffStyle.bg, diffStyle.text)}>
                              {t(`learning.${path.difficulty}`)}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] rounded-full">
                              <Clock className="h-2.5 w-2.5 mr-0.5" />
                              {path.estimatedHours}h
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {path.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">{tag}</span>
                            ))}
                            {path.tags.length > 3 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">+{path.tags.length - 3}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{path.resources.length} {t('learning.resources').toLowerCase()}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            {filteredPaths.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center shadow-sm" style={{ background: `linear-gradient(to bottom right, ${accentHex}20, ${accentHex}10)` }}>
                  <Map className="h-10 w-10" style={{ color: accentHex }} />
                </div>
                <p className="text-base font-semibold text-foreground">
                  {pathSearch ? t('search') : t('noData')}
                </p>
                <p className="text-sm mt-1.5 max-w-[280px] mx-auto">
                  {pathSearch ? 'Try a different search term' : 'Select a different category'}
                </p>
                {pathSearch && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setPathSearch('')}>
                    {t('reset')} {t('search')}
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

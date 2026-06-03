'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Plus,
  Search,
  CalendarDays,
  List,
  Clock,
  Heart,
  Zap,
  TrendingUp,
  Star,
  Trash2,
  Pencil,
  BookOpen,
  Sparkles,
  Flame,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import type { JournalEntry } from '@/stores/journal-store'
import { useJournal, useCreateJournalEntry, useUpdateJournalEntry, useDeleteJournalEntry } from '@/lib/api/hooks'
import { useAppStore } from '@/stores/app-store'
import { useTranslation } from '@/lib/i18n'
import { showToast } from '@/lib/toast'

const moodConfigs: { value: JournalEntry['mood']; labelKey: string; icon: string; color: string; bg: string; cardBg: string; cardBorder: string }[] = [
  { value: 'amazing', labelKey: 'journal.amazing', icon: '😄', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30', cardBg: 'bg-emerald-50 dark:bg-emerald-950/20', cardBorder: 'border-emerald-200 dark:border-emerald-800/30' },
  { value: 'good', labelKey: 'journal.good', icon: '🙂', color: 'text-teal-700 dark:text-teal-300', bg: 'bg-teal-100 dark:bg-teal-900/30', cardBg: 'bg-teal-50 dark:bg-teal-950/20', cardBorder: 'border-teal-200 dark:border-teal-800/30' },
  { value: 'okay', labelKey: 'journal.okay', icon: '😐', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30', cardBg: 'bg-amber-50 dark:bg-amber-950/20', cardBorder: 'border-amber-200 dark:border-amber-800/30' },
  { value: 'bad', labelKey: 'journal.bad', icon: '😕', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/30', cardBg: 'bg-orange-50 dark:bg-orange-950/20', cardBorder: 'border-orange-200 dark:border-orange-800/30' },
  { value: 'terrible', labelKey: 'journal.terrible', icon: '😢', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/30', cardBg: 'bg-red-50 dark:bg-red-950/20', cardBorder: 'border-red-200 dark:border-red-800/30' },
]

const writingPrompts = [
  "What's one thing that made you smile today?",
  "What are you most grateful for right now?",
  "What challenge did you overcome recently?",
  "Describe a moment today when you felt at peace.",
  "What's something new you learned today?",
  "If you could relive one moment from today, what would it be?",
  "What's one thing you'd like to improve about tomorrow?",
  "How did you show kindness to yourself today?",
  "What's been on your mind the most lately?",
  "Describe your ideal day — what would it look like?",
  "What's a small win you had today that you haven't celebrated?",
  "What would you tell your future self about today?",
]

function cn(...inputs: (string | undefined | false)[]) {
  return inputs.filter(Boolean).join(' ')
}

function wordCount(text: string) { return text.split(/\s+/).filter(Boolean).length }
function readingTime(wc: number) { return Math.max(1, Math.round(wc / 200)) }

// Map API journal entry to local JournalEntry type
function mapApiEntry(apiEntry: Record<string, unknown>): JournalEntry {
  const tags = (apiEntry.tags as string || '').split(',').map(t => t.trim()).filter(Boolean)
  const entryTags = (apiEntry.entryTags as Record<string, unknown>[])?.map((t: Record<string, unknown>) => ((t.tag as Record<string, unknown>)?.name as string) || '').filter(Boolean) || []
  const allTags = [...tags, ...entryTags]

  return {
    id: apiEntry.id as string,
    title: (apiEntry.title as string) || null,
    content: (apiEntry.content as string) || '',
    mood: (apiEntry.mood as JournalEntry['mood']) || null,
    moodScore: (apiEntry.moodScore as number) || null,
    energy: (apiEntry.energy as number) ?? null,
    stress: (apiEntry.stress as number) ?? null,
    tags: allTags,
    isFavorite: (apiEntry.isFavorite as boolean) || false,
    date: new Date(apiEntry.date as string).toISOString().split('T')[0],
    createdAt: new Date(apiEntry.createdAt as string).toISOString(),
    updatedAt: new Date(apiEntry.updatedAt as string).toISOString(),
  }
}

export function JournalPage() {
  const { accentColor } = useAppStore()
  const { t } = useTranslation()
  const accentHexMap: Record<string, string> = {
    emerald: '#10b981', teal: '#14b8a6', amber: '#f59e0b',
    rose: '#f43f5e', violet: '#8b5cf6', cyan: '#06b6d4',
    indigo: '#6366f1', pink: '#ec4899', lime: '#84cc16', sky: '#0ea5e9',
  }
  const accentHex = accentHexMap[accentColor] || '#10b981'
  const { data: apiJournal, isLoading } = useJournal()
  const createEntryMutation = useCreateJournalEntry()
  const updateEntryMutation = useUpdateJournalEntry()
  const deleteEntryMutation = useDeleteJournalEntry()

  const entries: JournalEntry[] = useMemo(() => {
    if (!apiJournal) return []
    const apiEntries = (apiJournal as { entries: unknown[]; total: number }).entries as Record<string, unknown>[]
    return apiEntries.map(mapApiEntry)
  }, [apiJournal])

  const [journalView, setJournalView] = useState<'timeline' | 'calendar' | 'list'>('timeline')
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    mood: 'okay' as JournalEntry['mood'],
    energy: 50,
    stress: 30,
    tags: '',
    gratitude1: '',
    gratitude2: '',
    gratitude3: '',
  })

  // Daily writing prompt
  const [dailyPrompt] = useState(() => {
    const today = new Date()
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
    return writingPrompts[seed % writingPrompts.length]
  })

  const selectedEntry = useMemo(() => entries.find(e => e.id === selectedEntryId), [entries, selectedEntryId])
  const filteredEntries = useMemo(() => {
    if (!searchQuery) return entries
    const q = searchQuery.toLowerCase()
    return entries.filter(e => (e.title || '').toLowerCase().includes(q) || e.content.toLowerCase().includes(q) || e.tags.some(t => t.toLowerCase().includes(q)))
  }, [entries, searchQuery])

  const avgEnergy = useMemo(() => entries.length > 0 ? Math.round(entries.reduce((acc, e) => acc + (e.energy || 0), 0) / entries.length) : 0, [entries])
  const avgStress = useMemo(() => entries.length > 0 ? Math.round(entries.reduce((acc, e) => acc + (e.stress || 0), 0) / entries.length) : 0, [entries])

  // Writing streak calculation
  const writingStreak = useMemo(() => {
    if (entries.length === 0) return 0
    const sortedDates = [...new Set(entries.map(e => e.date))].sort().reverse()
    const todayStr = new Date().toISOString().split('T')[0]
    let streak = 0
    const checkDate = new Date()
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      if (sortedDates.includes(dateStr)) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (i === 0) {
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
    return streak
  }, [entries])

  // Word count for new entry
  const newEntryWordCount = useMemo(() => wordCount(newEntry.content), [newEntry.content])
  const dailyWordGoal = 500 // Daily writing goal
  const wordGoalPct = Math.min(100, Math.round((newEntryWordCount / dailyWordGoal) * 100))

  const handleAddEntry = useCallback(() => {
    if (!newEntry.content.trim()) return
    const moodScore = newEntry.mood === 'amazing' ? 5 : newEntry.mood === 'good' ? 4 : newEntry.mood === 'okay' ? 3 : newEntry.mood === 'bad' ? 2 : 1
    // Combine gratitude into content or use separate field
    const gratitudeParts = [newEntry.gratitude1, newEntry.gratitude2, newEntry.gratitude3].filter(Boolean)
    const gratitudeSection = gratitudeParts.length > 0 ? `\n\n## ${t('journal.gratitude')}\n${gratitudeParts.map((g, i) => `${i + 1}. ${g}`).join('\n')}` : ''

    createEntryMutation.mutate({
      title: newEntry.title || null,
      content: newEntry.content + gratitudeSection,
      mood: newEntry.mood,
      moodScore,
      energy: newEntry.energy,
      stress: newEntry.stress,
      tags: newEntry.tags,
      date: new Date().toISOString().split('T')[0],
    }, {
      onSuccess: () => {
        setNewEntry({ title: '', content: '', mood: 'okay', energy: 50, stress: 30, tags: '', gratitude1: '', gratitude2: '', gratitude3: '' })
        setCreateDialogOpen(false)
        showToast.success(t('toast.saved'))
      }
    })
  }, [newEntry, createEntryMutation, t])

  const openEditEntry = useCallback((entry: JournalEntry) => {
    setEditContent(entry.content)
    setEditDialogOpen(true)
  }, [])

  const handleUpdateEntry = useCallback(() => {
    if (!selectedEntry || !editContent.trim()) return
    updateEntryMutation.mutate({ id: selectedEntry.id, content: editContent }, {
      onSuccess: () => {
        setEditDialogOpen(false)
        showToast.success(t('toast.saved'))
      }
    })
  }, [selectedEntry, editContent, updateEntryMutation, t])

  const deleteEntry = useCallback((id: string) => {
    deleteEntryMutation.mutate(id)
    if (selectedEntryId === id) setSelectedEntryId(null)
    showToast.info(t('toast.deleted'))
  }, [deleteEntryMutation, selectedEntryId, t])

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const getEntriesForDate = (dateStr: string) => entries.filter(e => e.date === dateStr)

  const renderCalendarGrid = () => {
    const now = new Date(); const year = now.getFullYear(); const month = now.getMonth(); const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (number | null)[] = []; for (let i = 0; i < firstDay; i++) days.push(null); for (let i = 1; i <= daysInMonth; i++) days.push(i)
    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (<div key={d} className="text-center text-xs font-medium text-muted-foreground p-2">{t('days.' + d.toLowerCase())}</div>))}
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayEntries = getEntriesForDate(dateStr); const isToday = day === now.getDate()
          return (
            <div key={dateStr} className={cn('min-h-[60px] p-1 rounded-lg border text-xs cursor-pointer hover:bg-accent/50 transition-colors', isToday ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20' : 'border-border/30')} onClick={() => { if (dayEntries.length > 0) setSelectedEntryId(dayEntries[0].id) }}>
              <span className={cn('font-medium', isToday && 'text-emerald-600 dark:text-emerald-400')}>{day}</span>
              {dayEntries.map(e => { const mood = moodConfigs.find(m => m.value === e.mood); return (<div key={e.id} className="mt-0.5 truncate">{mood?.icon} <span className="truncate">{e.title || t('journal.journalEntry')}</span></div>) })}
            </div>
          )
        })}
      </div>
    )
  }

  // Extract gratitude from content
  const extractGratitude = (content: string): string[] => {
    const lines = content.split('\n')
    const gratitudeStart = lines.findIndex(l => l.startsWith('## Gratitude'))
    if (gratitudeStart === -1) return []
    const gratitudeLines = lines.slice(gratitudeStart + 1).filter(l => l.trim().startsWith('1.') || l.trim().startsWith('2.') || l.trim().startsWith('3.'))
    return gratitudeLines.map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
  }

  return (
    <div className="flex h-full animate-page-enter">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-border/50 space-y-[var(--lifeos-list-gap)]">
          <div className="flex items-center justify-between">
            <Tabs value={journalView} onValueChange={v => setJournalView(v as typeof journalView)}>
              <TabsList className="h-8">
                <TabsTrigger value="timeline" className="text-xs px-3 h-6"><Clock className="h-3.5 w-3.5 mr-1" />{t('journal.timeline')}</TabsTrigger>
                <TabsTrigger value="calendar" className="text-xs px-3 h-6"><CalendarDays className="h-3.5 w-3.5 mr-1" />{t('calendar.title')}</TabsTrigger>
                <TabsTrigger value="list" className="text-xs px-3 h-6"><List className="h-3.5 w-3.5 mr-1" />{t('tasks.list')}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />{t('journal.newEntry')}</Button></DialogTrigger>
              <DialogContent className="max-w-lg" aria-describedby={undefined}>
                <DialogHeader><DialogTitle>{t('journal.newEntry')}</DialogTitle><DialogDescription className="sr-only">Write a new journal entry</DialogDescription></DialogHeader>
                <div className="space-y-4 py-2">
                  <div><label className="text-sm font-medium mb-1.5 block">{t('journal.titleOptional')}</label><Input placeholder={t('journal.howWasYourDay')} value={newEntry.title} onChange={e => setNewEntry(p => ({ ...p, title: e.target.value }))} /></div>

                  {/* Writing Prompt */}
                  <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{t('journal.dailyPrompt')}</p>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">{dailyPrompt}</p>
                      </div>
                    </div>
                  </div>

                  <div><div className="flex items-center justify-between mb-1.5"><label className="text-sm font-medium">{t('journal.whatHappenedToday')}</label><span className={cn('text-xs tabular-nums', newEntryWordCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>{newEntryWordCount} {t('journal.words')}</span></div><Textarea placeholder={t('journal.writeAboutDay')} value={newEntry.content} onChange={e => setNewEntry(p => ({ ...p, content: e.target.value }))} rows={4} /></div>

                  {/* Gratitude Section */}
                  <div>
                    <label className="text-sm font-medium mb-2 block flex items-center gap-1.5">
                      <Heart className="h-3.5 w-3.5 text-rose-500" />
                      {t('journal.gratitudeLabel')}
                    </label>
                    <div className="space-y-2">
                      <Input placeholder="1. " value={newEntry.gratitude1} onChange={e => setNewEntry(p => ({ ...p, gratitude1: e.target.value }))} />
                      <Input placeholder="2. " value={newEntry.gratitude2} onChange={e => setNewEntry(p => ({ ...p, gratitude2: e.target.value }))} />
                      <Input placeholder="3. " value={newEntry.gratitude3} onChange={e => setNewEntry(p => ({ ...p, gratitude3: e.target.value }))} />
                    </div>
                  </div>

                  <div><label className="text-sm font-medium mb-2 block">{t('journal.howAreYouFeeling')}</label><div className="flex gap-2">{moodConfigs.map(mood => (<button key={mood.value} className={cn('flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105', newEntry.mood === mood.value ? 'shadow-sm' : 'border-transparent hover:border-muted hover:bg-accent/50')} style={newEntry.mood === mood.value ? { borderColor: accentHex, backgroundColor: `${accentHex}15` } : undefined} onClick={() => setNewEntry(p => ({ ...p, mood: mood.value }))}><span className="text-xl">{mood.icon}</span><span className="text-[10px] font-medium">{t(mood.labelKey)}</span></button>))}</div></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-sm font-medium mb-2 block flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500" />{t('journal.energyLabel')}: {newEntry.energy}%</label><Slider value={[newEntry.energy]} onValueChange={([v]) => setNewEntry(p => ({ ...p, energy: v }))} max={100} step={5} /></div>
                    <div><label className="text-sm font-medium mb-2 block flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-rose-500" />{t('journal.stressLabel')}: {newEntry.stress}%</label><Slider value={[newEntry.stress]} onValueChange={([v]) => setNewEntry(p => ({ ...p, stress: v }))} max={100} step={5} /></div>
                  </div>
                  <div><label className="text-sm font-medium mb-1.5 block">{t('tasks.tags')}</label><Input placeholder="tag1, tag2" value={newEntry.tags} onChange={e => setNewEntry(p => ({ ...p, tags: e.target.value }))} /></div>
                </div>
                <DialogFooter><DialogClose asChild><Button variant="outline">{t('cancel')}</Button></DialogClose><Button onClick={handleAddEntry} disabled={createEntryMutation.isPending}>{t('journal.saveEntry')}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={`${t('search')}...`} className="pl-9 h-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-[var(--lifeos-card-padding)] max-w-4xl mx-auto">
            {/* Writing Streak Indicator */}
            {writingStreak > 0 && (
              <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/50 dark:border-amber-800/30 shadow-sm">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-sm">
                  <Flame className="h-5 w-5 animate-fire" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-amber-700 dark:text-amber-300">{writingStreak}</span>
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">-day {t('journal.writingStreak').toLowerCase()}</span>
                  </div>
                  <span className="text-xs text-amber-600/70 dark:text-amber-400/70">{t('journal.keepMomentum')}</span>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(writingStreak, 7) }).map((_, i) => (
                    <div key={i} className="w-1.5 h-4 rounded-full bg-gradient-to-t from-orange-400 to-amber-300" style={{ height: `${8 + (i % 3) * 4}px` }} />
                  ))}
                </div>
              </div>
            )}
            {/* Word Count Progress Bar toward daily goal */}
            <div className="mb-4 border-l-2 border-rose-500/30 pl-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">{t('journal.dailyWritingGoal')}</span>
                <span className={cn('text-xs font-medium', wordGoalPct >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>{newEntryWordCount}/{dailyWordGoal} {t('journal.words')}</span>
              </div>
              <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full animate-word-progress', wordGoalPct >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-amber-500 to-orange-500')} style={{ width: `${wordGoalPct}%` }} />
              </div>
            </div>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-6 w-1/3 mb-3" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-2/3 mb-2" /><div className="flex gap-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" /></div></CardContent></Card>
                ))}
              </div>
            ) : journalView === 'calendar' ? renderCalendarGrid() : journalView === 'timeline' ? (
              <div className="space-y-1">
                {filteredEntries.map((entry, idx) => {
                  const mood = moodConfigs.find(m => m.value === entry.mood)
                  const wc = wordCount(entry.content)
                  const rt = readingTime(wc)
                  const gratitudeItems = extractGratitude(entry.content)
                  return (
                    <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="relative flex gap-4">
                      {idx < filteredEntries.length - 1 && <div className={cn('absolute left-[19px] top-12 bottom-0 w-px', mood?.value === 'amazing' ? 'bg-emerald-200 dark:bg-emerald-800/30' : mood?.value === 'good' ? 'bg-teal-200 dark:bg-teal-800/30' : mood?.value === 'okay' ? 'bg-amber-200 dark:bg-amber-800/30' : mood?.value === 'bad' ? 'bg-orange-200 dark:bg-orange-800/30' : mood?.value === 'terrible' ? 'bg-red-200 dark:bg-red-800/30' : 'bg-border')} />}
                      <div className="shrink-0 mt-3">
                        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm', mood?.bg || 'bg-muted')}>{mood?.icon || '📝'}</div>
                      </div>
                      <Card className={cn(
                        'flex-1 mb-4 cursor-pointer hover:shadow-md transition-all duration-200 border hover-lift shadow-card relative overflow-hidden',
                        selectedEntryId === entry.id && 'ring-2 shadow-md',
                        mood?.cardBorder || 'border-border/50'
                      )} style={selectedEntryId === entry.id ? { '--tw-ring-color': `${accentHex}40` } as React.CSSProperties : undefined}>
                        {/* Decorative mood emoji background */}
                        <div className="absolute top-2 right-3 text-6xl opacity-[0.08] pointer-events-none select-none">{mood?.icon || '📝'}</div>
                        <CardContent className={cn('p-4 relative z-10', mood?.cardBg)}>
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium text-sm">{entry.title || t('journal.journalEntry')}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">{formatDate(entry.date)}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {entry.isFavorite && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                              <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id) }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{entry.content.replace(/## Gratitude[\s\S]*$/, '').trim()}</p>

                          {/* Gratitude preview */}
                          {gratitudeItems.length > 0 && (
                            <div className="mt-2 p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20">
                              <p className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1"><Heart className="h-3 w-3" />{t('journal.gratitude')}</p>
                              <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                {gratitudeItems.map((g, i) => <li key={i}>{g}</li>)}
                              </ul>
                            </div>
                          )}

                          <div className="flex items-center gap-3 mt-3 flex-wrap">
                            {entry.energy !== null && <div className="flex items-center gap-1 text-xs"><Zap className="h-3 w-3 text-amber-500" /><span className="text-muted-foreground">{entry.energy}%</span></div>}
                            {entry.stress !== null && <div className="flex items-center gap-1 text-xs"><TrendingUp className="h-3 w-3 text-rose-500" /><span className="text-muted-foreground">{entry.stress}%</span></div>}
                            <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 rounded-full border-0 text-[10px] px-2"><BookOpen className="h-2.5 w-2.5 mr-0.5" />{wc} {t('journal.words')}</Badge>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{rt} {t('journal.minRead')}</span>
                            {entry.tags.slice(0, 3).map(tag => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
                {entries.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-950/40 dark:to-pink-950/40 flex items-center justify-center shadow-sm">
                      <BookOpen className="h-10 w-10 text-rose-500" />
                    </div>
                    <p className="text-base font-semibold text-foreground">{t('journal.noEntries')}</p>
                    <p className="text-sm mt-1.5 max-w-[240px] mx-auto">{t('journal.noEntriesDesc')}</p>
                    <div className="mt-4 flex items-center justify-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-full">
                      <Plus className="h-3 w-3" />
                      <span>{t('journal.newEntry')}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">{filteredEntries.map(entry => {
                const mood = moodConfigs.find(m => m.value === entry.mood); const wc = wordCount(entry.content)
                return (<div key={entry.id} className={cn('flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors', selectedEntryId === entry.id && 'bg-accent')} onClick={() => setSelectedEntryId(entry.id)}>
                    <span className="text-2xl">{mood?.icon || '📝'}</span>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{entry.title || t('journal.journalEntry')}</p><p className="text-xs text-muted-foreground truncate">{entry.content.slice(0, 80)}</p></div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(entry.date)}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{wc}w</span>
                </div>)
              })}</div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Edit Entry Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{t('edit')} {t('journal.journalEntry')}</DialogTitle><DialogDescription className="sr-only">Edit journal entry</DialogDescription></DialogHeader>
          <div className="py-2">
            <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={8} className="resize-none" />
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">{t('cancel')}</Button></DialogClose><Button onClick={handleUpdateEntry} disabled={updateEntryMutation.isPending}>{t('save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedEntry && (
        <div className="w-80 border-l border-border/50 bg-background shrink-0 hidden md:flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{selectedEntry.title || t('journal.journalEntry')}</h3>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditEntry(selectedEntry)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedEntryId(null)}>✕</Button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {(() => { const mood = moodConfigs.find(m => m.value === selectedEntry.mood); return mood ? <Badge className={cn(mood.bg, mood.color, 'rounded-full border-0')}>{mood.icon} {t(mood.labelKey)}</Badge> : null })()}
                <Badge variant="outline">{formatDate(selectedEntry.date)}</Badge>
              </div>
              <Separator />

              {/* Content without gratitude section */}
              <p className="text-sm leading-relaxed">{selectedEntry.content.replace(/## Gratitude[\s\S]*$/, '').trim()}</p>

              {/* Gratitude in detail panel */}
              {extractGratitude(selectedEntry.content).length > 0 && (
                <>
                  <Separator />
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20">
                    <p className="text-sm font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mb-2"><Heart className="h-4 w-4" />{t('journal.gratitude')}</p>
                    <ul className="space-y-1">
                      {extractGratitude(selectedEntry.content).map((g, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-rose-500 shrink-0">{i + 1}.</span>
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              <Separator />
              <div className="grid grid-cols-2 gap-3">
                {selectedEntry.energy !== null && <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20"><div className="flex items-center gap-1.5 mb-1"><Zap className="h-3.5 w-3.5 text-amber-500" /><span className="text-xs text-muted-foreground">{t('journal.energyLabel')}</span></div><p className="text-lg font-bold">{selectedEntry.energy}%</p></div>}
                {selectedEntry.stress !== null && <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/20"><div className="flex items-center gap-1.5 mb-1"><TrendingUp className="h-3.5 w-3.5 text-rose-500" /><span className="text-xs text-muted-foreground">{t('journal.stressLabel')}</span></div><p className="text-lg font-bold">{selectedEntry.stress}%</p></div>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BookOpen className="h-3 w-3" /><span>{wordCount(selectedEntry.content)} {t('journal.words')}</span>
                <Clock className="h-3 w-3 ml-2" /><span>{readingTime(wordCount(selectedEntry.content))} {t('journal.minRead')}</span>
              </div>
              {selectedEntry.tags.length > 0 && <div className="flex flex-wrap gap-1">{selectedEntry.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}</div>}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}

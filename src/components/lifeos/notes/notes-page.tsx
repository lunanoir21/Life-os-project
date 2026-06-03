'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Plus,
  Search,
  FolderOpen,
  FileText,
  Grid3X3,
  List,
  Tag,
  Pin,
  Star,
  Eye,
  Edit3,
  SplitSquareHorizontal,
  Trash2,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderPlus,
  Link2,
  Clock,
  Bold,
  Italic,
  Heading,
  ListOrdered,
  CheckSquare,
  Code,
  LinkIcon,
  Quote,
  Zap,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useNoteStore, type Note, type NoteFolder } from '@/stores/note-store'
import { useAppStore } from '@/stores/app-store'
import { useTranslation } from '@/lib/i18n'
import { showToast } from '@/lib/toast'
import { useNotes, useNoteFolders, useCreateNote, useUpdateNote, useDeleteNote } from '@/lib/api/hooks'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { motion, AnimatePresence } from 'framer-motion'

const typeColors: Record<string, { bg: string; text: string; dot: string; border: string; badge: string }> = {
  note: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500', border: 'border-l-amber-400', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  article: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500', border: 'border-l-blue-500', badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  reference: { bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-600 dark:text-teal-400', dot: 'bg-teal-500', border: 'border-l-teal-500', badge: 'bg-teal-500/10 text-teal-700 dark:text-teal-300' },
  idea: { bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-600 dark:text-violet-400', dot: 'bg-violet-500', border: 'border-l-violet-500', badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  'daily-note': { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', border: 'border-l-emerald-500', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
}

const typeEmojis: Record<string, string> = {
  note: '📝', article: '📰', reference: '📎', idea: '💡', 'daily-note': '📅',
}

const folderIcons: Record<string, string> = {
  default: '📁', pinned: '📌', favorite: '⭐',
}

function cn(...inputs: (string | undefined | false)[]) {
  return inputs.filter(Boolean).join(' ')
}

// Map API note to local Note type
function mapApiNote(apiNote: Record<string, unknown>): Note {
  const tags = (apiNote.tags as Record<string, unknown>[])?.map((t: Record<string, unknown>) => {
    const tag = t.tag as Record<string, unknown>
    return tag?.name as string || ''
  }).filter(Boolean) || []

  const backlinksCount = (apiNote._count as Record<string, number>)?.backlinks || 0

  return {
    id: apiNote.id as string,
    title: apiNote.title as string,
    content: (apiNote.content as string) || '',
    type: (apiNote.type as string) || 'note',
    icon: (apiNote.icon as string) || null,
    color: (apiNote.color as string) || null,
    isPinned: (apiNote.isPinned as boolean) || false,
    isFavorite: (apiNote.isFavorite as boolean) || false,
    wordCount: (apiNote.wordCount as number) || 0,
    folderId: (apiNote.folderId as string) || null,
    tags,
    links: [],
    backlinks: Array.from({ length: backlinksCount }, (_, i) => `bl-${i}`),
    createdAt: new Date(apiNote.createdAt as string).toISOString(),
    updatedAt: new Date(apiNote.updatedAt as string).toISOString(),
  }
}

function mapApiFolder(apiFolder: Record<string, unknown>): NoteFolder {
  const count = (apiFolder._count as Record<string, number>)?.notes || 0
  const children = (apiFolder.children as Record<string, unknown>[])?.map(mapApiFolder) || []
  return {
    id: apiFolder.id as string,
    name: apiFolder.name as string,
    icon: (apiFolder.icon as string) || '📁',
    color: (apiFolder.color as string) || '#6b7280',
    parentId: (apiFolder.parentId as string) || null,
    order: (apiFolder.order as number) || 0,
    children,
    noteCount: count,
  }
}

// Markdown toolbar button
function ToolbarButton({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 hover:bg-accent hover:shadow-sm hover:shadow-emerald-500/5 transition-all duration-150" onClick={onClick}>
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  )
}

// Relative time display
function RelativeTime({ dateStr }: { dateStr: string }) {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => forceUpdate(n => n + 1), 60000)
    return () => clearInterval(timer)
  }, [])

  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  let label = ''
  if (diffSeconds < 60) label = 'Just now'
  else if (diffMinutes < 60) label = `${diffMinutes}m ago`
  else if (diffHours < 24) label = `${diffHours}h ago`
  else if (diffDays < 7) label = `${diffDays}d ago`
  else label = date.toLocaleDateString()

  return <span className="text-[10px] text-muted-foreground">{label}</span>
}

export function NotesPage() {
  const { accentColor } = useAppStore()
  const { t } = useTranslation()
  const accentHexMap: Record<string, string> = {
    emerald: '#10b981', teal: '#14b8a6', amber: '#f59e0b',
    rose: '#f43f5e', violet: '#8b5cf6', cyan: '#06b6d4',
    indigo: '#6366f1', pink: '#ec4899', lime: '#84cc16', sky: '#0ea5e9',
  }
  const accentHex = accentHexMap[accentColor] || '#10b981'
  const { data: apiNotes, isLoading } = useNotes()
  const { data: apiFolders } = useNoteFolders()
  const createNoteMutation = useCreateNote()
  const updateNoteMutation = useUpdateNote()
  const deleteNoteMutation = useDeleteNote()
  const editorRef = useRef<HTMLTextAreaElement>(null)

  const notes: Note[] = useMemo(() => {
    if (!apiNotes) return []
    return (apiNotes as Record<string, unknown>[]).map(mapApiNote)
  }, [apiNotes])

  const folders: NoteFolder[] = useMemo(() => {
    if (!apiFolders) return []
    return (apiFolders as Record<string, unknown>[]).map(mapApiFolder)
  }, [apiFolders])

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [noteView, setNoteView] = useState<'grid' | 'list'>('grid')
  const [editorMode, setEditorMode] = useState<'edit' | 'preview' | 'split'>('edit')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newNote, setNewNote] = useState({ title: '', type: 'note' as Note['type'], folderId: '', tags: '' })

  const selectedNote = useMemo(() => notes.find(n => n.id === selectedNoteId), [notes, selectedNoteId])

  const filteredNotes = useMemo(() => {
    let result = notes
    if (selectedFolderId) {
      result = result.filter(n => n.folderId === selectedFolderId)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    }
    return result.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
  }, [notes, selectedFolderId, searchQuery])

  // Compute live word count from content
  const currentWordCount = useMemo(() => {
    if (!selectedNote) return 0
    return selectedNote.content.split(/\s+/).filter(Boolean).length
  }, [selectedNote])

  const currentReadingTime = useMemo(() => Math.max(1, Math.round(currentWordCount / 200)), [currentWordCount])

  const handleAddNote = useCallback(() => {
    if (!newNote.title.trim()) return
    createNoteMutation.mutate({
      title: newNote.title,
      type: newNote.type,
      folderId: newNote.folderId || null,
      content: '',
    }, {
      onSuccess: (data) => {
        const created = data as Record<string, unknown>
        setSelectedNoteId(created.id as string)
        setNewNote({ title: '', type: 'note', folderId: '', tags: '' })
        setCreateDialogOpen(false)
        showToast.success('Note created')
        // Focus editor after creation
        setTimeout(() => editorRef.current?.focus(), 100)
      }
    })
  }, [newNote, createNoteMutation])

  // Quick note: create note and immediately focus editor
  const handleQuickNote = useCallback(() => {
    createNoteMutation.mutate({
      title: 'Quick Note',
      type: 'note',
      content: '',
    }, {
      onSuccess: (data) => {
        const created = data as Record<string, unknown>
        setSelectedNoteId(created.id as string)
        showToast.success('Quick note created')
        setTimeout(() => editorRef.current?.focus(), 100)
      }
    })
  }, [createNoteMutation])

  const updateNoteContent = useCallback((id: string, content: string) => {
    updateNoteMutation.mutate({
      id,
      content,
      wordCount: content.split(/\s+/).filter(Boolean).length,
    })
  }, [updateNoteMutation])

  const togglePin = useCallback((id: string) => {
    const note = notes.find(n => n.id === id)
    if (note) {
      updateNoteMutation.mutate({ id, isPinned: !note.isPinned })
      showToast.success(note.isPinned ? 'Note unpinned' : 'Note pinned 📌')
    }
  }, [notes, updateNoteMutation])

  const toggleFavorite = useCallback((id: string) => {
    const note = notes.find(n => n.id === id)
    if (note) updateNoteMutation.mutate({ id, isFavorite: !note.isFavorite })
  }, [notes, updateNoteMutation])

  const deleteNote = useCallback((id: string) => {
    deleteNoteMutation.mutate(id)
    if (selectedNoteId === id) setSelectedNoteId(null)
    showToast.info('Note deleted')
  }, [deleteNoteMutation, selectedNoteId])

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Markdown formatting handler - processes formatting spec on click (ref accessed only in event handler)
  const handleToolbarAction = useCallback((type: 'wrap' | 'line', prefix: string, suffix: string = '') => {
    if (!selectedNote) return
    const textarea = editorRef.current
    if (!textarea) {
      // Fallback: append at end
      const newContent = selectedNote.content + (selectedNote.content ? '\n' : '') + prefix + suffix
      updateNoteContent(selectedNote.id, newContent)
      return
    }
    const content = selectedNote.content
    if (type === 'wrap') {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = content.substring(start, end)
      const newText = content.substring(0, start) + prefix + selectedText + suffix + content.substring(end)
      updateNoteContent(selectedNote.id, newText)
      requestAnimationFrame(() => {
        const cursorPos = start + prefix.length + selectedText.length + suffix.length
        textarea.setSelectionRange(cursorPos, cursorPos)
        textarea.focus()
      })
    } else {
      // Line prefix insertion
      const cursorPos = textarea.selectionStart
      const lineStart = content.lastIndexOf('\n', cursorPos - 1) + 1
      const lineEnd = content.indexOf('\n', cursorPos)
      const actualLineEnd = lineEnd === -1 ? content.length : lineEnd
      const currentLine = content.substring(lineStart, actualLineEnd)
      if (currentLine.startsWith(prefix)) {
        const newText = content.substring(0, lineStart) + currentLine.substring(prefix.length) + content.substring(actualLineEnd)
        updateNoteContent(selectedNote.id, newText)
        requestAnimationFrame(() => {
          textarea.setSelectionRange(cursorPos - prefix.length, cursorPos - prefix.length)
          textarea.focus()
        })
      } else {
        const newText = content.substring(0, lineStart) + prefix + currentLine + content.substring(actualLineEnd)
        updateNoteContent(selectedNote.id, newText)
        requestAnimationFrame(() => {
          textarea.setSelectionRange(cursorPos + prefix.length, cursorPos + prefix.length)
          textarea.focus()
        })
      }
    }
  }, [selectedNote, updateNoteContent])

  const toolbarActions = [
    { icon: Bold, label: 'Bold', type: 'wrap' as const, prefix: '**', suffix: '**' },
    { icon: Italic, label: 'Italic', type: 'wrap' as const, prefix: '*', suffix: '*' },
    { icon: Heading, label: 'Heading', type: 'line' as const, prefix: '## ' },
    { icon: ListOrdered, label: 'List', type: 'line' as const, prefix: '- ' },
    { icon: CheckSquare, label: 'Checklist', type: 'line' as const, prefix: '- [ ] ' },
    { icon: Code, label: 'Code', type: 'wrap' as const, prefix: '`', suffix: '`' },
    { icon: LinkIcon, label: 'Link', type: 'wrap' as const, prefix: '[', suffix: '](url)' },
    { icon: Quote, label: 'Quote', type: 'line' as const, prefix: '> ' },
  ]

  const renderFolder = (folder: NoteFolder, depth = 0) => {
    const hasPinnedNotes = notes.some(n => n.folderId === folder.id && n.isPinned)
    const hasFavoriteNotes = notes.some(n => n.folderId === folder.id && n.isFavorite)
    const folderIcon = hasFavoriteNotes ? folderIcons.favorite : hasPinnedNotes ? folderIcons.pinned : (folder.icon || folderIcons.default)

    return (
      <div key={folder.id}>
        <button
          className={cn(
            'w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm hover:bg-accent/50 transition-all duration-200',
            selectedFolderId === folder.id ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground'
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => setSelectedFolderId(selectedFolderId === folder.id ? null : folder.id)}
        >
          {folder.children.length > 0 ? (
            <span onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id) }} className="transition-transform duration-200 inline-flex">
              {expandedFolders.has(folder.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </span>
          ) : (
            <span className="w-3" />
          )}
          <span className="text-sm">{folderIcon}</span>
          <span className="truncate flex-1 text-left">{folder.name}</span>
          <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{folder.noteCount}</span>
        </button>
        {folder.children.length > 0 && expandedFolders.has(folder.id) && (
          <div className="overflow-hidden transition-all duration-200">
            {folder.children.map(child => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const readingTime = (wordCount: number) => Math.max(1, Math.round(wordCount / 200))

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full animate-page-enter">
        {/* Folder Sidebar */}
        <div className="w-56 border-r border-border/50 shrink-0 hidden md:flex flex-col">
          <div className="p-3 border-b border-border/50 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">{t('notes.folder')}</h3>
          </div>
          <ScrollArea className="flex-1 p-2">
            <button
              className={cn(
                'w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm hover:bg-accent/50 transition-all duration-200',
                !selectedFolderId ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground'
              )}
              onClick={() => setSelectedFolderId(null)}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              <span>{t('notes.allNotes')}</span>
              <span className="ml-auto text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{notes.length}</span>
            </button>
            {folders.map(f => renderFolder(f))}
          </ScrollArea>
        </div>

        {/* Notes List */}
        <div className="w-72 border-r border-border/50 shrink-0 flex flex-col">
          <div className="p-3 border-b border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">{t('notes.title')}</h3>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600" onClick={handleQuickNote}>
                      <Zap className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{t('notes.quickNotes')}</TooltipContent>
                </Tooltip>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600"><Plus className="h-4 w-4" /></Button>
                  </DialogTrigger>
                  <DialogContent aria-describedby={undefined}>
                    <DialogHeader><DialogTitle>{t('notes.newNote')}</DialogTitle><DialogDescription className="sr-only">Create a new note</DialogDescription></DialogHeader>
                    <div className="space-y-4 py-2">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">{t('notes.noteTitle')}</label>
                        <Input placeholder={t('notes.noteTitle')} value={newNote.title} onChange={e => setNewNote(p => ({ ...p, title: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">{t('notes.type')}</label>
                          <Select value={newNote.type} onValueChange={v => setNewNote(p => ({ ...p, type: v as Note['type'] }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="note">📝 Note</SelectItem>
                              <SelectItem value="article">📰 Article</SelectItem>
                              <SelectItem value="reference">📎 Reference</SelectItem>
                              <SelectItem value="idea">💡 Idea</SelectItem>
                              <SelectItem value="daily-note">📅 Daily Note</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">{t('notes.tags')}</label>
                          <Input placeholder="tag1, tag2" value={newNote.tags} onChange={e => setNewNote(p => ({ ...p, tags: e.target.value }))} />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">{t('cancel')}</Button></DialogClose>
                      <Button onClick={handleAddNote} disabled={createNoteMutation.isPending}>{t('create')}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder={t('notes.searchNotes')} className="pl-8 h-8 text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-3">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              ) : filteredNotes.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-950/40 dark:to-amber-900/40 flex items-center justify-center shadow-sm">
                      <FileText className="h-8 w-8 text-amber-500" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{t('notes.noNotes')}</p>
                    <p className="text-xs mt-1 max-w-[180px] mx-auto">{t('notes.noNotesDesc')}</p>
                    <div className="mt-3 flex items-center justify-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-full">
                      <Plus className="h-3 w-3" />
                      <span>{t('notes.newNote')}</span>
                    </div>
                  </div>
                </div>
              ) : filteredNotes.map(note => {
                const typeStyle = typeColors[note.type]
                return (
                  <motion.button
                    key={note.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      'w-full text-left p-2.5 rounded-lg transition-all duration-200 border-l-[3px] hover:shadow-md hover:-translate-y-0.5',
                      typeStyle?.border || 'border-l-slate-400',
                      selectedNoteId === note.id ? 'bg-accent shadow-sm bg-gradient-to-r from-accent/80 to-accent' : 'hover:bg-accent/50'
                    )}
                    onClick={() => setSelectedNoteId(note.id)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {/* Pin icon with glow */}
                          {note.isPinned && (
                            <span className="shrink-0 inline-flex items-center justify-center w-4 h-4">
                              <Pin className="h-3 w-3 text-amber-500 drop-shadow-[0_0_3px_rgba(245,158,11,0.5)]" />
                            </span>
                          )}
                          <p className="text-sm font-medium truncate">{note.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{note.content.slice(0, 60) || t('notes.emptyNote')}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {/* Type badge with distinct colors */}
                          <Badge className={cn('text-[9px] px-1.5 py-0 h-4 rounded-full border-0', typeStyle?.badge)}>
                            {typeEmojis[note.type]} {note.type}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            <RelativeTime dateStr={note.updatedAt} />
                          </span>
                          <span className="text-[10px] text-muted-foreground">{note.wordCount}w</span>
                          {note.backlinks.length > 0 && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Link2 className="h-2.5 w-2.5" />{note.backlinks.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {isLoading ? (
            <div className="p-[var(--lifeos-card-padding)] space-y-[var(--lifeos-list-gap)]">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : selectedNote ? (
            <>
              <div className="p-3 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Input
                    value={selectedNote.title}
                    onChange={e => updateNoteMutation.mutate({ id: selectedNote.id, title: e.target.value })}
                    className="font-semibold border-0 p-0 h-auto focus-visible:ring-0 text-lg"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Button variant={editorMode === 'edit' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setEditorMode('edit')}>
                    <Edit3 className="h-3.5 w-3.5 mr-1" />{t('notes.edit')}
                  </Button>
                  <Button variant={editorMode === 'preview' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setEditorMode('preview')}>
                    <Eye className="h-3.5 w-3.5 mr-1" />{t('notes.preview')}
                  </Button>
                  <Button variant={editorMode === 'split' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setEditorMode('split')}>
                    <SplitSquareHorizontal className="h-3.5 w-3.5 mr-1" />{t('notes.split')}
                  </Button>
                  <Separator orientation="vertical" className="h-5 mx-1" />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePin(selectedNote.id)}>
                    <Pin className={cn('h-3.5 w-3.5 transition-all duration-200', selectedNote.isPinned && 'text-amber-500 drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]')} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleFavorite(selectedNote.id)}>
                    <Star className={cn('h-3.5 w-3.5 transition-colors', selectedNote.isFavorite && 'text-amber-500 fill-amber-500')} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => deleteNote(selectedNote.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Markdown Toolbar */}
              {(editorMode === 'edit' || editorMode === 'split') && (
                <div className="px-3 py-1.5 border-b border-border/50 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                      {toolbarActions.map((tool) => (
                        <ToolbarButton key={tool.label} icon={tool.icon} label={tool.label} onClick={() => handleToolbarAction(tool.type, tool.prefix, tool.suffix)} />
                      ))}
                    </div>
                    {/* Word count & reading time strip */}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                      <span className="flex items-center gap-1">
                        <FileText className="h-2.5 w-2.5" />
                        {currentWordCount} {t('notes.words')}
                      </span>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {currentReadingTime} {t('notes.minRead')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-auto">
                {(editorMode === 'edit' || editorMode === 'split') && (
                  <div className={editorMode === 'split' ? 'w-1/2 h-full inline-block align-top' : 'h-full'}>
                    <Textarea
                      ref={editorRef}
                      value={selectedNote.content}
                      onChange={e => updateNoteContent(selectedNote.id, e.target.value)}
                      className="w-full h-full resize-none border-0 focus-visible:ring-0 p-[var(--lifeos-card-padding)] font-mono text-sm leading-relaxed bg-amber-50/30 dark:bg-amber-950/5"
                      placeholder={t('notes.startWriting')}
                    />
                  </div>
                )}
                {(editorMode === 'preview' || editorMode === 'split') && (
                  <div className={`${editorMode === 'split' ? 'w-1/2 h-full inline-block align-top' : 'h-full'} p-[var(--lifeos-card-padding)]`}>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {selectedNote.content.split('\n').map((line, i) => {
                        if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mt-4 mb-2">{line.slice(2)}</h1>
                        if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold mt-3 mb-1.5 text-foreground">{line.slice(3)}</h2>
                        if (line.startsWith('- [ ] ')) return <div key={i} className="flex items-center gap-2 ml-4 py-0.5"><input type="checkbox" disabled className="rounded accent-emerald-500" /><span className="text-muted-foreground">{line.slice(6)}</span></div>
                        if (line.startsWith('- ')) return <div key={i} className="flex items-start gap-2 ml-4 py-0.5"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500/50 shrink-0" /><span>{line.slice(2)}</span></div>
                        if (line.startsWith('> ')) return <blockquote key={i} className="border-l-2 border-emerald-500/30 pl-4 italic text-muted-foreground py-1">{line.slice(2)}</blockquote>
                        if (line.trim() === '') return <br key={i} />
                        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold">{line.slice(2, -2)}</p>
                        return <p key={i} className="leading-relaxed py-0.5">{line}</p>
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom bar with word count, reading time, and type badge */}
              <div className="px-4 py-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <Badge className={cn('text-[9px] px-1.5 h-4 rounded-full border-0', typeColors[selectedNote.type]?.badge)}>
                    {typeEmojis[selectedNote.type]} {selectedNote.type}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <FileText className="h-2.5 w-2.5" />
                    {currentWordCount} {t('notes.words')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {currentReadingTime} {t('notes.minRead')}
                  </span>
                  <span className="flex items-center gap-1">
                    {t('notes.edited')} <RelativeTime dateStr={selectedNote.updatedAt} />
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {selectedNote.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Better empty state */
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-center max-w-sm"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{t('notes.noNotes')}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t('notes.noNotesDesc')}</p>
                <div className="flex items-center gap-2 justify-center">
                  <Button
                    size="sm"
                    className="text-white shadow-sm"
                    style={{ background: `linear-gradient(to right, ${accentHex}, ${accentHex}cc)` }}
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />{t('notes.newNote')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleQuickNote}
                  >
                    <Zap className="h-4 w-4 mr-1.5" />{t('notes.quickNotes')}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

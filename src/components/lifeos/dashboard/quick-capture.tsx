'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare, StickyNote, BookOpen, Repeat, Send, ChevronDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { showToast } from '@/lib/toast'
import { useAppStore } from '@/stores/app-store'
import { useTranslation } from '@/lib/i18n'

type CaptureType = 'task' | 'note' | 'journal' | 'habit'

const captureTypes: { value: CaptureType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'task', label: 'Task', icon: CheckSquare, color: 'text-orange-500' },
  { value: 'note', label: 'Note', icon: StickyNote, color: 'text-amber-500' },
  { value: 'journal', label: 'Journal', icon: BookOpen, color: 'text-rose-500' },
  { value: 'habit', label: 'Habit', icon: Repeat, color: 'text-teal-500' },
]

export function QuickCapture() {
  const { accentColor } = useAppStore()
  const { t } = useTranslation()
  const accentHexMap: Record<string, string> = {
    emerald: '#10b981', teal: '#14b8a6', amber: '#f59e0b',
    rose: '#f43f5e', violet: '#8b5cf6', cyan: '#06b6d4',
  }
  const accentHex = accentHexMap[accentColor] || '#10b981'
  const [expanded, setExpanded] = useState(true)
  const [captureType, setCaptureType] = useState<CaptureType>('task')
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  // Auto-focus when expanded
  useEffect(() => {
    if (expanded) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [expanded])

  const handleSubmit = async () => {
    const title = inputValue.trim()
    if (!title) return

    setIsSubmitting(true)

    try {
      switch (captureType) {
        case 'task': {
          const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, status: 'todo', priority: 'medium' }),
          })
          if (!res.ok) throw new Error('Failed to create task')
          showToast.success('Task captured', `"${title}" added to your tasks`)
          break
        }
        case 'note': {
          // First try to find a "Quick Notes" folder
          let folderId: string | null = null
          try {
            const foldersRes = await fetch('/api/note-folders')
            if (foldersRes.ok) {
              const folders = await foldersRes.json()
              const quickNotesFolder = (folders as { id: string; name: string }[]).find(
                (f) => f.name === 'Quick Notes'
              )
              if (quickNotesFolder) {
                folderId = quickNotesFolder.id
              } else {
                // Create the Quick Notes folder
                const createFolderRes = await fetch('/api/note-folders', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: 'Quick Notes', icon: '⚡', color: '#f59e0b' }),
                })
                if (createFolderRes.ok) {
                  const folder = await createFolderRes.json()
                  folderId = (folder as { id: string }).id
                }
              }
            }
          } catch {
            // Folder lookup/create failed, create note without folder
          }

          const res = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content: '', folderId }),
          })
          if (!res.ok) throw new Error('Failed to create note')
          showToast.success('Note captured', `"${title}" added to Quick Notes`)
          break
        }
        case 'journal': {
          const res = await fetch('/api/journal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content: '', mood: 'good', energy: 5, stress: 3 }),
          })
          if (!res.ok) throw new Error('Failed to create journal entry')
          showToast.success('Journal entry captured', `"${title}" added to your journal`)
          break
        }
        case 'habit': {
          showToast.info('Habits can be created in the Habits module', 'Navigate to Habits to set up new habits')
          break
        }
      }

      setInputValue('')
    } catch {
      showToast.error('Capture failed', 'Could not save your item. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const selectedType = captureTypes.find((t) => t.value === captureType)
  const SelectedIcon = selectedType?.icon ?? CheckSquare

  return (
    <Card className="rounded-xl shadow-sm overflow-hidden animate-page-enter">
      <CardContent className="p-0">
        {/* Header - always visible, clickable to toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors duration-200"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent/50 flex items-center justify-center">
              <SelectedIcon className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold">{t('quickCapture.title')}</span>
          </div>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
          </motion.div>
        </button>

        {/* Expandable content */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                {/* Type selector as pill buttons */}
                <div className="flex gap-1.5">
                  {captureTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setCaptureType(type.value)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        captureType === type.value
                          ? 'bg-accent/70 text-foreground shadow-sm'
                          : 'bg-accent/20 text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                      }`}
                    >
                      <type.icon className={`h-3 w-3 ${captureType === type.value ? type.color : ''}`} />
                      {type.label}
                    </button>
                  ))}
                </div>

                {/* Input area */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        captureType === 'task'
                          ? t('quickCapture.addPlaceholder', { type: t('dashboard.task').toLowerCase() })
                          : captureType === 'note'
                            ? t('quickCapture.addPlaceholder', { type: t('dashboard.note').toLowerCase() })
                            : captureType === 'journal'
                              ? t('quickCapture.addPlaceholder', { type: t('nav.journal').toLowerCase() })
                              : `${t('search')}...`
                      }
                      className="text-sm h-9 pr-10"
                      disabled={isSubmitting}
                    />
                    <Badge
                      variant="outline"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] px-1.5 py-0 border-0 bg-muted/50 text-muted-foreground/60"
                    >
                      ↵
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!inputValue.trim() || isSubmitting}
                    className="h-9 px-3 rounded-lg"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Search,
  CheckSquare,
  StickyNote,
  BookOpen,
  Repeat,
  Target,
  CalendarDays,
  GraduationCap,
  ArrowRight,
  Clock,
  X,
  Sparkles,
} from 'lucide-react'
import { useAppStore, type ModuleId } from '@/stores/app-store'
import { useSearch, type SearchResult } from '@/lib/api/hooks'
import { motion, AnimatePresence } from 'framer-motion'

const iconMap: Record<string, React.ElementType> = {
  CheckSquare,
  StickyNote,
  BookOpen,
  Repeat,
  Target,
  CalendarDays,
  GraduationCap,
}

const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800', badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800', badge: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800', badge: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300' },
  sky: { bg: 'bg-sky-50 dark:bg-sky-950/30', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-800', badge: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800', badge: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300' },
}

const moduleLabels: Record<string, string> = {
  tasks: 'Tasks',
  notes: 'Notes',
  journal: 'Journal',
  habits: 'Habits',
  goals: 'Goals',
  calendar: 'Calendar',
  learning: 'Learning',
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-200/60 dark:bg-amber-800/40 text-foreground rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

interface RecentSearchItem {
  query: string
  timestamp: number
}

function getRecentSearches(): RecentSearchItem[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem('lifeos-recent-searches')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveRecentSearch(query: string) {
  if (typeof window === 'undefined') return
  try {
    const existing = getRecentSearches()
    const filtered = existing.filter(s => s.query !== query)
    filtered.unshift({ query, timestamp: Date.now() })
    const trimmed = filtered.slice(0, 8)
    localStorage.setItem('lifeos-recent-searches', JSON.stringify(trimmed))
  } catch { /* ignore */ }
}

function removeRecentSearch(query: string) {
  if (typeof window === 'undefined') return
  try {
    const existing = getRecentSearches()
    const filtered = existing.filter(s => s.query !== query)
    localStorage.setItem('lifeos-recent-searches', JSON.stringify(filtered))
  } catch { /* ignore */ }
}

export function GlobalSearchPanel() {
  const { globalSearchOpen, setGlobalSearchOpen, setActiveModule } = useAppStore()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: searchData, isLoading } = useSearch(debouncedQuery)

  // Group results by type
  const groupedResults = useMemo(() => {
    if (!searchData?.results) return {}
    const groups: Record<string, SearchResult[]> = {}
    for (const r of searchData.results) {
      if (!groups[r.type]) groups[r.type] = []
      groups[r.type].push(r)
    }
    return groups
  }, [searchData])

  // Flatten for keyboard navigation
  const flatResults = useMemo(() => searchData?.results || [], [searchData])

  // Load recent searches when panel opens
  useEffect(() => {
    if (globalSearchOpen) {
      const recent = getRecentSearches()
      // Use a micro-delay to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        setRecentSearches(recent)
        setQuery('')
        setDebouncedQuery('')
        setSelectedIndex(-1)
        inputRef.current?.focus()
      })
    }
  }, [globalSearchOpen])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && globalSearchOpen) {
        e.preventDefault()
        setGlobalSearchOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [globalSearchOpen, setGlobalSearchOpen])

  const handleSelect = useCallback((result: SearchResult) => {
    saveRecentSearch(query || result.title)
    setActiveModule(result.module as ModuleId)
    setGlobalSearchOpen(false)
  }, [query, setActiveModule, setGlobalSearchOpen])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < flatResults.length) {
      e.preventDefault()
      handleSelect(flatResults[selectedIndex])
    }
  }, [flatResults, selectedIndex, handleSelect])

  // Scroll selected into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedEl = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      selectedEl?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const handleRecentClick = (searchQuery: string) => {
    setQuery(searchQuery)
    setDebouncedQuery(searchQuery)
  }

  const hasResults = flatResults.length > 0
  const showRecent = !query && recentSearches.length > 0

  return (
    <AnimatePresence>
      {globalSearchOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setGlobalSearchOpen(false)}
          />

          {/* Search Panel */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-x-0 top-0 z-50 mx-auto max-w-2xl px-4 pt-[8vh]"
          >
            <div className="bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
                <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setSelectedIndex(-1)
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search tasks, notes, habits, goals..."
                  className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/60"
                />
                {isLoading && (
                  <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-emerald-500 rounded-full animate-spin" />
                )}
                {query && (
                  <button
                    onClick={() => { setQuery(''); setDebouncedQuery(''); inputRef.current?.focus() }}
                    className="p-1 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  Esc
                </kbd>
              </div>

              {/* Results */}
              <div ref={resultsRef} className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                {/* Recent Searches */}
                {showRecent && (
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2 px-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Searches</span>
                      <Sparkles className="h-3.5 w-3.5 text-muted-foreground/40" />
                    </div>
                    <div className="space-y-0.5">
                      {recentSearches.map((item) => (
                        <div
                          key={item.query}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                          onClick={() => handleRecentClick(item.query)}
                        >
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                          <span className="text-sm flex-1 truncate">{item.query}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeRecentSearch(item.query)
                              setRecentSearches(getRecentSearches())
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent transition-all"
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grouped Results */}
                {hasResults && !showRecent && (
                  <div className="p-3 space-y-4">
                    {Object.entries(groupedResults).map(([type, items]) => {
                      const firstItem = items[0]
                      const Icon = iconMap[firstItem.icon] || Search
                      const colors = colorMap[firstItem.color] || colorMap.orange

                      return (
                        <div key={type}>
                          <div className="flex items-center gap-2 mb-2 px-2">
                            <div className={`p-1 rounded-md ${colors.bg}`}>
                              <Icon className={`h-3.5 w-3.5 ${colors.text}`} />
                            </div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {type}
                            </span>
                            <span className="text-[10px] text-muted-foreground/50 ml-auto">
                              {moduleLabels[firstItem.module] || firstItem.module}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {items.map((item) => {
                              const flatIndex = flatResults.indexOf(item)
                              const isSelected = flatIndex === selectedIndex

                              return (
                                <motion.div
                                  key={item.id}
                                  data-index={flatIndex}
                                  initial={{ opacity: 0, x: -5 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.1, delay: flatIndex * 0.02 }}
                                  className={`
                                    flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-100 group
                                    ${isSelected ? 'bg-accent ring-1 ring-primary/20' : 'hover:bg-accent/50'}
                                  `}
                                  onClick={() => handleSelect(item)}
                                  onMouseEnter={() => setSelectedIndex(flatIndex)}
                                >
                                  <div className={`p-1.5 rounded-md shrink-0 ${colors.bg}`}>
                                    <Icon className={`h-4 w-4 ${colors.text}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      <HighlightText text={item.title} query={query} />
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                      <HighlightText text={item.description} query={query} />
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors.badge}`}>
                                      {type}
                                    </span>
                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* No Results */}
                {query && debouncedQuery && !isLoading && !hasResults && (
                  <div className="p-8 text-center">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="text-sm font-medium text-muted-foreground">No results found</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Try searching for a different term
                    </p>
                  </div>
                )}

                {/* Empty state - no query */}
                {!query && !showRecent && (
                  <div className="p-8 text-center">
                    <div className="text-4xl mb-3">✨</div>
                    <p className="text-sm font-medium text-muted-foreground">Search across all modules</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Tasks, notes, habits, goals, events, and more
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      {['Tasks', 'Notes', 'Habits', 'Goals', 'Journal'].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => { setQuery(tag); setDebouncedQuery(tag) }}
                          className="text-xs px-2.5 py-1 rounded-full border border-border/50 bg-accent/30 hover:bg-accent/60 transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-2.5 border-t border-border/30 bg-muted/20 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex h-4 items-center rounded border bg-muted px-1 font-mono text-[9px]">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex h-4 items-center rounded border bg-muted px-1 font-mono text-[9px]">↵</kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex h-4 items-center rounded border bg-muted px-1 font-mono text-[9px]">esc</kbd>
                    Close
                  </span>
                </div>
                {hasResults && (
                  <span>{flatResults.length} result{flatResults.length !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

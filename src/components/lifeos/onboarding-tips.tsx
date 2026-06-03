'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Keyboard, BarChart3, Moon, Maximize, Search, X, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app-store'
import { useTheme } from 'next-themes'
import { useTranslation } from '@/lib/i18n'

const TIPS_STORAGE_KEY = 'lifeos-tips-dismissed'
const TIPS_COUNT = 6

function getInitialDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(TIPS_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

interface TipData {
  id: number
  icon: React.ElementType
  title: string
  description: string
  actionLabel: string
  actionKey: string
}

const tipDefinitions: TipData[] = [
  {
    id: 1,
    icon: Zap,
    title: 'Quick Capture',
    description: 'Use the Quick Capture bar to quickly add tasks, notes, or journal entries',
    actionLabel: 'Try it now',
    actionKey: 'quick-capture',
  },
  {
    id: 2,
    icon: Keyboard,
    title: 'Keyboard Shortcuts',
    description: 'Press ⌘K to open the command palette for fast navigation',
    actionLabel: 'Open Palette',
    actionKey: 'command-palette',
  },
  {
    id: 3,
    icon: BarChart3,
    title: 'Weekly Review',
    description: 'Check your Weekly Review for insights on your productivity and wellness',
    actionLabel: 'Open Review',
    actionKey: 'weekly-review',
  },
  {
    id: 4,
    icon: Moon,
    title: 'Dark Mode',
    description: 'Toggle between light and dark themes using the theme button in the header',
    actionLabel: 'Toggle Theme',
    actionKey: 'toggle-theme',
  },
  {
    id: 5,
    icon: Maximize,
    title: 'Focus Mode',
    description: 'Press F11 to enter Focus Mode for distraction-free work',
    actionLabel: 'Enter Focus Mode',
    actionKey: 'focus-mode',
  },
  {
    id: 6,
    icon: Search,
    title: 'Search Everything',
    description: 'Use the search bar to find anything across all modules',
    actionLabel: 'Open Search',
    actionKey: 'open-search',
  },
]

export function OnboardingTips() {
  const [dismissed, setDismissed] = useState(getInitialDismissed)
  const [currentTip, setCurrentTip] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const { setCommandPaletteOpen, setGlobalSearchOpen, toggleFocusMode } = useAppStore()
  const { setTheme, theme } = useTheme()
  const { t } = useTranslation()

  // Use ref for the interval so we can avoid stale closures
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleDismissForever = () => {
    try {
      localStorage.setItem(TIPS_STORAGE_KEY, 'true')
    } catch {
      // localStorage unavailable
    }
    setIsVisible(false)
    setTimeout(() => setDismissed(true), 300)
  }

  const goToNextTip = () => {
    setIsVisible(false)
    setTimeout(() => {
      setCurrentTip((prev) => (prev + 1) % TIPS_COUNT)
      setIsVisible(true)
    }, 200)
  }

  const goToTip = (idx: number) => {
    setIsVisible(false)
    setTimeout(() => {
      setCurrentTip(idx)
      setIsVisible(true)
    }, 200)
  }

  // Execute tip action
  const executeAction = (actionKey: string) => {
    switch (actionKey) {
      case 'quick-capture': {
        const captureInput = document.querySelector('[data-quick-capture] input') as HTMLInputElement | null
        if (captureInput) {
          captureInput.focus()
        }
        break
      }
      case 'command-palette':
        setCommandPaletteOpen(true)
        break
      case 'weekly-review': {
        const reviewBtn = document.querySelector('[data-weekly-review-btn]') as HTMLButtonElement | null
        if (reviewBtn) {
          reviewBtn.click()
        }
        break
      }
      case 'toggle-theme':
        setTheme(theme === 'dark' ? 'light' : 'dark')
        break
      case 'focus-mode':
        toggleFocusMode()
        break
      case 'open-search':
        setGlobalSearchOpen(true)
        break
    }
  }

  // Auto-cycle tips every 10 seconds
  useEffect(() => {
    if (dismissed) return
    intervalRef.current = setInterval(() => {
      goToNextTip()
    }, 10000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [dismissed])

  if (dismissed) return null

  const tip = tipDefinitions[currentTip]
  const TipIcon = tip.icon

  return (
    <Card
      className="rounded-xl shadow-sm relative overflow-hidden"
      style={{
        background: 'linear-gradient(var(--card), var(--card)) padding-box, linear-gradient(135deg, var(--accent-primary, #10b981), var(--accent-primary-light, #34d399), var(--accent-primary, #10b981)) border-box',
        border: '2px solid transparent',
      }}
    >
      <CardContent className="p-4">
        {/* Close button */}
        <button
          onClick={handleDismissForever}
          className="absolute top-2.5 right-2.5 p-1 rounded-md hover:bg-accent/50 transition-colors duration-200 text-muted-foreground/50 hover:text-foreground"
          title="Don't show tips again"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Tip content with animation */}
        <AnimatePresence mode="wait">
          {isVisible && (
            <motion.div
              key={tip.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              <div className="flex items-start gap-3 pr-6">
                {/* Icon */}
                <div
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--accent-primary, #10b981) 15%, transparent)' }}
                >
                  <TipIcon
                    className="h-4 w-4"
                    style={{ color: 'var(--accent-primary, #10b981)' }}
                  />
                </div>

                {/* Text content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground">{tip.title}</h4>
                  <p className="text-xs text-muted-foreground/70 mt-0.5 leading-relaxed">
                    {tip.description}
                  </p>
                </div>
              </div>

              {/* Actions row */}
              <div className="flex items-center justify-between mt-3 pl-11">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => executeAction(tip.actionKey)}
                  className="h-7 px-2.5 text-xs font-medium rounded-lg hover:bg-accent/50"
                  style={{ color: 'var(--accent-primary, #10b981)' }}
                >
                  {tip.actionLabel}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>

                {/* Tip indicator dots */}
                <div className="flex items-center gap-1.5">
                  {tipDefinitions.map((t, idx) => (
                    <button
                      key={t.id}
                      onClick={() => goToTip(idx)}
                      className={`rounded-full transition-all duration-200 ${
                        idx === currentTip
                          ? 'w-4 h-1.5'
                          : 'w-1.5 h-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40'
                      }`}
                      style={
                        idx === currentTip
                          ? { backgroundColor: 'var(--accent-primary, #10b981)' }
                          : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* "Don't show again" link */}
        <div className="mt-2 pt-2 border-t border-border/50">
          <button
            onClick={handleDismissForever}
            className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors duration-200"
          >
            Don&apos;t show tips again
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/stores/app-store'
import { Minimize2, Maximize2, Command, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

export function FocusModeOverlay() {
  const { focusMode, toggleFocusMode, activeModule } = useAppStore()
  const [showControls, setShowControls] = useState(true)
  const [liveTime, setLiveTime] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    if (!showControls) return
    const timer = setTimeout(() => setShowControls(false), 4000)
    return () => clearTimeout(timer)
  }, [showControls])

  if (!focusMode) return null

  const moduleLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    tasks: 'Tasks',
    notes: 'Notes',
    habits: 'Habits',
    journal: 'Journal',
    finance: 'Finance',
    goals: 'Goals',
    learning: 'Learning',
    calendar: 'Calendar',
    time: 'Time Tracker',
    settings: 'Settings',
  }

  return (
    <>
      {/* Top gradient fade */}
      <div
        className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background/80 to-transparent pointer-events-none z-50"
        onMouseMove={() => setShowControls(true)}
      />

      {/* Floating controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-4 left-0 right-0 z-50 flex items-center justify-between px-6"
            onMouseMove={() => setShowControls(true)}
          >
            {/* Left: Module name + Focus Mode badge */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-soft" />
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Focus Mode</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {moduleLabels[activeModule] || 'Dashboard'}
              </span>
            </div>

            {/* Center: Live time */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-mono tabular-nums text-muted-foreground">
                {format(liveTime, 'h:mm:ss a')}
              </span>
            </div>

            {/* Right: Exit focus mode */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Esc</kbd> to exit
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFocusMode}
                className="h-7 text-xs gap-1.5 border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all duration-200"
              >
                <Minimize2 className="h-3 w-3" />
                Exit Focus
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mouse-move area to show controls */}
      <div
        className="absolute inset-0 z-40"
        onMouseMove={() => setShowControls(true)}
        style={{ pointerEvents: showControls ? 'none' : 'auto' }}
      />

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background/60 to-transparent pointer-events-none z-50"
        onMouseMove={() => setShowControls(true)}
      />
    </>
  )
}

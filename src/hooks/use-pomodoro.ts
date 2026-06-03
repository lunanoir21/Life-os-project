'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ============================================
// Types
// ============================================
export type PomodoroMode = 'focus' | 'short-break' | 'long-break'

export interface PomodoroSettings {
  focusDuration: number       // minutes
  shortBreakDuration: number  // minutes
  longBreakDuration: number   // minutes
  sessionsBeforeLongBreak: number
  autoStartBreaks: boolean
  autoStartFocus: boolean
  soundEnabled: boolean
  dailyGoal: number           // number of pomodoros
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  dailyGoal: 8,
}

// ============================================
// LocalStorage helpers
// ============================================
const SETTINGS_KEY = 'pomodoro-settings'

function loadSettings(): PomodoroSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS
}

function saveSettings(settings: PomodoroSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}

// ============================================
// Audio notification using Web Audio API
// ============================================
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    
    // Play a pleasant three-tone chime
    const notes = [523.25, 659.25, 783.99] // C5, E5, G5
    notes.forEach((freq, i) => {
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.2)
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.2)
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + i * 0.2 + 0.05)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.2 + 0.4)
      
      oscillator.start(audioCtx.currentTime + i * 0.2)
      oscillator.stop(audioCtx.currentTime + i * 0.2 + 0.4)
    })
  } catch {
    // Web Audio API not available, silently ignore
  }
}

// ============================================
// Browser notification
// ============================================
async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

function sendBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
    })
  }
}

// ============================================
// Hook
// ============================================
export function usePomodoro() {
  const [settings, setSettings] = useState<PomodoroSettings>(loadSettings)
  const [mode, setMode] = useState<PomodoroMode>('focus')
  const [timeRemaining, setTimeRemaining] = useState(settings.focusDuration * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<Date | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const settingsRef = useRef(settings)
  const modeRef = useRef(mode)
  const completedSessionsRef = useRef(completedSessions)
  const currentSessionIdRef = useRef(currentSessionId)

  // Keep refs in sync
  useEffect(() => { settingsRef.current = settings }, [settings])
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { completedSessionsRef.current = completedSessions }, [completedSessions])
  useEffect(() => { currentSessionIdRef.current = currentSessionId }, [currentSessionId])

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission()
  }, [])

  // Get total duration for current mode
  const getTotalDuration = useCallback((m: PomodoroMode, s: PomodoroSettings) => {
    switch (m) {
      case 'focus': return s.focusDuration * 60
      case 'short-break': return s.shortBreakDuration * 60
      case 'long-break': return s.longBreakDuration * 60
    }
  }, [])

  // Save settings to localStorage when changed
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  // Start a new session (create in DB)
  const startSession = useCallback(async (targetMode?: PomodoroMode) => {
    const m = targetMode || modeRef.current
    const duration = getTotalDuration(m, settingsRef.current)
    
    try {
      const res = await fetch('/api/pomodoro-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: m,
          duration,
          startedAt: new Date().toISOString(),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setCurrentSessionId(data.id)
      }
    } catch {
      // Continue even if DB save fails
    }

    setStartedAt(new Date())
    setIsRunning(true)
  }, [getTotalDuration])

  // Handle timer completion
  const handleTimerComplete = useCallback(() => {
    const currentSettings = settingsRef.current
    const currentMode = modeRef.current
    const currentSessions = completedSessionsRef.current
    const sessionId = currentSessionIdRef.current

    // Play sound notification
    if (currentSettings.soundEnabled) {
      playNotificationSound()
    }

    // Send browser notification
    const modeLabel = currentMode === 'focus' ? 'Focus session' : currentMode === 'short-break' ? 'Short break' : 'Long break'
    sendBrowserNotification('Pomodoro Timer', `${modeLabel} completed!`)

    // Mark current session as completed if exists
    if (sessionId) {
      fetch(`/api/pomodoro-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true, completedAt: new Date().toISOString() }),
      }).catch(() => {})
    }

    // Advance to next mode
    let nextMode: PomodoroMode
    let newCompletedSessions = currentSessions

    if (currentMode === 'focus') {
      newCompletedSessions = currentSessions + 1
      setCompletedSessions(newCompletedSessions)
      // Decide break type
      if (newCompletedSessions % currentSettings.sessionsBeforeLongBreak === 0) {
        nextMode = 'long-break'
      } else {
        nextMode = 'short-break'
      }
    } else {
      nextMode = 'focus'
    }

    const nextDuration = getTotalDuration(nextMode, currentSettings)
    setMode(nextMode)
    setTimeRemaining(nextDuration)

    // Auto-start next mode if enabled
    const shouldAutoStart =
      (nextMode === 'focus' && currentSettings.autoStartFocus) ||
      (nextMode !== 'focus' && currentSettings.autoStartBreaks)

    if (shouldAutoStart) {
      startSession(nextMode)
    }
  }, [getTotalDuration, startSession])

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Timer completed
            clearInterval(intervalRef.current!)
            intervalRef.current = null
            setIsRunning(false)
            // Use setTimeout to avoid calling during state update
            setTimeout(() => handleTimerComplete(), 0)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, handleTimerComplete])

  // Play / Pause
  const play = useCallback(() => {
    if (!isRunning) {
      if (timeRemaining === getTotalDuration(mode, settingsRef.current) && !currentSessionId) {
        // Fresh start - create session
        startSession()
      } else {
        // Resume
        setIsRunning(true)
      }
    }
  }, [isRunning, timeRemaining, mode, currentSessionId, startSession, getTotalDuration])

  const pause = useCallback(() => {
    setIsRunning(false)
  }, [])

  const togglePlayPause = useCallback(() => {
    if (isRunning) {
      pause()
    } else {
      play()
    }
  }, [isRunning, pause, play])

  // Reset
  const reset = useCallback(() => {
    setIsRunning(false)
    setTimeRemaining(getTotalDuration(mode, settingsRef.current))
    setCurrentSessionId(null)
    setStartedAt(null)
  }, [mode, getTotalDuration])

  // Skip to next mode
  const skip = useCallback(() => {
    setIsRunning(false)
    
    let nextMode: PomodoroMode
    if (mode === 'focus') {
      if ((completedSessions + 1) % settingsRef.current.sessionsBeforeLongBreak === 0) {
        nextMode = 'long-break'
      } else {
        nextMode = 'short-break'
      }
    } else {
      nextMode = 'focus'
    }

    setMode(nextMode)
    setTimeRemaining(getTotalDuration(nextMode, settingsRef.current))
    setCurrentSessionId(null)
    setStartedAt(null)
  }, [mode, completedSessions, getTotalDuration])

  // Switch mode directly
  const switchMode = useCallback((newMode: PomodoroMode) => {
    setIsRunning(false)
    setMode(newMode)
    setTimeRemaining(getTotalDuration(newMode, settingsRef.current))
    setCurrentSessionId(null)
    setStartedAt(null)
  }, [getTotalDuration])

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings }
      // If timer is not running and we changed durations, update the time remaining
      if (!isRunning) {
        if (newSettings.focusDuration !== undefined && mode === 'focus') {
          setTimeRemaining(newSettings.focusDuration * 60)
        } else if (newSettings.shortBreakDuration !== undefined && mode === 'short-break') {
          setTimeRemaining(newSettings.shortBreakDuration * 60)
        } else if (newSettings.longBreakDuration !== undefined && mode === 'long-break') {
          setTimeRemaining(newSettings.longBreakDuration * 60)
        }
      }
      return updated
    })
  }, [isRunning, mode])

  // Reset daily sessions
  const resetDailySessions = useCallback(() => {
    setCompletedSessions(0)
  }, [])

  // Spacebar shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target instanceof HTMLElement && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        e.preventDefault()
        togglePlayPause()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlayPause])

  // Progress percentage
  const totalDuration = getTotalDuration(mode, settings)
  const progress = totalDuration > 0 ? ((totalDuration - timeRemaining) / totalDuration) * 100 : 0

  // Session info
  const currentSessionNumber = (completedSessions % settings.sessionsBeforeLongBreak) + (mode === 'focus' ? 1 : 0)
  const sessionsInCycle = settings.sessionsBeforeLongBreak

  return {
    // State
    mode,
    timeRemaining,
    isRunning,
    completedSessions,
    settings,
    progress,
    currentSessionNumber,
    sessionsInCycle,
    startedAt,
    currentSessionId,

    // Actions
    play,
    pause,
    togglePlayPause,
    reset,
    skip,
    switchMode,
    updateSettings,
    resetDailySessions,
  }
}

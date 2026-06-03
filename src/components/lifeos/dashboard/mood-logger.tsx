'use client'

import { useState } from 'react'
import { useCreateJournalEntry } from '@/lib/api/hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'

const moods = [
  { emoji: '😞', label: 'Bad', score: 1, name: 'terrible' },
  { emoji: '😐', label: 'Okay', score: 2, name: 'bad' },
  { emoji: '🙂', label: 'Good', score: 3, name: 'okay' },
  { emoji: '😊', label: 'Great', score: 4, name: 'good' },
  { emoji: '🤩', label: 'Amazing', score: 5, name: 'amazing' },
] as const

interface MoodLoggerProps {
  onLogged?: () => void
  compact?: boolean
}

export function MoodLogger({ onLogged, compact = false }: MoodLoggerProps) {
  const [selectedMood, setSelectedMood] = useState<number | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const createEntry = useCreateJournalEntry()

  const handleMoodClick = async (mood: typeof moods[number]) => {
    setSelectedMood(mood.score)
    try {
      await createEntry.mutateAsync({
        title: `Quick mood check: ${mood.emoji}`,
        content: `Feeling ${mood.label.toLowerCase()}`,
        mood: mood.name,
        moodScore: mood.score,
        date: new Date().toISOString(),
      })
      setShowSuccess(true)
      onLogged?.()
      setTimeout(() => {
        setShowSuccess(false)
        setSelectedMood(null)
      }, 2000)
    } catch {
      setSelectedMood(null)
    }
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {showSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center justify-center gap-2 py-2"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center"
            >
              <Check className="h-4 w-4 text-white" />
            </motion.div>
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Mood logged!
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="mood-buttons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={compact ? 'flex items-center gap-1.5' : 'flex items-center justify-center gap-2'}
          >
            {moods.map((mood) => (
              <motion.button
                key={mood.score}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleMoodClick(mood)}
                disabled={createEntry.isPending}
                className={`
                  relative rounded-full transition-all duration-200
                  ${compact ? 'w-9 h-9 text-lg' : 'w-10 h-10 text-xl'}
                  ${selectedMood === mood.score
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 ring-2 ring-emerald-400'
                    : 'hover:bg-accent/50'
                  }
                  disabled:opacity-50
                `}
                title={mood.label}
              >
                {mood.emoji}
                {selectedMood === mood.score && (
                  <motion.div
                    layoutId="mood-ring"
                    className="absolute inset-0 rounded-full ring-2 ring-emerald-400"
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {!compact && !showSuccess && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Tap to log your current mood
        </p>
      )}
    </div>
  )
}

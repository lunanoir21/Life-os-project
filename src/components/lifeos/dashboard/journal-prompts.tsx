'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app-store'

const prompts = [
  'What are you grateful for today?',
  'What challenged you today and how did you respond?',
  'What would you do differently today if you could relive it?',
  'Describe a moment of joy today.',
  'What is one thing you learned today?',
  'How did you take care of yourself today?',
  'What are you looking forward to tomorrow?',
  'Write about a conversation that left an impression on you.',
  'What made you smile today?',
  'What habit served you well today?',
  'Describe a small victory you had today.',
  'What is something you want to let go of?',
  'How are you feeling right now, truly?',
  'What would you tell your future self about today?',
  'What boundary did you honor today?',
  'Describe something beautiful you noticed today.',
  'What is one kind thing you did for someone today?',
  'What are you avoiding that you need to face?',
  'Write about a goal that excites you right now.',
  'What does your ideal day look like?',
  'How can you be kinder to yourself tomorrow?',
  'What did you do today that moved you closer to your goals?',
]

// Deterministic daily prompt based on date seed
function getDailySeed(): number {
  const now = new Date()
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
}

// Simple hash for deterministic index from seed
function seededIndex(seed: number, length: number): number {
  const x = Math.sin(seed) * 10000
  return Math.abs(Math.floor((x - Math.floor(x)) * length))
}

export function JournalPrompts() {
  const { setActiveModule } = useAppStore()
  const dailySeed = useMemo(() => getDailySeed(), [])
  const initialIndex = useMemo(() => seededIndex(dailySeed, prompts.length), [dailySeed])
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [refreshCount, setRefreshCount] = useState(0)

  const currentPrompt = prompts[currentIndex % prompts.length]

  const handleRefresh = useCallback(() => {
    setRefreshCount((c) => c + 1)
    setCurrentIndex((prev) => (prev + 1) % prompts.length)
  }, [])

  const handleOpenJournal = useCallback(() => {
    setActiveModule('journal')
  }, [setActiveModule])

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">✨</span>
            <CardTitle className="text-sm font-semibold">Daily Prompt</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground/50 hover:text-foreground transition-colors duration-200"
            onClick={handleRefresh}
            title="Next prompt"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-5 pb-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentIndex}-${refreshCount}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <button
              onClick={handleOpenJournal}
              className="w-full text-left group"
            >
              <p className="text-sm text-foreground/90 leading-relaxed group-hover:text-foreground transition-colors duration-200">
                &ldquo;{currentPrompt}&rdquo;
              </p>
              <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-colors duration-200">
                <BookOpen className="h-3 w-3" />
                <span>Click to start writing</span>
              </div>
            </button>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

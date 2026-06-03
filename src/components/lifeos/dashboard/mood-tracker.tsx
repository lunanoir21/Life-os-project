'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useJournal } from '@/lib/api/hooks'
import { MoodLogger } from '@/components/lifeos/dashboard/mood-logger'
import { motion } from 'framer-motion'
import { format, subDays } from 'date-fns'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const moodEmojis: Record<number, string> = {
  1: '😞',
  2: '😐',
  3: '🙂',
  4: '😊',
  5: '🤩',
}

const moodColors: Record<number, string> = {
  1: 'text-red-500',
  2: 'text-orange-500',
  3: 'text-amber-500',
  4: 'text-emerald-500',
  5: 'text-teal-500',
}

export function MoodTracker() {
  const { data: journalData, isLoading } = useJournal()

  // Build 7-day mood map
  const moodMap = useMemo(() => {
    const map: Record<string, { score: number; mood: string }> = {}
    if (!journalData?.entries) return map

    const entries = journalData.entries as Record<string, unknown>[]
    for (const entry of entries) {
      const date = entry.date as string
      const moodScore = entry.moodScore as number | null
      const mood = entry.mood as string | null
      if (date && moodScore) {
        const dayKey = format(new Date(date), 'yyyy-MM-dd')
        // Keep the latest entry for each day
        if (!map[dayKey] || moodScore > map[dayKey].score) {
          map[dayKey] = { score: moodScore, mood: mood || '' }
        }
      }
    }
    return map
  }, [journalData])

  // Build 7-day array for display
  const last7Days = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const key = format(date, 'yyyy-MM-dd')
      const moodData = moodMap[key]
      days.push({
        date,
        dayLabel: format(date, 'EEE'),
        dateLabel: format(date, 'MMM d'),
        key,
        moodScore: moodData?.score || null,
        emoji: moodData ? moodEmojis[moodData.score] || '·' : null,
        moodName: moodData?.mood || null,
      })
    }
    return days
  }, [moodMap])

  // Calculate average mood
  const avgMood = useMemo(() => {
    const scores = last7Days
      .filter((d) => d.moodScore !== null)
      .map((d) => d.moodScore as number)
    if (scores.length === 0) return null
    return scores.reduce((a, b) => a + b, 0) / scores.length
  }, [last7Days])

  // Calculate mood trend
  const moodTrend = useMemo(() => {
    const scores = last7Days
      .filter((d) => d.moodScore !== null)
      .map((d) => d.moodScore as number)
    if (scores.length < 2) return 'stable'
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2))
    const secondHalf = scores.slice(Math.floor(scores.length / 2))
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    if (avgSecond > avgFirst + 0.3) return 'improving'
    if (avgSecond < avgFirst - 0.3) return 'declining'
    return 'stable'
  }, [last7Days])

  // Build SVG path for connecting line
  const moodLinePath = useMemo(() => {
    const points: { x: number; y: number }[] = []
    const width = 280
    const height = 60
    const stepX = width / 6

    last7Days.forEach((day, i) => {
      if (day.moodScore !== null) {
        const x = i * stepX
        const y = height - ((day.moodScore - 1) / 4) * height
        points.push({ x, y })
      }
    })

    if (points.length < 2) return null

    let path = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4
      const cpx2 = curr.x - (curr.x - prev.x) * 0.4
      path += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`
    }

    return { path, points }
  }, [last7Days])

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Mood & Wellness</CardTitle>
          {avgMood !== null && (
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs">
                Avg: {avgMood.toFixed(1)}/5
              </Badge>
              {moodTrend === 'improving' && (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              )}
              {moodTrend === 'declining' && (
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              )}
              {moodTrend === 'stable' && (
                <Minus className="h-3.5 w-3.5 text-amber-500" />
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* 7-day mood trend */}
        {isLoading ? (
          <div className="flex items-end justify-between gap-1 h-20">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="w-8 h-16 rounded" />
            ))}
          </div>
        ) : (
          <div className="relative">
            {/* SVG connecting line */}
            {moodLinePath && (
              <svg
                viewBox="0 0 280 60"
                className="w-full h-16 mb-1"
                preserveAspectRatio="none"
              >
                <path
                  d={moodLinePath.path}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.5"
                />
                {moodLinePath.points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r="3"
                    fill="#10b981"
                    opacity="0.5"
                  />
                ))}
              </svg>
            )}

            {/* Day columns with emojis */}
            <div className="grid grid-cols-7 gap-1">
              {last7Days.map((day, idx) => (
                <motion.div
                  key={day.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.04 }}
                  className="flex flex-col items-center gap-0.5"
                >
                  <span className="text-lg leading-none">
                    {day.emoji || '·'}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {day.dayLabel}
                  </span>
                </motion.div>
              ))}
            </div>

            {last7Days.every((d) => d.moodScore === null) && (
              <div className="text-center py-3">
                <p className="text-xs text-muted-foreground">
                  No mood data yet. Log your mood below!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quick mood logging */}
        <div className="border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            How are you feeling right now?
          </p>
          <MoodLogger
            compact={false}
            onLogged={() => {
              // The journal query will be invalidated by the mutation
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

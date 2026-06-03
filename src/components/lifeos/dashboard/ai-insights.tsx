'use client'

import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, Lightbulb, Target, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/stores/app-store'

interface Insight {
  title: string
  text: string
}

const iconMap = [Lightbulb, Target, TrendingUp]

export function AIInsights() {
  const { accentColor } = useAppStore()
  const accentColorMap: Record<string, string> = {
    emerald: '#10b981', teal: '#14b8a6', amber: '#f59e0b',
    rose: '#f43f5e', violet: '#8b5cf6', cyan: '#06b6d4',
  }
  const accentHex = accentColorMap[accentColor] || '#10b981'

  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchInsights = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/ai/insights')
      if (res.ok) {
        const data = await res.json()
        setInsights(data.insights || [])
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [])

  return (
    <Card className="rounded-xl shadow-sm overflow-hidden animate-page-enter">
      <div className="h-1" style={{ background: `linear-gradient(to right, ${accentHex}, ${accentHex}88)` }} />
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accentHex}15` }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: accentHex }} />
            </div>
            <CardTitle className="text-sm font-semibold">AI Insights</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={fetchInsights}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-5 pb-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <Sparkles className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">Could not load insights</p>
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={fetchInsights}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, i) => {
              const Icon = iconMap[i % iconMap.length]
              return (
                <div
                  key={i}
                  className="flex gap-3 p-2.5 rounded-lg hover:bg-accent/30 transition-all duration-200 group"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${accentHex}10` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: accentHex }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-0.5">{insight.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{insight.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

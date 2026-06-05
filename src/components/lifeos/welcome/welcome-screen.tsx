'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Sparkles, Lock, Layers, Heart, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app-store'
import { useTranslation } from '@/lib/i18n'

const ACCENT_MAP: Record<string, string> = {
  emerald: '#10b981',
  teal: '#14b8a6',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
}

type Particle = {
  id: number
  left: number
  top: number
  size: number
  delay: number
  duration: number
}

const SUPPORTED_LANGS = ['en', 'tr', 'es', 'de', 'fr']

export function WelcomeScreen() {
  const accent = useAppStore(s => s.accentColor)
  const setWelcomeSeen = useAppStore(s => s.setWelcomeSeen)
  const setLanguage = useAppStore(s => s.setLanguage)
  const { t, tArray } = useTranslation()
  const accentHex = ACCENT_MAP[accent] ?? '#10b981'
  const prefersReduced = useReducedMotion()

  const [leaving, setLeaving] = useState(false)
  const [rotIdx, setRotIdx] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const rotators = tArray('setup.welcomeHero.rotators')

  // Pre-generate decorative particles once so they don't reshuffle on re-render
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 4,
      duration: 6 + Math.random() * 6,
    }))
  }, [])

  // Detect the browser language on first mount so the welcome screen
  // greets the user in their language right away.
  useEffect(() => {
    const navLang = typeof navigator !== 'undefined' ? navigator.language : 'en'
    const primary = navLang.split('-')[0].toLowerCase()
    if (SUPPORTED_LANGS.includes(primary)) setLanguage(primary)
  }, [setLanguage])

  // Rotating tagline
  useEffect(() => {
    if (prefersReduced || rotators.length < 2) return
    const id = setInterval(() => setRotIdx(i => (i + 1) % rotators.length), 2800)
    return () => clearInterval(id)
  }, [prefersReduced, rotators.length])

  const handleBegin = () => {
    setLeaving(true)
    // Let the exit animation play before unmounting
    setTimeout(() => setWelcomeSeen(true), 650)
  }

  const valueProps = [
    { icon: Lock, title: t('setup.welcomeHero.prop1Title'), desc: t('setup.welcomeHero.prop1Desc') },
    { icon: Layers, title: t('setup.welcomeHero.prop2Title'), desc: t('setup.welcomeHero.prop2Desc') },
    { icon: Heart, title: t('setup.welcomeHero.prop3Title'), desc: t('setup.welcomeHero.prop3Desc') },
  ]

  return (
    <AnimatePresence>
      {!leaving && (
        <motion.div
          key="welcome"
          className="fixed inset-0 z-50 overflow-hidden bg-background flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Ambient gradient orbs */}
          <motion.div
            aria-hidden
            className="absolute top-[-20%] left-[-10%] w-[55vw] h-[55vw] rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${accentHex}22, transparent 60%)`,
              filter: 'blur(40px)',
            }}
            animate={prefersReduced ? undefined : { x: [0, 40, 0], y: [0, 20, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute bottom-[-25%] right-[-15%] w-[60vw] h-[60vw] rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${accentHex}1c, transparent 60%)`,
              filter: 'blur(50px)',
            }}
            animate={prefersReduced ? undefined : { x: [0, -30, 0], y: [0, -25, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Floating particles — mounted gate avoids SSR/client mismatch from Math.random() */}
          {mounted && !prefersReduced && (
            <div className="absolute inset-0 pointer-events-none">
              {particles.map(p => (
                <motion.span
                  key={p.id}
                  className="absolute rounded-full"
                  style={{
                    left: `${p.left}%`,
                    top: `${p.top}%`,
                    width: p.size,
                    height: p.size,
                    background: accentHex,
                    opacity: 0.35,
                  }}
                  animate={{
                    y: [0, -24, 0],
                    opacity: [0.15, 0.6, 0.15],
                  }}
                  transition={{
                    duration: p.duration,
                    delay: p.delay,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          )}

          {/* Subtle grid pattern */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* Brand mark — top left */}
          <motion.div
            className="absolute top-6 left-6 md:top-8 md:left-10 flex items-center gap-2.5 z-10"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <img src="/logo.svg" alt="" aria-hidden className="w-8 h-8 rounded-lg" />
            <span className="font-semibold text-sm">{t('setup.welcomeHero.brandName')}</span>
          </motion.div>

          {/* Main content */}
          <div className="relative z-10 w-full max-w-3xl px-6 md:px-10 text-center">
            {/* Animated logo orb */}
            <motion.div
              className="relative mx-auto w-24 h-24 md:w-28 md:h-28"
              initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.05 }}
            >
              {/* Pulse rings */}
              {!prefersReduced && (
                <>
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-3xl"
                    style={{ border: `1.5px solid ${accentHex}55` }}
                    animate={{ scale: [1, 1.45], opacity: [0.7, 0] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }}
                  />
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-3xl"
                    style={{ border: `1.5px solid ${accentHex}55` }}
                    animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut', delay: 0.9 }}
                  />
                </>
              )}
              <div
                className="absolute inset-0 rounded-3xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${accentHex}, ${accentHex}b3)`,
                  boxShadow: `0 24px 60px -16px ${accentHex}80, inset 0 1px 0 rgba(255,255,255,0.25)`,
                }}
              >
                <motion.div
                  animate={prefersReduced ? undefined : { rotate: [0, 8, -8, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles className="h-11 w-11 md:h-12 md:w-12 text-white" />
                </motion.div>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="mt-9 text-4xl md:text-6xl font-semibold tracking-tight bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(180deg, var(--foreground), ${accentHex})`,
              }}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {t('setup.welcomeHero.title')}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="mt-4 text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {t('setup.welcomeHero.subtitle')}
            </motion.p>

            {/* Rotating tagline */}
            <motion.div
              className="mt-7 h-7 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={rotIdx}
                  className="inline-flex items-center gap-2 text-sm md:text-[15px]"
                  style={{ color: accentHex }}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: accentHex, boxShadow: `0 0 12px ${accentHex}` }}
                  />
                  {rotators[rotIdx] ?? rotators[0]}
                </motion.span>
              </AnimatePresence>
            </motion.div>

            {/* Value props */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              {valueProps.map((p, i) => {
                const Icon = p.icon
                return (
                  <motion.div
                    key={p.title}
                    className="relative rounded-2xl border border-border/80 p-4 bg-card/50 backdrop-blur-sm overflow-hidden group"
                    initial={{ y: 18, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.55 + i * 0.08, duration: 0.45, ease: 'easeOut' }}
                    whileHover={prefersReduced ? undefined : { y: -3, transition: { duration: 0.18 } }}
                  >
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: `radial-gradient(circle at 50% 0%, ${accentHex}1f, transparent 70%)`,
                      }}
                    />
                    <div
                      className="relative w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                      style={{ backgroundColor: `${accentHex}18`, color: accentHex }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="relative text-sm font-medium leading-snug">{p.title}</h3>
                    <p className="relative text-xs text-muted-foreground mt-1.5 leading-relaxed">{p.desc}</p>
                  </motion.div>
                )
              })}
            </div>

            {/* CTA */}
            <motion.div
              className="mt-11 flex flex-col items-center gap-3"
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.95, duration: 0.45 }}
            >
              <Button
                size="lg"
                onClick={handleBegin}
                className="group relative px-8 h-12 text-base text-white shadow-lg hover:opacity-95 transition-opacity overflow-hidden"
                style={{
                  backgroundColor: accentHex,
                  boxShadow: `0 18px 40px -12px ${accentHex}99`,
                }}
              >
                {!prefersReduced && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-y-0 w-1/3 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                    }}
                    initial={{ x: '-150%' }}
                    animate={{ x: '350%' }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.4 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  {t('setup.welcomeHero.cta')}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Button>
              <span className="text-xs text-muted-foreground/70">{t('setup.welcomeHero.ctaHint')}</span>
            </motion.div>

            {/* Tagline footer */}
            <motion.p
              className="mt-10 text-xs text-muted-foreground/60 italic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.5 }}
            >
              {t('setup.welcomeHero.tagline')}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

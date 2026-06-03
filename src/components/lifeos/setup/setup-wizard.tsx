'use client'

import { useState, useCallback } from 'react'
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Database,
  LayoutDashboard,
  CheckSquare,
  StickyNote,
  Repeat,
  BookOpen,
  Wallet,
  Target,
  GraduationCap,
  CalendarDays,
  Timer,
  Sun,
  Moon,
  Monitor,
  Upload,
  Sparkles,
  BarChart3,
  Quote,
  Activity,
  Lightbulb,
  ClipboardList,
  Smile,
  Rss,
  FileUp,
  Zap,
  Globe,
  Palette,
  Type,
  LayoutGrid,
  PackagePlus,
  Rocket,
  PartyPopper,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { useAppStore, type ModuleId } from '@/stores/app-store'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Data Definitions ────────────────────────────────────────────────

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'tr', label: 'Turkish', flag: '🇹🇷' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
]

const themes = [
  { id: 'light', label: 'Light', icon: Sun, emoji: '☀️', previewBg: '#ffffff', previewSidebar: '#f8f8f8', previewCard: '#ffffff', previewText: '#1a1a1a', previewAccent: '#10b981' },
  { id: 'dark', label: 'Dark', icon: Moon, emoji: '🌙', previewBg: '#1a1a1a', previewSidebar: '#111111', previewCard: '#222222', previewText: '#ffffff', previewAccent: '#10b981' },
  { id: 'system', label: 'System', icon: Monitor, emoji: '🔄', previewBg: 'linear-gradient(135deg, #ffffff 50%, #1a1a1a 50%)', previewSidebar: '', previewCard: '', previewText: '#666', previewAccent: '#10b981' },
]

const accentColors = [
  { id: 'emerald', color: '#10b981', label: 'Emerald' },
  { id: 'teal', color: '#14b8a6', label: 'Teal' },
  { id: 'amber', color: '#f59e0b', label: 'Amber' },
  { id: 'rose', color: '#f43f5e', label: 'Rose' },
  { id: 'violet', color: '#8b5cf6', label: 'Violet' },
  { id: 'cyan', color: '#06b6d4', label: 'Cyan' },
]

const fontSizes = [
  { id: 'small', label: 'Small', sample: 'Aa', size: 'text-sm' },
  { id: 'medium', label: 'Medium', sample: 'Aa', size: 'text-base' },
  { id: 'large', label: 'Large', sample: 'Aa', size: 'text-lg' },
]

const moduleCategories = [
  {
    name: 'Overview',
    modules: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview of your life at a glance', enabled: true, required: true },
    ],
  },
  {
    name: 'Productivity',
    modules: [
      { id: 'tasks', label: 'Tasks', icon: CheckSquare, description: 'Manage and track your tasks', enabled: true },
      { id: 'notes', label: 'Notes', icon: StickyNote, description: 'Capture ideas and thoughts', enabled: true },
      { id: 'calendar', label: 'Calendar', icon: CalendarDays, description: 'Schedule and plan events', enabled: true },
      { id: 'time', label: 'Time Tracker', icon: Timer, description: 'Track time and Pomodoro', enabled: false },
    ],
  },
  {
    name: 'Wellness',
    modules: [
      { id: 'habits', label: 'Habits', icon: Repeat, description: 'Build and maintain habits', enabled: true },
      { id: 'journal', label: 'Journal', icon: BookOpen, description: 'Reflect on your day', enabled: true },
    ],
  },
  {
    name: 'Growth',
    modules: [
      { id: 'goals', label: 'Goals', icon: Target, description: 'Set and achieve your goals', enabled: true },
      { id: 'learning', label: 'Learning', icon: GraduationCap, description: 'Courses and resources', enabled: true },
      { id: 'finance', label: 'Finance', icon: Wallet, description: 'Budget and transactions', enabled: true },
    ],
  },
]

const allModules = moduleCategories.flatMap(c => c.modules)

const dashboardWidgetOptions = [
  { id: 'quick-stats', label: 'Quick Stats', icon: BarChart3, description: 'Key metrics at a glance', defaultOn: true },
  { id: 'quote', label: 'Motivational Quote', icon: Quote, description: 'Daily inspiration and motivation', defaultOn: true },
  { id: 'weekly-activity', label: 'Weekly Activity Chart', icon: Activity, description: 'Visual weekly progress overview', defaultOn: true },
  { id: 'smart-insights', label: 'Smart Insights', icon: Lightbulb, description: 'AI-powered productivity tips', defaultOn: true },
  { id: 'daily-planner', label: 'Daily Planner', icon: ClipboardList, description: 'Plan your day with timeline', defaultOn: false },
  { id: 'mood-tracker', label: 'Mood Tracker', icon: Smile, description: 'Track and visualize your mood', defaultOn: false },
  { id: 'activity-feed', label: 'Activity Feed', icon: Rss, description: 'Recent cross-module activity', defaultOn: false },
]

const wizardSteps = [
  { title: 'Welcome', description: 'Get started with Life OS', icon: Globe },
  { title: 'Language', description: 'Choose your language', icon: Globe },
  { title: 'Database & Storage', description: 'Choose data storage', icon: Database },
  { title: 'Appearance & Theme', description: 'Customize your look', icon: Palette },
  { title: 'Modules', description: 'Pick your features', icon: LayoutGrid },
  { title: 'Dashboard Layout', description: 'Configure your widgets', icon: LayoutDashboard },
  { title: 'Quick Setup', description: 'Import or start fresh', icon: PackagePlus },
  { title: 'All Set!', description: 'Launch your Life OS', icon: Rocket },
]

const TOTAL_STEPS = wizardSteps.length

// ─── Confetti Component ──────────────────────────────────────────────

function ConfettiExplosion({ accentHex }: { accentHex: string }) {
  const colors = [accentHex, '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#14b8a6']
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 40 }).map((_, i) => {
        const angle = (i / 40) * 360
        const distance = 80 + Math.random() * 140
        const x = Math.cos((angle * Math.PI) / 180) * distance
        const y = Math.sin((angle * Math.PI) / 180) * distance
        const isSquare = i % 3 === 0
        return (
          <motion.div
            key={i}
            className={`absolute left-1/2 top-1/2 ${isSquare ? 'w-2 h-2' : 'w-2 h-3'}`}
            style={{
              backgroundColor: colors[i % colors.length],
              borderRadius: isSquare ? '2px' : '50%',
            }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
            animate={{ x, y, scale: 0, opacity: 0, rotate: Math.random() * 720 - 360 }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: i * 0.02 }}
          />
        )
      })}
    </div>
  )
}

// ─── Celebration Animation ────────────────────────────────────────────

function CelebrationOverlay({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="text-center"
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
          >
            <motion.div
              className="text-6xl mb-4"
              animate={{
                scale: [1, 1.3, 1],
                rotate: [0, 15, -15, 0],
              }}
              transition={{ duration: 0.8, repeat: 2, repeatDelay: 0.4 }}
            >
              🎉
            </motion.div>
          </motion.div>
          {/* Floating stars */}
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={`star-${i}`}
              className="absolute text-2xl"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0],
                y: [0, -30 - Math.random() * 40],
              }}
              transition={{ duration: 1.5, delay: 0.3 + i * 0.1, ease: 'easeOut' }}
            >
              {i % 3 === 0 ? '✨' : i % 3 === 1 ? '⭐' : '💫'}
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Main Wizard Component ───────────────────────────────────────────

export function SetupWizard() {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [name, setName] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [selectedTheme, setSelectedTheme] = useState('system')
  const [selectedAccent, setSelectedAccent] = useState('emerald')
  const accentHex = accentColors.find(a => a.id === selectedAccent)?.color ?? '#10b981'
  const [selectedFontSize, setSelectedFontSize] = useState('medium')

  const [enabledModules, setEnabledModules] = useState<Set<string>>(
    new Set(allModules.filter(m => m.enabled).map(m => m.id))
  )
  const [selectedWidgets, setSelectedWidgets] = useState<Set<string>>(
    new Set(dashboardWidgetOptions.filter(w => w.defaultOn).map(w => w.id))
  )
  const [setupMode, setSetupMode] = useState<'fresh' | 'import'>('fresh')
  const [showConfetti, setShowConfetti] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  const {
    setSetupComplete,
    setLanguage,
    setAccentColor,
    setFontSize,
    setDashboardWidgets,
    setTheme,
    setEnabledModules: setStoreEnabledModules,
  } = useAppStore()
  const { setTheme: setNextTheme } = useTheme()

  const progressPercent = ((step + 1) / TOTAL_STEPS) * 100

  const goToStep = useCallback((newStep: number) => {
    setDirection(newStep > step ? 1 : -1)
    setStep(newStep)
  }, [step])

  const nextStep = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1)
      setStep(prev => prev + 1)
    }
  }, [step])

  const prevStep = useCallback(() => {
    if (step > 0) {
      setDirection(-1)
      setStep(prev => prev - 1)
    }
  }, [step])

  const toggleModule = (id: string) => {
    if (id === 'dashboard') return
    setEnabledModules(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleWidget = (id: string) => {
    setSelectedWidgets(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleCategory = (categoryName: string, selectAll: boolean) => {
    const category = moduleCategories.find(c => c.name === categoryName)
    if (!category) return
    setEnabledModules(prev => {
      const next = new Set(prev)
      category.modules.forEach(m => {
        if (m.required) return
        if (selectAll) next.add(m.id)
        else next.delete(m.id)
      })
      return next
    })
  }

  const handleLaunch = async () => {
    setLanguage(selectedLanguage)
    setAccentColor(selectedAccent)
    setFontSize(selectedFontSize)
    setTheme(selectedTheme)
    setDashboardWidgets(Array.from(selectedWidgets))
    setStoreEnabledModules([...Array.from(enabledModules), 'settings'] as ModuleId[])

    // Apply theme via next-themes
    setNextTheme(selectedTheme)

    // Save user profile to the backend
    if (name.trim()) {
      fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          theme: selectedTheme,
          locale: selectedLanguage,
        }),
      }).catch(() => {
        // Silently ignore profile save errors during setup
      })
    }

    setShowConfetti(true)
    setShowCelebration(true)
    setTimeout(() => {
      setShowCelebration(false)
    }, 3000)
    setTimeout(() => {
      setSetupComplete(true)
    }, 2000)
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0, scale: 0.98 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0, scale: 0.98 }),
  }

  // ─── Step Renderers ─────────────────────────────────────────────

  // Step 0: Welcome (name only)
  const renderStep0 = () => (
    <div className="space-y-6">
      {/* Animated Logo */}
      <motion.div
        className="text-center"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <motion.div
          className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4 shadow-lg"
          style={{ background: `linear-gradient(to bottom right, ${accentHex}, ${accentHex}cc)` }}
          animate={{ rotateY: [0, 360] }}
          transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 3 }}
        >
          L
        </motion.div>
        <motion.h2
          className="text-3xl font-bold"
          style={{ backgroundImage: `linear-gradient(to right, ${accentHex}, ${accentHex}cc)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Welcome to Life OS
        </motion.h2>
        <motion.p
          className="text-muted-foreground mt-2 max-w-md mx-auto"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Your personal life operating system. Manage everything from tasks and habits to finances and goals — all in one place.
        </motion.p>
      </motion.div>

      {/* Name Input */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <label className="text-sm font-medium mb-1.5 block">What should we call you?</label>
        <Input
          placeholder="Enter your name..."
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-11 text-base"
          autoFocus
        />
        <p className="text-xs text-muted-foreground mt-1.5">This will be used to personalize your experience</p>
      </motion.div>

      {/* Skip Setup option */}
      <motion.div
        className="text-center pt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <button
          onClick={handleLaunch}
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors underline underline-offset-2"
        >
          Skip setup and use defaults →
        </button>
      </motion.div>
    </div>
  )

  // Step 1: Language Selection
  const renderStep1 = () => (
    <div className="space-y-5">
      <motion.p
        className="text-sm text-muted-foreground"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        Select your preferred language. You can always change it later in Settings.
      </motion.p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {languages.map((lang, i) => (
          <motion.button
            key={lang.code}
            className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
              selectedLanguage === lang.code
                ? 'border-border shadow-sm'
                : 'border-border hover:border-muted-foreground/30 hover:bg-accent/30'
            }`}
            style={selectedLanguage === lang.code ? { borderColor: accentHex, backgroundColor: `${accentHex}15` } : {}}
            onClick={() => setSelectedLanguage(lang.code)}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-3xl shrink-0">{lang.flag}</span>
            <div className="min-w-0">
              <span className="text-sm font-semibold block">{lang.label}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{lang.code}</span>
            </div>
            {selectedLanguage === lang.code && (
              <motion.div
                className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: accentHex }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Check className="h-3 w-3 text-white" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )

  // Step 2: Database (local-first SQLite)
  const renderStep2 = () => (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        Life OS stores all your data locally with SQLite — zero configuration, fully private, and yours to export anytime.
      </p>
      <Card style={{ borderColor: `${accentHex}30`, backgroundColor: `${accentHex}10` }}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🟢</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold">SQLite</span>
                <Badge className="text-xs" style={{ backgroundColor: `${accentHex}20`, color: accentHex }}>
                  Recommended
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Local-first, privacy-focused storage</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Zero configuration', 'All data stays on device', 'Fast & lightweight', 'Export anytime'].map((f) => (
                  <span key={f} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: accentHex }}
            >
              <Check className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Step 3: Theme Customization (after Database)
  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Theme Mode Selection */}
      <div>
        <label className="text-sm font-medium mb-3 block">Theme Mode</label>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((theme) => {
            const Icon = theme.icon
            const isSelected = selectedTheme === theme.id
            return (
              <motion.button
                key={theme.id}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-border shadow-sm'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
                style={isSelected ? { borderColor: accentHex, backgroundColor: `${accentHex}15` } : {}}
                onClick={() => setSelectedTheme(theme.id)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {/* Preview card */}
                <div className="w-full h-14 rounded-lg border overflow-hidden shadow-inner mb-1 flex">
                  {/* Sidebar preview */}
                  <div
                    className="w-1/4 h-full"
                    style={{
                      background: theme.id === 'system'
                        ? 'linear-gradient(180deg, #f0f0f0 50%, #222 50%)'
                        : (theme.previewSidebar || theme.previewBg)
                    }}
                  />
                  {/* Content preview */}
                  <div className="flex-1 p-1.5 flex flex-col gap-1" style={{ background: theme.previewBg }}>
                    <div className="h-1.5 w-3/4 rounded-full" style={{ background: theme.id === 'light' ? '#e5e5e5' : theme.id === 'dark' ? '#333' : '#ccc' }} />
                    <div className="h-1.5 w-1/2 rounded-full" style={{ background: theme.id === 'light' ? '#e5e5e5' : theme.id === 'dark' ? '#333' : '#aaa' }} />
                    <div className="h-3 w-2/3 rounded mt-0.5" style={{ background: accentHex }} />
                  </div>
                </div>
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{theme.label}</span>
                {isSelected && (
                  <motion.div
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: accentHex }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Check className="h-3 w-3 text-white" />
                  </motion.div>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Accent Color */}
      <div>
        <label className="text-sm font-medium mb-3 block">Accent Color</label>
        <div className="grid grid-cols-6 gap-3">
          {accentColors.map((ac) => (
            <motion.button
              key={ac.id}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                selectedAccent === ac.id
                  ? 'border-transparent shadow-sm'
                  : 'border-transparent hover:bg-accent/30'
              }`}
              style={selectedAccent === ac.id ? { borderColor: ac.color, backgroundColor: `${ac.color}15` } : {}}
              onClick={() => setSelectedAccent(ac.id)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title={ac.label}
            >
              <div
                className={`w-10 h-10 rounded-full transition-all ${
                  selectedAccent === ac.id ? 'ring-2 ring-offset-2 ring-offset-background' : ''
                }`}
                style={{
                  backgroundColor: ac.color,
                  ...(selectedAccent === ac.id ? { boxShadow: `0 0 0 2px var(--background), 0 0 0 4px ${ac.color}` } : {}),
                }}
              >
                {selectedAccent === ac.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <Check className="h-4 w-4 text-white drop-shadow-sm" />
                  </motion.div>
                )}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">{ac.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <label className="text-sm font-medium mb-3 block">Font Size</label>
        <div className="grid grid-cols-3 gap-3">
          {fontSizes.map((fs) => (
            <motion.button
              key={fs.id}
              className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all ${
                selectedFontSize === fs.id
                  ? 'border-border shadow-sm'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
              style={selectedFontSize === fs.id ? { borderColor: accentHex, backgroundColor: `${accentHex}15` } : {}}
              onClick={() => setSelectedFontSize(fs.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className={`${fs.size} font-bold text-foreground`}>{fs.sample}</span>
              <span className="text-xs text-muted-foreground">{fs.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )

  // Step 4: Modules
  const renderStep4 = () => (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Choose which modules you&apos;d like to use. You can always enable or disable them later in Settings.
      </p>
      {moduleCategories.map((category) => (
        <div key={category.name}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {category.name}
            </h4>
            {category.modules.some(m => !m.required) && (
              <div className="flex items-center gap-2">
                <button
                  className="text-xs font-medium"
                  style={{ color: accentHex }}
                  onClick={() => toggleCategory(category.name, true)}
                >
                  Select All
                </button>
                <span className="text-muted-foreground/40">|</span>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground font-medium"
                  onClick={() => toggleCategory(category.name, false)}
                >
                  Deselect All
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {category.modules.map((mod) => {
              const Icon = mod.icon
              const isEnabled = enabledModules.has(mod.id)
              const isRequired = mod.required
              return (
                <motion.div
                  key={mod.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    isEnabled
                      ? 'border-border'
                      : 'border-border opacity-60'
                  }`}
                  style={isEnabled ? { borderColor: `${accentHex}80`, backgroundColor: `${accentHex}10` } : {}}
                  whileHover={{ scale: 1.01 }}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isEnabled ? '' : 'text-muted-foreground'}`} style={isEnabled ? { color: accentHex } : {}} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{mod.label}</span>
                    <p className="text-xs text-muted-foreground truncate">{mod.description}</p>
                  </div>
                  {isRequired ? (
                    <Badge variant="secondary" className="text-xs shrink-0">Required</Badge>
                  ) : (
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleModule(mod.id)}
                    />
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )

  // Step 5: Dashboard Layout
  const renderStep5 = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose which widgets to show on your dashboard. You can rearrange them later.
      </p>
      <div className="space-y-2">
        {dashboardWidgetOptions.map((widget) => {
          const Icon = widget.icon
          const isEnabled = selectedWidgets.has(widget.id)
          return (
            <motion.div
              key={widget.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isEnabled
                  ? 'border-border'
                  : 'border-border'
              }`}
              style={isEnabled ? { borderColor: `${accentHex}66`, backgroundColor: `${accentHex}10` } : {}}
              whileHover={{ scale: 1.005 }}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isEnabled ? '' : 'bg-muted'
              }`}
              style={isEnabled ? { backgroundColor: `${accentHex}20` } : {}}
              >
                <Icon className={`h-4 w-4 ${isEnabled ? '' : 'text-muted-foreground'}`} style={isEnabled ? { color: accentHex } : {}} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{widget.label}</span>
                <p className="text-xs text-muted-foreground">{widget.description}</p>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={() => toggleWidget(widget.id)}
              />
            </motion.div>
          )
        })}
      </div>
    </div>
  )

  // Step 6: Quick Setup
  const renderStep6 = () => (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Would you like to start fresh or import existing data from a backup?
      </p>
      <div className="grid grid-cols-2 gap-4">
        <motion.button
          className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
            setupMode === 'fresh'
              ? 'border-border shadow-sm'
              : 'border-border hover:border-muted-foreground/30'
          }`}
          style={setupMode === 'fresh' ? { borderColor: accentHex, backgroundColor: `${accentHex}15` } : {}}
          onClick={() => setSetupMode('fresh')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            setupMode === 'fresh' ? '' : 'bg-muted'
          }`}
          style={setupMode === 'fresh' ? { backgroundColor: `${accentHex}20` } : {}}
          >
            <Zap className={`h-6 w-6 ${setupMode === 'fresh' ? '' : 'text-muted-foreground'}`} style={setupMode === 'fresh' ? { color: accentHex } : {}} />
          </div>
          <span className="font-semibold">Start Fresh</span>
          <span className="text-xs text-muted-foreground text-center">
            Begin with a clean slate and build your Life OS from scratch
          </span>
          {setupMode === 'fresh' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Check className="h-5 w-5" style={{ color: accentHex }} />
            </motion.div>
          )}
        </motion.button>

        <motion.button
          className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
            setupMode === 'import'
              ? 'border-border shadow-sm'
              : 'border-border hover:border-muted-foreground/30'
          }`}
          style={setupMode === 'import' ? { borderColor: accentHex, backgroundColor: `${accentHex}15` } : {}}
          onClick={() => setSetupMode('import')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            setupMode === 'import' ? '' : 'bg-muted'
          }`}
          style={setupMode === 'import' ? { backgroundColor: `${accentHex}20` } : {}}
          >
            <FileUp className={`h-6 w-6 ${setupMode === 'import' ? '' : 'text-muted-foreground'}`} style={setupMode === 'import' ? { color: accentHex } : {}} />
          </div>
          <span className="font-semibold">Import Backup</span>
          <span className="text-xs text-muted-foreground text-center">
            Restore your data from a previous Life OS backup file
          </span>
          {setupMode === 'import' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Check className="h-5 w-5" style={{ color: accentHex }} />
            </motion.div>
          )}
        </motion.button>
      </div>

      {setupMode === 'import' && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="space-y-3"
        >
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Upload className="h-5 w-5" style={{ color: accentHex }} />
                <div>
                  <p className="font-medium text-sm">Import from JSON</p>
                  <p className="text-xs text-muted-foreground">
                    Select your Life OS backup file to restore all your data
                  </p>
                </div>
              </div>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center transition-colors cursor-pointer" style={{ borderColor: `${accentHex}50` }}>
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to select or drag &amp; drop your backup file
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Supports .json files exported from Life OS
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Importable data: Tasks, Notes, Habits, Journal entries, Finance records, Health data, Goals, and Learning progress.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {setupMode === 'fresh' && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <Card style={{ backgroundColor: `${accentHex}08`, borderColor: `${accentHex}30` }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5" style={{ color: accentHex }} />
                <div>
                  <p className="font-medium text-sm">Starting fresh</p>
                  <p className="text-xs text-muted-foreground">
                    Life OS will be set up with sample data to help you get started. You can always modify or delete it later.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )

  // Step 7: All Set! (final summary)
  const renderStep7 = () => {
    const langLabel = languages.find(l => l.code === selectedLanguage)?.label ?? 'English'
    const langFlag = languages.find(l => l.code === selectedLanguage)?.flag ?? '🇬🇧'
    const themeLabel = themes.find(t => t.id === selectedTheme)?.label ?? 'System'
    const themeEmoji = themes.find(t => t.id === selectedTheme)?.emoji ?? '🔄'
    const accentLabel = accentColors.find(a => a.id === selectedAccent)?.label ?? 'Emerald'
    const accentColor = accentColors.find(a => a.id === selectedAccent)?.color ?? '#10b981'
    const fontSizeLabel = fontSizes.find(f => f.id === selectedFontSize)?.label ?? 'Medium'
    const enabledCount = enabledModules.size
    const widgetCount = selectedWidgets.size

    const summaryItems = [
      { label: 'Name', value: name || 'Not set', icon: '👤' },
      { label: 'Language', value: `${langFlag} ${langLabel}`, icon: '🌐' },
      { label: 'Database', value: 'SQLite 🟢', icon: '💾' },
      { label: 'Theme', value: `${themeEmoji} ${themeLabel}`, icon: '🎨' },
      { label: 'Accent', value: accentLabel, icon: '✨', color: accentColor },
      { label: 'Font Size', value: fontSizeLabel, icon: '📝' },
      { label: 'Modules', value: `${enabledCount} enabled`, icon: '📦' },
      { label: 'Widgets', value: `${widgetCount} active`, icon: '📊' },
      { label: 'Setup', value: setupMode === 'fresh' ? 'Start Fresh' : 'Import Backup', icon: setupMode === 'fresh' ? '⚡' : '📂' },
    ]

    return (
      <div className="space-y-5">
        <motion.div
          className="text-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <motion.div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg"
            style={{ background: `linear-gradient(to bottom right, ${accentHex}, ${accentHex}cc)` }}
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
          >
            <PartyPopper className="h-10 w-10 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold">You&apos;re all set{name ? `, ${name}` : ''}!</h2>
          <p className="text-muted-foreground mt-1">
            Life OS is ready to help you organize your life.
          </p>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          {summaryItems.map((item, i) => (
            <motion.div
              key={item.label}
              className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/30"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <span className="text-base">{item.icon}</span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <div className="flex items-center gap-1">
                  {item.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                  <span className="text-xs font-medium truncate">{item.value}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Enabled Modules */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex flex-wrap gap-1.5">
            {allModules.filter(m => enabledModules.has(m.id)).map(m => {
              const Icon = m.icon
              return (
                <Badge key={m.id} variant="secondary" className="gap-1.5 py-1.5">
                  <Icon className="h-3 w-3" />{m.label}
                </Badge>
              )
            })}
          </div>
        </motion.div>

        {/* Launch Button */}
        <motion.div
          className="relative"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            onClick={handleLaunch}
            className="w-full h-14 text-lg font-semibold shadow-lg relative overflow-hidden"
            style={{ background: `linear-gradient(to right, ${accentHex}, ${accentHex}cc)` }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
            <Rocket className="h-5 w-5 mr-2" />
            Launch Life OS
          </Button>
          {showConfetti && <ConfettiExplosion accentHex={accentHex} />}
        </motion.div>
      </div>
    )
  }

  const stepRenderers = [
    renderStep0,
    renderStep1,
    renderStep2,
    renderStep3,
    renderStep4,
    renderStep5,
    renderStep6,
    renderStep7,
  ]

  // ─── Gradient backgrounds per step ──────────────────────────────

  const stepGradients = [
    { background: `linear-gradient(to bottom right, ${accentHex}0d, transparent, ${accentHex}0d)` },
    { background: 'linear-gradient(to bottom right, rgba(14,165,233,0.05), transparent, rgba(59,130,246,0.05))' },
    { background: 'linear-gradient(to bottom right, rgba(59,130,246,0.05), transparent, rgba(6,182,212,0.05))' },
    { background: 'linear-gradient(to bottom right, rgba(139,92,246,0.05), transparent, rgba(168,85,247,0.05))' },
    { background: 'linear-gradient(to bottom right, rgba(245,158,11,0.05), transparent, rgba(249,115,22,0.05))' },
    { background: 'linear-gradient(to bottom right, rgba(244,63,94,0.05), transparent, rgba(236,72,153,0.05))' },
    { background: `linear-gradient(to bottom right, ${accentHex}0d, transparent, ${accentHex}0d)` },
    { background: `linear-gradient(to bottom right, ${accentHex}0d, transparent, ${accentHex}0d)` },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-500"
    style={stepGradients[step]}>
      <CelebrationOverlay show={showCelebration} />
      <div className="w-full max-w-2xl">
        {/* Header with step indicator */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
            style={{ background: `linear-gradient(to bottom right, ${accentHex}, ${accentHex}cc)` }}>
              L
            </div>
            <span className="font-semibold text-lg">Life OS</span>
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            {step + 1}/{TOTAL_STEPS}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-5">
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        <div className="flex gap-6">
          {/* Vertical Step Indicator (desktop) */}
          <div className="hidden md:flex flex-col items-center gap-1 py-4 shrink-0">
            {wizardSteps.map((s, i) => {
              const Icon = s.icon
              return (
                <button
                  key={i}
                  className="group flex items-center gap-3 w-full"
                  onClick={() => goToStep(i)}
                >
                  <motion.div
                    className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium transition-all shrink-0 ${
                      i < step
                        ? 'text-white'
                        : i === step
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary/20'
                          : 'bg-muted text-muted-foreground'
                    }`}
                    style={i < step ? { backgroundColor: accentHex } : {}}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {i < step ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </motion.div>
                </button>
              )
            })}
          </div>

          {/* Main content area */}
          <div className="flex-1 min-w-0">
            {/* Mobile horizontal step indicator */}
            <div className="flex md:hidden items-center justify-center gap-1 mb-4">
              {wizardSteps.map((_, i) => (
                <motion.div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? 'w-8 bg-primary' : i < step ? 'w-4' : 'w-4 bg-muted'
                  }`}
                  style={i < step ? { backgroundColor: accentHex } : {}}
                  layout
                />
              ))}
            </div>

            <Card className="overflow-hidden">
              <CardContent className="p-6">
                {/* Step title with step number */}
                <div className="mb-5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`title-${step}`}
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 10, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ color: accentHex, backgroundColor: `${accentHex}20` }}>
                          {step + 1}/{TOTAL_STEPS}
                        </span>
                        <h2 className="text-xl font-bold">{wizardSteps[step].title}</h2>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{wizardSteps[step].description}</p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Step content with slide animation */}
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={step}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    {stepRenderers[step]()}
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={step === 0}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />Back
              </Button>
              {step < TOTAL_STEPS - 1 ? (
                <Button onClick={nextStep} className="gap-1" style={{ backgroundColor: accentHex }}>
                  Next<ChevronRight className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

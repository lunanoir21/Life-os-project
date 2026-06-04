'use client'

import { useState, useCallback, useEffect } from 'react'
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
  Circle,
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
  LayoutGrid,
  PackagePlus,
  Rocket,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useAppStore, type ModuleId } from '@/stores/app-store'
import { useTranslation } from '@/lib/i18n'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Data Definitions ────────────────────────────────────────────────

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
]

// Appearance modes — "black" maps to dark mode + the OLED black theme variant
const appearanceModes = [
  { id: 'light', theme: 'light', variant: 'default', icon: Sun, sidebar: '#f4f4f5', bg: '#ffffff' },
  { id: 'dark', theme: 'dark', variant: 'default', icon: Moon, sidebar: '#0c0c0e', bg: '#18181b' },
  { id: 'black', theme: 'dark', variant: 'black', icon: Circle, sidebar: '#000000', bg: '#000000' },
  { id: 'system', theme: 'system', variant: 'default', icon: Monitor, sidebar: 'linear-gradient(135deg,#f4f4f5 50%,#0c0c0e 50%)', bg: 'linear-gradient(135deg,#ffffff 50%,#18181b 50%)' },
] as const

type AppearanceModeId = (typeof appearanceModes)[number]['id']

const accentColors = [
  { id: 'emerald', color: '#10b981', label: 'Emerald' },
  { id: 'teal', color: '#14b8a6', label: 'Teal' },
  { id: 'amber', color: '#f59e0b', label: 'Amber' },
  { id: 'rose', color: '#f43f5e', label: 'Rose' },
  { id: 'violet', color: '#8b5cf6', label: 'Violet' },
  { id: 'cyan', color: '#06b6d4', label: 'Cyan' },
]

const fontSizes = [
  { id: 'small', sample: 'Aa', size: 'text-sm' },
  { id: 'medium', sample: 'Aa', size: 'text-base' },
  { id: 'large', sample: 'Aa', size: 'text-lg' },
]

type WizardModule = { id: string; icon: LucideIcon; enabled: boolean; required?: boolean }
const moduleCategories: { name: string; modules: WizardModule[] }[] = [
  {
    name: 'Overview',
    modules: [
      { id: 'dashboard', icon: LayoutDashboard, enabled: true, required: true },
    ],
  },
  {
    name: 'Productivity',
    modules: [
      { id: 'tasks', icon: CheckSquare, enabled: true },
      { id: 'notes', icon: StickyNote, enabled: true },
      { id: 'calendar', icon: CalendarDays, enabled: true },
      { id: 'time', icon: Timer, enabled: false },
    ],
  },
  {
    name: 'Wellness',
    modules: [
      { id: 'habits', icon: Repeat, enabled: true },
      { id: 'journal', icon: BookOpen, enabled: true },
    ],
  },
  {
    name: 'Growth',
    modules: [
      { id: 'goals', icon: Target, enabled: true },
      { id: 'learning', icon: GraduationCap, enabled: true },
      { id: 'finance', icon: Wallet, enabled: true },
    ],
  },
]

const allModules = moduleCategories.flatMap(c => c.modules)

const dashboardWidgetOptions = [
  { id: 'quick-stats', icon: BarChart3, defaultOn: true },
  { id: 'quote', icon: Quote, defaultOn: true },
  { id: 'weekly-activity', icon: Activity, defaultOn: true },
  { id: 'smart-insights', icon: Lightbulb, defaultOn: true },
  { id: 'daily-planner', icon: ClipboardList, defaultOn: false },
  { id: 'mood-tracker', icon: Smile, defaultOn: false },
  { id: 'activity-feed', icon: Rss, defaultOn: false },
]

const stepIcons = [Sparkles, Globe, Database, Palette, LayoutGrid, LayoutDashboard, PackagePlus, Rocket]
const TOTAL_STEPS = stepIcons.length

// ─── Main Wizard Component ───────────────────────────────────────────

export function SetupWizard() {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [name, setName] = useState('')
  const [selectedMode, setSelectedMode] = useState<AppearanceModeId>('black')
  const [selectedAccent, setSelectedAccent] = useState('emerald')
  const accentHex = accentColors.find(a => a.id === selectedAccent)?.color ?? '#10b981'
  const [selectedFontSize, setSelectedFontSize] = useState('medium')
  const [launching, setLaunching] = useState(false)

  const [enabledModules, setEnabledModules] = useState<Set<string>>(
    new Set(allModules.filter(m => m.enabled).map(m => m.id))
  )
  const [selectedWidgets, setSelectedWidgets] = useState<Set<string>>(
    new Set(dashboardWidgetOptions.filter(w => w.defaultOn).map(w => w.id))
  )
  const [setupMode, setSetupMode] = useState<'fresh' | 'import'>('fresh')

  const {
    setSetupComplete,
    setLanguage,
    setAccentColor,
    setFontSize,
    setDashboardWidgets,
    setTheme,
    setThemeVariant,
    setEnabledModules: setStoreEnabledModules,
  } = useAppStore()
  const language = useAppStore(s => s.language)
  const { setTheme: setNextTheme } = useTheme()
  const { t, tArray } = useTranslation()

  // Localized copy sourced from the global i18n system so language switching
  // in the wizard immediately reflects in every string without a page reload.
  const w = {
    brandLine1: t('setup.brandLine1'),
    brandLine2: t('setup.brandLine2'),
    brandSub: t('setup.brandSub'),
    stepOf: t('setup.stepOf'),
    steps: Array.from({ length: 8 }, (_, i) => ({
      title: t(`setup.steps.${i}.title`),
      description: t(`setup.steps.${i}.description`),
    })),
    introParagraph: t('setup.introParagraph'),
    nameLabel: t('setup.nameLabel'),
    namePlaceholder: t('setup.namePlaceholder'),
    nameHelp: t('setup.nameHelp'),
    featureChips: {
      tasks: t('setup.featureChips.tasks'),
      habits: t('setup.featureChips.habits'),
      journal: t('setup.featureChips.journal'),
      finance: t('setup.featureChips.finance'),
      goals: t('setup.featureChips.goals'),
    },
    storageParagraph: t('setup.storageParagraph'),
    recommended: t('setup.recommended'),
    storageSubtitle: t('setup.storageSubtitle'),
    storageFeatures: tArray('setup.storageFeatures'),
    theme: t('setup.theme'),
    accentColor: t('setup.accentColor'),
    fontSize: t('setup.fontSize'),
    themeLight: t('setup.themeLight'),
    themeDark: t('setup.themeDark'),
    themeBlack: t('setup.themeBlack'),
    themeSystem: t('setup.themeSystem'),
    fontSmall: t('setup.fontSmall'),
    fontMedium: t('setup.fontMedium'),
    fontLarge: t('setup.fontLarge'),
    modulesIntro: t('setup.modulesIntro'),
    all: t('setup.all'),
    none: t('setup.none'),
    required: t('setup.required'),
    categories: Object.fromEntries(
      ['Overview', 'Productivity', 'Wellness', 'Growth'].map(n => [n, t(`setup.categories.${n}`)])
    ) as Record<string, string>,
    modules: Object.fromEntries(
      ['dashboard', 'tasks', 'notes', 'calendar', 'time', 'habits', 'journal', 'goals', 'learning', 'finance'].map(id => [
        id,
        { label: t(`setup.modules.${id}.label`), desc: t(`setup.modules.${id}.desc`) },
      ])
    ) as Record<string, { label: string; desc: string }>,
    widgetsIntro: t('setup.widgetsIntro'),
    widgets: Object.fromEntries(
      ['quick-stats', 'quote', 'weekly-activity', 'smart-insights', 'daily-planner', 'mood-tracker', 'activity-feed'].map(id => [
        id,
        { label: t(`setup.widgets.${id}.label`), desc: t(`setup.widgets.${id}.desc`) },
      ])
    ) as Record<string, { label: string; desc: string }>,
    quickIntro: t('setup.quickIntro'),
    startFresh: t('setup.startFresh'),
    startFreshDesc: t('setup.startFreshDesc'),
    importBackup: t('setup.importBackup'),
    importBackupDesc: t('setup.importBackupDesc'),
    importDrop: t('setup.importDrop'),
    importDropSub: t('setup.importDropSub'),
    freshNote: t('setup.freshNote'),
    allSetHeading: t('setup.allSetHeading'),
    allSetSub: t('setup.allSetSub'),
    sName: t('setup.sName'),
    sLanguage: t('setup.sLanguage'),
    sStorage: t('setup.sStorage'),
    sTheme: t('setup.sTheme'),
    sAccent: t('setup.sAccent'),
    sModules: t('setup.sModules'),
    notSet: t('setup.notSet'),
    modulesEnabledSuffix: t('setup.modulesEnabledSuffix'),
    enabledModulesLabel: t('setup.enabledModulesLabel'),
    skipSetup: t('setup.skipSetup'),
    back: t('setup.back'),
    continue: t('setup.continue'),
    launch: t('setup.launch'),
    settingUp: t('setup.settingUp'),
  }

  const currentMode = appearanceModes.find(m => m.id === selectedMode) ?? appearanceModes[2]
  const selectedTheme = currentMode.theme
  const selectedVariant = currentMode.variant

  // Detect the browser language on first mount and pre-select it so the
  // wizard renders in the user's language right away.
  useEffect(() => {
    const navLang = typeof navigator !== 'undefined' ? navigator.language : 'en'
    const primary = navLang.split('-')[0].toLowerCase()
    const matched = languages.find(l => l.code === primary)
    const code = matched ? matched.code : 'en'
    setLanguage(code)
  }, [setLanguage])

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
    setLaunching(true)
    // language is already reactive (set by the store) — no need to re-set it
    setAccentColor(selectedAccent)
    setFontSize(selectedFontSize)
    setTheme(selectedTheme)
    setThemeVariant(selectedVariant)
    setDashboardWidgets(Array.from(selectedWidgets))
    setStoreEnabledModules([...Array.from(enabledModules), 'settings'] as ModuleId[])
    setNextTheme(selectedTheme)

    if (name.trim()) {
      fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          theme: selectedTheme,
          locale: language,
        }),
      }).catch(() => {})
    }

    setTimeout(() => setSetupComplete(true), 900)
  }

  // Reusable selected-state style for option cards
  const sel = (active: boolean) =>
    active ? { borderColor: accentHex, backgroundColor: `${accentHex}0d` } : undefined

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 24 : -24, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -24 : 24, opacity: 0 }),
  }

  // ─── Step Renderers ─────────────────────────────────────────────

  // Step 0: Welcome (name)
  const renderStep0 = () => (
    <div className="space-y-6">
      <p className="text-[15px] text-muted-foreground leading-relaxed">{w.introParagraph}</p>

      <div className="flex flex-wrap gap-2">
        {[
          { icon: CheckSquare, label: w.featureChips.tasks },
          { icon: Repeat, label: w.featureChips.habits },
          { icon: BookOpen, label: w.featureChips.journal },
          { icon: Wallet, label: w.featureChips.finance },
          { icon: Target, label: w.featureChips.goals },
        ].map(f => (
          <span key={f.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-full px-3 py-1.5">
            <f.icon className="h-3.5 w-3.5" />{f.label}
          </span>
        ))}
      </div>

      <div className="pt-1">
        <label className="text-sm font-medium mb-1.5 block">{w.nameLabel}</label>
        <Input
          placeholder={w.namePlaceholder}
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-10"
          autoFocus
        />
        <p className="text-xs text-muted-foreground mt-1.5">{w.nameHelp}</p>
      </div>
    </div>
  )

  // Step 1: Language
  const renderStep1 = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {languages.map((lang) => {
        const active = language === lang.code
        return (
          <button
            key={lang.code}
            className={cn(
              'relative flex items-center gap-3 p-3.5 rounded-lg border text-left transition-colors',
              active ? 'border-transparent' : 'border-border hover:bg-accent/40'
            )}
            style={sel(active)}
            onClick={() => setLanguage(lang.code)}
          >
            <span className="text-2xl shrink-0">{lang.flag}</span>
            <div className="min-w-0">
              <span className="text-sm font-medium block truncate">{lang.label}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{lang.code}</span>
            </div>
            {active && (
              <Check className="absolute top-2.5 right-2.5 h-4 w-4" style={{ color: accentHex }} />
            )}
          </button>
        )
      })}
    </div>
  )

  // Step 2: Storage
  const renderStep2 = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">{w.storageParagraph}</p>
      <div className="rounded-lg border p-4" style={{ borderColor: `${accentHex}40`, backgroundColor: `${accentHex}0a` }}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${accentHex}14`, color: accentHex }}>
            <Database className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">SQLite</span>
              <Badge className="text-[10px] h-5" style={{ backgroundColor: `${accentHex}1a`, color: accentHex }}>
                {w.recommended}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{w.storageSubtitle}</p>
          </div>
          <Check className="h-4 w-4 shrink-0 mt-1" style={{ color: accentHex }} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {w.storageFeatures.map((f) => (
            <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5 shrink-0" style={{ color: accentHex }} />{f}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // Step 3: Appearance
  const renderStep3 = () => {
    const modeLabel = (id: AppearanceModeId) =>
      id === 'light' ? w.themeLight : id === 'dark' ? w.themeDark : id === 'black' ? w.themeBlack : w.themeSystem
    const fontLabel = (id: string) =>
      id === 'small' ? w.fontSmall : id === 'large' ? w.fontLarge : w.fontMedium
    return (
      <div className="space-y-7">
        <div>
          <label className="text-sm font-medium mb-3 block">{w.theme}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {appearanceModes.map((mode) => {
              const Icon = mode.icon
              const active = selectedMode === mode.id
              return (
                <button
                  key={mode.id}
                  className={cn(
                    'relative flex flex-col gap-2.5 p-2.5 rounded-lg border transition-colors',
                    active ? 'border-transparent' : 'border-border hover:bg-accent/40'
                  )}
                  style={sel(active)}
                  onClick={() => setSelectedMode(mode.id)}
                >
                  <div className="w-full h-12 rounded-md border border-border/60 overflow-hidden flex">
                    <div className="w-1/3 h-full" style={{ background: mode.sidebar }} />
                    <div className="flex-1 p-1.5 flex flex-col gap-1" style={{ background: mode.bg }}>
                      <div className="h-1 w-3/4 rounded-full" style={{ background: accentHex }} />
                      <div className="h-1 w-1/2 rounded-full bg-muted-foreground/30" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">{modeLabel(mode.id)}</span>
                  </div>
                  {active && <Check className="absolute top-2 right-2 h-3.5 w-3.5" style={{ color: accentHex }} />}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-3 block">{w.accentColor}</label>
          <div className="flex flex-wrap gap-2.5">
            {accentColors.map((ac) => {
              const active = selectedAccent === ac.id
              return (
                <button
                  key={ac.id}
                  className="flex flex-col items-center gap-1.5"
                  onClick={() => setSelectedAccent(ac.id)}
                  title={ac.label}
                >
                  <span
                    className={cn('w-9 h-9 rounded-full flex items-center justify-center transition-transform', active && 'scale-105')}
                    style={{
                      backgroundColor: ac.color,
                      boxShadow: active ? `0 0 0 2px var(--background), 0 0 0 4px ${ac.color}` : undefined,
                    }}
                  >
                    {active && <Check className="h-4 w-4 text-white" />}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{ac.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-3 block">{w.fontSize}</label>
          <div className="grid grid-cols-3 gap-2.5">
            {fontSizes.map((fs) => {
              const active = selectedFontSize === fs.id
              return (
                <button
                  key={fs.id}
                  className={cn(
                    'flex flex-col items-center gap-1 py-3.5 rounded-lg border transition-colors',
                    active ? 'border-transparent' : 'border-border hover:bg-accent/40'
                  )}
                  style={sel(active)}
                  onClick={() => setSelectedFontSize(fs.id)}
                >
                  <span className={cn(fs.size, 'font-semibold')}>{fs.sample}</span>
                  <span className="text-xs text-muted-foreground">{fontLabel(fs.id)}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Step 4: Modules
  const renderStep4 = () => (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{w.modulesIntro}</p>
      {moduleCategories.map((category) => (
        <div key={category.name}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
              {w.categories[category.name] ?? category.name}
            </h4>
            {category.modules.some(m => !m.required) && (
              <div className="flex items-center gap-2 text-[11px]">
                <button className="font-medium hover:underline" style={{ color: accentHex }} onClick={() => toggleCategory(category.name, true)}>{w.all}</button>
                <span className="text-muted-foreground/30">·</span>
                <button className="text-muted-foreground hover:text-foreground" onClick={() => toggleCategory(category.name, false)}>{w.none}</button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {category.modules.map((mod) => {
              const Icon = mod.icon
              const isEnabled = enabledModules.has(mod.id)
              const copy = w.modules[mod.id]
              return (
                <div
                  key={mod.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                    isEnabled ? 'border-transparent' : 'border-border'
                  )}
                  style={sel(isEnabled)}
                >
                  <Icon className="h-4 w-4 shrink-0" style={{ color: isEnabled ? accentHex : undefined }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block">{copy?.label}</span>
                    <p className="text-xs text-muted-foreground truncate">{copy?.desc}</p>
                  </div>
                  {mod.required ? (
                    <Badge variant="secondary" className="text-[10px] h-5 shrink-0">{w.required}</Badge>
                  ) : (
                    <Switch checked={isEnabled} onCheckedChange={() => toggleModule(mod.id)} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )

  // Step 5: Dashboard widgets
  const renderStep5 = () => (
    <div className="space-y-2.5">
      <p className="text-sm text-muted-foreground mb-1">{w.widgetsIntro}</p>
      {dashboardWidgetOptions.map((widget) => {
        const Icon = widget.icon
        const isEnabled = selectedWidgets.has(widget.id)
        const copy = w.widgets[widget.id]
        return (
          <div
            key={widget.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border transition-colors',
              isEnabled ? 'border-transparent' : 'border-border'
            )}
            style={sel(isEnabled)}
          >
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
              style={isEnabled ? { backgroundColor: `${accentHex}14`, color: accentHex } : undefined}
            >
              <Icon className={cn('h-4 w-4', !isEnabled && 'text-muted-foreground')} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium block">{copy?.label}</span>
              <p className="text-xs text-muted-foreground truncate">{copy?.desc}</p>
            </div>
            <Switch checked={isEnabled} onCheckedChange={() => toggleWidget(widget.id)} />
          </div>
        )
      })}
    </div>
  )

  // Step 6: Quick setup
  const renderStep6 = () => (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{w.quickIntro}</p>
      <div className="grid grid-cols-2 gap-3">
        {([
          { id: 'fresh', icon: Zap, title: w.startFresh, desc: w.startFreshDesc },
          { id: 'import', icon: FileUp, title: w.importBackup, desc: w.importBackupDesc },
        ] as const).map((opt) => {
          const Icon = opt.icon
          const active = setupMode === opt.id
          return (
            <button
              key={opt.id}
              className={cn(
                'flex flex-col items-start gap-2.5 p-4 rounded-lg border text-left transition-colors',
                active ? 'border-transparent' : 'border-border hover:bg-accent/40'
              )}
              style={sel(active)}
              onClick={() => setSetupMode(opt.id)}
            >
              <div className="w-9 h-9 rounded-md flex items-center justify-center" style={active ? { backgroundColor: `${accentHex}14`, color: accentHex } : undefined}>
                <Icon className={cn('h-4 w-4', !active && 'text-muted-foreground')} />
              </div>
              <div>
                <span className="text-sm font-medium block">{opt.title}</span>
                <span className="text-xs text-muted-foreground">{opt.desc}</span>
              </div>
            </button>
          )
        })}
      </div>

      {setupMode === 'import' ? (
        <Card className="bg-muted/30 border-border">
          <CardContent className="p-4">
            <div className="border border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent/30 transition-colors" style={{ borderColor: `${accentHex}50` }}>
              <Upload className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{w.importDrop}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{w.importDropSub}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border p-3.5" style={{ borderColor: `${accentHex}30`, backgroundColor: `${accentHex}0a` }}>
          <Sparkles className="h-4 w-4 shrink-0 mt-0.5" style={{ color: accentHex }} />
          <p className="text-xs text-muted-foreground leading-relaxed">{w.freshNote}</p>
        </div>
      )}
    </div>
  )

  // Step 7: All set
  const renderStep7 = () => {
    const langLabel = languages.find(l => l.code === language)?.label ?? 'English'
    const langFlag = languages.find(l => l.code === language)?.flag ?? '🇬🇧'
    const themeLabel =
      selectedMode === 'light' ? w.themeLight : selectedMode === 'dark' ? w.themeDark : selectedMode === 'black' ? w.themeBlack : w.themeSystem
    const accentLabel = accentColors.find(a => a.id === selectedAccent)?.label ?? 'Emerald'

    const summaryItems = [
      { label: w.sName, value: name || w.notSet },
      { label: w.sLanguage, value: `${langFlag} ${langLabel}` },
      { label: w.sStorage, value: 'SQLite' },
      { label: w.sTheme, value: themeLabel },
      { label: w.sAccent, value: accentLabel, dot: accentHex },
      { label: w.sModules, value: `${enabledModules.size} ${w.modulesEnabledSuffix}` },
    ]

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: accentHex }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          >
            <Check className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight">{w.allSetHeading}{name ? `, ${name}` : ''}</h3>
            <p className="text-sm text-muted-foreground">{w.allSetSub}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border rounded-lg overflow-hidden border border-border">
          {summaryItems.map((item) => (
            <div key={item.label} className="bg-background p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {item.dot && <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: item.dot }} />}
                <span className="text-sm font-medium truncate">{item.value}</span>
              </div>
            </div>
          ))}
        </div>

        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">{w.enabledModulesLabel}</p>
          <div className="flex flex-wrap gap-1.5">
            {allModules.filter(m => enabledModules.has(m.id)).map(m => {
              const Icon = m.icon
              return (
                <Badge key={m.id} variant="secondary" className="gap-1.5 py-1 font-normal">
                  <Icon className="h-3 w-3" />{w.modules[m.id]?.label}
                </Badge>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const stepRenderers = [
    renderStep0, renderStep1, renderStep2, renderStep3,
    renderStep4, renderStep5, renderStep6, renderStep7,
  ]

  const StepIcon = stepIcons[step]

  return (
    <div className="min-h-screen flex bg-background">
      {/* ─── Left brand panel (desktop) ─── */}
      <aside className="hidden md:flex flex-col w-[320px] shrink-0 border-r border-border bg-muted/30 p-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
            <span className="text-background text-sm font-bold leading-none">L</span>
          </div>
          <span className="font-semibold">Life OS</span>
        </div>

        <div className="mt-10">
          <h1 className="text-xl font-semibold tracking-tight leading-snug">
            {w.brandLine1}<br />{w.brandLine2}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{w.brandSub}</p>
        </div>

        <nav className="mt-8 flex-1 space-y-0.5">
          {w.steps.map((s, i) => {
            const isActive = i === step
            const isDone = i < step
            const clickable = i <= step
            return (
              <button
                key={i}
                onClick={() => clickable && goToStep(i)}
                disabled={!clickable}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                  isActive ? 'bg-accent' : clickable ? 'hover:bg-accent/50' : 'opacity-40 cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0 border',
                    isDone || isActive ? 'border-transparent text-white' : 'border-border text-muted-foreground'
                  )}
                  style={isDone || isActive ? { backgroundColor: accentHex } : undefined}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={cn('text-sm truncate', isActive ? 'font-medium' : 'text-muted-foreground')}>
                  {s.title}
                </span>
              </button>
            )
          })}
        </nav>

        <p className="text-xs text-muted-foreground/60 mt-6">
          {w.stepOf.replace('{n}', String(step + 1)).replace('{total}', String(TOTAL_STEPS))}
        </p>
      </aside>

      {/* ─── Right content ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top progress line */}
        <div className="h-0.5 bg-border/60 shrink-0">
          <div className="h-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%`, backgroundColor: accentHex }} />
        </div>

        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-background text-xs font-bold leading-none">L</span>
            </div>
            <span className="font-semibold text-sm">Life OS</span>
          </div>
          <span className="text-xs text-muted-foreground">{step + 1}/{TOTAL_STEPS}</span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-xl px-6 md:px-10 py-8 md:py-12">
            {/* Step header */}
            <div className="mb-7">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${accentHex}14`, color: accentHex }}>
                  <StepIcon className="h-4 w-4" />
                </div>
                <h2 className="text-xl font-semibold tracking-tight">{w.steps[step].title}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{w.steps[step].description}</p>
            </div>

            {/* Step body */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {stepRenderers[step]()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer nav */}
        <div className="border-t border-border px-6 md:px-10 py-4 flex items-center justify-between gap-3 shrink-0">
          {step === 0 ? (
            <Button variant="ghost" onClick={handleLaunch} disabled={launching} className="text-muted-foreground hover:text-foreground">
              {w.skipSetup}
            </Button>
          ) : (
            <Button variant="ghost" onClick={prevStep} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" />{w.back}
            </Button>
          )}

          <Button
            onClick={step === TOTAL_STEPS - 1 ? handleLaunch : nextStep}
            disabled={launching}
            className="gap-1.5 text-white min-w-[130px] hover:opacity-90"
            style={{ backgroundColor: accentHex }}
          >
            {launching ? (
              w.settingUp
            ) : step === TOTAL_STEPS - 1 ? (
              <><Rocket className="h-4 w-4" />{w.launch}</>
            ) : (
              <>{w.continue}<ChevronRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

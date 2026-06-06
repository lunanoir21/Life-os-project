'use client'

import { useState, useEffect, useRef } from 'react'
import {
  User, Palette, Database, Info, Download, Upload, Moon, Sun, Monitor, ChevronRight, Check, Shield, HardDrive, Code2,
  Trash2, AlertTriangle, FileJson, Keyboard, Bell, Clock, Volume2, CalendarCheck, Flame, CalendarDays, RotateCcw, Globe,
  Wallet, ArrowLeftRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SUPPORTED_CURRENCIES } from '@/lib/finance/currency'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useTheme } from 'next-themes'
import { useAppStore } from '@/stores/app-store'
import { showToast } from '@/lib/toast'
import { motion } from 'framer-motion'
import { KeyboardShortcutsHelp } from '@/components/lifeos/keyboard-shortcuts'
import { useTranslation, availableLanguages } from '@/lib/i18n'
import type { LanguageCode } from '@/lib/i18n'

type SettingsTab = 'profile' | 'appearance' | 'data' | 'shortcuts' | 'notifications' | 'about'

function cn(...inputs: (string | undefined | false)[]) { return inputs.filter(Boolean).join(' ') }

const accentColors = [
  { name: 'emerald', hex: '#10b981', label: 'Emerald' },
  { name: 'teal', hex: '#14b8a6', label: 'Teal' },
  { name: 'amber', hex: '#f59e0b', label: 'Amber' },
  { name: 'rose', hex: '#f43f5e', label: 'Rose' },
  { name: 'violet', hex: '#8b5cf6', label: 'Violet' },
  { name: 'cyan', hex: '#06b6d4', label: 'Cyan' },
  { name: 'indigo', hex: '#6366f1', label: 'Indigo' },
  { name: 'pink', hex: '#ec4899', label: 'Pink' },
  { name: 'lime', hex: '#84cc16', label: 'Lime' },
  { name: 'sky', hex: '#0ea5e9', label: 'Sky' },
] as const

const accentColorMap: Record<string, string> = {
  emerald: '#10b981',
  teal: '#14b8a6',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
  indigo: '#6366f1',
  pink: '#ec4899',
  lime: '#84cc16',
  sky: '#0ea5e9',
}

// Notification preferences helpers (localStorage)
function getNotifPrefs() {
  try { return JSON.parse(localStorage.getItem('lifeos-notification-prefs') || '{}') } catch { return {} }
}
function setNotifPref(key: string, value: unknown) {
  const prefs = getNotifPrefs()
  prefs[key] = value
  localStorage.setItem('lifeos-notification-prefs', JSON.stringify(prefs))
}

export function SettingsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const { theme, setTheme } = useTheme()
  const { setSetupComplete, setShowSetupWizard, sidebarCollapsed, setSidebarCollapsed, accentColor, setAccentColor, fontSize, setFontSize, uiDensity, setUiDensity, animationsEnabled, setAnimationsEnabled, themeVariant, setThemeVariant, customAccentColor, setCustomAccentColor, setTheme: setZustandTheme, language, setLanguage, baseCurrency, setBaseCurrency, currencyConverterEnabled, setCurrencyConverterEnabled } = useAppStore()

  // Helper: resolved accent hex (handles custom color)
  const activeAccentHex = accentColor === 'custom' ? customAccentColor : (accentColorMap[accentColor] || accentColorMap.emerald)
  const [profileName, setProfileName] = useState('User')
  const [profileEmail, setProfileEmail] = useState('user@example.com')
  const [showModuleColors, setShowModuleColors] = useState(true)
  const [borderRadius, setBorderRadius] = useState(() => {
    if (typeof document !== 'undefined') {
      const val = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--radius'))
      return isNaN(val) ? 10 : Math.round(val * 16)
    }
    return 10
  })

  // Data management state
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [importConfirmOpen, setImportConfirmOpen] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [storageInfo, setStorageInfo] = useState<{
    counts: Record<string, number>
    totalRecords: number
    storageSizeMB?: number
    storageSizeKB?: number
    activityStreak?: number
    accountCreated?: string
    moduleRecords?: Record<string, number>
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcuts dialog
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false)

  // Notification preferences state
  const [notifPrefs, setNotifPrefsState] = useState<Record<string, unknown>>({})
  useEffect(() => {
    setNotifPrefsState(getNotifPrefs())
  }, [])

  // Fetch profile data on mount
  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.json())
      .then(data => {
        if (data.name) setProfileName(data.name)
        if (data.email) setProfileEmail(data.email)
      })
      .catch(() => {})
  }, [])

  // Fetch storage info
  useEffect(() => {
    if (activeTab === 'data') {
      fetch('/api/data/stats')
        .then(res => res.json())
        .then(data => setStorageInfo(data))
        .catch(() => {})
    }
  }, [activeTab])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/data/export')
      const data = await response.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lifeos-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast.success(t('toast.exported'), t('toast.dataDownloaded'))
    } catch {
      showToast.error(t('toast.exportFailed'), t('toast.somethingWentWrong'))
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (file: File) => {
    setIsImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const response = await fetch('/api/data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (result.success) {
        showToast.success(t('toast.imported'), `${result.totalImported} ${t('toast.recordsRestored')}`)
        // Refresh storage info
        const statsRes = await fetch('/api/data/stats')
        const statsData = await statsRes.json()
        setStorageInfo(statsData)
      } else {
        showToast.error(t('toast.importFailed'), t('toast.invalidFormat'))
      }
    } catch {
      showToast.error(t('toast.importFailed'), t('toast.couldNotReadFile'))
    } finally {
      setIsImporting(false)
    }
  }

  const handleReset = async () => {
    setIsResetting(true)
    try {
      const response = await fetch('/api/data/reset', { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        showToast.success(t('toast.dataReset'), t('toast.dataCleared'))
        setStorageInfo(null)
        // Refresh storage info
        const statsRes = await fetch('/api/data/stats')
        const statsData = await statsRes.json()
        setStorageInfo(statsData)
      } else {
        showToast.error(t('toast.resetFailed'), t('toast.couldNotClearData'))
      }
    } catch {
      showToast.error(t('toast.resetFailed'), t('toast.somethingWentWrong'))
    } finally {
      setIsResetting(false)
      setResetConfirmOpen(false)
    }
  }

  const moduleLabels: Record<string, string> = {
    tasks: t('tasks.title'),
    notes: t('notes.title'),
    habits: t('habits.title'),
    habitLogs: `${t('habits.title')} ${t('habits.streak')}`,
    journalEntries: `${t('journal.title')} ${t('nav.notes')}`,
    transactions: t('finance.transactions'),
    goals: t('goals.title'),
    courses: t('learning.title'),
    calendarEvents: `${t('calendar.title')} ${t('calendar.newEvent').replace(t('calendar.newEvent').split(' ')[0], '').trim() || t('calendar.title')}`,
    timeEntries: `${t('timeTracker.title')} ${t('timeTracker.newEntry')}`,
    projects: 'Projects',
    tags: 'Tags',
  }

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: t('settings.profile'), icon: User },
    { id: 'appearance', label: t('settings.appearance'), icon: Palette },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell },
    { id: 'data', label: t('settings.data'), icon: Database },
    { id: 'shortcuts', label: t('settings.shortcuts'), icon: Keyboard },
    { id: 'about', label: t('settings.about'), icon: Info },
  ]

  return (
    <div className="p-[var(--lifeos-card-padding)] max-w-4xl mx-auto animate-page-enter">
      <h2 className="text-xl font-bold mb-[var(--lifeos-section-gap)]">{t('settings.title')}</h2>

      {/* Profile Completion Indicator */}
      <Card className="mb-6 overflow-hidden">
        <div className="h-1" style={{ background: `linear-gradient(to right, ${activeAccentHex}, ${activeAccentHex}cc)` }} />
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <svg width={48} height={48} className="transform -rotate-90">
                <circle cx={24} cy={24} r={20} fill="none" stroke="currentColor" strokeWidth={3} className="text-muted/20" />
                <circle cx={24} cy={24} r={20} fill="none" stroke={activeAccentHex} strokeWidth={3} strokeDasharray={125.7} strokeDashoffset={125.7 - 0.75 * 125.7} strokeLinecap="round" className="animate-completion-ring transition-all duration-700" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: activeAccentHex }}>75%</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{t('settings.profileCompletion')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.completeProfile')}</p>
              <div className="flex gap-2 mt-2">
                {!profileEmail.includes('example') && <Badge variant="secondary" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600"><Check className="h-2.5 w-2.5 mr-1" />{t('settings.email')}</Badge>}
                {profileName !== 'User' && <Badge variant="secondary" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600"><Check className="h-2.5 w-2.5 mr-1" />{t('settings.displayName')}</Badge>}
                <Badge variant="outline" className="text-[10px]">Avatar</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-48 shrink-0">
          <nav className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id} className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative hover-lift', isActive ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground')} onClick={() => setActiveTab(tab.id)}>
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-6 rounded-r-full" style={{ background: `linear-gradient(to bottom, ${activeAccentHex}, ${activeAccentHex}cc)` }} />}
                  <Icon className="h-4 w-4" />{tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <Card className="overflow-hidden hover-lift">
                <div className="h-1" style={{ background: `linear-gradient(to right, ${activeAccentHex}, ${activeAccentHex}cc)` }} />
                <CardHeader><CardTitle className="text-base">{t('settings.profileInfo')}</CardTitle><CardDescription>{t('settings.updatePersonalInfo')}</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg" style={{ background: `linear-gradient(to bottom right, ${activeAccentHex}, ${activeAccentHex}cc)`, '--tw-ring-color': `${activeAccentHex}40` } as React.CSSProperties}>{profileName.charAt(0).toUpperCase()}</div>
                    <div><h3 className="font-medium">{profileName}</h3><p className="text-sm text-muted-foreground">{profileEmail}</p></div>
                  </div>
                  <Separator />
                  <div><label className="text-sm font-medium mb-1.5 block">{t('settings.displayName')}</label><Input value={profileName} onChange={e => setProfileName(e.target.value)} /></div>
                  <div><label className="text-sm font-medium mb-1.5 block">{t('settings.email')}</label><Input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} /></div>
                  <Button size="sm" className="text-white shadow-sm" style={{ background: `linear-gradient(to right, ${activeAccentHex}, ${activeAccentHex}cc)` }} onClick={async () => { try { await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: profileName, email: profileEmail }) }); showToast.success(t('toast.profileUpdated'), t('toast.changesSaved')); } catch { showToast.error(t('toast.saveFailed'), t('toast.profileUpdateFailed')); } }}><span className="animate-save-flash rounded px-2 -mx-2 -py-1 my-1">{t('settings.saveChanges')}</span></Button>
                </CardContent>
              </Card>
              <Card className="border-red-200 dark:border-red-900/30">
                <CardHeader><CardTitle className="text-base text-destructive">{t('settings.dangerZone')}</CardTitle><CardDescription>{t('settings.irreversibleActions')}</CardDescription></CardHeader>
                <CardContent><Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => { setSetupComplete(false); setShowSetupWizard(true) }}>{t('settings.resetSetupWizard')}</Button></CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'appearance' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: animationsEnabled ? 0.3 : 0 }} className="space-y-6">

              {/* Current Theme Preview */}
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-violet-400 to-purple-500" />
                <CardHeader>
                  <CardTitle className="text-base">{t('settings.currentPreview')}</CardTitle>
                  <CardDescription>{t('settings.currentPreviewDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border overflow-hidden shadow-sm">
                    {/* Mini mockup */}
                    <div className={cn(
                      'flex h-36',
                      theme === 'dark' ? 'bg-zinc-900' : theme === 'light' ? 'bg-white' : 'bg-zinc-100 dark:bg-zinc-900'
                    )}>
                      {/* Mini sidebar */}
                      <div className={cn(
                        'w-12 shrink-0 flex flex-col gap-1.5 p-1.5 border-r',
                        theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-gray-100 dark:bg-zinc-950 border-gray-200 dark:border-zinc-800'
                      )}>
                        {[0,1,2,3].map(i => (
                          <div key={i} className={cn(
                            'w-full h-2 rounded-sm',
                            i === 0 ? `bg-${accentColor}-500` : theme === 'dark' ? 'bg-zinc-700' : 'bg-gray-200'
                          )} style={i === 0 ? { backgroundColor: activeAccentHex } : undefined} />
                        ))}
                      </div>
                      {/* Mini content area */}
                      <div className="flex-1 p-2 flex flex-col gap-1.5">
                        {/* Header bar */}
                        <div className={cn(
                          'h-3 rounded-sm w-2/3',
                          theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-100'
                        )} />
                        {/* Accent line */}
                        <div className="h-1 rounded-full w-1/3" style={{ backgroundColor: activeAccentHex }} />
                        {/* Content blocks */}
                        <div className="flex gap-1.5 mt-1">
                          <div className={cn('flex-1 h-8 rounded-md', theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-100')} />
                          <div className={cn('flex-1 h-8 rounded-md', theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-100')} />
                          <div className={cn('flex-1 h-8 rounded-md', theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-100')} />
                        </div>
                        {/* Font size preview */}
                        <p className={cn(
                          'text-muted-foreground mt-auto',
                          fontSize === 'small' ? 'text-[6px]' : fontSize === 'large' ? 'text-[10px]' : 'text-[8px]'
                        )} style={{ color: theme === 'dark' ? '#71717a' : '#a1a1aa' }}>
                          The quick brown fox jumps over the lazy dog
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="secondary" className="text-[10px]" style={{ backgroundColor: `${activeAccentHex}20`, color: activeAccentHex }}>
                      {accentColor.charAt(0).toUpperCase() + accentColor.slice(1)} accent
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {(theme ?? '').charAt(0).toUpperCase() + (theme ?? '').slice(1)} {t('settings.theme').toLowerCase()}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {fontSize.charAt(0).toUpperCase() + fontSize.slice(1)} {t('settings.fontSize').toLowerCase()}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {uiDensity.charAt(0).toUpperCase() + uiDensity.slice(1)} {t('settings.density').toLowerCase()}
                    </Badge>
                    {themeVariant !== 'default' && (
                      <Badge variant="secondary" className="text-[10px]" style={{ backgroundColor: '#818cf820', color: '#818cf8' }}>
                        {themeVariant.charAt(0).toUpperCase() + themeVariant.slice(1)} variant
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Language Selector */}
              <Card className="overflow-hidden hover-lift">
                <div className="h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" />
                    <CardTitle className="text-base">{t('settings.language')}</CardTitle>
                  </div>
                  <CardDescription>{t('settings.languageDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {availableLanguages.map((lang) => {
                      const isActive = language === lang.code
                      return (
                        <button
                          key={lang.code}
                          className={cn(
                            'p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 relative hover:scale-[1.02]',
                            isActive ? 'shadow-sm' : 'border-border hover:border-muted-foreground/30'
                          )}
                          style={isActive ? { borderColor: activeAccentHex, backgroundColor: `${activeAccentHex}10` } : undefined}
                          onClick={() => setLanguage(lang.code)}
                        >
                          <div className="text-3xl">{lang.flag}</div>
                          <span className="text-sm font-semibold">{lang.nativeLabel}</span>
                          <span className="text-[10px] text-muted-foreground">{lang.label}</span>
                          {isActive && (
                            <div className="absolute top-2 right-2 rounded-full p-0.5" style={{ backgroundColor: activeAccentHex }}>
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Theme Preview Cards */}
              <Card className="overflow-hidden hover-lift">
                <div className="h-1 bg-gradient-to-r from-violet-400 to-purple-500" />
                <CardHeader>
                  <CardTitle className="text-base">{t('settings.theme')}</CardTitle>
                  <CardDescription>{t('settings.themeDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: 'light', label: t('settings.light'), bg: 'bg-white', sidebarBg: 'bg-gray-50', headerBg: 'bg-gray-100', contentBg: 'bg-white', border: 'border-gray-200', text: 'text-gray-400' },
                      { value: 'dark', label: t('settings.dark'), bg: 'bg-zinc-900', sidebarBg: 'bg-zinc-950', headerBg: 'bg-zinc-800', contentBg: 'bg-zinc-900', border: 'border-zinc-800', text: 'text-zinc-600' },
                      { value: 'system', label: t('settings.system'), bg: 'bg-gradient-to-br from-white to-zinc-900', sidebarBg: 'bg-gradient-to-br from-gray-50 to-zinc-950', headerBg: 'bg-gradient-to-r from-gray-100 to-zinc-800', contentBg: 'bg-gradient-to-br from-white to-zinc-900', border: 'border-gray-300 dark:border-zinc-700', text: 'text-gray-400' },
                    ] as const).map(option => {
                      const isActive = theme === option.value
                      return (
                        <button
                          key={option.value}
                          className={cn(
                            'p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 relative',
                            isActive ? 'shadow-sm' : 'border-border hover:border-muted-foreground/30'
                          )}
                          style={isActive ? { borderColor: activeAccentHex } : undefined}
                          onClick={() => { setTheme(option.value); setZustandTheme(option.value) }}
                        >
                          {/* Mini theme mockup */}
                          <div className={cn('w-full h-16 rounded-lg overflow-hidden border', option.border)}>
                            <div className={cn('flex h-full', option.bg)}>
                              <div className={cn('w-4 shrink-0', option.sidebarBg)} />
                              <div className="flex-1 flex flex-col p-1 gap-0.5">
                                <div className={cn('h-1.5 rounded-sm w-3/4', option.headerBg)} />
                                <div className="flex gap-0.5 mt-0.5">
                                  <div className={cn('flex-1 h-3 rounded-sm', option.headerBg)} />
                                  <div className={cn('flex-1 h-3 rounded-sm', option.headerBg)} />
                                </div>
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-medium">{option.label}</span>
                          {isActive && (
                            <div className="absolute top-2 right-2 rounded-full p-0.5" style={{ backgroundColor: activeAccentHex }}>
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Theme Presets */}
              <Card className="overflow-hidden hover-lift">
                <div className="h-1 bg-gradient-to-r from-indigo-400 via-pink-400 to-amber-400" />
                <CardHeader>
                  <CardTitle className="text-base">{t('settings.themePresets')}</CardTitle>
                  <CardDescription>{t('settings.themePresetsDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { name: 'OLED Black', variant: 'black', accent: 'violet', mode: 'dark', desc: 'Black + Violet + Dark', lightBg: '#ffffff', darkBg: '#000000', accentHex: '#8b5cf6' },
                      { name: 'Ocean Breeze', variant: 'cool', accent: 'cyan', mode: 'dark', desc: 'Cool + Cyan + Dark', lightBg: '#f0f9ff', darkBg: '#0c1222', accentHex: '#06b6d4' },
                      { name: 'Sunset Glow', variant: 'sunset', accent: 'amber', mode: 'light', desc: 'Sunset + Amber + Light', lightBg: '#fff7ed', darkBg: '#1a0f08', accentHex: '#f59e0b' },
                      { name: 'Forest Retreat', variant: 'forest', accent: 'emerald', mode: 'dark', desc: 'Forest + Emerald + Dark', lightBg: '#f0fdf4', darkBg: '#0a1a0f', accentHex: '#10b981' },
                      { name: 'Royal Purple', variant: 'lavender', accent: 'violet', mode: 'dark', desc: 'Lavender + Violet + Dark', lightBg: '#f5f3ff', darkBg: '#1a0f2e', accentHex: '#8b5cf6' },
                      { name: 'Nordic Frost', variant: 'nord', accent: 'sky', mode: 'light', desc: 'Nord + Sky + Light', lightBg: '#f0f4f8', darkBg: '#0f1724', accentHex: '#0ea5e9' },
                      { name: 'Cherry Blossom', variant: 'warm', accent: 'rose', mode: 'light', desc: 'Warm + Rose + Light', lightBg: '#fefce8', darkBg: '#1c1917', accentHex: '#f43f5e' },
                    ]).map((preset) => {
                      const isMatching = themeVariant === preset.variant && accentColor === preset.accent && theme === preset.mode
                      const bgHex = preset.mode === 'dark' ? preset.darkBg : preset.lightBg
                      return (
                        <button
                          key={preset.name}
                          className={cn(
                            'p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 relative',
                            isMatching ? 'shadow-sm' : 'border-border hover:border-muted-foreground/30'
                          )}
                          style={isMatching ? { borderColor: preset.accentHex, backgroundColor: `${preset.accentHex}10` } : undefined}
                          onClick={() => {
                            setThemeVariant(preset.variant)
                            setAccentColor(preset.accent)
                            setTheme(preset.mode)
                            setZustandTheme(preset.mode)
                          }}
                        >
                          {/* Mini preview: variant bg + accent swatch */}
                          <div className="w-full h-12 rounded-lg overflow-hidden border border-border/50 relative" style={{ backgroundColor: bgHex }}>
                            <div className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: preset.accentHex }} />
                            <div className="absolute top-1.5 left-1.5 h-1.5 w-8 rounded-sm opacity-30" style={{ backgroundColor: preset.mode === 'dark' ? '#ffffff' : '#000000' }} />
                            <div className="absolute top-4 left-1.5 h-1.5 w-6 rounded-sm opacity-15" style={{ backgroundColor: preset.mode === 'dark' ? '#ffffff' : '#000000' }} />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-medium">{preset.name}</p>
                            <p className="text-[9px] text-muted-foreground leading-tight">{preset.desc}</p>
                          </div>
                          {isMatching && (
                            <div className="absolute top-2 right-2 rounded-full p-0.5" style={{ backgroundColor: preset.accentHex }}>
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Accent Color Picker */}
              <Card className="overflow-hidden hover-lift">
                <div className="h-1" style={{ background: `linear-gradient(to right, ${activeAccentHex}, ${activeAccentHex}88)` }} />
                <CardHeader>
                  <CardTitle className="text-base">{t('settings.accentColor')}</CardTitle>
                  <CardDescription>{t('settings.accentColorDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-3">
                    {accentColors.map((color) => {
                      const isActive = accentColor === color.name
                      return (
                        <button
                          key={color.name}
                          className={cn(
                            'group relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200',
                            isActive ? 'bg-accent shadow-sm' : 'hover:bg-accent/50'
                          )}
                          onClick={() => setAccentColor(color.name)}
                        >
                          <div
                            className={cn(
                              'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ring-2 ring-offset-2 ring-offset-background',
                              isActive ? 'scale-110' : 'ring-transparent group-hover:scale-105'
                            )}
                            style={{
                              backgroundColor: color.hex,
                              '--tw-ring-color': isActive ? color.hex : undefined,
                              boxShadow: isActive ? `0 0 12px ${color.hex}40` : undefined,
                            } as React.CSSProperties}
                          >
                            {isActive && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              >
                                <Check className="h-5 w-5 text-white" />
                              </motion.div>
                            )}
                          </div>
                          <span className="text-[11px] font-medium">{color.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  <Separator className="my-4" />

                  {/* Custom Color Picker */}
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ring-2 ring-offset-2 ring-offset-background shrink-0',
                        accentColor === 'custom' ? 'scale-110' : 'ring-transparent'
                      )}
                      style={{
                        backgroundColor: customAccentColor,
                        '--tw-ring-color': accentColor === 'custom' ? customAccentColor : undefined,
                        boxShadow: accentColor === 'custom' ? `0 0 12px ${customAccentColor}40` : undefined,
                      } as React.CSSProperties}
                    >
                      {accentColor === 'custom' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        >
                          <Check className="h-5 w-5 text-white" />
                        </motion.div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{t('settings.customColor')}</p>
                      <p className="text-xs text-muted-foreground">{t('settings.accentColorDesc')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg border border-border shadow-sm"
                        style={{ backgroundColor: customAccentColor }}
                      />
                      <label className="cursor-pointer">
                        <input
                          type="color"
                          value={customAccentColor}
                          onChange={(e) => {
                            setCustomAccentColor(e.target.value)
                            setAccentColor('custom')
                          }}
                          className="w-0 h-0 opacity-0 absolute"
                        />
                        <span
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors"
                          style={{ backgroundColor: customAccentColor }}
                        >
                          {t('settings.customColor')}
                        </span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Theme Variant Picker */}
              <Card className="overflow-hidden hover-lift">
                <div className="h-1 bg-gradient-to-r from-indigo-400 to-blue-500" />
                <CardHeader>
                  <CardTitle className="text-base">{t('settings.themeVariant')}</CardTitle>
                  <CardDescription>{t('settings.themeVariantDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
                    {([
                      { value: 'default', label: t('default'), desc: 'Standard white/dark', lightBg: '#ffffff', darkBg: '#18181b', lightCard: '#f4f4f5', darkCard: '#27272a' },
                      { value: 'black', label: 'Black', desc: 'Pure OLED black (dark)', lightBg: '#ffffff', darkBg: '#000000', lightCard: '#f4f4f5', darkCard: '#111111' },
                      { value: 'warm', label: t('settings.compactDesc').split(' ')[0] || 'Warm', desc: 'Warm cream / warm dark', lightBg: '#fefce8', darkBg: '#1c1917', lightCard: '#fef9c3', darkCard: '#292524' },
                      { value: 'cool', label: 'Cool', desc: 'Cool blue tint / cool dark', lightBg: '#f0f9ff', darkBg: '#0c1222', lightCard: '#e0f2fe', darkCard: '#1e293b' },
                      { value: 'midnight', label: 'Midnight', desc: 'Very dark blue (dark only)', lightBg: '#f8fafc', darkBg: '#0a0f1e', lightCard: '#e2e8f0', darkCard: '#131b2e' },
                      { value: 'forest', label: t('goals.fitness'), desc: 'Deep green tint', lightBg: '#f0fdf4', darkBg: '#0a1a0f', lightCard: '#dcfce7', darkCard: '#14331c' },
                      { value: 'sunset', label: 'Sunset', desc: 'Warm orange tint', lightBg: '#fff7ed', darkBg: '#1a0f08', lightCard: '#fed7aa', darkCard: '#2d1a0e' },
                      { value: 'lavender', label: 'Lavender', desc: 'Soft lavender/purple tint', lightBg: '#f5f3ff', darkBg: '#1a0f2e', lightCard: '#ede9fe', darkCard: '#2d1f4e' },
                      { value: 'nord', label: 'Nord', desc: 'Nord palette cool blues', lightBg: '#f0f4f8', darkBg: '#0f1724', lightCard: '#dce8f0', darkCard: '#1e2d3d' },
                    ]).map((variant) => {
                      const isActive = themeVariant === variant.value
                      const isDark = theme === 'dark'
                      const isMidnightDisabled = variant.value === 'midnight' && theme === 'light'
                      return (
                        <button
                          key={variant.value}
                          className={cn(
                            'p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 relative',
                            isActive ? 'shadow-sm' : 'border-border hover:border-muted-foreground/30',
                            isMidnightDisabled && 'opacity-40 cursor-not-allowed'
                          )}
                          style={isActive ? { borderColor: activeAccentHex, backgroundColor: `${activeAccentHex}10` } : undefined}
                          onClick={() => {
                            if (isMidnightDisabled) return
                            setThemeVariant(variant.value)
                          }}
                        >
                          {/* Mini variant preview */}
                          <div className="w-full h-14 rounded-lg overflow-hidden border border-border/50">
                            <div className="flex h-full" style={{ backgroundColor: isDark ? variant.darkBg : variant.lightBg }}>
                              <div className="w-3 shrink-0" style={{ backgroundColor: isDark ? `${variant.darkBg}cc` : `${variant.lightBg}cc` }} />
                              <div className="flex-1 flex flex-col p-1 gap-0.5">
                                <div className="h-1.5 rounded-sm w-3/4" style={{ backgroundColor: isDark ? variant.darkCard : variant.lightCard }} />
                                <div className="flex gap-0.5 mt-0.5">
                                  <div className="flex-1 h-3 rounded-sm" style={{ backgroundColor: isDark ? variant.darkCard : variant.lightCard }} />
                                  <div className="flex-1 h-3 rounded-sm" style={{ backgroundColor: isDark ? variant.darkCard : variant.lightCard }} />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-medium">{variant.label}</p>
                            <p className="text-[9px] text-muted-foreground leading-tight">{variant.desc}</p>
                          </div>
                          {isActive && (
                            <div className="absolute top-2 right-2 rounded-full p-0.5" style={{ backgroundColor: activeAccentHex }}>
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Font Size Selector */}
              <Card className="overflow-hidden hover-lift">
                <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                <CardHeader>
                  <CardTitle className="text-base">{t('settings.fontSize')}</CardTitle>
                  <CardDescription>{t('settings.fontSizeDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: 'small' as const, label: t('settings.small'), sample: 'text-xs' },
                      { value: 'medium' as const, label: t('settings.medium'), sample: 'text-sm' },
                      { value: 'large' as const, label: t('settings.large'), sample: 'text-base' },
                    ]).map((option) => {
                      const isActive = fontSize === option.value
                      return (
                        <button
                          key={option.value}
                          className={cn(
                            'p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2',
                            isActive ? 'shadow-sm' : 'border-border hover:border-muted-foreground/30'
                          )}
                          style={isActive ? { borderColor: activeAccentHex, backgroundColor: `${activeAccentHex}10` } : undefined}
                          onClick={() => setFontSize(option.value)}
                        >
                          <span className={cn(option.sample, 'font-medium text-foreground')}>
                            Aa
                          </span>
                          <span className="text-[10px] text-muted-foreground">{option.label}</span>
                          {isActive && (
                            <Check className="h-3 w-3" style={{ color: activeAccentHex }} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* UI Density */}
              <Card className="overflow-hidden hover-lift">
                <div className="h-1 bg-gradient-to-r from-cyan-400 to-sky-500" />
                <CardHeader>
                  <CardTitle className="text-base">{t('settings.density')}</CardTitle>
                  <CardDescription>{t('settings.densityDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: 'compact' as const, label: t('settings.compact'), desc: t('settings.compactDesc'), padding: 'p-1.5', gap: 'gap-1' },
                      { value: 'comfortable' as const, label: t('settings.comfortable'), desc: t('settings.comfortableDesc'), padding: 'p-3', gap: 'gap-2' },
                      { value: 'spacious' as const, label: t('settings.spacious'), desc: t('settings.spaciousDesc'), padding: 'p-4', gap: 'gap-3' },
                    ]).map((option) => {
                      const isActive = uiDensity === option.value
                      return (
                        <button
                          key={option.value}
                          className={cn(
                            'rounded-xl border-2 transition-all duration-200 flex flex-col items-center',
                            isActive ? 'shadow-sm' : 'border-border hover:border-muted-foreground/30'
                          )}
                          style={isActive ? { borderColor: activeAccentHex, backgroundColor: `${activeAccentHex}10` } : undefined}
                          onClick={() => setUiDensity(option.value)}
                        >
                          {/* Visual density preview */}
                          <div className={cn('w-full flex flex-col', option.padding, option.gap)}>
                            <div className={cn('w-full h-2 rounded-sm bg-muted/50', option.value === 'compact' ? 'h-1.5' : option.value === 'spacious' ? 'h-3' : 'h-2')} />
                            <div className={cn('w-3/4 h-2 rounded-sm bg-muted/30', option.value === 'compact' ? 'h-1.5' : option.value === 'spacious' ? 'h-3' : 'h-2')} />
                            <div className={cn('w-1/2 h-2 rounded-sm bg-muted/20', option.value === 'compact' ? 'h-1.5' : option.value === 'spacious' ? 'h-3' : 'h-2')} />
                          </div>
                          <div className="px-3 pb-3 text-center">
                            <p className="text-xs font-medium">{option.label}</p>
                            <p className="text-[10px] text-muted-foreground">{option.desc}</p>
                          </div>
                          {isActive && (
                            <Check className="h-3 w-3 mb-2" style={{ color: activeAccentHex }} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Animations Toggle */}
              <Card className="overflow-hidden hover-lift">
                <div className="h-1 bg-gradient-to-r from-pink-400 to-rose-500" />
                <CardHeader>
                  <CardTitle className="text-base">{t('settings.animations')}</CardTitle>
                  <CardDescription>{t('settings.animationsDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{t('settings.enableAnimations')}</p>
                      <p className="text-xs text-muted-foreground">{t('settings.animationsDesc')}</p>
                    </div>
                    <Switch checked={animationsEnabled} onCheckedChange={setAnimationsEnabled} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{t('settings.animationsPreview')}</p>
                      <p className="text-xs text-muted-foreground">{t('settings.animationsPreviewDesc')}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="w-6 h-6 rounded-md"
                          style={{ backgroundColor: activeAccentHex }}
                          animate={animationsEnabled ? {
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 1, 0.5],
                          } : { scale: 1, opacity: 0.6 }}
                          transition={animationsEnabled ? {
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.2,
                          } : { duration: 0 }}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Finance Preferences */}
              <Card className="overflow-hidden hover-lift">
                <div className="h-1 bg-gradient-to-r from-teal-400 to-emerald-500" />
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="h-4 w-4" style={{ color: activeAccentHex }} />
                    {t('settings.financePreferences')}
                  </CardTitle>
                  <CardDescription>{t('settings.financePreferencesDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Base currency picker — preference, no API needed. */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{t('settings.baseCurrency')}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t('settings.baseCurrencyDesc')}</p>
                    </div>
                    <Select value={baseCurrency} onValueChange={(v) => setBaseCurrency(v)}>
                      <SelectTrigger className="w-32 font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_CURRENCIES.map(c => (
                          <SelectItem key={c.code} value={c.code}>
                            <span className="font-mono">{c.code}</span>
                            <span className="text-muted-foreground ml-1.5">{c.symbol}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  {/* Live converter toggle — reactive, persisted in the store. */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: `${activeAccentHex}18`, color: activeAccentHex }}
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{t('settings.enableCurrencyConverter')}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t('settings.currencyConverterDesc')}</p>
                      </div>
                    </div>
                    <Switch
                      checked={currencyConverterEnabled}
                      onCheckedChange={(checked) => {
                        setCurrencyConverterEnabled(checked)
                        showToast.success(
                          checked ? t('toast.currencyConverterEnabled') : t('toast.currencyConverterDisabled'),
                          checked ? t('toast.currencyConverterEnabledDesc') : t('toast.currencyConverterDisabledDesc'),
                        )
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                    {t('settings.currencyConverterApiNote')}
                  </p>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>{t('settings.currencyConverterInfo')}</p>
                        <p className="text-[10px] opacity-70">{t('settings.frankfurterApiInfo')}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Border Radius */}
              <Card className="overflow-hidden hover-lift">
                <div className="h-1 bg-gradient-to-r from-orange-400 to-amber-500" />
                <CardHeader>
                  <CardTitle className="text-base">{t('settings.borderRadius')}</CardTitle>
                  <CardDescription>{t('settings.borderRadiusDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground w-8">0px</span>
                    <Slider
                      value={[borderRadius]}
                      min={0}
                      max={16}
                      step={1}
                      onValueChange={([val]) => {
                        setBorderRadius(val)
                        document.documentElement.style.setProperty('--radius', `${val / 16}rem`)
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-8">16px</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {t('settings.current')}: <span className="font-medium text-foreground">{borderRadius}px</span>
                    </p>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-center gap-4">
                    {/* Preview card that changes radius in real-time */}
                    <div
                      className="w-24 h-16 border-2 border-border bg-card flex items-center justify-center shadow-sm transition-all duration-200"
                      style={{ borderRadius: `${borderRadius}px` }}
                    >
                      <span className="text-xs text-muted-foreground">{t('settings.currentPreview')}</span>
                    </div>
                    <div
                      className="w-12 h-12 border-2 flex items-center justify-center shadow-sm transition-all duration-200"
                      style={{ borderRadius: `${borderRadius}px`, borderColor: activeAccentHex, backgroundColor: `${activeAccentHex}10` }}
                    >
                      <Check className="h-4 w-4" style={{ color: activeAccentHex }} />
                    </div>
                    <div
                      className="w-12 h-12 shadow-sm transition-all duration-200"
                      style={{ borderRadius: `${borderRadius}px`, backgroundColor: activeAccentHex }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Sidebar Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('settings.sidebarSettings')}</CardTitle>
                  <CardDescription>{t('settings.sidebarSettingsDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t('settings.sidebarSettings')}</p>
                      <p className="text-xs text-muted-foreground">{t('settings.sidebarSettingsDesc')}</p>
                    </div>
                    <Switch checked={sidebarCollapsed} onCheckedChange={setSidebarCollapsed} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t('settings.sidebarSettings')}</p>
                      <p className="text-xs text-muted-foreground">{t('settings.sidebarSettingsDesc')}</p>
                    </div>
                    <Switch checked={showModuleColors} onCheckedChange={setShowModuleColors} />
                  </div>
                </CardContent>
              </Card>

              {/* Reset to Defaults */}
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t('settings.resetToDefaults')}</p>
                      <p className="text-xs text-muted-foreground">{t('settings.resetToDefaultsDesc')}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setZustandTheme('system')
                        setTheme('system')
                        setAccentColor('emerald')
                        setCustomAccentColor('#10b981')
                        setFontSize('medium')
                        setUiDensity('comfortable')
                        setAnimationsEnabled(true)
                        setThemeVariant('default')
                        setLanguage('en')
                        setBorderRadius(10)
                        document.documentElement.style.setProperty('--radius', `${10 / 16}rem`)
                        showToast.success(t('success'), t('settings.resetToDefaultsDesc'))
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-1.5" />
                      {t('reset')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'data' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Export Data */}
              <Card className="overflow-hidden hover-lift">
                <div className="h-1 bg-gradient-to-r from-teal-400 to-cyan-500" />
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Download className="h-4 w-4 text-teal-500" />
                    {t('settings.exportData')}
                  </CardTitle>
                  <CardDescription>{t('settings.exportDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t('settings.exportDesc')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    {isExporting ? `${t('loading')}` : t('settings.exportData')}
                  </Button>
                </CardContent>
              </Card>

              {/* Import Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Upload className="h-4 w-4 text-amber-500" />
                    {t('settings.importData')}
                  </CardTitle>
                  <CardDescription>{t('settings.importDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t('settings.importDesc')}
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isImporting}
                    >
                      <Upload className="h-4 w-4 mr-1.5" />
                      {isImporting ? `${t('loading')}` : t('settings.importData')}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setImportConfirmOpen(true)
                          // Store file reference for the dialog
                          ;(fileInputRef.current as HTMLInputElement & { _pendingFile?: File })._pendingFile = file
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {t('settings.importDesc')}
                  </p>
                </CardContent>
              </Card>

              {/* Storage & Statistics */}
              <Card className="overflow-hidden hover-lift">
                <div className="h-1" style={{ background: `linear-gradient(to right, ${activeAccentHex}, ${activeAccentHex}cc)` }} />
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-emerald-500" />
                    {t('settings.storageStats')}
                  </CardTitle>
                  <CardDescription>{t('settings.storageStats')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Key metrics row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Shield className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-xs text-muted-foreground">{t('settings.totalRecords')}</span>
                      </div>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{storageInfo?.totalRecords ?? '—'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <HardDrive className="h-3.5 w-3.5 text-teal-500" />
                        <span className="text-xs text-muted-foreground">{t('settings.storageStats')}</span>
                      </div>
                      <p className="text-xl font-bold text-teal-600 dark:text-teal-400">
                        {storageInfo?.storageSizeMB != null
                          ? storageInfo.storageSizeMB >= 1
                            ? `${storageInfo.storageSizeMB} MB`
                            : `${storageInfo.storageSizeKB} KB`
                          : '—'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm">🔥</span>
                        <span className="text-xs text-muted-foreground">{t('settings.activityStreak')}</span>
                      </div>
                      <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{storageInfo?.activityStreak ?? 0} {t('habits.days')}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm">📅</span>
                        <span className="text-xs text-muted-foreground">{t('settings.accountCreated')}</span>
                      </div>
                      <p className="text-sm font-bold text-violet-600 dark:text-violet-400">
                        {storageInfo?.accountCreated
                          ? new Date(storageInfo.accountCreated).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                          : '—'}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Visual bar chart of records per module */}
                  {storageInfo?.moduleRecords && (
                    <div>
                      <p className="text-sm font-medium mb-3">{t('settings.totalRecords')}</p>
                      <div className="space-y-2">
                        {Object.entries(storageInfo.moduleRecords)
                          .filter(([_, count]) => count > 0)
                          .sort(([_, a], [__, b]) => b - a)
                          .map(([module, count]) => {
                            const maxCount = Math.max(...Object.values(storageInfo.moduleRecords || {}))
                            const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
                            const barColors: Record<string, string> = {
                              'Tasks': 'bg-orange-500',
                              'Notes': 'bg-amber-500',
                              'Habits': 'bg-emerald-500',
                              'Journal': 'bg-rose-500',
                              'Finance': 'bg-teal-500',
                              'Goals': 'bg-violet-500',
                              'Learning': 'bg-cyan-500',
                              'Calendar': 'bg-sky-500',
                              'Time': 'bg-indigo-500',
                              'Projects': 'bg-slate-500',
                              'Tags': 'bg-gray-500',
                            }
                            return (
                              <div key={module} className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground w-20 shrink-0 text-right">{module}</span>
                                <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                    className={cn('h-full rounded-full', barColors[module] || 'bg-emerald-500')}
                                  />
                                </div>
                                <span className="text-xs font-semibold w-10 text-right">{count}</span>
                              </div>
                            )
                          })}
                        {Object.values(storageInfo.moduleRecords).every(c => c === 0) && (
                          <p className="text-sm text-muted-foreground text-center py-4">{t('noData')}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {!storageInfo && (
                    <div className="text-center py-4 text-muted-foreground text-sm">{t('loading')}</div>
                  )}

                  <Separator />

                  {/* Detailed counts */}
                  {storageInfo?.counts && (
                    <div>
                      <p className="text-sm font-medium mb-2">{t('settings.totalRecords')}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(storageInfo.counts)
                          .filter(([_, count]) => count > 0)
                          .sort(([_, a], [__, b]) => b - a)
                          .map(([key, count]) => (
                            <div key={key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50">
                              <span className="text-xs text-muted-foreground">{moduleLabels[key] || key}</span>
                              <span className="text-xs font-semibold">{count}</span>
                            </div>
                          ))}
                        {Object.values(storageInfo.counts).every(c => c === 0) && (
                          <p className="text-sm text-muted-foreground col-span-full text-center py-4">{t('noData')}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{t('settings.storageStats')}</span>
                      <span className="font-medium">Zustand Persist</span>
                    </div>
                    <Progress value={4.8} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{t('settings.storageStats')}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Reset Data */}
              <Card className="border-red-200 dark:border-red-900/30">
                <CardHeader>
                  <CardTitle className="text-base text-destructive flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    {t('settings.resetAllData')}
                  </CardTitle>
                  <CardDescription>{t('settings.resetDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t('settings.resetDesc')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/30"
                    onClick={() => setResetConfirmOpen(true)}
                    disabled={isResetting}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    {isResetting ? `${t('loading')}` : t('settings.resetAllData')}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'shortcuts' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-cyan-400 to-sky-500" />
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Keyboard className="h-4 w-4 text-cyan-500" />
                    {t('settings.shortcuts')}
                  </CardTitle>
                  <CardDescription>{t('settings.shortcuts')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t('onboarding.keyboardShortcutsDesc')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShortcutsHelpOpen(true)}
                  >
                    <Keyboard className="h-4 w-4 mr-1.5" />
                    {t('settings.shortcuts')}
                  </Button>
                </CardContent>
              </Card>

              {/* Quick reference */}
              <Card>
                <CardHeader><CardTitle className="text-base">{t('settings.shortcuts')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { keys: '⌘ K', desc: t('commandPalette.title') },
                      { keys: '⌘ \\', desc: t('settings.sidebarSettings') },
                      { keys: '⌘ 1-9', desc: t('nav.dashboard') },
                      { keys: '?', desc: t('settings.shortcuts') },
                    ].map(shortcut => (
                      <div key={shortcut.keys} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50">
                        <span className="text-sm text-muted-foreground">{shortcut.desc}</span>
                        <kbd className="px-2 py-1 rounded bg-muted text-xs font-mono font-semibold">{shortcut.keys}</kbd>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Notification Preferences Header */}
              <Card className="overflow-hidden hover-lift">
                <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="h-4 w-4 text-amber-500" />
                    {t('settings.notificationPrefs')}
                  </CardTitle>
                  <CardDescription>{t('settings.notificationPrefs')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Task Reminders */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                        <CalendarCheck className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{t('settings.taskReminders')}</p>
                        <p className="text-xs text-muted-foreground">{t('settings.taskReminders')}</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifPrefs.taskReminders !== false}
                      onCheckedChange={(checked) => {
                        setNotifPref('taskReminders', checked)
                        setNotifPrefsState(getNotifPrefs())
                      }}
                    />
                  </div>

                  <Separator />

                  {/* Habit Reminders */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                        <Flame className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{t('settings.habitReminders')}</p>
                        <p className="text-xs text-muted-foreground">{t('settings.habitReminders')}</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifPrefs.habitReminders !== false}
                      onCheckedChange={(checked) => {
                        setNotifPref('habitReminders', checked)
                        setNotifPrefsState(getNotifPrefs())
                      }}
                    />
                  </div>

                  <Separator />

                  {/* Daily Summary */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center">
                        <FileJson className="h-4 w-4 text-teal-500" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{t('settings.journalReminders')}</p>
                        <p className="text-xs text-muted-foreground">{t('settings.journalReminders')}</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifPrefs.dailySummary === true}
                      onCheckedChange={(checked) => {
                        setNotifPref('dailySummary', checked)
                        setNotifPrefsState(getNotifPrefs())
                      }}
                    />
                  </div>

                  <Separator />

                  {/* Weekly Review Reminder */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
                        <CalendarDays className="h-4 w-4 text-violet-500" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{t('weeklyReview.title')}</p>
                        <p className="text-xs text-muted-foreground">{t('weeklyReview.title')}</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifPrefs.weeklyReviewReminder !== false}
                      onCheckedChange={(checked) => {
                        setNotifPref('weeklyReviewReminder', checked)
                        setNotifPrefsState(getNotifPrefs())
                      }}
                    />
                  </div>

                  <Separator />

                  {/* Sound Effects */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-950/30 flex items-center justify-center">
                        <Volume2 className="h-4 w-4 text-pink-500" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{t('settings.soundEnabled')}</p>
                        <p className="text-xs text-muted-foreground">{t('settings.soundEnabled')}</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifPrefs.soundEffects === true}
                      onCheckedChange={(checked) => {
                        setNotifPref('soundEffects', checked)
                        setNotifPrefsState(getNotifPrefs())
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Quiet Hours */}
              <Card className="overflow-hidden hover-lift">
                <div className="h-1 bg-gradient-to-r from-slate-400 to-slate-500" />
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    {t('settings.notifications')}
                  </CardTitle>
                  <CardDescription>{t('settings.notificationPrefs')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{t('settings.desktopNotifications')}</p>
                      <p className="text-xs text-muted-foreground">{t('settings.desktopNotifications')}</p>
                    </div>
                    <Switch
                      checked={notifPrefs.quietHoursEnabled === true}
                      onCheckedChange={(checked) => {
                        setNotifPref('quietHoursEnabled', checked)
                        setNotifPrefsState(getNotifPrefs())
                      }}
                    />
                  </div>
                  {notifPrefs.quietHoursEnabled === true && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">{t('timeTracker.start')}</label>
                          <Input
                            type="time"
                            value={(notifPrefs.quietHoursStart as string) || '22:00'}
                            onChange={(e) => {
                              setNotifPref('quietHoursStart', e.target.value)
                              setNotifPrefsState(getNotifPrefs())
                            }}
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">{t('settings.notificationPrefs')}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">{t('timeTracker.stop')}</label>
                          <Input
                            type="time"
                            value={(notifPrefs.quietHoursEnd as string) || '07:00'}
                            onChange={(e) => {
                              setNotifPref('quietHoursEnd', e.target.value)
                              setNotifPrefsState(getNotifPrefs())
                            }}
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">{t('settings.notificationPrefs')}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'about' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <Card className="overflow-hidden hover-lift"><div className="h-1" style={{ background: `linear-gradient(to right, ${activeAccentHex}, ${activeAccentHex}cc)` }} /><CardHeader><CardTitle className="text-base">{t('settings.aboutTitle')}</CardTitle><CardDescription>{t('settings.aboutDesc')}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center gap-4"><img src="/logo.svg" alt="Life OS" className="w-14 h-14 rounded-xl shadow-lg" /><div><h3 className="font-semibold">{t('appName')}</h3><p className="text-sm text-muted-foreground">{t('settings.version')} 1.0.0</p></div></div><Separator /><div className="space-y-2.5 text-sm">{[{ label: 'Framework', value: 'Next.js 16' }, { label: 'UI Library', value: 'shadcn/ui' }, { label: 'State Management', value: 'Zustand' }, { label: 'Database', value: 'SQLite + Prisma' }, { label: 'Styling', value: 'Tailwind CSS 4' }, { label: 'Language', value: 'TypeScript 5' }].map(item => (<div key={item.label} className="flex items-center justify-between"><span className="text-muted-foreground">{item.label}</span><span className="font-medium">{item.value}</span></div>))}</div><Separator /><div className="flex items-center gap-2"><Code2 className="h-4 w-4 text-emerald-500" /><p className="text-xs text-muted-foreground">{t('settings.builtWith')} ❤️. {t('settings.aboutDesc')}</p></div></CardContent></Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* Import Confirmation Dialog */}
      <Dialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirm')} {t('settings.importData')}</DialogTitle>
            <DialogDescription>
              {t('settings.importDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
            <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {t('settings.exportDesc')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportConfirmOpen(false)}>{t('cancel')}</Button>
            <Button onClick={() => {
              const file = (fileInputRef.current as HTMLInputElement & { _pendingFile?: File })._pendingFile
              if (file) {
                handleImport(file)
                setImportConfirmOpen(false)
              }
            }}>
              <Upload className="h-4 w-4 mr-1.5" />
              {t('settings.importData')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">{t('settings.resetAllData')}?</DialogTitle>
            <DialogDescription>
              {t('settings.resetDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
            <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {t('settings.exportDesc')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>{t('cancel')}</Button>
            <Button variant="destructive" onClick={handleReset} disabled={isResetting}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              {isResetting ? `${t('loading')}` : `${t('delete')} ${t('all')}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Help Dialog */}
      <KeyboardShortcutsHelp open={shortcutsHelpOpen} onOpenChange={setShortcutsHelpOpen} />
    </div>
  )
}

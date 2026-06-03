'use client'

import { useState, useEffect } from 'react'
import { useAppStore, type ModuleId } from '@/stores/app-store'
import {
  Search,
  Sun,
  Moon,
  Plus,
  Menu,
  Command,
  CheckSquare,
  StickyNote,
  BookOpen,
  ChevronRight,
  User,
  Settings,
  LogOut,
  Clock,
  Maximize2,
  Calendar,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useIsMobile } from '@/hooks/use-mobile'
import { NotificationCenter } from '@/components/lifeos/notification-center'
import { useTranslation } from '@/lib/i18n'
import { format } from 'date-fns'

export function Header() {
  const { activeModule, setCommandPaletteOpen, setMobileSidebarOpen, setGlobalSearchOpen, setActiveModule, toggleFocusMode } = useAppStore()
  const { theme, setTheme } = useTheme()
  const isMobile = useIsMobile()
  const { t } = useTranslation()

  // Translated module labels and groups
  const moduleLabels: Record<ModuleId, string> = {
    dashboard: t('nav.dashboard'),
    tasks: t('nav.tasks'),
    notes: t('nav.notes'),
    habits: t('nav.habits'),
    journal: t('nav.journal'),
    finance: t('nav.finance'),
    goals: t('nav.goals'),
    learning: t('nav.learning'),
    calendar: t('nav.calendar'),
    time: t('nav.timeTracker'),
    settings: t('nav.settings'),
  }

  const moduleGroups: Record<ModuleId, string> = {
    dashboard: t('groups.home'),
    tasks: t('groups.productivity'),
    notes: t('groups.productivity'),
    habits: t('groups.wellness'),
    journal: t('groups.wellness'),
    finance: t('groups.growth'),
    goals: t('groups.growth'),
    learning: t('groups.growth'),
    calendar: t('groups.productivity'),
    time: t('groups.productivity'),
    settings: t('groups.settings'),
  }

  // Live time that updates every second
  const [liveTime, setLiveTime] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch user profile for avatar name
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  useEffect(() => {
    fetch('/api/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.name) setUserName(data.name)
        if (data?.email) setUserEmail(data.email)
      })
      .catch(() => {})
  }, [])

  // Derive initials from user name
  const initials = userName
    ? userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const displayName = userName || 'User'

  return (
    <header className="h-14 sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border/40 flex items-center justify-between px-4 gap-4 shrink-0">
      {/* Left section - Breadcrumb with module-specific color accent */}
      <div className="flex items-center gap-3">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 interactive-hover"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setActiveModule('dashboard')}
              >
                {t('appName')}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
            </BreadcrumbSeparator>
            {activeModule !== 'dashboard' && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink className="cursor-pointer text-muted-foreground/70 hover:text-foreground transition-colors">
                    {moduleGroups[activeModule]}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
                    {moduleLabels[activeModule]}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
            {activeModule === 'dashboard' && (
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
                  {t('nav.dashboard')}
                </BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Center - Search with rounded-full, shadow, ⌘K badge */}
      {!isMobile && (
        <div className="flex-1 max-w-md">
          <button
            onClick={() => setGlobalSearchOpen(true)}
            className="flex items-center gap-2 w-full h-9 rounded-full border border-input/60 bg-muted/30 px-4 text-sm text-muted-foreground hover:bg-muted/60 hover:border-muted-foreground/20 hover:shadow-sm transition-all duration-200 search-glow focus-within:bg-background focus-within:shadow-md"
          >
            <Search className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
            <span>{t('header.searchEverything')}</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-full border bg-muted/80 px-2 font-mono text-[10px] font-medium text-muted-foreground/70 shadow-sm">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>
        </div>
      )}

      {/* Right section */}
      <div className="flex items-center gap-1">
        {/* Live date/time display with better formatting */}
        {!isMobile && (
          <div className="flex items-center gap-2 mr-1 px-3 py-1.5 rounded-full bg-muted/30 text-xs text-muted-foreground tabular-nums">
            <Calendar className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-muted-foreground/70">{format(liveTime, 'MMM d')}</span>
            <span className="text-muted-foreground/20">·</span>
            <Clock className="h-3 w-3" style={{ color: 'var(--accent-primary)' }} />
            <span className="font-mono">{format(liveTime, 'h:mm')}</span>
            <span className="text-[10px] text-muted-foreground/50">{format(liveTime, 'a')}</span>
          </div>
        )}

        {/* Search on mobile */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 interactive-hover"
            onClick={() => setGlobalSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}

        {/* Quick add dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 relative interactive-hover"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground">{t('header.quickCreate')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setActiveModule('tasks'); setCommandPaletteOpen(true) }} className="click-scale">
              <CheckSquare className="h-4 w-4 mr-2" style={{ color: 'var(--accent-primary)' }} />
              {t('header.newTask')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setActiveModule('notes'); setCommandPaletteOpen(true) }} className="click-scale">
              <StickyNote className="h-4 w-4 mr-2 text-amber-500" />
              {t('header.newNote')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setActiveModule('journal'); setCommandPaletteOpen(true) }} className="click-scale">
              <BookOpen className="h-4 w-4 mr-2 text-rose-500" />
              {t('header.newJournalEntry')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Focus Mode toggle */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 relative interactive-hover"
            onClick={toggleFocusMode}
            title={`${t('header.focusMode')} (F11)`}
          >
            <Maximize2 className="h-4 w-4" />
            <span className="sr-only">{t('header.focusMode')}</span>
          </Button>
        )}

        {/* Notifications - already has bell with count badge via NotificationCenter */}
        <NotificationCenter />

        {/* User avatar dropdown with profile name + theme toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 px-1.5 gap-2 hover:bg-accent/50 rounded-full interactive-hover">
              <div className="relative">
                <Avatar className="h-7 w-7 ring-2 ring-background shadow-sm">
                  <AvatarFallback className="text-white text-[10px] font-bold" style={{ background: `linear-gradient(135deg, var(--accent-primary), var(--accent-primary-light))` }}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-background animate-status-online" style={{ backgroundColor: 'var(--accent-primary)' }} />
              </div>
              {!isMobile && (
                <span className="text-sm font-medium hidden sm:inline max-w-[100px] truncate">{displayName}</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{userEmail || 'user@example.com'}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => useAppStore.getState().setActiveModule('settings')} className="click-scale">
              <User className="mr-2 h-4 w-4" />
              {t('header.profile')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => useAppStore.getState().setActiveModule('settings')} className="click-scale">
              <Settings className="mr-2 h-4 w-4" />
              {t('header.preferences')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Theme toggle in dropdown */}
            <DropdownMenuItem
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="click-scale"
            >
              {theme === 'dark' ? (
                <Sun className="mr-2 h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
              ) : (
                <Moon className="mr-2 h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
              )}
              {theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive click-scale">
              <LogOut className="mr-2 h-4 w-4" />
              {t('header.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

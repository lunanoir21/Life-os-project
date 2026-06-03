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
  Maximize2,
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

export function Header() {
  const { activeModule, setCommandPaletteOpen, setMobileSidebarOpen, setGlobalSearchOpen, setActiveModule, toggleFocusMode } = useAppStore()
  const { theme, setTheme } = useTheme()
  const isMobile = useIsMobile()
  const { t } = useTranslation()

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

  const initials = userName
    ? userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const displayName = userName || 'User'

  return (
    <header className="h-12 sticky top-0 z-30 bg-background border-b border-border flex items-center justify-between px-4 gap-4 shrink-0">
      {/* Left — breadcrumb */}
      <div className="flex items-center gap-2">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                className="cursor-pointer text-muted-foreground hover:text-foreground text-sm transition-colors"
                onClick={() => setActiveModule('dashboard')}
              >
                {t('appName')}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
            </BreadcrumbSeparator>
            {activeModule !== 'dashboard' ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink className="text-muted-foreground/60 text-sm">
                    {moduleGroups[activeModule]}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-sm font-medium">
                    {moduleLabels[activeModule]}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage className="text-sm font-medium">
                  {t('nav.dashboard')}
                </BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Center — search */}
      {!isMobile && (
        <div className="flex-1 max-w-sm">
          <button
            onClick={() => setGlobalSearchOpen(true)}
            className="flex items-center gap-2 w-full h-8 rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground hover:bg-muted/70 transition-colors"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left">{t('header.searchEverything')}</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] text-muted-foreground">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>
        </div>
      )}

      {/* Right */}
      <div className="flex items-center gap-1">
        {isMobile && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setGlobalSearchOpen(true)}>
            <Search className="h-4 w-4" />
          </Button>
        )}

        {/* Quick add */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs text-muted-foreground">{t('header.quickCreate')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setActiveModule('tasks'); setCommandPaletteOpen(true) }}>
              <CheckSquare className="h-4 w-4 mr-2" />
              {t('header.newTask')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setActiveModule('notes'); setCommandPaletteOpen(true) }}>
              <StickyNote className="h-4 w-4 mr-2" />
              {t('header.newNote')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setActiveModule('journal'); setCommandPaletteOpen(true) }}>
              <BookOpen className="h-4 w-4 mr-2" />
              {t('header.newJournalEntry')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleFocusMode}
            title={`${t('header.focusMode')} (F11)`}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        )}

        <NotificationCenter />

        {/* User avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-7 px-1.5 gap-1.5 rounded-md hover:bg-accent/60">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] font-semibold bg-foreground text-background">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!isMobile && (
                <span className="text-sm hidden sm:inline max-w-[80px] truncate">{displayName}</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{userEmail || 'user@example.com'}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => useAppStore.getState().setActiveModule('settings')}>
              <User className="mr-2 h-4 w-4" />
              {t('header.profile')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => useAppStore.getState().setActiveModule('settings')}>
              <Settings className="mr-2 h-4 w-4" />
              {t('header.preferences')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              {theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t('header.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

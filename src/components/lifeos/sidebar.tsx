'use client'

import { useMemo } from 'react'
import { useAppStore, type ModuleId } from '@/stores/app-store'
import { useTranslation } from '@/lib/i18n'
import {
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
  Settings,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/use-mobile'

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const { activeModule, setActiveModule, setMobileSidebarOpen, enabledModules } = useAppStore()
  const { t } = useTranslation()

  const navSections = useMemo(() => [
    {
      title: t('nav.overview'),
      items: [
        { id: 'dashboard' as ModuleId, label: t('nav.dashboard'), icon: LayoutDashboard },
      ],
    },
    {
      title: t('nav.productivity'),
      items: [
        { id: 'tasks' as ModuleId, label: t('nav.tasks'), icon: CheckSquare },
        { id: 'notes' as ModuleId, label: t('nav.notes'), icon: StickyNote },
        { id: 'calendar' as ModuleId, label: t('nav.calendar'), icon: CalendarDays },
        { id: 'time' as ModuleId, label: t('nav.timeTracker'), icon: Timer },
      ],
    },
    {
      title: t('nav.wellness'),
      items: [
        { id: 'habits' as ModuleId, label: t('nav.habits'), icon: Repeat },
        { id: 'journal' as ModuleId, label: t('nav.journal'), icon: BookOpen },
      ],
    },
    {
      title: t('nav.growth'),
      items: [
        { id: 'goals' as ModuleId, label: t('nav.goals'), icon: Target },
        { id: 'learning' as ModuleId, label: t('nav.learning'), icon: GraduationCap },
        { id: 'finance' as ModuleId, label: t('nav.finance'), icon: Wallet },
      ],
    },
  ], [t])

  const handleNav = (id: ModuleId) => {
    setActiveModule(id)
    setMobileSidebarOpen(false)
  }

  const filteredSections = navSections.map(section => ({
    ...section,
    items: section.items.filter(item =>
      enabledModules.includes(item.id) || item.id === 'dashboard'
    )
  })).filter(section => section.items.length > 0)

  return (
    <div className="flex flex-col h-full">
      {/* Logo / workspace */}
      <div className={cn(
        'flex items-center h-12 px-4 shrink-0 border-b border-border',
        collapsed && 'justify-center px-2'
      )}>
        {collapsed ? (
          <img src="/logo.svg" alt="Life OS" className="w-7 h-7 rounded-md" />
        ) : (
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="" aria-hidden className="w-6 h-6 rounded-md shrink-0" />
            <span className="text-sm font-semibold tracking-tight">{t('appName')}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="px-2 space-y-4">
          <TooltipProvider delayDuration={0}>
            {filteredSections.map((section) => (
              <div key={section.title}>
                {!collapsed && (
                  <p className="px-2 mb-1 text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                    {section.title}
                  </p>
                )}
                <div className="space-y-px">
                  {section.items.map((mod) => {
                    const isActive = activeModule === mod.id
                    const Icon = mod.icon

                    const btn = (
                      <button
                        key={mod.id}
                        onClick={() => handleNav(mod.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 rounded-md text-sm transition-colors duration-150',
                          collapsed ? 'justify-center px-2 py-2' : 'px-2 py-1.5',
                          isActive
                            ? 'bg-accent text-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{mod.label}</span>}
                      </button>
                    )

                    if (collapsed) {
                      return (
                        <Tooltip key={mod.id}>
                          <TooltipTrigger asChild>{btn}</TooltipTrigger>
                          <TooltipContent side="right">{mod.label}</TooltipContent>
                        </Tooltip>
                      )
                    }

                    return btn
                  })}
                </div>
              </div>
            ))}
          </TooltipProvider>
        </nav>
      </ScrollArea>

      {/* Bottom actions */}
      <div className="shrink-0 border-t border-border p-2 space-y-px">
        <TooltipProvider delayDuration={0}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => useAppStore.getState().toggleFocusMode()}
                  className="w-full flex items-center justify-center px-2 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors duration-150"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{t('nav.focusMode')}</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => useAppStore.getState().toggleFocusMode()}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors duration-150"
            >
              <Maximize2 className="h-4 w-4 shrink-0" />
              <span>{t('nav.focusMode')}</span>
            </button>
          )}

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleNav('settings')}
                  className={cn(
                    'w-full flex items-center justify-center px-2 py-2 rounded-md transition-colors duration-150',
                    activeModule === 'settings'
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                >
                  <Settings className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{t('nav.settings')}</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => handleNav('settings')}
              className={cn(
                'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors duration-150',
                activeModule === 'settings'
                  ? 'bg-accent text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              )}
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span>{t('nav.settings')}</span>
            </button>
          )}
        </TooltipProvider>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useAppStore()
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-background">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent collapsed={false} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside
      className={cn(
        'relative h-screen border-r border-border bg-background transition-all duration-200 shrink-0',
        sidebarCollapsed ? 'w-[52px]' : 'w-56'
      )}
    >
      <SidebarContent collapsed={sidebarCollapsed} />
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-16 z-10 h-6 w-6 rounded-full border border-border bg-background shadow-sm hover:bg-accent"
        onClick={toggleSidebar}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </aside>
  )
}

'use client'

import { useEffect, useCallback } from 'react'
import {
  Command,
  SidebarOpen,
  Plus,
  HelpCircle,
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
  Maximize2,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAppStore, type ModuleId } from '@/stores/app-store'

const moduleShortcuts: { key: string; moduleId: ModuleId; label: string; icon: React.ElementType }[] = [
  { key: '1', moduleId: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: '2', moduleId: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: '3', moduleId: 'notes', label: 'Notes', icon: StickyNote },
  { key: '4', moduleId: 'habits', label: 'Habits', icon: Repeat },
  { key: '5', moduleId: 'journal', label: 'Journal', icon: BookOpen },
  { key: '6', moduleId: 'finance', label: 'Finance', icon: Wallet },
  { key: '7', moduleId: 'goals', label: 'Goals', icon: Target },
  { key: '8', moduleId: 'learning', label: 'Learning', icon: GraduationCap },
]

const generalShortcuts = [
  { keys: ['⌘', 'K'], label: 'Open command palette', icon: Command },
  { keys: ['⌘', '\\'], label: 'Toggle sidebar', icon: SidebarOpen },
  { keys: ['⌘', 'N'], label: 'New item (context-dependent)', icon: Plus },
  { keys: ['F11'], label: 'Toggle focus mode', icon: Maximize2 },
  { keys: ['?'], label: 'Show keyboard shortcuts', icon: HelpCircle },
]

const navigationShortcuts = [
  { keys: ['⌘', '1'], label: 'Dashboard', icon: LayoutDashboard },
  { keys: ['⌘', '2'], label: 'Tasks', icon: CheckSquare },
  { keys: ['⌘', '3'], label: 'Notes', icon: StickyNote },
  { keys: ['⌘', '4'], label: 'Habits', icon: Repeat },
  { keys: ['⌘', '5'], label: 'Journal', icon: BookOpen },
  { keys: ['⌘', '6'], label: 'Finance', icon: Wallet },
  { keys: ['⌘', '7'], label: 'Goals', icon: Target },
  { keys: ['⌘', '8'], label: 'Learning', icon: GraduationCap },
]

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md bg-muted border border-border text-[11px] font-mono font-semibold text-muted-foreground shadow-sm">
      {children}
    </kbd>
  )
}

function ShortcutRow({ keys, label, icon: Icon }: { keys: string[]; label: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <span key={i} className="flex items-center gap-1">
            <Kbd>{key}</Kbd>
            {i < keys.length - 1 && <span className="text-muted-foreground text-xs mx-0.5">+</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-cyan-500" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          {/* General */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-3">General</h3>
            <div className="space-y-0.5">
              {generalShortcuts.map(s => (
                <ShortcutRow key={s.label} keys={s.keys} label={s.label} icon={s.icon} />
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-3">Navigation</h3>
            <div className="space-y-0.5">
              {navigationShortcuts.map(s => (
                <ShortcutRow key={s.label} keys={s.keys} label={s.label} icon={s.icon} />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function useKeyboardShortcuts() {
  const { setActiveModule, toggleSidebar, setCommandPaletteOpen, toggleFocusMode, focusMode, setFocusMode } = useAppStore()
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useCallback(() => {
    // We need a state for this, but it's managed by the component using it
    return [false, (_: boolean) => {}] as const
  }, [])()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMeta = e.metaKey || e.ctrlKey

    // Don't trigger shortcuts when typing in input/textarea
    const target = e.target as HTMLElement
    const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

    // Escape to exit focus mode
    if (e.key === 'Escape' && focusMode) {
      e.preventDefault()
      setFocusMode(false)
      return
    }

    // F11 to toggle focus mode (only when not in input)
    if (e.key === 'F11' && !isInputFocused) {
      e.preventDefault()
      toggleFocusMode()
      return
    }

    // ? to show shortcuts help (only when not in input)
    if (e.key === '?' && !isMeta && !isInputFocused) {
      e.preventDefault()
      // Dispatch a custom event that the settings page can listen to
      window.dispatchEvent(new CustomEvent('lifeos:show-shortcuts'))
      return
    }

    // Cmd/Ctrl + K: Command palette
    if (isMeta && e.key === 'k') {
      e.preventDefault()
      setCommandPaletteOpen(true)
      return
    }

    // Cmd/Ctrl + \: Toggle sidebar
    if (isMeta && e.key === '\\') {
      e.preventDefault()
      toggleSidebar()
      return
    }

    // Cmd/Ctrl + 1-9: Switch modules (only when not in input)
    if (isMeta && !isInputFocused) {
      const num = parseInt(e.key)
      if (num >= 1 && num <= 9) {
        e.preventDefault()
        const shortcut = moduleShortcuts.find(s => s.key === e.key)
        if (shortcut) {
          setActiveModule(shortcut.moduleId)
        }
        return
      }
    }
  }, [setActiveModule, toggleSidebar, setCommandPaletteOpen, toggleFocusMode, focusMode, setFocusMode])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

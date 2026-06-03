'use client'

import { useEffect } from 'react'
import { useAppStore, type ModuleId } from '@/stores/app-store'
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
  Plus,
  Search,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

const modules: { id: ModuleId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'habits', label: 'Habits', icon: Repeat },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'learning', label: 'Learning', icon: GraduationCap },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'time', label: 'Time Tracker', icon: Timer },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const quickActions = [
  { label: 'New Task', icon: Plus, module: 'tasks' as ModuleId, description: 'Create a new task' },
  { label: 'New Note', icon: Plus, module: 'notes' as ModuleId, description: 'Create a new note' },
  { label: 'New Journal Entry', icon: Plus, module: 'journal' as ModuleId, description: 'Write in your journal' },
  { label: 'Add Transaction', icon: Plus, module: 'finance' as ModuleId, description: 'Record a transaction' },
  { label: 'Check Habits', icon: Repeat, module: 'habits' as ModuleId, description: 'Mark today\'s habits' },
]

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setActiveModule } = useAppStore()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [commandPaletteOpen, setCommandPaletteOpen])

  const runCommand = (command: () => void) => {
    setCommandPaletteOpen(false)
    command()
  }

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick Actions">
          {quickActions.map((action) => (
            <CommandItem
              key={action.label}
              onSelect={() => runCommand(() => setActiveModule(action.module))}
            >
              <action.icon className="mr-2 h-4 w-4" />
              <span>{action.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{action.description}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigation">
          {modules.map((mod) => (
            <CommandItem
              key={mod.id}
              onSelect={() => runCommand(() => setActiveModule(mod.id))}
            >
              <mod.icon className="mr-2 h-4 w-4" />
              <span>{mod.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

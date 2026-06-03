import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/stores/app-store'

describe('App Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useAppStore.getState()
    // Reset to defaults
    store.setActiveModule('dashboard')
    store.setSidebarCollapsed(false)
    store.setFocusMode(false)
    store.setSetupComplete(false)
  })

  it('should have correct default values', () => {
    const state = useAppStore.getState()
    expect(state.activeModule).toBe('dashboard')
    expect(state.sidebarCollapsed).toBe(false)
    expect(state.focusMode).toBe(false)
    expect(state.setupComplete).toBe(false)
    expect(state.language).toBe('en')
    expect(state.theme).toBe('dark')
    expect(state.uiDensity).toBe('comfortable')
    expect(state.animationsEnabled).toBe(true)
  })

  it('should update active module', () => {
    const { setActiveModule } = useAppStore.getState()
    setActiveModule('tasks')
    expect(useAppStore.getState().activeModule).toBe('tasks')
  })

  it('should toggle sidebar', () => {
    const { toggleSidebar } = useAppStore.getState()
    const initialState = useAppStore.getState().sidebarCollapsed
    toggleSidebar()
    expect(useAppStore.getState().sidebarCollapsed).toBe(!initialState)
    toggleSidebar()
    expect(useAppStore.getState().sidebarCollapsed).toBe(initialState)
  })

  it('should set sidebar collapsed state', () => {
    const { setSidebarCollapsed } = useAppStore.getState()
    setSidebarCollapsed(true)
    expect(useAppStore.getState().sidebarCollapsed).toBe(true)
    setSidebarCollapsed(false)
    expect(useAppStore.getState().sidebarCollapsed).toBe(false)
  })

  it('should toggle focus mode', () => {
    const { toggleFocusMode } = useAppStore.getState()
    expect(useAppStore.getState().focusMode).toBe(false)
    toggleFocusMode()
    expect(useAppStore.getState().focusMode).toBe(true)
    toggleFocusMode()
    expect(useAppStore.getState().focusMode).toBe(false)
  })

  it('should set focus mode', () => {
    const { setFocusMode } = useAppStore.getState()
    setFocusMode(true)
    expect(useAppStore.getState().focusMode).toBe(true)
    setFocusMode(false)
    expect(useAppStore.getState().focusMode).toBe(false)
  })

  it('should update setup completion status', () => {
    const { setSetupComplete } = useAppStore.getState()
    setSetupComplete(true)
    expect(useAppStore.getState().setupComplete).toBe(true)
  })

  it('should update language', () => {
    const { setLanguage } = useAppStore.getState()
    setLanguage('tr')
    expect(useAppStore.getState().language).toBe('tr')
  })

  it('should update theme', () => {
    const { setTheme } = useAppStore.getState()
    setTheme('light')
    expect(useAppStore.getState().theme).toBe('light')
  })

  it('should update UI density', () => {
    const { setUiDensity } = useAppStore.getState()
    setUiDensity('compact')
    expect(useAppStore.getState().uiDensity).toBe('compact')
  })

  it('should toggle animations', () => {
    const { setAnimationsEnabled } = useAppStore.getState()
    setAnimationsEnabled(false)
    expect(useAppStore.getState().animationsEnabled).toBe(false)
  })

  it('should update accent color', () => {
    const { setAccentColor } = useAppStore.getState()
    setAccentColor('blue')
    expect(useAppStore.getState().accentColor).toBe('blue')
  })

  it('should update dashboard widgets', () => {
    const { setDashboardWidgets } = useAppStore.getState()
    const newWidgets = ['widget1', 'widget2']
    setDashboardWidgets(newWidgets)
    expect(useAppStore.getState().dashboardWidgets).toEqual(newWidgets)
  })

  it('should update enabled modules', () => {
    const { setEnabledModules } = useAppStore.getState()
    const newModules = ['dashboard', 'tasks', 'notes'] as any
    setEnabledModules(newModules)
    expect(useAppStore.getState().enabledModules).toEqual(newModules)
  })

  it('should control command palette', () => {
    const { setCommandPaletteOpen } = useAppStore.getState()
    setCommandPaletteOpen(true)
    expect(useAppStore.getState().commandPaletteOpen).toBe(true)
    setCommandPaletteOpen(false)
    expect(useAppStore.getState().commandPaletteOpen).toBe(false)
  })

  it('should control mobile sidebar', () => {
    const { setMobileSidebarOpen } = useAppStore.getState()
    setMobileSidebarOpen(true)
    expect(useAppStore.getState().mobileSidebarOpen).toBe(true)
  })

  it('should control global search', () => {
    const { setGlobalSearchOpen, setGlobalSearchQuery } = useAppStore.getState()
    setGlobalSearchQuery('test query')
    expect(useAppStore.getState().globalSearchQuery).toBe('test query')
    setGlobalSearchOpen(true)
    expect(useAppStore.getState().globalSearchOpen).toBe(true)
  })
})

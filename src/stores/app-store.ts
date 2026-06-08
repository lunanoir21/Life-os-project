import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ModuleId = 
  | 'dashboard'
  | 'tasks'
  | 'notes'
  | 'habits'
  | 'journal'
  | 'finance'
  | 'goals'
  | 'learning'
  | 'calendar'
  | 'time'
  | 'settings'

interface AppState {
  // Navigation
  activeModule: ModuleId
  setActiveModule: (module: ModuleId) => void
  
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // Command palette
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  
  // Focus mode (distraction-free)
  focusMode: boolean
  toggleFocusMode: () => void
  setFocusMode: (on: boolean) => void
  
  // Setup
  welcomeSeen: boolean
  setWelcomeSeen: (seen: boolean) => void
  setupComplete: boolean
  setSetupComplete: (complete: boolean) => void
  showSetupWizard: boolean
  setShowSetupWizard: (show: boolean) => void
  
  // Mobile
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean) => void
  
  // Search
  globalSearchQuery: string
  setGlobalSearchQuery: (query: string) => void
  globalSearchOpen: boolean
  setGlobalSearchOpen: (open: boolean) => void
  
  // User preferences (from setup wizard)
  language: string
  setLanguage: (language: string) => void
  accentColor: string
  setAccentColor: (color: string) => void
  fontSize: string
  setFontSize: (size: string) => void
  theme: string
  setTheme: (theme: string) => void
  dashboardWidgets: string[]
  setDashboardWidgets: (widgets: string[]) => void

  // Appearance preferences
  uiDensity: 'compact' | 'comfortable' | 'spacious'
  setUiDensity: (density: 'compact' | 'comfortable' | 'spacious') => void
  animationsEnabled: boolean
  setAnimationsEnabled: (enabled: boolean) => void
  themeVariant: string
  setThemeVariant: (variant: string) => void
  customAccentColor: string
  setCustomAccentColor: (color: string) => void

  // Finance preferences
  baseCurrency: string
  setBaseCurrency: (code: string) => void
  currencyConverterEnabled: boolean
  setCurrencyConverterEnabled: (enabled: boolean) => void

  // Enabled modules (from setup wizard)
  enabledModules: ModuleId[]
  setEnabledModules: (modules: ModuleId[]) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeModule: 'dashboard',
      setActiveModule: (module) => set({ activeModule: module }),
      
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      
      focusMode: false,
      toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
      setFocusMode: (on) => set({ focusMode: on }),
      
      welcomeSeen: false,
      setWelcomeSeen: (seen) => set({ welcomeSeen: seen }),
      setupComplete: false,
      setSetupComplete: (complete) => set({ setupComplete: complete }),
      showSetupWizard: false,
      setShowSetupWizard: (show) => set({ showSetupWizard: show }),
      
      mobileSidebarOpen: false,
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
      
      globalSearchQuery: '',
      setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),
      globalSearchOpen: false,
      setGlobalSearchOpen: (open) => set({ globalSearchOpen: open }),
      
      // User preferences
      language: 'en',
      setLanguage: (language) => set({ language }),
      accentColor: 'emerald',
      setAccentColor: (color) => set({ accentColor: color }),
      fontSize: 'medium',
      setFontSize: (size) => set({ fontSize: size }),
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      dashboardWidgets: ['day-progress', 'stats-cards', 'today-tasks', 'weekly-activity', 'quick-capture', 'progress-ring', 'upcoming-events', 'mood-logger', 'journal-prompts', 'onboarding-tips', 'daily-planner'],
      setDashboardWidgets: (widgets) => set({ dashboardWidgets: widgets }),

      // Appearance preferences
      uiDensity: 'comfortable' as const,
      setUiDensity: (density) => set({ uiDensity: density }),
      animationsEnabled: true,
      setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
      themeVariant: 'black',
      setThemeVariant: (variant) => set({ themeVariant: variant }),
      customAccentColor: '#10b981',
      setCustomAccentColor: (color) => set({ customAccentColor: color }),

      baseCurrency: 'USD',
      setBaseCurrency: (code) => set({ baseCurrency: code.toUpperCase() }),
      currencyConverterEnabled: process.env.NEXT_PUBLIC_ENABLE_CURRENCY_CONVERTER !== 'false',
      setCurrencyConverterEnabled: (enabled) => set({ currencyConverterEnabled: enabled }),

      enabledModules: ['dashboard', 'tasks', 'notes', 'habits', 'journal', 'finance', 'goals', 'learning', 'calendar', 'time', 'settings'],
      setEnabledModules: (modules) => set({ enabledModules: modules }),
    }),
    {
      name: 'lifeos-app-store',
      partialize: (state) => ({
        activeModule: state.activeModule,
        sidebarCollapsed: state.sidebarCollapsed,
        welcomeSeen: state.welcomeSeen,
        setupComplete: state.setupComplete,
        focusMode: state.focusMode,
        language: state.language,
        accentColor: state.accentColor,
        fontSize: state.fontSize,
        theme: state.theme,
        dashboardWidgets: state.dashboardWidgets,
        uiDensity: state.uiDensity,
        animationsEnabled: state.animationsEnabled,
        themeVariant: state.themeVariant,
        customAccentColor: state.customAccentColor,
        baseCurrency: state.baseCurrency,
        currencyConverterEnabled: state.currencyConverterEnabled,
        enabledModules: state.enabledModules,
      }),
    }
  )
)

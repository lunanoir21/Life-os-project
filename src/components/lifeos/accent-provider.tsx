'use client'

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/stores/app-store'

const accentColorMap: Record<string, Record<string, string>> = {
  emerald: {
    '--accent-primary': '#10b981',
    '--accent-primary-light': '#34d399',
    '--accent-primary-dark': '#059669',
    '--accent-primary-foreground': '#ffffff',
    '--accent-primary-50': '#ecfdf5',
    '--accent-primary-100': '#d1fae5',
    '--accent-primary-900': '#022c22',
    '--accent-primary-950': '#011e17',
  },
  teal: {
    '--accent-primary': '#14b8a6',
    '--accent-primary-light': '#2dd4bf',
    '--accent-primary-dark': '#0d9488',
    '--accent-primary-foreground': '#ffffff',
    '--accent-primary-50': '#f0fdfa',
    '--accent-primary-100': '#ccfbf1',
    '--accent-primary-900': '#022c22',
    '--accent-primary-950': '#011e17',
  },
  amber: {
    '--accent-primary': '#f59e0b',
    '--accent-primary-light': '#fbbf24',
    '--accent-primary-dark': '#d97706',
    '--accent-primary-foreground': '#ffffff',
    '--accent-primary-50': '#fffbeb',
    '--accent-primary-100': '#fef3c7',
    '--accent-primary-900': '#451a03',
    '--accent-primary-950': '#2c1006',
  },
  rose: {
    '--accent-primary': '#f43f5e',
    '--accent-primary-light': '#fb7185',
    '--accent-primary-dark': '#e11d48',
    '--accent-primary-foreground': '#ffffff',
    '--accent-primary-50': '#fff1f2',
    '--accent-primary-100': '#ffe4e6',
    '--accent-primary-900': '#4c0519',
    '--accent-primary-950': '#2c0412',
  },
  violet: {
    '--accent-primary': '#8b5cf6',
    '--accent-primary-light': '#a78bfa',
    '--accent-primary-dark': '#7c3aed',
    '--accent-primary-foreground': '#ffffff',
    '--accent-primary-50': '#f5f3ff',
    '--accent-primary-100': '#ede9fe',
    '--accent-primary-900': '#2e1065',
    '--accent-primary-950': '#1a0940',
  },
  cyan: {
    '--accent-primary': '#06b6d4',
    '--accent-primary-light': '#22d3ee',
    '--accent-primary-dark': '#0891b2',
    '--accent-primary-foreground': '#ffffff',
    '--accent-primary-50': '#ecfeff',
    '--accent-primary-100': '#cffafe',
    '--accent-primary-900': '#083344',
    '--accent-primary-950': '#042f2e',
  },
  indigo: {
    '--accent-primary': '#6366f1',
    '--accent-primary-light': '#818cf8',
    '--accent-primary-dark': '#4f46e5',
    '--accent-primary-foreground': '#ffffff',
    '--accent-primary-50': '#eef2ff',
    '--accent-primary-100': '#e0e7ff',
    '--accent-primary-900': '#312e81',
    '--accent-primary-950': '#1e1b4b',
  },
  pink: {
    '--accent-primary': '#ec4899',
    '--accent-primary-light': '#f472b6',
    '--accent-primary-dark': '#db2777',
    '--accent-primary-foreground': '#ffffff',
    '--accent-primary-50': '#fdf2f8',
    '--accent-primary-100': '#fce7f3',
    '--accent-primary-900': '#500724',
    '--accent-primary-950': '#2e0519',
  },
  lime: {
    '--accent-primary': '#84cc16',
    '--accent-primary-light': '#a3e635',
    '--accent-primary-dark': '#65a30d',
    '--accent-primary-foreground': '#ffffff',
    '--accent-primary-50': '#f7fee7',
    '--accent-primary-100': '#ecfccb',
    '--accent-primary-900': '#1a2e05',
    '--accent-primary-950': '#0f1e02',
  },
  sky: {
    '--accent-primary': '#0ea5e9',
    '--accent-primary-light': '#38bdf8',
    '--accent-primary-dark': '#0284c7',
    '--accent-primary-foreground': '#ffffff',
    '--accent-primary-50': '#f0f9ff',
    '--accent-primary-100': '#e0f2fe',
    '--accent-primary-900': '#0c4a6e',
    '--accent-primary-950': '#082f49',
  },
}

// Helper to parse hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '')
  const num = parseInt(cleaned, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

// Helper to convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return '#' + [clamp(r), clamp(g), clamp(b)]
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')
}

// Mix a color with another color by a given percentage
function mixColors(base: { r: number; g: number; b: number }, mixer: { r: number; g: number; b: number }, mixPercent: number): { r: number; g: number; b: number } {
  return {
    r: Math.round(base.r * (1 - mixPercent) + mixer.r * mixPercent),
    g: Math.round(base.g * (1 - mixPercent) + mixer.g * mixPercent),
    b: Math.round(base.b * (1 - mixPercent) + mixer.b * mixPercent),
  }
}

// Lighten a hex color by a percentage
function lighten(hex: string, percent: number): string {
  const rgb = hexToRgb(hex)
  const white = { r: 255, g: 255, b: 255 }
  const mixed = mixColors(rgb, white, percent / 100)
  return rgbToHex(mixed.r, mixed.g, mixed.b)
}

// Darken a hex color by a percentage
function darken(hex: string, percent: number): string {
  const rgb = hexToRgb(hex)
  const black = { r: 0, g: 0, b: 0 }
  const mixed = mixColors(rgb, black, percent / 100)
  return rgbToHex(mixed.r, mixed.g, mixed.b)
}

// Derive all 9 accent CSS variables from a custom hex color
function deriveCustomAccentColors(hex: string): Record<string, string> {
  return {
    '--accent-primary': hex,
    '--accent-primary-light': lighten(hex, 15),
    '--accent-primary-dark': darken(hex, 15),
    '--accent-primary-foreground': '#ffffff',
    '--accent-primary-50': lighten(hex, 95),
    '--accent-primary-100': lighten(hex, 90),
    '--accent-primary-900': darken(hex, 90),
    '--accent-primary-950': darken(hex, 95),
  }
}

const fontSizeMap: Record<string, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
}

const densityConfig: Record<string, {
  spacing: string
  radius: string
  cardPadding: string
  sectionGap: string
  listGap: string
}> = {
  compact: {
    spacing: '0.5',
    radius: '0.375rem',
    cardPadding: '0.75rem',
    sectionGap: '0.75rem',
    listGap: '0.5rem',
  },
  comfortable: {
    spacing: '1',
    radius: '0.625rem',
    cardPadding: '1.25rem',
    sectionGap: '1.25rem',
    listGap: '0.75rem',
  },
  spacious: {
    spacing: '1.5',
    radius: '0.75rem',
    cardPadding: '1.5rem',
    sectionGap: '1.75rem',
    listGap: '1rem',
  },
}

export function AccentProvider({ children }: { children: React.ReactNode }) {
  const accentColor = useAppStore((s) => s.accentColor)
  const customAccentColor = useAppStore((s) => s.customAccentColor)
  const fontSize = useAppStore((s) => s.fontSize)
  const uiDensity = useAppStore((s) => s.uiDensity)
  const themeVariant = useAppStore((s) => s.themeVariant)
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Helper to trigger theme transition
  const triggerTransition = () => {
    const root = document.documentElement
    root.classList.add('theme-transitioning')
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current)
    }
    transitionTimerRef.current = setTimeout(() => {
      root.classList.remove('theme-transitioning')
    }, 500)
  }

  // Apply accent color CSS variables
  useEffect(() => {
    const root = document.documentElement
    let colors: Record<string, string>

    if (accentColor === 'custom' && customAccentColor) {
      colors = deriveCustomAccentColors(customAccentColor)
    } else {
      colors = accentColorMap[accentColor] ?? accentColorMap.emerald
    }

    for (const [key, value] of Object.entries(colors)) {
      root.style.setProperty(key, value)
    }

    triggerTransition()

    return () => {
      for (const key of Object.keys(colors)) {
        root.style.removeProperty(key)
      }
    }
  }, [accentColor, customAccentColor])

  // Apply font size via CSS custom property and root font-size
  useEffect(() => {
    const root = document.documentElement
    const size = fontSizeMap[fontSize] ?? fontSizeMap.medium
    root.style.setProperty('--lifeos-font-size', size)
    root.style.fontSize = size

    return () => {
      root.style.removeProperty('--lifeos-font-size')
      root.style.fontSize = ''
    }
  }, [fontSize])

  // Apply UI density via CSS custom properties + data attribute
  useEffect(() => {
    const root = document.documentElement
    const density = densityConfig[uiDensity] ?? densityConfig.comfortable

    root.setAttribute('data-density', uiDensity)
    root.style.setProperty('--lifeos-spacing', density.spacing)
    root.style.setProperty('--radius', density.radius)
    root.style.setProperty('--lifeos-card-padding', density.cardPadding)
    root.style.setProperty('--lifeos-section-gap', density.sectionGap)
    root.style.setProperty('--lifeos-list-gap', density.listGap)

    return () => {
      root.removeAttribute('data-density')
      root.style.removeProperty('--lifeos-spacing')
      root.style.removeProperty('--lifeos-card-padding')
      root.style.removeProperty('--lifeos-section-gap')
      root.style.removeProperty('--lifeos-list-gap')
    }
  }, [uiDensity])

  // Apply theme variant (warm, cool, midnight, forest, sunset, lavender, nord)
  useEffect(() => {
    const root = document.documentElement
    if (themeVariant && themeVariant !== 'default') {
      root.setAttribute('data-theme-variant', themeVariant)
    } else {
      root.removeAttribute('data-theme-variant')
    }

    triggerTransition()

    return () => {
      root.removeAttribute('data-theme-variant')
    }
  }, [themeVariant])

  return <>{children}</>
}

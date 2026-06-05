'use client'

import { useAppStore } from '@/stores/app-store'
import en from './translations/en'
import tr from './translations/tr'
import es from './translations/es'
import de from './translations/de'
import fr from './translations/fr'
import type { TranslationKeys } from './translations/en'

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends string | readonly string[]
        ? K
        : T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : never
    }[keyof T & string]
  : never

export type TranslationKey = NestedKeyOf<TranslationKeys>

const translations: Record<string, TranslationKeys> = {
  en,
  tr,
  es,
  de,
  fr,
}

// Available languages for the UI
export const availableLanguages = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe', flag: '🇹🇷' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷' },
] as const

export type LanguageCode = 'en' | 'tr' | 'es' | 'de' | 'fr'

// Get a nested value from an object using a dot-separated path
function getNestedValue(obj: Record<string, unknown>, path: string): string | readonly string[] {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return path // fallback to key
    }
    current = (current as Record<string, unknown>)[key]
  }
  return (current as string | readonly string[]) || path
}

// Hook to get the translation function
export function useTranslation() {
  const language = useAppStore((s) => s.language)
  const t = translations[language] || translations.en

  // Resolve a key against the active language, with a fallback to English so
  // partial translations don't surface raw key paths in the UI.
  const resolve = (key: string): string | readonly string[] => {
    const primary = getNestedValue(t as unknown as Record<string, unknown>, key)
    if (primary !== key) return primary
    if (t === translations.en) return key
    return getNestedValue(translations.en as unknown as Record<string, unknown>, key)
  }

  // Translation function that supports dot notation like 'nav.dashboard'
  const tFn = (key: string, params?: Record<string, string | number>): string => {
    const value = resolve(key)

    if (typeof value === 'string') {
      if (!params) return value

      // Replace {param} placeholders
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
        value
      )
    }

    return String(value)
  }

  // Get an array value (for motivational subtitles etc.)
  const tArray = (key: string): readonly string[] => {
    const value = resolve(key)
    if (Array.isArray(value)) return value
    return [String(value)]
  }

  return { t: tFn, tArray, language, translations: t }
}

// Simple helper for non-hook usage
export function getTranslation(language: string) {
  const t = translations[language] || translations.en
  return t
}

export { en, tr, es, de, fr }
export type { TranslationKeys }

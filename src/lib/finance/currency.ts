/**
 * Currency helpers — symbols, formatting, and live exchange rates.
 *
 * Rates come from Frankfurter (https://www.frankfurter.app), which exposes
 * the European Central Bank reference rates. It is free, key-less, and
 * CORS-friendly. Rates are published once per business day, so we cache
 * aggressively to keep the UI snappy and to be kind to the upstream API.
 */

import { useQuery } from '@tanstack/react-query'

// ─── Catalog ──────────────────────────────────────────────────────────

/**
 * Curated list of currencies surfaced in the UI. Order matters — the first
 * entry is the default selection in pickers when the user has not chosen
 * a base currency yet.
 */
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$',  name: 'US Dollar' },
  { code: 'EUR', symbol: '€',  name: 'Euro' },
  { code: 'GBP', symbol: '£',  name: 'British Pound' },
  { code: 'TRY', symbol: '₺',  name: 'Turkish Lira' },
  { code: 'JPY', symbol: '¥',  name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CNY', symbol: '¥',  name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹',  name: 'Indian Rupee' },
] as const

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code']

const SYMBOL_BY_CODE: Record<string, string> = Object.fromEntries(
  SUPPORTED_CURRENCIES.map(c => [c.code, c.symbol]),
)

/** Get a single-character (or short prefix) symbol for a code, with USD fallback. */
export function symbolFor(code: string | null | undefined): string {
  if (!code) return '$'
  return SYMBOL_BY_CODE[code.toUpperCase()] ?? code.toUpperCase()
}

/**
 * Format an amount with the symbol of the given currency. JPY is fixed to
 * zero fraction digits because it has no commonly-used minor unit.
 */
export function formatCurrency(amount: number, code: string | null | undefined): string {
  const safe = Number.isFinite(amount) ? amount : 0
  const upper = (code || 'USD').toUpperCase()
  const fractionDigits = upper === 'JPY' ? 0 : 2
  const sym = symbolFor(upper)
  const sign = safe < 0 ? '-' : ''
  const abs = Math.abs(safe)
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
  return `${sign}${sym}${formatted}`
}

// ─── Exchange rates ───────────────────────────────────────────────────

export type ExchangeRates = {
  /** Base currency the rates are quoted against (e.g. "USD"). */
  base: string
  /** Date the rates were published by the ECB (yyyy-mm-dd). */
  date: string
  /** Rates table — multiply a base-currency amount by `rates[target]` to convert. */
  rates: Record<string, number>
}

const FRANKFURTER = 'https://api.frankfurter.app'

async function fetchRates(base: string): Promise<ExchangeRates> {
  const upper = base.toUpperCase()
  const url = `${FRANKFURTER}/latest?from=${encodeURIComponent(upper)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Failed to load exchange rates: ${res.status}`)
  const json = (await res.json()) as { amount: number; base: string; date: string; rates: Record<string, number> }
  return {
    base: json.base,
    date: json.date,
    // Frankfurter omits the base from `rates`; add it as 1 for convenient lookups.
    rates: { [json.base]: 1, ...json.rates },
  }
}

/**
 * Live exchange rates for `base`. Cached for 1 hour because Frankfurter
 * publishes once per business day and we don't want to hammer the API on
 * every render.
 */
export function useExchangeRates(base: string = 'USD') {
  return useQuery<ExchangeRates>({
    queryKey: ['exchange-rates', base.toUpperCase()],
    queryFn: () => fetchRates(base),
    staleTime: 60 * 60 * 1000, // 1h — rates change at most daily
    gcTime: 24 * 60 * 60 * 1000, // 24h — keep around for offline reads
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

/**
 * Convert `amount` from `from` to `to` using a fetched rate table.
 * The table is keyed off whatever base the user requested; we pivot
 * through it so the caller doesn't have to keep multiple tables.
 *
 * Returns `null` if either currency is missing from the table so the UI
 * can show "—" instead of a wrong number.
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  rates: ExchangeRates | undefined,
): number | null {
  if (!rates) return null
  const a = rates.rates[from.toUpperCase()]
  const b = rates.rates[to.toUpperCase()]
  if (!a || !b) return null
  // amount in base = amount / a, then to target = (amount / a) * b
  return (amount / a) * b
}

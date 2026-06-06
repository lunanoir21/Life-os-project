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

// ─── Historical timeseries (for sparklines and day-over-day deltas) ──

export type RateHistory = {
  /** ISO start date of the window the data covers. */
  start: string
  /** ISO end date. */
  end: string
  /** From → To pair quoted in the response. */
  from: string
  to: string
  /** Sorted ascending: [{ date: 'yyyy-mm-dd', rate: number }, …] */
  points: { date: string; rate: number }[]
}

async function fetchHistory(from: string, to: string, days: number): Promise<RateHistory> {
  // Frankfurter timeseries endpoint: /<start>..<end>?from=X&to=Y
  // Use UTC dates to avoid off-by-one when the user's clock crosses midnight.
  const end = new Date()
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - Math.max(1, days))
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const url = `${FRANKFURTER}/${iso(start)}..${iso(end)}?from=${encodeURIComponent(from.toUpperCase())}&to=${encodeURIComponent(to.toUpperCase())}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Failed to load rate history: ${res.status}`)
  const json = (await res.json()) as { base: string; start_date: string; end_date: string; rates: Record<string, Record<string, number>> }
  const upperTo = to.toUpperCase()
  const points = Object.entries(json.rates)
    .map(([date, table]) => ({ date, rate: table[upperTo] }))
    .filter(p => typeof p.rate === 'number')
    .sort((a, b) => a.date.localeCompare(b.date))
  return {
    start: json.start_date,
    end: json.end_date,
    from: json.base,
    to: upperTo,
    points,
  }
}

/**
 * Historical daily rates between two currencies. Used to draw sparkline
 * trends and to compute the most-recent day-over-day delta badge. Cached
 * for an hour because Frankfurter only updates once per business day and
 * historical points are immutable.
 */
export function useExchangeRateHistory(from: string, to: string, days: number = 7) {
  return useQuery<RateHistory>({
    queryKey: ['exchange-rate-history', from.toUpperCase(), to.toUpperCase(), days],
    queryFn: () => fetchHistory(from, to, days),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: from.toUpperCase() !== to.toUpperCase(),
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

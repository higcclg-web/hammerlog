import type { Unit } from './types'

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)

export const KG_PER_LB = 0.45359237

export function toKg(value: number, unit: Unit): number {
  return unit === 'lb' ? value * KG_PER_LB : value
}

export function fromKg(kg: number, unit: Unit): number {
  return unit === 'lb' ? kg / KG_PER_LB : kg
}

/** Display weight in the user's unit, rounded to at most 1 decimal. */
export function displayWeight(kg: number, unit: Unit): string {
  const v = fromKg(kg, unit)
  const rounded = Math.round(v * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export const fmtInt = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n))

export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, delta: number): string {
  const d = parseKey(key)
  d.setDate(d.getDate() + delta)
  return dateKey(d)
}

export function fmtDay(key: string): string {
  const today = dateKey()
  if (key === today) return 'Today'
  if (key === addDays(today, -1)) return 'Yesterday'
  if (key === addDays(today, 1)) return 'Tomorrow'
  return parseKey(key).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function fmtShortDate(key: string): string {
  const d = parseKey(key)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function fmtDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function fmtClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Monday of the week containing the given date. */
export function weekStart(d: Date): Date {
  const out = new Date(d)
  const day = (out.getDay() + 6) % 7 // Mon=0
  out.setDate(out.getDate() - day)
  out.setHours(0, 0, 0, 0)
  return out
}

/** Epley estimated one-rep max. */
export function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0
  if (reps === 1) return weightKg
  return weightKg * (1 + reps / 30)
}

export function parseNum(s: string): number {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

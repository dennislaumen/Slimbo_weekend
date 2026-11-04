import type { Activity, Chore } from './types'

const DAY_MS = 86_400_000
const QUARTER_MS = 15 * 60_000

export const startOfDay = (ms: number) => {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export const fmtTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })

const dayDiff = (ms: number, now: number) => Math.round((startOfDay(ms) - startOfDay(now)) / DAY_MS)

/** "Vandaag", "Morgen", "Gisteren" or a short weekday. */
export function dayLabel(ms: number, now: number): string {
  const diff = dayDiff(ms, now)
  if (diff === 0) return 'Vandaag'
  if (diff === 1) return 'Morgen'
  if (diff === -1) return 'Gisteren'
  return new Date(ms).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric' })
}

/** Section heading in the planning, e.g. "Vandaag · Vrijdag 15 januari". */
export function dayHeader(ms: number, now: number): string {
  const diff = dayDiff(ms, now)
  const base = new Date(ms).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
  const prefix = diff === 0 ? 'Vandaag · ' : diff === 1 ? 'Morgen · ' : ''
  return prefix + base.charAt(0).toUpperCase() + base.slice(1)
}

export const roundedNow = (now: number) => Math.ceil(now / QUARTER_MS) * QUARTER_MS

export const endAt = (a: Activity) => (a.startAt || 0) + (a.durationMin || 60) * 60_000

/** Planned or running, as opposed to finished or cancelled. */
export const isOpen = (a: Activity) => a.status === 'GEPLAND' || a.status === 'GESTART' || !a.status

export const isPlanned = (a: Activity) => a.status === 'GEPLAND' || !a.status

export const isRunning = (a: Activity, now: number) =>
  a.status === 'GESTART' || (isPlanned(a) && now >= a.startAt && now < endAt(a))

export const choreTimes = (c: Chore): string => {
  if (c.startAt && c.endAt && c.endAt > c.startAt) return `${fmtTime(c.startAt)}–${fmtTime(c.endAt)}`
  const bySlot: Record<string, string> = { ochtend: 'tot 13:00', middag: '13:00–18:00', avond: 'vanaf 18:00' }
  return bySlot[c.slot] ?? ''
}

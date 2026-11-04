import { useEffect, useRef, useState } from 'react'
import { KEYS, store } from '../data/storage'
import { dayLabel, fmtTime, isPlanned } from '../domain/time'
import type { Activity, GameTable, Place } from '../domain/types'
import { useToast } from './toast'

async function systemNotification(title: string, body: string, tag: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(title, { body, tag, icon: 'icon-192.png', badge: 'icon-192.png' })
    else new Notification(title, { body, tag, icon: 'icon-192.png' })
  } catch {
    /* notifications are best effort */
  }
}

function readReminded(): string[] {
  try {
    const v: unknown = JSON.parse(store.get(KEYS.reminded) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export const whereText = (a: Activity, tables: GameTable[], places: Place[]) => {
  const t = tables.find((x) => x.id === a.tableId)
  const p = places.find((x) => x.id === (t?.placeId || a.placeId))
  return [t?.name, p?.name].filter(Boolean).join(' · ')
}

interface Input {
  activities: Activity[]
  tables: GameTable[]
  places: Place[]
  uid: string
  now: number
  nameOf: (id: string) => string
}

/** Toast and system notifications: 15 minutes before an activity, and when someone else cancels or moves one. */
export function useReminders({ activities, tables, places, uid, now, nameOf }: Input) {
  const toast = useToast()
  const previous = useRef<Map<string, Activity> | null>(null)
  const [reminded] = useState(() => new Set<string>(readReminded()))

  const notify = (title: string, body: string, tag: string) => {
    toast(`${title} — ${body}`)
    void systemNotification(title, body, tag)
  }

  useEffect(() => {
    const prev = previous.current
    if (prev) {
      for (const a of activities) {
        const p = prev.get(a.id)
        const byOther = a.updatedBy && a.updatedBy !== uid
        if (p && byOther && p.status !== a.status && a.status === 'GEANNULEERD')
          notify(`Geannuleerd: ${a.title}`, `${nameOf(a.updatedBy ?? '')} heeft het afgeblazen.`, a.id + 'cx')
        if (p && byOther && a.status === 'GEPLAND' && p.startAt !== a.startAt) {
          notify(`Nieuwe tijd: ${a.title}`, `${dayLabel(a.startAt, now).toLowerCase()} om ${fmtTime(a.startAt)}`, a.id + 'tm')
          reminded.delete(a.id)
        }
      }
    }
    previous.current = new Map(activities.map((a) => [a.id, a]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities])

  useEffect(() => {
    for (const a of activities) {
      const until = a.startAt - now
      if (isPlanned(a) && !reminded.has(a.id) && until > -5 * 60_000 && until <= 15 * 60_000) {
        reminded.add(a.id)
        const where = whereText(a, tables, places)
        notify(`Over ${Math.max(0, Math.ceil(until / 60_000))} min: ${a.title}`, `Om ${fmtTime(a.startAt)}${where ? ' · ' + where : ''}`, a.id + 'rm')
      }
    }
    store.set(KEYS.reminded, JSON.stringify([...reminded]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, now])
}

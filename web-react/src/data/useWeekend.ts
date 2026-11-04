import { collection, doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import type { CollectionName, WeekendData } from '../domain/types'
import { db } from './firebase'

const COLLECTIONS: CollectionName[] = ['members', 'games', 'places', 'tables', 'activities', 'rooms', 'guests', 'chores']
const EMPTY: WeekendData = { event: null, members: [], games: [], places: [], tables: [], activities: [], rooms: [], guests: [], chores: [] }

export interface Weekend {
  data: WeekendData
  /** Event and members have arrived; the app can render. */
  ready: boolean
}

/** Live subscriptions for one weekend. `onLost` fires when the weekend is gone or access is denied. */
interface Snapshot {
  eventId: string | null
  data: WeekendData
  loaded: ReadonlySet<string>
}
const blank = (eventId: string | null): Snapshot => ({ eventId, data: EMPTY, loaded: new Set() })

/** Live subscriptions for one weekend. `onLost` fires when the weekend is gone or access is denied. */
export function useWeekend(eventId: string | null, onLost: (reason: 'gone' | 'denied') => void): Weekend {
  const [snap, setSnap] = useState<Snapshot>(() => blank(eventId))

  useEffect(() => {
    if (!eventId) return
    // Updates for a previous weekend are dropped; the first update for a new one starts from blank.
    const update = (key: string, patch: Partial<WeekendData>) =>
      setSnap((cur) => {
        const base = cur.eventId === eventId ? cur : blank(eventId)
        return { eventId, data: { ...base.data, ...patch }, loaded: new Set(base.loaded).add(key) }
      })
    const unsubs = [
      onSnapshot(
        doc(db, 'events', eventId),
        (d) => (d.exists() ? update('event', { event: { id: d.id, ...d.data() } }) : onLost('gone')),
        () => onLost('denied'),
      ),
      ...COLLECTIONS.map((name) =>
        onSnapshot(
          collection(db, 'events', eventId, name),
          (s) => update(name, { [name]: s.docs.map((d) => ({ id: d.id, ...d.data() })) }),
          () => onLost('denied'),
        ),
      ),
    ]
    return () => unsubs.forEach((u) => u())
    // onLost is intentionally not a dependency: resubscribing on every render would flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const cur = snap.eventId === eventId ? snap : blank(eventId)
  return { data: cur.data, ready: cur.loaded.has('event') && cur.loaded.has('members') }
}

/** localStorage that never throws (private mode, blocked storage). Keys match the legacy web app. */
export const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value == null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    } catch {
      /* ignore */
    }
  },
}

export const KEYS = {
  eventId: 'app_eventId',
  tab: 'app_tab',
  events: 'app_events',
  name: 'app_name',
  code: 'app_code',
  reminded: 'app_reminded',
  hideIos: 'app_hideIos',
} as const

export interface KnownEvent {
  id: string
  name: string
  code: string
}

export function readKnownEvents(): KnownEvent[] {
  try {
    return JSON.parse(store.get(KEYS.events) ?? '[]') as KnownEvent[]
  } catch {
    return []
  }
}

export const writeKnownEvents = (events: KnownEvent[]) => store.set(KEYS.events, JSON.stringify(events))

export function rememberEvent(e: { id: string; name?: string; joinCode?: string }) {
  writeKnownEvents([{ id: e.id, name: e.name ?? '', code: e.joinCode ?? '' }, ...readKnownEvents().filter((x) => x.id !== e.id)])
}

export const forgetEvent = (id: string) => writeKnownEvents(readKnownEvents().filter((x) => x.id !== id))

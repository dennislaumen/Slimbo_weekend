import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { createActions, type Actions } from '../data/actions'
import { displayName } from '../domain/guests'
import type { Guest, Member, WeekendData, WeekendEvent } from '../domain/types'
import { useToast } from './toast'
import { useNow } from './useNow'

export interface WeekendContextValue {
  uid: string
  data: WeekendData & { event: WeekendEvent }
  me: Member | undefined
  myGuest: Guest | undefined
  myName: string
  now: number
  actions: Actions
  /** Runs a write, shows `ok` as a toast on success and the error message on failure. */
  run: (write: () => Promise<unknown>, ok?: string) => Promise<void>
  nameOf: (id: string) => string
}

const Ctx = createContext<WeekendContextValue | null>(null)

export function useWeekendContext(): WeekendContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useWeekendContext must be used inside <WeekendProvider>')
  return v
}

export function WeekendProvider(props: { uid: string; eventId: string; data: WeekendContextValue['data']; children: ReactNode }) {
  const { uid, eventId, data, children } = props
  const toast = useToast()
  const now = useNow()
  const actions = useMemo(() => createActions(eventId, uid), [eventId, uid])
  const run = useCallback<WeekendContextValue['run']>(
    async (write, ok) => {
      try {
        await write()
        if (ok) toast(ok)
      } catch (e) {
        toast('Mislukt: ' + (e as Error).message)
      }
    },
    [toast],
  )
  const value = useMemo<WeekendContextValue>(() => {
    const me = data.members.find((m) => m.id === uid)
    return {
      uid, data, me, now, actions, run,
      myGuest: data.guests.find((g) => g.id === me?.guestId),
      myName: displayName(me, data.guests),
      nameOf: (id) => data.members.find((m) => m.id === id)?.name || 'Onbekend',
    }
  }, [uid, data, now, actions, run])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

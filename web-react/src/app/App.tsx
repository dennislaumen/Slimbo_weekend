import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react'
import { FoldProvider } from '../components/Fold'
import { forgetEvent, KEYS, rememberEvent, store } from '../data/storage'
import { isConfigured, isFake } from '../data/firebase'
import { useAuth } from '../data/useAuth'
import { useWeekend } from '../data/useWeekend'
import { GamesView } from '../features/games/GamesView'
import { LoginView } from '../features/login/LoginView'
import { MoreView } from '../features/more/MoreView'
import { NowView } from '../features/now/NowView'
import { PlanningView } from '../features/planning/PlanningView'
import type { WeekendEvent } from '../domain/types'
import { ToastProvider, useToast } from './toast'
import { usePresence } from './usePresence'
import { useReminders } from './useReminders'
import { WeekendProvider, useWeekendContext } from './weekend-context'

const TABS = [['nu', 'Nu', '🏠'], ['planning', 'Planning', '📅'], ['spellen', 'Spellen', '🎲'], ['meer', 'Meer', '☰']] as const
type TabKey = (typeof TABS)[number][0]
const VIEWS: Record<TabKey, () => ReactElement> = { nu: NowView, planning: PlanningView, spellen: GamesView, meer: MoreView }

const Message = ({ children }: { children: string }) => <main><p className="muted center">{children}</p></main>

export function App() {
  return (
    <ToastProvider>
      <FoldProvider>
        <Session />
      </FoldProvider>
    </ToastProvider>
  )
}

function Session() {
  const toast = useToast()
  const auth = useAuth()
  const [eventId, setEventId] = useState(() => store.get(KEYS.eventId))

  const select = useCallback((id: string | null) => {
    store.set(KEYS.eventId, id)
    setEventId(id)
  }, [])
  const onLost = useCallback((reason: 'gone' | 'denied') => {
    if (reason === 'gone') forgetEvent(store.get(KEYS.eventId) ?? '')
    else toast('Geen toegang tot dit weekend')
    select(null)
  }, [select, toast])
  const weekend = useWeekend(auth.uid ? eventId : null, onLost)
  const event = weekend.data.event
  const data = useMemo(() => (event ? { ...weekend.data, event } : null), [weekend.data, event])

  if (!isConfigured) return <main><div className="card">De app kan nu geen verbinding maken. Probeer het later opnieuw.</div></main>
  if (!auth.uid) return <Message>{'error' in auth && auth.error ? `Verbinden mislukt: ${auth.error}` : 'Verbinden…'}</Message>
  if (!eventId) return <LoginView uid={auth.uid} onOpen={select} />
  if (!weekend.ready || !data) return <Message>Laden…</Message>
  const isMember = weekend.data.members.some((m) => m.id === auth.uid)
  if (!isMember) return <LoginView uid={auth.uid} onOpen={select} />

  return (
    <WeekendProvider uid={auth.uid} eventId={eventId} data={data}>
      <Shell event={data.event} onLeave={() => select(null)} />
    </WeekendProvider>
  )
}

function Shell({ event, onLeave }: { event: WeekendEvent; onLeave: () => void }) {
  const { uid, data, now, actions, nameOf } = useWeekendContext()
  const [tab, setTab] = useState<TabKey>(() => {
    const saved = store.get(KEYS.tab)
    return TABS.some(([k]) => k === saved) ? (saved as TabKey) : 'nu'
  })
  useReminders({ activities: data.activities, tables: data.tables, places: data.places, uid, now, nameOf })
  usePresence(actions, !isFake) // the fake would add a write to every test's log
  useEffect(() => rememberEvent(event), [event])

  const View = VIEWS[tab]
  return (
    <>
      <header>
        <span className="logo"><img src="slimbo_logo.png" alt="Slimbo" /></span>
        <h1>{event.name}</h1>
        <button className="btn ghost" style={{ padding: '6px 10px', fontSize: 13, whiteSpace: 'nowrap' }}
          onClick={() => confirm('Ander weekend kiezen? Je kunt met dezelfde code terugkomen.') && onLeave()}>Ander weekend</button>
      </header>
      <main><View /></main>
      <nav className="tabs">
        {TABS.map(([k, label, icon]) => (
          <button key={k} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => { setTab(k); store.set(KEYS.tab, k); window.scrollTo(0, 0) }}>
            <span className="ic" aria-hidden="true">{icon}</span>{label}
          </button>
        ))}
      </nav>
    </>
  )
}

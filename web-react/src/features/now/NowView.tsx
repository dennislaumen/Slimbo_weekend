import { useState } from 'react'
import { ActivityCard } from '../../components/ActivityCard'
import { Chip } from '../../components/Chip'
import { StatusDot } from '../../components/StatusDot'
import { useWeekendContext } from '../../app/weekend-context'
import { KEYS, store } from '../../data/storage'
import { visibleMembers } from '../../domain/guests'
import { STATUS } from '../../domain/labels'
import { isPlanned, isRunning } from '../../domain/time'
import type { MemberStatus } from '../../domain/types'
import { useToast } from '../../app/toast'
import { useActivityDialogs } from '../planning/ActivityDialogs'
import { StayCard } from './StayCard'

const STATUS_KEYS = Object.keys(STATUS) as MemberStatus[]

export function NowView() {
  const { data, me, now, actions, run } = useWeekendContext()
  const toast = useToast()
  const dialogs = useActivityDialogs()
  const [note, setNote] = useState<string | null>(null)
  const [, bump] = useState(0)
  const m = me
  const running = data.activities.filter((a) => isRunning(a, now)).sort((a, b) => a.startAt - b.startAt)
  const upcoming = data.activities.filter((a) => isPlanned(a) && a.startAt > now).sort((a, b) => a.startAt - b.startAt).slice(0, 6)
  const people = visibleMembers(data.members)
  const noteValue = note ?? m?.statusNote ?? ''
  const askNotifications = 'Notification' in window && Notification.permission === 'default'
  const showIosHint = /iPhone|iPad/.test(navigator.userAgent) && (navigator as { standalone?: boolean }).standalone !== true && !store.get(KEYS.hideIos)

  return (
    <>
      {showIosHint && (
        <div className="card">
          <div className="small"><b>Tip:</b> tik in Safari op <b>Deel</b> ⬆️ → <b>Zet op beginscherm</b>. Dan werkt dit als een echte app, met meldingen.</div>
          <button className="btn text small" onClick={() => { store.set(KEYS.hideIos, '1'); bump((n) => n + 1) }}>Verbergen</button>
        </div>
      )}
      <div className="card">
        <div className="title">{`Hoi ${m?.name ?? ''}, hoe sta je ervoor?`}</div>
        <div className="row" style={{ margin: '10px 0 6px' }}>
          {STATUS_KEYS.map((k) => (
            <Chip key={k} on={m?.status === k} onClick={() => void run(() => actions.setStatus(k, noteValue || m?.statusNote))}>
              <StatusDot status={k} />{` ${STATUS[k].label}`}
            </Chip>
          ))}
        </div>
        <div className="muted small">{m?.status ? STATUS[m.status]?.hint : ''}</div>
        <div className="row" style={{ marginTop: 8 }}>
          <input className="grow" maxLength={60} placeholder="Toelichting, bv. tot 15:00 vrij" value={noteValue} style={{ flex: 1 }}
            onChange={(e) => setNote(e.target.value)} />
          <button className="btn tonal" onClick={() => { void run(() => actions.setStatus(m?.status ?? 'BESCHIKBAAR', noteValue)); setNote(null); toast('Opgeslagen') }}>Opslaan</button>
        </div>
      </div>
      <StayCard />
      {askNotifications && (
        <div className="card row">
          <div className="grow small">Meldingen aanzetten: 15 minuten voor elke activiteit krijg je een seintje (alleen als de app open is).</div>
          <button className="btn tonal" onClick={async () => { try { await Notification.requestPermission() } catch { /* ignore */ } bump((n) => n + 1) }}>Aanzetten</button>
        </div>
      )}
      <div className="row"><button className="btn tonal" id="planNew" onClick={() => dialogs.edit()}>+ Plan iets</button></div>
      <h2>Nu bezig</h2>
      {running.length ? running.map((a) => <ActivityCard key={a.id} activity={a} onMenu={dialogs.menu} />) : <p className="muted center">Er loopt nu niets.</p>}
      <h2>Straks</h2>
      {upcoming.length ? upcoming.map((a) => <ActivityCard key={a.id} activity={a} onMenu={dialogs.menu} />) : <p className="muted center">Nog niets gepland.</p>}
      <h2>{`Wie is er (${people.length})`}</h2>
      {STATUS_KEYS.map((k) => {
        const group = people.filter((p) => (p.status ?? 'BESCHIKBAAR') === k).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'nl'))
        return group.length ? (
          <div key={k}>
            <div className="muted small" style={{ margin: '8px 0 4px' }}>{`${STATUS[k].label} (${group.length})`}</div>
            <div>
              {group.map((p) => (
                <span key={p.id} className="pill">
                  <StatusDot status={k} />{` ${p.name}`}
                  {p.statusNote && <>{' '}<span className="muted small">{`· ${p.statusNote}`}</span></>}
                </span>
              ))}
            </div>
          </div>
        ) : null
      })}
      {dialogs.element}
    </>
  )
}

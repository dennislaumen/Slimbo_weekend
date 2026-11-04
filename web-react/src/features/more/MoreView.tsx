import { useState } from 'react'
import { Fold } from '../../components/Fold'
import { useToast } from '../../app/toast'
import { useWeekendContext } from '../../app/weekend-context'
import { choreTimes, dayLabel, fmtTime } from '../../domain/time'
import type { Chore, Room } from '../../domain/types'

const DAYS = ['Vrijdag', 'Zaterdag', 'Zondag', 'Maandag']
const SLOT: Record<string, string> = { ochtend: 'Ochtend', middag: 'Middag', avond: 'Avond' }
const bold = { fontWeight: 700, color: 'var(--brand)' }
const groupBy = <T extends { placeId: string }>(rows: T[]) => {
  const out: Record<string, T[]> = {}
  for (const r of rows) (out[r.placeId] ??= []).push(r)
  return out
}

export function MoreView() {
  const { data, me, myGuest, now, actions, run } = useWeekendContext()
  const toast = useToast()
  const e = data.event
  const [name, setName] = useState(me?.name ?? '')
  const mine = myGuest?.name
  const places = Object.fromEntries(data.places.map((p) => [p.id, p.name]))
  const roomsBy = groupBy<Room>(data.rooms)
  const choresBy = groupBy<Chore>(data.chores)
  const myRoom = mine ? data.rooms.find((r) => (r.occupants ?? []).includes(mine)) : undefined
  const myChores = mine ? data.chores.filter((c) => (c.names ?? []).includes(mine)).length : 0
  const isMine = (names?: string[]) => (mine ? (names ?? []).includes(mine) : false)

  const share = async () => {
    const text = `Doe mee met "${e.name}": ${location.href.split('#')[0]} — code ${e.joinCode}`
    try {
      if (navigator.share) await navigator.share({ text })
      else { await navigator.clipboard.writeText(text); toast('Gekopieerd') }
    } catch { /* cancelled */ }
  }

  return (
    <>
      <div className="card center" style={{ background: '#fff' }}><img src="slimbo_logo.png" alt="Slimbo" style={{ maxWidth: 260, width: '80%' }} /></div>
      <div className="card">
        <div className="title">{e.name}</div>
        {e.venue && <><div>{e.venue}</div><div className="muted">{e.address}</div></>}
        {e.checkInAt ? (
          <div className="small" style={{ marginTop: 6 }}>
            {`Inchecken ${dayLabel(e.checkInAt, now).toLowerCase()} vanaf ${fmtTime(e.checkInAt)} · uitchecken ${dayLabel(e.checkOutAt ?? 0, now).toLowerCase()} tot ${fmtTime(e.checkOutAt ?? 0)}`}
          </div>
        ) : null}
        <div className="row" style={{ marginTop: 10 }}>
          {e.address && <a className="btn tonal" style={{ textDecoration: 'none' }} target="_blank" rel="noopener" href={`https://maps.google.com/?q=${encodeURIComponent(e.address)}`}>🗺️ Route</a>}
          {e.phone && <a className="btn ghost" style={{ textDecoration: 'none' }} href={`tel:${e.phone.replace(/\s/g, '')}`}>📞 Bellen</a>}
          <a className="btn ghost" style={{ textDecoration: 'none' }} target="_blank" rel="noopener" href="https://www.slimbo.nl/">🌐 slimbo.nl</a>
        </div>
      </div>
      <div className="card row">
        <div className="grow"><div className="muted small">Code om mee te doen</div><div style={{ font: '700 26px ui-monospace,monospace' }}>{e.joinCode}</div></div>
        <button className="btn tonal" onClick={share}>Delen</button>
      </div>
      {(e.info ?? []).map((s, n) => (
        <div className="card" key={n}>
          <Fold id={`info-${n}`} title={<div className="title" style={{ fontSize: 16 }}>{s.title}</div>}>
            {(s.items ?? []).map((i, k) => <div key={k} className="small" style={{ marginTop: 4 }}>{`• ${i}`}</div>)}
          </Fold>
        </div>
      ))}
      {Object.keys(roomsBy).length > 0 && (
        <>
          <h2>Kamers{myRoom && <>{' '}<span className="muted small">{`jij: ${myRoom.name}`}</span></>}</h2>
          {Object.entries(roomsBy).map(([pid, rs]) => (
            <div className="card" key={pid}>
              <Fold id={`room-${pid}`} title={<><div className="title" style={{ fontSize: 16 }}>{places[pid] ?? ''}</div>{myRoom?.placeId === pid && <span className="muted small">jouw kamer</span>}</>}>
                {[...rs].sort((a, b) => a.floor - b.floor || a.name.localeCompare(b.name)).map((r) => (
                  <div key={r.id} className="small" style={{ marginTop: 6, ...(isMine(r.occupants) ? bold : {}) }}>
                    {`${r.name} · ${(r.occupants ?? []).join(', ') || '—'} `}<span className="muted">{`(${(r.occupants ?? []).length}/${r.beds})`}</span>
                  </div>
                ))}
              </Fold>
            </div>
          ))}
        </>
      )}
      {Object.keys(choresBy).length > 0 && (
        <>
          <h2>Corvee{myChores > 0 && <>{' '}<span className="muted small">{`jij: ${myChores}×`}</span></>}</h2>
          {Object.entries(choresBy).map(([pid, cs]) => {
            const n = cs.filter((c) => isMine(c.names)).length
            return (
              <div className="card" key={pid}>
                <Fold id={`chore-${pid}`} title={<><div className="title" style={{ fontSize: 16 }}>{places[pid] ?? ''}</div>{n > 0 && <span className="muted small">{`jij: ${n}×`}</span>}</>}>
                  {DAYS.filter((d) => cs.some((c) => c.day === d)).map((d) => (
                    <div key={d}>
                      <div className="small" style={{ marginTop: 8, fontWeight: 600 }}>{d}</div>
                      {cs.filter((c) => c.day === d).sort((a, b) => (a.startAt ?? 0) - (b.startAt ?? 0)).map((c) => (
                        <div key={c.id} className="small" style={isMine(c.names) ? bold : undefined}>
                          {`${SLOT[c.slot] ?? c.slot} `}<span className="muted">{choreTimes(c)}</span>{`: ${(c.names ?? []).join(', ')}`}
                        </div>
                      ))}
                    </div>
                  ))}
                </Fold>
              </div>
            )
          })}
        </>
      )}
      <div className="card">
        <label className="f"><span>Jouw naam</span>
          <div className="row">
            <input value={name} style={{ flex: 1 }} onChange={(ev) => setName(ev.target.value)} />
            <button className="btn tonal" onClick={() => void run(() => actions.setName(name), 'Naam opgeslagen')}>Opslaan</button>
          </div>
        </label>
      </div>
      <div style={{ height: 30 }} />
    </>
  )
}

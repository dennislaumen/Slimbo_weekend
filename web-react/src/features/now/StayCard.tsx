import { useState } from 'react'
import { useWeekendContext } from '../../app/weekend-context'
import { choresOf, roomOf } from '../../domain/guests'
import { choreTimes } from '../../domain/time'

const placeName = (places: { id: string; name: string }[], id: string | undefined) => places.find((p) => p.id === id)?.name ?? ''

function ClaimCard() {
  const { data, uid, me, actions, run } = useWeekendContext()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('')
  const all = [...data.guests].sort((a, b) => a.name.localeCompare(b.name, 'nl'))
  const q = query.trim().toLowerCase()
  const shown = all.filter((g) => !q || g.name.toLowerCase().includes(q)).slice(0, q ? 12 : 6)
  const claim = () => {
    const g = data.guests.find((x) => x.id === selected)
    if (!g) return
    if (g.claimedBy && g.claimedBy !== uid && !confirm(`${g.name} is al gekoppeld aan een ander toestel (bijv. na opnieuw installeren). Overnemen? Je ♥'s gaan mee.`)) return
    void run(() => actions.claimGuest(g, me?.guestId), `Gekoppeld aan ${g.name}`)
    setSelected('')
    setQuery('')
  }
  return (
    <div className="card">
      <div className="title">Wie ben jij in de kamerindeling?</div>
      <p className="muted">Dan zie je je kamer en je corveebeurten.</p>
      <input id="claimQ" placeholder="Zoek je naam" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div style={{ marginTop: 6 }}>
        {shown.map((g) => (
          <div key={g.id} className={`list-item ${selected === g.id ? 'sel' : ''}`.trim()} role="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => setSelected(g.id)} onKeyDown={(e) => e.key === 'Enter' && setSelected(g.id)}>
            <span>{g.name}</span>
            {g.claimedBy && g.claimedBy !== uid && <span className="muted small">op ander toestel</span>}
          </div>
        ))}
        {!q && all.length > 6 && <p className="muted small">Typ een deel van je naam om te zoeken ({all.length} namen).</p>}
        {q && !shown.length && <p className="muted small">Geen naam gevonden.</p>}
      </div>
      <button className="btn" disabled={!selected} style={{ marginTop: 8 }} onClick={claim}>Koppelen</button>
    </div>
  )
}

/** Room and chores of the signed-in guest, or the form to pick who you are. */
export function StayCard() {
  const { data, me, myGuest: g, actions, run } = useWeekendContext()
  if (!data.guests.length) return null
  if (!me?.guestId || me.hidden) return <ClaimCard />
  const room = roomOf(g, data.rooms)
  const chores = choresOf(g?.name, data.chores)
  const others = (names: string[] | undefined) => (names ?? []).filter((n) => n !== g?.name)
  return (
    <div className="card">
      <div className="row">
        <span style={{ fontSize: 22 }}>🛏️</span>
        <div className="grow">
          {room ? (
            <>
              <div className="title">{`${placeName(data.places, room.placeId)} · ${room.name}`}</div>
              <div className="muted">{`${room.floor}e verdieping${others(room.occupants).length ? ' · met ' + others(room.occupants).join(', ') : ''}`}</div>
            </>
          ) : <div>{`Geen kamer gevonden voor ${g?.name}`}</div>}
        </div>
      </div>
      {chores.length > 0 && (
        <div className="row" style={{ marginTop: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 22 }}>🧽</span>
          <div className="grow">
            <div className="small" style={{ fontWeight: 600 }}>Jouw corvee</div>
            {chores.map((c) => (
              <div key={c.id} className="small">{`${c.day} ${c.slot} ${choreTimes(c)}${others(c.names).length ? ' · met ' + others(c.names).join(', ') : ''}`}</div>
            ))}
          </div>
        </div>
      )}
      <button className="btn text small" onClick={() => void run(() => actions.clearGuest())}>Ben je iemand anders? Wijzig</button>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Chip } from '../../components/Chip'
import { useWeekendContext } from '../../app/weekend-context'
import { ANYONE, filterCount, filterGames, isBrought, NO_FILTERS, sameName, type GameFilters } from '../../domain/games'
import { CATEGORIES, WEIGHTS } from '../../domain/labels'
import type { Weight } from '../../domain/types'
import { GameEditor } from './GameEditor'

const PLAYER_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7]

export function GamesView() {
  const { data, me, myName, actions, run } = useWeekendContext()
  const [filters, setFilters] = useState<GameFilters>(NO_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [editing, setEditing] = useState<string | 'new' | null>(null) // game id: the editor reads the live document
  const patch = (p: Partial<GameFilters>) => setFilters((f) => ({ ...f, ...p }))

  const wants = useMemo(() => new Set(me?.wants ?? []), [me?.wants])
  const fans = useMemo(() => {
    const out: Record<string, string[]> = {}
    for (const m of data.members.filter((x) => !x.web && !x.hidden)) for (const id of m.wants ?? []) (out[id] ??= []).push(m.name ?? '')
    return out
  }, [data.members])
  const owners = useMemo(
    () => [...new Set(data.games.filter(isBrought).map((g) => g.owner!.trim()))].sort((a, b) => a.localeCompare(b, 'nl')),
    [data.games],
  )
  const categories = useMemo(
    () => [...new Set(data.games.map((g) => g.category || 'Overig'))].sort((a, b) => CATEGORIES.indexOf(a as never) - CATEGORIES.indexOf(b as never)),
    [data.games],
  )
  const list = useMemo(() => filterGames(data.games, filters, wants), [data.games, filters, wants])
  const active = filterCount(filters)
  // null = new game, undefined = closed (or the game was deleted by someone else meanwhile)
  const editingGame = editing === 'new' ? null : editing ? data.games.find((g) => g.id === editing) : undefined
  const mine = myName.trim()
  const mineActive = filters.owner.toLowerCase() === mine.toLowerCase()

  return (
    <>
      <div className="row">
        <input id="gq" placeholder="🔍 Zoek een spel" value={filters.query} style={{ flex: 1, minWidth: 0 }} onChange={(e) => patch({ query: e.target.value })} />
        <button className="btn" id="gameNew" onClick={() => setEditing('new')}>+ Spel</button>
      </div>
      <div className="row" style={{ margin: '10px 0' }}>
        {mine && (
          <Chip on={mineActive} onClick={() => patch({ owner: mineActive ? '' : mine })}>
            {`Neem ik mee (${data.games.filter((g) => sameName(g.owner, myName)).length})`}
          </Chip>
        )}
        <Chip on={showFilters || active > 0} onClick={() => setShowFilters((v) => !v)}>{`Filters${active ? ` (${active})` : ''}`}</Chip>
        <Chip on={filters.onlyWanted} onClick={() => patch({ onlyWanted: !filters.onlyWanted })}>{`Mijn ♥ (${wants.size})`}</Chip>
        <Chip on={filters.going} onClick={() => patch({ going: !filters.going, wishlist: false })}>{`Gaat mee (${data.games.filter((g) => !g.wishlist).length})`}</Chip>
        <Chip on={filters.wishlist} onClick={() => patch({ wishlist: !filters.wishlist, going: false })}>{`Wenslijst (${data.games.filter((g) => g.wishlist).length})`}</Chip>
      </div>
      {showFilters && (
        <div className="card">
          <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Aantal spelers</div>
          <div className="row">
            {PLAYER_OPTIONS.map((n) => <Chip key={n} on={filters.players === n} onClick={() => patch({ players: n })}>{n === 0 ? 'Alle' : n === 7 ? '7+' : n}</Chip>)}
          </div>
          <div className="small" style={{ fontWeight: 600, margin: '10px 0 6px' }}>Moeilijkheid</div>
          <div className="row">
            {(Object.entries(WEIGHTS) as [Weight, string][]).map(([k, l]) => (
              <Chip key={k} on={filters.weights.includes(k)}
                onClick={() => patch({ weights: filters.weights.includes(k) ? filters.weights.filter((x) => x !== k) : [...filters.weights, k] })}>{l}</Chip>
            ))}
          </div>
          <div className="grid2" style={{ marginTop: 10 }}>
            <label className="f"><span>Categorie</span>
              <select id="gCat" value={filters.category} onChange={(e) => { patch({ category: e.target.value }); e.target.blur() }}>
                <option value="">Alle</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="f"><span>Wie neemt het mee</span>
              <select id="gOwner" value={filters.owner} onChange={(e) => { patch({ owner: e.target.value }); e.target.blur() }}>
                <option value="">Alle spellen</option>
                <option value={ANYONE}>Iedereen (meegebracht)</option>
                {owners.map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
          </div>
          {active > 0 && <button className="btn text" onClick={() => patch({ players: 0, weights: [], category: '', owner: '' })}>Filters wissen</button>}
        </div>
      )}
      <p className="muted small">{`${list.length} van ${data.games.length} spellen · tik op ♥ voor spellen die je wilt spelen — zo zien anderen wat je graag speelt.`}</p>
      {list.map((g) => {
        const f = fans[g.id] ?? []
        const wanted = wants.has(g.id)
        return (
          <div key={g.id} className="card row" style={{ alignItems: 'flex-start' }}>
            <div className="grow">
              <div className="title" data-gedit={g.id} style={{ cursor: 'pointer' }} role="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => setEditing(g.id)} onKeyDown={(e) => e.key === 'Enter' && setEditing(g.id)}>{`${g.name} `}<span className="muted small">✎</span></div>
              <div className="muted">{g.wishlist ? 'Wenslijst · nog niemand neemt het mee' : g.owner ? 'Neemt mee: ' + g.owner : 'Eigenaar onbekend'}</div>
              <div className={`small ${g.infoChecked === false ? 'warn' : 'muted'}`}>
                {g.infoChecked === false ? 'spelers/duur nog onbekend'
                  : [`${g.minPlayers}–${g.maxPlayers} spelers`, `${g.durationMin} min`, g.weight && WEIGHTS[g.weight], g.category].filter(Boolean).join(' · ')}
              </div>
              {f.length > 0 && <div className="small" style={{ color: 'var(--accent)', marginTop: 2 }}>{`♥ ${f.join(', ')}`}</div>}
            </div>
            {g.link && /^https?:\/\//i.test(g.link) && <a href={g.link} target="_blank" rel="noopener" className="heart" style={{ fontSize: 18, textDecoration: 'none' }} aria-label="BoardGameGeek">↗</a>}
            <button className={`heart ${wanted ? 'on' : ''}`.trim()} aria-label="Wil ik spelen" onClick={() => void run(() => actions.setWant(g.id, !wanted))}>{wanted ? '♥' : '♡'}</button>
          </div>
        )
      })}
      {editingGame !== undefined && <GameEditor game={editingGame} onClose={() => setEditing(null)} />}
    </>
  )
}

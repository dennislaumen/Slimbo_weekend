import { useState } from 'react'
import { Dialog, DialogHead } from '../../components/Dialog'
import { useToast } from '../../app/toast'
import { useWeekendContext } from '../../app/weekend-context'
import { CATEGORIES, WEIGHTS } from '../../domain/labels'
import type { Game, Weight } from '../../domain/types'

const BGG_SEARCH = 'https://boardgamegeek.com/geeksearch.php?action=search&objecttype=boardgame&q='

export function GameEditor({ game, onClose }: { game: Game | null; onClose: () => void }) {
  const { data, myName, actions, run } = useWeekendContext()
  const toast = useToast()
  const isNew = !game
  const [name, setName] = useState(game?.name ?? '')
  const [owner, setOwner] = useState(game ? (game.owner ?? '') : myName)
  const [wishlist, setWishlist] = useState(game?.wishlist ?? false)
  const [min, setMin] = useState(String(game?.minPlayers ?? 2))
  const [max, setMax] = useState(String(game?.maxPlayers ?? 4))
  const [duration, setDuration] = useState(String(game?.durationMin ?? 60))
  const [weight, setWeight] = useState<Weight>(game?.weight ?? 'MIDDEL')
  const [category, setCategory] = useState(game?.category ?? '')
  const [link, setLink] = useState(game?.link ?? '')
  const autoNote = Boolean(game?.notes?.startsWith('ⓘ '))
  const [notes, setNotes] = useState(autoNote ? '' : (game?.notes ?? ''))

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) return toast('Geef het spel een naam')
    if (isNew && data.games.some((x) => x.name.trim().toLowerCase() === trimmed.toLowerCase())) return toast(`"${trimmed}" staat al in de lijst`)
    const mn = parseInt(min || '2', 10)
    let mx = parseInt(max || '4', 10)
    if (mx < mn) mx = mn
    const ownerName = owner.trim()
    const fields = {
      name: trimmed, owner: ownerName, wishlist: wishlist && !ownerName, minPlayers: mn, maxPlayers: mx,
      durationMin: parseInt(duration || '60', 10), weight, category, link: link.trim(),
      notes: autoNote && !notes.trim() ? game!.notes : notes.trim(), infoChecked: true,
    }
    onClose()
    if (game) await run(() => actions.saveGame(game, fields), 'Opgeslagen')
    else await run(() => actions.addGame(fields), `${trimmed} toegevoegd`)
  }

  const num = (id: string, value: string, set: (v: string) => void, lo: number, hi: number, step = 1) => (
    <input id={id} type="number" inputMode="numeric" min={lo} max={hi} step={step} value={value} onChange={(e) => set(e.target.value)} />
  )

  return (
    <Dialog onClose={onClose}>
      <DialogHead title={isNew ? 'Spel toevoegen' : 'Spel bewerken'} onClose={onClose} action={<button className="btn" id="gSave" onClick={save}>Opslaan</button>} />
      <div className="dbody">
        <label className="f"><span>Naam</span><input id="gName" value={name} data-autofocus={isNew ? '' : undefined} autoCapitalize="words" onChange={(e) => setName(e.target.value)} /></label>
        <label className="f"><span>Wie neemt het mee</span>
          <input id="gOwnerIn" value={owner} autoCapitalize="words" placeholder="Leeg laten voor de wenslijst"
            onChange={(e) => { setOwner(e.target.value); if (e.target.value.trim()) setWishlist(false) }} />
        </label>
        <label className="check" style={{ border: 0 }}>
          <input type="checkbox" id="gWishIn" checked={wishlist} onChange={(e) => { setWishlist(e.target.checked); if (e.target.checked) setOwner('') }} />
          <span>Wenslijst (niemand neemt het mee)</span>
        </label>
        <div className="grid2">
          <label className="f"><span>Min. spelers</span>{num('gMin', min, setMin, 1, 20)}</label>
          <label className="f"><span>Max. spelers</span>{num('gMax', max, setMax, 1, 20)}</label>
          <label className="f"><span>Speelduur (min)</span>{num('gDur', duration, setDuration, 5, 600, 5)}</label>
          <label className="f"><span>Moeilijkheid</span>
            <select id="gWeight" value={weight} onChange={(e) => setWeight(e.target.value as Weight)}>
              {(Object.entries(WEIGHTS) as [Weight, string][]).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
        </div>
        <label className="f"><span>Categorie</span>
          <select id="gCatIn" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Geen</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="f"><span>Link (BoardGameGeek, optioneel)</span><input id="gLink" type="url" value={link} placeholder="https://boardgamegeek.com/boardgame/…" onChange={(e) => setLink(e.target.value)} /></label>
        <label className="f"><span>Notitie</span><input id="gNotes" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        {isNew && (
          <p className="muted small">{'Tip: zoek het spel op BoardGameGeek voor het juiste aantal spelers en de speelduur. '}
            <a href={BGG_SEARCH + encodeURIComponent(name.trim())} target="_blank" rel="noopener">Zoek op BGG ↗</a></p>
        )}
        {game && (
          <button className="btn danger" style={{ marginTop: 10 }} onClick={() => {
            if (!confirm(`"${game.name}" voor iedereen verwijderen?`)) return
            onClose()
            void run(() => actions.removeGame(game), 'Spel verwijderd')
          }}>Spel verwijderen</button>
        )}
      </div>
    </Dialog>
  )
}

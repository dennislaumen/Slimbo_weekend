import { useState, type ReactNode } from 'react'
import { Dialog, DialogHead } from '../../components/Dialog'
import { useToast } from '../../app/toast'
import { useWeekendContext } from '../../app/weekend-context'
import { Chip } from '../../components/Chip'
import { DEFAULT_TITLE, PLAN_TYPES, TYPES } from '../../domain/labels'
import { dayLabel, fmtTime, isOpen, roundedNow, startOfDay } from '../../domain/time'
import type { Activity, ActivityType } from '../../domain/types'

type Dialogs = { kind: 'edit'; init: Partial<Activity> } | { kind: 'menu'; activity: Activity } | null

/** Opens the "edit activity" and "activity menu" dialogs from anywhere in a tab. */
export function useActivityDialogs(): { edit: (init?: Partial<Activity>) => void; menu: (a: Activity) => void; element: ReactNode } {
  const [open, setOpen] = useState<Dialogs>(null)
  const close = () => setOpen(null)
  const element =
    open?.kind === 'edit' ? <ActivityEditor init={open.init} onClose={close} />
    : open?.kind === 'menu' ? <ActivityMenu activity={open.activity} onClose={close} onEdit={(init) => setOpen({ kind: 'edit', init })} />
    : null
  return { edit: (init = {}) => setOpen({ kind: 'edit', init }), menu: (activity) => setOpen({ kind: 'menu', activity }), element }
}

function ActivityEditor({ init, onClose }: { init: Partial<Activity>; onClose: () => void }) {
  const { now, data, actions, run } = useWeekendContext()
  const toast = useToast()
  const isNew = !init.id
  const start = init.startAt ?? roundedNow(now)
  const initialType = PLAN_TYPES.includes(init.type as never) || !init.type ? (init.type ?? 'ETEN') : 'ANDERS'
  const [type, setType] = useState<ActivityType>(initialType)
  const [title, setTitle] = useState(init.title ?? 'Eten')
  const [day, setDay] = useState(startOfDay(start))
  const [time, setTime] = useState(fmtTime(start))
  const [duration, setDuration] = useState(String(init.durationMin ?? 60))
  const [placeId, setPlaceId] = useState(init.placeId ?? '')
  const [tableId, setTableId] = useState(init.tableId ?? '')
  const [notes, setNotes] = useState(init.notes ?? '')

  const days = Array.from({ length: 4 }, (_, i) => startOfDay(now) + i * 86_400_000)
  if (!days.includes(startOfDay(start))) days.unshift(startOfDay(start))
  const placeName = (id: string | undefined) => data.places.find((p) => p.id === id)?.name ?? ''

  const pickType = (t: ActivityType) => {
    if (!title || title === (DEFAULT_TITLE[type] ?? '')) setTitle(DEFAULT_TITLE[t] ?? '')
    setType(t)
  }
  const save = async () => {
    const trimmed = title.trim()
    if (!trimmed) return toast('Geef de activiteit een titel')
    const [h = 12, mi = 0] = (time || '12:00').split(':').map(Number)
    const startAt = day + (h * 60 + mi) * 60_000
    const out = {
      id: '', ...init, type, title: trimmed, startAt, durationMin: parseInt(duration || '60', 10), placeId, tableId, notes: notes.trim(),
      reminderSent: startAt !== init.startAt ? false : !!init.reminderSent,
    } as Activity
    onClose()
    await run(() => actions.saveActivity(out, isNew), isNew ? 'Ingepland' : 'Opgeslagen')
  }

  return (
    <Dialog onClose={onClose}>
      <DialogHead title={isNew ? 'Nieuwe activiteit' : 'Bewerken'} onClose={onClose} action={<button className="btn" id="eSave" onClick={save}>Opslaan</button>} />
      <div className="dbody">
        <div className="row" style={{ marginBottom: 10 }}>
          {PLAN_TYPES.map((k) => (
            <Chip key={k} on={type === k} onClick={() => pickType(k)}>{`${TYPES[k].icon} ${TYPES[k].label}`}</Chip>
          ))}
        </div>
        <label className="f"><span>Titel</span><input id="eTitle" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <div className="grid2">
          <label className="f"><span>Dag</span>
            <select id="eDay" value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {days.map((d) => <option key={d} value={d}>{dayLabel(d, now)}</option>)}
            </select>
          </label>
          <label className="f"><span>Tijd</span><input id="eTime" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          <label className="f"><span>Duur (min)</span><input id="eDur" type="number" min="15" step="15" value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
          <label className="f"><span>Locatie</span>
            <select id="ePlace" value={placeId} onChange={(e) => setPlaceId(e.target.value)}>
              <option value="">—</option>
              {data.places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="f"><span>Tafel</span>
            <select id="eTable" value={tableId} onChange={(e) => {
              setTableId(e.target.value)
              const t = data.tables.find((x) => x.id === e.target.value)
              if (t?.placeId) setPlaceId(t.placeId)
            }}>
              <option value="">—</option>
              {data.tables.map((t) => <option key={t.id} value={t.id}>{`${t.name} · ${t.seats} pl.${placeName(t.placeId) ? ' · ' + placeName(t.placeId) : ''}`}</option>)}
            </select>
          </label>
        </div>
        <p className="muted small">Aanmelden is niet nodig: iedereen krijgt 15 minuten van tevoren een melding.</p>
        <label className="f" style={{ marginTop: 12 }}><span>Notities</span><textarea id="eNotes" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      </div>
    </Dialog>
  )
}

function ActivityMenu({ activity: a, onClose, onEdit }: { activity: Activity; onClose: () => void; onEdit: (a: Activity) => void }) {
  const { actions, run } = useWeekendContext()
  const wide = { width: '100%', marginBottom: 8 }
  return (
    <Dialog onClose={onClose}>
      <DialogHead title={a.title ?? ''} onClose={onClose} />
      <div className="dbody">
        <button className="btn tonal" style={wide} onClick={() => onEdit(a)}>Bewerken</button>
        {isOpen(a)
          ? <button className="btn ghost" style={wide} onClick={() => { onClose(); void run(() => actions.setActivityStatus(a, 'GEANNULEERD')) }}>Annuleren</button>
          : <button className="btn ghost" style={wide} onClick={() => { onClose(); void run(() => actions.setActivityStatus(a, 'GEPLAND')) }}>Opnieuw plannen</button>}
        <button className="btn danger" style={{ width: '100%' }} onClick={() => {
          if (confirm(`"${a.title}" voor iedereen verwijderen?`)) { onClose(); void run(() => actions.removeActivity(a), 'Verwijderd') }
        }}>Verwijderen</button>
      </div>
    </Dialog>
  )
}

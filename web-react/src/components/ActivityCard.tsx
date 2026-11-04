import { ACTIVITY_STATUS_LABEL, typeOf } from '../domain/labels'
import { dayLabel, endAt, fmtTime, isRunning } from '../domain/time'
import type { Activity } from '../domain/types'
import { useWeekendContext } from '../app/weekend-context'
import { whereText } from '../app/useReminders'

export function ActivityCard({ activity: a, onMenu }: { activity: Activity; onMenu: (a: Activity) => void }) {
  const { now, data } = useWeekendContext()
  const running = isRunning(a, now)
  const where = whereText(a, data.tables, data.places)
  const label = running ? 'Nu bezig' : a.status === 'GEANNULEERD' || a.status === 'AFGEROND' ? ACTIVITY_STATUS_LABEL[a.status] : ''
  return (
    <div className={`card ${running ? 'running' : ''}`.trim()}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ fontSize: 24 }}>{typeOf(a.type).icon}</div>
        <div className="grow">
          <div className="title">{a.title || typeOf(a.type).label}</div>
          <div className="muted">
            {`${dayLabel(a.startAt, now)} ${fmtTime(a.startAt)}–${fmtTime(endAt(a))}${where ? ' · ' + where : ''}`}
          </div>
          {label && <div className="small" style={{ color: 'var(--brand)', fontWeight: 600 }}>{label}</div>}
        </div>
        <button className="btn text" onClick={() => onMenu(a)} aria-label="Meer">⋯</button>
      </div>
      {a.notes && <div className="small" style={{ marginTop: 6 }}>{a.notes}</div>}
    </div>
  )
}

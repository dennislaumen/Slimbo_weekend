import { Fragment, useState } from 'react'
import { ActivityCard } from '../../components/ActivityCard'
import { Chip } from '../../components/Chip'
import { useWeekendContext } from '../../app/weekend-context'
import { dayHeader, endAt, isOpen, startOfDay } from '../../domain/time'
import { useActivityDialogs } from './ActivityDialogs'

export function PlanningView() {
  const { data, now } = useWeekendContext()
  const [showDone, setShowDone] = useState(false)
  const dialogs = useActivityDialogs()
  const list = data.activities
    .filter((a) => showDone || (isOpen(a) && endAt(a) >= now))
    .sort((a, b) => a.startAt - b.startAt)

  return (
    <>
      <div className="row" style={{ marginBottom: 8 }}>
        <Chip on={showDone} onClick={() => setShowDone((v) => !v)}>Ook afgelopen</Chip>
        <span className="grow" />
        <button className="btn" id="planNew" onClick={() => dialogs.edit()}>+ Plannen</button>
      </div>
      {!list.length && (
        <p className="muted center">Niets gepland. Eten, een wandeling of iets anders: tik op + Plannen. Iedereen krijgt 15 min van tevoren een melding.</p>
      )}
      {list.map((a, i) => (
        <Fragment key={a.id}>
          {(i === 0 || startOfDay(a.startAt) !== startOfDay(list[i - 1]!.startAt)) && <h2>{dayHeader(a.startAt, now)}</h2>}
          <ActivityCard activity={a} onMenu={dialogs.menu} />
        </Fragment>
      ))}
      {dialogs.element}
    </>
  )
}

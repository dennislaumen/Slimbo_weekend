import { useState } from 'react'
import { useToast } from '../../app/toast'
import { joinWithCode, openKnownEvent } from '../../data/actions'
import { forgetEvent, KEYS, readKnownEvents, store } from '../../data/storage'

export function LoginView({ uid, onOpen }: { uid: string; onOpen: (eventId: string) => void }) {
  const toast = useToast()
  const known = readKnownEvents()
  const [name, setName] = useState(store.get(KEYS.name) ?? '')
  const [code, setCode] = useState(store.get(KEYS.code) ?? '')
  const [loginMsg, setLoginMsg] = useState('')
  const [openMsg, setOpenMsg] = useState('')

  const open = async (id: string) => {
    setOpenMsg('Bezig…')
    try {
      await openKnownEvent(uid, id)
      onOpen(id)
    } catch {
      forgetEvent(id)
      setOpenMsg('')
      toast('Je bent niet meer aangemeld voor dit weekend. Doe opnieuw mee met de code.')
    }
  }
  const login = async () => {
    const n = name.trim()
    const c = code.trim().toUpperCase()
    if (!n || c.length !== 6) return setLoginMsg('Vul je naam en de code (6 tekens) in.')
    setLoginMsg('Bezig…')
    try {
      const id = await joinWithCode(uid, n, c)
      store.set(KEYS.name, n)
      store.set(KEYS.code, c)
      onOpen(id)
    } catch (e) {
      const message = (e as Error).message
      setLoginMsg(message.startsWith('Geen weekend') ? message : 'Mislukt: ' + message)
    }
  }

  return (
    <main>
      <div className="login">
        <div className="logo"><img src="slimbo_logo.png" alt="Slimbo" /></div>
        {known.length > 0 && (
          <div className="card">
            <div className="title">Jouw weekenden</div>
            {known.map((e) => <button key={e.id} className="btn" style={{ width: '100%', marginTop: 8 }} onClick={() => void open(e.id)}>{e.name || e.code}</button>)}
            <p className="muted small center">{openMsg}</p>
          </div>
        )}
        <div className="card">
          <div className="title">{known.length ? 'Meedoen met een ander weekend' : 'Meedoen met het spellenweekend'}</div>
          <p className="muted">Vul de code in die je van de organisatie hebt gekregen.</p>
          <label className="f"><span>Jouw naam</span><input id="lName" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="f"><span>Code van het weekend</span>
            <input id="lCode" maxLength={6} autoCapitalize="characters" style={{ textTransform: 'uppercase', letterSpacing: 2 }} value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <button className="btn" id="lGo" style={{ width: '100%' }} onClick={() => void login()}>Meedoen</button>
          <p className="muted small center" id="lMsg">{loginMsg}</p>
        </div>
        <p className="center small"><a href="https://www.slimbo.nl/" target="_blank" rel="noopener">🌐 www.slimbo.nl</a></p>
      </div>
    </main>
  )
}

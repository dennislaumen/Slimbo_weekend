import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../app/App'
import { resetFake } from '../data/fake/firestore'
import { defaultFixture, type Fixture } from '../data/fake/scenarios'

interface Options {
  fixture?: Fixture
  tab?: 'nu' | 'planning' | 'spellen' | 'meer'
  /** false = start signed out of any weekend (login screen) */
  signedIn?: boolean
}

/** Renders the whole app against the in-memory Firebase fake and waits until it is usable. */
export async function renderApp({ fixture = defaultFixture, tab = 'nu', signedIn = true }: Options = {}) {
  localStorage.clear()
  resetFake(structuredClone(fixture))
  if (signedIn) localStorage.setItem('app_eventId', 'e1')
  localStorage.setItem('app_tab', tab)
  const user = userEvent.setup()
  render(<App />)
  if (signedIn) await screen.findByRole('navigation')
  else await screen.findByRole('button', { name: 'Meedoen' })
  return { user }
}

/** Writes the app sent to Firestore, in order: [operation, path, data]. */
export const writes = () => window.__writes ?? []

export const gameTitles = () => [...document.querySelectorAll('[data-gedit]')].map((el) => el.firstChild?.textContent?.trim())

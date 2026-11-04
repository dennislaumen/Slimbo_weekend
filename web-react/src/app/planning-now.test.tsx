import { act, screen, waitFor, within } from '@testing-library/react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../data/firebase'
import { scenarios } from '../data/fake/scenarios'
import { renderApp, writes } from '../test/render'

const card = (title: string) => screen.getByText(title).closest('.card') as HTMLElement

describe('Planning tab', () => {
  it('shows planned activities grouped under a day header', async () => {
    await renderApp({ tab: 'planning' })
    expect(screen.getByText('Diner')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2)
  })

  it('planning an activity adds it to the list', async () => {
    const { user } = await renderApp({ tab: 'planning' })
    await user.click(screen.getByRole('button', { name: '+ Plannen' }))
    await user.clear(screen.getByLabelText('Titel'))
    await user.type(screen.getByLabelText('Titel'), 'Pizza bij de Italiaan')
    await user.click(screen.getByRole('button', { name: 'Opslaan' }))
    expect(await screen.findByText('Pizza bij de Italiaan')).toBeInTheDocument()
    expect(screen.getByText('Ingepland')).toBeInTheDocument()
  })

  it('refuses an activity without a title', async () => {
    const { user } = await renderApp({ tab: 'planning' })
    await user.click(screen.getByRole('button', { name: '+ Plannen' }))
    await user.clear(screen.getByLabelText('Titel'))
    await user.click(screen.getByRole('button', { name: 'Opslaan' }))
    expect(await screen.findByText('Geef de activiteit een titel')).toBeInTheDocument()
  })

  it('picking a table also picks its location; picking a type renames a default title', async () => {
    const { user } = await renderApp({ tab: 'planning' })
    await user.click(screen.getByRole('button', { name: '+ Plannen' }))
    await user.selectOptions(screen.getByLabelText('Tafel'), 'Tafel 1 · 6 pl. · Woonkamer')
    expect(screen.getByLabelText('Locatie')).toHaveValue('p1')
    await user.click(screen.getByRole('button', { name: /Wandelen/ }))
    expect(screen.getByLabelText('Titel')).toHaveValue('Wandeling')
  })

  it('a cancelled activity leaves the list and returns under "Ook afgelopen"', async () => {
    const { user } = await renderApp({ tab: 'planning' })
    await user.click(within(card('Diner')).getByLabelText('Meer'))
    await user.click(screen.getByRole('button', { name: 'Annuleren' }))
    await waitFor(() => expect(screen.queryByText('Diner')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Ook afgelopen' }))
    expect(within(card('Diner')).getByText('Geannuleerd')).toBeInTheDocument()
    await user.click(within(card('Diner')).getByLabelText('Meer'))
    await user.click(screen.getByRole('button', { name: 'Opnieuw plannen' }))
    await waitFor(() => expect(screen.queryByText('Geannuleerd')).not.toBeInTheDocument())
  })

  it('deleting asks for confirmation first', async () => {
    const { user } = await renderApp({ tab: 'planning' })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    await user.click(within(card('Diner')).getByLabelText('Meer'))
    await user.click(screen.getByRole('button', { name: 'Verwijderen' }))
    expect(screen.getAllByText('Diner').some((el) => el.closest('.card'))).toBe(true) // still listed
    await user.click(screen.getByRole('button', { name: 'Verwijderen' }))
    await waitFor(() => expect(screen.queryByText('Diner')).not.toBeInTheDocument())
    expect(confirm).toHaveBeenCalledTimes(2)
  })

  it('says so when nothing is planned', async () => {
    await renderApp({ tab: 'planning', fixture: scenarios.empty!() })
    expect(screen.getByText(/Niets gepland/)).toBeInTheDocument()
  })
})

describe('Nu tab', () => {
  it('greets me by name and shows who is where, grouped by status', async () => {
    await renderApp()
    expect(screen.getByText('Hoi Anna, hoe sta je ervoor?')).toBeInTheDocument()
    expect(screen.getByText('Wie is er (3)')).toBeInTheDocument()
    expect(screen.getByText('Bezet (1)')).toBeInTheDocument()
  })

  it('changing my status updates the chip and the hint', async () => {
    const { user } = await renderApp()
    await user.click(screen.getByRole('button', { name: /Bezet/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Bezet/ })).toHaveClass('on'))
    expect(screen.getByText('Je zit in een spel of bent even weg.')).toBeInTheDocument()
    expect(screen.getByText('Bezet (2)')).toBeInTheDocument()
  })

  it('saves a status note', async () => {
    const { user } = await renderApp()
    const note = screen.getByPlaceholderText('Toelichting, bv. tot 15:00 vrij')
    await user.clear(note)
    await user.type(note, 'even weg')
    await user.click(screen.getByRole('button', { name: 'Opslaan' }))
    expect(await screen.findByText('Opgeslagen')).toBeInTheDocument()
    expect(await screen.findByText('· even weg')).toBeInTheDocument()
  })

  it('shows running and upcoming activities in their own sections', async () => {
    await renderApp({ fixture: scenarios['busy-day']!() })
    expect(within(card('Lunch')).getByText('Nu bezig')).toBeInTheDocument()
    const straks = screen.getByRole('heading', { name: 'Straks' })
    expect(straks.compareDocumentPosition(card('Borrel')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText('Ontbijt')).not.toBeInTheDocument()
  })

  it('shows my room and chores, and lets me pick who I am when unlinked', async () => {
    const { user } = await renderApp()
    expect(screen.getByText('Woonkamer · Blauwe kamer')).toBeInTheDocument()
    expect(screen.getByText('1e verdieping · met Dirk')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ben je iemand anders? Wijzig' }))
    expect(await screen.findByText('Wie ben jij in de kamerindeling?')).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Zoek je naam'), 'dir')
    await user.click(screen.getByText('Dirk'))
    await user.click(screen.getByRole('button', { name: 'Koppelen' }))
    expect(await screen.findByText('Hoi Dirk, hoe sta je ervoor?')).toBeInTheDocument()
    // "Wijzig" first unlinks me, then the claim links Dirk.
    // (Anna's guest gu1 therefore keeps claimedBy: u1; the legacy app does the same.)
    expect(writes()).toEqual([
      ['update', 'events/e1/members/u1', { guestId: '' }],
      ['batch', '', [
        ['set', 'events/e1/members/u1', expect.objectContaining({ guestId: 'gu2', name: 'Dirk', hidden: false })],
        ['update', 'events/e1/guests/gu2', { claimedBy: 'u1' }],
      ]],
    ])
  })

  it('taking over a guest that another device claimed hides the old member and keeps their hearts', async () => {
    const fixture = scenarios.default!()
    fixture.guests[1]!.claimedBy = 'u2' // Dirk is linked to Bram's device; Bram has hearts g2, g3
    const { user } = await renderApp({ fixture })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Ben je iemand anders? Wijzig' }))
    await user.click(await screen.findByText('Dirk'))
    await user.click(screen.getByRole('button', { name: 'Koppelen' }))
    await screen.findByText('Hoi Dirk, hoe sta je ervoor?')
    const [, , ops] = writes().find((w) => w[0] === 'batch') as [string, string, unknown[][]]
    expect(ops).toContainEqual(['update', 'events/e1/members/u2', { hidden: true, replacedBy: 'u1', guestId: '' }])
    expect(ops).toContainEqual(['update', 'events/e1/members/u1', { wants: { union: ['g2', 'g3'] } }])
  })
})

describe('Notifications', () => {
  it('toasts a reminder when an activity starts within 15 minutes', async () => {
    const fixture = scenarios.default!()
    fixture.activities = [{ id: 'soon', type: 'ETEN', title: 'Pasta', startAt: Date.now() + 10 * 60_000, durationMin: 60, status: 'GEPLAND', placeId: 'p1' }]
    await renderApp({ fixture })
    expect(await screen.findByText(/^Over \d+ min: Pasta — Om \d\d:\d\d · Woonkamer$/)).toBeInTheDocument()
  })

  it('does not remind about activities that are far away', async () => {
    await renderApp()
    expect(screen.queryByText(/^Over \d+ min/)).not.toBeInTheDocument()
  })

  it('tells me when somebody else cancels an activity, but not when I do', async () => {
    await renderApp()
    await act(() => updateDoc(doc(db, 'events', 'e1', 'activities', 'a1'), { status: 'GEANNULEERD', updatedBy: 'u1' }))
    expect(screen.queryByText(/Geannuleerd: Diner/)).not.toBeInTheDocument()
    await act(() => updateDoc(doc(db, 'events', 'e1', 'activities', 'a2'), { status: 'GEANNULEERD', updatedBy: 'u2' }))
    expect(await screen.findByText('Geannuleerd: Wandeling — Bram heeft het afgeblazen.')).toBeInTheDocument()
  })
})

import { screen, waitFor, within } from '@testing-library/react'
import { renderApp, writes } from '../test/render'

describe('Meer tab', () => {
  it('shows the weekend, the join code, info sections, rooms and chores', async () => {
    const { user } = await renderApp({ tab: 'meer' })
    expect(within(screen.getByRole('main')).getByText('Mini Slimbo Testweekend')).toBeInTheDocument()
    expect(screen.getByText('ABC123')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Route/ })).toHaveAttribute('href', expect.stringContaining('maps.google.com'))
    await user.click(screen.getByText('Eten'))
    expect(screen.getByText('• Ontbijt om 9:00')).toBeInTheDocument()
    expect(screen.getByText('jij: Blauwe kamer')).toBeInTheDocument()
    expect(screen.getByText('jij: 1×', { selector: 'h2 span' })).toBeInTheDocument()
  })

  it('keeps a fold open while I switch tabs', async () => {
    const { user } = await renderApp({ tab: 'meer' })
    await user.click(screen.getByText('Parkeren'))
    await user.click(screen.getByRole('button', { name: /Spellen/ }))
    await user.click(screen.getByRole('button', { name: /Meer/ }))
    expect(screen.getByText('Parkeren').closest('details')).toHaveAttribute('open')
  })

  it('saves my name', async () => {
    const { user } = await renderApp({ tab: 'meer' })
    const input = screen.getByDisplayValue('Anna')
    await user.clear(input)
    await user.type(input, 'Anneke')
    await user.click(screen.getAllByRole('button', { name: 'Opslaan' }).at(-1)!)
    expect(await screen.findByText('Naam opgeslagen')).toBeInTheDocument()
    expect(writes().at(-1)).toEqual(['update', 'events/e1/members/u1', { name: 'Anneke' }])
  })
})

describe('Login and leaving', () => {
  it('joins a weekend with its code and lands in the app', async () => {
    const { user } = await renderApp({ signedIn: false })
    await user.type(screen.getByLabelText('Jouw naam'), 'Eva')
    await user.type(screen.getByLabelText('Code van het weekend'), 'abc123')
    await user.click(screen.getByRole('button', { name: 'Meedoen' }))
    expect(await screen.findByRole('navigation')).toBeInTheDocument()
    expect(writes()[0]).toEqual(['set', 'events/e1/members/u1', expect.objectContaining({ name: 'Eva', joinCode: 'ABC123' })])
    expect(localStorage.getItem('app_eventId')).toBe('e1')
  })

  it('an unknown code gives a message and writes nothing', async () => {
    const { user } = await renderApp({ signedIn: false })
    await user.type(screen.getByLabelText('Jouw naam'), 'Eva')
    await user.type(screen.getByLabelText('Code van het weekend'), 'zzz999')
    await user.click(screen.getByRole('button', { name: 'Meedoen' }))
    expect(await screen.findByText('Geen weekend gevonden met code ZZZ999.')).toBeInTheDocument()
    expect(writes()).toEqual([])
  })

  it('asks for name and a full code', async () => {
    const { user } = await renderApp({ signedIn: false })
    await user.click(screen.getByRole('button', { name: 'Meedoen' }))
    expect(screen.getByText('Vul je naam en de code (6 tekens) in.')).toBeInTheDocument()
  })

  it('"Ander weekend" confirms, returns to login and remembers the weekend', async () => {
    const { user } = await renderApp()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    await user.click(screen.getByRole('button', { name: 'Ander weekend' }))
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ander weekend' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Meedoen' })).toBeInTheDocument())
    expect(confirm).toHaveBeenCalledTimes(2)
    const known = within(screen.getByText('Jouw weekenden').closest('.card') as HTMLElement)
    await user.click(known.getByRole('button', { name: 'Mini Slimbo Testweekend' }))
    expect(await screen.findByRole('navigation')).toBeInTheDocument()
  })
})

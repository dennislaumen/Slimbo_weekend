import { screen, waitFor, within } from '@testing-library/react'
import { gameTitles, renderApp, writes } from '../test/render'
import { scenarios } from '../data/fake/scenarios'

const card = (name: string) => screen.getByText(name).closest('.card') as HTMLElement

describe('Spellen tab', () => {
  it('lists every game alphabetically with its owner', async () => {
    await renderApp({ tab: 'spellen' })
    expect(gameTitles()).toEqual(['Azul', 'Brass', 'Catan', 'Party 10'])
    expect(within(card('Catan')).getByText('Neemt mee: Anna')).toBeInTheDocument()
    expect(within(card('Brass')).getByText('Wenslijst · nog niemand neemt het mee')).toBeInTheDocument()
  })

  it('"Gaat mee" and "Wenslijst" exclude each other', async () => {
    const { user } = await renderApp({ tab: 'spellen' })
    await user.click(screen.getByRole('button', { name: 'Gaat mee (3)' }))
    expect(gameTitles()).toEqual(['Azul', 'Catan', 'Party 10'])
    await user.click(screen.getByRole('button', { name: 'Wenslijst (1)' }))
    expect(gameTitles()).toEqual(['Brass'])
    expect(screen.getByRole('button', { name: 'Gaat mee (3)' })).not.toHaveClass('on')
  })

  it('"Neem ik mee" filters on my own games and toggles back', async () => {
    const { user } = await renderApp({ tab: 'spellen' })
    await user.click(screen.getByRole('button', { name: 'Neem ik mee (1)' }))
    expect(gameTitles()).toEqual(['Catan'])
    await user.click(screen.getByRole('button', { name: 'Neem ik mee (1)' }))
    expect(gameTitles()).toHaveLength(4)
  })

  it('the owner filter "Iedereen" hides the wishlist and "Filters wissen" restores it', async () => {
    const { user } = await renderApp({ tab: 'spellen' })
    await user.click(screen.getByRole('button', { name: /^Filters/ }))
    await user.selectOptions(screen.getByLabelText('Wie neemt het mee'), 'Iedereen (meegebracht)')
    expect(gameTitles()).toEqual(['Azul', 'Catan', 'Party 10'])
    expect(screen.getByRole('button', { name: 'Filters (1)' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Filters wissen' }))
    expect(gameTitles()).toHaveLength(4)
  })

  it('"Iedereen" ignores a wishlist game that still has a stale owner', async () => {
    const fixture = scenarios.default!()
    fixture.games.push({ id: 'g9', name: 'Dune', owner: 'Anna', wishlist: true })
    const { user } = await renderApp({ tab: 'spellen', fixture })
    await user.click(screen.getByRole('button', { name: /^Filters/ }))
    await user.selectOptions(screen.getByLabelText('Wie neemt het mee'), 'Iedereen (meegebracht)')
    expect(gameTitles()).toEqual(['Azul', 'Catan', 'Party 10'])
  })

  it('"7+" players keeps only games that seat seven', async () => {
    const { user } = await renderApp({ tab: 'spellen' })
    await user.click(screen.getByRole('button', { name: /^Filters/ }))
    await user.click(screen.getByRole('button', { name: '7+' }))
    expect(gameTitles()).toEqual(['Party 10'])
  })

  it('searching narrows the list and the counter', async () => {
    const { user } = await renderApp({ tab: 'spellen' })
    await user.type(screen.getByPlaceholderText('🔍 Zoek een spel'), 'ca')
    expect(gameTitles()).toEqual(['Catan'])
    expect(screen.getByText(/^1 van 4 spellen/)).toBeInTheDocument()
  })

  it('tapping ♥ shows the heart and the fan list, tapping again removes it', async () => {
    const { user } = await renderApp({ tab: 'spellen' })
    const catan = () => within(card('Catan'))
    await user.click(catan().getByLabelText('Wil ik spelen'))
    await waitFor(() => expect(catan().getByLabelText('Wil ik spelen')).toHaveTextContent('♥'))
    expect(catan().getByText('♥ Anna')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mijn ♥ (2)' })).toBeInTheDocument()
    await user.click(catan().getByLabelText('Wil ik spelen'))
    await waitFor(() => expect(catan().getByLabelText('Wil ik spelen')).toHaveTextContent('♡'))
    expect(writes()).toEqual([
      ['update', 'events/e1/members/u1', { wants: { union: ['g1'] } }],
      ['update', 'events/e1/members/u1', { wants: { remove: ['g1'] } }],
    ])
  })

  it('adding a game puts it in the list, owned by me and on my hearts', async () => {
    const { user } = await renderApp({ tab: 'spellen' })
    await user.click(screen.getByRole('button', { name: '+ Spel' }))
    expect(screen.getByLabelText('Naam')).toHaveFocus()
    await user.type(screen.getByLabelText('Naam'), 'Wingspan')
    await user.clear(screen.getByLabelText('Min. spelers'))
    await user.type(screen.getByLabelText('Min. spelers'), '1')
    await user.click(screen.getByRole('button', { name: 'Opslaan' }))
    await waitFor(() => expect(gameTitles()).toContain('Wingspan'))
    expect(within(card('Wingspan')).getByText('Neemt mee: Anna')).toBeInTheDocument()
    expect(within(card('Wingspan')).getByText('1–4 spelers · 60 min · Middel')).toBeInTheDocument()
    expect(within(card('Wingspan')).getByLabelText('Wil ik spelen')).toHaveTextContent('♥')
    expect(screen.getByText('Wingspan toegevoegd')).toBeInTheDocument()
  })

  it('rejects a duplicate name without writing', async () => {
    const { user } = await renderApp({ tab: 'spellen' })
    await user.click(screen.getByRole('button', { name: '+ Spel' }))
    await user.type(screen.getByLabelText('Naam'), 'catan')
    await user.click(screen.getByRole('button', { name: 'Opslaan' }))
    expect(await screen.findByText('"catan" staat al in de lijst')).toBeInTheDocument()
    expect(writes()).toEqual([])
  })

  it('a wishlist game has no owner, and typing an owner unticks the wishlist', async () => {
    const { user } = await renderApp({ tab: 'spellen' })
    await user.click(screen.getByRole('button', { name: '+ Spel' }))
    await user.type(screen.getByLabelText('Naam'), 'Gloomhaven')
    await user.click(screen.getByLabelText('Wenslijst (niemand neemt het mee)'))
    expect(screen.getByLabelText('Wie neemt het mee')).toHaveValue('')
    await user.type(screen.getByLabelText('Wie neemt het mee'), 'Eva')
    expect(screen.getByLabelText('Wenslijst (niemand neemt het mee)')).not.toBeChecked()
    await user.click(screen.getByLabelText('Wenslijst (niemand neemt het mee)'))
    await user.click(screen.getByRole('button', { name: 'Opslaan' }))
    await waitFor(() => expect(within(card('Gloomhaven')).getByText('Wenslijst · nog niemand neemt het mee')).toBeInTheDocument())
  })

  it('editing a game saves changes; deleting asks for confirmation', async () => {
    const { user } = await renderApp({ tab: 'spellen' })
    await user.click(screen.getByText('Azul'))
    await user.clear(screen.getByLabelText('Naam'))
    await user.type(screen.getByLabelText('Naam'), 'Azul Deluxe')
    await user.click(screen.getByRole('button', { name: 'Opslaan' }))
    await waitFor(() => expect(gameTitles()).toContain('Azul Deluxe'))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByText('Azul Deluxe'))
    await user.click(screen.getByRole('button', { name: 'Spel verwijderen' }))
    await waitFor(() => expect(gameTitles()).not.toContain('Azul Deluxe'))
  })

  it('handles a long list', async () => {
    await renderApp({ tab: 'spellen', fixture: scenarios['many-games']!() })
    expect(gameTitles()).toHaveLength(60)
  })
})

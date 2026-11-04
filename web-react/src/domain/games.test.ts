import { ANYONE, filterGames, NO_FILTERS, type GameFilters } from './games'
import type { Game } from './types'

const catan: Game = { id: '1', name: 'Catan', owner: 'Anna', minPlayers: 3, maxPlayers: 4, weight: 'MIDDEL', category: 'Strategie' }
const azul: Game = { id: '2', name: 'azul', owner: ' bram ', minPlayers: 2, maxPlayers: 4, weight: 'LICHT' }
const brass: Game = { id: '3', name: 'Brass', owner: '', wishlist: true, minPlayers: 2, maxPlayers: 4, weight: 'ZWAAR' }
const dune: Game = { id: '4', name: 'Dune', owner: 'Anna', wishlist: true, maxPlayers: 6 }
const party: Game = { id: '5', name: 'Party 10', owner: 'Bram', maxPlayers: 10 }
const all = [catan, azul, brass, dune, party]
const ids = (f: Partial<GameFilters>, games = all, wants = new Set<string>()) =>
  filterGames(games, { ...NO_FILTERS, ...f }, wants).map((g) => g.id)

describe('filterGames (mirrors the Android filterGames tests)', () => {
  it('sorts case-insensitively without filters', () => expect(ids({})).toEqual(['2', '3', '1', '4', '5']))
  it('"Iedereen" keeps only brought games', () => expect(ids({ owner: ANYONE })).toEqual(['2', '1', '5']))
  it('matches owners trimmed and case-insensitively', () => expect(ids({ owner: 'BRAM' })).toEqual(['2', '5']))
  it('going and wishlist are disjoint', () => {
    expect(ids({ going: true })).toEqual(['2', '1', '5'])
    expect(ids({ wishlist: true })).toEqual(['3', '4'])
  })
  it('player counts, including the 7+ boundary', () => {
    expect(ids({ players: 2 })).toEqual(['2', '3', '4', '5'])
    expect(ids({ players: 7 })).toEqual(['5'])
    expect(ids({ players: 3 }, [catan, azul])).toEqual(['2', '1'])
  })
  it('a missing category counts as Overig', () => {
    expect(ids({ category: 'Strategie' })).toEqual(['1'])
    expect(ids({ category: 'Overig' })).toEqual(['2', '3', '4', '5'])
  })
  it('combines query, weights and hearts', () => {
    expect(ids({ weights: ['ZWAAR'] })).toEqual(['3'])
    expect(ids({ query: 'AZ' })).toEqual(['2'])
    expect(ids({ onlyWanted: true, owner: ANYONE }, all, new Set(['5', '3']))).toEqual(['5'])
  })
})

import type { Game, Weight } from './types'

/** Owner-filter value meaning "every game somebody brings" (as opposed to "" = no filter). */
export const ANYONE = '*'

export interface GameFilters {
  query: string
  onlyWanted: boolean
  going: boolean
  wishlist: boolean
  players: number
  weights: Weight[]
  category: string
  owner: string
}

export const NO_FILTERS: GameFilters = {
  query: '', onlyWanted: false, going: false, wishlist: false, players: 0, weights: [], category: '', owner: '',
}

const norm = (s: string | undefined) => (s ?? '').trim().toLowerCase()

/** Somebody brings it: not on the wishlist and has an owner. */
export const isBrought = (g: Game) => !g.wishlist && Boolean(g.owner)

export const sameName = (a: string | undefined, b: string | undefined) => norm(a) === norm(b)

export function filterGames(games: Game[], f: GameFilters, wants: ReadonlySet<string>): Game[] {
  const q = f.query.toLowerCase()
  return games
    .filter((g) => !q || g.name.toLowerCase().includes(q))
    .filter((g) => !f.onlyWanted || wants.has(g.id))
    .filter((g) => !f.going || !g.wishlist)
    .filter((g) => !f.wishlist || g.wishlist)
    .filter((g) => !f.players || (f.players >= 7 ? (g.maxPlayers ?? 0) >= 7 : f.players >= (g.minPlayers ?? 0) && f.players <= (g.maxPlayers ?? 99)))
    .filter((g) => !f.weights.length || (g.weight !== undefined && f.weights.includes(g.weight)))
    .filter((g) => !f.category || (g.category || 'Overig') === f.category)
    .filter((g) => !f.owner || (f.owner === ANYONE ? isBrought(g) : sameName(g.owner, f.owner)))
    .sort((a, b) => a.name.localeCompare(b.name, 'nl'))
}

export function filterCount(f: GameFilters): number {
  return (f.players ? 1 : 0) + (f.weights.length ? 1 : 0) + (f.category ? 1 : 0) + (f.owner ? 1 : 0)
}

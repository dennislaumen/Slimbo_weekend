import base from '../../../e2e/fixture.json'

export type Row = Record<string, unknown> & { id: string }
export interface Fixture {
  event: Record<string, unknown>
  members: Row[]
  games: Row[]
  places: Row[]
  tables: Row[]
  activities: Row[]
  rooms: Row[]
  guests: Row[]
  chores: Row[]
}

export const EVENT_ID = 'e1'
export const defaultFixture = base as unknown as Fixture

const CATEGORIES = ['Strategie', 'Familie', 'Party', 'Kaartspel', 'Abstract', '']
const OWNERS = ['Anna', 'Bram', 'Cleo', 'Dirk']

/** Named data sets for `npm run dev:fake` (?scenario=name) and tests. */
export const scenarios: Record<string, () => Fixture> = {
  default: () => structuredClone(defaultFixture),
  empty: () => ({ ...structuredClone(defaultFixture), games: [], activities: [], rooms: [], guests: [], chores: [] }),
  'many-games': () => ({
    ...structuredClone(defaultFixture),
    games: Array.from({ length: 60 }, (_, i): Row => ({
      id: `m${i}`, name: `Spel ${String(i + 1).padStart(2, '0')}`, owner: i % 5 === 4 ? '' : OWNERS[i % OWNERS.length]!, wishlist: i % 5 === 4,
      minPlayers: 1 + (i % 3), maxPlayers: 3 + (i % 6), durationMin: 30 + (i % 4) * 30, weight: (['LICHT', 'MIDDEL', 'ZWAAR'] as const)[i % 3],
      category: CATEGORIES[i % CATEGORIES.length],
    })),
  }),
  'busy-day': () => {
    const now = Date.now()
    const f = structuredClone(defaultFixture)
    f.activities = [
      { id: 'b1', type: 'ETEN', title: 'Lunch', startAt: now - 10 * 60_000, durationMin: 60, status: 'GEPLAND', placeId: 'p1' },
      { id: 'b2', type: 'ANDERS', title: 'Borrel', startAt: now + 60 * 60_000, durationMin: 90, status: 'GEPLAND', placeId: 'p2' },
      { id: 'b3', type: 'WANDELEN', title: 'Wandeling', startAt: now + 25 * 3_600_000, durationMin: 60, status: 'GEPLAND' },
      { id: 'b4', type: 'ETEN', title: 'Ontbijt', startAt: now - 3 * 3_600_000, durationMin: 45, status: 'AFGEROND' },
    ]
    return f
  },
}

export const scenarioNames = Object.keys(scenarios)

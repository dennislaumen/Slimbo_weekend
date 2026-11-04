/**
 * In-memory stand-in for firebase/firestore, used when VITE_FAKE=1 and in Vitest (see vite.config.ts).
 * It keeps state: writes change the data and re-fire snapshots, like the real thing. Every write is
 * also logged on window.__writes so tests can assert exactly what the app sends.
 */
import { defaultFixture, EVENT_ID, scenarioNames, scenarios, type Fixture } from './scenarios'
import { openScenarioFromUrl, scenarioFromUrl } from './session'

type Data = Record<string, unknown>
type Ref = { kind: 'doc' | 'col'; path: string; id: string; name: string }
type Op = { union: unknown[] } | { remove: unknown[] }

declare global {
  interface Window {
    __writes?: unknown[][]
  }
}

const docs = new Map<string, Data>()
const listeners = new Set<() => void>()
let nextId = 1
const COLLECTIONS = ['members', 'games', 'places', 'tables', 'activities', 'rooms', 'guests', 'chores'] as const

const notify = () => [...listeners].forEach((run) => run())
const log = (op: string, path: string, data?: unknown) => {
  ;(window.__writes ??= []).push([op, path, data])
}

/** Replaces all data with a fixture. Tests call this before rendering. */
export function resetFake(fixture: Fixture = defaultFixture) {
  docs.clear()
  nextId = 1
  window.__writes = []
  docs.set(`events/${EVENT_ID}`, { ...fixture.event })
  for (const name of COLLECTIONS) for (const { id, ...rest } of fixture[name]) docs.set(`events/${EVENT_ID}/${name}/${id}`, rest)
  docs.set(`joinCodes/${String(fixture.event.joinCode)}`, { eventId: EVENT_ID })
  notify()
}

const isUnion = (v: unknown): v is { union: unknown[] } => typeof v === 'object' && v !== null && 'union' in v
const isRemove = (v: unknown): v is { remove: unknown[] } => typeof v === 'object' && v !== null && 'remove' in v
const merge = (cur: Data, patch: Data): Data => {
  const out = { ...cur }
  for (const [k, v] of Object.entries(patch)) {
    const list = Array.isArray(out[k]) ? (out[k] as unknown[]) : []
    out[k] = isUnion(v) ? [...new Set([...list, ...v.union])] : isRemove(v) ? list.filter((x) => !v.remove.includes(x)) : v
  }
  return out
}

const snapshotOf = (path: string) => {
  const ref = { kind: 'doc', path, id: path.split('/').at(-1)!, name: path.split('/')[2] ?? '' } satisfies Ref
  return { exists: () => docs.has(path), id: ref.id, ref, data: () => ({ ...docs.get(path) }) }
}
const childPaths = (col: string) =>
  [...docs.keys()].filter((p) => p.startsWith(col + '/') && !p.slice(col.length + 1).includes('/'))
const collectionSnapshot = (col: string) => {
  const list = childPaths(col).map(snapshotOf)
  return { docs: list, empty: list.length === 0 }
}

export const getFirestore = () => ({})
export const collection = (_db: unknown, ...p: string[]): Ref => ({ kind: 'col', path: p.join('/'), id: '', name: p[2] ?? '' })
export const doc = (_db: unknown, ...p: string[]): Ref => ({ kind: 'doc', path: p.join('/'), id: p.at(-1) ?? '', name: p[2] ?? '' })

export const onSnapshot = (ref: Ref, cb: (snap: never) => void) => {
  const run = () => cb((ref.kind === 'doc' ? snapshotOf(ref.path) : collectionSnapshot(ref.path)) as never)
  listeners.add(run)
  run()
  return () => void listeners.delete(run)
}
export const getDoc = async (ref: Ref) => snapshotOf(ref.path)
export const getDocs = async (ref: Ref) => collectionSnapshot(ref.path)

export const setDoc = async (ref: Ref, data: Data, options?: { merge?: boolean }) => {
  log('set', ref.path, data)
  docs.set(ref.path, merge(options?.merge ? (docs.get(ref.path) ?? {}) : {}, data))
  notify()
}
export const updateDoc = async (ref: Ref, data: Data) => {
  log('update', ref.path, data)
  const cur = docs.get(ref.path)
  if (!cur) throw new Error(`No document to update: ${ref.path}`)
  docs.set(ref.path, merge(cur, data))
  notify()
}
export const deleteDoc = async (ref: Ref) => {
  log('delete', ref.path)
  docs.delete(ref.path)
  notify()
}
export const addDoc = async (ref: Ref, data: Data) => {
  log('add', ref.path, data)
  const id = `new${nextId++}`
  docs.set(`${ref.path}/${id}`, merge({}, data))
  notify()
  return { id, path: `${ref.path}/${id}` }
}
export const writeBatch = () => {
  const ops: Array<[string, string, Data | undefined, boolean?]> = []
  const add = (op: string) => (ref: Ref, data?: Data) => void ops.push([op, ref.path, data])
  return {
    set: (ref: Ref, data: Data, options?: { merge?: boolean }) => void ops.push(['set', ref.path, data, options?.merge]),
    update: add('update'), delete: add('delete'),
    async commit() {
      log('batch', '', ops.map(([op, path, data]) => [op, path, data]))
      // Like Firestore, a batch is atomic: updating a missing document rejects the whole commit
      const missing = ops.find(([op, path]) => op === 'update' && !docs.has(path))
      if (missing) throw new Error(`No document to update: ${missing[1]}`)
      for (const [op, path, data, merged] of ops) {
        if (op === 'delete') docs.delete(path)
        else docs.set(path, merge(op === 'update' || merged ? (docs.get(path) ?? {}) : {}, data ?? {}))
      }
      notify()
    },
  }
}
export const query = (r: Ref) => r
export const where = () => 0
export const limit = () => 0
export const arrayUnion = (...v: unknown[]): Op => ({ union: v })
export const arrayRemove = (...v: unknown[]): Op => ({ remove: v })

// Boot data: ?scenario=name picks a data set; otherwise the default fixture.
const requested = scenarioFromUrl()
const make = scenarios[requested && scenarioNames.includes(requested) ? requested : 'default']!
resetFake(make())
openScenarioFromUrl()
export const connectFirestoreEmulator = () => {}

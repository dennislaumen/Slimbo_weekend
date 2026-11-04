/**
 * In-memory stand-in for firebase/firestore, used when VITE_FAKE=1 (see vite.config.ts).
 * Serves fixed fixtures and records every write on window.__writes so tests can
 * assert what the app sends. The legacy app's test stub behaves the same way.
 */
import fixture from '../../../e2e/fixture.json'

type Ref = { kind: 'doc' | 'col'; path: string; name: string }
type Data = Record<string, unknown>
const D = fixture as unknown as Record<string, unknown>

declare global {
  interface Window {
    __writes?: unknown[][]
  }
}
const log = (op: string, ref: Ref, data?: unknown) => {
  ;(window.__writes ??= []).push([op, ref.path, data])
}
const idle = async () => ({ exists: () => false, docs: [], empty: true, data: () => ({}) })

export const getFirestore = () => ({})
export const collection = (_db: unknown, ...p: string[]): Ref => ({ kind: 'col', path: p.join('/'), name: p[2] ?? '' })
export const doc = (_db: unknown, ...p: string[]): Ref => ({ kind: 'doc', path: p.join('/'), name: p[2] ?? '' })
export const onSnapshot = (ref: Ref, cb: (snap: unknown) => void) => {
  if (ref.kind === 'doc' && ref.path === 'events/e1') cb({ exists: () => true, id: 'e1', data: () => D.event })
  else if (ref.kind === 'col') {
    const rows = (D[ref.name] as Array<Data & { id: string }> | undefined) ?? []
    cb({ docs: rows.map(({ id, ...rest }) => ({ id, data: () => rest })) })
  }
  return () => {}
}
export const getDoc = idle
export const getDocs = idle
export const setDoc = async (ref: Ref, data: unknown) => log('set', ref, data)
export const updateDoc = async (ref: Ref, data: unknown) => log('update', ref, data)
export const deleteDoc = async (ref: Ref) => log('delete', ref)
export const addDoc = async (ref: Ref, data: unknown) => {
  log('add', ref, data)
  return { id: 'new1', path: `${ref.path}/new1` }
}
export const query = (r: Ref) => r
export const where = () => 0
export const limit = () => 0
export const arrayUnion = (...v: unknown[]) => ({ union: v })
export const arrayRemove = (...v: unknown[]) => ({ remove: v })
export const writeBatch = () => {
  const ops: unknown[][] = []
  const add = (op: string) => (ref: Ref, data?: unknown) => void ops.push([op, ref.path, data])
  return { set: add('set'), update: add('update'), delete: add('delete'), commit: async () => void log('batch', { kind: 'doc', path: '', name: '' }, ops) }
}

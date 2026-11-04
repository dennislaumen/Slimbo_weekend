import {
  addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore'
import type { Activity, ActivityStatus, Game, Guest } from '../domain/types'
import { db } from './firebase'

type Fields = Record<string, unknown>

/** Every write the app performs, bound to one weekend and user (same writes as the Android app). */
export function createActions(eventId: string, uid: string) {
  const col = (n: string) => collection(db, 'events', eventId, n)
  const ref = (n: string, id: string) => doc(db, 'events', eventId, n, id)
  const stamp = () => ({ updatedBy: uid, updatedAt: Date.now() })

  return {
    setStatus: (status: string, note: string | undefined) =>
      updateDoc(ref('members', uid), { status, statusNote: (note ?? '').trim(), updatedAt: Date.now() }),
    setName: (name: string) => updateDoc(ref('members', uid), { name: name.trim() }),
    setWant: (gameId: string, want: boolean) =>
      updateDoc(ref('members', uid), { wants: want ? arrayUnion(gameId) : arrayRemove(gameId) }),
    clearGuest: () => updateDoc(ref('members', uid), { guestId: '' }),

    removeActivity: (a: Activity) => deleteDoc(ref('activities', a.id)),
    async setActivityStatus(a: Activity, status: ActivityStatus) {
      const b = writeBatch(db)
      b.update(ref('activities', a.id), { status, ...stamp() })
      await b.commit()
    },
    async saveActivity(a: Activity, isNew: boolean) {
      const base = {
        type: a.type, title: a.title, gameId: '', placeId: a.placeId || '', tableId: a.tableId || '',
        startAt: a.startAt, durationMin: a.durationMin, maxParticipants: 0,
        participants: [], invited: [], declined: [], notes: a.notes || '', reminderSent: !!a.reminderSent, ...stamp(),
      }
      if (isNew) await addDoc(col('activities'), { ...base, createdBy: uid, status: 'GEPLAND' })
      else await setDoc(ref('activities', a.id), base, { merge: true })
    },

    async addGame(data: Fields) {
      const r = await addDoc(col('games'), { ...data, interested: [], video: '', categories: [], addedBy: uid, addedAt: Date.now() })
      // Whoever adds a game probably wants to play it too
      await updateDoc(ref('members', uid), { wants: arrayUnion(r.id) })
    },
    saveGame: (g: Game, data: Fields) => setDoc(ref('games', g.id), data, { merge: true }),
    removeGame: (g: Game) => deleteDoc(ref('games', g.id)),

    async claimGuest(g: Guest, previousGuestId: string | undefined) {
      const b = writeBatch(db)
      const m = ref('members', uid)
      b.set(m, { guestId: g.id, name: g.name, hidden: false, replacedBy: '', updatedAt: Date.now() }, { merge: true })
      b.update(ref('guests', g.id), { claimedBy: uid })
      if (previousGuestId && previousGuestId !== g.id) b.update(ref('guests', previousGuestId), { claimedBy: '' })
      if (g.claimedBy && g.claimedBy !== uid) {
        const old = await getDoc(ref('members', g.claimedBy))
        if (old.exists()) {
          const w = (old.data().wants as string[] | undefined) ?? []
          if (w.length) b.update(m, { wants: arrayUnion(...w) })
          b.update(old.ref, { hidden: true, replacedBy: uid, guestId: '' })
        }
      }
      await b.commit()
    },

    presence(opened: boolean, extra: Fields) {
      return setDoc(ref('members', uid), { ...extra, lastSeenAt: Date.now(), ...(opened ? { lastOpenedAt: Date.now() } : {}) }, { merge: true })
    },
  }
}
export type Actions = ReturnType<typeof createActions>

/** Looks a weekend up by join code and joins it. Throws a Dutch message when the code is unknown. */
export async function joinWithCode(uid: string, name: string, code: string): Promise<string> {
  const found = await getDoc(doc(db, 'joinCodes', code))
  if (!found.exists()) throw new Error(`Geen weekend gevonden met code ${code}.`)
  const id = (found.data() as { eventId: string }).eventId
  await setDoc(
    doc(db, 'events', id, 'members', uid),
    { name, joinCode: code, status: 'BESCHIKBAAR', updatedAt: Date.now(), platform: 'webapp' },
    { merge: true },
  )
  return id
}

export const openKnownEvent = async (uid: string, id: string) => {
  const m = await getDoc(doc(db, 'events', id, 'members', uid))
  if (!m.exists()) throw new Error('niet aangemeld')
}

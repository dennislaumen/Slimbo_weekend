import type { Chore, Guest, Member, Room } from './types'

export const visibleMembers = (members: Member[]) => members.filter((m) => !m.web && !m.hidden)

/** Name shown for the signed-in member: the claimed guest name wins. */
export const displayName = (me: Member | undefined, guests: Guest[]) =>
  guests.find((g) => g.id === me?.guestId)?.name || me?.name || ''

export const roomOf = (guest: Guest | undefined, rooms: Room[]) => rooms.find((r) => r.id === guest?.roomId)

export const choresOf = (name: string | undefined, chores: Chore[]) =>
  chores.filter((c) => (c.names ?? []).includes(name ?? '')).sort((a, b) => (a.startAt ?? 0) - (b.startAt ?? 0))

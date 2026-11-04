/**
 * Firestore documents as the web app reads them. Every field except `id` may be
 * missing in the database, so the types are optional; see docs/schema.md.
 */

export type MemberStatus = 'BESCHIKBAAR' | 'RESERVEERBAAR' | 'BEZET'
export type ActivityType = 'SPEL' | 'ETEN' | 'WANDELEN' | 'ANDERS'
export type ActivityStatus = 'GEPLAND' | 'GESTART' | 'AFGEROND' | 'GEANNULEERD'
export type Weight = 'LICHT' | 'MIDDEL' | 'ZWAAR'

export interface InfoSection {
  title: string
  items?: string[]
}

export interface WeekendEvent {
  id: string
  name?: string
  joinCode?: string
  venue?: string
  address?: string
  phone?: string
  checkInAt?: number
  checkOutAt?: number
  info?: InfoSection[]
}

export interface Member {
  id: string
  name?: string
  status?: MemberStatus
  statusNote?: string
  wants?: string[]
  guestId?: string
  hidden?: boolean
  web?: boolean
}

export interface Game {
  id: string
  name: string
  owner?: string
  wishlist?: boolean
  minPlayers?: number
  maxPlayers?: number
  durationMin?: number
  weight?: Weight
  category?: string
  link?: string
  notes?: string
  infoChecked?: boolean
}

export interface Place {
  id: string
  name: string
}

export interface GameTable {
  id: string
  name: string
  placeId?: string
  seats?: number
}

export interface Activity {
  id: string
  type?: ActivityType
  title?: string
  startAt: number
  durationMin?: number
  status?: ActivityStatus
  placeId?: string
  tableId?: string
  notes?: string
  reminderSent?: boolean
  updatedBy?: string
}

export interface Room {
  id: string
  placeId: string
  floor: number
  name: string
  beds: number
  occupants?: string[]
}

export interface Guest {
  id: string
  name: string
  roomId?: string
  claimedBy?: string
}

export interface Chore {
  id: string
  placeId: string
  day: string
  slot: string
  startAt?: number
  endAt?: number
  names?: string[]
}

/** Everything a weekend consists of, as delivered by live subscriptions. */
export interface WeekendData {
  event: WeekendEvent | null
  members: Member[]
  games: Game[]
  places: Place[]
  tables: GameTable[]
  activities: Activity[]
  rooms: Room[]
  guests: Guest[]
  chores: Chore[]
}

export type CollectionName = Exclude<keyof WeekendData, 'event'>

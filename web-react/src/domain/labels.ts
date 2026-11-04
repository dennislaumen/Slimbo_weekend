import type { ActivityStatus, ActivityType, MemberStatus, Weight } from './types'

export const STATUS: Record<MemberStatus, { label: string; color: string; hint: string }> = {
  BESCHIKBAAR: { label: 'Beschikbaar', color: 'var(--green)', hint: 'Je kunt direct aanschuiven.' },
  RESERVEERBAAR: { label: 'Reserveerbaar', color: 'var(--amber)', hint: 'Je bent vrij, maar wilt eerst gevraagd worden.' },
  BEZET: { label: 'Bezet', color: 'var(--red)', hint: 'Je zit in een spel of bent even weg.' },
}

export const TYPES: Record<ActivityType, { label: string; icon: string }> = {
  SPEL: { label: 'Spel', icon: '🎲' },
  ETEN: { label: 'Eten', icon: '🍽️' },
  WANDELEN: { label: 'Wandelen', icon: '🚶' },
  ANDERS: { label: 'Anders', icon: '🎉' },
}

export const ACTIVITY_STATUS_LABEL: Record<ActivityStatus, string> = {
  GEPLAND: 'Gepland',
  GESTART: 'Bezig',
  AFGEROND: 'Afgerond',
  GEANNULEERD: 'Geannuleerd',
}

export const WEIGHTS: Record<Weight, string> = { LICHT: 'Licht', MIDDEL: 'Middel', ZWAAR: 'Zwaar' }

export const CATEGORIES = [
  'Strategie', 'Familie', 'Party', 'Thematisch', 'Kaartspel', 'Abstract', 'Coöperatief', 'Kinderen', 'Oorlog', 'Overig',
] as const

/** Spellen zijn geen planbare activiteit. */
export const PLAN_TYPES = ['ETEN', 'WANDELEN', 'ANDERS'] as const satisfies readonly ActivityType[]

export const DEFAULT_TITLE: Partial<Record<ActivityType, string>> = { ETEN: 'Eten', WANDELEN: 'Wandeling' }

export const typeOf = (type: ActivityType | undefined) => TYPES[type ?? 'ANDERS'] ?? TYPES.ANDERS
export const statusOf = (status: MemberStatus | undefined) => STATUS[status ?? 'BESCHIKBAAR'] ?? STATUS.BESCHIKBAAR

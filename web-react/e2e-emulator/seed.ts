/** Seeds the Firestore emulator through its REST API with admin rights ("Bearer owner" bypasses the rules). */
const ROOT = 'http://127.0.0.1:8080'
const DOCS = `${ROOT}/v1/projects/demo-e2e/databases/(default)/documents`

type Value = string | number | boolean | Value[] | { [k: string]: Value }
const toValue = (v: Value): object =>
  typeof v === 'string' ? { stringValue: v }
  : typeof v === 'number' ? { integerValue: String(v) }
  : typeof v === 'boolean' ? { booleanValue: v }
  : Array.isArray(v) ? { arrayValue: { values: v.map(toValue) } }
  : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } }

async function put(path: string, data: Record<string, Value>) {
  const res = await fetch(`${DOCS}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toValue(v)])) }),
  })
  if (!res.ok) throw new Error(`seed ${path}: ${res.status} ${await res.text()}`)
}

/** Wipes the emulator and creates weekend e1 (join code ABC123) with one game and one existing member. */
export async function seedWeekend() {
  await fetch(`${ROOT}/emulator/v1/projects/demo-e2e/databases/(default)/documents`, { method: 'DELETE' })
  await put('events/e1', { name: 'Emulator weekend', joinCode: 'ABC123', createdBy: 'seed' })
  await put('joinCodes/ABC123', { eventId: 'e1' })
  await put('events/e1/members/seed', { name: 'Seed', status: 'BESCHIKBAAR' })
  await put('events/e1/games/g1', { name: 'Catan', owner: 'Seed', minPlayers: 3, maxPlayers: 4, durationMin: 90, weight: 'MIDDEL' })
}

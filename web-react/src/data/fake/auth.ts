import { uidFromUrl } from './session'

export const getAuth = () => ({})
export const signInAnonymously = async () => undefined
export const onAuthStateChanged = (_auth: unknown, cb: (u: { uid: string }) => void) => {
  const t = setTimeout(() => cb({ uid: uidFromUrl() }), 0)
  return () => clearTimeout(t)
}
export const connectAuthEmulator = () => {}

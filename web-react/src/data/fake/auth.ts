export const getAuth = () => ({})
export const signInAnonymously = async () => undefined
export const onAuthStateChanged = (_auth: unknown, cb: (u: { uid: string }) => void) => {
  setTimeout(() => cb({ uid: 'u1' }), 0)
  return () => {}
}

import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { auth } from './firebase'

export type AuthState = { uid: string } | { uid: null; error?: string }

/** Anonymous Firebase sign-in; resolves to the uid, or an error message. */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ uid: null })
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        if (u) setState({ uid: u.uid })
        else signInAnonymously(auth).catch((e: Error) => setState({ uid: null, error: e.message }))
      }),
    [],
  )
  return state
}

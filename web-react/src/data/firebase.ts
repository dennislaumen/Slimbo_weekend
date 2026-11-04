import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

declare global {
  interface Window {
    /** Written to config.js by the deploy workflow from the GOOGLE_SERVICES_JSON secret. */
    FIREBASE_CONFIG?: Record<string, string>
  }
}

/** `vite build --mode emulator` (e2e-emulator tests): real Firebase SDK and real rules, against the local emulators. */
const emulator = import.meta.env.MODE === 'emulator'
/** Running on the in-memory fake (Vitest, build:fake). */
export const isFake = import.meta.env.VITE_FAKE === '1'
const config = emulator ? { apiKey: 'demo', projectId: 'demo-e2e', authDomain: 'demo-e2e.firebaseapp.com' } : window.FIREBASE_CONFIG
export const isConfigured = isFake || Boolean(config?.apiKey)

const app = initializeApp(config ?? {})
export const auth = getAuth(app)
export const db = getFirestore(app)
if (emulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

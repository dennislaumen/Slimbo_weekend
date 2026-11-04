import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

declare global {
  interface Window {
    /** Written to config.js by the deploy workflow from the GOOGLE_SERVICES_JSON secret. */
    FIREBASE_CONFIG?: Record<string, string>
  }
}

const config = window.FIREBASE_CONFIG
export const isConfigured = import.meta.env.VITE_FAKE === '1' || Boolean(config?.apiKey)

const app = initializeApp(config ?? {})
export const auth = getAuth(app)
export const db = getFirestore(app)

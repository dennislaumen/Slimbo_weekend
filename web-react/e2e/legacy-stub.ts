import type { Page } from '@playwright/test'
import fixture from './fixture.json' with { type: 'json' }

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/'

/** Replaces Firebase in the legacy app with the shared fixture, so both apps render the same data. */
export async function stubLegacyFirebase(page: Page) {
  const firestore = `const D = ${JSON.stringify(fixture)};
    const noop = async () => ({ exists: () => false, docs: [], data: () => ({}) });
    export const getFirestore = () => ({});
    export const collection = (db, ...p) => ({ doc: false, name: p[2] });
    export const doc = (db, ...p) => ({ doc: true, name: p[2], path: p.join("/") });
    export const onSnapshot = (ref, cb) => {
      if (ref.doc && !ref.name) cb({ exists: () => true, id: "e1", data: () => D.event });
      else if (!ref.doc) cb({ docs: (D[ref.name] || []).map(({ id, ...r }) => ({ id, data: () => r })) });
      return () => {};
    };
    export const getDoc = noop, getDocs = noop, setDoc = noop, addDoc = noop, updateDoc = noop, deleteDoc = noop;
    export const query = (r) => r, where = () => 0, limit = () => 0, arrayUnion = () => 0, arrayRemove = () => 0;
    export const writeBatch = () => ({ set() {}, update() {}, delete() {}, commit: noop });`
  const stubs: Record<string, string> = {
    'firebase-app.js': 'export const initializeApp = () => ({});',
    'firebase-auth.js': `export const getAuth = () => ({}); export const signInAnonymously = async () => {};
      export const onAuthStateChanged = (a, cb) => setTimeout(() => cb({ uid: "u1" }), 0);`,
    'firebase-firestore.js': firestore,
  }
  await page.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.FIREBASE_CONFIG={apiKey:"x",projectId:"p"};' }))
  await page.route(FB + '*', (r) => r.fulfill({ contentType: 'text/javascript', body: stubs[r.request().url().slice(FB.length)] ?? '' }))
}

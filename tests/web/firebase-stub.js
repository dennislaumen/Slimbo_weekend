// Vaste testdata en vervangende Firebase-modules, gedeeld door de rooktest en de dev-server.
const DATA = {
  event: { name: "Testweekend", joinCode: "1234" },
  members: [{ id: "u1", name: "Anna", status: "BESCHIKBAAR", wants: [] }],
  games: [
    { id: "g1", name: "Catan", owner: "Anna", minPlayers: 3, maxPlayers: 4, weight: "MIDDEL" },
    { id: "g2", name: "Azul", owner: "Bram", minPlayers: 2, maxPlayers: 4, weight: "LICHT" },
    { id: "g3", name: "Brass", owner: "", wishlist: true, minPlayers: 2, maxPlayers: 4, weight: "ZWAAR" },
  ],
};

const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
const stubs = {
  "firebase-app.js": `export const initializeApp = () => ({});`,
  "firebase-auth.js": `export const getAuth = () => ({});
    export const signInAnonymously = async () => {};
    export const onAuthStateChanged = (a, cb) => setTimeout(() => cb({ uid: "u1" }), 0);`,
  "firebase-firestore.js": `const D = ${JSON.stringify(DATA)};
    const noop = async () => ({ exists: () => false, docs: [], data: () => ({}) });
    export const getFirestore = () => ({});
    export const collection = (db, ...p) => ({ doc: false, name: p[2] });
    export const doc = (db, ...p) => ({ doc: true, name: p[2], path: p.join("/") });
    export const onSnapshot = (ref, cb) => {
      if (ref.doc && !ref.name) cb({ exists: () => true, id: "e1", data: () => D.event });
      else if (ref.doc) cb({ exists: () => true, id: "x", data: () => ({}) });
      else cb({ docs: (D[ref.name] || []).map(({ id, ...r }) => ({ id, data: () => r })) });
      return () => {};
    };
    const log = (op, r, d) => { (window.__writes = window.__writes || []).push([op, r.path || r.name, d]); };
    export const getDoc = async () => ({ exists: () => false, data: () => ({}) });
    export const getDocs = noop;
    export const setDoc = async (r, d) => log("set", r, d);
    export const updateDoc = async (r, d) => log("update", r, d);
    export const deleteDoc = async (r) => log("delete", r);
    export const addDoc = async (r, d) => { log("add", r, d); return { id: "new1", path: r.name + "/new1" }; };
    export const query = (r) => r, where = () => 0, limit = () => 0, arrayUnion = (...v) => ({ union: v }), arrayRemove = (...v) => ({ remove: v });
    export const writeBatch = () => ({ set() {}, update() {}, delete() {}, commit: noop });`,
};

module.exports = { DATA, FB, stubs };

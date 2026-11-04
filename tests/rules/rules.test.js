// Test de Firestore-regels tegen de emulator: wat mag een buitenstaander of lid wel/niet?
const { test, before, after, beforeEach } = require("node:test");
const { initializeTestEnvironment, assertFails, assertSucceeds } = require("@firebase/rules-unit-testing");
const { doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc, collection, query, where } = require("firebase/firestore");
const fs = require("fs");
const assert = require("node:assert");

let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-rules", firestore: { rules: fs.readFileSync("../../firestore.rules", "utf8") } });
});
after(() => env.cleanup());

// Weekend "e1" met code ABC123; Anna is lid en maakte het aan
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "events/e1"), { name: "Weekend", joinCode: "ABC123", createdBy: "anna" });
    await setDoc(doc(db, "joinCodes/ABC123"), { eventId: "e1" });
    await setDoc(doc(db, "events/e1/members/anna"), { name: "Anna" });
    await setDoc(doc(db, "events/e1/members/bram"), { name: "Bram" });
    await setDoc(doc(db, "events/e1/games/g1"), { name: "Catan" });
  });
});
const as = (uid) => env.authenticatedContext(uid).firestore();

test("niet ingelogd: niets", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "events/e1")));
  await assertFails(getDoc(doc(db, "events/e1/games/g1")));
});

test("buitenstaander kan geen weekenden of codes lijsten, en een weekend niet lezen", async () => {
  await assertFails(getDocs(collection(as("eve"), "events")));
  await assertFails(getDocs(collection(as("eve"), "joinCodes")));
  await assertFails(getDoc(doc(as("eve"), "events/e1")));
});

test("een code opzoeken kan alleen als je hem kent", async () => {
  await assertSucceeds(getDoc(doc(as("eve"), "joinCodes/ABC123")));
});

test("alleen de maker kan een code voor een weekend aanmaken", async () => {
  await assertFails(setDoc(doc(as("eve"), "joinCodes/EVIL22"), { eventId: "e1" }));
  await assertSucceeds(setDoc(doc(as("anna"), "joinCodes/NEW222"), { eventId: "e1" }));
  await assertFails(setDoc(doc(as("anna"), "joinCodes/ABC123"), { eventId: "e1" })); // overschrijven kan niet
});

test("buitenstaander kan zich niet zonder code als lid toevoegen", async () => {
  const db = as("eve");
  await assertFails(setDoc(doc(db, "events/e1/members/eve"), { name: "Eve" }));
});

test("buitenstaander kan met de juiste code wel meedoen", async () => {
  const db = as("eve");
  await assertSucceeds(setDoc(doc(db, "events/e1/members/eve"), { name: "Eve", joinCode: "ABC123" }));
  await assertSucceeds(getDoc(doc(db, "events/e1/games/g1")));
});

test("buitenstaander kan met een verkeerde code niet meedoen", async () => {
  await assertFails(setDoc(doc(as("eve"), "events/e1/members/eve"), { name: "Eve", joinCode: "ZZZZZZ" }));
});

test("een lid kan het weekend niet verwijderen of de code wijzigen", async () => {
  await assertFails(deleteDoc(doc(as("bram"), "events/e1")));
  await assertFails(updateDoc(doc(as("bram"), "events/e1"), { joinCode: "HACKED" }));
  await assertFails(updateDoc(doc(as("bram"), "events/e1"), { createdBy: "bram" }));
  await assertSucceeds(updateDoc(doc(as("bram"), "events/e1"), { name: "Nieuwe naam" }));
});

test("de maker kan het weekend wel verwijderen", async () => {
  await assertSucceeds(deleteDoc(doc(as("anna"), "events/e1")));
});

test("een lid kan het profiel van een ander lid niet overschrijven", async () => {
  await assertFails(updateDoc(doc(as("bram"), "events/e1/members/anna"), { name: "Gehackt" }));
});

test("een lid kan de status van een ander lid wel bijwerken, maar de naam niet", async () => {
  await assertSucceeds(updateDoc(doc(as("bram"), "events/e1/members/anna"), { status: "BEZET" }));
});

test("de maker kan zelf een weekend aanmaken en meedoen zonder code", async () => {
  const db = as("zoe");
  await assertSucceeds(setDoc(doc(db, "events/e2"), { name: "Nieuw", createdBy: "zoe" }));
  await assertSucceeds(setDoc(doc(db, "events/e2/members/zoe"), { name: "Zoe" }));
  await assertSucceeds(setDoc(doc(db, "joinCodes/ZZZ222"), { eventId: "e2" }));
  await assertFails(setDoc(doc(as("eve"), "events/e3"), { name: "x", createdBy: "someone-else" }));
});

test("een lid kan wel spellen toevoegen en de eigen status zetten", async () => {
  await assertSucceeds(setDoc(doc(as("bram"), "events/e1/games/g2"), { name: "Azul" }));
  await assertSucceeds(updateDoc(doc(as("bram"), "events/e1/members/bram"), { status: "BEZET" }));
});

// ---- migratie (draait met adminrechten, dus buiten de regels om)
test("migratie maakt joinCodes voor bestaande weekenden en is herhaalbaar", async () => {
  const { migrate } = require("../../tools/migrate-join-codes/migrate.js");
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "events/e2"), { name: "Oud", joinCode: "old222 ", createdBy: "x" }); // spatie + kleine letters
    await setDoc(doc(db, "events/e3"), { name: "Zonder code" });
    await setDoc(doc(db, "events/e4"), { name: "Dubbel", joinCode: "ABC123", createdBy: "x" }); // botst met e1
    // Adminclient op dezelfde emulator
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    const toolsRequire = require("module").createRequire(require("path").resolve("../../tools/migrate-join-codes/") + "/");
    const { initializeApp } = toolsRequire("firebase-admin/app");
    const { getFirestore } = toolsRequire("firebase-admin/firestore");
    const adb = getFirestore(initializeApp({ projectId: "demo-rules" }, "migratie"));
    const dry = await migrate(adb);
    assert.deepStrictEqual(dry.created, ["OLD222"]);
    assert.strictEqual((await getDoc(doc(db, "joinCodes/OLD222"))).exists(), false); // proefrun schrijft niets
    const real = await migrate(adb, { apply: true });
    assert.deepStrictEqual([real.created, real.existing, real.skipped, real.conflicts], [["OLD222"], ["ABC123"], ["e3"], ["ABC123"]]);
    assert.deepStrictEqual((await getDoc(doc(db, "joinCodes/OLD222"))).data(), { eventId: "e2" });
    assert.deepStrictEqual((await getDoc(doc(db, "joinCodes/ABC123"))).data(), { eventId: "e1" }); // niet overschreven
    const again = await migrate(adb, { apply: true });
    assert.deepStrictEqual(again.created, []);
  });
});

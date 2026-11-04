// Eenmalige migratie: maakt joinCodes/{CODE} = { eventId } voor elk bestaand weekend.
// Alleen toevoegen; bestaande gegevens blijven ongemoeid. Veilig om opnieuw te draaien.
//
//   GOOGLE_APPLICATION_CREDENTIALS=serviceaccount.json node migrate.js           (proefrun)
//   GOOGLE_APPLICATION_CREDENTIALS=serviceaccount.json node migrate.js --apply   (echt schrijven)
const admin = require("firebase-admin");

async function migrate(db, { apply = false } = {}) {
  const report = { created: [], existing: [], skipped: [], conflicts: [] };
  const events = await db.collection("events").get();
  for (const ev of events.docs) {
    const code = String(ev.data().joinCode || "").trim().toUpperCase();
    if (!code) { report.skipped.push(ev.id); continue; }
    const ref = db.collection("joinCodes").doc(code);
    const cur = await ref.get();
    if (cur.exists) {
      (cur.data().eventId === ev.id ? report.existing : report.conflicts).push(code);
      continue;
    }
    if (apply) await ref.create({ eventId: ev.id });
    report.created.push(code);
  }
  return report;
}

module.exports = { migrate };

if (require.main === module) {
  admin.initializeApp();
  const apply = process.argv.includes("--apply");
  migrate(admin.firestore(), { apply }).then((r) => {
    console.log(apply ? "Geschreven:" : "Proefrun (niets geschreven):", JSON.stringify(r, null, 2));
    process.exit(r.conflicts.length ? 1 : 0);
  });
}

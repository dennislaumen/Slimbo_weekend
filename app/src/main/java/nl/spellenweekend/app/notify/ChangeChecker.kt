package nl.spellenweekend.app.notify

import android.content.Context
import nl.spellenweekend.app.data.Activity
import nl.spellenweekend.app.data.ActivityStatus
import nl.spellenweekend.app.data.Repository
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Vervangt de server-pushmeldingen: de telefoon vergelijkt zelf de huidige
 * activiteiten met wat hij de vorige keer zag, en maakt daar meldingen van.
 *
 * Wordt aangeroepen door de achtergrondcontrole (elke ~15 min), door de
 * Vernieuwen-knop en telkens als er live nieuwe gegevens binnenkomen terwijl
 * de app open is.
 */
class ChangeChecker(context: Context) {

    private val ctx = context.applicationContext
    private val prefs = ctx.getSharedPreferences("meldingen", Context.MODE_PRIVATE)

    /** Hoe ver van tevoren een herinnering komt. */
    private val reminderWindowMs = 15 * 60_000L

    @Synchronized
    fun check(eventId: String, me: String, snap: Repository.Snapshot, now: Long = System.currentTimeMillis()) {
        val names = snap.members.associate { it.id to it.name.ifBlank { "Iemand" } }
        val places = snap.places.associate { it.id to it.name }
        val tables = snap.tables.associate { it.id to (it.name to it.placeId) }

        fun name(uid: String) = names[uid] ?: "Iemand"
        fun where(a: Activity): String {
            val t = tables[a.tableId]
            val place = places[t?.second?.ifBlank { null } ?: a.placeId]
            return listOfNotNull(t?.first, place).joinToString(", ")
        }
        fun whenText(a: Activity) = "${day(a.startAt)} ${time(a.startAt)}"
        fun withWhere(text: String, a: Activity) = where(a).let { if (it.isBlank()) text else "$text · $it" }

        val stateKey = "state_$eventId"
        val baselineKey = "baseline_$eventId"
        val remindedKey = "reminded_$eventId"

        val previous = runCatching { JSONObject(prefs.getString(stateKey, "{}") ?: "{}") }.getOrDefault(JSONObject())
        val firstRun = !prefs.getBoolean(baselineKey, false)
        val reminded = prefs.getStringSet(remindedKey, emptySet())!!.toMutableSet()
        val out = mutableListOf<Notifier.Message>()

        for (a in snap.activities) {
            val byOther = a.updatedBy.isNotBlank() && a.updatedBy != me
            val prev = previous.optJSONObject(a.id)

            if (!firstRun && prev != null && byOther) {
                val prevStatus = prev.optString("status")
                val prevStart = prev.optLong("startAt", a.startAt)
                // 1. Geannuleerd (voor iedereen)
                if (prevStatus != a.status.name && a.status == ActivityStatus.GEANNULEERD) {
                    out += Notifier.Message(
                        a.id, "cancel", "Geannuleerd: ${a.title}",
                        "${name(a.updatedBy)} heeft het afgeblazen.",
                    )
                }
                // 2. Tijd verschoven (voor iedereen)
                if (a.status == ActivityStatus.GEPLAND && prevStart != a.startAt) {
                    out += Notifier.Message(
                        a.id, "time", "Nieuwe tijd: ${a.title}",
                        "${whenText(a)} (aangepast door ${name(a.updatedBy)})",
                    )
                    reminded.remove(a.id)
                }
            }

            // 3. Herinnering voor iedereen, 15 minuten voor de start (ook bij de eerste controle)
            val untilStart = a.startAt - now
            if (a.status == ActivityStatus.GEPLAND && a.id !in reminded &&
                untilStart in -5 * 60_000L..reminderWindowMs
            ) {
                out += Notifier.Message(
                    a.id, "reminder", "Over ${maxOf(0L, (untilStart + 59_999L) / 60_000L)} min: ${a.title}",
                    withWhere("Om ${time(a.startAt)}", a),
                )
                reminded += a.id
            }
        }

        // Precieze herinneringen inplannen (los van de controle elke ~15 min)
        val scheduled = prefs.getStringSet("scheduled_$eventId", emptySet())!!.toSet()
        val wanted = mutableMapOf<String, Long>()
        for (a in snap.activities) {
            val at = a.startAt - reminderWindowMs
            if (a.status == ActivityStatus.GEPLAND && a.id !in reminded && at > now && at - now < 5 * 24 * 3_600_000L) {
                wanted[a.id] = at
            }
        }
        val scheduledIds = scheduled.map { it.substringBefore("@") }.toSet()
        for (old in scheduledIds - wanted.keys) runCatching { CheckWorker.cancelReminder(ctx, old) }
        for ((id, at) in wanted) {
            val key = "$id@$at"
            if (key !in scheduled) runCatching { CheckWorker.scheduleReminder(ctx, id, at - now) }
        }
        val newScheduled = wanted.map { (id, at) -> "$id@$at" }.toSet()

        // Nieuwe toestand bewaren
        val state = JSONObject()
        for (a in snap.activities) {
            state.put(a.id, JSONObject().apply {
                put("status", a.status.name)
                put("startAt", a.startAt)
            })
        }
        val ids = snap.activities.map { it.id }.toSet()
        prefs.edit()
            .putString(stateKey, state.toString())
            .putBoolean(baselineKey, true)
            .putStringSet(remindedKey, reminded.filter { it in ids }.toSet())
            .putLong("lastCheck_$eventId", now)
            .putStringSet("scheduled_$eventId", newScheduled)
            .apply()

        out.forEach { Notifier.show(ctx, it) }
    }

    fun lastCheck(eventId: String): Long = prefs.getLong("lastCheck_$eventId", 0L)

    companion object {
        private val NL = Locale.forLanguageTag("nl-NL")
        private val zone get() = ZoneId.systemDefault()

        fun time(ms: Long): String =
            Instant.ofEpochMilli(ms).atZone(zone).format(DateTimeFormatter.ofPattern("HH:mm", NL))

        fun day(ms: Long): String {
            val d = Instant.ofEpochMilli(ms).atZone(zone).toLocalDate()
            val today = LocalDate.now(zone)
            return when (d) {
                today -> "vandaag"
                today.plusDays(1) -> "morgen"
                else -> d.format(DateTimeFormatter.ofPattern("EEEE", NL))
            }
        }
    }
}

# Firestore schema

The Android app (`Models.kt`, `Repository.kt`), the web app (`web/app/index.html`) and the
admin site (`web/index.html`) all read and write the same Firestore database. This file
describes that contract. When you change a field in one client, change it here and in the
other clients.

All weekend data lives under `events/{eventId}`. Timestamps are milliseconds since the epoch
(numbers). Missing fields must be read as the default shown below; neither client writes every
field. Access is controlled by `firestore.rules` (tested in `tests/rules`).

## `events/{eventId}`

| Field | Type | Default | Notes |
|---|---|---|---|
| `name` | string | `""` | |
| `joinCode` | string | `""` | 6 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` |
| `createdBy` | string | `""` | uid of the creator; only they may delete the event |
| `createdAt` | number | | |
| `venue`, `address`, `phone` | string | `""` | |
| `checkInAt`, `checkOutAt` | number | `0` | |
| `info` | list of `{title: string, items: string[]}` | `[]` | info sections |
| `seedVersion` | number | `0` | Android seed marker |
| `initFile`, `initVersion`, `initDone`, `initAt` | string, number, bool, number | | set by the admin site when it fills a new weekend from `web/init/*.json` |
| `syncApplied` | map `{file: timestamp}` | | one-off spreadsheet changes already applied |

## `members/{uid}` (uid = Firebase anonymous auth uid)

| Field | Type | Default | Notes |
|---|---|---|---|
| `name` | string | `""` | |
| `status` | `BESCHIKBAAR` / `RESERVEERBAAR` / `BEZET` | `BESCHIKBAAR` | unknown values read as the default |
| `statusNote` | string | `""` | |
| `wants` | list of game ids | `[]` | the person's ♥ games |
| `guestId` | string | `""` | linked guest (room list) |
| `hidden`, `replacedBy` | bool, uid | | set when another device claims the same guest |
| `web` | bool | | admin site and BGG sync members, hidden from the apps |
| `joinCode` | string | | sent when joining; the rules check it |
| `updatedAt`, `lastSeenAt`, `lastOpenedAt` | number | `0` | |
| `platform`, `appVersion`, `device`, `notifications` | string, string, string, bool | | presence info shown in the admin site |

## `games/{id}`

| Field | Type | Default |
|---|---|---|
| `name` | string | `""` |
| `minPlayers`, `maxPlayers` | number | `2`, `4` |
| `durationMin` | number | `60` |
| `weight` | `LICHT` / `MIDDEL` / `ZWAAR` | `MIDDEL` |
| `owner` | string (a person's name) | `""` |
| `wishlist` | bool | `false` |
| `notes`, `link`, `video` | string | `""` |
| `interested` | list of names | `[]` |
| `infoChecked` | bool | `true` (`false` = player count and duration are still defaults) |
| `category` | one of the categories below | `""` (shown as `Overig`) |
| `categories` | list of BGG categories (English) | `[]` |
| `addedBy`, `addedAt` | uid, number | |

**Rules shared by both clients**
- A game is "brought" when `wishlist` is false **and** `owner` is not blank. The "Iedereen" owner filter and the "Gaat mee" chip both use this definition.
- Owner names are compared trimmed and case-insensitively.
- Categories: Strategie, Familie, Party, Thematisch, Kaartspel, Abstract, Coöperatief, Kinderen, Oorlog, Overig.
- Player filter: `n` matches `minPlayers <= n <= maxPlayers`; `7` means 7 or more (`maxPlayers >= 7`).

## `activities/{id}`

| Field | Type | Default |
|---|---|---|
| `type` | `SPEL` / `ETEN` / `WANDELEN` / `ANDERS` | `ANDERS` (Android reads missing as `SPEL`). Only ETEN, WANDELEN and ANDERS can be planned |
| `title` | string | `""` |
| `gameId`, `placeId`, `tableId` | string | `""` |
| `startAt` | number | `0` |
| `durationMin` | number | `60` |
| `maxParticipants` | number | `0` (no maximum) |
| `participants`, `invited`, `declined` | list of uids | `[]` |
| `status` | `GEPLAND` / `GESTART` / `AFGEROND` / `GEANNULEERD` | `GEPLAND` |
| `notes` | string | `""` |
| `reminderSent` | bool | `false` |
| `createdBy`, `updatedBy` | uid | |
| `updatedAt` | number | |

## Other collections

- `places/{id}`: `name`, `description`
- `tables/{id}`: `name`, `placeId`, `seats` (default 4)
- `rooms/{id}`: `placeId`, `floor`, `name`, `beds`, `bedInfo`, `occupants` (names)
- `guests/{id}`: `name`, `roomId`, `wants`, `claimedBy` (uid of the member that claimed it)
- `chores/{id}`: `placeId`, `day`, `slot` (ochtend/middag/avond), `startAt`, `endAt`, `names`

## `joinCodes/{CODE}`

`{ eventId: string }`. Lets someone who knows the code find the weekend. It can be fetched
with `get` but not listed. Created together with the event. Not in the database yet in
older deployments: see `docs/rollout-join-codes.md` if that PR is merged.

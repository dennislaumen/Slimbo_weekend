# Rollout: join codes enforced by the Firestore rules

## Why

The old rules let any signed-in (anonymous) user list every weekend, read its join code and
add themselves as a member. The code was only checked in the client, so it protected nothing.
Anyone with the public API key could read and write all data of every weekend.

## What changes

- New collection `joinCodes/{CODE}` with `{ eventId }`. A code can be looked up with `get`
  when you know it; it cannot be listed.
- Weekends can no longer be listed or read by non-members.
- A member document must carry the right `joinCode` when it is created (the creator of the
  weekend is exempt).
- Only the creator can delete a weekend. Members can edit it, but not change `joinCode` or
  `createdBy`. Members can only change another member's status, wishlist and links, not
  the name.

The rules are tested against the Firebase emulator (`tests/rules`, CI workflow
`rules-test.yml`).

## Steps (needs access to the Firebase project)

Order matters: old clients stop working once the new rules are live.

1. **Migrate** (adds data only, nothing breaks). In `tools/migrate-join-codes`:
   ```
   npm ci
   GOOGLE_APPLICATION_CREDENTIALS=serviceaccount.json node migrate.js          # dry run
   GOOGLE_APPLICATION_CREDENTIALS=serviceaccount.json node migrate.js --apply
   ```
   The script is safe to re-run. It exits with an error if two weekends share a code
   (a conflict); fix that by hand first.
2. **Merge this change** to `main`. The website deploys itself; the Android build publishes a
   new APK. Ask everyone to update the app.
3. **Publish `firestore.rules`** (Firebase console → Firestore → Rules → Publish).

Until step 3, production behaviour is unchanged. Between steps 2 and 3 old and new clients
both work. After step 3 only the new clients work.

## Not covered by tests

The Android client (`Repository.kt`) follows the same flow as the web app but has no automated
test. Before step 3, create and join a weekend in the new APK.

# Firestore Security Model Notes

This document records the current Firestore authorization assumptions so future rule changes have a written product/security reference before they are implemented.

## Current access model

- Admin access is granted to an authenticated user who has the Firebase **custom claim**
  `admin: true` **or** (transitional fallback) whose token email matches the legacy admin email in
  `firestore.rules`. See "Admin custom-claim migration" below.
- Per-user progress/session data under `/artifacts/{appId}/users/{uid}/data/{doc}` is readable and writable only by that authenticated `uid`.
- Pending submissions can be created only by an authenticated user whose `submittedBy` field matches `request.auth.uid`.
- Pending submissions are readable by any authenticated user for duplicate detection; updates are disabled; deletes are admin-only.
- Published levels are public-read and admin-write.
- Level ratings (`level_ratings/{fingerprint}`) are public-read and admin-write, same tier as published levels.
- Supplemental hints for a locally-published (levels.json) level (`local_level_hints/{fingerprint}/entries/{entryId}`)
  are public-read; **any authenticated user** (including anonymous — every player gets a Firebase
  anonymous auth UID at boot, see `firebase-client.ts`'s `initAuth`) may **create** an entry, since
  this is the write path for "a player's own winning solve becomes a saved hint" (see
  CLAUDE.md's Provenance section). Entries are immutable once created (no update/delete). `entryId`
  is a short deterministic hash of the path signature (FNV-1a,
  `local-level-hints-repository.ts`'s `hashPathSignature`) — a **client-side convention**, not
  something the rules themselves check (the rules language has no hash primitive to verify it
  against), so every client converges on the same doc ID for the same path and a second write of
  an already-known path fails as an update (`allow update: if false`) rather than silently
  overwriting it. A hash collision (two different paths landing on the same ID) is a low-severity
  data-quality nuisance — a redundant-looking entry, never a corrupted or overwritten one — not a
  security hole, since entries are immutable either way. The 5,000-hints-per-level cap mentioned in
  CLAUDE.md is enforced client-side (a count check before writing), not by these rules — a
  low-stakes soft cap on puzzle-solution data, not a security boundary, so occasional
  under-concurrency overshoot is an acceptable trade-off against the complexity of an atomic
  server-side counter.

## `local_level_hints` write triggers and the read-side merge

The two places that write to this collection:

- **Hints-only resubmission**: an already-published (levels.json) level opened in Edit/Review mode
  with new hints found gets a `type: 'localHintAddition'` submission (`submission-core.ts`'s
  `resolveHintAdditionVerdict`); on approval, `review-repository.ts`'s `approveLocalHintAddition`
  writes each new hint straight to `local_level_hints` (never re-appends the level itself, since it
  already lives in `levels.json`).
- **Invisible auto-save on solve**: `win-controller.ts`'s `saveWinAsHintIfNovel` fires (fire-and-forget,
  never blocks or fails the player's win) on every ordinary Play-mode win against the published corpus.
  It re-checks the win path against `data.getHints` (already the merged local+Firestore set — see
  below) and only writes if genuinely novel, via `local-level-hints-repository.ts`'s
  `saveLocalLevelHintIfNovel` (which also re-checks the live server count against the 5,000 cap).

**Read side**: `modules/data.ts`'s `getHints(levelNumber)` is the single point that merges the two
sources for the published corpus — it fetches the level's local hint file, then (if a
`firestoreHintsSource` is wired, which `modules/dev-corpus.ts` only does for the published corpus,
never the stress corpora) fetches `local_level_hints/{fingerprint}` and merges it in via
`mergeHints` (`hint-types.ts`), so every consumer of `getHints` — hint display, curation, the
heat-map, novelty checks — sees local and Firestore hints as one combined set without needing to
know two sources exist. A Firestore fetch failure falls back to local-only hints rather than
throwing, so an offline session or a Firestore outage never blocks ordinary play.

## Admin custom-claim migration (tracked in `docs/future-work.md`)

`isAdmin()` now accepts `request.auth.token.admin == true` **or** the legacy email. This is a
**no-lockout** transition: the existing admin keeps working while the custom claim is provisioned,
and the email clause can be deleted once the claim is confirmed in production.

**Provisioning the claim (one-time ops task, Firebase Admin SDK — not runnable from this repo):**

```js
// Run once with admin credentials (service account), e.g. in a Cloud Function or a local
// Node script using firebase-admin. Requires the admin's Firebase Auth UID.
import { getAuth } from 'firebase-admin/auth';
await getAuth().setCustomUserClaims('<ADMIN_UID>', { admin: true });
// The user must obtain a fresh ID token afterward (re-login or getIdToken(true)).
```

**Cutover checklist:**
1. Set `{ admin: true }` on the admin UID (above); confirm `getIdTokenResult()` shows `admin: true`.
2. Verify an admin action (publish/delete) still works while the claim is live.
3. Delete the `request.auth.token.email == '…'` clause from `firestore.rules`'s `isAdmin()` and
   update `scripts/firestore-rules-test.mjs` to expect claim-only admin.
4. Optionally migrate the **client-side** UX gate (`review-repository.js`'s
   `user.email === '…'` check) to read the claim via `getIdTokenResult()`, removing the last
   place the admin identity is duplicated in client code. (Rules are the real enforcement; the
   client check is UX-only, which is why this is decoupled from the rule change.)

Rules deploy only via `.github/workflows/deploy-firestore-rules.yml` (push to `main` or manual
dispatch), so the rule change here is inert in production until merged + deployed.

## Known risks and follow-ups

- **Emulator-backed behavioral tests (remaining §4 Phase 2 work).** `scripts/firestore-rules-test.mjs`
  is fast source-level characterization (locks the rule *text* + negative-case shapes). True
  behavioral coverage — actually attempting allowed/denied reads/writes as anonymous / wrong-uid /
  non-admin / admin principals — needs `@firebase/rules-unit-testing` + the Firestore emulator
  (Java + `firebase-tools`), which isn't wired up here. When added, keep these characterization
  tests as fast smoke tests and add an emulator suite asserting the same access model behaviorally.
- Authenticated broad reads of pending submissions should be reviewed against a product threat model
  before adding richer submission metadata (consider constraining to indexed fingerprint fields).

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

## Admin custom-claim migration (modernization-plan §4 Phase 2)

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

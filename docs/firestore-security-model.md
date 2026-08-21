# Firestore security model

Current Firestore authorization and hint-storage contract.

## Access model

| Data | Read | Write |
|---|---|---|
| `/artifacts/{appId}/users/{uid}/data/{doc}` | matching authenticated `uid` | matching authenticated `uid` |
| Pending submissions | any authenticated user | create only when `submittedBy == request.auth.uid`; no updates; admin delete |
| Published levels | public | admin |
| `level_ratings/{fingerprint}` | public | admin |
| `local_level_hints/{fingerprint}/entries/{entryId}` | public | authenticated create only; immutable afterward |

Admin means Firebase custom claim `admin: true` or the temporary legacy admin-email fallback in `firestore.rules`.

Every player receives an anonymous Firebase UID at boot, so authenticated hint creation includes ordinary players.

## Supplemental published-level hints

`local_level_hints` stores solutions found after a level is already in `levels.json`.

Two write paths exist:

- approved hints-only resubmissions (`approveLocalHintAddition`);
- ordinary Play-mode wins (`win-controller.ts` → `saveWinAsHintIfNovel`), fire-and-forget so Firestore failure cannot affect the win.

Entries use a deterministic client-side hash of the path signature as `entryId`. Firestore rules do not verify that hash; immutability means duplicate writes cannot overwrite an existing entry. The 5,000-hints-per-level limit is a client-side soft cap, not a security boundary.

`modules/data.ts` merges local hint files and Firestore supplemental hints through `mergeHints` for the published corpus. Stress corpora never use the Firestore source. Fetch failure falls back to local hints, so Firestore availability does not block play.

## Admin custom-claim migration

Current `isAdmin()` accepts either `request.auth.token.admin == true` or the legacy email. This avoids lockout while the claim is provisioned.

Cutover:

1. Set `{ admin: true }` on the admin Firebase Auth UID with the Admin SDK and refresh the ID token.
2. Verify an admin action.
3. Remove the legacy email clause from `firestore.rules` and update `scripts/firestore-rules-test.mjs`.
4. Optionally replace the client-side email UX gate with a claim check. Firestore rules remain the enforcement boundary.

Rules deploy through `.github/workflows/deploy-firestore-rules.yml`; repository edits do not affect production until deployed.

## Remaining risks / work

- Current rules tests are source-level characterization. Emulator-backed behavioral tests remain deferred until a rules change justifies the Firebase emulator/tooling cost; see [`testing.md`](testing.md).
- Broad authenticated reads of pending submissions should be reconsidered before adding richer submission metadata.

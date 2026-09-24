# Hint evidence consolidation — Phase 3 Firestore local-hints occurrence lineage — 001

> **Status:** concluded-positive (implementation + static verification; real Firestore-emulator
> execution could not run in this environment — see section 5)
>
> **Date:** 2026-09-24
>
> **Batch:** the Firestore persistence-layout item from
> [`2026-09-23-hint-evidence-phase3-reconstructability-embedded-identity-001.md`](2026-09-23-hint-evidence-phase3-reconstructability-embedded-identity-001.md)'s
> "next work" list, and closes the `local_level_hints`-specific half of the pre-existing PSC-029
> control-plane entry ("external hint persistence transport and capacity semantics").
>
> **Base commit:** `27f4ee7`.

## 1. The defect

`modules/persistence/local-level-hints-repository.ts` stores one Firestore doc per discovered path
under `artifacts/{appId}/local_level_hints/{levelFingerprint}/entries/{entryId}`, with `entryId =
hashPathSignature(pathSignature)` — a hash of the PATH alone. Its own doc comments already tracked the
consequence: a second, genuinely distinct discovery event for an already-known path (a different play
session, a different admin-reviewed submission, a different technique) has no document to go to and was
silently refused as `duplicate-provenance-not-recorded`, permanently losing that provenance. PSC-029 in
`docs/solver-protocol-schema-contraction.json` already named this exact gap in its `progress` field
("Local storage additionally cannot retain same-path rediscovery provenance").

## 2. Why the fix needed no `firestore.rules` change

The natural first idea — store `provenance` as a growable array on one doc per path, with an `update`
rule verifying strict append-only growth — was rejected: this environment has no Firestore emulator or
`firebase-tools` available (confirmed: not on `PATH`, not in `node_modules`, `npx firebase` fails), so a
new `update`-permission rule using list-prefix verification could not be empirically validated here
before shipping to a live production database. Getting an untested security rule wrong risks either
locking out legitimate writes or opening a tampering hole — an unacceptable risk for unverifiable rule
code.

Instead: **`entryId` is now a composite hash of the path signature AND the discovery event's own
identity** (`provenanceEventIdentity()`, the same canonical semantic-identity function
`dedupeProvenanceEntries()`/`mergeHints()` already use everywhere else), rather than the path signature
alone. A genuinely new discovery event for an already-known path gets its own sibling doc, created via
the **exact same `allow create`-only rule already in production and already covered by
`test:firestore-rules`'s characterization suite** — the rule does not constrain `entryId`'s format at
all, so this required zero rule changes. A true duplicate (same path AND same exact event) still collides
on the identical doc ID, which is still the existing, already-proven harmless create-no-op. Reading is
unaffected: `getLocalLevelHints()` already fetches every doc in one `getDocs()` call and merges them via
`mergeHints()`, which already groups multiple `Hint` objects sharing a path signature into one, merging
and deduping their `provenance` arrays via `dedupeProvenanceEntries()` — the exact same machinery this
whole session's Phase 3 work already extensively tested for occurrence lineage. No N+1 reads, no new
query shape, no new rule primitive.

## 3. Implementation

- **`modules/domain/hint-types.ts`**: added typed re-exports `provenanceEventIdentity()` (was previously
  only reachable via the untyped `.mjs` runtime or the Node-only `scripts/hint-provenance-identity.mjs`
  compatibility shim) and a new `provenanceEventKey(pathSignature, entry)` helper — the composite
  `` `${pathSignature}::${provenanceEventIdentity(entry)}` `` key that distinguishes "this path is known"
  from "this exact discovery event for this path is known." Naming/vocabulary check: no existing export
  used either name; `provenanceEventKey` reuses `provenanceEventIdentity`'s own established vocabulary
  rather than inventing a parallel one.
- **`modules/domain/hint-runtime.mjs`**: added an explicit `@returns {string}` JSDoc annotation (with a
  cast at both return sites) to `provenanceEventIdentity()`, whose inferred return type was
  `string | undefined` only because it delegates to `stableStringify()`'s more permissive signature —
  `provenanceEventIdentity()` itself always passes a concrete value, so a string is guaranteed. Required
  by `check:types` once this function got a proper typed TS-side caller for the first time.
- **`modules/persistence/local-level-hints-repository.ts`**: added `entryIdFor(pathSignature, entry,
  hash)` (module-level, hash-function-injected so it stays pure/testable) and exposed a bound
  `localHintEntryId(pathSignature, provenance)` on the returned repository object. `saveLocalLevelHintIfNovel`'s
  last parameter is renamed `alreadyKnownEventKeys` (was `alreadyKnownSignatures`) and its duplicate check
  now keys on `provenanceEventKey(pathSignature, provenance)` instead of the bare path signature.
  `MAX_HINTS_PER_LEVEL`'s meaning shifts slightly — it now bounds total (path, event) entry docs, not
  distinct paths — a reasonable interpretation of "hints per level" that needed no code change, only a
  doc-comment note.
- **`modules/engine/win-controller.ts`**: `saveWinAsHintIfNovel` still short-circuits at the path level
  before ever reaching the repository (unchanged — a player who rediscovers an already-known path never
  attempts a save at all here), but now builds `alreadyKnownEventKeys` from `knownHints`' real provenance
  arrays via `provenanceEventKey`, for interface correctness even though this call path can never actually
  collide with it in practice.
- **`modules/persistence/review-repository.ts`**: `approveLocalHintAddition` — the ONE real code path that
  actually reaches the "path already known" case (an admin approving a batch of submitted hints, where the
  submission may include a path already recorded from elsewhere) — now builds `knownEventKeys` from
  `existing`'s full provenance (not just path signatures), passes it into `saveLocalLevelHintIfNovel`, and
  updates it with the new event's key (not just the path signature) after each successful save. Its
  `duplicateNotRecorded` tally now means "this exact discovery event was already known," not "this path
  was already known" — a real semantic improvement matching the actual fix.
- **`firestore.rules`**: comment-only correction (the rule body is byte-for-byte unchanged) — the
  `local_level_hints` block's doc comment previously said "one entry per distinct discovered path,"
  which is now stale; corrected to describe the composite (path, event) key. Verified `git diff` touches
  only comment lines.
- **`docs/solver-protocol-schema-contraction.json`**: appended to PSC-029's `progress` recording that the
  `local_level_hints`-specific rediscovery-provenance loss is closed, while explicitly leaving `status`/
  `retirementGate` open — the published_levels backend's separate 5-hint truncation and the
  one-semantic-contract-across-both-backends unification are unrelated, unresolved halves of that same
  entry.

## 4. Naming/vocabulary occupancy check

Searched `docs/naming-and-vocabulary.md` and the codebase before introducing `provenanceEventKey` and
`entryIdFor`/`localHintEntryId`: no collision with any existing export, and both names describe exactly
what they compute without shadowing an established term (`provenanceEventIdentity`, `sourceRunBinding`,
`occurrenceKey` from earlier Phase 3 work are the nearest neighbors and are all distinct concepts this
naming stays consistent with).

## 5. Verification

- `npm run check:types` / `check:types:tests` — clean.
- `npx vitest run` — 146 files / 1580 tests, all pass (6 new: 2 in `hint-types.test.ts` for
  `provenanceEventKey` directly, 4 in `local-level-hints-repository.test.ts` for `localHintEntryId`'s
  determinism/uniqueness/foundAt-exclusion properties).
- `npm run test:node` — 181 packages, all pass.
- `npm run test:firestore-rules` — 13/13 pass, confirming the `firestore.rules` comment-only edit changed
  no enforced behavior.
- `modules/engine/engine-controllers.test.ts` — all 44 tests pass; strengthened the existing
  `saveWinAsHintIfNovel saves the path when it is not already known` test (gave its fixture's other known
  hint a real provenance entry, since an empty-provenance fixture would have made the new
  `alreadyKnownEventKeys` set trivially empty and the test would no longer meaningfully exercise the new
  contract) to assert the known-event-key set is built from size 1, not just "doesn't contain the new
  path's bare signature."
- **Not run**: `scripts/firestore-level-fingerprint-boundary-test.mjs`, the real Firestore-emulator-backed
  proof, because this environment has no `firebase-tools`/emulator available (confirmed absent: not on
  `PATH`, not in `node_modules`, `npx firebase-tools` fails to resolve). Extended it with the actual new
  scenario this batch exists to prove (a genuinely new discovery event for an already-known path gets a
  distinct `entryId` and both docs merge into one `Hint` with 2 provenance entries via
  `getLocalLevelHints()`), and fixed a pre-existing, unrelated latent bug found while touching the file:
  its old assertion `assert.equal(saved, true)` compared the `SaveLocalLevelHintOutcome` OBJECT
  `{saved:true}` against the boolean `true` — `Object.is({saved:true}, true)` is `false`, so this
  assertion would have failed had it ever actually run since the discriminated-outcome refactor
  predating this batch. Fixed to `assert.equal(saved.saved, true)`. Statically verified via `npx tsx
  scripts/firestore-level-fingerprint-boundary-test.mjs` (fails only at the expected
  `FIRESTORE_EMULATOR_HOST` guard, proving every import resolves and the whole file parses without
  syntax errors) but the real assertions have NOT executed against an actual Firestore rules engine.
  This test runs in real CI via `.github/workflows/ci.yml`'s `npx firebase-tools@15.28.2
  emulators:exec` step (`continue-on-error: true`) — the next CI run on this branch is the first real
  execution of both the pre-existing bug fix and this batch's new scenario.

## 6. What this batch does not do

- Does not touch the `published_levels` backend's `approveHintAddition` (the OTHER half of PSC-029) —
  its separate 5-hint-per-level-merge legacy truncation and byte-capacity check are unrelated to this
  fix and remain exactly as they were.
- Does not unify the two backends into "one semantic Hint retention contract" (PSC-029's full
  `retirementGate`) — that remains open and is a larger, separate design decision.
- Does not change `MAX_HINTS_PER_LEVEL`'s value (still 5000) despite its meaning shifting slightly from
  "distinct paths" to "(path, event) pairs" — no evidence this shift makes the existing cap wrong, and
  changing capacity policy was out of scope for a provenance-loss fix.
- Could not be verified against a real Firestore rules/query engine in this environment — genuinely open
  until the next CI run confirms it, flagged explicitly rather than claimed as fully proven.

## 7. Next work

1. Confirm this batch's real behavior once CI's Firestore-emulator job runs on this branch — watch for
   the `Exercise level-fingerprint repository identity through Firestore emulator` step specifically.
2. PSC-029's remaining scope: the `published_levels` 5-hint truncation and full backend unification.
3. Continue the broader plan: Phase 4+ (query/research observability surfaces, standardized ingestion
   projection, GHA persistence centralization, historical enrichment, physical hint schema v4, generated
   runtime projection, bounded level cleanup) — none started.

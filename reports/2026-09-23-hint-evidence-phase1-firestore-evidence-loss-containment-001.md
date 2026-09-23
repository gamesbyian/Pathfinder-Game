# Hint evidence consolidation — Phase 1 Firestore evidence-loss containment — 001

> **Status:** concluded-positive (containment only; final layout deferred to Phase 3 by design)
>
> **Date:** 2026-09-23
>
> **Batch:** 6 of the dependency-ordered sequence — Phase 1's Firestore item ("contain Firestore
> evidence loss immediately: no silent slice(), no silent provenance discard, and capacity/duplicate/
> failure outcomes must be distinguishable. Do not prematurely choose the final occurrence-storage
> layout.") and plan section 13.1.H.
>
> **Base commit:** this branch's prior five batches.

## 1. Two defects, two containment fixes

### 1a. `published_levels`: silent `.slice(0, 5)` truncation

`modules/persistence/review-repository.ts::approveHintAddition()` merged a reviewer's contributed
hints against a published level's existing `Hint[]` and then unconditionally kept only the first 5,
discarding the rest with no error, log, or indication to the admin. The pre-implementation audit traced
this to a pre-provenance-era value with no current justification, now in direct conflict with the
submission path's 1,000-hint safety margin and the local-supplemental path's 5,000-hint soft cap.

**Fix:** removed the count-based cap entirely. Firestore's real constraint is a 1,048,576-byte
per-document limit, not a hint count, so capacity is now checked in bytes: the full merged+encoded
`levelData` is measured (`encodedLevelDataByteSize()`, matching the audit's own JSON+UTF-8 measurement
methodology) against a 900,000-byte budget (`FIRESTORE_HINT_CAPACITY_BUDGET_BYTES`, leaving ~148 KiB of
headroom for the rest of `levelData` plus Firestore's own encoding overhead — the same 900k/950k
candidate thresholds the audit measured against real encoded Hint arrays). If it fits, everything is
written (strictly more evidence preserved than before, for every level whose full history fits). If it
does not fit, the function throws an explicit, human-readable capacity error *before* `batch.commit()`
— nothing is written, the submission is **not** deleted from the review queue (so it is retried, not
lost), and the admin sees exactly why via the existing `review-controller.ts` catch-and-display path
(no new UI plumbing needed).

### 1b. `local_level_hints`: silent rediscovery-provenance discard

`modules/persistence/local-level-hints-repository.ts::saveLocalLevelHintIfNovel()` is one Firestore doc
per distinct path, holding exactly one provenance event. A rediscovery of an already-known path — a
second, independent discovery of a path this backend already has — returned a bare `false` with no
document written, which reads identically to "already handled" everywhere the return value is used.
`approveLocalHintAddition()` (its only branching caller) could therefore complete "successfully" and
delete the submission while having persisted zero of a rediscovery-only submission's hints.

**Fix:** `saveLocalLevelHintIfNovel()` now returns a discriminated `SaveLocalLevelHintOutcome`
(`{ saved: true }` or `{ saved: false, reason: 'no-connection' | 'duplicate-provenance-not-recorded' |
'capacity-reached' }`) instead of a boolean, making the three previously-indistinguishable `false`
cases explicit. `approveLocalHintAddition()` now tallies these into a `LocalHintAdditionSummary` and
returns it instead of `void`; `review-controller.ts` uses the tally to tell the admin exactly what
happened (e.g. "Added 2 hint(s); 3 rediscovery/ies of already-known path(s) could not be recorded.")
instead of an unconditional "Hints added!". The one other caller of `saveLocalLevelHintIfNovel()`
(`win-controller.ts`'s invisible background auto-save) never inspected the return value, so it is
unaffected.

This does **not** change the underlying one-doc-per-path physical shape — that would require designing
the actual occurrence-lineage storage layout, which the plan explicitly reserves for Phase 3 ("now
choose/implement the Firestore semantic layout consistent with occurrence lineage... Do not choose
between them until representative Firestore serialized sizes are measured" — already measured, but the
design itself is a Phase 3 dependency on the not-yet-built semantic provenance/occurrence model from
Phases 2-3). The fix makes the *existing* limitation visible and auditable instead of invisible.

## 2. Why this stops short of a physical redesign

Both fixes follow the same discipline: stop the *silent* half of the defect (a decision was made about
what evidence to keep/drop with zero record that a decision happened at all) without deciding the
*final* physical layout, which depends on identity/occurrence-lineage work this plan has not reached
yet (Phases 2-3). "1a" strictly increases how much evidence is preserved by removing an arbitrary count
cap in favor of the real constraint; "1b" makes an existing, unavoidable-for-now limitation legible
rather than closing it, since closing it means picking a schema this plan isn't ready to commit to.

## 3. Verification

- Extracted the byte-measurement logic in `review-repository.ts` into pure, exported functions
  (`encodedLevelDataByteSize`, `FIRESTORE_HINT_CAPACITY_BUDGET_BYTES`) specifically so this could be
  unit-tested without a Firestore mock — this codebase deliberately has no emulator/mock-backed
  persistence-repo tests (see `local-level-hints-repository.test.ts`'s own header comment), so new
  tests follow that same pure-helper-extraction convention rather than introducing the first
  `firebase/firestore` mock.
- New `modules/persistence/review-repository.test.ts`: byte-size measurement is real UTF-8 bytes (not
  character count), scales with hint count, and the budget leaves ≥100,000 bytes of headroom under
  Firestore's real 1,048,576-byte document limit.
- New test in `modules/persistence/local-level-hints-repository.test.ts`: `db: null` produces the
  distinguishable `{ saved: false, reason: 'no-connection' }` outcome, not a bare `false`.
- `npm run check:types` and `npm run check:types:tests` — both clean (the return-type change from
  `boolean` to a discriminated object was verified type-safe end to end, including the `win-controller.ts`
  caller that ignores the return value).
- **Full repository test suite**: `npx vitest run` — **143 test files, 1531 tests, all pass** (run after
  all six batches in this session, confirming no regression across the cumulative session).
- `npm run test:hint-io-facade-guard` — still green.
- `git status`/`git diff` confirms no Firestore data, canonical hint corpus, or level data was touched
  — only the four source files and two test files listed above.

## 4. What this does not do

- Does not change what a *player* sees: `selectDisplayHints()` remains the sole owner of player-facing
  hint curation limits, untouched by this batch, consistent with the plan's explicit instruction that
  "player display limits belong in `selectDisplayHints()`, not storage."
- Does not implement occurrence lineage, event-child documents, or any other bounded-growth persistence
  unit for either Firestore backend. Both remain exactly as semantically limited as before for the
  cases this batch could not close (a still-oversized published level; a `local_level_hints`
  rediscovery) — the difference is that both cases now fail/report loudly instead of silently.
- Does not add Firestore emulator-backed integration tests. That remains a tracked, larger follow-up
  (referenced in `local-level-hints-repository.test.ts`) orthogonal to this plan.
- Does not touch `scripts/import-published-levels.mjs`'s convergence gap (no `local_level_hints` →
  git convergence path exists) — a separate, already-documented finding (plan section H) not addressed
  by this batch.

## 5. Next batch

This closes out the concrete, explicitly-named Phase 1 sub-items this plan's continuation audit
identified: stale I/O facade migration, historical missingness laundering, the July-11 synthetic-
`foundAt` cohort, worker observer parity, and Firestore evidence-loss containment. The remaining Phase 1
item is the shared v1-v3 browser/Node hint-artifact decoder boundary
(`decodeHintArtifact`/`encodeHintArtifact`, unifying `scripts/level-data-io.mjs` and
`modules/data-asset-loaders.ts`) — introduced "now, without v4 encoding" per the plan. That is a
larger, cross-cutting compatibility batch (it touches the browser bundle) and should be its own
dedicated batch rather than an extension of this one. After that, Phase 1 is complete and Phase 2
(request/execution identity: the 49-field SolveOpts classification into a canonical request capsule)
becomes the next dependency-ordered phase.

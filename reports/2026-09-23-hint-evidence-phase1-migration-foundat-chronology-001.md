# Hint evidence consolidation — Phase 1 migration-synthetic foundAt chronology repair — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** concluded-positive
>
> **Date:** 2026-09-23
>
> **Batch:** 4 of the dependency-ordered sequence — Phase 1's July-11 synthetic-`foundAt` sub-item
> (plan section 13.1.U / "Historical `foundAt` boundary").
>
> **Base commit:** this branch's prior three batches. No canonical hint corpus data was rewritten.

## 1. The defect

`docs/hint-evidence-consolidation-inventory.json` and the preimplementation audit already proved: the
2026-07-11 flat-`hintMetadata`-to-schema-v3 migration (commit `7a651d391b49986626ceffbc4612352ddefb9bd4`)
converted schema-v1 hints with no discovery timestamp through `upgradeProvenanceEntry()`'s flat-shape
branch, which calls `makeProvenanceEntry(technique, { foundAt: undefined, ... })`; that constructor
supplies `new Date().toISOString()` when `foundAt` is omitted. The one-time migration run stamped a
141-millisecond window (`2026-07-11T01:44:17.863Z`–`2026-07-11T01:44:18.004Z`) onto exactly **662
provenance events across 102 stress-corpus-1 files** — migration time, not discovery time. Those events
are now stored in the modern nested schema-v3 shape, so ordinary reads no longer regenerate the
timestamp (confirmed: zero files in the live corpus still use the flat `hintMetadata` shape), but two
consumers treat any parseable `foundAt` as genuine dated chronology without excluding this known cohort:

- `scripts/stress/solution-profile-lib.mjs::earliestFoundAt()` — feeds
  `discoverySaturationCurve()`'s "walk hints in discovery order" chronology, which drives
  `chronologyComplete`/`plateauStartIndex`/`plateauFraction` plateau claims.
- `scripts/stress/provenance-source-taxonomy.mjs::classifyEvidenceApplicability(..., 'longitudinal-process')`
  — its `fullyDated` check for admitting an event as `'dated-versioned-discovery-event'`.

## 2. The fix

Added one canonical predicate, `isMigrationSyntheticFoundAt(entry)`, plus the proven window constant
`MIGRATION_SYNTHETIC_FOUND_AT_WINDOW`, to `modules/domain/hint-runtime.mjs` (re-exported through
`modules/domain/hint-types.ts`, alongside the repo's other shared provenance-semantic helpers). It
returns true iff `entry.foundAt` parses to a timestamp inside the proven window — no additional file-
cohort restriction was added on top, since the audit already established the window alone produces
zero false positives against the real corpus (a second reconstruction at the September 11 commit found
the identical 662/102 cohort, and zero members in published hints or stress-corpus-2).

Wired the predicate into both consumers:

- `earliestFoundAt()` now filters out migration-synthetic entries *per provenance event*, not per hint,
  before taking the minimum: a hint with both a migration-stamped entry and a genuinely later-dated
  rediscovery still gets a real chronology position from the genuine entry; a hint with only a
  migration-stamped entry correctly becomes chronologically undated (`Infinity`), which flows through
  to `chronologyDatedHints`/`chronologyComplete` exactly as an entirely-undated hint already does.
- `classifyEvidenceApplicability(..., 'longitudinal-process')`'s `fullyDated` check now requires
  `!isMigrationSyntheticFoundAt(entry)` in addition to its existing `foundAt`/`solver.id`/
  `solver.version` requirements, so a migration-stamped event classifies as `context-bound` /
  `legacy-or-incomplete-event-metadata` rather than `admissible` / `dated-versioned-discovery-event`.

This preserves the underlying solver/technique metadata untouched — only the timestamp's evidentiary
status changes, consistent with the plan's rule that these events remain real evidence, just
chronologically unknown.

## 3. Verification

- Added regression tests:
  - `scripts/stress/provenance-source-taxonomy-unit-tests.mjs`: a migration-window timestamp is
    `context-bound`, not `admissible`, for `longitudinal-process`; a timestamp one second outside the
    proven window is still `admissible` (the fix is narrow, not a blanket July-11 exclusion).
  - `scripts/stress/solution-profile-lib-unit-tests.mjs`: `discoverySaturationCurve()` treats a
    migration-stamped-only hint as undated (`chronologyComplete: false`), and correctly recovers
    chronology for a hint that also carries a second, genuinely-dated provenance entry (per-entry
    filtering, not per-hint poisoning).
- `npx vitest run` across both new-test files plus the full existing hint/provenance-adjacent battery
  (`hint-types.test.ts`, `hint-provenance.test.ts`, `hint-runtime-semantic-dedupe.test.ts`,
  `local-level-hints-repository.test.ts`, `hint-acceptance-pipeline.test.ts`, `hint-selection.test.ts`,
  `hint-novelty.test.ts`, `level-provenance-types.test.ts`, `hint-provenance-relations.test.ts`,
  `provenance-classes-unit-tests.mjs`) — 149/149 pass across 11 files.
- `npm run check:types` — clean (caught and fixed one real type-annotation gap: the runtime function's
  JSDoc needed to accept `null | undefined` to match its typed wrapper's realistic caller signature).
- `npm run test:hint-io-facade-guard` — still green.
- `git status`/`git diff` confirms no canonical hint/level data was rewritten; only the six source/test
  files above changed.

## 4. What this does not do

- Does not touch the 662 events' physical `foundAt` bytes. The plan is explicit: "do not replace the
  timestamp with a guessed earlier date." The fix is a read-time/classification-time exclusion, not a
  data correction.
- Does not add a distinct "migration-synthetic" tag to the persisted `HintProvenanceEntry` shape itself.
  The predicate is derived (recomputed from the existing `foundAt` value against a fixed, proven
  window), matching the plan's preference for compatibility adapters over schema additions where the
  existing fields already carry enough signal.
- Does not audit every other consumer that reads `foundAt` in the repository for the same assumption —
  only the two the plan's own "Historical `foundAt` boundary" section and prior audits specifically
  named (solution-profile chronology, longitudinal-process applicability). A broader sweep for other
  `foundAt`-as-chronology assumptions was not performed and remains a candidate for a future batch if a
  new one is found.

## 5. Next batch

Remaining Phase 1 items: worker side-channel parity (`beamFlowCounters`/`pruneDiagnostics` silently
dropped across the Web Worker boundary), Firestore evidence-loss containment (the five-hint `slice()`
cap in `approveHintAddition()` and `local_level_hints`' create-only/single-provenance limitation), and
the shared v1-v3 browser/Node decoder boundary (`decodeHintArtifact`/`encodeHintArtifact`). Each remains
a separate batch with its own compatibility owner.

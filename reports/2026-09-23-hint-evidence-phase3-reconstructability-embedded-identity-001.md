# Hint evidence consolidation — Phase 3 reconstructability reads the embedded execution capsule — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** concluded-positive
>
> **Date:** 2026-09-23
>
> **Batch:** closes item 1 of the prior batch's "next work" list — wire
> `effectiveSolverInputIdentityStatus()` to read the bounded execution capsule
> ([`2026-09-23-hint-evidence-phase3-provenance-execution-occurrence-capsule-001.md`](2026-09-23-hint-evidence-phase3-provenance-execution-occurrence-capsule-001.md))
> off freshly-produced provenance entries directly, per
> [`2026-09-23-hint-evidence-phase3-producer-wiring-001.md`](2026-09-23-hint-evidence-phase3-producer-wiring-001.md).
>
> **Base commit:** `98a0860`.

## 1. Scope

`scripts/hint-discovery-replayability-lib.mjs::effectiveSolverInputIdentityStatus(entry, opts)` previously
required its caller to supply `solverRequestIdentity` from "an exact sibling-evidence/source-run join" —
its own doc comment said so, because until the prior two batches, no provenance entry ever carried this
fact itself. Every real call site (`scripts/stress/hint-reconstructability-report.mjs`) calls it bare, so
real corpus reconstructability was universally `false` for this dimension. Now that
`level-blind-capability-sweep.mjs`/`portfolio-solve-sweep.mjs` actually populate
`entry.execution.solverRequestIdentity` on freshly-saved hints, the function can read that fact directly
off the entry instead of requiring an external join for it.

## 2. Implementation

- Added `effectiveSolverRequestIdentity = nonEmpty(opts.solverRequestIdentity) ? opts.solverRequestIdentity
  : (entry.execution?.solverRequestIdentity ?? null)` — an explicit caller-supplied value still takes
  precedence (preserves the existing external-join contract for callers that have one), falling back to
  the entry's own embedded fact only when the caller supplies none.
- Both the `missingDimensions` check and the returned `identity.solverRequestIdentity` now use this
  resolved value instead of the raw `opts.solverRequestIdentity`.
- `solverStageId` is unchanged: the execution capsule does not carry a stage id (it was never part of
  `execution`'s scope — see the original capsule design), so it remains external-join-only. Inventing
  storage for it now would be a separate, larger schema decision outside the "read what already exists"
  scope of this batch.
- A historical entry with no `execution` capsule at all still resolves to `null` here exactly as before
  this batch — no fabrication, the fallback only reads a fact that is actually present.

## 3. Verification

- 3 new tests in `hint-discovery-replayability-lib-node-test.mjs`: an entry with a real embedded
  `execution.solverRequestIdentity` and no caller-supplied override becomes `reconstructable: true` using
  the embedded value; an explicit caller-supplied `solverRequestIdentity` still overrides the embedded one;
  an entry with no `execution` capsule at all still reports `missingDimensions: ['solverRequestIdentity']`
  (only, since `solverStageId` was supplied in that case) exactly as before.
- `node scripts/hint-discovery-replayability-lib-node-test.mjs` — all assertions pass.
- `node scripts/stress/hint-reconstructability-report-node-test.mjs` — unaffected (that CLI still calls
  the function bare with no `execution`-bearing fixtures), no regression.
- `npm run check:types` — clean.
- `npx vitest run` — 146 files / 1574 tests, all pass (unchanged; this module has no `.test.ts` sibling).
- `npm run test:node` — 181 packages, all pass.

## 4. What this batch does not do

- Does not change `scripts/stress/hint-reconstructability-report.mjs` itself — it still calls
  `effectiveSolverInputIdentityStatus(entry)` with no `solverStageId`, so real corpus entries remain
  `reconstructable: false` on that dimension regardless of this batch (the `solverStageId` gap is
  unaffected; only the `solverRequestIdentity` dimension can now resolve without an external join). Real
  reconstructability will only start showing `true` for hints saved by a producer that has actually run
  again since the prior batch's wiring landed — no historical entry retroactively gains information.
- Does not add a stage-id capsule to hint provenance. That would be new schema surface, not a read of
  something already recorded, and needs its own naming/vocabulary occupancy check and design pass.

## 5. Next work

Unchanged from the prior batch's remaining items: define the Firestore/GHA persistence layout and
bounded-growth unit for `occurrences`; verify the plan's remaining Phase 3 acceptance criteria against
real corpus data at scale. A stage-id capsule for hint provenance (to close the `solverStageId` dimension
the same way this batch closed `solverRequestIdentity`) is a reasonable candidate for a future, separate
batch once its own design is worked out.

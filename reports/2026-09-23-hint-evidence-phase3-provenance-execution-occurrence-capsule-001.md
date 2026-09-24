# Hint evidence consolidation — Phase 3 bounded execution/occurrence provenance capsule — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** concluded-positive
>
> **Date:** 2026-09-23
>
> **Batch:** first Phase 3 batch per the plan's section 4/W and section 14 dependency ordering
> ("provenance semantics and occurrence lineage... only after identity is stable" — Phase 2 closed in
> [`2026-09-23-hint-evidence-phase2-backend-decisions-001.md`](2026-09-23-hint-evidence-phase2-backend-decisions-001.md)).
>
> **Base commit:** `521be92`.

## 1. Scope

Extend the canonical `HintProvenanceEntry` shape with two new, strictly optional fields so a hint's
discovery record can carry a bounded reference to the execution/protocol identity that found it, and a
bounded, mergeable list of physical acquisition runs, without expanding the persisted Hint schema's
required surface or touching any existing field's semantics:

- **`execution`** — solver-request/protocol identity (`solverRequestIdentity`, `protocolHash`,
  `reproducibilityMode`, `arm`), reusing exactly the Phase 2 vocabulary. Participates in semantic
  identity: two entries that differ only in `execution` are genuinely different discoveries (e.g. the
  same path found once under a stale protocol and again under a corrected one is evidence worth keeping
  distinct).
- **`occurrences`** — bounded acquisition/run lineage (`runId`, `runAttempt`, `contractRef`,
  `observedAt`, `sourceRuns`), reusing the Phase 2 `sourceRunBindingFromContract` vocabulary. Explicitly
  **excluded** from semantic identity (mirrors the existing `foundAt` exclusion) and merged, not
  duplicated, when the same semantic discovery is independently reacquired from a different run.

This is pure schema/merge-logic infrastructure — no real producer is wired to supply these options yet
(that is the next batch).

## 2. Naming/vocabulary occupancy check

Searched `docs/naming-and-vocabulary.md` and the codebase for `execution`/`occurrence`/`occurrences`
before adding these as new `HintProvenanceEntry` keys:

- No existing `HintProvenanceEntry` field uses either name.
- `execution` as a field name is already established at the *contract* level
  (`contract.execution.{levelBlind,historyAware,schedulerMode,...}` in
  `scripts/solver-experiment-contract.mjs`) with compatible meaning (execution/protocol facts), so reusing
  it here is consistent rather than a second dialect for the same concept.
- `occurrences`/`sourceRuns` mirrors `sourceRunBindingFromContract`'s own `sourceRuns` field name
  one-for-one — deliberately not inventing a third term for "the runs that produced this evidence."
- No collision with any `modules/domain/hint-types.ts` export or `modules/domain/hint-runtime.mjs`
  function name.

## 3. Implementation

- `modules/domain/hint-types.ts`:
  - New `HintExecutionProvenance` interface: `{ schemaVersion: 1; solverRequestIdentity: string | null;
    protocolHash: string | null; reproducibilityMode: string | null; arm: string | null }`.
  - New `HintOccurrence` interface: `{ schemaVersion: 1; runId: string; runAttempt: string | null;
    contractRef: string | null; observedAt: string | null; sourceRuns: unknown[] | null }`.
  - `HintProvenanceEntry` gains optional `execution?: HintExecutionProvenance` and
    `occurrences?: HintOccurrence[]`.
  - `MakeProvenanceEntryOptions` gains the corresponding input options: `solverRequestIdentity?`,
    `protocolHash?`, `reproducibilityMode?`, `executionArm?`, `occurrenceRunId?`, `occurrenceRunAttempt?`,
    `occurrenceContractRef?`, `occurrenceObservedAt?`, `occurrenceSourceRuns?`.
- `modules/domain/hint-runtime.mjs`:
  - `executionFromOpts(opts)` — returns `undefined` unless at least one of `solverRequestIdentity`,
    `protocolHash`, `reproducibilityMode`, `executionArm` is set on `opts`; otherwise returns the full
    `HintExecutionProvenance` object with unset fields as explicit `null` (never omitted key vs. `null`
    ambiguity within the object once it exists at all).
  - `occurrenceFromOpts(opts)` — returns `undefined` unless `opts.occurrenceRunId` is set; otherwise
    returns a `HintOccurrence` with `observedAt` defaulting to the entry's own `foundAt` when
    `occurrenceObservedAt` is not supplied.
  - `makeProvenanceEntry(technique, opts)` — now computes `foundAt` as a local variable *first*
    (`opts.foundAt ?? new Date().toISOString()`), then calls `occurrenceFromOpts({ ...opts, foundAt })`
    so a freshly-generated `foundAt` is visible to the occurrence default rather than reading the
    still-unset `opts.foundAt`. `execution`/`occurrences` are conditionally spread into the returned
    object only when defined, preserving the exact legacy shape when no execution/occurrence input is
    given.
  - `provenanceEventIdentity(entry)` — destructures out `occurrences` (alongside the pre-existing
    `foundAt` and wall-clock search fields) before hashing, and now includes `execution` in the hash
    input.
  - New `occurrenceKey(occurrence)` (`` `${runId}::${runAttempt ?? ''}` ``) and
    `mergeOccurrenceLineage(a, b)` — returns `undefined` if both inputs are absent, otherwise a
    `Map`-deduped array keyed by `occurrenceKey`, first-seen wins (idempotent re-harvest of the exact
    same run never overwrites the first-observed record).
  - `dedupeProvenanceEntries(entries)` — rewritten from a `Set`-of-keys to a `Map` (key →
    entry) + `order` array, so that when two entries collapse to the same `provenanceEventIdentity`, their
    `occurrences` are merged via `mergeOccurrenceLineage` instead of the later duplicate being silently
    dropped in its entirety. The stored entry is only replaced when the merge actually grew the
    `occurrences` array (never regresses an entry to fewer occurrences than it already had).

## 4. Control-plane doc update

`docs/solver-protocol-schema-contraction.json` PSC-015 ("hint provenance schema generations") lists
`modules/domain/hint-runtime.mjs` and `scripts/hint-capture-lib.mjs` among its owners and is the
program's live control-plane tracker for provenance-shape changes (per the plan's section I). Appended a
dated note to its `progress` field recording that this addition is a fourth, strictly additive optional
shape within canonical nested provenance, that it introduces no new missingness ambiguity today because
no producer populates it yet, and that the next batch (real producer wiring) must apply the same
historical-vs-current generation discipline this gate already enforces once some producers start
supplying `execution`/`occurrences` and others don't. Deliberately did **not** change PSC-015's `status`
or `retirementGate` — those track a separate, pre-existing defect (historical `isolatedTechnique`
false/absent laundering) that this batch neither fixes nor worsens.

Deliberately did **not** edit `docs/hint-evidence-consolidation-inventory.json`: its own `purpose` field
states it is "pre-implementation executable inventory... descriptive planning input, not a runtime
authority," dated 2026-09-22 as a snapshot — unlike the PSC registry, nothing in its structure or the
plan's references to it treats it as a live tracker meant to be edited as each phase closes.

## 5. Verification

- `npm run check:types` — clean.
- `npm run check:types:tests` — clean.
- `npx vitest run` — 146 files / 1569 tests, all pass, including 13 new tests in
  `modules/domain/hint-types.test.ts` covering: `execution` omitted by default; `execution` built from a
  single supplied option with the rest defaulted to `null`; `occurrences` omitted by default; occurrence
  `observedAt` defaulting to `foundAt`; explicit `occurrenceObservedAt` override; `provenanceEventIdentity`
  treats different `execution` values as genuinely different entries (survive dedup as 2); it ignores
  `occurrences` (2 entries differing only in `occurrenceRunId` collapse to 1); `dedupeProvenanceEntries`
  merges occurrence lineage across a rediscovery (both `run-1`/`run-2` preserved, first entry's `foundAt`
  kept); re-harvesting the identical `runId`+`runAttempt` is idempotent (no duplicate occurrence, first
  `observedAt` wins); `mergeHints` preserves occurrence lineage across a path rediscovered from a
  different run; `upgradeProvenanceEntry` does not fabricate `execution`/`occurrences` for a historical
  entry that never had them; `upgradeProvenanceEntry` preserves an already-canonical entry's
  `execution`/`occurrences` unchanged.
- `npm run test:node` — 180 packages, all pass.
- `node scripts/hint-provenance-identity-node-test.mjs` — 8/8 pass, confirming the pre-existing
  `provenanceEventIdentity` semantic-dedup invariant this entire consolidation program depends on is
  unbroken by the `execution`/`occurrences` addition.
- `node -e "JSON.parse(...)"` against the edited `docs/solver-protocol-schema-contraction.json` — valid.

## 6. What this batch does not do

- No real producer (`scripts/hint-capture-lib.mjs`, `scripts/run-solver-direct.mjs`, the hint-save paths
  of `level-blind-capability-sweep.mjs`/`portfolio-solve-sweep.mjs`) supplies `execution`/`occurrence`
  options to `makeProvenanceEntry()` yet. Every existing and newly-created provenance entry today still
  has both fields absent — this batch only makes it *possible* to carry them.
- Does not touch `effectiveSolverInputIdentityStatus()` or change real corpus reconstructability, which
  remains universally `false` until producers are wired (unchanged from the state recorded in the Phase 2
  closing report).
- Does not choose or implement the Firestore/GHA persistence layout, bounded-growth unit, or byte-aware
  overflow behavior for `occurrences` — that is explicitly separate, later Phase 3 work per the plan.
- Does not modify the persisted Hint schema's required fields or any legacy field's semantics; purely
  additive.

## 7. Next work

1. Wire real producers to populate `execution`/`occurrence` options from the Phase 2 identity values they
   already compute (`solverRequestIdentity`, `protocolHash`, `reproducibilityMode`, `backend`,
   `runId`/`runAttempt`/`contractRef`) — the natural next Phase 3 batch.
2. Define the final semantic merge rules and bounded-growth unit for Firestore/GHA persistence of
   `occurrences`, with explicit byte-aware preflight and overflow behavior (plan section 14's Phase 3
   acceptance criteria).
3. Verify the explicit acceptance criteria once producers are wired: legacy-unknown round-trip, the
   662 synthetic-`foundAt` events remain semantically undated under the new model, reharvest-idempotency
   (already unit-proven here, needs corpus-level confirmation), independent-reacquisition-adds-lineage-
   without-duplication (already unit-proven here), cross-resource join keys survive merge/persistence.

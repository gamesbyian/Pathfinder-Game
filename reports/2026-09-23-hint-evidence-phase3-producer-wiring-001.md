# Hint evidence consolidation — Phase 3 real-producer execution/occurrence wiring — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** concluded-positive
>
> **Date:** 2026-09-23
>
> **Batch:** wires the three real solve-and-save producers to actually supply the bounded
> execution/occurrence provenance capsule added in
> [`2026-09-23-hint-evidence-phase3-provenance-execution-occurrence-capsule-001.md`](2026-09-23-hint-evidence-phase3-provenance-execution-occurrence-capsule-001.md).
>
> **Base commit:** `084f955`.

## 1. Scope

Every current-solve provenance construction path (`scripts/hint-capture-lib.mjs`'s `record()`, called by
`scripts/run-solver-direct.mjs`, `scripts/level-blind-capability-sweep.mjs`, and
`scripts/portfolio-solve-sweep.mjs`) now threads the real Phase 2 identity facts each producer already
computes (`solverRequestIdentity`, `reproducibilityMode`, and — where a real signal exists —
`executionArm`/`occurrenceRunId`) into `makeProvenanceEntry()`'s `execution`/`occurrence` options, so a
freshly-saved hint's provenance carries a bounded reference to the run that found it.

## 2. Implementation

### `modules/solver/hint-provenance.ts`

- `ProvenanceContext` gains `solverRequestIdentity?`, `protocolHash?`, `reproducibilityMode?`,
  `executionArm?`, `occurrenceRunId?`, `occurrenceRunAttempt?`, `occurrenceContractRef?`,
  `occurrenceSourceRuns?` — typed `string | undefined` (never `| null`) for the four execution fields and
  `occurrenceRunId`, mirroring `MakeProvenanceEntryOptions` exactly. This is a deliberate, load-bearing
  constraint: `makeProvenanceEntry()`'s `executionFromOpts()`/`occurrenceFromOpts()` key their presence
  check on `!== undefined`, so an explicit `null` would wrongly assert "known absent" for a fact a caller
  genuinely has no way to know (an `undefined` ctx field passed through must stay `undefined`, not become
  a fabricated `null`). `tsc` caught this exact mismatch on first attempt (a `string | null | undefined`
  ProvenanceContext field is not assignable where `MakeProvenanceEntryOptions` declares `string |
  undefined`) — the type system enforced the historical-missingness discipline before any test needed to.
- `provenanceFromSolveAttemptInfo()` forwards all eight fields straight from `ctx` into the
  `makeProvenanceEntry()` call (no `?? null`), so an omitted `ctx` field stays `undefined` all the way
  through.
- 5 new tests in `hint-provenance.test.ts` prove: `execution`/`occurrences` are omitted when ctx supplies
  neither; all four execution fields forward correctly; a single supplied field still produces a complete
  capsule with the rest explicit `null` (not omitted, once the capsule itself exists); `occurrenceRunId`/
  `occurrenceRunAttempt` forward into `occurrences[0]` with `observedAt` defaulting to the entry's own
  `foundAt`; and `occurrenceContractRef` alone (no `occurrenceRunId`) never fabricates an occurrence.

### `scripts/hint-capture-lib.mjs`

- `createHintCapture()` gains an `executionContext` option (default `{}`), a run-wide constant spread
  directly into every `provenanceBuilder()` call inside `recordWithProvenance()`. One run's execution
  identity does not vary per level, so it is supplied once at construction rather than per `record()`
  call — matching how `solverVersion`/`budgetMs` already work here.

### `scripts/level-blind-capability-sweep.mjs`

- Reordered the pre-existing solver-request-identity/backend/reproducibility-mode computation (previously
  after `createHintCapture()`) to before it, since `createHintCapture()` now needs those values.
- Added `hintExecutionContext = { solverRequestIdentity, reproducibilityMode, ...(GITHUB_RUN_ID ?
  {occurrenceRunId, ...(GITHUB_RUN_ATTEMPT ? {occurrenceRunAttempt} : {})} : {}) }`. No `protocolHash`/
  `executionArm`: this producer builds no experiment-contract object and has no arm concept, so both stay
  genuinely absent rather than guessed (same reasoning already applied to `publish-solver-sweep-result.mjs`
  et al. in the prior Phase 2 backend-decisions batch).

### `scripts/portfolio-solve-sweep.mjs`

- Added the same `hintExecutionContext`, plus `executionArm: staticPortfolioArmName` when set — this is
  the one producer with a real arm concept (`--static-portfolio-arm`), reusing the exact `arm` vocabulary
  `sourceRunBindingFromContract()`/`hashExecutionProtocol()` already established in Phase 2.

### `scripts/run-solver-direct.mjs`

This producer had **no** canonical solver-request identity, backend, or reproducibility-mode dual-write
at all before this batch — it predates every Phase 2 wiring batch. Brought it up to the same standard as
the other two producers:

- Built the literal `solveOpts` object (`{ timeBudgetMs, schedulerMode: 'production',
  ...(baseWorkBudget) }`) once and reused it at both the `Solver.solveLevel()` call site and the
  projection-building call site — the same "one literal object proves what reached the execution
  boundary" discipline every other producer already follows.
- Added `buildCanonicalSolverRequestProjection`/`solverRequestIdentityFromProjection`/
  `classifyReproducibilityMode` imports and wired `solverRequestIdentity`/`backend: 'direct'`/
  `reproducibilityMode` into both the output report (`out.solverRequestProjection` etc.) and the new
  `hintExecutionContext`.
- **Found and fixed two real, independent, pre-existing bugs** while doing this (see section 3).

## 3. Bugs found and fixed (not the batch's original goal, but directly in scope)

1. **`--work-budget` was completely broken.** The CLI passed `{ timeBudgetMs, workBudget }` straight to
   `Solver.solveLevel()`. `orchestration.ts` explicitly rejects the retired key: `"solveLevel: retired
   SolveOpts.workBudget input; use baseWorkBudget"`. Every level run with `--work-budget` silently failed
   with an `'error'` status per-level (never crashed the whole run, so it was easy to miss) instead of
   solving. Reproduced live before fixing:
   ```
   $ node scripts/run-bundled.mjs scripts/run-solver-direct.mjs -- --levels=pos:1 --budget-ms=2000 --work-budget=50000
     L1: ERROR — solveLevel: retired SolveOpts.workBudget input; use baseWorkBudget
   ```
   Fixed by routing through the same `solveOpts` object used for the canonical projection, using the live
   `baseWorkBudget` key name. Root-caused rather than patched around: this was surfaced only because
   building the canonical projection required constructing the real literal `solveOpts` object this tool
   was never building explicitly before.
2. **`schedulerMode` was never set**, even implicitly-as-a-known-fact. `orchestration.ts` defaults an
   omitted `schedulerMode` to `'production'` internally
   (`const schedulerMode = opts.schedulerMode ?? 'production';`), so every run through this tool already
   *is* production-scheduled — the same fact `level-blind-capability-sweep.mjs` already records explicitly
   in its own `solveOpts` literal, with its own comment explaining why. Without it, `solveOpts.schedulerMode`
   was `undefined`, which `classifyReproducibilityMode()` correctly classifies as `'unknown'` (a real,
   principled "no known producer" default, not a bug in that classifier) rather than the true
   `'deterministic-work'` this tool's real execution semantics warrant. Fixed by setting
   `schedulerMode: 'production'` explicitly in the literal `solveOpts`, matching the established
   convention. Caught by the new CLI test asserting `reproducibilityMode === 'deterministic-work'`, which
   failed with `'unknown'` on first run — exactly the kind of "prove real value transport, don't trust
   'should work'" case this program's own discipline exists to catch.

## 4. Verification (real execution topology, not unit-level shape checks only)

- **`scripts/level-blind-capability-sweep-cli-node-test.mjs`**: extended the existing real bundled
  invocation with `--save-hints`, then read back the temp corpus via `readLevelCorpusDocumentWithHints()`
  and asserted the persisted hint's `provenance[0].execution` matches this run's own reported
  `solverRequestIdentity`/`reproducibilityMode` exactly, and that `occurrences` stays genuinely absent
  (no `GITHUB_RUN_ID` in a local test process — proving no fabricated occurrence).
- **`scripts/portfolio-solve-sweep-cli-node-test.mjs`**: added a third real bundled invocation with
  `--save-hints` AND a real `GITHUB_RUN_ID=998877`/`GITHUB_RUN_ATTEMPT=1` env, proving the occurrence
  lineage's `runId`/`runAttempt` actually reach the persisted hint provenance from a real environment
  signal, not just that the field can exist.
- **`scripts/run-solver-direct-cli-node-test.mjs`** (new — this producer had zero CLI test coverage
  before): real bundled invocation against a real, already-committed level (`pos:1`, read-only — never
  `--save-hints`, so this test never mutates `data/levels.json` or its hint artifacts) with
  `--work-budget=5000000`, proving (a) the level no longer reports the retired-key error, (b)
  `--work-budget` actually reaches the canonical projection's `resourceEnvelope.baseWorkBudget` unchanged,
  and (c) `backend`/`reproducibilityMode` report `'direct'`/`'deterministic-work'`.
- `npm run check:types` / `check:types:tests` — clean.
- `npx vitest run` — 146 files / 1574 tests, all pass (5 new in `hint-provenance.test.ts`).
- `npm run test:node` — 181 packages, all pass (180 + the new `test:run-solver-direct-cli`, added to
  `package.json`'s script list and the `test:node` aggregate).
- `node scripts/hint-provenance-identity-node-test.mjs` — 8/8 pass, the semantic-dedup invariant remains
  unbroken.

## 5. What this batch does not do

- Does not wire `protocolHash` anywhere: no current producer constructs an experiment-contract object
  (`hashExecutionProtocol()`'s own input), so it stays genuinely absent everywhere per the
  historical-missingness doctrine — this is not a gap, it is the correct state until a producer that
  builds a real contract (like `publish-solver-sweep-result.mjs`) also calls `hintCapture`.
- Does not exercise `--save-hints` against the real committed `data/levels.json` for
  `run-solver-direct.mjs` — its `LEVELS_PATH` is hardcoded (no `--corpus` flag), so doing so safely would
  require either a code change to make the corpus path configurable or accepting risk to shared committed
  data; out of scope for this batch. The execution/occurrence wiring at this producer's `hintCapture` call
  site is mechanically identical to the other two (already proven end-to-end via real `--save-hints`
  runs), and this producer's own identity/backend/bug-fix transport is proven without `--save-hints`.
- Does not touch `effectiveSolverInputIdentityStatus()` or `scripts/hint-reconstructability-report.mjs`,
  which still call it bare with no `solverRequestIdentity`/`solverStageId` — real corpus
  reconstructability is unaffected by this batch. Wiring that consumer to read the new
  `execution.solverRequestIdentity` off freshly-saved provenance entries is separate follow-on work.
- Does not change the Firestore/GHA persistence layout or bounded-growth unit for `occurrences` — still
  open per the prior batch's "next work" list.

## 6. Next work

1. Wire `effectiveSolverInputIdentityStatus()`'s callers to read the new `execution` capsule off freshly
   produced provenance entries, so real corpus reconstructability stops being universally `false`.
2. Define the Firestore/GHA persistence layout and bounded-growth unit for `occurrences`.
3. Verify the plan's remaining Phase 3 acceptance criteria against real corpus data once producers have
   run for real with this wiring: the 662 synthetic-`foundAt` events remain semantically undated,
   cross-resource join keys survive merge/persistence at scale.

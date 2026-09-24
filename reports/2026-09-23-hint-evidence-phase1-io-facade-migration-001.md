# Hint evidence consolidation — Phase 1 stale hint/corpus I/O facade migration — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** concluded-positive (see "What remains open" below)
>
> **Date:** 2026-09-23
>
> **Batch:** 2 of the dependency-ordered sequence in
> [`docs/hint-evidence-execution-identity-storage-consolidation-plan.md`](../docs/hint-evidence-execution-identity-storage-consolidation-plan.md)
> section 14.4 — "Semantic ingress + missingness" (Phase 1), specifically the stale-I/O-writer/reader
> repair and single-mutable-authority sub-item, and PSC-001 in
> [`docs/solver-protocol-schema-contraction.json`](../docs/solver-protocol-schema-contraction.json).
>
> **Base commit:** `c88461ab669950e4b6d06873431a3704dbe2c4a9` (`main`), plus this branch's own Phase 0
> rescue commit. No canonical hint provenance/corpus data was rewritten by this batch.

## 1. Why this batch

Batch 1 (Phase 0 rescue) is complete. Per the plan's dependency order, Phase 1 ("repair current
boundaries and establish one semantic ingress") comes next, and its first listed item is: "migrate
maintained readers/writers off removed hint/corpus persistence facades; restore one canonical
mutation/write authority and add the maintained-reachability guard." The plan (section 13.1.A) and the
pre-implementation audit both name this a **current regression, not historical compatibility debt**:
`scripts/level-data-io.mjs` removed `readLevelsWithHints`/`writeLevelsWithHits` in favor of an explicit
corpus-document API, but several maintained scripts still imported the removed names.

## 2. Scope

Migrate every **maintained-reachable** consumer of the removed facade to the current API
(`readLevelCorpusDocumentWithHints`/`writeLevelCorpusDocumentWithHints` + `setLevelHintRecords`), and
add the mechanical guard the plan requires so this seam cannot silently reopen. Historical/dormant
files that merely mention the old names (in comments, string literals, or genuinely unreachable code)
are out of scope, per the plan's own reachability-based classification — but they remain guard-checked
going forward if they ever become reachable again.

Out of scope: the broader Phase 1 items (source-generation-aware historical missingness adapters,
July-11 synthetic-`foundAt` handling, worker side-channel parity, Firestore evidence-loss containment).
Those are separate sub-batches with their own compatibility owners and are still fully open.

## 3. Reconstructing the actual reachable set

The pre-implementation audit's own continuation pass had already found the original 7-file spot list
incomplete (56 files mention the removed names; ~24 judged maintained-reachable by a one-off audit
script, `scripts/hint-evidence-consolidation-audit.mjs`). Rather than trust either the original 7-file
list or a fresh manual grep, this batch built a **permanent, fast, repository-local reachability guard**
(`scripts/hint-io-facade-guard-lib.mjs` + `scripts/hint-io-facade-guard-node-test.mjs`) that:

- seeds a "maintained" set from every file path referenced in `package.json` or a
  `.github/workflows/*.yml` file;
- follows relative imports transitively (so a `-lib.mjs` imported only by a maintained script is
  correctly classified as reachable);
- flags any reachable file whose source contains an actual call to the removed
  `readLevelsWithHints(`/`writeLevelsWithHints(` (not a bare identifier — the regex requires call
  syntax, which excludes historical/comparison prose in comments and string literals, e.g. an error
  message naming the old writer, or a test asserting a bundle does *not* contain that string).

Running it cold against the pre-batch tree found **26 maintained-reachable offenders** — the 7
originally named plus 19 more the prior string-grep census had not separated from dormant files.

## 4. What was migrated

All 26 reachable offenders now use the explicit corpus-document API. Grouped by what else each fix
needed beyond the mechanical import swap:

### Writers needing more than an import swap

- **`scripts/hint-candidate-search.mjs`** — its `--write-levels` path used to mutate `raw.hints`
  directly with no provenance at all (the plan's flagged PSC-001/13.1.A regression). It now constructs
  honest `makeProvenanceEntry()` records per accepted candidate through `setLevelHintRecords`/
  `mergeHints`. The tool's four solver-derived phases (`baseline`, `strategy`, `forced-first-step`,
  `forced-first-step-strategy`) get `solver.id = SOLVER_ID` (a real solver invocation happened) with an
  honest `technique` string and, where applicable, the same `forcingGateKey`/`forcingDirection` fields
  the native solver's own forced techniques and `cpsat-hint-harvest.mjs` already use for "forced first
  step from this gate in this direction". The `corner-flip` phase is **not** a solver run — it is a
  deterministic geometric mutation of an already-accepted hint, referee-validated but never run through
  the solver — so it gets a new, narrowly-scoped, locally-defined producer id
  (`candidate-search-geometry-mutation`, following the existing `VARIANT_REPLAY_SOLVER_ID` precedent of
  a small per-producer id rather than a shared/central one) instead of the honest-but-wrong `SOLVER_ID`.
  An unrecognized `solver.id` already falls back to the safe `'other'` bucket in
  `provenance-source-taxonomy.mjs::classifyProvenanceOrigin`, so this cannot be misread as ordinary
  production-solver capability evidence. Verified end to end against a scratch corpus copy (not the
  real one): a corner-flip acceptance produced a canonical Hint record with
  `solver.id: "candidate-search-geometry-mutation"`, `technique: "candidate-search-corner-flip"`,
  `termination: "unknown"`, and a real `context.levelRevision` — no fabricated fields.
- **`scripts/stress/cpsat-hint-harvest.mjs`** — already built honest `makeProvenanceEntry()` records
  with `EXTERNAL_SOLVER_ID`; only needed the facade swap plus replacing its manual
  `lv.hintRecords = records; lv.hints = records.map(...)` with `setLevelHintRecords(lv, records)`.
- **`scripts/family-parent-hint-replay-batch.mjs`** — same manual-projection pattern
  (`parent.hints = parent.hintRecords.map(...)`), replaced with `setLevelHintRecords`.
- **`scripts/dedupe-hint-provenance.mjs`** — mutated `level.hintRecords` directly (never touched
  `.hints`, so no desync bug existed), routed through `setLevelHintRecords` for consistency and to stay
  inside the single mutable-authority boundary the guard now enforces.
- **`scripts/run-solver-direct.mjs`** — this one was **actually broken today**, not just stale-import
  broken. It called the shared `hint-capture-lib.mjs`'s `flush(levelsJsonPath, document)` with a bare
  `levels` array, but that helper's current contract requires an explicit
  `{levels, metadata, storageShape}` document and throws `'hint capture flush requires an explicit
  corpus document'` otherwise. Since `--save-hints` is opt-in and only writes when a run actually finds
  a *new* discovery, this defect could sit silent through ordinary green CI — exactly the plan's named
  "local-green / sparse-CI-red" and "canonical fields existing but never reaching the real solver
  invocation" failure modes. `solver-diagnostics.yml` passes `--save-hints`, so this is a maintained GHA
  consumer. Fixed by threading the real corpus document through; verified with a scratch-corpus probe
  that calls `hintCapture.record()`/`flush()` exactly as the script does, confirming the write path now
  succeeds instead of throwing.

### Readers (mechanical fix only)

`scripts/hint-expansion-audit.mjs`, `scripts/hint-workbench-parallel.mjs`,
`scripts/validate-hint-paths.mjs`, `scripts/generate-level-heatmaps.mjs`,
`scripts/hint-weight-calibration.mjs`, `scripts/req-length-sweep.mjs`, and 15
`scripts/stress/*.mjs` analysis/report scripts (`analyze-residual-interfaces`,
`census-repair-rollback-windows`, `collect-known-solution-prefix-branches`, `collect-prune-gap-labels`,
`compare-search-producer-populations`, `cpsat-hint-harvest-sweep`, `lane-a-c1-boundary-kinematics-analysis`,
`lane-a-c2-global-accounting-analysis`, `provenance-coverage-report`, `prune-gap-probe`,
`solution-profile-compare`, `solution-profile-lib`, `validate-corpus-witnesses`) — each just needed
`readLevelsWithHints(x)` → `readLevelCorpusDocumentWithHints(x).levels` (or the equivalent destructure
at the call site, including chained `.filter`/`.flatMap` call sites).

## 5. The guard

`npm run test:hint-io-facade-guard` (also added into the `test:node` aggregate) runs
`scripts/hint-io-facade-guard-node-test.mjs`, which asserts the reachable-offender list is empty. It is
green on the current tree. A regression test (temporarily reverting one already-fixed file and
confirming the guard fails, then restoring it and confirming green again) validated the guard actually
detects what it claims to.

`docs/solver-protocol-schema-contraction.json`'s PSC-001 entry has been updated with this batch's
progress; it stays `"in-progress"` rather than closing, per §6 below.

## 6. What remains open

- **PSC-001 is not fully closed.** Its retirement gate also names "a guard prevents projection-only
  `.hints` persistence" — a broader pattern (any direct `level.hints = ...` mutation, not just the two
  removed function names) that this batch's guard does not check. A repo-wide scan for that broader
  pattern across the same reachability graph found exactly two hits, both in
  `modules/editor/level-coordinate-transforms.ts`, both intentionally clearing an in-memory *editor
  working level's* hints after a coordinate remap (never touching a persisted corpus document or
  `hintRecords`) — reviewed and judged benign, not a persistence-boundary violation. No automated guard
  yet prevents a *new* canonical writer from reintroducing bare-path-only persistence; that is left for
  a future batch rather than expanding this one's scope.
- **32 dormant files** still mention the removed names (comments, unreachable scripts, or one-off
  research tools with no `package.json`/workflow entrypoint). They remain historical/maintenance debt
  per the plan's own classification; the guard will catch them automatically if they ever become
  reachable again without migration.
- The rest of Phase 1 (historical missingness/`upgradeProvenanceEntry()` false-laundering, the July-11
  synthetic-`foundAt` cohort, worker `beamFlowCounters`/`pruneDiagnostics` parity, Firestore evidence-loss
  containment, and the shared v1-v3 browser/Node decoder boundary) is untouched by this batch and remains
  fully open.

## 7. Verification performed

- `npm run test:hint-io-facade-guard` — green.
- `node --check` on every `.mjs` file touched — clean.
- Live execution (not just syntax) of the read paths: `test:hint-path-validation` (`--levels=pos:1,pos:2`),
  `hints:expansion-audit`, `dedupe-hint-provenance.mjs` (dry run), `family-parent-hint-replay-batch.mjs`
  (dry run, `--corpora=published`) — all ran correctly against the real committed corpus with no writes.
- Live execution of both write paths against **scratch copies** of `data/levels.json` (never the
  tracked corpus): `hint-candidate-search.mjs --write-levels` (exercised the corner-flip provenance
  branch) and a direct `hint-capture-lib.mjs` record/flush probe standing in for
  `run-solver-direct.mjs --save-hints`. Both produced correct canonical `Hint` records.
- `git status`/`git diff` confirms no file under `data/` was modified by this batch — only source files
  under `scripts/`, `docs/`, and `package.json`, plus this report.

## 8. Exit evidence

- The guard itself (`scripts/hint-io-facade-guard-node-test.mjs`, wired into `test:node`) is the durable
  regression proof.
- This report.
- Updated `docs/solver-protocol-schema-contraction.json` PSC-001 progress note.
- Updated `docs/hint-workbench.md` (was teaching the removed `writeLevelsWithHints` name).

## 9. Next batch

Per the plan's default batch topology, the remaining Phase 1 items are still open: historical
missingness semantics (absent-capability-boolean laundering in `upgradeProvenanceEntry()`), the July-11
synthetic-`foundAt` cohort, worker side-channel parity, Firestore evidence-loss containment, and the
shared v1-v3 decoder boundary. Given each has a distinct compatibility owner and validation graph, the
next sub-batch should pick one rather than attempting all of Phase 1 at once, per the plan's explicit
instruction not to implement a whole numbered phase as one PR.

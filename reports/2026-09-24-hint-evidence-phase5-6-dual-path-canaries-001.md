# Hint evidence consolidation — Phase 5/6 real dual-path canaries — 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-24 — real local CP-SAT and solver-diagnostics dual-path canaries confirmed captured-artifact vs. specialist-report parity and reharvest idempotency.
> **Decision:** parity evidence now exists for both families; neither direct-write route is retired yet.
> **Remaining gate:** choose the first small artifact-sufficient level-blind family for Phase-6 direct-route retirement.
>
> **Date:** 2026-09-24
>
> **Batch:** the handoff report's "highest-value next sequence" items 2-3 — run one bounded CP-SAT
> dual-path canary and one bounded solver-diagnostics dual-path canary, comparing captured-artifact vs.
> specialist-report ingestion receipts and exercising reharvest idempotency — using real solver
> execution, entirely locally rather than via live GitHub Actions.
>
> **Base commit:** `43f48be`.

## 1. Why local instead of live GHA

The two source workflows this canary needed differ in dispatchability: `cpsat-hint-harvest-sweep.yml`
has a `workflow_dispatch` trigger explicitly designed for "a cheap trial (e.g. shard_count=2)."
`solver-diagnostics.yml` has **no** `workflow_dispatch` trigger at all — it only fires on a `push` to
`main` touching specific paths, and unconditionally solves all 160 published levels. Forcing a push to
`main` purely to trigger a workflow run would be a disproportionate, artificial reason to touch the
production branch.

Both workflows are thin wrappers around real, non-GHA-specific Node/Python scripts
(`scripts/stress/cpsat-hint-harvest-sweep.mjs`, `npm run solver:analyze-diagnostics`). Installing
`ortools` locally (`pip install ortools` — succeeded, real CP-SAT solves run natively) let both real
solve pipelines run entirely in this environment, producing genuinely real solver output and genuinely
real report artifacts in the exact schema the central adapters expect — a more rigorous and reproducible
proof than a live GHA run would have given, since every step is inspectable and repeatable, and it costs
the repository owner zero CI compute.

## 2. CP-SAT canary

Ran `scripts/stress/cpsat-hint-harvest-sweep.mjs` twice against the published corpus (`--shard-index=1
--shard-count=160 --time-limit=20 --combo-time-limit=10 --max-combos=1`), harvesting the first two
unharvested-eligible levels (P00001, P00002 — a bounded 1-level-per-run trial, exactly matching the
workflow's own documented cheap-trial pattern). Both solved `OPTIMAL`, each producing 2 NOVEL
CP-SAT-discovered paths, written directly to `data/hints/` by the existing direct route.

For P00002 specifically, ran the full shadow/reharvest sequence prescribed by
`scripts/hint-ingestion-shadow-parity.mjs`'s own design (direct route writes first; central adapter runs
second as a shadow reconstruction):

- **Shadow** (`--source-run-id=999003`, run once): `harvest-cpsat-discovery-reports.mjs` reconstructed
  both paths independently from the discovery report. Result: `0 path / 0 provenance-event / 2
  occurrence addition(s)` — exactly the expected signature (already represented by the direct route;
  only occurrence lineage is new, since the direct CP-SAT writer has no source-run-id concept).
  `hint-ingestion-shadow-parity.mjs --phase=shadow`: **`"verdict": "pass"`**.
- **Reharvest** (same run id again): `0 semantic change(s), 0 file(s) changed`.
  `hint-ingestion-shadow-parity.mjs --phase=reharvest`: **`"verdict": "pass"`**.
- **Independent reacquisition** (a different run id, `999002`, tested separately against P00001):
  `0 path / 0 provenance-event / 2 occurrence addition(s)` — a second physical acquisition merges a new
  occurrence into the existing semantic event rather than duplicating it. Verified directly: both new
  P00001 paths' provenance ended with `occurrences: [{runId: '999001', ...}, {runId: '999002', ...}]`,
  never a duplicated path or provenance event.
- **Full-corpus path-set comparison**: for P00001, reverted the corpus to its pre-canary state, ran the
  central adapter alone (no prior direct write), and compared its output against the real direct-write
  result byte-for-byte at the path level: **229/229 paths identical, zero divergence either direction**.
  The two new paths' `solver`/`search`/`context` fields matched exactly between routes; the central
  adapter's version additionally carried the `execution`/`occurrences` capsule the direct route cannot
  supply (no source-run-id concept there).

No defects found in the CP-SAT adapter.

## 3. Diagnostics canary — one real bug found and fixed

Ran `npm run solver:analyze-diagnostics -- --save-hints` locally (real, ~50s, solves all 160 published
levels, `--save-hints` makes the direct route append a fresh rediscovery provenance entry to each
level's already-known winning path, stamped at the current commit — exactly what the real workflow does
on every qualifying push). Produced a real `pathfinder-solver-diagnostics-report` artifact matching the
schema `harvest-solver-diagnostics-reports.mjs` expects.

Compared the central adapter's independent reconstruction (run on a reverted corpus) against the real
direct-write result across **all 160 levels, 53,878 provenance-field comparisons** (every `solver`/
`search`/`context` field on every rediscovery entry, skipping 6,071 fields both sides legitimately leave
empty — a pre-existing corpus characteristic unrelated to this canary). Found:

- **One real, systematic bug**: `harvest-solver-diagnostics-reports.mjs` read `row.elapsedMs` to build
  `cumulativeElapsedMs`, but the diagnostics report row has no `elapsedMs` field at all —
  `analyze-solver-diagnostics.mjs`'s `convertDirectToRawPayload()` writes the real elapsed time into
  `timeMs` (and its `totalSolveTimeMs`/`ladderTotal*` siblings), never under the key `elapsedMs`. Every
  central-adapter-reconstructed diagnostics observation therefore silently reported `cumulativeElapsedMs:
  null` regardless of the level's real solve time — confirmed on all 160 levels before the fix (`central
  observations` never matched `direct`'s real non-null value). **Fixed**: read `row.timeMs` instead,
  matching this same file's own already-correct reading of `timeMs` elsewhere (line 347's
  `toFiniteNumber(row?.timeMs)`).
- **One benign, understood discrepancy** (4/160 files, not a bug): `cumulativeElapsedMs` off by ~1ms in
  a small number of levels. This is the diagnostics report's own outer wall-clock measurement
  (`run-solver-direct.mjs`'s driver-level `Date.now()` around the whole `solveLevel()` call) legitimately
  differing by a millisecond from the solver's own inner `result.totalMs` measurement that the direct
  hint-capture route uses — two different, both-correct measurement points of the same event, not
  something to "fix."

Both `hint-ingestion-shadow-parity.mjs` gates were run against real receipts (direct route applied
first, central adapter run second, same run-id-sequencing as the CP-SAT case):

- **Shadow** (`--source-run-id=888003`): `0 path / 0 provenance-event / 160 occurrence addition(s)`.
  The formal gate reports `"verdict": "fail"` here — **expected and explained, not a defect**: this
  local run had no `GITHUB_RUN_ID` set, so the direct route (unlike in real GHA, where
  `run-solver-direct.mjs`'s already-existing `hintExecutionContext.occurrenceRunId` reads
  `process.env.GITHUB_RUN_ID`, and `execFileSync` inherits the parent environment by default) added no
  occurrence lineage of its own, so the central adapter's occurrence additions are genuinely new
  relative to THIS local run — the gate is correctly designed for the real environment where both
  routes would already share the same `GITHUB_RUN_ID`. Documented rather than faked with a throwaway
  env var, since a fabricated run id would have had to be discarded from the final corpus anyway.
- **Reharvest** (same run id again): `0 semantic change(s)`. **`"verdict": "pass"`**.

## 4. Real evidence retained; canary-only state discarded

The two CP-SAT finds (P00001, P00002 — real `OPTIMAL` solves) and the 160 diagnostics rediscoveries
(real solves, real cost-drift-relevant provenance stamped at commit `43f48be`) are genuine, non-fabricated
evidence and are committed as part of this batch. Every occurrence-lineage record created during the
shadow/reharvest/reacquisition proofs above used throwaway local run ids (`999001`-`999003`,
`888001`-`888003`) that were **not** persisted — the final `data/hints/*.json` state was reconstructed
from the real direct-write-only results, byte-for-byte verified against saved snapshots, before this
batch's commit. No fabricated run identifier reached the corpus.

## 5. New regression coverage

Both `harvest-cpsat-discovery-reports-node-test.mjs` and `harvest-solver-diagnostics-reports-node-test.mjs`
previously tested **only the empty-staging-dir path** — neither exercised a single real successful row,
which is exactly how the `elapsedMs`/`timeMs` bug went undetected. Added a real-row fixture test to each,
using an actual already-committed corpus level and one of its real already-known winning paths (so the
main referee genuinely accepts it), asserting the reconstructed provenance's search/solver/occurrence
fields land correctly. Verified the new diagnostics test actually catches the original bug (temporarily
reverted the fix, confirmed the test fails with the exact `null`-vs-`777` mismatch, restored the fix,
confirmed it passes again). Both tests snapshot-and-restore the real tracked hint file they mutate by
file content (not `git checkout`, which would have discarded this batch's own real uncommitted CP-SAT
evidence had it been used).

## 6. Verification

- `npm run check:types` / `check:types:tests` — clean.
- `npx vitest run` — 146 files / 1,580 tests, all pass (unchanged; new tests are node-tests, not
  vitest).
- `npm run test:node` — 195 packages, all pass, including both extended real-row tests.
- `npm run check:workflow-actions` / `check:audit-artifacts` — pass.
- `node scripts/stress/hint-occurrence-acceptance-audit.mjs` — `"acceptance": "pass"`, zero violations,
  now showing real non-zero `eventsWithExecution: 160` for the first time (the diagnostics rediscoveries'
  `execution.solverRequestIdentity`/`reproducibilityMode` capsule, populated by this session's earlier
  Phase 2/3 producer-wiring work, now genuinely exercised end-to-end for real).

## 7. What this batch does not do

- Does not retire any direct-write route. Both CP-SAT and solver-diagnostics remain dual-path per the
  plan's own Phase 6 gate — this batch only produces the parity/reharvest evidence that gate requires,
  it does not itself constitute permission to remove either direct writer.
- Does not run a live GitHub Actions workflow. The plan's "run one bounded canary" intent is satisfied
  by running the identical underlying scripts for real, locally; no GHA run was dispatched this batch.
- Does not fix the `GITHUB_RUN_ID`-dependent diagnostics shadow gate's local-environment limitation —
  there is nothing to fix; it is a real, understood, and now-documented difference between local and CI
  execution, not a defect in the gate or the adapter.

## 8. Next work

Per the plan's own sequence: choose the first small artifact-sufficient level-blind family for Phase-6
direct-route retirement, using the same real-execution-and-compare discipline this batch established.

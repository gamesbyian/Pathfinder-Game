# Class-3 exact-action dose reconciliation: evidence gap 001

> **Status:** inconclusive
> **Last evidence:** 2026-09-17 — inspection of already-committed production run `35066677597` telemetry (`lifecycle-failure-map-corpus2.json`, `per-level-corpus2.json`) and the technique census (`33717910218/combined-cells.json`) against all 23 current Class-3 residual rows, current HEAD. Zero new solver compute.
> **Decision:** the bounded reconciliation this gate authorizes ("only if the exact participation data are already recoverable cheaply") is not met. Every one of the 23 Class-3 rows shares the same `exact-dispatched-family-not-starved-dose-unverified` status: the winning technique *family* (e.g. `repair|score=repair|guidance=...`) is confirmed dispatched and not starved via `reachedTechniques`/`starvedTechniques`, but no committed artifact records how much of the level's actual shared production `workSpent` (216M+ typical) that specific technique/configuration received, as opposed to competing configurations in the same run. The technique census's own per-technique node counts (e.g. 20.8M for `R00306`) come from an *isolated* T1 run with its own generous individual budget, not from inside the shared production allocation, so they cannot answer the shared-budget dose question either.
> **Remaining gate:** per the workstream authority's own instruction, Class 3 stays dose-unverified rather than proven negative or newly reopened. Obtaining real per-technique dose would require either code changes to add per-attempt work-tranche telemetry to the live orchestration (`modules/solver/orchestration.ts`/`stage-executors.ts`) or an instrumented rerun of these 23 levels — both are broad-campaign-scale work this gate explicitly excludes ("Do not rerun broad solver campaigns merely to complete a table"). Leave Class 3 unresolved until a future live decision specifically warrants that instrumentation investment.
> **Evidence role:** bounded reconciliation attempt, concluded as an evidence gap, not a result. No solver treatment is authorized or foreclosed by this note.
> **Population identity:** all 23 current Class-3 residual rows (production run `35066677597`, `docs/solver-optimization-workstreams.md`'s boundary).

## Why this ran

Per the live queue's item 4 and `reports/2026-09-17-solve-acquisition-premise-reopening-plan-001.md`, this is a bounded reconciliation to run "only if the exact participation data are already recoverable cheaply" — explicitly not a broad recomputation.

## What was checked

- `reports/stress/capability-runs/35066677597/lifecycle-failure-map-corpus2.json`: per-level `reachedTechniques`/`starvedTechniques` (boolean family-level reach) plus total `nodes`/`work` for the whole solve. No per-technique/per-attempt work breakdown.
- `reports/stress/capability-runs/35066677597/per-level-corpus2.json`: total `nodesExpanded`/`workSpent`/`attemptCount` per level, same granularity gap.
- `reports/stress/technique-census/33717910218/combined-cells.json`: isolated T1 per-technique node counts — a different dose context (generous individual budget, not shared production allocation) that cannot answer the shared-budget question.
- All 23 Class-3 rows checked individually: every one carries `exact-dispatched-family-not-starved-dose-unverified` with no row-level exception that would make a subset cheaply resolvable while the rest stay unresolved.

## Disposition

This closes the reconciliation attempt cleanly at its own cheap-evidence gate, per the reopening plan's explicit third outcome ("insufficient telemetry -> document the evidence gap and leave Class 3 unresolved until a future live decision warrants instrumentation"). It does not reopen a treatment gate and does not strengthen or weaken the existing "dose-unverified rather than proven negative" characterization.

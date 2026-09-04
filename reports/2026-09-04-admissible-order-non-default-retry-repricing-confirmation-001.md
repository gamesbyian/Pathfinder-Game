# admissible-order-alternate-tiebreak-retry repricing confirmation-001: confounded, not a result

> **Status:** inconclusive
> **Last evidence:** 2026-09-04 — control (GHA run `33841104137`, default fraction=1.0) vs treatment (GHA run `33841105732`, fraction=0.18) on the same disjoint 150-level population (`data/stress/admissible-order-non-default-retry-repricing-confirmation-001-population.json`), `schedulerMode: 'production'`, dispatched via `.github/workflows/solver-level-blind-targeted-sweep.yml`
> **Decision:** both arms produced **byte-identical** results — same 88/150 solved-id set, same aggregate `workSpent` (18,330,844,857), same aggregate `nodesExpanded` (15,316,084,678), and all 62 unsolved levels in **both** arms terminated with status `node-budget-reached`. This is not a zero-loss confirmation of the repriced fraction; it is a confounded, uninformative test. The dispatch's `--node-budget=50000000` is checked as a hard, raw-node-count stopping condition independent of the work-budget-share the fraction override resizes, and its status label takes priority over `work-budget-reached` in `modules/solver/orchestration.ts`. Since every unsolved level in this population hit that raw ceiling, the admissible-order-alternate-tiebreak-retry stage's differently-sized pools (12.06M vs 67M workBudget-equivalent) never got the chance to diverge in outcome — either the stage was never reached before the node ceiling stopped the level's solve, or it was reached but cut off by the same node ceiling regardless of its own nominal pool size.
> **Remaining gate:** re-dispatch this same population and fraction pair with the new `node_budget_advisory_only=true` workflow input (added this session — see "Fix applied" below) so `work_budget` alone is the binding constraint, matching how the original 40-level local pilot (which found the 58.35%-work-saving zero-loss result that motivated this repricing candidate) was actually run.
> **Evidence role:** forensic — diagnosing why a dispatched confirmation produced a non-informative null result, not a confirmation or refutation of the repricing candidate itself
> **Selection:** population and fraction value were prespecified before dispatch (see the population-drawing commit); this report's investigation into *why* both arms matched was not outcome-selected — it follows directly from the status-field breakdown and code inspection below

## What was dispatched

**Control:** `schedulerMode: 'production'`, no `--admissible-order-non-default-retry-budget-fraction` (default fraction 1.0), `--node-budget=50000000`, `--work-budget=67000000` (`= 50,000,000 * 1.34`, this workflow's standard derivation).
**Treatment:** identical, plus `--admissible-order-non-default-retry-budget-fraction=0.18` (the p75-sum-derived candidate from `admissible-order-profile-cost-probe-002`, GHA run `33839564064`).
**Population:** 150 levels, drawn disjoint from the union of every population this admissible-order repricing line and its related threads have used (1,257 ids excluded).

## Result

| Arm | Solved | Aggregate `workSpent` | Aggregate `nodesExpanded` | Unsolved status breakdown |
|---|---:|---:|---:|---|
| control (fraction=1.0) | 88/150 | 18,330,844,857 | 15,316,084,678 | 62/62 `node-budget-reached` |
| treatment (fraction=0.18) | 88/150 | 18,330,844,857 | 15,316,084,678 | 62/62 `node-budget-reached` |

The solved-id sets are identical, not merely equal in count (verified directly from both runs' `Combine shard results` job logs, which print the full solved-id list).

## Why this happened (code-level diagnosis)

`.github/workflows/solver-level-blind-targeted-sweep.yml`'s `node_budget` input serves two purposes at once: it derives `work_budget` (`node_budget * 1.34`) *and* — until this session's fix — it was also passed straight through as `--node-budget` to `level-blind-capability-sweep.mjs`, which sets `solveOpts.nodeBudget`. In `modules/solver/orchestration.ts`:

```
const nodeBudgetReached = nodeBudget !== Infinity && (nodesExpanded >= nodeBudget || earlyTiersHitNodeCeiling || mainSearchEarlyTiersHitNodeCeiling);
...
const status = hadAttemptError ? 'attempt-error'
    : nodeBudgetReached ? 'node-budget-reached'
    : deadlineTruncated ? 'deadline-truncated'
    : (workBudgetReached ? 'work-budget-reached' : 'failed');
```

`nodeBudgetReached` is a genuine, independent stopping condition on raw `nodesExpanded` — not merely a status label applied after the fact — and it is checked *before* `workBudgetReached` in the ladder's own termination logic, so it can and does cut a level's solve short irrespective of how the work-budget envelope (and any stage's fraction-sized share of it, including `admissibleOrderNonDefaultRetryBudgetFractionOverride`) would otherwise have been spent. The workflow's own `node_budget` input description already warns that it is "a per-level STARTING allocation, not a hard per-level cost ceiling" for the *work* dimension (additive tiers can spend 1.5x-467x more work than it once the ladder progresses) — but that caveat is about `work_budget`'s derivation, not about the raw node metric, which remains a hard, independently-checked ceiling regardless.

Both `--admissible-order-non-default-retry-budget-fraction` values were confirmed to have actually reached the sweep command (present in treatment's shard logs, absent in control's, exactly as dispatched — `scripts/level-blind-capability-sweep.mjs` and `modules/solver/stage-budget.ts`'s override-parsing were checked directly and are correctly wired). The confound is a **dispatch-design** issue, not a code bug in the override mechanism itself.

This also explains a related discrepancy with the original evidence that motivated this repricing candidate: the 40-level local pilot in `2026-09-04-production-ladder-marginal-value-tail-audit-001.md` that found a 58.35%-work-saving, zero-solve-loss result from **disabling** `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY` entirely used `scripts/portfolio-solve-sweep.mjs` with `--work-budget=67000000` and **no `--node-budget` argument at all** — so `nodeBudget` stayed `Infinity` there, and `work_budget` alone was the binding constraint, letting the disabled-vs-enabled stage difference actually show up in outcomes. This GHA confirmation, by contrast, added a `--node-budget=50000000` ceiling that this population's unsolved levels apparently reach well before the work-budget-share difference the fraction override controls would matter.

## Fix applied

Added a `node_budget_advisory_only` boolean input to `.github/workflows/solver-level-blind-targeted-sweep.yml` (default `false`, preserving existing behavior for every other caller of this workflow). When `true`, `node_budget` still sizes the derived `work_budget` and the shard planner's wall-time estimate, but is **not** passed to the actual per-level solve as `--node-budget` — so `nodeBudgetReached` can never fire, and `work_budget` becomes the sole binding constraint, matching the local pilot's design. This is a dispatch/tooling fix only; no solver behavior, default, or policy changed.

## Disposition

This is not a negative result for the repricing candidate — it is simply not a result at all. The 40-level local pilot's underlying finding (61.7% of production work concentrated in two admissible-order stages for 3/40 solves; disabling the alternate-tiebreak-retry tier entirely saved 58.35% of work at zero measured solve loss) stands as before. `docs/solver-opt-in-experiment-ledger.md`'s `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY` row and `docs/solver-optimization-workstreams.md`'s corresponding entry are updated to record this confounded attempt and the fix, not a disposition change — the tier remains at its current default-ON, full-fraction configuration until a properly-unconfounded confirmation actually runs.

## Next earned gate

Re-dispatch the identical control/treatment pair (same 150-level population, same fraction=1.0 vs 0.18 comparison) via `solver-level-blind-targeted-sweep.yml` with `node_budget_advisory_only=true` added to both arms. No new population draw is needed — this is a rerun of the same comparison with the confound removed, not a new experiment.

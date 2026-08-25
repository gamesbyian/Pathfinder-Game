# Current fixed-work scheduler tail audit

> **Status:** concluded; materialization fed the completed static-repricing join
> **Last evidence:** 2026-08-25 — Actions run `32821022906`, artifact `scheduler-current-fixed-work-sample`
> **Decision:** the Queue #1 materialization gate and census join are satisfied. Under a strict 67M canonical-work envelope, the current ladder is heavily front-loaded: `main-loop` and `repair-probe` account for 81.3% of measured work and 38/40 solves. The joined evidence identifies a narrow positive static baseline: suppress only `main-loop|dfs:objectiveFirst` and `main-loop|dfs:intersectionHarvest` in a same-revision A/B before any dynamic scheduler work. See [`scheduler static repricing join`](2026-08-25-scheduler-static-repricing-join.md).
> **Evidence role:** tuning / development sample
> **Selection:** deterministic evenly spaced 60-level sample from `data/stress/stress-levels-random.json`; level-blind, no saved hints, not confirmation evidence
> **Queue:** [`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) Priority 1

## Materialization contract

The one-shot run used the existing `scripts/level-blind-capability-sweep.mjs` entry point, not a new solver experiment. It ran 60 evenly spaced Corpus-2 positions with:

- 50,000,000 cumulative node ceiling;
- 67,000,000 strict total canonical-work ceiling;
- 86,400,000 ms non-binding wall budget;
- `--attempt-budget-telemetry`;
- `--lifecycle-telemetry`;
- 4 cross-level workers;
- no saved hints and no historical level inputs.

All 60 requested levels completed. The artifact contains the current rich per-attempt projection including `stageId`, canonical `actionKey`, gate/config/profile/template/seed context, allocated work/node ceilings, actual `workSpent`, explicit outcome/timed-out state, and row-level lifecycle telemetry.

This closes the evidence-materialization prerequisite identified in the August 24 scheduler audits.

## Population result

- levels: **60**
- solved: **40**
- unsolved: **20**
- attempts recorded: **1,459**
- outcomes: **40 success**, **165 exhausted**, **267 timed-out**, **987 budget-starved**
- aggregate work: **2.037B** canonical units
- solved-level mean work: **17.42M**; median **8.23M**
- unsolved-level mean work: **67.006M**, effectively the full 67M envelope

The hard residual is therefore genuinely budget-saturating. The scheduler question is not hypothetical on these rows.

## Stage-level work and yield

| stage | levels reached | attempts | solves | work | share of total work | budget-starved rows |
|---|---:|---:|---:|---:|---:|---:|
| `main-loop` | 44 | 307 | 22 | 990.56M | 48.6% | 0 |
| `repair-probe` | 39 | 90 | 16 | 666.47M | 32.7% | 0 |
| `admissible-order` | 22 | 78 | 1 | 182.56M | 9.0% | 61 |
| `repair-fallback` | 15 | 20 | 0 | 73.92M | 3.6% | 6 |
| `dedup-near-tie-retry` | 21 | 218 | 0 | 62.81M | 3.1% | 199 |
| `admissible-order-non-default-retry` | 21 | 78 | 1 | 34.42M | 1.7% | 73 |
| `attraction-diversity` | 7 | 93 | 0 | 25.87M | 1.3% | 74 |
| `connectivity-axis-exhausted-retry` | 20 | 208 | 0 | 0.44M | 0.02% | 207 |
| `goal-attraction-legacy-distance-retry` | 20 | 208 | 0 | 0.035M | <0.01% | 208 |
| `mc-neighbor-budget-retry` | 12 | 119 | 0 | 0.016M | <0.01% | 119 |
| `repair-late-probe` | 5 | 5 | 0 | 0 | 0% | 5 |
| `repair-late-probe-multi-seed-retry` | 5 | 35 | 0 | 0 | 0% | 35 |

Two stages dominate both spending and solved capability on this sample: `main-loop` plus `repair-probe` consume **81.3%** of all measured work and produce **38/40** solves.

The remaining two solves are one `admissible-order|ida:default` win and one `admissible-order-non-default-retry|ida:none` win. Because the historical admissible-order family is the active P0 sequence-dependence anomaly, those rows remain sequence-ambiguous in scheduler valuation rather than clean causal continuation evidence.

## Current failed-work tax

Most measured work is unsuccessful work because successful attempts stop early. In this sample:

- `main-loop`: 924.85M failed-attempt work versus 65.71M on successful attempts;
- `repair-probe`: 654.68M failed-attempt work versus 11.79M on successful attempts;
- `admissible-order`: 182.50M failed-attempt work for one 57.5K-work success;
- `repair-fallback`: 73.92M work, zero solves;
- `dedup-near-tie-retry`: 62.81M work, zero solves;
- `attraction-diversity`: 25.87M work, zero solves.

This is descriptive, not by itself a removal recommendation: the sample is small, late stages face a selected hard residual population, and isolated census evidence shows rare specialist capability.

## Unsolved residual spend

The 20 unsolved levels consume 1.340B work in total, almost exactly 67M each. Their largest stage expenditures are:

- `main-loop`: 609.08M;
- `repair-probe`: 384.02M;
- `admissible-order`: 161.46M;
- `repair-fallback`: 73.92M;
- `dedup-near-tie-retry`: 54.61M;
- `admissible-order-non-default-retry`: 33.56M;
- `attraction-diversity`: 22.99M.

This is the decision-bearing residual surface joined to the frozen isolated census in the follow-up analysis.

## Joined static-headroom result

The completed current-to-census join is documented in [`2026-08-25-scheduler-static-repricing-join.md`](2026-08-25-scheduler-static-repricing-join.md).

Key result:

- conservative frozen non-`ida` isolated union: **44/60**;
- current sequential ladder: **40/60**;
- five current misses have a non-admissible frozen isolated solver;
- `main-loop|dfs:objectiveFirst`: **195.35M** current work, **0** solves;
- `main-loop|dfs:intersectionHarvest`: **141.51M** current work, **0** solves;
- combined: **336.85M**, **16.5%** of all current sample work;
- removing both base DFS actions loses **zero** coverage from the reconstructed 44-level conservative frozen union;
- both actions also have zero unique solves in the broader frozen census summary.

This is sufficient static headroom to earn one narrow execution A/B. It is not evidence that deleting the actions is causally safe in current code: the census and current sample are from different revisions, and cross-stage dependence is already a live P0 issue.

## What this sample and join can answer

They can now answer:

- whether current rich attempt telemetry materializes correctly: yes;
- where current fixed work is actually spent;
- which stages are reached, exhausted, timed out, or starved;
- which heavy current actions are highly substitutable in the frozen capability matrix;
- whether there is enough static headroom to justify a bounded repricing A/B: yes.

They still cannot establish without execution:

- the current counterfactual solve set after suppressing an earlier action;
- whether freed work reaches the expected later actions under current sequencing;
- whether historical isolated winners retain the same behavior on current code;
- a causal hazard curve for sequence-ambiguous admissible-order cells.

## Next gate

Run the frozen same-revision A/B from the static-repricing report under the same deterministic 60-level selection and strict 67M canonical-work ceiling:

- A = current ladder;
- B = suppress only `main-loop|dfs:objectiveFirst` and `main-loop|dfs:intersectionHarvest`;
- no other ordering, gate, repair-depth, or action-semantic change;
- no saved hints;
- preserve attempt/lifecycle telemetry.

B earns confirmation only with no solve loss and either at least one extra solve or at least 10% lower aggregate canonical work. Otherwise close this exact suppression treatment. Dynamic/survival/bandit machinery remains closed regardless until the simple static baseline resolves.

## Execution-scaffolding disposition

The temporary PR workflow that produced run `32821022906` was one-shot scaffolding. The durable producer is the existing level-blind capability sweep and its current attempt projection. Preserve the run/artifact ID here for reproducibility; do not recreate the one-shot workflow merely to repeat this materialization.

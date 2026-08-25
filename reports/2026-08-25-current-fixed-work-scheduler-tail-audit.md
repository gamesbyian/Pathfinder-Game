# Current fixed-work scheduler tail audit

> **Status:** active
> **Last evidence:** 2026-08-25 — Actions run `32821022906`, artifact `scheduler-current-fixed-work-sample`
> **Decision:** the Queue #1 materialization gate is satisfied. Under a strict 67M canonical-work envelope, the current ladder is heavily front-loaded: `main-loop` and `repair-probe` account for 81.3% of measured work and 38/40 solves. Most later retry rows are budget-starved before meaningful execution. Do not build dynamic scheduler machinery yet; first join the heavy current actions to the frozen census/tranche evidence and test a simple static repricing.
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

The remaining two solves are one `admissible-order|ida:default` win and one `admissible-order-non-default-retry|ida:none` win. Because the historical admissible-order family is the active P0 sequence-dependence anomaly, those rows must remain sequence-ambiguous in scheduler valuation rather than being used as clean causal continuation evidence.

## Current failed-work tax

Most measured work is unsuccessful work because successful attempts stop early. In this sample:

- `main-loop`: 924.85M failed-attempt work versus 65.71M on successful attempts;
- `repair-probe`: 654.68M failed-attempt work versus 11.79M on successful attempts;
- `admissible-order`: 182.50M failed-attempt work for one 57.5K-work success;
- `repair-fallback`: 73.92M work, zero solves;
- `dedup-near-tie-retry`: 62.81M work, zero solves;
- `attraction-diversity`: 25.87M work, zero solves.

This is descriptive, not a removal recommendation: the sample is small, late stages face a selected hard residual population, and isolated census evidence shows rare specialist capability. But it identifies the actions whose continuation value actually needs pricing. Zero- or near-zero-work starved retries are not the immediate optimization target because they currently consume almost no fixed-work envelope.

## Unsolved residual spend

The 20 unsolved levels consume 1.340B work in total, almost exactly 67M each. Their largest stage expenditures are:

- `main-loop`: 609.08M;
- `repair-probe`: 384.02M;
- `admissible-order`: 161.46M;
- `repair-fallback`: 73.92M;
- `dedup-near-tie-retry`: 54.61M;
- `admissible-order-non-default-retry`: 33.56M;
- `attraction-diversity`: 22.99M.

This is the decision-bearing residual surface for the next join. The meaningful repricing question is how much of the heavy early/deep work should be preserved, truncated, reordered, or substituted by complementary isolated actions under the same aggregate work envelope.

## Action-level nominations, not decisions

Current action rows show several high-cost zero-yield actions in this sample, especially DFS main-loop configurations and `repair-fallback`. Conversely, several beam actions solve while naturally exhausting, supporting the older census nomination that cheap beam screens may deserve earlier placement.

Do not convert these observational sequential rows directly into a reordered production policy. Action difficulty is strongly conditioned by what survived earlier stages, and the P0 admissible-order anomaly makes one family explicitly sequence-ambiguous.

## What this sample can and cannot answer

It **can** now answer:

- whether current rich attempt telemetry materializes correctly: yes;
- where current fixed work is actually spent;
- which stages are reached, exhausted, timed out, or starved;
- which late stages contribute solves in the current sequence;
- which heavy stages require continuation-value pricing.

It **cannot by itself** establish:

- the counterfactual solve set if an action were moved earlier;
- rare exclusivity of actions not reached in this sequence;
- a causal hazard curve for sequence-ambiguous admissible-order cells;
- the best portfolio cardinality under alternative action subsets.

Those require the already-planned join to the frozen isolated census/tranche evidence.

## Next gate

Join these current action rows to the frozen census family/config and cap/tranche evidence, with P0 admissible cells excluded from the conservative frontier. Produce:

1. continuation risk sets for the heavy comparable actions;
2. failed-work tax versus residual/exclusive solves;
3. portfolio-cardinality/rare-capability curve;
4. current fixed-work point versus measured static oracle/Pareto headroom;
5. one simple deterministic static repricing baseline;
6. optimistic sensitivity including sequence-ambiguous admissible rows only as a labelled secondary view.

Only material residual headroom after that simple static baseline justifies dynamic/survival/bandit scheduler machinery.

## Execution-scaffolding disposition

The temporary PR workflow that produced run `32821022906` is one-shot scaffolding. The durable producer is the existing level-blind capability sweep and its current attempt projection. Remove the one-shot workflow from the branch before merge; preserve the run/artifact ID here for reproducibility.

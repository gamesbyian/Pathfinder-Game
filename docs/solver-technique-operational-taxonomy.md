# Solver technique operational taxonomy

> **Status:** current implementation interpretation plus bounded supporting research. Operational-similarity work exists to improve scheduler/configuration decisions and causal diagnosis; it is **not** a mandate for another full expensive census.
> **Implementation authority:** [`solver-architecture.md`](solver-architecture.md) and `modules/solver/*`.
> **Outcome evidence:** [`technique-census-second-order-analysis.md`](technique-census-second-order-analysis.md).
> **Scheduling use:** [`solver-scheduling-policy.md`](solver-scheduling-policy.md).

## Core distinction

Technique names can overstate diversity. Many Pathfinder “techniques” are configurations of the same search engine. Keep three kinds of similarity separate:

- **source/config similarity:** shared engine, scorer, weights, template, retention rule, prune set, retry context;
- **outcome similarity:** solve/fail/work vectors overlap;
- **operational similarity:** the searches actually make similar choices or retain/explore similar states when faced with comparable situations.

Do not infer diversity from different names. Do not infer operational redundancy from solve-set overlap alone. A tiny ordering difference can cascade into a large outcome difference; conversely, very different searches can end with the same coverage.

Operational similarity is itself a **diagnostic proxy**, not an optimization objective. The project does not benefit merely because two searches have a low/high Jaccard, ranking correlation, or divergence depth. A measurement is useful only when it changes a portfolio/configuration or causal-search decision.

## Operational layers

| Layer | What actually changes |
|---|---|
| Ordinary DFS profile | Shared `scoreMove()` weights change child ordering; DFS/LDS/state/pruning remain shared. |
| DFS structural template | Adds explicit geometry to child ordering. |
| Beam profile | Shared scoring vocabulary feeds a retained frontier rather than depth-first commitment. |
| Beam width | Changes survivor count. |
| Diverse beam | Changes survivor selection/bucketing. |
| Beam dedup / near-tie | Changes which approximately related frontier states survive. |
| Admissible-order search | Primary ordering becomes least admissible slack first; DFS-shaped search/state/pruning remain. |
| Admissible-order profile | Soft scoring only breaks equal-slack ties. |
| `admissible-order|tieBreak=none|lds=off` | Equal-slack children receive no soft-score tie-break; more distinctive than the sibling profile names imply. |
| Repair | Seeded randomized restart / elite / splice / ruin-and-recreate dynamics; strongest genuinely different paradigm in current production. |
| Prune ablation/retry | Changes feasible explored tree while underlying search family may stay the same. |
| Retry/budget tranche | Often changes only residual context and amount of work, not the search mechanism. |

A profile name is therefore not a research claim. `harvestThenFinish`, `portalFirstTransfer`, `objectiveFirst`, `nearClosureRescue`, etc. are primarily weight vectors in a shared scorer, not bespoke procedures matching their names.

## What current evidence says

The census gives outcome overlap and shows substantial redundancy among some DFS/admissible configurations, plus important non-monotonicity such as width/diversity inversions and `admissible-order|tieBreak=none|lds=off` exclusives.

The bounded operational-similarity substrate is implemented through `scripts/technique-operational-similarity.mjs`, ordering observers in `method-probe.mjs`, bounded beam traces, and the paired deterministic DFS/admissible runner `scripts/paired-deterministic-trace.mjs`. Initial work found:

- ordinary DFS profiles often cluster tightly in local ranking;
- equal-slack states are common enough that admissible tie-breaking can matter materially;
- `admissible-order|tieBreak=none|lds=off` is operationally more distinct than its sibling label suggests;
- bounded 2K/5K beam traces can diverge strongly in retained-frontier regions, so width is not merely “same search plus more states.”

The August 23 pilot record is preserved in [`../reports/2026-08-23-operational-similarity-substrate.md`](../reports/2026-08-23-operational-similarity-substrate.md). Its former open-ended next gates are superseded by the current decision-driven policy.

The paired-trace continuation also produced an important evidence-pipeline correction: eight rows formerly described as predecessor-conditioned admissible-order wins were actually later diverse-beam retry wins misattributed by a stale lifecycle reducer, and the isolated census comparison did not contain the exact winning diverse-beam + retry-override cells. The former cross-stage admissible P0 is therefore retired; see [`../reports/2026-08-25-paired-deterministic-trace-and-lifecycle-attribution-correction.md`](../reports/2026-08-25-paired-deterministic-trace-and-lifecycle-attribution-correction.md).

These findings came from bounded selected cohorts and forensic reconstruction. They are evidence about those operational/causal questions, not population prevalence estimates.

## Research objective

Operational-similarity work should answer one of two concrete questions:

1. **Portfolio question:** are two candidate actions spending scarce work in effectively the same search region after the same predecessors fail?
2. **Causal question:** two close configurations have different outcomes; what is the first load-bearing ordering/retention/pruning divergence?

If a proposed trace/metric cannot inform a ranked decision in [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md), treat it as supporting work rather than a standalone priority.

Before collecting a new trace, write down which concrete scheduling/configuration/causal decision can change depending on the result and what result would stop further tracing.

## Useful bounded metrics

Use only the metrics needed for the current pair/cohort:

- top-choice and full sibling-ranking agreement;
- scoring-term decomposition at divergence;
- first-divergence depth/state;
- DFS prefix/subtree overlap under matched deterministic work;
- beam generated/retained frontier overlap, lineage survival, churn, dedup/near-tie/bucket pressure;
- width/diversity delta;
- admissible-slack versus soft-score disagreement;
- structural-template intervention rate;
- repair-native fingerprints such as restart/elite source, badness trajectory, repeated attractors, and seed sensitivity.

Raw weight-vector distance is a source-level proxy only. Terms have different scales/activation conditions, so Euclidean closeness is not behavioral equivalence.

Metrics themselves can be sensitive to sampling/truncation. A censored frontier Jaccard or a top-choice agreement measured only on states reached by one policy is not a universal distance between algorithms. Record encounter/sampling conditions and censoring.

## Sampling rule

Do **not** run an all-techniques × all-levels operational census by default. Start with reusable bounded cohorts:

- outcome inversions between close configurations;
- high-outcome-similarity pairs nominated for scheduler substitution;
- singleton/doubleton capability levels;
- CW/CCW mirror inversions;
- beam width/plain-diverse inversions;
- `admissible-order|tieBreak=none|lds=off` versus canonical tie-break profiles;
- repair-only versus mixed phenotypes;
- representative same-outcome controls.

Use the smallest trace budget that establishes the mechanism. Family-derived cohorts are grouped by parent. Exact IDs may select offline diagnostic fixtures but never enter production steering.

If pairs/cohorts are chosen because their census outcomes are especially dramatic, call the trace **selected diagnostic evidence**. Do not extrapolate the frequency or magnitude of the operational pattern without an independently sampled confirmation cohort.

## Crossing operational and outcome evidence

| Operational behavior | Outcomes | Interpretation |
|---|---|---|
| Similar | Similar | strongest redundancy/substitution nomination. |
| Similar | Different | high-value fragility case; locate the few load-bearing divergences. |
| Different | Similar | alternative routes; potentially substitute by cost while preserving resilience. |
| Different | Different | strongest evidence of complementary capability. |

The **similar operation / different outcome** cell is especially useful for capability diagnosis. The **similar operation / similar outcome** cell is especially useful for pruning the scheduler/configuration search space.

None of these cells is a deletion/promotion verdict alone. A candidate action's present residual solves/work and held-out behavior still decide production value.

## Relationship to automatic configuration

Automatic configuration should not blindly treat every named profile as an independent dimension. Use this taxonomy to define conditional parameter families and reduce obviously redundant candidate regions.

Conversely, do not demand complete operational traces before racing configurations. Cheap outcome/work screens should eliminate weak candidates first; operational analysis is most valuable among survivors where redundancy or a surprising inversion remains unresolved.

The efficient order is:

> cheap configuration racing -> marginal outcome/work screen -> bounded operational diagnosis of survivors/inversions -> held-out confirmation

not:

> exhaustively trace everything -> then decide what was worth evaluating.

If configuration racing already removes a candidate as dominated with comfortable held-out margin, do not trace it merely to understand why unless the mechanism itself is a ranked research question.

## Scheduler use

Operational similarity is supporting evidence, not a runtime historical lookup. It can help:

- cluster near-duplicate actions;
- delay/remove redundant deep continuations;
- protect genuinely complementary actions with modest global coverage;
- explain why a width/template/profile variant deserves separate action identity;
- identify live telemetry that distinguishes exhausted versus still-novel exploration.

Production decisions remain level-blind and use legal static/current-solve features only.

A scheduler should not spend meaningful production overhead computing an operational-similarity descriptor unless shadow/current-code evidence shows that descriptor improves action selection beyond simpler signals.

## Stop conditions

Close or pause an operational-similarity thread when any of these holds:

- the pair is already economically dominated and understanding it will not affect another active causal question;
- the chosen metric does not distinguish the outcome inversion/control cases;
- a distinction is found but cannot be translated into a generic legal runtime/search intervention;
- the proposed production signal costs more than the residual work it can plausibly save;
- repeated metric refinement improves descriptive fit without changing solve/work decisions.

Operational understanding is valuable, but it is not an unlimited research entitlement.

## Documentation rule

Whenever a technique/profile/retry is described, state **which operational layer changes**. Avoid language that makes a weight vector sound like a new algorithm or an additive retry sound like new search capability.

For exact current profile values, `modules/solver/policy.ts` is authoritative. Human-readable names describe intent only.
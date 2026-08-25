# Scheduler census join and static repricing gate

> **Status:** concluded-positive
> **Last evidence:** 2026-08-25 — Actions run `32821022906`, artifact `scheduler-current-fixed-work-sample`, joined to frozen technique census run `32240161854`
> **Decision:** static headroom is sufficient to earn one bounded same-revision execution A/B suppressing only `main-loop|dfs:objectiveFirst` and `main-loop|dfs:intersectionHarvest`; this is not yet a production recommendation.
> **Remaining gate:** run the frozen 60-level strict-67M A/B and require no solve loss plus either at least one additional solve or at least 10% lower aggregate canonical work before promotion.
> **Date:** 2026-08-25
> **Queue:** [`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) Priority 1
> **Current evidence:** Actions run `32821022906`, artifact `scheduler-current-fixed-work-sample`
> **Frozen census:** run `32240161854` at solver revision `c96f57c853a13e96a565105995719e23cc95bd87`; corrected derived reports at `948bd40b46ff6e6773dd16134aa01923ccb8a76d`
> **Evidence role:** development/tuning only

## Decision

The join gate is positive. The current 60-level strict-67M sample has material static allocation headroom before any dynamic scheduler is justified.

The smallest earned execution treatment is to suppress only these two **main-loop** actions under the same total 67M canonical-work envelope:

- `main-loop|dfs:objectiveFirst`
- `main-loop|dfs:intersectionHarvest`

Do not otherwise reorder stages, change action semantics, alter repair depth, or change admissible-order behavior. Freed work remains available to the existing later ladder.

This is an execution candidate, not a production recommendation. The current and census runs are from different revisions and current search is known to have sequence-sensitive behavior. The treatment must therefore be tested end-to-end rather than inferred as causally safe from the join.

## Reconstruction and join

The current artifact contains all 60 requested Corpus-2 level IDs and 1,459 rich attempt rows. The frozen census plan contains the same `Rxxxxx` IDs.

The first historical combined artifact was known to have silently omitted shards 1-20. It was not used as complete evidence. For this join, its 50 sampled levels were supplemented with the ten exact original shard artifacts containing the missing sample levels: shards 2, 4, 6, 8, 11, 12, 13, 14, 19, and 20. The reconstructed T1 sample contains all 60 current level IDs and 2,346 T1 rows.

The conservative scheduler view excludes every `ida:*` row because admissible-order is the active P0 sequence-dependence anomaly. Promoted non-admissible census variants remain capability evidence under their explicit identities, including `+dedup-near-tie-retention-off`, `+connectivity-axis-exhausted-off`, and `+mc-neighbor-budget-off`.

`workSpent` from the current artifact is the cross-technique accounting currency. Frozen census `nodesExpanded` is used only for within-technique solve-cost/context; it is not treated as a cross-technique work currency.

## Current fixed-work point

Current sample:

- 60 levels;
- 40 solved, 20 unsolved;
- 2.037B canonical work;
- `main-loop` + `repair-probe`: 81.3% of all work and 38/40 solves.

The two nominated main-loop DFS actions consume:

| action | current work | current solves |
|---|---:|---:|
| `main-loop|dfs:objectiveFirst` | 195.35M | 0 |
| `main-loop|dfs:intersectionHarvest` | 141.51M | 0 |
| **combined** | **336.85M** | **0** |

Combined, they consume **16.5% of all measured work** on the 60-level sample without a current success.

That observation alone would not justify removal. The census join supplies the missing capability check.

## Conservative isolated capability frontier

After excluding `ida:*`, the frozen T1 census solves **44/60** sampled levels with at least one isolated action, versus **40/60** solved by the current sequential ladder.

Five current misses have a non-admissible frozen isolated solver:

| level | cheapest observed conservative frozen solver | frozen nodes to solve |
|---|---|---:|
| `R00239` | `beam:intersectionHarvest@beam5000+dedup-near-tie-retention-off` | 371,748 |
| `R02448` | `beam:intersectionHarvest@beam5000(diverse)` | 298,293 |
| `R02505` | `beam:objectiveFirst@beam5000(diverse)` | 403,862 |
| `R02707` | `dfs:repair:repair` | 174,713 |
| `R02966` | `dfs:repair:repair` | 40,390,516 |

One current solve, `R03052`, is absent from the conservative frozen union. This is useful drift evidence: the frozen census is an independent capability reference, not a replay oracle for current code.

The best achievable conservative coverage by portfolio cardinality on this 60-level frozen join is:

| actions | max conservative coverage |
|---:|---:|
| 1 | 32/60 |
| 2 | 40/60 |
| 3 | 42/60 |
| 4 | 43/60 |
| 5 | 44/60 |

One five-action set covering the full 44-level conservative union is:

1. `dfs:repair:repair`
2. `beam:intersectionHarvest@beam5000(diverse)`
3. `beam:intersectionHarvest@beam5000+dedup-near-tie-retention-off`
4. `dfs:closureCommitment`
5. `dfs:perimeterSweep/perimeterCCW`

This set is descriptive and selected on the development sample, so it must not be installed as a bespoke production portfolio. Its role is to show that much of the measured capability is highly redundant and that a small number of complementary actions span the observed union.

## Why these two DFS actions are the first static cut

On the reconstructed 60-level conservative union, removing both base `dfs:objectiveFirst` and base `dfs:intersectionHarvest` loses **zero** union coverage because every level they solve is also solved by another non-admissible T1 action.

The broader frozen census points the same way. In the previously-unsolved population, `dfs:objectiveFirst` solved 11/888 and `dfs:intersectionHarvest` 12/888, with **zero unique solves** for either. In the previously-solved population they likewise have zero unique solves. Their isolated solve capability is real but highly substitutable, while their present sequential cost is large.

Repair is deliberately not cut. It has the strongest isolated residual capability in the frozen census, substantial unique coverage, and known deep-tranche yield. Cheap/naturally exhausting beam actions are likewise not cut because the census shows strong complementary coverage at small within-technique node counts.

## Static baseline interpretation

The shadow repricing baseline is therefore:

> Keep the current ladder and 67M total-work ceiling unchanged, but assign zero main-loop allocation to `dfs:objectiveFirst` and `dfs:intersectionHarvest`; let the existing later ladder consume any freed work under its existing order and gates.

Measured headroom before execution is 336.85M work across the 60-level sample, or 16.5% of the current aggregate. The frozen conservative capability union is unchanged by removing those two base actions.

This does **not** mean an end-to-end current run will automatically save 16.5% or preserve all 40 solves. Removing earlier work can change what later stages see, and the repository already has direct evidence of cross-stage dependence. The join establishes value of information for the A/B, not the A/B result.

## Frozen execution gate

Run one bounded development A/B on the same deterministic 60-level selection and strict 67M canonical-work envelope:

- **A:** current ladder;
- **B:** current ladder with only the two nominated main-loop actions suppressed;
- same revision for A and B;
- no saved hints;
- preserve attempt/lifecycle telemetry;
- report solved set, aggregate `workSpent`, per-level work, stage/action work redistribution, and any newly reached late actions.

A treatment earns confirmation only if:

1. it loses **no** development-sample solves versus same-revision A; and
2. it either gains at least one solve **or** reduces aggregate canonical work by at least **10%**.

A solve regression closes this exact suppression treatment. A neutral result with less than 10% work reduction also closes it as insufficient headroom. If positive, freeze the treatment and acceptance rule before materializing `confirm-broad-001`; do not tune on that reserved cohort.

## Dynamic scheduler disposition

Dynamic/survival/hazard/bandit machinery remains closed.

The join demonstrates static headroom, not a need for dynamic allocation. First determine whether the simple two-action suppression captures useful headroom end-to-end. Only residual headroom that survives that static baseline, plus independent confirmation, can reopen more sophisticated scheduler machinery.

## Optimistic admissible sensitivity

The current sample has two `ida`-family successes, but those cells remain sequence-ambiguous under P0 and are excluded from the conservative valuation above. They may be shown in secondary descriptive tables, but they do not strengthen the static suppression case, justify extra admissible budget, or enter the promotion criterion until P0 is resolved.

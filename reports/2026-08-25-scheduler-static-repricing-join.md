# Scheduler census join and static repricing gate

> **Status:** concluded-positive
> **Last evidence:** 2026-08-25 — development A/B `32901181013`; precursor fixed-work sample `32821022906`; frozen technique census `32240161854`
> **Decision:** suppressing only ordinary-main-loop `dfs:objectiveFirst` and `dfs:intersectionHarvest` passed the prespecified same-revision strict-67M development gate: **40/60 → 41/60**, `R02966` gained, no losses, aggregate `workSpent` -0.89%. Freeze the exact treatment and acceptance rule.
> **Remaining gate:** independently test the frozen treatment on reserved `confirm-broad-001` without tuning on that cohort. Dynamic scheduler machinery remains closed pending confirmation.
> **Date:** 2026-08-25
> **Queue:** [`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) Priority 0
> **Evidence role:** development/tuning; confirmation not yet spent

## Pre-execution evidence

The reconstructed 60-level strict-67M sample contained 40 production solves and 2.037B canonical work. Joining it to the frozen isolated-technique census found 44/60 conservative non-`ida` isolated coverage.

Two ordinary main-loop actions were unusually expensive and substitutable:

| action | current work | current solves |
|---|---:|---:|
| `main-loop|dfs:objectiveFirst` | 195.35M | 0 |
| `main-loop|dfs:intersectionHarvest` | 141.51M | 0 |
| **combined** | **336.85M (16.5%)** | **0** |

Removing both lost zero coverage from the reconstructed conservative census union. Across the wider frozen census, base `dfs:objectiveFirst` and `dfs:intersectionHarvest` also had zero unique solves. This earned one narrow end-to-end test, not a production recommendation.

The frozen treatment was therefore:

> Keep the existing ladder, stage order, action semantics, repair behavior, retry tiers, and strict 67M total-work envelope unchanged; assign zero allocation only to ordinary-main-loop `dfs:objectiveFirst` and `dfs:intersectionHarvest`. Later retry tiers may still use those configurations under their own stage identities.

The prespecified pass rule was **no solve loss** plus either **>=1 gained solve** or **>=10% lower aggregate `workSpent`**.

## Same-revision execution result

Actions run `32901181013` executed control and treatment from the same experiment revision with complete 60-row outputs and attempt/lifecycle telemetry.

| metric | control | treatment |
|---|---:|---:|
| solved | 40/60 | **41/60** |
| aggregate `workSpent` | 2,040,402,024 | **2,022,204,454** |
| work reduction | — | **0.89%** |
| gained | — | **`R02966`** |
| lost | — | **none** |

**Verdict: `positive-earned-confirmation`.** The treatment passes through the solve-gain branch of the frozen rule; the small aggregate-work reduction is secondary.

### Why `R02966` matters

`R02966` was independently identified in the precursor census join as a current miss with an isolated `dfs:repair:repair` solution.

Under control, the two nominated ordinary DFS actions consume about **12.38M** main-loop work combined. Repair fallback later receives about **9.05M** work and fails.

Under treatment, those two ordinary-main-loop attempts are absent. Repair fallback receives about **18.91M** work; `dfs:repair:repair` then solves the level at roughly 9.14M expanded nodes.

This is direct same-revision evidence that repricing existing portfolio work can create a solve by changing which existing action receives the fixed envelope. It strengthens the allocation premise without implying that arbitrary earlier work can be removed safely.

## Work redistribution

Aggregate stage work moved as expected: ordinary main-loop work fell, while several later stages received more opportunity. Selected totals:

| stage | control | treatment |
|---|---:|---:|
| main-loop | 1,371.01M | 1,281.58M |
| default-admissible-ordering | 247.85M | 218.73M |
| repair-fallback | 90.55M | 90.82M |
| attraction-diversity | 7.02M | 36.17M |
| dedup-near-tie-retry | 6.44M | 20.57M |
| connectivity-axis-exhausted-retry | 20.92M | 41.46M |
| repair-late-probe | 5.38M | 17.45M |
| repair-late-probe-multi-seed-retry | 6.29M | 30.50M |

The aggregate work reduction is small because much of the removed early allocation is productively or unsuccessfully consumed later. That is exactly why continuation value and portfolio repricing remain the relevant questions.

## Confirmation contract

The development result freezes both treatment and criterion. Before inspecting `confirm-broad-001` outcomes:

- suppress exactly ordinary-main-loop `dfs:objectiveFirst` and `dfs:intersectionHarvest`;
- preserve the same fixed total-work contract and all later-stage semantics;
- do not add, reorder, resize, or condition other actions based on the development result;
- apply the already-frozen acceptance logic to the independent cohort;
- do not tune on confirmation failures.

Materialize `confirm-broad-001` only through its reserved-cohort contract at pinned revision `4f2b2b143ee2bc194b8e017fcc59a680b9ee8d92`. Use transfer evidence only if confirmation succeeds.

## Dynamic scheduler disposition

Dynamic/survival/hazard/bandit machinery remains closed. The development A/B shows that static allocation matters; it does not show that a dynamic scheduler is needed. First independently confirm this static treatment, then remeasure residual headroom.

## Historical admissible note

The precursor join conservatively excluded `ida:*` cells because the then-active cross-stage admissible anomaly had not yet been resolved. That P0 was subsequently retired after immutable attempt evidence showed the alleged admissible wins were later diverse-beam retry wins and the lifecycle reducer was stale.

This correction does not weaken or strengthen the two-action suppression verdict: neither the treatment nor its acceptance criterion depends on admissible attribution. See [`paired deterministic trace and lifecycle attribution correction`](2026-08-25-paired-deterministic-trace-and-lifecycle-attribution-correction.md).

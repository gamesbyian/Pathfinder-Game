# Scheduler census join and static repricing gate

> **Status:** concluded-negative after independent confirmation
> **Last evidence:** 2026-08-25 — sealed-cohort confirmation `32908734154`; development A/B `32901181013`; precursor fixed-work sample `32821022906`; frozen technique census `32240161854`
> **Decision:** the exact global suppression of ordinary-main-loop `dfs:objectiveFirst` and `dfs:intersectionHarvest` is **closed**. It passed development (**40/60 → 41/60, +1/-0, work -0.89%**) but failed independent `confirm-broad-001` (**140/256 → 141/256, +3/-2, work -0.22%**) because the frozen rule required zero solve losses.
> **Remaining gate:** none for this treatment. Do not tune it on confirmation rows. Retain the broader allocation premise and test narrower feature-conditioned portfolio changes separately; dynamic scheduler machinery remains closed.
> **Date:** 2026-08-25
> **Queue:** [`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) Priority 1
> **Evidence role:** development + independent confirmation; `confirm-broad-001` spent

## Pre-execution evidence

The reconstructed 60-level strict-67M sample contained 40 production solves and 2.037B canonical work. Joining it to the frozen isolated-technique census found 44/60 conservative non-`ida` isolated coverage.

Two ordinary main-loop actions were unusually expensive and substitutable:

| action | current work | current solves |
|---|---:|---:|
| `main-loop|dfs:objectiveFirst` | 195.35M | 0 |
| `main-loop|dfs:intersectionHarvest` | 141.51M | 0 |
| **combined** | **336.85M (16.5%)** | **0** |

Removing both lost zero coverage from the reconstructed conservative census union. Across the wider frozen census, base `dfs:objectiveFirst` and `dfs:intersectionHarvest` also had zero unique solves. This earned one narrow end-to-end test, not a production recommendation.

The frozen treatment was:

> Keep the existing ladder, stage order, action semantics, repair behavior, retry tiers, and strict 67M total-work envelope unchanged; assign zero allocation only to ordinary-main-loop `dfs:objectiveFirst` and `dfs:intersectionHarvest`. Later retry tiers may still use those configurations under their own stage identities.

The prespecified pass rule was **no solve loss** plus either **>=1 gained solve** or **>=10% lower aggregate `workSpent`**.

## Development A/B

Actions run `32901181013` executed control and treatment from the same experiment revision with complete 60-row outputs and attempt/lifecycle telemetry.

| metric | control | treatment |
|---|---:|---:|
| solved | 40/60 | **41/60** |
| aggregate `workSpent` | 2,040,402,024 | **2,022,204,454** |
| work reduction | — | **0.89%** |
| gained | — | **`R02966`** |
| lost | — | **none** |

**Development verdict: `positive-earned-confirmation`.** `R02966` supplied a direct mechanism: removing the two early DFS actions let existing repair fallback receive enough of the same fixed envelope to solve. This established that allocation can matter without establishing that these two actions are globally dispensable.

## Independent confirmation

`confirm-broad-001` was materialized once from pinned generator revision `4f2b2b143ee2bc194b8e017fcc59a680b9ee8d92`, sealed as one artifact, then downloaded and hash-verified by all 16 control/treatment shards before search. This corrected an earlier workflow assumption that independently regenerating from the same seed would reproduce the same corpus. The final valid run was `32908734154`.

| metric | control | treatment |
|---|---:|---:|
| solved | 140/256 | **141/256** |
| aggregate `workSpent` | 10,530,429,674 | **10,507,531,011** |
| work reduction | — | **0.22%** |
| gained solves | — | **3** |
| lost solves | — | **2** |

**Confirmation verdict: FAIL.** The treatment gained `C00108`, `C00197`, and `C00252`, but lost `C00092` and `C00212`. These IDs were inspected only after the aggregate verdict had been recorded. The zero-loss branch therefore fails, and 0.22% work reduction is far below the alternate 10% threshold.

Do not tune or condition this treatment using those five confirmation rows. `confirm-broad-001` is spent, and `transfer-envelope-001` was not earned.

## Interpretation

The development mechanism remains useful evidence for the **allocation premise**: spending less on one early action can let another existing action solve under the same total work. The confirmation result rejects the stronger proposition that these two DFS actions are safely suppressible everywhere. Their marginal value is context-dependent.

The next allocation/configuration question should therefore be narrower and feature-conditioned, not another global deletion. The post-976 portfolio rejoin already provides such a candidate: selectively expose one existing cheap beam identity where a current policy bundle already expresses a closely related preference.

## Dynamic scheduler disposition

Dynamic/survival/hazard/bandit machinery remains closed. A failed global static suppression does not by itself earn a dynamic scheduler. First test selective, interpretable fixed-envelope action exposure/repricing and the independent equal-work restart question.

## Historical admissible note

The precursor join conservatively excluded `ida:*` cells because the then-active cross-stage admissible anomaly had not yet been resolved. That P0 was subsequently retired after immutable attempt evidence showed the alleged admissible wins were later diverse-beam retry wins and the lifecycle reducer was stale.

This correction does not alter the confirmation result. See [`paired deterministic trace and lifecycle attribution correction`](2026-08-25-paired-deterministic-trace-and-lifecycle-attribution-correction.md).

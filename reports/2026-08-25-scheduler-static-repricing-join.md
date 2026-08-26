# Scheduler census join and static repricing gate

> **Status:** concluded-negative
> **Last evidence:** 2026-08-25 — sealed-cohort confirmation `32908734154`; development A/B `32901181013`; precursor fixed-work sample `32821022906`; frozen technique census `32240161854`
> **Decision:** close the exact global suppression of ordinary-main-loop `dfs:objectiveFirst` and `dfs:intersectionHarvest`. It passed development but failed independent confirmation under the frozen zero-loss rule. Retain only the broader allocation premise.
> **Remaining gate:** none
> **Evidence role:** confirmation
> **Selection:** prespecified for `confirm-broad-001` after the treatment was selected on development evidence; the confirmation candidate, work envelope, and acceptance rule were frozen before cohort materialization

## Pre-execution evidence

The reconstructed 60-level strict-67M sample contained 40 production solves and **2,037,107,633** canonical work. Joining it to the frozen isolated-technique census found 44/60 conservative non-IDA isolated coverage.

Two ordinary main-loop actions consumed **336.85M** work, 16.5% of the sample, with zero current solves:

| action | current work | current solves |
|---|---:|---:|
| `main-loop|dfs:objectiveFirst` | 195.35M | 0 |
| `main-loop|dfs:intersectionHarvest` | 141.51M | 0 |

This earned one same-revision test, not a production recommendation.

## Development A/B

Run `32901181013` preserved the strict 67M total-work envelope and suppressed only those two ordinary main-loop actions. Retry-stage uses remained available.

| metric | control | treatment |
|---|---:|---:|
| solved | 40/60 | **41/60** |
| aggregate `workSpent` | **2,037,107,633** | **2,018,891,302** |
| work reduction | — | **0.894%** |
| gained | — | **`R02966`** |
| lost | — | **none** |

`R02966` showed the allocation mechanism directly. Control failed at **67,003,263** work after 54 attempts. Treatment solved at **65,067,201** work after 10 attempts with `repair-fallback|dfs:repair:repair|seedSalt=0`. Removing the two ordinary DFS actions freed **11.845M** main-loop work; repair fallback rose from about **9.029M** to **18.940M** and reached the solve.

Stage redistribution also shows why the aggregate saving was small: main-loop work fell from **990.564M** to **828.843M**, while repair fallback rose from **73.918M** to **290.833M**. Repricing shifted work later rather than simply deleting it.

Development verdict: `positive-earned-confirmation`.

## Independent confirmation

`confirm-broad-001` was materialized once from pinned generator revision `4f2b2b143ee2bc194b8e017fcc59a680b9ee8d92`, sealed as one artifact, then hash-verified by all 16 control/treatment shards before search. Final valid run: `32908734154`.

| metric | control | treatment |
|---|---:|---:|
| solved | 140/256 | **141/256** |
| aggregate `workSpent` | 10,530,429,674 | **10,507,531,011** |
| work reduction | — | **0.22%** |
| gained solves | — | **3** |
| lost solves | — | **2** |

Confirmation verdict: **FAIL**. The treatment gained `C00108`, `C00197`, and `C00252`, but lost `C00092` and `C00212`. Exact changed IDs were inspected only after the aggregate verdict was recorded. The frozen rule required zero solve losses plus either a gain or at least 10% lower work.

Do not tune or condition this treatment using those rows. `confirm-broad-001` is spent, and `transfer-envelope-001` was not earned.

## Interpretation

The development mechanism is valid evidence that fixed-work allocation can create capability: less early work can let an existing later action reach a solve. The confirmation rejects the stronger claim that these two DFS actions are globally dispensable.

Dynamic/survival/hazard/bandit scheduling remains closed. Subsequent allocation work should be selective and feature-conditioned, and independently confirmed before promotion.

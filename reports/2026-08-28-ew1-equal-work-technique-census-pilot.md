# EW1 equal-work technique census pilot

> **Status:** concluded / canonical bounded pilot.
> **Corrected solver run:** GitHub Actions `33156541827`.
> **Population:** 60 deterministic frozen-gap levels.
> **Seed:** `20260828`.
> **Cell budget:** 10,000,000 canonical work units.
> **Techniques:** 34 mechanically eligible base actions.
> **Planned/executed cells:** 2,015 / 2,015.
> **Evidence role:** development pricing evidence for scheduler architecture, not a production policy by itself.

## Why this pilot exists

The frozen technique census is excellent within-technique depth evidence, but its primary currency is
nodes. Nodes are not comparable across beam, DFS, repair, and admissible-order/IDA search. EW1 prices
each isolated action under the same canonical work currency used by current deterministic scheduler
research.

The pilot intentionally answers a bounded question: **what capability is available within the first
10M canonical work of each mechanically eligible action on a frozen hard-gap sample?** It does not
replace the 50M-node census, which remains the deeper capability map.

## Execution integrity

The first EW1 execution, run `33150920603`, exposed a real budget-contract defect and is not valid as
cross-family equal-work evidence. DFS/beam/repair honored `prep._workCap`; admissible-order/IDA
intentionally checked `prep._strictWorkCap` inside its search loop, and the census cell runner had
not set that field. Nominal 10M IDA cells therefore escaped into hundreds of millions or billions of
work.

That failure was useful instrumentation evidence, not research evidence. The runner was fixed so
equal-work cells set both caps to the same per-attempt ceiling, and a real IDA regression test now
guards the contract.

Corrected run `33156541827` has:

- 2,015 / 2,015 planned cells present;
- zero missing/partial cells;
- zero `error` cells;
- zero `deadline-truncated` cells;
- maximum observed `workSpent` 10,008,897, a small discrete hot-loop overshoot around the 10M cap,
  not an orders-of-magnitude escape;
- all 1,715 non-IDA cells byte-for-byte outcome/work stable relative to the first run, so the repair
  affected exactly the family whose cap contract was wrong.

The workflow badge is red only because that run was launched from the commit before the temporary
workflow's combine command was changed from plain Node to the repository's bundled runner. All 30
solver shards are green. The canonical measurements below were reconstructed directly from those
sealed shard artifacts.

## Top-line result

At <=10M canonical work per isolated action:

- **45 successful cells**;
- **12 / 60 levels** are solved by at least one technique;
- 48 / 60 remain unsolved by every represented action within this cap.

Family coverage:

| family | successful cells | distinct levels solved | family-exclusive levels |
|---|---:|---:|---:|
| beam | **33** | **8** | **6** |
| IDA / admissible-order | 4 | 3 | **2** |
| ordinary DFS | 6 | 2 | **1** |
| repair | 2 | 2 | **1** |

Family-exclusive IDs:

- beam: `R00118`, `R02221`, `R02696`, `R02800`, `R03171`, `R03274`;
- IDA: `R00732`, `R03068`;
- DFS: `R02095`;
- repair: `R02940`.

This is the important architecture signal: beams dominate the shallow equal-work frontier, but they
do not subsume the other families.

## Leading actions

| action | solved / eligible | mean work / eligible cell | median solve work | work-cap hits |
|---|---:|---:|---:|---:|
| `beam:intersectionHarvest@beam5000(diverse)` | **5/60** | 3.34M | 3.06M | 0 |
| `beam:perimeterSweep/perimeterCCW@beam2000` | **4/60** | 1.48M | 1.37M | 0 |
| `beam:harvestThenFinish@beam2000` | 3/60 | 1.17M | 0.61M | 0 |
| `beam:knotBuilder@beam2000` | 3/60 | 1.18M | 0.62M | 0 |
| `beam:mustCrossFirst@beam2000` | 3/60 | 1.18M | 0.60M | 0 |
| `beam:intersectionHarvest@beam5000` | 3/60 | 2.93M | 1.52M | 0 |
| `beam:objectiveFirst@beam5000` | 3/60 | 2.94M | 1.43M | 0 |
| `beam:objectiveFirst@beam5000(diverse)` | 3/60 | 3.33M | 1.43M | 0 |
| `ida:nearClosureRescue` | 2/60 | 9.75M | 2.39M | 58 |
| `dfs:repair:repair` | 2/60 | 9.82M | 4.70M | 58 |
| `dfs:finishFirst` | 1/60 | 9.84M | 0.58M | 59 |
| `ida:none` | 1/60 | 9.89M | 3.44M | 59 |

Every beam cell naturally exhausts before 10M; no beam needs the artificial cap to stop it. By
contrast, almost every unsuccessful DFS/IDA/repair cell consumes the entire allowance.

## Relationship to the deep census

This result does **not** mean deep search is unnecessary. The frozen 50M-node census showed real
hard-gap winning depths well beyond the EW1 window:

- beam wins overwhelmingly occur in shallow frontiers and beams naturally self-exhaust;
- repair retains substantial distinct capability deep into its continuation;
- ordinary DFS and IDA contain genuine deep wins, but much of their portfolio value is overlapping
  and their marginal tail is thin relative to cost.

EW1 independently validates the first part of that story in a common cross-family currency. The
cheap-screen advantage is therefore not a raw-node accounting artifact.

The 10M cap also clarifies what the expensive families look like as **shallow tranches**. IDA has
only four successful cells here, versus many more deep wins in the 50M-node census. That is expected
pricing information: much of IDA's capability lives later.

## Scheduler implication

The combined evidence now supports this architecture more strongly than the node census alone:

1. run cheap, naturally self-terminating beam screens early when mechanically eligible;
2. retain protected deep capability, especially repair;
3. make ordinary DFS/IDA continuations compete for a fixed residual work envelope rather than
   inheriting symmetric full allowances;
4. judge any production repricing through the real sequential ladder under
   `strictTotalWorkBudget`, because isolated-cell efficiency cannot prove predecessor-conditioned
   dispensability.

A cost-weighted diagnostic cover reaches all 12 EW1-solvable levels with seven actions. Its first
three selected actions are beams and cover 8/12; the remaining four levels require IDA, repair, DFS,
and another IDA action. This is an oracle diagnostic only, not a production scheduler.

## Decision

EW1 has answered its bounded value-of-information question. Do **not** expand the equal-work matrix
merely to obtain smoother rankings.

Resume scheduler repricing using the architecture above. Expand equal-work sampling only when a
specific cross-family allocation decision cannot be resolved from this pilot plus the frozen
full-depth census and current production lifecycle telemetry.

The IDA work-cap defect found by the first run is fixed and regression-tested. The temporary EW1
workflow is not part of the durable product surface.

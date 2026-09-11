# Class-1 missed-rescuer menu audit

> **Status:** concluded-positive
> **Last evidence:** 2026-09-11 — corrected static missed-rescuer audit run 34559811913 on the post-1,029 residual atlas
> **Decision:** class 1 contains a compact, low-node beam-menu opportunity worth a bounded WS1 routing experiment, but not a production promotion. Four missed beam identities cover 17/26 class-1 levels; beam as a family covers 18/26. Defer implementation while the active Claude joint-obligation branch modifies orchestration/pruning.
> **Remaining gate:** after the joint-obligation branch is reconciled, run a prespecified bounded treatment that exposes the nominated compact beam menu without per-level IDs/hints, records participation/work, and requires solve gain at an acceptable work envelope with zero regressions before any promotion
> **Evidence role:** discovery
> **Selection:** observational; class 1 is defined from previously observed tier-1 winners, and the compact identity set was selected after inspecting those missed winners. Coverage is therefore nomination evidence only, not an unbiased estimate of future gain.

## Question

The post-1,029 residual atlas contains **26 class-1 misses**: at least one tier-1 known rescuer exists, but production did not dispatch it. Is that population a diffuse historical grab bag, or does it contain a compact missed menu that WS1 action-selection work could plausibly expose at low cost?

This audit is static. It does not dispatch the solver, change production policy, or claim that a historically winning identity will reproduce under a new additive menu.

## Correct classification seam

A class-1 level may also have other tier-1 winners that production **did** dispatch. Therefore the audit must not treat every `t1Wins` row as a missed menu opportunity.

The decision-bearing filter is:

`win.dispatched === false`

The corrected audit found:

- class-1 levels: **26**;
- levels with at least one actually missed winner: **26/26**;
- missed winner rows: **50**;
- already-dispatched winner rows on the same class-1 levels: **14**;
- unknown/other dispatch status: **0**.

The population is heavily intersection-oriented: 22 intersection-heavy, 2 must-cross-heavy, 1 multi-portal and 1 general.

## Family coverage of actually missed rescuers

| Family | Class-1 levels with a missed winner | Coverage |
|---|---:|---:|
| beam | **18 / 26** | **69.23%** |
| DFS | 9 / 26 | 34.62% |
| admissible-order | 2 / 26 | 7.69% |

Families overlap. The important asymmetry is cost: the concentrated beam winners are generally hundreds of thousands of nodes, whereas much of the DFS/admissible tail is millions to tens of millions.

## Compact beam nomination

Greedy set coverage over **missed winners only** selects these first four identities:

| Rank | Missed identity | Newly covered | Cumulative class-1 coverage | Median historical winner nodes |
|---|---|---:|---:|---:|
| 1 | `beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets` | 10 | 10/26 = **38.46%** | 381,735.5 |
| 2 | `beam|score=knotBuilder|bias=none|width=2000|retention=plain` | 3 | 13/26 = **50.00%** | 133,230 |
| 3 | `beam|score=intersectionHarvest|bias=none|width=2000|retention=plain` | 2 | 15/26 = **57.69%** | 144,051 |
| 4 | `beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets` | 2 | **17/26 = 65.38%** | 409,972.5 |

A fifth beam identity, `beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain`, adds only R02102 and raises beam-family coverage to **18/26 = 69.23%**. Its historical winner used 211,793 nodes.

The dominant identity alone rescued ten selected misses with historical winner-node range **287,722–620,371**. The second identity's observed range was **72,986–175,330**; the 2000-width intersection-harvest identity was **104,049–180,615**; the 5000-width objective-first identity was **322,025–682,994**.

This is compact enough to justify an experiment. It is not compact enough, nor independently validated enough, to justify simply adding all four or five to every production level.

## Expensive tail

After the four compact beam identities, the greedy cover needs progressively more expensive/specialized actions:

- `dfs|score=perimeterSweep|bias=sideCommitment`: two new levels at greedy rank 5; median historical winner ~6.31M nodes;
- `dfs|score=perimeterSweep|bias=perimeterCCW`: two new levels; median ~19.03M;
- `dfs|score=portalCommitted|bias=none`: two new levels; median ~34.71M;
- the one-level remainder includes beam perimeter-CW, DFS corner-harvest and DFS default cases.

Admissible-order missed winners occur on only two class-1 levels and overlap levels that also have missed beam winners. Their historical winner counts are multi-million to ~18M nodes.

The tail should therefore **not** be bundled into the same first routing experiment. Doing so would turn a compact menu test into an expensive historical-winner replay.

## Recommended WS1 experiment, once orchestration ownership is clear

Do not implement this while `claude/solver-queue-sprint-dsgy2r` remains an active unmerged orchestration/pruning branch.

When that lane clears, the smallest useful test is:

1. freeze the current production control and residual population;
2. nominate the first **four beam identities above** before inspecting outcomes;
3. expose them through a level-blind routing/menu rule, never exact level IDs or stored winner identity lookup;
4. record whether each identity was actually offered/dispatched, its work spent, and solve contribution;
5. keep the treatment within an explicit additive/equal-work envelope rather than describing historical winner-node counts as free cost;
6. first use the 26 selected class-1 levels as a **participation/reproduction development check**, not confirmation;
7. if that works, test the fixed routing treatment on an independent residual block/population under the solver evidence rules before production promotion;
8. require zero regressions and distinguish unique gains from levels another current action also solves.

The fifth beam perimeter-CW identity should be a second decision, not automatically included: it contributes only one additional selected level.

## What this does and does not mean

This result says the current portfolio has a **real menu/exposure opportunity**: a majority of the class-1 population is associated with a small set of relatively cheap historical beam winners that production did not dispatch.

It does **not** say:

- adding those identities globally yields +17 solves;
- historical winner node count predicts additive production cost;
- the four identities are independent confirmation evidence;
- the correct solution is a larger unconditional portfolio;
- the remaining eight class-1 levels should receive expensive DFS/admissible actions.

The useful research question is narrower: can WS1 learn or encode a cheap, level-blind way to expose this compact beam menu where it is likely to pay for itself?

## Relation to current parallel work

At audit time, Claude's unmerged `claude/solver-queue-sprint-dsgy2r` branch contained the active joint-obligation observer/pilot and modified orchestration, hard-prune and related solver files. This audit intentionally touched none of that surface. Its result is a routing/menu nomination to be consumed only after that branch is reconciled, preventing two agents from implementing competing orchestration changes in parallel.

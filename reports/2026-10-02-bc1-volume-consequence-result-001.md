# BC1-V: volume consequence of theorem BC1

> **Status:** active
> **Last evidence:** 2026-10-02 — witness soundness on all stored Corpus-2 and Corpus-1 solutions (0 alarms, both forms); raw width-500 beam A/B on the frozen random-300: BC1-V 42 → 48 (7 gains / 1 loss), BC1-VX adds 48 → 51 (3 / 0).
> **Decision:** BC1-V and its vertex-cut extension BC1-VX are sound and new. VX is a strict superset that adds 3 gains for 0 losses at flat work, so **BC1-VX (`STRATEGY_BC1_VERTEX_VOLUME_PRUNE`) is the production candidate**. Both flags stay default-OFF until the production A/B and a regression gate come back.
> **Remaining gate:** representative production A/B on `data/stress/bc1-prune-ab-001-ids.txt` (treatment GHA 37052447194, `enable_flags=STRATEGY_BC1_VERTEX_VOLUME_PRUNE`, which replaced the cancelled BC1-V-only arm 37051159924; control = BC1-on arm 36772815197, whose solver semantics equal current `main`, and the current-main full-corpus control 37049775397 as a second control). Promote if gains clearly exceed losses, as BC1 did; then run the solved-control regression set.
> **Research question:** `WS2-CUT-BALANCE-PROJECTION`
> **Evidence role:** discovery
> **Selection:** prespecified (BC1's frozen seeded random-300; no outcome selection)
> **Owner:** `docs/solver-optimization-workstreams.md`.

## Theorem

BC1's exact-transition multigraph has the reached cells as nodes. Its edges are cardinal adjacencies and portal pairs. Every edge is a single-use resource: a cardinal move sets that axis bit on both endpoints, so the same edge can never be traversed again in either direction, and portal terminals are single-use. A bridge of this graph whose far side holds no goal therefore can never be entered. Entering it means crossing the bridge, and leaving it means crossing the bridge a second time, but the path still has to end on the goal.

BC1 uses this to reject a state when such a side holds a pending must-pass or must-cross cell. **BC1-V** uses it on the volume check. Every remaining counted step enters either a fresh cell or a visited cell (an intersection), so `rSteps <= usableFresh + intNeeded`. The ordinary check in `isConnected` counts every reached fresh cell as usable. BC1-V subtracts the fresh cells on goal-free bridge sides:

`reject if (freshVolume − strandedFresh) + intNeeded < rSteps`.

This is a different consequence of BC1, not a new scope for BC1's existing check. BC1 needs a pending mandatory cell behind the bridge; BC1-V needs none. The commonest instance is a width-1 dead-end corridor or a pocket behind a one-cell opening. The ordinary flood counts these cells as reachable, but a path that cannot U-turn can never use them.

Novelty witness (`topology.test.ts`): on a 5×3 board with blocks at (3,1) and (3,3), the 2×3 right-hand pocket hangs off the corridor cell (3,2). The ordinary volume check passes `reqLen=8` (13 fresh), while BC1-V removes 7 stranded cells, leaving 6, which correctly rejects. With the goal inside the pocket, nothing is stranded.

## Implementation (opt-in `STRATEGY_BC1_VOLUME_PRUNE`)

`bc1StrandedFreshVolume` in `topology.ts` repeats `bc1HasConflictFast`'s typed-array DFS over the fresh `_reached()` set and marks goal-free bridge subtrees in one forward pass. `bc1VolumePrunes` in `bc1-beam-shadow.ts` applies the inequality. The beam calls it only at BC1's seam: the candidate passed every ordinary prune, connectivity was computed fresh for it, and BC1 itself did not prune it. It mirrors `isConnected`'s portal-volume gate. Like BC1, it charges no canonical work, since the flood is reused. The DFS is a wall-time cost only.

## Soundness

`scripts/stress/bc1v-witness-soundness.mjs` replays referee-valid stored solutions (up to 5 per level) through the real search state. At every strict prefix that passes ordinary connectivity, it requires BC1-V not to reject.

| Corpus | Paths | Witness states | Stranded > 0 | Alarms | Min slack | Volume-count mismatches |
|---|---:|---:|---:|---:|---:|---:|
| Corpus-2 random (1,700 levels) | 8,164 | 821,270 | 769,852 (94%) | **0** | 1 | 0 |
| Corpus-1 (102 levels) | 504 | 39,870 | 35,616 (89%) | **0** | 1 | 0 |

`freshVolume` recomputed from the DFS agrees with `isConnected`'s own count on every state, so no state that passed connectivity would have failed the ordinary volume check. Witness states keep at least 1 unit of slack, and that minimum is the `pos`-counts-as-1 convention, so the bound is tight on real solutions. Almost every state has some stranded fresh cells.

## Raw-beam A/B (random-300, width 500, 3M nodes, default profile, BC1 on in both arms)

`scripts/stress/bc1v-prune-ab.mjs`; rows in `reports/stress/bc1v-prune-ab-001-shard{0,1,2}.json`.

| Shard | Control solved | Treatment solved | Gains | Losses | BC1-V rejections / evaluations |
|---|---:|---:|---:|---:|---:|
| 0 | 14 | 15 | 1 | 0 | 43,593 / 704,649 |
| 1 | 19 | 22 | 3 | 0 | 39,733 / 698,733 |
| 2 | 9 | 11 | 3 | 1 | 34,560 / 639,807 |
| **All 300** | **42** | **48** | **7** | **1** | 117,886 / 2,043,189 (5.8%) |

Gains: R02357 R00712 R02293 R02046 R02666 R02698 R01157. Loss: R02099. Canonical `workSpent` fell 2.2% (101.35M → 99.26M). Wall time rose about 18% (75 s → 88 s per 100 levels) from the extra DFS on candidates BC1 skips because nothing mandatory is pending. One DFS now serves both checks when a volume flag is on (`bc1WithVolumePrunes`): a BC1 conflict is exactly a pending cell stranded in bridge-only mode. On shard 1 the one-pass BC1-VX run is identical to the two-pass run (24 solved, identical `workSpent`, 44,887 / 709,688 rejections / evaluations). Its wall overhead over the BC1-only control is +8% (24.9 s → 26.9 s per 100 levels).

The exchange (7:1) is smaller than BC1's raw beam (20:1) and has the same character: rejected candidates are provably dead and free beam slots. Raw-beam gains are not cold solves; most raw-beam BC1 gains were already solved by the wider ladder.

## BC1-VX: cut vertices once no free intersection remains

When `requiredIntersections − ints − popcount(mustCrossMask) ≤ 0`, every remaining intersection is reserved for a pending must-cross crossing, so no ordinary cell can be entered twice (the same invariant as `PRUNE_MC_RESERVED_WALL`). A goal-free DFS subtree separated by a cut vertex `p` (`low[v] ≥ tin[p]`) can be entered and left only through `p`. That needs a second visit to `p`, so the subtree is unusable unless `p` is a pending must-cross cell. Bridges are the special case that needs no intersection argument. The proof uses the same supergraph argument as BC1: extra edges in the reached graph can only hide cuts, never invent them.

| Check | Result |
|---|---|
| Witness soundness, Corpus-2, 5 paths/level (`--vertex-cuts=true`) | 821,270 states, **0 alarms**, min slack 1 (`reports/stress/bc1vx-witness-soundness-corpus2.json`) |
| Raw-beam increment over BC1-V, random-300 (`reports/stress/bc1vx-over-bc1v-ab-001-shard{0,1,2}.json`) | 48 → 51, **3 gains / 0 losses**; rejections 117,886 → 130,042; `workSpent` −0.04%; wall flat |

Cumulative raw-beam effect versus the production BC1-only beam: 42 → 51 on the random-300.

**Mandatory form tested and not adopted.** The same no-free-intersection argument also kills a state whose pending must-pass/must-cross cell lies behind a non-revisitable cut vertex (BC1's own consequence carried to cut vertices). It is sound: the witness harness checks it too, with 0 alarms on 861k states. But adding it as a reject on top of volume-only BC1-VX gave 42 → 50 (11 gains / 3 losses; `reports/stress/bc1vx-mandatory-prune-ab-001-shard{0,1,2}.json`) against 51 without it. It adds no net solves and only perturbs trajectories, so the consumer computes it (`vertexConflict`) but does not act on it.

## What this does not establish

Production-ladder value is not yet measured. The A/B above is one raw configuration on one population.

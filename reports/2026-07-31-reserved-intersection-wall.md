# The reserved-intersection wall: 2.25x faster, and the first solves in the campaign (2026-07-31)

[`2026-07-31-mustcross-forced-structure.md`](2026-07-31-mustcross-forced-structure.md) ended with a
recommended sequence and put **reservation-aware connectivity** first, as "the cheapest real test of
the whole thesis." This is that test. It is the first mechanism in this campaign that is not a
reordering coin flip.

**Headline**: on the published corpus it is a **pure speed** change — 134 of 160 levels come out
bit-identical on `nodesExpanded`, and the ones that do are **2.25x faster**. On the fully-reserved
must-cross regime it *also* prunes, and the extra budget that speed buys converts into **+2 solves
on a 24-level unsolved sample at 73% of the wall time**.

Shipped behind `PRUNE_MC_RESERVED_WALL`.

---

## The rule

Each pending must-cross cell has exactly one intersection already committed to its own second
crossing — `prune-gauntlet.ts`'s `PRUNE_MC_CEILING` guarantees `ints + popcount(mustCrossMask) <=
reqInt` on every surviving state. So the intersections available for revisiting **anything else**
are

    freeInt = reqInt - ints - popcount(mustCrossMask)

and `freeInt` is **non-increasing** along any path:

| move | `ints` | `popcount(mustCrossMask)` | `freeInt` |
|---|---|---|---|
| onto a fresh cell | — | — | unchanged |
| a must-cross 2nd crossing | +1 | −1 | **unchanged** |
| any other revisit | +1 | — | −1 |

Therefore once `freeInt` hits 0 it stays 0, and **no ordinary cell can ever be re-entered again for
the rest of the search**. The visited path stops being a budget-limited obstacle and becomes a wall;
only the pending must-cross cells stay open, because their revisit is the one that is already paid
for. On `reqInt <= must-cross count` levels this holds from the first move.

`topology.ts` previously encoded only the coarser version of this — `maxVisit = intNeeded > 0 ? 2 :
0` — which keeps every visited cell traversable whenever *any* intersection remains, including the
ones that are entirely spoken for.

### Why the two intersection-exempt cells don't break it

`search-state.ts`'s `wasIntAdded` excludes the gate and the goal from the intersection count, so a
revisit of either would be a free revisit the arithmetic above cannot see. Neither can happen:

- **Gates** are already walls in `prep.reachBlockedArr` and are excluded from `staticNeighbors`
  targets — they cannot be re-entered at all.
- **The goal is terminal.** Verified in all three search families rather than assumed:
  `prune-gauntlet.ts:59` answers `'solution'` or `'reject'` the moment a move enters it,
  `hint-enumeration.ts:165` does the same, and `repair-search.ts:397` carries an explicit
  defense-in-depth terminal check with a comment stating the case is already unreachable. The path
  never traverses the goal, so it is visited at most once.

### Scope, and why it is narrow on purpose

Portal levels are excluded: a jump enters its destination for zero path steps, and the
`reqInt == nodes - distinctCells` identity behind `freeInt` was only ever validated portal-free.

The wall also cannot fire outside must-cross levels — with `mustCrossMask == 0`, `freeInt` equals
`intNeeded`, so `freeInt == 0` implies `intNeeded == 0`, which the pre-existing `maxVisit = 0` rule
already covers. The population is exactly: must-cross levels that have reached a zero free budget.
536 unsolved corpus-2 levels and 35 published levels are in that regime from their first move.

---

## Soundness

The rule *rejects states*, so it carries the full MST-scratch-buffer-bug rigor, not "tests pass."
`scripts/stress/mc-prune-soundness-check.mjs` replays every known-valid solution we possess — each
level's `stressMeta.witnessSolution` plus every saved hint, i.e. PLAY-refereed paths found by every
technique the project has ever run — through the real search state, and asserts `isConnected` never
returns false on one. Any rejection would be a state on a path the game itself accepts.

| corpus | levels | valid paths | steps replayed | rejections |
|---|---|---|---|---|
| corpus-2 | 1,371 | 17,102 | 1,551,772 | **0** |
| corpus-1 | 76 | 9,946 | 771,244 | **0** |
| published | 101 | 7,888 | 302,869 | **0** |

2.6M replayed steps, zero. (The harness gained the published corpus here; it previously covered only
the two stress corpora.)

`topology.test.ts` adds a behavioural test covering both halves: a visited cell walls off the goal
once the budget is reserved, *and* a pending must-cross cell stays traversable — with the ablated arm
asserted to still return `true`, so the test fails if the flag is silently ineffective.

---

## Effect 1: pure speed on the published corpus

Interleaved on/off, same host, same run, `--budget-ms=20000 --work-budget=100000000`:

| run | solved | nodes | wall |
|---|---|---|---|
| ON, run 1 | 160/160 | 56,614,178 | 39.8s |
| ON, run 2 | 160/160 | 56,614,178 | 37.1s |
| OFF, run 1 | 159/160 | 147,676,461 | 201.2s |
| OFF, run 2 | 160/160 | 56,418,884 | 79.3s |

**134 of 160 levels have bit-identical `nodesExpanded` between the arms** — same states, same order,
same search. Restricting to those levels *and* to >200ms so the measurement is not dominated by
noise:

|  | levels | wall |
|---|---|---|
| ON | 23 | 23,991ms |
| OFF | 23 | 53,890ms |
| **ratio** | | **0.445** |

**2.25x**, and it matches the independent single-level interleaved measurement exactly (median 36.0s
vs 81.0s over 3 runs each on R02332, at 20,000,000 nodes in both arms, ~5% within-arm variance).

The mechanism is not mysterious: with `maxVisit` forced to 0 the flood fill's reachable region
collapses to the unvisited side of the path, and `_floodFillBits` grows its row band lazily out from
`pos`, so a sealed-off region costs proportionally less. The connectivity prune is ~34% of
published-corpus solver CPU.

Of the 26 levels whose node counts *do* change, **25 go down** (P00066 184,209 vs 225,021; P00129
19,496 vs 25,399; P00114 35,575 vs 37,099). The entire "+0.3% nodes" that `solver:bench --check`
reports is one level — P00157, +251,340 — against −56,046 across everything else.

P00157 is also where the OFF arm is *unstable*: it failed at 109,349,098 nodes / 140s in one run and
solved at 18,091,521 / 19.8s in the next, same config. Both ON runs solved it identically in ~10s at
18,342,861 nodes. That instability is pre-existing ladder behaviour, not something this introduced —
but it is the difference between the two OFF rows above, and it is why a single OFF run is not a
usable baseline.

## Effect 2: solves, once the speed is spent as budget

Every unsolved level in the typical-budget corpus baseline terminates at `node-budget-reached`, so
the corpus metric is **node-bound by construction** and a pure speed gain cannot move it. The honest
way to state what 2.25x buys is: **a 2.25x node-budget increase at zero wall-time cost.** So the
decisive comparison is matched *wall cost* — ON at 45M nodes (~81s/level) against OFF at 20M
(~81s/level) — not matched nodes.

Population: fully-reserved (`reqInt <= must-cross count`), portal-free corpus-2 levels — 180 unsolved
and 72 solved exist; 24 of each sampled. All runs `--budget-ms=8000 --work-budget=26800000
--repair-budget-fraction=1.5 --attraction-diversity-budget-fraction=0 --workers=4`.

**Unsolved:**

| arm | solved | nodes | wall |
|---|---|---|---|
| OFF @ 20M | 1/24 | 462,076,411 | 1,667s |
| ON @ 45M | **3/24** | 959,862,411 | **1,225s** |

+2 solves at 73% of the wall time; 2.08x the nodes in 0.73x the time, consistent with the 2.25x.
Gained R00228, R00518, R00553; lost R00001.

**Already-solved** — the control that killed the previous three mechanisms, since a sweep over
`ok:false` levels can only discover wins:

| arm | solved | wall |
|---|---|---|
| OFF @ 20M | 13/24 | 1,132s |
| ON @ 20M | 12/24 | 522s |
| ON @ 45M | **13/24** | **730s** |

Net zero at 0.64x the cost. Note the middle row: **at matched nodes the mechanism is −1**, the same
reordering coin flip every previous idea produced (R01778/R02143 gained, R01925/R02112 lost). It only
comes back to parity once the budget the speedup pays for is actually spent. Reporting the node-pinned
number alone would have killed this change.

Combined across both populations: **+2 solves over 48 levels at ~0.7x wall time.**

---

## The measurement trap this exposed

`workSpent` reported **+11%** on a change that **halved CPU** (89.4M vs 80.2M work units for the same
20,000,000 nodes, at 36.0s vs 81.0s).

`CONNECTIVITY_WORK_UNITS` charges `isConnected` a flat 12 units regardless of how much grid the fill
actually floods. That is correct for a change that alters how *often* the fill runs, and wrong for one
that alters what each call *costs*. CLAUDE.md's standing guidance — prefer `workSpent` over
`nodesExpanded` because "it means the same amount of real work in dfs/beam/repair" — needs that
carve-out, and it is now recorded there and in `docs/solver-budget-determinism.md`.

The general form: **the work meter is a model of cost, not a measurement of it.** For any change that
alters the cost of a metered operation rather than its frequency, the meter is the wrong instrument
and interleaved wall-clock at pinned `nodesExpanded` is the right one.

## Limitations

- **The solve-count claim is one sample, not replicated.** The 2.25x timing is replicated three ways
  (single-level interleaved 3x3, published-corpus 2x2, and the corpus-2 sweeps' wall ratios); +2/24 is
  a single paired run. It is a rate estimate over a 180-level population with a wide interval, not a
  promise of ~15 solves.
- **The sampled populations are the first 24 by corpus order**, not random draws.
- The corpus-2 sweeps used reduced extension budgets (`--repair-budget-fraction=1.5`,
  `--attraction-diversity-budget-fraction=0`) for cost, identically in both arms. That changes which
  levels solve at all (12-13/24 rather than 24/24 on the "solved" population), so the control is a
  weaker check than a full-budget run would be.
- **Nothing here re-baselines `logs/solver-baseline.json`.** `solver:bench --check` passes 160/160 at
  +0.3% nodes against the existing baseline, and that baseline's wall-clock column is host-specific
  and not comparable to these numbers.

## The follow-up this is a special case of

The rule implemented here is the **`F = 0`** case of a general statement: *at most `F = freeInt`
visited cells may be entered on any remaining route.* The general version is bounded-cost
reachability — compute reachable-with-zero-crossings, then dilate through one layer of visited cells,
`F` times — which stays bit-parallel (`F+1` fills instead of one) and applies to **every** level with
a small remaining intersection budget, must-cross or not, rather than only the reserved regime. It
both prunes harder and shrinks the fill, and it subsumes what shipped here.

That is the next thing to build, and it should be built the same way: derive it, gate it on the
replay harness, measure it at matched *wall cost* rather than matched nodes, and check the
already-solved population before the unsolved one.

## Reproducing

```bash
# soundness (all three corpora)
node scripts/run-bundled.mjs scripts/stress/mc-prune-soundness-check.mjs -- --corpus=corpus2
node scripts/run-bundled.mjs scripts/stress/mc-prune-soundness-check.mjs -- --corpus=corpus1
node scripts/run-bundled.mjs scripts/stress/mc-prune-soundness-check.mjs -- --corpus=published

# published-corpus interleaved on/off (repeat, alternating arms)
node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- \
    --corpus=data/levels.json --levels=all --scheduler-mode=legacy \
    --budget-ms=20000 --work-budget=100000000 --workers=4 \
    [--disable-flags=PRUNE_MC_RESERVED_WALL] --out=<file>
```

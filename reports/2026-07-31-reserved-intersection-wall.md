# The reserved-intersection wall: 2.25x faster, and the first solves in the campaign (2026-07-31)

[`2026-07-31-mustcross-forced-structure.md`](2026-07-31-mustcross-forced-structure.md) ended with a
recommended sequence and put **reservation-aware connectivity** first, as "the cheapest real test of
the whole thesis." This is that test. It is the first mechanism in this campaign that is not a
reordering coin flip.

**Headline**: on the published corpus it is a **pure speed** change — 134 of 160 levels come out
bit-identical on `nodesExpanded`, and the ones that do are **2.25x faster**. On the fully-reserved
must-cross regime it *also* prunes — hard. Across 252 levels of that regime, run in full rather than
sampled: **+21 solves at the standard node budget in half the wall time**, or **+29 if the freed time
is spent as extra budget**. Positive on the already-solved guard population too, not merely neutral.

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
**180 unsolved portal-free corpus-2 levels** and 35 published levels are in that regime from their
first move — and more reach it mid-search, since `freeInt` only decreases. (An earlier draft quoted
"536 unsolved corpus-2 levels" from the predecessor report; that figure counts portal levels, which
this mechanism excludes. See the census in the follow-up section.)

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
and 72 solved, both run in full. All runs `--budget-ms=8000 --work-budget=26800000
--repair-budget-fraction=1.5 --attraction-diversity-budget-fraction=0 --workers=4`.

**Unsolved — the full population, all 180 levels** (0 `deadlineTruncated` in any arm):

| arm | solved | nodes | worker-time |
|---|---|---|---|
| OFF @ 20M | 7/180 | 3,503,955,817 | 12,767s |
| **ON @ 20M** (matched nodes) | **26/180** | 3,213,000,000 | **6,761s** |
| ON @ 45M (matched wall) | **30/180** | 6,977,357,910 | 9,632s |

**At matched nodes — the standard budget, no extra budget at all — this is +19 solves (22 gained, 3
lost) in 53% of the wall time.** It dominates the control on both axes at once: nearly 4x the solves
in half the time. At matched *wall cost* it is **+23 solves (25 gained, 2 lost) at 0.75x**.

So the split is **+19 from the pruning itself and only ~4 from the freed budget** — the opposite of
what the already-solved control suggested. Losses are stable: R00001 and R02003 in both ON arms, plus
R03232 at 20M only. Lost: R00001, R02003. Gained:
R00228, R00518, R00553, R01157, R01218, R01511, R01558, R01678, R02048, R02111, R02119, R02209,
R02364, R02384, R02652, R02685, R02859, R02891, R02921, R02939, R03023, R03091, R03250, R03262,
R03366.

A 24-level sample run first predicted +2/24, i.e. +15/180 (OFF 1/24, ON 3/24). The full population
came in at +23, so the sample **under**-sold the effect. Worth recording in both directions: a small
sample was the right thing to run before committing an hour of compute, and it was not accurate
enough to quote as a rate.

**Already-solved — the full 72-level control**, the guard that killed the previous three
mechanisms, since a sweep over `ok:false` levels can only discover wins:

| arm | solved | wall |
|---|---|---|
| OFF @ 20M | 42/72 | 2,454s |
| **ON @ 20M** (matched nodes) | **44/72** | **1,094s** |
| ON @ 45M (matched wall) | **48/72** | 1,591s |

**+2 at matched nodes in 45% of the wall time; +6 at matched wall cost.** The control does not merely
hold — it gains. (These are levels the *typical-budget* baseline solves; under this run's reduced
extension budgets the control arm reproduces only 42 of them, so there was real headroom to move them
either way.)

A 24-level version of this control run earlier measured **−1** at matched nodes, and that single
number was very nearly the basis for killing the change. The full population says +2. Both samples in
this report — solved and unsolved — pointed the wrong way at n=24.

### Combined

252 levels, both populations:

| comparison | OFF | ON | delta | wall ratio |
|---|---|---|---|---|
| matched nodes (both @ 20M) | 49 | **70** | **+21** | **0.52x** |
| matched wall cost (ON @ 45M) | 49 | **78** | **+29** | 0.74x |

### Portal levels: the exclusion was wrong, but the gain there is mostly speed

The original gate excluded portal levels. That conflated two requirements: the wall needs only "every
entry into a visited ordinary cell costs one intersection" (`wasIntAdded`, which `applyMove` evaluates
for portal jumps exactly as for ordinary moves), whereas the `reqInt == nodes - distinctCells` identity
— the thing portals actually break — is what the **volume check** below it is gated on. Removing the
wall's gate keeps the volume check's.

Evidence the exemption was untested rather than justified: with the gate removed, the wall is active in
**173,821 of 263,996** replayed states on portal-bearing corpus-2 levels (65.8%, vs 52.1% portal-free),
at zero rejections across all three corpora. The soundness harness had been walking this population all
along with the rule disabled for it.

356 unsolved portal-bearing fully-reserved corpus-2 levels, matched nodes:

| arm | solved | nodes | wall |
|---|---|---|---|
| OFF @ 20M | 16/356 | 6.99B | 25,989s |
| ON @ 20M | **19/356** | 6.94B | **15,611s** |

**Net +3 (9 gained, 6 lost) at 0.60x wall time** — against +19 (22 gained, 3 lost) on the 180
portal-free levels. The speed half holds; the solvability half is weak, and 15 flips netting 3 is not
a demonstrated gain.

The asymmetry has a mechanism rather than being a measurement oddity: **the volume check is disabled on
portal levels**, so only the *reachability* half of the wall applies there. The tightening of
`freshVolume` is evidently where much of the pruning power lives.

Kept on the strength of the speed (40% off 356 levels) and soundness, not the +3.

**Corpus-wide confirmation** (second refresh, run 30600532489 on `39c19ac9`, portal-free build →
portal-inclusive):

| corpus | before | after | net |
|---|---|---|---|
| corpus-2 | 457 | **462** | **+5** (10 gained, 5 lost) |
| corpus-1 | 88 | 88 | **0** |

Corpus-1 is the reason this refresh was worth running: it was never A/B'd for portals and was already
at −1 from the portal-free change, so a further cost there was the live risk. There is none. Wall time
edged down, 33,030s → 32,804s.

### Banked: the corpus-wide result at the standard configuration

Merged to `main` at `8ec8ccef` and refreshed via `.github/workflows/solver-typical-budget-baseline.yml`
(run 30592553520, 240 shards, default budgets — corpus-2 26.8M work / 20M nodes / 8000ms, corpus-1
67M / 50M / 20000ms). Previous typical-budget baseline vs new, like for like:

| corpus | before | after | net | wall | nodes |
|---|---|---|---|---|---|
| **corpus-2** | 434/1700 | **457/1700** | **+23** | 33,141s → 33,030s | 26.04B → 25.75B |
| corpus-1 | 89/102 | 88/102 | **−1** | 425s → 462s | 0.75B → 0.82B |

**Net +22 across both corpora at unchanged wall time**, against a local prediction of +21 from the
matched-node sweeps. (With the portal extension in the section above, the session total is corpus-2
434 → 462 and corpus-1 89 → 88, i.e. **net +27**.) Corpus-2: 29 gained, 6 lost. Corpus-1: gained R01271, lost R01478 and R01626.

Note R01478 — the level the dead-flipper change cost earlier the same week. The previous baseline
already contained that change, so this loss is the wall's, not the flipper's.

**Read the workflow's own diff header with care.** It reports "40 hard regressions" on corpus-2, but
it diffs against `benchmark-latest-random.json`, the *merged* baseline (605) that includes
high-budget-sweep and hint-discovery finds no typical-budget run reproduces. The +23 above is
computed directly from the two typical-budget reports, which is the only like-for-like comparison.

Attribution is clean: the only live solver change between the two baselines is this one — the three
intervening commits touching `modules/solver/` are the two reverted prunes and their revert.

### Banking it needs no benchmark change — a retracted conclusion

An earlier version of this section argued the opposite, and it was wrong. It reasoned from the
already-solved control (−1 at matched nodes) that the change was "roughly a wash on solvability at a
fixed node budget," and therefore that realising the gain required raising the corpus baseline's node
budget from 20M to ~45M — a change to what the benchmark *means*.

The matched-node cell on the **unsolved** population falsifies that: **+19 solves at 20M**, the very
budget the baseline already uses. The two populations behave completely differently, and generalising
from the solved one was the error — on levels that already solve, the prune only reshuffles marginal
cases; on levels that do not, it is decisive.

A corpus refresh at the existing definition therefore captures most of this (+19 of +23). Raising the
node budget is an optional extra worth ~4 more, not a precondition.

**Two general lessons worth keeping.** First: the already-solved control is the right guard against a
change that *breaks* things, and it is a poor predictor of what a change *gains* — those need separate
populations, and a result from one must not be quoted about the other. Second: **at n=24 both of this
report's samples pointed the wrong way** (the unsolved sample under-sold +23/180 as +15/180; the solved
sample reported −1 where the population says +2, and that −1 was nearly the basis for killing the
change). Sampling first is still right — it cost minutes instead of hours — but a sample of this size
decides whether to spend the compute, never what the answer is.

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

- **The +23 is one paired run over the whole population, not a replicated measurement.** The 2.25x
  timing is replicated three independent ways (single-level interleaved 3x3, published-corpus 2x2, and
  the sweeps' own wall ratios). The solve count is a single A/B — it covers every level in the
  population rather than a sample, so there is no extrapolation left in it, but a repeat run would
  still move a few levels either way given how many sit near the budget edge.
- The corpus-2 sweeps used reduced extension budgets (`--repair-budget-fraction=1.5`,
  `--attraction-diversity-budget-fraction=0`) for cost, identically in both arms. That changes which
  levels solve at all (12-13/24 rather than 24/24 on the "solved" population), so the control is a
  weaker check than a full-budget run would be.
- **Nothing here re-baselines `logs/solver-baseline.json`.** `solver:bench --check` passes 160/160 at
  +0.3% nodes against the existing baseline, and that baseline's wall-clock column is host-specific
  and not comparable to these numbers.

## The follow-up, built and reverted: bounded-cost reachability at freeInt >= 1

The shipped wall is the **freeInt == 0** case of a general statement: *at most `freeInt` visited cells
may be entered on any remaining route.* The general form was built (`PRUNE_FREE_INT_DILATION`,
`FREE_INT_DILATION_MAX = 1`) as `freeInt` dilation passes over the free-reachable set, each stepping
one hop into payable cells and re-converging, with an early exit at the fixpoint. It stayed
bit-parallel — `_growReachedRow` was already both primitives — so a budget of N cost N+1 closures.

Sound: 0 rejections over the full connectivity harness (50,221 paths, 3,686,485 prefix states),
`solver:bench --check` 160/160, unit test pinning that one free intersection buys exactly one hop.

**Reverted on the measurement.** 173 unsolved must-cross corpus-2 levels with `freeInt@gate` in 1..3:

| arm | solved | nodes | wall |
|---|---|---|---|
| OFF @ 20M | **4/173** | 3.40B | 14,363s |
| ON @ 20M (matched nodes) | 2/173 | 3.42B | **7,647s** |
| ON @ 40M (matched wall) | **4/173** | 6.81B | 10,406s |

It reproduces the wall's *speed* signature — **1.88x faster at identical node counts** (node ratio
1.008) — and none of its pruning benefit: **−2 at matched nodes, net 0 at matched wall cost** (1
gained, 1 lost). Doubling its budget bought nothing, where the same doubling on the wall's population
bought +23. Since the corpus baseline is node-bound, what a refresh would actually measure is the −2.

**Why the two differ, which is the transferable part.** At `freeInt == 0` the wall changes the
*topology* of the remaining problem: the visited path becomes a hard boundary, so whole regions go
unreachable and the volume check tightens with them. At `freeInt >= 1` one paid hop re-opens the far
side of the path almost anywhere, so the reachable set is nearly what the permissive rule already
computed — the fill gets cheaper (hence the 1.88x) without getting much *smaller in the ways that
prune*. The prediction that this "both prunes harder and shrinks the fill" was half right: it shrinks,
it does not prune.

Firing rates measured over replayed real solutions, for the record: `freeInt == 0` covers 57.4% of
states with a live must-cross reservation, `== 1` 6.7%, `== 2` 4.0%, `== 3` 2.9%. The order-of-
magnitude drop from 0 to 1 was the honest prior and it held.

**Do not rebuild this without a new argument.** Raising `FREE_INT_DILATION_MAX` to 2 or 3 addresses a
strictly smaller population (4.0% and 2.9%) at strictly higher cost (3 and 4 closures), so it is
worse on both axes than the case already measured at zero.

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

# Repair-search nogood cache: premise validated, shipped default-on (2026-08-07)

## Context

`docs/repair-search-stagnation-escape-plan.md`'s Appendix carries a fully-speced but never-built
design for a per-call cache of exact dead-end states — "give repair's restart loop memory of its
own failures," the second of the two big levers the 2026-07-22 stagnation synthesis named as the
real, if bigger, way past repair's append-only wall (the other being reversible prefix edits, tried
the same day as this report — see `reports/2026-08-07-repair-elite-prefix-dfs.md`). The design was
explicitly deprioritized: prior (differently-scoped) research suggested independent random restarts
in `repairSearchFromGate` likely don't revisit *exact* states often, and its own "Stage 0 — cheap
premise check" was speced specifically to test that before investing in the engineering — but
"was never actually run."

## Stage 0: the premise check, actually run

Built the doc's own corrected-and-complete state signature (`pos`, per-visited-cell `edgeUsage`,
`portalJumps`, `mpVisitedMask`, `mustCrossMask` + `crossCounts`, `surroundMask` +
`surroundNeighborRemainingMasks`, `mustTurnMask`, `adjTurnMask`, `flipperUsedMask`,
`lastWasPortalJump`) as temporary, env-gated instrumentation (`PF_NOGOOD_STAGE0_DEBUG=1`) tracking
a per-call `Set` of dead-end signatures, split by fresh-vs-elite-spliced restart origin. A real gap
surfaced while building it: the doc's own field list omits `ints` — a cell that turns on its
one-and-only visit and a cell visited straight-through twice both end at the same final `edgeUsage`
value (both axis bits set) but contribute different intersection counts, so two states sharing
every other field but different `ints` are not actually the same state. Fixed before trusting any
number (the exact class of gap CLAUDE.md's memoization-soundness gotcha warns about); confirmed the
fix didn't change the measured numbers on this population (adding `ints` produced byte-identical
output on the first two levels re-run), i.e. the gap was real but rare enough not to have inflated
the result here — still the correct thing to close before shipping a signature into production.

**Result, 7 real repair-close levels with usable data (15,000,000-node budget each; 3 more solved
before reaching the instrumented failure path, no data):**

| Level | Dead-ends | Distinct signatures | Repeat rate | Fresh repeat rate | Spliced repeat rate |
|---|---:|---:|---:|---:|---:|
| R00440 | 60,537 | 28,056 | 53.65% | 47.36% | 56.78% |
| R01397 | 430,019 | 92,004 | 78.60% | 63.00% | 86.94% |
| R01698 | 497,636 | 205,742 | 58.66% | 40.81% | 68.21% |
| R01860 | 540,084 | 121,796 | 77.45% | 64.20% | 84.55% |
| R02003 | 412,195 | 128,562 | 68.81% | 47.78% | 80.02% |
| R02088 | 366,700 | 100,041 | 72.72% | 58.78% | 79.96% |
| R02123 | 1,306,750 | 25,015 | 98.09% | 98.14% | 98.06% |

Decisively above both the doc's own "<1%, stop here" falsification bar and its "low single digits,
proceed" bar — on every level tested, both fresh AND elite-spliced restarts spend a large majority
of their dead-end discoveries rediscovering a state already proven dead earlier in the *same*
`repairSearchFromGate` call. This directly contradicts the prior (differently-scoped) research's
pessimistic prior — that research measured `dfsFromGate`'s own backtracking, a mechanically
different population from `repairSearchFromGate`'s independent random restarts, per the doc's own
"prior art" section.

## Stage 1: the cache, built with one deliberate simplification

`modules/solver/nogood-cache.ts`: a per-`repairSearchFromGate`-call cache (`createNogoodCache`),
hard-capped at 500,000 entries (dropping past capacity costs opportunity, never soundness).

**Deliberate departure from the plan's original design**: the plan specified *incremental*
Zobrist-style hashing (O(1) amortized per move) maintained across every `applyMove`/`undoMove`
call. Its own risk callout was "every call site must route through the tracked wrapper
consistently or the incremental hash silently desyncs from the real state" — at design time,
`repair-search.ts` had 3 such call sites; it now has 5 (`takePly`, `closeLengthGap`,
`replayToPrefix`, and this session's own new `boundedDfsFromHere`/`relinkPaths`). A desynced
incremental hash is a **soundness** bug (a false "this state is dead" that was never actually
recorded), not a missed optimization. Built the signature **fresh** each check instead — trivially
correct by construction, since it always reads `ws`'s current fields directly and can never
disagree with them. To keep the cost bounded, the check runs once per **committed step** in
`repairSearchFromGate`'s main loop (not once per **candidate** inside `takePly`, which is where the
plan originally placed it) — a hit converts `takePly`'s `'continue'` outcome to `'deadend'`
immediately, short-circuiting the rest of an already-known-fruitless subtree without threading a
new check into `takePly`'s hot per-candidate scoring loop.

Ablation: `STRATEGY_REPAIR_NOGOOD_CACHE`, **default-on** (the standard `!cfg || cfg.FLAG`
convention) — unlike this session's `STRATEGY_REPAIR_ELITE_PREFIX_DFS` (opt-in-only), this
mechanism can only ever *skip* already-proven-dead exploration, never add new search effort
competing for the same fixed node budget, so it doesn't carry that mechanism's "zero-sum
reallocation" risk.

**Soundness**: a cache hit only ever short-circuits `takePly`'s own randomized-walk continuation —
it never touches `evaluatePrunedMove` or `isSolutionState`, and every other operator in this file
(`closeLengthGap`, `elitePrefixDfsRepair`, `relinkPaths`) still runs its own independent search from
a state the cache calls "dead-ended once under `takePly`'s own single random choice," not "provably
unsolvable." 6 new unit tests (`nogood-cache.test.ts`): basic has/recordDead round-trip, position
sensitivity, the `ints`-sensitivity regression case found during Stage 0, cell-set order
independence, and the capacity-cap drop behavior. `tsc --noEmit` clean; full solver test suite
(73 tests across the touched files) passes; `solver:bench --check` 160/160, no regressions,
published-corpus `nodesExpanded` unchanged (51,959,647 — the mechanism barely engages on published
levels, which rarely stagnate as heavily as the hard corpus-2 population).

## Validation: net-positive, zero regressions

Same 20-level repair-close/repair-far closest-miss population and node-budget-pinned methodology
used for `elitePrefixDfsRepair`'s own A/B (`reports/2026-08-07-repair-elite-prefix-dfs.md`), same
15,000,000-node budget, directly comparable:

| | ON (cache default) | OFF (`STRATEGY_REPAIR_NOGOOD_CACHE: false`) |
|---|---:|---:|
| Solved | **5/20** | 4/20 |
| Total nodesExpanded | 256,667,960 | 263,446,742 |

**One flip, entirely in favor of ON**: R02239 solves at 14,162,219 nodes with the cache; without
it, the same config exhausts the full 15,000,000-node budget unsolved. **Zero regressions.** On
every level that solves either way, the cache uses fewer or equal nodes to reach the identical
outcome:

| Level | Nodes ON | Nodes OFF | Reduction |
|---|---:|---:|---:|
| R00342 | 3,775,975 | 6,150,798 | 38.6% |
| R00877 | 7,809,155 | 7,832,604 | 0.3% |
| R02022 | 4,892,766 | 8,272,817 | 40.9% |
| R02220 | 1,027,664 | 1,190,415 | 13.7% |
| R02239 | 14,162,219 | 15,000,000 (unsolved) | — |

This is the shape of result the mechanism's design predicts: a technique that only ever *skips*
work should show up as consistent, directional node savings with no downside, unlike a technique
that *adds* competing search effort (`elitePrefixDfsRepair`'s own same-day A/B, by contrast, showed
real displacement from shared node-budget competition).

## Disposition: shipped default-on

`STRATEGY_REPAIR_NOGOOD_CACHE` ships enabled by default. This is the first genuinely positive
default-on repair-search capability change validated this session — the other two attempts
(`elitePrefixDfsRepair`, and three smaller admissibility/dedup experiments earlier the same day)
were sound but net-neutral-to-negative and shipped opt-in or reverted. Temporary Stage 0
instrumentation (`stage0Signature`, the debug counters, `PF_NOGOOD_STAGE0_DEBUG`) was removed after
answering the premise check — its numbers are preserved here and in `nogood-cache.ts`'s own header
comment, not lost.

## Full corpus-2 refresh, 2026-08-07: zero solved-count change

A `deterministic:true` run against current `main` with no ablation flags (so the cache runs at
its shipped default-on setting, at this workflow's real 36,000,000-node budget) solved
**725/1700 — a byte-identical solved-ID set to the pre-nogood-cache committed baseline (0 gained,
0 lost)**. This is the natural next-scale validation the 20-level sample called for, and the
result is a clean, expected null on solved-count at full scale: the mechanism only ever *skips*
already-proven-dead work, so at a budget this generous almost nothing that solves at all needs
the last few million nodes the cache reclaims to cross the finish line (the 20-level sample's one
flip, R02239, needed exactly that kind of budget-margin rescue, at a much tighter budget). This
doesn't retract the mechanism's validated node-cost savings — see the still-open items below —
just confirms it isn't (and at this budget shouldn't be expected to be) moving the solved count
either direction on its own. Investigated as part of resolving an unrelated turn-bias discrepancy;
see `reports/2026-08-07-turnbias-corpus2-validation.md`.

## What's still open

- **The fresh-signature cost is unmeasured in isolation** — the 2.57% aggregate node reduction
  bundles the cache's savings with its own per-check overhead. A level that solves quickly (few
  dead-ends, few cache checks) pays a small fixed cost for no benefit; the data above shows this
  cost is not large enough to produce a net loss anywhere in this sample, but it wasn't isolated
  as its own number.
- **Optimizing to a true incremental hash remains a valid future step** if the fresh-signature
  cost ever shows up as a real bottleneck — the plan's original design is still sound in principle,
  just riskier to build correctly across this file's now-5 `applyMove`/`undoMove` call sites than
  the fresh-computation simplification shipped here.
- `scripts/stress/nogood-cache-ab.mjs` (kept, not scratch-deleted) is the reusable tool for any of
  the above.

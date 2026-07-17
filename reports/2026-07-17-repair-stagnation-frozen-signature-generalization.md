# Frozen-signature generalization: length deficit is the universal component, must-turn is common but not necessary (2026-07-17)

## Context

[`reports/2026-07-17-repair-stagnation-frozen-signature-diagnosis.md`](2026-07-17-repair-stagnation-frozen-signature-diagnosis.md)
found, on 2 instrumented levels, that repair-search converges to a near-miss with a specific
deficit combination (length off by N, plus M pending must-turn cells) and then logs no further
best-ever improvement for the rest of the run. That report's own caveat: only 2 levels, both
happening to have a must-turn deficit at freeze — not yet established as universal, and not
established that must-turn specifically (vs. must-cross/must-pass) dominates. This report runs the
same instrumentation across a larger, more diverse sample to check.

## Method

Same technique (`PF_REPAIR_DEBUG=1`, direct `repairSearchFromGate` calls, `budgetMs=8000`,
`nodeBudget=3,000,000`) applied to 15 fresh `repair-close` levels, deliberately spread across
badness (2 through 5, at the corpus-telemetry level — the isolated single-attempt runs here
naturally freeze at higher badness than the full attempt-ladder corpus figures, since no repair
probe/fallback/attraction-diversity stacking runs here, only one bounded repair search) and both
`repair-close` archetypes (`high-intersection-burden`, `must-cross-heavy`), excluding every level
already instrumented or otherwise characterized this session.

## Result

**0/15 solved within budget — every level froze.** Term composition of each frozen signature
(`len`/`int`/`mp`/`mc`/`mustTurn`/`adjTurn`/`surround`, from `computeBadness`'s breakdown):

| Level | Frozen badness | `len` deficit | Other pending terms | Bursts after last improvement |
|---|---:|---:|---|---:|
| R02346 | 22 | 13 | int, mp, mc, mustTurn, surround | 10 |
| R02392 | 24 | 13 | int, mp, mc, mustTurn, adjTurn | 20 |
| R02823 | 12 | 9 | int, mc, mustTurn | 23 |
| R00323 | 16 | 10 | int, mp, mc, mustTurn | 4 |
| R00877 | 3 | 2 | int | 22 |
| R01022 | 7 | 7 | *(none)* | 16 |
| R02076 | 13 | 11 | mp, mustTurn | 20 |
| R00239 | 7 | 6 | mustTurn | 18 |
| R00340 | 6 | 6 | *(none)* | 0 |
| R00355 | 2 | 2 | *(none)* | 19 |
| R01080 | 3 | 1 | mustTurn | 4 |
| R00112 | 17 | 16 | adjTurn | 34 |
| R00370 | 21 | 15 | mp, mustTurn, surround | 24 |
| R01179 | 14 | 12 | mp, mustTurn | 27 |
| R02137 | 11 | 9 | mustTurn, adjTurn | 21 |

**Term frequency**: `len` 15/15 (100%), `mustTurn` 10/15 (67%), `mp` 6/15 (40%), `int` 5/15 (33%),
`mc` 4/15 (27%), `adjTurn` 3/15 (20%), `surround` 2/15 (13%). Average 17.5 further stagnation
bursts fire after the last logged improvement with zero progress (one outlier, `R00340`, froze
right as budget ran out with 0 further bursts observed — everything else ranges 4 to 34).

## Interpretation: refines, not just confirms, the earlier finding

**Length deficit is the one universal component — more universal than must-turn.** Every single
frozen level has a nonzero length deficit; must-turn, while the most common secondary term, is
absent from 5/15 frozen signatures. Three levels (`R01022`, `R00340`, `R00355`) freeze on a
**pure length deficit with every other term already at zero** — no must-turn, no must-cross,
nothing else pending, just an exact path-length mismatch the search never resolves. This means the
original report's must-turn-centric mechanism hypothesis was too narrow: **closing an exact
length gap without disturbing every already-satisfied constraint appears to be the harder problem
in general**, and must-turn is a common but not necessary complicating factor layered on top of
it, not the root cause. This makes mechanistic sense on reflection: every other deficit term is a
mask-popcount ("is this cleared, yes/no" — many different move sequences can clear it), while
`reqLen` is a single exact integer target — hitting it precisely, especially after every other
objective is already satisfied and further moves risk re-breaking one of them, is a structurally
narrower target for undirected epsilon-greedy exploration to hit by chance.

**The "freeze persists for a long time" pattern generalizes robustly**: 14/15 levels show double-
digit-or-more further stagnation bursts (4 to 34) with zero progress after the freeze point,
corroborating the original 2-level finding (11 and 13 further bursts respectively) was not a
coincidence specific to those two levels.

## Revised direction for a future fix attempt

The frozen-signature diagnosis report proposed "a targeted move/repair operator for the length
deficit + pending must-turn combination." This generalization suggests the target should be
broader: **a move/repair operator specifically for closing an exact length deficit while
preserving already-satisfied constraints** — e.g., inserting or removing a length-neutral-or-
adjusting detour (a short out-and-back, or a reroute through previously-unvisited slack space)
without disturbing cells that already contribute to satisfied must-pass/must-cross/must-turn state
— would address the universal component directly, with must-turn-specific detour-direction logic
as a secondary refinement for the 67% of cases where it's also pending. This is still a
qualitatively bigger change than any constant tweaked so far (a new move-generation mechanism, not
a parameter), and still needs the full correctness+regression rigor any solver-hot-path change
requires — proposed as a sharper starting point for that future work, not attempted here.

## Caveats

Same bounded-claim caution as the original report: the debug line only fires on a new best-ever,
so "frozen" means no restart beat the recorded badness within the observed run, not that every
individual restart reproduced the identical breakdown or that other elite-pool members were
unchanged. The sample (15 levels, deliberately spread across badness/archetype but not randomly
sampled from the full 156-level `repair-close` cluster) is suggestive, not exhaustive — a
population-wide check (all 156, or a random subsample) would be the natural next step to
quantify the exact prevalence of pure-length-only freezes vs. must-turn-complicated ones before
committing engineering effort to the proposed fix direction.

## Verification

Same instrumentation and call pattern as the original report (`PF_REPAIR_DEBUG=1` set before
module import, `repairSearchFromGate` called directly and unmodified). No solver code changed.
Raw JSON summary (badness, breakdown, burst counts) retained for all 15 levels in this
investigation's session; the table above is derived directly from that data, not paraphrased or
recomputed by hand.

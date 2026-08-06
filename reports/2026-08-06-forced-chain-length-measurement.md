# How long are statically forced chains, really? (2026-08-06)

`docs/solver-aware-game-architecture.md`'s "Live opportunity: certified forced-sequence macro
transitions" proposes collapsing runs of cells with no genuine decision into a single macro
transition, to amortize repeated neighbour generation, scoring, and search-loop bookkeeping. Its
own "First experiment" section says to measure this before building anything: *"if difficult
levels contain long deterministic stretches that currently consume meaningful search overhead"* —
begin with statically forced chains certified from the compiled graph, and measure their length and
frequency before investing in the full undo-token/ablation-gated production machinery.

This is that measurement. No solver or production code was touched — this is a pure, read-only
analysis over `prep.staticNeighborKeys` (the exact prep-time adjacency `getNeighbors` reads),
computed via the existing `SOLVER_TESTING_API`.

## Method

A cell is a **corridor candidate** if its static degree (count of non-zero `staticNeighborKeys`
entries) is exactly 2 — i.e., exactly one legal continuation once you've entered from either side —
and it carries no mechanic that changes what's "forced" there: excluded are the goal, every gate,
every must-cross/surround/adjacent-turn/filter/flipping-filter/portal cell. Must-pass cells are
*not* excluded (visiting one doesn't introduce branching or a second required visit, so a degree-2
must-pass cell is exactly as forced as a plain one) — checked as a separate variant to confirm this
relaxation doesn't materially change the result (it doesn't, see below).

A **chain** is a connected component of corridor-candidate cells under the static-adjacency graph —
this is deliberately the simplest of the doc's own "Possible initial cases" list (a plain static
corridor), and the only one of those cases that can be arbitrarily long by construction (a forced
portal-jump-plus-exit or a fixed-axis filter passage is inherently short), so it's a reasonable
upper-bound test of the whole concept's ceiling, not just its narrowest sub-case.

## Results (must-pass-relaxed variant; the strict variant is materially identical, see below)

| corpus | levels | live cells | corridor cells | chains | mean length | median | p90 | max | levels w/ chain ≥3 | ≥5 | ≥10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| published | 160 | 14,677 | 1,415 (9.6%) | 1,145 | 1.24 | 1 | 2 | 20 | 31.9% | 5.0% | 0.6% |
| stress-corpus-1 | 102 | 12,974 | 1,761 (13.6%) | 1,403 | 1.26 | 1 | 2 | 8 | 44.1% | 7.8% | 0.0% |
| stress-corpus-2 | 1,700 | 232,602 | 36,941 (15.9%) | 29,461 | 1.25 | 1 | 2 | 9 | 56.5% | 10.2% | 0.0% |
| in-envelope | 200 | 27,881 | 4,039 (14.5%) | 3,314 | 1.22 | 1 | 2 | 8 | 46.5% | 6.5% | 0.0% |

The strict variant (must-pass cells excluded, matching CLAUDE.md's win-condition treatment most
conservatively) gives materially the same shape: e.g. corpus-2's 35,201 corridor cells / 28,383
chains / mean 1.24 / max 9 — the must-pass relaxation moves corridor-cell counts by 1-5% and chain
counts correspondingly, not the underlying distribution.

## Interpretation

Corridor *cells* are a real fraction of the grid (9.6-15.9% across corpora) — but they are almost
never strung together into long hallways. The median chain length is **1** everywhere, the 90th
percentile is **2**, and the longest chain found in over 280,000 live cells across four corpora is
**20** (one outlier in the published corpus; every stress corpus tops out at 8-9). Only 31-57% of
levels have even a single chain of length ≥3, and essentially none (0.0-0.6%) have anything near a
"long deterministic stretch" (≥10).

**The premise this experiment set out to check — "difficult levels contain long deterministic
stretches that currently consume meaningful search overhead" — is not supported by this
measurement.** Grids in this game are small (11×15) and dense with objects/blocks by design; there
simply isn't much room for long empty corridors to form. The total "excess" cells beyond one-per-
chain (corridor cells minus chain count) — the actual quantity a macro transition would collapse —
is small in absolute terms too: e.g. corpus-2's 36,941 − 29,461 = 7,480 cells saved across the
*entire* 1,700-level corpus, roughly 4-5 cells per level on average. Against levels that routinely
expand millions of nodes when they don't solve quickly, amortizing away a handful of one-choice
steps per level is very unlikely to move solve counts or wall time meaningfully.

## Recommendation

**Deprioritize static forced-sequence macro transitions.** This was flagged in both source
documents as "the most clearly novel implementation idea" and the natural next experiment after the
game-rules alignment work — but the data says the premise is weak for *this* game's level
population, not merely untested. This is a genuine, if modest, negative result in the same spirit
as this project's other settled-negative findings (general fully-sound transposition caching for
both DFS and beam) — worth recording so it isn't re-proposed without materially new evidence, not
worth the much larger engineering investment (undo-token composite moves, ablation-gated production
hookup, full corpus re-benchmarking) the full feature would require.

This does not rule out the mechanic-aware cases the original proposal also listed (forced portal
jump + exit, fixed-axis filter passage, forced landmark approach under a stated precondition) —
those were not separately measured here, since they are inherently short by construction and were
never expected to be the source of a "long stretch" — but nothing in this measurement suggests they
would behave differently in aggregate.

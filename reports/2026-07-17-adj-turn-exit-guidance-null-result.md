# A real scoring asymmetry found and fixed, but it doesn't unlock the archetype gap — reverted (2026-07-17)

## Context

Following the roadmap's revised recommendation ("a genuinely new scoring/ordering strategy" as
the lower-risk of two remaining levers for the `default`-archetype, turn-landmark-dense `dfs-plain`
subgroup — `reports/2026-07-17-r02657-second-negative-reference.md`), read `scoring.ts` directly
looking for a concrete, well-motivated gap rather than inventing something speculative.

## The asymmetry found

`mustTurn` landmarks have **two** scoring terms: `SCORE_MUST_TURN_URGENCY` (distance-to-cell
reward) and `SCORE_MUST_TURN_EXIT_GUIDANCE` (rewards choosing the *specific exit direction* that
satisfies the pending turn requirement, independent of distance — added specifically because
"without this term scoreMove had no guidance at all toward must-turn landmarks... leaving a
directional turn requirement to pure incidental momentum," per that term's own comment).

`adjacentTurn` landmarks — structurally identical in their direction requirement
(`TurnDir`: `cw`/`ccw`/`either`, confirmed by reading `search-state.ts`'s actual
`adjTurnMask`-clearing logic, which runs the same entry-axis/move-axis/`turnDirection` check as
`mustTurn`'s) — only have `SCORE_ADJ_TURN_URGENCY`, a **distance-only** term toward the landmark.
There is no `adjacentTurn` equivalent of `SCORE_MUST_TURN_EXIT_GUIDANCE`. Once the path is near one
of a landmark's 8 adjacent cells, nothing in the scoring nudges it toward the specific exit that
actually satisfies the required direction — left to incidental momentum, the exact gap
`SCORE_MUST_TURN_EXIT_GUIDANCE` already closed for the sibling mechanic.

## Implementation

Added `SCORE_ADJ_TURN_EXIT_GUIDANCE` in `modules/solver/scoring.ts`, mirroring
`SCORE_MUST_TURN_EXIT_GUIDANCE`'s proven pattern closely, including its two documented
before/after-apply calling-convention fixes (DFS scores pre-apply, beam/repair score post-apply —
`prevKey` resolution and mask-bit-staleness both need to account for this, per that term's own
extensive comment). Adapted for `adjacentTurn`'s "landmark cell is impassable, multiple 8-adjacent
cells can satisfy it" shape (`prep.adjTurnCellIndex.get(pos)` returns an array of `{i, dir}`
entries, one per landmark the current cell is adjacent to — naturally per-object, so no separate
"already satisfied" guard was needed the way `mustTurn`'s single-index version required). Registered
as a new ablation flag in `scripts/ablation-config.mjs`, default-enabled per the existing pattern.
`tsc --noEmit` clean.

## Verification: a clean null result

**With the new term active (default), tested on R02657-reduced** (the clean, non-repair-gated
minimal case from the prior report): still all 16 attempt configs time out, even with a full
dedicated 8-second budget each (bypassing the shared ladder split, same methodology as the earlier
per-config test) — node counts ~10–25% lower than the pre-change baseline in the same window
(likely just the extra per-node scoring computation cost, not real search convergence; no config
gets meaningfully closer).

**Extended to all 5 other `default`-archetype turn-dense sample members** (R00285, R01129, R02221,
R02356, R02541 — the population that corroborated the missing-archetype hypothesis in the prior
report): **none solve either**, all `timeout` at 25–49 million real nodes explored.

## Conclusion: real gap, correctly fixed, insufficient — reverted

The scoring asymmetry was genuine and the implementation mirrors a proven, working pattern
correctly. But filling it does not unlock any of the 6 levels it was specifically targeted at. Per
this session's consistent evidence-based-change standard (established across Task 3's
fraction/flag-widening evaluation and every negative result since — a plausible-looking change
needs measured benefit before it ships, not just a good argument), **the code change was reverted**
(`git checkout -- modules/solver/scoring.ts scripts/ablation-config.mjs`), confirmed clean via
`git diff` (empty) and a direct grep for the new flag name (zero matches remaining).

This narrows, rather than closes, the search for what actually blocks this archetype: the
turn-*direction*-choice mechanism specifically is now ruled out (on top of the turn-*urgency*/
distance mechanism and the unrelated fragile-scoring family, both ruled out in the prior report).
Combined with the earlier finding that all 16 existing search techniques fail even with complete
independent attention, the remaining candidate lever is a genuinely new **admissible lower bound**
that accounts for outstanding turn-constraint landmarks directly in the pruning logic, not just the
scoring/ordering layer — a materially different, correctness-sensitive class of change (see
CLAUDE.md's memoized-lower-bound gotcha) that needs the oracle-fuzzing/differential-testing rigor
that class of change requires, not attempted here.

## Verification of this report itself

Read-only/revert-only work — no code shipped. `git diff` and `git status --short` both clean with
respect to `modules/solver/scoring.ts` and `scripts/ablation-config.mjs` at the time of writing.

# A sound, low-risk adjTurn deadlock check — implemented, tested, found practically dead, reverted (2026-07-17)

## Context

Continuing the `dfs-plain` turn-landmark archetype gap (R02657 and 5 corroborating siblings —
see `reports/2026-07-17-r02657-second-negative-reference.md` and the MST-bound offline analysis)
after the roadmap named "a genuinely different bound/pruning technique" as the remaining lever,
distinct from everything already ruled out (scoring flags, attempt-config reordering, the
naive MST-style lower bound).

## The gap identified

`mustTurn` landmarks have a **boolean feasibility check**, `mustTurnDeadlocked`
(`lower-bounds.ts`): a still-pending must-turn cell whose `edgeUsage` already has both axis
bits set (`AXIS_H | AXIS_V`) can never be entered again (`isMoveDynamicallyValid`'s
edge-axis-reuse rule blocks re-entry via either axis), so the constraint is provably
unsatisfiable from that point on — a cheap, sound, immediate prune distinct from the additive
lower bound.

`adjacentTurn` landmarks — identical `TurnDir` semantics, confirmed via `search-state.ts`'s
actual mask-clearing logic — had **no equivalent**. Only the additive `adjTurnLowerBound`
existed, already shown to add little value on this population (the MST-bound report). This
looked like a real, structurally-motivated gap: a boolean feasibility check is also a much
lower correctness-risk category than a numeric bound (no arithmetic tightness to get subtly
wrong, per CLAUDE.md's MST-scratch-buffer precedent) — a true/false claim about a game-rule
consequence, not an estimate.

## Implementation

Added `adjTurnDeadlocked(state, level, prep)`, generalizing `mustTurnDeadlocked` correctly for
the one real structural difference: an `adjacentTurn` object's requirement can be satisfied by
turning at **any** of its several valid adjacent cells (not one fixed cell), so the check only
fires once **every** adjacent cell is provably exhausted (`edgeUsage[cell] === AXIS_H|AXIS_V`
for all of them). New `prep.adjTurnAdjKeys[i]` field (the per-object valid-adjacent-cell list,
already computed locally in `prep.ts`'s existing loop, just not previously persisted). Wired
into both call sites `mustTurnDeadlocked` uses (`prune-gauntlet.ts`'s shared
`evaluatePrunedMove` — covering DFS and repair-search, which shares the gauntlet — and beam
search's separate check in `search.ts`). New ablation flag `PRUNE_ADJ_TURN_DEADLOCK`, default
enabled. Conservative by construction and confirmed sound: a portal-jump arrival never sets
`edgeUsage` (`applyMove` skips it for `isPortalJump`), so a cell reachable only via a portal
jump can never read as "exhausted" — this can only under-prune, never falsely claim deadlock.

4 new unit tests mirror `mustTurnDeadlocked`'s exact shape (fresh / partial-one-axis /
wrong-turn-deadlocked / correct-turn-satisfied-so-guarded), using a corner-placed landmark
isolated to a single valid adjacent cell via two blocks. The turn-direction outcome for the
test's move sequence was verified empirically with a standalone script before writing
assertions, not guessed — this project's `turnDirection` chirality convention isn't something
to eyeball.

**Verified before shipping**: `tsc --noEmit` clean, `npx vitest run modules/solver` (200/200),
`npm run solver:bench -- --check` (160/160, zero regressions).

## Effectiveness measurement — zero fires, not just zero solves

Rather than stop at "doesn't newly solve the target levels" (which alone wouldn't distinguish
"correct but doesn't help" from "the check never even engages"), instrumented
`adjTurnDeadlocked` with temporary call/fire counters and ran it against:

- The 3 turn-landmark archetype levels already characterized (R02657, R00285, R01129) — the
  exact population this was aimed at.
- 3 levels picked specifically to be **more favorable** to triggering it: high `reqInt` (13-16,
  vs. the target archetype's 1-3) and heavy `adjacentTurn` density (5-8 objects), on the theory
  that more self-intersection budget means more revisiting, which is exactly the precondition
  for a cell's `edgeUsage` to reach both axis bits.

| Level | Calls (mask≠0) | Fires | Total nodes explored |
|---|---:|---:|---:|
| R02657 | 35,041,381 | **0** | 78,147,384 |
| R00285 | 21,351,032 | **0** | 53,562,924 |
| R01129 | 18,509,806 | **0** | 49,493,377 |
| R02472 (reqInt 16) | 4,216,040 | **0** | 4,805,867 |
| R02808 (reqInt 15) | 5,894,951 | **0** | 6,869,656 |
| R00943 (reqInt 14) | 3,729,413 | **0** | 3,547,336 |

**Zero fires across ~88.7 million evaluations spanning 6 structurally diverse levels, including
levels specifically chosen to be favorable to triggering it.** This is a materially stronger
negative result than "didn't help the target levels" — it means the deadlock condition this
check is designed to catch essentially never actually arises during real search, at least
across everything tested.

### Why — a real, useful structural explanation, not just an empirical shrug

For a still-pending `adjacentTurn` object to reach the deadlock state, **every** turn made at
its valid adjacent cells while it was still pending must have been the *wrong* direction (a
*correct*-direction turn clears the object's mask bit the instant it happens, per the same
mechanism `mustTurnDeadlocked`'s own comment documents for `mustTurn`). So the check depends on
the search repeatedly turning at a landmark's adjacent cells in the wrong direction, across
*all* of them, without either satisfying the object via a correct turn or being cut off first
by an unrelated prune. In practice, `PRUNE_INTERSECTION_DEFICIT` (remaining steps <
intersections still needed) and the general revisit-aversion in scoring already discourage this
kind of unproductive multi-cell wrong-direction wandering well before it would exhaust every
adjacent cell of any one object — the state this check targets is real in principle (the unit
tests construct it directly) but apparently gets pruned away by *other*, already-existing
mechanisms first in observed practice, even on levels deliberately chosen to make it more
likely.

## Cost measurement

15-level mixed sample (the target archetype + the high-`reqInt` favorable set + several
unrelated `dfs-plain` members), `nodeBudget=4,000,000`, `budgetMs=3000` per level:

| | Total nodes | Total ms |
|---|---:|---:|
| WITH deadlock check (production default) | 24,777,620 | 45,588 |
| WITHOUT deadlock check | 24,402,773 | 45,404 |

+1.5% nodes / +0.4% time — within normal run-to-run noise, not a real regression, but also not
free: the check still costs something (iterating each pending object's adjacent-cell list) on
every node where `adjTurnMask !== 0`, for zero observed pruning benefit anywhere tested.

## Conclusion: reverted

Correctly implemented, soundly conservative, cheaply testable — and, per direct measurement,
**practically dead code**: it never fires on any of the 6 levels tested (~88.7M evaluations,
including levels chosen to favor it), provides no solvability benefit, and adds small but
nonzero overhead. Per this session's consistent evidence-based-change standard (the same
standard that reverted `SCORE_ADJ_TURN_EXIT_GUIDANCE` after its own clean null result) and
CLAUDE.md's "don't design for hypothetical future requirements" principle, **the change was
reverted** (`git revert`, clean — `git diff` against the pre-change commit is empty, full test
suite back to 196/196).

This narrows the search further: the deadlock-style boolean-feasibility-check *family* that
works well for `mustTurn` does not transfer to `adjacentTurn` in practice, not because the
construction is wrong, but because `adjacentTurn`'s multi-cell "any of several adjacent cells
can satisfy it" shape makes the corresponding deadlock state far harder to actually reach than
`mustTurn`'s single-cell version — combined with existing pruning already cutting off the
precondition first. Combined with the earlier MST-bound negative result, **both natural
generalizations of `mustPass`/`mustCross`'s existing bound/pruning machinery to
`adjacentTurn`'s multi-cell shape have now been tried and found ineffective** for this
archetype. The remaining candidate levers are unchanged from the prior report: a genuinely
different bound technique (Held–Karp/1-tree style, or folding `goal` into the graph as a
must-reach node) or research beyond scoring/pruning entirely.

## Verification of this report itself

`git diff` and `git status --short` clean with respect to all touched solver files at the time
of writing (full revert applied and pushed before this report was written). Debug
instrumentation (temporary call/fire counters) was itself reverted before the cost-sweep
measurement, so the numbers above reflect the shipped-then-reverted code path, not an
instrumented variant.

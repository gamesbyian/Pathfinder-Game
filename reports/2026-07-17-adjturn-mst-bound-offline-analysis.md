# Offline analysis: would an MST-style adjTurn lower bound actually be tighter? (2026-07-17)

## Context

Following the roadmap's remaining lever for the turn-landmark `default`-archetype gap ("a
genuinely new admissible lower bound accounting for outstanding turn-constraint landmarks") — per
explicit user direction to do **offline analysis only**, given the real correctness risk this class
of change carries (CLAUDE.md's MST-bound-scratch-buffer precedent) and the substantial new
infrastructure (multi-source pairwise distances that don't currently exist) a full implementation
would need. This report is read-only measurement against the shipped solver — no production code
changed.

## The gap identified

`modules/solver/lower-bounds.ts`'s `adjTurnLowerBound` takes the **max** over pending
`adjacentTurn` objects of `(distance to nearest adjacent cell) + (best-case adjacent-cell-to-goal
distance)` — it does not account for needing to visit *multiple* pending objects, unlike
`mustPass`/`mustCross`, which already have MST-based combined bounds (`mpMSTLowerBound`,
`mcMSTLowerBound`) precisely for this reason. R02657 and its sibling `default`-archetype sample
members (R00285, R01129, R02356, R02541) each have 6–8 pending `adjacentTurn` objects
simultaneously — exactly the population where ignoring "must visit several of these" could matter.

## Method

A standalone script (not touching solver code) computed, at each level's **initial gate state**
(all `adjacentTurn` objects pending):
1. The existing bound, calling `adjTurnLowerBound` directly (unmodified, imported from the real
   module).
2. A hypothetical MST bound: build a graph with nodes = `{pos}` ∪ `{pending objects}`, edge weight
   `pos↔i` = distance to object *i*'s nearest adjacent cell (reusing the existing
   `adjTurnDistMaps[i]` multi-source distance array — no new precomputation needed for this edge),
   edge weight `i↔j` = **single-linkage distance** between the two objects' adjacent-cell sets (the
   minimum distance between any adjacent cell of *i* and any adjacent cell of *j*, computed by
   querying `adjTurnDistMaps[i]` at each of *j*'s adjacent cells and taking the min — a standard,
   provably-sound construction: any tour visiting one point per cluster induces a spanning tree over
   clusters whose edges cost at least the single-linkage distance, so the cluster-graph MST is a
   valid lower bound on the true multi-object visiting cost). Kruskal's MST over this graph, plus
   the **global minimum** `adjTurnGoalDist` across all pending objects for the final leg to goal.

## Result: the naive MST construction is looser, not tighter, at the gate

| Level | Pending objects | Existing bound | Naive MST bound |
|---|---:|---:|---:|
| R02657-reduced | 6 | 22 | 8 |
| R00285 | 8 | 32 | 12 |
| R01129 | 7 | 27 | 18 |
| R02356 | 7 | 27 | 10 |
| R02541 | 6 | 14 | 9 |

**The naive MST bound is smaller (looser) than the existing bound on all 5 levels tested, by
30–64%.** This is the opposite of the naive expectation.

## Why — a real, useful finding, not a dead end

The existing bound is anchored to a **single** object: whichever one has the worst *combined*
(distance-to-object + that-same-object's-own-goal-distance) sum, using that specific object's own
goal-distance for the final leg. The naive MST bound correctly prices in visiting *all* pending
objects (a real, larger connecting cost) — but then uses the **global minimum** goal-distance across
*every* object for the final leg, not the goal-distance of whichever object the MST tour would
actually end at. That's a much more optimistic (weaker) assumption, and on these levels it
outweighs the tighter connecting cost. Neither construction dominates the other in general — each
can be tighter depending on the specific geometry (a classic property of independently-derived
admissible heuristics, not a bug in either one).

## What a genuinely dominant bound would require

The mathematically correct way to combine two independently-valid lower bounds without ever making
either worse is `max(existing, MST)` — provably sound (the max of two admissible heuristics is
itself admissible) and trivially safe to reason about, unlike trying to merge the two constructions
into one formula. **Whether that combination would ever actually help is still open**: this
analysis only checked the initial gate state, where the MST term never wins. The real question is
whether the MST term ever exceeds the existing bound at *mid-search* states — e.g., after several
objects are already satisfied and `pos` has moved away from the gate, the remaining-object MST
structure and the existing per-object max could diverge differently than they do at the start. This
analysis does not answer that; it would need either sampling real search states from an actual
solve attempt, or a more elaborate synthetic-state generator — genuinely more work than tonight's
scope.

## Recommendation

**Do not implement this as currently conceived.** The straightforward "replace or extend the bound
with a naive MST" idea, measured directly, does not show the expected tightening at the one state
class checked so far. A future session picking this back up should:
1. First check whether `max(existing, MST)` ever actually differs from `existing` alone across a
   sample of *real* mid-search states (harvested from an actual solve attempt's search trace, not
   just the gate) — cheap, still zero production risk, before investing in the goal-distance
   refinement below.
2. If real divergence is found, the goal-distance term likely needs to be tour-aware (which object
   the MST would visit last) rather than a global minimum, to get real tightening — a more involved
   construction than either version tested here, and the harder engineering piece.
3. Only after both are validated offline does this become worth the full implementation +
   oracle-fuzzing + differential-testing + corpus-wide verification effort the roadmap already
   flags as required for any new admissible bound.

## Verification

Pure offline analysis — a standalone script importing the real, unmodified `adjTurnLowerBound` and
`getDistanceFromArray` from the shipped solver, computing a separate hypothetical bound in the
script itself. No solver files were changed; `git status` confirmed clean before and after.

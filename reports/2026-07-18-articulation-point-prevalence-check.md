# Articulation-point / biconnected-region prevalence check (2026-07-18)

## Motivation

Following up on an externally-sourced research-survey suggestion (see the conversation this
report originates from): detect cut vertices (articulation points) in a level's free-cell graph
and check whether any pending objective (must-pass, must-cross, or an `adjacentTurn` object's
satisfying neighbor cells) sits in a "dead-end pocket" reachable only through a single cell. If
so, any solving walk must enter *and exit* through that exact cell — a structural cost that a
per-object distance bound might not price in, most plausibly for `adjacentTurn`, whose existing
bound (`adjTurnLowerBound`, per CLAUDE.md) is a simple max over pending objects, not an
MST-jointed one like must-pass/must-cross already have.

This is a **prevalence check**, matching the standard this codebase already applies to similar
ideas (the adjTurn MST-bound offline analysis, the adjTurn deadlock-check instrumentation): does
the phenomenon even occur often enough in real levels to be worth building? No solver code was
touched — a standalone offline script only.

## Method

Free-cell graph: 4-neighbor adjacency over every non-`blockSet` cell (geese/false-goals
correctly treated as passable, matching `MoveContext.SOLVER`; portals approximated as a direct
edge cell↔dest; filters/flipping-filters treated as ordinary passable cells — both
simplifications, documented, acceptable for a prevalence check, not a soundness claim).
Articulation points found via standard iterative Tarjan. For each articulation point, computed
the connected components of the graph with that point removed; any non-goal-containing component
holding a pending must-pass/must-cross cell, or *all* of an `adjacentTurn` object's viable
neighbor cells, counts as a "gated pocket."

Two samples: an initial 21-level spot check (turn-landmark-heavy `default`-archetype levels +
`repair-close` + the two known negative references R00440/R02657), then a broader stratified
40-level sample (20 `default`-archetype, 10 `repair-close`, 10 `repair-far`, seeded random draw).

## Result: real, but too rare and too coarse to be useful as measured

**8/40 levels (20%) have at least one gated pocket.** But the pockets found are almost always one
of two uninteresting shapes:

- **Tiny (1–2 cell) dead ends with no objectives** — 36/40 levels have *some* small non-goal
  component, but these are landmark/block clutter artifacts (a single free cell next to a
  decorative block), never holding a pending objective. Irrelevant noise, not signal.
- **One giant "everything else" catchment** — where a gated pocket *does* hold objectives, its
  size is typically 88–177 cells out of a ~200–225-cell grid (e.g. R03171: 4 pockets of size
  88–92, each holding 6–7 must-pass + 4 `adjacentTurn`; R02252: 7 pockets of size 115–122, each
  holding 10–11 must-pass + 5 must-cross). This is "you start in a small foyer, one doorway leads
  to almost the whole level" — already fully captured by ordinary BFS distance-to-objective
  bounds, since the doorway cell is simply on the shortest path to everything beyond it. There is
  no multiplicity of *disjoint* detours here for a joint bound to exploit.

**One partial exception**: R02330 (13×13, 8 must-pass, 6 `mustTurn`, 6 `adjacentTurn`, 8
decorative landmarks) shows 4 meaningfully smaller pockets (29–32 cells each), each gated by its
own degree-2/3 articulation point and each holding exactly 1 must-pass + 1 `adjacentTurn` object —
a genuine "several separate arms off a hub" shape, the one case where a joint bound accounting for
multiple forced detours could plausibly beat the current per-object max. But this is 1/40 levels,
and even here it's more likely an artifact of scattering 8 decorative landmarks around a dense
level than a deliberately hub-and-spoke puzzle design.

## Verdict

Same shape as this week's other two attempts to generalize must-pass/must-cross's MST/deadlock
machinery to `adjacentTurn`'s multi-object case (the naive MST bound: helped 5/183 sampled real
states, by ≤2 steps; the deadlock-feasibility check: zero fires across 88.7M evaluations). The
articulation-point idea is real — cut vertices and dead-end pockets genuinely exist in this
corpus — but the specific failure mode it targets (multiple small, disjoint, objective-bearing
pockets whose combined out-and-back cost a per-object bound underestimates) is rare enough
(~2.5%, one level in this sample) that building it into a production bound isn't justified by
this measurement. **Not implemented, per the same evidence-based-change standard as the other two
negative results this week.**

If this is ever revisited, R02330 is the one concrete lead — check whether a joint bound tuned
specifically for "several small `adjacentTurn`-holding pockets off a shared hub" would rescue it,
before generalizing further. The prototype script (offline, not committed) is available in this
session's scratchpad if useful as a starting point.

## What this adds to the standing picture

Three independent generalizations of `mustPass`/`mustCross`'s single-object machinery to
`adjacentTurn`'s multi-object shape have now been tried and found ineffective at real-corpus
scale: MST-style joint lower bound, deadlock-feasibility pruning, and (this report)
articulation-point/topology-based pocket detection. This strengthens Campaign 2's existing
conclusion (`docs/solver-development-roadmap.md`) that `adjacentTurn`'s resistance isn't a gap in
any one specific technique borrowed from `mustPass`/`mustCross` — it's resistant to the whole
*class* of "extend the existing single-object bound/pruning machinery" approaches tried so far.

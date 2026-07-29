# Why turn-load makes corpus-2 levels robust: a missing MST bound, not a scoring gap (2026-07-29)

## What this is

Mechanism investigation following the two family-variant reports
(`reports/families/2026-07-29-turn-load-fragile-robust-split.md`,
`reports/families/2026-07-29-turn-load-vs-archetype-disambiguation.md`), which established that
turn-constraint load (`mustTurn + adjacentTurn + surround`) — not archetype — drives the
robust-hard-core population in corpus-2 (0/176 family variants solved across 8 turn-load-heavy levels
spanning 4 archetypes), and that this needs "new bounds/pruning/technique work," per the roadmap's own
framing for a robust cluster. This report identifies a specific, concrete candidate for that work.

**Finding: `surroundLowerBound` and `adjTurnLowerBound` never received the MST-joint tightening that
`mustPassLowerBound` and `mustCrossLowerBound` already have — and the data needed to add it already
exists in `prep`, mostly unused for this purpose.**

## Two pieces of evidence, combined

**1. It's not just "many distinct constraint types" — it's the turn-categories' own magnitude.**
Corpus-wide (1700 levels), a feature testing how many *distinct* constraint categories a level has
at all (mustPass/mustCross/portals/flippers/surround/mustTurn/adjTurn nonzero) shows a moderate effect
(Cohen's d = 0.861 for the 7-category version, but only **d = 0.504** when restricted to just the 4
categories that actually have a lower-bound function in `lower-bounds.ts` — mustPass/mustCross/
surround/adjTurn). Both are weaker than turn-load's own raw magnitude (**d = 0.749**). If the problem
were purely "the prune gauntlet checks constraint categories independently rather than jointly" (a
cross-category summing gap), category *diversity* should dominate over any single category's
*magnitude*. It doesn't — magnitude wins. That points at a per-category tightness problem specifically
in the categories turn-load comprises, not a missing cross-category combination.

**2. The per-step scoring/ordering signal is clean.** Both the published-corpus hint-shape-divergence
diagnosis and today's corpus-2 witness-divergence data show turn-load-heavy levels have entirely
ordinary greedy-scoring rank discrepancy (meanStepRank 0.49–0.70, maxStepRank 2–3 across all 8 sampled
robust levels — see the disambiguation report's table) — no worse than typical solved levels. Combined
with #1, this rules out both "scoring is blind to turn obligations" (already effectively ruled out by
the earlier hint-divergence work) and "the gauntlet's cross-category combination is too loose" as the
dominant mechanism, leaving **the individual surround/adj-turn bounds themselves being too loose** as
the remaining, best-supported explanation.

## The code-level gap

`modules/solver/lower-bounds.ts`:
- `mustPassLowerBound` (L297) and `mustCrossLowerBound` (L363) each start from a per-cell
  max-of-individual bound, then **tighten it via an MST over `{pos} ∪ remaining objectives`**
  (`mpMSTLowerBound`/`mcMSTLowerBound`, L138–274) whenever ≥2 objectives remain — documented as
  "tighter than max-of-individual" and load-bearing enough to have been profiled and cache-optimized.
- `surroundLowerBound` (L32) and `adjTurnLowerBound` (L59) **only ever compute the per-cell
  max-of-individual bound** — no MST call, no joint tightening across multiple pending surround/
  adj-turn objects, ever. Confirmed by direct read; not a documented deliberate choice — no comment in
  `lower-bounds.ts`, `prune-gauntlet.ts`, or `docs/solver-architecture.md` explains or defends the
  asymmetry.

This matters most exactly on the levels this investigation is about: the 8 confirmed-robust levels
have adjTurn counts of 6–8 and surround counts of 0–5 — multiple simultaneous objects of the same
type, which is precisely the regime where max-of-individual is loosest relative to the true joint
requirement (the same reason MST tightening was worth adding for mustPass/mustCross in the first
place).

## The implementation path — and why it's cheaper than it looks

The naive assumption is that joint tightening needs new, expensive pairwise-distance precomputation.
**It mostly doesn't** — `prep.ts` already computes reusable ingredients for both categories:

- **Surround** (`prep.surroundNeighborDistMaps[i][j]`, `prep.ts` L210): already a **per-neighbor
  single-source** BFS distance array (one per valid neighbor cell of each surround object), not just
  a pooled multi-source one. Since surround requires visiting *every* remaining neighbor (the same
  "all points required" semantics as must-pass, not adj-turn's "any one"), each unvisited neighbor
  cell across *all* surround objects can be treated as its own must-visit point — pairwise distances
  between any two such points are a single O(1) lookup into the other point's own existing distance
  array. This is the structurally easiest of the two to extend, being semantically identical to
  must-pass's already-proven MST pattern.
- **Adjacent-turn** (`prep.adjTurnDistMaps[i]`, `prep.ts` L248): a **multi-source** BFS array (distance
  from any cell to the *nearest* valid neighbor of object i) — already sufficient to compute an
  object-i↔object-j MST edge weight as `min` over object j's neighbor cells of `adjTurnDistMaps[i][nbrKey]`,
  again with zero new BFS runs. The one missing piece is bookkeeping: each object's neighbor-cell list
  (`adjSources` in `prep.ts` L255) is currently a throwaway local used only to build the pooled array,
  never stored — it would need to be kept (a cheap `number[][]`, not new search cost) so other
  objects' distance arrays can be evaluated at those points.

So the concrete next engineering step is **not** "invent a new bound from scratch" — it's "assemble an
MST over already-computed distance data, following the exact pattern `mpMSTLowerBound`/
`mcMSTLowerBound` already establish," starting with surround (simpler semantics) and extending to
adjacent-turn (needs the one bookkeeping addition above).

## What this is not — and what it still needs before it ships

This is a diagnosis and a scoped recommendation, **not a patch**. Per CLAUDE.md's own gotcha on this
exact class of change ("any new memoization on solver state must ship with the same differential-
testing rigor" as the MST-scratch-buffer bug fix) and the roadmap's requirement ("every new bound
needs a written admissibility argument and an `oracle:fuzz` pass"), actually implementing this needs,
at minimum:
1. A written admissibility argument — surround's "all neighbors required" MST extension is a direct
   analogue of must-pass's already-proven argument; adjacent-turn's "any one neighbor suffices" is a
   materially different covering structure (closer to a group-Steiner-tree relaxation) and needs its
   own argument, not an assumed one.
2. Unit tests mirroring `lower-bounds.test.ts`'s existing surround/adj-turn coverage, extended for the
   ≥2-object joint case.
3. An `oracle:fuzz` pass — the precedent this codebase already has for exactly this failure mode (an
   unsound bound silently pruning a reachable solution) is the MST-scratch-buffer bug.
4. A full-corpus `solver:bench --check` (no solved/unsolved regressions) **and** a before/after
   nodesExpanded/wall-time comparison per the "cost, separately from solvability" gotcha — the goal
   here is specifically to *change* the solved set on the turn-load-heavy population, so `--check`
   alone is the wrong tool; success looks like previously-unsolved turn-load-heavy levels newly
   solving, verified against this session's own 8-level robust set and the wider corpus-2 population.

This report stops at "here is the specific, evidenced, implementable gap" — implementing and verifying
it to this codebase's standard is a follow-on task, not a one-sitting change.

## Verification

Read-only analysis; no solver code changed. The category-diversity/turnLoad comparison is reproducible
from `reports/stress/corpus2-feature-solvability-2026-07-29.json`'s own `levels` array (script inline
above, not checked in — trivial to reconstruct). The code-level claims (no MST call in
`surroundLowerBound`/`adjTurnLowerBound`; the existing per-object distance-map shapes in `prep.ts`) are
direct reads of `modules/solver/lower-bounds.ts` and `modules/solver/prep.ts` at the commit this report
was written against.

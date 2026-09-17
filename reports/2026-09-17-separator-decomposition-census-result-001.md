# Separator/decomposition census result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — full census of the current Class-5 residual (390 levels, production run `35066677597`), current HEAD. Zero new solver compute; zero CP-SAT/exact queries; purely generic current-input static/graph analysis.
> **Decision:** the census clears the preflight's "coverage-null" and "contract-explosive-only" negatives. A real, bounded interface subpopulation exists: **121/390 (31.0%)** Class-5 residual levels have at least one non-trivial (both sides >=10% of board free-space), narrow (width 1-4) static or mechanic-relevant separator interface. Portal-mediation (family 4) is a clean negative despite 269/390 levels being portal-bearing. Path-history-conditioned separators (family 3) are **not computed here** — they require a frozen legal prefix population, which is exactly what the next queue item (fresh exact LIVE/DEAD sibling harvest) produces.
> **Remaining gate:** the interface-state contract-size question ("can mechanic/length/intersection state crossing the interface be summarized without recreating the full path history?") is untested. Per the preflight's own candidate order, the earned next descendant is a **local exact residual query** on one side of a compact interface — deferred to run against the fresh sibling harvest's exact-labelled population (real LIVE/DEAD ground truth) rather than as a separate offline-only CP-SAT pass, so the two gates share one exact-labelling investment instead of duplicating it.
> **Evidence role:** census / premise falsifier, per `docs/solver-separator-decomposition-census-preflight.md`. No solver treatment is authorized by this result.
> **Population identity:** the full current Class-5 residual, 390 levels, frozen before computing any decomposition feature — `reports/stress/class5-separator-census-population-2026-09-17.json` (exact id list, source atlas, production run).

## Why this ran

Per `docs/solver-optimization-workstreams.md`'s current premise-acquisition execution order, the separator/decomposition census is "ACTIVE NEXT" after the closed topology/H1/DEAD-core/H3/H2/behavioral-quotient ladder. The preflight (`docs/solver-separator-decomposition-census-preflight.md`) asks whether the current Class-5 residual contains enough low-width structural separation — static, mechanic-aware, path-history-conditioned, or portal-mediated — to justify a decomposition/interface-contract descendant, and requires measuring the four families separately before any architecture is built.

## What was implemented

Existing tooling (`scripts/stress/residual-separator-census.mjs`, `scripts/stress/lib/residual-decomposition.mjs`) measures small pendant chambers along a level's own *known solution* walk — unusable here because Class-5 residual levels are, by definition, unsolved (no stored hint to walk). Two small, reusable, generic-current-input primitives were added instead:

- **`scripts/stress/lib/articulation-census.mjs`** (`computeArticulationCuts`): exhaustive width-1 static-separator census via a standard Tarjan low-link walk, generalized to report every articulation vertex in a (possibly disconnected) graph and the sizes of every component it separates (not just small pendant chambers). Validated against hand-built graphs (path, triangle, two-triangles-joined-at-a-vertex, star) in `articulation-census-node-test.mjs`.
- **`scripts/stress/lib/vertex-mincut.mjs`** (`minVertexCut`): generic minimum vertex cut between a source set and one target cell via node-split Edmonds-Karp max-flow (Menger's theorem). Boards here are small (~100-250 free cells), so a plain BFS-augmenting-path search is simple and fast; no need for Dinic. Handles the "source directly adjacent to target" case explicitly (no finite vertex set can disconnect an edge — reported as `width: Infinity`, distinct from `width: 0` for "genuinely no route"). Validated against hand-built graphs (parallel paths, single path, disconnected, direct-adjacency) in `vertex-mincut-node-test.mjs`.
- **`scripts/stress/class5-separator-decomposition-census.mjs`**: the census entrypoint. For each Class-5 residual level, builds the free-space graph at the level's *initial* state (start gate, no moves made — the same `prep.reachBlockedArr` reachability notion the production connectivity prune already uses, so no new solver semantics were invented), then measures:
  - family 1 (static): the full articulation-cut census over that graph;
  - bounded width-k probes: minimum vertex cut from the level's gate(s) to the goal and to every must-pass/must-cross cell (the interfaces a decomposition would actually need to reason about — not an arbitrary cell pair);
  - family 2 (mechanic-aware): whether the min-cut set itself contains a must-cross/must-pass/portal/filter/flippingFilter/gate/goal cell;
  - family 4 (portal-mediated): the same probes recomputed on a graph augmented with portal teleport edges, comparing width/reachability with and without them.

No known solution, historical identity, or exact label was used anywhere in construction — the entire census is a generic procedure over each level's own static board and mechanic declarations, runnable identically whether or not the level is solved.

## Result

390/390 levels processed cleanly (0 errors). Construction cost: 12.2s total wall time, ~31ms/level average — cheap.

**Family 1 (static, exhaustive width-1):** 252/390 (64.6%) levels have at least one non-trivial (both separated components ≥2 cells) articulation cut, but most of these are minor: only **16/390 (4.1%)** have an articulation cut where the smaller side is ≥10% of the board's free-space cells — i.e. genuinely bisects the board rather than nicking off a small nook.

**Bounded width-k probes (gate→goal, gate→must-pass, gate→must-cross):** 4,862 interfaces measured across 390 levels. Width is small almost everywhere it's finite and positive: **width histogram {1: 330, 2: 1,726, 3: 2,029, 4: 664}** — every measured finite positive-width interface has width ≤4. But **3,177/4,749 (66.9%)** of these have a trivial pocket (smaller side ≤1 cell — i.e. the min-cut immediately surrounds the target obligation cell itself, a "last-mile" cut with nothing to decompose). Filtering to interfaces where the smaller side is ≥10% of the board (a real bisection, not a cul-de-sac):

| Target type | n interfaces | n ≥10%-board-balanced |
|---|---:|---:|
| goal | 381 | 44 (11.5%) |
| mustPass | 3,226 | 369 (11.4%) |
| mustCross | 1,142 | 105 (9.2%) |

Union across families and target types: **121/390 (31.0%) distinct levels** have at least one non-trivial, board-balanced (≥10% each side), width≤4 separator interface (either the exhaustive width-1 articulation census or a bounded width-k probe). Of those 121, **54 (44.6%)** also have a mechanic-aware balanced interface (the min-cut set itself crosses a must-cross/must-pass/portal/filter cell, not just open floor).

**Family 4 (portal-mediated):** a clean negative. Despite 269/390 (69.0%) Class-5 residual levels being portal-bearing, only **3/4,862 (0.06%)** interfaces show portal edges materially improving reachability or narrowing the cut. Portals in this residual overwhelmingly do not sit on the board's structural bottlenecks between gate and obligations.

**Family 3 (path-history-conditioned):** not computed. Per the preflight, this family requires a frozen legal prefix population, which Class-5 residual levels (being unsolved) cannot supply from a known solution. This measurement is deferred to run against the fresh exact LIVE/DEAD sibling harvest's frozen prefixes (the next queue item), reusing that population instead of mining a separate one.

## Interpretation against the preflight's advancement bar

The preflight's primary advancement bar has five conditions. This census resolves three cleanly and leaves two open:

- **Interface small enough for a bounded contract state:** yes, for the 121-level subpopulation — width is 1-4 throughout the measured data, never higher.
- **Both sides contain material remaining search space:** yes, by construction (≥10% board free-space on each side was the filter that produced the 121-level count; the raw, unfiltered rate would have wildly overstated prevalence via trivial pockets — 3,177 of 4,749 finite interfaces are exactly this trivial-pocket trap the preflight warned against).
- **Pattern occurs on enough independent rows:** yes — 121 distinct, independent Class-5 levels (each an independent unit; no shared parent/family structure in this residual population) is a real, non-trivial population, not a handful of anecdotes.
- **Mechanic state crossing the interface representable without recreating full path history:** **untested.** The census measures interface width and mechanic-cell presence, not whether the region's own length/intersection/revisit accounting forces broad cross-region coupling. This is exactly the preflight's named failure mode ("contract-explosive").
- **Exact length/intersection obligations don't force interface state too large to keep a compression advantage:** **untested**, same reason.

This is therefore neither coverage-null nor contract-explosive nor portal-specialized-positive on the preflight's own outcome taxonomy — it is a genuine, bounded **static/mechanic-aware positive** whose contract-size question is the concrete remaining gate.

## Disposition and next step

Per the preflight's own candidate order ("a sound interface-feasibility prune on one earned subpopulation" or "a local exact residual query on one side of a compact interface" — preferred over region-DP/AND-OR machinery), the earned next descendant is a **local exact residual query**: does the smaller side of a balanced interface's own obligations remain feasible in isolation, and does local infeasibility there predict true exact-DEAD status?

This question needs real exact LIVE/DEAD ground truth to be decision-bearing — Class-5 residual levels have none (they are, by definition, currently unsolved by every production technique; that is not the same as exact-DEAD). Rather than spend a second, separate CP-SAT campaign purely to manufacture that ground truth for this question alone, this gate is deliberately left prototype-ready and handed to the fresh exact LIVE/DEAD sibling harvest (`docs/solver-fresh-dead-sibling-harvest-preflight.md`), the unambiguous next item in both the preflight ladder and the user-specified priority order. That harvest already needs to draw its population from the current residual and produce exact labels for DEAD-core confirmation; testing whether this census's balanced-interface subpopulation predicts the harvest's exact-DEAD outcomes is a small additional join against that same population, not a new campaign.

No solver treatment, production routing, or architecture is authorized by this result. `docs/solver-optimization-workstreams.md` and `docs/solver-separator-decomposition-census-preflight.md` are updated to record this disposition.

## Artifacts

- `scripts/stress/lib/articulation-census.mjs`, `articulation-census-node-test.mjs`
- `scripts/stress/lib/vertex-mincut.mjs`, `vertex-mincut-node-test.mjs`
- `scripts/stress/class5-separator-decomposition-census.mjs`
- `reports/stress/class5-separator-census-population-2026-09-17.json` — frozen 390-row population
- `reports/stress/class5-separator-decomposition-census-2026-09-17.json` — full per-level measurements
- `reports/stress/class5-separator-decomposition-census-2026-09-17-summary.md` — aggregate summary

# Solver archaeology: topology classes and family-response hardness

Status: historical-evidence follow-up. Both lines below are observer/analysis opportunities; neither justifies a production solver change by itself.

## Homotopy / topological completion classes

The July 2026 homotopy line is now confirmed as a genuine orphan rather than a renamed descendant.

Historical sequence:

1. External-literature review identified homotopy-class path signatures as a missing axis.
2. The first proxy based on cell/edge overlap was explicitly rejected as a mis-designed test.
3. The corrected probe implemented actual winding-number comparison: for two solution paths, close the loop as `pathA + reverse(pathB)` and compute winding numbers around connected obstacle-cluster centroids. Zero winding around every cluster means the two paths are treated as the same homotopy class.
4. On 19 obstacle-bearing must-cross-heavy published levels, 12 had more than one solution homotopy class. Across 5,659 cross-class hint pairs, 939 (16.6%) were still considered "similar" by the then-current geometric/feature diversity metric.
5. The work was described as the strongest-evidence research item and later as the highest-priority research build.
6. Rename-aware searches for `homotopy`, `winding`, topological/path-class vocabulary, PRs, and later commit descendants find no implementation, negative experiment, or explicit closure after that promotion.

### What the old result does and does not prove

It proves that valid Pathfinder solutions can occupy categorical topological route classes that ordinary footprint/feature similarity can conflate.

It does **not** prove that topological class predicts LIVE/DEAD search-state fate, that beam populations lose useful classes, or that retaining classes improves solves.

### Cheapest modern gate

Use current exact-labelled extinction cases and known/reference-model completions. For sibling prefixes at one extinction decision:

- obtain one or more valid completions where available;
- compute the same winding-class relation on completed paths;
- ask whether the known-live sibling preserves a completion class absent from the retained dead population;
- ask whether the beam population collapses to one/few topological completion regimes before the last viable alternative is culled.

This is observer-only. Do not build an in-loop homotopy key unless exact-labelled cases first show a recurring relation to extinction.

The July centroid caveat remains: obstacle-cluster centroids are not guaranteed interior points for highly concave clusters. A modern replay should either validate puncture points or use a safer interior representative before treating exact class counts as ground truth.

## Fragile vs robust family hardness

July's Phase-C family experiment already established that perturbation response can split apparently similar hard levels into qualitatively different populations.

477 variants from 11 seeds were solved at the practical 20-second/no-repair-extension envelope across symmetry, local mutation, swap, constrained shuffle, and re-embedding families. 120/477 solved overall.

The extremes were striking:

- **R02248:** 35/45 variants solved (78%) across every mutation family. This agreed with a separately diagnosed scoring-term x orientation interaction: tiny structural changes routinely broke the difficulty.
- **R00440:** 0/45 variants solved across all five mutation families. Its variants exercised roughly ten different solver techniques with widely varying badness and still failed.
- **R02579:** 1/45 solved, similarly robust.

The report explicitly interpreted fragile families as plausible narrow solver/heuristic interactions and robust families as stronger evidence of genuinely hard search/capability deficits, while warning that n=11 seeds was not population-scale evidence.

### Modern opportunity

The current variant library is orders of magnitude larger and has much better provenance. Recompute family-response hardness on the present residual using controlled mutation families rather than treating all variants interchangeably.

Useful outputs for each parent could include:

- solve fraction by mutation family;
- symmetry-only response, since symmetry preserves puzzle constraints most cleanly;
- response entropy / concentration across mutation types;
- which solver action wins rescued variants;
- whether one action repeatedly gains under several independent perturbations;
- parent-vs-family exact-label/phenotype changes where available.

### Interpretation discipline

A variant rescue is not automatically causal evidence for the changed object. Symmetry is the cleanest structural control; local moves/re-embedding alter actual puzzle content. Use mutation-family response as premise generation and population stratification, then test a proposed mechanism directly.

The valuable modern question is not simply `fragile or robust?` but:

> Does family-response phenotype identify residuals that need routing/search-geometry repair versus residuals that need a new capability/representation?

This can be answered without changing production search and may improve which Class-5 levels are chosen for expensive microscopes.
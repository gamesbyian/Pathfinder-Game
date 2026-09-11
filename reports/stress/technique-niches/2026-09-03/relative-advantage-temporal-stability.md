# Technique structural-niche temporal stability

> **Evidence role:** observational-development extension of `reports/2026-09-05-relative-advantage-pairs-temporal-drift-001.md`.
> **Compared:** `reports/stress/technique-niches/2026-09-01/relative-advantage-summary.json` -> `reports/stress/technique-niches/2026-09-03/relative-advantage-summary.json`.
> **Persistent threshold:** same effect direction with |standardized difference| >= 0.30 in both snapshots.

The Sep-5 report already established that 5/8 pairs changed their single leading structural feature while divergence counts stayed fairly stable. This extension asks the stricter follow-up: whether any material same-direction separator persists anywhere in the stored top-eight effect set.

Compared 8 frozen action pairs; 5 retain at least one material same-direction structural separator among the top-eight effects stored in both summaries.

| pair | disagreement old -> fresh | leader old -> fresh | persistent shared effects | reading |
|---|---:|---|---|---|
| admissible-order\|tieBreak=default\|lds=off vs admissible-order\|tieBreak=mustCrossFirst\|lds=off | 29 -> 36 | mustTurn (-0.644) -> mustPass (0.919) | requiredIntersections -0.386->-0.610 | persistent-structural-niche |
| dfs\|score=harvestThenFinish\|bias=none vs dfs\|score=portalFirstTransfer\|bias=none | 27 -> 22 | requiredPathLength (-1.095) -> flippingFilters (1.682) | flippingFilters 0.851->1.682; mustCross -0.584->-0.515; requiredIntersections -0.938->-0.302 | persistent-structural-niche |
| beam\|score=objectiveFirst\|bias=none\|width=2000\|retention=plain vs beam\|score=objectiveFirst\|bias=none\|width=5000\|retention=plain | 196 -> 202 | navigableArea (0.656) -> turnConstraintLoad (-0.586) | requiredPathCoverageRatio -0.436->-0.527; constrainedObjectDensity -0.477->-0.428; nonNavigableDensity -0.423->-0.515; mustPass -0.413->-0.414; navigableArea 0.656->0.411 | persistent-structural-niche |
| beam\|score=intersectionHarvest\|bias=none\|width=2000\|retention=plain vs beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=plain | 184 -> 193 | constrainedObjectDensity (-0.442) -> portals (0.460) | none | no-persistent-top-feature-at-threshold |
| beam\|score=objectiveFirst\|bias=none\|width=5000\|retention=plain vs beam\|score=objectiveFirst\|bias=none\|width=5000\|retention=mechanic-buckets | 176 -> 181 | portals (-1.060) -> portals (-0.677) | portals -1.060->-0.677; turnConstraintLoad 0.532->0.537; surround 0.400->0.406; requiredIntersections 0.680->0.343; requiredPathLength 0.350->0.302 | persistent-structural-niche |
| beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=plain vs beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=mechanic-buckets | 175 -> 181 | requiredIntersections (0.655) -> requiredIntersections (0.903) | requiredIntersections 0.655->0.903; portals -0.539->-0.825; requiredPathLength 0.387->0.602; constrainedObjectDensity -0.376->-0.532 | persistent-structural-niche |
| beam\|score=perimeterSweep\|bias=perimeterCW\|width=2000\|retention=plain vs beam\|score=perimeterSweep\|bias=perimeterCCW\|width=2000\|retention=plain | 228 -> 215 | width (0.215) -> width (0.247) | none | no-persistent-top-feature-at-threshold |
| dfs\|score=perimeterSweep\|bias=perimeterCW vs dfs\|score=perimeterSweep\|bias=perimeterCCW | 97 -> 92 | mustCross (0.344) -> portals (-0.620) | none | no-persistent-top-feature-at-threshold |

## Interpretation boundary

Extends the existing 2026-09-05 leading-feature temporal-drift result across the stored top-eight effects. A persistent separator is stronger nomination evidence than a one-snapshot association, but remains correlational and outcome-selected; it must still earn family/mechanism/held-out evidence before production steering.

The source summaries retain only the top eight univariate effects per pair. A feature dropping out of the common set is therefore censored evidence, not proof that its association disappeared. Recompute full pair effects from the base capability artifacts before making a decision that depends on a missing feature.


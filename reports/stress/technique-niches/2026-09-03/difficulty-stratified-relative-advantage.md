# Difficulty-stratified technique relative advantage

> **Evidence role:** observational-development; no new solver dispatch.
> **Input:** `reports/stress/technique-niches/2026-09-03/level-capability.json`.
> **Generic burden:** constrainedObjects, turnConstraintLoad, constrainedObjectDensity, requiredPathLength, portals, requiredPathCoverageRatio, mustTurn, surround, blocks.

The population is split into 5 equal-count bands by the configured generic structural-burden score. Pairwise A-only/B-only effects are then recomputed inside each band. A stratum is interpretation-eligible only with at least 5 exclusive wins on each side. Multiplicity is reported only as offline fragility context.

| pair | eligible strata | recurring same-direction material effects | thin share L / R |
|---|---:|---|---:|
| admissible-order\|tieBreak=default\|lds=off vs admissible-order\|tieBreak=mustCrossFirst\|lds=off | 1 | none at current thresholds | 25% / 19% |
| dfs\|score=harvestThenFinish\|bias=none vs dfs\|score=portalFirstTransfer\|bias=none | 0 | none at current thresholds | 0% / 0% |
| beam\|score=objectiveFirst\|bias=none\|width=2000\|retention=plain vs beam\|score=objectiveFirst\|bias=none\|width=5000\|retention=plain | 3 | turnConstraintLoad (3 strata); nonNavigableDensity (2 strata); geese (2 strata) | 3% / 3% |
| beam\|score=intersectionHarvest\|bias=none\|width=2000\|retention=plain vs beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=plain | 3 | portals (2 strata); falseGoals (2 strata) | 13% / 3% |
| beam\|score=objectiveFirst\|bias=none\|width=5000\|retention=plain vs beam\|score=objectiveFirst\|bias=none\|width=5000\|retention=mechanic-buckets | 5 | portals (5 strata); constrainedObjects (3 strata); flippingFilters (3 strata); turnConstraintLoad (3 strata); constrainedObjectDensity (2 strata); adjacentTurn (2 strata); mustTurn (2 strata) | 10% / 18% |
| beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=plain vs beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=mechanic-buckets | 3 | portals (3 strata); requiredIntersections (2 strata); constrainedObjectDensity (2 strata); constrainedObjects (2 strata); turnConstraintLoad (2 strata); flippingFilters (2 strata) | 10% / 15% |
| beam\|score=perimeterSweep\|bias=perimeterCW\|width=2000\|retention=plain vs beam\|score=perimeterSweep\|bias=perimeterCCW\|width=2000\|retention=plain | 4 | area (2 strata); blocks (2 strata); width (2 strata) | 22% / 18% |
| dfs\|score=perimeterSweep\|bias=perimeterCW vs dfs\|score=perimeterSweep\|bias=perimeterCCW | 2 | portals (2 strata); requiredPathCoverageRatio (2 strata) | 5% / 6% |

## Strata

- band 1: n=393, burden score -1.72 to -0.43
- band 2: n=392, burden score -0.43 to -0.07
- band 3: n=393, burden score -0.07 to 0.19
- band 4: n=392, burden score 0.19 to 0.51
- band 5: n=392, burden score 0.52 to 1.60

## Interpretation boundary

Persistence within generic-burden strata weakens the explanation that a pairwise niche is merely overall difficulty. Multiplicity supplies offline fragility context. Because the burden features are correlated, decision-bearing effects should also survive a plausible reduced-feature sensitivity run. None of this establishes causality; variant-family and operational/mechanism evidence remain the next escalation for stable effects.


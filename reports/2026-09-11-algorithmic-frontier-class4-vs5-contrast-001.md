# Algorithmic frontier class-4 vs class-5 contrast 001

> **Status:** active-offline
> **Last evidence:** 2026-09-11 — post-1,029 residual atlas: class 4 = 200 zero-T1-winner levels with a historical/provenance rescuer; class 5 = 388 no-known-rescuer levels after reconciliation.
> **Decision:** use class 4 as the primary near-control for frontier characterization. Use classes 1-4 combined only as a secondary operational comparison. Feed the contrast into the active observer-only joint-obligation propagation gate so it must demonstrate a frontier-specific mechanism, not merely common mechanic structure.
> **Remaining gate:** execute [`2026-09-11-algorithmic-frontier-execution-handoff-001.md`](2026-09-11-algorithmic-frontier-execution-handoff-001.md).
> **Evidence role:** development characterization / mechanism nomination; offline labels are not production routing inputs.

## Why class 4 is the primary control

Classes 1-3 already have an isolated T1 rescuer, so comparing class 5 only with the other 283 misses conflates frontier membership with known isolated capability. Class 4 is cleaner: both class 4 and class 5 have zero isolated T1 winners; class 4 differs by having a strict cold-capability Pathfinder rescue somewhere in history.

The sharper question is: **what distinguishes zero-T1 levels that Pathfinder has nevertheless solved in some cold context from zero-T1 levels for which no cold Pathfinder rescue has been recorded?**

## Coarse contrast already available

Rates are class 5 vs class 4. Odds ratios are descriptive frontier-vs-control development effects, not confirmation statistics.

| Feature | Class 5 | Class 4 | Difference | Odds ratio |
|---|---:|---:|---:|---:|
| Portal-bearing | 269/388 = **69.3%** | 173/200 = **86.5%** | **-17.2 pp** | **0.35** |
| Must-cross-bearing | 224/388 = **57.7%** | 126/200 = **63.0%** | -5.3 pp | 0.80 |
| Intersection-heavy routing | 325/388 = **83.8%** | 154/200 = **77.0%** | **+6.8 pp** | **1.54** |
| Must-cross-heavy routing | 23/388 = **5.9%** | 22/200 = **11.0%** | **-5.1 pp** | **0.51** |
| Multi-portal routing | 34/388 = **8.8%** | 23/200 = **11.5%** | -2.7 pp | 0.74 |
| Portal + must-cross + intersection-heavy | 130/388 = **33.5%** | 87/200 = **43.5%** | **-10.0 pp** | **0.65** |

The secondary class-5-vs-all-other-residual comparison points in the same broad direction for portals and intersection-heavy routing: class 5 is 69.3% portal-bearing vs 80.6% among the other 283 misses, and 83.8% intersection-heavy vs 77.7% among the remainder.

## Immediate implication for the joint-obligation pilot

The frontier is not explained by simply being more portal-heavy or carrying more of the portal + must-cross + intersection-heavy combination. Those signatures are **more common in class 4**, the zero-T1 population that does have historical cold rescues.

Therefore the active observer-only joint-obligation propagation pilot cannot earn promotion merely by firing frequently on class 5 or by finding many obligation clusters there. It should include class 4 as a near-control and show a differential relationship to frontier failure, such as materially different boundary-signature rejection/dead-work capture, all-known-basin extinction, or another mechanism-level distinction after composition is controlled.

Intersection-heavy routing is modestly enriched in class 5 and is worth controlling as a stratum, not treating as a mechanism by itself.

## Tooling added

`scripts/stress/analyze-frontier-contrast.mjs` consumes the checked residual atlas and joins the repo's existing `scripts/stress/features.mjs` descriptors. It emits:

- class 5 vs class 4 as the primary contrast;
- class 5 vs classes 1-4 combined as a secondary operational contrast;
- portal-bearing, intersection-heavy, and portal-bearing+intersection-heavy composition-controlled contrasts;
- scalar static standardized differences;
- mechanic-presence and routing odds/rate contrasts;
- production work/nodes/attempt effects;
- lifecycle-bucket and best-badness-technique distributions.

The pure contrast math lives in `scripts/stress/frontier-contrast-lib.mjs` with focused unit tests. This is discovery evidence only.

## Evidence sequence

1. **Static + production response:** run the contrast analyzer and inspect prespecified whole-cohort and composition-controlled effects. Weak effects are a useful null, not an invitation to threshold-mine.
2. **Source-controlled solution space:** compare origins/facets with usable coverage on both sides, not naive combined profiles. Priority axes include portal order, must-cross rigidity/order, objective-satisfaction depth, path shape, prefix diversity, basin distinctiveness, and known-live decision support.
3. **Existing variant-family boundary flips:** look for class-5 parents whose controlled relatives historically became solvable or changed technique response. Preserve parent as the independent unit and recheck only decision-bearing historical boundaries on current code.
4. **Representative-basin extinction:** on a bounded provenance-diverse sample, locate the first point where all known-live basins are lost and classify prune/false-reject, state alias/merge, score/rank/beam cull, exposure, budget, or other representation/reasoning failure.
5. **Joint-obligation observer interpretation:** cross observer outcomes against class 4/class 5 and the evidence above. Promote only if the observer identifies a safe, material mechanism rather than a common structural correlate.

If no coherent frontier-wide distinction survives static, solution-space, family, and trajectory evidence, subdivide class 5 by failure/extinction phenotype rather than forcing one mechanism.

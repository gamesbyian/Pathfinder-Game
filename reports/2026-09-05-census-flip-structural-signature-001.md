# Levels that lose isolated-census support across a refresh are structurally distinguishable, not random noise

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — standardized structural-feature differences between levels whose `isolatedOracleSolved` flipped `true→false` (n=82) between the 2026-09-01 and 2026-09-03 census snapshots vs. stable levels (n=1,795), no new dispatch
> **Decision:** levels that flip to losing isolated support are structurally distinguishable from stable levels — `constrainedObjects` (standardized diff 0.737), `turnConstraintLoad` (0.563), `portals` (0.547) are all clearly elevated in the flipped-to-false group. This directly answers a gap `2026-09-04-capability-multiplicity-temporal-robustness-001.md` explicitly flagged as untested ("this report does not test *why* singleton levels are more fragile ... versus singleton levels being structurally 'harder'/more marginal"): flip risk correlates with the *same* structural features already identified as production/isolated-census difficulty predictors, not with multiplicity/family alone.
> **Remaining gate:** none — descriptive characterization directly closing a named gap in an existing report.
> **Evidence role:** confirmatory/discovery — answers an explicitly-flagged open question from an existing active report
> **Selection:** whole comparable population (82 flipped + 1,795 stable, of 1,962 total), not a sample

## Method

Joined levels present in both the 2026-09-01 and 2026-09-03 `level-capability.json` snapshots by `levelId`, classified each as flipped-to-false (`isolatedOracleSolved` true→false), flipped-to-true (false→true), or stable, then computed standardized mean differences on structural features (from the 2026-09-03 snapshot, since these are static geometry properties that do not change between census dates) between the flipped-to-false group and the stable group.

## Result

| feature | flipped-to-false mean | stable mean | standardized diff |
|---|---:|---:|---:|
| `constrainedObjects` | 28.38 | 21.65 | 0.737 |
| `turnConstraintLoad` | 16.63 | 12.92 | 0.563 |
| `portals` | 4.18 | 2.71 | 0.547 |
| `requiredPathLength` | 99.91 | 91.34 | 0.361 |
| `blocks` | 25.56 | 21.41 | 0.360 |
| `area` | 168.85 | 156.38 | 0.331 |
| `mustCross` | 3.09 | 2.42 | 0.247 |
| `mustTurn` | 3.77 | 3.10 | 0.199 |
| `requiredIntersections` | 5.49 | 5.25 | 0.085 |

(82 flipped-to-false, 1,795 stable levels, of 1,962 total; 85 flipped-to-true are excluded from this comparison — see the companion report on that group.)

## Interpretation

The leading three features here (`constrainedObjects`, `turnConstraintLoad`, `portals`) are the same three that lead the production-status and isolated-no-winner risk-factor rankings elsewhere this session. This means heuristic-support instability across a census refresh is not evenly distributed noise — it is concentrated on the structurally hardest levels by the same measures that already predict difficulty. Practically, this means the existing multiplicity-based re-verification prioritization (singleton claims are more provisional, weighted further by technique family) could be sharpened further by also weighting on these structural features: a singleton claim on a high-`constrainedObjects`/`portals`/`turnConstraintLoad` level is doubly suspect — both for its low multiplicity and for sitting in the structurally volatile region of the census.

## What this does not establish

- Still correlational, not causal — does not establish the mechanism by which structural difficulty translates into heuristic instability, only that the two correlate.
- Two-snapshot comparison (2026-09-01 → 2026-09-03); a third snapshot would strengthen confidence this is a durable pattern rather than one refresh's idiosyncrasy.
- Does not control for multiplicity itself — flipped levels might simply have lower `solverCount` on average, which independently correlates with these same structural features (per the existing risk-factor rankings); disentangling structural-feature effect from multiplicity effect was not attempted here.

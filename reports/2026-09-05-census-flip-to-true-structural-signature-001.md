# Levels that gain isolated-census support show the same structural signature as ones that lose it — instability itself, not directional bias, tracks difficulty

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — standardized structural-feature differences between levels whose `isolatedOracleSolved` flipped `false→true` (n=85) between the 2026-09-01 and 2026-09-03 census snapshots vs. stable levels (n=1,795), no new dispatch
> **Decision:** levels gaining isolated support are *also* structurally elevated on the same features as levels losing it: `constrainedObjects` (standardized diff 0.530), `requiredPathLength` (0.409), `mustTurn` (0.391), `portals` (0.390), `turnConstraintLoad` (0.335) — all clearly above the stable group's baseline, in the same direction as the flip-to-false group in `2026-09-05-census-flip-structural-signature-001.md`.
> **Remaining gate:** none — descriptive characterization completing the symmetric companion to the flip-to-false report.
> **Evidence role:** discovery — the symmetric half of the flip-structural-signature finding
> **Selection:** whole comparable population (85 flipped + 1,795 stable, of 1,962 total), not a sample

## Method

Same method as the flip-to-false companion report, applied to the flip-to-true group.

## Result

| feature | flipped-to-true mean | stable mean | standardized diff |
|---|---:|---:|---:|
| `constrainedObjects` | 26.61 | 21.65 | 0.530 |
| `requiredPathLength` | 101.34 | 91.34 | 0.409 |
| `mustTurn` | 4.38 | 3.10 | 0.391 |
| `portals` | 3.78 | 2.71 | 0.390 |
| `turnConstraintLoad` | 15.18 | 12.92 | 0.335 |
| `mustCross` | 2.60 | 2.42 | 0.068 |

## Interpretation

Both flip directions point the same way structurally, which is the interesting part: it is not that "harder" levels systematically lose support while "easier" ones gain it, or vice versa — structurally harder levels (by these same features) are simply *less stable* in general, whichever direction the frozen-T1 heuristic behavior happens to drift on a given refresh. Combined with the flip-to-false report, this supports reading census volatility as a property of level difficulty itself (heuristic behavior on hard levels is closer to a decision boundary and more sensitive to small heuristic-drift changes) rather than a directional degradation or improvement trend. This reframes the standing multiplicity-fragility caution slightly: the risk is elevated *instability*, not a one-way erosion of capability, for levels sitting in this structural region.

## What this does not establish

- Same caveats as the flip-to-false report: correlational, two-snapshot, does not disentangle from multiplicity effects.
- Does not test whether flip-to-true levels are "recovering" previously-lost capability or gaining genuinely new capability — direction of causality across refreshes is not established.

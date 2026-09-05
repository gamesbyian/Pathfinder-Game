# Doubleton (`solverCount=2`) levels have no strong structural signature distinguishing them from the rest of the census

> **Status:** concluded-negative
> **Last evidence:** 2026-09-05 — standardized mean differences between `doubleton===true` levels (n=94) and all other levels (n=1,868) across nine structural features in `reports/stress/technique-niches/2026-09-03/level-capability.json`, no new dispatch
> **Decision:** every tested feature's standardized difference is weak (max 0.353 for `requiredPathLength`; most under 0.25) — far below the production-status risk-factor table's leading values (`constrainedObjects` at 1.250). Doubleton status is not meaningfully structurally predictable from these features, unlike production-solved status or the starved/capped split.
> **Remaining gate:** none — a clean negative on the tested feature set.
> **Evidence role:** discovery, explicitly a null result — complements the doubleton-intra-family-redundancy finding with a structural (not family) characterization
> **Selection:** whole doubleton population (94) vs. whole remainder (1,868), not a sample

## Method

Standardized-difference (mean difference / pooled SD) between doubleton and non-doubleton levels, for the same structural features already used in the production-status and starved/capped risk-factor work.

## Result

| feature | doubleton mean | rest mean | standardized diff |
|---|---:|---:|---:|
| `requiredPathLength` | 100.511 | 91.715 | 0.353 |
| `blocks` | 24.266 | 21.581 | 0.228 |
| `constrainedObjects` | 23.862 | 22.055 | 0.203 |
| `portals` | 3.362 | 2.788 | 0.201 |
| `surround` | 0.840 | 1.043 | 0.151 |
| `requiredIntersections` | 5.617 | 5.281 | 0.118 |
| `mustCross` | 2.234 | 2.466 | 0.089 |
| `mustTurn` | 3.372 | 3.176 | 0.059 |
| `turnConstraintLoad` | 13.489 | 13.157 | 0.050 |

## Interpretation

Whatever determines *whether* a level lands at `solverCount=2` specifically (as opposed to 0, 1, or higher) is evidently not well captured by these structural features — there is a mild, unsurprising drift toward longer/larger levels (`requiredPathLength`, `blocks`), but nothing approaching the strength of the production-status or starved/capped distinguishing signals found elsewhere this session. This is useful negative context: doubleton membership looks close to structurally "random" with respect to these features, so any future routing or risk-scoring work should not expect these structural features to identify doubleton levels specifically, and the doubleton intra-family-redundancy finding (58.5% same-family) should be understood as a fact about solver-capability structure, not about the level's own geometry/constraint profile.

## What this does not establish

- Does not test whether some other feature (not in this set) predicts doubleton status better.
- Does not test interactions between features, only univariate differences.
- Single census snapshot (2026-09-03).

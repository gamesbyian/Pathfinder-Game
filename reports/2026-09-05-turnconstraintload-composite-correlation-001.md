# `turnConstraintLoad` correlates with `mustCross`, `mustTurn`, and `adjacentTurn` — likely a composite of turn-related constraints

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — pairwise Pearson correlation among `mustCross`, `mustTurn`, `requiredIntersections`, `gates`, `falseGoals`, `turnConstraintLoad`, `adjacentTurn`, `portals` across all 1,962 levels in `reports/stress/technique-niches/2026-09-03/level-capability.json`, no new dispatch
> **Decision:** `turnConstraintLoad` correlates moderately with three other features: `adjacentTurn` (r=0.589), `mustTurn` (r=0.578), and `mustCross` (r=0.480). No other pair among this feature set exceeds |r|=0.35. This is consistent with `turnConstraintLoad` being a derived/composite measure that aggregates several turn- and crossing-related constraint counts, rather than an independent geometric property.
> **Remaining gate:** none — extends the existing structural risk-factor multicollinearity check (`2026-09-05-structural-risk-factor-multicollinearity-001.md`) to a feature set that report did not cover.
> **Evidence role:** discovery — a targeted extension of the multicollinearity check to `mustCross`/`mustTurn`/`adjacentTurn`/`requiredIntersections`/`gates`/`falseGoals`
> **Selection:** whole census population (1,962 levels), not a sample

## Method

Same Pearson-correlation method as the existing multicollinearity report, applied to a feature set centered on turn/crossing constraints not covered there.

## Result

| Feature pair | r |
|---|---:|
| `turnConstraintLoad` vs `adjacentTurn` | 0.589 |
| `turnConstraintLoad` vs `mustTurn` | 0.578 |
| `turnConstraintLoad` vs `mustCross` | 0.480 |

No other pair among `mustCross`, `mustTurn`, `requiredIntersections`, `gates`, `falseGoals`, `portals` exceeded |r|=0.35.

## Interpretation

Combined with `2026-09-05-structural-risk-factor-multicollinearity-001.md`'s finding that `turnConstraintLoad` also correlates with `constrainedObjects` (r=0.781) and `constrainedObjectDensity` (r=0.666), `turnConstraintLoad` now shows moderate-to-strong correlation with five other features across the two checks. This is the strongest evidence yet that it functions as a rolled-up difficulty index rather than an independently informative geometric measure — any future risk model should likely treat `turnConstraintLoad` as summarizing (and thus partially redundant with) `mustTurn`, `adjacentTurn`, `mustCross`, and `constrainedObjects`/`constrainedObjectDensity`, rather than as an additional independent input.

## What this does not establish

- Does not confirm the exact formula behind `turnConstraintLoad` (not derived from source, only inferred from correlation pattern).
- Does not test whether removing `turnConstraintLoad` from a risk model loses predictive power once its correlated components are retained.
- Single census snapshot (2026-09-03).

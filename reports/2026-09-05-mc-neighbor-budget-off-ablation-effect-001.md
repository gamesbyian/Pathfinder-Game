# Disabling the must-cross-neighbor budget costs beam and DFS ~58-60% of their solved levels — a large, cross-family-confirmed effect

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — isolated-census `solvedLevels` for the `+mc-neighbor-budget-off` ablation variants of `beam|score=mustCrossFirst|width=2000` and `dfs|score=mustCrossFirst`, vs. their unablated counterparts, in `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `actions` array, no new dispatch
> **Decision:** disabling the must-cross-neighbor budget drops solved levels from 511 to 204 for beam's `mustCrossFirst` (−60.1%) and from 365 to 153 for DFS's `mustCrossFirst` (−58.1%) — a large, consistent effect confirmed independently across two different search families using the same scoring profile.
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — the isolated-census analogue of production's `must-cross-neighbor-prune-disabled-retry` stage, confirmed across two families
> **Selection:** the two matched pairs carrying this ablation suffix, not a sample of a larger set (these are the only such pairs in the current action menu)

## Method

Compared each `+mc-neighbor-budget-off` action's `solvedLevels` against its unablated counterpart at the same scoring profile, for both families that carry this ablation pair.

## Result

| family / profile | unablated | `+mc-neighbor-budget-off` | change |
|---|---:|---:|---:|
| `beam\|score=mustCrossFirst\|width=2000` | 511 | 204 | **−60.1%** |
| `dfs\|score=mustCrossFirst` | 365 | 153 | **−58.1%** |

## Interpretation

Unlike the mixed-sign beam retention ablations (`2026-09-05-beam-retention-ablation-effects-001.md`), this ablation's effect is large, unambiguous, and holds across two structurally different search families using the same scoring approach — strong isolated-census evidence that the must-cross-neighbor budget mechanism is genuinely load-bearing for the `mustCrossFirst` scoring profile specifically, not an artifact of one family's particular search behavior. This is directly supportive context for production's `must-cross-neighbor-prune-disabled-retry` stage's existing redundancy finding (`2026-09-04-must-cross-connectivity-axis-production-win-redundancy-001.md`: 6/9 of its real production wins are redundant with an isolated alternative, 3/9 exclusive) — the isolated-census data shows the mechanism this stage tests is a large, real effect for the specific profile it targets, consistent with the stage earning its keep on the exclusive-win minority even though most of its wins have a redundant alternative.

## What this does not establish

- Only two matched pairs exist in the current action menu (both `mustCrossFirst` profile) — does not test whether this ablation's effect generalizes to other scoring profiles.
- Does not explain the underlying search-mechanism reason for the effect's magnitude.
- Single census snapshot (2026-09-03).

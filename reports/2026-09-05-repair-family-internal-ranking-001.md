# Standard repair guidance dominates its own family by a wide margin — 4x the solved levels and exclusive claims of either guidance variant

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — per-action `solvedLevels`/`exclusiveLevels` for the three `repair` family members in `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `actions` array, no new dispatch
> **Decision:** `repair|score=repair|guidance=standard` solves 770 levels with 50 exclusive claims; `guidance=must-turn-biased` solves 187 with 19 exclusive; `guidance=turn-biased` solves 184 with 12 exclusive. Standard is not merely the best of the three, it dominates by roughly 4x on both solved-count and exclusivity.
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — first within-family ranking of `repair`'s guidance variants reported this session
> **Selection:** whole action population within the family (3 actions), not a sample

## Method

Read `solvedLevels`/`exclusiveLevels` directly from each `repair` action's entry in `level-capability.json`'s `actions` array.

## Result

| action | solved levels | exclusive levels |
|---|---:|---:|
| `repair\|score=repair\|guidance=standard` | 770 | 50 |
| `repair\|score=repair\|guidance=must-turn-biased` | 187 | 19 |
| `repair\|score=repair\|guidance=turn-biased` | 184 | 12 |

## Interpretation

This is consistent with `2026-09-05-main-ladder-config-level-deconcentration-001.md`'s finding that `repair-standard` is the single largest specific winning config in production (20.9% of all solves) — the isolated census confirms this is not a production-specific artifact, `standard` guidance is simply the strongest of the three repair variants by a wide margin in isolation too. The two guidance-biased variants (`must-turn-biased`, `turn-biased`) each retain a real but much smaller exclusive niche (19 and 12 levels respectively) not covered by `standard` — enough to justify keeping them in the menu, but not enough to challenge `standard`'s dominant role within the family.

## What this does not establish

- Does not test whether the two guidance-biased variants' exclusive levels share a common structural signature (a natural follow-up).
- Correlational; does not explain the underlying search-behavior reason for `standard`'s dominance.
- Single census snapshot (2026-09-03).

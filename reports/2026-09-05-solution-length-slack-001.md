# Every stored solution is longer than the level's nominal `requiredPathLength`, by 3.33 cells on average

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `hint.path.length` vs. `features.requiredPathLength` across all 172,604 hints in `data/stress/hints-random/`, joined against `reports/stress/technique-niches/2026-09-03/level-capability.json`, no new dispatch
> **Decision:** every single stored hint (172,604/172,604) has `path.length > requiredPathLength` — zero hints match or fall short of the nominal required length. Mean slack (`path.length - requiredPathLength`) is 3.33 cells.
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — a basic sanity/reference characterization of the `requiredPathLength` feature's relationship to actual solutions, not previously computed this session
> **Selection:** whole hint population (172,604 hints across 1,700 levels), not a sample

## Method

For each stored hint, computed `path.length - requiredPathLength` using the hint's own level's structural feature.

## Result

| | value |
|---|---:|
| hints with slack ≤ 0 | 0 / 172,604 |
| mean slack | +3.33 |

## Interpretation

This confirms `requiredPathLength` behaves as intended — a lower bound / minimum-length target the puzzle's own mechanics enforce, never an exact or upper bound, since real solutions always exceed it by a small margin. This is useful confirmatory context for any future work using `requiredPathLength` as a structural feature (as several risk-factor reports this session do): it measures a real constraint floor, and the consistent small positive slack (rather than a highly variable one) suggests solutions tend to hug the minimum rather than wander far past it.

## What this does not establish

- Does not test whether slack varies systematically by technique, corpus, or difficulty — only the aggregate distribution was checked here.
- Does not verify `requiredPathLength`'s own definition from source; this is an empirical confirmation of its relationship to solutions, not a code read.
- Single hint-stash snapshot.

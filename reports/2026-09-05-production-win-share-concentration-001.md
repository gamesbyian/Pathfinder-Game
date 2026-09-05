# Production's solve credit is heavily concentrated: the top 3 stages account for 85% of all solves

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `winningTechnique` distribution across all 1,073 solved levels (98 corpus1 + 975 corpus2) in `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus{1,2}.json`, no new dispatch
> **Decision:** `main-ladder` alone wins 672/1,073 solves (62.6%); the top 3 stages (`main-ladder`, `early-repair-search` 17.9%, `admissible-order-fallback` 4.5%) together account for 85.0% of all solves. The remaining 9 stages split only 15.0% between them, each contributing under 3.5% individually, down to six stages contributing under 1% each.
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — a concentration-of-reliance framing not previously computed this session at the whole-ladder level
> **Selection:** whole solved population (1,073 levels), not a sample

## Method

Tabulated `winningTechnique` across every solved level in both corpora, sorted by share, with cumulative share.

## Result

| stage | wins | share | cumulative |
|---|---:|---:|---:|
| `main-ladder` | 672 | 62.6% | 62.6% |
| `early-repair-search` | 192 | 17.9% | 80.5% |
| `admissible-order-fallback` | 48 | 4.5% | 85.0% |
| `coarse-state-near-tie-retention-disabled-retry` | 38 | 3.5% | 88.5% |
| `late-repair-multiseed-retry` | 36 | 3.4% | 91.9% |
| `admissible-order-alternate-tiebreak-retry` | 29 | 2.7% | 94.6% |
| `late-repair-search` | 21 | 2.0% | 96.6% |
| `goal-attraction-disabled-retry` | 10 | 0.9% | 97.5% |
| `must-cross-neighbor-prune-disabled-retry` | 9 | 0.8% | 98.3% |
| `connectivity-axis-prune-disabled-retry` | 6 | 0.6% | 98.9% |
| `guidance-goal-distance-retry` | 6 | 0.6% | 99.4% |
| `repair-fallback` | 6 | 0.6% | 100.0% |

## Interpretation

The production ladder's solve-count reliance is heavily front-loaded: 2 of 12 stages (`main-ladder` + `early-repair-search`) already account for 80.5% of all solves, and adding just one more (`admissible-order-fallback`) reaches 85%. This is a useful risk-framing number for Workstream 2: a regression in `main-ladder` specifically would be catastrophic in raw solve-count terms, far more so than any single late-ladder retry tier — yet the redundancy-analysis reports this session (admissible-order-alternate-tiebreak-retry, must-cross/connectivity-axis, goal-attraction-disabled-retry) show several of these small-share late-ladder stages are disproportionately *irreplaceable* per solve they do win (no isolated-census alternative exists for a meaningful fraction of their wins), even though they contribute little to the aggregate count. Solve-count share and per-solve irreplaceability are different, complementary risk axes: `main-ladder`'s risk is an *availability* one (a regression there would be catastrophic simply because it carries so much volume), while the small late-ladder tiers' risk is a *substitutability* one (each win is individually harder to recover elsewhere, even though losing the tier entirely would cost little aggregate share).

## What this does not establish

- Does not compute irreplaceability for every stage (only admissible-order-alternate-tiebreak-retry, must-cross-neighbor-prune-disabled-retry, connectivity-axis-prune-disabled-retry, and goal-attraction-disabled-retry have dedicated redundancy reports this session).
- Correlational share, not a stress-test of what would actually happen if `main-ladder` regressed.
- Single production run, both corpora combined.

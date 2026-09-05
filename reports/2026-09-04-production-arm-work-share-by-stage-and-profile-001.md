# Within the real production arm, `admissible-order-fallback` + `admissible-order-alternate-tiebreak-retry` account for 69.5% of node share

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — `nodesExpanded` summed by `stageId` and by `scoringProfileId` across all 1,720 production-arm attempts in `reports/portfolio/static-portfolio-entrypoint-production-ab-001/production-arm.json` (40-level A/B), no new dispatch
> **Decision:** by `stageId`, `admissible-order-fallback` (38.48% of total nodes, 115 attempts) and `admissible-order-alternate-tiebreak-retry` (31.05%, 88 attempts) together account for 69.53% of all `nodesExpanded` in the production arm, versus `main-search` at only 9.57% (319 attempts — far more attempts, far less node share each). This corroborates, on this dataset's raw node count, the workstream doc's existing `workSpent`-based figure ("`admissible-order-fallback` plus `admissible-order-alternate-tiebreak-retry` consuming 61.7% of production work for three realized solves") from a different cost metric on the same population. By `scoringProfileId`, `none` (20.38%, mostly non-profile-tagged admissible-order/repair attempts), `intersectionHarvest` (17.29%), `mustCrossFirst` (14.43%), and `nearClosureRescue` (14.08%) are the four largest work sinks, together 66.2% of total node share.
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** confirmatory/discovery — corroborates the existing `workSpent`-based workstream figure via an independent metric (`nodesExpanded`), and adds a scoring-profile-level breakdown not previously reported for this dataset
> **Selection:** whole production-arm attempt population (1,720 attempts, 40 levels), not a sample

## Method

Summed `nodesExpanded` grouped by `stageId`, and separately by `scoringProfileId`, across all attempts in `production-arm.json`, then computed each group's share of the grand total (9,631,638,356 nodes).

## Result

By `stageId`:

| `stageId` | attempts | nodes share |
|---|---:|---:|
| `admissible-order-fallback` | 115 | **38.48%** |
| `admissible-order-alternate-tiebreak-retry` | 88 | **31.05%** |
| `main-search` | 319 | 9.57% |
| `repair-fallback` | 23 | 3.50% |
| `guidance-goal-distance-retry` | 247 | 3.31% |
| `connectivity-axis-prune-disabled-retry` | 247 | 3.27% |
| `coarse-state-near-tie-retention-disabled-retry` | 247 | 3.15% |
| `goal-attraction-disabled-retry` | 157 | 2.35% |
| `late-repair-multiseed-retry` | 63 | 2.35% |
| `must-cross-neighbor-prune-disabled-retry` | 146 | 1.38% |
| `early-repair-search` | 59 | 1.28% |
| `late-repair-search` | 9 | 0.31% |

By `scoringProfileId` (top 8 of 14):

| `scoringProfileId` | attempts | nodes share |
|---|---:|---:|
| `none` | 45 | 20.38% |
| `intersectionHarvest` | 376 | 17.29% |
| `mustCrossFirst` | 72 | 14.43% |
| `nearClosureRescue` | 62 | 14.08% |
| `objectiveFirst` | 334 | 8.36% |
| `default` | 43 | 7.65% |
| `repair` | 154 | 7.44% |
| `perimeterSweep` | 456 | 7.43% |

## Interpretation

The two admissible-order-family stages dominate node spend by a wide margin despite `main-search` receiving nearly 3x as many attempts (319 vs 115+88=203) — each admissible-order attempt is far more expensive on average than a `main-search` attempt. This is a second, independent-metric confirmation of the workstream doc's existing headline number for this A/B, strengthening confidence that the 60-70%-of-work concentration in these two stages is not an artifact of the `workSpent` metric specifically. The scoring-profile breakdown is new: `intersectionHarvest`/`mustCrossFirst`/`nearClosureRescue` together are 45.8% of all node spend despite covering only 510/1,720 (29.7%) of attempts, meaning these three profiles are both frequently used *and* disproportionately expensive per attempt — consistent with the existing "dose truncations of already-present `intersectionHarvest` beams" finding cited as one of the four wins the real ladder holds over the static portfolio. `perimeterSweep` is the most frequently used profile (456 attempts) but a comparatively modest 7.43% of node share — cheap and common, the opposite profile shape from the top three.

## What this does not establish

- Node count, not `workSpent` — the canonical cross-technique currency per standing rules — was used because it is the field this dataset's `attempts` array carries directly (production-arm has no per-attempt `workSpent`, unlike static-portfolio-arm); direction and rough magnitude corroborate the existing `workSpent`-based figure but are not identical numbers.
- Does not attribute node share to *realized solves* specifically (that finer cut — which stages/profiles' spend actually converts to production-only wins — is the subject of the existing production-ladder marginal-value-tail-audit report, not repeated here).
- Single 40-level A/B.

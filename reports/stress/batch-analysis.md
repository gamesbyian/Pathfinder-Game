# Stress-corpus batch analysis

Generated 2026-07-12T03:53:55.889Z — corpus `data/stress/stress-levels.json` (generator v1.0.0), benchmark `reports/stress/benchmark-latest.json` at 20000ms budget.

**Totals:** 102 levels · 85 solved · 17 unsolved · global median runtime 5873ms.

## Per-batch results

| Batch | Theory | N | Solve | Timeout | Median | p95 | Max | Avg nodes | Novelty | Complexity | Pred. | Actual | Spearman | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | historical-solver-pain | 1 | 100% | 0% | 710ms | 710ms | 710ms | 23 | 0.198 | 0.487 | 0.665 | 0.663 | 0 | **discard-or-rework** |
| B | structural-complexity | 4 | 100% | 0% | 21498ms | 39341ms | 42243ms | 8059039 | 0.268 | 0.797 | 0.878 | 0.979 | 0.4 | **expand** |
| C | deceptive-simplicity | 5 | 100% | 0% | 2016ms | 4017ms | 4515ms | 726979 | 0.161 | 0.148 | 0.694 | 0.735 | 0.6 | **discard-or-rework** |
| D | novel-topology | 3 | 100% | 0% | 766ms | 21164ms | 23430ms | 1645374 | 0.207 | 0.319 | 0.785 | 0.764 | 0.5 | **discard-or-rework** |
| E | anti-heuristic | 8 | 100% | 0% | 434ms | 2384ms | 2699ms | 711622 | 0.17 | 0.347 | 0.601 | 0.576 | -0.095 | **discard-or-rework** |
| F | wild-witness | 2 | 100% | 0% | 849ms | 1591ms | 1674ms | 547033 | 0.231 | 0.294 | 0.415 | 0.535 | 0 | **discard-or-rework** |
| undefined | undefined | 79 | 79% | 22% | 8294ms | 285991ms | 292556ms | 19115840 | 0.191 | 0.694 | NaN | 0.879 | 0.144 | **expand** |

### Batch A — historical-solver-pain

> Audit history shows solve time correlates with specific feature regimes (high reqInt at mid-to-high density, must-cross + flipper combinations, long paths). A ridge model fitted on logs/solver-workflow/latest.json steers generation toward the feature combinations that were historically slow; only candidates in the top predicted-cost band are accepted.

Prediction accuracy: Pearson 0, Spearman 0, mean |error| 0.002.

Strongest solver failures: S00001 (710ms).
Weakest (solver shrugged): S00001 (710ms).

### Batch B — structural-complexity

> Ignore historical solve times entirely; maximize the interaction between mechanics (portals feeding flipper corridors, must-cross knots beside landmark cages, multi-mechanic cells within tight radii). Tests whether rich mechanic interaction — not raw object count — degrades orchestration.

Prediction accuracy: Pearson -0.125, Spearman 0.4, mean |error| 0.101.

Strongest solver failures: S00048 (42243ms), S00030 (22898ms), S00035 (20098ms).
Weakest (solver shrugged): S00028 (8771ms), S00035 (20098ms), S00030 (22898ms).

### Batch C — deceptive-simplicity

> Few or no objects; the search space explodes from geometry alone — open mid-density grids where reqLen/reqInt admit an enormous number of plausible near-solutions and the heuristic gradient (goal attraction, perimeter bias) is uninformative. Structural complexity is intentionally low while predicted challenge is unknown-to-high.

Prediction accuracy: Pearson 0.959, Spearman 0.6, mean |error| 0.081.

Strongest solver failures: S00069 (4515ms), S00055 (2024ms), S00057 (2016ms).
Weakest (solver shrugged): S00064 (172ms), S00057 (2016ms), S00065 (2016ms).

### Batch D — novel-topology

> Generate witness paths geometrically unlike the existing solution families (hint corpus), then wrap minimal rules around them. If the solver generalizes, novel solution shapes should cost no more than familiar ones; systematic slowdowns here indicate the heuristics overfit known witness geometry.

Prediction accuracy: Pearson 0.63, Spearman 0.5, mean |error| 0.115.

Strongest solver failures: S00099 (23430ms), S00087 (766ms), S00095 (474ms).
Weakest (solver shrugged): S00095 (474ms), S00087 (766ms), S00099 (23430ms).

### Batch E — anti-heuristic

> Deliberately oppose the attempt policy in solver/attempts.ts: bait the near-closure rule with delayed closure, force interior routing where perimeter templates lead, starve multi-gate budget division below the reqLen>=90 floor, trigger the flipper diverse-beam ladder on levels a plain DFS would crush, and game the navDensity archetype thresholds with hazard padding.

Prediction accuracy: Pearson -0.31, Spearman -0.095, mean |error| 0.302.

Strongest solver failures: S00103 (2699ms), S00120 (1798ms), S00111 (1273ms).
Weakest (solver shrugged): S00109 (39ms), S00107 (47ms), S00114 (56ms).

### Batch F — wild-witness

> Draw witness paths and rule wrappers from maximally wide, human-aesthetic-free parameter distributions (extreme aspect ratios, tiny and huge grids, arbitrary mechanic mixes). No hypothesis beyond: the corners of level-space that no author would draw are where generalization failures hide.

Prediction accuracy: Pearson 0, Spearman 0, mean |error| 0.12.

Strongest solver failures: S00140 (1674ms), S00133 (23ms).
Weakest (solver shrugged): S00133 (23ms), S00140 (1674ms).

### Batch undefined — undefined

> undefined

Prediction accuracy: Pearson 0, Spearman 0.144, mean |error| NaN.

Strongest solver failures: R00581 (unsolved), R00408 (unsolved), R00716 (unsolved).
Weakest (solver shrugged): R00060 (306ms), R01152 (332ms), R01227 (438ms).

## Highlights

### Most novel

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S00028 | B | 15x15 | 90 | 8 | ✓ | 8771ms | 0.816 | 0.321 | repair@dfs(repair-biased) |
| R00058 | undefined | 14x14 | 99 | 3 | ✓ | 910ms | 0.761 | 0.272 | portalFirstTransfer@dfs |
| S00030 | B | 13x13 | 87 | 8 | ✓ | 22898ms | 0.778 | 0.269 | intersectionHarvest@beam5000(diverse) |
| R00525 | undefined | 11x11 | 66 | 0 | ✓ | 17051ms | 0.752 | 0.264 | perimeterSweep/perimeterCW@dfs |
| S00133 | F | 4x4 | 10 | 0 | ✓ | 23ms | 0.158 | 0.26 | perimeterSweep/cornerHarvest@dfs |
| S00048 | B | 15x15 | 103 | 7 | ✓ | 42243ms | 0.795 | 0.255 | repair@dfs(repair) |
| R00060 | undefined | 12x12 | 73 | 5 | ✓ | 306ms | 0.503 | 0.253 | perimeterSweep/perimeterCW@beam2000 |
| R00581 | undefined | 11x11 | 63 | 3 | ✗ | 292556ms | 0.79 | 0.233 | — |

### Most solver-hostile

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| R00408 | undefined | 11x11 | 76 | 6 | ✗ | 290245ms | 0.824 | 0.178 | — |
| R00522 | undefined | 12x12 | 68 | 5 | ✗ | 273976ms | 0.681 | 0.165 | — |
| R00581 | undefined | 11x11 | 63 | 3 | ✗ | 292556ms | 0.79 | 0.233 | — |
| R00600 | undefined | 11x11 | 67 | 2 | ✗ | 143211ms | 0.799 | 0.232 | — |
| R00716 | undefined | 11x11 | 65 | 4 | ✗ | 288755ms | 0.874 | 0.225 | — |
| R00855 | undefined | 11x11 | 78 | 5 | ✗ | 139395ms | 0.738 | 0.162 | — |
| R01189 | undefined | 13x13 | 81 | 10 | ✗ | 284037ms | 0.792 | 0.211 | — |
| R01195 | undefined | 12x12 | 99 | 8 | ✗ | 285755ms | 0.877 | 0.207 | — |
| R01271 | undefined | 11x11 | 66 | 4 | ✗ | 288115ms | 0.806 | 0.17 | — |
| R01336 | undefined | 14x14 | 103 | 7 | ✗ | 144355ms | 0.751 | 0.16 | — |

### Simplest but hardest

_none_

### Most complex but easiest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| R01219 | undefined | 13x13 | 88 | 3 | ✓ | 455ms | 0.781 | 0.152 | portalFirstTransfer@dfs |
| R01616 | undefined | 11x11 | 69 | 4 | ✓ | 746ms | 0.855 | 0.204 | perimeterSweep/perimeterCW@dfs |
| R00058 | undefined | 14x14 | 99 | 3 | ✓ | 910ms | 0.761 | 0.272 | portalFirstTransfer@dfs |
| R00822 | undefined | 11x11 | 72 | 3 | ✓ | 951ms | 0.776 | 0.227 | portalFirstTransfer@dfs |
| R01349 | undefined | 11x11 | 65 | 5 | ✓ | 2875ms | 0.796 | 0.229 | intersectionHarvest@beam2000 |
| R02000 | undefined | 12x12 | 81 | 5 | ✓ | 3128ms | 0.773 | 0.19 | objectiveFirst@dfs |
| R01299 | undefined | 11x11 | 69 | 4 | ✓ | 3476ms | 0.769 | 0.196 | intersectionHarvest@beam2000 |

### Largest prediction errors

- **S00107** (E) predicted 0.833 vs actual 0.391 — 47ms
- **S00115** (E) predicted 0.26 vs actual 0.667 — 740ms
- **S00120** (E) predicted 0.352 vs actual 0.757 — 1798ms
- **S00108** (E) predicted 0.846 vs actual 0.49 — 127ms
- **S00111** (E) predicted 0.428 vs actual 0.722 — 1273ms
- **S00109** (E) predicted 0.596 vs actual 0.372 — 39ms
- **S00133** (F) predicted 0.115 vs actual 0.321 — 23ms
- **S00095** (D) predicted 0.826 vs actual 0.622 — 474ms

## Recommended permanent regression set

- **R00408** (undefined): unsolved within budget
- **R00522** (undefined): unsolved within budget
- **R00581** (undefined): unsolved within budget
- **R00600** (undefined): unsolved within budget
- **R00716** (undefined): unsolved within budget
- **R00855** (undefined): unsolved within budget
- **R01189** (undefined): unsolved within budget
- **R01195** (undefined): unsolved within budget
- **R01271** (undefined): unsolved within budget
- **R01336** (undefined): unsolved within budget
- **R01407** (undefined): unsolved within budget
- **R01620** (undefined): unsolved within budget
- **R01675** (undefined): unsolved within budget
- **R01756** (undefined): unsolved within budget
- **R01844** (undefined): unsolved within budget
- **R01875** (undefined): unsolved within budget
- **R01943** (undefined): unsolved within budget
- **S00048** (B): slow solve (42243ms)
- **R01689** (undefined): slow solve (42061ms)
- **R00904** (undefined): slow solve (33043ms)
- **R01830** (undefined): slow solve (28430ms)
- **R01478** (undefined): slow solve (27549ms)
- **R01696** (undefined): slow solve (26238ms)
- **R00771** (undefined): slow solve (25332ms)

# Stress-corpus batch analysis

Generated 2026-07-11T13:50:12.646Z — corpus `data/stress/stress-levels.json` (generator v1.0.0), benchmark `reports/stress/benchmark-latest.json` at 20000ms budget.

**Totals:** 102 levels · 85 solved · 17 unsolved · global median runtime 5333ms.

## Per-batch results

| Batch | Theory | N | Solve | Timeout | Median | p95 | Max | Avg nodes | Novelty | Complexity | Pred. | Actual | Spearman | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | historical-solver-pain | 1 | 100% | 0% | 693ms | 693ms | 693ms | 23 | 0.198 | 0.487 | 0.665 | 0.661 | 0 | **discard-or-rework** |
| B | structural-complexity | 4 | 100% | 0% | 20432ms | 38405ms | 41327ms | 8059097 | 0.268 | 0.797 | 0.878 | 0.977 | 0.2 | **expand** |
| C | deceptive-simplicity | 5 | 100% | 0% | 2014ms | 4014ms | 4513ms | 1212683 | 0.161 | 0.148 | 0.694 | 0.729 | 0.6 | **discard-or-rework** |
| D | novel-topology | 3 | 100% | 0% | 644ms | 20760ms | 22995ms | 2173709 | 0.207 | 0.319 | 0.785 | 0.755 | 0.5 | **discard-or-rework** |
| E | anti-heuristic | 8 | 100% | 0% | 148ms | 1491ms | 1609ms | 498295 | 0.17 | 0.347 | 0.601 | 0.53 | -0.524 | **discard-or-rework** |
| F | wild-witness | 2 | 100% | 0% | 790ms | 1485ms | 1562ms | 547033 | 0.231 | 0.294 | 0.415 | 0.52 | 0 | **discard-or-rework** |
| undefined | undefined | 79 | 79% | 22% | 7947ms | 285719ms | 291733ms | 19762044 | 0.191 | 0.694 | NaN | 0.872 | 0.17 | **expand** |

### Batch A — historical-solver-pain

> Audit history shows solve time correlates with specific feature regimes (high reqInt at mid-to-high density, must-cross + flipper combinations, long paths). A ridge model fitted on logs/solver-workflow/latest.json steers generation toward the feature combinations that were historically slow; only candidates in the top predicted-cost band are accepted.

Prediction accuracy: Pearson 0, Spearman 0, mean |error| 0.004.

Strongest solver failures: S00001 (693ms).
Weakest (solver shrugged): S00001 (693ms).

### Batch B — structural-complexity

> Ignore historical solve times entirely; maximize the interaction between mechanics (portals feeding flipper corridors, must-cross knots beside landmark cages, multi-mechanic cells within tight radii). Tests whether rich mechanic interaction — not raw object count — degrades orchestration.

Prediction accuracy: Pearson -0.127, Spearman 0.2, mean |error| 0.099.

Strongest solver failures: S00048 (41327ms), S00030 (21850ms), S00035 (19013ms).
Weakest (solver shrugged): S00028 (8543ms), S00035 (19013ms), S00030 (21850ms).

### Batch C — deceptive-simplicity

> Few or no objects; the search space explodes from geometry alone — open mid-density grids where reqLen/reqInt admit an enormous number of plausible near-solutions and the heuristic gradient (goal attraction, perimeter bias) is uninformative. Structural complexity is intentionally low while predicted challenge is unknown-to-high.

Prediction accuracy: Pearson 0.961, Spearman 0.6, mean |error| 0.087.

Strongest solver failures: S00069 (4513ms), S00055 (2020ms), S00065 (2014ms).
Weakest (solver shrugged): S00064 (129ms), S00057 (2012ms), S00065 (2014ms).

### Batch D — novel-topology

> Generate witness paths geometrically unlike the existing solution families (hint corpus), then wrap minimal rules around them. If the solver generalizes, novel solution shapes should cost no more than familiar ones; systematic slowdowns here indicate the heuristics overfit known witness geometry.

Prediction accuracy: Pearson 0.648, Spearman 0.5, mean |error| 0.113.

Strongest solver failures: S00099 (22995ms), S00087 (644ms), S00095 (427ms).
Weakest (solver shrugged): S00095 (427ms), S00087 (644ms), S00099 (22995ms).

### Batch E — anti-heuristic

> Deliberately oppose the attempt policy in solver/attempts.ts: bait the near-closure rule with delayed closure, force interior routing where perimeter templates lead, starve multi-gate budget division below the reqLen>=90 floor, trigger the flipper diverse-beam ladder on levels a plain DFS would crush, and game the navDensity archetype thresholds with hazard padding.

Prediction accuracy: Pearson -0.649, Spearman -0.524, mean |error| 0.34.

Strongest solver failures: S00120 (1609ms), S00111 (1272ms), S00115 (610ms).
Weakest (solver shrugged): S00109 (32ms), S00107 (42ms), S00114 (48ms).

### Batch F — wild-witness

> Draw witness paths and rule wrappers from maximally wide, human-aesthetic-free parameter distributions (extreme aspect ratios, tiny and huge grids, arbitrary mechanic mixes). No hypothesis beyond: the corners of level-space that no author would draw are where generalization failures hide.

Prediction accuracy: Pearson 0, Spearman 0, mean |error| 0.105.

Strongest solver failures: S00140 (1562ms), S00133 (18ms).
Weakest (solver shrugged): S00133 (18ms), S00140 (1562ms).

### Batch undefined — undefined

> undefined

Prediction accuracy: Pearson 0, Spearman 0.17, mean |error| NaN.

Strongest solver failures: R00581 (unsolved), R00408 (unsolved), R01195 (unsolved).
Weakest (solver shrugged): R00060 (263ms), R01227 (347ms), R01219 (373ms).

## Highlights

### Most novel

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S00028 | B | 15x15 | 90 | 8 | ✓ | 8543ms | 0.816 | 0.321 | repair@dfs(repair-biased) |
| R00058 | undefined | 14x14 | 99 | 3 | ✓ | 866ms | 0.761 | 0.272 | portalFirstTransfer@dfs |
| S00030 | B | 13x13 | 87 | 8 | ✓ | 21850ms | 0.778 | 0.269 | intersectionHarvest@beam5000(diverse) |
| R00525 | undefined | 11x11 | 66 | 0 | ✓ | 17043ms | 0.752 | 0.264 | perimeterSweep/perimeterCW@dfs |
| S00133 | F | 4x4 | 10 | 0 | ✓ | 18ms | 0.158 | 0.26 | perimeterSweep/cornerHarvest@dfs |
| S00048 | B | 15x15 | 103 | 7 | ✓ | 41327ms | 0.795 | 0.255 | repair@dfs(repair) |
| R00060 | undefined | 12x12 | 73 | 5 | ✓ | 263ms | 0.503 | 0.253 | perimeterSweep/perimeterCW@beam2000 |
| R00581 | undefined | 11x11 | 63 | 3 | ✗ | 291733ms | 0.79 | 0.233 | — |

### Most solver-hostile

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| R00408 | undefined | 11x11 | 76 | 6 | ✗ | 288059ms | 0.824 | 0.178 | — |
| R00522 | undefined | 12x12 | 68 | 5 | ✗ | 273999ms | 0.681 | 0.165 | — |
| R00581 | undefined | 11x11 | 63 | 3 | ✗ | 291733ms | 0.79 | 0.233 | — |
| R00600 | undefined | 11x11 | 67 | 2 | ✗ | 143183ms | 0.799 | 0.232 | — |
| R00716 | undefined | 11x11 | 65 | 4 | ✗ | 286067ms | 0.874 | 0.225 | — |
| R00855 | undefined | 11x11 | 78 | 5 | ✗ | 139409ms | 0.738 | 0.162 | — |
| R01189 | undefined | 13x13 | 81 | 10 | ✗ | 284270ms | 0.792 | 0.211 | — |
| R01195 | undefined | 12x12 | 99 | 8 | ✗ | 286440ms | 0.877 | 0.207 | — |
| R01271 | undefined | 11x11 | 66 | 4 | ✗ | 285680ms | 0.806 | 0.17 | — |
| R01336 | undefined | 14x14 | 103 | 7 | ✗ | 144404ms | 0.751 | 0.16 | — |

### Simplest but hardest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S00099 | D | 14x14 | 104 | 9 | ✓ | 22995ms | 0.337 | 0.19 | repair@dfs(repair) |

### Most complex but easiest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| R01219 | undefined | 13x13 | 88 | 3 | ✓ | 373ms | 0.781 | 0.152 | portalFirstTransfer@dfs |
| R01616 | undefined | 11x11 | 69 | 4 | ✓ | 605ms | 0.855 | 0.204 | perimeterSweep/perimeterCW@dfs |
| R00058 | undefined | 14x14 | 99 | 3 | ✓ | 866ms | 0.761 | 0.272 | portalFirstTransfer@dfs |
| R00822 | undefined | 11x11 | 72 | 3 | ✓ | 913ms | 0.776 | 0.227 | portalFirstTransfer@dfs |
| R00064 | undefined | 14x14 | 100 | 5 | ✓ | 2238ms | 0.78 | 0.231 | perimeterSweep/perimeterCW@beam2000 |
| R01349 | undefined | 11x11 | 65 | 5 | ✓ | 2331ms | 0.796 | 0.229 | intersectionHarvest@beam2000 |
| R02000 | undefined | 12x12 | 81 | 5 | ✓ | 2644ms | 0.773 | 0.19 | objectiveFirst@dfs |
| R01299 | undefined | 11x11 | 69 | 4 | ✓ | 3331ms | 0.769 | 0.196 | intersectionHarvest@beam2000 |

### Largest prediction errors

- **S00107** (E) predicted 0.833 vs actual 0.38 — 42ms
- **S00120** (E) predicted 0.352 vs actual 0.746 — 1609ms
- **S00115** (E) predicted 0.26 vs actual 0.648 — 610ms
- **S00108** (E) predicted 0.846 vs actual 0.461 — 95ms
- **S00103** (E) predicted 0.906 vs actual 0.535 — 200ms
- **S00111** (E) predicted 0.428 vs actual 0.722 — 1272ms
- **S00109** (E) predicted 0.596 vs actual 0.353 — 32ms
- **S00095** (D) predicted 0.826 vs actual 0.612 — 427ms

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
- **S00048** (B): slow solve (41327ms)
- **R01689** (undefined): slow solve (41232ms)
- **R00904** (undefined): slow solve (33458ms)
- **R01478** (undefined): slow solve (28956ms)
- **R01696** (undefined): slow solve (27377ms)
- **R01830** (undefined): slow solve (27050ms)
- **R00771** (undefined): slow solve (24571ms)

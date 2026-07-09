# Stress-corpus batch analysis

Generated 2026-07-09T01:14:00.963Z — corpus `stress/stress-levels.json` (generator v1.0.0), benchmark `stress/reports/benchmark-latest.json` at 20000ms budget.

**Totals:** 150 levels · 150 solved · 0 unsolved · global median runtime 507ms.

## Per-batch results

| Batch | Theory | N | Solve | Timeout | Median | p95 | Max | Avg nodes | Novelty | Complexity | Pred. | Actual | Spearman | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | historical-solver-pain | 25 | 100% | 0% | 1316ms | 2688ms | 6383ms | 17839 | 0.195 | 0.508 | 0.839 | 0.698 | 0.804 | **refine** |
| B | structural-complexity | 25 | 100% | 0% | 9353ms | 72481ms | 144164ms | 3178736 | 0.257 | 0.757 | 0.858 | 0.907 | 0.426 | **expand** |
| C | deceptive-simplicity | 25 | 100% | 0% | 89ms | 1880ms | 4377ms | 719813 | 0.168 | 0.163 | 0.716 | 0.518 | 0.319 | **discard-or-rework** |
| D | novel-topology | 25 | 100% | 0% | 33ms | 7127ms | 21041ms | 1137010 | 0.212 | 0.235 | 0.729 | 0.474 | 0.352 | **discard-or-rework** |
| E | anti-heuristic | 25 | 100% | 0% | 238ms | 7540ms | 14393ms | 608133 | 0.168 | 0.372 | 0.747 | 0.561 | 0.225 | **discard-or-rework** |
| F | wild-witness | 25 | 100% | 0% | 10ms | 13462ms | 30864ms | 975280 | 0.254 | 0.399 | 0.723 | 0.408 | 0.602 | **discard-or-rework** |

### Batch A — historical-solver-pain

> Audit history shows solve time correlates with specific feature regimes (high reqInt at mid-to-high density, must-cross + flipper combinations, long paths). A ridge model fitted on audits/raw/latest.json steers generation toward the feature combinations that were historically slow; only candidates in the top predicted-cost band are accepted.

Prediction accuracy: Pearson 0.767, Spearman 0.804, mean |error| 0.141.

Strongest solver failures: S004 (6383ms), S017 (2704ms), S002 (2626ms).
Weakest (solver shrugged): S016 (150ms), S011 (290ms), S013 (303ms).

### Batch B — structural-complexity

> Ignore historical solve times entirely; maximize the interaction between mechanics (portals feeding flipper corridors, must-cross knots beside landmark cages, multi-mechanic cells within tight radii). Tests whether rich mechanic interaction — not raw object count — degrades orchestration.

Prediction accuracy: Pearson 0.248, Spearman 0.426, mean |error| 0.095.

Strongest solver failures: S043 (144164ms), S030 (73088ms), S033 (70054ms).
Weakest (solver shrugged): S028 (1206ms), S041 (1736ms), S037 (1797ms).

### Batch C — deceptive-simplicity

> Few or no objects; the search space explodes from geometry alone — open mid-density grids where reqLen/reqInt admit an enormous number of plausible near-solutions and the heuristic gradient (goal attraction, perimeter bias) is uninformative. Structural complexity is intentionally low while predicted challenge is unknown-to-high.

Prediction accuracy: Pearson 0.217, Spearman 0.319, mean |error| 0.222.

Strongest solver failures: S069 (4377ms), S075 (1880ms), S055 (1879ms).
Weakest (solver shrugged): S058 (9ms), S066 (12ms), S053 (18ms).

### Batch D — novel-topology

> Generate witness paths geometrically unlike the existing solution families (hint corpus), then wrap minimal rules around them. If the solver generalizes, novel solution shapes should cost no more than familiar ones; systematic slowdowns here indicate the heuristics overfit known witness geometry.

Prediction accuracy: Pearson 0.67, Spearman 0.352, mean |error| 0.279.

Strongest solver failures: S099 (21041ms), S095 (8168ms), S076 (2962ms).
Weakest (solver shrugged): S091 (4ms), S080 (6ms), S098 (8ms).

### Batch E — anti-heuristic

> Deliberately oppose the attempt policy in solver/attempts.ts: bait the near-closure rule with delayed closure, force interior routing where perimeter templates lead, starve multi-gate budget division below the reqLen>=90 floor, trigger the flipper diverse-beam ladder on levels a plain DFS would crush, and game the navDensity archetype thresholds with hazard padding.

Prediction accuracy: Pearson 0.029, Spearman 0.225, mean |error| 0.27.

Strongest solver failures: S118 (14393ms), S123 (9092ms), S102 (1332ms).
Weakest (solver shrugged): S113 (8ms), S116 (8ms), S106 (10ms).

### Batch F — wild-witness

> Draw witness paths and rule wrappers from maximally wide, human-aesthetic-free parameter distributions (extreme aspect ratios, tiny and huge grids, arbitrary mechanic mixes). No hypothesis beyond: the corners of level-space that no author would draw are where generalization failures hide.

Prediction accuracy: Pearson 0.469, Spearman 0.602, mean |error| 0.349.

Strongest solver failures: S143 (30864ms), S142 (14565ms), S148 (9049ms).
Weakest (solver shrugged): S126 (2ms), S129 (2ms), S141 (2ms).

## Highlights

### Most novel

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S129 | F | 12x4 | 4 | 0 | ✓ | 2ms | 0.495 | 0.363 | nearClosureRescue@dfs |
| S141 | F | 6x7 | 9 | 0 | ✓ | 2ms | 0.458 | 0.337 | nearClosureRescue@dfs |
| S126 | F | 6x4 | 6 | 0 | ✓ | 2ms | 0.4 | 0.333 | nearClosureRescue@dfs |
| S150 | F | 4x5 | 15 | 1 | ✓ | 5ms | 0.508 | 0.323 | perimeterSweep/cornerHarvest@dfs |
| S028 | B | 15x15 | 90 | 8 | ✓ | 1206ms | 0.816 | 0.321 | objectiveFirst@beam2000 |
| S027 | B | 14x10 | 73 | 6 | ✓ | 4219ms | 0.78 | 0.319 | intersectionHarvest@beam5000 |
| S136 | F | 3x13 | 11 | 0 | ✓ | 5ms | 0.41 | 0.317 | nearClosureRescue@dfs |
| S139 | F | 5x13 | 42 | 3 | ✓ | 346ms | 0.459 | 0.31 | perimeterSweep/cornerHarvest@dfs |

### Most solver-hostile

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S043 | B | 14x13 | 71 | 8 | ✓ | 144164ms | 0.798 | 0.259 | repair@dfs |
| S030 | B | 13x13 | 87 | 8 | ✓ | 73088ms | 0.778 | 0.269 | repair@dfs |
| S033 | B | 14x10 | 68 | 3 | ✓ | 70054ms | 0.794 | 0.284 | repair@dfs |
| S047 | B | 13x12 | 80 | 6 | ✓ | 61737ms | 0.815 | 0.244 | repair@dfs |
| S048 | B | 15x15 | 103 | 7 | ✓ | 36339ms | 0.795 | 0.255 | repair@dfs |
| S143 | F | 15x9 | 82 | 12 | ✓ | 30864ms | 0.485 | 0.201 | repair@dfs |
| S031 | B | 14x11 | 62 | 6 | ✓ | 22271ms | 0.761 | 0.298 | repair@dfs |
| S044 | B | 14x15 | 95 | 7 | ✓ | 21118ms | 0.821 | 0.247 | repair@dfs |
| S099 | D | 14x14 | 104 | 9 | ✓ | 21041ms | 0.337 | 0.19 | repair@dfs |
| S046 | B | 13x10 | 74 | 5 | ✓ | 21033ms | 0.76 | 0.224 | repair@dfs |

### Simplest but hardest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S069 | C | 15x15 | 97 | 2 | ✓ | 4377ms | 0.163 | 0.152 | perimeterSweep/sideCommitment@dfs |

### Most complex but easiest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S129 | F | 12x4 | 4 | 0 | ✓ | 2ms | 0.495 | 0.363 | nearClosureRescue@dfs |
| S150 | F | 4x5 | 15 | 1 | ✓ | 5ms | 0.508 | 0.323 | perimeterSweep/cornerHarvest@dfs |
| S113 | E | 15x14 | 62 | 4 | ✓ | 8ms | 0.523 | 0.175 | portalFirstTransfer@dfs |
| S104 | E | 7x8 | 26 | 2 | ✓ | 66ms | 0.539 | 0.237 | intersectionHarvest@beam5000 |
| S149 | F | 5x12 | 29 | 1 | ✓ | 88ms | 0.506 | 0.293 | perimeterSweep/cornerHarvest@dfs |
| S119 | E | 7x9 | 29 | 4 | ✓ | 116ms | 0.556 | 0.198 | intersectionHarvest@beam5000 |
| S130 | F | 15x13 | 74 | 5 | ✓ | 235ms | 0.516 | 0.223 | portalFirstTransfer@dfs |
| S013 | A | 10x9 | 40 | 5 | ✓ | 303ms | 0.602 | 0.252 | perimeterSweep/cornerHarvest@dfs |

### Largest prediction errors

- **S141** (F) predicted 0.8 vs actual 0.111 — 2ms
- **S129** (F) predicted 0.76 vs actual 0.111 — 2ms
- **S113** (E) predicted 0.86 vs actual 0.222 — 8ms
- **S150** (F) predicted 0.78 vs actual 0.181 — 5ms
- **S126** (F) predicted 0.7 vs actual 0.111 — 2ms
- **S144** (F) predicted 0.7 vs actual 0.111 — 2ms
- **S091** (D) predicted 0.7 vs actual 0.163 — 4ms
- **S127** (F) predicted 0.7 vs actual 0.163 — 4ms

## Recommended permanent regression set

- **S043** (B): slow solve (144164ms)
- **S030** (B): slow solve (73088ms)
- **S033** (B): slow solve (70054ms)
- **S047** (B): slow solve (61737ms)
- **S048** (B): slow solve (36339ms)
- **S143** (F): slow solve (30864ms)
- **S031** (B): slow solve (22271ms)
- **S044** (B): slow solve (21118ms)
- **S069** (C): deceptively simple

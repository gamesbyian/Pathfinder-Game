# Stress-corpus batch analysis

Generated 2026-07-09T02:58:37.478Z — corpus `stress/stress-levels.json` (generator v1.0.0), benchmark `stress/reports/benchmark-latest.json` at 20000ms budget.

**Totals:** 150 levels · 150 solved · 0 unsolved · global median runtime 136ms.

## Per-batch results

| Batch | Theory | N | Solve | Timeout | Median | p95 | Max | Avg nodes | Novelty | Complexity | Pred. | Actual | Spearman | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | historical-solver-pain | 25 | 100% | 0% | 157ms | 3463ms | 8707ms | 99968 | 0.195 | 0.508 | 0.839 | 0.541 | 0.115 | **discard-or-rework** |
| B | structural-complexity | 25 | 100% | 0% | 1734ms | 62612ms | 77516ms | 1680421 | 0.257 | 0.757 | 0.858 | 0.773 | 0.193 | **expand** |
| C | deceptive-simplicity | 25 | 100% | 0% | 90ms | 1880ms | 4377ms | 814979 | 0.168 | 0.163 | 0.716 | 0.52 | 0.323 | **discard-or-rework** |
| D | novel-topology | 25 | 100% | 0% | 35ms | 1610ms | 3041ms | 372936 | 0.212 | 0.235 | 0.729 | 0.418 | 0.094 | **discard-or-rework** |
| E | anti-heuristic | 25 | 100% | 0% | 63ms | 8431ms | 14410ms | 713139 | 0.168 | 0.372 | 0.747 | 0.468 | 0.202 | **discard-or-rework** |
| F | wild-witness | 25 | 100% | 0% | 11ms | 8884ms | 32149ms | 936338 | 0.254 | 0.399 | 0.723 | 0.398 | 0.525 | **discard-or-rework** |

### Batch A — historical-solver-pain

> Audit history shows solve time correlates with specific feature regimes (high reqInt at mid-to-high density, must-cross + flipper combinations, long paths). A ridge model fitted on audits/raw/latest.json steers generation toward the feature combinations that were historically slow; only candidates in the top predicted-cost band are accepted.

Prediction accuracy: Pearson 0.18, Spearman 0.115, mean |error| 0.299.

Strongest solver failures: S004 (8707ms), S018 (4111ms), S023 (872ms).
Weakest (solver shrugged): S021 (26ms), S020 (34ms), S006 (35ms).

### Batch B — structural-complexity

> Ignore historical solve times entirely; maximize the interaction between mechanics (portals feeding flipper corridors, must-cross knots beside landmark cages, multi-mechanic cells within tight radii). Tests whether rich mechanic interaction — not raw object count — degrades orchestration.

Prediction accuracy: Pearson 0.108, Spearman 0.193, mean |error| 0.17.

Strongest solver failures: S030 (77516ms), S047 (68753ms), S048 (38047ms).
Weakest (solver shrugged): S036 (67ms), S037 (153ms), S035 (176ms).

### Batch C — deceptive-simplicity

> Few or no objects; the search space explodes from geometry alone — open mid-density grids where reqLen/reqInt admit an enormous number of plausible near-solutions and the heuristic gradient (goal attraction, perimeter bias) is uninformative. Structural complexity is intentionally low while predicted challenge is unknown-to-high.

Prediction accuracy: Pearson 0.224, Spearman 0.323, mean |error| 0.22.

Strongest solver failures: S069 (4377ms), S055 (1881ms), S065 (1878ms).
Weakest (solver shrugged): S058 (6ms), S066 (12ms), S053 (19ms).

### Batch D — novel-topology

> Generate witness paths geometrically unlike the existing solution families (hint corpus), then wrap minimal rules around them. If the solver generalizes, novel solution shapes should cost no more than familiar ones; systematic slowdowns here indicate the heuristics overfit known witness geometry.

Prediction accuracy: Pearson 0.403, Spearman 0.094, mean |error| 0.321.

Strongest solver failures: S076 (3041ms), S077 (1728ms), S099 (1136ms).
Weakest (solver shrugged): S091 (2ms), S083 (6ms), S098 (6ms).

### Batch E — anti-heuristic

> Deliberately oppose the attempt policy in solver/attempts.ts: bait the near-closure rule with delayed closure, force interior routing where perimeter templates lead, starve multi-gate budget division below the reqLen>=90 floor, trigger the flipper diverse-beam ladder on levels a plain DFS would crush, and game the navDensity archetype thresholds with hazard padding.

Prediction accuracy: Pearson 0.038, Spearman 0.202, mean |error| 0.347.

Strongest solver failures: S118 (14410ms), S123 (10028ms), S110 (2042ms).
Weakest (solver shrugged): S116 (7ms), S106 (8ms), S113 (8ms).

### Batch F — wild-witness

> Draw witness paths and rule wrappers from maximally wide, human-aesthetic-free parameter distributions (extreme aspect ratios, tiny and huge grids, arbitrary mechanic mixes). No hypothesis beyond: the corners of level-space that no author would draw are where generalization failures hide.

Prediction accuracy: Pearson 0.441, Spearman 0.525, mean |error| 0.357.

Strongest solver failures: S143 (32149ms), S148 (9074ms), S137 (8124ms).
Weakest (solver shrugged): S136 (2ms), S141 (3ms), S144 (3ms).

## Highlights

### Most novel

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S129 | F | 12x4 | 4 | 0 | ✓ | 5ms | 0.495 | 0.363 | nearClosureRescue@dfs |
| S141 | F | 6x7 | 9 | 0 | ✓ | 3ms | 0.458 | 0.337 | nearClosureRescue@dfs |
| S126 | F | 6x4 | 6 | 0 | ✓ | 5ms | 0.4 | 0.333 | nearClosureRescue@dfs |
| S150 | F | 4x5 | 15 | 1 | ✓ | 3ms | 0.508 | 0.323 | perimeterSweep/cornerHarvest@dfs |
| S028 | B | 15x15 | 90 | 8 | ✓ | 1205ms | 0.816 | 0.321 | repair@dfs(repair) |
| S027 | B | 14x10 | 73 | 6 | ✓ | 11058ms | 0.78 | 0.319 | intersectionHarvest@beam5000(diverse) |
| S136 | F | 3x13 | 11 | 0 | ✓ | 2ms | 0.41 | 0.317 | nearClosureRescue@dfs |
| S139 | F | 5x13 | 42 | 3 | ✓ | 345ms | 0.459 | 0.31 | perimeterSweep/cornerHarvest@dfs |

### Most solver-hostile

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S030 | B | 13x13 | 87 | 8 | ✓ | 77516ms | 0.778 | 0.269 | repair@dfs(repair) |
| S047 | B | 13x12 | 80 | 6 | ✓ | 68753ms | 0.815 | 0.244 | repair@dfs(repair) |
| S048 | B | 15x15 | 103 | 7 | ✓ | 38047ms | 0.795 | 0.255 | repair@dfs(repair) |
| S143 | F | 15x9 | 82 | 12 | ✓ | 32149ms | 0.485 | 0.201 | repair@dfs(repair) |
| S032 | B | 10x12 | 66 | 6 | ✓ | 16574ms | 0.783 | 0.251 | perimeterSweep/perimeterCCW@dfs |
| S118 | E | 15x12 | 78 | 6 | ✓ | 14410ms | 0.372 | 0.15 | knotBuilder@dfs |
| S050 | B | 14x10 | 79 | 5 | ✓ | 13999ms | 0.827 | 0.222 | objectiveFirst@beam5000(diverse) |
| S027 | B | 14x10 | 73 | 6 | ✓ | 11058ms | 0.78 | 0.319 | intersectionHarvest@beam5000(diverse) |
| S123 | E | 15x12 | 82 | 6 | ✓ | 10028ms | 0.451 | 0.161 | perimeterSweep/perimeterCCW@dfs |
| S026 | B | 15x13 | 92 | 8 | ✓ | 9964ms | 0.747 | 0.226 | intersectionHarvest@beam5000(diverse) |

### Simplest but hardest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S069 | C | 15x15 | 97 | 2 | ✓ | 4377ms | 0.163 | 0.152 | perimeterSweep/sideCommitment@dfs |
| S110 | E | 11x12 | 78 | 7 | ✓ | 2042ms | 0.219 | 0.151 | objectiveFirst@beam5000 |
| S055 | C | 11x11 | 70 | 2 | ✓ | 1881ms | 0.089 | 0.153 | perimeterSweep/perimeterCCW@dfs |
| S065 | C | 14x14 | 90 | 1 | ✓ | 1878ms | 0.174 | 0.165 | perimeterSweep/perimeterCCW@dfs |
| S071 | C | 13x15 | 97 | 2 | ✓ | 1878ms | 0.2 | 0.157 | perimeterSweep/perimeterCW@dfs |
| S075 | C | 13x15 | 99 | 2 | ✓ | 1878ms | 0.251 | 0.16 | perimeterSweep/perimeterCW@dfs |
| S057 | C | 13x13 | 91 | 2 | ✓ | 1877ms | 0.15 | 0.158 | perimeterSweep/perimeterCCW@dfs |
| S077 | D | 11x15 | 53 | 0 | ✓ | 1728ms | 0.229 | 0.24 | harvestThenFinish@dfs |

### Most complex but easiest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S150 | F | 4x5 | 15 | 1 | ✓ | 3ms | 0.508 | 0.323 | perimeterSweep/cornerHarvest@dfs |
| S129 | F | 12x4 | 4 | 0 | ✓ | 5ms | 0.495 | 0.363 | nearClosureRescue@dfs |
| S113 | E | 15x14 | 62 | 4 | ✓ | 8ms | 0.523 | 0.175 | portalFirstTransfer@dfs |
| S119 | E | 7x9 | 29 | 4 | ✓ | 25ms | 0.556 | 0.198 | repair@dfs(repair) |
| S021 | A | 10x11 | 64 | 9 | ✓ | 26ms | 0.488 | 0.168 | repair@dfs(repair) |
| S020 | A | 9x10 | 53 | 5 | ✓ | 34ms | 0.507 | 0.17 | repair@dfs(repair) |
| S015 | A | 11x12 | 87 | 11 | ✓ | 64ms | 0.528 | 0.174 | repair@dfs(repair) |
| S036 | B | 12x15 | 96 | 6 | ✓ | 67ms | 0.647 | 0.253 | repair@dfs(repair) |

### Largest prediction errors

- **S141** (F) predicted 0.8 vs actual 0.14 — 3ms
- **S150** (F) predicted 0.78 vs actual 0.14 — 3ms
- **S113** (E) predicted 0.86 vs actual 0.222 — 8ms
- **S117** (E) predicted 0.91 vs actual 0.302 — 19ms
- **S091** (D) predicted 0.7 vs actual 0.111 — 2ms
- **S136** (F) predicted 0.7 vs actual 0.111 — 2ms
- **S129** (F) predicted 0.76 vs actual 0.181 — 5ms
- **S107** (E) predicted 0.833 vs actual 0.259 — 12ms

## Recommended permanent regression set

- **S030** (B): slow solve (77516ms)
- **S047** (B): slow solve (68753ms)
- **S048** (B): slow solve (38047ms)
- **S143** (F): slow solve (32149ms)
- **S032** (B): slow solve (16574ms)
- **S118** (E): slow solve (14410ms)
- **S050** (B): slow solve (13999ms)
- **S027** (B): slow solve (11058ms)
- **S069** (C): deceptively simple
- **S110** (E): deceptively simple
- **S055** (C): deceptively simple
- **S065** (C): deceptively simple

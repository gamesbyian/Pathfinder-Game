# Stress-corpus batch analysis

Generated 2026-07-09T04:18:58.600Z — corpus `stress/stress-levels.json` (generator v1.0.0), benchmark `stress/reports/benchmark-latest.json` at 20000ms budget.

**Totals:** 150 levels · 150 solved · 0 unsolved · global median runtime 109ms.

## Per-batch results

| Batch | Theory | N | Solve | Timeout | Median | p95 | Max | Avg nodes | Novelty | Complexity | Pred. | Actual | Spearman | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | historical-solver-pain | 25 | 100% | 0% | 141ms | 3182ms | 8073ms | 144706 | 0.195 | 0.508 | 0.839 | 0.519 | 0.108 | **discard-or-rework** |
| B | structural-complexity | 25 | 100% | 0% | 3453ms | 81484ms | 184614ms | 4946856 | 0.257 | 0.757 | 0.858 | 0.761 | 0.22 | **expand** |
| C | deceptive-simplicity | 25 | 100% | 0% | 96ms | 1881ms | 4377ms | 814979 | 0.168 | 0.163 | 0.716 | 0.523 | 0.305 | **discard-or-rework** |
| D | novel-topology | 25 | 100% | 0% | 34ms | 1627ms | 3218ms | 372936 | 0.212 | 0.235 | 0.729 | 0.42 | 0.118 | **discard-or-rework** |
| E | anti-heuristic | 25 | 100% | 0% | 53ms | 8435ms | 14474ms | 708689 | 0.168 | 0.372 | 0.747 | 0.453 | 0.235 | **discard-or-rework** |
| F | wild-witness | 25 | 100% | 0% | 11ms | 8883ms | 30830ms | 946050 | 0.254 | 0.399 | 0.723 | 0.396 | 0.507 | **discard-or-rework** |

### Batch A — historical-solver-pain

> Audit history shows solve time correlates with specific feature regimes (high reqInt at mid-to-high density, must-cross + flipper combinations, long paths). A ridge model fitted on audits/raw/latest.json steers generation toward the feature combinations that were historically slow; only candidates in the top predicted-cost band are accepted.

Prediction accuracy: Pearson 0.145, Spearman 0.108, mean |error| 0.32.

Strongest solver failures: S004 (8073ms), S018 (3773ms), S023 (819ms).
Weakest (solver shrugged): S021 (19ms), S006 (30ms), S020 (31ms).

### Batch B — structural-complexity

> Ignore historical solve times entirely; maximize the interaction between mechanics (portals feeding flipper corridors, must-cross knots beside landmark cages, multi-mechanic cells within tight radii). Tests whether rich mechanic interaction — not raw object count — degrades orchestration.

Prediction accuracy: Pearson 0.117, Spearman 0.22, mean |error| 0.2.

Strongest solver failures: S033 (184614ms), S030 (84390ms), S046 (69859ms).
Weakest (solver shrugged): S036 (46ms), S040 (67ms), S037 (122ms).

### Batch C — deceptive-simplicity

> Few or no objects; the search space explodes from geometry alone — open mid-density grids where reqLen/reqInt admit an enormous number of plausible near-solutions and the heuristic gradient (goal attraction, perimeter bias) is uninformative. Structural complexity is intentionally low while predicted challenge is unknown-to-high.

Prediction accuracy: Pearson 0.224, Spearman 0.305, mean |error| 0.218.

Strongest solver failures: S069 (4377ms), S055 (1882ms), S057 (1878ms).
Weakest (solver shrugged): S058 (6ms), S066 (12ms), S074 (19ms).

### Batch D — novel-topology

> Generate witness paths geometrically unlike the existing solution families (hint corpus), then wrap minimal rules around them. If the solver generalizes, novel solution shapes should cost no more than familiar ones; systematic slowdowns here indicate the heuristics overfit known witness geometry.

Prediction accuracy: Pearson 0.403, Spearman 0.118, mean |error| 0.32.

Strongest solver failures: S076 (3218ms), S077 (1743ms), S099 (1163ms).
Weakest (solver shrugged): S091 (3ms), S080 (5ms), S098 (6ms).

### Batch E — anti-heuristic

> Deliberately oppose the attempt policy in solver/attempts.ts: bait the near-closure rule with delayed closure, force interior routing where perimeter templates lead, starve multi-gate budget division below the reqLen>=90 floor, trigger the flipper diverse-beam ladder on levels a plain DFS would crush, and game the navDensity archetype thresholds with hazard padding.

Prediction accuracy: Pearson 0.026, Spearman 0.235, mean |error| 0.363.

Strongest solver failures: S118 (14474ms), S123 (10025ms), S110 (2073ms).
Weakest (solver shrugged): S106 (5ms), S109 (7ms), S113 (8ms).

### Batch F — wild-witness

> Draw witness paths and rule wrappers from maximally wide, human-aesthetic-free parameter distributions (extreme aspect ratios, tiny and huge grids, arbitrary mechanic mixes). No hypothesis beyond: the corners of level-space that no author would draw are where generalization failures hide.

Prediction accuracy: Pearson 0.415, Spearman 0.507, mean |error| 0.362.

Strongest solver failures: S143 (30830ms), S148 (9072ms), S137 (8126ms).
Weakest (solver shrugged): S141 (2ms), S126 (3ms), S129 (3ms).

## Highlights

### Most novel

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S129 | F | 12x4 | 4 | 0 | ✓ | 3ms | 0.495 | 0.363 | nearClosureRescue@dfs |
| S141 | F | 6x7 | 9 | 0 | ✓ | 2ms | 0.458 | 0.337 | nearClosureRescue@dfs |
| S126 | F | 6x4 | 6 | 0 | ✓ | 3ms | 0.4 | 0.333 | nearClosureRescue@dfs |
| S150 | F | 4x5 | 15 | 1 | ✓ | 4ms | 0.508 | 0.323 | perimeterSweep/cornerHarvest@dfs |
| S028 | B | 15x15 | 90 | 8 | ✓ | 701ms | 0.816 | 0.321 | repair@dfs(repair) |
| S027 | B | 14x10 | 73 | 6 | ✓ | 10755ms | 0.78 | 0.319 | intersectionHarvest@beam5000(diverse) |
| S136 | F | 3x13 | 11 | 0 | ✓ | 3ms | 0.41 | 0.317 | nearClosureRescue@dfs |
| S139 | F | 5x13 | 42 | 3 | ✓ | 257ms | 0.459 | 0.31 | perimeterSweep/cornerHarvest@dfs |

### Most solver-hostile

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S033 | B | 14x10 | 68 | 3 | ✓ | 184614ms | 0.794 | 0.284 | repair@dfs(repair-biased) |
| S030 | B | 13x13 | 87 | 8 | ✓ | 84390ms | 0.778 | 0.269 | repair@dfs(repair) |
| S046 | B | 13x10 | 74 | 5 | ✓ | 69859ms | 0.76 | 0.224 | repair@dfs(repair) |
| S048 | B | 15x15 | 103 | 7 | ✓ | 31258ms | 0.795 | 0.255 | repair@dfs(repair) |
| S143 | F | 15x9 | 82 | 12 | ✓ | 30830ms | 0.485 | 0.201 | repair@dfs(repair) |
| S047 | B | 13x12 | 80 | 6 | ✓ | 30783ms | 0.815 | 0.244 | repair@dfs(repair) |
| S032 | B | 10x12 | 66 | 6 | ✓ | 16330ms | 0.783 | 0.251 | perimeterSweep/perimeterCCW@dfs |
| S118 | E | 15x12 | 78 | 6 | ✓ | 14474ms | 0.372 | 0.15 | knotBuilder@dfs |
| S050 | B | 14x10 | 79 | 5 | ✓ | 13919ms | 0.827 | 0.222 | objectiveFirst@beam5000(diverse) |
| S027 | B | 14x10 | 73 | 6 | ✓ | 10755ms | 0.78 | 0.319 | intersectionHarvest@beam5000(diverse) |

### Simplest but hardest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S069 | C | 15x15 | 97 | 2 | ✓ | 4377ms | 0.163 | 0.152 | perimeterSweep/sideCommitment@dfs |
| S110 | E | 11x12 | 78 | 7 | ✓ | 2073ms | 0.219 | 0.151 | objectiveFirst@beam5000 |
| S055 | C | 11x11 | 70 | 2 | ✓ | 1882ms | 0.089 | 0.153 | perimeterSweep/perimeterCCW@dfs |
| S057 | C | 13x13 | 91 | 2 | ✓ | 1878ms | 0.15 | 0.158 | perimeterSweep/perimeterCCW@dfs |
| S065 | C | 14x14 | 90 | 1 | ✓ | 1878ms | 0.174 | 0.165 | perimeterSweep/perimeterCCW@dfs |
| S071 | C | 13x15 | 97 | 2 | ✓ | 1878ms | 0.2 | 0.157 | perimeterSweep/perimeterCW@dfs |
| S075 | C | 13x15 | 99 | 2 | ✓ | 1878ms | 0.251 | 0.16 | perimeterSweep/perimeterCW@dfs |
| S077 | D | 11x15 | 53 | 0 | ✓ | 1743ms | 0.229 | 0.24 | harvestThenFinish@dfs |

### Most complex but easiest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S129 | F | 12x4 | 4 | 0 | ✓ | 3ms | 0.495 | 0.363 | nearClosureRescue@dfs |
| S150 | F | 4x5 | 15 | 1 | ✓ | 4ms | 0.508 | 0.323 | perimeterSweep/cornerHarvest@dfs |
| S113 | E | 15x14 | 62 | 4 | ✓ | 8ms | 0.523 | 0.175 | portalFirstTransfer@dfs |
| S119 | E | 7x9 | 29 | 4 | ✓ | 9ms | 0.556 | 0.198 | repair@dfs(repair) |
| S021 | A | 10x11 | 64 | 9 | ✓ | 19ms | 0.488 | 0.168 | repair@dfs(repair) |
| S020 | A | 9x10 | 53 | 5 | ✓ | 31ms | 0.507 | 0.17 | repair@dfs(repair) |
| S036 | B | 12x15 | 96 | 6 | ✓ | 46ms | 0.647 | 0.253 | repair@dfs(repair) |
| S015 | A | 11x12 | 87 | 11 | ✓ | 47ms | 0.528 | 0.174 | repair@dfs(repair) |

### Largest prediction errors

- **S141** (F) predicted 0.8 vs actual 0.111 — 2ms
- **S117** (E) predicted 0.91 vs actual 0.266 — 13ms
- **S113** (E) predicted 0.86 vs actual 0.222 — 8ms
- **S129** (F) predicted 0.76 vs actual 0.14 — 3ms
- **S150** (F) predicted 0.78 vs actual 0.163 — 4ms
- **S107** (E) predicted 0.833 vs actual 0.251 — 11ms
- **S119** (E) predicted 0.8 vs actual 0.233 — 9ms
- **S091** (D) predicted 0.7 vs actual 0.14 — 3ms

## Recommended permanent regression set

- **S033** (B): slow solve (184614ms)
- **S030** (B): slow solve (84390ms)
- **S046** (B): slow solve (69859ms)
- **S048** (B): slow solve (31258ms)
- **S143** (F): slow solve (30830ms)
- **S047** (B): slow solve (30783ms)
- **S032** (B): slow solve (16330ms)
- **S118** (E): slow solve (14474ms)
- **S069** (C): deceptively simple
- **S110** (E): deceptively simple
- **S055** (C): deceptively simple
- **S057** (C): deceptively simple

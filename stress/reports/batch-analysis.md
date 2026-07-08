# Stress-corpus batch analysis

Generated 2026-07-08T06:17:03.052Z — corpus `stress/stress-levels.json` (generator v1.0.0), benchmark `stress/reports/benchmark-latest.json` at 20000ms budget.

**Totals:** 150 levels · 133 solved · 17 unsolved · global median runtime 464ms.

## Per-batch results

| Batch | Theory | N | Solve | Timeout | Median | p95 | Max | Avg nodes | Novelty | Complexity | Pred. | Actual | Spearman | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | historical-solver-pain | 25 | 96% | 4% | 1366ms | 3213ms | 20001ms | 113546 | 0.195 | 0.508 | 0.839 | 0.707 | 0.762 | **refine** |
| B | structural-complexity | 25 | 48% | 52% | 20000ms | 20001ms | 20001ms | 1580377 | 0.257 | 0.757 | 0.858 | 0.923 | 0.223 | **expand** |
| C | deceptive-simplicity | 25 | 100% | 0% | 75ms | 1880ms | 4376ms | 1000176 | 0.168 | 0.163 | 0.716 | 0.505 | 0.302 | **discard-or-rework** |
| D | novel-topology | 25 | 92% | 8% | 26ms | 18761ms | 20001ms | 1981735 | 0.212 | 0.235 | 0.729 | 0.476 | 0.368 | **refine** |
| E | anti-heuristic | 25 | 96% | 4% | 214ms | 7957ms | 20001ms | 869050 | 0.168 | 0.372 | 0.747 | 0.553 | 0.225 | **refine** |
| F | wild-witness | 25 | 100% | 0% | 11ms | 8674ms | 13908ms | 469257 | 0.254 | 0.399 | 0.723 | 0.386 | 0.583 | **discard-or-rework** |

### Batch A — historical-solver-pain

> Audit history shows solve time correlates with specific feature regimes (high reqInt at mid-to-high density, must-cross + flipper combinations, long paths). A ridge model fitted on audits/raw/latest.json steers generation toward the feature combinations that were historically slow; only candidates in the top predicted-cost band are accepted.

Prediction accuracy: Pearson 0.754, Spearman 0.762, mean |error| 0.133.

Strongest solver failures: S017 (unsolved), S002 (3341ms), S008 (2701ms).
Weakest (solver shrugged): S016 (135ms), S013 (276ms), S011 (285ms).

### Batch B — structural-complexity

> Ignore historical solve times entirely; maximize the interaction between mechanics (portals feeding flipper corridors, must-cross knots beside landmark cages, multi-mechanic cells within tight radii). Tests whether rich mechanic interaction — not raw object count — degrades orchestration.

Prediction accuracy: Pearson 0.015, Spearman 0.223, mean |error| 0.119.

Strongest solver failures: S027 (unsolved), S028 (unsolved), S029 (unsolved).
Weakest (solver shrugged): S037 (1592ms), S041 (1607ms), S038 (2037ms).

### Batch C — deceptive-simplicity

> Few or no objects; the search space explodes from geometry alone — open mid-density grids where reqLen/reqInt admit an enormous number of plausible near-solutions and the heuristic gradient (goal attraction, perimeter bias) is uninformative. Structural complexity is intentionally low while predicted challenge is unknown-to-high.

Prediction accuracy: Pearson 0.206, Spearman 0.302, mean |error| 0.236.

Strongest solver failures: S069 (4376ms), S055 (1880ms), S057 (1878ms).
Weakest (solver shrugged): S058 (6ms), S066 (14ms), S074 (15ms).

### Batch D — novel-topology

> Generate witness paths geometrically unlike the existing solution families (hint corpus), then wrap minimal rules around them. If the solver generalizes, novel solution shapes should cost no more than familiar ones; systematic slowdowns here indicate the heuristics overfit known witness geometry.

Prediction accuracy: Pearson 0.595, Spearman 0.368, mean |error| 0.307.

Strongest solver failures: S093 (unsolved), S099 (unsolved), S077 (13802ms).
Weakest (solver shrugged): S091 (1ms), S080 (3ms), S082 (6ms).

### Batch E — anti-heuristic

> Deliberately oppose the attempt policy in solver/attempts.ts: bait the near-closure rule with delayed closure, force interior routing where perimeter templates lead, starve multi-gate budget division below the reqLen>=90 floor, trigger the flipper diverse-beam ladder on levels a plain DFS would crush, and game the navDensity archetype thresholds with hazard padding.

Prediction accuracy: Pearson 0.041, Spearman 0.225, mean |error| 0.279.

Strongest solver failures: S118 (unsolved), S123 (9617ms), S121 (1318ms).
Weakest (solver shrugged): S106 (3ms), S116 (7ms), S113 (10ms).

### Batch F — wild-witness

> Draw witness paths and rule wrappers from maximally wide, human-aesthetic-free parameter distributions (extreme aspect ratios, tiny and huge grids, arbitrary mechanic mixes). No hypothesis beyond: the corners of level-space that no author would draw are where generalization failures hide.

Prediction accuracy: Pearson 0.464, Spearman 0.583, mean |error| 0.36.

Strongest solver failures: S142 (13908ms), S148 (9005ms), S137 (7352ms).
Weakest (solver shrugged): S141 (1ms), S126 (2ms), S136 (2ms).

## Highlights

### Most novel

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S129 | F | 12x4 | 4 | 0 | ✓ | 3ms | 0.495 | 0.363 | nearClosureRescue@dfs |
| S141 | F | 6x7 | 9 | 0 | ✓ | 1ms | 0.458 | 0.337 | nearClosureRescue@dfs |
| S126 | F | 6x4 | 6 | 0 | ✓ | 2ms | 0.4 | 0.333 | nearClosureRescue@dfs |
| S150 | F | 4x5 | 15 | 1 | ✓ | 3ms | 0.508 | 0.323 | perimeterSweep/cornerHarvest@dfs |
| S028 | B | 15x15 | 90 | 8 | ✗ | 20001ms | 0.816 | 0.321 | — |
| S027 | B | 14x10 | 73 | 6 | ✗ | 20001ms | 0.78 | 0.319 | — |
| S136 | F | 3x13 | 11 | 0 | ✓ | 2ms | 0.41 | 0.317 | nearClosureRescue@dfs |
| S139 | F | 5x13 | 42 | 3 | ✓ | 212ms | 0.459 | 0.31 | perimeterSweep/cornerHarvest@dfs |

### Most solver-hostile

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S017 | A | 15x11 | 89 | 12 | ✗ | 20001ms | 0.691 | 0.195 | — |
| S027 | B | 14x10 | 73 | 6 | ✗ | 20001ms | 0.78 | 0.319 | — |
| S028 | B | 15x15 | 90 | 8 | ✗ | 20001ms | 0.816 | 0.321 | — |
| S029 | B | 12x15 | 78 | 7 | ✗ | 20001ms | 0.832 | 0.303 | — |
| S030 | B | 13x13 | 87 | 8 | ✗ | 20001ms | 0.778 | 0.269 | — |
| S031 | B | 14x11 | 62 | 6 | ✗ | 20000ms | 0.761 | 0.298 | — |
| S033 | B | 14x10 | 68 | 3 | ✗ | 20001ms | 0.794 | 0.284 | — |
| S036 | B | 12x15 | 96 | 6 | ✗ | 20001ms | 0.647 | 0.253 | — |
| S039 | B | 14x10 | 83 | 6 | ✗ | 20001ms | 0.77 | 0.252 | — |
| S042 | B | 12x13 | 92 | 8 | ✗ | 20001ms | 0.685 | 0.235 | — |

### Simplest but hardest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S077 | D | 11x15 | 53 | 0 | ✓ | 13802ms | 0.229 | 0.24 | default@dfs |
| S069 | C | 15x15 | 97 | 2 | ✓ | 4376ms | 0.163 | 0.152 | perimeterSweep/sideCommitment@dfs |
| S055 | C | 11x11 | 70 | 2 | ✓ | 1880ms | 0.089 | 0.153 | perimeterSweep/perimeterCCW@dfs |
| S057 | C | 13x13 | 91 | 2 | ✓ | 1878ms | 0.15 | 0.158 | perimeterSweep/perimeterCCW@dfs |
| S065 | C | 14x14 | 90 | 1 | ✓ | 1878ms | 0.174 | 0.165 | perimeterSweep/perimeterCCW@dfs |
| S071 | C | 13x15 | 97 | 2 | ✓ | 1877ms | 0.2 | 0.157 | perimeterSweep/perimeterCW@dfs |
| S075 | C | 13x15 | 99 | 2 | ✓ | 1876ms | 0.251 | 0.16 | perimeterSweep/perimeterCW@dfs |

### Most complex but easiest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S129 | F | 12x4 | 4 | 0 | ✓ | 3ms | 0.495 | 0.363 | nearClosureRescue@dfs |
| S150 | F | 4x5 | 15 | 1 | ✓ | 3ms | 0.508 | 0.323 | perimeterSweep/cornerHarvest@dfs |
| S113 | E | 15x14 | 62 | 4 | ✓ | 10ms | 0.523 | 0.175 | portalFirstTransfer@dfs |
| S104 | E | 7x8 | 26 | 2 | ✓ | 62ms | 0.539 | 0.237 | intersectionHarvest@beam5000 |
| S149 | F | 5x12 | 29 | 1 | ✓ | 72ms | 0.506 | 0.293 | perimeterSweep/cornerHarvest@dfs |
| S119 | E | 7x9 | 29 | 4 | ✓ | 98ms | 0.556 | 0.198 | intersectionHarvest@beam5000 |
| S130 | F | 15x13 | 74 | 5 | ✓ | 108ms | 0.516 | 0.223 | portalFirstTransfer@dfs |
| S013 | A | 10x9 | 40 | 5 | ✓ | 276ms | 0.602 | 0.252 | perimeterSweep/cornerHarvest@dfs |

### Largest prediction errors

- **S141** (F) predicted 0.8 vs actual 0.07 — 1ms
- **S150** (F) predicted 0.78 vs actual 0.14 — 3ms
- **S091** (D) predicted 0.7 vs actual 0.07 — 1ms
- **S129** (F) predicted 0.76 vs actual 0.14 — 3ms
- **S113** (E) predicted 0.86 vs actual 0.242 — 10ms
- **S106** (E) predicted 0.736 vs actual 0.14 — 3ms
- **S126** (F) predicted 0.7 vs actual 0.111 — 2ms
- **S136** (F) predicted 0.7 vs actual 0.111 — 2ms

## Recommended permanent regression set

- **S017** (A): unsolved within budget
- **S027** (B): unsolved within budget
- **S028** (B): unsolved within budget
- **S029** (B): unsolved within budget
- **S030** (B): unsolved within budget
- **S031** (B): unsolved within budget
- **S033** (B): unsolved within budget
- **S036** (B): unsolved within budget
- **S039** (B): unsolved within budget
- **S042** (B): unsolved within budget
- **S043** (B): unsolved within budget
- **S044** (B): unsolved within budget
- **S047** (B): unsolved within budget
- **S048** (B): unsolved within budget
- **S093** (D): unsolved within budget
- **S099** (D): unsolved within budget
- **S118** (E): unsolved within budget
- **S142** (F): slow solve (13908ms)
- **S077** (D): slow solve (13802ms); deceptively simple
- **S045** (B): slow solve (13466ms)
- **S032** (B): slow solve (13376ms)
- **S035** (B): slow solve (13344ms)
- **S123** (E): slow solve (9617ms)
- **S148** (F): slow solve (9005ms)

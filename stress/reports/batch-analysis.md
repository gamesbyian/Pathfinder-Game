# Stress-corpus batch analysis

Generated 2026-07-08T19:00:35.774Z — corpus `stress/stress-levels.json` (generator v1.0.0), benchmark `stress/reports/benchmark-latest.json` at 20000ms budget.

**Totals:** 150 levels · 145 solved · 5 unsolved · global median runtime 429ms.

## Per-batch results

| Batch | Theory | N | Solve | Timeout | Median | p95 | Max | Avg nodes | Novelty | Complexity | Pred. | Actual | Spearman | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | historical-solver-pain | 25 | 100% | 0% | 1319ms | 2531ms | 5973ms | 17839 | 0.195 | 0.508 | 0.839 | 0.691 | 0.808 | **expand** |
| B | structural-complexity | 25 | 88% | 12% | 14666ms | 80001ms | 80001ms | 4692387 | 0.257 | 0.757 | 0.858 | 0.914 | 0.262 | **expand** |
| C | deceptive-simplicity | 25 | 100% | 0% | 64ms | 1880ms | 4376ms | 1185182 | 0.168 | 0.163 | 0.716 | 0.495 | 0.231 | **discard-or-rework** |
| D | novel-topology | 25 | 92% | 8% | 71ms | 18758ms | 20001ms | 2113125 | 0.212 | 0.235 | 0.729 | 0.484 | 0.401 | **refine** |
| E | anti-heuristic | 25 | 100% | 0% | 206ms | 6129ms | 14212ms | 622962 | 0.168 | 0.372 | 0.747 | 0.55 | 0.259 | **discard-or-rework** |
| F | wild-witness | 25 | 100% | 0% | 10ms | 6628ms | 13971ms | 534124 | 0.254 | 0.399 | 0.723 | 0.387 | 0.679 | **discard-or-rework** |

### Batch A — historical-solver-pain

> Audit history shows solve time correlates with specific feature regimes (high reqInt at mid-to-high density, must-cross + flipper combinations, long paths). A ridge model fitted on audits/raw/latest.json steers generation toward the feature combinations that were historically slow; only candidates in the top predicted-cost band are accepted.

Prediction accuracy: Pearson 0.767, Spearman 0.808, mean |error| 0.148.

Strongest solver failures: S004 (5973ms), S002 (2534ms), S017 (2517ms).
Weakest (solver shrugged): S016 (129ms), S013 (256ms), S011 (282ms).

### Batch B — structural-complexity

> Ignore historical solve times entirely; maximize the interaction between mechanics (portals feeding flipper corridors, must-cross knots beside landmark cages, multi-mechanic cells within tight radii). Tests whether rich mechanic interaction — not raw object count — degrades orchestration.

Prediction accuracy: Pearson 0.145, Spearman 0.262, mean |error| 0.102.

Strongest solver failures: S028 (unsolved), S047 (unsolved), S043 (unsolved).
Weakest (solver shrugged): S041 (1497ms), S037 (1570ms), S038 (2007ms).

### Batch C — deceptive-simplicity

> Few or no objects; the search space explodes from geometry alone — open mid-density grids where reqLen/reqInt admit an enormous number of plausible near-solutions and the heuristic gradient (goal attraction, perimeter bias) is uninformative. Structural complexity is intentionally low while predicted challenge is unknown-to-high.

Prediction accuracy: Pearson 0.195, Spearman 0.231, mean |error| 0.245.

Strongest solver failures: S069 (4376ms), S055 (1880ms), S057 (1878ms).
Weakest (solver shrugged): S058 (9ms), S066 (10ms), S074 (14ms).

### Batch D — novel-topology

> Generate witness paths geometrically unlike the existing solution families (hint corpus), then wrap minimal rules around them. If the solver generalizes, novel solution shapes should cost no more than familiar ones; systematic slowdowns here indicate the heuristics overfit known witness geometry.

Prediction accuracy: Pearson 0.606, Spearman 0.401, mean |error| 0.3.

Strongest solver failures: S093 (unsolved), S099 (unsolved), S077 (13787ms).
Weakest (solver shrugged): S091 (2ms), S080 (5ms), S082 (5ms).

### Batch E — anti-heuristic

> Deliberately oppose the attempt policy in solver/attempts.ts: bait the near-closure rule with delayed closure, force interior routing where perimeter templates lead, starve multi-gate budget division below the reqLen>=90 floor, trigger the flipper diverse-beam ladder on levels a plain DFS would crush, and game the navDensity archetype thresholds with hazard padding.

Prediction accuracy: Pearson 0.039, Spearman 0.259, mean |error| 0.276.

Strongest solver failures: S118 (14212ms), S123 (7333ms), S121 (1311ms).
Weakest (solver shrugged): S106 (8ms), S113 (10ms), S116 (12ms).

### Batch F — wild-witness

> Draw witness paths and rule wrappers from maximally wide, human-aesthetic-free parameter distributions (extreme aspect ratios, tiny and huge grids, arbitrary mechanic mixes). No hypothesis beyond: the corners of level-space that no author would draw are where generalization failures hide.

Prediction accuracy: Pearson 0.499, Spearman 0.679, mean |error| 0.347.

Strongest solver failures: S142 (13971ms), S137 (7050ms), S143 (4938ms).
Weakest (solver shrugged): S136 (2ms), S126 (3ms), S133 (3ms).

## Highlights

### Most novel

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S129 | F | 12x4 | 4 | 0 | ✓ | 5ms | 0.495 | 0.363 | nearClosureRescue@dfs |
| S141 | F | 6x7 | 9 | 0 | ✓ | 3ms | 0.458 | 0.337 | nearClosureRescue@dfs |
| S126 | F | 6x4 | 6 | 0 | ✓ | 3ms | 0.4 | 0.333 | nearClosureRescue@dfs |
| S150 | F | 4x5 | 15 | 1 | ✓ | 6ms | 0.508 | 0.323 | perimeterSweep/cornerHarvest@dfs |
| S028 | B | 15x15 | 90 | 8 | ✗ | 80001ms | 0.816 | 0.321 | — |
| S027 | B | 14x10 | 73 | 6 | ✓ | 3997ms | 0.78 | 0.319 | intersectionHarvest@beam5000 |
| S136 | F | 3x13 | 11 | 0 | ✓ | 2ms | 0.41 | 0.317 | nearClosureRescue@dfs |
| S139 | F | 5x13 | 42 | 3 | ✓ | 175ms | 0.459 | 0.31 | perimeterSweep/cornerHarvest@dfs |

### Most solver-hostile

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S028 | B | 15x15 | 90 | 8 | ✗ | 80001ms | 0.816 | 0.321 | — |
| S043 | B | 14x13 | 71 | 8 | ✗ | 80000ms | 0.798 | 0.259 | — |
| S047 | B | 13x12 | 80 | 6 | ✗ | 80001ms | 0.815 | 0.244 | — |
| S093 | D | 9x14 | 62 | 8 | ✗ | 20001ms | 0.459 | 0.251 | — |
| S099 | D | 14x14 | 104 | 9 | ✗ | 20001ms | 0.337 | 0.19 | — |
| S039 | B | 14x10 | 83 | 6 | ✓ | 61068ms | 0.77 | 0.252 | repair@dfs |
| S033 | B | 14x10 | 68 | 3 | ✓ | 60960ms | 0.794 | 0.284 | repair@dfs |
| S030 | B | 13x13 | 87 | 8 | ✓ | 47861ms | 0.778 | 0.269 | repair@dfs |
| S048 | B | 15x15 | 103 | 7 | ✓ | 32373ms | 0.795 | 0.255 | repair@dfs |
| S031 | B | 14x11 | 62 | 6 | ✓ | 23132ms | 0.761 | 0.298 | repair@dfs |

### Simplest but hardest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S077 | D | 11x15 | 53 | 0 | ✓ | 13787ms | 0.229 | 0.24 | default@dfs |
| S069 | C | 15x15 | 97 | 2 | ✓ | 4376ms | 0.163 | 0.152 | perimeterSweep/sideCommitment@dfs |
| S055 | C | 11x11 | 70 | 2 | ✓ | 1880ms | 0.089 | 0.153 | perimeterSweep/perimeterCCW@dfs |
| S057 | C | 13x13 | 91 | 2 | ✓ | 1878ms | 0.15 | 0.158 | perimeterSweep/perimeterCCW@dfs |
| S065 | C | 14x14 | 90 | 1 | ✓ | 1878ms | 0.174 | 0.165 | perimeterSweep/perimeterCCW@dfs |
| S071 | C | 13x15 | 97 | 2 | ✓ | 1877ms | 0.2 | 0.157 | perimeterSweep/perimeterCW@dfs |
| S075 | C | 13x15 | 99 | 2 | ✓ | 1807ms | 0.251 | 0.16 | perimeterSweep/perimeterCW@dfs |

### Most complex but easiest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S129 | F | 12x4 | 4 | 0 | ✓ | 5ms | 0.495 | 0.363 | nearClosureRescue@dfs |
| S150 | F | 4x5 | 15 | 1 | ✓ | 6ms | 0.508 | 0.323 | perimeterSweep/cornerHarvest@dfs |
| S113 | E | 15x14 | 62 | 4 | ✓ | 10ms | 0.523 | 0.175 | portalFirstTransfer@dfs |
| S104 | E | 7x8 | 26 | 2 | ✓ | 59ms | 0.539 | 0.237 | intersectionHarvest@beam5000 |
| S149 | F | 5x12 | 29 | 1 | ✓ | 81ms | 0.506 | 0.293 | perimeterSweep/cornerHarvest@dfs |
| S119 | E | 7x9 | 29 | 4 | ✓ | 92ms | 0.556 | 0.198 | intersectionHarvest@beam5000 |
| S130 | F | 15x13 | 74 | 5 | ✓ | 98ms | 0.516 | 0.223 | portalFirstTransfer@dfs |
| S013 | A | 10x9 | 40 | 5 | ✓ | 256ms | 0.602 | 0.252 | perimeterSweep/cornerHarvest@dfs |

### Largest prediction errors

- **S141** (F) predicted 0.8 vs actual 0.14 — 3ms
- **S113** (E) predicted 0.86 vs actual 0.242 — 10ms
- **S091** (D) predicted 0.7 vs actual 0.111 — 2ms
- **S136** (F) predicted 0.7 vs actual 0.111 — 2ms
- **S150** (F) predicted 0.78 vs actual 0.196 — 6ms
- **S129** (F) predicted 0.76 vs actual 0.181 — 5ms
- **S126** (F) predicted 0.7 vs actual 0.14 — 3ms
- **S135** (F) predicted 0.7 vs actual 0.14 — 3ms

## Recommended permanent regression set

- **S028** (B): unsolved within budget
- **S043** (B): unsolved within budget
- **S047** (B): unsolved within budget
- **S093** (D): unsolved within budget
- **S099** (D): unsolved within budget
- **S039** (B): slow solve (61068ms)
- **S033** (B): slow solve (60960ms)
- **S030** (B): slow solve (47861ms)
- **S048** (B): slow solve (32373ms)
- **S031** (B): slow solve (23132ms)
- **S036** (B): slow solve (22230ms)
- **S042** (B): slow solve (20583ms)
- **S044** (B): slow solve (20203ms)
- **S077** (D): deceptively simple
- **S069** (C): deceptively simple
- **S055** (C): deceptively simple
- **S057** (C): deceptively simple

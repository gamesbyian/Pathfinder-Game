# Stress-corpus batch analysis

Generated 2026-07-08T20:55:42.393Z — corpus `stress/stress-levels.json` (generator v1.0.0), benchmark `stress/reports/benchmark-latest.json` at 20000ms budget.

**Totals:** 150 levels · 146 solved · 4 unsolved · global median runtime 442ms.

## Per-batch results

| Batch | Theory | N | Solve | Timeout | Median | p95 | Max | Avg nodes | Novelty | Complexity | Pred. | Actual | Spearman | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | historical-solver-pain | 25 | 100% | 0% | 1298ms | 2609ms | 6156ms | 17839 | 0.195 | 0.508 | 0.839 | 0.692 | 0.793 | **refine** |
| B | structural-complexity | 25 | 92% | 8% | 6936ms | 76205ms | 80001ms | 3764447 | 0.257 | 0.757 | 0.858 | 0.897 | 0.297 | **expand** |
| C | deceptive-simplicity | 25 | 100% | 0% | 65ms | 1880ms | 4376ms | 1185182 | 0.168 | 0.163 | 0.716 | 0.497 | 0.275 | **discard-or-rework** |
| D | novel-topology | 25 | 92% | 8% | 24ms | 18759ms | 20001ms | 2113125 | 0.212 | 0.235 | 0.729 | 0.476 | 0.369 | **refine** |
| E | anti-heuristic | 25 | 100% | 0% | 212ms | 6059ms | 14223ms | 622962 | 0.168 | 0.372 | 0.747 | 0.546 | 0.257 | **discard-or-rework** |
| F | wild-witness | 25 | 100% | 0% | 11ms | 7013ms | 14031ms | 581436 | 0.254 | 0.399 | 0.723 | 0.39 | 0.676 | **discard-or-rework** |

### Batch A — historical-solver-pain

> Audit history shows solve time correlates with specific feature regimes (high reqInt at mid-to-high density, must-cross + flipper combinations, long paths). A ridge model fitted on audits/raw/latest.json steers generation toward the feature combinations that were historically slow; only candidates in the top predicted-cost band are accepted.

Prediction accuracy: Pearson 0.746, Spearman 0.793, mean |error| 0.147.

Strongest solver failures: S004 (6156ms), S002 (2624ms), S017 (2549ms).
Weakest (solver shrugged): S016 (123ms), S013 (246ms), S011 (270ms).

### Batch B — structural-complexity

> Ignore historical solve times entirely; maximize the interaction between mechanics (portals feeding flipper corridors, must-cross knots beside landmark cages, multi-mechanic cells within tight radii). Tests whether rich mechanic interaction — not raw object count — degrades orchestration.

Prediction accuracy: Pearson 0.165, Spearman 0.297, mean |error| 0.101.

Strongest solver failures: S047 (unsolved), S043 (unsolved), S033 (61023ms).
Weakest (solver shrugged): S040 (776ms), S037 (1536ms), S041 (1592ms).

### Batch C — deceptive-simplicity

> Few or no objects; the search space explodes from geometry alone — open mid-density grids where reqLen/reqInt admit an enormous number of plausible near-solutions and the heuristic gradient (goal attraction, perimeter bias) is uninformative. Structural complexity is intentionally low while predicted challenge is unknown-to-high.

Prediction accuracy: Pearson 0.207, Spearman 0.275, mean |error| 0.244.

Strongest solver failures: S069 (4376ms), S055 (1880ms), S065 (1879ms).
Weakest (solver shrugged): S058 (6ms), S066 (10ms), S060 (15ms).

### Batch D — novel-topology

> Generate witness paths geometrically unlike the existing solution families (hint corpus), then wrap minimal rules around them. If the solver generalizes, novel solution shapes should cost no more than familiar ones; systematic slowdowns here indicate the heuristics overfit known witness geometry.

Prediction accuracy: Pearson 0.606, Spearman 0.369, mean |error| 0.308.

Strongest solver failures: S093 (unsolved), S099 (unsolved), S077 (13789ms).
Weakest (solver shrugged): S091 (2ms), S080 (4ms), S082 (5ms).

### Batch E — anti-heuristic

> Deliberately oppose the attempt policy in solver/attempts.ts: bait the near-closure rule with delayed closure, force interior routing where perimeter templates lead, starve multi-gate budget division below the reqLen>=90 floor, trigger the flipper diverse-beam ladder on levels a plain DFS would crush, and game the navDensity archetype thresholds with hazard padding.

Prediction accuracy: Pearson 0.032, Spearman 0.257, mean |error| 0.28.

Strongest solver failures: S118 (14223ms), S123 (7247ms), S121 (1306ms).
Weakest (solver shrugged): S106 (5ms), S116 (8ms), S113 (9ms).

### Batch F — wild-witness

> Draw witness paths and rule wrappers from maximally wide, human-aesthetic-free parameter distributions (extreme aspect ratios, tiny and huge grids, arbitrary mechanic mixes). No hypothesis beyond: the corners of level-space that no author would draw are where generalization failures hide.

Prediction accuracy: Pearson 0.488, Spearman 0.676, mean |error| 0.35.

Strongest solver failures: S142 (14031ms), S137 (7524ms), S143 (4970ms).
Weakest (solver shrugged): S136 (2ms), S135 (3ms), S126 (4ms).

## Highlights

### Most novel

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S129 | F | 12x4 | 4 | 0 | ✓ | 5ms | 0.495 | 0.363 | nearClosureRescue@dfs |
| S141 | F | 6x7 | 9 | 0 | ✓ | 5ms | 0.458 | 0.337 | nearClosureRescue@dfs |
| S126 | F | 6x4 | 6 | 0 | ✓ | 4ms | 0.4 | 0.333 | nearClosureRescue@dfs |
| S150 | F | 4x5 | 15 | 1 | ✓ | 4ms | 0.508 | 0.323 | perimeterSweep/cornerHarvest@dfs |
| S028 | B | 15x15 | 90 | 8 | ✓ | 2171ms | 0.816 | 0.321 | mustCrossFirst@beam2000 |
| S027 | B | 14x10 | 73 | 6 | ✓ | 3930ms | 0.78 | 0.319 | intersectionHarvest@beam5000 |
| S136 | F | 3x13 | 11 | 0 | ✓ | 2ms | 0.41 | 0.317 | nearClosureRescue@dfs |
| S139 | F | 5x13 | 42 | 3 | ✓ | 182ms | 0.459 | 0.31 | perimeterSweep/cornerHarvest@dfs |

### Most solver-hostile

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S043 | B | 14x13 | 71 | 8 | ✗ | 80000ms | 0.798 | 0.259 | — |
| S047 | B | 13x12 | 80 | 6 | ✗ | 80001ms | 0.815 | 0.244 | — |
| S093 | D | 9x14 | 62 | 8 | ✗ | 20001ms | 0.459 | 0.251 | — |
| S099 | D | 14x14 | 104 | 9 | ✗ | 20001ms | 0.337 | 0.19 | — |
| S033 | B | 14x10 | 68 | 3 | ✓ | 61023ms | 0.794 | 0.284 | repair@dfs |
| S039 | B | 14x10 | 83 | 6 | ✓ | 60862ms | 0.77 | 0.252 | repair@dfs |
| S030 | B | 13x13 | 87 | 8 | ✓ | 47475ms | 0.778 | 0.269 | repair@dfs |
| S048 | B | 15x15 | 103 | 7 | ✓ | 32422ms | 0.795 | 0.255 | repair@dfs |
| S031 | B | 14x11 | 62 | 6 | ✓ | 23083ms | 0.761 | 0.298 | repair@dfs |
| S036 | B | 12x15 | 96 | 6 | ✓ | 22204ms | 0.647 | 0.253 | repair@dfs |

### Simplest but hardest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S077 | D | 11x15 | 53 | 0 | ✓ | 13789ms | 0.229 | 0.24 | default@dfs |
| S069 | C | 15x15 | 97 | 2 | ✓ | 4376ms | 0.163 | 0.152 | perimeterSweep/sideCommitment@dfs |
| S055 | C | 11x11 | 70 | 2 | ✓ | 1880ms | 0.089 | 0.153 | perimeterSweep/perimeterCCW@dfs |
| S065 | C | 14x14 | 90 | 1 | ✓ | 1879ms | 0.174 | 0.165 | perimeterSweep/perimeterCCW@dfs |
| S071 | C | 13x15 | 97 | 2 | ✓ | 1877ms | 0.2 | 0.157 | perimeterSweep/perimeterCW@dfs |
| S057 | C | 13x13 | 91 | 2 | ✓ | 1876ms | 0.15 | 0.158 | perimeterSweep/perimeterCCW@dfs |
| S075 | C | 13x15 | 99 | 2 | ✓ | 1788ms | 0.251 | 0.16 | perimeterSweep/perimeterCW@dfs |

### Most complex but easiest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S150 | F | 4x5 | 15 | 1 | ✓ | 4ms | 0.508 | 0.323 | perimeterSweep/cornerHarvest@dfs |
| S129 | F | 12x4 | 4 | 0 | ✓ | 5ms | 0.495 | 0.363 | nearClosureRescue@dfs |
| S113 | E | 15x14 | 62 | 4 | ✓ | 9ms | 0.523 | 0.175 | portalFirstTransfer@dfs |
| S104 | E | 7x8 | 26 | 2 | ✓ | 54ms | 0.539 | 0.237 | intersectionHarvest@beam5000 |
| S149 | F | 5x12 | 29 | 1 | ✓ | 73ms | 0.506 | 0.293 | perimeterSweep/cornerHarvest@dfs |
| S119 | E | 7x9 | 29 | 4 | ✓ | 88ms | 0.556 | 0.198 | intersectionHarvest@beam5000 |
| S130 | F | 15x13 | 74 | 5 | ✓ | 95ms | 0.516 | 0.223 | portalFirstTransfer@dfs |
| S013 | A | 10x9 | 40 | 5 | ✓ | 246ms | 0.602 | 0.252 | perimeterSweep/cornerHarvest@dfs |

### Largest prediction errors

- **S113** (E) predicted 0.86 vs actual 0.233 — 9ms
- **S141** (F) predicted 0.8 vs actual 0.181 — 5ms
- **S150** (F) predicted 0.78 vs actual 0.163 — 4ms
- **S091** (D) predicted 0.7 vs actual 0.111 — 2ms
- **S136** (F) predicted 0.7 vs actual 0.111 — 2ms
- **S129** (F) predicted 0.76 vs actual 0.181 — 5ms
- **S135** (F) predicted 0.7 vs actual 0.14 — 3ms
- **S106** (E) predicted 0.736 vs actual 0.181 — 5ms

## Recommended permanent regression set

- **S043** (B): unsolved within budget
- **S047** (B): unsolved within budget
- **S093** (D): unsolved within budget
- **S099** (D): unsolved within budget
- **S033** (B): slow solve (61023ms)
- **S039** (B): slow solve (60862ms)
- **S030** (B): slow solve (47475ms)
- **S048** (B): slow solve (32422ms)
- **S031** (B): slow solve (23083ms)
- **S036** (B): slow solve (22204ms)
- **S042** (B): slow solve (20578ms)
- **S044** (B): slow solve (20203ms)
- **S077** (D): deceptively simple
- **S069** (C): deceptively simple
- **S055** (C): deceptively simple
- **S065** (C): deceptively simple

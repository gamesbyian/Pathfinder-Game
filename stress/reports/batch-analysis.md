# Stress-corpus batch analysis

Generated 2026-07-08T11:35:26.471Z — corpus `stress/stress-levels.json` (generator v1.0.0), benchmark `stress/reports/benchmark-latest.json` at 20000ms budget.

**Totals:** 150 levels · 136 solved · 14 unsolved · global median runtime 478ms.

## Per-batch results

| Batch | Theory | N | Solve | Timeout | Median | p95 | Max | Avg nodes | Novelty | Complexity | Pred. | Actual | Spearman | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | historical-solver-pain | 25 | 100% | 0% | 1371ms | 2683ms | 6620ms | 17839 | 0.195 | 0.508 | 0.839 | 0.698 | 0.804 | **refine** |
| B | structural-complexity | 25 | 56% | 44% | 14958ms | 20001ms | 20003ms | 990115 | 0.257 | 0.757 | 0.858 | 0.92 | 0.27 | **expand** |
| C | deceptive-simplicity | 25 | 100% | 0% | 79ms | 1880ms | 4376ms | 1000176 | 0.168 | 0.163 | 0.716 | 0.508 | 0.295 | **discard-or-rework** |
| D | novel-topology | 25 | 92% | 8% | 31ms | 18762ms | 20001ms | 1981735 | 0.212 | 0.235 | 0.729 | 0.491 | 0.378 | **refine** |
| E | anti-heuristic | 25 | 100% | 0% | 233ms | 6152ms | 14295ms | 622962 | 0.168 | 0.372 | 0.747 | 0.553 | 0.267 | **discard-or-rework** |
| F | wild-witness | 25 | 96% | 4% | 10ms | 13284ms | 20001ms | 540696 | 0.254 | 0.399 | 0.723 | 0.397 | 0.623 | **refine** |

### Batch A — historical-solver-pain

> Audit history shows solve time correlates with specific feature regimes (high reqInt at mid-to-high density, must-cross + flipper combinations, long paths). A ridge model fitted on audits/raw/latest.json steers generation toward the feature combinations that were historically slow; only candidates in the top predicted-cost band are accepted.

Prediction accuracy: Pearson 0.753, Spearman 0.804, mean |error| 0.141.

Strongest solver failures: S004 (6620ms), S002 (2695ms), S017 (2636ms).
Weakest (solver shrugged): S016 (131ms), S013 (292ms), S011 (295ms).

### Batch B — structural-complexity

> Ignore historical solve times entirely; maximize the interaction between mechanics (portals feeding flipper corridors, must-cross knots beside landmark cages, multi-mechanic cells within tight radii). Tests whether rich mechanic interaction — not raw object count — degrades orchestration.

Prediction accuracy: Pearson 0.15, Spearman 0.27, mean |error| 0.1.

Strongest solver failures: S031 (unsolved), S028 (unsolved), S030 (unsolved).
Weakest (solver shrugged): S037 (1623ms), S041 (1707ms), S038 (2137ms).

### Batch C — deceptive-simplicity

> Few or no objects; the search space explodes from geometry alone — open mid-density grids where reqLen/reqInt admit an enormous number of plausible near-solutions and the heuristic gradient (goal attraction, perimeter bias) is uninformative. Structural complexity is intentionally low while predicted challenge is unknown-to-high.

Prediction accuracy: Pearson 0.205, Spearman 0.295, mean |error| 0.233.

Strongest solver failures: S069 (4376ms), S055 (1880ms), S075 (1878ms).
Weakest (solver shrugged): S058 (5ms), S066 (10ms), S060 (18ms).

### Batch D — novel-topology

> Generate witness paths geometrically unlike the existing solution families (hint corpus), then wrap minimal rules around them. If the solver generalizes, novel solution shapes should cost no more than familiar ones; systematic slowdowns here indicate the heuristics overfit known witness geometry.

Prediction accuracy: Pearson 0.6, Spearman 0.378, mean |error| 0.293.

Strongest solver failures: S093 (unsolved), S099 (unsolved), S077 (13806ms).
Weakest (solver shrugged): S091 (2ms), S098 (5ms), S080 (6ms).

### Batch E — anti-heuristic

> Deliberately oppose the attempt policy in solver/attempts.ts: bait the near-closure rule with delayed closure, force interior routing where perimeter templates lead, starve multi-gate budget division below the reqLen>=90 floor, trigger the flipper diverse-beam ladder on levels a plain DFS would crush, and game the navDensity archetype thresholds with hazard padding.

Prediction accuracy: Pearson 0.032, Spearman 0.267, mean |error| 0.275.

Strongest solver failures: S118 (14295ms), S123 (7332ms), S102 (1431ms).
Weakest (solver shrugged): S106 (5ms), S116 (7ms), S113 (9ms).

### Batch F — wild-witness

> Draw witness paths and rule wrappers from maximally wide, human-aesthetic-free parameter distributions (extreme aspect ratios, tiny and huge grids, arbitrary mechanic mixes). No hypothesis beyond: the corners of level-space that no author would draw are where generalization failures hide.

Prediction accuracy: Pearson 0.484, Spearman 0.623, mean |error| 0.355.

Strongest solver failures: S143 (unsolved), S142 (14352ms), S148 (9014ms).
Weakest (solver shrugged): S126 (2ms), S141 (2ms), S133 (3ms).

## Highlights

### Most novel

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S129 | F | 12x4 | 4 | 0 | ✓ | 4ms | 0.495 | 0.363 | nearClosureRescue@dfs |
| S141 | F | 6x7 | 9 | 0 | ✓ | 2ms | 0.458 | 0.337 | nearClosureRescue@dfs |
| S126 | F | 6x4 | 6 | 0 | ✓ | 2ms | 0.4 | 0.333 | nearClosureRescue@dfs |
| S150 | F | 4x5 | 15 | 1 | ✓ | 3ms | 0.508 | 0.323 | perimeterSweep/cornerHarvest@dfs |
| S028 | B | 15x15 | 90 | 8 | ✗ | 20001ms | 0.816 | 0.321 | — |
| S027 | B | 14x10 | 73 | 6 | ✓ | 4540ms | 0.78 | 0.319 | intersectionHarvest@beam5000 |
| S136 | F | 3x13 | 11 | 0 | ✓ | 3ms | 0.41 | 0.317 | nearClosureRescue@dfs |
| S139 | F | 5x13 | 42 | 3 | ✓ | 211ms | 0.459 | 0.31 | perimeterSweep/cornerHarvest@dfs |

### Most solver-hostile

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S028 | B | 15x15 | 90 | 8 | ✗ | 20001ms | 0.816 | 0.321 | — |
| S030 | B | 13x13 | 87 | 8 | ✗ | 20001ms | 0.778 | 0.269 | — |
| S031 | B | 14x11 | 62 | 6 | ✗ | 20003ms | 0.761 | 0.298 | — |
| S033 | B | 14x10 | 68 | 3 | ✗ | 20001ms | 0.794 | 0.284 | — |
| S036 | B | 12x15 | 96 | 6 | ✗ | 20001ms | 0.647 | 0.253 | — |
| S039 | B | 14x10 | 83 | 6 | ✗ | 20001ms | 0.77 | 0.252 | — |
| S042 | B | 12x13 | 92 | 8 | ✗ | 20001ms | 0.685 | 0.235 | — |
| S043 | B | 14x13 | 71 | 8 | ✗ | 20001ms | 0.798 | 0.259 | — |
| S044 | B | 14x15 | 95 | 7 | ✗ | 20001ms | 0.821 | 0.247 | — |
| S047 | B | 13x12 | 80 | 6 | ✗ | 20001ms | 0.815 | 0.244 | — |

### Simplest but hardest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S077 | D | 11x15 | 53 | 0 | ✓ | 13806ms | 0.229 | 0.24 | default@dfs |
| S069 | C | 15x15 | 97 | 2 | ✓ | 4376ms | 0.163 | 0.152 | perimeterSweep/sideCommitment@dfs |

### Most complex but easiest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S150 | F | 4x5 | 15 | 1 | ✓ | 3ms | 0.508 | 0.323 | perimeterSweep/cornerHarvest@dfs |
| S129 | F | 12x4 | 4 | 0 | ✓ | 4ms | 0.495 | 0.363 | nearClosureRescue@dfs |
| S113 | E | 15x14 | 62 | 4 | ✓ | 9ms | 0.523 | 0.175 | portalFirstTransfer@dfs |
| S104 | E | 7x8 | 26 | 2 | ✓ | 64ms | 0.539 | 0.237 | intersectionHarvest@beam5000 |
| S149 | F | 5x12 | 29 | 1 | ✓ | 73ms | 0.506 | 0.293 | perimeterSweep/cornerHarvest@dfs |
| S119 | E | 7x9 | 29 | 4 | ✓ | 97ms | 0.556 | 0.198 | intersectionHarvest@beam5000 |
| S130 | F | 15x13 | 74 | 5 | ✓ | 110ms | 0.516 | 0.223 | portalFirstTransfer@dfs |
| S013 | A | 10x9 | 40 | 5 | ✓ | 292ms | 0.602 | 0.252 | perimeterSweep/cornerHarvest@dfs |

### Largest prediction errors

- **S141** (F) predicted 0.8 vs actual 0.111 — 2ms
- **S150** (F) predicted 0.78 vs actual 0.14 — 3ms
- **S113** (E) predicted 0.86 vs actual 0.233 — 9ms
- **S129** (F) predicted 0.76 vs actual 0.163 — 4ms
- **S091** (D) predicted 0.7 vs actual 0.111 — 2ms
- **S126** (F) predicted 0.7 vs actual 0.111 — 2ms
- **S134** (F) predicted 0.7 vs actual 0.14 — 3ms
- **S135** (F) predicted 0.7 vs actual 0.14 — 3ms

## Recommended permanent regression set

- **S028** (B): unsolved within budget
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
- **S143** (F): unsolved within budget
- **S035** (B): slow solve (16238ms)
- **S032** (B): slow solve (14958ms)
- **S142** (F): slow solve (14352ms)
- **S118** (E): slow solve (14295ms)
- **S077** (D): slow solve (13806ms); deceptively simple
- **S029** (B): slow solve (11122ms)
- **S148** (F): slow solve (9014ms)
- **S046** (B): slow solve (7592ms)
- **S069** (C): deceptively simple

# Stress-corpus batch analysis

Generated 2026-07-08T11:05:55.945Z — corpus `stress/stress-levels.json` (generator v1.0.0), benchmark `stress/reports/benchmark-latest.json` at 20000ms budget.

**Totals:** 150 levels · 135 solved · 15 unsolved · global median runtime 477ms.

## Per-batch results

| Batch | Theory | N | Solve | Timeout | Median | p95 | Max | Avg nodes | Novelty | Complexity | Pred. | Actual | Spearman | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | historical-solver-pain | 25 | 100% | 0% | 1399ms | 2923ms | 6580ms | 17839 | 0.195 | 0.508 | 0.839 | 0.701 | 0.808 | **refine** |
| B | structural-complexity | 25 | 56% | 44% | 15136ms | 20001ms | 20006ms | 958832 | 0.257 | 0.757 | 0.858 | 0.92 | 0.27 | **expand** |
| C | deceptive-simplicity | 25 | 100% | 0% | 77ms | 1879ms | 4376ms | 872323 | 0.168 | 0.163 | 0.716 | 0.509 | 0.299 | **discard-or-rework** |
| D | novel-topology | 25 | 92% | 8% | 27ms | 18759ms | 20001ms | 1981735 | 0.212 | 0.235 | 0.729 | 0.484 | 0.371 | **refine** |
| E | anti-heuristic | 25 | 96% | 4% | 221ms | 8162ms | 20001ms | 825593 | 0.168 | 0.372 | 0.747 | 0.554 | 0.259 | **refine** |
| F | wild-witness | 25 | 96% | 4% | 10ms | 13329ms | 20001ms | 540696 | 0.254 | 0.399 | 0.723 | 0.405 | 0.512 | **refine** |

### Batch A — historical-solver-pain

> Audit history shows solve time correlates with specific feature regimes (high reqInt at mid-to-high density, must-cross + flipper combinations, long paths). A ridge model fitted on audits/raw/latest.json steers generation toward the feature combinations that were historically slow; only candidates in the top predicted-cost band are accepted.

Prediction accuracy: Pearson 0.757, Spearman 0.808, mean |error| 0.139.

Strongest solver failures: S004 (6580ms), S017 (2966ms), S002 (2750ms).
Weakest (solver shrugged): S016 (137ms), S013 (289ms), S011 (312ms).

### Batch B — structural-complexity

> Ignore historical solve times entirely; maximize the interaction between mechanics (portals feeding flipper corridors, must-cross knots beside landmark cages, multi-mechanic cells within tight radii). Tests whether rich mechanic interaction — not raw object count — degrades orchestration.

Prediction accuracy: Pearson 0.147, Spearman 0.27, mean |error| 0.101.

Strongest solver failures: S031 (unsolved), S028 (unsolved), S030 (unsolved).
Weakest (solver shrugged): S037 (1588ms), S041 (1671ms), S038 (2146ms).

### Batch C — deceptive-simplicity

> Few or no objects; the search space explodes from geometry alone — open mid-density grids where reqLen/reqInt admit an enormous number of plausible near-solutions and the heuristic gradient (goal attraction, perimeter bias) is uninformative. Structural complexity is intentionally low while predicted challenge is unknown-to-high.

Prediction accuracy: Pearson 0.202, Spearman 0.299, mean |error| 0.232.

Strongest solver failures: S069 (4376ms), S055 (1879ms), S065 (1877ms).
Weakest (solver shrugged): S058 (10ms), S066 (10ms), S053 (17ms).

### Batch D — novel-topology

> Generate witness paths geometrically unlike the existing solution families (hint corpus), then wrap minimal rules around them. If the solver generalizes, novel solution shapes should cost no more than familiar ones; systematic slowdowns here indicate the heuristics overfit known witness geometry.

Prediction accuracy: Pearson 0.601, Spearman 0.371, mean |error| 0.301.

Strongest solver failures: S093 (unsolved), S099 (unsolved), S077 (13791ms).
Weakest (solver shrugged): S091 (3ms), S082 (5ms), S083 (6ms).

### Batch E — anti-heuristic

> Deliberately oppose the attempt policy in solver/attempts.ts: bait the near-closure rule with delayed closure, force interior routing where perimeter templates lead, starve multi-gate budget division below the reqLen>=90 floor, trigger the flipper diverse-beam ladder on levels a plain DFS would crush, and game the navDensity archetype thresholds with hazard padding.

Prediction accuracy: Pearson 0.046, Spearman 0.259, mean |error| 0.278.

Strongest solver failures: S118 (unsolved), S123 (9832ms), S102 (1480ms).
Weakest (solver shrugged): S106 (4ms), S116 (5ms), S113 (11ms).

### Batch F — wild-witness

> Draw witness paths and rule wrappers from maximally wide, human-aesthetic-free parameter distributions (extreme aspect ratios, tiny and huge grids, arbitrary mechanic mixes). No hypothesis beyond: the corners of level-space that no author would draw are where generalization failures hide.

Prediction accuracy: Pearson 0.457, Spearman 0.512, mean |error| 0.352.

Strongest solver failures: S143 (unsolved), S142 (14409ms), S148 (9008ms).
Weakest (solver shrugged): S141 (2ms), S126 (3ms), S129 (3ms).

## Highlights

### Most novel

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S129 | F | 12x4 | 4 | 0 | ✓ | 3ms | 0.495 | 0.363 | nearClosureRescue@dfs |
| S141 | F | 6x7 | 9 | 0 | ✓ | 2ms | 0.458 | 0.337 | nearClosureRescue@dfs |
| S126 | F | 6x4 | 6 | 0 | ✓ | 3ms | 0.4 | 0.333 | nearClosureRescue@dfs |
| S150 | F | 4x5 | 15 | 1 | ✓ | 3ms | 0.508 | 0.323 | perimeterSweep/cornerHarvest@dfs |
| S028 | B | 15x15 | 90 | 8 | ✗ | 20001ms | 0.816 | 0.321 | — |
| S027 | B | 14x10 | 73 | 6 | ✓ | 4551ms | 0.78 | 0.319 | intersectionHarvest@beam5000 |
| S136 | F | 3x13 | 11 | 0 | ✓ | 4ms | 0.41 | 0.317 | nearClosureRescue@dfs |
| S139 | F | 5x13 | 42 | 3 | ✓ | 215ms | 0.459 | 0.31 | perimeterSweep/cornerHarvest@dfs |

### Most solver-hostile

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S028 | B | 15x15 | 90 | 8 | ✗ | 20001ms | 0.816 | 0.321 | — |
| S030 | B | 13x13 | 87 | 8 | ✗ | 20001ms | 0.778 | 0.269 | — |
| S031 | B | 14x11 | 62 | 6 | ✗ | 20006ms | 0.761 | 0.298 | — |
| S033 | B | 14x10 | 68 | 3 | ✗ | 20001ms | 0.794 | 0.284 | — |
| S036 | B | 12x15 | 96 | 6 | ✗ | 20001ms | 0.647 | 0.253 | — |
| S039 | B | 14x10 | 83 | 6 | ✗ | 20001ms | 0.77 | 0.252 | — |
| S042 | B | 12x13 | 92 | 8 | ✗ | 20001ms | 0.685 | 0.235 | — |
| S043 | B | 14x13 | 71 | 8 | ✗ | 20000ms | 0.798 | 0.259 | — |
| S044 | B | 14x15 | 95 | 7 | ✗ | 20001ms | 0.821 | 0.247 | — |
| S047 | B | 13x12 | 80 | 6 | ✗ | 20001ms | 0.815 | 0.244 | — |

### Simplest but hardest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S077 | D | 11x15 | 53 | 0 | ✓ | 13791ms | 0.229 | 0.24 | default@dfs |
| S069 | C | 15x15 | 97 | 2 | ✓ | 4376ms | 0.163 | 0.152 | perimeterSweep/sideCommitment@dfs |

### Most complex but easiest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S129 | F | 12x4 | 4 | 0 | ✓ | 3ms | 0.495 | 0.363 | nearClosureRescue@dfs |
| S150 | F | 4x5 | 15 | 1 | ✓ | 3ms | 0.508 | 0.323 | perimeterSweep/cornerHarvest@dfs |
| S113 | E | 15x14 | 62 | 4 | ✓ | 11ms | 0.523 | 0.175 | portalFirstTransfer@dfs |
| S104 | E | 7x8 | 26 | 2 | ✓ | 61ms | 0.539 | 0.237 | intersectionHarvest@beam5000 |
| S149 | F | 5x12 | 29 | 1 | ✓ | 80ms | 0.506 | 0.293 | perimeterSweep/cornerHarvest@dfs |
| S119 | E | 7x9 | 29 | 4 | ✓ | 98ms | 0.556 | 0.198 | intersectionHarvest@beam5000 |
| S130 | F | 15x13 | 74 | 5 | ✓ | 109ms | 0.516 | 0.223 | portalFirstTransfer@dfs |
| S013 | A | 10x9 | 40 | 5 | ✓ | 289ms | 0.602 | 0.252 | perimeterSweep/cornerHarvest@dfs |

### Largest prediction errors

- **S141** (F) predicted 0.8 vs actual 0.111 — 2ms
- **S150** (F) predicted 0.78 vs actual 0.14 — 3ms
- **S129** (F) predicted 0.76 vs actual 0.14 — 3ms
- **S113** (E) predicted 0.86 vs actual 0.251 — 11ms
- **S106** (E) predicted 0.736 vs actual 0.163 — 4ms
- **S091** (D) predicted 0.7 vs actual 0.14 — 3ms
- **S126** (F) predicted 0.7 vs actual 0.14 — 3ms
- **S116** (E) predicted 0.74 vs actual 0.181 — 5ms

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
- **S118** (E): unsolved within budget
- **S143** (F): unsolved within budget
- **S035** (B): slow solve (15722ms)
- **S032** (B): slow solve (15136ms)
- **S142** (F): slow solve (14409ms)
- **S077** (D): slow solve (13791ms); deceptively simple
- **S029** (B): slow solve (11369ms)
- **S123** (E): slow solve (9832ms)
- **S148** (F): slow solve (9008ms)
- **S046** (B): slow solve (7839ms)
- **S069** (C): deceptively simple

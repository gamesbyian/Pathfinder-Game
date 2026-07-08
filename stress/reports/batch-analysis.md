# Stress-corpus batch analysis

Generated 2026-07-08T08:07:59.951Z — corpus `stress/stress-levels.json` (generator v1.0.0), benchmark `stress/reports/benchmark-latest.json` at 20000ms budget.

**Totals:** 150 levels · 134 solved · 16 unsolved · global median runtime 464ms.

## Per-batch results

| Batch | Theory | N | Solve | Timeout | Median | p95 | Max | Avg nodes | Novelty | Complexity | Pred. | Actual | Spearman | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | historical-solver-pain | 25 | 96% | 4% | 1326ms | 8363ms | 20001ms | 113546 | 0.195 | 0.508 | 0.839 | 0.713 | 0.79 | **refine** |
| B | structural-complexity | 25 | 56% | 44% | 14827ms | 20001ms | 20003ms | 990165 | 0.257 | 0.757 | 0.858 | 0.922 | 0.32 | **expand** |
| C | deceptive-simplicity | 25 | 100% | 0% | 77ms | 1879ms | 4376ms | 1000176 | 0.168 | 0.163 | 0.716 | 0.506 | 0.299 | **discard-or-rework** |
| D | novel-topology | 25 | 92% | 8% | 28ms | 18760ms | 20001ms | 1981735 | 0.212 | 0.235 | 0.729 | 0.486 | 0.372 | **refine** |
| E | anti-heuristic | 25 | 96% | 4% | 256ms | 8050ms | 20001ms | 869050 | 0.168 | 0.372 | 0.747 | 0.559 | 0.275 | **refine** |
| F | wild-witness | 25 | 96% | 4% | 10ms | 13225ms | 20001ms | 540696 | 0.254 | 0.399 | 0.723 | 0.411 | 0.545 | **refine** |

### Batch A — historical-solver-pain

> Audit history shows solve time correlates with specific feature regimes (high reqInt at mid-to-high density, must-cross + flipper combinations, long paths). A ridge model fitted on audits/raw/latest.json steers generation toward the feature combinations that were historically slow; only candidates in the top predicted-cost band are accepted.

Prediction accuracy: Pearson 0.763, Spearman 0.79, mean |error| 0.126.

Strongest solver failures: S017 (unsolved), S010 (8425ms), S023 (8116ms).
Weakest (solver shrugged): S016 (128ms), S013 (275ms), S011 (292ms).

### Batch B — structural-complexity

> Ignore historical solve times entirely; maximize the interaction between mechanics (portals feeding flipper corridors, must-cross knots beside landmark cages, multi-mechanic cells within tight radii). Tests whether rich mechanic interaction — not raw object count — degrades orchestration.

Prediction accuracy: Pearson 0.195, Spearman 0.32, mean |error| 0.096.

Strongest solver failures: S031 (unsolved), S028 (unsolved), S030 (unsolved).
Weakest (solver shrugged): S041 (1572ms), S037 (1679ms), S038 (2178ms).

### Batch C — deceptive-simplicity

> Few or no objects; the search space explodes from geometry alone — open mid-density grids where reqLen/reqInt admit an enormous number of plausible near-solutions and the heuristic gradient (goal attraction, perimeter bias) is uninformative. Structural complexity is intentionally low while predicted challenge is unknown-to-high.

Prediction accuracy: Pearson 0.204, Spearman 0.299, mean |error| 0.235.

Strongest solver failures: S069 (4376ms), S055 (1879ms), S065 (1877ms).
Weakest (solver shrugged): S058 (5ms), S066 (10ms), S053 (17ms).

### Batch D — novel-topology

> Generate witness paths geometrically unlike the existing solution families (hint corpus), then wrap minimal rules around them. If the solver generalizes, novel solution shapes should cost no more than familiar ones; systematic slowdowns here indicate the heuristics overfit known witness geometry.

Prediction accuracy: Pearson 0.6, Spearman 0.372, mean |error| 0.298.

Strongest solver failures: S093 (unsolved), S099 (unsolved), S077 (13794ms).
Weakest (solver shrugged): S091 (2ms), S080 (4ms), S089 (7ms).

### Batch E — anti-heuristic

> Deliberately oppose the attempt policy in solver/attempts.ts: bait the near-closure rule with delayed closure, force interior routing where perimeter templates lead, starve multi-gate budget division below the reqLen>=90 floor, trigger the flipper diverse-beam ladder on levels a plain DFS would crush, and game the navDensity archetype thresholds with hazard padding.

Prediction accuracy: Pearson 0.04, Spearman 0.275, mean |error| 0.274.

Strongest solver failures: S118 (unsolved), S123 (9728ms), S102 (1340ms).
Weakest (solver shrugged): S116 (7ms), S106 (10ms), S113 (10ms).

### Batch F — wild-witness

> Draw witness paths and rule wrappers from maximally wide, human-aesthetic-free parameter distributions (extreme aspect ratios, tiny and huge grids, arbitrary mechanic mixes). No hypothesis beyond: the corners of level-space that no author would draw are where generalization failures hide.

Prediction accuracy: Pearson 0.47, Spearman 0.545, mean |error| 0.346.

Strongest solver failures: S143 (unsolved), S142 (14278ms), S148 (9012ms).
Weakest (solver shrugged): S126 (2ms), S129 (4ms), S141 (4ms).

## Highlights

### Most novel

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S129 | F | 12x4 | 4 | 0 | ✓ | 4ms | 0.495 | 0.363 | nearClosureRescue@dfs |
| S141 | F | 6x7 | 9 | 0 | ✓ | 4ms | 0.458 | 0.337 | nearClosureRescue@dfs |
| S126 | F | 6x4 | 6 | 0 | ✓ | 2ms | 0.4 | 0.333 | nearClosureRescue@dfs |
| S150 | F | 4x5 | 15 | 1 | ✓ | 4ms | 0.508 | 0.323 | perimeterSweep/cornerHarvest@dfs |
| S028 | B | 15x15 | 90 | 8 | ✗ | 20001ms | 0.816 | 0.321 | — |
| S027 | B | 14x10 | 73 | 6 | ✓ | 4549ms | 0.78 | 0.319 | intersectionHarvest@beam5000 |
| S136 | F | 3x13 | 11 | 0 | ✓ | 5ms | 0.41 | 0.317 | nearClosureRescue@dfs |
| S139 | F | 5x13 | 42 | 3 | ✓ | 213ms | 0.459 | 0.31 | perimeterSweep/cornerHarvest@dfs |

### Most solver-hostile

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S017 | A | 15x11 | 89 | 12 | ✗ | 20001ms | 0.691 | 0.195 | — |
| S028 | B | 15x15 | 90 | 8 | ✗ | 20001ms | 0.816 | 0.321 | — |
| S030 | B | 13x13 | 87 | 8 | ✗ | 20001ms | 0.778 | 0.269 | — |
| S031 | B | 14x11 | 62 | 6 | ✗ | 20003ms | 0.761 | 0.298 | — |
| S033 | B | 14x10 | 68 | 3 | ✗ | 20001ms | 0.794 | 0.284 | — |
| S036 | B | 12x15 | 96 | 6 | ✗ | 20001ms | 0.647 | 0.253 | — |
| S039 | B | 14x10 | 83 | 6 | ✗ | 20001ms | 0.77 | 0.252 | — |
| S042 | B | 12x13 | 92 | 8 | ✗ | 20001ms | 0.685 | 0.235 | — |
| S043 | B | 14x13 | 71 | 8 | ✗ | 20001ms | 0.798 | 0.259 | — |
| S044 | B | 14x15 | 95 | 7 | ✗ | 20001ms | 0.821 | 0.247 | — |

### Simplest but hardest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S077 | D | 11x15 | 53 | 0 | ✓ | 13794ms | 0.229 | 0.24 | default@dfs |
| S069 | C | 15x15 | 97 | 2 | ✓ | 4376ms | 0.163 | 0.152 | perimeterSweep/sideCommitment@dfs |
| S055 | C | 11x11 | 70 | 2 | ✓ | 1879ms | 0.089 | 0.153 | perimeterSweep/perimeterCCW@dfs |
| S065 | C | 14x14 | 90 | 1 | ✓ | 1877ms | 0.174 | 0.165 | perimeterSweep/perimeterCCW@dfs |
| S075 | C | 13x15 | 99 | 2 | ✓ | 1877ms | 0.251 | 0.16 | perimeterSweep/perimeterCW@dfs |
| S057 | C | 13x13 | 91 | 2 | ✓ | 1876ms | 0.15 | 0.158 | perimeterSweep/perimeterCCW@dfs |
| S071 | C | 13x15 | 97 | 2 | ✓ | 1876ms | 0.2 | 0.157 | perimeterSweep/perimeterCW@dfs |

### Most complex but easiest

| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |
|---|---|---|---|---|---|---|---|---|---|
| S129 | F | 12x4 | 4 | 0 | ✓ | 4ms | 0.495 | 0.363 | nearClosureRescue@dfs |
| S150 | F | 4x5 | 15 | 1 | ✓ | 4ms | 0.508 | 0.323 | perimeterSweep/cornerHarvest@dfs |
| S113 | E | 15x14 | 62 | 4 | ✓ | 10ms | 0.523 | 0.175 | portalFirstTransfer@dfs |
| S104 | E | 7x8 | 26 | 2 | ✓ | 58ms | 0.539 | 0.237 | intersectionHarvest@beam5000 |
| S149 | F | 5x12 | 29 | 1 | ✓ | 78ms | 0.506 | 0.293 | perimeterSweep/cornerHarvest@dfs |
| S119 | E | 7x9 | 29 | 4 | ✓ | 103ms | 0.556 | 0.198 | intersectionHarvest@beam5000 |
| S130 | F | 15x13 | 74 | 5 | ✓ | 106ms | 0.516 | 0.223 | portalFirstTransfer@dfs |
| S013 | A | 10x9 | 40 | 5 | ✓ | 275ms | 0.602 | 0.252 | perimeterSweep/cornerHarvest@dfs |

### Largest prediction errors

- **S141** (F) predicted 0.8 vs actual 0.163 — 4ms
- **S113** (E) predicted 0.86 vs actual 0.242 — 10ms
- **S150** (F) predicted 0.78 vs actual 0.163 — 4ms
- **S129** (F) predicted 0.76 vs actual 0.163 — 4ms
- **S091** (D) predicted 0.7 vs actual 0.111 — 2ms
- **S126** (F) predicted 0.7 vs actual 0.111 — 2ms
- **S080** (D) predicted 0.7 vs actual 0.163 — 4ms
- **S144** (F) predicted 0.7 vs actual 0.163 — 4ms

## Recommended permanent regression set

- **S017** (A): unsolved within budget
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
- **S035** (B): slow solve (15838ms)
- **S032** (B): slow solve (14827ms)
- **S142** (F): slow solve (14278ms)
- **S077** (D): slow solve (13794ms); deceptively simple
- **S029** (B): slow solve (10181ms)
- **S123** (E): slow solve (9728ms)
- **S026** (B): slow solve (9677ms)
- **S148** (F): slow solve (9012ms)

# Ablation Analysis: New Test Levels 141-148

**Experiment:** disable-one (9 variants + baseline)  
**Levels:** 141-148 (8 levels)  
**Date:** 2026-05-29  
**Budget per level:** 180,000ms  

## Level Design Goals

| Level | Grid | Design Target | Key Features |
|-------|------|---------------|--------------|
| L141 | 8×8  | POM/POE/POP activation via optional portals | Portal (3,3)↔(6,6), wall barrier, mustPass |
| L142 | 9×9  | MCH activation (2 spread mustCross cells) | mustCross (4,5)+(6,5), reqInt=2 |
| L143 | 11×11 | high-intersection-burden archetype | reqInt=5, reqLenDensity=0.558, 3 mustPass |
| L144 | 10×10 | portal-mustcross-constrained archetype | mustCross×2, portalPairs×2, blockDensity=0.2 |
| L145 | 12×12 | sparse-near-closure archetype | reqInt=1, portalPairs×2, mustPass×1 |
| L146 | 9×9  | MCH + portal combined stress | mustCross×2, mustPass×1, reqInt=2 |
| L147 | 10×10 | Near-Hamiltonian → template-guidance stress | reqLen=62/100 cells, two horizontal barriers |
| L148 | 6×6  | Full-feature minimal stress test | falseGoals×2, mustPass, mustCross, portal |

## Results Summary

All 8 levels solve with any single technique disabled. No correctness regressions.

Note: `disable-one` does not include a baseline run. For baseline reference, see `audits/ablation/2026-05-29T04-50-a71b86e7/baseline.json` (L141-L148: 8/8 solved in 38.9s, L147 in 36.3s via template-perimeter-cw).

| Variant Disabled | Solved | Total Time | L147 Time | L147 Technique |
|-----------------|--------|-----------|-----------|----------------|
| (baseline reference) | 8/8 | 38.9s | 36.3s | template-perimeter-cw |
| structural-modern | 8/8 | 40.3s | 37.1s | template-perimeter-cw |
| structural-conservative | 8/8 | 40.6s | 38.5s | template-perimeter-cw |
| template | **8/8** | **82.3s** | **80.5s** | endurance-longpath |
| portal-optional-modern | 8/8 | 40.6s | 38.8s | template-perimeter-cw |
| portal-optional-endurance | 8/8 | 41.3s | 39.3s | template-perimeter-cw |
| portal-optional-perimeter | 8/8 | 40.0s | 37.9s | template-perimeter-cw |
| must-cross-horizon | 8/8 | 40.2s | 38.1s | template-perimeter-cw |
| endurance-longpath | 8/8 | 40.0s | 38.3s | template-perimeter-cw |
| archetype | 8/8 | 40.5s | 38.7s | template-perimeter-cw |

## Per-Level Timing (ms) by Disabled Variant

| Level | archetype | endurance | mch | poe | pom | pop | sc | sm | template |
|-------|-----------|-----------|-----|-----|-----|-----|----|----|----------|
| L141  | 9 | 8 | 10 | 9 | 9 | 14 | 17 | 71 | 10 |
| L142  | 81 | 83 | 86 | 80 | 99 | 123 | 184 | 661 | 101 |
| L143  | 1259 | 1294 | 1563 | 1433 | 1368 | 1527 | 1456 | 1623 | 1346 |
| L144  | 110 | 100 | 121 | 106 | 107 | 124 | 115 | 176 | 111 |
| L145  | 25 | 24 | 26 | 26 | 25 | 25 | 30 | 38 | 25 |
| L146  | 210 | 210 | 231 | 297 | 205 | 245 | 199 | 524 | 215 |
| L147  | 38726 | 38274 | 38144 | 39317 | 38756 | 37877 | 38518 | 37084 | **80471** |
| L148  | 41 | 43 | 43 | 47 | 44 | 44 | 62 | 124 | 54 |

Abbreviations: mch=must-cross-horizon, poe=portal-optional-endurance, pom=portal-optional-modern, pop=portal-optional-perimeter, sc=structural-conservative, sm=structural-modern.

## Key Findings

### 1. Template is the only efficiency-critical technique

Disabling the template technique causes L147 to slow from ~38s to 80.5s (2.1× slower). L147 was specifically designed as a near-Hamiltonian corridor (reqLen=62 in a 100-cell grid with two horizontal barriers) to stress template guidance. The template technique finds the right pattern quickly; without it, the solver falls back to `endurance-longpath` and takes 2× as long but still succeeds.

No other single technique disable causes meaningful slowdown on any level.

### 2. MCH is not needed for mustCross levels

L142 (reqInt=2, mustCross at (4,5) and (6,5)) and L146 (reqInt=2, mustCross at (5,3) and (5,7)) both solve in <700ms even with MCH disabled. The structural-modern fallback handles mustCross constraints without specialized guidance.

### 3. Archetype routing is redundant

L143 (designed to trigger high-intersection-burden archetype: reqInt=5, reqLenDensity=0.558, 3 mustPass) and L144 (portal-mustcross-constrained: mustCross×2, portalPairs×2, blockDensity=0.2) both solve with archetype disabled. L143 takes 1.26s and L144 takes 110ms via structural-modern fallback.

### 4. Structural-modern slowdown on several levels

When structural-modern is disabled, L141 slows 7.9×, L142 slows 8.1×, L146 slows 2.5×, L148 slows 3.0×. These levels are fast regardless (< 700ms), so the slowdown is not operationally significant, but it confirms SM provides a strong first-pass for simple/medium levels.

### 5. Consistency with prior 39-level ablation

These results replicate the finding from the prior 39-level ablation: template is the only technique with meaningful impact. All other techniques are individually redundant — the solver finds paths via alternative routes. The new levels add more evidence and cover archetypes that were previously underrepresented in the test suite.

## Pruning Recommendations

Based on these results and prior ablation evidence:

- **Structural-conservative (SC)**: Consistently redundant across all 47 tested levels. Candidate for removal.
- **Portal-optional-modern / -endurance / -perimeter (POM/POE/POP)**: Individually redundant. POM provides minor speedup on L141 but not correctness-critical. Candidates for consolidation.
- **Must-cross-horizon (MCH)**: Never correctness-critical across all 47 tested levels. Candidate for removal.
- **Archetype routing**: Redundant — fallback techniques solve classified levels without it. May add complexity without benefit.

**Keep:** Template (significant efficiency gain on near-Hamiltonian levels) and structural-modern (primary fast-path for medium-difficulty levels).

## Design Lessons

- **reqInt ≥ mustCrossCount is required**: Each mustCross cell requires one self-intersection.  
- **Path parity**: reqLen must satisfy `(x_gate + y_gate + reqLen) % 2 == (x_goal + y_goal) % 2`.  
- **Even×even block lattice**: Creates bipartite topology that makes high reqInt (≥5) very hard to achieve — avoid for levels targeting high intersection counts.  
- **Parity-preserving portals**: Both portal endpoints should have the same `(x+y)%2` to avoid breaking path parity.

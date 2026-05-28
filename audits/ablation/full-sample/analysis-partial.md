
════════════════════════════════════════════════════════════════════════
Solver Ablation Analysis
════════════════════════════════════════════════════════════════════════
Input:    audits/ablation/full-sample
Date:     2026-05-28T18:16:52.402Z
Commit:   07b79cf0fd42
Budget:   30000ms
Levels:   10
Variants: 12

── BASELINE SUMMARY ────────────────────────────────────────────────
Solved: 10/10   Failed: 0   Avg time: 8182ms

First-success technique distribution (who solved what):
  Technique                                  Levels  Avg overhead
  ────────────────────────────────────────────────────────────
  structural-modern                               5  0ms
  archetype-high-intersection-burden-intersectionHarvest      2  0ms
  template-perimeter-cw                           1  0ms
  archetype-sparse-near-closure-nearClosureRescue      1  0ms
  archetype-portal-mustcross-constrained-portalCommitted      1  0ms

── ARCHETYPE PASS EFFICIENCY ───────────────────────────────────────
For each level solved by an archetype pass in baseline:
Does removing the archetype make it faster, slower, or impossible?

  Level    Archetype                                        Base     NoArch     Ratio    Essential
  ────────────────────────────────────────────────────────────────────────────────────────────
  L139    archetype-high-intersection-burden-intersectionHarvest 43153ms  5132ms     8.41×    NO  — 8.4× slower
  L134    archetype-portal-mustcross-constrained-portalCommitted 81ms     47ms       1.72×    NO  — 1.7× slower
  L108    archetype-sparse-near-closure-nearClosureRescue  49ms     32ms       1.53×    NO  — 1.5× slower
  L92     archetype-high-intersection-burden-intersectionHarvest 11613ms  FAIL       ∞        YES — fails without

  Essential (would fail without archetype): L92
  Inefficient (archetype slower than fallback at this budget): L139, L134, L108

── DISABLE-ONE REGRESSIONS ─────────────────────────────────────────
Which techniques, when removed, cause levels to fail?

  Technique                            Verdict        Regressions
  ──────────────────────────────────────────────────────────────────────
  archetype                            SITUATIONAL      1  L92
  endurance-longpath                   REDUNDANT        0  none
  must-cross-horizon                   REDUNDANT        0  none
  portal-optional-endurance            REDUNDANT        0  none
  portal-optional-modern               REDUNDANT        0  none
  portal-optional-perimeter            REDUNDANT        0  none
  structural-conservative              REDUNDANT        0  none
  structural-modern                    REDUNDANT        0  none
  template                             REDUNDANT        0  none

SITUATIONAL (1–2 regressions):  archetype
REDUNDANT (0 regressions):       endurance-longpath, must-cross-horizon, portal-optional-endurance, portal-optional-modern, portal-optional-perimeter, structural-conservative, structural-modern, template

── TIMING IMPACT (slowdown cost of disabling each technique) ───────
No failures, but removal may significantly slow solving. Δtime = total extra ms across all levels.

  Technique                            Δ total      Worst level  Worst ×
  ────────────────────────────────────────────────────────────────────────
  structural-modern                    +26s         L140         7.9×
  must-cross-horizon                   +2s          L50          1.1×
  endurance-longpath                   +1s          -            -
  portal-optional-endurance            +1s          -            -
  template                             +1s          L50          1.1×
  portal-optional-perimeter            +0s          L50          1.1×
  structural-conservative              +0s          -            -
  portal-optional-modern               0s           -            -
  archetype                            -37s         L139         0.1×


  ANOMALY — faster without the technique (may be budget-inefficient at test scale):
  disable-archetype: 37s faster total | L139: 43153ms → 5132ms  (0.12×)
    L139   43153ms → 5132ms  (0.12×)  archetype-high-intersection-burden-intersectionHarvest → structural-modern
  NOTE: Speedup anomalies are often budget-scale artifacts — reduced test budget
  causes the technique to fail in stage-0 (wasting its fraction), while the fallback
  succeeds in fewer virtual nodes. At production budget this anomaly may disappear.
  disable-structural-modern level detail:
    L140   3840ms → 30480ms  (7.9×)  structural-modern → must-cross-horizon
    L120   20ms → 207ms  (10.3×)  structural-modern → must-cross-horizon

── SOLO COVERAGE (each technique alone with ≈full budget) ──────────
How many levels can each technique solve by itself?

  Technique                            Alone  Coverage  Fallback
  ────────────────────────────────────────────────────────────────────
  structural-conservative                  9   90.0%  ██████████████████ 
  structural-modern                        8   80.0%  ████████████████ (+2 via fallback)

Minimum greedy covering set (order matters):
  + structural-conservative              → +9 new (9 total)
  Uncovered by any solo technique: L92

Canary levels (solvable by exactly ONE technique standalone):
  structural-conservative: L50

── OVERHEAD ANALYSIS (time wasted before winning technique) ────────
True overhead (total elapsed − winning attempt elapsed) across all solved levels:
  71s overhead of 82s total (87.1%)
  (Captures failed-stage time that attempt-level overhead misses.)
  NOTE: at reduced test budgets, stage-0 exhausts its virtual-time fraction before
  solving hard levels, inflating overhead. At production budget overhead is lower.

High-overhead levels (stages that ran before the winning technique):
  Level    Winning tech                         Win attempt    Overhead     Fraction
  ────────────────────────────────────────────────────────────────────────────────
  L139    archetype-high-intersection-burden-intersectionHarvest 4267ms         39s          90%
  L50     template-perimeter-cw                751ms          22s          97%
  L92     archetype-high-intersection-burden-intersectionHarvest 1022ms         11s          91%

── PER-FEATURE REGRESSION BREAKDOWN ────────────────────────────────
Which techniques matter most for each level feature?

  Feature: hasPortals  (4 levels, 4 solved by baseline)
    disable-archetype: 1 regression(s): L92

  Feature: hasMustCross  (7 levels, 7 solved by baseline)
    disable-archetype: 1 regression(s): L92

  Feature: hasMustPass  (6 levels, 6 solved by baseline)
    disable-archetype: 1 regression(s): L92

  Feature: hasGeese  (6 levels, 6 solved by baseline)
    disable-archetype: 1 regression(s): L92

  Feature: hasFilters  (4 levels, 4 solved by baseline)
    disable-archetype: 1 regression(s): L92

  Feature: hasFalseGoals  (2 levels, 2 solved by baseline)
    No regressions when any single technique is disabled.

  Feature: multiGate  (3 levels, 3 solved by baseline)
    No regressions when any single technique is disabled.

── VERDICT SUMMARY ─────────────────────────────────────────────────

QUESTION: Which techniques can be removed without any regression?
  Safe to disable: endurance-longpath, must-cross-horizon, portal-optional-endurance, portal-optional-modern, portal-optional-perimeter, structural-conservative, structural-modern, template

QUESTION: Which technique combination covers the most levels solo?
  Greedy minimum set: structural-conservative
  NOTE: 1 level(s) require multi-technique solving: L92

QUESTION: Is global budget the bottleneck (vs technique ordering)?

QUESTION: Where is solve time wasted?
  87.1% of total solve time is wasted in failed stages before the winning technique.
  Worst case: L139 wastes 39s in prior stages; archetype-high-intersection-burden-intersectionHarvest then solves in 4267ms.



════════════════════════════════════════════════════════════════════════
Solver Ablation Analysis
════════════════════════════════════════════════════════════════════════
Input:    audits/ablation/full-sample
Date:     2026-05-28T18:16:52.402Z
Commit:   07b79cf0fd42
Budget:   30000ms
Levels:   10
Variants: 13

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
  template                                 1   10.0%  ██ (+8 via fallback)

Minimum greedy covering set (order matters):
  + structural-conservative              → +9 new (9 total)
  Uncovered by any solo technique: L92

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

QUESTION: What is the minimum technique set achieving full coverage?
  Required (regressions when disabled): archetype
  Also needed for coverage: structural-conservative (+L1, L3, L50, L108, L120, L130, L134, L139, L140)
  Minimum viable set: { archetype, structural-conservative }

QUESTION: Is global budget the bottleneck (vs technique ordering)?
  (Budget sweep variants not yet available.)

QUESTION: Which technique order minimizes total wall time?
  Prioritize early (saves most time): structural-modern (+26s cost if removed), must-cross-horizon (+2s cost if removed), endurance-longpath (+1s cost if removed)
  Move late (narrow / expensive): archetype passes — essential for only ~1 level class,
    8× slower than structural-modern on non-essential levels; running early wastes budget.

QUESTION: Where is solve time wasted?
  87.1% of total solve time is wasted in failed stages before the winning technique.
  Worst case: L139 wastes 39s in prior stages; archetype-high-intersection-burden-intersectionHarvest then solves in 4267ms.

── ACTIONABLE RECOMMENDATIONS ──────────────────────────────────────

1. [LOW] Candidate for removal: 5 technique(s) with zero coverage and negligible timing impact
   endurance-longpath, must-cross-horizon, portal-optional-endurance, portal-optional-modern, portal-optional-perimeter cause zero regressions, zero solo coverage, and <2s total timing delta when disabled on this sample. They appear to be dead weight — verify on a larger level set before removing.

2. [HIGH] Narrow the archetype classifier to avoid matching levels structural can handle
   L139 is classified as archetype-high-intersection-burden-intersectionHarvest but solves 8.4× FASTER without archetype (5132ms vs 43153ms). Archetype is essential only for L92 (portals + high reqInt). Filter the high-intersection-burden classifier to require portal or mustCross to exclude levels that structural-modern can handle quickly.

3. [MEDIUM] Increase stage-0 structural budget for high-reqInt levels
   87% of solve time is wasted in failed stages. L139 spends 39s in failed prior stages before archetype-high-intersection-burden-intersectionHarvest wins in 4267ms. Giving stage-0 more budget for structural passes on hard levels (reqInt≥8) could eliminate these stage-2 escalations and reduce median solve time.

4. [MEDIUM] Promote structural-conservative to first-attempt position within stage-0
   structural-conservative covers 9/10 levels solo — more than structural-modern (8). Running it before other structural variants maximizes early-exit rate.



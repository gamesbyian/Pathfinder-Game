
════════════════════════════════════════════════════════════════════════
Solver Ablation Analysis
════════════════════════════════════════════════════════════════════════
Input:    audits/ablation/stratified-39
Date:     2026-05-28T22:37:07.000Z
Commit:   0a4070447aa0
Budget:   180000ms
Levels:   39
Variants: 10

── BASELINE SUMMARY ────────────────────────────────────────────────
Solved: 39/39   Failed: 0   Avg time: 8462ms

First-success technique distribution (who solved what):
  Technique                                  Levels  Avg overhead
  ────────────────────────────────────────────────────────────
  structural-modern                              25  0ms
  template-perimeter-cw                           5  0ms
  archetype-sparse-near-closure-nearClosureRescue      3  0ms
  archetype-high-intersection-burden-intersectionHarvest      3  0ms
  template-best-focus:corner-harvest              1  1025ms
  archetype-portal-mustcross-constrained-portalCommitted      1  0ms
  template-corner-harvest                         1  0ms

── ARCHETYPE PASS EFFICIENCY ───────────────────────────────────────
For each level solved by an archetype pass in baseline:
Does removing the archetype make it faster, slower, or impossible?

  Level    Archetype                                        Base     NoArch     Ratio    Essential
  ────────────────────────────────────────────────────────────────────────────────────────────
  L138    archetype-high-intersection-burden-intersectionHarvest 14161ms  14900ms    0.95×    NO  — similar speed
  L139    archetype-high-intersection-burden-intersectionHarvest 4802ms   5057ms     0.95×    NO  — similar speed
  L134    archetype-portal-mustcross-constrained-portalCommitted 64ms     92ms       0.70×    NO  — similar speed
  L83     archetype-sparse-near-closure-nearClosureRescue  41ms     60ms       0.68×    NO  — similar speed
  L30     archetype-sparse-near-closure-nearClosureRescue  13ms     22ms       0.59×    NO  — similar speed
  L108    archetype-sparse-near-closure-nearClosureRescue  21ms     37ms       0.57×    NO  — similar speed
  L92     archetype-high-intersection-burden-intersectionHarvest 20186ms  36785ms    0.55×    NO  — similar speed


── DISABLE-ONE REGRESSIONS ─────────────────────────────────────────
Which techniques, when removed, cause levels to fail?

  Technique                            Verdict        Regressions
  ──────────────────────────────────────────────────────────────────────
  template                             SITUATIONAL      2  L7, L135
  archetype                            SITUATIONAL      1  L26
  endurance-longpath                   REDUNDANT        0  none
  must-cross-horizon                   REDUNDANT        0  none
  portal-optional-endurance            REDUNDANT        0  none
  portal-optional-modern               REDUNDANT        0  none
  portal-optional-perimeter            REDUNDANT        0  none
  structural-conservative              REDUNDANT        0  none
  structural-modern                    REDUNDANT        0  none

SITUATIONAL (1–2 regressions):  template, archetype
REDUNDANT (0 regressions):       endurance-longpath, must-cross-horizon, portal-optional-endurance, portal-optional-modern, portal-optional-perimeter, structural-conservative, structural-modern

── TIMING IMPACT (slowdown cost of disabling each technique) ───────
No failures, but removal may significantly slow solving. Δtime = total extra ms across all levels.

  Technique                            Δ total      Worst level  Worst ×
  ────────────────────────────────────────────────────────────────────────
  structural-modern                    +40s         L80          7.8×
  endurance-longpath                   +13s         L26          1.1×
  must-cross-horizon                   +12s         L73          1.0×
  template                             +10s         L50          1.3×
  archetype                            +3s          L92          1.8×
  portal-optional-endurance            -2s          -            -
  portal-optional-perimeter            -3s          -            -
  portal-optional-modern               -6s          -            -
  structural-conservative              -10s         L79          2.3×


  ANOMALY — faster without the technique (may be budget-inefficient at test scale):
  disable-structural-conservative: 10s faster total | L79: 62ms → 140ms  (2.26×)
    L7     10350ms → 4302ms  (0.42×)  template-best-focus:corner-harvest → endurance-longpath
  NOTE: Speedup anomalies are often budget-scale artifacts — reduced test budget
  causes the technique to fail in stage-0 (wasting its fraction), while the fallback
  succeeds in fewer virtual nodes. At production budget this anomaly may disappear.
  disable-structural-modern level detail:
    L80    4313ms → 33855ms  (7.8×)  structural-modern → template-perimeter-cw
    L11    14ms → 19386ms  (1384.7×)  structural-modern → template-corner-harvest
    L136   5682ms → 23899ms  (4.2×)  structural-modern → template-perimeter-cw
    L79    62ms → 3566ms  (57.5×)  structural-modern → portal-optional-modern-no-portal
    L65    26ms → 448ms  (17.2×)  structural-modern → portal-optional-modern-no-portal
    L10    35ms → 211ms  (6.0×)  structural-modern → must-cross-horizon
    L6     122ms → 276ms  (2.3×)  structural-modern → must-cross-horizon
    L19    22ms → 164ms  (7.5×)  structural-modern → portal-optional-modern-no-portal
    L83    41ms → 73ms  (1.8×)  same tech: archetype-sparse-near-closure-nearClosureRescue
    L4     36ms → 59ms  (1.6×)  structural-modern → portal-optional-modern-no-portal
  disable-archetype level detail:
    L92    20186ms → 36785ms  (1.8×)  archetype-high-intersection-burden-intersectionHarvest → structural-modern
    L34    4052ms → 10377ms  (2.6×)  same tech: template-perimeter-cw
    L50    33853ms → 39847ms  (1.2×)  same tech: template-perimeter-cw
    L74    2091ms → 4148ms  (2.0×)  same tech: structural-modern
    L56    798ms → 1453ms  (1.8×)  same tech: structural-modern
    L61    277ms → 689ms  (2.5×)  same tech: structural-modern
    L60    212ms → 358ms  (1.7×)  same tech: structural-modern
    L79    62ms → 114ms  (1.8×)  same tech: structural-modern
    L108   21ms → 37ms  (1.8×)  archetype-sparse-near-closure-nearClosureRescue → structural-modern
    L30    13ms → 22ms  (1.7×)  archetype-sparse-near-closure-nearClosureRescue → structural-modern

── OVERHEAD ANALYSIS (time wasted before winning technique) ────────
True overhead (total elapsed − winning attempt elapsed) across all solved levels:
  266s overhead of 330s total (80.5%)
  (Captures failed-stage time that attempt-level overhead misses.)
  NOTE: at reduced test budgets, stage-0 exhausts its virtual-time fraction before
  solving hard levels, inflating overhead. At production budget overhead is lower.

High-overhead levels (stages that ran before the winning technique):
  Level    Winning tech                         Win attempt    Overhead     Fraction
  ────────────────────────────────────────────────────────────────────────────────
  L73     template-perimeter-cw                284ms          96s          100%
  L26     template-perimeter-cw                4474ms         80s          95%
  L47     template-perimeter-cw                406ms          35s          99%
  L50     template-perimeter-cw                695ms          33s          98%
  L7      template-best-focus:corner-harvest   8ms            10s          100%
  L34     template-perimeter-cw                48ms           4s           99%
  L135    template-corner-harvest              7ms            3s           100%
  L80     structural-modern                    1778ms         3s           59%
  L92     archetype-high-intersection-burden-intersectionHarvest 19356ms        1s           4%
  L20     structural-modern                    1354ms         1s           27%

── PER-FEATURE REGRESSION BREAKDOWN ────────────────────────────────
Which techniques matter most for each level feature?

  Feature: hasPortals  (19 levels, 19 solved by baseline)
    disable-template: 1 regression(s): L135
    disable-archetype: 1 regression(s): L26

  Feature: hasMustCross  (14 levels, 14 solved by baseline)
    No regressions when any single technique is disabled.

  Feature: hasMustPass  (21 levels, 21 solved by baseline)
    disable-template: 2 regression(s): L7, L135
    disable-archetype: 1 regression(s): L26

  Feature: hasGeese  (21 levels, 21 solved by baseline)
    disable-template: 2 regression(s): L7, L135
    disable-archetype: 1 regression(s): L26

  Feature: hasFilters  (11 levels, 11 solved by baseline)
    No regressions when any single technique is disabled.

  Feature: hasFalseGoals  (7 levels, 7 solved by baseline)
    disable-template: 1 regression(s): L7

  Feature: multiGate  (14 levels, 14 solved by baseline)
    disable-archetype: 1 regression(s): L26

── VERDICT SUMMARY ─────────────────────────────────────────────────

QUESTION: Which techniques can be removed without any regression?
  Safe to disable: endurance-longpath, must-cross-horizon, portal-optional-endurance, portal-optional-modern, portal-optional-perimeter, structural-conservative, structural-modern

QUESTION: Which technique combination covers the most levels solo?

QUESTION: What is the minimum technique set achieving full coverage?
  Required (from disable-one): template, archetype

QUESTION: Is global budget the bottleneck (vs technique ordering)?
  (Budget sweep variants not yet available.)

QUESTION: Which technique order minimizes total wall time?

QUESTION: Where is solve time wasted?
  80.5% of total solve time is wasted in failed stages before the winning technique.
  Worst case: L73 wastes 96s in prior stages; template-perimeter-cw then solves in 284ms.

── ACTIONABLE RECOMMENDATIONS ──────────────────────────────────────

1. [MEDIUM] Increase stage-0 structural budget for high-reqInt levels
   81% of solve time is wasted in failed stages. L73 spends 96s in failed prior stages before template-perimeter-cw wins in 284ms. Giving stage-0 more budget for structural passes on hard levels (reqInt≥8) could eliminate these stage-2 escalations and reduce median solve time.



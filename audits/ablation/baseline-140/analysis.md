
════════════════════════════════════════════════════════════════════════
Solver Ablation Analysis
════════════════════════════════════════════════════════════════════════
Input:    audits/ablation/baseline-140
Date:     2026-05-28T22:29:48.748Z
Commit:   d056869725a8
Budget:   180000ms
Levels:   140
Variants: 1

── BASELINE SUMMARY ────────────────────────────────────────────────
Solved: 140/140   Failed: 0   Avg time: 2554ms

First-success technique distribution (who solved what):
  Technique                                  Levels  Avg overhead
  ────────────────────────────────────────────────────────────
  structural-modern                             126  0ms
  template-perimeter-cw                           5  0ms
  archetype-sparse-near-closure-nearClosureRescue      3  0ms
  archetype-high-intersection-burden-intersectionHarvest      3  0ms
  template-best-focus:corner-harvest              1  1025ms
  archetype-portal-mustcross-constrained-portalCommitted      1  0ms
  template-corner-harvest                         1  0ms

── OVERHEAD ANALYSIS (time wasted before winning technique) ────────
True overhead (total elapsed − winning attempt elapsed) across all solved levels:
  266s overhead of 358s total (74.5%)
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

── VERDICT SUMMARY ─────────────────────────────────────────────────

QUESTION: Which techniques can be removed without any regression?

QUESTION: Which technique combination covers the most levels solo?

QUESTION: What is the minimum technique set achieving full coverage?

QUESTION: Is global budget the bottleneck (vs technique ordering)?
  (Budget sweep variants not yet available.)

QUESTION: Which technique order minimizes total wall time?

QUESTION: Where is solve time wasted?
  74.5% of total solve time is wasted in failed stages before the winning technique.
  Worst case: L73 wastes 96s in prior stages; template-perimeter-cw then solves in 284ms.

── ACTIONABLE RECOMMENDATIONS ──────────────────────────────────────

1. [MEDIUM] Increase stage-0 structural budget for high-reqInt levels
   74% of solve time is wasted in failed stages. L73 spends 96s in failed prior stages before template-perimeter-cw wins in 284ms. Giving stage-0 more budget for structural passes on hard levels (reqInt≥8) could eliminate these stage-2 escalations and reduce median solve time.



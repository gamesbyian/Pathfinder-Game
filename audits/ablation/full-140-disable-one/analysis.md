
════════════════════════════════════════════════════════════════════════
Solver Ablation Analysis
════════════════════════════════════════════════════════════════════════
Input:    audits/ablation/full-140-disable-one
Date:     2026-05-29T06:00:02.140Z
Commit:   1014a4546a48
Budget:   180000ms
Levels:   140
Variants: 3

── DISABLE-ONE REGRESSIONS ─────────────────────────────────────────
Which techniques, when removed, cause levels to fail?

  Technique                            Verdict        Regressions
  ──────────────────────────────────────────────────────────────────────
  archetype                            REDUNDANT        0  none
  structural-modern                    REDUNDANT        0  none
  template                             REDUNDANT        0  none

REDUNDANT (0 regressions):       archetype, structural-modern, template

── VERDICT SUMMARY ─────────────────────────────────────────────────

QUESTION: Which techniques can be removed without any regression?
  Safe to disable: archetype, structural-modern, template

QUESTION: Which technique combination covers the most levels solo?

QUESTION: What is the minimum technique set achieving full coverage?
  Required (from disable-one): none (all techniques redundant on this sample)

QUESTION: Is global budget the bottleneck (vs technique ordering)?
  (Budget sweep variants not yet available.)

QUESTION: Which technique order minimizes total wall time?

QUESTION: Where is solve time wasted?

── ACTIONABLE RECOMMENDATIONS ──────────────────────────────────────

  No recommendations generated from available data.


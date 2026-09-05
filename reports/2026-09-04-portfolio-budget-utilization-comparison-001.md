# Production's per-attempt time budget is bimodal and often slack; static-portfolio's per-attempt work ceiling is almost always the real limiter

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — `elapsedMs`/`allocatedBudgetMs` for production-arm's 1,720 attempts, and `workSpent`/`allocatedWorkCeiling` for static-portfolio-arm's 518 attempts, both from `reports/portfolio/static-portfolio-entrypoint-production-ab-001/{production-arm,static-portfolio-arm}.json` (40-level A/B), no new dispatch
> **Decision:** the two arms' governing constraints are genuinely different mechanisms and each mostly binds via its *own* metric. Production-arm's time-budget utilization is bimodal (mean ratio 0.496): 36.2% of attempts land at ≥99% of their allocated ms (essentially timing out at the cap) while 25.8% finish under 10% of it, with comparatively little in between (50-90%: 6.3%, 90-99%: 0.6%). Static-portfolio-arm's *work*-ceiling utilization (the metric that actually governs it — its `allocatedBudgetMs` is a flat, near-never-hit 600,000ms safety cap on every attempt) is much more concentrated at saturation: mean ratio 0.846, with 53.9% of attempts at ≥99% of their work ceiling and only 1.2% under 10%.
> **Remaining gate:** none — descriptive comparison using already-collected data. A direct apples-to-apples comparison would require production-arm to expose a per-attempt work ceiling, which it does not in this dataset.
> **Evidence role:** discovery — first budget-utilization characterization of this 40-level A/B's raw attempt telemetry (prior work on this dataset focused on stage-level and technique-level outcomes, not per-attempt utilization)
> **Selection:** whole comparable attempt population in both arms (1,720 + 518 attempts), not a sample

## Method

For production-arm: computed `elapsedMs / allocatedBudgetMs` per attempt (1,077 of 1,720 attempts carry a nonzero `allocatedBudgetMs`) and bucketed the ratio. For static-portfolio-arm: initially computed the same ms-based ratio, but found `allocatedBudgetMs` is a flat `600000` on every attempt (a wall-clock safety cap, not the actual governing constraint) — the file's `workSpent`/`allocatedWorkCeiling` fields are the real per-attempt work-share allocation and stopping condition (e.g. one attempt: `workSpent=3705629` against `allocatedWorkCeiling=3705622`, an almost-exact match), so the work-based ratio is reported instead as the meaningful comparison for that arm.

## Result

| | production-arm (ms-based) | static-portfolio-arm (work-based) |
|---|---:|---:|
| attempts measured | 1,077 | 518 |
| mean utilization ratio | 0.496 | 0.846 |
| <10% | 25.8% | 1.2% |
| 10-50% | 31.0% | 8.9% |
| 50-90% | 6.3% | 30.9% |
| 90-99% | 0.6% | 5.2% |
| ≥99% | **36.2%** | **53.9%** |
| `timedOut` rate (all attempts) | 76.9% | 53.3%* |
| `ok` rate (all attempts) | 1.0% | 2.7% |

*static-portfolio-arm's `timedOut` flag is ms-based and mostly uninformative given the near-never-binding ms cap — included for completeness, not as a work-utilization signal.

## Interpretation

Both arms spend most of their attempts *not* solving (`ok` rates of 1.0% and 2.7% reflect that most individual attempts within a level's search are unsuccessful sub-attempts, consistent with this being raw attempt-level telemetry, not level-level outcomes). But their utilization shapes differ: static-portfolio's fixed per-specialist work-share slicing is tight and usually fully consumed (53.9% of attempts exhaust ≥99% of their slice, mean 84.6% utilized) — the static-portfolio scheme leaves little slack in its allocation. Production's per-stage ms allocation is looser and more bimodal — a large minority of attempts (36.2%) do run to their full ms allocation, but a comparable-or-larger share (56.8% combined <10%+10-50%) finish well under it, leaving real unused slack in a meaningful fraction of the ladder's per-attempt time budgets.

This is useful context for Workstream 2's fixed-work scheduler/repricing line: it suggests production's ms-based per-attempt allocation carries more headroom on average than static-portfolio's work-based allocation, which could mean either (a) production's allocations are already generously sized relative to what most attempts need, or (b) the bimodal shape reflects two genuinely different attempt populations (quick-exhaust vs. hard-grind) that a single allocation number is imperfectly sized for either extreme. This report does not distinguish between those explanations.

## What this does not establish

- The two ratios are measured on different units (ms vs. work) because production-arm exposes no per-attempt work ceiling in this dataset — not a strictly apples-to-apples comparison, only a same-shape-of-question comparison.
- Does not test whether tightening production's ms allocations (or loosening static-portfolio's work ceilings) would change solve outcomes — that is a scheduler-repricing question requiring its own A/B, per standing Workstream 2 discipline.
- Single 40-level A/B; the same dataset used throughout this session's earlier production-ladder marginal-value work.

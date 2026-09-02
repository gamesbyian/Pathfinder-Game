# Repair reconstruction: does operator-incapability or reconstruction cost correlate with any static level feature?

> **Status:** inconclusive
> **Last evidence:** 2026-09-02 — this report
> **Decision:** No static level feature shows a reliable separation between operator-incapable and reconstructable exact-live cases, or a reliable correlation with reconstruction cost among the reconstructable minority, at the currently available sample size (n=32: 8 reconstructable, 24 operator-incapable). Do not design a static-feature-triggered repair mechanism from this population.
> **Remaining gate:** a substantially larger classified sample (order 100+, several times the cost of the recurrence-check program that produced the current 32) would be needed to distinguish a real weak effect from the multiple-comparison noise this exploratory scan cannot rule out. Given Workstream 6 is a secondary supporting program, that cost is not currently justified — treat this sub-question as closed at current evidence unless a cheaper labeling method appears.
> **Evidence role:** discovery
> **Selection:** observational (every one of 19 legal static features scanned and reported, not a chosen subset)

## Context

[`docs/solver-optimization-workstreams.md`](../docs/solver-optimization-workstreams.md) Workstream 6 concluded its recurrence-check line at n=28 ([`2026-09-02-repair-live-prefix-reconstruction-near-budget-boundary-recurrence.md`](2026-09-02-repair-live-prefix-reconstruction-near-budget-boundary-recurrence.md)), closing with an explicit pointer to "the next repair-reachability question, if this program continues, is qualitatively different: whether operator-incapability (or reconstruction cost, among the reconstructable minority) correlates with any legal static level feature." This report answers that question with the already-published classification outcomes — no new CP-SAT/repair-diagnostic runs.

## Method

New tool: `scripts/analyze-repair-reconstruction-static-features.mjs` (paired test: `scripts/analyze-repair-reconstruction-static-features-node-test.mjs`).

- `CLASSIFICATIONS`: the outcome (reconstructable + cost multiple over the 4,000-node production budget, or operator-incapable) for all 32 already-published exact-live cases, transcribed from three source reports: the original mined pair (`R00648`, `R03176` — operator-incapable), the `R00630`/`R02449` classification (both reconstructable, the comfortably-under-budget and far-over-budget extremes), and the full n=28 recurrence-check population (batches 1–3). `R02919` (CP-SAT boundary never converged) is excluded, matching the source report's own treatment.
- Joins each level id against corpus2 (`data/stress/stress-levels-random.json`) static features via `scripts/stress/features.mjs`'s `levelFeatures()` — the same extractor `analyze-technique-niches.mjs` uses, so results are on a directly comparable feature vocabulary to that report.
- `operator-incapable` vs. `reconstructable` group comparison: mean, standard deviation, and Cohen's-d-style standardized difference for all 19 legal static features (grid/aspect, `reqLen`/`reqInt`/coverage ratio, mechanic counts).
- Among the 8 reconstructable cases with a known cost multiple, a Spearman rank correlation (log cost vs. each static feature) — n=8 is too small for anything stronger.

Run: `node scripts/analyze-repair-reconstruction-static-features.mjs`. Full output: [`reports/stress/repair-reconstruction/repair-reconstruction-static-features.json`](stress/repair-reconstruction/repair-reconstruction-static-features.json).

## Result

**No feature separates the two groups cleanly.** The largest standardized differences, out of all 19 features scanned:

| feature | operator-incapable mean | reconstructable mean | standardized difference |
|---|---:|---:|---:|
| `falseGoals` | 2.42 | 5.00 | 0.84 |
| `blocks` | 20.42 | 13.38 | −0.78 |
| `surround` | 0.88 | 0.13 | −0.77 |
| `adjTurn` | 4.33 | 2.00 | −0.77 |
| `requiredPathCoverageRatio` | 0.73 | 0.67 | −0.63 |
| `flippers` | 2.63 | 4.63 | 0.63 |
| `mustCross` | 1.17 | 2.63 | 0.62 |
| `mustPass` | 2.92 | 4.50 | 0.52 |

**No cost-multiple correlation is strong either.** Among the 8 reconstructable cases, the largest Spearman correlation between log(cost multiple) and any feature is `mustPass` at ρ = −0.63 (n=8).

## Why this is inconclusive, not a finding

With group sizes of 8 and 24, a standardized difference of ~0.8 is well inside what pure sampling noise produces — this is by conventional (Cohen's) thresholds a "large" effect size, but the *sample* is small enough that a large effect size is not the same as a reliable one; a handful of individual cases can move a mean of 8 items substantially. This was also an **exploratory scan across all 19 features** (and, for the cost correlation, all 19 again against only 8 points): scanning that many candidates and reporting the largest hit is exactly the situation [`solver-evaluation-evidence.md`](../docs/solver-evaluation-evidence.md)'s selection-pressure discipline warns about — with 19 independent-ish comparisons, seeing at least one |d| near 0.8 by chance alone is unsurprising, not evidence of a real effect. Compare [`2026-09-01-technique-niches-and-unsupported-level-anatomy.md`](2026-09-01-technique-niches-and-unsupported-level-anatomy.md)'s analogous frozen-T1-support scan, which found a similarly-shaped top feature (`constrainedObjects`) at d≈1.23 — but on group sizes of 649 vs. ~1,300, two orders of magnitude larger, where a large standardized difference is actually informative.

No individual feature or small feature combination here is worth promoting to a routing/mechanism trigger. This is not the same claim as "there is no real effect" — a real but modest effect could easily be hiding under this much noise — only that this sample cannot distinguish a real effect from none.

## Disposition

Per the closing recurrence-check report's own framing, this sub-question is now answered at the currently available evidence scale: **inconclusive, and not worth pursuing further without a much larger classified sample.** Generating that sample means running the full census-rollback-window → elite-path-dump → CP-SAT retreat-binary-search → plateau-rollout-classifier pipeline several more times at recurrence-check scale (each batch of ~10-12 cases costs real CP-SAT/diagnostic compute) — a materially larger investment than this report's own zero-new-runs reanalysis, for a workstream [`solver-optimization-workstreams.md`](../docs/solver-optimization-workstreams.md) already ranks below Workstream 2. **Recommendation: do not fund a larger batch for this specific question.** If Workstream 6 resumes, the next value-of-information step should look for a cheaper source of additional labeled cases (e.g., mining already-collected repair-plateau telemetry from unrelated runs for cases that already carry a resolved live/dead boundary) rather than commissioning a fresh CP-SAT-diagnostic batch solely to power this correlation question.

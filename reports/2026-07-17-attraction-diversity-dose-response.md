# Attraction-diversity dose-response experiment (2026-07-17)

## Background

The attraction-diversity last-resort pass (`solveLevel()` in `modules/solver/orchestration.ts`, added
2026-07-16 — see `reports/2026-07-16-phase-d-attraction-diversity-implementation.md`) runs the main
attempt ladder one more time, with `SCORE_GOAL_ATTRACTION` disabled, in its own additive budget
controlled by `ATTRACTION_DIVERSITY_BUDGET_FRACTION` (currently `1.0`, i.e. another full nominal
`timeBudgetMs`). That value was chosen because it matched the budget the original diagnosis used to
find the rescue cases — not from any measured dose-response curve. The implementation report itself
noted evidence that budget matters (an earlier version at fraction 0.15 rescued only 2 of 6
known-rescuable levels; bumping to 1.0 rescued 4 of 6) but left open whether 1.0 is already
near-optimal or whether more budget would rescue meaningfully more of the general population.

This experiment measures that directly: the same 30-level sample used for the original rough-estimate
verification, solved at four different `attractionDiversityBudgetFractionOverride` values.

## Method

- **Sample**: a seeded-random (mulberry32, seed `20260716`) draw of 30 levels from the `dfs-plain`
  cluster in `reports/stress/unsolved-failure-clusters.json` (843 entries) — identical to the sample
  used in the original Phase D verification, so results are directly comparable.
- **Settings, every solve**: `timeBudgetMs: 10000`, `repairBudgetFractionOverride: 0` (isolates the
  attraction-diversity pass's own contribution from repair's unrelated 6x extension, per this
  session's established solver-testing policy), `attractionDiversityBudgetFractionOverride` swept
  over `[0.5, 1.0, 1.5, 2.0]`.
- **Baseline**: all 30 levels are already confirmed unsolved with the pass disabled entirely
  (established in the original Phase D sample, not re-run here).
- 120 solves total (30 levels × 4 fractions), each raw level stripped of `stressMeta` before solving
  and normalized via `Solver.prepareLevelForSolver(..., { source: 'raw' })`.

All 30 levels are single-gate (checked directly against `data/stress/stress-levels-random.json`'s
`gates` field for the outlier levels discussed below), ruling out `adaptiveGateWeight`'s ≥4-gate
budget-interaction surface as a confound.

## Results

| Fraction | Newly solved (of 30) | Newly solved this step | Avg totalMs (all 30) | Avg nodesExpanded (all 30) |
|---|---:|---|---:|---:|
| 0.5 | 1 | R02917 | 19,540 | 19,132,858 |
| 1.0 (current default) | 2 | R02716 | 24,230 | 22,254,440 |
| 1.5 | 4 | R02735, R00727 | 28,447 | 25,514,214 |
| 2.0 | 5 | R02853 | 32,362 | 29,215,257 |

Cumulative solved sets are nested (every level solved at a lower fraction stays solved at every
higher fraction tested) — R02917 (solved from 0.5 onward), then R02716 (from 1.0), then R02735 and
R00727 (from 1.5), then R02853 (only at 2.0).

## Does it increase monotonically, plateau, or show diminishing returns?

**Strictly monotonically increasing across the full tested range (1→2→4→5), with no plateau** —
2.0 is still finding new rescues, so the ceiling hasn't been reached at 2x nominal budget.

**Returns are not cleanly diminishing, though.** The increments are +1 (0.5→1.0), +2 (1.0→1.5), +1
(1.5→2.0) — the *biggest* single jump is in the middle of the range, not at the bottom. If anything
were monotonically diminishing from the start, 1.0→1.5 should have added less than 0.5→1.0 did; it
added twice as much. The only place a diminishing-returns signal actually shows up is at the very
top (1.5→2.0's +1 is the smallest increment), and even that is a single data point.

## Cost/benefit read on the current default (1.0)

On this sample, the current default of 1.0 captures only 2 of the 5 total rescues found across the
whole 0.5–2.0 range — 40%. Fraction 1.5 captures 4 of 5 (80%) for a budget only 25% larger
(`(1+1.5)/(1+1.0) = 1.25x`). That's a genuinely suggestive ratio: a relatively small budget increase
buying a disproportionate jump in rescues, on this sample.

**This is not, by itself, grounds to bump the constant.** Three reasons to stay cautious:

1. **n=30 is a rough signal, not a verdict** — same caveat the original Phase D estimate carried, and
   the actual production corpus-2 refresh (`reports/2026-07-17-corpus2-batch-refresh-and-regression-investigation.md`)
   already demonstrated that a controlled sample's rescue rate does not reliably extrapolate to the
   full unsolved population once you leave the specific cluster it was drawn from.
2. **This sample is `dfs-plain` only.** The pass has never been diagnosed or shown to help against
   `repair-close`/`repair-far`, which make up most of the remaining unsolved corpus-2 population —
   a separate follow-up task already exists to check that.
3. **Any actual constant change needs the full corpus-wide before/after check this codebase's own
   rules require** — both `solver:bench --check` (solvability) and a full nodesExpanded/wall-time
   sweep (cost), per CLAUDE.md's "Verify before you claim done" rule and the documented case where a
   solvability-clean change turned out to cost ~14% more corpus-wide (the repair-probe multi-seed
   retry gotcha). A 30-level dfs-plain sample cannot stand in for that.

The honest takeaway: **the data is more consistent with "1.0 is not yet in a diminishing-returns
regime" than with "1.0 is already near-optimal,"** and 1.5 looks like a promising candidate to
re-verify against the full corpus if this gets picked up — but that verification hasn't happened
yet.

## Newly solved level IDs by fraction

- **0.5**: R02917
- **1.0**: R02716, R02917
- **1.5**: R02735, R00727, R02716, R02917
- **2.0**: R02735, R00727, R02716, R02917, R02853

(25 of the 30 sampled levels remain unsolved at every fraction tested: R02401, R03022, R00851,
R02857, R02997, R01190, R02829, R01694, R02454, R02861, R01009, R02328, R02860, R03030, R02186,
R03205, R02889, R02725, R02098, R02555, R03134, R02318, R02854, R03216, R02810.)

## Surprising-finding check: solved at a smaller fraction but not a larger one

**None found.** Every one of the 30 levels was checked for this specific pattern (a level solving at
some fraction but then failing at a strictly larger one, which would indicate real run-to-run search
variance rather than a clean monotonic budget effect) — zero anomalies. All solved levels stayed
solved at every higher fraction tested.

This is a single trial per (level, fraction) pair, not a repeated-trial average, so the absence of
the anomaly here is evidence it's rare on this sample, not proof it can never happen — the original
task brief was correct that run-to-run timing variance is real and could in principle produce this
pattern on a different sample or a repeat run.

## An unexplained observation (flagged, not resolved)

Average `totalMs` per fraction (19.5s / 24.2s / 28.4s / 32.4s) roughly tracks the nominal
`(1 + fraction) × 10000ms` budget shape, but several individual levels exceed that naive ceiling by
a wide margin — e.g. R02401 at fraction 0.5 measured `totalMs: 24971`, well past the `15000ms` a
naive `(1+0.5)×10000` model would predict, despite being single-gate (ruling out the most obvious
multi-gate explanation). This wasn't investigated further here since it's outside this experiment's
scope, but it's worth flagging for whoever next audits `solveLevel()`'s budget accounting — the
"up to 8x nominal" framing in CLAUDE.md may need re-examination for single-gate, single-config
levels specifically, or there may be a per-attempt granularity effect (a budget check only happens
between attempts, not within one) that allows a single long-running attempt to overshoot further
than the additive-fraction model implies.

## Caveats

- Only `dfs-plain` was tested; `repair-close`/`repair-far` are untested and may behave completely
  differently (a separate follow-up task already targets this).
- No fraction above 2.0 was tested — the ceiling of the dose-response curve (if one exists within a
  practical budget range) is still unknown.
- This does not replace the corpus-wide solvability + speed verification CLAUDE.md requires before
  any actual constant change — it's a scoping signal for whether that verification is worth doing at
  a candidate value (1.5 looks like the best next candidate to check), not a substitute for it.

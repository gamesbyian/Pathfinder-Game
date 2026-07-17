# Attraction-diversity pass against `repair-close`/`repair-far` (2026-07-17)

## Background

The attraction-diversity last-resort pass (`solveLevel()`, `modules/solver/orchestration.ts`,
added 2026-07-16 — see `reports/2026-07-16-phase-d-attraction-diversity-implementation.md`) was
only ever measured against the `dfs-plain` cluster (843 unsolved corpus-2 levels): a 30-level
sample found a 10% rescue rate there. The implementation report explicitly flagged this pass as
**untested** against `repair-close`/`repair-far` (114 + 507 = 621 levels combined) "since the
diagnosis it's built on was derived entirely from non-repair-gated levels." This is the second
item in the solver-development-roadmap's Campaign 0 (`docs/solver-development-roadmap.md`).

## Method

- **Sample**: a seeded-random (mulberry32, seed `20260717`) draw of 20 levels each from the
  `repair-close` (114 total) and `repair-far` (507 total) clusters in
  `reports/stress/unsolved-failure-clusters.json` — 40 levels combined.
  - `repair-close` sample: R03274, R02148, R03149, R02530, R02165, R02683, R02393, R01485, R02765,
    R03136, R02929, R02992, R02291, R02314, R02358, R02088, R02378, R02267, R01179, R03329.
  - `repair-far` sample: R01673, R03051, R02994, R00228, R02949, R03011, R02493, R02012, R02476,
    R02326, R02130, R02863, R02538, R02058, R02594, R00963, R03276, R02215, R02806, R02418.
- **Settings, every solve** (`scripts/portfolio-solve-sweep.mjs --scheduler-mode=legacy`):
  `timeBudgetMs: 10000`, `repairBudgetFractionOverride: 0` — same isolation rationale as the
  original `dfs-plain` test: repair is disabled entirely so the measurement isolates the diversity
  pass's own contribution, not an interaction with repair's own (much larger, 6x) extension. This
  is a deliberate scope choice, not an oversight — see Caveats.
- **Baseline**: `attractionDiversityBudgetFractionOverride: 0` (main loop only). **Treatment**:
  `attractionDiversityBudgetFractionOverride: 1.0` (current production default).
- 80 solves total (40 levels × 2 conditions), `--workers=6` on a 4-core box (some contention, but
  applied identically to both runs).

## Results

**Baseline: 0/40 solved.** Expected — every sampled level is already confirmed unsolved in the
full corpus-2 baseline.

**Treatment: 1/40 solved (2.5%).** The single rescue: **R02165** (`repair-close`, badness 2,
archetype `high-intersection-burden`, navDensity 0.72, reqInt 4, mustCross 4, mustPass 0) —
`refereeValid: true` (a genuine, PLAY-valid solution, not just an internal solver claim), solved
via `winningConfig: "dfs:intersectionHarvest"` at 18,361ms (consistent with the `(1+1.0)×10000ms`
budget model — the diversity pass's own rerun found it, not the main loop, since the main loop
alone is exactly the 0/40 baseline). `solvedByFallback: true` confirms it wasn't a portfolio-tier
artifact.

No `repair-far` level was rescued (0/20).

## Reading the result against the `dfs-plain` finding

The rescue rate here (2.5%, 1/40) is **substantially lower** than the `dfs-plain` cluster's
measured 10% (3/30) — consistent with the original implementation report's own expectation, since
the fragile-group diagnosis this pass is built on was derived entirely from non-repair-gated
levels. `repair-close`/`repair-far` levels are repair-gated precisely because they carry higher
`mustCross`/`mustPass` burdens or very high `reqInt` (`needsRepairFallback` in `attempts.ts`) —
a different, and on this evidence less tractable, failure mode than the scoring-interaction lockup
`SCORE_GOAL_ATTRACTION` addresses.

**n=40 (20+20) is a small sample — a single rescue's rate carries a wide confidence interval**
(roughly 0%–13% at a rough 95% level for 1/40). This result should be read as "the pass has *some*
real effect on `repair-close`, at a meaningfully lower rate than `dfs-plain`," not as a precise
per-cluster rate. Applying this rate naively to `repair-close`'s full 114 levels suggests on the
order of a handful of additional rescues (roughly mid-single-digits), not the ~80-level order of
magnitude estimated for the much larger and more responsive `dfs-plain` cluster. `repair-far`'s 0/20
is also too small a sample to conclude the pass has *zero* effect there — only that its effect, if
any, is smaller than what 20 levels can detect.

## Cost characterization

Same shape as the `dfs-plain` finding: **zero cost to any level that already solves** (this pass is
strictly gated on both the main loop and repair fallback having already failed). The one measured
rescue cost 18.4s at `timeBudgetMs=10000` with repair disabled — under real production settings
(repair's default 6x extension present and running first), the pass would only add its own
`ATTRACTION_DIVERSITY_BUDGET_FRACTION` (default 1.0x) on top of whatever repair's fallback loop
already spent, unchanged from its existing documented cost shape.

## Caveats

- **Repair was disabled in both conditions** (`repairBudgetFractionOverride: 0`), matching the
  established isolation methodology from the `dfs-plain` test. This measures the diversity pass's
  *own* marginal contribution cleanly, but does **not** measure the more production-realistic
  question of whether adding diversity *on top of* the full repair fallback (default 6x) rescues
  any *additional* `repair-close`/`repair-far` levels beyond what repair alone already tries. That
  would be a materially more expensive sweep (up to `(1+6+1)×timeBudgetMs` per level per condition)
  and is a reasonable next step if this modest signal is worth chasing further.
- n=40 total, split 20/20 — a first-pass signal, not a powered estimate, per the same caveat the
  original `dfs-plain` report carried.
- This does not replace the corpus-wide solvability + speed verification CLAUDE.md requires before
  any actual constant/candidate-flag change — it answers "is this worth pursuing further for this
  population," not "ship a specific change."

## Conclusion

The attraction-diversity pass **does** rescue `repair-close` levels, but at a meaningfully lower
rate (2.5% combined, effectively ~5% on `repair-close` alone, 0% measured on `repair-far`) than the
`dfs-plain` cluster it was originally diagnosed against. It remains a strict no-cost addition
(gated after both main loop and repair fallback fail), so there is no reason to disable it for this
population — but it should not be expected to meaningfully move the needle on `repair-close`/
`repair-far`'s combined 621 unsolved levels the way it plausibly does on `dfs-plain`'s 843. Per
CLAUDE.md's own gotcha on the `dfs-plain` fragile-group diagnosis (four distinct culprit terms
found across just 5 levels there, no single fix), the likely next step for `repair-close`/
`repair-far` specifically is targeted repair-mechanism diagnosis (Campaign 1 in the roadmap:
witness-divergence + `repair-direct-probe.mjs` on `repair-close`'s near-misses), not further
extension of this scoring-diversity mechanism.

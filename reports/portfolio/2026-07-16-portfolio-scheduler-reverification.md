# Portfolio-scheduler re-verification against the current solver (2026-07-16)

## Why

`reports/portfolio/portfolio-scheduler-decision.md` (dated 2026-07-12) is the last measured verdict
on the opt-in `portfolio-experiment` scheduler mode, and it is stale in a specific, non-obvious way:
its stress-corpus measurements (including the "feature-gated repair specialists ... corpus1 levels
1-20" row, `0.57x` runtime ratio, 20/20 pre-fallback retention) were taken **while the elite-splice
regression was already present** (introduced 2026-07-10, not discovered/fixed until today — see
`reports/2026-07-16-repair-search-elite-splice-regression.md`). That regression made legacy's
repair search silently lose its near-miss bookkeeping, i.e. legacy was measurably *slower and less
effective* on repair-heavy levels than it should have been at the time the 0.57x figure was
recorded. Since portfolio's own fallback path is itself a full legacy solve, a crippled legacy
distorts both sides of the comparison. This re-verification re-runs the exact same feature-gated
config and stress subset (`corpus1 levels 1-20`, `budgetMs=30000`) against today's solver — post
elite-splice fix, post repair-probe seed recalibration — to get a trustworthy current number.

## Method

`npm run solver:portfolio-report -- --corpus=data/stress/stress-levels.json --levels=1-20
--budget-ms=30000`, same feature-gated tier config as the 2026-07-12 measurement (Pass 1 @500ms,
Pass 2 @2000ms, Pass 3 @5000ms with the promoted diverse beams, conditional Pass 4 repair
specialists gated on the same must-cross/must-pass/reqInt feature thresholds). Commit `65a13fd`
(after the elite-splice fix and its recalibration, before this report).

## Result

| Metric | 2026-07-12 (pre elite-splice fix) | 2026-07-16 (post elite-splice fix) |
| --- | ---: | ---: |
| Legacy solved | 20/20 | 20/20 |
| Portfolio before fallback | 20/20 | 18/20 |
| Portfolio + fallback | 20/20 | 20/20 |
| Fallback-only wins | 0 | 2 |
| Runtime ratio (portfolio / legacy) | 0.57x (faster) | **1.45x (slower)** |

Full retention still holds (portfolio + fallback matches legacy's 20/20), but the runtime
comparison has flipped from a ~43% win to a ~45% loss, and two levels that used to solve inside
the portfolio's own tiers (before ever reaching fallback) now only solve via the fallback path.

## Per-level breakdown (legacy vs portfolio total ms)

The regression is concentrated in a few levels, not spread evenly:

| Level | Legacy ms | Portfolio ms | Portfolio path |
| ---: | ---: | ---: | --- |
| 2 | 3,539 | 18,621 | fallback (pre-fallback tiers failed) |
| 3 | 24,457 | 8,590 | pass 3 (portfolio genuinely faster here) |
| 5 | 1,032 | 15,785 | pass 4 (conditional repair specialist) |
| 12 | 1,513 | 8,293 | fallback (pre-fallback tiers failed) |
| all other 16 levels | (mostly sub-3,000ms both sides) | | pass 1, comparable or portfolio somewhat slower |

Levels 2, 5, and 12 alone account for nearly all of the swing. All three are repair-cluster levels
— exactly the profile the elite-splice fix disproportionately sped up on the legacy side (see the
elite-splice regression report: 6/7 of its own calibration family now solve using under 13% of the
ordinary repair-probe's node budget). Legacy now reaches a repair-based solve on these levels
directly and cheaply; portfolio still has to burn through its earlier, non-repair tiers (which
don't solve these levels) before either its conditional Pass-4 repair specialist or its fallback
gets a turn — so the "wasted" pre-repair tier time, which used to be a small fraction of an
overall-slow legacy-matching total, is now large relative to a fast legacy solve it's racing against.

## Interpretation

This is not a new problem in the portfolio scheduler — it's the same structural cost the 2026-07-12
report already flagged (additive tier costs on top of a fallback that duplicates legacy's own
search) showing up more sharply now that legacy got faster in exactly the levels where portfolio
pays that tier tax. The practical upshot: **the portfolio-scheduler-decision.md verdict
("not production-ready") still holds, and the stress-corpus case for it is now weaker, not
stronger** — the headline 0.57x number that made stress levels look like the portfolio's best case
was itself an artifact of the elite-splice regression and should not be cited as current. No config
change is recommended from this alone; the feature-gated tier design would need to either
special-case the same repair-cluster feature signature the conditional Pass-4 already targets (skip
straight to repair, no non-repair tiers first) or accept that its fallback-path economics need
re-deriving whenever a legacy repair-search change lands.

## Scope / caveats

- Single subset (corpus1 levels 1-20), matching the prior report's own methodology for
  apples-to-apples comparison — not a full-corpus re-sweep of every portfolio variant in the
  2026-07-12 table (published-corpus numbers were not re-verified here, and are less likely to be
  affected since the published corpus has fewer of the specific repair-heavy levels involved).
- This confirms the existing "not production-ready" conclusion more strongly; it does not change
  the recommendation or require any code change. Filed as a re-verification data point, matching the
  standing rule that a change to a shared dependency (here, legacy's repair search) can silently
  invalidate an unrelated tool's prior benchmark without either tool's own code changing.

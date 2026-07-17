# A fragile-scoring-interaction census on the `dfs-plain` 100-level sample (2026-07-17)

## Context

Task 3's fraction/flag-widening evaluation
(`reports/2026-07-17-attraction-diversity-fraction-and-flag-widening-evaluation.md`) already ran
two sweeps against the same 100-level `dfs-plain` sample: single-flag (`SCORE_GOAL_ATTRACTION`
only, the production default) and widened (all 5 diagnosed candidates disabled together in one
combined pass). Between them, **7 of the 100 sampled levels solve when some subset of the 5 known
fragile-scoring `SCORE_*` terms is disabled** — but the widened sweep's combined-disable design
can't say *which* flag(s) actually did the rescuing for the 3 levels it uniquely solved. This
report closes that gap with per-flag attribution, using the correctly-isolated
`ablation-config.mjs withFeatureDisabled()` helper (single flag off, everything else exactly as
default — see `reports/2026-07-17-r00648-fragile-scoring-family-and-reduction-caveat.md` for why
this matters: a bare `{ FLAG: false }` object silently disables every other unset flag too).

## Method

For the 3 levels solved only by the widened (combined) sweep — R02480, R02921, R02959 — ran each
of the 5 candidate flags individually (`timeBudgetMs: 10000, repairBudgetFractionOverride: 0,
attractionDiversityBudgetFractionOverride: 0`, isolating each flag's own contribution) plus a
`defaultConfig()` baseline.

## Results

| Level | Rescued by (individually) |
|---|---|
| R02480 | `SCORE_INTERSECTION_SETUP` only |
| R02921 | `SCORE_OBJECTIVE_ATTRACTION` only (dramatic: 81 nodes, vs. ~20M for every other config) |
| R02959 | `SCORE_GOAL_ATTRACTION`, `SCORE_INTERSECTION_SETUP`, **and** `SCORE_OBJECTIVE_ATTRACTION` — all three independently rescue it |

Combined with the already-known single-flag sweep (R00648, R01903, R03025, R03250 — all rescued
by `SCORE_GOAL_ATTRACTION` alone, confirmed directly since they solved in that sweep), the full
per-flag census across the 100-level sample:

| Flag | Levels it rescues (of the 7 confirmed fragile cases) |
|---|---|
| `SCORE_GOAL_ATTRACTION` | R00648, R01903, R03025, R03250, R02959 — **5 of 7** |
| `SCORE_INTERSECTION_SETUP` | R02480, R02959 — **2 of 7** |
| `SCORE_OBJECTIVE_ATTRACTION` | R02921, R02959 — **2 of 7** |
| `SCORE_SURROUND_URGENCY` | none in this sample |
| `SCORE_PERIMETER_BIAS` | none in this sample (though confirmed relevant elsewhere — R00648's *reduced* form, `reports/2026-07-17-r00648-fragile-scoring-family-and-reduction-caveat.md`) |

## Interpretation

**7/100 (7%) of this `dfs-plain` sample are confirmed fragile-scoring-interaction cases** —
consistent with, and now fully attributed beyond, Task 3's raw solved-count numbers. This
corroborates `SCORE_GOAL_ATTRACTION` as a reasonable choice for the sole production candidate (it
rescues the clear majority, 5/7, of the confirmed cases in this sample) — but also shows real,
distinct value being left on the table: `SCORE_INTERSECTION_SETUP` and `SCORE_OBJECTIVE_ATTRACTION`
each uniquely rescue a level (R02480, R02921 respectively) that `SCORE_GOAL_ATTRACTION` does not
touch at all.

This directly supports Task 3's own speculative recommendation ("sequential per-flag sub-passes...
would very plausibly recover the union of what each flag rescues individually, rather than the
lossy trade a combined pass produces") with real attribution data: a sequential design (try each of
the 5 flags in its own separate mini-pass, not all-at-once) should in principle reach all 7
confirmed cases — R02959 alone demonstrates 3 independent redundant rescue paths, so even a partial
sequential ladder has multiple chances to catch it. The combined-pass design tested in Task 3 only
reached 5/7 (missing R00648 and R03250, both `SCORE_GOAL_ATTRACTION`-only cases whose rescue got
lost when every flag was disabled simultaneously) — this attribution data explains *why* precisely:
disabling `SCORE_INTERSECTION_SETUP`/`SCORE_OBJECTIVE_ATTRACTION` alongside `SCORE_GOAL_ATTRACTION`
changes the search trajectory enough to lose the two `SCORE_GOAL_ATTRACTION`-only wins, even while
gaining others.

## Negative reference check: R00440

At 7%, this family explains a minority of `dfs-plain`, not the bulk. As a check that the other
~93% is genuinely a different problem rather than an under-tested extension of the same one, ran
the identical 5-flag sweep (individually and combined) against R00440 — the already-known "robust"
level from `docs/sibling-cousin-system.md`'s family-variant testing (0/45 structural-perturbation
variants solvable). **None of the 5 flags, alone or combined, rescue it** — every configuration
stays `timeout` at 6–10 million nodes:

| Config | Result |
|---|---|
| baseline | timeout, 6.2M nodes |
| `SCORE_GOAL_ATTRACTION: false` | timeout, 6.7M nodes |
| `SCORE_INTERSECTION_SETUP: false` | timeout, 6.6M nodes |
| `SCORE_SURROUND_URGENCY: false` | timeout, 9.0M nodes |
| `SCORE_OBJECTIVE_ATTRACTION: false` | timeout, 6.9M nodes |
| `SCORE_PERIMETER_BIAS: false` | timeout, 6.7M nodes |
| all 5 combined | timeout, 10.2M nodes |

This corroborates R00440's structural-perturbation "robust" classification with an independent
scoring-ablation test: it's a genuinely different, harder case, not just a fragile-scoring instance
the current 5-flag family happens not to cover yet.

## Standing recommendation (not implemented — cost not yet measured)

A sequential per-flag sub-pass design is now better-evidenced as the more promising unexplored
shape, per Task 3's own framing — but its cost (up to 5x the current pass's budget, one full ladder
rerun per candidate flag) still needs the same full corpus-wide solvability+speed verification any
constant/mechanism change requires before shipping. This report strengthens the case for trying it,
not a decision to build it.

## Verification

Read-only diagnostic work, no code changed — 15 direct `Solver.solve()` calls with correctly
isolated single-flag ablation configs, cross-checked against Task 3's already-verified sweep
results for the 4 previously-known single-flag cases.

# Per-level real-profile witness-divergence: closes the flagged methodology gap (2026-07-17)

## Context

Two earlier reports (`reports/2026-07-17-witness-divergence-population-calibration-correction.md`
and the `dfs-plain` extension in the roadmap's Campaign 2 section) ran witness-divergence
diffing — replaying each level's withheld witness path against the real search-core's own
greedy scoring — using `scripts/stress/witness-divergence.mjs`'s single common
`POLICY_PROFILES.default` baseline (explicitly documented in that script's own comment as "a
common baseline... not each level's real attempt-policy profile"). Both passes found a null
result: no population-level discrepancy-density or `maxStepRank` discriminator between solved
and unsolved corpus-2 levels. Both reports flagged the obvious follow-up as **not yet done**:
"per-level witness-divergence using each level's own actually-selected attempt-policy profile...
is more likely to find a real discriminator than repeating the population-level aggregate
approach." This report does that follow-up.

## Method

A standalone script (not modifying the shared `witness-divergence.mjs` tool) reused the exact
same replay technique (`getNeighbors`/`scoreAndSort`/`applyMove` — the real search-core
primitives, not a reimplementation) but, for each level, additionally traced the witness against
that level's own `getAttemptConfigs()` output — its first 3 non-repair (DFS/beam-routed)
attempt configs' actual `profileName`/`template`, instead of only the generic `default`
baseline — and compared discrepancy/`maxStepRank` across all of them.

Two populations, 18 levels total, all previously untested at this level of specificity:
- **10 fresh `dfs-plain` levels** (not overlapping any level individually characterized in
  earlier reports — R02025, R02044, R02188, R02192, R02338, R02425, R02624, R02815, R02960,
  R03023).
- **8 `repair-close` levels** (R01698, R01860, R02003, R02010, R02022, R02088, R02123, R02165) —
  the population Campaign 1 already diagnosed at the population-default-profile level and found
  nothing; this checks whether real profiles change that.

## Result: no discriminator, and a much stronger uniformity finding than expected

Real-profile discrepancy is **within a few percent of the default baseline on every single
level tested, both populations, 18/18** — never a large swing, e.g. `dfs-plain`'s R02044 (89
default vs. 93 real-profile, +4.5%), `repair-close`'s R02003 (35 vs. 37-40, +6-14%). No level
showed the kind of dramatic profile-dependent shift that would suggest the generic baseline was
hiding a real per-level signal.

**More strikingly: `maxStepRank` is 2 (occasionally 3) on every one of the 18 levels, under
every profile tested, with zero exceptions.** Out of typically 2-4 legal neighbor candidates per
step, the solver's own greedy scoring — regardless of which of the level's real attempt profiles
is used — essentially *never* disagrees strongly with the witness's actual next move. The
witness's move is almost always the scorer's top pick or a very close second/third choice, for
90-170 consecutive steps, across every level tested.

## Interpretation

This closes the flagged methodology gap **definitively, not just "checked and still empty"**:
using each level's real attempt-policy profile instead of a generic baseline does not change the
finding, so the earlier population-level null result was not a baseline artifact. But it also
sharpens the underlying characterization of `dfs-plain`/`repair-close`'s difficulty in a way
neither earlier pass isolated as cleanly: **per-step local move quality is not the bottleneck at
all** — the scoring heuristic is already very good at picking a reasonable next move, almost
always ranking the witness's real choice within the top 2-3 options. The reason DFS still fails
to find these paths within budget is not "the heuristic keeps pointing the wrong way," it's
that **globally-consistent long sequences of individually-reasonable-looking moves still don't
add up to a valid win** (right length, right intersection count, right object satisfaction, all
simultaneously) often enough for backtracking search to find one before exhausting its budget —
a genuinely combinatorial planning problem, not a heuristic-quality problem. This is consistent
with (and now much more directly evidenced than) `CLAUDE.md`'s existing "genuine combinatorial
exhaustion... more time is the wrong lever" framing for `dfs-plain`, and rules out **any** future
scoring/ordering-only fix for this population with the same confidence the turn-landmark
archetype's exhaustive scoring-flag sweep did for that narrower case — this result generalizes
the conclusion to the much larger population.

## What this doesn't do

This is a diagnostic closure, not a fix — no solver code changed. It does rule out (with real
evidence, not by category) any future attempt to chase this population via move-scoring
refinement; the actionable directions remain what Campaign 2's existing conclusion already named
(a fundamentally different bound/pruning technique, or research beyond scoring/pruning
entirely) — this report adds confidence that a scoring-only path specifically is a dead end for
the `dfs-plain`/`repair-close` bulk, not just the narrower turn-landmark archetype already
proven so.

## Verification

Pure read-only diagnostic — standalone script importing the real, unmodified
`getNeighbors`/`scoreAndSort`/`applyMove`/`getAttemptConfigs` from the shipped solver via direct
module imports (not the shared `SOLVER_TESTING_API`, which doesn't expose `getAttemptConfigs`
— confirmed by reading `testing-api.ts`). No solver files were changed; `git status`/`git diff`
clean throughout.

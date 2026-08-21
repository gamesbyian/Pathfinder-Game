# Evaluating the budget-fraction 1.5 candidate and candidate-flag widening (2026-07-17)

> **Status:** concluded-negative
> **Last evidence:** 2026-08-07 — sequential per-flag cost/evidence disposition
> **Decision:** retain fraction 1.0 and the single `SCORE_GOAL_ATTRACTION` flag; do not schedule
> sequential per-flag passes without a cheap selector or isolation mechanism
> **Remaining gate:** none

## Background

Two related open follow-ups from the attraction-diversity last-resort pass's implementation
(`reports/2026-07-16-phase-d-attraction-diversity-implementation.md`,
`reports/2026-07-17-attraction-diversity-dose-response.md`), both explicitly gated on "full
solvability+speed verification before any constant change" — the third item in the
solver-development-roadmap's Campaign 0:

1. The dose-response experiment found fraction 1.5 rescued 4/5 of a 30-level `dfs-plain` sample's
   total rescues (vs. 1.0's 2/5) for only 25% more budget — "a promising candidate" but explicitly
   not yet verified at scale.
2. `ATTRACTION_DIVERSITY_CANDIDATE_FLAGS` currently contains only `SCORE_GOAL_ATTRACTION`; the
   original fragile-group diagnosis found 4 other culprit terms
   (`SCORE_OBJECTIVE_ATTRACTION`/`SCORE_INTERSECTION_SETUP`/`SCORE_SURROUND_URGENCY`/
   `SCORE_PERIMETER_BIAS`) across its 5 known cases, and widening was explicitly left untested.

This evaluation uses a **fresh, independent, larger sample** (100 `dfs-plain` levels, seeded
mulberry32, distinct from the original 30-level sample) to get a more powered read before deciding
whether either change is worth making.

## Method

- **Sample**: 100 levels drawn from the `dfs-plain` cluster (843 total,
  `reports/stress/unsolved-failure-clusters.json`), seed `720260717`.
- **Settings, every solve**: `timeBudgetMs: 10000`, `repairBudgetFractionOverride: 0` (isolates the
  diversity mechanism, same convention as the original dose-response test).
- Three sweeps on the identical 100-level sample:
  1. **Baseline** — current production shape: `ATTRACTION_DIVERSITY_CANDIDATE_FLAGS =
     ['SCORE_GOAL_ATTRACTION']`, `attractionDiversityBudgetFractionOverride: 1.0` (current default).
  2. **Fraction candidate** — same flag set, `attractionDiversityBudgetFractionOverride: 1.5`.
  3. **Flag-widening candidate** — `ATTRACTION_DIVERSITY_CANDIDATE_FLAGS` temporarily widened to
     all 5 diagnosed terms (a **combined single pass**, all 5 disabled together — the cheaper of
     the two widening shapes the implementation report left open, vs. sequential per-flag
     sub-passes), fraction held at the current default 1.0. This was a **local, temporary source
     edit for measurement only** — reverted immediately after the sweep completed and never
     committed (verified via `git diff` before proceeding).

## Results

| Sweep | Solved (of 100) | Sum totalMs | Sum nodesExpanded |
|---|---:|---:|---:|
| Baseline (fraction 1.0, single flag) | 4 | 1,989,915 | 1,030,930,878 |
| Fraction 1.5 (single flag) | 5 | 2,476,271 (+24.4%) | 1,185,370,752 (+15.0%) |
| Widened flags (5, combined pass, fraction 1.0) | 5 | 1,974,544 (≈unchanged) | 992,166,783 (≈unchanged) |

**Fraction 1.5**: rescues exactly **1 additional level** (5/100 vs. 4/100, solved sets nested — the
new set is a strict superset of the baseline's) for **+24.4% total wall time / +15.0% total nodes**
across the sample. This is a far more modest picture than the original 30-level dose-response
suggested (which found +2 rescues, not +1, going from 1.0→1.5) — consistent with that report's own
caveat that "a controlled sample's rescue rate does not reliably extrapolate."

**Widened candidate flags**: also nets exactly **+1 solved (5/100)** at the *same* fraction as
baseline, and at essentially unchanged cost (widening which scoring flags are off doesn't change
how much search the pass does, just how it's guided). But — the more important finding —
**the solved set is not a superset of the baseline's**:

- Solved by single-flag baseline **only**: `R00648`, `R03250` (2 levels — widening *loses* these).
- Solved by widened flags **only**: `R02480`, `R02921`, `R02959` (3 levels — new rescues).
- Solved by **both**: `R01903`, `R03025`.

Disabling all 5 candidate terms simultaneously in one combined pass changes the search's
trajectory enough that it stops finding 2 of the rescues the narrow single-flag pass finds, while
finding 3 different ones. **This directly confirms the original diagnosis's core finding —
"which term is responsible varies per level" — extends to combined passes too: a combined pass is
not a strict widening of what the narrow pass catches, it's a different search with different
blind spots.**

## Conclusion: neither change is justified by this evidence

Per CLAUDE.md's own rule ("any actual constant change needs the full corpus-wide before/after
check"), and given what this larger, independent sample shows:

- **Fraction 1.5**: a genuine but small effect (+1/100, +25% relative rescue rate) at a
  proportionally larger cost (+24% time, +15% nodes) than the smaller sample suggested. Not a
  clear win — raising the production default would slow down every currently-failing level in this
  population by roughly a quarter for a one-in-a-hundred-level payoff, with no evidence the ratio
  improves at full-corpus scale.
- **Flag widening (combined single pass)**: nets the same modest +1/100 at neutral cost, but
  trades away 2 known rescues for 3 different ones rather than strictly adding value. Shipping this
  as-is would be a lateral move dressed as an improvement, not a genuine widening.

**Recommendation: do not change `ATTRACTION_DIVERSITY_BUDGET_FRACTION` or
`ATTRACTION_DIVERSITY_CANDIDATE_FLAGS` based on this evidence.** Both remain at their current
values (fraction 1.0, single `SCORE_GOAL_ATTRACTION` flag) — no code change made.

## Historical alternative — subsequently closed

The swapped-not-added result for combined widening suggests the two untested shapes from the
original follow-up are not equivalent, and the untested one is more promising:

- **Sequential per-flag sub-passes** (try each of the 5 candidate flags disabled *alone*, one full
  ladder rerun per flag, not all 5 at once) would very plausibly recover the *union* of what each
  flag rescues individually — plausibly close to summing each flag's own individual rescue rate —
  rather than the lossy trade a combined pass produces. This was flagged as untested in the
  original implementation report specifically because of its cost: up to 5x the current pass's
  budget (one rerun per candidate flag) instead of 1x. This is no longer an open queue item: the
  repository-wide triage closed it because the measured combined form gained only 1/100 and the
  sequential form multiplies the full-pass cost. Reopen only with a cheap selector or isolation
  mechanism; see
  [`docs/future-work.md`](../docs/future-work.md#older-loose-thread-triage-2026-08-07).
- Any future test of either shape should draw an even larger sample (or, ideally, the real
  full-corpus GitHub Actions batch run) before concluding — this session's 100-level sample is
  already far more powered than the original 30, but a 1-in-100 finding is still a small-count
  regime where individual results carry real sampling noise.

## Verification

- The temporary flag-widening edit was local-only, never committed: confirmed via `git diff
  modules/solver/attempts.ts` showing no changes after reverting (`git checkout --
  modules/solver/attempts.ts`), and `ATTRACTION_DIVERSITY_CANDIDATE_FLAGS` back to
  `['SCORE_GOAL_ATTRACTION']` in the working tree before this report was written.
- No production code changed as part of this evaluation — this is a measurement-only report.

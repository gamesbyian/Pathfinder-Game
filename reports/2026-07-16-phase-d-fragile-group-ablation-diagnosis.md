# Phase D: fragile-group ablation diagnosis (2026-07-16)

> **Status:** concluded-positive
> **Last evidence:** 2026-08-19 — cheap widening of `ATTRACTION_DIVERSITY_CANDIDATE_FLAGS` tried and
> found negative on this report's own 5-level sample (see "Follow-up (2026-08-19)" below)
> **Decision:** reject a universal score-term retune; use the repeatable failure shape to evaluate bounded, feature-gated diversity only after ranked family diagnosis
> **Remaining gate:** run the wide-trove boundary ranking and diagnose the highest independent symmetry cliffs before selecting a diversity design

## Goal

Phase C found that the `dfs-plain` cluster's "fragile" subgroup (levels where most structural
perturbations flip solvability) includes at least 3 new candidates beyond the already-diagnosed
R02248/R01465: R02795, R00156, R02960. This report applies the same ablation-sweep methodology
that diagnosed R02248 (`SCORE_INTERSECTION_SETUP`) and R01465 (`SCORE_SURROUND_URGENCY`) to those
3, to see whether a single scoring term generalizes across the fragile group as a whole — which
would make a bounded fix worth prototyping — or whether it's per-level, which would not.

## Method

For each of R02795/R00156/R02960, picked one of the level's own currently-unsolved symmetry
variants (a clean, structure-preserving perturbation — see Phase C's caveats on why symmetry is the
cleanest signal), then solved it once per `SCORE_*` ablation flag (19 flags,
`scripts/ablation-config.mjs`'s registry) at `--repair-budget-fraction=0`/8s budget (the
solver-testing policy), recording which flag(s) flip it from unsolved to solved.

## Result

| Level (hard variant tested) | Flag(s) that flip it |
| --- | --- |
| R02248 (prior investigation) | `SCORE_INTERSECTION_SETUP` |
| R01465 (prior investigation) | `SCORE_SURROUND_URGENCY` |
| R02795 (`F02795-sym-05`) | `SCORE_GOAL_ATTRACTION` |
| R00156 (`F00156-sym-02`) | `SCORE_GOAL_ATTRACTION`, `SCORE_PERIMETER_BIAS` |
| R02960 (`F02960-sym-02`) | `SCORE_OBJECTIVE_ATTRACTION` |

**Four distinct culprit terms across 5 levels.** No single flag flips more than 2 of the 5.

### Does the winning flag generalize across a level's OWN hard variants?

Checked `SCORE_GOAL_ATTRACTION` (the one flag implicated twice) against all of R02795's and
R00156's other unsolved symmetry variants:

| Variant | Baseline | With `SCORE_GOAL_ATTRACTION` disabled |
| --- | --- | --- |
| `F02795-sym-05` | unsolved | **solved** |
| `F02795-sym-06` | unsolved | **solved** |
| `F00156-sym-02` | unsolved | **solved** |
| `F00156-sym-04` | unsolved | **solved** |
| `F00156-sym-05` | unsolved | unsolved (stays stuck) |

Generalizes cleanly for R02795 (2/2), partially for R00156 (2/3 — `sym-05` needed something else,
likely the `SCORE_PERIMETER_BIAS` co-implication found in the original full sweep for `sym-02`).

## Reading

This is the same "recurring failure mode drawn from a small family of related terms, not one
universally-broken term" conclusion CLAUDE.md's existing gotcha already drew from R02248/R01465 —
now with 3 more independent confirmations, and importantly, **none of the 3 new cases share R02248
or R01465's own term.** The implicated set is now 5 distinct-ish terms across 5 levels:
`SCORE_INTERSECTION_SETUP`, `SCORE_SURROUND_URGENCY`, `SCORE_GOAL_ATTRACTION`,
`SCORE_OBJECTIVE_ATTRACTION`, `SCORE_PERIMETER_BIAS` — essentially "the whole family of primary
navigation/attraction terms," not a narrow pair.

**This rules out a single targeted scoring fix as a good bet for the fragile group as a whole.**
Any change tempering one specific term (even carefully, behind a feature gate) would help at most
1-2 of these 5 known cases and — per every prior gotcha in this codebase about these exact terms —
risks regressing other levels that depend on that term working exactly as documented elsewhere.
The generalizable pattern instead is structural: **a family of position/attraction-dependent
scoring terms can each, on their own level-specific subset of orientations, combine with an early
greedy trajectory to lock in a self-defeating structural commitment** — the specific term varies,
but the *shape* of the failure (a small ablation unlocks an otherwise near-Hamiltonian, high-reqInt
level) repeats.

## What this suggests for an actual fix, and why none is implemented here

The evidence points toward a **diversity mechanism**, not a **scoring correction**: since disabling
*some* term from this family reliably rescues each fragile case, but which term varies, the
generalizable move is closer to repair search's existing multi-seed retry (`REPAIR_PROBE_ORDINARY_
SEED_SALTS`) — try a small number of additional attempts, each with a different candidate term from
this family disabled, for levels matching the shared feature profile (near-Hamiltonian navDensity,
nontrivial reqInt, no must-cross/portal/filter confounds — the same profile both existing reports
already used to scope their pattern scans). This is a materially different, larger scope of work
than the diagnosis above: it means a new conditional attempt-ladder addition in
`orchestration.ts`/`attempts.ts`, which per this codebase's own standing rule needs the full
solvability+speed verification treatment (`solver:bench --check` plus a before/after corpus timing
sweep) before it could be considered safe to keep — the same rigor that caught the repair
multi-seed retry's own early miscalibration this session (a widening that looked free until a
full-corpus timing sweep showed it wasn't).

No code change is made in this report. This is deliberately a stopping point for a design decision,
not an oversight: the diagnosis is solid (5 real levels, 2 with confirmed within-level
generalization), but the concrete next step is a nontrivial, real solver change whose scope and
risk profile deserves an explicit go-ahead rather than being folded silently into a diagnostic pass.

## The robust group: no shared structural predictor found (n=2, inconclusive)

Compared `dfs-plain`'s two most robust seeds (R00440: 0/45 variants solved; R02579: 1/45) against
the fragile group's structural features (navDensity, reqInt, mustCross/mustPass/surround counts):

| Level | navDensity | reqInt | mustCross | mustPass | surround | badness |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| R00440 (robust) | 0.738 | 9 | 5 | 0 | 4 | 2 |
| R02579 (robust) | 0.561 | 2 | 0 | 0 | 0 | 6 |
| R02248 (fragile) | (near-Hamiltonian, ~0.88 by reqLen/navArea) | 7 | 0 | 0 | surround-heavy | — |
| R01465 (fragile) | 0.830 | 8 | 0 | 0 | 3 | 9 |
| R02795 (fragile) | 0.726 | 1 | 0 | 6 | 0 | 4 |
| R00156 (fragile) | 0.730 | 0 | 0 | 0 | 0 | 4 |
| R02960 (fragile) | 0.798 | 2 | 2 | 7 | 0 | 3 |

R00440 and R02579 don't share an obvious feature signature with each other, let alone one that
cleanly separates them from the fragile group: R00440 is constraint-rich (reqInt 9, mustCross 5,
surround 4 — comparable to fragile R01465's own reqInt/surround profile); R02579 is comparatively
sparse (reqInt 2, no mustCross/mustPass/surround, and the *lowest* navDensity of the whole sample)
yet is equally resistant to perturbation. Also confirmed (Phase C) that both fail via a wide spread
of attempt techniques at varying badness, not one narrow bottleneck. **With only 2 robust examples,
this is not enough to conclude anything about what makes a level robust vs. fragile** — it would
need the same scale of sampling Phase B/C already did for the fragile question (more robust-cluster
seeds, denser variants) before a real pattern (if one exists) would be distinguishable from noise.

## Caveats

- n=5 for the fragile-group ablation sweep, n=2 for the robust-group comparison — both are
  first-pass, not statistically powered claims about `dfs-plain`'s full 843-level population.
  `SCORE_GOAL_ATTRACTION`'s repeat appearance (2/5) is suggestive, not proof it's the single most
  common culprit corpus-wide.
- Every implicated flag is very likely load-bearing elsewhere (as both prior reports already noted
  for `SCORE_INTERSECTION_SETUP`/`SCORE_SURROUND_URGENCY`) — this report does not claim otherwise
  for the 3 newly-implicated flags, and disabling any of them globally is not proposed.

## Follow-up (2026-08-19): a cheap widening tried, found negative on this sample

`2026-08-08-symmetry-orientation-sensitivity-synthesis.md` explicitly warns against reviving "the
previously closed sequential five-full-pass attraction-diversity design" (five separate additional
full-ladder reruns, one per candidate flag) without a cheap predictor — that design's cost was
already judged disproportionate. A cheaper variant respects that constraint without adding any new
pass: widen the *existing* single attraction-diversity pass's own candidate list (`attempts.ts`'s
`ATTRACTION_DIVERSITY_CANDIDATE_FLAGS`, currently `['SCORE_GOAL_ATTRACTION']` alone) to include all
four other implicated terms at once — `SCORE_OBJECTIVE_ATTRACTION`, `SCORE_INTERSECTION_SETUP`,
`SCORE_SURROUND_URGENCY`, `SCORE_PERIMETER_BIAS` — so the one existing pass, at its existing budget
and ladder position, tries the whole fragile family together in a single rerun instead of just the
one term that happened to generalize best in the original diagnosis.

Tried directly (local A/B, not shipped): widened the constant, re-ran this report's own 5-level
sample (`R02248`, `R01465`, `R02795`, `R00156`, `R02960`) isolated to main loop + repair fallback +
attraction-diversity (other additive tiers disabled via `SolveOpts` overrides), at two node budgets
(12M and 45M).

| level | baseline (1 flag), 12M | widened (5 flags), 12M | baseline, 45M | widened, 45M |
|---|---|---|---|---|
| `R02248` | solved (earlier tier) | solved (earlier tier) | solved (earlier tier) | solved (earlier tier) |
| `R01465` | fail | fail | fail | fail |
| `R02795` | fail | fail | fail | fail |
| `R00156` | fail | fail | **solved (earlier tier)** | **solved (earlier tier)**, byte-identical node count |
| `R02960` | fail | fail | fail | fail |

**Zero attributable rescues.** `R02248` already solves via an unrelated earlier tier today (the
solver has changed substantially since 2026-07-16). `R00156` newly solves at 45M nodes, but
byte-identically whether the widened flags are present or not (`10,827,266` nodes either way,
attributed to an earlier tier, not attraction-diversity) — confirming the larger budget alone
explains it, not the widening. `R01465`/`R02795`/`R02960` fail at both budgets regardless of the
flag set: at 12M all four originally-failing levels hit the node ceiling before the diversity pass
ever gets meaningful room (main loop + repair fallback alone consume it), and at 45M the three that
still fail do so identically either way — the diversity pass itself never appears to be the
deciding mechanism for any of them.

**Not pursued further.** This is a small (n=5), historically-selected sample, not a population
test, so it does not rule out the widening helping elsewhere — but it found no signal on the exact
sample this whole investigation is built around, which is the sample most favorable to it. Per the
same "give it every chance to help, then stop" discipline this session applied to
`STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY` (`reports/2026-08-07-repair-elite-prefix-dfs.md`), this
is written off rather than shipped. The code change (`attempts.ts`'s
`ATTRACTION_DIVERSITY_CANDIDATE_FLAGS`) was never committed — the constant remains
`['SCORE_GOAL_ATTRACTION']`, byte-identical to before this test.

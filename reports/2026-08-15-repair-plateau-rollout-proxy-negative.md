# Repair-plateau rollout-escape proxy: negative result at pilot scale

> **Status:** pilot complete, negative; tool kept as infrastructure, hypothesis not pursued further
> without CP-SAT grounding.
> **Scope:** docs/future-work.md item "characterize the repair plateau, not the allocation" (the
> lane [`reports/2026-08-14-corpus1-repair-probe-adaptive-regression.md`](2026-08-14-corpus1-repair-probe-adaptive-regression.md)'s
> three-arm A/B pointed at once the allocation lane closed).
> **No solver behavior change.** Purely observational.

## Motivation

[`reports/2026-08-12-repair-retreat-cpsat.md`](2026-08-12-repair-retreat-cpsat.md)'s broadened
sample found a sharp qualitative difference between two Corpus-2 levels' repair near-misses, tested
from a **CP-SAT-verified feasible point**: R03176's randomized rollouts routinely pushed to within
7 cells of the full requirement before dying; R00648's died with 81 cells still to go, despite both
levels having a real (1-2 step) exact completion nearby. The report's own read: R00648's residual is
a narrow, unforgiving trap; R03176's is a wide, forgiving basin — a real distinction, but resting on
CP-SAT to find the one feasible point worth testing from.

CP-SAT is expensive and mechanic-limited (abstains on `mustCross >= 2` and flipping filters — see
that report and [`reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md`](2026-08-12-b2-extinction-adjacent-cpsat-labels.md)),
so it cannot be run at population scale. This pilot asked: does the same *qualitative* signal
(rollout escape depth near a repair near-miss) survive **without** CP-SAT feasibility verification,
using only points a repair elite's own dead end naturally provides? If yes, a cheap population-scale
characterization of "which unsolved levels are narrow-trap-plateaued" becomes possible without an
oracle. If no, that closes the cheap-proxy path and says any future population study of this axis
needs real (expensive) CP-SAT anchoring.

## Tool

`scripts/stress/repair-plateau-rollout-classifier.mjs` (committed). For a sampled level: runs
`repairSearchFromGate` briefly to gather elites via `_repairEliteResearchObserver` (same convention
as `repair-elite-path-dump.mjs`), takes the top-K by badness, then for each elite sweeps a backoff
ladder (Fibonacci-ish steps back from the elite's own dead end) and runs N rollouts per depth using
the **real** `takePly` primitive (`__takePlyForTests`) — the exact function
`repairSearchFromGate`'s own restart loop uses — recording how far each rollout gets before its own
next genuine dead end.

**First-draft correctness finding, worth recording on its own**: rolling out from an elite's exact
stored endpoint always measures zero escape, on every level tested, elite or not. This is not a bug
— `repair-search.ts`'s `takePly` returns `'deadend'` precisely when `neighbors.length === 0` or
`survivors.length === 0`, so a recorded elite's final cell is *by construction* a genuine zero-degree
dead end. Useful rollout data only exists a few steps *before* that point — hence the backoff ladder.

## Method

Sanity check (this report's only run): `R00648`, `R03176`, the same pair the CP-SAT report used.
Top 6 elites per level from a 1,000,000-node `repairSearchFromGate` pass, 150 rollout trials per
elite per backoff depth (backoffs 1/5/13/21/34 steps before the elite's own end), 5,000-node cap per
rollout. `progressFractionOfResidualMax` = the best rollout's extra depth reached, divided by the
residual length remaining at that backoff point (1.0 = a rollout got all the way to `reqLen`, though
reaching `reqLen` alone doesn't mean solved — the win check also needs exact intersection count and
every other objective, so no accidental over-claim here: `solvedInRollout` is tracked separately and
was 0/150 everywhere).

## Result — no discrimination at 4 of 5 backoff depths

Per-level average of `progressFractionOfResidualMax` across the 6 elites, at each backoff:

| backoff | R00648 avg | R03176 avg | direction |
|---:|---:|---:|---|
| 1 | 0.174 | 0.197 | R03176 slightly higher (predicted direction, trivial gap) |
| 5 | 0.519 | 0.393 | **R00648 higher — opposite of predicted** |
| 13 | 0.636 | 0.603 | essentially tied |
| 21 | 0.714 | 0.719 | essentially tied |
| 34 | 0.583 | **0.852** | R03176 clearly higher (predicted direction) |

Only the largest backoff (34, the point *least* representative of near-miss-specific behavior —
furthest from being a trap at all) shows a gap in the direction the CP-SAT report's finding would
predict. At backoff 1 — closest to where repair itself actually got stuck, the point that matters
most for "can blind search escape from here" — the two levels are statistically indistinguishable,
and both show the same shape: most elites read near-zero, with exactly one high-outlier elite each
(R00648: 0.92 on one of six; R03176: 0.73 on one of six) — a property of individual dead-end
trajectories occasionally forking late, not of level identity.

Full per-elite/per-backoff data: raw run output not committed (a 2-level, ~4-second pilot — trivial
to reproduce via the command below); the aggregation script used to produce the table above is
inline in this investigation's session log.

Reproduce: `node scripts/run-bundled.mjs scripts/stress/repair-plateau-rollout-classifier.mjs -- --only=R00648,R03176 --elite-node-budget=1000000 --elites-per-level=6 --rollout-trials=150 --backoffs=1,5,13,21,34`

## Interpretation

**The cheap proxy does not reproduce the CP-SAT report's discrimination.** The CP-SAT report's
crucial ingredient was verifying that its tested point had a real completion nearby *before* asking
whether blind search could find it — without that anchor, "how far a rollout gets before dying" is
dominated by which specific dead-end trajectory (elite) you happened to sample, not by the level's
overall topology. This is consistent with, not contradicting, the same report's own population-scale
finding: `blocksFraction` (a *static* level feature) predicts admissible-order-vs-repair winner at
population scale, while this pilot shows a *dynamic*, per-trajectory rollout signal does not cleanly
separate two individual levels even at n=6 elites each. The static feature and the dynamic proxy are
not interchangeable, and this pilot is evidence the dynamic one needs CP-SAT grounding to be
trustworthy — a cheap substitute was worth trying (one afternoon, not weeks) and is now ruled out.

**Do not scale this proxy to a larger population.** The sanity check already shows it wouldn't
produce a reliable per-level signal; running it over dozens more levels would spend compute
re-confirming noise, which this repo's own batch-tooling discipline (CLAUDE.md, `docs/future-work.md`'s
hygiene notes) explicitly warns against.

## What's still worth keeping

- **The tool itself** (`repair-plateau-rollout-classifier.mjs`) is sound, reusable infrastructure —
  it faithfully replays the real `takePly` primitive and correctly builds state at an arbitrary
  backoff point. Its most useful future role is running a rollout ladder from a **CP-SAT-verified**
  prefix (once one exists), not from a raw elite's own dead end — that combination would be the
  actual population-scale extension of the CP-SAT report's method. It does not currently take a
  `--prefix-file` input for that; adding one is a small follow-up, not attempted here.
- **The backoff-ladder finding itself** (an elite's exact endpoint is always a genuine zero-degree
  dead end; useful data starts a few steps earlier) is a real, small, correct methodological note
  worth keeping for anyone building on this tool later.
- **The negative result** narrows the search space for "characterize the plateau": a fast, blind
  proxy is not available for this specific question. The next genuine step (not attempted here,
  scope discipline) would pair this tool with actual CP-SAT-verified points at a handful more
  matched pairs — real cost, not a shortcut — before drawing any population conclusion about
  narrow-trap vs. wide-plateau prevalence.

## Scope discipline

No `modules/solver/*` file touched. No production behavior changed. This is evidence-gathering only,
per the same discipline the CP-SAT retreat report itself followed.

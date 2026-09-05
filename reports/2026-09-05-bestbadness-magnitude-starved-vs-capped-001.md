# Starved levels' best near-miss is roughly twice as far from solved as capped levels'

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `bestBadness` magnitude (not just which technique achieved it) for `starved` (n=605) vs. `capped` (n=120) unsolved levels in `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json`, no new dispatch
> **Decision:** `starved` levels' best-recorded badness is mean 14.86 / median 14, roughly double `capped` levels' mean 7.65 / median 7. `starved`'s worst case also reaches much higher (max 40 vs. `capped`'s max 27). Near-solve levels (`bestBadness<=2`) are proportionally rarer among starved levels (18/605, 3.0%) than capped (9/120, 7.5%).
> **Remaining gate:** none — descriptive characterization using already-collected data, extending `2026-09-04-starved-vs-capped-structural-signature-001.md` with a magnitude dimension.
> **Evidence role:** discovery — quantifies "how far" in addition to that report's "which technique got closest"
> **Selection:** whole comparable population (605 starved + 120 capped, corpus2), not a sample

## Method

Computed mean/median/max `bestBadness` and the near-solve rate (`bestBadness<=2`) separately for the `starved` and `capped` buckets already established in the prior starved-vs-capped report.

## Result

| | `starved` (n=605) | `capped` (n=120) |
|---|---:|---:|
| mean `bestBadness` | 14.86 | 7.65 |
| median `bestBadness` | 14 | 7 |
| max `bestBadness` | 40 | 27 |
| near-solve rate (`bestBadness<=2`) | 18 (3.0%) | 9 (7.5%) |

## Interpretation

This adds a magnitude dimension to the existing structural finding: `starved` levels are not merely "stuck at an earlier ladder stage" (`early-repair-search`, per the prior report) — their best attempt is also, on average, roughly twice as far from a solution as `capped` levels' best attempt. This is consistent with the prior report's interpretation that heavy `mustCross`/`requiredIntersections` load doesn't just prevent late-stage techniques from getting a turn, it leaves the search in a substantively worse state even at its closest approach — a level that starves the ladder is typically further from solved, not just differently blocked, than one that legitimately exhausts the whole ladder under the raw node cap. This is useful context for Workstream 1: a starved level is less likely to be "one lucky tweak away" from solving than a capped one.

## What this does not establish

- `bestBadness` units/scale are whatever the solver's own badness metric defines; this report does not independently validate that metric's meaning, only compares it across the two buckets on its own terms.
- Correlational, not causal.
- Single run, corpus2 only (corpus1 has too few unsolved levels, n=4, for a meaningful magnitude comparison — see `2026-09-04-corpus1-starvation-profile-001.md`).

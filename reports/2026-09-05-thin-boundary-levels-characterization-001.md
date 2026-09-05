# `thinBoundaryLevels` is a real, non-trivial category — 363 action-level near-boundary solves across the census, over twice the count of genuinely exclusive solves

> **Status:** active
> **Last evidence:** 2026-09-05 — `thinBoundaryLevels` summed across all 41 actions in `reports/stress/technique-niches/2026-09-03/level-capability.json`, no new dispatch
> **Decision:** the census tracks 363 total `thinBoundaryLevels` (action-level pairs) across all actions, compared to 175 total `exclusiveLevels` and 18,389 total `solvedLevels`. This field had not been surfaced or characterized in any report this session despite being present in the schema throughout.
> **Remaining gate:** the exact definition of "thin boundary" was not confirmed from source in this pass (inferred as near-budget-edge or narrow-margin solves by name); a future pass reading the tool that computes this field should confirm the precise definition before using it for a decision-bearing claim.
> **Evidence role:** discovery, partially forensic — flags a previously-unused schema field worth future attention, with an appropriately hedged interpretation given the definition was not independently confirmed
> **Selection:** whole action population (41 actions), not a sample

## Method

Summed the `thinBoundaryLevels` field across every action in `level-capability.json`'s `actions` array and compared to the already-familiar `exclusiveLevels` and `solvedLevels` totals for scale.

## Result

| metric | total across 41 actions |
|---:|---:|
| `solvedLevels` | 18,389 |
| `exclusiveLevels` | 175 |
| `thinBoundaryLevels` | 363 |

Per-family breakdown (from the family-internal ranking reports): `admissible-order` shows `thinBoundaryLevels` values of 24 (`tieBreak=none`), 6 (`default`), 4 (`intersectionHarvest`, `mustCrossFirst`), 4 (`nearClosureRescue`); `beam`'s highest is `perimeterSweep|bias=perimeterCW` at 30, with several beam configs at 20+.

## Interpretation

This field is over twice the size of `exclusiveLevels` in aggregate, meaning it captures something reasonably common — plausibly levels where a technique's solve sits close to a threshold (budget, near-tie, or similar) rather than comfortably within it, though this exact semantics was not independently confirmed against the tool source in this pass. It is flagged here specifically so a future report does not have to rediscover its existence, and so any decision-bearing use of it first confirms its precise definition rather than assuming the name is self-explanatory.

## What this does not establish

- The exact computation behind `thinBoundaryLevels` was not read from source in this pass — this report treats it as a named, already-present schema field worth flagging, not as a fully understood metric.
- Does not test whether `thinBoundaryLevels` correlates with anything (structural features, production status, multiplicity) — a natural follow-up once its definition is confirmed.
- Single census snapshot (2026-09-03).

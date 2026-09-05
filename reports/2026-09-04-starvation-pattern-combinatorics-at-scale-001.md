# goal-attraction-disabled-retry is starved in every starvation case at full production scale

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json`'s already-computed `starvationPatterns` aggregate over its 725 unsolved levels, no new dispatch
> **Decision:** of the 725 production-unsolved corpus2 levels, **605 (83.4%) show at least one starved technique**, and every single one of those 605 includes `goal-attraction-disabled-retry` as a starved technique — it appears alone in 392 cases (54.1% of all unsolved), paired with `repair-fallback` in 57 (7.9%), and paired with `admissible-order-fallback` in 156 (21.5%). There is no starvation pattern in this population that does *not* include `goal-attraction-disabled-retry`. This is a full-scale, independent confirmation of the mechanism `docs/solver-opt-in-experiment-ledger.md`'s `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL` line already names — that tier shares an already-depleting outer work pool and starves as a result — now measured at population scale (605 cases) rather than the smaller populations that originally motivated that development A/B.
> **Remaining gate:** none new. `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL` already exists as the tested fix and remains ACTIVE/opt-in per its own ledger disposition (development positive, confirmation clean null) — this report adds full-scale prevalence evidence to that existing line, it does not reopen or change its disposition.
> **Evidence role:** discovery — whole-population aggregate already computed by the sourcing tool
> **Selection:** whole unsolved population (725/725), not a sample

## Result

| starvation pattern | count | % of unsolved (725) |
|---|---:|---:|
| `goal-attraction-disabled-retry` alone | 392 | 54.1% |
| `goal-attraction-disabled-retry` + `admissible-order-fallback` | 156 | 21.5% |
| `goal-attraction-disabled-retry` + `repair-fallback` | 57 | 7.9% |
| (no starvation recorded) | 120 | 16.6% |

**605/605 (100%) of levels with any recorded starvation pattern include `goal-attraction-disabled-retry`.**

## Interpretation

This is a clean, total finding, not merely a majority one: this dataset records no starvation pattern for this population that excludes `goal-attraction-disabled-retry`. Combined with the already-existing `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL` line's own diagnosis (this tier shares an outer, already-depleting pool rather than owning a protected reserve, unlike the promoted whole-ladder retry tiers), this gives that existing research line a materially larger prevalence number than it previously had on record — worth citing if that line is picked up again, since "starved on 54-83% of the unsolved population depending on how narrowly you count" is a substantially stronger prevalence statement than any population that line's own reports used.

## What this does not establish

- Does not reopen `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL`'s own disposition (ACTIVE/opt-in, confirmation clean null) — high starvation prevalence was already the known mechanism; this just measures it at a larger scale than previously recorded.
- Does not establish that fixing this starvation would recover any of these 605 levels — the existing confirmation already found a fresh cohort where the fix's own mechanism had zero opportunities to matter (a legitimate, anticipated null, not evidence against the mechanism).
- Single production run.

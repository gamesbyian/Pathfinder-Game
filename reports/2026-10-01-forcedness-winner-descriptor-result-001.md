# Local-forcedness winner-descriptor oracle result (premise-generation lane F)

> **Status:** concluded-negative
> **Last evidence:** 2026-10-01 — raw width-500 beam on the 42 random-300 levels the production-default beam solves, per-parent successor counts versus the winning lineage.
> **Decision:** local forcedness (a frontier parent with exactly one post-prune successor) does not distinguish the winning lineage from its same-depth peers, so it has no ceiling as a search-state descriptor or handoff/macro boundary on this population. Lane F is closed as a treatment generator.
> **Remaining gate:** none.
> **Evidence role:** discovery.
> **Owner:** `docs/solver-optimization-workstreams.md`.

Question (refresh report lane F, P170/P198/P204): is local one-successor forcedness useful as a descriptor even though it has no skip economics (reports/2026-09-25-forced-work-capture-economics-per-parent-consumer-oracle-result-001.md)?

## Protocol

`scripts/stress/forcedness-winner-descriptor.mjs`. Population: the 42 levels of `data/stress/bc1-prune-ab-001-ids.txt` that the production-default raw beam (BC1 prune on) solves; unit = level. For each phase, each incoming-frontier parent's post-prune successor count comes from the existing research parent-expansion telemetry (`generatedCandidates`); the winning path's prefix is located in that phase. Per level: the winner's mean within-depth percentile of successor count among peers (0.5 = indistinguishable) and the rate of one-successor nodes for winner versus peers. Peers are restricted to parents with at least one successor, because a winner parent has one by construction (an unrestricted comparison gave a spurious 0.58-0.61 on the first two levels). Rows: `data/stress/forcedness-winner-descriptor-001.json`.

## Result

| Statistic | Value |
|---|---|
| levels | 42 |
| mean / median winner percentile | 0.500 / 0.501 (range 0.43-0.56) |
| levels above / below 0.5 | 23 / 19 (sign test p = 0.64) |
| one-successor rate, winner vs peers (mean over levels) | 43.9% vs 42.3% |
| levels with winner rate > peer rate | 29 / 42 |

The percentile is a null result. The one-successor rate difference is 1.7 points; it points the same way in 29/42 levels but is far too small to be a selection signal and is not a rate a consumer could use.

## What this does not establish

Raw beam only, solved levels only (winner lineage needs a solution), one width, and one descriptor (successor count; not corridor length, chain structure or what follows a forced step). It does not revisit the closed forced-work economics questions.

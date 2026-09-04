# Corpus1 has zero "capped" (raw-node-exhausted) failures — its 4 unsolved levels are pure ladder starvation

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus1.json` (102 levels: 98 solved, 4 starved, **0 capped**), compared against corpus2's split (975 solved, 605 starved, 120 capped, from `lifecycle-failure-map-corpus2.json`), no new dispatch
> **Decision:** corpus1's `buckets` object has no `capped` key at all — every one of its 4 unsolved levels is `starved` (ladder ran dry), and all 4 share the identical starvation pattern (`goal-attraction-disabled-retry` alone) and identical near-miss technique (`early-repair-search`). Corpus2, by contrast, has both bucket types, with `capped` making up 16.6% (120/725) of its unsolved levels and multiple distinct starvation patterns. This is directionally consistent with — and sharpens — the existing corpus1-vs-corpus2 stage-share finding that corpus1 is a much easier population overall.
> **Remaining gate:** none — descriptive characterization; flagged explicitly as thin (n=4) rather than promoted further.
> **Evidence role:** discovery — the starved/capped split (see `2026-09-04-starved-vs-capped-structural-signature-001.md`) had not been run against corpus1 specifically
> **Selection:** whole corpus1 unsolved population (n=4), not a sample — this is the entirety of corpus1's failures in this run

## Method

Same `buckets`/`starvationPatterns`/`bestBadnessTechnique` fields used in the corpus2-focused starved-vs-capped report, read directly from `lifecycle-failure-map-corpus1.json` and compared to the already-known corpus2 figures.

## Result

| | corpus1 | corpus2 |
|---|---:|---:|
| total levels | 102 | 1700 |
| solved | 98 (96.1%) | 975 (57.4%) |
| starved | 4 (100% of unsolved) | 605 (83.4% of unsolved) |
| capped | **0** (0% of unsolved) | 120 (16.6% of unsolved) |
| distinct starvation patterns | 1 (`goal-attraction-disabled-retry` alone, all 4) | 3+ (`goal-attraction-disabled-retry` alone: 392; `+admissible-order-fallback`: 156; `repair-fallback+`: 57; ...) |
| `bestBadnessTechnique` on unsolved | 4/4 `early-repair-search` | 510/605 (84.3%) `early-repair-search` on starved, 119/120 (99.2%) late-repair on capped |

## Interpretation

Corpus1's solve rate (96.1%) and stage-share profile (97% of solves from `main-ladder`+`early-repair-search`, per `2026-09-04-corpus1-corpus2-stage-share-comparison-001.md`) already showed it is a structurally easier population than corpus2. This report adds a sharper version of the same conclusion at the failure end: corpus1 apparently never produces a level hard enough to make the *entire* ladder run and still exhaust the raw node budget (a `capped` outcome) — its rare failures are all early ladder-starvation cases, matching the same `goal-attraction-disabled-retry`-starves-first signature that dominates corpus2's own `starved` bucket. In other words, corpus1's difficulty ceiling in this run never reaches the regime where `capped` failures — and by extension the late-ladder retry tiers' real production wins — become possible at all; that entire failure mode, and the technique tiers whose value is best evidenced there (per `2026-09-04-admissible-order-alternate-tiebreak-retry-production-win-redundancy-001.md`), is a corpus2-only phenomenon in this dataset.

## What this does not establish

- n=4 is too thin to support any quantitative claim beyond "0 out of 4" — this is reported as a descriptive, directional data point, not a statistically powered result.
- Does not establish *why* corpus1 never produces a `capped` failure (generator/editor envelope differences remain untested per `solver-future-work.md`'s standing caveat that no true generator/editor field exists in the census).
- Single run, single corpus snapshot.

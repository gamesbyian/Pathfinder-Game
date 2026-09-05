# The naturallyExhausted/budgetOrOtherCensored ratio signal replicates across the corpus1/corpus2 holdout

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — standardized difference of `naturallyExhausted / failedCells` between production-solved and production-unsolved levels, computed independently within `corpus1` and `corpus2` via `scripts/analyze-structural-holdout-replication.mjs`, no new dispatch
> **Decision:** `2026-09-04-failure-censoring-schema-note-and-signal-001.md`'s directional finding (harder-outcome populations have a relatively higher `naturallyExhausted` share of failed cells) replicates in both corpora independently: corpus1 standardized diff −0.562 (n=84/7), corpus2 −0.449 (n=808/881). Same direction, comparable magnitude, with corpus2 alone already adequately powered — this is a genuine holdout confirmation, not just a restatement of the pooled result.
> **Remaining gate:** none — a holdout-replication check of an already-published finding using already-collected data.
> **Evidence role:** forensic — strengthens an existing finding's confidence using the session's holdout-replication tool
> **Selection:** whole census population (1,962 levels), not a sample

## Method

Derived `naturallyExhaustedRatio = naturallyExhausted / failedCells` per level and ran it through `analyzeHoldoutReplication` with the default `productionSolved` grouping, split by `corpus1`/`corpus2`.

## Result

| | corpus1 (n=84 solved / 7 unsolved) | corpus2 (n=808 solved / 881 unsolved) |
|---|---:|---:|
| standardized difference | −0.562 | −0.449 |

## Interpretation

Both corpora agree in direction and are reasonably close in magnitude, and corpus2's split alone has ample sample size on both sides (unlike some other corpus1-driven false positives caught this session), so this is a credible, holdout-confirmed secondary signal — not merely a pooled artifact. This adds confidence to the original report's characterization of the `naturallyExhausted`/`budgetOrOtherCensored` split as a real, if modest, secondary difficulty signal distinct from the main structural risk-factor block.

## What this does not establish

- Does not test the parity-split holdout used for the primary structural-risk ranking — the corpus split alone is sufficient given the goal (a lightweight confirmation, not an exhaustive re-validation).
- Still a modest-magnitude signal (~0.45-0.56) — weaker than the leading structural risk-factor block (0.6-1.6), so it remains a secondary rather than primary predictor.

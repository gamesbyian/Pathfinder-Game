# Selective diverse-IH broad confirmation

> **Status:** concluded-negative
> **Last evidence:** 2026-08-25 — confirmation run `32912881453`; development run `32911007113`
> **Decision:** close the exact selective diverse-IH exposure treatment. It was +9/-0 on the feature-defined Corpus-2 development population but exactly null on fresh `confirm-broad-002`.
> **Remaining gate:** none
> **Evidence role:** confirmation
> **Selection:** prespecified for confirmation after treatment selection on mined Corpus-2 development evidence; cohort, work envelope, candidate, and acceptance rule were frozen before cohort materialization

## Frozen candidate

The candidate was frozen before materializing the confirmation cohort:

- solver revision `fc696bac37bffea9ca8b8dbc7616639224fbf4dc`;
- append only `beam:intersectionHarvest@beam5000(diverse)` to the same two very-high-intersection policy bundles when `mustCross < 2`;
- no beam-width, score, retry, repair, DFS, admissible-search, or total-budget change;
- no bespoke minimum-budget floor;
- strict total canonical-work budget 67,000,000 per level;
- node ceiling 50,000,000 per level;
- acceptance: zero lost solves AND either at least one gained solve or at least 10% aggregate-work reduction.

Development run `32911007113` had produced **122/262 → 131/262**, **+9/-0**, with aggregate work **11,846,980,349 → 11,795,480,124** (-0.43%), earning confirmation.

## `confirm-broad-002` contract

Because `confirm-broad-001` was already spent, a fresh successor was reserved before materialization:

- 256 independently generated raised-cap levels;
- generator revision `4f2b2b143ee2bc194b8e017fcc59a680b9ee8d92`;
- master seed `2026082517`;
- IDs `D00001` onward;
- every generated row included, with no outcome conditioning.

The workflow materialized the cohort exactly once, sealed the `levels` hash, and required all 16 control/treatment shards to download and verify that identical artifact before search. All shard and provenance checks passed. Treatment patch hashes were identical across treatment shards.

## Confirmation result

Run `32912881453` completed cleanly.

| metric | control | treatment |
|---|---:|---:|
| solved | **126/256** | **126/256** |
| aggregate `workSpent` | **11,220,816,792** | **11,222,024,892** |
| gained solves | — | **0** |
| lost solves | — | **0** |
| work reduction | — | **-0.01%** |

Frozen verdict: **`confirmation-fail`**.

There were no changed IDs to inspect. The result is a clean null, not a regression: the treatment did not generalize to this fresh broad sample and cost about 1.21M additional aggregate work.

## Interpretation

The development result remains valid evidence that Corpus-2 contains exploitable routing structure, but it does not support promoting this particular feature rule as a general solver improvement. This is exactly the distinction the confirmation protocol was designed to enforce.

`confirm-broad-002` is now spent. Do not retune the candidate against it. `transfer-envelope-001` was not earned and remains pristine.

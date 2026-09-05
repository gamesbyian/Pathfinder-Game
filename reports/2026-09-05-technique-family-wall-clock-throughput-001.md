# Beam expands nodes roughly 7-13x slower per wall-clock ms than DFS/admissible-order; repair is similarly slow

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — per-attempt `nodesExpanded / elapsedMs` grouped by technique family, computed from `reports/portfolio/static-portfolio-entrypoint-production-ab-001/{production-arm,static-portfolio-arm}.json` (1,291 + 518 = 1,809 valid attempts across both arms of the existing 40-level production A/B), no new dispatch
> **Decision:** wall-clock throughput (raw nodes expanded per millisecond) differs sharply and consistently by technique family across both arms of this A/B: `dfs` (630-714 median nodes/ms) and `admissible-order` (592-1,023 median) are 7-13x faster per node than `beam` (83-107 median) and `repair` (62-102 median). The ordering and rough magnitude are consistent across two independently-scheduled arms (production-arm's stage-based scheduler vs. static-portfolio-arm's fixed-cap scheduler), so this is a stable per-family property, not an artifact of one scheduling regime.
> **Remaining gate:** none — a descriptive characterization using already-collected attempt-level telemetry. Quantifies, but does not itself validate or invalidate, `solver-optimization-workstreams.md`'s standing rule to use `workSpent` (not raw nodes) for cross-technique allocation — see Interpretation.
> **Evidence role:** discovery — a wall-clock-throughput characterization not previously computed this session, using existing per-attempt telemetry from a dataset otherwise mined for budget-utilization and marginal-value questions
> **Selection:** whole attempt population from both existing A/B arms (1,809 valid attempts), not a sample

## Method

For every attempt in both arms' 40-level population, computed `nodesExpanded / elapsedMs` (nodes expanded per wall-clock millisecond) where both fields are present and `elapsedMs > 0`, grouped by technique family parsed from `actionKey`'s second `|`-delimited segment (works for both arms' differing `actionKey` prefix conventions — `main-search|<technique>|...` and `static-portfolio|<technique>|...` — since the technique name is always the second segment in both).

## Result

| family | production-arm (n, median nodes/ms) | static-portfolio-arm (n, median nodes/ms) |
|---|---|---|
| `dfs` | 530, 630.0 | 78, 714.1 |
| `admissible-order` | 203, 1,023.0 | 82, 592.2 |
| `beam` | 404, 106.8 | 291, 82.8 |
| `repair` | 154, 102.3 | 67, 61.8 |

## Interpretation

This quantifies the mechanistic reason `solver-optimization-workstreams.md`'s standing rule insists on `workSpent` rather than raw `nodesExpanded` for cross-technique allocation: a scheduler that budgeted by raw node count or treated wall-clock time as node-count-proportional across families would badly misallocate, since `beam` and `repair` do roughly 7-13x less raw search per unit wall-clock time than `dfs`/`admissible-order` — consistent with `beam`'s per-node overhead (scoring, retention/dedup bookkeeping, width-bounded frontier management) and `repair`'s presumably more expensive per-step repair-move evaluation, versus `dfs`/`admissible-order`'s comparatively lightweight per-node cost. This is directly relevant to any future wall-clock-bounded scheduling design (e.g. the GHA dispatch's own `target_wall_minutes` parameter used throughout this session's confirmation work) — a wall-time budget is not a technique-neutral currency any more than raw node count is, for the same underlying reason.

This report does not itself verify whether the existing `workSpent` metric successfully corrects for this per-family throughput difference (i.e., whether `workSpent` is well-calibrated to true wall-clock cost across families) — that would require attempt-grain `workSpent` data alongside `elapsedMs`, which this dataset does not carry (only level-total `workSpent` is present, aggregating multiple techniques' contributions per level). That remains an open, checkable question if attempt-grain `workSpent` becomes available.

## What this does not establish

- Does not verify that `workSpent`'s existing normalization actually accounts for this per-family wall-clock throughput difference — only that raw nodes/wall-clock-time are not technique-neutral, which is the premise `workSpent` was presumably introduced to address.
- Does not decompose by specific sub-configuration within a family (e.g. beam width, admissible-order tie-break) — only the four top-level families.
- Two arms from one 40-level A/B; does not test whether this throughput ordering holds at full census scale (1,962 levels) or across different hardware/CI runners.

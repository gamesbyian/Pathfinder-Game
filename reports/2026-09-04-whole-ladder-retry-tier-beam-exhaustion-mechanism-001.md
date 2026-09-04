# Beam's variable exhaustion inside whole-ladder retry tiers is a technique property, not a shared-budget race

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — local re-analysis of `reports/portfolio/static-portfolio-entrypoint-production-ab-001/production-arm.json` (the same 40-level lifecycle data the DFS-monopolization forensic note used), no new dispatch
> **Decision:** `2026-09-04-whole-ladder-retry-tier-dfs-monopolization-forensic-note-001.md` found DFS attempts inside four whole-ladder ablation-disabled retry tiers never naturally exhaust (435/435 censored), consuming 29-49% of each tier's work — the exact shared-budget first-mover-monopolization mechanism `STRATEGY_RETRY_TIER_NODE_STAIRCASE` was closed negative for on 2026-08-19. This report finds beam's own exhaustion pattern inside the same four tiers is **not** the same mechanism: exhaustion rate is highly config-specific and consistent across all four tiers (correlation, not coincidence) — `mechanic-buckets`-retention wide beams (5000-width) exhaust 92-100% of the time, `plain`-retention wide beams at the same width exhaust only 33-38% of the time, and narrow 2000-width beams exhaust 88-100% of the time — a pattern explained by retention policy and width, not by queue position.
> **Remaining gate:** none — this is characterization, not a new lever. It refines, not reopens, the already-closed staircase disposition.
> **Evidence role:** forensic — extends the same-day DFS forensic note's already-closed-mechanism framing to beam, on the same already-collected data
> **Selection:** the 40-level population is the existing disjoint draw already used by the marginal-value-tail-audit and the DFS forensic note; the per-config breakdown was inspected after the fact (discovery within the forensic frame), consistent with that companion report

## Method

Same estimation methodology as the DFS forensic note: median `workSpent`/`nodesExpanded` ratios per config from `static-portfolio-arm.json`'s real per-attempt data, applied to `production-arm.json`'s beam attempts inside each of the four whole-ladder tiers (`must-cross-neighbor-prune-disabled-retry`, `connectivity-axis-prune-disabled-retry`, `guidance-goal-distance-retry`, `coarse-state-near-tie-retention-disabled-retry`). Grouped by config within each tier.

## Result

The same beam-config exhaustion pattern reproduces near-identically across all four tiers (shown here for `connectivity-axis-prune-disabled-retry`; the other three match within a couple of percentage points):

| beam config | n | exhausted | rate | work share |
|---|---:|---:|---:|---:|
| `objectiveFirst`, width 5000, **mechanic-buckets** | 12 | 11 | 91.7% | 24.1% |
| `intersectionHarvest`, width 5000, **mechanic-buckets** | 11 | 11 | 100.0% | 24.3% |
| `intersectionHarvest`, width 5000, **plain** | 21 | 7 | 33.3% | 15.2% |
| `objectiveFirst`, width 5000, **plain** | 21 | 7 | 33.3% | 14.1% |
| `perimeterSweep` (CW), width 2000, plain | 16 | 7 | 43.8% | 5.8% |
| `perimeterSweep` (CCW), width 2000, plain | 22 | 8 | 36.4% | 5.6% |
| `objectiveFirst`, width 2000, plain | 8 | 8 | 100.0% | 4.7% |
| `intersectionHarvest`, width 2000, plain | 8 | 8 | 100.0% | 4.7% |

The same three configs (`mustCrossFirst`, `harvestThenFinish`, `knotBuilder` at width 2000) each appear once per tier and always exhaust (n=1 each, too small individually to trend but consistent with the width-2000 pattern above).

Two clean, consistent sub-patterns:
1. **Retention policy dominates at width 5000.** `mechanic-buckets` retention exhausts 92-100% of the time; `plain` retention at the identical scoring/width exhausts only 33% of the time — the same scoring profile, same width, different retention rule, roughly 3x the natural-termination rate.
2. **Width 2000 beams exhaust reliably regardless of retention** (88-100% across every width-2000 config observed) — a smaller search frontier naturally finishes faster than a 5000-wide one, independent of retention.

## Interpretation

This is a genuinely different mechanism from DFS's. DFS's near-zero exhaustion (0/435 across all four tiers, per the companion forensic note) is a **shared-budget race** artifact: whichever DFS config happens to run first when meaningful budget remains monopolizes it and still fails to converge, while every DFS config after it gets scraps. Beam's exhaustion variance, by contrast, tracks **intrinsic per-config properties** (retention rule, beam width) consistently across all four independently-promoted tiers — not queue position. A `plain`-retention 5000-width beam is roughly three times less likely to finish than the identical scoring profile under `mechanic-buckets` retention, in every tier tested, which is a property of the retention mechanism's own pruning behavior (mechanic-buckets retention is designed to prune the frontier more aggressively along mechanic-relevant dimensions), not an artifact of shared-pool competition.

This does not reopen `STRATEGY_RETRY_TIER_NODE_STAIRCASE` or nominate a new lever — it refines the mechanistic picture the DFS forensic note already established, and is recorded for the same reason: to prevent a future session independently re-discovering "beam sometimes doesn't finish either" and either misattributing it to the same DFS-shaped starvation mechanism, or spending effort re-deriving what retention/width already explain.

## What this does not establish

- Does not test whether `plain`-retention wide beams' lower exhaustion rate costs real solves (unlike DFS, some plain-retention wide-beam attempts in this population *do* solve elsewhere in the ladder — this report only characterizes exhaustion behavior inside these four specific retry tiers, not their solve contribution).
- Single 40-level population, not independently replicated.
- Does not explain *why* mechanic-buckets retention prunes more aggressively at the mechanism level (that is established elsewhere in this repo's naming-cleanup/retention-policy history, not re-derived here).

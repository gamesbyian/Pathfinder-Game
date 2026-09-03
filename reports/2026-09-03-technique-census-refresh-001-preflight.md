# Technique census refresh 001: preflight

> **Status:** dispatched
> **Last evidence:** 2026-09-03 — 24-cell local calibration at current HEAD, informing shard sizing below; protocol written before dispatch per `docs/investigation-report-conventions.md`.
> **Decision:** dispatch a full refresh of the T1/T3 technique census (`technique-census.yml`), full population parity preserved (every level in all 3 corpora, solved and unsolved — not sampled), because [`2026-09-03-frozen-technique-census-staleness-spotcheck.md`](2026-09-03-frozen-technique-census-staleness-spotcheck.md) already found real motivation (3/12 cheap spot-checked cells regressed from solved to unsolved against the 2026-08-20 census).
> **Remaining gate:** run to completion; recombine/rejoin the technique-niches capability map from the fresh combined artifact once done.
> **Evidence role:** infrastructure/evidence-refresh — rebuilding the frozen capability-map input, not itself an experiment.

## Why a full refresh, not incremental

Checked whether a cheaper incremental/diff-based refresh was possible before committing to the full cost: the underlying T1 census (run `32240161854`) was built from commit `c96f57c8` (2026-08-19). Between that commit and current HEAD, **401 commits touch `modules/solver/`**, including the core shared search/scoring/state files every technique family goes through (`search.ts` 420 lines changed, `scoring.ts` 112, `search-state.ts` 43, `topology.ts` 161, `repair-search.ts` 122, plus the entire naming-cleanup rename program). There is no way to safely predict which subset of 78,505 cells these changes could or couldn't affect — confirmed directly by the staleness spot-check itself, which found regressions spread across three different technique families (beam, DFS, repair), not confined to one. A full re-run is the only trustworthy option; see that report for the full reasoning. Per an explicit choice, the full-population design (every level, not just currently-unsolved ones) is preserved — this is what let the spot-check see solved-level regressions at all, and reverting to unsolved-only would reintroduce the exact blind spot the 2026-08-19 full-parity revision fixed.

## Calibration (why this isn't the original 2026-08-19 estimate reused blindly)

The original design's per-cell cost estimate (~35-45s/cell blended, ~1,003 sequential runner-hours) is itself over two weeks stale, and the same 401 commits that motivate the refresh could equally have changed per-cell *cost*, not just outcome. Recalibrated locally: 24 T1 cells (6 per family: `ida`/`beam`/`dfs`/`repair`), fixed-seed sample (not selected on outcome), run via `technique-census-cell.mjs`'s own `runCell` at current HEAD, sequential (1 worker):

| family | T1 population | n | mean | min | max |
|---|---:|---:|---:|---:|---:|
| `ida` (admissible-order) | 9,810 | 6 | 27.48s | 11.04s | 37.73s |
| `beam` | 30,472 | 6 | 1.50s | 0.55s | 2.67s |
| `dfs` | 32,434 | 6 | 23.45s | 0.00s | 43.38s |
| `repair` | 3,898 | 6 | 277.43s | 0.01s | 809.88s |

Two real, material changes from the 2026-08-19 calibration:

1. **`beam` is now dramatically cheaper** (~1.5s mean vs. the original ~50s blended assumption) — consistent with the intervening beam correctness/state-representation work.
2. **`repair` is now dramatically more expensive on a cap-hit** — up to **809.88s (13.5 minutes)** for a single cell hitting the 50,000,000-node cap, vs. the original design's ~35s/cell uniform assumption across all families. This is a ~15-20x increase for repair's worst case specifically, and (with only 6 samples, half of which were cap-hits) the true tail is not tightly bounded by this calibration.

Population-weighted sequential estimate for T1 (`Σ family_population × family_mean`): **≈2,157,246s ≈ 599.2 runner-hours** — despite repair's blowup, this is *lower* than the original ~979-hour T1 estimate, because beam (the largest family by cell count, 30,472 cells) got cheap enough to more than offset repair's (much smaller population, 3,898 cells) increase. T3 (1,891 pair cells, each running two techniques sharing one budget) is conservatively estimated at ~2x a single technique's average cost per cell (~56s/cell) ≈ 29.4 runner-hours. **Total ≈ 628.6 sequential runner-hours.**

## Sizing decision

- **`workers=4`** (workflow default, matches current `ubuntu-latest`'s 4 vCPUs — unchanged).
- **`shards=120`** — kept at the workflow's existing hardcoded value, **not** raised to compensate for repair's newly-observed cap-hit tail. Shard count isn't actually a dispatch input on `technique-census.yml` (unlike `static-portfolio-confirmation.yml`): it's baked into both the matrix array (`shard: [1, 2, ..., 120]`) and the shard command's own `--shards=120` argument. Raising it would mean hand-editing that matrix/argument pair on a workflow this repo has run successfully at population scale before — real risk of a subtle shard-range bug (a miscounted array, a mismatched `--shards` value) that could silently misassign or drop cells across an 8-hour-plus dispatch, for a benefit (lower per-shard worst case) the existing infrastructure already provides another way: the workflow's own `timeout -k 30s --preserve-status 345m` per-shard safety net plus `--skip-existing` recovery (both already tested, already part of this exact workflow) tolerate a hot shard gracefully — it stops having written every completed cell, and a follow-up dispatch closes the gap without re-running everything. At 120 shards, average per-shard sequential work ≈ 5.24 hours; with even a conservative ~2.5x parallel speedup from `workers=4` (between the historical 1.78x-at-2-workers and a hoped-for near-linear scaling, deliberately not assumed), that's **≈2.1 hours average per shard** — comfortable margin under the 345-minute cap on average, with the safety net covering the tail risk this thin calibration can't fully bound.
- **`max_parallel=20`** (workflow default, unchanged — no basis to assume a higher account-level entitlement).
- **`t1_sample_size=all`, `t3t4_sample_size=200`, `t1_node_budget=50000000`, `seed=20260819`** — all unchanged from the original design's defaults (full population; node budget matches every reference to this census elsewhere in the repo; seed kept for continuity even though `t1_sample_size=all` makes it a no-op for T1's own sampling).
- **Estimated wall-clock:** ≈628.6 sequential hours / (assumed ≈2.5x per-shard speedup) / 20 concurrent shards ≈ **12.6 hours** best-case with perfect packing across 6 waves of 20; realistically likely in the **14-20 hour** range accounting for per-shard fixed overhead (checkout/npm install, ~30-40s × 120), uneven wave completion, any shard that hits the timeout and needs a `--skip-existing` follow-up, and the real possibility average costs run higher than this thin calibration suggests. This is a rough-order estimate, not a guarantee.

## Dispatch mechanics (unchanged from the existing workflow)

`technique-census.yml`'s combine job commits its own result directly (`git push origin HEAD:${{ github.ref_name }}`) — dispatched against `claude/solver-dev-queue-wmrxlo` (not `main`) so the resulting commit (the new `reports/stress/technique-census/<run-id>/` directory plus any newly-discovered hints) lands on this session's branch for review before merging, matching this branch's existing dispatch pattern for every other run this session made.

## What happens after

Once complete, rejoin the technique-niches capability map (`scripts/analyze-technique-niches.mjs`, writing to a **new** dated output directory per this session's own documented footgun-avoidance note in that script, not overwriting `reports/stress/technique-niches/2026-09-01/`) against the fresh combined cells, and diff the new `frozenT1SupportClass`/singleton-doubleton counts against the frozen 2026-09-01 snapshot to characterize how much the map actually moved — the real "delta digest" the workstream-wide rules call for after a meaningful census refresh.

## Reproduction

Workflow dispatch: `technique-census.yml` on ref `claude/solver-dev-queue-wmrxlo`, `baseline=reports/stress/capability-runs/31918095910/summary.json` (default), `t1_sample_size=all`, `t3t4_sample_size=200`, `t1_node_budget=50000000`, `seed=20260819`, `workers=4`, `max_parallel=20` — every input at its workflow default; only the calibration/sizing analysis above is new.

## Result

_Pending — filled in once the run completes (expected ~14-20 hours per the estimate above)._

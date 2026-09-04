# Corrected (node-budget-unconfounded) confirmation attempt also inconclusive — both arms' shards ran out their planning-stale timeout before finishing their assigned slice

> **Status:** inconclusive
> **Last evidence:** 2026-09-04 — control run [`33856604960`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33856604960) and treatment run [`33856607156`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33856607156), both dispatched on `main` post-PR-#1675 with `node_budget_advisory_only=true` against the same 150-id population (`data/stress/admissible-order-non-default-retry-repricing-confirmation-001-ids.txt`) as the original confounded attempt, combine-job logs pulled via `get_job_logs`
> **Decision:** the node-budget/work-budget confound diagnosed in `-001` is genuinely fixed — `node_budget_advisory_only=true` did what it was supposed to, work_budget (67,000,000) is the sole binding per-level constraint this time. But a *second*, independent execution problem made this attempt unusable too: both runs' shard planner (`scripts/plan-highbudget-shards.mjs`) was invoked with the raw, no-longer-binding `--node-budget=50000000` for its wall-time/timeout estimate, so shards were packed and timed as if the old 50M-node ceiling would still bound each level's real wall time. It doesn't anymore — some levels now legitimately run much longer per attempt — so most shards blew through their planned per-shard timeout before finishing their assigned levels. Control's combine reported only 87/150 (58.0%) levels with a result at all; treatment reported 88/150 (58.7%). Neither run recorded any of its missing levels as "unsolved" — they are simply absent from the merged output, because the sweep script never got to them before its shard's `timeout` wrapper fired. This is not a fair or complete sample of either arm and no solved-id-set or `workSpent` comparison is drawn from it.
> **Remaining gate:** re-dispatch the identical control/treatment pair a third time, now that the shard planner has been fixed (this report's accompanying workflow change) to size shard packing/timeouts off the derived `work_budget` rather than the raw `node_budget` when `node_budget_advisory_only=true`.
> **Evidence role:** forensic — root-causes why the corrected dispatch still failed, distinct from and downstream of the `-001` confound diagnosis
> **Selection:** both full dispatched runs (not a sample of them) — the incompleteness is a property of execution, not of sampling

## Method

Checked `mcp__github__actions_get`/`actions_list` for both runs' final status, then pulled the "Combine shard results" job's logs for each via `mcp__github__get_job_logs`. Both jobs reported "Shards: 38/38 complete" and "X/X solved" (87/87 and 88/88 respectively) with an empty `Unsolved:` line — which read, at first glance, like a suspiciously perfect result. Cross-checked against the actual population size (`wc -l` on the ids file: 150) and found both totals are far short of 150. Traced the cause via the "Plan weighted shards" job's own log, which prints its planner invocation and prediction directly:

```
node scripts/plan-highbudget-shards.mjs --node-budget="50000000" ... --target-wall-minutes="20" ...
Planned 38 shard(s) (0 solo, 38 packed) from 150 ids + 0 corpus-1 straggler(s).
Predicted wall minutes/shard: min=10 p50=20 p90=20 max=20
```

The planner is invoked with `--node-budget=50000000` — the raw dispatch input — regardless of `node_budget_advisory_only`. Confirmed via a sampled shard's own step timing (shard 003: "Run level-blind-capability-sweep on this shard's slice" ran from 09:14:30 to 09:46:57, ~32 minutes, cut off by its per-shard `timeout` wrapper) that shards are indeed hitting their planned timeout (`Math.max(30, Math.ceil(predictedWallMinutes * 1.5) + 10)` from `plan-highbudget-shards.mjs`, ≈40 minutes for a 20-minute prediction) well before working through their assigned levels.

## Result

| | control (`33856604960`) | treatment (`33856607156`) |
|---|---:|---:|
| planner's `--node-budget` input | 50,000,000 (stale) | 50,000,000 (stale) |
| actual per-level ceiling in effect | work_budget = 67,000,000 (node budget advisory-only) | work_budget = 67,000,000 (node budget advisory-only) |
| planner's predicted wall time/shard | 10-20 min | 10-20 min |
| levels reported in combined result | 87 / 150 (58.0%) | 88 / 150 (58.7%) |
| levels recorded `unsolved` | 0 | 0 |
| levels silently missing (never attempted) | 63 | 62 |
| reported `workSpent` (of the partial subset) | 10,962,483,673 | 14,349,987,212 |

Total shard-job conclusions: control 5/38 "success", 33/38 "cancelled" (by their own per-shard timeout wrapper); treatment 3/38 "success", 35/38 "cancelled" — a similar, slightly worse truncation rate for treatment, consistent with the treatment arm's fraction-override work sometimes finishing even later per level, not with any real solve-quality difference.

## Interpretation

This is a distinct failure mode from `-001`'s confound, and it is purely an infrastructure/planning gap, not evidence about the `admissible-order-alternate-tiebreak-retry` fraction override itself. `node_budget_advisory_only=true` correctly removed the raw node ceiling as a *solve*-time stopping condition (exactly as PR #1675 intended), but the shard *planner* was never told about that change — it continued sizing shard packing and per-shard timeouts as if a level could take at most roughly as long as 50,000,000 nodes' worth of search, when in fact levels can now run up to the much larger 67,000,000-node-equivalent work ceiling before anything stops them. The planner under-packs each shard's time budget as a result, and most shards (33/38 and 35/38) hit their own timeout mid-slice, leaving the bulk of their assigned levels completely unattempted rather than recorded as timed-out/unsolved.

Because the ~58% of levels that *did* complete in each arm are whichever ones happened to be early enough in their shard's packing order to finish before the timeout — not a random or matched subset between control and treatment — even a raw overlap comparison of the two partial solved-id sets would be comparing two different, non-randomly-truncated populations. No such comparison is drawn here.

The accompanying workflow change (`.github/workflows/solver-level-blind-targeted-sweep.yml`) fixes the root cause: when `node_budget_advisory_only=true`, the planner is now given the derived `work_budget` value (node_budget × 1.34) as its `--node-budget` planning input instead of the raw, no-longer-binding `node_budget`, so shard packing and per-shard timeouts are sized against the ceiling that actually governs wall time in this mode.

## What this does not establish

- Does not confirm or refute the `admissible-order-alternate-tiebreak-retry` repricing question — that remains exactly where `-001` left it: untested in an unconfounded, complete run. Disposition unchanged (default-ON, full fraction) until a complete confirmation exists.
- Does not establish whether the planner fix alone is sufficient to get a complete run in one more attempt — it's possible per-shard timeouts still need headroom beyond a single 1.34x work-budget-based estimate if worst-case per-level time scales non-linearly past that point; the next dispatch should be checked for completeness (`Shards: 38/38 complete` reporting the full 150, not a partial subset) before trusting its result.
- Single pair of runs; the planner fix is untested by an actual dispatch as of this report.

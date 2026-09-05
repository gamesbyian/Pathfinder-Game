# 5th confirmation attempt: both arms captured only 18/76 levels, byte-identical between arms — a newly-diagnosed timeout/non-strict-work-budget interaction, not a result

> **Status:** inconclusive
> **Last evidence:** 2026-09-05 — control run [`33932679478`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33932679478) (fraction=1.0) and treatment run [`33932686070`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33932686070) (fraction=0.18), both against the narrowed 76-id population from `-004`, both `status=completed`/`conclusion=cancelled` at the run level; job-level inspection of both runs' full job lists and their `Combine shard results` logs
> **Decision:** both arms captured the **identical 18/76 levels** (`R00044, R01504, R02179, R02189, R02346, R02472, R02580, R02597, R02613, R02655, R02770, R02940, R02947, R02974, R03092, R03120, R03153, R03203`), all marked solved, byte-for-byte identical between control and treatment — exactly the same symptom `-002`/`-003` already diagnosed as "not a result" (harder ids never reach a point where the fraction could matter). The other 58/76 shards were cancelled by their per-shard job timeout with **zero output written** (no batch file entry at all, not even a "failed"/"timed-out" status) — so the confirmation captured 23.7% of its target population, and specifically the *wrong* 23.7%: all 18 captured levels are ones that solve quickly regardless of treatment, none are drawn from the 62 ids this confirmation exists to test. **This is not a valid comparison and must not be read as a zero-loss result.**
> **Remaining gate:** the timeout/non-strict-work-budget interaction below must be resolved (see Interpretation) before a 6th dispatch attempt can plausibly succeed. Disposition unchanged (default-ON, full fraction) pending that.
> **Evidence role:** forensic — diagnostic only, no comparison evidence produced
> **Selection:** N/A — see caveats

## Method

Both runs show `status=completed`, `conclusion=cancelled` at the top level, matching the already-established benign per-shard-timeout pattern in form — but this time the pattern extends far enough to invalidate the whole dispatch, not just individual shards. Inspected: (1) both runs' full job lists (78 jobs each: `Plan weighted shards`, 76 `Targeted shard NNN/76` jobs, `Combine shard results`); (2) the `Combine shard results` job's logs for each arm; (3) the `Plan weighted shards` job's log for the shard-sizing decision; (4) one cancelled shard's full log and its exact sweep-invocation command line.

## Result

| | control | treatment |
|---|---:|---:|
| shard jobs: `success` conclusion | 18/76 | 18/76 |
| shard jobs: `cancelled` conclusion | 58/76 | 58/76 |
| cancelled-shard duration | 4215-4218s (≈70.3 min) uniformly | 4215-4218s (≈70.3 min) uniformly |
| successful-shard duration | 65-3274s (≈1-55 min) | (same distribution) |
| levels in combined output | 18 (all solved) | 18 (all solved) |
| solved-id sets | identical to treatment | identical to control |

## Interpretation — root cause chain

This is a **new** failure mode, distinct from the four already diagnosed and fixed in `-001` through `-004` (node-budget/work-budget confound, stale planner wall-time estimate, no-telemetry blind uniform prediction colliding with node-budget semantics, population dilution). Tracing it precisely:

1. **The shard planner has no per-id timing telemetry for this population.** `Plan weighted shards`'s log shows `Predicted wall minutes/shard: min=40 p50=40 p90=40 max=40` — every one of the 76 ids gets the *identical* predicted wall time (the `--target-wall-minutes=40` input value itself), because `plan-highbudget-shards.mjs` falls back to a flat estimate when no `emaMsPerGiganode` telemetry exists for an id, and none of these 76 ids have any. This is not a bug — the planner is genuinely blind here, which is exactly the level-blindness this research program exists to work around, just showing up one layer down in the tooling itself.
2. **A uniform prediction forces a uniform per-shard job timeout.** `timeoutMinutes = max(30, ceil(wallMinutes * 1.5) + 10)` → `ceil(40*1.5)+10 = 70` minutes for every shard, confirmed exactly by the observed ≈70.3-minute cancellation duration (the extra ~0.3 min is the `timeout -k 30s` grace period before `SIGKILL`).
3. **The real population is sharply bimodal, and the planner cannot see this in advance.** 18 ids finish in 1-55 minutes; the other 58 — which include the specific ids this confirmation exists to test — exceed 70 minutes with no internal completion.
4. **Why they exceed 70 minutes now, when they didn't need to before:** the sweep is invoked with `node_budget_advisory_only=true` (removing the hard node-count stop `-001` diagnosed as confounding) and **no** `--strict-total-work-budget` flag (`strict=()`, false — the workflow's own documented default). Per the workflow's own input description: *"additive fallback/retry tiers can spend several times this much real work beyond it once the main ladder is exhausted (measured 1.5x-467x on a sample)."* Without the node-count stop and without a strict work cap, these ids' searches are free to run past their nominal `work_budget` (67,000,000 — `node_budget * 1.34`) for as long as the additive tiers keep finding reasons to continue, bounded only by the outer OS-level `timeout 70m` wrapper — which kills the process with `SIGKILL` before it ever reaches a structured stopping point, so **nothing is written**, not even a partial/timed-out status.
5. **Why this specific mix has never been reachable in this line's five attempts:** `-001` through `-003` were confounded by the (now-removed) hard node-budget stop, which artificially truncated these same ids' search *before* 70 minutes, so they never previously ran long enough to expose this specific timeout interaction. Removing that confound (correctly, to get a valid comparison) unmasked a second, previously-invisible problem: these ids' real unconfounded search time is apparently long enough that non-strict additive-tier overrun regularly exceeds even a generous-looking 70-minute ceiling.

## What this does not establish

- Does not establish that the repriced fraction has no effect, or any effect — no informative id from either arm was captured.
- Does not establish exactly how long these 58 ids' searches actually need — only that it is reliably more than ≈70 minutes; the true requirement could be anywhere from 71 minutes to several hours given the documented 1.5x-467x additive-tier overrun range.
- Does not evaluate whether enabling `--strict-total-work-budget` for a retry is scientifically safe — the workflow's own input documentation explicitly warns this "is not a solve-set-preserving substitution... without separate parity evidence," i.e. it would itself need validation before being trusted as a stand-in for normal (non-strict) search behavior.

## Recommended next step (decision required, not executed here)

Two paths, each with a real tradeoff, presented rather than chosen unilaterally given the GHA-compute-cost and scientific-validity implications:

1. **Raise `target_wall_minutes` substantially** (e.g. to 120-240) and redispatch as-is. Safe in that it doesn't change search semantics — the 18 easy ids simply finish early as before, costing nothing extra. Risky in that the true requirement is unknown and could still exceed a much larger guess, given the documented 467x worst-case overrun factor; a 6th attempt could still come back incomplete.
2. **Enable `--strict-total-work-budget`** for a dedicated parity check first (confirm it doesn't change the solve-set on a sample where both strict and non-strict results are already known), then use strict mode for the confirmation itself. This bounds wall time reliably and would resolve the timeout problem structurally rather than by guessing at a bigger number, at the cost of a separate validation step before it can be trusted.

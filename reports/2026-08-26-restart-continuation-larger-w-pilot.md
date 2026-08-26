# Restart-vs-continuation development pilot: larger `W` on the same near-miss stratum

> **Status:** active
> **Last evidence:** 2026-08-26 — design frozen and prespecified below; the run itself has been dispatched but not yet completed as of this writing
> **Decision:** pending the run's result; no claim made yet
> **Remaining gate:** run the frozen comparison below and report the outcome per the success/stop gates
> **Evidence role:** discovery (development pilot, not confirmation)
> **Selection:** prespecified before execution; frozen at commit `ca3f18af1d2d2e8e9ba6e5b8e90e38fff131b1b5`

## Motivation

[`2026-08-26-restart-vs-continuation-near-miss-development-pilot-corrected.md`](2026-08-26-restart-vs-continuation-near-miss-development-pilot-corrected.md) found that on the 20-level census-unsolved (`bestBadness<=6`) near-miss residual stratum, at `W=16,000,000` canonical work units, continuation and both tested restart splits (0.5, 0.8) reach essentially the same best-badness plateau (17/20 and 19/20 exact ties respectively) and solve 0/20 in every arm. That report's own disposition named the next informative move explicitly: not another restart-schedule variant on the same budget, but either (a) a materially larger `W` to distinguish a budget ceiling from a genuine representation limit, or (b) the learned-failure/search-quality line of work. This pilot takes option (a), since it is the cheaper and more directly falsifying of the two, and a positive result here would also inform whether (b) is worth pursuing next.

## Frozen design (prespecified before running)

- **Population:** identical 20-level near-miss residual stratum as the prior pilot — census-unsolved (`bestBadness<=6`), `--sample-every=1 --limit=20`, from `reports/stress/benchmark-latest-random.json` / `data/stress/stress-levels-random.json`. Not re-selected or re-filtered.
- **Comparator:** identical to the prior pilot's primary form — continuation (one `repairSearchFromGate` call at seed 0, full `W`) vs. restart-0.5 (seed 0 to `W/2`, then on failure fresh seed 1 to the remainder). The 0.8 split is not rerun here; this pilot varies only `W`, not the schedule, per the prior report's own instruction against sweeping further schedule variants on an already-flat budget.
- **Independent variable:** `W = 64,000,000` (4x the prior pilot's 16,000,000). Rationale for 4x rather than a smaller/larger multiple: production's single late-probe reserve (`REPAIR_LATE_PROBE_NODE_BUDGET`) is 5,000,000 nodes, so 16,000,000 was already ~3x that per seed; 64,000,000 is a full order of magnitude above the production per-reserve scale, large enough to plausibly move a genuine budget ceiling while remaining tractable to run locally (the 16M baseline took several minutes per arm; 64M is expected to take roughly 4x that, tens of minutes total, not hours).
- **Tool:** `scripts/stress/restart-continuation-population-pilot.mjs`, same script, no code changes.
- **Command (exact, run once):**
  ```bash
  node scripts/run-bundled.mjs scripts/stress/restart-continuation-population-pilot.mjs -- \
    --max-badness=6 --sample-every=1 --limit=20 --work-budget=64000000 --restart-split=0.5 \
    --out=tmp/restart-continuation-pilot-badness6-w64m-split50.json
  ```

## Success/stop gates (fixed before running)

1. **If either arm solves any of the 20 levels** (0/20 at W=16M in every arm) — that alone confirms `W=16,000,000` was below this stratum's true solvability ceiling for at least some levels, i.e. a budget ceiling was part of the story, not (or not only) a representation limit.
2. **If best-badness improves materially** (not just ties, as at W=16M) for a meaningful fraction of the 20 levels in the continuation arm relative to the already-published `censusBestBadness`/W=16M figures — same conclusion as (1), softer form.
3. **If both (1) and (2) are negative** — badness stays flat at the same values as W=16M for essentially all 20 levels, 0/20 solved — this is stronger evidence (now at two budget points, 4x apart) for a genuine search-quality/representation ceiling on this stratum, not a budget question. In that case the recommended next move per the prior report is the learned-failure/search-quality diagnosis line of work, not a further budget increase on this same stratum.
4. **Restart-vs-continuation delta at the larger `W`:** report mean/median delta and win/tie/loss counts exactly as the prior report did, regardless of (1)-(3)'s outcome — this remains a valid data point on the restart-schedule question even if the plateau turns out to be representation-bound.

No claim of promotion or closure follows from this pilot alone regardless of outcome; per the operating model, a single development pilot nominates further evidence, it does not promote or close by itself.

## Result

_(to be filled in after the run completes)_

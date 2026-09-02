# `dfs|score=finishFirst` suppression, retested on a population where its cost concentrates

> **Status:** active
> **Last evidence:** 2026-09-02 — development A/B dispatched, population selected as described below
> **Decision:** pending — this report is prespecified before either arm's outcome is known
> **Remaining gate:** both dispatched runs must complete and be evaluated against the frozen zero-loss/gain-or-≥10%-work acceptance rule
> **Evidence role:** development (population change + re-test of an already-designed candidate) — prespecified before either arm's outcome is known
> **Selection:** candidate unchanged from the prior closed-negative report (not re-selected); population chosen by a fixed, mechanical rule from historical per-level stage-reach data (see below), sampled with a fixed seed before either arm ran

## Why this experiment

[`2026-09-02-finishfirst-dfs-suppression-development-ab.md`](2026-09-02-finishfirst-dfs-suppression-development-ab.md) closed `PROFILE_finishFirst` suppression negative on the EW1 60-level sample, and — combined with the two closed candidates before it — closed the entire "materially larger footprint on the EW1 sample" path for gate-sequence step (C). That report's own disposition named the remaining option explicitly: **evaluate on a population where these actions' corpus-wide cost is actually concentrated**, since the EW1 60-level sample was built for equal-work pricing purposes, not to contain any particular late-retry action's real workload.

This report builds that population and reuses the same candidate (`PROFILE_finishFirst`) rather than picking a new one, so the only variable that changes from the prior closed test is the population — isolating exactly the question the prior report's disposition raised.

## Building the concentrated population

The join (`reports/stress/capability-runs/33588487486/equal-work-production-reach.md`) already showed `dfs|score=finishFirst|bias=none`'s corpus-wide `workSpent` (279M) is dominated by one stage: `guidance-goal-distance-retry` alone accounts for 257M of the 279M total (92%) per the per-stage breakdown in `equal-work-production-reach.json`. That same run's lifecycle-telemetry artifacts (`reports/stress/capability-runs/33588487486/lifecycle-failure-map-corpus{1,2}.json`) record, per level, which named stages (`reachedTechniques`) that level's solve actually reached at the exact same production envelope (`node_budget=50,000,000`, `strict_total_work_budget` via `solver-stress-refresh.yml`'s own `lifecycle_telemetry=true` dispatch).

Filtering both corpora for `reachedTechniques` containing `guidance-goal-distance-retry` gives **771 levels** (4 corpus1, 767 corpus2) — by construction, the exact population where this stage (and therefore the bulk of `finishFirst`'s real cost) is actually exercised at production's own envelope. 729/771 end `node-budget-reached` (exhaust the full budget without solving) and 42/771 `success` (solved, via some other technique before or after this stage).

## Sampling

Drew a fixed-seed-60 sample from the 771-level population using this codebase's standard FNV-1a → mulberry32 → Fisher-Yates sampling convention (same as `scripts/stress/benchmark.mjs` / `select-early-repair-search-adaptive-sample.mjs`), seed `guidance-goal-distance-retry-repricing-sample-2026-09-02`, applied to the population sorted by id first for determinism. All 60 landed in corpus2 (corpus1 contributed only 4/771 candidates, so a uniform 60-of-771 draw excluding it by chance is expected, not a selection choice).

Sampled ids (all `data/stress/stress-levels-random.json`):
```
R00507,R00555,R00632,R00923,R01254,R01477,R01767,R02027,R02057,R02083,R02107,R02178,R02215,R02237,R02270,R02272,R02317,R02324,R02336,R02346,R02347,R02365,R02369,R02431,R02448,R02456,R02550,R02551,R02597,R02664,R02697,R02728,R02744,R02802,R02864,R02877,R02892,R02918,R02920,R02956,R02996,R03005,R03013,R03024,R03041,R03086,R03103,R03123,R03129,R03152,R03169,R03211,R03221,R03228,R03234,R03318,R03328,R03331,R03337,R03351
```

## Protocol

1. **Envelope:** `strictTotalWorkBudget: true`, `node_budget=50,000,000` per level (`work=67,000,000` via the workflow's own `*134/100` conversion) — the same envelope the historical join's own `solver-stress-refresh.yml` dispatch used to measure this population's stage reach, not the smaller 10M EW1-comparability figure the prior three candidates used. Using a smaller envelope here would risk many sampled levels no longer reaching `guidance-goal-distance-retry` at all, defeating the point of this population.
2. **Candidate:** unchanged from the prior closed report — control = production defaults; treatment = control + `--disable-flags=PROFILE_finishFirst`.
3. **Development population:** the 60-level sample above. This is development evidence only.
4. **Confirmation population:** deferred — only run if this development A/B passes.
5. **Frozen acceptance rule:** zero solve losses, plus either a solve gain or ≥10% lower aggregate `workSpent`, decided on the aggregate verdict first — same rule every candidate in this line has been held to.
6. **Rare-capability guardrail:** cross-check any changed level against the 2026-09-01 technique-niches singleton/doubleton list before concluding no capability was lost.
7. **Fresh control required:** dispatching both arms fresh at current `main` head, not reusing any prior control, since this is a different population and envelope from every prior A/B in this line.
8. **Reporting:** gains/losses by level ID, aggregate `workSpent` delta, wall cost, actions touched.

## Commands (as dispatched)

Dispatched via `mcp__github__actions_run_trigger` (`run_workflow`, `ref=main`), `corpus=data/stress/stress-levels-random.json`, `node_budget=50000000`, `strict_total_work_budget=true`, `target_wall_minutes=30` (raised from the default 20 as a safety margin — this population and envelope are both harder/larger than any prior dispatch in this line, and the ad-hoc id list has no standing per-level wall-time EMA for the shard planner to draw on):

- **Control** (`disable_flags=""`): run [`33605009054`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33605009054)
- **Treatment** (`disable_flags=PROFILE_finishFirst`): run [`33605017539`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33605017539)

## Result

*(pending — filled in once both runs complete)*

## Disposition

*(pending)*

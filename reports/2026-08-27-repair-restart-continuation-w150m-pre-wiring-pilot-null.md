# Repair restart-vs-continuation pre-wiring pilot at W=150,000,000: clean null

> **Status:** concluded-negative
> **Last evidence:** 2026-08-27 — full 36-level `bestBadness` 7-9 population, `W=150,000,000`, GitHub Actions run [33124980404](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33124980404)
> **Decision:** the restart-vs-continuation advantage confirmed at `W=64,000,000` (pooled 8/43 solved vs. 3/43, 5 restart-only gains, 0 losses) **does not hold at `W=150,000,000`**. On the full prespecified 36-level population: continuation solved 9/36, restart solved 9/36, **0 restart-only gains, 0 restart-only losses** — an exact tie, not a shrunken-but-still-positive effect. This is the pre-registered "effect absent" stop gate from [`2026-08-27-repair-restart-continuation-production-candidate-design.md`](2026-08-27-repair-restart-continuation-production-candidate-design.md), triggered cleanly. Do not wire `STRATEGY_REPAIR_LATE_PROBE_RESTART_SPLIT` as designed.
> **Remaining gate:** none for wiring the 2-way split at this population/budget — that path is closed. If restart-vs-continuation is revisited, the open question is now the effect's shape versus `W` (present at 64M, absent at 150M), not a wiring design.
> **Evidence role:** confirmation (the population, `W`, split, and both stop gates were fixed in the design report *before* this population's outcomes were inspected — see that report's "Pilot dispatched" addendum, committed and merged before dispatch)
> **Selection:** prespecified — population is the full `bestBadness` 7-9 band (36 of 36 candidates, no sub-sampling), not a subset chosen after seeing results.

## Question

The production candidate design report asked one specific, pre-registered question: does the confirmed development-stage restart-vs-continuation advantage (restart beats continuation at `W=64,000,000` on a near-miss residual population) still hold at `W=150,000,000` — the work-unit-equivalent of the current production repair-late-probe + multi-seed-retry tier family's real worst-case budget? That report set two outcomes in advance:

1. Effect present → proceed to design/implement `STRATEGY_REPAIR_LATE_PROBE_RESTART_SPLIT`.
2. Effect absent or reversed → a genuinely new finding (the advantage does not simply keep growing with `W`), blocking the wiring design.

## Method

Population: every level with `bestBadness` in `[7,9]` and a genuine primary repair-probe attempt in `reports/stress/benchmark-latest-random.json` (36 candidates total — the `bestBadness<=6` stratum used by the earlier `W=16M`/`W=64M` pilots is fully spent, so this pilot used the next disclosed disjoint band per the design report). Same harness (`runRepairRestartVsContinuation`), same primary comparison (continuation to `W` vs. seed 0 to `W/2` then, on failure, fresh seed 1 to the remainder), same 0.5 split as every prior pilot in this line.

`W=150,000,000`, matching the design report's own measured production-equivalent estimate (~140-160M).

Execution: sharded across 18 parallel GitHub Actions jobs (`repair-restart-continuation-pilot-one-shot.yml`, 2 levels/shard) rather than a serial local run — individual levels at this `W` were observed taking anywhere from ~1 to ~9 minutes of wall time, per-arm, making a serial sweep of 36 levels impractical. A first dispatch (run `33123273899`) had a workflow bug (missing `--sample-every=1`, silently defaulting to the script's own stride of 29) that made most shards cover only 1 of their intended 2 levels — that run's partial 22/36 result was discarded, not used for any claim. Fixed and redispatched as run `33124980404`, which covered the complete, correct 36/36 population.

## Result

| | continuation | restart |
|---|---:|---:|
| solved | 9/36 (25.0%) | 9/36 (25.0%) |
| restart-only gains | — | **0** |
| restart-only losses | — | **0** |

Both arms solved the identical 9 levels; the other 27 failed on both arms. Representative rows (from the shard logs):

| level | census badness | continuation solved | continuation bestBadness | continuation `workSpent` | restart solved | restart bestBadness | restart `workSpent` | restart seeds |
|---|---:|---|---:|---:|---|---:|---:|---|
| R00561 | 8 | false | 8 | 150,000,333 | false | 8 | 150,003,272 | [0,1] |
| R01124 | 7 | false | 6 | 150,000,068 | false | 6 | 150,000,074 | [0,1] |
| R01158 | 9 | false | 8 | 150,000,027 | false | 6 | 150,000,031 | [0,1] |
| R01190 | 7 | false | 5 | 150,000,065 | false | 5 | 150,000,081 | [0,1] |
| R02038 | 9 | false | 9 | 150,002,533 | false | 9 | 150,001,266 | [0,1] |
| R02081 | 8 | **true** | — | 18,839,876 | **true** | — | 18,839,876 | [0] |

(`R02081`: seed 0 alone solved well under `W/2`, so both arms are identical by construction — the same pattern the `W=16M`/`W=64M` pilots' trivially-easy rows showed.) Full 36-row detail is in the run's `repair-restart-continuation-pilot-combined` artifact.

## Interpretation

This is not a weaker version of the `W=64,000,000` result — it is a complete disappearance of the effect on a full, unfiltered, prespecified population, with the exact same solved set on both arms. Compare the three data points now available for this exact comparison (2-seed 50/50 restart vs. plain continuation, same harness, same split, different `W` and population):

| `W` | Population | Continuation solved | Restart solved | Restart-only gains/losses |
|---:|---|---|---|---|
| 16,000,000 | `bestBadness<=6` (20) | 0/20 | 0/20 | 0/0 |
| 64,000,000 | `bestBadness<=6` (43, pooled) | 3/43 (7.0%) | 8/43 (18.6%) | 5/0 |
| 150,000,000 | `bestBadness` 7-9 (36) | 9/36 (25.0%) | 9/36 (25.0%) | 0/0 |

The `W=64,000,000` effect is real and was independently replicated on a disjoint sample (see the confirmation report) — this is not being retracted. But the pattern across all three points is **not monotonic**: no effect at the lowest `W`, a clear effect at an intermediate `W`, and no effect again at a much larger `W`. A restart mechanism's seed-diversity advantage is plausibly strongest in an intermediate budget regime — large enough that a single continuation trajectory's early commitments start to matter, but not so large that either arm has effectively enough work to explore the relevant part of the search space regardless of seed. At `W=150,000,000`, both arms may simply be solving everything they are ever going to solve at that budget, making the seed-diversity question moot for this specific population/budget combination.

The `bestBadness` 7-9 population is also a materially harder/different band than the `bestBadness<=6` stratum the positive result came from — this pilot cannot cleanly separate "the effect vanishes at large `W`" from "the effect was specific to the near-miss (`<=6`) band and does not transfer to a harder band," since both variables changed at once (this pilot did not have a choice: the `<=6` band was already fully spent). Either explanation independently blocks the currently-designed production candidate, but they imply different follow-ups if restart-vs-continuation is revisited later (re-test a harder band at `W=64,000,000`, versus re-test the `<=6` band at an intermediate `W` between 64M and 150M).

## What this does not establish

- **Not evidence against the `W=64,000,000` result.** That finding was independently replicated on a disjoint sample and stands on its own.
- **Not a full characterization of the effect's shape versus `W`.** Only three `W` values have ever been tested, on two different population bands. A real dose-response curve would need more points, ideally holding the population band fixed.
- **Not evidence that production's current 8-way seed fan-out is correct either.** This pilot only tested continuation-of-1 vs. restart-of-2; it says nothing about the 8-way shape specifically.

## Disposition

Per the design report's own pre-registered stop gate: **do not implement `STRATEGY_REPAIR_LATE_PROBE_RESTART_SPLIT`** as designed. Delete `repair-restart-continuation-pilot-one-shot.yml` per this repo's one-shot-workflow retention rule (its answer is now recorded here); the underlying `restart-continuation-population-pilot.mjs` script and its GHA-sharding capability (`--count-only`, `--min-badness`, `--sample-every`) stay, since the same sharded-dispatch need is likely to recur for any future `W`-scale check on this research line. Update `docs/solver-optimization-current-queue.md` item #0 to reflect this closed gate.

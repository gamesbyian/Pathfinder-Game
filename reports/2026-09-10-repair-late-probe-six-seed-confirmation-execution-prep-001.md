# Repair late-probe 7 -> 6 seed confirmation execution prep 001

> **Status:** active
> **Last evidence:** 2026-09-10 — audited the current seed-budget wiring and the nine target-stage reaches in the 2026-09-04 discovery population; added an outcome-blind 150-level confirmation materializer.
> **Decision:** freeze a fresh uniform 150-level Corpus-2 draw now; use a provisional ~900M strict whole-solve `workSpent` envelope, calibrated on the already-exposed historical worst-case reach (`R02986`) after the preceding 2A closeout settles; do not dispatch until the seed-count override moves reserve accounting and actual salt execution in lockstep and emits auditable participation/provenance.
> **Remaining gate:** run the materializer and commit its three outputs; land/test the bounded 7-versus-6 seed-count override and required telemetry; after the goal-attraction fresh-pool closeout settles production semantics, verify the ~900M envelope on `R02986` (or raise it before either arm if seed 7 cannot really participate), then dispatch the paired A/B.

## Scope

This is execution preparation for `reports/2026-09-05-repair-late-probe-six-seed-confirmation-preflight.md`. It does not change the candidate, decision rule, production seed list, or queue priority.

No solver experiment was dispatched for this preparation.

## Frozen population design

The new one-shot materializer is:

`scripts/stress/materialize-repair-late-probe-six-seed-confirmation-001.mjs`

It draws 150 Corpus-2 levels uniformly with the repository's existing deterministic sampler and seed:

`repair-late-probe-six-seed-confirmation-001`

Selection is deliberately **not** conditioned on current solve status, target-stage reach, hints, capability labels, topology, or any treatment outcome. The only exclusions are fixed before the draw:

1. `data/stress/static-portfolio-entrypoint-production-ab-001-population.json` — the 40-level population whose 9 target-stage reaches nominated the 7 -> 6 candidate;
2. `data/stress/goal-attraction-fresh-work-pool-confirmation-002-ids.txt` — the parallel 2A closeout population, excluded so inspection/tuning during that experiment cannot leak into this confirmation.

This uses fresh units without trying to reserve every previously-used Corpus-2 level in the repository. The exclusion boundary is about candidate-development and contemporaneous cross-closeout contamination, not a claim that a level becomes unusable forever after appearing in unrelated research.

The script writes:

- `data/stress/repair-late-probe-six-seed-confirmation-001-population.json`;
- `data/stress/repair-late-probe-six-seed-confirmation-001-ids.txt`;
- `data/stress/repair-late-probe-six-seed-confirmation-001-selection-manifest.json`.

The manifest records the corpus/source hashes, both exclusion sources and hashes, deterministic seed, eligible count, output hashes, and zero-overlap/uniqueness assertions. Commit all three outputs before either arm is dispatched.

## Participation floor

The discovery population reached `late-repair-multiseed-retry` on 9/40 levels (22.5%). A 150-level uniform draw therefore has an historical expectation of about 34 reaches. This is planning evidence only; portal restoration and the preceding 2A closeout can change the actual rate.

Prespecify the confirmation as informative only if the target stage does real work on at least **15 / 150 levels (10%)** in each arm. Under the old 9/40 reach rate, fewer than 15 reaches would be extremely unlikely; more importantly, 15 is large enough that a nominal one-level activation cannot masquerade as a repricing confirmation. If the current solver misses this participation floor, classify the run as non-informative rather than weakening the gate after seeing treatment outcomes.

## Work-envelope audit

The 2026-09-04 discovery run used a nominal `workBudget=67,000,000` under additive semantics. That number is not remotely a safe strict ceiling for this test: the nine levels that actually reached all seven target-stage seed attempts ended with the following whole-solve `workSpent` values:

| level | whole-solve `workSpent` |
|---|---:|
| `R01000` | 309,516,459 |
| `R01428` | 480,901,690 |
| `R02818` | 486,081,659 |
| `R02486` | 537,247,678 |
| `R00046` | 551,715,146 |
| `R02334` | 571,140,758 |
| `R03093` | 605,078,613 |
| `R02839` | 729,595,428 |
| `R02986` | 842,267,705 |

Median = 551.7M; historical p90 ~= 752.1M; max = 842.3M.

The current production constant remains `REPAIR_LATE_PROBE_NODE_BUDGET = 5,000,000` per seed and the production salt list remains `[1,2,3,4,5,6,7]`. The target tier's node reserve is currently computed as per-seed budget times the full salt-list length.

A **~900M strict whole-solve work ceiling** is therefore the smallest round first candidate with modest headroom over every historical target-stage reach, rather than a guessed multiple of the old 67M nominal allocation. With the maintained targeted-sweep workflow's current `work = node_budget * 1.34` derivation, `node_budget=675000000` plus `node_budget_advisory_only=true` yields a strict derived work ceiling of **904,500,000** while preventing the raw node ceiling from independently censoring the late-stage comparison.

Do not freeze that scalar solely from old evidence. Once the preceding goal-attraction closeout has a final production disposition, run the exact intended control configuration on `R02986`, which is already development-exposed and was the historical worst-case target-stage reach. Require:

- target stage reached;
- all seven control salts actually instantiated with nonzero work;
- no deadline truncation;
- no earlier strict-work stop preventing seed 7 from participating;
- resolved config/provenance matches the intended control.

If 904.5M fails that calibration, increase the envelope **before either confirmation arm runs**. Do not tune it from confirmation outcomes. If it passes, freeze 904.5M for both arms.

## Required implementation lockstep

Current code has exactly the split the original preflight warned about:

- `computeStageBudgetPlan()` sizes `repairLateProbeMultiSeedRetryNodeReserve` as `repairLateProbeNodeBudget * REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS.length`;
- orchestration independently iterates the full `REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS` array.

The experiment-only override must therefore resolve one bounded integer seed count and feed **both** sites. It must not merely slice the loop or merely shrink the reserve.

Recommended canonical field/flag naming:

- `SolveOpts.repairLateProbeMultiSeedRetrySeedCountOverride`;
- CLI `--repair-late-probe-multi-seed-retry-seed-count`;
- workflow input `repair_late_probe_multi_seed_retry_seed_count`.

Accepted values: integers `0..7`. Omitted means the current production list length. `6` means exactly salts `[1,2,3,4,5,6]`, with no compensation to their individual 5M-node allocations. Invalid/non-integer CLI values should fail before solving rather than silently coerce.

Before population dispatch, prove at minimum:

1. omitted/default behavior is unchanged;
2. explicit `7` is behavior/budget equivalent to omitted production behavior;
3. explicit `6` produces six per-seed reserves and executes exactly salts 1-6;
4. the resolved count is present in effective config/provenance;
5. per-seed attempt records are sufficient to identify seed 7 and its direct `workSpent` contribution;
6. the maintained workflow passes the override identically through canary, first-pass shards, and timeout-recovery shards.

The last item matters because the workflow deliberately duplicates config construction across execution paths; adding an input to only the first-pass command would make recovery rows semantically incomparable.

## Proposed dispatch contract after the gates pass

Use the committed 150-id file and the maintained `solver-level-blind-targeted-sweep.yml` workflow. Both arms must use the same solver SHA, corpus, IDs, ~904.5M strict-work envelope, wall-safety deadline, sharding policy, and telemetry settings.

Control: seven salts. Treatment: six salts. The only behavioral config difference allowed by the effective-config agreement check is the resolved seed count.

Use:

- `strict_total_work_budget=true`;
- `node_budget_advisory_only=true`;
- provisional `node_budget=675000000` only after the calibration above passes, producing 904.5M strict work;
- `required_participation_stage=late-repair-multiseed-retry`;
- `min_participating_levels=15`;
- `min_participation_rate=0.10`;
- attempt/lifecycle telemetry sufficient for direct per-seed work and stage participation accounting;
- distinct concurrency suffixes for the paired arms if run concurrently.

Do not interpret aggregate work saving until population completeness, config agreement, target-stage participation, seed-7 exposure, and asymmetric truncation checks all pass.

## What remains deliberately unfrozen

The population draw rule and participation gate are now prespecified. The production policy is unchanged. The one scalar intentionally left provisional is the strict work envelope because 2A.1 is still allowed to change the production ladder immediately upstream of this test.

That is not a reason to delay the cohort or implementation work. It is a reason to make the final envelope calibration the last cheap pre-dispatch gate after the upstream policy settles.

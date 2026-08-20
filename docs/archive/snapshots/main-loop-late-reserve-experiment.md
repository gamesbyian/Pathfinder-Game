# Main-loop late-reserve experiment

Status: **full-population level-blind A/B run 2026-08-12, found CONFOUNDED (unrelated ablation-wiring interaction), promoted anyway pending a direct full-corpus sweep.** Mechanism pilot complete. See `reports/2026-08-12-main-loop-late-reserve-population-ab.md` and `docs/solver-opt-in-experiment-ledger.md` for the confound mechanism and the decision to keep the promotion while pursuing a direct sweep instead of a matched-control re-run.

This experiment tests one narrow hypothesis: some ordinary attempt configs that are historically capable of solving a level receive zero work because earlier configs consume the shared main-loop envelope. The treatment reserves a small fraction of that same envelope for the final ordinary configs. It does **not** reorder configs and must not increase total canonical work.

Capability contract: [`solver-level-blindness.md`](solver-level-blindness.md). Historical winning attempts were useful for identifying starvation candidates, but the acceptance A/B itself must solve every level from raw level data with no exact-level history.

## Mechanism evidence already complete

The profile-order starvation census found 34/975 historically unsolved Corpus-2 levels with a historical budget-fitting config that received zero nodes in the main loop:

- 14 hard deterministic DFS/beam matches;
- 20 softer repair/seed matches.

The mechanism pilot verified that reserve-not-reorder activates the intended late configs and recovered 1/14 hard historical matches at the tested arm. This is evidence that the mechanism fires, not a promotion result.

## Frozen population experiment

Workflow: `.github/workflows/solver-stress-refresh.yml`.

The workflow is now structurally level-blind and pins `github.sha`. It has no `prime_winner` input and does not pass a solver baseline.

Population:

- all 1700 Corpus-2 levels;
- all 102 Corpus-1 levels as regression/control context.

Common inputs for every arm:

```text
corpus2_budget_ms=86400000
corpus2_node_budget=36000000
corpus2_workers=1
disable_flags=
main_loop_late_reserve_config_count=4
persist_hints=false
corpus1_budget_ms=86400000
corpus1_node_budget=50000000
corpus1_workers=1
deterministic=true
```

Control:

```text
enable_flags=
main_loop_late_reserve_fraction=
```

Treatment arms:

```text
enable_flags=STRATEGY_MAIN_LOOP_LATE_RESERVE
main_loop_late_reserve_fraction=0.05
```

then `0.10`, then `0.15`.

The final four ordinary configs share the reserved fraction using the implementation's existing cumulative division. Admissible-order reserve remains separate and unchanged.

## Preflight / acceptance

Use schema-v2 manifests. For `solver-stress-refresh`, the complete workflow input set is part of experiment identity. The only allowed workflow-input differences are:

- `enable_flags`;
- `main_loop_late_reserve_fraction`.

`main_loop_late_reserve_config_count=4` must be explicitly identical in all arms.

Before accepting a result:

- every arm must complete 1700/1700 C2 and 102/102 C1;
- report `commitSha` must match between arms and the intended dispatch SHA;
- wall deadline must not bind;
- canonical work/node ceilings must match;
- no exact-level historical input may have entered the solve;
- compare gains/losses, not just net solved count;
- compare aggregate canonical work as well as solves.

`persist_hints=false` is required for the matched A/B so an earlier arm cannot mutate the branch before later arms are dispatched. Saved solutions can be persisted after the experiment from accepted artifacts if desired; output persistence is not part of the treatment.

## Interpretation

- **Positive full-population result:** participation floors/starvation are a real general lever. Consider promotion or a refined online allocator.
- **Target recoveries but negative population result:** static reserve is too blunt. The more promising direction becomes online failure-conditioned allocation using evidence generated during the current solve.
- **Null:** close `STRATEGY_MAIN_LOOP_LATE_RESERVE` in its current form; do not keep buying population runs for different tiny reserve fractions without new mechanism evidence.

Do not compare the acceptance result to the historical 725 Corpus-2 re-verification count. That figure used exact-level `--prime-winner` replay. The acceptance comparison is fresh control versus treatment under the same level-blind workflow.

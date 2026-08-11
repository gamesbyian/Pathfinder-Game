# Main-loop late-suffix reserve experiment

> **Preflight note (2026-08-11):** generate schema-v2 control/treatment manifests with
> `npm run solver:experiment-preflight` before dispatching this frozen A/B. Record the actual GitHub
> workflow inputs as well as solver flags. For each fraction, compare with target
> `STRATEGY_MAIN_LOOP_LATE_RESERVE` and explicitly allow only `enable_flags` and
> `main_loop_late_reserve_fraction` to differ. `main_loop_late_reserve_config_count=4`, workers,
> prime-winner state, budgets, deadlines, deterministic mode, and every other dispatch setting must
> match. This does not change the frozen protocol or intermingle it with the neighbor-budget experiment.

**Status:** opt-in treatment implemented; 14-level mechanism pilot completed; full-population
matched-budget A/B not yet run. See the
[`mechanism pilot`](../reports/2026-08-10-main-loop-late-reserve-mechanism-pilot.md).

## Question and frozen treatment

Does reserving part of the ordinary main-loop node envelope for its final configurations recover
deterministic budget-fitting solves without losing more existing solves elsewhere?

The first treatment is deliberately simple and fixed before results are viewed:

- preserve the existing attempt and gate order;
- select the final **4 ordinary configurations** (repair and admissible-order configs are excluded);
- withhold **5%, 10%, or 15%** of the ordinary main-loop node envelope from the repair probe and
  earlier ordinary configs;
- divide the slice cumulatively across every selected config/gate pair, so an earlier beneficiary
  cannot consume the entire reserve and starve the rest;
- after the suffix has run, let later repair/diversity tiers use any remainder;
- retain the independent admissible-order reserve and the same total node/work ceilings.

The experiment is default-off behind `STRATEGY_MAIN_LOOP_LATE_RESERVE`. It must not use stored
winning configurations to select beneficiaries. The 14 historically matched deterministic
DFS/beam cases
are a mechanism-check cohort, not a routing table and not the acceptance population.

## Arms

Run every arm from the same commit, without `--prime-winner` or `--baseline-budget`:

```bash
COMMON="--corpus=data/stress/stress-levels-random.json --scheduler-mode=legacy \
  --budget-ms=86400000 --node-budget=36000000 --work-budget=48240000 --workers=1"

node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- $COMMON \
  --out=reports/stress/main-loop-reserve-control.json

for FRACTION in 0.05 0.10 0.15; do
  node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- $COMMON \
    --enable-flags=STRATEGY_MAIN_LOOP_LATE_RESERVE \
    --main-loop-late-reserve-fraction=$FRACTION \
    --main-loop-late-reserve-config-count=4 \
    --out=reports/stress/main-loop-reserve-f${FRACTION}.json
done
```

Use one worker for the frozen reference protocol. Parallel sharding is acceptable only if every
arm uses the identical shard layout and combined reports assert complete coverage before analysis.
The sweep checkpoint signature records commit, corpus digest, and sorted invocation arguments.

When this protocol is dispatched through `solver-stress-refresh.yml`, set the inert control's
`main_loop_late_reserve_config_count` to `4` as well. That makes the declared treatment dimensions
unambiguous: the treatment changes only the feature enablement and the tested fraction. Generate a
fresh manifest pair for **each** of 0.05, 0.10, and 0.15 rather than comparing all treatments to an
under-specified generic manifest. After dispatch, verify the workflow run's actual inputs against the
manifest before accepting the arm.

## Required analysis

For each treatment versus the fresh control, record:

1. full-corpus solve gains, losses, and net delta;
2. recovery within the 14 deterministic DFS/beam cohort, separately from the 20 repair-only cases;
3. referee validity for every gained solution;
4. `workSpent`, `nodesExpanded`, deadline truncations, and attempt errors;
5. the count of attempts marked `mainLoopLateReserve`, including zero-node beneficiaries;
6. whether losses cluster by prior winning configuration or gate;
7. Corpus-1 results under its routine 50M-node ceiling before promotion.

The treatment is rejected if it recovers members of the 14-level mechanism cohort but has a
non-positive full-population net solve delta, introduces unexplained deterministic losses, exceeds
the unchanged budgets, increases attempt errors, or produces a referee-invalid gain. A small pilot
may validate activation and command plumbing only; it cannot decide promotion.

## Interpretation constraints

- The reserve is zero-sum under a fixed node ceiling; recovered target cases do not by themselves
  establish a net improvement.
- Repair-only matches remain seed-dependent and must not be quoted with DFS/beam confidence.
- This experiment tests allocation, not profile routing. Do not add feature-based beneficiary
  selection or reorder configurations in the same A/B.
- Keep the flag default-off until the complete matched-budget result is recorded and reviewed.

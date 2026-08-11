# Claude remote solver handoff

> **Scope:** remote-only work after the PR #1357 local follow-up. Do not replace these jobs with partial local runs. Use a clean, current remote `main` SHA and record it in every result.

## 0. Freeze identity before dispatch

On clean remote `main`, set `SHA=$(git rev-parse HEAD)` and verify `git status --porcelain` is empty. Generate each arm's manifest immediately before dispatch (never copy a pre-merge manifest), then compare:

```bash
npm run solver:experiment-preflight -- --experiment-id=neighbor-budget-c2-full-$SHA \
  --run-id=neighbor-off-$SHA --corpus=data/stress/stress-levels-random.json --arm=control \
  --flags=PRUNE_MC_NEIGHBOR_BUDGET=false --seeds= --work-budget=48240000 \
  --wall-deadline-ms=86400000 --profile=default --instrumentation=off \
  --output=/tmp/neighbor-off.manifest.json
npm run solver:experiment-preflight -- --experiment-id=neighbor-budget-c2-full-$SHA \
  --run-id=neighbor-on-$SHA --corpus=data/stress/stress-levels-random.json --arm=treatment \
  --flags=PRUNE_MC_NEIGHBOR_BUDGET=true --seeds= --work-budget=48240000 \
  --wall-deadline-ms=86400000 --profile=default --instrumentation=off \
  --output=/tmp/neighbor-on.manifest.json
npm run solver:experiment-preflight -- --compare-control=/tmp/neighbor-off.manifest.json \
  --compare-treatment=/tmp/neighbor-on.manifest.json --target-flag=PRUNE_MC_NEIGHBOR_BUDGET
```

The 48,240,000 manifest work envelope is the workflow's canonical accounting envelope for a 36,000,000 per-level node ceiling. Confirm both manifests contain exactly 1,700 unique IDs in corpus order. Stop if SHA, selection hash, corpus, budgets, deadline, profile, seeds, instrumentation, or any non-target solver flag differs.

## A. Revised neighbor-budget full C2 A/B — run first

Dispatch `.github/workflows/solver-stress-refresh.yml` twice at **the same `$SHA`** with: `corpus2_budget_ms=86400000`, `corpus2_node_budget=36000000`, `corpus2_workers=2`, `deterministic=true`, `persist_hints=false`, `prime_winner=false`, blank `disable_flags`, blank late-reserve inputs, and otherwise identical defaults. Control has blank `enable_flags`; treatment has `enable_flags=PRUNE_MC_NEIGHBOR_BUDGET`. The treatment's intended wiring excludes stochastic repair `takePly` but includes DFS, beam, and deterministic repair sub-search callers.

Accept artifacts only after confirming complete 1,700-level coverage and matching manifests. Report solved counts, gains, losses, net, canonical work/nodes, deadline truncations, attempt errors, full configs, referee validity of gains, and whether the prior repair-churn cohort is recovered. Stop on incomplete coverage, wrong SHA/config, invalid solution, or unexplained budget violation; rerun a fresh pair rather than mixing arms. Record the decision before job D.

## B. Contrastive-prefix CP-SAT labels

After A is recorded (it may run independently only if its input set and interpretation are kept separate), take the 12 `oracle-abstain` rows in `reports/stress/winning-prefix-atlas-pilot-2026-08-11.json` first. Then select a bounded larger set of informative legal same-parent siblings, prioritizing branches at/near the score/width extinction levels in `reports/stress/winning-lineage-same-config-2026-08-11.json`. Send prefix+child cases through the existing CP-SAT/reference scripts and `.github/workflows/cpsat-hint-harvest-sweep.yml` machinery; do not build another oracle.

Persist three distinct outcomes: **live** (continuation demonstrated), **dead** (exhaustive/reference proof), and **timeout/abstain**. Never convert a timeout to dead. Stop expansion if labels remain mostly abstentions or if cases cannot be tied to an exact solver SHA/prefix.

## C. Exact repair retreat / causal window

Use the existing elites/input from `reports/stress/repair-rollback-census-pilot-2026-08-11.json`. For each elite, retreat backward in bounded increments, then refine around the first demonstrated continuation with the existing CP-SAT/reference machinery. Record the latest retreat point with a demonstrated valid continuation, the timeout/abstain boundary, normalized retreat, elite provenance, and exact SHA. This measures the causal window only; do not implement a repair operator. Stop where reference limits make the boundary an abstention rather than guessing.

## D. Main-loop late-reserve full A/B

Run only after A is complete and recorded, unless Actions capacity is demonstrably independent and result directories/manifests cannot be confused. Follow [`main-loop-late-reserve-experiment.md`](main-loop-late-reserve-experiment.md): fresh control plus 0.05/0.10/0.15 treatments, 36M node ceiling, 48.24M work envelope, 86,400,000 ms deadline, deterministic cold mode, one worker (or identical asserted-complete sharding), four suffix configs, no prime winner/baseline budget. Generate and compare a fresh manifest pair for each fraction with target `STRATEGY_MAIN_LOOP_LATE_RESERVE`; fraction/config-count are frozen experiment inputs and must match the intended arm protocol. Stop on incomplete coverage, config drift, invalid gains, attempt errors, or unchanged-budget violations.

## Optional later

A bounded beam→repair receptor counterfactual may follow B/C if their labels clarify what a useful receptor must preserve. Do not dispatch it blindly and do not build live handoff in this sequence.

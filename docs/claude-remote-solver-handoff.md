# Claude remote solver handoff

> **Scope:** remote-only work after PR #1358 and the handoff-hardening follow-up. Do not replace these jobs with partial local runs. Use a clean, current remote `main` SHA and record it in every result.

## 0. Freeze identity and dispatch configuration before decision A/Bs

On clean remote `main`, set `SHA=$(git rev-parse HEAD)` and verify `git status --porcelain` is empty. Experiment-manifest schema v2 records both the solver ablation map and the actual decision-relevant GitHub workflow inputs. Generate manifests immediately before dispatch; never reuse a pre-merge manifest.

For the neighbor-budget experiment, use the same complete workflow-input set in both manifests except `enable_flags`:

```bash
COMMON_INPUTS='corpus2_budget_ms=86400000,corpus2_node_budget=36000000,corpus2_workers=2,disable_flags=,main_loop_late_reserve_fraction=,main_loop_late_reserve_config_count=,prime_winner=false,persist_hints=false,corpus1_budget_ms=86400000,corpus1_node_budget=50000000,corpus1_workers=2,deterministic=true'

npm run solver:experiment-preflight -- --experiment-id=neighbor-budget-c2-full-$SHA \
  --run-id=neighbor-off-$SHA --corpus=data/stress/stress-levels-random.json --arm=control \
  --flags=PRUNE_MC_NEIGHBOR_BUDGET=false --workflow=solver-stress-refresh \
  --workflow-inputs="$COMMON_INPUTS,enable_flags=" --seeds= --work-budget=48240000 \
  --wall-deadline-ms=86400000 --profile=default --instrumentation=off \
  --output=/tmp/neighbor-off.manifest.json

npm run solver:experiment-preflight -- --experiment-id=neighbor-budget-c2-full-$SHA \
  --run-id=neighbor-on-$SHA --corpus=data/stress/stress-levels-random.json --arm=treatment \
  --flags=PRUNE_MC_NEIGHBOR_BUDGET=true --workflow=solver-stress-refresh \
  --workflow-inputs="$COMMON_INPUTS,enable_flags=PRUNE_MC_NEIGHBOR_BUDGET" --seeds= --work-budget=48240000 \
  --wall-deadline-ms=86400000 --profile=default --instrumentation=off \
  --output=/tmp/neighbor-on.manifest.json

npm run solver:experiment-preflight -- --compare-control=/tmp/neighbor-off.manifest.json \
  --compare-treatment=/tmp/neighbor-on.manifest.json --target-flag=PRUNE_MC_NEIGHBOR_BUDGET \
  --allow-workflow-input-differences=enable_flags
```

Using `--workflow=solver-stress-refresh` makes the preflight reject a manifest that omits any dispatch input belonging to that workflow. The 48,240,000 manifest work envelope is the workflow's canonical accounting envelope for a 36,000,000 per-level node ceiling. Confirm both manifests contain exactly 1,700 unique Corpus-2 IDs in corpus order. Before accepting results, inspect each GitHub workflow run's actual dispatch inputs and verify they match its manifest. Stop if SHA, selection hash, corpus, budget, deadline, profile, seeds, instrumentation, or any non-declared workflow/solver setting differs.

## A. Revised neighbor-budget full C2 A/B — run first

Dispatch `.github/workflows/solver-stress-refresh.yml` twice at **the same `$SHA`** with the values recorded above. Control has blank `enable_flags`; treatment has `enable_flags=PRUNE_MC_NEIGHBOR_BUDGET`. The treatment's intended wiring excludes stochastic repair `takePly` but includes DFS, beam, and deterministic repair sub-search callers.

Accept artifacts only after confirming complete 1,700-level coverage, matching manifests, and actual workflow inputs matching those manifests. Report solved counts, gains, losses, net, canonical work/nodes, deadline truncations, attempt errors, full configs, referee validity of gains, and whether the prior repair-churn cohort is recovered. Stop on incomplete coverage, wrong SHA/config, invalid solution, or unexplained budget violation; rerun a fresh pair rather than mixing arms. Record the decision before job D.

## B. Contrastive-prefix CP-SAT labels

Use `.github/workflows/cpsat-explicit-prefix-oracle.yml`, which is the narrow execution seam for exact `{levelId,prefix,child}` questions. It reuses `scripts/stress/cpsat-full-probe.py`; it is **not** a new oracle. Do not use `cpsat-hint-harvest-sweep.yml` for this job because that workflow chooses its own unharvested levels/forced-grid combinations rather than accepting an explicit case list.

First dispatch the workflow with its defaults. `cases_file=reports/stress/winning-prefix-atlas-pilot-2026-08-11.json` and `case_format=atlas-abstain` select exactly the existing 12 `oracle-abstain` rows. The runner appends each row's child to its prefix, passes that explicit prefix to `cpsat-full-probe.py`, referee-checks every SAT witness, and preserves **live**, **dead**, and **timeout/abstain** distinctly.

After those 12 are recorded, prepare a bounded committed generic case file for informative same-parent siblings at/near score/width extinctions. Generic schema:

```json
{
  "schemaVersion": 1,
  "corpus": "data/stress/stress-levels.json",
  "cases": [
    { "id": "example", "levelId": "S00001", "prefix": [65537, 65538], "child": 131074 }
  ]
}
```

Cells may be packed solver keys as above or `[x,y]` coordinate pairs. Dispatch the same workflow with `case_format=cases` and that committed `cases_file`. Do not coerce timeouts, unsupported mechanics, model errors, or referee-rejected SAT witnesses into dead/live evidence. Stop expansion if labels remain mostly abstentions or cases cannot be tied to an exact solver SHA/prefix.

## C. Exact repair retreat / causal window

Reuse the **same explicit-prefix oracle workflow**, not another CP-SAT workflow. Start from the retained elites/input in `reports/stress/repair-rollback-census-pilot-2026-08-11.json`. Prepare bounded generic case files containing selected retreat prefixes, query them through `cpsat-explicit-prefix-oracle.yml`, then refine around the latest demonstrated-live retreat point. A coarse-to-fine/binary strategy is preferred to querying every prefix.

Record the latest retreat with a referee-valid demonstrated continuation, the timeout/abstain boundary, normalized retreat, elite provenance, and exact SHA. This measures the causal window only; do not implement a repair operator. Where reference limits produce abstention, stop rather than guessing.

## D. Main-loop late-reserve full A/B

Run only after A is complete and recorded, unless Actions capacity is demonstrably independent and result directories/manifests cannot be confused. Follow [`main-loop-late-reserve-experiment.md`](main-loop-late-reserve-experiment.md): fresh control plus 0.05/0.10/0.15 treatments, 36M node ceiling, 48.24M work envelope, 86,400,000 ms deadline, deterministic cold mode, one worker, four suffix configs, no prime winner/baseline budget.

For each fraction, generate a fresh schema-v2 control/treatment manifest pair with `--workflow=solver-stress-refresh`. Record the actual workflow inputs including `enable_flags`, `main_loop_late_reserve_fraction`, `main_loop_late_reserve_config_count=4`, `prime_winner=false`, `persist_hints=false`, `deterministic=true`, and worker/budget inputs. Set the inert control's config count to `4` as well, so only `enable_flags` and `main_loop_late_reserve_fraction` are declared treatment dimensions. Compare with:

```text
--target-flag=STRATEGY_MAIN_LOOP_LATE_RESERVE \
--allow-workflow-input-differences=enable_flags,main_loop_late_reserve_fraction
```

The comparator must reject a mismatched config count, worker count, prime-winner setting, deadline, budget, or any other undeclared dispatch difference. After dispatch, also compare the actual GitHub run inputs to the intended manifest. Stop on incomplete coverage, config drift, invalid gains, attempt errors, or unchanged-budget violations.

## Optional later

A bounded beam→repair receptor counterfactual may follow B/C if their labels clarify what a useful receptor must preserve. Do not dispatch it blindly and do not build live handoff in this sequence.

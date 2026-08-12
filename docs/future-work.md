# Solver future work

This is the live priority queue. Historical reports remain authoritative for what they actually measured, but this file is authoritative for **what is still worth doing next**.

Canonical measurement contract: [`solver-level-blindness.md`](solver-level-blindness.md). A solver-capability result must treat every level as unseen and may not use exact-level history such as saved winning configs/seeds, prior solutions/hints, previous solved status, or attempt caches. Saved artifacts remain research outputs and labels, not solve inputs.

Last reconciled: **2026-08-11**, after the revised neighbor-budget full Corpus-2 A/B and the first explicit-prefix CP-SAT run. See [`../reports/2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md`](../reports/2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md).

## Current capability evidence

The decision-bearing level-blind Corpus-2 A/B at 36M nodes / 48.24M canonical work per level, non-binding wall deadline, was:

- control: **611/1700**;
- revised `PRUNE_MC_NEIGHBOR_BUDGET`: **665/1700**;
- **+54 net, 59 gained / 5 lost**;
- Corpus 1: **94/102 in both arms**;
- treatment used ~3.94% fewer C2 nodes and ~5.33% less canonical work;
- zero attempt errors and zero deadline-truncated C2 rows.

The historical `725/1700` figure is **not** the capability baseline. It used exact-level `--prime-winner` replay. It remains useful as historical re-verification evidence only. Of the 114 levels present in that 725 result but absent from the 611 control, 112 had been `solvedByPrime`.

## Ready / next

### 1. ~~Diagnose the five revised neighbor-budget losses and close the integration decision~~ — DONE, PROMOTED (2026-08-12)

**Status: complete.** `PRUNE_MC_NEIGHBOR_BUDGET` is now default-on. See [`../reports/2026-08-12-neighbor-budget-five-loss-diagnosis.md`](../reports/2026-08-12-neighbor-budget-five-loss-diagnosis.md) for the full diagnosis and [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md)'s updated row.

Four of five losses (`R00635`, `R02119`, `R02422`, `R02867`) share a clean mechanism: the same deterministic diverse-beam attempt that wins under OFF is still tried under ON, runs to a comparable node count, and fails — plausibly a bounded-width top-K retention effect (removing a genuinely-dead candidate from a fixed-width beam bucket's competition can displace a different, non-provably-dead candidate that was actually on the path to the true solution), mechanistically distinct from the already-fixed repair-seed-reindexing issue. `R02823` could not be reliably reproduced locally (see item below) and remains undiagnosed.

Promoted to default-on given: 0 regressions on the published 160-level corpus and corpus-1, a 7.4:1+ gained:lost ratio on corpus-2 (net +54/1700), and a residual cost that is now understood and bounded rather than open-ended. Optional, non-blocking follow-up: implement and validate a beam-width-scoped exclusion (analogous to the existing repair fix) to chase the remaining five losses — its own project with its own population A/B, not required for the promotion already made.

### 1b. Investigate worker-count solve-outcome sensitivity — ESCALATED (2026-08-12)

**Status: real, now confirmed at corpus scale; root cause still unknown.** See [`../reports/2026-08-12-worker-count-solve-outcome-sensitivity.md`](../reports/2026-08-12-worker-count-solve-outcome-sensitivity.md) for full evidence and candidate hypotheses.

Originally a single-level oddity: `R02823` (one of the five neighbor-budget losses) failed to reproduce locally under both `--workers=4` and `--workers=1` sequential, yet solved cleanly when run completely alone. That has now been confirmed as a **corpus-wide, directional effect, not a fluke**: the `STRATEGY_MAIN_LOOP_LATE_RESERVE` A/B's `workers=1` control run (91/102, 617/1700) came in 48 levels (2.8%) below a same-code, same-flags `workers=2` run (94/102, 665/1700) from the day before. `docs/solver-budget-determinism.md` documents the canonical WORK-budget model as host/load-independent by design; this is a real, large-magnitude counterexample.

Ruled out: solver production-code drift between the compared commits; a wrapper-level wall-clock shard timeout silently truncating a shard (the workflow's own complete-coverage check — exact row count against the full 1700/102 total — would have caught this, and reported `complete=true`). Leading untested hypothesis: `scripts/solver-worker-pool.mjs` forks each worker **once** and dispatches many levels to it sequentially over its lifetime (not one process per level) — under `workers=1` every level in a shard shares one long-lived process with up to ~84 predecessors; under `workers=2`, roughly half as many. If any module-level mutable state doesn't fully reset between solves within one process, a level's outcome could depend on its queue position and predecessors — the same class of bug as a documented past incident (a reused typed-array scratch buffer in `topology.ts`'s flipper-aware connectivity work). Not yet tested. See the report for the full hypothesis list and suggested isolated local reproduction protocol.

This matters beyond the two experiments that surfaced it: every solved-count figure in this codebase's solver research implicitly assumes worker count doesn't affect outcome once the wall deadline is non-binding and work/node budgets are pinned. That assumption is now demonstrably false. Any future population comparison should record and match worker count as carefully as commit/flags/budget.

### 2. Expand exact CP-SAT labels around real score/width extinctions

**First batch complete:** 12 previous atlas abstentions → **7 dead / 1 live / 4 abstain**, with zero correctness/input alarms. All four abstentions are R00039 `unsupported-mechanics`; the one live R00001 witness is referee-valid.

The result strengthens the score-representation diagnosis: at least one R00001 sibling ranked first by the beam is CP-SAT-proven dead despite a known-valid continuation from the same parent.

Next: build a bounded informative same-parent sibling set adjacent to actual winning-lineage score/width extinctions and run it through `.github/workflows/cpsat-explicit-prefix-oracle.yml`. Keep `live`, `dead`, and `abstain` distinct. Use labels to test neutral future-opportunity descriptors before changing the production score or selection policy.

Do **not** rerun the original 12 unchanged.

**Second batch complete (2026-08-12):** 15 real score/width extinction decision points (10 A / 3 B / 2 D class, all distinct from the first batch) → 32 cases, 9 live / 2 dead / 21 abstain, zero correctness/input alarms after fixing an under-constrained multi-gate CP-SAT encoding bug found along the way (`cpsat-full-probe.py`). The mis-ranking pattern reproduced independently at 2 more A-class parents (S00001, R00104); it did **not** reproduce at any of 3 usable B-class rows (both branches exact-feasible there — a different failure shape); D-class got zero usable data. Coverage is bottlenecked by flipping-filter support in the CP-SAT model (9/15 levels abstained solely for that reason). See [`reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md`](../reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md). Justifies starting neutral future-opportunity descriptor work scoped to the A-class regime; B/D classes need more exact labels first (which needs flipping-filter CP-SAT support, not more case construction against the current model).

### 3. Exact repair-retreat CP-SAT checks

The rollback pilot showed long demonstrated differences between retained repair elites and known solutions, but that is not a minimum edit-distance result. Use the existing explicit-prefix CP-SAT workflow for bounded coarse-to-fine/binary retreat checks on retained elites.

Question: how far back must an elite be rolled before at least one exact valid continuation exists? This decides whether a genuinely different prefix-edit operator is warranted and how deep it must reach.

### 4. Main-loop late-reserve full population A/B — RUN, CONFOUNDED, promoted anyway; direct sweep came back lower than expected (2026-08-12)

**Status: promoted to production default-ON at fraction 0.15. The A/B evidence was found confounded after the fact, and the direct full-corpus follow-up sweep came back lower than any individual reference point — plausible mechanism identified (a same-day repair-probe budget-timing fix interacting with node-budget-constrained batch solving), not yet confirmed.**

The frozen full-population level-blind A/B ran (all 4 arms `workers=1`, `deterministic=true`, full 1700/1700 C2 + 102/102 C1 coverage confirmed each arm): Corpus-2 solved control 617 → 0.05: 687 → 0.10: 692 → 0.15: 694. This initially looked like a clean win, but the control-vs-treatment comparison was later found confounded: the control arm's blank `enable_flags` left `PRUNE_MC_NEIGHBOR_BUDGET` OFF under its then-unfixed opt-in read site, while every treatment arm's non-null ablation object read it ON via the Proxy default-fallback — mixing a large share of that flag's own already-known +54 Corpus-2 effect into the gap. The unconfounded 687→692→694 treatment-vs-treatment trend still supports a real, smaller effect.

**Follow-up sweep (run #38, id `31630124558`, commit `ba5630978`), both flags genuinely default-on together**: Corpus-1 95/102, **Corpus-2 635/1700** — lower than the confounded 0.15 treatment (694) *and* the original neighbor-budget-only run (665, at `workers=2`), despite intending the same "both flags ON" configuration as the confounded 0.15 arm. The commit diff between that arm and this sweep isn't purely ablation bookkeeping — it also includes `2bfefc660` (a same-day repair-probe wall-clock fix, merged from `origin/main`) which lets a contended repair-probe attempt spend its full intended node budget instead of truncating early. Under the sweep tool's hard cumulative per-level `nodeBudget`, that plausibly leaves less shared budget for later tiers (including the late-reserve mechanism's own slice) — consistent with Corpus-1 (a more generous per-level budget) ticking up instead of down. Not confirmed as the actual cause. Full analysis: [`../reports/2026-08-12-main-loop-late-reserve-population-ab.md`](../reports/2026-08-12-main-loop-late-reserve-population-ab.md).

`scripts/ablation-config.mjs` no longer lists `STRATEGY_MAIN_LOOP_LATE_RESERVE` in `OPT_IN_FEATURES`; `MAIN_LOOP_LATE_RESERVE_FRACTION` in `modules/solver/orchestration.ts` is `0.15`. The mechanism remains a strict no-op without a finite `nodeBudget`, so this only affects offline batch tooling, not interactive Play/Editor/Review solves. **Open**: whether 635 is a stable production-capability figure or a budget-allocation-timing artifact from three same-day changes landing together; no dedicated follow-up dispatched yet.

**Follow-up (2026-08-12): the "repair-probe eats into the reserved slices" mechanism above is now known to be FALSE as stated.** Tracing `solveLevel`'s actual code shows both the admissible-order reserve and the main-loop late reserve are carved out of `nodeBudget` *before* `runRepairProbe` ever runs, and the probe's own external node ceiling (`mainLoopEarlyNodeBudget`) already excludes both — it is structurally incapable of spending into either reserve. What IS real, and directly confirmed on a local 12-level repair-gated Corpus-2 sample: the probe and the *early* (pre-late-reserve) main-loop configs share one **unprotected** pool, `mainLoopEarlyNodeBudget`, with the probe going first and taking whatever it needs (up to ~10,000,000 nodes with one biased tier) before early configs get a single node — on 7/12 sample levels the probe alone consumed the entire pool. A naive static shrink of the probe's budget is a real but zero-sum lever (1 gain, 1 loss on the sample: recovers a level whose winning config was an early main-loop one, breaks a level whose own solution required the probe's full budget). A live-signal-conditioned version — `STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET` (opt-in, default OFF, landed on `claude/repair-probe-starvation-diagnosis-963k6h`), which shrinks only the biased repair-probe tier's budget when the ordinary tier's own live `bestBadness` evidence shows no sign repair is close — gets a clean +1 on the same sample (1 gained, 0 lost), correctly leaving the probe-needs-full-budget level untouched. This is a single-signal, single-recipient pilot instance of online failure-conditioned allocation (see the "Online failure-conditioned control" note below), calibrated from n=12 (n=1 for the positive case) — needs its own population A/B before promotion. Full writeup: [`../reports/2026-08-12-repair-probe-early-main-loop-starvation.md`](../reports/2026-08-12-repair-probe-early-main-loop-starvation.md). The original 635-vs-694 corpus-scale gap remains only partially explained; this fixes a related, real, but distinct mechanism from the one originally hypothesized.

## Parallel observational work that remains valid

These do not need to wait for the late-reserve promotion decision provided they remain observation/offline only:

- winning-lineage analysis and exact-label expansion;
- dynamic crossing-slack / resource-frontier observation;
- family/variant boundary analysis;
- producer/receptor interoperability measurements;
- repair-retreat exact oracle work;
- symmetry diagnosis;
- solution-family and provenance analysis.

Correlation is still not permission to prune or to alter the score. Any live policy must clear its own level-blind equal-work evaluation.

## Current research interpretation

### Score representation remains a stronger beam lead than tie handling or wider beam

Winning-lineage forensics found 15 failed score/width final extinctions: 10 clearly mis-ranked, 3 weak-margin, 0 exact-tie/stable-order, 2 width-saturation. The first CP-SAT labels now provide direct feasibility evidence for the same story. Continue exact labeling before implementing a secondary family reservoir/quota or a new score component.

### Dynamic future opportunity remains the main pruning/bounds gap

Static must-cross geometry added essentially no predictive power. `crossingSlack = freeInt - forcedFutureNeighbourRevisits` passed its read-only smoke with zero negative-slack soundness alarms. If this lane advances, prefer conservative state-conditioned completion interfaces over another static descriptor pile.

### Repair still lacks a genuinely deep prefix-edit capability

Plateau penalty, soft recombination, exact relinking, and turn bias are closed in their current forms. The next repair question is exact retreat depth, not another append-only attraction tweak.

### Online failure-conditioned control is still distinct from the closed cold-start portfolio scheduler

A bespoke ladder/scheduler should answer “given what this solve has already observed, where is the next unit of work most valuable?” It must use only current-invocation evidence, never exact-level historical winners. Do not revive the old broad cold-start portfolio unchanged.

## Closed / do not repeat unchanged

- original neighbor-budget wiring A/B: historical evidence only; superseded by revised wiring;
- revised neighbor-budget full population A/B: **complete**;
- first 12 explicit-prefix CP-SAT abstentions: **complete**;
- repair elite-prefix DFS current constants: closed negative (4/20 vs 5/20 equal-budget);
- repair turn bias: closed negative;
- portal parity envelope: closed negligible, zero rejects in ~240M nodes;
- plateau penalty: closed as built;
- recombination: closed/superseded as built;
- exact relinking: structural dead end as built;
- admissible-order LDS: closed negative;
- old fast portfolio scheduler / broad cold-start variants: closed;
- residual-interface substitution lane: demoted after the cross-level inspection; do not build an operator without new independent mechanic-conditioned evidence.

## Infrastructure / hygiene

- `.github/workflows/solver-stress-refresh.yml` is now the canonical **level-blind capability** workflow.
- `scripts/level-blind-capability-sweep.mjs` projects source levels into a mechanics-only allowlist and structurally refuses exact-level historical inputs.
- `scripts/level-blind-capability-worker.mjs` receives no permanent level ID, corpus position, hint artifact, baseline, or prior-result input.
- Actions solve/combine jobs pin `github.sha`; never accept a mutable-branch checkout for a scientific A/B.
- Schema-v2 experiment manifests still compare the full workflow input set, but `prime_winner` is no longer a workflow dimension because the capability workflow forbids it.
- `persist_hints=false` + `deterministic=true` remains the correct matched-arm setting when multiple A/B arms must execute the same immutable SHA.
- The current malformed `logs/stress-corpus2-baseline.json` is not a solver input. The next complete non-deterministic level-blind refresh will regenerate it from a valid capability run.
- Historical emitter SHAs in older observational artifacts remain a provenance blemish; do not falsify them by rewriting to later commits.

## Remote execution order

The expensive neighbor-budget gate is closed. The next remote work may therefore proceed as resources allow:

1. bounded neighbor-budget five-loss diagnosis/integration experiment design;
2. extinction-adjacent explicit-prefix CP-SAT expansion;
3. repair-retreat CP-SAT cases;
4. late-reserve full population A/B.

Items 2 and 3 are observational/oracle work and can run alongside planning for 1 or 4. Population promotion experiments should still be serialized when one result changes the configuration against which the next should be interpreted.

## Older loose-thread triage (2026-08-07)

Compatibility anchor for historical documents that linked to this section before the 2026-08-11 queue rewrite. The old loose-thread list has been fully reconciled into the current sections above and the opt-in experiment ledger. **Do not treat this heading as an additional backlog.** Follow the current queue and closed/do-not-repeat list in this file instead.

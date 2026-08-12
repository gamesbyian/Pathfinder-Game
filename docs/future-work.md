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

### 1. Diagnose the five revised neighbor-budget losses and close the integration decision

**Status: population A/B complete; do not rerun unchanged.**

Lost IDs: `R00635`, `R02119`, `R02422`, `R02823`, `R02867`.

Goal: preserve as much of the 59-gain upside as possible without accepting a capability regression. Determine whether the five losses share one deterministic ordering/budget mechanism. Any recovery must be generic and level-blind. Do not use historical winner replay or per-ID exceptions.

A promising integration shape, if needed, is a complementary/fallback use of the prune rather than globally changing every search. It is only acceptable if evaluated under a matched **total work** envelope; simply adding a second full-budget solve would buy solves with extra compute and would not answer the promotion question.

Promotion options after this analysis:

- default-on if the five-loss risk can be eliminated or accepted under the project's promotion bar;
- a bounded complementary lane if it gives a strict or near-strict superset at equal work;
- remain opt-in if neither integration clears the bar.

### 2. Expand exact CP-SAT labels around real score/width extinctions

**First batch complete:** 12 previous atlas abstentions → **7 dead / 1 live / 4 abstain**, with zero correctness/input alarms. All four abstentions are R00039 `unsupported-mechanics`; the one live R00001 witness is referee-valid.

The result strengthens the score-representation diagnosis: at least one R00001 sibling ranked first by the beam is CP-SAT-proven dead despite a known-valid continuation from the same parent.

Next: build a bounded informative same-parent sibling set adjacent to actual winning-lineage score/width extinctions and run it through `.github/workflows/cpsat-explicit-prefix-oracle.yml`. Keep `live`, `dead`, and `abstain` distinct. Use labels to test neutral future-opportunity descriptors before changing the production score or selection policy.

Do **not** rerun the original 12 unchanged.

**Second batch complete (2026-08-12):** 15 real score/width extinction decision points (10 A / 3 B / 2 D class, all distinct from the first batch) → 32 cases, 9 live / 2 dead / 21 abstain, zero correctness/input alarms after fixing an under-constrained multi-gate CP-SAT encoding bug found along the way (`cpsat-full-probe.py`). The mis-ranking pattern reproduced independently at 2 more A-class parents (S00001, R00104); it did **not** reproduce at any of 3 usable B-class rows (both branches exact-feasible there — a different failure shape); D-class got zero usable data. Coverage is bottlenecked by flipping-filter support in the CP-SAT model (9/15 levels abstained solely for that reason). See [`reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md`](../reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md). Justifies starting neutral future-opportunity descriptor work scoped to the A-class regime; B/D classes need more exact labels first (which needs flipping-filter CP-SAT support, not more case construction against the current model).

### 3. Exact repair-retreat CP-SAT checks

The rollback pilot showed long demonstrated differences between retained repair elites and known solutions, but that is not a minimum edit-distance result. Use the existing explicit-prefix CP-SAT workflow for bounded coarse-to-fine/binary retreat checks on retained elites.

Question: how far back must an elite be rolled before at least one exact valid continuation exists? This decides whether a genuinely different prefix-edit operator is warranted and how deep it must reach.

### 4. Main-loop late-reserve full population A/B

**Status: unblocked; full A/B still pending.**

The mechanism pilot already showed that reserve-not-reorder activates the starved late configs and recovered 1/14 hard historical matches. Acceptance still requires the frozen full-population experiment in [`main-loop-late-reserve-experiment.md`](main-loop-late-reserve-experiment.md).

Run through the hardened level-blind stress workflow. Control and treatment must differ only in:

- `enable_flags` (`STRATEGY_MAIN_LOOP_LATE_RESERVE` in treatment), and
- `main_loop_late_reserve_fraction`.

`main_loop_late_reserve_config_count=4` in every arm. Test 5%, 10%, and 15% treatments against a fresh control. No exact-level priming dimension exists in the capability workflow.

Interpretation:

- positive population result → participation floors/starvation are a real general lever;
- target recoveries but negative population result → static reserve is too blunt; prefer online failure-conditioned allocation;
- null → close the current static reserve mechanism and move on.

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

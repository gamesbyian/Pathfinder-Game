# Solver optimization: current priority queue

> **Status:** canonical live entry point for tuning and optimizing existing solver techniques.
> **Last reconciled:** 2026-08-20, through the population technique census, the first population-confirmed beam-routing expansion, the current residual-regression root causes, and local validation of `STRATEGY_REPAIR_LATE_PROBE` pending population confirmation.
> **Scope:** improve cold, level-blind solve count or reduce machine-independent work without losing solved levels. Exact-level history may label research data but may not control a production solve.

This file is intentionally short. It answers **what is live now, what is closed, and what decision comes next**. The full narrative that had accumulated here through 2026-08-20 is preserved verbatim as [`solver-optimization-current-queue-2026-08-20-snapshot.md`](solver-optimization-current-queue-2026-08-20-snapshot.md). Detailed evidence and compatibility anchors also remain in [Solver future work](future-work.md), the [opt-in experiment ledger](solver-opt-in-experiment-ledger.md), and dated reports. Those are evidence stores, not competing priority lists.

## Current evidence reset

The 2026-08-15 lifecycle baseline (731/1700 Corpus-2 solves at the then-current 50M protocol) showed that the shared ladder often exhausted its pool before every eligible late tier received much work. That observation remains valid **as lifecycle telemetry**, but the 2026-08-20 technique census changes what may be inferred from it.

The census gave each technique its **own** full 50,000,000-node budget across the currently-unsolved population. Plain repair still hit that cap without solving on **750/879 (85.3%)** levels and solved only 119/879. So “starved in the ladder” is not evidence that simply allocating more ladder budget to repair will help: on most of this population, repair already fails with the whole budget to itself.

At the same time, the census found an important routing problem: **246/879** currently-unsolved levels are solved by at least one isolated technique, and **111** of those solve within 1,000,000 nodes. Almost the entire cheap tail was reached by a technique the production ladder did not route to that level. The first beam-routing expansion subsequently produced a population result of **+20 net Corpus-2 solves (828→848, 21 gained / 1 understood loss)**. A second beam expansion recovered its full 29-level local target set and was awaiting population confirmation at the last reconciliation.

The current failure population is therefore heterogeneous. Treat these as distinct questions:

- **regression recovery:** a level/config that used to solve but no longer does;
- **routing:** an existing technique solves cheaply in isolation but is never offered to that level;
- **search quality:** a technique is tried, receives substantial or full isolated budget, and still fails;
- **representation/retention:** a viable lineage is generated but lost through ranking, deduplication, or width pressure.

Do not collapse those into the single word “starvation.”

## Ranked queue

Rows retain stable priority numbers so reports can cite them. **A row marked CLOSED or gate-complete is a disposition, not active work.** The active production-facing gates at this reconciliation are Priority 0's unexplained residual regressions and Priority 7's population confirmation; Priorities 2, 4, and 5 are research/representation lanes.

| Priority | Opportunity | State | Next decision-bearing step |
|---:|---|---|---|
| 0 | Residual previously-solved regressions | **ACTIVE** | Root-cause `R02516` and the four repair-only residual cases; do not build a recovery mechanism from the small, non-monotonic portal+must-cross sample until it survives broader falsification. |
| 1 | Failure-conditioned late-tier allocation | **CLOSED 2026-08-20** | None in the original form. The technique census shows repair mostly fails even with a full isolated 50M-node budget. A repair **search-quality** change would be a separate question. |
| 2 | Beam score/retention at proven extinction boundaries | **ACTIVE RESEARCH** | Run the held-out, family-namespaced K-vs-2K comparison across confirmed A- and D-class extinction cases at equal surrounding policy. |
| 3 | Canonical-inclusive family-boundary retest | **GATE COMPLETE 2026-08-15** | Feed the reproduced boundaries into the relevant mechanism-specific lanes; do not rerun this gate unchanged. |
| 4 | CP-SAT-anchored deep repair editing | **ACTIVE RESEARCH** | Resolve more exact feasible/infeasible retreat boundaries; prototype bounded rollback/rebuild only after a state feature predicts retreat depth repeatedly. |
| 5 | State-conditioned must-cross anchoring | **ACTIVE RESEARCH** | Add a read-only prefix diagnostic for target/defer/second-approach decisions and require the distinction to repeat across unrelated levels/families before changing scoring. |
| 6 | Mechanics-conditioned admissible-order routing | **CLOSED NEGATIVE 2026-08-20** | None. Only 6/879 currently-unsolved levels are uniquely solved by any `ida:*` config at full isolated budget, versus 76 uniquely solved by repair. |
| 7 | Cheap isolated-technique wins the ladder does not route to | **ACTIVE / SHIPPING GATE** | Finish population confirmation of the current beam-routing expansion and `STRATEGY_REPAIR_LATE_PROBE`; promote only on the established solved-count/regression/cost evidence. |

## How to execute the queue

### 0. `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` regression

The original regression family is no longer one unexplained flag bug. Fresh provenance mining produced 609 real-tier candidates; after correcting a beam-config reconstruction bug and cross-checking the current full ladder, 14 previously-solved levels remained genuinely unsolved at generous budgets.

Current disposition:

- four beam-only cases were independently bisected to `dd001dd5c`, the beam-dedup key-width overflow fix. Their lost solves are accepted search-order collateral of a genuine soundness/correctness repair, **not** a reason to restore the broken key;
- five portal+must-cross beam cases implicate `PRUNE_MC_RESERVED_WALL` and `PRUNE_MC_FORCED_NEIGHBOR`, but effects are non-monotonic: different flag combinations recover different cases, and disabling both can be worse than disabling one;
- `R02424` and `R01229` also match the corrected beam-key-width population and may have that as a third factor, but this is not independently bisected for those two;
- `R02516` and four repair-only cases remain the clearest unexplained residuals.

The next useful work is root-cause analysis of those residuals, not another blanket retry tier. The full chronology, including the successful retry-tier work that preceded this residual set, is in the [2026-08-20 snapshot](solver-optimization-current-queue-2026-08-20-snapshot.md#0-prune_connectivity_axis_exhausted-regression) and [`reports/2026-08-15-connectivity-axis-exhausted-regression.md`](../reports/2026-08-15-connectivity-axis-exhausted-regression.md).

### 1. Failure-conditioned late-tier allocation

**Closed as originally framed.** The local pilot already suggested participation rather than starvation was the problem. The population technique census settled it: `dfs:repair:repair` receives the entire 50M-node budget in isolation and still caps out without solving on 750/879 currently-unsolved levels.

Do not build another rule whose premise is “repair would solve these if only the ladder gave it more of the same search.” Evidence now points instead to repair search quality and to separate routing gaps where a technique is not tried at all. Full evidence: [snapshot section 1](solver-optimization-current-queue-2026-08-20-snapshot.md#1-failure-conditioned-late-tier-allocation).

### 2. Beam score and representation

The strongest remaining representation question is not universal widening. Exact-prefix work has produced repeated cases where a higher-ranked sibling is exact-dead while a lower-ranked sibling remains exact-live, including both A-class and D-class extinction patterns.

Next: assemble a held-out, family-namespaced set of roughly 8–12 confirmed extinction boundaries spanning both classes and compare K versus 2K at equal surrounding policy. A scorer feature earns promotion only if it separates feasibility across unrelated parent families and beats widening at equal work. Do not use regression-confounded `R02248` as a clean held-out scoring case. Full evidence: [snapshot section 2](solver-optimization-current-queue-2026-08-20-snapshot.md#2-beam-score-and-representation).

### 3. Canonical-inclusive family-boundary retest

**Gate complete.** The eight nominated parents were cold-retested canonically; only three remained canonical failures, and their symmetry siblings were then solved under the same protocol. `R02248` was subsequently explained by the Priority 0 regression path rather than a clean scoring boundary. `R00156` and `R02960` showed budget/allocation-flavored sibling differences, but Priority 1's later census result closes the broad “give repair more budget” interpretation.

Do not rerun this gate unchanged. Use family boundaries only to nominate a mechanism-specific question. Full evidence: [snapshot section 3](solver-optimization-current-queue-2026-08-20-snapshot.md#3-canonical-inclusive-family-boundary-retest) and [`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md).

### 4. Repair depth and operators

Blind rollout/escape proxies are closed. The useful labels are exact CP-SAT-backed retreat boundaries, including concrete feasible/infeasible transitions already measured on real repair prefixes.

Next: expand those exact boundaries with the existing retreat-file tooling, then test a bounded deep prefix edit or rollback/rebuild operator only after retreat depth is predicted by a recurring state feature. Do not substitute extra flat repair nodes for a new operator. Full evidence: [snapshot section 4](solver-optimization-current-queue-2026-08-20-snapshot.md#4-repair-depth-and-operators) and [`reports/2026-08-12-repair-retreat-cpsat.md`](../reports/2026-08-12-repair-retreat-cpsat.md).

### 5. Must-cross anchors

The unconditional must-cross-horizon pass contributed zero solves and is closed. The narrower open idea is state-conditioned: from the live prefix, decide whether to target or defer a must-cross landmark and when guidance should switch to the perpendicular second-crossing approach.

Start shadow/read-only. Saved solutions may label decisions offline but may not choose the live anchor. Require repeated separation across unrelated levels or held-out families before changing production scoring. Full evidence: [snapshot section 5](solver-optimization-current-queue-2026-08-20-snapshot.md#5-must-cross-anchors) and [`solver-heuristic-capability-gap-analysis.md`](solver-heuristic-capability-gap-analysis.md).

### 6. Technique routing from mechanics

**Closed negative for the proposed admissible-order density reserve.** The density correlation was real, but the technique census supplied the missing causal control: with a full isolated 50M-node budget, all `ida:*` configs together uniquely solve only 6/879 currently-unsolved levels. There is too little unique capability to justify routing a meaningful reserve toward them.

Do not build `STRATEGY_ADMISSIBLE_ORDER_DENSITY_RESERVE`. Full evidence: [snapshot section 6](solver-optimization-current-queue-2026-08-20-snapshot.md#6-technique-routing-from-mechanics).

### 7. Cheap oracle-union solves the full ladder currently misses

This is the most important new routing result from the technique census. Of 879 levels unsolved by the then-current production ladder, 246 solve under at least one isolated technique at 50M nodes; 111 solve within 1M. The cheap tail is overwhelmingly a **not-routed** population, not a “same technique needs more budget” population.

Two concrete sub-lanes are already beyond speculation:

1. **Beam routing.** Adding trailing, protected beam configs to previously beam-less attempt-policy rules produced 20 net new Corpus-2 solves at population scale (828→848; 21 gained, one understood displacement loss). A follow-up addition of the two `beam:perimeterSweep/*@beam2000` configs recovered all 29 newly-routed local oracle-union targets and was awaiting population confirmation at this reconciliation. Preserve the “beam last, inside the protected tail” placement: putting beam first nearly doubled published-corpus wall time, while putting it last retained capability without charging already-quick solves.
2. **Late bounded repair probe.** `STRATEGY_REPAIR_LATE_PROBE` is implemented opt-in/default-OFF for levels structurally excluded by `needsRepairFallback`. It runs dead last and has its own flat 2M-node cap, including when the caller's outer `nodeBudget` is `Infinity`. Local end-to-end validation found **20 net new recoveries of the 94 gate-excluded repair winners**, referee-valid, with zero marginal cost on repair-eligible controls and a byte-identical default-off published benchmark. Population GHA confirmation is the promotion gate.

Do not widen the existing **early** repair probe's gate: it charges every newly eligible solve before the main ladder and has already produced unconditional dead-search overhead in this codebase. The late-tail placement is what makes broad reach tolerable.

Full derivation, per-technique tables, implementation gotchas, and exact run IDs are preserved in [snapshot section 7](solver-optimization-current-queue-2026-08-20-snapshot.md#7-cheap-oracle-union-solves-the-full-ladder-currently-misses) and the technique-census artifacts under [`reports/stress/technique-census/32240161854/`](../reports/stress/technique-census/32240161854/).

## Promotion contract

Every production-facing treatment must:

- obey [solver level-blindness](solver-level-blindness.md);
- freeze the protocol at a persistent commit before execution;
- use a non-binding wall deadline when the question requires deterministic budget comparison;
- compare machine-independent `workSpent` alongside solve count and nodes, while remembering the work meter does not measure changes to the cost *inside* a metered operation;
- report paired gains, losses, technique reach, errors, and deadline truncation;
- include Corpus 1 and Corpus 2, plus published transfer/cost evidence where appropriate;
- distinguish exploratory diagnostics from decision-bearing population evidence;
- update this queue, [future work](future-work.md), and the [experiment ledger](solver-opt-in-experiment-ledger.md) when the disposition changes.

## Closed forms that must stay visible

Do not repeat unchanged: universal beam widening; unconditional must-cross horizon; static repair-fallback reserve; blind late-tier carve-outs; main-loop-badness-gated repair allocation; adaptive-shrink recovery; CP-SAT-free rollout proxy; repair plateau penalty; soft recombination; exact relinking; turn bias; admissible-order LDS; admissible-order density reserve; and the broad cold-start portfolio scheduler.

A nearby idea remains open only when it changes the information boundary or mechanism. State that distinction explicitly.

## Evidence map

- [Full queue snapshot through 2026-08-20](solver-optimization-current-queue-2026-08-20-snapshot.md): preserved detailed chronology and measurements formerly embedded in this live queue.
- [Solver future work](future-work.md): detailed evidence/dispositions and broader deferrals.
- [Opt-in experiment ledger](solver-opt-in-experiment-ledger.md): current state of retained/default-off mechanisms.
- [Technique census design/calibration](../reports/2026-08-19-technique-census-design.md) and [population artifacts](../reports/stress/technique-census/32240161854/): isolated-technique capability evidence.
- [`PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` regression report](../reports/2026-08-15-connectivity-axis-exhausted-regression.md): bisection, threshold/dedup behavior, retry-tier history, and regression mining.
- [Beam lineage survival analysis](winning-lineage-survival-analysis.md) and [heuristic capability gaps](solver-heuristic-capability-gap-analysis.md): representation and must-cross hypotheses.
- [Repair retreat evidence](../reports/2026-08-12-repair-retreat-cpsat.md): exact-prefix repair-depth labels.
- [Research operating model](solver-research-operating-model.md): how observations become shadow tests, A/Bs, and promotion decisions.

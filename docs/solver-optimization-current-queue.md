# Solver optimization: current priority queue

> **Status:** canonical live entry point for optimizing existing solver techniques.
> **Reconciled:** 2026-08-21 through the solver-authority consolidation and `STRATEGY_REPAIR_LATE_PROBE` promotion.
> **Scope:** improve cold, level-blind solve count or machine-independent work without losing solves. Exact-level history may label research data but may not control production solves.

Historical detail is preserved in:

- [`solver-optimization-current-queue-2026-08-20-snapshot.md`](solver-optimization-current-queue-2026-08-20-snapshot.md): pre-final 2026-08-20 regression/provenance work;
- [`solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md`](solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md): PR #1398 queue and late-session chronology.

Broader deferred/reopen ideas: [`future-work.md`](future-work.md). Default-off mechanisms: [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md). Method: [`solver-research-operating-model.md`](solver-research-operating-model.md).

## Evidence reset

The 2026-08-20 technique census gave each technique 50,000,000 nodes over 879 then-unsolved Corpus-2 levels:

- isolated-technique union: **246/879**;
- **111** solved within 1,000,000 nodes;
- plain repair: **119/879**, with **750/879** exhausting 50M unsolved;
- repair-family variants supplied much more unique capability than admissible-order variants.

Keep failure classes separate:

1. **routing:** capable technique gets too little relevant work;
2. **search quality:** substantial/full budget still fails;
3. **representation/retention:** viable material is generated then lost to score, dedup, width, etc.;
4. **regression:** comparable production solve previously succeeded and now fails;
5. **provenance/instrumentation:** evidence does not establish the claimed comparison.

The first beam-routing expansion produced **+20 net Corpus-2 solves (828→848; 21 gained / 1 understood loss)**. A perimeter-beam follow-up recovered all 29 newly routed local targets.

`STRATEGY_REPAIR_LATE_PROBE` was promoted default-ON 2026-08-21 after same-commit deterministic A/B (GHA 32453248184 vs 32459711208, `main@e5034e8c`): Corpus-1 **95→96**, Corpus-2 **863→881**, **+19 net**, zero regressions.

Recent work also fixed work accounting/concurrent solve isolation, retry-tier proxying, adaptive gate weighting, lifecycle telemetry, repair/late-probe budgeting, canonical attempt/result telemetry, stage identity, and stage/budget planning. Older counts remain evidence only for their recorded commits; rerun matched baselines when current code touches the measured path.

## Ranked queue

Priority numbers remain citeable. CLOSED/GATE COMPLETE rows are dispositions, not active work.

| Priority | Opportunity | State | Next decision-bearing step |
|---:|---|---|---|
| 0 | Regression/provenance re-derivation | **ACTIVE / EVIDENCE REPAIR** | Canonical invocation/stage telemetry has largely landed. Re-mine the residual regression population using the repaired evidence contract before adding recovery mechanisms. |
| 1 | Failure-conditioned late-tier allocation | **CLOSED 2026-08-20** | Original form rejected: plain repair mostly fails even with isolated 50M. |
| 2 | Beam score/retention at proven extinction boundaries | **ACTIVE RESEARCH** | Held-out family-namespaced K-vs-2K/descriptor tests across confirmed extinction cases at equal surrounding policy. |
| 3 | Canonical-inclusive family-boundary retest | **GATE COMPLETE 2026-08-15** | Use reproduced boundaries only to nominate mechanism-specific work; do not rerun unchanged. |
| 4 | CP-SAT-anchored deep repair editing | **ACTIVE RESEARCH** | Expand exact feasible/infeasible retreat boundaries; prototype deeper rollback/rebuild only when retreat depth becomes predictably state-conditioned. |
| 5 | State-conditioned must-cross anchoring | **ACTIVE RESEARCH** | Continue read-only prefix diagnostics; require repeated separation across unrelated levels/families before scoring changes. |
| 6 | Mechanics-conditioned admissible-order routing | **CLOSED NEGATIVE 2026-08-20** | Too little unique isolated capability to justify meaningful reserve. |
| 7 | Cheap isolated-technique wins the ladder does not route to | **LATE PROBE PROMOTED 2026-08-21; BEAM WORK OPEN** | Investigate remaining high-intersection/must-cross-heavy beam gaps per archetype rather than adding broad configs. |

## 0. Regression and provenance integrity

Late 2026-08-20 findings:

- four beam-only losses bisect to `dd001dd5c`, the beam-dedup key-width correctness fix; accept collateral search-order loss rather than restore the broken key;
- `R02516`: three sound must-cross forced-structure prunes (`PRUNE_MC_RESERVED_WALL`, `PRUNE_MC_FORCED_NEIGHBOR`, `PRUNE_MC_FORCED_FIRST_MOVE`) jointly remove the former winning branch;
- `R00632`: false regression; stored win force-enabled default-OFF `STRATEGY_REPAIR_TURN_BIAS`;
- `R02900`: attribution bug; solver ID was labeled production without proving full `solveLevel()` ladder use. Default `Solver.solve(level,{})` at the recorded-good commit still failed after hundreds of millions of nodes;
- `R03205`: same artifact. Fixed gate/forcing/seed and identical `nodesExpanded:6792911` across five commits match forced replay tooling. At recorded-good `86bdd133`, unconstrained `Solver.solve(level,{})` failed three times at ~20M nodes;
- `R03329`: likewise non-regression; forced-replay repair signature plus 2026-08-20 isolated-census admissible-order wins;
- `R02424`, `R01229`: plausible residual beam losses matching corrected key-width behavior, without independent bisection.

The telemetry/provenance repair now gives new evidence canonical stage/invocation structure. Re-mine regressions under that contract before designing recovery for any old aggregate category.

Full chronology: [`solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md`](solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md).

## 1. Failure-conditioned late-tier allocation

**Closed in its original form.** Full 50M isolated repair leaves 750/879 unsolved. Future repair work should change search quality/operators/representation or address demonstrated routing gaps, not merely add repair budget.

## 2. Beam score and representation

Exact-prefix work found higher-ranked exact-dead material while lower-ranked material stayed exact-live. Test retention/representation changes rather than universal width increases. Use family-separated held-out cases at equal work and require recurrence across unrelated parents.

## 3. Family-boundary gate

**Complete.** Controlled canonical/sibling comparisons remain diagnostic; do not repeat the gate unchanged. The larger off-main trove in [`variant-level-research.md`](variant-level-research.md) is research data, not a production rotate/retry policy.

## 4. Repair depth and operators

Blind rollout/escape proxies are closed. Expand exact CP-SAT retreat-feasibility labels before building deeper prefix editing.

## 5. State-conditioned must-cross anchoring

Unconditional attraction is closed. The open form uses live prefix state to choose target/defer/second-approach behavior. Require cross-level/family recurrence before changing scoring.

## 6. Admissible-order routing

**Closed negative for measured reserve/density forms.** Isolated `ida:*` adds little unique capability relative to repair/beam. Do not reserve meaningful ladder work without new evidence.

## 7. Unrouted cheap capability

Confirmed production-facing results:

- first beam-routing expansion: **+20 net Corpus-2**;
- perimeter-beam expansion: all 29 local newly routed targets recovered; population confirmation on a current correctly-accounted baseline remains useful;
- `STRATEGY_REPAIR_LATE_PROBE`: **promoted default-ON 2026-08-21**, +19 net in same-commit deterministic A/B with zero regressions.

Remaining cheap unrouted beam wins cluster across high-intersection-burden and must-cross-heavy archetypes; no single missing config covers many. Investigate rule-specific routing rather than appending broad beam configs.

## Promotion contract

Production-facing treatments must:

- obey [`solver-level-blindness.md`](solver-level-blindness.md);
- freeze protocol and persistent commit before execution;
- use non-binding wall deadlines for deterministic budget comparisons;
- compare machine-independent `workSpent` with nodes and solves;
- report paired gains/losses, technique reach, errors, and deadline truncation;
- include Corpus 1, Corpus 2, and published transfer/cost evidence where appropriate;
- separate exploratory diagnostics from decision-bearing population evidence;
- update this queue and relevant ledger/report when disposition changes.

## Closed forms to keep visible

Do not repeat unchanged: universal beam widening; unconditional must-cross attraction/horizon; static repair-fallback reserve; blind late-tier carve-outs; plain extra budget for plateaued repair; main-loop-badness-gated allocation; adaptive-shrink recovery; CP-SAT-free rollout proxy; repair plateau penalty; soft recombination; exact relinking; repair turn bias; admissible-order LDS; admissible-order density/profile reserve; broad cold-start portfolio scheduler.

A nearby idea is new only when its mechanism or information boundary materially changes.

## Evidence map

- [`solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md`](solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md): strongest late regression/provenance chronology and routing notes.
- [`solver-optimization-current-queue-2026-08-20-snapshot.md`](solver-optimization-current-queue-2026-08-20-snapshot.md): earlier 2026-08-20 chronology.
- [`../reports/2026-08-20-technique-census-reconciliation.md`](../reports/2026-08-20-technique-census-reconciliation.md): census reconciliation.
- [`../reports/stress/technique-census/32240161854/`](../reports/stress/technique-census/32240161854/): generated census artifacts.
- [`../reports/2026-08-15-connectivity-axis-exhausted-regression.md`](../reports/2026-08-15-connectivity-axis-exhausted-regression.md): regression/beam threshold history.
- [`winning-lineage-survival-analysis.md`](winning-lineage-survival-analysis.md): lineage observation contract.
- [`../reports/2026-08-12-repair-retreat-cpsat.md`](../reports/2026-08-12-repair-retreat-cpsat.md): exact repair-retreat evidence.
- [`variant-level-research.md`](variant-level-research.md): family/variant trove and research discipline.
- [`solver-research-operating-model.md`](solver-research-operating-model.md): research method and evidence routing.

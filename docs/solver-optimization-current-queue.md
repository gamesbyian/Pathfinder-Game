# Solver optimization: current priority queue

> **Status:** canonical live entry point for optimizing existing solver techniques.
> **Reconciled:** 2026-08-21 through solver-authority consolidation and `STRATEGY_REPAIR_LATE_PROBE` promotion.
> **Scope:** improve cold, level-blind solve count or machine-independent work without losing solves. Exact-level history may label research, never control production solves.

Chronology: [`archive/snapshots/solver-optimization-current-queue-2026-08-20.md`](archive/snapshots/solver-optimization-current-queue-2026-08-20.md), [`archive/snapshots/solver-optimization-current-queue-2026-08-20-post-1398.md`](archive/snapshots/solver-optimization-current-queue-2026-08-20-post-1398.md). Deferred ideas: [`future-work.md`](future-work.md). Default-off mechanisms: [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md). Method: [`solver-research-operating-model.md`](solver-research-operating-model.md).

## Evidence reset

2026-08-20 technique census: each technique got 50M nodes over 879 then-unsolved Corpus-2 levels.

- isolated-technique union **246/879**; **111** within 1M nodes;
- plain repair **119/879**, with **750/879** exhausting 50M unsolved;
- repair-family variants had much more unique capability than admissible-order variants.

Failure classes: **routing** (capable technique gets too little relevant work); **search quality** (full/substantial budget still fails); **representation/retention** (viable material generated then lost); **regression** (comparable production solve lost); **provenance/instrumentation** (evidence cannot establish the comparison).

Beam routing produced **+20 net Corpus-2 (828→848; 21 gained / 1 understood loss)**; a perimeter-beam follow-up recovered all 29 newly routed local targets. `STRATEGY_REPAIR_LATE_PROBE` promoted default-ON 2026-08-21 after same-commit deterministic A/B (GHA 32453248184 vs 32459711208, `main@e5034e8c`): Corpus-1 **95→96**, Corpus-2 **863→881**, **+19 net**, zero regressions.

Recent fixes include work accounting/concurrent isolation, retry proxying, adaptive gate weighting, lifecycle telemetry, repair/late-probe budgeting, canonical attempt/result telemetry, stage identity, and stage/budget planning. Older counts belong to their recorded commits; rerun matched baselines when current code touches the measured path.

## Ranked queue

Priority numbers remain citeable; CLOSED/GATE COMPLETE rows are dispositions.

| # | Opportunity | State | Next gate |
|---:|---|---|---|
| 0 | Regression/provenance re-derivation | **ACTIVE / EVIDENCE REPAIR** | Re-mine residual regressions under canonical invocation/stage telemetry before adding recovery. |
| 1 | Failure-conditioned late-tier allocation | **CLOSED 2026-08-20** | Plain repair mostly fails even with isolated 50M; original form rejected. |
| 2 | Beam score/retention at proven extinction boundaries | **ACTIVE RESEARCH** | Held-out family-namespaced K-vs-2K/descriptor tests at equal surrounding policy. |
| 3 | Canonical-inclusive family-boundary retest | **GATE COMPLETE 2026-08-15** | Use reproduced boundaries to nominate mechanisms; do not rerun unchanged. |
| 4 | CP-SAT-anchored deep repair editing | **ACTIVE RESEARCH** | Expand feasible/infeasible retreat boundaries; edit deeper only when depth becomes predictably state-conditioned. |
| 5 | State-conditioned must-cross anchoring | **ACTIVE RESEARCH** | Read-only prefix diagnostics; require recurrence across unrelated levels/families before scoring changes. |
| 6 | Mechanics-conditioned admissible-order routing | **CLOSED NEGATIVE 2026-08-20** | Too little unique isolated capability for meaningful reserve. |
| 7 | Cheap isolated-technique wins the ladder misses | **LATE PROBE PROMOTED 2026-08-21; BEAM OPEN** | Investigate remaining high-intersection/must-cross-heavy beam gaps by archetype, not broad configs. |

## 0. Regression and provenance integrity

Late 2026-08-20 findings:

- four beam-only losses bisect to `dd001dd5c`, the beam-dedup key-width correctness fix; accept search-order collateral, do not restore broken identity;
- `R02516`: sound `PRUNE_MC_RESERVED_WALL`, `PRUNE_MC_FORCED_NEIGHBOR`, `PRUNE_MC_FORCED_FIRST_MOVE` jointly remove its old branch;
- `R00632`: false regression; stored win force-enabled default-OFF `STRATEGY_REPAIR_TURN_BIAS`;
- `R02900`: attribution bug; solver ID did not prove full `solveLevel()` ladder use, and default `Solver.solve(level,{})` at the recorded-good commit still failed after hundreds of millions of nodes;
- `R03205`: same artifact; fixed gate/forcing/seed and identical `nodesExpanded:6792911` across five commits match forced replay. At `86bdd133`, unconstrained `Solver.solve(level,{})` failed 3× at ~20M nodes;
- `R03329`: likewise non-regression; forced-replay repair signature plus isolated-census admissible-order wins;
- `R02424`, `R01229`: plausible residual beam losses matching corrected key-width behavior, not independently bisected.

Re-mine regressions under repaired stage/invocation telemetry before designing recovery for old aggregate categories. Full chronology: [`archive/snapshots/solver-optimization-current-queue-2026-08-20-post-1398.md`](archive/snapshots/solver-optimization-current-queue-2026-08-20-post-1398.md).

## 1. Failure-conditioned late-tier allocation

**Closed.** Full 50M isolated repair leaves 750/879 unsolved. Future repair work must change search quality/operators/representation or address demonstrated routing gaps, not merely add budget.

## 2. Beam score and representation

Exact-prefix work found higher-ranked exact-dead material while lower-ranked material stayed exact-live. Test retention/representation rather than universal width; use family-separated held-out cases at equal work and require recurrence across unrelated parents.

## 3. Family-boundary gate

**Complete.** Canonical/sibling comparisons remain diagnostic; do not repeat the gate unchanged. The off-main trove in [`variant-level-research.md`](variant-level-research.md) is research data, not production rotate/retry policy.

## 4. Repair depth and operators

Blind rollout/escape proxies are closed. Expand exact CP-SAT retreat-feasibility labels before deeper prefix editing.

## 5. State-conditioned must-cross anchoring

Unconditional attraction is closed. Open form: use live prefix state for target/defer/second-approach behavior; require cross-family recurrence before scoring changes.

## 6. Admissible-order routing

**Closed negative for measured reserve/density forms.** Isolated `ida:*` adds little unique capability vs repair/beam; reserve meaningful work only with new evidence.

## 7. Unrouted cheap capability

Confirmed: beam-routing **+20 net Corpus-2**; perimeter-beam recovered all 29 local targets; `STRATEGY_REPAIR_LATE_PROBE` promoted with **+19 net**, zero regressions. Remaining cheap beam wins span high-intersection and must-cross-heavy archetypes with no broadly covering config. Investigate rule-specific routing instead of appending generic beams.

## Promotion contract

Production-facing treatments must obey [`solver-level-blindness.md`](solver-level-blindness.md); freeze protocol/commit; use non-binding deadlines for deterministic budget comparisons; compare `workSpent`, nodes, solves, paired gains/losses, technique reach, errors, deadline truncation; include Corpus 1/2 and published transfer/cost evidence where relevant; separate exploratory from decision-bearing evidence; update queue/ledger/report when disposition changes.

## Closed forms

Do not repeat unchanged: universal beam widening; unconditional must-cross attraction/horizon; static repair-fallback reserve; blind late-tier carve-outs; plain extra plateaued-repair budget; main-loop-badness allocation; adaptive-shrink recovery; CP-SAT-free rollout proxy; repair plateau penalty; soft recombination; exact relinking; repair turn bias; admissible-order LDS; admissible-order density/profile reserve; broad cold-start portfolio scheduler.

A descendant is new only if mechanism or information boundary materially changes.

## Evidence map

- [`archive/snapshots/solver-optimization-current-queue-2026-08-20-post-1398.md`](archive/snapshots/solver-optimization-current-queue-2026-08-20-post-1398.md): late regression/provenance chronology and routing notes.
- [`archive/snapshots/solver-optimization-current-queue-2026-08-20.md`](archive/snapshots/solver-optimization-current-queue-2026-08-20.md): earlier chronology.
- [`../reports/2026-08-20-technique-census-reconciliation.md`](../reports/2026-08-20-technique-census-reconciliation.md), [`../reports/stress/technique-census/32240161854/`](../reports/stress/technique-census/32240161854/): census.
- [`../reports/2026-08-15-connectivity-axis-exhausted-regression.md`](../reports/2026-08-15-connectivity-axis-exhausted-regression.md): regression/beam history.
- [`winning-lineage-survival-analysis.md`](winning-lineage-survival-analysis.md): lineage observation.
- [`../reports/2026-08-12-repair-retreat-cpsat.md`](../reports/2026-08-12-repair-retreat-cpsat.md): exact repair-retreat evidence.
- [`variant-level-research.md`](variant-level-research.md): family/variant research.
- [`solver-research-operating-model.md`](solver-research-operating-model.md): method/evidence routing.

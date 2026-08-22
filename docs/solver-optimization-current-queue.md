# Solver optimization: current priority queue

> **Status:** canonical live entry point for tuning and optimizing existing solver techniques.
> **Last reconciled:** 2026-08-20, through PR #1398 and the subsequent audit refresh.
> **Scope:** improve cold, level-blind solve count or reduce machine-independent work without losing solved levels. Exact-level history may label research data but may not control a production solve.

This page defines **live solver work**. Detailed chronology is preserved in dated reports and two same-directory snapshots:

- [`solver-optimization-current-queue-2026-08-20-snapshot.md`](solver-optimization-current-queue-2026-08-20-snapshot.md): queue before the final 2026-08-20 regression/provenance work;
- [`solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md`](solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md): queue merged by PR #1398, including the full late-session chronology.

Broader deferred/reopen ideas: [`future-work.md`](future-work.md). Retained default-off mechanisms: [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md). Research method: [`solver-research-operating-model.md`](solver-research-operating-model.md).

## Current evidence reset

The 2026-08-20 technique census gave each technique 50,000,000 nodes over 879 then-unsolved Corpus-2 levels:

- isolated-technique union: **246/879** solves;
- **111** union solves within 1,000,000 nodes;
- plain repair: **119/879**, with **750/879** reaching 50M unsolved;
- repair-family variants supplied much more unique capability than admissible-order variants.

Keep these failure classes distinct:

1. **routing:** capable technique not offered enough relevant work;
2. **search quality:** technique gets substantial/full budget and still fails;
3. **representation/retention:** viable material generated but lost through score, deduplication, width, or related policy;
4. **regression:** comparable production solve previously succeeded and now fails;
5. **provenance/instrumentation:** stored evidence does not establish the claimed comparison.

The first beam-routing expansion produced **+20 net Corpus-2 solves (828→848; 21 gained / 1 understood loss)**. A follow-up perimeter-beam expansion recovered all 29 newly routed local targets. `STRATEGY_REPAIR_LATE_PROBE` was promoted to production default-ON 2026-08-21 after a same-commit deterministic A/B (GHA 32453248184 vs 32459711208, main@e5034e8c): Corpus-1 95→96, Corpus-2 863→881, +19 net with zero regressions on either corpus.

**Current-HEAD caveat:** PR #1398 fixed work accounting, concurrent solve-state isolation, retry-tier flag proxying, adaptive gate weighting, lifecycle telemetry, and repair/late-probe budget handling. Older population counts remain evidence for their recorded commits, not a current-HEAD baseline. Promotion or population claims touching these paths need a fresh matched baseline.

## Ranked queue

Stable priority numbers remain citeable. CLOSED or gate-complete rows are dispositions, not active work.

| Priority | Opportunity | State | Next decision-bearing step |
|---:|---|---|---|
| 0 | Regression/provenance re-derivation | **ACTIVE / EVIDENCE REPAIR** | Make provenance distinguish full-ladder production solves from isolated-technique tooling and account for force-enabled default-OFF experiments; then re-derive the residual regression population before building recovery mechanisms. |
| 1 | Failure-conditioned late-tier allocation | **CLOSED 2026-08-20** | None in the original form. Plain repair mostly fails even with a full isolated 50M-node budget. Search-quality changes are separate. |
| 2 | Beam score/retention at proven extinction boundaries | **ACTIVE RESEARCH** | Run held-out, family-namespaced K-vs-2K/descriptor tests across confirmed extinction cases at equal surrounding policy. |
| 3 | Canonical-inclusive family-boundary retest | **GATE COMPLETE 2026-08-15** | Use reproduced family boundaries only to nominate mechanism-specific work; do not rerun the gate unchanged. |
| 4 | CP-SAT-anchored deep repair editing | **ACTIVE RESEARCH** | Expand exact feasible/infeasible retreat boundaries; prototype deeper rollback/rebuild only after retreat depth is predictably state-conditioned. |
| 5 | State-conditioned must-cross anchoring | **ACTIVE RESEARCH** | Continue read-only prefix diagnostics; require repeated separation across unrelated levels/families before changing scoring. |
| 6 | Mechanics-conditioned admissible-order routing | **CLOSED NEGATIVE 2026-08-20** | None. The isolated census found too little unique admissible-order capability to justify meaningful reserve. |
| 7 | Cheap isolated-technique wins the ladder does not route to | **`STRATEGY_REPAIR_LATE_PROBE` PROMOTED 2026-08-21** | Investigate remaining high-intersection/must-cross-heavy beam gaps per archetype instead of adding broad configs. |

## 0. Regression and provenance integrity

Established from the late 2026-08-20 investigation:

- four beam-only losses were independently bisected to `dd001dd5c`, the beam-dedup key-width correctness fix; accept the search-order collateral rather than restore the broken key;
- `R02516` is explained by three individually sound must-cross forced-structure prunes (`PRUNE_MC_RESERVED_WALL`, `PRUNE_MC_FORCED_NEIGHBOR`, `PRUNE_MC_FORCED_FIRST_MOVE`) jointly removing its former winning branch;
- `R00632` was a false positive: its stored historical win used default-OFF `STRATEGY_REPAIR_TURN_BIAS`, unreachable by the normal production ladder;
- `R02900` exposed a broader attribution bug: `classifyProvenanceSource` labels a solver ID “production-solver” without proving the call used the full `solveLevel()` ladder. At its recorded-good commit, default `Solver.solve(level,{})` still failed after hundreds of millions of nodes, so the stored small isolated repair win is not regression evidence;
- `R03205` is now individually settled as the same attribution artifact: its recorded win (`gateKey` fixed, `forcing` object present, `randomSeed`/`seedSalt` fixed, identical `nodesExpanded:6792911` repeated verbatim across five separate commits) is the signature of a forced/anchored replay tool (e.g. `repair-direct-probe.mjs`, which bypasses `solveLevel`'s ladder by design), not a cold ladder win. Direct verification at the recorded-good commit (`86bdd133`) confirms this: an unconstrained `Solver.solve(level, {})` call there fails identically at ~20M nodes across three repeated deterministic runs — over 3x the win's claimed node count — so the cold ladder never actually had this capability at that commit;
- `R03329` is likewise settled as a non-regression on the same grounds: besides the same forced-replay `repair` signature seen in `R03205`, its only unforced-looking wins are `admissible-order` technique entries dated 2026-08-20, which line up with Priority 6's isolated technique-census sweep (explicitly out-of-ladder) rather than the production ladder;
- `R02424` and `R01229` remain plausible beam residuals matching the corrected beam-key-width signature, without independent bisection.

Therefore first fix the evidence contract to record enough invocation context to distinguish full production ladder, isolated-technique tooling, and force-enabled experimental flags; then re-mine the regression population. Do not build a recovery mechanism for the old “four repair regressions” category.

**New unbisected candidate population (2026-08-22):** [`../reports/2026-08-22-corpus2-node-budget-losses.md`](../reports/2026-08-22-corpus2-node-budget-losses.md) lists 73 Corpus-2 IDs solved on capability run `32459711208` (commit `e5034e8c`) but node-budget-exhausted on `32526927206` (commit `ce4fc98a`, post solver-authority-consolidation). All 73 fail identically (`node-budget-reached`, no crash); 57 of them had comfortable node margin on the prior run (one, `R02975`, solved in 8,486 nodes before and doesn't solve within 150M+ nodes now), which argues for a real regression rather than budget-boundary sensitivity. Four non-consolidation commits in range are the suspects (`0b2da5f` repair-late-probe promotion, `c4569ef` provenance fix, `6f00baf` buildDistMap fix, `d21b4fb` trap-search/pruning fixes) — not yet bisected. This population is separate from and not yet reconciled with the `R02516`/`R02900`/`R03205`/`R03329`/`R02424`/`R01229` items above.

Full chronology: [`solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md`](solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md).

## 1. Failure-conditioned late-tier allocation

**Closed as originally framed.** Full 50M-node isolated repair still leaves 750/879 levels unsolved. Ladder starvation exists, but more of the same repair search is not the answer. Future repair work should target search quality, operators, representation, or genuine routing gaps.

## 2. Beam score and representation

Exact-prefix work has found higher-ranked exact-dead material while lower-ranked material remains exact-live. Test representation/retention changes, not universal width increases. Use family-separated held-out cases at equal work and require repeated feasibility separation across unrelated parents.

## 3. Family-boundary gate

**Complete.** Controlled canonical/sibling comparisons remain useful diagnostics; do not repeat the original gate. The larger off-main trove is documented in [`variant-level-research.md`](variant-level-research.md) and is a research population, not a production rotate/retry mechanism.

## 4. Repair depth and operators

Blind rollout/escape proxies are closed. Expand exact CP-SAT retreat-feasibility labels before engineering a deeper prefix-edit operator.

## 5. State-conditioned must-cross anchoring

Unconditional attraction is closed. The open form uses live prefix state to choose target/defer/second-approach behavior. Start with diagnostics and require cross-level/family recurrence before changing scoring.

## 6. Admissible-order routing

**Closed negative for measured reserve/density forms.** The isolated census found very little unique `ida:*` capability relative to repair and beam. Do not reserve meaningful ladder work without new capability evidence.

## 7. Unrouted cheap capability

Strongest production-facing opportunity from the census, in two forms.

**Shipping/confirmation:**

- first beam-routing expansion: population-confirmed +20 net solves;
- perimeter-beam expansion: all 29 local newly routed targets recovered; still needs a decision-bearing population result on a current, correctly-accounted baseline;
- `STRATEGY_REPAIR_LATE_PROBE`: default-OFF, locally recovered 20/94 gate-excluded repair winners; regenerate promotion evidence on current HEAD because recent `workCap` and eligibility fixes touch this path.

**Next research population:** remaining cheap unrouted beam wins cluster in high-intersection-burden and must-cross-heavy levels across several existing archetype rules. No single missing config covers more than a handful. Investigate routing per rule rather than broadly appending beam configs.

## Promotion contract

Every production-facing treatment must:

- obey [`solver-level-blindness.md`](solver-level-blindness.md);
- freeze protocol and persistent commit before execution;
- use non-binding wall deadlines when deterministic budget comparison matters;
- compare machine-independent `workSpent` with nodes and solve count;
- report paired gains, losses, technique reach, errors, and deadline truncation;
- include Corpus 1, Corpus 2, and published transfer/cost evidence where appropriate;
- distinguish exploratory diagnostics from decision-bearing population evidence;
- update this queue and the relevant ledger/report when disposition changes.

## Closed forms that must stay visible

Do not repeat unchanged: universal beam widening; unconditional must-cross attraction/horizon; static repair-fallback reserve; blind late-tier carve-outs; plain extra repair budget for plateaued repair; main-loop-badness-gated allocation; adaptive-shrink recovery; CP-SAT-free rollout proxy; repair plateau penalty; soft recombination; exact relinking; repair turn bias; admissible-order LDS; admissible-order density/profile reserve; broad cold-start portfolio scheduler.

A nearby idea is new only when its mechanism or information boundary materially changes.

## Evidence map

- [`solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md`](solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md): latest-main queue before this compaction; strongest source for late regression/provenance chronology and routing notes.
- [`solver-optimization-current-queue-2026-08-20-snapshot.md`](solver-optimization-current-queue-2026-08-20-snapshot.md): earlier 2026-08-20 queue chronology.
- [`../reports/2026-08-20-technique-census-reconciliation.md`](../reports/2026-08-20-technique-census-reconciliation.md): population census reconciliation.
- [`../reports/stress/technique-census/32240161854/`](../reports/stress/technique-census/32240161854/): generated census artifacts.
- [`../reports/2026-08-15-connectivity-axis-exhausted-regression.md`](../reports/2026-08-15-connectivity-axis-exhausted-regression.md): regression/beam threshold history.
- [`winning-lineage-survival-analysis.md`](winning-lineage-survival-analysis.md): lineage observation contract.
- [`../reports/2026-08-12-repair-retreat-cpsat.md`](../reports/2026-08-12-repair-retreat-cpsat.md): exact repair-retreat evidence.
- [`variant-level-research.md`](variant-level-research.md): family/variant trove and research discipline.
- [`solver-research-operating-model.md`](solver-research-operating-model.md): research method and evidence routing.
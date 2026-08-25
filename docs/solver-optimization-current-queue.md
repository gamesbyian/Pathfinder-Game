# Solver optimization: current priority queue

> **Status:** canonical live entry point for solver capability and efficiency research.
> **Reconciled:** 2026-08-25 after the 976/1700 capability refresh, independent scheduler confirmation, post-976 portfolio exposure rejoin, locked-cohort, beam survivor-selection, reference-model, restart/learned-failure, repair, speed, and corrected lifecycle-attribution evidence.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

This file owns **rank, state, and next gate**. Detailed reasoning belongs in linked docs/reports.

Primary authorities: research method [`solver-research-operating-model.md`](solver-research-operating-model.md); scheduling/allocation [`solver-scheduling-policy.md`](solver-scheduling-policy.md); residual representation [`solver-residual-state-representation.md`](solver-residual-state-representation.md); deterministic cost [`solver-budget-determinism.md`](solver-budget-determinism.md); level-blindness [`solver-level-blindness.md`](solver-level-blindness.md); retained opt-ins [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md); deferred/reopen ideas [`solver-future-work.md`](solver-future-work.md).

## Queue-wide rules

Every active item follows **premise → smallest value-of-information pilot → explicit success/stop gate → bounded implementation → confirmation → broader integration**.

- Higher-ranked evidence blockers outrank easier lower-ranked implementations.
- Use `workSpent` for cross-technique allocation; raw nodes are within-technique diagnostics.
- New actions/configs expand the menu, not the default total budget.
- Additive late work is not free merely because earlier winners cannot regress.
- Selected/tuned treatments need independent confirmation before broad promotion claims.
- Level-blindness is not generalization; proxy improvement is not cold solve/work/correctness improvement.
- Timeout/censoring, natural exhaustion, unsupported/UNKNOWN, and proof of infeasibility are distinct.
- A clear negative closes the tested form unless materially new evidence changes its premise.
- Major capability refreshes should emit an output-only delta digest: gain/loss IDs, winner stage/action, per-level work/attempt deltas, and aggregate work split across prior solves/new solves/still-unsolved. See [`976 reconciliation`](../reports/2026-08-25-capability-sweep-976-reconciliation.md).

## Ranked queue

| # | Opportunity | State | Next gate |
|---:|---|---|---|
| 0 | Automatic configuration / portfolio construction | **ASAP / RESIDUAL EXPOSURE HEADROOM POSITIVE** | Post-976 rejoin: among 724 current misses, **139** retain an observed unablated singleton census solver; actionability-first classes are **73 not offered**, **57 offered but starved**, **9 offered adequately but no longer replaying**. First execution gate: same-revision strict-67M development A/B that, only inside the two existing very-high-intersection policy bundles, exposes trailing `beam:intersectionHarvest@beam5000(diverse)` where the current must-cross gate suppresses it. Do not change beam semantics, depth, or any other policy in the same treatment. [`post-976 rejoin`](../reports/2026-08-25-post-976-portfolio-exposure-rejoin.md), [`scheduling policy`](solver-scheduling-policy.md) |
| 1 | Evidence-driven scheduler and fixed-work portfolio repricing | **STATIC GLOBAL SUPPRESSION CLOSED; ALLOCATION PREMISE RETAINED** | Development A/B `32901181013` was +1/0, but independent sealed-cohort confirmation `32908734154` was **140/256 → 141/256 with +3/-2 and only 0.22% lower work**, failing the frozen zero-loss gate. Close this exact two-DFS global suppression and do not tune on `C00108`, `C00197`, `C00252`, `C00092`, or `C00212`. Allocation remains relevant, but next evidence should be selective/contextual under #0 or equal-work continuation under #3. Dynamic scheduler machinery remains closed. [`static repricing join`](../reports/2026-08-25-scheduler-static-repricing-join.md) |
| 2 | Generalization and holdout discipline | **ACTIVE / CONFIRM-BROAD-001 SPENT CLEANLY** | The sealed-cohort workflow successfully exercised one-use confirmation: one cohort materialized once, shared by all arms, hash-verified before search, and judged by the frozen criterion before changed IDs were inspected. `confirm-broad-001` is spent; do not retune or rerun on it. `transfer-envelope-001` was not earned by the failed treatment and remains untouched. [`cohort reservation`](../reports/2026-08-24-solver-confirmation-transfer-cohort-reservation.md) |
| 3 | Restart/randomization and learned-failure search | **HIGH PRIORITY / EQUAL-WORK RESTART GATE** | Restart: expose/reuse an arm-level canonical-`workSpent` cap and compare seed 0 continued to `W` with seed 0 to `W/2` + fresh seed 1 to `W/2`. Existing additive multi-seed repair gains motivate this test but do not answer it. Learned failure remains a shadow gate: Stage A logs already-known connectivity rejection subtype/context with no second flood fill; only a positive Stage A earns richer sketches. [`restart audit`](../reports/2026-08-24-restart-continuation-value-audit.md), [`learned-failure audit`](../reports/2026-08-24-learned-failure-certificate-audit.md) |
| 4 | Beam score/retention at proven extinction boundaries | **SCOPED QUOTA GATE NEGATIVE / NO INTERVENTION** | Keep the tested fixed-width quota/bucketing form closed. The 976 sweep and post-976 rejoin validate offering/routing existing beam identities, not new survivor-selection machinery. Reopen only with materially new independent evidence for a cheap descriptor or different bounded mechanism. [`projection`](../reports/2026-08-25-beam-full-pool-survivor-projection.md), [`post-976 rejoin`](../reports/2026-08-25-post-976-portfolio-exposure-rejoin.md) |
| 5 | Exact/reference-model program | **BOUNDED INFRASTRUCTURE / MATRIX CLOSED** | Do not expand validation generically. Buy a small landmark under-constraint/referee suite only when a ranked exact query depends on those semantics; otherwise use CP-SAT for a concrete ranked label/counterexample/certificate. [`reference-model audit`](../reports/2026-08-23-solver-reference-model-capability-audit.md) |
| 6 | Repair reachability/reconstructability | **ACTIVE, SECONDARY / ALLOCATION QUESTIONS MOVED UPSTREAM** | Do not infer “build a bigger repair operator” from the 45 new repair wins. Allocation/access/seed-continuation questions now live under #0/#3. Here, do not repeat `R00648`; classify remaining exact-live retreat cases with named existing operators under canonical `workSpent`. Large destroy/core-guided work still requires recurrent deep-retreat or reconstructability evidence. [`repair audit`](../reports/2026-08-24-repair-reachability-reconstructability-audit.md), [`976 reconciliation`](../reports/2026-08-25-capability-sweep-976-reconciliation.md) |
| 7 | Architectural speed and execution substrate | **ACTIVE SUPPORTING PROGRAM** | Re-profile current HEAD after the August 23 speed stack. Native/WASM remains closed for the broad per-candidate boundary; if scoring/candidate generation still dominates, run one bounded specialized-JS scorer pilot. [`speed audit`](../reports/2026-08-24-speed-substrate-static-audit.md), [`speed reference`](solver-architectural-speed-opportunities.md) |
| 8 | Remaining cheap isolated capability missed by production | **SUBSUMED BY #0; MEASURED** | The post-976 rejoin now quantifies this seam. Keep isolated winners as action-selection evidence and feed them into exposure/depth pilots; do not append a permanent tail solely because an isolated winner exists. [`post-976 rejoin`](../reports/2026-08-25-post-976-portfolio-exposure-rejoin.md) |

## Closed evidence blocker: alleged cross-stage admissible dependence

The former P0 is retired. Immutable run `32459711208` shows the eight rows previously attributed to `admissible-order` were solved by later diverse-beam retry stages. The lifecycle reducer had a stale hard-coded stage list and therefore mislabeled later wins as the last older stage it knew about. The T1 promoted retry variants also tested plain 5K beams, not the exact diverse-beam + retry-override production configurations. There is no matched evidence from those rows for deterministic predecessor dependence. See [`reverse-oracle diagnosis`](../reports/2026-08-22-technique-census-reverse-oracle-diagnosis.md).

Do not resume MP/MC memo archaeology from this evidence. If a future same-action, same-resource fresh-versus-preceded discrepancy appears, use the bounded paired deterministic trace and first verify the execution contract before treating it as semantic carryover.

## Cross-item guardrails

- **Scheduler/configuration:** global suppression of ordinary-main-loop `dfs:objectiveFirst` + `dfs:intersectionHarvest` is closed after independent confirmation lost two solves. Do not condition or retune that treatment on the spent holdout. Dynamic scheduling remains closed.
- **Generalization:** reserved cohorts are one-use evidence. `confirm-broad-001` is spent. Once exact failures influence redesign, reclassify/replenish rather than repeatedly peeking.
- **Portfolio:** the post-976 join has separated absent exposure, starvation, and adequate-depth non-replay. Race one cheap missing beam action first; do not combine exposure, depth, and selector tuning in the same pilot.
- **Beam:** the tested low-cardinality quota keys remain negative at captured extinction pools. New beam solves from newly offered existing configs do not reopen that mechanism, and the near-depth residual subset does not justify universal beam widening.
- **Reference model:** validate both directions when relevant: known-valid witness → model feasible, and model-emitted witness → canonical referee valid. UNKNOWN/timeout/unsupported never become dead/UNSAT.
- **Restarts:** existing multi-seed gains are additive-budget evidence, not proof that restarting beats continuing at equal work.
- **Learned failure:** repair-local dead-end memory is experience reuse, not global UNSAT proof. Generic CDCL/nogood infrastructure remains unjustified without a recurring cheap sound reason family.
- **Repair:** exact-live can still be reconstruction-hard. Retreat depth and reconstruction ability are separate questions; allocation wins belong upstream, not as evidence for a new large repair operator.
- **Speed:** implementation speed and search policy are separate. Reopen native/WASM only if a compact boundary emerges.

## Common closed forms

Do not reopen unchanged merely because code/reports survive: the independently rejected global two-DFS suppression; generic repair-budget increases; coarse repair-gate widening; universal beam-width increases; the tested low-cardinality beam quota/bucketing keys; broad novelty/MAP-Elites/DPP machinery before a cheap descriptor earns it; production ZDD/DD/frontier or generic resource-automaton frameworks before a bounded interface earns them; generic DFS/beam transposition caching; broad CDCL/LCG/MUS machinery; ordinary “less resource used is better” dominance for exact targets; symmetry retries as a substitute for diagnosing representation bias; dynamic scheduler machinery before a selective fixed-work treatment earns it; bulk variant generation without a specific unanswered question.

Use [`solver-future-work.md`](solver-future-work.md), [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md), and dated reports for dispositions and reopen conditions.

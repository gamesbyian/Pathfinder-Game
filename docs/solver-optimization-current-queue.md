# Solver optimization: current priority queue

> **Status:** canonical live entry point for solver capability and efficiency research.
> **Reconciled:** 2026-08-25 after current fixed-work scheduler materialization/tail audit, locked-cohort, beam full-pool survivor projection, reference-model, restart/learned-failure, repair, and speed audits.
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

## Ranked queue

| # | Opportunity | State | Next gate |
|---:|---|---|---|
| 0 | Unexplained cross-stage dependence | **P0 BLOCKER** | Reproduce one fresh-vs-preceded admissible-order case under an identical action/resource contract. Compare resource/accounting/config context, then initial admissible child ordering. If ordering differs, clear MP/MC lower-bound memos first; otherwise trace the first later tree divergence. [`reverse-oracle diagnosis`](../reports/2026-08-22-technique-census-reverse-oracle-diagnosis.md) |
| 1 | Evidence-driven scheduler and fixed-work portfolio repricing | **ASAP / CURRENT DATA MATERIALIZED; JOIN/STATIC-BASELINE GATE** | The 60-level strict-67M development sample materializes the current rich action/work/outcome schema and shows main-loop + repair-probe consume 81.3% of work and produce 38/40 solves while many later retries are starved. Join the heavy comparable current actions to frozen census cap/tranche evidence, exclude P0-sequence-ambiguous admissible cells from the conservative frontier, and test one simple deterministic static repricing before dynamic/survival/bandit machinery. [`current tail audit`](../reports/2026-08-25-current-fixed-work-scheduler-tail-audit.md), [`scheduler audit`](../reports/2026-08-24-scheduler-evidence-contract-audit.md) |
| 2 | Generalization and holdout discipline | **ASAP / COHORTS RESERVED + LOCKED** | Keep `confirm-broad-001` and `transfer-envelope-001` unmaterialized until treatment/work/acceptance are frozen. Materialize only from pinned revision `4f2b2b143ee2bc194b8e017fcc59a680b9ee8d92`; use transfer only after confirmation succeeds. [`cohort reservation`](../reports/2026-08-24-solver-confirmation-transfer-cohort-reservation.md) |
| 3 | Automatic configuration / portfolio construction | **HIGH PRIORITY RESEARCH** | Reuse stable action/config identities. First measure fixed-envelope headroom in the existing action grammar; race/prune actions before refining weights/widths/thresholds inside surviving families. [`scheduling policy`](solver-scheduling-policy.md) |
| 4 | Beam score/retention at proven extinction boundaries | **SCOPED QUOTA GATE NEGATIVE / NO INTERVENTION** | The 207-pool fixed-width projection found no exact-live rescue from baseline, +MustPass, +adjacent-turn, or +MustCross-first-pass bucket keys. Stop this quota/bucketing form; reopen only with materially new independent evidence for a cheap descriptor or different bounded survivor mechanism. [`projection`](../reports/2026-08-25-beam-full-pool-survivor-projection.md), [`descriptor sanity check`](../reports/2026-08-24-beam-extinction-descriptor-sanity-check.md) |
| 5 | Exact/reference-model program | **BOUNDED INFRASTRUCTURE / MATRIX CLOSED** | Do not expand validation generically. Buy a small landmark under-constraint/referee suite only when a ranked exact query depends on those semantics; otherwise use CP-SAT for a concrete ranked label/counterexample/certificate. [`reference-model audit`](../reports/2026-08-23-solver-reference-model-capability-audit.md) |
| 6 | Restart/randomization and learned-failure search | **HIGH PRIORITY / EXECUTION + SHADOW GATES** | Restart: first expose/reuse an arm-level canonical-`workSpent` cap, then compare seed 0 continued to `W` with seed 0 to `W/2` + fresh seed 1 to `W/2`. Learned failure: Stage A logs already-known connectivity rejection subtype/context with no second flood fill; only a positive Stage A earns boundary/component sketches. [`restart audit`](../reports/2026-08-24-restart-continuation-value-audit.md), [`learned-failure audit`](../reports/2026-08-24-learned-failure-certificate-audit.md) |
| 7 | Repair reachability/reconstructability | **ACTIVE, SECONDARY / ONE HARD-LIVE CASE CONFIRMED** | Do not repeat `R00648`. Classify remaining exact-live retreat cases with named existing operators under canonical `workSpent`; use `R03176` only as contrasting whole-repair success. Large destroy/core-guided work still requires recurrent deep-retreat evidence. [`repair audit`](../reports/2026-08-24-repair-reachability-reconstructability-audit.md) |
| 8 | Architectural speed and execution substrate | **ACTIVE SUPPORTING PROGRAM** | Re-profile current HEAD after the August 23 speed stack. Native/WASM remains closed for the broad per-candidate boundary; if scoring/candidate generation still dominates, run one bounded specialized-JS scorer pilot. [`speed audit`](../reports/2026-08-24-speed-substrate-static-audit.md), [`speed reference`](solver-architectural-speed-opportunities.md) |
| 9 | Remaining cheap isolated capability missed by production | **SUBSUMED BY SCHEDULER** | Keep isolated winners as action/scheduler evidence; do not append a permanent tail solely because an isolated winner exists. |

## Cross-item guardrails

- **P0:** do not hide stage dependence by always priming predecessor work. Either remove accidental leakage or define and charge an intentional typed handoff.
- **Scheduler/configuration:** current rich attempt rows are now materialized on a strict fixed-work development sample. The immediate gap is joining/pricing the heavy comparable actions against frozen census/tranche evidence and testing a simple static repricing, not telemetry redesign or dynamic scheduler machinery.
- **Generalization:** the reserved cohorts are one-use evidence. Once exact failures influence redesign, reclassify/replenish rather than repeatedly peeking.
- **Beam:** the tested low-cardinality quota keys are now negative at the captured extinction pools. Some keys distinguish selected dead/live pairs, but none retained the available exact-live alternatives at fixed width; do not add fields until one fits these parents.
- **Reference model:** validate both directions when relevant: known-valid witness → model feasible, and model-emitted witness → canonical referee valid. UNKNOWN/timeout/unsupported never become dead/UNSAT.
- **Restarts:** existing multi-seed gains are additive-budget evidence, not proof that restarting beats continuing at equal work.
- **Learned failure:** repair-local dead-end memory is experience reuse, not global UNSAT proof. Generic CDCL/nogood infrastructure remains unjustified without a recurring cheap sound reason family.
- **Repair:** exact-live can still be reconstruction-hard. Retreat depth and reconstruction ability are separate questions.
- **Speed:** implementation speed and search policy are separate. Reopen native/WASM only if a compact boundary emerges.

## Common closed forms

Do not reopen unchanged merely because code/reports survive: generic repair-budget increases; coarse repair-gate widening; universal beam-width increases; the tested low-cardinality beam quota/bucketing keys; broad novelty/MAP-Elites/DPP machinery before a cheap descriptor earns it; production ZDD/DD/frontier or generic resource-automaton frameworks before a bounded interface earns them; generic DFS/beam transposition caching; broad CDCL/LCG/MUS machinery; ordinary “less resource used is better” dominance for exact targets; symmetry retries as a substitute for diagnosing representation bias; dynamic scheduler machinery before simple fixed-work repricing shows headroom; bulk variant generation without a specific unanswered question.

Use [`solver-future-work.md`](solver-future-work.md), [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md), and dated reports for dispositions and reopen conditions.

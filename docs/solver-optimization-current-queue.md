# Solver optimization: current priority queue

> **Status:** canonical live entry point for solver capability and efficiency research.
> **Reconciled:** 2026-08-26 after the near-miss restart-vs-continuation development pilot (item #0), following the 2026-08-25 976/1700 capability refresh, corrected lifecycle attribution, scheduler development/confirmation, post-976 portfolio rejoin, selective diverse-IH development/confirmation, holdout lifecycle, restart/learned-failure, beam, repair, reference-model, and speed audits.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

This file owns **rank, state, and next gate**. Detailed reasoning belongs in linked docs/reports.

Primary authorities: research method [`solver-research-operating-model.md`](solver-research-operating-model.md); scheduling/allocation [`solver-scheduling-policy.md`](solver-scheduling-policy.md); residual representation [`solver-residual-state-representation.md`](solver-residual-state-representation.md); deterministic cost [`solver-budget-determinism.md`](solver-budget-determinism.md); level-blindness [`solver-level-blindness.md`](solver-level-blindness.md); retained opt-ins [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md); deferred/reopen ideas [`solver-future-work.md`](solver-future-work.md).

## Queue-wide rules

Every active item follows **premise → smallest value-of-information pilot → explicit success/stop gate → bounded implementation → confirmation → broader integration**.

- Use `workSpent` for cross-technique allocation; raw nodes are within-technique diagnostics.
- New actions/configs expand the menu, not the default total budget.
- Selected/tuned treatments need independent confirmation before broad promotion claims.
- Level-blindness is not generalization.
- A clear negative closes the tested form unless materially new evidence changes its premise.
- Confirmation cohorts are one-use evidence. Once their exact rows influence design, do not recycle them as fresh confirmation.
- Major capability refreshes should emit an output-only delta digest: gain/loss IDs, winner stage/action, per-level work/attempt deltas, and aggregate work split across prior solves/new solves/still-unsolved.

## Ranked queue

| # | Opportunity | State | Next gate |
|---:|---|---|---|
| 0 | Restart/randomization and learned-failure search | **NAIVE 50/50 TWO-SEED RESTART CLOSED (near-miss stratum, development evidence); LEARNED-FAILURE STILL OPEN** | Execution-readiness harness built and validated (`modules/solver/restart-continuation-harness.ts`, `repair-direct-probe.mjs --work-budget`). The prespecified primary comparison then ran on a 20-level near-miss residual stratum (census-unsolved, `bestBadness<=6`) at `W=16,000,000`: 0/20 solved in both arms (a tie, satisfying the audit's own "matches or beats" stop gate), and restart reached measurably worse best-badness than continuation on 18/20 levels (mean +7.3, median +5) — a reproducible, one-sided pattern consistent with repair's elite-pool/splice machinery losing its accumulated progress on a fresh seed. Close the naive two-seed 50/50 split for this stratum/budget; do not rescue it with nearby seed counts/splits without new evidence. Open: an *unequal* split (small tail seed, not 50/50), a much larger `W`, and learned-failure search remain untested. [`restart audit`](../reports/2026-08-24-restart-continuation-value-audit.md), [`execution-readiness harness`](../reports/2026-08-26-restart-continuation-execution-readiness.md), [`near-miss development pilot`](../reports/2026-08-26-restart-vs-continuation-near-miss-development-pilot.md), [`learned-failure audit`](../reports/2026-08-24-learned-failure-certificate-audit.md) |
| 1 | Automatic configuration / portfolio construction | **HIGH PRIORITY / HEADROOM REAL, TWO MINED TREATMENTS CLOSED** | Post-976 rejoin still shows **73 not-offered**, **57 starved**, and **9 adequate-depth non-replay** current misses with an observed isolated base solver. But the selective diverse-IH treatment chosen from this mined seam was +9/-0 on Corpus 2 and 0/0 on fresh `confirm-broad-002`, so close that exact rule. Any next portfolio pilot must be newly prespecified, one-dimensional, fixed-envelope, and independently confirmed. [`post-976 rejoin`](../reports/2026-08-25-post-976-portfolio-exposure-rejoin.md), [`976 reconciliation`](../reports/2026-08-25-capability-sweep-976-reconciliation.md) |
| 2 | Evidence-driven scheduler and fixed-work repricing | **GLOBAL TWO-DFS SUPPRESSION CLOSED; ALLOCATION PREMISE RETAINED** | Development `32901181013` was +1/-0, but sealed `confirm-broad-001` was +3/-2 and failed the zero-loss gate. Do not tune on those holdout rows. Reopen scheduler work only through narrower contextual treatments or after equal-work continuation evidence establishes a stronger allocation signal. Dynamic scheduler machinery remains closed. [`static repricing join`](../reports/2026-08-25-scheduler-static-repricing-join.md) |
| 3 | Generalization and holdout discipline | **ACTIVE / TWO BROAD COHORTS SPENT CLEANLY; TRANSFER UNTOUCHED** | `confirm-broad-001` and `confirm-broad-002` each completed as sealed single-materialization cohorts with frozen verdicts before row inspection. Both rejected development-positive treatments. Do not reuse them as fresh holdouts. `transfer-envelope-001` remains untouched because neither candidate earned transfer. Reserve a fresh successor before the next candidate reaches confirmation. [`cohort reservation`](../reports/2026-08-24-solver-confirmation-transfer-cohort-reservation.md) |
| 4 | Beam score/retention at proven extinction boundaries | **SCOPED QUOTA GATE NEGATIVE / NO INTERVENTION** | Keep the tested fixed-width quota/bucketing form closed. The 976 gains support routing existing beam identities, not new survivor-selection machinery. Reopen only with materially new independent evidence for a bounded retention mechanism. [`projection`](../reports/2026-08-25-beam-full-pool-survivor-projection.md) |
| 5 | Exact/reference-model program | **BOUNDED INFRASTRUCTURE / MATRIX CLOSED** | Use CP-SAT/reference work only for a concrete ranked label, counterexample, or certificate. Do not expand validation generically. [`reference-model audit`](../reports/2026-08-23-solver-reference-model-capability-audit.md) |
| 6 | Repair reachability/reconstructability | **ACTIVE, SECONDARY** | Allocation/access/seed-continuation questions live upstream under #0/#1. Here, do not repeat `R00648`; classify remaining exact-live retreat cases with existing operators under canonical work. Large destroy/core-guided work still requires recurrent reconstructability evidence. [`repair audit`](../reports/2026-08-24-repair-reachability-reconstructability-audit.md) |
| 7 | Architectural speed and execution substrate | **ACTIVE SUPPORTING PROGRAM** | Re-profile current HEAD after the August speed stack. Native/WASM remains closed for the broad per-candidate boundary; if scoring/candidate generation dominates, run one bounded specialized-JS scorer pilot. [`speed audit`](../reports/2026-08-24-speed-substrate-static-audit.md) |
| 8 | Remaining cheap isolated capability missed by production | **SUBSUMED BY #1; MEASURED** | Keep isolated winners as action-selection evidence. Do not append a permanent tail solely because an isolated winner exists. [`post-976 rejoin`](../reports/2026-08-25-post-976-portfolio-exposure-rejoin.md) |

## Closed evidence blocker: alleged cross-stage admissible dependence

The former P0 is retired. Immutable run `32459711208` shows the eight rows previously attributed to `admissible-order` were actually later diverse-beam retry wins; the lifecycle reducer had a stale hard-coded stage list. Do not resume MP/MC memo archaeology from this evidence. If a future same-action, same-resource fresh-versus-preceded discrepancy appears, use the paired deterministic trace contract first.

## Cross-item guardrails

- **Scheduler:** global suppression of ordinary-main-loop `dfs:objectiveFirst` + `dfs:intersectionHarvest` is closed after independent confirmation lost two solves.
- **Portfolio:** selective diverse-IH exposure for the two very-high-intersection bundles is closed as a general promotion candidate after a null fresh confirmation.
- **Generalization:** `confirm-broad-001` and `confirm-broad-002` are spent. `transfer-envelope-001` is still pristine.
- **Beam:** routing/exposure evidence does not reopen the negative quota/bucketing result or justify universal widening.
- **Restarts:** additive multi-seed gains are not proof that restart beats continuation at equal work. Now measured on a near-miss residual stratum: naive two-seed 50/50 restart is a tie-or-loss against continuation (0/20 solved both; restart's best-badness worse on 18/20), closed for that stratum/budget — see the 2026-08-26 development pilot.
- **Learned failure:** generic CDCL/LCG/nogood infrastructure remains unjustified without a recurring cheap sound reason family.
- **Repair:** exact-live can still be reconstruction-hard; retreat depth and reconstruction ability are separate questions.
- **Speed:** implementation speed and search policy remain separate.

## Common closed forms

Do not reopen unchanged merely because code/reports survive: the independently rejected global two-DFS suppression; the selectively exposed diverse-IH rule tested in `32911007113`/`32912881453`; generic repair-budget increases; coarse repair-gate widening; universal beam-width increases; the tested low-cardinality beam quota/bucketing keys; broad novelty/MAP-Elites/DPP machinery before a cheap descriptor earns it; generic DFS/beam transposition caching; broad CDCL/LCG/MUS machinery; ordinary “less resource used is better” dominance for exact targets; symmetry retries as a substitute for diagnosing representation bias; dynamic scheduler machinery before simpler fixed-work evidence earns it; bulk variant generation without a specific unanswered question; the naive two-seed 50/50 restart-at-`W/2` split on the near-miss residual stratum (development-closed 2026-08-26 — an unequal split or a much larger `W` is a different, still-open treatment, not a rescue of this one).

Use [`solver-future-work.md`](solver-future-work.md), [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md), and dated reports for dispositions and reopen conditions.

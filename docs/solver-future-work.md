# Solver future work

Deferred/reopen ideas that are **not current execution priority**. Current execution priority lives in [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); research rules in [`solver-research-operating-model.md`](solver-research-operating-model.md); retained default-OFF dispositions in [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md).

Historical ledger: [`archive/snapshots/future-work-2026-08-20.md`](archive/snapshots/future-work-2026-08-20.md). Prior evidence: [`../reports/README.md`](../reports/README.md) or `node scripts/research-status-index.mjs --compact --query=<term>`.

## Active elsewhere, not backlog

Do not recreate these programs here; the workstream authority owns their execution priority.

| Topic | Current authority |
|---|---|
| Generalization / confirmation blocks / cross-generator challenge | [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md); [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); historical [`cohort reservation`](../reports/2026-08-24-solver-confirmation-transfer-cohort-reservation.md) |
| Automatic solver action selection | [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); [`solver-scheduling-policy.md`](solver-scheduling-policy.md) |
| Technique census / niche cross-evidence analysis | [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md)'s standing capability-map rule; [`technique-census-analysis.md`](technique-census-analysis.md); [`2026-09-04 cross-evidence plan`](../reports/2026-09-04-census-cross-evidence-research-plan.md) |
| Beam retention at exact extinction boundaries | [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); [`beam descriptor audit`](../reports/2026-08-24-beam-extinction-descriptor-sanity-check.md) |
| Exact/reference-model program | [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); [`reference-model audit`](../reports/2026-08-23-solver-reference-model-capability-audit.md) |
| Restart allocation / learned failure | [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); [`restart audit`](../reports/2026-08-24-restart-continuation-value-audit.md), [`learned-failure audit`](../reports/2026-08-24-learned-failure-certificate-audit.md) |
| Repair reachability / reconstructability | [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); [`repair audit`](../reports/2026-08-24-repair-reachability-reconstructability-audit.md) |
| Architectural speed | [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md) |

## Entry contract

An item here is a question, not authorization to build a framework. Before substantial implementation, name:

1. the limitation/evidence that motivates it;
2. the cheapest pilot that could falsify it;
3. the comparator and shared-work contract where search policy changes;
4. success and stop gates;
5. how any positive offline result could become legal level-blind production behavior.

Check current code, queue, ledger, [`tooling-catalog.md`](tooling-catalog.md), and prior evidence first. If an idea becomes active workstream work, move its live gate to the queue/current topic doc and leave chronology in reports.

## Deferred representation / search-quality questions

### Promoted residual/search-quality gates

Residual opportunity beyond current prunes and state-conditioned MustCross diagnosis now have live gates in [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md). Residual interfaces/bounded future models remain conditional there on first finding a recurring compact interface; do not build framework machinery in advance.

### Census cross-evidence reservoir

The refreshed-census program is active as a **standing evidence layer**, not a numbered workstream. Its immediate analytical gates are owned by [`2026-09-04-census-cross-evidence-research-plan.md`](../reports/2026-09-04-census-cross-evidence-research-plan.md): restore refreshed analytical parity/temporal stability first, then test solution-space structure and current production-response joins before escalating to controlled variants or traces.

Keep these broader questions deferred until those cheaper gates nominate a recurring mechanism:

- four-space triangulation across input geometry, solution-space structure, technique-response vectors, and live search/failure trajectories;
- capability multiplicity as a predictor of variant-family robustness (the **temporal and budget-edge clauses are answered**: old-census `solverCount` strongly and monotonically predicts both whether a level stays oracle-solvable across a refresh — 34.3% singleton→zero-solvers vs. 0.3% at solverCount 11+ — and how much margin its cheapest known solve has under the census node budget — 15.4% of singletons use over half the budget vs. 0.0% at solverCount 6+; further refined by technique family — DFS-singleton claims lose support at ~2x beam's rate, admissible-order-singleton claims essentially never lose it in this sample. See [`2026-09-04-capability-multiplicity-temporal-robustness-001.md`](../reports/2026-09-04-capability-multiplicity-temporal-robustness-001.md), [`2026-09-04-capability-multiplicity-budget-edge-robustness-001.md`](../reports/2026-09-04-capability-multiplicity-budget-edge-robustness-001.md), [`2026-09-04-singleton-fragility-by-technique-family-001.md`](../reports/2026-09-04-singleton-fragility-by-technique-family-001.md). The variant-family clause remains untested — the current census carries no `familyId`/`parentId` data to join against; do not re-run the temporal/budget-edge joins, a variant-family-specific data source would be needed instead. Multiplicity also predicts real *production* success, not just isolated-census self-consistency — 6.1% at solverCount=0 up to 99.5% at 11+ on a fresh 1,700-level run — see [`2026-09-04-census-multiplicity-predicts-production-success-001.md`](../reports/2026-09-04-census-multiplicity-predicts-production-success-001.md));
- stability-aware portfolios balancing work, current coverage, temporal retention, parent robustness, and solution-basin diversity;
- latent response dimensions/biclusters only if simpler pair/cohort analysis leaves repeatable unexplained structure;
- forced-decision/backdoor-depth analysis using existing hint-workbench provenance;
- generator- and editor-envelope-specific technique niches before making broad capability claims (the coarse corpus1-vs-corpus2 axis is now answered — corpus1 solves 96.1% overall with 97% of solves from just `main-ladder`+`early-repair-search`, vs. corpus2's 57.4%/78.9% — see [`2026-09-04-corpus1-corpus2-stage-share-comparison-001.md`](../reports/2026-09-04-corpus1-corpus2-stage-share-comparison-001.md); a true generator/editor field remains absent from the census, so finer envelopes than corpus1-vs-corpus2 are still untested. Routing regime specifically was checked as a candidate structural predictor of late-ladder-stage reliance and found **not** predictive (5.07-5.75% across three of four regimes) — see [`2026-09-04-routing-regime-late-stage-reliance-null-001.md`](../reports/2026-09-04-routing-regime-late-stage-reliance-null-001.md));
- minimal technique-niche counterexamples via reducer + exact/reference validation.

**Stop:** if the refreshed parity, solution-profile, or production-response joins do not expose a compact recurring distinction, leave these as diagnostics. Do not launch bulk variant/profile generation or a large feature-model project to force a signal.

## Deferred interoperability / infrastructure

### Typed producer → consumer artifacts

One stage may sometimes discover information another cannot cheaply reproduce, such as proven dead interfaces, exact-live descriptors, scarcity signals, or structural certificates. Do not build a general blackboard.

A handoff must demonstrate consumer limitation, novel timely information, bounded production/storage/replay cost, independent control, positive shadow evidence, and matched-work benefit. Charge artifact production and consumption.

**Stop:** if the consumer can cheaply rediscover the information, it arrives too late, or consumption displaces better search, keep stages independent.

### Queryable analytical layer

Build a new analytical store only if joins among run identity, attempt telemetry, static features, families, oracle labels, and experiment arms continue spawning bespoke scripts after existing census/lifecycle helpers are extended.

Any generated views must be rebuildable from canonical evidence/manifests and must not become a second production-policy truth source.

**Stop:** if a few reusable join helpers solve the repeated queries, use them instead of a database/schema project.

## Explicitly demoted patterns

Do not reopen unchanged without materially new evidence:

- generic dead-last whole-ladder retries or global seed fan-out that merely buy more total work;
- another hand-authored scoring profile whose novelty is only weights/name;
- nearby-threshold widening of a coarse repair gate or broad extra repair budget after full-budget failure;
- generic ALNS/adaptive-operator machinery before complementary operators earn it;
- universal beam-width increases or large novelty/MAP-Elites/DPP machinery before a simple descriptor-aware treatment earns it;
- production ZDD/DD/frontier, representative-set, `REGULAR`/resource-automaton, CEGAR/interpolation, or backdoor frameworks before a bounded residual question demonstrates value;
- exact DFS transposition caching or approximate-interface equivalence caching without new sound recurrence/sufficiency evidence;
- broad CDCL/LCG learning without a recurring compact sound reason family;
- generic RCSP/label-setting or exact-resource dominance without a sound completion-subsumption proof;
- broad symmetry canonicalization/rotate-mirror retries instead of causal first-divergence diagnosis;
- hazard/bandit/ML scheduler machinery before simpler fixed-work evidence demonstrates actionable headroom;
- giant variant generation without an unanswered question and analysis plan;
- full-corpus A/Bs for ideas already falsified causally;
- retaining closed experiment code solely as archive;
- optimizing a proxy after cold solve/work/correctness fails to improve;
- framework-building before the smallest value-of-information pilot succeeds.

This file should remain short. If chronology or detailed evidence starts accumulating here, move it to a dated report.
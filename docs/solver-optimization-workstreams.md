# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, workstream state, and next gates.
> **Reconciled:** 2026-09-05.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

Keep this file **current-state only**. When evidence changes a state or gate, replace the old statement instead of appending chronology. Detailed experimental history belongs in dated reports; the pre-consolidation workstream chronology is frozen at [`archive/snapshots/solver-optimization-workstreams-2026-09-04-pre-context-consolidation.md`](archive/snapshots/solver-optimization-workstreams-2026-09-04-pre-context-consolidation.md).

Workstream IDs are stable identifiers, not ranks. Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling/allocation: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence/holdouts: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Deferred/reopen material: [`solver-future-work.md`](solver-future-work.md).

## Current execution priority

### 1. Workstream 2: fixed-work scheduler allocation and repricing

**State:** active and first in execution order.

Budget semantics and the ms-derived additive-tier migration are complete. Equal-work pricing and static-portfolio composition work established that `portfolio-18-specialists` can retain roughly 98% of measured coverage while using roughly 45–48% less work than the full isolated-technique menu, but the real production ladder still wins additional coverage at much greater cost.

The latest production-ladder audit attributes its four wins over the static portfolio on the selected 40-level A/B to three **dose truncations** of already-present `intersectionHarvest` beams plus one **missing action** (`goal-attraction-disabled-retry`). It also found `admissible-order-fallback` plus `admissible-order-alternate-tiebreak-retry` consuming 61.7% of production work for three realized solves. Disabling the alternate-tiebreak retry on that selected population lost no solves and saved 58.35% work, but the refreshed census shows those tie-break profiles retain rare/exclusive capability, so removal is not justified.

**Confirmed locally, promotion still open:** a p75-derived candidate fraction (0.18 vs. default 1.0) for `admissible-order-alternate-tiebreak-retry`'s shared work pool lost **zero solves** across the 76-level informative confirmation population — both arms solved the identical 12/76 ids, all 64 unsolved hit the same clean `work-budget-reached` status. Production A/B 001 then used a fresh untouched 150-level population and completed cleanly in both arms, but was **non-informative**: control and treatment were byte-for-byte identical at 81/150 solved, 92,540,060,503 work, and 107,033,552,716 nodes, while treatment telemetry showed the target retry nominally reached 69 levels / 276 attempts yet expanded **0 nodes** because the strict ~1.005B whole-solve cap had already been consumed upstream. Do not count that tie as independent confirmation or promote 0.18 from it. See [`../reports/2026-09-05-admissible-order-non-default-retry-repricing-confirmation-006.md`](../reports/2026-09-05-admissible-order-non-default-retry-repricing-confirmation-006.md) and [`../reports/2026-09-05-admissible-order-non-default-retry-production-ab-001.md`](../reports/2026-09-05-admissible-order-non-default-retry-production-ab-001.md). **Next gate:** redesign the matched-work promotion test so nonzero target-stage work is a frozen participation requirement; use independent control-side reach/spend evidence or an allocation envelope that actually preserves executable work for the late retry. Disposition remains default-ON at fraction 1.0 until an informative promotion-path test clears. **Full-scale context:** the tier's real production win rate is 28/975 (2.9%) on a fresh 1,700-level run; all 28 have an isolated-census alternative but only half (14/28) share it with a non-admissible-order technique ([`full-scale-stage-share-validation-001`](../reports/2026-09-04-full-scale-stage-share-validation-001.md), [`...production-win-redundancy-001`](../reports/2026-09-04-admissible-order-alternate-tiebreak-retry-production-win-redundancy-001.md)). It is also disproportionately responsible for the most expensive production solves — every solve it wins in the sampled corpus lands above 90% of the node budget ([`marginal-cost-solve-technique-attribution-001`](../reports/2026-09-04-marginal-cost-solve-technique-attribution-001.md)). Mechanism: admissible-order's failed-vs-solved cost ratio is >100x at the median but only ~2.5x at p90 (beam stays ~1.3x at both — beam's cost is simply more predictable) — failure, not search itself, is what's expensive for this family at typical cost, and of the 4 tie-break profiles sharing the tested fraction only `tieBreak=none` ever wins in this run's production ([`per-action-failure-cost-ratio-asymmetry-001`](../reports/2026-09-05-per-action-failure-cost-ratio-asymmetry-001.md), refined by [`admissible-order-success-cost-tail-variance-001`](../reports/2026-09-05-admissible-order-success-cost-tail-variance-001.md), [`admissible-order-tiebreak-production-exposure-001`](../reports/2026-09-05-admissible-order-tiebreak-production-exposure-001.md)). Query `node scripts/research-status-index.mjs --compact --query=hints-random` for a further batch of local findings mined from `data/stress/hints-random/` provenance and family-internal census rankings not individually indexed here. The broader 17-feature production-risk ranking underlying that mechanism now has an out-of-sample holdout check: `constrainedObjects`/`portals`/`constrainedObjectDensity`/`turnConstraintLoad` replicate as the top block across both a corpus1/corpus2 split and a balanced parity split (Spearman 0.82-0.90; [`structural-risk-factor-corpus-holdout-replication-001`](../reports/2026-09-05-structural-risk-factor-corpus-holdout-replication-001.md), reusable via `scripts/analyze-structural-holdout-replication.mjs`).

Primary evidence: [`../reports/2026-09-04-production-ladder-marginal-value-tail-audit-001.md`](../reports/2026-09-04-production-ladder-marginal-value-tail-audit-001.md), [`solver-scheduling-policy.md`](solver-scheduling-policy.md), current capability map `reports/stress/technique-niches/2026-09-03/level-capability.json`.

### 2. Workstream 1: automatic solver action selection

**State:** active but downstream of Workstream 2.

The post-976 residual still contains missing-exposure/starvation cases, but nearby placement tweaks mined from those rows are closed. The promoted must-cross+flipper wide-beam exposure stands; the selective diverse-IH and reserve-preserving neighboring forms are closed.

**Next gate:** resume only after the current Workstream-2 allocation gate resolves, or when cross-evidence establishes a broader mechanics/state-conditioned action-selection premise. Isolated rescuer identities alone are not enough. Query existing capability, lifecycle, provenance, profile, variant, and trace evidence before generating new data. Relevant standing context for whenever this resumes: unsolved production levels split structurally into two failure modes distinguishable by `mustCross`/`requiredIntersections` load — high-load levels ("starved") never let the ladder finish and their near-miss stays pinned at `early-repair-search`, while low-load levels ("capped") exhaust the whole ladder legitimately and their near-miss is late-ladder repair — see [`2026-09-04-starved-vs-capped-structural-signature-001.md`](../reports/2026-09-04-starved-vs-capped-structural-signature-001.md). That near-miss (`bestBadnessTechnique`) signal is confounded with exposure (early stages get far more chances to record a near-miss) and should not be used as an action-selection signal without first conditioning on which techniques were actually reached — see [`2026-09-04-near-miss-technique-exposure-bias-001.md`](../reports/2026-09-04-near-miss-technique-exposure-bias-001.md).

## Active workstreams

Rows are sorted by stable workstream ID, not execution priority.

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 1 | Automatic solver action selection | **ACTIVE / DOWNSTREAM** | Resume from a materially new routing/allocation premise after the current Workstream-2 gate, or sooner only if cross-evidence establishes one. |
| 2 | Budget model + fixed-work scheduler repricing | **ACTIVE / CURRENT PRIORITY** | Redesign the 0.18 admissible-order promotion A/B so the late retry receives nonzero executable work under a matched aggregate envelope; classify zero-participation runs as non-informative. |
| 6 | Repair reachability/reconstructability | **SUPPORTING / NO CURRENT QUESTION** | Reopen only with a cheaper source of labelled cases or materially new reconstruction evidence; do not repeat the concluded recurrence/static-feature scans. |
| 7 | Architectural speed/execution substrate | **ACTIVE SUPPORTING / NO CURRENT CANDIDATE** | Reopen only for a materially different mechanism or a newly measured hotspot; the scorer and named fused-kernel descendants are closed. |

## Promoted/completed workstreams

| ID | Workstream | State | Reopen condition |
|---:|---|---|---|
| 3 | Generalization and holdout discipline | **METHOD COMPLETE / SUPPORTING** | Change only if repeated use exposes a concrete methodological failure. Evidence intensity scales with selection pressure; same-generator confirmation and cross-generator transfer remain distinct. |
| 8 | Cheap isolated capability missed by production | **SUBSUMED BY WORKSTREAM 1** | Treat isolated winners as action-selection evidence, not entitlement to a permanent tail. |

## Closed negative workstreams

| ID | Workstream | State | Reopen condition |
|---:|---|---|---|
| 0 | Restart/randomization + learned-failure search | **CLOSED IN TESTED FORMS** | Requires materially new evidence about restart value by work/population band or a new cheap sound failure-certificate family. |
| 4 | Beam retention at proven extinction boundaries | **CLOSED IN TESTED QUOTA/BUCKETING FORM** | Requires independent evidence for a bounded retention mechanism materially different from the tested form. |

## Deferred workstreams

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 5 | Exact/reference-model program | **ON DEMAND** | Use CP-SAT/reference work only for a concrete prioritized label, counterexample, or certificate. |

## Standing research rules

- Use `workSpent` for cross-technique allocation; raw nodes are within-technique diagnostics — quantified: beam/repair run 7-13x fewer nodes/wall-ms than dfs/admissible-order (`2026-09-05-technique-family-wall-clock-throughput-001.md`), so wall-time budgets are equally non-neutral.
- New actions/configurations expand the menu, not the default total budget.
- Level-blindness is not generalization. Confirmation strength scales with selection/tuning pressure.
- A clear negative closes the tested form unless materially new evidence changes its premise.
- Hold out independent units, including whole variant parents/families where applicable.
- After a meaningful capability change or census refresh, rebuild/rejoin the capability map before relying on old support classes. Weight that reliance by multiplicity: singleton-exclusive claims are provisional, not durable — measured at ~34% full-support loss and, even among those that stay solved, ~36% specific-technique-identity loss across a single two-day revision gap, both falling off sharply by doubleton and further by higher `solverCount` (`2026-09-04-capability-multiplicity-temporal-robustness-001.md`); singleton claims are also disproportionately budget-edge — 15.4% use over half the census node budget vs. 0% at `solverCount` 6+ (`2026-09-04-capability-multiplicity-budget-edge-robustness-001.md`). Weight further by which family holds sole support: DFS-singleton claims lose support at roughly 2x beam's rate (47.5% vs. 22.7%), admissible-order-singleton claims essentially never lost support in a 16-level sample (`2026-09-04-singleton-fragility-by-technique-family-001.md`) — re-verify a DFS-singleton claim first. A multi-technique-solved claim needs less re-verification urgency regardless of family. Doubleton (`solverCount=2`) is not automatically safer against a family-wide capability change than it looks: 58.5% of doubletons have both solvers from the *same* family (30.9% beam+beam alone), so only 41.5% have genuine cross-family redundancy (`2026-09-04-doubleton-intra-family-redundancy-001.md`). Do not use raw cost-drift magnitude as a stability proxy — it does not predict solve-set churn (r=0.126); technique family does, with `repair`'s guidance variants substantially less stable (mean Jaccard 0.54) than the other three families (0.79-0.85) (`2026-09-04-action-cost-volatility-capability-drift-001.md`).
- Scheduler/repricing work must audit rare/specialist retention, not only aggregate solves or work.
- For late-stage repricing, nominal reach/attempt records are not participation: require nonzero target-stage work before interpreting an A/B.
- Prefer existing evidence and the smallest value-of-information test before broad compute.

## Cheap evidence routing

Before opening large reports or generating new data:

- prior research: `node scripts/research-status-index.mjs --compact --query=<term>`;
- existing tools: `node scripts/tooling-census.mjs --compact --query=<term>`;
- research assets/joins: `node scripts/research-asset-query.mjs --query=<term>`;
- corpus shape: `node scripts/corpus-query.mjs --corpus=stress2`.

Use [`solver-research-data-assets.md`](solver-research-data-assets.md) for evidence-topology guidance when the compact asset query is insufficient. The completed [`solver-research-post-naming-resumption.md`](solver-research-post-naming-resumption.md) bridge is conditional: use it when executing or translating frozen pre-cleanup evidence with historical names/contracts, not as ordinary current-head orientation.

## Closed-form lookup

Do not preserve rejected chronology here. Search the named mechanism through `research-status-index --compact`, then open the matched report or the frozen workstream snapshot when the reason for a historical disposition matters.

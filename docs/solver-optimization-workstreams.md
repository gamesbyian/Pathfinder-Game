# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, workstream state, and next gates.
> **Reconciled:** 2026-09-04.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

Keep this file **current-state only**. When evidence changes a state or gate, replace the old statement instead of appending chronology. Detailed experimental history belongs in dated reports; the pre-consolidation workstream chronology is frozen at [`archive/snapshots/solver-optimization-workstreams-2026-09-04-pre-context-consolidation.md`](archive/snapshots/solver-optimization-workstreams-2026-09-04-pre-context-consolidation.md).

Workstream IDs are stable identifiers, not ranks. Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling/allocation: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence/holdouts: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Deferred/reopen material: [`solver-future-work.md`](solver-future-work.md).

## Current execution priority

### 1. Workstream 2: fixed-work scheduler allocation and repricing

**State:** active and first in execution order.

Budget semantics and the ms-derived additive-tier migration are complete. Equal-work pricing and static-portfolio composition work established that `portfolio-18-specialists` can retain roughly 98% of measured coverage while using roughly 45–48% less work than the full isolated-technique menu, but the real production ladder still wins additional coverage at much greater cost.

The latest production-ladder audit attributes its four wins over the static portfolio on the selected 40-level A/B to three **dose truncations** of already-present `intersectionHarvest` beams plus one **missing action** (`goal-attraction-disabled-retry`). It also found `admissible-order-fallback` plus `admissible-order-alternate-tiebreak-retry` consuming 61.7% of production work for three realized solves. Disabling the alternate-tiebreak retry on that selected population lost no solves and saved 58.35% work, but the refreshed census shows those tie-break profiles retain rare/exclusive capability, so removal is not justified.

**Next gate:** a p75-derived candidate fraction (0.18 vs. default 1.0) for `admissible-order-alternate-tiebreak-retry`'s shared work pool was confirmed on a fresh 150-level population (control [`33841104137`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33841104137), treatment [`33841105732`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33841105732)), but came back **confounded, not a result**: both arms were byte-identical because the dispatch's `--node-budget=50000000` is a hard, raw-node-count stopping condition (`nodeBudgetReached` in `modules/solver/orchestration.ts`) independent of, and with status-label priority over, the work-budget-share the fraction override resizes — every unsolved level in both arms hit that same raw ceiling before the fraction difference could matter. Fixed by adding `node_budget_advisory_only` to `solver-level-blind-targeted-sweep.yml`, so `work_budget` alone binds. See [`2026-09-04-admissible-order-non-default-retry-repricing-confirmation-001.md`](../reports/2026-09-04-admissible-order-non-default-retry-repricing-confirmation-001.md). The re-dispatched control/treatment pair with `node_budget_advisory_only=true` ([`33856604960`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33856604960) / [`33856607156`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33856607156)) confirmed the confound fix worked but hit a **second, independent problem**: the shard planner was still sizing shard packing/timeouts off the raw, no-longer-binding `node_budget=50000000`, so most shards ran out their stale timeout before finishing their assigned levels — each arm reported results for only ~58% of the 150-level population, with the rest silently unattempted rather than recorded unsolved. No comparison could be drawn from that partial, non-matched data. Fixed by sizing the planner's wall-time/timeout estimate off the derived `work_budget` instead of the raw `node_budget` when `node_budget_advisory_only=true`. See [`2026-09-04-admissible-order-non-default-retry-repricing-confirmation-002.md`](../reports/2026-09-04-admissible-order-non-default-retry-repricing-confirmation-002.md). A third dispatch with that fix in place ([`33921242910`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33921242910)) still truncated to the identical 88/150 levels — the deeper cause is that this workflow's ad-hoc dispatches carry no per-level telemetry, so the planner predicts an identical, uniform wall time for every level regardless of true difficulty, and under this workflow's default non-strict work-budget mode (matching real production's additive-tier semantics) a level's true worst-case time is effectively unbounded; bundling several such levels per shard means one slow level's timeout silently drops its shard-mates too, systematically discarding exactly the harder, late-ladder-dependent levels this confirmation needs to observe. See [`2026-09-04-admissible-order-non-default-retry-repricing-confirmation-003.md`](../reports/2026-09-04-admissible-order-non-default-retry-repricing-confirmation-003.md). The fix does not require further workflow code changes — `plan-highbudget-shards.mjs` already has a working solo-shard mechanism that this workflow's default inputs never trigger; solo-sharding (`solo_threshold_multiplier=1.0`, `target_wall_minutes=40`) confirmed correct at dispatch time (150 individual shard jobs, no cancellations) but revealed the real remaining cost driver: 62/150 of this curated population are ids that hit the old, confounded node-budget cap in the existing full-scale census, so under advisory-only mode each now runs the full ladder for ~60-70 minutes, and with only 20 shards running in parallel the two serialized arms would have taken well over a dozen hours combined. Cross-checking against the existing full-scale production census (no new dispatch) found 74/150 ids whose ladder never even reaches the tested tier — provably incapable of showing any fraction effect, exactly as the earlier byte-identical partial results already demonstrated. Narrowed the population to the 76 ids that do reach the tier, and added a `concurrency_suffix` input so control and treatment can run in parallel instead of serializing behind each other. See [`2026-09-04-admissible-order-non-default-retry-repricing-confirmation-004.md`](../reports/2026-09-04-admissible-order-non-default-retry-repricing-confirmation-004.md). **Remaining gate:** confirm that narrowed, parallel dispatch reports close to the full 76-level population in each arm before comparing solved-id sets and `workSpent`. Disposition unchanged (default-ON, full fraction) until that actually runs and completes. **Full-scale context while that confirmation is pending:** the tier's real production win rate is not zero — 28/975 (2.9%) of all solves on a fresh 1,700-level run — and every one of those 28 has an isolated-census alternative, but only half (14/28) share that alternative with a non-admissible-order technique; the other 14 are admissible-order-exclusive per the current census. See [`2026-09-04-full-scale-stage-share-validation-001.md`](../reports/2026-09-04-full-scale-stage-share-validation-001.md) and [`2026-09-04-admissible-order-alternate-tiebreak-retry-production-win-redundancy-001.md`](../reports/2026-09-04-admissible-order-alternate-tiebreak-retry-production-win-redundancy-001.md). It is also, per the corpus2-only analysis, entirely responsible for a chunk of the most expensive production solves: every solve it wins in the sampled corpus lands above 90% of the node budget — see [`2026-09-04-marginal-cost-solve-technique-attribution-001.md`](../reports/2026-09-04-marginal-cost-solve-technique-attribution-001.md).

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
| 2 | Budget model + fixed-work scheduler repricing | **ACTIVE / CURRENT PRIORITY** | Percentile-size `admissible-order-alternate-tiebreak-retry`, then independent ~150-level confirmation with rare-capability retention. |
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

- Use `workSpent` for cross-technique allocation; raw nodes are within-technique diagnostics.
- New actions/configurations expand the menu, not the default total budget.
- Level-blindness is not generalization. Confirmation strength scales with selection/tuning pressure.
- A clear negative closes the tested form unless materially new evidence changes its premise.
- Hold out independent units, including whole variant parents/families where applicable.
- After a meaningful capability change or census refresh, rebuild/rejoin the capability map before relying on old support classes. Weight that reliance by multiplicity: singleton-exclusive claims are provisional, not durable — measured at ~34% full-support loss and, even among those that stay solved, ~36% specific-technique-identity loss across a single two-day revision gap, both falling off sharply by doubleton and further by higher `solverCount` (`2026-09-04-capability-multiplicity-temporal-robustness-001.md`); singleton claims are also disproportionately budget-edge — 15.4% use over half the census node budget vs. 0% at `solverCount` 6+ (`2026-09-04-capability-multiplicity-budget-edge-robustness-001.md`). Weight further by which family holds sole support: DFS-singleton claims lose support at roughly 2x beam's rate (47.5% vs. 22.7%), admissible-order-singleton claims essentially never lost support in a 16-level sample (`2026-09-04-singleton-fragility-by-technique-family-001.md`) — re-verify a DFS-singleton claim first. A multi-technique-solved claim needs less re-verification urgency regardless of family. Doubleton (`solverCount=2`) is not automatically safer against a family-wide capability change than it looks: 58.5% of doubletons have both solvers from the *same* family (30.9% beam+beam alone), so only 41.5% have genuine cross-family redundancy (`2026-09-04-doubleton-intra-family-redundancy-001.md`). Do not use raw cost-drift magnitude as a stability proxy — it does not predict solve-set churn (r=0.126); technique family does, with `repair`'s guidance variants substantially less stable (mean Jaccard 0.54) than the other three families (0.79-0.85) (`2026-09-04-action-cost-volatility-capability-drift-001.md`).
- Scheduler/repricing work must audit rare/specialist retention, not only aggregate solves or work.
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

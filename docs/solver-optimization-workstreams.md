# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, workstream state, and next gates.
> **Reconciled:** 2026-09-09.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

Keep this file **current-state only**. Detailed evidence belongs in reports; historical snapshots live under `docs/archive/snapshots/`.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Deferred material: [`solver-future-work.md`](solver-future-work.md).

## Current execution priority

### 1. Workstream 2: fixed-work scheduler allocation and repricing

**State:** active; portal capability restoration first, then bounded 2A closeouts, then broader allocation work on refreshed telemetry.

#### Portal restoration — DONE (2026-09-09/10)

Portal levels are 954/1,700 of Corpus 2 (551/725 production misses). All four independent matched-work items are resolved:

1. **Must-cross neighbour-budget propagation** — PROMOTED. 530-level portal+must-cross A/B: 52 gains/0 losses (net +52), every gain referee-valid, zero regressions. [`preflight`](../reports/2026-09-09-mc-neighbor-budget-portal-ab-001-preflight.md)
2. **Portal-aware beam coarse-state merge** — CLOSED NEGATIVE on promotion, stays opt-in (`STRATEGY_PORTAL_COARSE_STATE_MERGE`). 954-level A/B: 158 gains/12 losses (net +146) but `R01273` is a genuine specialist-retention regression — root cause is the ordinary discard-a-needed-lower-scorer risk every coarse-state merge carries, newly exposed on portals, not the fixed aliasing bug. Low priority, zero production risk. [`preflight`](../reports/2026-09-09-portal-coarse-state-merge-ab-001-preflight.md)
3. **Connectivity volume check** — PROMOTED. 954-level A/B: 2 gains (`R02297`, `R02746`)/0 losses, zero regressions. False-goal mirror stays untouched pending its own differential. [`preflight`](../reports/2026-09-09-connectivity-volume-portal-ab-001-preflight.md)
4. **Same-parity portal parity prune/gate** — DONE. Unit + stored-path differential (0 violations) + regression (160/160) clean on the 21 zero-twist-pair portal levels; no solve-rate campaign warranted at this size.

Catalog: [`portal carve-outs`](../reports/2026-09-09-portal-carveout-and-additive-tier-solve-rate-catalog-001.md). Evidence hardening: [`hardening`](../reports/2026-09-09-portal-restoration-evidence-hardening-001.md).

The two-stage lifecycle instantiation projection gap is repaired: `guidance-goal-distance-retry` and `late-repair-multiseed-retry` now report correct `mechanicallyEligible`/`instantiated` telemetry (see [`telemetry gap`](../reports/2026-09-09-stage-lifecycle-instantiation-projection-gap-001.md), closed). After material restorations settle, follow the evidence-hardening refresh contract before interpreting the triple-overlap cohort or repricing the ladder. Do not carry forward the old 975/1,700 attribution.

#### 2A. Production repricing closeout

Treat independently:

1. **Goal-attraction-disabled retry fresh pool.** **Done (2026-09-10) — PROMOTED.** `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE` + `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL` are production default-ON, promoted together (every A/B in this line ran them paired). Confirmation-002 (reach-conditioned 150-level Corpus-2, disjoint from every prior population): control (reserve alone) 14/150 vs. treatment (both) 17/150 — +3/-0, all gains attributable to a winning tier attempt, reach 104→140/150. Zero published-corpus regressions. See [`ledger`](solver-opt-in-experiment-ledger.md).
2. **Repair late-probe `7 → 6` seeds.** **Done (2026-09-10) — CLOSED NEGATIVE.** 150-level reach-conditioned confirmation found seed 7 is a real, unique rescue on 2/150 levels (`R02460`, `R02553` — both needed all 7 attempts under control, both failed at 6), disqualifying the unconditional truncation despite a real 5.5% aggregate work saving. Production stays at seven seeds; the unconditional `7 → 6` form is closed absent a narrower conditional premise. See [`preflight`](../reports/2026-09-05-repair-late-probe-six-seed-confirmation-preflight.md), [`result`](../reports/2026-09-10-repair-late-probe-six-seed-confirmation-001-result.md).
3. **Admissible-order retry `1.0 → 0.18`.** **Prerequisite implemented (2026-09-10); confirmation still not run.** The tier dispatched through plain `admissibleOrderSearch`, which never read its scoped `prep._workCap`, so CLI/workflow budget changes could not produce a valid matched-work confirmation. Fixed via a new opt-in `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_WORK_CAP_ENFORCEMENT` flag (default OFF) that makes `admissibleOrderSearch` additionally consult `prep._workCap`, scoped by an explicit parameter threaded only through the non-default-retry tier's own `orchestration.ts` call site — the sibling admissible-order-fallback tier (same shared dispatcher, same non-default profiles) is structurally unreachable by this flag regardless of polarity. Unit-tested at both the pre-search and periodic (256-node) checks; zero population-scale evidence yet. Production stays `1.0`. Next gate: run the matched-work confirmation this previously-blocking gap prevented. See [`matched-work methodology`](../reports/2026-09-10-admissible-order-non-default-retry-matched-work-methodology-001.md), [`work-cap gap discovery`](../reports/2026-08-28-admissible-order-work-cap-gap-discovery.md), [`artifact recovery`](../reports/2026-09-10-admissible-order-confirmation-006-artifact-recovery.md), and [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md).

#### 2B. Broader allocation construction

After portal restoration and 2A, refresh the production ladder/capability map, then:

- **Flag-inert dispatch/full-population repricing:** equal-total-work repricing only after refresh. [`Portal catalog`](../reports/2026-09-09-portal-carveout-and-additive-tier-solve-rate-catalog-001.md)
- **Resumable portfolio:** portfolio-18 first pass + same-policy continuation inside 67M. Production-width (2000/5000) continuation capture is now implemented and validated (bounded-overshoot form, single-digit-percent measured overshoot, 2026-09-10) — the engineering prerequisite is met; next is the fixed-work development A/B itself. [`Preflight`](../reports/2026-09-05-static-portfolio-resumable-tranche-salvage-preflight.md)
- **Priced residual lane:** recompute the isolated-winner residue after restoration/2A, separating missing from failed exposure and protecting specialists. [`Handoff`](../reports/2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md)

### 2. Workstream 1: automatic solver action selection

**State:** active for parallel analysis; production routing changes remain downstream of portal restoration and refreshed WS2 allocation semantics.

Existing capability, lifecycle, provenance, profile, variant, census, trace and accepted-path evidence may be mined now. Promote only held-out/replicated signals.

#### Hint/provenance evidence tranche

Treat the hint store as a solution-space atlas, a sound positive oracle of validated prefixes, and a longitudinal discovery log. Read provenance on separate **origin**, **search/run facet**, and **capability-admissibility** axes. [`Evidence-layer upgrade`](../reports/2026-09-09-hint-provenance-evidence-layer-upgrade-001.md)

Before new solver compute on a hinted failure:

1. run the corpus-wide provenance/dedup audit;
2. select structurally diverse solution basins rather than the first hint;
3. locate the first point where **all known-live basins** disappear in real search/replay and classify the loss as allocation/exposure, search policy, prune/state merge/representation, or other reasoning failure;
4. cross representative basins with relevant policies and join lifecycle/census exposure so `exposed-and-failed` differs from `not exposed`;
5. use diverse validated prefixes as a one-sided soundness screen for portal state merging, parity/connectivity and other pruning/representation changes;
6. mine Corpus-2 basin complementarity, decision entropy, temporal basin stability, producer/config novelty, variant transfer, and independence-aware agreement.

Reuse existing prefix-survival, divergence, rank and replay tools before creating new frameworks. Stored paths/provenance/profile/family/winner labels remain offline diagnostics and may not be direct same-level production routing inputs.

Current high-risk cohort: 396 intersection-heavy + must-cross-heavy + multi-portal levels, 118 solved. Portal carve-outs are the first causal explanation to resolve. After restoration, refresh lifecycle/capability evidence and classify residual informative misses before any new joint propagation. [`Handoff`](../reports/2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md)

First eligible/exposed/failed pass on retained (pre-refresh) telemetry, plus a telemetry-artifact correction for `admissible-order-fallback`'s "work-starved" label (real work, not missing exposure) and residual-lane recompute tooling scope: [`exposure classification`](../reports/2026-09-10-ws1-existing-data-exposure-classification-001.md). Rerun against refreshed capability data before treating any count as current.

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 1 | Automatic action selection | **ACTIVE / PARALLEL ANALYSIS** | Existing-data + known-live-basin replay; after portal refresh classify residual failure roles. |
| 2 | Fixed-work scheduler repricing | **ACTIVE / FIRST PRIORITY** | Portal restoration → 2A → ladder/capability refresh → 2B. |
| 6 | Repair reachability/reconstructability | **SUPPORTING** | Reopen only with cheaper labelled cases or materially new reconstruction evidence. |
| 7 | Architectural speed/execution substrate | **SUPPORTING** | Reopen only for a materially different mechanism or newly measured hotspot. |
| 3 | Generalization/holdout discipline | **METHOD COMPLETE** | Concrete methodological failure. |
| 8 | Cheap isolated capability missed by production | **SUBSUMED BY WS1** | Isolated winners are action-selection evidence, not permanent tail entitlement. |
| 0 | Restart/randomization + learned-failure search | **CLOSED IN TESTED FORMS** | Materially new restart-by-work/population evidence or sound failure certificate. |
| 4 | Beam retention at extinction boundaries | **CLOSED IN TESTED FORMS** | Independent evidence for materially different bounded retention. |
| 5 | Exact/reference-model program | **ON DEMAND** | Reuse retained exact counterexamples; broad new CP-SAT only for a new prespecified question. |

## Standing research rules

- Use `workSpent` for cross-technique allocation; raw nodes are within-technique diagnostics.
- New actions/configurations expand the menu, not the default total budget.
- Level-blindness is not generalization; confirmation strength scales with tuning pressure.
- Clear negatives close tested forms absent materially new evidence.
- Hold out independent units, including whole variant parents/families where applicable.
- Audit specialist retention, not only aggregate solves/work; nominal stage reach is not participation.
- Portal restoration precedes ladder repricing and new joint-propagation implementation; remeasure production afterward.
- A validated hint prefix proves that prefix live, not that alternatives are dead.
- Capability claims must separate provenance origin/facets/admissibility; only actual Pathfinder solver evidence establishes production cold capability.
- Repeated provenance is evidence unless it is the same discovery event recorded twice. Raw event count is not independence count.
- Reconcile old questions against newer evidence before new compute; prefer the smallest value-of-information test.

## Cheap evidence routing

- prior research: `node scripts/research-status-index.mjs --compact --query=<term>`
- existing tools: `node scripts/tooling-census.mjs --compact --query=<term>`
- research assets/joins: `node scripts/research-asset-query.mjs --query=<term>`
- corpus shape: `node scripts/corpus-query.mjs --corpus=stress2`
- hint/provenance audit: `node scripts/run-bundled.mjs scripts/stress/hint-provenance-evidence-report.mjs -- --corpus=all`

Use [`solver-research-data-assets.md`](solver-research-data-assets.md) for evidence-topology guidance. Search named mechanisms through `research-status-index --compact`; detailed chronology belongs in matched reports or frozen snapshots.

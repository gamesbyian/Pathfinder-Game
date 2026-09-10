# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, workstream state, and next gates.
> **Reconciled:** 2026-09-09.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

Keep this file **current-state only**. Detailed evidence belongs in reports; historical snapshots live under `docs/archive/snapshots/`.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Deferred material: [`solver-future-work.md`](solver-future-work.md).

## Current execution priority

### 1. Workstream 2: fixed-work scheduler allocation and repricing

**State:** active; portal capability restoration first, then bounded 2A closeouts, then broader allocation work on refreshed telemetry.

#### Portal restoration

Portal levels are 954/1,700 of Corpus 2 and contain 551/725 production misses. Resolve these independently under matched work:

1. **Must-cross neighbour-budget propagation.** **Done (2026-09-09) — PROMOTED.** Portal-level evaluation of `mustCrossNeighborBudgetDeadlocked` is now production default-ON (`PRUNE_MC_NEIGHBOR_BUDGET_PORTAL` removed from `OPT_IN_FEATURES`). The frozen matched-work A/B on the deterministic 530-level portal+must-cross Corpus-2 population found 52 gains / 0 losses (net +52), every gain confirmed referee-valid on independent replay, zero published-corpus regressions. See [`preflight`](../reports/2026-09-09-mc-neighbor-budget-portal-ab-001-preflight.md), [`evidence hardening`](../reports/2026-09-09-portal-restoration-evidence-hardening-001.md).
2. **Portal-aware beam coarse-state merge.** **Closed negative on promotion (2026-09-09) — stays opt-in.** `BeamNode.usedPortalPairs` preserves exact used-pair identity in the merge key behind `STRATEGY_PORTAL_COARSE_STATE_MERGE`; the frozen 954-level population A/B found 158 gains / 12 losses (net +146, all gains referee-valid) but the rare/specialist-retention check confirmed a genuine capability regression on `R01273`. **Root cause confirmed (2026-09-09, local repro):** not aliasing (already fixed) — R01273's real winning mechanism is the `must-cross-neighbor-prune-disabled-retry` stage; the same attempt sequence (same node counts/seeds) that succeeds under control fails entirely under treatment. This is the same discard-a-needed-lower-scorer risk every coarse-state merge already carries (accepted on portal-free levels), newly exposed on portal levels. **Priority: low, not urgent** — opt-in, zero production risk, not on the critical path for anything else queued; revisit only as dedicated future work if the 158 foregone gains become worth pursuing. See [`preflight`](../reports/2026-09-09-portal-coarse-state-merge-ab-001-preflight.md) (full root-cause writeup), [`beam preflight`](../reports/2026-09-09-portal-beam-state-identity-preflight-001.md).
3. **Connectivity volume check.** **Done (2026-09-10) — PROMOTED.** Ordinary portal derivation and first screen are closed: 266,320 valid paths / 21.8M prefixes, zero rejects, with live activation. `isConnected`'s volume tail is now production default-ON on portal levels too (`PRUNE_CONNECTIVITY_VOLUME_PORTAL` removed from `OPT_IN_FEATURES`; the flag itself stays as a named research escape hatch). The frozen matched-work A/B on the deterministic 954-level portal Corpus-2 population found 2 gains (`R02297`, `R02746`) / 0 losses (net +2), plus a small aggregate work/node reduction; zero published-corpus regressions (160/160, identical solve set). Keep the false-goal mirror separate (untouched) until a triggerable-endpoint differential loses zero valid endpoints. See [`preflight`](../reports/2026-09-09-connectivity-volume-portal-ab-001-preflight.md), [`evidence hardening`](../reports/2026-09-09-portal-restoration-evidence-hardening-001.md).
4. **Same-parity portal parity prune/gate.** **Done (2026-09-09).** Ordinary `PRUNE_PARITY` and `getActiveGates`'s gate-feasibility filter now apply unweakened on the 21/954 portal levels with zero twist pairs (`prep.parityPortalDistMaps.length === 0`), reusing the same invariant `isParityCompatibleEndpoint` already shipped for false-goal endpoints. Unit coverage (same-parity vs. twist, both PRUNE_PARITY and getActiveGates) plus a dedicated stored-path differential (`scripts/stress/same-parity-portal-soundness-check.mjs`, 0 violations across all 3 corpora) and published-corpus regression (160/160, no regressions) are all clean. No standalone solve-rate campaign was run (not warranted for 21 levels, per plan).

Primary catalog: [`portal carve-outs`](../reports/2026-09-09-portal-carveout-and-additive-tier-solve-rate-catalog-001.md).

The two-stage lifecycle instantiation projection gap is repaired: `guidance-goal-distance-retry` and `late-repair-multiseed-retry` now report correct `mechanicallyEligible`/`instantiated` telemetry (see [`telemetry gap`](../reports/2026-09-09-stage-lifecycle-instantiation-projection-gap-001.md), closed). After material restorations settle, follow the evidence-hardening refresh contract before interpreting the triple-overlap cohort or repricing the ladder. Do not carry forward the old 975/1,700 attribution.

#### 2A. Production repricing closeout

Treat independently:

1. **Goal-attraction-disabled retry fresh pool.** **Done (2026-09-10) — PROMOTED.** `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE` + `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL` are production default-ON, promoted together (every A/B in this line ran them paired). Confirmation-002 (reach-conditioned 150-level Corpus-2, disjoint from every prior population): control (reserve alone) 14/150 vs. treatment (both) 17/150 — +3/-0, all gains attributable to a winning tier attempt, reach 104→140/150. Zero published-corpus regressions. See [`ledger`](solver-opt-in-experiment-ledger.md).
2. **Repair late-probe `7 → 6` seeds.** Frozen population-scale fixed-work confirmation requiring zero solve loss, material saving, and no seed-7-exclusive rescue. [`Preflight`](../reports/2026-09-05-repair-late-probe-six-seed-confirmation-preflight.md)
3. **Admissible-order retry `1.0 → 0.18`.** Matched-work test with nonzero target-stage work required. Production stays `1.0`. [`Confirmation 006`](../reports/2026-09-05-admissible-order-non-default-retry-repricing-confirmation-006.md)

#### 2B. Broader allocation construction

After portal restoration and 2A, refresh the production ladder/capability map, then:

- **Flag-inert dispatch/full-population repricing:** equal-total-work repricing only after refresh. [`Portal catalog`](../reports/2026-09-09-portal-carveout-and-additive-tier-solve-rate-catalog-001.md)
- **Resumable portfolio:** portfolio-18 first pass + same-policy continuation inside 67M; exact continuation must be correct at widths 2000/5000 first. [`Preflight`](../reports/2026-09-05-static-portfolio-resumable-tranche-salvage-preflight.md)
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

# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, workstream state, and next gates.
> **Reconciled:** 2026-09-09.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

Keep this file **current-state only**. When evidence changes a state or gate, replace the old statement instead of appending chronology. Detailed experimental history belongs in dated reports; historical snapshots live under `docs/archive/snapshots/`.

Workstream IDs are stable identifiers, not ranks. Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling/allocation: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence/holdouts: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Deferred/reopen material: [`solver-future-work.md`](solver-future-work.md).

## Current execution priority

### 1. Portal capability restoration

**State:** active and first in execution order.

Portal-bearing levels are 954/1,700 of Corpus 2 but hold 551/725 current production misses and 464/604 misses without an isolated T1 winner; their median isolated `solverCount` is 0 versus 8 for portal-free levels. Four production mechanisms are disabled outright whenever portals are present. Two exclusions have already passed large stored-solution soundness screens and demonstrated live pruning/search effect on portal misses. Resolve these existing capability carve-outs before spending the next tranche on small ladder repricing or inventing new joint-obligation machinery for the same population.

Treat these as independent causal restorations under matched work. Do not bundle them into one treatment.

1. **Must-cross neighbour-budget propagation on portal levels.** Highest-confidence immediate gate: the excluded 530-level portal+must-cross population is larger than the 409-level portal-free population on which the prune was promoted at +54 net. Portal-specific derivation is now closed: current move/intersection semantics make the existing lower bound conservative on portal terminals, and portal jumps cannot create an uncharged revisit. The shadow/oracle helper also had a post-August dense-index representation drift; that is repaired with regression coverage. **Next gate:** rerun the corrected oracle-labelled branch atlas with portal cases, require zero alive-labelled false rejections, then run the frozen matched-work Corpus-2 A/B on the deterministic 530-level portal+must-cross population with gains/losses enumerated and published-corpus regression unchanged. See [`evidence hardening`](../reports/2026-09-09-portal-restoration-evidence-hardening-001.md).
2. **Portal-aware beam coarse-state merge.** Highest expected solve-rate upside in the audit: all 954 portal levels currently lose coarse-state survivor compression and near-tie retention. `portalJumps` plus `lastWasPortalJump` capture counted-length and transient forced-jump state, but do not distinguish which portal pairs have already been consumed. **Next gate:** first measure used-pair identity aliasing under that proposed coarse key on a prespecified portal-bearing observer population. If aliasing is negligible, test the count/transient tuple; if material, preserve exact used-pair identity with a schema-safe signature. Then run the fixed-work A/B against the current no-portal-merge control. Require referee/regression safety and enumerate gains, losses, and specialist retention. See [`beam state-identity preflight`](../reports/2026-09-09-portal-beam-state-identity-preflight-001.md).
3. **Connectivity volume check on portal levels.** The derivation and first screen are closed for ordinary solver connectivity: zero rejections over 266,320 known-valid paths / 21.8M prefix states, real activation on sampled portal misses, and the remaining-step/fresh-volume inequality stays conservative under zero-cost portal jumps. **Next gate:** matched-work A/B on the deterministic 954-level portal-bearing population. The false-goal-trigger-search mirror now has a supporting derivation too, but keep it separate until a triggerable-endpoint/control-treatment differential shows zero lost triggerable cells on completed enumerations. See [`evidence hardening`](../reports/2026-09-09-portal-restoration-evidence-hardening-001.md).
4. **Parity prune/gate on same-parity-only portal levels.** The parity derivation is closed and independently mirrored by the already-shipped false-goal endpoint parity logic. Only 21/954 portal levels have zero twist pairs. **Next gate:** bounded implementation plus unit/differential/published-regression coverage; use this as correctness/coverage cleanup, not a standalone solve-rate campaign. See [`evidence hardening`](../reports/2026-09-09-portal-restoration-evidence-hardening-001.md).

Primary evidence: [`../reports/2026-09-09-portal-carveout-and-additive-tier-solve-rate-catalog-001.md`](../reports/2026-09-09-portal-carveout-and-additive-tier-solve-rate-catalog-001.md), [`../reports/2026-09-09-portal-restoration-evidence-hardening-001.md`](../reports/2026-09-09-portal-restoration-evidence-hardening-001.md), and [`../reports/2026-09-09-portal-beam-state-identity-preflight-001.md`](../reports/2026-09-09-portal-beam-state-identity-preflight-001.md).

After the material portal restorations settle, refresh production/capability telemetry before interpreting the triple-overlap cohort or repricing the full ladder. Landing coarse-state merge or must-cross propagation changes both portal search capability and the meaning of two currently flag-inert retry tiers. Follow the refresh contract in the evidence-hardening report rather than carrying forward the old 975/1,700 ladder attribution.

### 2. Workstream 2: fixed-work scheduler allocation and repricing

**State:** active; bounded closeouts follow the portal-restoration tranche, then broader scheduler construction uses a refreshed ladder.

Budget semantics and the ms-derived additive-tier migration are complete, and equal-work/static-portfolio pricing shows substantial work-efficiency headroom while production retains additional coverage. The three mature closeouts remain worth settling, but their expected solve-rate leverage is lower than the newly exposed portal capability gap.

#### 2A. Production repricing / promotion closeout

Independent bounded decisions. A blocked run for one is **not** a reason to idle the workstream; move to the next safe candidate or to WS1 analysis, preserving each candidate's frozen evidence contract.

1. **Goal-attraction-disabled retry fresh work pool.** Development was +1/-0, random confirmation was null, and the stage is starved on 605/725 misses. **Next gate:** confirmation 002 on an independently selected starvation cohort; close/demote if real participation still yields no gains. See [`preflight`](../reports/2026-09-05-goal-attraction-disabled-retry-fresh-work-pool-confirmation-002-preflight.md).
2. **Repair late-probe retry `7 → 6` seeds.** Seed 7 adds no reached-level best result; seed 6 remains load-bearing. **Next gate:** frozen population-scale fixed-work confirmation; require zero solve loss, material saving, and no seed-7-exclusive rescue. See [`preflight`](../reports/2026-09-05-repair-late-probe-six-seed-confirmation-preflight.md).
3. **Admissible-order non-default retry fraction `1.0 → 0.18`.** Development retained all 12/76 solves; the fresh production A/B was non-informative because the target retry expanded zero nodes. **Next gate:** a matched-work test with nonzero target-stage work as a frozen participation requirement. Production remains `1.0`. See [`confirmation 006`](../reports/2026-09-05-admissible-order-non-default-retry-repricing-confirmation-006.md) and [`production A/B 001`](../reports/2026-09-05-admissible-order-non-default-retry-production-ab-001.md).

All three are separate causal questions; do not bundle them into one scheduler treatment.

#### 2B. Broader scheduler / allocation construction

After portal restoration and 2A closeout, refresh the production ladder/capability map before broader fixed-work allocation. Then pursue residual/tranche pricing, simple static routing/order, protected complementary capability, and richer dynamic policies only if simple ones leave measured held-out headroom.

**WS2B candidate: flag-inert dispatch and full-population repricing.** Two retry tiers currently spend 11.8% of corpus `workSpent` toggling flags already inert on portal levels; the full-population ladder prices every tier (top three: 35.8% of work for 21 solves). Do not optimize this stale ladder before portal restoration: if coarse-state merge and must-cross propagation become live on portals, those tiers change meaning. Reprice under an equal total envelope after the refreshed production run. See [`the catalog`](../reports/2026-09-09-portal-carveout-and-additive-tier-solve-rate-catalog-001.md).

**WS2B candidate: resumable portfolio tranche.** The one-shot static scheduler stays closed, but its postmortem found 3/4 coverage losses were already-present beams capped only ~2–12% short. Test the frozen portfolio-18 first pass plus same-policy continuation of capped beams inside the same 67M envelope; make exact continuation correct at widths 2000/5000 first, then run the fixed-work A/B. Policy-switch resumability stays separate. See [`../reports/2026-09-05-static-portfolio-resumable-tranche-salvage-preflight.md`](../reports/2026-09-05-static-portfolio-resumable-tranche-salvage-preflight.md) and [`solver-search-resumability.md`](solver-search-resumability.md).

**WS2B candidate: priced residual lane.** Of 122 current misses with an isolated winner, 45 lacked winning-action exposure and 77 stayed unresolved after exposure. Recompute this residue after portal restoration and 2A; then treat missing exposure and failed exposure as separate populations with explicit total work, specialist retention, and production-exclusive gains. See [`the handoff`](../reports/2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md).

Primary evidence: [`../reports/2026-09-04-production-ladder-marginal-value-tail-audit-001.md`](../reports/2026-09-04-production-ladder-marginal-value-tail-audit-001.md), [`solver-scheduling-policy.md`](solver-scheduling-policy.md), current capability map `reports/stress/technique-niches/2026-09-03/level-capability.json`.

### 3. Workstream 1: automatic solver action selection

**State:** **active for parallel analysis; production routing changes remain downstream of portal restoration and WS2 allocation semantics.**

Do not read “downstream” as “idle”: existing capability, lifecycle, provenance, profile, variant, census, and trace evidence can be mined and replicated while experiments run or are blocked. Promote only signals surviving holdout/replication; exploratory slicing is not a routing policy.

Closed selector residues stay closed: the 35-row cohort is reconciled; multi-portal repair-over-beam reduced to two missing-exposure rows after a 0-gain/2-loss A/B; clockwise `perimeterSweep` disappears under matched isolated attribution. See the [`35-row`](../reports/2026-09-07-r03195-production-census-attribution-reconciliation-001.md), [`multi-portal`](../reports/2026-09-07-multi-portal-repair-over-beam-selector-reconciliation-001.md), and [`perimeter`](../reports/2026-09-05-perimeter-bias-production-attribution-confound-audit-001.md) reconciliations.

Compositional routing predicates expose a materially stronger **risk cohort**: 396 levels simultaneously meet the existing intersection-heavy, must-cross-heavy, and multi-portal predicates, but only 118/396 (29.8%) are current production-solved. It contains 278/725 misses and 242/604 misses without an isolated T1 winner, stably across even/odd ID halves. First-match `routingRegime` calls them all intersection-heavy and hides the interaction. Cohort-selection evidence, not an action selector. See [`../reports/2026-09-08-routing-predicate-composition-and-capability-risk-001.md`](../reports/2026-09-08-routing-predicate-composition-and-capability-risk-001.md).

A tested 18-feature static topology/placement bundle adds no material held-out value beyond the coarse structural fields (production-failure AUC 0.845 vs 0.842; no-T1 residual 0.701 vs 0.710). Closed as a general selector extension. See [`../reports/2026-09-08-cpsat-rescue-cohort-regeneration-and-selector-001.md`](../reports/2026-09-08-cpsat-rescue-cohort-regeneration-and-selector-001.md).

The portal carve-outs are now the first causal explanation to resolve: four production mechanisms are disabled outright on portal levels, which hold 551/725 misses and 464/604 misses without an isolated winner. The immediate MC-restoration population also covers most of the current triple-overlap risk population: the 396 triple-overlap levels are 74.7% of the 530 portal+must-cross levels, and they contain 278/337 (82.5%) of portal+must-cross misses and 242/288 (84.0%) of that population's misses without an isolated T1 winner. Do not classify that residue as unexplained reasoning failure until the restoration tranche has been tested and the production boundary refreshed.

**Next gate:** parallelize the existing-data join where cheap, but freeze any new propagation implementation. After portal restoration, refresh lifecycle/capability evidence inside the triple-overlap cohort; classify the remaining informative misses as allocation/exposure, search-policy, or reasoning/representation. Build observer-only joint propagation only for a recurring reasoning family that survives that separation. Production routing changes remain downstream. See [`the handoff`](../reports/2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md).

Details: [`../reports/2026-09-05-solver-open-question-evidence-reconciliation.md`](../reports/2026-09-05-solver-open-question-evidence-reconciliation.md) and `node scripts/research-status-index.mjs --compact --query=<term>`.

## Active workstreams

Rows sort by stable workstream ID, not execution priority.

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 1 | Automatic solver action selection | **ACTIVE / PARALLEL ANALYSIS; PRODUCTION CHANGES DOWNSTREAM** | Mine existing evidence, but defer new propagation/routing implementation until portal restoration refreshes the triple-overlap residue; then classify failure roles and promote only recurring held-out evidence. |
| 2 | Budget model + fixed-work scheduler repricing | **ACTIVE / SECOND PRIORITY** | After portal restoration, close 2A's three bounded decisions, refresh the ladder/capability boundary, then resume 2B scheduler construction. |
| 6 | Repair reachability/reconstructability | **SUPPORTING / NO CURRENT QUESTION** | Reopen only with a cheaper source of labelled cases or materially new reconstruction evidence; do not repeat concluded recurrence/static-feature scans. |
| 7 | Architectural speed/execution substrate | **ACTIVE SUPPORTING / NO CURRENT CANDIDATE** | Reopen only for a materially different mechanism or newly measured hotspot; the scorer and named fused-kernel descendants are closed. |

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

## Deferred / on-demand workstreams

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 5 | Exact/reference-model program | **ON DEMAND / INTEGRITY GATE SATISFIED** | Deterministic regeneration now yields 280 retained CP-SAT levels, 26 current production misses, 13 without an isolated T1 winner, and 12 satisfying both residual predicates. A simple shorter/lower-load rule is internally parity-stable but remains exploratory; use it only to prespecify a future temporal/new-label holdout. Reuse the 12 exact solutions as counterexamples now; do not run broad new CP-SAT compute or production CP-SAT. See [`../reports/2026-09-08-cpsat-rescue-cohort-regeneration-and-selector-001.md`](../reports/2026-09-08-cpsat-rescue-cohort-regeneration-and-selector-001.md). |

## Standing research rules

- Use `workSpent` for cross-technique allocation; raw nodes are within-technique diagnostics. Beam/repair and DFS/admissible-order have materially different nodes-per-wall-time, so wall budgets are not technique-neutral either.
- New actions/configurations expand the menu, not the default total budget.
- Level-blindness is not generalization. Confirmation strength scales with selection/tuning pressure.
- A clear negative closes the tested form unless materially new evidence changes its premise.
- Hold out independent units, including whole variant parents/families where applicable.
- After a capability/census refresh, reverify fragile support claims. Singleton-exclusive evidence is materially less temporally robust and more budget-edge than high-multiplicity support; same-family doubletons are not true cross-family redundancy.
- Scheduler/repricing work must audit rare/specialist retention, not only aggregate solves or work.
- For late-stage repricing, nominal reach/attempt records are not participation: require nonzero target-stage work before interpreting an A/B.
- Portal restoration currently precedes ladder repricing and new joint-propagation implementation; remeasure the production boundary after material restorations land.
- When one GHA-dependent candidate is blocked, traverse other independent portal-restoration gates, 2A candidates, WS1 local analysis, WS5 bounded local analysis, specialist docs, and deferred questions before declaring the solver queue idle.
- Reconcile old “open” questions against later evidence before new compute; carry forward only the smallest unexplained residue.
- Prefer existing evidence and the smallest value-of-information test before broad compute.

## Cheap evidence routing

Before opening large reports or generating new data:

- prior research: `node scripts/research-status-index.mjs --compact --query=<term>`;
- existing tools: `node scripts/tooling-census.mjs --compact --query=<term>`;
- research assets/joins: `node scripts/research-asset-query.mjs --query=<term>`;
- corpus shape: `node scripts/corpus-query.mjs --corpus=stress2`.

Use [`solver-research-data-assets.md`](solver-research-data-assets.md) for evidence-topology guidance when the compact asset query is insufficient. Use [`solver-research-post-naming-resumption.md`](solver-research-post-naming-resumption.md) only when translating frozen pre-cleanup evidence with historical names/contracts.

## Closed-form lookup

Do not preserve rejected chronology here. Search the named mechanism through `research-status-index --compact`, then open the matched report or a frozen workstream snapshot when a historical disposition matters.

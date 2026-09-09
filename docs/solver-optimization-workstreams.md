# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, workstream state, and next gates.
> **Reconciled:** 2026-09-09.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

Keep this file **current-state only**. When evidence changes a state or gate, replace the old statement instead of appending chronology. Detailed experimental history belongs in dated reports; historical snapshots live under `docs/archive/snapshots/`.

Workstream IDs are stable identifiers, not ranks. Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling/allocation: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence/holdouts: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Deferred/reopen material: [`solver-future-work.md`](solver-future-work.md).

## Current execution priority

### 1. Workstream 2: fixed-work scheduler allocation and repricing

**State:** active and first in execution order.

Budget semantics and the ms-derived additive-tier migration are complete. Equal-work pricing and static-portfolio work show substantial work-efficiency headroom, while real production still retains additional coverage. The immediate job is therefore no longer “design a scheduler from scratch”; it is first to close a small set of mature production repricing decisions, then use the cleaner ladder as the substrate for broader scheduler construction.

#### 2A. Production repricing / promotion closeout

These are independent bounded decisions. A blocked run for one is **not** a reason to idle the entire workstream; move to the next safe candidate or to WS1 analysis while preserving each candidate's frozen evidence contract.

1. **Admissible-order non-default retry fraction `1.0 → 0.18`.** Development retained all 12/76 solves; the fresh production A/B was non-informative because the target retry expanded zero nodes. **Next gate:** a matched-work test with nonzero target-stage work as a frozen participation requirement. Production remains `1.0`. See [`confirmation 006`](../reports/2026-09-05-admissible-order-non-default-retry-repricing-confirmation-006.md) and [`production A/B 001`](../reports/2026-09-05-admissible-order-non-default-retry-production-ab-001.md).
2. **Repair late-probe retry `7 → 6` seeds.** Seed 7 adds no reached-level best result; seed 6 remains load-bearing. **Next gate:** frozen population-scale fixed-work confirmation; require zero solve loss, material saving, and no seed-7-exclusive rescue. See [`preflight`](../reports/2026-09-05-repair-late-probe-six-seed-confirmation-preflight.md).
3. **Goal-attraction-disabled retry fresh work pool.** Development was +1/-0, random confirmation was null, and the stage is starved on 605/725 misses. **Next gate:** confirmation 002 on an independently selected starvation cohort; close/demote if real participation still yields no gains. See [`preflight`](../reports/2026-09-05-goal-attraction-disabled-retry-fresh-work-pool-confirmation-002-preflight.md).

All three remain separate causal questions. Do not bundle them into one scheduler treatment.

#### 2B. Broader scheduler / allocation construction

After the cheap production repricing decisions above are settled, resume broader fixed-work allocation: residual/tranche pricing, simple static routing/order, protected complementary capability, and only then richer dynamic policies if simple policies leave measured held-out headroom.

Standing evidence shows large allocation headroom; use `workSpent`, not raw nodes, for cross-technique pricing.

**WS2B candidate: resumable portfolio tranche.** The failed one-shot static scheduler stays closed, but its production postmortem found 3/4 coverage losses were already-present beams capped only ~2–12% short. Test the frozen portfolio-18 first pass plus same-policy continuation of capped beam attempts inside the same 67M envelope; first make exact continuation correct at widths 2000/5000, then run the fresh fixed-work A/B. Policy-switch resumability remains separate. See [`../reports/2026-09-05-static-portfolio-resumable-tranche-salvage-preflight.md`](../reports/2026-09-05-static-portfolio-resumable-tranche-salvage-preflight.md) and [`solver-search-resumability.md`](solver-search-resumability.md).

**WS2B candidate: priced residual lane.** Among 122 current misses with an isolated winner, 45 lacked winning-action exposure and 77 remained unresolved after exposure. After 2A, treat them as separate populations; require explicit total work, specialist retention, and production-exclusive gains. See [`the handoff`](../reports/2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md).

Primary evidence: [`../reports/2026-09-04-production-ladder-marginal-value-tail-audit-001.md`](../reports/2026-09-04-production-ladder-marginal-value-tail-audit-001.md), [`solver-scheduling-policy.md`](solver-scheduling-policy.md), current capability map `reports/stress/technique-niches/2026-09-03/level-capability.json`.

### 2. Workstream 1: automatic solver action selection

**State:** **active for parallel analysis; production routing changes remain downstream of WS2 where allocation semantics matter.**

Do not interpret “downstream” as “idle.” Existing capability, lifecycle, provenance, profile, variant, census, and trace evidence can be mined and independently replicated while WS2 experiments run or are blocked. Promote only signals that survive appropriate holdout/replication; exploratory slicing is not a routing policy.

Closed selector residues stay closed: the old 35-row cohort is fully reconciled; multi-portal repair-over-beam reduced to two missing-exposure rows after a broad 0-gain/2-loss A/B; and clockwise `perimeterSweep` disappears under matched isolated attribution. See the [`35-row`](../reports/2026-09-07-r03195-production-census-attribution-reconciliation-001.md), [`multi-portal`](../reports/2026-09-07-multi-portal-repair-over-beam-selector-reconciliation-001.md), and [`perimeter`](../reports/2026-09-05-perimeter-bias-production-attribution-confound-audit-001.md) reconciliations.

Compositional routing predicates expose a materially stronger **risk cohort**: 396 levels simultaneously meet the existing intersection-heavy, must-cross-heavy, and multi-portal predicates, but only 118/396 (29.8%) are current production-solved. The cohort contains 278/725 current misses and 242/604 current misses without an isolated T1 winner; the direction is stable across even/odd ID halves. First-match `routingRegime` labels all of them intersection-heavy and hides this interaction. This is cohort-selection evidence, not an action selector. See [`../reports/2026-09-08-routing-predicate-composition-and-capability-risk-001.md`](../reports/2026-09-08-routing-predicate-composition-and-capability-risk-001.md).

A tested 18-feature static topology/placement bundle adds no material held-out value beyond the existing coarse structural fields (production-failure AUC 0.845 baseline vs 0.842 combined; no-T1 residual AUC 0.701 vs 0.710). Close that bundle as a general selector extension. See [`../reports/2026-09-08-cpsat-rescue-cohort-regeneration-and-selector-001.md`](../reports/2026-09-08-cpsat-rescue-cohort-regeneration-and-selector-001.md).

**Next gate:** join lifecycle, isolated-winner, provenance/fingerprint, trace, and variant evidence inside the triple-overlap cohort; classify allocation, search-policy, and reasoning failures. Build observer-only joint propagation only for a recurring reasoning family. Production changes remain downstream. See [`the handoff`](../reports/2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md).

Details: [`../reports/2026-09-05-solver-open-question-evidence-reconciliation.md`](../reports/2026-09-05-solver-open-question-evidence-reconciliation.md) and `node scripts/research-status-index.mjs --compact --query=<term>`.

## Active workstreams

Rows are sorted by stable workstream ID, not execution priority.

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 1 | Automatic solver action selection | **ACTIVE / PARALLEL ANALYSIS; PRODUCTION CHANGES DOWNSTREAM** | Complete the triple-overlap cross-evidence join and classify failure roles; promote an observer or routing test only from recurring held-out evidence with a compatible WS2 allocation contract. |
| 2 | Budget model + fixed-work scheduler repricing | **ACTIVE / CURRENT PRIORITY** | Close 2A's three bounded repricing decisions, then resume 2B scheduler construction. A blocked candidate does not block the other 2A candidates or WS1 analysis. |
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
- When one GHA-dependent candidate is blocked, traverse other independent 2A candidates, WS1 local analysis, WS5 bounded local analysis, specialist docs, and deferred questions before declaring the solver queue idle.
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

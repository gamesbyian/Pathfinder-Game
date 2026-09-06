# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, workstream state, and next gates.
> **Reconciled:** 2026-09-05.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

Keep this file **current-state only**. When evidence changes a state or gate, replace the old statement instead of appending chronology. Detailed experimental history belongs in dated reports; historical snapshots live under `docs/archive/snapshots/`.

Workstream IDs are stable identifiers, not ranks. Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling/allocation: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence/holdouts: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Deferred/reopen material: [`solver-future-work.md`](solver-future-work.md).

## Current execution priority

### 1. Workstream 2: fixed-work scheduler allocation and repricing

**State:** active and first in execution order.

Budget semantics and the ms-derived additive-tier migration are complete. Equal-work pricing and static-portfolio work show substantial work-efficiency headroom, while real production still retains additional coverage. The immediate job is therefore no longer “design a scheduler from scratch”; it is first to close a small set of mature production repricing decisions, then use the cleaner ladder as the substrate for broader scheduler construction.

#### 2A. Production repricing / promotion closeout

These are independent bounded decisions. A blocked run for one is **not** a reason to idle the entire workstream; move to the next safe candidate or to WS1 analysis while preserving each candidate's frozen evidence contract.

1. **Admissible-order non-default retry fraction `1.0 → 0.18`.** Confirmation 006 lost zero solves on the full 76-level informative population (identical 12/76 solve set). Production A/B 001 on a fresh 150-level population was non-informative rather than confirmatory: both arms were identical at 81/150, but the treatment's target retry recorded 276 nominal attempts on 69 levels while expanding **0 nodes** because the strict whole-solve cap was exhausted upstream. **Next gate:** redesign the matched-work promotion test so nonzero target-stage work is a frozen participation requirement, using independent control-side reach/spend evidence or an envelope that leaves executable work for the late retry. Production remains fraction `1.0`. See [`../reports/2026-09-05-admissible-order-non-default-retry-repricing-confirmation-006.md`](../reports/2026-09-05-admissible-order-non-default-retry-repricing-confirmation-006.md) and [`../reports/2026-09-05-admissible-order-non-default-retry-production-ab-001.md`](../reports/2026-09-05-admissible-order-non-default-retry-production-ab-001.md).
2. **Repair late-probe multi-seed retry `7 → 6` seeds.** The current discovery audit found seed 7 adds no additional reached-level best result beyond seeds 1–6; seed 6 remains load-bearing, so do not generalize this into broader seed pruning. **Next gate:** run the frozen population-scale fixed-work confirmation and promote only on zero solve loss plus material work saving and no seed-7-exclusive rescue. See [`../reports/2026-09-05-repair-late-probe-six-seed-confirmation-preflight.md`](../reports/2026-09-05-repair-late-probe-six-seed-confirmation-preflight.md).
3. **Goal-attraction-disabled retry fresh work pool.** Development was +1/-0 with direct mechanism reproduction; the first fresh random confirmation was a clean null. Full-scale lifecycle evidence now shows this retry starved on 605/725 unsolved levels showing any starvation pattern. **Next gate:** confirmation 002 uses a cohort selected only from independent historical control-side starvation so the mechanism is actually exercised. If the fresh pool converts starvation into real attempts but still produces no gains, close or heavily demote the unconditional fresh-pool form. See [`../reports/2026-09-05-goal-attraction-disabled-retry-fresh-work-pool-confirmation-002-preflight.md`](../reports/2026-09-05-goal-attraction-disabled-retry-fresh-work-pool-confirmation-002-preflight.md).

All three remain separate causal questions. Do not bundle them into one scheduler treatment.

#### 2B. Broader scheduler / allocation construction

After the cheap production repricing decisions above are settled, resume broader fixed-work allocation: residual/tranche pricing, simple static routing/order, protected complementary capability, and only then richer dynamic policies if simple policies leave measured held-out headroom.

Standing evidence still supports this direction: isolated portfolios recover most measured capability at much lower work, production-vs-isolated cheapest-known cost has very large headroom, and production failure spends materially more attempts/work than successful levels. Use `workSpent`, not raw nodes, for cross-technique pricing.

**Resumability is enabling infrastructure, not a separate priority.** One `intersectionHarvest → objectiveFirst` inherited-frontier handoff produced 2/60 inherited-only solves in development, while repeated/staged switching and naive beam→DFS handoff were negative. Continue resumability only when a concrete WS2 allocation question needs a continuation primitive; do not promote the primitive itself. See [`solver-search-resumability.md`](solver-search-resumability.md).

Primary evidence: [`../reports/2026-09-04-production-ladder-marginal-value-tail-audit-001.md`](../reports/2026-09-04-production-ladder-marginal-value-tail-audit-001.md), [`solver-scheduling-policy.md`](solver-scheduling-policy.md), current capability map `reports/stress/technique-niches/2026-09-03/level-capability.json`.

### 2. Workstream 1: automatic solver action selection

**State:** **active for parallel analysis; production routing changes remain downstream of WS2 where allocation semantics matter.**

Do not interpret “downstream” as “idle.” Existing capability, lifecycle, provenance, profile, variant, census, and trace evidence can be mined and independently replicated while WS2 experiments run or are blocked. Promote only signals that survive appropriate holdout/replication; exploratory slicing is not a routing policy.

Recent evidence provides a stronger substrate than this workstream previously had: production-unsolved levels separate into starvation/capping failure modes; capability multiplicity predicts real production success within each corpus; the broad structural-risk block (`constrainedObjects`, portals, constrained-object density, turn-constraint load) replicated across natural holdouts and a second outcome; and near-miss technique identity is known to be exposure-confounded. Use these to formulate broader mechanics/state-conditioned premises rather than nearby placement tweaks.

**Next gate:** continue local cross-evidence analysis and nominate only simple legal level-blind selectors with replicated signal. Production routing/action-order changes should wait for the relevant WS2 allocation contract unless the proposed change is demonstrably allocation-neutral. Isolated rescuer identity alone is not enough.

Relevant evidence: [`../reports/2026-09-04-starved-vs-capped-structural-signature-001.md`](../reports/2026-09-04-starved-vs-capped-structural-signature-001.md), [`../reports/2026-09-04-near-miss-technique-exposure-bias-001.md`](../reports/2026-09-04-near-miss-technique-exposure-bias-001.md), [`../reports/2026-09-05-structural-risk-factor-corpus-holdout-replication-001.md`](../reports/2026-09-05-structural-risk-factor-corpus-holdout-replication-001.md), [`../reports/2026-09-05-multiplicity-production-success-robustness-by-corpus-001.md`](../reports/2026-09-05-multiplicity-production-success-robustness-by-corpus-001.md).

## Active workstreams

Rows are sorted by stable workstream ID, not execution priority.

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 1 | Automatic solver action selection | **ACTIVE / PARALLEL ANALYSIS; PRODUCTION CHANGES DOWNSTREAM** | Mine/replicate legal selectors now; promote a production routing change only when it has a broad replicated premise and a compatible WS2 allocation contract. |
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
| 5 | Exact/reference-model program | **ON DEMAND / CONCRETE LOCAL GATE AVAILABLE** | Before any new CP-SAT compute, locally characterize the existing referee-valid CP-SAT rescue cohort (45 current production-unsolved rescues; 13 isolated-no-winner rescues) against native-unsolved controls using replicated structural/lifecycle/census features and a predeclared holdout. No stable narrow selector → keep WS5 strictly on demand. Stable selector → use it first as a bounded exact-label acquisition gate, not production CP-SAT. See [`../reports/2026-09-05-cpsat-on-demand-rescue-gate-design.md`](../reports/2026-09-05-cpsat-on-demand-rescue-gate-design.md). |

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

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

**Next gate:** derive a percentile-based smaller work ceiling for `admissible-order-alternate-tiebreak-retry` from isolated cost-when-solving evidence, then confirm the repricing on an independent ~150-level population under a fixed work envelope. Report paired gains/losses, total `workSpent`, stage reach, and rare-capability retention. Do not reuse the selected 40-level pilot as confirmation.

Primary evidence: [`../reports/2026-09-04-production-ladder-marginal-value-tail-audit-001.md`](../reports/2026-09-04-production-ladder-marginal-value-tail-audit-001.md), [`solver-scheduling-policy.md`](solver-scheduling-policy.md), current capability map `reports/stress/technique-niches/2026-09-03/level-capability.json`.

### 2. Workstream 1: automatic solver action selection

**State:** active but downstream of Workstream 2.

The post-976 residual still contains missing-exposure/starvation cases, but nearby placement tweaks mined from those rows are closed. The promoted must-cross+flipper wide-beam exposure stands; the selective diverse-IH and reserve-preserving neighboring forms are closed.

**Next gate:** resume only after the current Workstream-2 allocation gate resolves, or when cross-evidence establishes a broader mechanics/state-conditioned action-selection premise. Isolated rescuer identities alone are not enough. Query existing capability, lifecycle, provenance, profile, variant, and trace evidence before generating new data.

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
- After a meaningful capability change or census refresh, rebuild/rejoin the capability map before relying on old support classes.
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

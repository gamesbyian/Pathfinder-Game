# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, state, and next gates.
> **Reconciled:** 2026-09-12.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness/generalization.

Current-state only. Detailed evidence belongs in reports; history under `docs/archive/snapshots/`.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Capability memory: [`solver-capability-memory.md`](solver-capability-memory.md). Deferred material: [`solver-future-work.md`](solver-future-work.md).

Program lens: **capability composition** exposes/selects/allocates demonstrated capability; **capability acquisition** creates generic capability where no known action succeeds.

## Current execution priority

### 1. Workstream 2: residual capability + fixed-work allocation

**State:** ACTIVE / FIRST PRIORITY.

**Production boundary:** run `34683011115` (`PRUNE_MC_PORTAL_FORCED_NEIGHBOR` default-on, lifecycle telemetry; reproduced by `34674256538`) is **100/102 Corpus 1 + 1,048/1,700 Corpus 2**, leaving 652 C2 misses.

**Corrected atlas:** 22 not-offered, 39 offered-but-unreached/starved, 37 reached/comparable-work-failed, 123 no-T1-winner-but-historical-candidate, **431 no known admissible/T1 candidate**. A T1 `variantLabel` bug had hidden clean `repair|guidance=turn-biased` cells; priority is unchanged. [`atlas`](../reports/2026-09-12-ws2-post-refresh-residual-atlas-and-capability-memory-census-001.md), [`fix`](../reports/2026-09-12-repair-turn-biased-t1-census-misclassification-001.md)

**Cheap rejoin due now:** inspect the **98 class-1/2/3 rows** (`22+39+37`) for an already-legal low-cost solve batch under the corrected atlas/current policy before new acquisition compute. This existing-data pass may run beside future-feasibility analysis. Class 4 is excluded because its 123 rows have historical production-context candidates rather than current base-T1 winners; reconcile them first. The closed-negative repair-turn-biased policy does not reopen merely because rows moved class. [`closeout`](../reports/2026-09-12-cross-line-unharvested-residue-closeout-001.md)

**Dispositions:** must-cross neighbour-budget propagation, connectivity-volume portal check, `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`, and goal-attraction-disabled retry are **PROMOTED**. Portal coarse-state merge, repair late-probe `7->6` seeds, and portfolio-18 resumable tranche are **CLOSED NEGATIVE/NULL**. Admissible-order retry `1.0->0.18` is **DEFERRED**. [`ledger`](solver-opt-in-experiment-ledger.md)

**Class-5 lines closed this cycle:**

- **First-loss:** 28/28 across two samples reproduce width-insensitive `score-width-culled` loss; DFS shows no shared local-scorer failure, repair barely approaches those trajectories at 10x budget, and two bucket canaries solve nothing. [`dev`](../reports/2026-09-11-bounded-class4-class5-first-loss-phenotyping-001.md), [`confirmation`](../reports/2026-09-11-ws2-independent-first-loss-confirmation-001.md), [`repair`](../reports/2026-09-11-repair-side-first-loss-exposure-001.md)
- **Family/reference:** class-5 `swap`/`cs` rescue is confound-dominated; causal use needs a decoupled control. [`report`](../reports/2026-09-12-class5-family-reference-comparison-001.md)
- **Capability memory:** six sources nominate 65/652 residual misses, **zero class 5**. [`report`](../reports/2026-09-12-repair-turn-biased-t1-census-misclassification-001.md)
- **Freshness:** suspicious same-revision `isolatedTechnique` successes were 5/5 T1 variants, 0/5 base T1, all `coarse-state-near-tie-retention-off`; production already reaches the retry. [`reconciliation`](../reports/2026-09-12-class5-microscope-branch-reconciliation-001.md)
- **Microscope:** `R03229` width-2000 first-loss gives LIVE culled witness / DEAD rank-1 / DEAD cutoff survivor, recurring the August B1/B2 mechanism rather than creating a new premise. [`reconciliation`](../reports/2026-09-12-class5-microscope-branch-reconciliation-001.md)

**Current acquisition gate: bounded future-feasibility rejoin.** Rejoin B1/B2 + `R03229`; test at most 2-4 runtime-legal summaries from exact-resource capacity, residual-topology scarcity, and joint-obligation compatibility. Mechanic buckets preserve fresh progress on selected solved siblings but class-5 bucket canaries are solve-null, so progress/bucket rarity is a negative control, not feasibility evidence. Perturbation probes are difficulty-confounded. Perturbation-rescue density and clean/confounded mechanic-composition parents may calibrate independently selected descriptors only; they cannot select then validate one or expand the candidate budget. Require information beyond score/rank/prunes/progress and recurrence across unrelated parents; otherwise close the route. [`handoff`](../reports/2026-09-12-future-feasibility-premise-rejoin-001.md)

**Novelty bar:** B1/B2 already established `dead rank-1 / live known alternative` and `live / live`; advancement needs a recurring mechanism-specific distinction explaining exact future feasibility better than current score/prune information. [`B2`](../reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md)

### 2. Workstream 1: automatic solver action selection

**State:** ACTIVE / PARALLEL ANALYSIS.

Use capability, lifecycle, provenance, profile, family, census, trace, accepted-path and capability-memory evidence to distinguish `not exposed` from `exposed-and-failed`, and technique-relative response from shared-capability failure. IDs/outcomes/hints remain offline diagnostics. Production selectors require legal current-level/current-solve signals and confirmation proportional to selection pressure.

**Cross-hint provenance audit active.** Measure whether one canonical discovery-event identity attaches to multiple distinct paths on the same level. Classify exact collisions by producer multiplicity contract before near-collision or determinism replay; until classified, repeated paths carrying one event identity are dependent evidence. [`report`](../reports/2026-09-12-cross-hint-provenance-relations-001.md)

**Structural-response extension closed** for `R02687`/objectiveFirst and `R02094`/intersectionHarvest. Stage 3 found family flips; stages 4-5 found no licensed selector from n=2. Reopen only for a new pair/premise. Mechanic buckets protecting fresh progress remains useful WS2 constraint evidence. [`stage 5`](../reports/2026-09-12-ws1-stage5-first-divergence-result-001.md)

### 3. Parallel capability-acquisition probe

**State:** CLOSED — portal-terminal relocation instrument confounded.

Mechanic-composition pilot: 2/5 clean predicted chains, 2/5 general-difficulty confounds, one non-reproduced rescue. Together with population-scale `swap`/`cs` confounding, raw perturbation rescue is not causal evidence. Reopen only with a materially different manipulation proving the specific edit rather than generic loosening caused the effect. [`result`](../reports/2026-09-12-mechanic-composition-pilot-001-result.md)

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Residual capability + allocation | **ACTIVE / FIRST** | Run 98-row class-1/2/3 harvest check; in parallel test 2-4 future-feasibility summaries read-only. |
| 1 | Automatic action selection | **ACTIVE / PARALLEL** | Classify exact cross-hint collisions; structural-response ladder otherwise closed. |
| 6 | Repair reachability | **SUPPORTING** | Reopen when live continuation needs interior/early commitment revision. |
| 7 | Architectural speed | **SUPPORTING** | Reopen for earned mechanism with measured runtime cost/new hotspot. |
| 3 | Generalization | **METHOD COMPLETE** | Preserve grouped-family independence; scale confirmation with selection pressure. |
| 8 | Isolated capability missed by production | **SUBSUMED BY WS1** | Isolated winners are selection evidence, not permanent tail entitlement. |
| 0 | Restart/randomization + learned-failure search | **CLOSED IN TESTED FORMS** | Reopen only for recurring commitment-diversity/restart evidence. |
| 4 | Beam retention | **CLOSED IN TESTED FORMS** | Future-feasibility may nominate a new axis; generic width/bucket/scorer forms stay closed. |
| 5 | Exact/reference model | **ON DEMAND** | Use B1/B2 + R03229 labels first; expand only if the descriptor question earns it. |

## Standing research rules

- Use `workSpent` across techniques; raw nodes are within-technique diagnostics. New actions/configs normally compete inside total work.
- Level-blindness is not generalization. IDs, historical outcomes, hints, family labels and capability-memory membership never become runtime routing inputs.
- Preserve **disposition** and **capability signature** separately. Closed treatments may remain useful offline evidence.
- Historical gain/loss intersections with current residual are nominations until reconciled; missing provenance stays unknown.
- Provenance multiplicity is dependence unless the producer contract says otherwise.
- Clear negatives close tested forms absent a materially new premise; no-op/behavior-identical retries buy nothing.
- Hold out independent units and scale confirmation with tuning/selection pressure.
- Reusable benchmark/census rows require matching protocol identity; nominal stage reach is not participation.
- Result identity, population integrity, resolved configuration/provenance and budget semantics are research-control-plane invariants.
- After material promotion or provenance reinterpretation, refresh/rejoin residuals and cheaply check classes 1-3 for an already-legal solve batch. Class 4 needs fresh reconciliation.
- A validated hint prefix proves that prefix live, not alternatives dead.
- Before escalating a persistent residual, ask whether materially different actions lose known-live material at the same boundary.
- A single-level microscope may generate a premise, never a production exception; require independent phenotype-matched confirmation.
- Future-feasibility descriptors must be runtime-legal and incremental to score/prune/progress information; exact labels are offline truth.
- Convenience labels/summary booleans are not causal fields; use explicit provenance/config fields for decision-bearing joins.
- Reconcile old questions against newer evidence before new compute. Prefer the smallest information-value test.

## Cheap evidence routing

- prior research: `node scripts/research-status-index.mjs --compact --query=<term>`
- tools: `node scripts/tooling-census.mjs --compact --query=<term>`
- assets: `node scripts/research-asset-query.mjs --query=<term>`
- capability memory: `node scripts/solver-capability-memory.mjs --manifest=<manifest.json> --out=tmp/capability-memory.json --summary-out=tmp/capability-memory.md`
- corpus shape: `node scripts/corpus-query.mjs --corpus=stress2`
- provenance: `node scripts/run-bundled.mjs scripts/stress/hint-provenance-evidence-report.mjs -- --corpus=all --out=tmp/hint-provenance-evidence.json`

Search named mechanisms through `research-status-index --compact`; chronology belongs in dated reports.
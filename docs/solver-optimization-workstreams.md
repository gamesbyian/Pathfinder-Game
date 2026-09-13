# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, state, and next gates.
> **Reconciled:** 2026-09-12.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness/generalization.

Current-state only. Detailed evidence belongs in reports; history under `docs/archive/snapshots/`.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Capability memory: [`solver-capability-memory.md`](solver-capability-memory.md). Question relations: [`solver-research-question-relations.md`](solver-research-question-relations.md). Deferred material: [`solver-future-work.md`](solver-future-work.md).

Program lens: **capability composition** exposes/selects/allocates demonstrated capability; **capability acquisition** creates generic capability where no known action succeeds.

## Current execution priority

### 1. Workstream 2: residual capability + fixed-work allocation

**State:** ACTIVE / FIRST PRIORITY.

**Production boundary:** run `34683011115` (`PRUNE_MC_PORTAL_FORCED_NEIGHBOR` default-on, lifecycle telemetry; reproduced by `34674256538`) is **100/102 Corpus 1 + 1,048/1,700 Corpus 2**, leaving 652 C2 misses.

**Corrected atlas:** 22 not-offered, 39 offered-but-unreached/starved, 37 reached/comparable-work-failed, 123 no-T1-winner-but-historical-candidate, **431 no known admissible/T1 candidate**. [`atlas history`](../reports/2026-09-12-ws2-post-refresh-residual-atlas-and-capability-memory-census-001.md), [`fix`](../reports/2026-09-12-repair-turn-biased-t1-census-misclassification-001.md), [`capability-union correction`](../reports/2026-09-12-capability-memory-union-reconciliation-001.md)

**98-row cheap rejoin closed.** Class 1 contains no free menu headroom: 15/22 remain inside the already-negative very-high-intersection strict-work exposure regime and the other 7 have zero protected-suffix headroom. Class 3 is already exposed-and-failed. Class 2 mostly rejoins priced/deferred repair/admissible policies. One narrower seam survives: **7 class-2 levels have isolated must-turn-biased repair wins while current policy reaches repair context but omits that guidance**. This is a changed-treatment nomination for a bounded additive late must-turn-biased probe, not an already-legal harvest. [`result`](../reports/2026-09-12-class123-cheap-harvest-rejoin-001.md)

**Class-4 capability-memory aggregate corrected.** The published six-source union of 65 was arithmetically impossible because portal coarse-state merge alone has 137 current-residual historical nominations. Existing-data reconstruction proves a **153-row lower bound** across just portal coarse-state merge plus displaced production capability, including **116/123 class-4 rows** and zero class 5. Portal coarse-state merge alone nominates **113/123 class-4 rows**. Its globally enabled form remains correctly closed negative because of 12 losses and the hard `R01273` regression, but its positive basin now owes the capability-memory contract's cheap freshness test before class 4 is treated as exhausted. Historical nominations are not solve claims. [`correction`](../reports/2026-09-12-capability-memory-union-reconciliation-001.md)

**Class-5 lines closed this cycle:** first-loss is width-insensitive `score-width-culled`; two retention canaries solve nothing; `swap`/`cs` family rescue is confound-dominated; bounded known-capability evidence reaches zero class 5; freshness reconciliation found no clean base-T1 harvest; `R03229` reproduces the B1/B2 LIVE-culled / DEAD-preferred mechanism rather than a new one. [`first loss`](../reports/2026-09-11-ws2-independent-first-loss-confirmation-001.md), [`family`](../reports/2026-09-12-class5-family-reference-comparison-001.md), [`reconciliation`](../reports/2026-09-12-class5-microscope-branch-reconciliation-001.md)

**Simple future-feasibility descriptor route closed null.** A prespecified read-only pass over **31 exact-labelled states / 15 levels** tested six summaries from exact-resource capacity, residual-topology scarcity and joint-obligation compatibility. Every summary overlaps LIVE and DEAD; the existing joint-obligation observer emits zero reject verdicts on the labelled set. Do not expand this into post-hoc scalar feature fishing. The exact diagnosis remains real, but the next acquisition premise must change represented/reused information rather than add another nearby score feature. [`result`](../reports/2026-09-12-future-feasibility-descriptor-rejoin-result-001.md)

**Next WS2 gates, in parallel:**

1. **Class-4 freshness / highest immediate information value:** replay a tiny prespecified sample of current class-4 portal coarse-state-merge nominations under the existing default-off treatment, current code and production-shaped work semantics. This asks only whether the September 9 positive basin still exists. If stale/null, close immediately. If fresh, measure only enough of the nominated basin to size the next gate, then test the least disruptive changed-treatment exposure/allocation form. Do **not** reopen the globally enabled merge or ignore its `R01273` control regression.
2. **Class-2 composition / solve harvest:** implement the smallest default-off/additive late must-turn-biased repair probe that tests the seven-level seam without widening the full repair-fallback gate or stealing plain-repair work. Start on the cheap end (`R02768`, `R02180`), then matched-work/collateral confirmation before population scale.
3. **Acquisition / class 5:** test the recovered **reason-producing dead-state reuse** premise at the diagnostic gate only: can exact/reliable dead detections on hard residual solves be reduced to the same compact sound cause often enough that repeated exploration wastes material work? If recurrence is absent, close it. If present, only then shadow-test the smallest solve-local reason key. No CDCL/LCG or broad learned-search framework. [`excavation`](../reports/2026-09-12-solver-future-work-backlog-excavation-001.md)

**Dispositions:** must-cross neighbour-budget propagation, connectivity-volume portal check, `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`, and goal-attraction-disabled retry are **PROMOTED**. Portal coarse-state merge, repair late-probe `7->6` seeds, and portfolio-18 resumable tranche are **CLOSED NEGATIVE/NULL** in their tested forms. Admissible-order retry `1.0->0.18` is **DEFERRED**. A current class-4 freshness replay of the closed portal treatment's positive basin is diagnostic evidence recovery, not a disposition reversal. [`ledger`](solver-opt-in-experiment-ledger.md)

### 2. Workstream 1: automatic solver action selection

**State:** SUPPORTING / NO ACTIVE SELECTOR GATE.

Use capability, lifecycle, provenance, profile, family, census, trace, accepted-path and capability-memory evidence to distinguish `not exposed` from `exposed-and-failed`, and technique-relative response from shared-capability failure. IDs/outcomes/hints remain offline diagnostics. Production selectors require legal current-level/current-solve signals and confirmation proportional to selection pressure.

**Cross-hint provenance audit closed.** All 44,305 exact same-event/multiple-path identities are explained by replay/multi-output semantics or historical technique-census source-cell under-resolution already repaired in current provenance. The 160 apparently ordinary-search collisions are exactly the `isolated-technique` tail. No determinism replay or near-collision stage is earned. [`report`](../reports/2026-09-12-cross-hint-provenance-relations-001.md)

**Structural-response extension closed** for `R02687`/objectiveFirst and `R02094`/intersectionHarvest. Stage 3 found family flips; stages 4-5 found no licensed selector from n=2. Reopen only for a new pair/premise. [`stage 5`](../reports/2026-09-12-ws1-stage5-first-divergence-result-001.md)

### 3. Parallel capability-acquisition probe

**State:** CLOSED — portal-terminal relocation instrument confounded.

Mechanic-composition pilot: 2/5 clean predicted chains, 2/5 general-difficulty confounds, one non-reproduced rescue. Together with population-scale `swap`/`cs` confounding, raw perturbation rescue is not causal evidence. Reopen only with a materially different manipulation proving the specific edit rather than generic loosening caused the effect. [`result`](../reports/2026-09-12-mechanic-composition-pilot-001-result.md)

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Residual capability + allocation | **ACTIVE / FIRST** | In parallel: tiny class-4 portal coarse-state freshness replay; bounded late must-turn-biased repair pilot; diagnostic recurrence test for compact sound dead causes. |
| 1 | Automatic action selection | **SUPPORTING** | No live selector/provenance gate; reopen for a new legal decision signal or unexplained producer relation. |
| 6 | Repair reachability | **SUPPORTING** | Reopen when live continuation needs interior/early commitment revision. |
| 7 | Architectural speed | **SUPPORTING** | Reopen for earned mechanism with measured runtime cost/new hotspot. |
| 3 | Generalization | **METHOD COMPLETE** | Preserve grouped-family independence; scale confirmation with selection pressure. |
| 8 | Isolated capability missed by production | **SUBSUMED BY WS1** | Isolated winners are selection evidence, not permanent tail entitlement. |
| 0 | Restart/randomization | **CLOSED IN TESTED FORMS** | Reopen only for recurring commitment-diversity/restart evidence. |
| 4 | Beam retention | **CLOSED IN TESTED FORMS** | Generic width/bucket/scorer forms stay closed. |
| 5 | Exact/reference model | **ON DEMAND** | Expand exact labels only for an earned mechanism-specific question. |

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
- After material promotion or provenance reinterpretation, refresh/rejoin residuals and cheaply check classes 1-3; class 4 needs fresh reconciliation.
- A validated hint prefix proves that prefix live, not alternatives dead.
- A single-level microscope may generate a premise, never a production exception; require independent phenotype-matched confirmation.
- Exact labels are offline truth, never runtime steering. Failed compact future-feasibility summaries do not license feature accretion.
- Convenience labels/summary booleans are not causal fields; use explicit provenance/config fields for decision-bearing joins.
- Reconcile old questions against newer evidence before new compute. Prefer the smallest information-value test.
- At result closeout, update material **outbound** question relations as well as the local verdict: answers, triggers, constraints, calibration/negative controls, supersessions and duplicates belong in the sparse question registry when they would otherwise be easy to lose.

## Cheap evidence routing

- prior research + question relations: `node scripts/research-status-index.mjs --compact --query=<term>`
- question-only lookup: `node scripts/research-status-index.mjs --compact --kind=question --query=<term>`
- tools: `node scripts/tooling-census.mjs --compact --query=<term>`
- assets: `node scripts/research-asset-query.mjs --query=<term>`
- capability memory: `node scripts/solver-capability-memory.mjs --manifest=<manifest.json> --out=tmp/capability-memory.json --summary-out=tmp/capability-memory.md`
- corpus shape: `node scripts/corpus-query.mjs --corpus=stress2`
- provenance: `node scripts/run-bundled.mjs scripts/stress/hint-provenance-evidence-report.mjs -- --corpus=all --out=tmp/hint-provenance-evidence.json`

Search named mechanisms through `research-status-index --compact`; chronology belongs in dated reports.
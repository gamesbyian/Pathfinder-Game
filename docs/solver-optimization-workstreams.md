# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, state, and next gates.
> **Reconciled:** 2026-09-13.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness/generalization.

Current-state only. Detailed evidence belongs in reports; history under `docs/archive/snapshots/`.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Capability memory: [`solver-capability-memory.md`](solver-capability-memory.md). Question relations: [`solver-research-question-relations.md`](solver-research-question-relations.md). Deferred: [`solver-future-work.md`](solver-future-work.md).

Program lens: **capability composition** exposes/selects/allocates demonstrated capability; **capability acquisition** creates generic capability where no known action succeeds.

## Current execution priority

### 1. Workstream 2: residual capability + fixed-work allocation

**State:** ACTIVE / FIRST PRIORITY.

**Production boundary:** run `34683011115` (`PRUNE_MC_PORTAL_FORCED_NEIGHBOR` default-on; reproduced by `34674256538`) is **100/102 Corpus 1 + 1,048/1,700 Corpus 2**, leaving 652 C2 misses.

**Corrected atlas:** 22 not-offered, 39 offered-but-unreached/starved, 37 reached/comparable-work-failed, 123 no-T1-winner-but-historical-candidate, **431 no known admissible/T1 candidate**. [`atlas`](../reports/2026-09-12-ws2-post-refresh-residual-atlas-and-capability-memory-census-001.md), [`fix`](../reports/2026-09-12-repair-turn-biased-t1-census-misclassification-001.md), [`capability correction`](../reports/2026-09-12-capability-memory-union-reconciliation-001.md)

**98-row cheap rejoin closed.** Class 1 has no free menu headroom; class 3 is exposed-and-failed; class 2 mostly rejoins priced/deferred repair/admissible policies. One seam survives: **7 class-2 levels have isolated must-turn-biased repair wins while current policy reaches repair context but omits that guidance**. Test a bounded additive late must-turn-biased probe. [`result`](../reports/2026-09-12-class123-cheap-harvest-rejoin-001.md)

**Class 4 freshness CONFIRMED.** The corrected six-source capability-memory union is **179 rows** (`14/28/21/116/0` across classes 1–5), with a regenerable manifest for 5/6 sources and **167/652** reproduction. Portal coarse-state merge nominates **113/123 class-4 rows**; its global form stays closed negative after 12 losses including `R01273`. An 8-level stratified current-code replay solved **8/8, referee-valid**. The live question is the least-disruptive exposure form: a dead-last additive whole-ladder retry that runs only after failure. Do **not** reopen the global merge. [`correction`](../reports/2026-09-12-capability-memory-union-reconciliation-001.md), [`manifest`](../reports/2026-09-13-capability-memory-manifest-hardening-001.md), [`freshness`](../reports/2026-09-13-class4-portal-coarse-freshness-replay-001.md)

**Class-5 lines closed this cycle:** first-loss is width-insensitive `score-width-culled`; two retention canaries solve nothing; `swap`/`cs` rescue is confound-dominated; bounded known-capability evidence reaches zero class 5; no clean base-T1 harvest; `R03229` reproduces the B1/B2 LIVE-culled / DEAD-preferred mechanism. [`first loss`](../reports/2026-09-11-ws2-independent-first-loss-confirmation-001.md), [`family`](../reports/2026-09-12-class5-family-reference-comparison-001.md), [`reconciliation`](../reports/2026-09-12-class5-microscope-branch-reconciliation-001.md)

**Simple future-feasibility route closed null.** Six prespecified summaries over **31 exact-labelled states / 15 levels** all overlap LIVE and DEAD; the joint-obligation observer emits zero rejects. Do not resume with nearby scalar-feature accretion. The next acquisition premise must change represented/reused information. [`result`](../reports/2026-09-12-future-feasibility-descriptor-rejoin-result-001.md)

**Next WS2 gates, in parallel:**

1. **Class-4 allocation:** implement/validate the dead-last additive whole-ladder retry before population scale. Skip family mining; freshness is established and the question is allocation/collateral.
2. **Class-2 composition:** existing-family preflight is complete. Across the seven nominated parents, historical whole-ladder `cs`/`gr`/`swap` siblings solve only **8/210**; `R02768` contributes 5/30 while `R02180` is 1/30 and three parents are 0/30. First test the smallest default-off/additive late must-turn-biased repair probe on the deliberate contrast pair `R02768` (family-responsive) + `R02180` (family-rigid), with matched work and no plain-repair theft. If it earns continuation, add at least one 0/30 parent before scaling. [`family preflight`](../reports/2026-09-13-must-turn-biased-family-preflight-001.md)
3. **Class-5 acquisition:** test whether exact/reliable dead detections reduce to a recurring compact sound cause with material repeated-work cost. If absent, close. If present, shadow-test the smallest solve-local reason key. Family evidence is secondary only after a cause exists; raw sibling rescue remains confounded. No broad CDCL/LCG framework. [`excavation`](../reports/2026-09-12-solver-future-work-backlog-excavation-001.md)

**Dispositions:** must-cross neighbour-budget propagation, connectivity-volume portal check, `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`, and goal-attraction-disabled retry are **PROMOTED**. Portal coarse-state merge, repair late-probe `7->6` seeds, and portfolio-18 resumable tranche are **CLOSED NEGATIVE/NULL**. Admissible-order retry `1.0->0.18` is **DEFERRED**. [`ledger`](solver-opt-in-experiment-ledger.md)

### 2. Workstream 1: automatic solver action selection

**State:** SUPPORTING / NO ACTIVE SELECTOR GATE.

Use capability, lifecycle, provenance, profile, family, census, trace, accepted-path and capability-memory evidence to distinguish `not exposed` from `exposed-and-failed`, technique-relative response from shared failure. Production selectors require legal current-level/current-solve signals and confirmation proportional to selection pressure.

For a new **structural** selector premise, query controlled families before broad feature mining or new generation. Ask whether the legal descriptor and action value move under the intervention across whole parents. Family flips nominate; they do not license a selector. [`variant routing`](../reports/2026-09-13-variant-library-resource-integration-audit-002.md)

**Cross-hint provenance audit closed.** All 44,305 exact same-event/multiple-path identities are explained by replay/multi-output semantics or historical source-cell under-resolution now repaired. The 160 apparently ordinary-search collisions are the `isolated-technique` tail. No determinism replay/near-collision stage is earned. [`report`](../reports/2026-09-12-cross-hint-provenance-relations-001.md)

**Structural-response extension closed** for `R02687`/objectiveFirst and `R02094`/intersectionHarvest. Stage 3 found family flips; stages 4-5 found no licensed selector from n=2. Reopen for a new pair/premise. [`stage 5`](../reports/2026-09-12-ws1-stage5-first-divergence-result-001.md)

### 3. Parallel capability-acquisition probe

**State:** CLOSED: portal-terminal relocation instrument confounded.

Mechanic-composition pilot: 2/5 clean predicted chains, 2/5 general-difficulty confounds, one non-reproduced rescue. With population-scale `swap`/`cs` confounding, raw perturbation rescue is not causal evidence. Reopen only with a manipulation that isolates the specific edit. [`result`](../reports/2026-09-12-mechanic-composition-pilot-001-result.md)

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Residual capability + allocation | **ACTIVE / FIRST** | Class-4 additive retry; class-2 contrasted must-turn pilot; compact dead-cause recurrence. |
| 1 | Automatic action selection | **SUPPORTING** | Reopen for a new legal signal/relation; use families first when structural. |
| 6 | Repair reachability | **SUPPORTING** | Reopen when continuation needs interior/early commitment revision. |
| 7 | Architectural speed | **SUPPORTING** | Reopen for earned mechanism with measured runtime cost/new hotspot. |
| 3 | Generalization | **METHOD COMPLETE** | Preserve grouped-family independence; scale confirmation with selection pressure. |
| 8 | Isolated capability missed by production | **SUBSUMED BY WS1** | Isolated winners are selection evidence, not permanent tail entitlement. |
| 0 | Restart/randomization | **CLOSED IN TESTED FORMS** | Reopen only for recurring commitment-diversity/restart evidence. |
| 4 | Beam retention | **CLOSED IN TESTED FORMS** | Generic forms stay closed; controlled relatives can support a changed retention premise. |
| 5 | Exact/reference model | **ON DEMAND** | Families nominate boundary pairs; exact/reference still supplies labels. |

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
- After material promotion/provenance reinterpretation, refresh residuals and cheaply check classes 1-3; class 4 needs fresh reconciliation.
- A validated hint prefix proves that prefix live, not alternatives dead.
- A single-level microscope may generate a premise, never a production exception; require independent phenotype-matched confirmation.
- Exact labels are offline truth, never runtime steering. Failed compact feasibility summaries do not license feature accretion.
- Convenience labels/summary booleans are not causal fields; use explicit provenance/config fields for decision-bearing joins.
- Reconcile old questions before new compute. Prefer the smallest information-value test.
- For response to a controlled structural change, query existing variant families before new generation/broad compute; skip family mining when a controlled relative cannot change the decision. [`variant resource`](variant-level-research.md)
- At closeout, update material outbound question relations when they would otherwise be easy to lose.

## Cheap evidence routing

- prior research/questions: `node scripts/research-status-index.mjs --compact --query=<term>`
- tools: `node scripts/tooling-census.mjs --compact --query=<term>`
- assets: `node scripts/research-asset-query.mjs --query=<term>`
- capability memory: `node scripts/solver-capability-memory.mjs --manifest=<manifest.json> --out=tmp/capability-memory.json --summary-out=tmp/capability-memory.md`
- corpus: `node scripts/corpus-query.mjs --corpus=stress2`
- provenance: `node scripts/run-bundled.mjs scripts/stress/hint-provenance-evidence-report.mjs -- --corpus=all --out=tmp/hint-provenance-evidence.json`
- families: mount `claude/variant-levels-solver-insights-tpk4qg`; use `family:index/query/coverage` with `--variant-family-dataset-root=<worktree>` and run `variant-library-evidence-audit.mjs` before decision-bearing whole-trove counts.

Search named mechanisms through `research-status-index --compact`; chronology belongs in dated reports.
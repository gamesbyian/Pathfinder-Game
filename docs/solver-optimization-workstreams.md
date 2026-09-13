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

**Production boundary:** run `34683011115` is **100/102 Corpus 1 + 1,048/1,700 Corpus 2**, leaving 652 C2 misses. Corrected atlas: 22 not-offered, 39 offered-but-unreached/starved, 37 reached/comparable-work-failed, 123 no-T1-winner-but-historical-candidate, **431 no known admissible/T1 candidate**. [`atlas`](../reports/2026-09-12-ws2-post-refresh-residual-atlas-and-capability-memory-census-001.md)

**Class 1-3 rejoin:** no free class-1 menu headroom; class 3 is exposed-and-failed. The surviving class-2 seam has advanced beyond nomination. Census reconstruction corrected seven candidates to **six genuine must-turn-guidance rows** (`R03049` is a dose/allocation case). A 7M matched pilot and the real ladder both reproduce referee-valid gains on `R02768` and `R02180`, only after plain late repair fails. Integration is proven. The next gate is frozen as a **60-row participant-aware economics/collateral A/B**: 40 control-unsolved + 20 control-downstream-solved rows selected from actual `late-repair-search` participants, excluding the two development rows from the primary cohort. The collateral stratum is mandatory because the inserted tier precedes later promoted retries and can consume resources before them. [`pilot`](../reports/2026-09-13-must-turn-biased-repair-dose-pilot-001.md), [`preflight`](../reports/2026-09-13-ws2-class2-class4-allocation-preflight-001.md)

**Class 4:** corrected capability-memory union is **179 rows** (`14/28/21/116/0` across classes 1-5). Portal coarse-state merge nominates 113/123 class-4 rows; global merge stays closed negative after 12 losses. An 8-level current-code freshness replay solved **8/8, referee-valid**. The changed-treatment exposure is frozen: implement a **dedicated default-off, true-dead-last additive whole-ladder retry** that enables portal coarse-state merge only inside that retry, with fresh work and its own additive reserve. First canary is the existing 8-row freshness sample plus `R01273` as a global-regression control and non-portal no-op controls; only a passing canary earns the 113-row current class-4 allocation test. [`freshness`](../reports/2026-09-13-class4-portal-coarse-freshness-replay-001.md), [`preflight`](../reports/2026-09-13-ws2-class2-class4-allocation-preflight-001.md)

**Class 5:** generic width/retention rescue, `swap`/`cs`, bounded known-capability composition and base-T1 harvest are closed. `R03229` reproduces the historical LIVE-culled / DEAD-preferred mechanism. Six prespecified scalar future-feasibility summaries over **31 exact-labelled states / 15 levels** all overlap LIVE and DEAD; joint-obligation rejects are zero. The solve-local connectivity/dead-cause rejoin is now also closed at its current-population gate: only **1/12** deterministic current Class-5 rows had >=25 records in the historical decision cluster, despite real cross-state structural recurrence inside `R03046`. Do not build a cause extractor or reuse mechanism for this sparse population. [`feasibility`](../reports/2026-09-12-future-feasibility-descriptor-rejoin-result-001.md), [`dead-cause result`](../reports/2026-09-13-class5-dead-cause-current-population-rejoin-result-001.md)

**Archaeology-derived acquisition order:** the dead-cause descendant and August low-cardinality full-pool quota projection are both closed in their tested forms. The live Class-5 acquisition gate is now the unresolved **homotopy/winding completion-class observer** with puncture-robustness checks. Ask whether exact-LIVE and exact-DEAD frontier material differ in which topological completion classes remain reachable; do not infer runtime value from complete-solution diversity alone. Future-crossing commitments or arbitrary-target feasibility are later mechanism-specific microscopes only when exact-labelled evidence nominates the event. Basin overlap, commutativity, forced-chain compression and repair descent-shadow remain conditional supporting questions. [`dead-cause result`](../reports/2026-09-13-class5-dead-cause-current-population-rejoin-result-001.md), [`categorical correction`](../reports/2026-09-13-class5-categorical-projection-archaeology-correction-001.md), [`register`](solver-archaeology-register.md)

**Next WS2 gates, in parallel:**

1. **Class-4 allocation:** code the dedicated dead-last retry; require the 8-row freshness canary plus `R01273` and non-portal controls before the 113-row current class-4 allocation population. Global enablement remains closed. [`preflight`](../reports/2026-09-13-ws2-class2-class4-allocation-preflight-001.md)
2. **Class-2 economics:** materialize the frozen 60-row actual-participant cohort and run matched control/treatment arms for the proven 7M `late-repair-must-turn-biased-retry`. Decision-bearing output requires target-stage participation, exact gains/losses, downstream-displacement accounting, incremental `workSpent`, wall cost and symmetric censoring. Do not widen dose after an informative null. [`preflight`](../reports/2026-09-13-ws2-class2-class4-allocation-preflight-001.md)
3. **Class-5 acquisition:** reconstruct the smallest offline homotopy/winding completion-class observer on current exact-labelled extinction cases. Use robust puncture choices; first ask whether LIVE and DEAD states differ in reachable completion topology. No in-loop topology feature, quota, or scorer change until a recurring relation appears. [`dead-cause result`](../reports/2026-09-13-class5-dead-cause-current-population-rejoin-result-001.md)

**Dispositions:** must-cross neighbour-budget propagation, connectivity-volume portal check, `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`, and goal-attraction-disabled retry are **PROMOTED**. Portal coarse-state **global merge** and repair late-probe `7->6` seeds are **CLOSED NEGATIVE**. Portal coarse-state **dead-last additive exposure** is an open changed-treatment allocation question. Solve-local connectivity-derived reason reuse is **CLOSED IN CURRENT POPULATION**. Admissible-order retry repricing is **DEFERRED**. Late must-turn-biased repair is **OPEN DEFAULT-OFF / INTEGRATION PROVEN**, pending the frozen eligible-population economics gate. [`ledger`](solver-opt-in-experiment-ledger.md)

### 2. Workstream 1: automatic solver action selection

**State:** SUPPORTING / NO ACTIVE SELECTOR GATE.

Use capability, lifecycle, provenance, profile, family, census, trace, accepted-path and capability-memory evidence to distinguish not-exposed from exposed-and-failed, and technique-relative response from shared failure. Production selectors require legal current-level/current-solve signals and confirmation proportional to selection pressure.

For a new structural selector premise, query controlled families first. Ask whether legal descriptor and action value move under intervention across whole parents. Family flips nominate; they do not license a selector. Cross-hint provenance audit is closed: same-event/multiple-path identities are explained by replay/multi-output semantics or repaired historical source-cell under-resolution. Structural-response extension is also closed for the tested pair. [`provenance`](../reports/2026-09-12-cross-hint-provenance-relations-001.md), [`stage 5`](../reports/2026-09-12-ws1-stage5-first-divergence-result-001.md)

### 3. Parallel capability-acquisition probe

**State:** CLOSED: portal-terminal relocation instrument confounded.

Mechanic-composition pilot produced 2/5 clean predicted chains, 2/5 general-difficulty confounds, one non-reproduced rescue. Reopen only with a manipulation that isolates the specific edit. [`result`](../reports/2026-09-12-mechanic-composition-pilot-001-result.md)

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Residual capability + allocation | **ACTIVE / FIRST** | Class-4 dedicated dead-last canary then 113-row allocation; Class-2 frozen 60-row 7M economics A/B; Class-5 homotopy/topological completion observer. |
| 1 | Automatic action selection | **SUPPORTING** | Reopen for a new legal signal/relation; use families first when structural. |
| 6 | Repair reachability | **SUPPORTING** | Reopen when continuation needs interior/early commitment revision; descent-shadow observer is preserved for that condition. |
| 7 | Architectural speed | **SUPPORTING** | Reopen for earned mechanism with measured cost; forced-chain traversal requires a current one-successor-chain census first. |
| 3 | Generalization | **METHOD COMPLETE** | Preserve grouped-family independence; scale confirmation with selection pressure. |
| 8 | Isolated capability missed by production | **SUBSUMED BY WS1** | Isolated winners are selection evidence, not tail entitlement. |
| 0 | Restart/randomization | **CLOSED IN TESTED FORMS** | Reopen only for recurring commitment-diversity/restart evidence. |
| 4 | Beam retention | **CLOSED IN TESTED FORMS** | Generic forms and the August low-cardinality quota keys stay closed; new independent categorical/topological evidence may support a changed premise. |
| 5 | Exact/reference model | **ON DEMAND** | Supplies offline truth for current acquisition questions. |

## Standing research rules

- Use `workSpent` across techniques; nodes are within-technique diagnostics. New actions/configs normally compete inside total work.
- Level-blindness is not generalization. IDs, historical outcomes, hints, family labels and capability-memory membership never become runtime routing inputs.
- Preserve **disposition** and **capability signature** separately. Closed treatments may remain useful offline evidence.
- Historical gain/loss intersections with current residual are nominations until reconciled; missing provenance stays unknown.
- Clear negatives close tested forms absent a materially new premise; no-op/behavior-identical retries buy nothing.
- A historical null/revert is not a premise verdict until treatment participation, measurement integrity and formulation are established. Distinguish premise failure, implementation/formulation failure, treatment-never-ran, broken measurement and incomplete experiment.
- Hold out independent units and scale confirmation with tuning/selection pressure.
- Reusable rows require matching protocol identity; nominal stage reach is not participation.
- Result identity, population integrity, resolved configuration/provenance and budget semantics are research-control-plane invariants.
- Refresh residuals after material promotion/provenance reinterpretation before reusing class counts.
- A validated hint prefix proves that prefix live, not alternatives dead.
- A single-level microscope may generate a premise, never a production exception.
- Exact labels are offline truth, never runtime steering. Failed compact feasibility summaries do not license feature accretion.
- Compact signatures/fingerprints may nominate recurring states, responses or interfaces; they do not prove semantic state, basin or future-equivalence without a sufficiency argument.
- Scheduler fairness/participation is diagnostic, not an objective. Measure marginal action value and displaced capability before reallocating merely to equalize participation.
- Use explicit provenance/config fields for decision-bearing joins, not convenience labels/summary booleans.
- Reconcile old questions before new compute. Prefer the smallest information-value test.
- For controlled structural response, query existing variant families before new generation/broad compute when they can change the decision. [`variant resource`](variant-level-research.md)
- At closeout, update material outbound question relations when they would otherwise be easy to lose.

## Cheap evidence routing

- prior research/questions: `node scripts/research-status-index.mjs --compact --query=<term>`
- tools: `node scripts/tooling-census.mjs --compact --query=<term>`
- assets: `node scripts/research-asset-query.mjs --query=<term>`
- capability memory: `node scripts/solver-capability-memory.mjs --manifest=<manifest.json> --out=tmp/capability-memory.json --summary-out=tmp/capability-memory.md`
- corpus: `node scripts/corpus-query.mjs --corpus=stress2`
- provenance: `node scripts/run-bundled.mjs scripts/stress/hint-provenance-evidence-report.mjs -- --corpus=all --out=tmp/hint-provenance-evidence.json`
- families: mount `claude/variant-levels-solver-insights-tpk4qg`; use `family:index/query/coverage` and run `variant-library-evidence-audit.mjs` before decision-bearing whole-trove counts.

Search named mechanisms through `research-status-index --compact`; chronology belongs in dated reports.
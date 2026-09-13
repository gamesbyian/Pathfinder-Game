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

**Class-4 corrected, and freshness CONFIRMED.** The published six-source capability-memory union of 65 was arithmetically impossible (portal coarse-state merge alone has 137 current-residual nominations). Reconstruction of all six sources gives an exact **179-row union** (`14/28/21/116/0` across classes 1–5), now also a regenerable manifest — not prose — for 5/6 sources, reproducing **167/652**. [`correction`](../reports/2026-09-12-capability-memory-union-reconciliation-001.md), [`manifest`](../reports/2026-09-13-capability-memory-manifest-hardening-001.md). Portal coarse-state merge alone nominates **113/123 class-4 rows**; its globally enabled form stays closed negative (12 losses, hard `R01273` regression). An 8-level prespecified stratified freshness replay (all three routing regimes) under current code/production-matched budgets solved **8/8, referee-valid**: the basin is fresh, not stale. [`freshness result`](../reports/2026-09-13-class4-portal-coarse-freshness-replay-001.md) Live next question: the least-disruptive exposure form — a dead-last additive whole-ladder retry (`runWholeLadderRetryTier`, same pattern as `must-cross-neighbor-prune-disabled-retry`/`connectivity-axis-exhausted-retry`/`guidance-goal-distance-retry`), structurally unable to regress any currently-solving level since every additive tier only runs when `!result.solution`. Not yet implemented; do **not** reopen the global merge.

**Class-5 lines closed this cycle:** first-loss is width-insensitive `score-width-culled`; two retention canaries solve nothing; `swap`/`cs` family rescue is confound-dominated; bounded known-capability evidence reaches zero class 5; freshness reconciliation found no clean base-T1 harvest; `R03229` reproduces the B1/B2 LIVE-culled / DEAD-preferred mechanism rather than a new one. [`first loss`](../reports/2026-09-11-ws2-independent-first-loss-confirmation-001.md), [`family`](../reports/2026-09-12-class5-family-reference-comparison-001.md), [`reconciliation`](../reports/2026-09-12-class5-microscope-branch-reconciliation-001.md)

**Simple future-feasibility descriptor route closed null.** A prespecified read-only pass over **31 exact-labelled states / 15 levels** tested six summaries from exact-resource capacity, residual-topology scarcity and joint-obligation compatibility. Every summary overlaps LIVE and DEAD; the existing joint-obligation observer emits zero reject verdicts on the labelled set. Do not expand this into post-hoc scalar feature fishing. The exact diagnosis remains real, but the next acquisition premise must change represented/reused information rather than add another nearby score feature. [`result`](../reports/2026-09-12-future-feasibility-descriptor-rejoin-result-001.md)

**Next WS2 gates, in parallel:**

1. **Class-4 allocation form:** implement and validate the dead-last additive whole-ladder retry described above before any population-scale measurement. Do not detour through family mining; the live question is allocation/collateral after current capability freshness is already established.
2. **Class-2 composition / solve harvest:** implement the smallest default-off/additive late must-turn-biased repair probe that tests the seven-level seam without widening the full repair-fallback gate or stealing plain-repair work. In parallel with that tiny probe, query the existing mounted family resource for controlled must-turn/landmark/obligation relatives around the seven nominated parents; use any repair-response flips only to sharpen whether the seam looks structural or parent-specific, and do not delay the probe or generate new families if the needed counterfactual is absent. Start on the cheap end (`R02768`, `R02180`), then matched-work/collateral confirmation before population scale. [`variant routing`](../reports/2026-09-13-variant-library-resource-integration-audit-002.md)
3. **Acquisition / class 5:** test the recovered **reason-producing dead-state reuse** premise at the diagnostic gate only: can exact/reliable dead detections on hard residual solves be reduced to the same compact sound cause often enough that repeated exploration wastes material work? If recurrence is absent, close it. If present, only then shadow-test the smallest solve-local reason key. Family data is secondary only after a sound recurring cause is nominated; raw sibling rescue stays confound-dominated. No CDCL/LCG or broad learned-search framework. [`excavation`](../reports/2026-09-12-solver-future-work-backlog-excavation-001.md)

**Dispositions:** must-cross neighbour-budget propagation, connectivity-volume portal check, `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`, and goal-attraction-disabled retry are **PROMOTED**. Portal coarse-state merge, repair late-probe `7->6` seeds, and portfolio-18 resumable tranche are **CLOSED NEGATIVE/NULL** in their tested forms. Admissible-order retry `1.0->0.18` is **DEFERRED**. A current class-4 freshness replay of the closed portal treatment's positive basin is diagnostic evidence recovery, not a disposition reversal. [`ledger`](solver-opt-in-experiment-ledger.md)

### 2. Workstream 1: automatic solver action selection

**State:** SUPPORTING / NO ACTIVE SELECTOR GATE.

Use capability, lifecycle, provenance, profile, family, census, trace, accepted-path and capability-memory evidence to distinguish `not exposed` from `exposed-and-failed`, and technique-relative response from shared-capability failure. IDs/outcomes/hints remain offline diagnostics. Production selectors require legal current-level/current-solve signals and confirmation proportional to selection pressure.

For a new **structural** selector premise, query existing controlled families before broad static-feature mining or new family generation. Family contrasts are a cheap way to reject descriptors that merely correlate with ancestry: ask whether the candidate legal descriptor changes under the controlled intervention and whether action/technique value changes with it across whole parents. A family flip is nomination evidence, not by itself a licensed selector. [`variant routing`](../reports/2026-09-13-variant-library-resource-integration-audit-002.md)

**Cross-hint provenance audit closed.** All 44,305 exact same-event/multiple-path identities are explained by replay/multi-output semantics or historical technique-census source-cell under-resolution already repaired in current provenance. The 160 apparently ordinary-search collisions are exactly the `isolated-technique` tail. No determinism replay or near-collision stage is earned. [`report`](../reports/2026-09-12-cross-hint-provenance-relations-001.md)

**Structural-response extension closed** for `R02687`/objectiveFirst and `R02094`/intersectionHarvest. Stage 3 found family flips; stages 4-5 found no licensed selector from n=2. Reopen only for a new pair/premise. [`stage 5`](../reports/2026-09-12-ws1-stage5-first-divergence-result-001.md)

### 3. Parallel capability-acquisition probe

**State:** CLOSED — portal-terminal relocation instrument confounded.

Mechanic-composition pilot: 2/5 clean predicted chains, 2/5 general-difficulty confounds, one non-reproduced rescue. Together with population-scale `swap`/`cs` confounding, raw perturbation rescue is not causal evidence. Reopen only with a materially different manipulation proving the specific edit rather than generic loosening caused the effect. [`result`](../reports/2026-09-12-mechanic-composition-pilot-001-result.md)

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Residual capability + allocation | **ACTIVE / FIRST** | In parallel: dead-last class-4 portal coarse-state retry design; bounded late must-turn-biased repair pilot plus cheap existing-family structural preflight; diagnostic recurrence test for compact sound dead causes. |
| 1 | Automatic action selection | **SUPPORTING** | No live selector/provenance gate; reopen for a new legal decision signal or unexplained producer relation, using existing family contrasts first when the premise is structural. |
| 6 | Repair reachability | **SUPPORTING** | Reopen when live continuation needs interior/early commitment revision. |
| 7 | Architectural speed | **SUPPORTING** | Reopen for earned mechanism with measured runtime cost/new hotspot. |
| 3 | Generalization | **METHOD COMPLETE** | Preserve grouped-family independence; scale confirmation with selection pressure. |
| 8 | Isolated capability missed by production | **SUBSUMED BY WS1** | Isolated winners are selection evidence, not permanent tail entitlement. |
| 0 | Restart/randomization | **CLOSED IN TESTED FORMS** | Reopen only for recurring commitment-diversity/restart evidence. |
| 4 | Beam retention | **CLOSED IN TESTED FORMS** | Generic width/bucket/scorer forms stay closed; controlled relatives are a high-value reopen resource for a changed retention mechanism. |
| 5 | Exact/reference model | **ON DEMAND** | Expand exact labels only for an earned mechanism-specific question; families may nominate boundary pairs but never substitute for exact labels. |

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
- When the question is response to a controlled structural change, query the existing variant-family resource before new family generation or broad solver compute; when a controlled relative cannot change the decision, skip family mining rather than treating it as a checklist. [`variant resource`](variant-level-research.md)
- At result closeout, update material **outbound** question relations as well as the local verdict: answers, triggers, constraints, calibration/negative controls, supersessions and duplicates belong in the sparse question registry when they would otherwise be easy to lose.

## Cheap evidence routing

- prior research + question relations: `node scripts/research-status-index.mjs --compact --query=<term>`
- question-only lookup: `node scripts/research-status-index.mjs --compact --kind=question --query=<term>`
- tools: `node scripts/tooling-census.mjs --compact --query=<term>`
- assets: `node scripts/research-asset-query.mjs --query=<term>`
- capability memory: `node scripts/solver-capability-memory.mjs --manifest=<manifest.json> --out=tmp/capability-memory.json --summary-out=tmp/capability-memory.md`
- corpus shape: `node scripts/corpus-query.mjs --corpus=stress2`
- provenance: `node scripts/run-bundled.mjs scripts/stress/hint-provenance-evidence-report.mjs -- --corpus=all --out=tmp/hint-provenance-evidence.json`
- variant families: mount `claude/variant-levels-solver-insights-tpk4qg`, then `npm run family:index -- --variant-family-dataset-root=<worktree>` and use `family:query` / `family:coverage`; run `node scripts/variant-library-evidence-audit.mjs --variant-family-dataset-root=<worktree> --pretty` before decision-bearing whole-trove counts/joins.

Search named mechanisms through `research-status-index --compact`; chronology belongs in dated reports.
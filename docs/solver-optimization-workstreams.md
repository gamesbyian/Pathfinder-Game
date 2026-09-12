# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, workstream state, and next gates.
> **Reconciled:** 2026-09-12.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

Keep this file **current-state only**. Detailed evidence belongs in reports; historical snapshots live under `docs/archive/snapshots/`.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Capability memory: [`solver-capability-memory.md`](solver-capability-memory.md). Deferred material: [`solver-future-work.md`](solver-future-work.md).

Program lens: **capability composition** exposes/selects/allocates demonstrated capability; **capability acquisition** creates generic capability where no known action succeeds.

## Current execution priority

### 1. Workstream 2: residual capability + fixed-work allocation

**State:** ACTIVE / FIRST PRIORITY.

**Canonical production boundary:** run `34683011115` (`PRUNE_MC_PORTAL_FORCED_NEIGHBOR` default-on, `lifecycle_telemetry=true`; reproduced by `34674256538`) is **100/102 Corpus 1 + 1,048/1,700 Corpus 2**, leaving **652 Corpus-2 misses**.

**Corrected residual atlas:** 22 not-offered, 39 offered-but-unreached/starved, 37 reached/comparable-work-failed, 123 no-T1-winner-but-historical-candidate, and **431 no known admissible/T1 candidate**. A T1-census `variantLabel` bug had hidden clean `repair|guidance=turn-biased` cells; priority order is unchanged. [`atlas`](../reports/2026-09-12-ws2-post-refresh-residual-atlas-and-capability-memory-census-001.md), [`fix`](../reports/2026-09-12-repair-turn-biased-t1-census-misclassification-001.md)

**Current dispositions:** must-cross neighbour-budget propagation, connectivity-volume portal check, `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`, and goal-attraction-disabled retry are **PROMOTED**. Portal coarse-state merge, repair late-probe `7->6` seeds, and portfolio-18 resumable tranche are **CLOSED NEGATIVE/NULL**. Admissible-order retry `1.0->0.18` is **DEFERRED**. [`ledger`](solver-opt-in-experiment-ledger.md)

**Class-5-targeted lines closed this cycle:**

- **First-loss:** 28/28 across two samples reproduce width-insensitive `score-width-culled` loss; DFS does not support a shared local-scorer failure, repair barely approaches the same trajectories even at 10x budget, and two bucket-retention canaries produced zero solves. [`dev`](../reports/2026-09-11-bounded-class4-class5-first-loss-phenotyping-001.md), [`confirmation`](../reports/2026-09-11-ws2-independent-first-loss-confirmation-001.md), [`repair`](../reports/2026-09-11-repair-side-first-loss-exposure-001.md), [`ints`](../reports/2026-09-12-ints-bucket-retention-canary-001.md), [`mechanic`](../reports/2026-09-12-mechanic-bucket-on-intersection-heavy-canary-001.md)
- **Family/reference comparison:** current class-5 `swap`/`cs` rescue rates are confound-dominated; naive perturbation/reducer interpretation is closed without a decoupled control. [`report`](../reports/2026-09-12-class5-family-reference-comparison-001.md)
- **Capability-memory census:** six prespecified sources nominate 65/652 residual misses, **zero in class 5**. [`report`](../reports/2026-09-12-repair-turn-biased-t1-census-misclassification-001.md)
- **Freshness reconciliation:** suspicious same-revision `isolatedTechnique` successes were **5/5 T1 variants and 0/5 base T1**, all `coarse-state-near-tie-retention-off`; production already reaches the corresponding retry. Future provenance retains census-cell identity. [`reconciliation`](../reports/2026-09-12-class5-microscope-branch-reconciliation-001.md)
- **Single-level microscope:** `R03229` at its width-2000 first-loss boundary gives **LIVE known culled witness / DEAD rank-1 survivor / DEAD cutoff survivor**. This is recurrence of the August B1/B2 mechanism class, not a new premise. [`reconciliation`](../reports/2026-09-12-class5-microscope-branch-reconciliation-001.md)

**Current acquisition gate: bounded future-feasibility rejoin.** Rejoin B1/B2 + `R03229` and test at most 2-4 runtime-legal summaries from exact-resource capacity, residual-topology scarcity, and joint-obligation compatibility. Same-day evidence constrains interpretation: mechanic-bucket retention demonstrably preserves fresh progress on selected solved siblings but both class-5 bucket canaries are solve-null, so progress/bucket rarity is a negative control rather than future-feasibility evidence; independent perturbation probes are also difficulty-confounded, increasing the value of measuring slack/scarcity directly. Existing perturbation-rescue density and the clean/confounded mechanic-composition parents may serve only as offline calibration for descriptors selected from the owning exact evidence; they cannot select a descriptor and then validate it, and they do not expand the candidate budget. Require information beyond score/rank/prunes/progress masks and recurrence across unrelated parents; otherwise close the route. [`handoff`](../reports/2026-09-12-future-feasibility-premise-rejoin-001.md), [`cross-line closeout`](../reports/2026-09-12-cross-line-unharvested-residue-closeout-001.md)

**Novelty bar:** B1/B2 already established both `dead rank-1 / live known alternative` and `live / live` shapes; `R03229` reproduces the first on a clean class-5 specimen. Advancement requires a recurring mechanism-specific distinction that explains exact future feasibility better than current score/prune information. [`B2`](../reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md)

### 2. Workstream 1: automatic solver action selection

**State:** ACTIVE / PARALLEL ANALYSIS.

Use capability, lifecycle, provenance, profile, family, census, trace, accepted-path and capability-memory evidence to distinguish `not exposed` from `exposed-and-failed`, and technique-relative response from shared-capability failure. Historical IDs/outcomes/hints remain offline diagnostics. Production selectors need legal generic current-level/current-solve signals and confirmation proportional to selection pressure. [`evidence layer`](../reports/2026-09-09-hint-provenance-evidence-layer-upgrade-001.md)

**Cross-hint provenance relation audit active as cheap existing-data work.** Measure whether one canonical discovery-event identity is attached to multiple distinct paths on the same level. Classify exact collisions by producer multiplicity contract before any near-collision or determinism replay; until classified, repeated paths carrying one event identity are dependent evidence, not independent capability discoveries. [`report`](../reports/2026-09-12-cross-hint-provenance-relations-001.md)

**Structural-response extension closed for both frozen pairs (`R02687`/objectiveFirst, `R02094`/intersectionHarvest).** Stage 3 found real family response flips; stages 4-5 found no licensed selector from n=2. Reopen only for a new pair/premise. Its operational result is still useful cross-workstream evidence: mechanic buckets protect newly created progress modes, which constrains but does not solve WS2's future-feasibility problem. [`stage 3`](../reports/2026-09-11-ws1-stage3-isolated-technique-resolve-001.md), [`stage 4`](../reports/2026-09-12-ws1-stage4-solution-space-mediation-result-001.md), [`stage 5`](../reports/2026-09-12-ws1-stage5-first-divergence-result-001.md)

### 3. Parallel capability-acquisition probe

**State:** CLOSED — portal-terminal relocation instrument is confounded.

The bounded mechanic-composition pilot produced 2/5 clean predicted chains, 2/5 general-difficulty confounds, and one non-reproduced rescue. Together with population-scale `swap`/`cs` confounding, this is evidence against causal inference from raw perturbation rescue; reopen only with a materially different manipulation that preserves the coupled cluster and proves the specific edit rather than generic loosening caused the effect. [`result`](../reports/2026-09-12-mechanic-composition-pilot-001-result.md)

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Residual capability + fixed-work allocation | **ACTIVE / FIRST PRIORITY** | Rejoin B1/B2 + R03229 exact extinction states; test 2-4 prespecified future-feasibility summaries read-only before any new class-5 treatment. |
| 1 | Automatic action selection | **ACTIVE / PARALLEL** | Run/classify the exact cross-hint provenance collision audit; structural-response ladder otherwise closed pending a new pair/premise. |
| 6 | Repair reachability/reconstructability | **SUPPORTING** | Reopen only when evidence shows a live continuation needs interior/early commitment revision. |
| 7 | Architectural speed/execution substrate | **SUPPORTING** | Reopen for an earned mechanism with measured runtime cost or new hotspot. |
| 3 | Generalization/holdout discipline | **METHOD COMPLETE** | Preserve grouped-family independence; scale confirmation with selection pressure. |
| 8 | Cheap isolated capability missed by production | **SUBSUMED BY WS1** | Isolated winners are action-selection evidence, not permanent tail entitlement. |
| 0 | Restart/randomization + learned-failure search | **CLOSED IN TESTED FORMS** | Reopen only for recurring commitment-diversity/restart evidence. |
| 4 | Beam retention at extinction boundaries | **CLOSED IN TESTED FORMS** | Future-feasibility analysis may nominate a new mechanism-specific axis; generic width/bucket/scorer forms remain closed. |
| 5 | Exact/reference-model program | **ON DEMAND / SUPPORTING** | Use existing B1/B2 + R03229 labels first; expand exact labels only if the bounded descriptor question earns it. |

## Standing research rules

- Use `workSpent` across techniques; raw nodes are within-technique diagnostics. New actions/configs normally compete inside the total-work envelope.
- Level-blindness is not generalization. IDs, historical outcomes, hints, family labels and capability-memory membership never become runtime routing inputs.
- Preserve **disposition** and **capability signature** separately. Closed treatments may remain useful offline evidence.
- Historical gain/loss intersections with current residual are nominations until reconciled under current code/protocol; missing provenance stays unknown.
- Provenance multiplicity is dependence unless the producer contract says otherwise: multiple paths carrying one canonical discovery-event identity do not become independent evidence by row count.
- Clear negatives close tested forms absent a materially new premise; no-op/behavior-identical retries buy nothing.
- Hold out independent units and scale confirmation with tuning/selection pressure.
- Reusable benchmark/census rows require matching protocol identity; nominal stage reach is not participation.
- Result identity, population integrity, resolved configuration/provenance and budget semantics are research-control-plane invariants.
- After material capability promotion or provenance reinterpretation, refresh/rejoin residuals before treating old class/family/capability-memory counts as current; as part of that cheap rejoin, check whether classes 1-3 expose an already-legal low-cost solve batch before scheduling new acquisition work.
- A validated hint prefix proves that prefix live, not that alternatives are dead.
- Before escalating a persistent residual, ask whether materially different actions lose known-live material at the same boundary.
- A single-level microscope may generate a premise, never a production exception; require an independent phenotype-matched check before scaling.
- Future-feasibility descriptors must be runtime-legal and incremental to current score/prune/progress information; exact labels are offline truth, never runtime steering.
- Convenience labels and summary booleans are not causal fields: when research interpretation depends on condition/source identity, prefer explicit provenance/config fields and audit ambiguous proxies before decision-bearing joins.
- Reconcile old questions against newer evidence before new compute. Prefer the smallest information-value test.

## Cheap evidence routing

- prior research: `node scripts/research-status-index.mjs --compact --query=<term>`
- tools: `node scripts/tooling-census.mjs --compact --query=<term>`
- research assets: `node scripts/research-asset-query.mjs --query=<term>`
- capability memory: `node scripts/solver-capability-memory.mjs --manifest=<manifest.json> --out=tmp/capability-memory.json --summary-out=tmp/capability-memory.md`
- corpus shape: `node scripts/corpus-query.mjs --corpus=stress2`
- provenance relations: `node scripts/run-bundled.mjs scripts/stress/hint-provenance-evidence-report.mjs -- --corpus=all --out=tmp/hint-provenance-evidence.json`
- microscope boundary (completed example): `node scripts/run-bundled.mjs scripts/stress/collect-known-solution-prefix-survival.mjs -- --level-ids=R03229 --beam-width=2000 --node-budget=3000000 --include-stages --retain-all-removal-details --retain-ranked-pool-details --out=tmp/r03229-microscope-survival.json`
- microscope cases (completed example): `node scripts/run-bundled.mjs scripts/stress/build-class5-microscope-cases.mjs -- --survival=tmp/r03229-microscope-survival.json --level-id=R03229 --out=tmp/r03229-microscope-cases.json`
- structural niche stability: `node scripts/analyze-technique-niche-stability.mjs`
- difficulty-controlled niches: `node scripts/analyze-difficulty-stratified-relative-advantage.mjs`

Search named mechanisms through `research-status-index --compact`; chronology belongs in dated reports, not this file.

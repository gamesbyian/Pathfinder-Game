# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, workstream state, and next gates.
> **Reconciled:** 2026-09-12.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

Keep this file **current-state only**. Detailed evidence belongs in reports; historical snapshots live under `docs/archive/snapshots/`.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Capability memory: [`solver-capability-memory.md`](solver-capability-memory.md). Deferred material: [`solver-future-work.md`](solver-future-work.md).

Program lens: **capability composition** exposes/selects/allocates capabilities already demonstrated; **capability acquisition** creates generic capability where no known action currently succeeds. Residual evidence decides which branch deserves work.

## Current execution priority

### 1. Workstream 2: residual capability + fixed-work allocation

**State:** ACTIVE / FIRST PRIORITY.

**Canonical production boundary:** run `34683011115` (`PRUNE_MC_PORTAL_FORCED_NEIGHBOR` production default-on, `lifecycle_telemetry=true`; independently reproduced by `34674256538`) is **100/102 Corpus 1 + 1,048/1,700 Corpus 2**, leaving **652 Corpus-2 misses**.

**Corrected residual atlas:** 22 not-offered (3.4%), 39 offered-but-unreached/starved (6.0%), 37 reached/comparable-work-failed (5.7%), 123 no-T1-winner-but-historical-candidate (18.9%), and **431 no known admissible/T1 candidate (66.1%)**. A T1-census `variantLabel` bookkeeping bug had hidden clean `repair|guidance=turn-biased` cells and inflated classes 4/5; priority order is unchanged. [`atlas`](../reports/2026-09-12-ws2-post-refresh-residual-atlas-and-capability-memory-census-001.md), [`fix`](../reports/2026-09-12-repair-turn-biased-t1-census-misclassification-001.md)

**Current dispositions:** must-cross neighbour-budget propagation, connectivity-volume portal check, `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`, and goal-attraction-disabled retry are **PROMOTED**. Portal coarse-state merge, repair late-probe `7->6` seeds, and portfolio-18 resumable tranche are **CLOSED NEGATIVE/NULL**. Admissible-order retry `1.0->0.18` is **DEFERRED**. [`ledger`](solver-opt-in-experiment-ledger.md)

**Class-5-targeted lines closed this cycle:**

- **First-loss:** 28/28 across two disjoint samples reproduce `score-width-culled`, width-insensitive beam loss; DFS cross-check does not support a shared local-scorer failure. Repair barely approaches the same trajectories even at 10x budget. Two bucket-retention canaries (`ints`; existing `mechanicBucketRetention` applied research-only to this regime) produced zero solves and noise-level survival changes. [`dev`](../reports/2026-09-11-bounded-class4-class5-first-loss-phenotyping-001.md), [`confirmation`](../reports/2026-09-11-ws2-independent-first-loss-confirmation-001.md), [`repair`](../reports/2026-09-11-repair-side-first-loss-exposure-001.md), [`ints`](../reports/2026-09-12-ints-bucket-retention-canary-001.md), [`mechanic`](../reports/2026-09-12-mechanic-bucket-on-intersection-heavy-canary-001.md)
- **Family/reference comparison:** existing `swap`/`cs` rescue rates across the current 431 class-5 cohort are confound-dominated; naive perturbation/reducer interpretation is closed without a decoupled-control redesign. [`report`](../reports/2026-09-12-class5-family-reference-comparison-001.md)
- **Capability-memory census:** six prespecified materially distinct sources nominate 65/652 residual misses, **zero in class 5**. Census closed; do not maintain a standing policy panel. [`report`](../reports/2026-09-12-repair-turn-biased-t1-census-misclassification-001.md)

**Active acquisition method: R03351 single-level microscope.** Use one representative class-5 miss as a bounded premise generator, not a benchmark. R03351's ordinary width-2000 beam preserves accepted-witness support to depth 47, while both tested bucket-retention variants fail to rescue it. Reconstruct its final score/width support loss, freeze exactly the culled witness prefix plus rank-1 and cutoff survivors, exact-label the survivors, and classify the result before any treatment. [`preflight`](../reports/2026-09-12-class5-single-level-microscope-r03351-preflight-001.md)

**Novelty bar:** August B1/B2 already exact-labelled extinction-adjacent beam states and established both `dead rank-1 / live known alternative` and `live / live` shapes. [`B2`](../reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md) Therefore a dead R03351 rank-1 with a live witness is **recurrence of an old mechanism class, not a new premise by itself**. Advancement requires either a materially different exact phenotype or a new mechanism-specific runtime-legal discriminator/architectural limitation. Do not reopen generic scorer tuning or generic feature accretion; the broad scorer-vocabulary and 18-feature forms are already closed.

**Execution seam:** reuse `collect-known-solution-prefix-survival.mjs` with ranked-pool/removal detail, then `build-class5-microscope-cases.mjs`, then the existing `cpsat-explicit-prefix-reference.mjs`. No new search/reference framework is needed. The witness case is a positive control because its accepted full continuation already proves liveness; rank-1 and cutoff labels are decision-bearing.

### 2. Workstream 1: automatic solver action selection

**State:** ACTIVE / PARALLEL ANALYSIS.

Use capability, lifecycle, provenance, profile, family, census, trace, accepted-path and capability-memory evidence to distinguish `not exposed` from `exposed-and-failed`, and technique-relative response from shared-capability failure. Historical IDs/outcomes/hints remain offline diagnostics. Any production selector needs a legal generic current-level/current-solve signal plus confirmation proportional to mining/configuration space. [`evidence layer`](../reports/2026-09-09-hint-provenance-evidence-layer-upgrade-001.md)

**Structural-response extension closed for both frozen pairs (`R02687`/objectiveFirst, `R02094`/intersectionHarvest).** Stage 3 found real plain-vs-mechanic-bucket family response flips; stage 4's prespecified solution-space mediators were non-separating/inapplicable; stage 5 located operational first divergence immediately after mechanic-progress creates a minority bucket. n=2 licenses no selector; no third pair or variant of this same question. [`stage 3`](../reports/2026-09-11-ws1-stage3-isolated-technique-resolve-001.md), [`stage 4`](../reports/2026-09-12-ws1-stage4-solution-space-mediation-result-001.md), [`stage 5`](../reports/2026-09-12-ws1-stage5-first-divergence-result-001.md)

### 3. Parallel capability-acquisition probe

**State:** CLOSED — portal-terminal relocation instrument is confounded.

The bounded mechanic-composition Stage A/B/C pilot produced 2/5 clean predicted chains, but 2/5 hit the pre-registered general-difficulty-confound stop condition and one original rescue did not reproduce at the reduced diagnostic envelope. Reopen only with a materially different manipulation that preserves the coupled cluster without relocating a general-navigation landmark, with a new frozen edit rule/envelope/confound check. The later population-scale family comparison confirms this is not merely a portal-relocation quirk. [`result`](../reports/2026-09-12-mechanic-composition-pilot-001-result.md)

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Residual capability + fixed-work allocation | **ACTIVE / FIRST PRIORITY** | Execute R03351 three-case microscope; classify exact survivor futures against B2; require a mechanism-specific new distinction or explicit null before another broad class-5 treatment. |
| 1 | Automatic action selection | **ACTIVE / PARALLEL** | Structural-response ladder closed for both frozen pairs; reopen only for a new pair/premise. |
| 6 | Repair reachability/reconstructability | **SUPPORTING** | Reopen only when evidence shows a live continuation needs interior/early commitment revision. |
| 7 | Architectural speed/execution substrate | **SUPPORTING** | Reopen for an earned mechanism with measured runtime cost or new hotspot. |
| 3 | Generalization/holdout discipline | **METHOD COMPLETE** | Preserve grouped-family independence; scale confirmation with selection pressure. |
| 8 | Cheap isolated capability missed by production | **SUBSUMED BY WS1** | Isolated winners are action-selection evidence, not permanent tail entitlement. |
| 0 | Restart/randomization + learned-failure search | **CLOSED IN TESTED FORMS** | Reopen only for recurring commitment-diversity/restart evidence. |
| 4 | Beam retention at extinction boundaries | **CLOSED IN TESTED FORMS** | Cross-action recurrence and two simple bucket axes do not earn reopening; require a materially different mechanism-specific retention axis. |
| 5 | Exact/reference-model program | **ON DEMAND / SUPPORTING MICROSCOPE** | Label the frozen R03351 witness/top/cutoff cases through the existing seam; broad expansion still needs its own prespecified question. |

## Standing research rules

- Use `workSpent` across techniques; raw nodes are within-technique diagnostics. New actions/configs normally compete inside the total-work envelope.
- Level-blindness is not generalization. IDs, historical outcomes, hints, family labels and capability-memory membership never become runtime routing inputs.
- Preserve **disposition** and **capability signature** separately. Closed treatments may remain useful offline evidence without reopening the tested form.
- Historical gain/loss intersections with current residual are nominations until reconciled under current code/protocol; missing provenance stays unknown.
- Clear negatives close tested forms absent a materially new premise; no-op/behavior-identical retries buy nothing.
- Hold out independent units and scale confirmation with tuning/selection pressure.
- Reusable benchmark/census rows require matching protocol identity; nominal stage reach is not participation.
- Result identity, population integrity, resolved configuration/provenance and budget semantics are research-control-plane invariants.
- After material capability promotion or provenance reinterpretation, refresh/rejoin residuals before treating old class/family/capability-memory counts as current.
- A validated hint prefix proves that prefix live, not that alternatives are dead.
- Before escalating a persistent residual, ask whether materially different actions lose known-live material at the same boundary. Shared recurrence nominates capability work; idiosyncratic loss stays technique-level.
- A single-level microscope may generate a premise, never a production exception. Freeze cases before exact labels; compare against prior equivalent evidence; classify mechanism before treatment; require an independent phenotype-matched check before scaling.
- Reconcile old questions against newer evidence before new compute. Prefer the smallest information-value test.

## Cheap evidence routing

- prior research: `node scripts/research-status-index.mjs --compact --query=<term>`
- tools: `node scripts/tooling-census.mjs --compact --query=<term>`
- research assets: `node scripts/research-asset-query.mjs --query=<term>`
- capability memory: `node scripts/solver-capability-memory.mjs --manifest=<manifest.json> --out=tmp/capability-memory.json --summary-out=tmp/capability-memory.md`
- corpus shape: `node scripts/corpus-query.mjs --corpus=stress2`
- microscope boundary: `node scripts/run-bundled.mjs scripts/stress/collect-known-solution-prefix-survival.mjs -- --level-ids=R03351 --beam-width=2000 --node-budget=3000000 --include-stages --retain-all-removal-details --retain-ranked-pool-details --out=tmp/r03351-microscope-survival.json`
- microscope cases: `node scripts/run-bundled.mjs scripts/stress/build-class5-microscope-cases.mjs -- --survival=tmp/r03351-microscope-survival.json --level-id=R03351 --out=tmp/r03351-microscope-cases.json`
- structural niche stability: `node scripts/analyze-technique-niche-stability.mjs`
- difficulty-controlled niches: `node scripts/analyze-difficulty-stratified-relative-advantage.mjs`

Search named mechanisms through `research-status-index --compact`; chronology belongs in dated reports, not this file.

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

**Canonical production boundary:** run `34683011115` (first refresh with `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` folded into production default-on, `lifecycle_telemetry=true`; independently reproduced by the earlier `34674256538`) is **100/102 Corpus 1 + 1,048/1,700 Corpus 2**, leaving **652 Corpus-2 misses** (down from 671).

**Residual atlas (rebuilt, then corrected):** 22 not-offered (3.4%), 39 offered-but-unreached/starved (6.0%), 37 reached/comparable-work-failed (5.7%), 123 no-T1-winner-but-historical-candidate (18.9%), and **431 no known admissible/T1 candidate (66.1%)**. [`rebuild`](../reports/2026-09-12-ws2-post-refresh-residual-atlas-and-capability-memory-census-001.md); corrected after a T1-census join bug (`variantLabel` bookkeeping wrongly excluded all `repair|guidance=turn-biased` wins) moved 9 rows from class 5 to class 2 — [`fix`](../reports/2026-09-12-repair-turn-biased-t1-census-misclassification-001.md). Priority order unchanged.

**Current dispositions** (full evidence in the opt-in ledger and linked reports):

- must-cross neighbour-budget propagation: **PROMOTED**; [`report`](../reports/2026-09-09-mc-neighbor-budget-portal-ab-001-preflight.md)
- connectivity-volume portal check: **PROMOTED**; [`report`](../reports/2026-09-09-connectivity-volume-portal-ab-001-preflight.md)
- `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`: **PROMOTED, folded into production default-on**; [`ledger`](solver-opt-in-experiment-ledger.md)
- goal-attraction-disabled retry: **PROMOTED**; [`ledger`](solver-opt-in-experiment-ledger.md)
- portal coarse-state merge: **CLOSED NEGATIVE/default-OFF** (retained as offline capability-memory evidence); [`forensic`](../reports/2026-09-11-portal-coarse-state-merge-r01273-collision-forensic-001.md)
- repair late-probe `7 -> 6` seeds: **CLOSED NEGATIVE**; [`result`](../reports/2026-09-10-repair-late-probe-six-seed-confirmation-001-result.md)
- portfolio-18 same-policy resumable residual tranche: **CLOSED NULL**; [`result`](../reports/portfolio/resumable-tranche-development-ab-001/result.md)
- admissible-order retry `1.0 -> 0.18`: **DEFERRED**; [`methodology`](../reports/2026-09-10-admissible-order-non-default-retry-matched-work-methodology-001.md)

**First-loss program:** two disjoint 14-level samples reproduce the same beam phenotype (score-width culls); DFS falsifies a shared-scorer failure. [`development`](../reports/2026-09-11-bounded-class4-class5-first-loss-phenotyping-001.md), [`confirmation`](../reports/2026-09-11-ws2-independent-first-loss-confirmation-001.md). **Repair-side:** natural repair search barely approaches the same trajectories even at 10x budget; seeded at beam-cull state only 4/28 reconstruct — too small to justify a mechanism. [`report`](../reports/2026-09-11-repair-side-first-loss-exposure-001.md) **Ints-bucket retention canary** (the confirmation report's own earn condition): frontier selection bucketed by `ints` instead of `(mustCrossMask, flipperUsedMask)`, A/B'd on the same population — zero new solves, deltas inside the existing width-insensitivity noise band. **CLOSED NEGATIVE.** [`report`](../reports/2026-09-12-ints-bucket-retention-canary-001.md)

**Bounded capability-memory census: CLOSED — no class-5 complementarity.** All 6 prespecified sources nominate 65/652 (10.0%) of the residual, zero in class 5. [`first candidate`](../reports/2026-09-12-ws2-post-refresh-residual-atlas-and-capability-memory-census-001.md); [`remaining sources + atlas fix`](../reports/2026-09-12-repair-turn-biased-t1-census-misclassification-001.md) Do not reopen without a materially new source. Class-5 acquisition work is the sole first-priority line. The atlas fix's 9-level `repair-turn-biased`-not-dispatched pattern is not a new WS1 question — `STRATEGY_REPAIR_TURN_BIAS` (the only path that adds it to the ladder) is already `CLOSED NEGATIVE` (net −7/1700, opt-in ledger); the gap is that decision's known, already-priced cost.

### 2. Workstream 1: automatic solver action selection

**State:** ACTIVE / PARALLEL ANALYSIS.

Use capability, lifecycle, provenance, profile, family, census, trace, accepted-path and capability-memory evidence to distinguish `not exposed` from `exposed-and-failed`, and technique-relative response from shared-capability failure. Stored paths, family/profile labels, historical policy signatures and same-level outcomes are offline diagnostics only. Any production selector needs a legal generic current-level/current-solve signal plus confirmation proportional to the mined history/configuration space. [`evidence layer`](../reports/2026-09-09-hint-provenance-evidence-layer-upgrade-001.md)

**Frontier/structural-response path:** class 4 is the preferred near-control for class 5. Screen technique contrasts for temporal persistence and generic-difficulty confounding before family/profile/trace escalation. The same known-live extinction mechanism recurring across materially different actions may hand off to WS2/WS4; technique-specific response stays WS1. [`extension audit`](../reports/2026-09-11-structural-technique-response-extension-audit-001.md)

**Stages 3-4 closed positive-then-negative for both frozen pairs (`R02687`/objectiveFirst, `R02094`/intersectionHarvest):** stage 3 found real `plain`-vs-`mechanic-buckets` sibling-response flips across 4/5 family modes per pair, opposite net directions ([`stage 3`](../reports/2026-09-11-ws1-stage3-isolated-technique-resolve-001.md)). Stage 4 replayed every flip's winning path through real search state: neither the mechanic-event-order nor must-cross-precedence-basin descriptor separates `R02094`'s response; both are structurally inapplicable to `R02687`, whose family has zero must-cross cells. **Next:** bounded operational first divergence on one flip sibling per pair; needs new small instrumentation. No third pair, no new variants. [`stage 4`](../reports/2026-09-12-ws1-stage4-solution-space-mediation-result-001.md)

### 3. Parallel capability-acquisition probe (no new workstream)

**State:** CLOSED — portal-terminal relocation instrument not clean enough to reuse.

The bounded 5-parent Stage A/B/C pilot ran to completion: 2/5 parents show the predicted mechanism-supporting chain cleanly (rescue disappears on decoupling without a control-side confound), but 2/5 hit the design's own pre-registered stop condition — the relocation itself introduces a general-difficulty confound (decoupled control and treatment solve identically, byte-for-byte, meaning the edit made the level easier through an unrelated route). One parent's original rescue does not reproduce at the pilot's **reduced diagnostic envelope**, which was matched across arms but smaller than the 50M-node production A/B that originally established the rescue. Per the design's stop rule, the observed relocation confounds are sufficient to close this instrument specifically; the reduced envelope limits interpretation of non-reproduction and is not used to narrow the underlying promotion. [`result`](../reports/2026-09-12-mechanic-composition-pilot-001-result.md), [`design`](../reports/2026-09-11-mechanic-composition-transfer-pilot-design-001.md)

**Reopen condition:** a materially different manipulation that does not relocate a landmark shared with the level's general navigation graph (e.g. adding/removing a viable must-cross axis while keeping the coupled cluster present), with its own frozen edit rule, execution envelope and confound check.

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Residual capability + fixed-work allocation | **ACTIVE / FIRST PRIORITY** | Capability-memory census closed (no class-5 reach across 6 sources); class-5 acquisition work (first-loss/family/reference/exact-adjudication) is the sole active line. |
| 1 | Automatic action selection | **ACTIVE / PARALLEL** | Stage 4 solution-space mediation closed negative for both pairs; next is bounded operational first divergence (new small instrumentation). |
| 6 | Repair reachability/reconstructability | **SUPPORTING** | Reopen only when evidence shows a live continuation needs interior/early commitment revision. |
| 7 | Architectural speed/execution substrate | **SUPPORTING** | Reopen for an earned mechanism with measured runtime cost or new hotspot. |
| 3 | Generalization/holdout discipline | **METHOD COMPLETE** | Preserve grouped-family independence; scale confirmation with selection pressure. |
| 8 | Cheap isolated capability missed by production | **SUBSUMED BY WS1** | Isolated winners are action-selection evidence, not permanent tail entitlement. |
| 0 | Restart/randomization + learned-failure search | **CLOSED IN TESTED FORMS** | Reopen only for recurring commitment-diversity/restart evidence. |
| 4 | Beam retention at extinction boundaries | **CLOSED IN TESTED FORMS** | Both reopen routes tested and closed: cross-action recurrence (repair's failure is exposure, not rank-retention-loss) and a new bounded descriptor (`intsBucketRetention` canary, closed negative). Reopen only for a materially different retention axis with its own argument for separating the competing pool. |
| 5 | Exact/reference-model program | **ON DEMAND** | Adjudicate nominated states/prefixes; broad expansion needs a new prespecified question. |

The mechanic-composition probe is an earned bounded experiment, not a new workstream ID.

## Standing research rules

- Use `workSpent` across techniques; raw nodes are within-technique diagnostics. New actions/configs normally compete inside the total-work envelope.
- Level-blindness is not generalization. Historical IDs/outcomes, hints, family labels and capability-memory membership never become runtime routing inputs.
- Preserve **disposition** and **capability signature** separately. Closed treatments may remain useful offline evidence without reopening the tested form.
- Historical gain/loss intersections with current residual are nominations until reconciled under current code/protocol. Missing rows/provenance stay unknown.
- Clear negatives close tested forms absent a materially new premise; no-op/behavior-identical retries buy nothing.
- Hold out independent units, including whole variant parents, and scale confirmation with tuning/selection pressure.
- Reusable benchmark/census rows require matching protocol identity; nominal stage reach is not participation.
- Result identity, intended-population integrity, resolved configuration/provenance and budget semantics are research-control-plane invariants.
- After material capability promotion or provenance reinterpretation, refresh/rejoin the residual before treating old class/family/attribution/capability-memory counts as current.
- A validated hint prefix proves that prefix live, not that alternatives are dead. Query provenance for an explicit evidence purpose.
- Before escalating a persistent residual, ask whether materially different actions lose known-live material at the same boundary. Shared recurrence nominates capability work; idiosyncratic loss stays technique-level.
- Reconcile old questions against newer evidence before new compute. Prefer the smallest information-value test; advance independent offline work while long jobs run.

## Cheap evidence routing

- prior research: `node scripts/research-status-index.mjs --compact --query=<term>`
- tools: `node scripts/tooling-census.mjs --compact --query=<term>`
- research assets: `node scripts/research-asset-query.mjs --query=<term>`
- capability memory: `node scripts/solver-capability-memory.mjs --manifest=<manifest.json> --out=tmp/capability-memory.json --summary-out=tmp/capability-memory.md`
- corpus shape: `node scripts/corpus-query.mjs --corpus=stress2`
- frontier contrast: `node scripts/stress/analyze-frontier-contrast.mjs --out=tmp/post-1029-frontier-contrast.json`
- structural niche stability: `node scripts/analyze-technique-niche-stability.mjs`
- difficulty-controlled niches: `node scripts/analyze-difficulty-stratified-relative-advantage.mjs`

Search named mechanisms through `research-status-index --compact`; chronology belongs in dated reports, not this file.

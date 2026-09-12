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

**Current dispositions** (full evidence in the opt-in ledger and linked reports): must-cross neighbour-budget propagation, connectivity-volume portal check, `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` (folded default-on), goal-attraction-disabled retry — all **PROMOTED**. Portal coarse-state merge, repair late-probe `7->6` seeds, portfolio-18 resumable tranche — **CLOSED NEGATIVE/NULL**. Admissible-order retry `1.0->0.18` — **DEFERRED**. Details/links: [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md).

**Class-5-targeted lines, all closed this cycle (no reach found; class-5 acquisition remains the open first-priority question):**

- **First-loss program:** doubly confirmed (28/28, two disjoint samples) `score-width-culled` beam phenotype, DFS-falsified shared-scorer hypothesis, width-insensitive. [`dev`](../reports/2026-09-11-bounded-class4-class5-first-loss-phenotyping-001.md)/[`confirmation`](../reports/2026-09-11-ws2-independent-first-loss-confirmation-001.md). Repair-side: barely approaches the same trajectories at 10x budget, n=4 too small for a mechanism. [`report`](../reports/2026-09-11-repair-side-first-loss-exposure-001.md) Two bucket-key retention canaries earned by that confirmation (`ints`; the existing must-cross-only `mechanicBucketRetention` applied here, verified non-degenerate) both **CLOSED NEGATIVE** — zero solves, deltas inside noise. [`ints`](../reports/2026-09-12-ints-bucket-retention-canary-001.md)/[`mechanic`](../reports/2026-09-12-mechanic-bucket-on-intersection-heavy-canary-001.md)
- **Family/reference comparison:** reading existing family-census data across all 431 class-5 levels found naive whole-ladder rescue rates confound-dominated (larger `cs` perturbation rescues ~3x more than targeted `swap`; top cases solved by many unrelated edits) — the same general-difficulty confound the mechanic-composition pilot below already diagnosed, now population-scale-confirmed. **CLOSED** without a decoupled-control redesign. [`report`](../reports/2026-09-12-class5-family-reference-comparison-001.md)
- **Capability-memory census:** all 6 prespecified sources (portal coarse-state-merge, repair-must-turn-biased, beam mechanic-bucket x2, goal-attraction-disabled-retry, displaced-winner churn) nominate 65/652 (10.0%) of the residual, zero in class 5. **CLOSED.** [`reports`](../reports/2026-09-12-ws2-post-refresh-residual-atlas-and-capability-memory-census-001.md)/[`atlas fix`](../reports/2026-09-12-repair-turn-biased-t1-census-misclassification-001.md) (the atlas fix's 9-level `repair-turn-biased` pattern is `STRATEGY_REPAIR_TURN_BIAS`'s already-`CLOSED NEGATIVE` cost, not a new question).

### 2. Workstream 1: automatic solver action selection

**State:** ACTIVE / PARALLEL ANALYSIS.

Use capability, lifecycle, provenance, profile, family, census, trace, accepted-path and capability-memory evidence to distinguish `not exposed` from `exposed-and-failed`, and technique-relative response from shared-capability failure. Stored paths, family/profile labels, historical policy signatures and same-level outcomes are offline diagnostics only. Any production selector needs a legal generic current-level/current-solve signal plus confirmation proportional to the mined history/configuration space. [`evidence layer`](../reports/2026-09-09-hint-provenance-evidence-layer-upgrade-001.md)

**Frontier/structural-response path:** class 4 is the preferred near-control for class 5. Screen technique contrasts for temporal persistence and generic-difficulty confounding before family/profile/trace escalation. The same known-live extinction mechanism recurring across materially different actions may hand off to WS2/WS4; technique-specific response stays WS1. [`extension audit`](../reports/2026-09-11-structural-technique-response-extension-audit-001.md)

**Stages 3-5 complete for both frozen pairs (`R02687`/objectiveFirst, `R02094`/intersectionHarvest); extension ladder closed.** Stage 3: real `plain`-vs-`mechanic-buckets` sibling flips across 4/5 family modes per pair, opposite net directions. [`stage 3`](../reports/2026-09-11-ws1-stage3-isolated-technique-resolve-001.md) Stage 4: neither prespecified descriptor separates `R02094`'s response; both inapplicable to `R02687` (zero must-cross cells). [`stage 4`](../reports/2026-09-12-ws1-stage4-solution-space-mediation-result-001.md) Stage 5 (operational first divergence, one sibling per pair, small matched work): both diverge at the same depth, immediately after a mechanic-progress event creates a minority retention bucket that displaces a higher-scored majority-bucket candidate — where stage 3's flips originate. [`stage 5`](../reports/2026-09-12-ws1-stage5-first-divergence-result-001.md) n=2 licenses no selector; no third pair, no new variants.

### 3. Parallel capability-acquisition probe (no new workstream)

**State:** CLOSED — portal-terminal relocation instrument not clean enough to reuse.

The bounded 5-parent Stage A/B/C pilot ran to completion: 2/5 parents show the predicted mechanism-supporting chain cleanly (rescue disappears on decoupling without a control-side confound), but 2/5 hit the design's own pre-registered stop condition — the relocation itself introduces a general-difficulty confound (decoupled control and treatment solve identically, byte-for-byte, meaning the edit made the level easier through an unrelated route). One parent's original rescue does not reproduce at the pilot's **reduced diagnostic envelope**, which was matched across arms but smaller than the 50M-node production A/B that originally established the rescue. Per the design's stop rule, the observed relocation confounds are sufficient to close this instrument specifically; the reduced envelope limits interpretation of non-reproduction and is not used to narrow the underlying promotion. [`result`](../reports/2026-09-12-mechanic-composition-pilot-001-result.md), [`design`](../reports/2026-09-11-mechanic-composition-transfer-pilot-design-001.md)

**Reopen condition:** a materially different manipulation that does not relocate a landmark shared with the level's general navigation graph (e.g. adding/removing a viable must-cross axis while keeping the coupled cluster present), with its own frozen edit rule, execution envelope and confound check. This confound is now confirmed population-scale and mode-general (not specific to portal relocation) — see the class-5 family/reference comparison line above.

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Residual capability + fixed-work allocation | **ACTIVE / FIRST PRIORITY** | Census, first-loss retention canaries x2, and naive family/reference comparison all closed (no class-5 reach); class-5 acquisition work (exact-adjudication, or a genuinely new premise) is the sole open line. |
| 1 | Automatic action selection | **ACTIVE / PARALLEL** | Structural-response extension ladder closed for both frozen pairs (stage 5: operational first divergence identified, n=2, no selector licensed). Reopen only for a new pair/premise, not a third variant of this same question. |
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

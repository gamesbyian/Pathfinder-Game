# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, workstream state, and next gates.
> **Reconciled:** 2026-09-11.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

Keep this file **current-state only**. Detailed evidence belongs in reports; historical snapshots live under `docs/archive/snapshots/`.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Capability memory: [`solver-capability-memory.md`](solver-capability-memory.md). Deferred material: [`solver-future-work.md`](solver-future-work.md).

## Current execution priority

### 1. Workstream 2: residual capability + fixed-work allocation

**State:** ACTIVE / FIRST PRIORITY.

**Canonical production boundary:** run `34531412380` is **99/102 Corpus 1 + 1,029/1,700 Corpus 2**, zero errors/truncation, leaving **671 Corpus-2 misses**. The later +21 joint-obligation promotion is real but is not silently added to the headline count; a full refresh must establish the next production boundary.

**Residual atlas:** provenance-audited five-class split is 26 not-offered (3.9%), 21 offered-but-unreached/starved (3.1%), 36 reached/comparable-work-failed (5.4%), 143 no-T1-winner but explicit historical production-context candidate (21.3%), and **445 no known admissible/T1 candidate (66.3%)**. Missing `isolatedTechnique` remains unknown, not false. The 143 historical candidates are nomination evidence only. [`atlas`](../reports/2026-09-11-post-1029-residual-atlas-001.md), [`provenance audit`](../reports/2026-09-11-hint-provenance-evidence-relevance-audit-001.md)

**Current dispositions:**

- must-cross neighbour-budget propagation: **PROMOTED**, +52/-0 on 530 portal+must-cross levels; [`report`](../reports/2026-09-09-mc-neighbor-budget-portal-ab-001-preflight.md)
- connectivity-volume portal check: **PROMOTED**, +2/-0 on 954 portal levels; [`report`](../reports/2026-09-09-connectivity-volume-portal-ab-001-preflight.md)
- `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`: **PROMOTED**, 21/219 gains, 0 losses, all referee-valid; this is not yet folded into a refreshed headline boundary;
- goal-attraction-disabled retry: **PROMOTED**, +3/-0; [`ledger`](solver-opt-in-experiment-ledger.md)
- portal coarse-state merge: **CLOSED NEGATIVE/default-OFF**. Frozen A/B +158/-12; exact `R01273` repro showed the merge key omitted trailing visited-cell identity and bounded salvage variants only delayed failure. The +158/-12 signature remains strong offline capability-memory evidence, not a reason to reopen the rejected form. [`A/B`](../reports/2026-09-09-portal-coarse-state-merge-ab-001-preflight.md), [`forensic`](../reports/2026-09-11-portal-coarse-state-merge-r01273-collision-forensic-001.md)
- repair late-probe `7 -> 6` seeds: **CLOSED NEGATIVE**; seed 7 uniquely rescues `R02460`/`R02553`; [`result`](../reports/2026-09-10-repair-late-probe-six-seed-confirmation-001-result.md)
- portfolio-18 same-policy resumable residual tranche: **CLOSED NULL**, 52/120 both arms with zero treatment-exclusive gains; [`result`](../reports/portfolio/resumable-tranche-development-ab-001/result.md)
- admissible-order retry `1.0 -> 0.18`: **DEFERRED**. Allocation/exposure classes are only 8.5% of the residual; if reopened, prove target-stage participation and preserve specialist wins. [`methodology`](../reports/2026-09-10-admissible-order-non-default-retry-matched-work-methodology-001.md)

**First-loss program:** two disjoint 14-level samples reproduce the same beam phenotype, giving **28/28 score-width culls** with little benefit from +2.5x width. DFS-greedy local-rank cross-checks keep the known-live continuation near the top and therefore do not establish a shared scorer failure; DFS is also too beam-like to satisfy the cross-action recurrence bar. [`development`](../reports/2026-09-11-bounded-class4-class5-first-loss-phenotyping-001.md), [`confirmation`](../reports/2026-09-11-ws2-independent-first-loss-confirmation-001.md)

**Repair-side follow-up is complete:** natural repair search does not approach the known-live beam trajectories even at 10x the small matched-work probe. When repair is seeded exactly at the beam-cull state, **4/28 are reconstructable and 24/28 operator-incapable**. The four reconstructable cases nominate a Card-E continuation/handoff question; n=4 is too small to size or justify a mechanism. [`report`](../reports/2026-09-11-repair-side-first-loss-exposure-001.md)

**Next gate:** before spending on more allocation, use the named current residual plus capability-memory evidence to measure genuinely complementary capability and its overlap/freshness/work economics. Historical signatures can nominate a premise; current comparable rows are required to claim current capability. Cross-action recurrence, not more dose of the same action, remains the bar for shared-capability escalation.

### 2. Workstream 1: automatic solver action selection

**State:** ACTIVE / PARALLEL ANALYSIS.

Use capability, lifecycle, provenance, profile, family, census, trace, accepted-path and capability-memory evidence to distinguish `not exposed` from `exposed-and-failed`, and technique-relative response from shared-capability failure. Stored paths, family/profile labels, historical policy signatures and same-level outcomes remain offline diagnostics, never production routing inputs. Any production selector needs a legal generic current-level/current-solve signal plus confirmation proportional to the history/configuration space mined. [`evidence layer`](../reports/2026-09-09-hint-provenance-evidence-layer-upgrade-001.md)

**Frontier/structural-response path:** class 4 is the preferred near-control for class 5. Screen technique contrasts for temporal persistence and generic-difficulty confounding before family/profile/trace escalation. The same known-live extinction mechanism recurring across materially different actions may hand off to WS2/WS4; technique-specific response stays WS1. Capability-memory policy contrasts may nominate cases but must be reconciled before being treated as current action capability. [`extension audit`](../reports/2026-09-11-structural-technique-response-extension-audit-001.md)

**Stage 3 is complete and positive for both frozen pairs:** isolated matched-work resolves for `R02687`/objectiveFirst and `R02094`/intersectionHarvest show real `plain` vs `mechanic-buckets` sibling-response flips across 4/5 existing transform modes for each pair, with opposite net directions. Static object counts and portal-use timing do not mediate the difference. **Next:** source-controlled solution-space mediation, especially must-cross order/basin descriptors, for these two pairs only; do not add a third pair or generate a broad new family campaign. [`report`](../reports/2026-09-11-ws1-stage3-isolated-technique-resolve-001.md)

The old `396 intersection-heavy + must-cross-heavy + multi-portal / 118 solved` cohort is historical sizing. At the post-1,029 boundary, the triple overlap is **232/671 (34.6%)**. [`residual atlas`](../reports/2026-09-11-post-1029-residual-atlas-001.md)

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Residual capability + fixed-work allocation | **ACTIVE / FIRST PRIORITY** | Measure current-residual complementary capability/overlap before more allocation work. Card-E remains nomination-only. |
| 1 | Automatic action selection | **ACTIVE / PARALLEL** | Continue temporal/difficulty-controlled structural response; next earned stage is solution-space mediation for the two stage-3 pairs. |
| 6 | Repair reachability/reconstructability | **SUPPORTING** | Reopen only when first-loss/family evidence shows a live continuation needs repair-side interior/early commitment revision. |
| 7 | Architectural speed/execution substrate | **SUPPORTING** | Reopen for an earned mechanism with measured runtime cost or a new hotspot. |
| 3 | Generalization/holdout discipline | **METHOD COMPLETE** | Keep grouped-family independence and confirmation proportional to selection pressure; capability-memory mining increases that pressure. |
| 8 | Cheap isolated capability missed by production | **SUBSUMED BY WS1** | Isolated winners are action-selection evidence, not permanent tail entitlement. |
| 0 | Restart/randomization + learned-failure search | **CLOSED IN TESTED FORMS** | Reopen only for recurring commitment-diversity/restart evidence under the existing gates. |
| 4 | Beam retention at extinction boundaries | **CLOSED IN TESTED FORMS** | Reopen only for independent known-live recurrence across materially distinct actions or a genuinely new bounded descriptor. The 28/28 beam cull alone does not satisfy that bar. |
| 5 | Exact/reference-model program | **ON DEMAND** | Adjudicate nominated states/prefixes; broad CP-SAT expansion needs a new prespecified question. |

## Standing research rules

- Use `workSpent` across techniques; raw nodes are within-technique diagnostics. New actions/configs normally compete inside the existing total-work envelope.
- Level-blindness is not generalization. Exact historical IDs/outcomes, hints, family labels and capability-memory membership never become runtime routing inputs.
- Preserve **disposition** and **capability signature** separately. A closed treatment may remain useful offline evidence without retaining failed code or reopening the tested form.
- Historical gain/loss intersections with a current residual are nominations until reconciled under current code/protocol. Missing rows/provenance stay unknown.
- Clear negatives close tested forms absent a materially new premise. A no-op/behavior-identical retry buys nothing.
- Hold out independent units, including whole variant parents where applicable, and scale confirmation with tuning/selection pressure.
- Reusable benchmark/census rows require matching protocol identity; nominal stage reach is not participation.
- After a material capability promotion or provenance reinterpretation, refresh/rejoin the production residual before treating old class/family/attribution/capability-memory counts as current.
- A validated hint prefix proves that prefix live, not that alternatives are dead. Query provenance for an explicit evidence purpose.
- Before escalating a persistent residual, ask whether materially different actions lose known-live material at the same boundary. Shared recurrence nominates capability work; idiosyncratic loss stays technique-level.
- Reconcile old questions against newer evidence before new compute. Prefer the smallest information-value test, and advance independent offline work while long jobs run.

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

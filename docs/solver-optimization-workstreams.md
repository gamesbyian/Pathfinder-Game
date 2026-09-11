# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, workstream state, and next gates.
> **Reconciled:** 2026-09-10.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

Keep this file **current-state only**. Detailed evidence belongs in reports; historical snapshots live under `docs/archive/snapshots/`.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Deferred material: [`solver-future-work.md`](solver-future-work.md).

## Current execution priority

### 1. Workstream 2: residual capability and fixed-work allocation

**State:** active. First rebuild the current 671-miss residual map from existing evidence. Then pursue the high-upside portal coarse-state salvage forensic. Spend new population-scale compute on repricing only if the refreshed residual still makes allocation the best lever. The simple same-policy resumable-tranche salvage is closed NULL and is no longer active queue work.

#### Current production boundary

Post-restoration run `34531412380` is **99/102 Corpus 1 + 1,029/1,700 Corpus 2**, net +55/-0 across both corpora, with zero errors/truncation. Corpus 2 therefore has **671 misses**. Counts from the older 975/1,700 boundary are historical sizing only.

Portal restoration dispositions:

- **Must-cross neighbour-budget propagation:** PROMOTED, +52/-0 on 530 portal+must-cross levels. [`preflight`](../reports/2026-09-09-mc-neighbor-budget-portal-ab-001-preflight.md)
- **Connectivity volume check:** PROMOTED, +2/-0 on 954 portal levels. [`preflight`](../reports/2026-09-09-connectivity-volume-portal-ab-001-preflight.md)
- **Portal-aware beam coarse-state merge:** GLOBAL PROMOTION CLOSED NEGATIVE/default-OFF. Frozen portal A/B was +158/-12. The unconditional form loses real control capability; capability-safe salvage remains high-value. [`preflight`](../reports/2026-09-09-portal-coarse-state-merge-ab-001-preflight.md), [`source diagnosis`](../reports/2026-09-10-portal-coarse-state-salvage-source-diagnosis-001.md)
- **Same-parity portal parity prune/gate:** correctness evidence clean; no solve-rate campaign warranted at the observed population size.

Production repricing dispositions:

- **Goal-attraction-disabled retry fresh pool:** PROMOTED, confirmation +3/-0. [`ledger`](solver-opt-in-experiment-ledger.md)
- **Repair late-probe `7 -> 6` seeds:** CLOSED NEGATIVE. Seed 7 uniquely rescues `R02460` and `R02553`; keep seven. [`result`](../reports/2026-09-10-repair-late-probe-six-seed-confirmation-001-result.md)
- **Admissible-order retry `1.0 -> 0.18`:** work-cap enforcement prerequisite is implemented; a genuine matched-work confirmation remains available but should follow the residual evidence rather than pre-empt it. [`methodology`](../reports/2026-09-10-admissible-order-non-default-retry-matched-work-methodology-001.md)
- **Portfolio-18 same-policy resumable residual tranche:** CLOSED NULL. Fresh 120-level fixed-work A/B solved 52/120 in both arms with real participation: 120/120 eligible, 64 continuation dispatches, zero errors/truncation, zero treatment-exclusive gains. Do not retry this simple form with different tranche sizes, beam policies, or menu growth without a materially new premise. [`preflight`](../reports/2026-09-05-static-portfolio-resumable-tranche-salvage-preflight.md), [`result`](../reports/portfolio/resumable-tranche-development-ab-001/result.md)

#### Ordered next gates

1. **Post-1,029 residual atlas: NEXT / OFFLINE.** Rejoin the 671 misses against registered T1 census `33717910218`, lifecycle exposure, provenance/history, and structural/fingerprint/family data. A zero-winner T1 row is not a `no-known-rescuer` certificate. Separate known rescuer not offered, offered but unreached/starved, reached/comparably-worked but failed, census-gap/history rescuer, and no-known-rescuer after cross-evidence. Reuse `scripts/stress/analyze-current-missing-attempt-exposure.mjs`. [`handoff`](../reports/2026-09-10-post-1029-residual-priority-refresh-001.md)
2. **Portal coarse-state salvage: ACTIVE HIGH-VALUE.** Reproduce the exact `R01273` control-winning `must-cross-neighbor-prune-disabled-retry` attempt with the existing beam research observer, locate the first harmful treatment collision, and diff future-relevant state omitted from the coarse key. Test the smallest level-blind state-local retention distinction. Require the frozen 12-loss cohort to retain all known control solves before another 954-level portal run. [`source diagnosis`](../reports/2026-09-10-portal-coarse-state-salvage-source-diagnosis-001.md)
3. **Admissible-order repricing: READY / BOUNDED.** If the atlas still points to allocation as the best next lever, run the real matched-work `1.0 -> 0.18` confirmation through the new tier-scoped enforcement path and prove participation before interpreting the result. If the atlas instead exposes a larger representation/search-policy failure class, follow that evidence first.

### 2. Workstream 1: automatic solver action selection

**State:** active for parallel existing-data analysis; production routing changes remain downstream of the residual atlas and specialist-protected evidence.

Use capability, lifecycle, provenance, profile, variant, census, trace and accepted-path evidence. For hinted failures, audit provenance/dedup, select structurally diverse basins, locate where all known-live basins disappear, and classify loss as allocation/exposure, search policy, prune/state merge/representation, or other reasoning failure. Cross policies with lifecycle/census exposure so `exposed-and-failed` remains distinct from `not exposed`.

Stored paths, provenance, profile/family labels and same-level outcomes are offline diagnostics, not production routing inputs. [`evidence-layer upgrade`](../reports/2026-09-09-hint-provenance-evidence-layer-upgrade-001.md)

The former `396 intersection-heavy + must-cross-heavy + multi-portal / 118 solved` cohort is historical sizing only. Recompute it inside the current 671 misses before using it to nominate new propagation or routing. Current lifecycle classification is refreshed against run `34531412380`; it does not replace the broader T1/provenance capability join. [`exposure classification`](../reports/2026-09-10-ws1-existing-data-exposure-classification-001.md)

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Residual capability + fixed-work allocation | **ACTIVE / FIRST PRIORITY** | Offline 671-miss atlas -> R01273 coarse-state forensic and 12-loss salvage gate -> bounded repricing only if still highest-value. |
| 1 | Automatic action selection | **ACTIVE / PARALLEL ANALYSIS** | Join current residual to T1 + provenance capability and lifecycle; protect low-multiplicity capability before routing changes. |
| 6 | Repair reachability/reconstructability | **SUPPORTING** | Static block count is an exploratory signal only (AUC 0.69 on 8 vs 22 cases). Run a fresh prespecified confirmation only if current residual evidence makes that non-cheap test worth buying. |
| 7 | Architectural speed/execution substrate | **SUPPORTING** | Reopen only for a materially different mechanism or newly measured hotspot. |
| 3 | Generalization/holdout discipline | **METHOD COMPLETE** | Concrete methodological failure. |
| 8 | Cheap isolated capability missed by production | **SUBSUMED BY WS1** | Isolated winners are action-selection evidence, not permanent tail entitlement. |
| 0 | Restart/randomization + learned-failure search | **CLOSED IN TESTED FORMS** | Materially new restart-by-work/population evidence or sound failure certificate. |
| 4 | Beam retention at extinction boundaries | **CLOSED IN TESTED FORMS** | Independent evidence for materially different bounded retention. |
| 5 | Exact/reference-model program | **ON DEMAND** | Reuse retained exact counterexamples; broad new CP-SAT only for a new prespecified question. |

## Standing research rules

- Use `workSpent` for cross-technique allocation; raw nodes are within-technique diagnostics.
- New actions/configurations expand the menu, not the default total budget.
- Level-blindness is not generalization; confirmation strength scales with tuning pressure.
- Clear negatives close tested forms absent materially new evidence.
- Hold out independent units, including whole variant parents/families where applicable.
- Audit low-multiplicity retention against reconciled current evidence, not a stale census label; nominal stage reach is not participation.
- After a material capability promotion, refresh the production residual before treating old family counts or attribution shares as current.
- A validated hint prefix proves that prefix live, not that alternatives are dead.
- Reconcile old questions against newer evidence before new compute; prefer the smallest value-of-information test.
- Do not wait on expensive jobs when independent offline analysis, source diagnosis, test hardening, or documentation reconciliation can advance a separate gate.

## Cheap evidence routing

- prior research: `node scripts/research-status-index.mjs --compact --query=<term>`
- existing tools: `node scripts/tooling-census.mjs --compact --query=<term>`
- research assets: `node scripts/research-asset-query.mjs --query=<term>`
- corpus shape: `node scripts/corpus-query.mjs --corpus=stress2`
- hint/provenance audit: `node scripts/run-bundled.mjs scripts/stress/hint-provenance-evidence-report.mjs -- --corpus=all`
- current missing-exposure rejoin: `node scripts/run-bundled.mjs scripts/stress/analyze-current-missing-attempt-exposure.mjs -- --baseline=reports/stress/capability-runs/34531412380/per-level-corpus2.json --census=reports/stress/technique-census/33717910218/combined-cells.json --out=tmp/post-1029-missing-attempt-exposure.json`

Use [`solver-research-data-assets.md`](solver-research-data-assets.md) for evidence topology. Search named mechanisms through `research-status-index --compact`; chronology belongs in matched reports or frozen snapshots.
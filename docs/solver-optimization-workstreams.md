# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, workstream state, and next gates.
> **Reconciled:** 2026-09-11.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

Keep this file **current-state only**. Detailed evidence belongs in reports; historical snapshots live under `docs/archive/snapshots/`.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Deferred material: [`solver-future-work.md`](solver-future-work.md).

## Current execution priority

### 1. Workstream 2: residual capability and fixed-work allocation

**State:** active. The 671-miss residual atlas is done; portal coarse-state salvage (gate 2) is done and CLOSED NEGATIVE — the R01273 forensic found the coarse key's real blind spot (trailing visited-cell identity) but every tested bounded discriminator (second-survivor retention, 1/2/4-hop predecessor subkey) only delayed the failure without closing it, so the salvage line is closed per its own prespecified rule rather than escalated toward a full visited-set key. Allocation/exposure is only 8.5% of the residual (gate 3), so the atlas-driven production-facing priority now falls to gate 3 (bounded, conditional) and the WS1 menu-expansion candidate the atlas also surfaced. Frontier characterization proceeds in parallel as offline WS1 existing-data work. The simple same-policy resumable-tranche salvage is closed NULL and is no longer active queue work.

#### Current production boundary

Post-restoration run `34531412380` is **99/102 Corpus 1 + 1,029/1,700 Corpus 2**, net +55/-0 across both corpora, with zero errors/truncation. Corpus 2 therefore has **671 misses**. Counts from the older 975/1,700 boundary are historical sizing only.

Portal restoration dispositions:

- **Must-cross neighbour-budget propagation:** PROMOTED, +52/-0 on 530 portal+must-cross levels. [`preflight`](../reports/2026-09-09-mc-neighbor-budget-portal-ab-001-preflight.md)
- **Connectivity volume check:** PROMOTED, +2/-0 on 954 portal levels. [`preflight`](../reports/2026-09-09-connectivity-volume-portal-ab-001-preflight.md)
- **Portal-aware beam coarse-state merge:** GLOBAL PROMOTION CLOSED NEGATIVE/default-OFF; capability-safe salvage also CLOSED NEGATIVE (2026-09-11). Frozen portal A/B was +158/-12. Exact deterministic `R01273` reproduction found the coarse key's real blind spot (trailing visited-cell identity), but bounded second-survivor retention and a predecessor-identity subkey (tested at 1/2/4-hop lookback) each only delayed the failure (true death depth 17 -> 20 -> 40 -> 41 -> 43) without closing it, with no sign of convergence. Closed per the source diagnosis's own rule rather than escalated toward a full visited-set key. [`preflight`](../reports/2026-09-09-portal-coarse-state-merge-ab-001-preflight.md), [`source diagnosis`](../reports/2026-09-10-portal-coarse-state-salvage-source-diagnosis-001.md), [`R01273 collision forensic`](../reports/2026-09-11-portal-coarse-state-merge-r01273-collision-forensic-001.md)
- **Same-parity portal parity prune/gate:** correctness evidence clean; no solve-rate campaign warranted at the observed population size.

Production repricing dispositions:

- **Goal-attraction-disabled retry fresh pool:** PROMOTED, confirmation +3/-0. [`ledger`](solver-opt-in-experiment-ledger.md)
- **Repair late-probe `7 -> 6` seeds:** CLOSED NEGATIVE. Seed 7 uniquely rescues `R02460` and `R02553`; keep seven. [`result`](../reports/2026-09-10-repair-late-probe-six-seed-confirmation-001-result.md)
- **Admissible-order retry `1.0 -> 0.18`:** work-cap enforcement prerequisite is implemented; a genuine matched-work confirmation remains available but should follow the residual evidence rather than pre-empt it. [`methodology`](../reports/2026-09-10-admissible-order-non-default-retry-matched-work-methodology-001.md)
- **Portfolio-18 same-policy resumable residual tranche:** CLOSED NULL. Fresh 120-level fixed-work A/B solved 52/120 in both arms with real participation: 120/120 eligible, 64 continuation dispatches, zero errors/truncation, zero treatment-exclusive gains. Do not retry this simple form with different tranche sizes, beam policies, or menu growth without a materially new premise. [`preflight`](../reports/2026-09-05-static-portfolio-resumable-tranche-salvage-preflight.md), [`result`](../reports/portfolio/resumable-tranche-development-ab-001/result.md)

#### Ordered next gates

1. **Post-1,029 residual atlas: DONE.** Full per-level five-class rejoin of the 671 misses against T1 census `33717910218`, this run's own per-attempt dispatch log, lifecycle reach/starvation, structural/routing features, and hint-store provenance. Result: known-rescuer-not-offered 26 (3.9%), offered-but-unreached/starved 21 (3.1%), reached-comparable-work-failed 36 (5.4%), no-T1-winner-but-provenance-rescuer 200 (29.8%), no-known-rescuer-after-reconciliation 388 (57.8%). Portal-bearing structure dominates every class (497/671 overall, 74.1%; 86.5% of class 4, 75% of class 3) and originally nominated gate 2 ahead of gate 3; gate 2 has since closed negative. The atlas also nominates a small, cheap WS1 menu-expansion candidate: 26 never-offered levels, dominated by two recurring `width=5000`/`mechanic-buckets` beam configs on non-portal `intersection-heavy` levels. [`atlas report`](../reports/2026-09-11-post-1029-residual-atlas-001.md)
2. **Portal coarse-state salvage: DONE, CLOSED NEGATIVE (2026-09-11).** Reproduced the exact `R01273` control-winning `must-cross-neighbor-prune-disabled-retry` attempt deterministically; the true first-loss collision (depth 17) is a trailing visited-cell-identity divergence the coarse key omits. Two salvage shapes (bounded second-survivor retention; predecessor-identity subkey at 1/2/4-hop lookback) each measurably delayed the failure but never closed it, with no sign of convergence as lookback widened — the prespecified closing condition. The frozen 12-loss/158-gain validation ladder was never reached; no code from this line is retained. Reopen only with a materially different mechanism (an untested portal-scoped near-tie-margin widening, or an independently confirmed fix to the near-tie-retention capacity limitation the forensic's side observation noted), not a retry of the same shapes. [`R01273 collision forensic`](../reports/2026-09-11-portal-coarse-state-merge-r01273-collision-forensic-001.md)
3. **Admissible-order repricing: NEXT, BOUNDED.** With gate 2 closed, this is WS2's next-ranked production-facing item, but the atlas itself found only 21/671 (3.1%) misses with an offered-but-starved known rescuer and 36/671 (5.4%) reached-with-comparable-work failures, spread across repair and admissible-order tiers together — allocation is a minority failure mode, so keep this bounded rather than treating it as a large opportunity. If pursued, run the matched-work `1.0 -> 0.18` confirmation through the tier-scoped enforcement path and prove target-stage participation before interpreting the result. The class-1 menu-expansion candidate above (26 never-offered levels, two recurring `width=5000`/`mechanic-buckets` beam configs) is a cheaper, better-evidenced next WS1 action and can run in parallel or instead.

#### Algorithmic-frontier boundary

Use **algorithmic frontier** for the reconciled current-residual cohort with no known rescue capability after the applicable census, production lifecycle/attempt, and provenance/history evidence has been exhausted. It is not synonymous with `production-unsolved`, `no T1 winner`, or mathematical impossibility. At the post-1,029 boundary, atlas class 5 supplies the current frontier candidate cohort: **388/671 misses (57.8%)**. Refresh that cohort after material capability promotions rather than treating 388 as permanent.

A substantial frontier cohort is the trigger to shift research emphasis from merely allocating the existing repertoire toward explaining and creating missing capability. Use the funnel in [`solver-future-work.md`](solver-future-work.md): phenotype/family grouping -> solution/provenance comparison -> first-divergence or representation-loss localization -> minimal counterexample where useful -> smallest generic level-blind capability -> bounded frontier pilot -> independent/whole-family validation. Do not create a separate frontier workstream until the active queue has a concrete recurring mechanism or intervention that deserves ownership beyond WS1/WS2.

The first active characterization gate is the **class-5 vs class-4 frontier contrast**. Class 4 is the primary near-control because both populations have zero isolated T1 winners; class 4 differs by having a historical strict cold-capability Pathfinder rescuer. The existing coarse atlas already shows that class 5 is *less* portal-bearing (69.3% vs 86.5%) and has less portal+must-cross+intersection-heavy triple overlap (33.5% vs 43.5%), while being modestly more intersection-heavy (83.8% vs 77.0%). So frontier status should not be modeled as simply “more portal/mechanic complexity.” The closure of portal coarse-state salvage strengthens the case for running this offline mechanism-characterization line now: continue with richer static/production-response contrast, source-controlled solution-space comparison, existing variant-family boundary flips, and representative-basin extinction before proposing heavyweight new algorithms. [`frontier contrast`](../reports/2026-09-11-algorithmic-frontier-class4-vs5-contrast-001.md), [`execution handoff`](../reports/2026-09-11-algorithmic-frontier-execution-handoff-001.md)

### 2. Workstream 1: automatic solver action selection

**State:** active for parallel existing-data analysis. Two cheap lines may advance alongside bounded WS2 repricing: frontier characterization of the 388 class-5 candidate levels, and the atlas's 26-level never-offered menu-expansion candidate. Production routing changes remain downstream of specialist-protected evidence.

Use capability, lifecycle, provenance, profile, variant, census, trace and accepted-path evidence. For hinted failures, audit provenance/dedup, select structurally diverse basins, locate where all known-live basins disappear, and classify loss as allocation/exposure, search policy, prune/state merge/representation, or other reasoning failure. Cross policies with lifecycle/census exposure so `exposed-and-failed` remains distinct from `not exposed`.

Stored paths, provenance, profile/family labels and same-level outcomes are offline diagnostics, not production routing inputs. [`evidence-layer upgrade`](../reports/2026-09-09-hint-provenance-evidence-layer-upgrade-001.md)

**Frontier characterization: ACTIVE / OFFLINE.** Treat class 4 (200 zero-T1-winner levels with historical cold rescues) as the primary control for class 5 (388 zero-T1-winner levels with no known rescuer); keep classes 1-4 combined as a secondary operational comparator. The residual-atlas analyzer now emits both contrasts using the existing static-feature vocabulary plus production work/attempt telemetry. Rerun it first, then use source-controlled solution-profile evidence, the existing historical variant-family resource, and representative-basin survival/extinction where coverage permits. Do not compare combined hint profiles without provenance/source control, because class 4 contains Pathfinder cold-capability provenance by definition. No broad new solver compute is justified by this gate yet. [`contrast plan`](../reports/2026-09-11-algorithmic-frontier-class4-vs5-contrast-001.md), [`execution handoff`](../reports/2026-09-11-algorithmic-frontier-execution-handoff-001.md)

The former `396 intersection-heavy + must-cross-heavy + multi-portal / 118 solved` cohort is historical sizing only. Recomputed inside the current 671 misses by the post-1,029 residual atlas: 232/671 (34.6%) triple-overlap, still the largest single structural concentration in the residual. Current lifecycle classification is refreshed against run `34531412380`; the broader T1/provenance capability join and per-level five-class rescuer breakdown is now also done. [`exposure classification`](../reports/2026-09-10-ws1-existing-data-exposure-classification-001.md), [`residual atlas`](../reports/2026-09-11-post-1029-residual-atlas-001.md)

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Residual capability + fixed-work allocation | **ACTIVE / FIRST PRIORITY** | Atlas done; portal salvage done/CLOSED NEGATIVE -> bounded admissible-order repricing next, in parallel with WS1 offline characterization/menu work. |
| 1 | Automatic action selection | **ACTIVE / PARALLEL OFFLINE** | Rerun extended atlas for class-5-vs-class-4 static/production contrast -> source-controlled solution-space comparison -> existing family boundary flips -> representative-basin extinction; separately retain the 26-level never-offered `width=5000`/`mechanic-buckets` beam menu candidate. |
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
- current residual atlas + frontier contrast: `node scripts/run-bundled.mjs scripts/stress/analyze-post-1029-residual-atlas.mjs -- --baseline=reports/stress/capability-runs/34531412380/per-level-corpus2.json --lifecycle=reports/stress/capability-runs/34531412380/lifecycle-failure-map-corpus2.json --census=reports/stress/technique-census/33717910218/combined-cells.json --hints-dir=data/stress/hints-random --out=tmp/post-1029-residual-atlas.json`
- current missing-exposure rejoin: `node scripts/run-bundled.mjs scripts/stress/analyze-current-missing-attempt-exposure.mjs -- --baseline=reports/stress/capability-runs/34531412380/per-level-corpus2.json --census=reports/stress/technique-census/33717910218/combined-cells.json --out=tmp/post-1029-missing-attempt-exposure.json`

Use [`solver-research-data-assets.md`](solver-research-data-assets.md) for evidence topology. Search named mechanisms through `research-status-index --compact`; chronology belongs in matched reports or frozen snapshots.

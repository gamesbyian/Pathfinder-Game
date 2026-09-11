# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, workstream state, and next gates.
> **Reconciled:** 2026-09-11.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

Keep this file **current-state only**. Detailed evidence belongs in reports; historical snapshots live under `docs/archive/snapshots/`.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Deferred material: [`solver-future-work.md`](solver-future-work.md).

## Current execution priority

### 1. Workstream 2: residual capability and fixed-work allocation

**State:** active. The 671-miss residual atlas is done; portal coarse-state salvage is done and CLOSED NEGATIVE. Allocation/exposure is only 8.5% of the residual, so admissible-order repricing is deferred; the atlas-justified next gate is the observer-only joint-obligation propagation pilot on the 388-level no-known-rescuer residue. The simple same-policy resumable-tranche salvage is closed NULL and is no longer active queue work.

#### Current production boundary

Post-restoration run `34531412380` is **99/102 Corpus 1 + 1,029/1,700 Corpus 2**, net +55/-0 across both corpora, with zero errors/truncation. Corpus 2 therefore has **671 misses**. Counts from the older 975/1,700 boundary are historical sizing only.

Portal restoration dispositions:

- **Must-cross neighbour-budget propagation:** PROMOTED, +52/-0 on 530 portal+must-cross levels. [`preflight`](../reports/2026-09-09-mc-neighbor-budget-portal-ab-001-preflight.md)
- **Connectivity volume check:** PROMOTED, +2/-0 on 954 portal levels. [`preflight`](../reports/2026-09-09-connectivity-volume-portal-ab-001-preflight.md)
- **Portal-aware beam coarse-state merge:** GLOBAL PROMOTION CLOSED NEGATIVE/default-OFF; capability-safe salvage also CLOSED NEGATIVE (2026-09-11). Frozen portal A/B was +158/-12; exact `R01273` reproduction found the coarse key's real blind spot (trailing visited-cell identity), but every tested bounded discriminator only delayed the failure without closing it. [`preflight`](../reports/2026-09-09-portal-coarse-state-merge-ab-001-preflight.md), [`R01273 collision forensic`](../reports/2026-09-11-portal-coarse-state-merge-r01273-collision-forensic-001.md)
- **Same-parity portal parity prune/gate:** correctness evidence clean; no solve-rate campaign warranted at the observed population size.

Production repricing dispositions:

- **Goal-attraction-disabled retry fresh pool:** PROMOTED, confirmation +3/-0. [`ledger`](solver-opt-in-experiment-ledger.md)
- **Repair late-probe `7 -> 6` seeds:** CLOSED NEGATIVE. Seed 7 uniquely rescues `R02460` and `R02553`; keep seven. [`result`](../reports/2026-09-10-repair-late-probe-six-seed-confirmation-001-result.md)
- **Admissible-order retry `1.0 -> 0.18`:** work-cap enforcement prerequisite is implemented; a genuine matched-work confirmation remains available but should follow the residual evidence rather than pre-empt it. [`methodology`](../reports/2026-09-10-admissible-order-non-default-retry-matched-work-methodology-001.md)
- **Portfolio-18 same-policy resumable residual tranche:** CLOSED NULL. Fresh 120-level fixed-work A/B solved 52/120 in both arms with real participation: 120/120 eligible, 64 continuation dispatches, zero errors/truncation, zero treatment-exclusive gains. Do not retry this simple form with different tranche sizes, beam policies, or menu growth without a materially new premise. [`preflight`](../reports/2026-09-05-static-portfolio-resumable-tranche-salvage-preflight.md), [`result`](../reports/portfolio/resumable-tranche-development-ab-001/result.md)

#### Ordered next gates

1. **Post-1,029 residual atlas: DONE.** Full per-level five-class rejoin of the 671 misses. Result: not-offered 26 (3.9%), offered-unreached/starved 21 (3.1%), reached-comparable-work-failed 36 (5.4%), no-T1-winner-but-provenance-rescuer 200 (29.8%), no-known-rescuer 388 (57.8%). Portal-bearing structure dominates every class (497/671, 74.1%). Also nominates a small, cheap WS1 menu-expansion candidate: 26 never-offered levels, two recurring `width=5000`/`mechanic-buckets` beam configs. [`atlas report`](../reports/2026-09-11-post-1029-residual-atlas-001.md)
2. **Portal coarse-state salvage: DONE, CLOSED NEGATIVE (2026-09-11).** Exact `R01273` reproduction localized the true first-loss collision (depth 17) to trailing visited-cell identity omitted from the coarse key. Bounded second-survivor retention and a predecessor-identity subkey (1/2/4-hop) each only delayed the failure (death depth 17 -> 20 -> 40 -> 41 -> 43) with no convergence — closed per the prespecified rule; the 12-loss/158-gain ladder was never reached; no salvage code retained. [`R01273 collision forensic`](../reports/2026-09-11-portal-coarse-state-merge-r01273-collision-forensic-001.md)
3. **Admissible-order repricing: DEFERRED.** Atlas classes 2+3 (allocation/exposure) are only 8.5% of the residual, materially smaller than the 57.8% no-known-rescuer class — per the gate's own rule, do not spend the next population-scale run here. If ever run, use the tier-scoped enforcement path and prove target-stage participation first.
4. **No-known-rescuer residue (388/671, 57.8%): NEXT, atlas-justified.** Meets [`2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md`](../reports/2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md)'s own reopening trigger. Next gate: its **observer-only joint-obligation propagation pilot** (log pass/reject/abstain against real search, no pruning yet; promote only after clearing zero-false-rejection/material-dead-work gates). **Near-control requirement:** class 4 is more portal-bearing than class 5 (86.5% vs 69.3%) and has more portal+must-cross+intersection-heavy overlap (43.5% vs 33.5%), so mechanic concentration alone cannot explain frontier membership. Include class 4, composition-matched where practical, and require a differential mechanism-level signal before promotion. [`frontier contrast`](../reports/2026-09-11-algorithmic-frontier-class4-vs5-contrast-001.md)

### 2. Workstream 1: automatic solver action selection

**State:** active for parallel existing-data analysis; production routing changes remain downstream of the residual atlas and specialist-protected evidence.

Use capability, lifecycle, provenance, profile, variant, census, trace and accepted-path evidence. For hinted failures, audit provenance/dedup, select structurally diverse basins, locate where all known-live basins disappear, and classify loss as allocation/exposure, search policy, prune/state merge/representation, or other reasoning failure. Cross policies with lifecycle/census exposure so `exposed-and-failed` remains distinct from `not exposed`.

Stored paths, provenance, profile/family labels and same-level outcomes are offline diagnostics, not production routing inputs. [`evidence-layer upgrade`](../reports/2026-09-09-hint-provenance-evidence-layer-upgrade-001.md)

**Frontier characterization: ACTIVE / OFFLINE SUPPORT.** Use class 4 (200 zero-T1 historical-rescuer levels) as the primary control for class 5 (388 no-known-rescuer levels). Run static/production contrast, source-controlled profiles, existing family-boundary joins, and bounded all-known-basin extinction analysis to de-risk and interpret the joint-obligation observer. [`plan`](../reports/2026-09-11-algorithmic-frontier-class4-vs5-contrast-001.md), [`handoff`](../reports/2026-09-11-algorithmic-frontier-execution-handoff-001.md)

The former `396 intersection-heavy + must-cross-heavy + multi-portal / 118 solved` cohort is historical sizing only. Recomputed by the post-1,029 residual atlas: 232/671 (34.6%) triple-overlap, still the largest structural concentration. The broader T1/provenance capability join and per-level five-class rescuer breakdown is done. [`exposure classification`](../reports/2026-09-10-ws1-existing-data-exposure-classification-001.md), [`residual atlas`](../reports/2026-09-11-post-1029-residual-atlas-001.md)

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Residual capability + fixed-work allocation | **ACTIVE / FIRST PRIORITY** | Observer-only joint-obligation propagation on the 388-level no-known-rescuer residue, with class-4 near-control evidence required before promotion. |
| 1 | Automatic action selection | **ACTIVE / PARALLEL ANALYSIS** | Frontier class-5-vs-class-4 characterization supports the observer; the 26-level never-offered `width=5000`/`mechanic-buckets` beam cohort remains a small parallel menu-expansion candidate. |
| 6 | Repair reachability/reconstructability | **SUPPORTING** | Static block count is exploratory only (AUC 0.69, n=8 vs 22). Fresh prespecified CP-SAT confirmation only if worth buying. `bestBadnessTechnique` is not a valid substitute signal (beam/DFS rarely populate `bestProgress` the way repair does). |
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
- frontier contrast: `node scripts/stress/analyze-frontier-contrast.mjs --out=tmp/post-1029-frontier-contrast.json`
- current missing-exposure rejoin: `node scripts/run-bundled.mjs scripts/stress/analyze-current-missing-attempt-exposure.mjs -- --baseline=reports/stress/capability-runs/34531412380/per-level-corpus2.json --census=reports/stress/technique-census/33717910218/combined-cells.json --out=tmp/post-1029-missing-attempt-exposure.json`

Use [`solver-research-data-assets.md`](solver-research-data-assets.md) for evidence topology. Search named mechanisms through `research-status-index --compact`; chronology belongs in matched reports or frozen snapshots.

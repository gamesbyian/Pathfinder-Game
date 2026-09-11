# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, workstream state, and next gates.
> **Reconciled:** 2026-09-11.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

Keep this file **current-state only**. Detailed evidence belongs in reports; historical snapshots live under `docs/archive/snapshots/`.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Deferred material: [`solver-future-work.md`](solver-future-work.md).

## Current execution priority

### 1. Workstream 2: residual capability and fixed-work allocation

**State:** active. The 671-miss residual atlas is done; portal coarse-state salvage is done and CLOSED NEGATIVE. Allocation/exposure is only 8.5% of the residual, so admissible-order repricing is deferred. The observer-only joint-obligation propagation pilot is DONE, CONCLUDED-POSITIVE, and its hard-prune flag `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` is PROMOTED (2026-09-11, default-ON) after a frozen matched-work A/B found 21 gains / 0 losses. The simple same-policy resumable-tranche salvage is closed NULL and is no longer active queue work.

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
4. **No-known-rescuer residue (388/671, 57.8%): observer pilot DONE, CONCLUDED-POSITIVE; hard-prune PROMOTED (2026-09-11).** A must-cross-forced-neighbor x visited-portal-terminal obligation cluster (categorically unenterable again per `search-state.ts`'s portal-revisit rule — a gap `mustCrossNeighborBudgetDeadlocked` already named but left open) cleared all four observer promotion gates: 0 false rejects across the oracle atlas, a full 3-corpus known-solution replay, and the class-4/class-5 real-search run; 15 unique oracle-atlas dead-branch catches beyond the existing gauntlet; a depth-confound-controlled 1.6x median reject-rate enrichment in class 5 vs the class-4 near-control. Its opt-in hard-prune flag `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` then ran a frozen matched-work A/B on the full 219-level opportunity population (mirrors `PRUNE_MC_NEIGHBOR_BUDGET_PORTAL`): control 0/219, treatment 21/219, **21 gains / 0 losses**, all referee-valid — now PROMOTED to default-ON. **NEXT:** bounded all-known-basin first-loss work should classify remaining evidence via the capability map's roles; cross-action recurrence is the gate for a shared-capability claim, else keep technique/config research primary. [`observer pilot`](../reports/2026-09-11-joint-obligation-propagation-observer-pilot-001.md), [`A/B preflight/result`](../reports/2026-09-11-joint-obligation-mc-portal-ab-001-preflight.md), [`handoff`](../reports/2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md), [`frontier contrast`](../reports/2026-09-11-algorithmic-frontier-class4-vs5-contrast-001.md), [`capability map`](../reports/2026-09-11-future-feasibility-capability-map-001.md)

### 2. Workstream 1: automatic solver action selection

**State:** active for parallel existing-data analysis; production routing changes remain downstream of the residual atlas and specialist-protected evidence.

Use capability, lifecycle, provenance, profile, variant, census, trace and accepted-path evidence. For hinted failures, audit provenance/dedup, select structurally diverse basins, locate where all known-live basins disappear, and classify loss as allocation/exposure, search policy, prune/state merge/representation, or other reasoning failure. Cross policies with lifecycle/census exposure so `exposed-and-failed` remains distinct from `not exposed`.

Stored paths, provenance, profile/family labels and same-level outcomes are offline diagnostics, not production routing inputs. [`evidence-layer upgrade`](../reports/2026-09-09-hint-provenance-evidence-layer-upgrade-001.md)

**Frontier + structural-response characterization: ACTIVE / OFFLINE SUPPORT.** Use class 4 as the primary control for class 5, and screen broader technique niches for temporal stability plus generic-difficulty confounding before escalating to existing-family flips, source-controlled profiles or traces. Structural-response work has two exits: stable technique-relative evidence remains WS1; the same known-live extinction mechanism recurring across materially distinct actions becomes a shared-capability hypothesis and hands off to WS2/the earned specialist owner. [`structural-response audit`](../reports/2026-09-11-structural-technique-response-extension-audit-001.md), [`capability map`](../reports/2026-09-11-future-feasibility-capability-map-001.md)

The former `396 intersection-heavy + must-cross-heavy + multi-portal / 118 solved` cohort is historical sizing only. Recomputed by the post-1,029 residual atlas: 232/671 (34.6%) triple-overlap, still the largest structural concentration. The broader T1/provenance capability join and per-level five-class rescuer breakdown is done. [`exposure classification`](../reports/2026-09-10-ws1-existing-data-exposure-classification-001.md), [`residual atlas`](../reports/2026-09-11-post-1029-residual-atlas-001.md)

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Residual capability + fixed-work allocation | **ACTIVE / FIRST PRIORITY** | Joint-obligation observer pilot concluded-positive; next is its pruning-pilot promotion A/B, plus bounded class-4/class-5 first-loss phenotyping. Route only recurring cross-action mechanisms to generic capability work. |
| 1 | Automatic action selection | **ACTIVE / PARALLEL ANALYSIS** | Run frontier + temporal/difficulty-controlled response screening; distinguish technique-relative advantage from shared extinction. The 26-level never-offered beam cohort remains a small parallel candidate. |
| 6 | Repair reachability/reconstructability | **SUPPORTING** | Reopen for operator reachability only if first-loss/family evidence shows valid continuations require revising interior/early commitments; otherwise keep current CP-SAT/static evidence boundaries. |
| 7 | Architectural speed/execution substrate | **SUPPORTING** | Reopen only for an earned mechanism with measured runtime cost or a newly measured hotspot. |
| 3 | Generalization/holdout discipline | **METHOD COMPLETE** | Concrete methodological failure; capability claims use grouped parents/symmetry controls and proportional confirmation. |
| 8 | Cheap isolated capability missed by production | **SUBSUMED BY WS1** | Isolated winners are action-selection evidence, not shared-capability evidence or permanent tail entitlement. |
| 0 | Restart/randomization + learned-failure search | **CLOSED IN TESTED FORMS** | Reopen only if new evidence says the deficit is commitment diversity/restart behavior rather than missing reasoning. |
| 4 | Beam retention at extinction boundaries | **CLOSED IN TESTED FORMS** | Reopen only for independent known-live merge/retention recurrence or a materially new bounded residual-state descriptor; R01273 alone does not reopen closed salvage forms. |
| 5 | Exact/reference-model program | **ON DEMAND** | Adjudicate whether nominated prefixes/states are genuinely live; broad new CP-SAT remains gated by a new prespecified question. |

## Standing research rules

- Use `workSpent` for cross-technique allocation; raw nodes are within-technique diagnostics.
- New actions/configurations expand the menu, not the default total budget.
- Level-blindness is not generalization; confirmation strength scales with tuning pressure.
- Clear negatives close tested forms absent materially new evidence.
- Hold out independent units, including whole variant parents/families where applicable.
- Audit low-multiplicity retention against reconciled current evidence, not a stale census label; nominal stage reach is not participation.
- After a material capability promotion, refresh the production residual before treating old family counts or attribution shares as current.
- A validated hint prefix proves that prefix live, not that alternatives are dead.
- Before escalating a persistent residual through routing/config/retention/restart/budget, ask whether materially different actions lose known-live material at the same residual-state future-feasibility boundary. Shared recurrence nominates capability work; idiosyncratic loss stays technique-level.
- Reconcile old questions against newer evidence before new compute; prefer the smallest value-of-information test.
- Do not wait on expensive jobs when independent offline analysis, source diagnosis, test hardening, or documentation reconciliation can advance a separate gate.

## Cheap evidence routing

- prior research: `node scripts/research-status-index.mjs --compact --query=<term>`
- existing tools: `node scripts/tooling-census.mjs --compact --query=<term>`
- research assets: `node scripts/research-asset-query.mjs --query=<term>`
- corpus shape: `node scripts/corpus-query.mjs --corpus=stress2`
- hint/provenance audit: `node scripts/run-bundled.mjs scripts/stress/hint-provenance-evidence-report.mjs -- --corpus=all`
- frontier contrast: `node scripts/stress/analyze-frontier-contrast.mjs --out=tmp/post-1029-frontier-contrast.json`
- structural niche stability: `node scripts/analyze-technique-niche-stability.mjs`
- difficulty-controlled niches: `node scripts/analyze-difficulty-stratified-relative-advantage.mjs`
- current missing-exposure rejoin: `node scripts/run-bundled.mjs scripts/stress/analyze-current-missing-attempt-exposure.mjs -- --baseline=reports/stress/capability-runs/34531412380/per-level-corpus2.json --census=reports/stress/technique-census/33717910218/combined-cells.json --out=tmp/post-1029-missing-attempt-exposure.json`

Use [`solver-research-data-assets.md`](solver-research-data-assets.md) for evidence topology. Search named mechanisms through `research-status-index --compact`; chronology belongs in matched reports or frozen snapshots.

# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, workstream state, and next gates.
> **Reconciled:** 2026-09-11.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

Keep this file **current-state only**. Detailed evidence belongs in reports; historical snapshots live under `docs/archive/snapshots/`.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Deferred material: [`solver-future-work.md`](solver-future-work.md).

## Current execution priority

### 1. Workstream 2: residual capability and fixed-work allocation

**State:** active. The 671-miss residual atlas is done (provenance-audited rerun); portal coarse-state salvage is done and CLOSED NEGATIVE. Allocation/exposure is only 8.5% of the residual, so admissible-order repricing is deferred. The joint-obligation propagation flag `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` is PROMOTED (2026-09-11, default-ON); see gate 4 below. First-loss phenotyping (gate 5) concluded negative for cross-action recurrence; beam-specific, routed to WS1/WS4. The simple same-policy resumable-tranche salvage is closed NULL and is no longer active queue work.

#### Current production boundary

Post-restoration run `34531412380` is **99/102 Corpus 1 + 1,029/1,700 Corpus 2**, net +55/-0 across both corpora, with zero errors/truncation. Corpus 2 therefore has **671 misses**. Counts from the older 975/1,700 boundary are historical sizing only.

Portal restoration dispositions:

- **Must-cross neighbour-budget propagation:** PROMOTED, +52/-0 on 530 portal+must-cross levels. [`preflight`](../reports/2026-09-09-mc-neighbor-budget-portal-ab-001-preflight.md)
- **Connectivity volume check:** PROMOTED, +2/-0 on 954 portal levels. [`preflight`](../reports/2026-09-09-connectivity-volume-portal-ab-001-preflight.md)
- **Portal-aware beam coarse-state merge:** CLOSED NEGATIVE/default-OFF, incl. capability-safe salvage (2026-09-11). Frozen A/B +158/-12; exact `R01273` repro found the coarse key's blind spot (trailing visited-cell identity), but every bounded discriminator only delayed the failure. [`preflight`](../reports/2026-09-09-portal-coarse-state-merge-ab-001-preflight.md), [`R01273 forensic`](../reports/2026-09-11-portal-coarse-state-merge-r01273-collision-forensic-001.md)
- **Same-parity portal parity prune/gate:** correctness clean; no solve-rate campaign warranted at this population size.

Production repricing dispositions:

- **Goal-attraction-disabled retry fresh pool:** PROMOTED, +3/-0. [`ledger`](solver-opt-in-experiment-ledger.md)
- **Repair late-probe `7 -> 6` seeds:** CLOSED NEGATIVE; seed 7 uniquely rescues `R02460`/`R02553`. [`result`](../reports/2026-09-10-repair-late-probe-six-seed-confirmation-001-result.md)
- **Admissible-order retry `1.0 -> 0.18`:** work-cap prerequisite implemented; confirmation available but should follow residual evidence, not pre-empt it. [`methodology`](../reports/2026-09-10-admissible-order-non-default-retry-matched-work-methodology-001.md)
- **Portfolio-18 same-policy resumable residual tranche:** CLOSED NULL. 120-level fixed-work A/B: 52/120 both arms, 120/120 eligible, zero treatment-exclusive gains. Do not retry without a materially new premise. [`preflight`](../reports/2026-09-05-static-portfolio-resumable-tranche-salvage-preflight.md), [`result`](../reports/portfolio/resumable-tranche-development-ab-001/result.md)

#### Ordered next gates

1. **Post-1,029 residual atlas: DONE, provenance-audited rerun.** Five-class rejoin of the 671 misses: not-offered 26 (3.9%), offered-unreached/starved 21 (3.1%), reached-comparable-work-failed 36 (5.4%), no-T1-winner-but-historical-candidate 143 (21.3%), no known admissible/T1 candidate 445 (66.3%). Legacy absence of `isolatedTechnique` is unknown, not `false`. The 143 are longitudinal nominations only. [`atlas report`](../reports/2026-09-11-post-1029-residual-atlas-001.md), [`provenance audit`](../reports/2026-09-11-hint-provenance-evidence-relevance-audit-001.md)
2. **Portal coarse-state salvage: DONE, CLOSED NEGATIVE (2026-09-11).** Exact `R01273` repro localized the first-loss collision (depth 17) to trailing visited-cell identity omitted from the key; bounded second-survivor retention and a predecessor-identity subkey each only delayed the failure (17->20->40->41->43) with no convergence — closed per the prespecified rule; no salvage code retained. [`forensic`](../reports/2026-09-11-portal-coarse-state-merge-r01273-collision-forensic-001.md)
3. **Admissible-order repricing: DEFERRED.** Classes 2+3 (allocation/exposure) are only 8.5% of the residual, materially smaller than the 66.3% no-known-rescuer class. If ever run, use the tier-scoped path and prove target-stage participation first.
4. **No-known-rescuer residue (445/671, 66.3%): observer pilot DONE, hard-prune PROMOTED (2026-09-11).** A must-cross-forced-neighbor x visited-portal-terminal obligation cluster (unenterable per `search-state.ts`'s portal-revisit rule) cleared all four observer promotion gates (0 false rejects). Its flag `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` ran a frozen matched-work A/B on the 219-level opportunity population: control 0/219, treatment 21/219, **21 gains / 0 losses**, all referee-valid — PROMOTED.
5. **Bounded class-4/5 first-loss phenotyping: DONE (2026-09-11), concluded-negative for cross-action recurrence.** 14-level sample (from the joint-obligation pilot's 206-level population, excluding the 21 already-rescued ids): known-live material dies via an ordinary beam score-width cull (`rank-retention-loss`) at both production widths (2000, 5000; +2.5x width bought only 0-13 extra steps), 0 correctness alarms. A DFS-greedy rank cross-check (new `scripts/stress/first-loss-dfs-rank-crosscheck.mjs`) under 5 scoring profiles found near-top local ranking throughout, including at the cull depth — falsifying a shared-scorer explanation; since DFS/beam aren't materially distinct actions, **cross-action recurrence is not established**. Stays WS1/WS4 technique research. [`report`](../reports/2026-09-11-bounded-class4-class5-first-loss-phenotyping-001.md)
6. **Independent-sample confirmation: DONE (2026-09-11), recurs 14/14.** A second, disjoint, tertile-stratified 14-level sample from the same 206-level population reproduces the identical phenotype byte-for-byte in shape: `score-width-culled` 14/14, width-insensitive (+2.5x width bought 0-6 extra steps), DFS falsifies the shared-scorer hypothesis under all 5 profiles (mean max-step rank 2-3, same as the dev sample). Combined 28/28 across two disjoint samples. Cross-action recurrence still not established (DFS remains too similar to beam). [`report`](../reports/2026-09-11-ws2-independent-first-loss-confirmation-001.md)
7. **Repair-side coverage: DONE (2026-09-11) for natural exposure; operator-reachability-if-seeded remains open.** Extended `census-repair-rollback-windows.mjs` with `--only=<ids>` and ran it against the full 28-level frontier population at two matched-work node budgets (30k, 300k — a 10x escalation). Repair's own randomized-restart search never approaches the known-live trajectories on this population (best natural common-prefix match 1-17 steps, ~19% as deep as beam's own score-width cull depth on the same levels) and a 10x work increase bought **zero** improvement on 26/28 levels — the same width/dose-insensitivity shape as the beam finding, ruling out "just needs more work." Reads as `rank-retention-loss`'s repair-side counterpart at the *exposure* stage, not yet an operator-topology finding (that needs the existing splice/CP-SAT pipeline seeded at these levels' cull depths — not run here). [`report`](../reports/2026-09-11-repair-side-first-loss-exposure-001.md)

### 2. Workstream 1: automatic solver action selection

**State:** active for parallel analysis; production routing changes remain downstream of the residual atlas and specialist-protected evidence.

Use capability, lifecycle, provenance, profile, variant, census, trace and accepted-path evidence. For hinted failures, audit provenance/dedup, select structurally diverse basins, locate where all known-live basins disappear, and classify loss as allocation/exposure, search policy, prune/state merge/representation, or other reasoning failure. Cross policies with lifecycle/census exposure so `exposed-and-failed` remains distinct from `not exposed`.

Stored paths, provenance, profile/family labels and same-level outcomes are offline diagnostics, not production routing inputs. [`evidence-layer upgrade`](../reports/2026-09-09-hint-provenance-evidence-layer-upgrade-001.md)

**Frontier + structural-response characterization: ACTIVE / OFFLINE SUPPORT.** Use class 4 as the primary control for class 5, and screen broader technique niches for temporal stability plus generic-difficulty confounding before escalating to existing-family flips, source-controlled profiles or traces. Structural-response work has two exits: stable technique-relative evidence remains WS1; the same known-live extinction mechanism recurring across materially distinct actions becomes a shared-capability hypothesis and hands off to WS2/the earned specialist owner. [`structural-response audit`](../reports/2026-09-11-structural-technique-response-extension-audit-001.md), [`capability map`](../reports/2026-09-11-future-feasibility-capability-map-001.md)

The former `396 intersection-heavy + must-cross-heavy + multi-portal / 118 solved` cohort is historical sizing only. Recomputed by the post-1,029 atlas: 232/671 (34.6%) triple-overlap, still the largest structural concentration. The broader T1/provenance join and per-level five-class breakdown is done. [`exposure classification`](../reports/2026-09-10-ws1-existing-data-exposure-classification-001.md), [`residual atlas`](../reports/2026-09-11-post-1029-residual-atlas-001.md)

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Residual capability + fixed-work allocation | **ACTIVE / FIRST PRIORITY** | Joint-obligation hard-prune promoted; first-loss phenotyping concluded negative for cross-action recurrence — beam-specific, routed to WS1/WS4, now confirmed sample-independent (28/28 across two disjoint samples). Repair-side natural exposure also checked and is dose-insensitive at the same shape; operator-reachability-if-seeded remains the one open sub-question before further capability-map escalation. |
| 1 | Automatic action selection | **ACTIVE / PARALLEL ANALYSIS** | Run frontier + temporal/difficulty-controlled response screening; distinguish technique-relative advantage from shared extinction. First-loss phenotyping nominates a beam score-width rank-retention pattern as WS1/WS4 follow-up. Class-1 compact-beam-menu: naive form closed, budget-dilution overlap; see `solver-future-work.md`. |
| 6 | Repair reachability/reconstructability | **SUPPORTING** | Reopen for operator reachability only if first-loss/family evidence shows valid continuations require revising interior/early commitments; otherwise keep current CP-SAT/static evidence boundaries. |
| 7 | Architectural speed/execution substrate | **SUPPORTING** | Reopen only for an earned mechanism with measured runtime cost or a newly measured hotspot. |
| 3 | Generalization/holdout discipline | **METHOD COMPLETE** | Concrete methodological failure; capability claims use grouped parents/symmetry controls and proportional confirmation. |
| 8 | Cheap isolated capability missed by production | **SUBSUMED BY WS1** | Isolated winners are action-selection evidence, not shared-capability evidence or permanent tail entitlement. |
| 0 | Restart/randomization + learned-failure search | **CLOSED IN TESTED FORMS** | Reopen only if new evidence says the deficit is commitment diversity/restart behavior rather than missing reasoning. |
| 4 | Beam retention at extinction boundaries | **CLOSED IN TESTED FORMS** | Reopen only for independent known-live merge/retention recurrence or a materially new bounded residual-state descriptor; R01273 alone does not reopen closed salvage forms. The width-insensitive score-width cull (`rank-retention-loss`) is now confirmed sample-independent (28/28 across two disjoint 14-level samples), but cross-*action* recurrence (the actual reopen bar) still is not established — DFS falsifies a shared-scorer story and repair shows a materially different (non-exposure) failure shape rather than the same retention-loss signature. |
| 5 | Exact/reference-model program | **ON DEMAND** | Adjudicate whether nominated prefixes/states are genuinely live; broad new CP-SAT remains gated by a new prespecified question. |

## Standing research rules

- Use `workSpent` for cross-technique allocation; raw nodes are within-technique diagnostics.
- New actions/configs expand the menu, not the default total budget.
- Level-blindness is not generalization; confirmation strength scales with tuning pressure.
- Clear negatives close tested forms absent materially new evidence.
- Hold out independent units, including whole variant parents/families where applicable.
- Audit low-multiplicity retention against reconciled current evidence, not a stale census label; nominal stage reach is not participation.
- Baseline provenance is tri-state: missing stays `unknown`, not unsolved.
- Reusable benchmark/census rows need matching protocol identity; no partial reuse under changed contention. A no-op retry buys nothing.
- After a material capability promotion, refresh the production residual before treating old family counts or attribution shares as current.
- A validated hint prefix proves that prefix live, not that alternatives are dead.
- Hint provenance must be queried for an explicit evidence purpose. Variant replay, witnesses, external solves, guided/randomized runs and old solver regimes remain valid atlas/oracle/history evidence but do not establish current production capability; raw event count is not support.
- Before escalating a persistent residual, ask whether materially different actions lose known-live material at the same residual-state boundary. Shared recurrence nominates capability work; idiosyncratic loss stays technique-level.
- Reconcile old questions against newer evidence before new compute; prefer the smallest info-value test.
- Do not wait on expensive jobs when offline analysis, source diagnosis, test hardening, or docs reconciliation can advance a separate gate.

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
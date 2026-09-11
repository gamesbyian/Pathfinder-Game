# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, workstream state, and next gates.
> **Reconciled:** 2026-09-10.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

Keep this file **current-state only**. Detailed evidence belongs in reports; historical snapshots live under `docs/archive/snapshots/`.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Deferred material: [`solver-future-work.md`](solver-future-work.md).

## Current execution priority

### 1. Workstream 2: fixed-work scheduler allocation and residual capability

**State:** active; post-restoration residual refresh first, portal coarse-state salvage and resumable allocation next, then bounded repricing according to the refreshed failure mix.

#### Portal restoration — DONE (2026-09-09/10)

Portal levels are 954/1,700 of Corpus 2 (551/725 production misses at the pre-restoration 975/1,700 boundary). All four independent matched-work items are resolved:

1. **Must-cross neighbour-budget propagation** — PROMOTED. 530-level portal+must-cross A/B: 52 gains/0 losses (net +52), every gain referee-valid, zero regressions. [`preflight`](../reports/2026-09-09-mc-neighbor-budget-portal-ab-001-preflight.md)
2. **Portal-aware beam coarse-state merge** — GLOBAL PROMOTION CLOSED NEGATIVE; stays opt-in (`STRATEGY_PORTAL_COARSE_STATE_MERGE`). 954-level A/B: 158 gains/12 losses (net +146), but at least one real control capability (`R01273`) is lost under treatment and does not recover merely from a much larger treatment envelope. Later local reproduction corrected the original stale isolated-beam attribution: the actual control win is the `must-cross-neighbor-prune-disabled-retry` stage, not the census-named isolated beam cell. The unconditional form remains unsafe; **specialist-safe/capability-safe salvage is now an active high-value residual target**, not a promotion retry. [`preflight`](../reports/2026-09-09-portal-coarse-state-merge-ab-001-preflight.md), [`source diagnosis`](../reports/2026-09-10-portal-coarse-state-salvage-source-diagnosis-001.md)
3. **Connectivity volume check** — PROMOTED. 954-level A/B: 2 gains (`R02297`, `R02746`)/0 losses, zero regressions. False-goal mirror stays untouched pending its own differential. [`preflight`](../reports/2026-09-09-connectivity-volume-portal-ab-001-preflight.md)
4. **Same-parity portal parity prune/gate** — DONE. Unit + stored-path differential (0 violations) + regression (160/160) clean on the 21 zero-twist-pair portal levels; no solve-rate campaign warranted at this size.

Catalog: [`portal carve-outs`](../reports/2026-09-09-portal-carveout-and-additive-tier-solve-rate-catalog-001.md). Evidence hardening: [`hardening`](../reports/2026-09-09-portal-restoration-evidence-hardening-001.md).

The two-stage lifecycle instantiation projection gap is repaired: `guidance-goal-distance-retry` and `late-repair-multiseed-retry` now report correct `mechanicallyEligible`/`instantiated` telemetry. The required post-restoration refresh is complete: run `34531412380` is 99/102 Corpus 1 + 1,029/1,700 Corpus 2, net +55/-0 across both corpora with zero errors/truncation. Do not carry forward the old 975/1,700 residual attribution or old family denominators as current sizing evidence.

#### 2A. Production repricing closeout

Treat independently:

1. **Goal-attraction-disabled retry fresh pool.** **Done (2026-09-10) — PROMOTED.** `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE` + `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL` are production default-ON, promoted together. Confirmation-002 (reach-conditioned 150-level Corpus-2, disjoint from prior populations): 14/150 -> 17/150, +3/-0, all gains attributable to the tier, reach 104 -> 140/150. See [`ledger`](solver-opt-in-experiment-ledger.md).
2. **Repair late-probe `7 -> 6` seeds.** **Done (2026-09-10) — CLOSED NEGATIVE.** 150-level reach-conditioned confirmation found seed 7 is a unique rescue on `R02460` and `R02553`; unconditional truncation is disqualified despite 5.5% aggregate work saving. See [`preflight`](../reports/2026-09-05-repair-late-probe-six-seed-confirmation-preflight.md), [`result`](../reports/2026-09-10-repair-late-probe-six-seed-confirmation-001-result.md).
3. **Admissible-order retry `1.0 -> 0.18`.** **Prerequisite implemented (2026-09-10); confirmation still not run.** Plain `admissibleOrderSearch` previously ignored the tier-scoped `prep._workCap`, making the intended matched-work test architecturally inert. `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_WORK_CAP_ENFORCEMENT` now supplies an opt-in, tier-scoped enforcement path and is unit-tested at pre-search and periodic checks. Production remains `1.0`; the confirmation is now meaningful but is no longer the default next use of solver compute ahead of the post-1,029 residual refresh. See [`methodology`](../reports/2026-09-10-admissible-order-non-default-retry-matched-work-methodology-001.md) and [`ledger`](solver-opt-in-experiment-ledger.md).

#### 2B. Post-restoration residual and allocation construction

Production ladder/capability refresh is **done** (2026-09-10, run `34531412380`: 99/102 + 1,029/1,700, net +55/-0 vs. pre-restoration, zero errors/truncation). Corpus 2 now has **671 misses**. The old triple-overlap and 975-boundary residual counts are historical until recomputed.

1. **Post-1,029 residual atlas — NEXT / OFFLINE.** Rejoin the current 671 misses against the complete current registered isolated-T1 census (`33717910218`), post-restoration lifecycle exposure, provenance/history, structural/fingerprint/family data and reconciled capability multiplicity. A zero-winner T1 row is not by itself a `no-known-rescuer` certificate: earlier cross-evidence found 25/35 apparent no-T1 production successes already had isolated-technique provenance outside that matrix. Separate known rescuer not offered, offered-but-unreached/starved, reached/comparably-worked-but-failed, census-gap/history rescuer, and truly no-known-rescuer-after-cross-evidence residuals. Reuse `scripts/stress/analyze-current-missing-attempt-exposure.mjs`; do not create another overlapping framework. Exact inputs/output contract: [`post-1029 priority refresh`](../reports/2026-09-10-post-1029-residual-priority-refresh-001.md).
2. **Portal coarse-state-merge salvage — ACTIVE HIGH-VALUE CAPABILITY TARGET.** Global promotion remains closed/default-OFF. The portal-pair identity defect is already fixed; the remaining risk is the ordinary approximate merge keeping a higher scorer while discarding a lower scorer with materially different future-relevant path/edge state. Use the existing beam research observer first: it already records every merge removal with removed/kept paths, scores and key. Reproduce the exact `R01273` control-winning retry attempt, locate the first harmful collision, then test the smallest level-blind state-local second-survivor/subkey rule. Require the frozen 12-loss cohort to retain all known control solves before another 954-level run. [`source diagnosis`](../reports/2026-09-10-portal-coarse-state-salvage-source-diagnosis-001.md)
3. **Resumable portfolio — SMALL ENGINEERING GATE BEFORE DEVELOPMENT A/B.** Solver-internal production-width continuation capture is implemented and validated with bounded single-digit-percent overshoot. PR #1714 now preserves `resumableResidualTranche` attempt telemetry and result-level `resumableResidualPass` accounting through `portfolio-solve-sweep` reports. The remaining batch-runner gap is explicit activation: `portfolio-solve-sweep.mjs` does not yet expose a CLI switch that sets `staticPortfolio.resumableResidualPass`. Next gate is to wire and test that switch through sequential + worker paths and prove treatment participation; only then run portfolio-18 first pass + same-policy continuation inside 67M. [`Preflight`](../reports/2026-09-05-static-portfolio-resumable-tranche-salvage-preflight.md), [`post-1029 priority refresh`](../reports/2026-09-10-post-1029-residual-priority-refresh-001.md)
4. **Flag-inert dispatch/full-population repricing — READY, BOUNDED.** Equal-total-work repricing can proceed after or in parallel with the offline atlas. `admissible-order-alternate-tiebreak-retry` remains the most actionable candidate because its work-cap prerequisite has landed, but the refreshed residual composition should decide whether this deserves scarce full-population solver compute ahead of representation/search-policy work. [`Portal catalog`](../reports/2026-09-09-portal-carveout-and-additive-tier-solve-rate-catalog-001.md), [`exposure classification`](../reports/2026-09-10-ws1-existing-data-exposure-classification-001.md)

### 2. Workstream 1: automatic solver action selection

**State:** active for parallel analysis; production routing changes remain downstream of the post-restoration residual atlas and specialist-protected evidence.

Existing capability, lifecycle, provenance, profile, variant, census, trace and accepted-path evidence may be mined now. Promote only held-out/replicated signals.

#### Hint/provenance evidence tranche

Treat the hint store as a solution-space atlas, a sound positive oracle of validated prefixes, and a longitudinal discovery log. Read provenance on separate **origin**, **search/run facet**, and **capability-admissibility** axes. [`Evidence-layer upgrade`](../reports/2026-09-09-hint-provenance-evidence-layer-upgrade-001.md)

Before new solver compute on a hinted failure:

1. run the corpus-wide provenance/dedup audit;
2. select structurally diverse solution basins rather than the first hint;
3. locate the first point where **all known-live basins** disappear in real search/replay and classify the loss as allocation/exposure, search policy, prune/state merge/representation, or other reasoning failure;
4. cross representative basins with relevant policies and join lifecycle/census exposure so `exposed-and-failed` differs from `not exposed`;
5. use diverse validated prefixes as a one-sided soundness screen for portal state merging, parity/connectivity and other pruning/representation changes;
6. mine Corpus-2 basin complementarity, decision entropy, temporal basin stability, producer/config novelty, variant transfer, and independence-aware agreement.

Reuse existing prefix-survival, divergence, rank and replay tools before creating new frameworks. Stored paths/provenance/profile/family/winner labels remain offline diagnostics and may not be direct same-level production routing inputs.

The former high-risk cohort (`396` intersection-heavy + must-cross-heavy + multi-portal, `118` solved at its old boundary) is now **historical sizing only**. Portal restoration materially changed the solved set. Recompute that structural cohort and its reconciled capability/exposure composition inside the 671 current misses before using it to nominate new joint propagation or routing. [`Handoff`](../reports/2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md), [`post-1029 priority refresh`](../reports/2026-09-10-post-1029-residual-priority-refresh-001.md)

Eligible/exposed/failed classification is refreshed against run `34531412380`: [`exposure classification`](../reports/2026-09-10-ws1-existing-data-exposure-classification-001.md). It establishes the current lifecycle side of the atlas, including the `admissible-order-fallback` telemetry-artifact correction, but does not replace the broader T1/provenance capability join.

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Fixed-work scheduler + residual capability | **ACTIVE / FIRST PRIORITY** | Offline post-1,029 atlas -> coarse-state loss forensic / resumable runner wiring -> bounded A/Bs by refreshed value. |
| 1 | Automatic action selection | **ACTIVE / PARALLEL ANALYSIS** | Join current residual to T1 + provenance capabilities, lifecycle and known-live basins; protect low-multiplicity capability before routing changes. |
| 6 | Repair reachability/reconstructability | **SUPPORTING** | Reopen only with cheaper labelled cases or materially new reconstruction evidence. |
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
- Audit specialist/low-multiplicity retention against reconciled current evidence, not a stale census label; nominal stage reach is not participation.
- After any material capability promotion, refresh the production residual before treating old family counts or attribution shares as current.
- A validated hint prefix proves that prefix live, not that alternatives are dead.
- Capability claims must separate provenance origin/facets/admissibility; only actual Pathfinder solver evidence establishes production cold capability.
- Repeated provenance is evidence unless it is the same discovery event recorded twice. Raw event count is not independence count.
- Reconcile old questions against newer evidence before new compute; prefer the smallest value-of-information test.

## Cheap evidence routing

- prior research: `node scripts/research-status-index.mjs --compact --query=<term>`
- existing tools: `node scripts/tooling-census.mjs --compact --query=<term>`
- research assets/joins: `node scripts/research-asset-query.mjs --query=<term>`
- corpus shape: `node scripts/corpus-query.mjs --corpus=stress2`
- hint/provenance audit: `node scripts/run-bundled.mjs scripts/stress/hint-provenance-evidence-report.mjs -- --corpus=all`
- current missing-exposure rejoin: `node scripts/run-bundled.mjs scripts/stress/analyze-current-missing-attempt-exposure.mjs -- --baseline=reports/stress/capability-runs/34531412380/per-level-corpus2.json --census=reports/stress/technique-census/33717910218/combined-cells.json --out=tmp/post-1029-missing-attempt-exposure.json`

Use [`solver-research-data-assets.md`](solver-research-data-assets.md) for evidence-topology guidance. Search named mechanisms through `research-status-index --compact`; detailed chronology belongs in matched reports or frozen snapshots.

# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, workstream state, and next gates.
> **Reconciled:** 2026-09-09.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization.

Keep this file **current-state only**. Replace stale state rather than appending chronology. Detailed evidence belongs in reports; historical snapshots live under `docs/archive/snapshots/`.

Workstream IDs are stable identifiers, not ranks. Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Deferred material: [`solver-future-work.md`](solver-future-work.md).

## Current execution priority

### 1. Workstream 2: fixed-work scheduler allocation and repricing

**State:** active; portal capability restoration is the immediate first tranche, then bounded 2A closeouts and broader construction use the refreshed ladder.

#### Immediate tranche: portal capability restoration

Portal-bearing levels are 954/1,700 of Corpus 2 and hold 551/725 production misses plus 464/604 misses without an isolated T1 winner; median isolated `solverCount` is 0 versus 8 portal-free. Resolve the four portal carve-outs before small repricing or new propagation for the same population. Test restorations independently under matched work.

1. **Must-cross neighbour-budget propagation.** Portal derivation is closed and the shadow helper's post-August dense-index drift is repaired. **Next:** corrected reference-labelled portal branch set with zero alive false rejects, then frozen matched-work A/B on the deterministic 530-level portal+must-cross population; enumerate gains/losses and keep published regression green. See [`evidence hardening`](../reports/2026-09-09-portal-restoration-evidence-hardening-001.md).
2. **Portal-aware beam coarse-state merge.** `portalJumps` + `lastWasPortalJump` capture counted length/transient state but not which portal pairs were consumed. **Next:** measure used-pair identity aliasing under that proposed key on a prespecified portal observer population. Use the accumulated validated portal hint prefixes as a positive-oracle screen across diverse known solution basins, not only one nominated witness. If aliasing is negligible, test the count/transient tuple; if material, preserve exact used-pair identity with a schema-safe signature. Then fixed-work A/B against current no-portal-merge control, reporting gains/losses and specialist retention. See [`beam preflight`](../reports/2026-09-09-portal-beam-state-identity-preflight-001.md).
3. **Connectivity volume check.** Ordinary portal derivation and first screen are closed: 266,320 valid paths / 21.8M prefixes, zero rejects, with live activation. **Next:** matched-work A/B on the deterministic 954 portal levels. Keep the false-goal mirror separate until a triggerable-endpoint differential loses zero valid endpoints. Reuse diverse validated hint prefixes as an additional sound alive-state regression surface. See [`evidence hardening`](../reports/2026-09-09-portal-restoration-evidence-hardening-001.md).
4. **Same-parity portal parity prune/gate.** Derivation is closed; only 21/954 portal levels have zero twist pairs. **Next:** bounded implementation plus unit/differential/published-regression coverage, including zero rejection of representative known-live portal prefixes, not a standalone solve-rate campaign.

Primary evidence: [`portal catalog`](../reports/2026-09-09-portal-carveout-and-additive-tier-solve-rate-catalog-001.md), [`evidence hardening`](../reports/2026-09-09-portal-restoration-evidence-hardening-001.md), [`beam preflight`](../reports/2026-09-09-portal-beam-state-identity-preflight-001.md).

After material restorations settle, repair the two-stage lifecycle instantiation projection before refreshing production/capability telemetry; then follow the evidence-hardening refresh contract before interpreting the triple-overlap cohort or repricing the ladder. The current projection can falsely mark `guidance-goal-distance-retry` and `late-repair-multiseed-retry` as mechanically ineligible; see [`telemetry gap`](../reports/2026-09-09-stage-lifecycle-instantiation-projection-gap-001.md). Do not carry forward the old 975/1,700 attribution.

#### 2A. Production repricing / promotion closeout

Independent decisions; a blocked candidate does not idle the workstream.

1. **Goal-attraction-disabled retry fresh work pool.** Development +1/-0, random confirmation null, stage starved on 605/725 misses. **Next:** confirmation 002 on an independent starvation cohort; close/demote if real participation still yields no gains. See [`preflight`](../reports/2026-09-05-goal-attraction-disabled-retry-fresh-work-pool-confirmation-002-preflight.md).
2. **Repair late-probe retry `7 → 6` seeds.** Seed 7 adds no reached-level best result; seed 6 is load-bearing. **Next:** frozen population-scale fixed-work confirmation requiring zero solve loss, material saving, and no seed-7-exclusive rescue. See [`preflight`](../reports/2026-09-05-repair-late-probe-six-seed-confirmation-preflight.md).
3. **Admissible-order retry fraction `1.0 → 0.18`.** Development retained 12/76; production A/B was non-informative because target-stage work was zero. **Next:** matched-work test with nonzero target-stage work frozen as a participation requirement. Production stays `1.0`. See [`confirmation 006`](../reports/2026-09-05-admissible-order-non-default-retry-repricing-confirmation-006.md).

Do not bundle these causal questions.

#### 2B. Broader scheduler / allocation construction

After portal restoration and 2A, refresh the production ladder/capability map. Then pursue residual/tranche pricing, simple static routing/order, protected complementary capability, and richer dynamic policies only if simple ones leave held-out headroom.

- **Flag-inert dispatch/full-population repricing.** Two retry tiers currently spend 11.8% of corpus `workSpent` toggling flags inert on portals; top three tiers consume 35.8% of work for 21 wins. Portal restoration changes that meaning, so reprice only after refresh, under equal total work. See [`portal catalog`](../reports/2026-09-09-portal-carveout-and-additive-tier-solve-rate-catalog-001.md).
- **Resumable portfolio tranche.** Static portfolio one-shot stays closed; 3/4 losses were already-present beams capped ~2–12% short. Test portfolio-18 first pass plus same-policy continuation inside 67M; make exact continuation correct at widths 2000/5000 first. See [`salvage preflight`](../reports/2026-09-05-static-portfolio-resumable-tranche-salvage-preflight.md).
- **Priced residual lane.** Recompute the old 122-miss isolated-winner residue after restoration/2A; separate missing exposure from failed exposure and require explicit total work, specialist retention, and production-exclusive gains. See [`handoff`](../reports/2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md).

### 2. Workstream 1: automatic solver action selection

**State:** active for parallel analysis; production routing changes remain downstream of portal restoration and WS2 allocation semantics.

Existing capability, lifecycle, provenance, profile, variant, census, trace and accepted-path evidence may be mined while experiments run. Promote only held-out/replicated signals.

#### Existing hint/provenance evidence tranche

The accumulated hint store is an active WS1 evidence source, not merely a solution cache. Treat it simultaneously as:

- a **solution-space atlas** of accepted paths and structural basins;
- a **sound positive oracle**, because every referee-validated prefix is a known-live state and its next path step is known viable;
- a **longitudinal natural-experiment log**, because provenance records producer, technique/config, version, work/search context, modality and rediscovery history.

Provenance evidence must be read on orthogonal axes. Producer **origin** (Pathfinder solver, variant replay, external solver, human/witness, etc.) is distinct from overlapping **facets** (isolated, randomized, retry-tier, hint-guided, exhaustive, etc.) and from strict/narrow production-capability **admissibility**. See [`hint/provenance evidence-layer upgrade`](../reports/2026-09-09-hint-provenance-evidence-layer-upgrade-001.md).

Before spending new solver compute on an action-selection or representation question, exhaust the relevant local/replay joins in this order:

1. run the corpus-wide provenance evidence/dedup audit and inspect any true duplicate-event residue;
2. characterize available structural solution basins, producer origins, modality facets and independence strata rather than selecting the first stored hint;
3. for a current miss, use real search observation/replay to locate the first point where **all known-live solution basins** are lost, then classify that loss as exposure/allocation, score/search-policy, prune/state-merge/representation, or other reasoning failure;
4. cross representative solution basins with relevant technique/config policies using existing divergence/rank/survival machinery; a policy that likes but never discovers a basin suggests exposure/search, while rejection of a known-live state is a representation/reasoning counterexample;
5. join lifecycle/census exposure to basin provenance so `exposed-and-failed` is distinguishable from `not exposed`, and so techniques solving the same level through different basins can count as genuine specialist complementarity;
6. use diverse known-live prefixes as a cheap positive-oracle regression surface for portal coarse-state merging, parity/connectivity and other pruning/representation changes;
7. build an origin/facet-stratified Corpus-2 solution-profile view and measure solution-basin complementarity, decision entropy/forced-choice depth, structural-basin temporal stability and marginal novelty yield by producer/config;
8. join variant-parent replay paths to production/census outcomes to distinguish search-fragile parents from robust-hard neighborhoods;
9. weight repeated agreement by dependence: cross-origin/cross-family agreement is stronger than many same-config reruns, while neither proves necessity absent exhaustive evidence.

Existing path-aware tools including `collect-known-solution-prefix-survival.mjs`, `hint-divergence.mjs`, `winning-path-analysis.mjs`, `witness-rank-diagnostic.mjs`, `repair-elite-path-dump.mjs` and `offline-replay-harness.mjs` should be reused/extended before new frameworks are invented. Audit first-hint/single-witness defaults where they discard the now-rich multi-path store.

These remain offline labels and diagnostics. Saved solution paths, provenance axes, profiles, family identity and historical winner labels may not be read directly by production policy for the same level.

Closed selector residues stay closed: the 35-row cohort is reconciled; multi-portal repair-over-beam reduced to two missing-exposure rows after a 0-gain/2-loss A/B; clockwise `perimeterSweep` disappears under matched attribution.

The current high-risk cohort is 396 intersection-heavy + must-cross-heavy + multi-portal levels, 118/396 solved. Portal carve-outs are the first causal explanation to resolve. This cohort is 74.7% of the 530 portal+must-cross population and contains 278/337 (82.5%) of its misses plus 242/288 (84.0%) of its misses without an isolated T1 winner.

**Next:** cheap existing-data/replay joins may proceed, including the hint/provenance tranche above, but freeze new propagation implementation. After portal restoration, refresh lifecycle/capability evidence inside the triple-overlap cohort and classify remaining informative misses as allocation/exposure, search-policy, or reasoning/representation. Build observer-only joint propagation only for a recurring reasoning family surviving that separation. See [`handoff`](../reports/2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md).

## Active workstreams

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 1 | Automatic action selection | **ACTIVE / PARALLEL ANALYSIS** | Mine existing evidence and known-live basin replay; after portal refresh classify residual failure roles before any new routing/propagation. |
| 2 | Fixed-work scheduler repricing | **ACTIVE / FIRST PRIORITY** | Complete the portal restoration tranche, close 2A, refresh ladder/capability boundary, then resume 2B. |
| 6 | Repair reachability/reconstructability | **SUPPORTING / NO CURRENT QUESTION** | Reopen only with cheaper labelled cases or materially new reconstruction evidence. |
| 7 | Architectural speed/execution substrate | **SUPPORTING / NO CURRENT CANDIDATE** | Reopen only for a materially different mechanism or newly measured hotspot. |

## Promoted/completed workstreams

| ID | Workstream | State | Reopen condition |
|---:|---|---|
| 3 | Generalization/holdout discipline | **METHOD COMPLETE / SUPPORTING** | Concrete methodological failure. |
| 8 | Cheap isolated capability missed by production | **SUBSUMED BY WS1** | Treat isolated winners as action-selection evidence, not entitlement to permanent tail work. |

## Closed negative workstreams

| ID | Workstream | State | Reopen condition |
|---:|---|---|
| 0 | Restart/randomization + learned-failure search | **CLOSED IN TESTED FORMS** | Materially new restart-by-work/population evidence or new cheap sound failure certificate. |
| 4 | Beam retention at extinction boundaries | **CLOSED IN TESTED QUOTA/BUCKETING FORM** | Independent evidence for a materially different bounded retention mechanism. |

## Deferred / on-demand

| ID | Workstream | State | Next gate |
|---:|---|---|
| 5 | Exact/reference-model program | **ON DEMAND / INTEGRITY GATE SATISFIED** | Reuse the 12 retained exact solutions as counterexamples; no broad new CP-SAT compute or production CP-SAT without a new prespecified holdout question. See [`CP-SAT regeneration`](../reports/2026-09-08-cpsat-rescue-cohort-regeneration-and-selector-001.md). |

## Standing research rules

- Use `workSpent` for cross-technique allocation; raw nodes are within-technique diagnostics.
- New actions/configurations expand the menu, not the default total budget.
- Level-blindness is not generalization; confirmation strength scales with selection/tuning pressure.
- Clear negatives close tested forms absent materially new evidence.
- Hold out independent units, including whole variant parents/families where applicable.
- Reverify fragile capability support after census refresh; same-family redundancy is not cross-family redundancy.
- Scheduler/repricing work must audit rare/specialist retention, not only aggregate solves/work.
- Nominal stage reach is not participation; require nonzero target-stage work for late-stage repricing.
- Portal restoration is WS2's immediate tranche and precedes ladder repricing and new joint-propagation implementation; remeasure production afterward.
- Before new compute on a hinted miss, characterize available basins, find first loss of all known-live basins, classify the loss, then choose the smallest remaining causal test.
- A validated hint prefix is sound positive reachability evidence, not a proof that alternative branches are dead. Use it to falsify false rejects/unsafe merges, never as a negative oracle.
- Provenance capability claims must separate producer origin, overlapping run/search facets and capability admissibility. Only actual Pathfinder solver evidence can establish production cold capability.
- Repeated provenance is evidence unless it is the same discovery event recorded twice; never dedup merely because two finds share a path/config.
- Raw provenance-event count is not independence count. Preserve technique/family/origin/temporal dependence when using rediscovery as corroboration.
- If a GHA candidate is blocked, traverse independent portal gates, 2A candidates, WS1 local analysis, WS5 bounded local analysis, specialist docs, and deferred questions.
- Reconcile old open questions against newer evidence before new compute.
- Prefer existing evidence and the smallest value-of-information test.

## Cheap evidence routing

- prior research: `node scripts/research-status-index.mjs --compact --query=<term>`;
- existing tools: `node scripts/tooling-census.mjs --compact --query=<term>`;
- research assets/joins: `node scripts/research-asset-query.mjs --query=<term>`;
- corpus shape: `node scripts/corpus-query.mjs --corpus=stress2`;
- hint/provenance axes + dedup audit: `node scripts/run-bundled.mjs scripts/stress/hint-provenance-evidence-report.mjs -- --corpus=all`.

Use [`solver-research-data-assets.md`](solver-research-data-assets.md) for evidence-topology guidance and [`solver-research-post-naming-resumption.md`](solver-research-post-naming-resumption.md) only to translate frozen pre-cleanup evidence.

## Closed-form lookup

Search named mechanisms through `research-status-index --compact`; open matched reports or frozen snapshots for chronology.

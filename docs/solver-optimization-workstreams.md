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
2. **Portal-aware beam coarse-state merge.** `portalJumps` + `lastWasPortalJump` capture counted length/transient state but not which portal pairs were consumed. Aliasing under that proposed key is measured **material** (1.7% of merge-candidate groups, 2.2% of grouped candidates, 80/80 sampled portal levels) — see [`aliasing measurement`](../reports/2026-09-09-portal-beam-used-pair-aliasing-measurement-001.md). **Next:** implement a pair-aware coarse-merge key preserving exact used-pair identity (schema-safe signature, not a fixed-width bitmask), then fixed-work A/B against current no-portal-merge control, reporting gains/losses and specialist retention. See [`beam preflight`](../reports/2026-09-09-portal-beam-state-identity-preflight-001.md).
3. **Connectivity volume check.** Ordinary portal derivation and first screen are closed: 266,320 valid paths / 21.8M prefixes, zero rejects, with live activation. Removed the blanket carve-out behind a new opt-in `PRUNE_CONNECTIVITY_VOLUME_PORTAL` flag; correctness gate re-confirmed on shipped code (0 violations, all 3 corpora, `scripts/stress/connectivity-volume-portal-soundness-check.mjs`). **Next:** dispatch the frozen matched-work A/B on the deterministic 954 portal levels (population/envelope/acceptance rule frozen in [`preflight`](../reports/2026-09-09-connectivity-volume-portal-ab-001-preflight.md)). Keep the false-goal mirror separate (untouched) until a triggerable-endpoint differential loses zero valid endpoints. See [`evidence hardening`](../reports/2026-09-09-portal-restoration-evidence-hardening-001.md).
4. **Same-parity portal parity prune/gate.** **Done (2026-09-09).** Ordinary `PRUNE_PARITY` and `getActiveGates`'s gate-feasibility filter now apply unweakened on the 21/954 portal levels with zero twist pairs (`prep.parityPortalDistMaps.length === 0`), reusing the same invariant `isParityCompatibleEndpoint` already shipped for false-goal endpoints. Unit coverage (same-parity vs. twist, both PRUNE_PARITY and getActiveGates) plus a dedicated stored-path differential (`scripts/stress/same-parity-portal-soundness-check.mjs`, 0 violations across all 3 corpora) and published-corpus regression (160/160, no regressions) are all clean. No standalone solve-rate campaign was run (not warranted for 21 levels, per plan).

Primary evidence: [`portal catalog`](../reports/2026-09-09-portal-carveout-and-additive-tier-solve-rate-catalog-001.md), [`evidence hardening`](../reports/2026-09-09-portal-restoration-evidence-hardening-001.md), [`beam preflight`](../reports/2026-09-09-portal-beam-state-identity-preflight-001.md).

The two-stage lifecycle instantiation projection gap is repaired: `guidance-goal-distance-retry` and `late-repair-multiseed-retry` now report correct `mechanicallyEligible`/`instantiated` telemetry (see [`telemetry gap`](../reports/2026-09-09-stage-lifecycle-instantiation-projection-gap-001.md), closed). After material restorations settle, follow the evidence-hardening refresh contract before interpreting the triple-overlap cohort or repricing the ladder. Do not carry forward the old 975/1,700 attribution.

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

Existing capability, lifecycle, provenance, profile, variant, census, and trace evidence may be mined while experiments run. Promote only held-out/replicated signals.

Closed selector residues stay closed: the 35-row cohort is reconciled; multi-portal repair-over-beam reduced to two missing-exposure rows after a 0-gain/2-loss A/B; clockwise `perimeterSweep` disappears under matched attribution.

The current high-risk cohort is 396 intersection-heavy + must-cross-heavy + multi-portal levels, 118/396 solved. Portal carve-outs are the first causal explanation to resolve. This cohort is 74.7% of the 530 portal+must-cross population and contains 278/337 (82.5%) of its misses plus 242/288 (84.0%) of its misses without an isolated T1 winner.

**Next:** cheap existing-data joins may proceed, but freeze new propagation implementation. After portal restoration, refresh lifecycle/capability evidence inside the triple-overlap cohort and classify remaining informative misses as allocation/exposure, search-policy, or reasoning/representation. Build observer-only joint propagation only for a recurring reasoning family surviving that separation. See [`handoff`](../reports/2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md).

## Active workstreams

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 1 | Automatic action selection | **ACTIVE / PARALLEL ANALYSIS** | Mine existing evidence; after portal refresh classify residual failure roles before any new routing/propagation. |
| 2 | Fixed-work scheduler repricing | **ACTIVE / FIRST PRIORITY** | Complete the portal restoration tranche, close 2A, refresh ladder/capability boundary, then resume 2B. |
| 6 | Repair reachability/reconstructability | **SUPPORTING / NO CURRENT QUESTION** | Reopen only with cheaper labelled cases or materially new reconstruction evidence. |
| 7 | Architectural speed/execution substrate | **SUPPORTING / NO CURRENT CANDIDATE** | Reopen only for a materially different mechanism or newly measured hotspot. |

## Promoted/completed workstreams

| ID | Workstream | State | Reopen condition |
|---:|---|---|---|
| 3 | Generalization/holdout discipline | **METHOD COMPLETE / SUPPORTING** | Concrete methodological failure. |
| 8 | Cheap isolated capability missed by production | **SUBSUMED BY WS1** | Treat isolated winners as action-selection evidence, not entitlement to permanent tail work. |

## Closed negative workstreams

| ID | Workstream | State | Reopen condition |
|---:|---|---|---|
| 0 | Restart/randomization + learned-failure search | **CLOSED IN TESTED FORMS** | Materially new restart-by-work/population evidence or new cheap sound failure certificate. |
| 4 | Beam retention at extinction boundaries | **CLOSED IN TESTED QUOTA/BUCKETING FORM** | Independent evidence for a materially different bounded retention mechanism. |

## Deferred / on-demand

| ID | Workstream | State | Next gate |
|---:|---|---|---|
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
- If a GHA candidate is blocked, traverse independent portal gates, 2A candidates, WS1 local analysis, WS5 bounded local analysis, specialist docs, and deferred questions.
- Reconcile old open questions against newer evidence before new compute.
- Prefer existing evidence and the smallest value-of-information test.

## Cheap evidence routing

- prior research: `node scripts/research-status-index.mjs --compact --query=<term>`;
- existing tools: `node scripts/tooling-census.mjs --compact --query=<term>`;
- research assets/joins: `node scripts/research-asset-query.mjs --query=<term>`;
- corpus shape: `node scripts/corpus-query.mjs --corpus=stress2`.

Use [`solver-research-data-assets.md`](solver-research-data-assets.md) for evidence-topology guidance and [`solver-research-post-naming-resumption.md`](solver-research-post-naming-resumption.md) only to translate frozen pre-cleanup evidence.

## Closed-form lookup

Search named mechanisms through `research-status-index --compact`; open matched reports or frozen snapshots for chronology.

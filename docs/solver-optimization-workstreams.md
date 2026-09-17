<!-- agent-context-budget: warn=10500 max=14000 -->
# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, state, and next gates.
> **Reconciled:** 2026-09-17.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness/generalization.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md) · Scheduling: [`solver-scheduling-policy.md`](solver-scheduling-policy.md) · Evidence: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md) · Capability memory: [`solver-capability-memory.md`](solver-capability-memory.md) · Semantic gap map: [`solver-reasoning-capability-atlas.md`](solver-reasoning-capability-atlas.md) · Stop-condition taxonomy: [`solver-capability-gap-stop-condition-reconciliation.md`](solver-capability-gap-stop-condition-reconciliation.md).

Program lens: **capability composition** exposes/selects/allocates demonstrated capability; **capability acquisition** creates generic capability where none succeeds. Current emphasis: acquisition.

## Data-audit guardrail

Corpus 1 is not cross-generator transfer; Corpus 2 is a mixed development laboratory; residual/participant claims are population-conditional. Level-blindness constrains provenance, not specificity: a generic cold procedure may derive exact board-specific facts, but may not consume historical identity/outcome/hint/capability-memory membership. A historical negative closes only the claim actually tested.

## Current execution priority

### 1. Workstream 2: residual capability + premise acquisition

**State:** ACTIVE/FIRST.

**Production boundary:** `35066677597`: **101/102 C1 + 1,169/1,700 C2**, residual 531; Classes 1-5 17/30/23/71/390. [`refresh`](../reports/2026-09-16-post-promotion-production-boundary-refresh-001.md)

**Class 1-3:** class 1 has no menu headroom; class 3 is exposed/dispatched, **dose-unverified not proven negative** -- reconciliation **concluded an evidence gap** (23 rows lack per-technique telemetry; needs new instrumentation). Must-turn-biased late repair is **CLOSED NEGATIVE**. [`lineage`](../reports/2026-09-14-historical-claim-lineage-audit-001.md) · [`dose gap`](../reports/2026-09-17-class3-dose-reconciliation-evidence-gap-001.md)

**Class 4: PROMOTED.** Dead-last portal coarse-state retry: 86 gains/0 losses/113 rows; default ON, merge closed. [`promotion`](../reports/2026-09-16-class4-113-allocation-promotion-001.md)

**Class 5:** the human-parent topological-fork preflight earned a microscope step (Lane F3, population now 14 pairs/7 parents), not production routing of raw phase. [`result`](../reports/2026-09-16-class5-controlled-topology-fork-pilot-result-001.md)

**Card-E:** 17/156 reconstructable-unexposed; both descriptors fail. [`result`](../reports/2026-09-16-card-e-sizing-and-state-selection-001.md)

**Completed post-topology hypotheses:** H1 closed its event vocabulary; DEAD-core population-limited; H3/H2 closed negative; behavioral quotient mixed/capability-memory only. [`matrix`](solver-capability-gap-stop-condition-reconciliation.md) H3's allocation-value gap is now POSITIVE: ascending length solves 16/17 Card-E rows at 20% budget. [`sim`](../reports/2026-09-17-h3-length-allocation-value-simulation-result-001.md)

### Premise-acquisition lanes

The queue is intentionally **not one long serial staircase**. Cheap retained-evidence/offline premise tests may run in parallel. Expensive production treatments remain gated behind a positive premise.

#### Lane A — separator / decomposition

1. **Separator/decomposition census — CONCLUDED / BOUNDED POSITIVE.** 121/390 (31.0%) of current Class-5 levels have a non-trivial, board-balanced, narrow (width<=4) static/mechanic-aware interface; portal-mediation is a clean negative. [`result`](../reports/2026-09-17-separator-decomposition-census-result-001.md)
2. **Next gate: interface-contract state size**, not another separator count -- does crossing history compress into a small boundary contract? Deferred onto Lane B's frozen population.

#### Lane B — fresh exact LIVE/DEAD asset + causal cores

1. **Fresh exact LIVE/DEAD sibling asset — HANDOFF GATE CLOSED.** 75-state DEAD population (0 alarms). Naive walk found zero LIVE (construction artifact); real `beamSearchFromGate` single-pick also found 0/98, but multi-pick (25 draws/frontier) found real LIVE (2/25, referee-verified) -- sampling was limiting. [`naive`](../reports/2026-09-17-fresh-dead-sibling-harvest-result-001.md) · [`prod-search`](../reports/2026-09-17-production-search-sibling-construction-result-001.md)
2. **DEAD-core size-1 — CLEAN NEGATIVE.** 215-query relax on 23 matched DEAD siblings (2 held-out LIVE): 0 cores, 0 alarms; size-2 unjustified. [`result`](../reports/2026-09-17-dead-core-spares-live-multi-pick-result-001.md)
3. Per-instance cores need not recur; only reusable descriptor claims need recurrence.

#### Lane C — solve-local typed knowledge reuse, CONCLUDED / PHASE 0 NEGATIVE

Phase 0 retained-evidence rejoin found no fact family earning a Phase 1 observer: fact class B's only real candidate is already shipped/audited production infra, not a new opportunity; class C is correctly unmemoized; class D found no opportunistic recurrence. No generic blackboard. [`result`](../reports/2026-09-17-lane-c-phase0-retained-evidence-rejoin-result-001.md)

#### Lane D — per-instance relational feasibility, CONCLUDED (all 3 questions)

See [`preflight`](solver-per-instance-relational-feasibility-preflight.md) for full status.

1. **Future-intersection commitment realizability — POSITIVE, REPLICATED AT SCALE.** B2: 2 matched DEAD 0-feasible vs 3 LIVE >=1 (107 queries). Multi-pick replication: 18 matched DEAD 0-feasible vs 2 LIVE >=1 (220 queries, 0 alarms). Consumer/economics untested. [`B2`](../reports/2026-09-17-lane-d-intersection-commitment-realizability-result-001.md) · [`replication`](../reports/2026-09-17-lane-d1-multi-pick-realizability-result-001.md)
2. **Constrained-event feasibility — NARROWED POSITIVE.** Zero-compute re-analysis of H1's 449 queries: DEAD states trivially 100% infeasible (no information); LIVE states show a real signal (13.8% infeasible; 16/23 mixed) -- a within-state commitment-viability signal, not a LIVE/DEAD classifier. [`result`](../reports/2026-09-17-lane-d-constrained-event-feasibility-result-001.md)
3. **Residual-interface commutativity — POSITIVE.** Native-referee splice-and-validate, 12,277 pairs: length-matched legal 46.6% pooled, 0% on flipper-bearing levels vs 69.9% portal-only / 44.8% mechanic-free -- but NOT explained by the segment touching a flipper (flipper-avoiding segments there are also 0%); real support is 3 levels, not 10. [`result`](../reports/2026-09-17-lane-d-residual-interface-commutativity-result-001.md) · [`breakdown+correction`](../reports/2026-09-17-lane-d3-segment-mechanic-attribution-result-001.md)

#### Lane E — dependency-defined causal revision

**CONCLUDED / NEGATIVE (both regimes).** CP-SAT bisection: B2's 2 pairs land 1-2 moves from the trajectory's end (degenerate); a fresh multi-pick population's 4 pairs diverge much earlier (7 moves rollback available) yet still land exactly at naive divergence. 6/6 pairs: no daylight between divergence and the causal point. [`B2`](../reports/2026-09-17-lane-e-repair-retreat-commitment-probe-result-001.md) · [`multi-pick`](../reports/2026-09-17-lane-e-multi-pick-bisection-result-001.md)

#### Lane F — bounded exposure / representation reconciliations

1. **Class-3 exact-action dose reconciliation — CONCLUDED / EVIDENCE GAP.** The cheap-evidence bar is not met (no committed per-technique work-tranche telemetry within the shared production budget). Stays dose-unverified until instrumentation is warranted; do not re-check without new telemetry. [`result`](../reports/2026-09-17-class3-dose-reconciliation-evidence-gap-001.md)
2. **Card-E quotient hypothesis discovery — CONCLUDED / MIXED (already run, reconciled).** `WS2-BEHAVIORAL-STATE-QUOTIENT` (Moonshot G): a prespecified obligation-count signature falsifies same-board on B2 (3/9 mix LIVE/DEAD) but survives permutation tests on Card-E (1/26 mixed vs nulls, p<=0.006) -- real, board-independent signal, not canonicalization-worthy alone; no classifier built. [`result`](../reports/2026-09-17-behavioral-state-quotient-probe-result-001.md)
3. **Topology per-instance microscope — CONCLUDED / QUALIFIED POSITIVE.** A cheap side descriptor matches the full winding-phase observer when the closest point is unique (8/8) but degrades when tied. Expansion (10->14 pairs, 4->8 discordant) refined this: all 9 discordant rows are tied (the untied-sound claim has zero decision-relevant coverage), but tied-discordant reliability is a real signal at n=9 (7/9, not the earlier 2/4 coin-flip). No consumer proposed. [`result 1`](../reports/2026-09-17-lane-f3-topology-cheap-side-descriptor-result-001.md) · [`result 2`](../reports/2026-09-17-lane-f3-topology-fork-population-expansion-result-001.md)

#### Lane G — independent search-object nursery

1. **Complete-path LNS cheapest falsifier — CONCLUDED / STAGE 1 POSITIVE, STAGE 2 METHOD-LIMITED.** Real solutions for one level cluster tightly (median Jaccard distance 0.11, 25 levels/2,235 pairs, zero new compute). No naive construction (3 attempts) built a fair candidate to test; converges on the same sibling-constructor gap as Lanes B/D1. No LNS earned. [`result`](../reports/2026-09-17-lane-g-complete-path-lns-falsifier-result-001.md)
2. **Backward/bidirectional abstraction stays deferred** until a sound signature emerges from A/D/topology; do not reopen full MITM.

### Queue ordering and parallelism

**All lanes A-G1 concluded** -- A/D1/F3 bounded/replicated/qualified positives, C population-limited negative, E negative (both regimes), F2 mixed, B core-negative/G1-stage2 needs multi-pick sampling, Class-3 an evidence gap. Only G2 remains deferred.

#### Post-mining Phase-3 handoff — ACTIVE CHEAP GATE

The first preregistered premise-map mining round and Phase-2 synthesis are complete. Reconciliation admitted P201-P206 as evidence/method premises but did **not** create a new solver-mechanism premise from the live-state anomaly. The earned next gate is a **read-only consumer-contract census** across the technically unrelated Lane A, D1, and F3 positives. Record producer, authority, independent unit, lifetime, smallest existing consumer, available/missing decision state, counterfactual action, abstention rule, and cost/displaced-work bound. [`handoff`](../reports/solver-premise-map-phase3/02-execution-handoff.md)

Pass the cross-cutting hypothesis only if at least two unrelated positives map to existing decision boundaries with the same contract fields and without a new subsystem, leaving a concrete soundness/participation/economics question. Fail it if each requires unrelated new architecture; keep those positives local. If the census passes locally for D1, the next descendant is a retained-evidence consumer/economics falsifier before any production exact-query implementation. No new solver sweep is authorized by this handoff.

**No production treatment is earned.**

**Dispositions:** promoted/closed/deferred treatment history is owned by [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) (per-strategy) and [`solver-future-work.md`](solver-future-work.md)'s closed-forms table (retry/quota/homotopy/connectivity-reuse shapes); current default-ON additions include the Class-4 dead-last portal coarse-state retry.

### 2. Workstream 1: automatic solver action selection

**State:** SUPPORTING / NO ACTIVE SELECTOR GATE.

Use capability/lifecycle/provenance/family/trace evidence to distinguish not-exposed from exposed-and-failed; confirmation must scale with selection pressure. The September structural-response ladder already ran through first divergence; do not restart earlier stages. A result from Lane D, E, or Card-E may reopen WS1 only if it yields a cheap current-input signal predicting which action should receive work -- never exact offline labels or historical family membership.

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Residual capability + premise acquisition | **ACTIVE / FIRST** | Phase-3 read-only consumer-contract census across Lane A/D1/F3; D1 consumer/economics falsifier only if earned |
| 1 | Automatic action selection | **SUPPORTING** | Reopen from a new legal current-input signal from the acquisition lanes |
| 6/7 | Repair reachability / speed | **SUPPORTING** | Lane E tests dependency-defined revision; fresh profiling gates speed work |
| 3 | Generalization | **METHOD COMPLETE** | Preserve independent units; scale confirmation with selection pressure |
| 8 | Isolated capability | **SUBSUMED BY WS1** | Isolated winners are selection evidence, not entitlement |
| 0/4 | Restart/randomization / beam retention | **CLOSED IN TESTED FORMS** | Reopen only for changed mechanism evidence |
| 5 | Exact/reference model | **ON DEMAND / BUSIER** | Truth/query service for Lanes B-E microscopes |

## Standing research rules

- Use `workSpent` across techniques; nodes are within-technique diagnostics. New actions/configs normally compete inside total work.
- IDs, historical outcomes, hints, family labels, stored exact answers, and capability-memory membership never become cold runtime routing inputs. Current-input exact derivation is legal if sound and economical.
- Separate **semantic premise** from **tested form** before inheriting a historical negative (taxonomy: [`solver-capability-gap-stop-condition-reconciliation.md`](solver-capability-gap-stop-condition-reconciliation.md)). Exact/offline evidence can falsify/nominate a production premise; it does not itself license a runtime mechanism.
- Reusable rows require matching protocol identity, not nominal stage reach; comparable-work negatives require exact-action dose evidence; timeout/errors are indeterminate. A single-level microscope may generate a premise, never a production exception; a board-specific derived fact may still be a legitimate output of a general procedure.
- Prefer the cheapest information-value test before implementation; hold out independent units (parent) and scale confirmation with selection pressure. For hard consumers, prove soundness -- a signature/correlation is not an impossibility certificate or state equivalence.
- A generic learned store/blackboard, production exact solver, CEGAR engine, LNS system, decomposition engine, or per-level compiler is **not** earned merely because its semantic gap is open: first positive premise -> one smallest consumer/prototype -> matched-work economics -> broader architecture only if needed. Reconcile old questions before new compute.

## Cheap evidence routing

Use `research-status-index --compact`, `tooling-census --compact`, `research-asset-query`, `corpus-query`, capability-memory/provenance helpers, audited family tooling, and retained exact-labelled artifacts before bespoke work. Chronology and measurements belong in dated reports; deferred descendants belong in [`solver-future-work.md`](solver-future-work.md).

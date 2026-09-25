# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, state, and next gates.
> **Reconciled:** 2026-09-24.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness/generalization.

Method: [`operating model`](solver-research-operating-model.md) · [`scheduling`](solver-scheduling-policy.md) · [`evidence`](solver-evaluation-evidence.md) · [`atlas`](solver-reasoning-capability-atlas.md) · [`invention`](solver-capability-invention-program.md) · [`stops`](solver-capability-gap-stop-condition-reconciliation.md).

## Data guardrail

C1 is not cross-generator transfer; C2 is a mixed development lab. Cold procedures may derive board facts, never historical outcomes/identity/hints. Negatives close only tested claims.

## Portfolio

**HARVEST** redeploys existing reasoning; **ACQUISITION** seeks missing operations. [Rules/register](solver-capability-invention-program.md): `data/stress/capability-invention-demand.json`.

Seed: **26 = 22 HARVEST / 1 EXTENSION / 3 UNKNOWN / 0 INVENTION**; not prevalence. Beam UNKNOWNs need freshness replay; R03147 needs independent-parent replication. [`census`](../reports/2026-09-20-capability-invention-retained-evidence-seed-census-001.md) · [`freshness`](../reports/2026-09-20-capability-invention-beam-freshness-preflight-001.md)
## Current execution priority

### Broad evidence refresh closed

The canonical stress refresh `35687363645` and technique census `35687337464` were dispatched from the same solver ref `39d14d49023aa09cb680053b975ef786eeae9b01` and are now scientifically complete. The census finished **120/120 shards**, **80,538 unique cells**, no missing/partial shards; its final red badge came only from the legacy post-combine hint-persistence rebase. The automatic harvester subsequently preserved the discoveries on current `main` at `afd744a195b2177a865670d3ec3afc00ed5352a7`. Do not rerun the census. [census closeout](../reports/2026-09-22-technique-census-broad-evidence-closeout-001.md)

The production refresh reproduces the prior solved sets exactly: **101/102 C1 + 1,169/1,700 C2, 0 gains / 0 losses in both corpora**. Compact failure response covers all 1,802 parents and 56,906 attempts, but same-stage failed solved controls largely match residual work/cap behavior, so generic compact response is exhausted as a broad discriminator. [production-side reconciliation](../reports/2026-09-22-broad-capability-refresh-failure-evidence-reconciliation-001.md)

The completed census sharpens the residual picture: full-depth T1 isolated techniques solve **83/532 current production misses (15.6%)**, with **47 singleton-supported** misses; **449** misses have no T1 solve. Conversely, **140/1,430 production-solved levels** have no T1 isolated solver at the 50M ceiling, so isolated coverage is not a production-safety oracle. The fresh run also records **332 flag/variant regressions**, reinforcing matched-work/control gates.

**Standing budget decision:** keep T1/T3/T4 at **50M nodes** and retain the bounded **60-level × 10M canonical-work EW1** tranche. The next information purchase is not a deeper census or more generic failure counts: use the fresh 1,802-parent denominator plus the 83/47 T1-rescuable cohorts and cheap isolated/zero-production-win identities to sample first operational divergence and legal offer/allocation mechanisms. The Hint/evidence consolidation has since closed the census standard-result/source-run provenance hardening that was still outstanding at the September 22 closeout; the only census-specific follow-up here is second-order materialization, not another broad acquisition.

### 1. Workstream 2: residual capability + premise acquisition

**State:** ACTIVE / two-front portfolio.

**Production boundary:** `35687363645`: **101/102 C1 + 1,169/1,700 C2**, C2 residual 531; exact solved-set churn versus `35066677597` is 0 gained / 0 lost in both corpora. Historical class counts remain 17/30/23/71/390 until a class-specific refresh changes them. [`fresh reconciliation`](../reports/2026-09-22-broad-capability-refresh-failure-evidence-reconciliation-001.md) · [`prior class refresh`](../reports/2026-09-16-post-promotion-production-boundary-refresh-001.md)

- **Classes 1-3:** class 1 has no menu headroom. **Class 3 RESOLVED:** 0/23 exposure-gap, 20/23 censored-dose, 3/23 exposed-and-negative; repair deadline and admissible-order reserve starvation have separate follow-ups. Must-turn-biased late repair is **CLOSED NEGATIVE**. [`resolution`](../reports/2026-09-20-class3-dose-exposure-resolved-result-001.md)
- **Class 4: PROMOTED.** Dead-last portal coarse-state retry: 86 gains/0 losses/113 rows; default ON. [`promotion`](../reports/2026-09-16-class4-113-allocation-promotion-001.md)
- **Class 5:** topology remains research-only; F3 population 14 pairs/7 parents. No raw-phase production routing. [`result`](../reports/2026-09-16-class5-controlled-topology-fork-pilot-result-001.md)
- **Card-E:** 17/156 reconstructable-unexposed; both tested descriptors fail. [`result`](../reports/2026-09-16-card-e-sizing-and-state-selection-001.md)
- **Post-topology:** H1 + DEAD-core size-1 closed; H3/H2 negative; behavioral quotient research-only. H3 allocation: ascending length solves 16/17 Card-E rows at 20% budget. [`matrix`](solver-capability-gap-stop-condition-reconciliation.md)

### Premise-acquisition lanes

#### Lane A — separator / decomposition

**TESTED FORM CLOSED NEGATIVE AT C2.** C2 is outcome-pure but representation-explosive: only 39/546 decisive rows (7.14%) repeat, below the frozen 20% compactness floor; C3/C4 only fragment further. Reopen only with a materially different compact interface. [`result`](../reports/2026-09-20-lane-a-c2-global-accounting-result-001.md)

#### Lane B — fresh exact LIVE/DEAD asset + causal cores

- **Sibling asset: HANDOFF CLOSED.** 75 DEAD/0 alarms; multi-pick found 2/25 referee-verified LIVE after naive/single-pick found none, exposing a sampling limitation. [`result`](../reports/2026-09-17-production-search-sibling-construction-result-001.md)
- **DEAD-core size-1: CLEAN NEGATIVE.** 215 queries on 23 matched DEAD plus 2 held-out LIVE: 0 cores, 0 alarms; size-2 unjustified. [`result`](../reports/2026-09-17-dead-core-spares-live-multi-pick-result-001.md)

#### Lane C — solve-local typed knowledge reuse

**PHASE-0 NEGATIVE.** No new fact family earned an observer: shipped knowledge is already covered and remaining candidates show no useful recurrence. Reopen on demonstrated recurring typed reason/state evidence. [`result`](../reports/2026-09-17-lane-c-phase0-retained-evidence-rejoin-result-001.md)

#### Lane D — per-instance relational feasibility

See [`preflight`](solver-per-instance-relational-feasibility-preflight.md).

1. **D1: premise positive, tested ranking consumer closed.** Independent production slice: 24 culls / 120 candidates / 1,960 queries / 8 parents, 84% definitive, **0 retention disagreements**. Reopen only at a materially different seam/population. [`result`](../reports/2026-09-18-d1-stage2-independent-pilot-capture-result-001.md)
2. **Constrained-event feasibility: NARROWED POSITIVE.** DEAD infeasibility is trivial; LIVE states show within-state commitment viability, not a LIVE/DEAD classifier. [`result`](../reports/2026-09-17-lane-d-constrained-event-feasibility-result-001.md)
3. **Residual-interface commutativity: POSITIVE, NARROW SUPPORT.** 12,277 splice pairs give 46.6% legal pooled support across only 3 levels; flipper-bearing support remains 0%. [`result`](../reports/2026-09-17-lane-d-residual-interface-commutativity-result-001.md)

#### Lane E — dependency-defined causal revision

**NEGATIVE.** Across 6 B2/multi-pick pairs, causal point equals naive divergence even when rollback room exists. [`result`](../reports/2026-09-17-lane-e-multi-pick-bisection-result-001.md)

#### Lane F — bounded exposure / representation

1. **Class-3 dose: RESOLVED.** 0/23 exposure-gap, 20/23 censored-dose, 3/23 exposed-and-negative. [`gap`](../reports/2026-09-17-class3-dose-reconciliation-evidence-gap-001.md) · [`resolution`](../reports/2026-09-20-class3-dose-exposure-resolved-result-001.md)
2. **Card-E quotient: MIXED.** Board-independent signal survives Card-E permutation tests but is insufficient for canonicalization/classifier. [`result`](../reports/2026-09-17-behavioral-state-quotient-probe-result-001.md)
3. **F3 topology: qualified positive, no consumer.** Untied descriptor is 8/8 but covers zero discordant decisions; tied discordant reliability 7/9. Reopen only with a reliable compact descriptor showing non-zero decision-bearing discordance. [`result`](../reports/2026-09-17-lane-f3-topology-fork-population-expansion-result-001.md)

#### Lane G — independent search-object nursery

**G1 complete-path LNS:** 0/45 at both 2M and 16M closes modest dose escalation. Reopen only with a fair full relaxed candidate from frozen real-search partials. [`dose`](../reports/2026-09-19-lane-g-real-frontier-completion-dose-pilot-result-001.md)

**G2 backward/bidirectional abstraction:** deferred until A/D/topology yields a compact sound signature; do not reopen full MITM.


#### Lane H — parity invariants

**PARALLEL OBSERVERS; production unchanged.** Run `WS2-PARITY-PHASE-DISTANCE` + `WS2-CHECKERBOARD-CAPACITY`; advance on incidence/soundness. Static portal decomposition is **CLOSED** beyond raw portal count on frozen contrasts. [preflight](solver-parity-phase-capacity-preflight.md) · [result](../reports/2026-09-21-response-guided-premise-nominations-001.md)

#### Lane I — small exact projections

**BC1 INCIDENCE POSITIVE; production unchanged.** `WS2-CUT-BALANCE-PROJECTION` Stage A is sound and the preregistered Stage-B screen finds BC1 conflicts on 22/24 eligible parents (105/263 connectivity-passing states). Next is the smallest production-inert safety/economics consumer with prospective later-disposition overlap; general k-cut/flow and sibling projection families stay unqueued. [program](solver-small-exact-projections-program.md) · [result](../reports/2026-09-21-cut-region-flow-stage0-audit-001.md)

### Post-mining premise-map handoff closeout

Frozen-map mining is complete; A/D1/F3 did not earn a shared runtime substrate. Dated reports own chronology. [`reconciliation`](../reports/solver-premise-map-consumer-contract/02-common-interface-reconciliation.md)

**Current WS2 gate:** HARVEST adds repair node-cap + matched-work A/B; reserve repricing stays separate. ACQUISITION runs beam freshness, then uses the fresh 1,802-parent compact failure-response corpus as the existing-data gate before expanding first-loss sampling or buying prefix/orientation traces. A candidate residual phenotype must differ from solved-parent failed-attempt controls at the parent level before it earns richer capture. BC1 advances to inert safety/economics. Forced-work prevalence is 25.33%, but expansion/pruning is already paid when forcedness is known; `WS2-FORCED-WORK-CAPTURE-ECONOMICS` next prices post-recognition singleton-chain consequences. [`fresh failure evidence`](../reports/2026-09-22-broad-capability-refresh-failure-evidence-reconciliation-001.md) · [`invention`](solver-capability-invention-program.md) · [`forced-work`](../reports/2026-09-21-forced-work-prevalence-result-001.md)
### 2. Workstream 1: automatic solver action selection

**State:** LATE-CONTINUATION SIGNAL POSITIVE / CONFIRMATION NEXT. Exact frozen model is positive across three distinct scoreable retained C2 attempt regimes: 6.93%, 6.99%, and 9.91% validation pre-winner-work capture with zero observed winner losses; C1 remains 0%. The fresh canonical refresh reproduces the signal without refit at **9.75%** combined pre-winner-work capture, **0 endangered winner levels**, 96.48% same-stage continuation, and 85.94% following censored work. This strengthens temporal/portfolio robustness but is still not independent-population confirmation. [`result`](../reports/2026-09-21-action-selection-legal-signal-retained-evidence-result-001.md) · [`fresh challenge`](../reports/2026-09-22-broad-capability-refresh-failure-evidence-reconciliation-001.md)

## Workstream state

| ID | Workstream | Execution state | Gate class | State / context | Next gate | Stable question ref |
|---:|---|---|---|---|---|---|
| 2 | Residual capability + premise acquisition | `active` | `implementation` | **HARVEST** | Add repair node-cap seam; preflight matched-work A/B | `WS2-REPAIR-DEADLINE-ALLOCATION` |
| 2A | Admissible-order reserve repricing | `supporting` | `design` | **EXPERIMENT DESIGN EARNED** | Precommit the smallest matched-total-work reserve-fraction A/B, including earlier-stage loss controls; no dispatch until that design is frozen | `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION` |
| 2I | Capability invention demand | `active` | `bounded-compute` | **ACQUISITION / COMPACT CONTRAST EXHAUSTED / T1 COHORTS READY** | Do not buy more generic compact telemetry. Use the fresh 1,802-parent denominator to freeze solved controls and mechanically sample first-loss / operational-divergence from the **83 T1-rescuable current misses**, especially the **47 singleton-supported** cases and cheap isolated/zero-production-win routing mismatches. Exact/reference annotation stays downstream of a discriminating operational locus. [fresh reconciliation](../reports/2026-09-22-broad-capability-refresh-failure-evidence-reconciliation-001.md) · [census closeout](../reports/2026-09-22-technique-census-broad-evidence-closeout-001.md) | `WS2-CAPABILITY-INVENTION-DEMAND` |
| 2P | Parity phase distance | `supporting` | `bounded-compute` | **PARALLEL OBSERVER** | Combined shadow, then incidence/soundness gate | `WS2-PARITY-PHASE-DISTANCE` |
| 2C | Checkerboard capacity | `supporting` | `bounded-compute` | **PARALLEL OBSERVER** | Combined shadow, then incidence/soundness gate | `WS2-CHECKERBOARD-CAPACITY` |
| 2R | Parity response signature | `on-demand` | `reopen-only` | **STATIC FORM CLOSED / REOPEN ONLY** | Reopen only on a materially different parity mechanism from success-path or prospective seam evidence | `WS2-PARITY-RESPONSE-SIGNATURE` |
| 2X | Small exact projections | `supporting` | `bounded-compute` | **BC1 CONSUMER EARNED** | Beam-hosted later-disposition shadow after ordinary hard-prune survival; record proof cost, work-at-proof, later reject/cull/descendant work, and valid/reference safety. No hot-path prune yet. [seam audit](../reports/2026-09-21-bc1-removable-work-economics-seam-audit-001.md) | `WS2-CUT-BALANCE-PROJECTION` |
| 2F | Forced-work capture economics | `supporting` | `bounded-compute` | **SEAM AUDIT COMPLETE / PHASE CENSUS NEXT** | 25.33% is a gross per-parent forced-work reservoir, not directly removable post-prune work. Rerun the frozen 64-parent probe with phase-level singleton/singleton->singleton telemetry, then price actual replay, retention/frontier bookkeeping and downstream consequences. No production contraction. [seam audit](../reports/2026-09-21-forced-work-capture-economics-seam-audit-001.md) | `WS2-FORCED-WORK-CAPTURE-ECONOMICS` |
| 1 | Automatic action selection | `supporting` | `bounded-compute` | **LATE-CONTINUATION SIGNAL / CONFIRMATION PREFLIGHTED** | Fresh random witness-first parents: Stage A = 24-parent development/opportunity canary (seed 2026092201); Stage B = separate untouched 96-parent confirmation (seed 2026092202) only if earned. Exact frozen model; no refit. [preflight](../reports/2026-09-22-ws1-independent-continuation-confirmation-preflight-001.md) | `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE` |
| 1A | Remaining-length allocation | `supporting` | `bounded-compute` | **INTRA-SOLVE BRIDGE HARNESS IMPLEMENTED / VALIDATION THEN STAGE A** | Frozen Stage A keeps the exact recovered index-depth sort key (`requiredLength-destroyIdx`) over the same elite-prefix candidate multiset and matched node budgets. Direct 20-level harness now emits canonical work + candidate attribution; trace also records true counted residual + portal jumps observationally because H3 used non-portal counted length. Validate harness, then dispatch without refit. [preflight](../reports/2026-09-22-ws1-remaining-length-intrasolve-bridge-preflight-001.md) · [semantics](../reports/2026-09-22-ws1-remaining-length-semantics-and-answerability-001.md) | `WS1-REMAINING-LENGTH-INTRA-SOLVE-BRIDGE` |
| 6/7 | Repair reachability / speed | `supporting` | `bounded-compute` | **SUPPORTING** | WS6 independent-parent interface replication / fresh speed profiling | `WS6-DEPENDENCY-CONDITIONED-REPAIR` |
| 3 | Generalization | `method-complete` | `method` | **METHOD COMPLETE** | Preserve independent units; scale confirmation with selection pressure | — |
| 8 | Isolated capability | `subsumed` | `subsumed` | **SUBSUMED BY WS1** | Isolated winners are selection evidence, not entitlement | — |
| 0/4 | Restart/randomization / beam retention | `closed` | `reopen-only` | **CLOSED IN TESTED FORMS** | Reopen only for changed-mechanism evidence | — |
| 5 | Exact/reference model | `on-demand` | `service` | **ON DEMAND / BUSIER** | Truth/query service for microscopes | — |

`Gate class` is the immediate operational route, not a claim about the question's scientific lifecycle or population-acquisition need. Use `existing-data` when retained evidence can directly answer the next discriminator, `instrument-only` when only new production-inert observation/persistence is needed, `bounded-compute` when fresh solver/reference execution is required, `design` or `implementation` for pre-execution work, `blocked` when the discriminator is not currently identifiable, and `reopen-only`/`method`/`subsumed`/`service` for non-execution lanes. Update this field whenever the immediate gate changes.

## Standing research rules

- Compare techniques with `workSpent`; nodes are within-technique diagnostics. New actions/configs compete inside total work.
- Cold routing cannot consume IDs, historical outcomes, hints, family labels, or stored answers. Current-input exact derivation is legal only if sound/economical.
- Separate semantic premise from tested form before transporting a negative. Offline/exact evidence may nominate/falsify a production premise; it cannot license runtime behavior.
- Match protocol identity, not nominal reach; comparable-work negatives require exact-action dose; timeout/errors are indeterminate. Single-level microscopes generate premises, never production exceptions.
- Prefer cheapest information-value tests. Hold out independent units; scale confirmation with selection pressure. Hard consumers require soundness; correlation/signatures are not proofs.
- Classify proposed solver work as **HARVEST / EXTENSION / INVENTION** before implementation; a new strategy flag or retry shell is not automatically a new capability.
- No generic blackboard/exact solver/CEGAR/LNS/decomposition engine/per-level compiler from an open gap: **positive premise -> smallest consumer -> matched-work economics -> broader architecture only if earned**.

## Cheap evidence routing

Prefer indexed retained evidence before bespoke work. Measurements go in dated reports; deferred forms/reopen triggers in [`solver-future-work.md`](solver-future-work.md).

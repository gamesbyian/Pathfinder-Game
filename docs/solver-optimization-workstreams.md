# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, state, and next gates.
> **Reconciled:** 2026-09-25.
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

### Supporting infrastructure — research execution efficiency

**State:** ACTIVE support program; scientific ordering remains owned by this queue.

The September 23–25 CI optimization cycle exposed reusable research-execution methods: exact-generation reuse, sparse input materialization, hermetic real-data fixtures, deterministic bookkeeping witnesses, callable semantic seams with retained executable smokes, and shadow-before-authority routing. The solver batch system already has mature weighted sharding, so generic shard-count tuning is not queued.

Current execution facts from the audit:
- maintained solver/evidence workflows still use floating `node-version: '20'`; primary level-blind and history-aware producers now record actual Node/platform/arch identity;
- production CI's exact dependency-tree reuse is not yet active in solver research workflows;
- full-tree checkout measured about 54 s on representative September-22 solver jobs, versus about 3 s in the first sparse targeted-planner rehearsal; setup-node was ~5 s and `npm ci` ~8 s;
- the first full-vs-sparse targeted-planner + real-canary rehearsal is semantically identical when the exact corpus and `logs/solver-stress-refresh/corpus2-runtime-telemetry.json` dependency are retained;
- canonical Hint persistence remains owned by `harvest-solver-evidence.yml`; source workflows must not recreate canonical writers.

Plan: [solver research execution efficiency](solver-research-execution-efficiency-plan.md). Starting evidence: [execution-topology census](../reports/2026-09-25-solver-research-execution-topology-starting-census-001.md).

Immediate infrastructure gate: finish exact-runtime parity, then activate only earned sparse/runtime changes for short orchestration jobs; exact dependency-tree reuse follows on a fixed runtime generation. Live WS2/WS1 harnesses remain the first search-vs-plumbing audit surface.

### 1. Workstream 2: residual capability + premise acquisition

**State:** ACTIVE / two-front portfolio.

**Production boundary:** `35687363645`: **101/102 C1 + 1,169/1,700 C2**, C2 residual 531; exact solved-set churn versus `35066677597` is 0 gained / 0 lost in both corpora. Historical class counts remain 17/30/23/71/390 until a class-specific refresh changes them. [`fresh reconciliation`](../reports/2026-09-22-broad-capability-refresh-failure-evidence-reconciliation-001.md) · [`prior class refresh`](../reports/2026-09-16-post-promotion-production-boundary-refresh-001.md)

- **Classes 1-3:** class 1 has no menu headroom. **Class 3 RESOLVED:** 0/23 exposure-gap, 20/23 censored-dose, 3/23 exposed-and-negative; repair deadline and admissible-order reserve starvation have separate follow-ups. Must-turn-biased late repair is **CLOSED NEGATIVE**. [`resolution`](../reports/2026-09-20-class3-dose-exposure-resolved-result-001.md)
- **Class 4: PROMOTED.** Dead-last portal coarse-state retry: 86 gains/0 losses/113 rows; default ON. [`promotion`](../reports/2026-09-16-class4-113-allocation-promotion-001.md)
- **Class 5:** topology remains research-only; F3 population 14 pairs/7 parents. No raw-phase production routing. [`result`](../reports/2026-09-16-class5-controlled-topology-fork-pilot-result-001.md)
- **Card-E:** 17/156 reconstructable-unexposed; both tested descriptors fail. [`result`](../reports/2026-09-16-card-e-sizing-and-state-selection-001.md)
- **Post-topology:** H1 + DEAD-core size-1 closed; H3/H2 negative; behavioral quotient research-only. H3 allocation: ascending length solves 16/17 Card-E rows at 20% budget. [`matrix`](solver-capability-gap-stop-condition-reconciliation.md)

### Premise-acquisition lanes

Frozen-map Lanes A–G are resolved in their tested forms and did not earn a shared runtime substrate. Preserve their specific reopen conditions rather than retesting:
- **A separator/decomposition:** closed negative at C2; representation repetition below the frozen compactness floor. [result](../reports/2026-09-20-lane-a-c2-global-accounting-result-001.md)
- **B exact LIVE/DEAD:** sibling handoff closed; DEAD-core size-1 clean negative, with the multi-pick sampling limitation retained. [sibling](../reports/2026-09-17-production-search-sibling-construction-result-001.md) · [core](../reports/2026-09-17-dead-core-spares-live-multi-pick-result-001.md)
- **C typed reuse:** phase-0 negative; reopen only on recurring typed reason/state evidence. [result](../reports/2026-09-17-lane-c-phase0-retained-evidence-rejoin-result-001.md)
- **D relational feasibility:** D1 premise positive but tested ranking consumer closed; constrained-event and commutativity results remain narrow, not production classifiers. [D1](../reports/2026-09-18-d1-stage2-independent-pilot-capture-result-001.md)
- **E causal revision:** negative. [result](../reports/2026-09-17-lane-e-multi-pick-bisection-result-001.md)
- **F exposure/representation:** class-3 dose resolved; Card-E mixed; F3 qualified-positive with no reliable decision-bearing consumer. [F3](../reports/2026-09-17-lane-f3-topology-fork-population-expansion-result-001.md)
- **G independent search objects:** complete-path LNS closed at 2M/16M; backward/bidirectional remains deferred pending a compact sound signature. [G1](../reports/2026-09-19-lane-g-real-frontier-completion-dose-pilot-result-001.md)
- **H parity:** phase-distance and checkerboard-capacity shadows are now closed negative; reopen only with materially different opportunity structure/formulation. [result](../reports/2026-09-25-parity-phase-checkerboard-capacity-combined-shadow-result-001.md)
- **I exact projections:** BC1 remains live only as a production-inert later-disposition safety/economics consumer. [seam audit](../reports/2026-09-21-bc1-removable-work-economics-seam-audit-001.md)

**Current WS2 gate:** repair node-cap A/B is positive (**7 gains / 0 losses** on the frozen 53-parent population) and advances to ordinary matched-work promotion confirmation. Admissible-order reserve fraction 0.35 is closed negative on the same population. Capability-invention exposure pilots/confirmation are positive for both target rows with zero observed solved-control regressions, but promotion remains a separate decision. Forced-work global compression and the remaining post-recognition numerators are closed negative; the 25.33% per-parent reservoir remains local-forcedness evidence, not removable global work. [repair/reserve result](../reports/2026-09-25-ws2-repair-deadline-admissible-order-matched-work-ab-result-001.md) · [capability confirmation](../reports/2026-09-25-capability-invention-demand-ew1-routing-exposure-confirmation-ab-result-001.md) · [forced-work result](../reports/2026-09-25-forced-work-capture-economics-per-parent-consumer-oracle-result-001.md)

### 2. Workstream 1: automatic solver action selection

**State:** LATE-CONTINUATION SIGNAL POSITIVE / CONFIRMATION NEXT. Exact frozen model is positive across three distinct scoreable retained C2 attempt regimes: 6.93%, 6.99%, and 9.91% validation pre-winner-work capture with zero observed winner losses; C1 remains 0%. The fresh canonical refresh reproduces the signal without refit at **9.75%** combined pre-winner-work capture, **0 endangered winner levels**, 96.48% same-stage continuation, and 85.94% following censored work. This strengthens temporal/portfolio robustness but is still not independent-population confirmation. [`result`](../reports/2026-09-21-action-selection-legal-signal-retained-evidence-result-001.md) · [`fresh challenge`](../reports/2026-09-22-broad-capability-refresh-failure-evidence-reconciliation-001.md)

## Workstream state

| ID | Workstream | Execution state | Gate class | State / context | Next gate | Stable question ref |
|---:|---|---|---|---|---|---|
| 2 | Residual capability + premise acquisition | `active` | `bounded-compute` | **A/B POSITIVE: CONFIRMATION NEXT** | GHA A/B on the frozen 53-parent population (treatment caps 21M/38M): **7 treatment-only gains, 0 losses** (`R00306`,`R01086`,`R02138`,`R02892`,`R03109`,`R03251`,`R03323`). Nomination evidence for the two node-cap constants; next gate is ordinary matched-work confirmation at production scale, not a production change. [result](../reports/2026-09-25-ws2-repair-deadline-admissible-order-matched-work-ab-result-001.md) · [preflight](../reports/2026-09-25-ws2-repair-deadline-allocation-node-cap-seam-and-ab-preflight-001.md) | `WS2-REPAIR-DEADLINE-ALLOCATION` |
| 2A | Admissible-order reserve repricing | `closed` | `reopen-only` | **A/B CLOSE NEGATIVE** | Same GHA A/B, same population, `admissibleOrderNodeReserveFractionOverride=0.35`: solved set byte-identical to control (same 30/53 levels, 0 gains, 0 losses), including on both rows the fraction was sized for. Closes 0.35 on this population; reopen only with a materially different premise, not a retest. [result](../reports/2026-09-25-ws2-repair-deadline-admissible-order-matched-work-ab-result-001.md) · [design](../reports/2026-09-25-ws2-admissible-order-reserve-repricing-matched-work-ab-design-001.md) | `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION` |
| 2I | Capability invention demand | `active` | `bounded-compute` | **PILOT + CONFIRMATION BOTH POSITIVE (2/2 target gains, 0/104 regressions)** | Both opt-in exposure flags (`STRATEGY_NEAR_HAMILTONIAN_INTERSECTION_HARVEST_MECHANIC_BUCKET_EXPOSURE` for R00118/CID-0027, `STRATEGY_VERY_HIGH_INT_WIDTH2000_HARVEST_KNOT_MUSTCROSS_EXPOSURE` for R02696/CID-0028) cleared both the 13-level pilot and a 40-level confirmation round cleanly: each target row moved from node-budget-limited unsolved (control) to referee-valid solved (treatment); combined 0 regressions across 52 solved-control levels per branch (26.5%/15.5% branch coverage), byte-identical control/treatment solved sets in every round. Not yet full-branch coverage; a promotion decision (`OPT_IN_FEATURES` default change) is a separate reasoned next step, not automatic from this evidence. Do not buy more generic compact telemetry: the separately-blocked full **83 T1-rescuable / 47 singleton-supported** cohort still needs the technique-census combine artifact (GHA-artifact-host network policy). [confirmation result](../reports/2026-09-25-capability-invention-demand-ew1-routing-exposure-confirmation-ab-result-001.md) · [pilot result](../reports/2026-09-25-capability-invention-demand-ew1-routing-exposure-pilot-ab-result-001.md) · [exposure design](../reports/2026-09-25-capability-invention-demand-ew1-routing-exposure-test-design-001.md) · [EW1 routing-gap sample](../reports/2026-09-25-capability-invention-demand-ew1-routing-gap-sample-001.md) · [census closeout](../reports/2026-09-22-technique-census-broad-evidence-closeout-001.md) | `WS2-CAPABILITY-INVENTION-DEMAND` |
| 2P | Parity phase distance | `closed` | `reopen-only` | **SHADOW CLOSED NEGATIVE** | 0.0187% incremental incidence across 226M real evaluations on the frozen 60-level EW1 population, resolution-ready (all 8 observability axes satisfied). Reopen only with a materially different opportunity structure, not a retry of this static form. [result](../reports/2026-09-25-parity-phase-checkerboard-capacity-combined-shadow-result-001.md) | `WS2-PARITY-PHASE-DISTANCE` |
| 2C | Checkerboard capacity | `closed` | `reopen-only` | **SHADOW CLOSED NEGATIVE** | 1.29% incremental incidence, 83.6% concentrated in one parent (4/18 eligible levels contribute anything), resolution-ready. Reopen only for a twist-bearing extension or a materially different formulation. [result](../reports/2026-09-25-parity-phase-checkerboard-capacity-combined-shadow-result-001.md) | `WS2-CHECKERBOARD-CAPACITY` |
| 2R | Parity response signature | `on-demand` | `reopen-only` | **STATIC FORM CLOSED / REOPEN ONLY** | Reopen only on a materially different parity mechanism from success-path or prospective seam evidence | `WS2-PARITY-RESPONSE-SIGNATURE` |
| 2X | Small exact projections | `supporting` | `bounded-compute` | **BC1 CONSUMER EARNED** | Beam-hosted later-disposition shadow after ordinary hard-prune survival; record proof cost, work-at-proof, later reject/cull/descendant work, and valid/reference safety. No hot-path prune yet. [seam audit](../reports/2026-09-21-bc1-removable-work-economics-seam-audit-001.md) | `WS2-CUT-BALANCE-PROJECTION` |
| 2F | Forced-work capture economics | `closed` | `reopen-only` | **BOTH REMAINING NUMERATORS CLOSED NEGATIVE** | Global singleton/singleton->singleton beam-phase collapse is rare (0.25%/0.20% of 5,502 resolved phases) with negligible discovery work (1,234/90.6M canonical work units): closed. 25.33% remains valid per-parent reservoir evidence, confirmed as local forcedness inside a still-branching beam, not global collapse. A same-day follow-up closed the two numerators the phase census left open by code trace + a cheap local rerun (no acquisition): per-parent post-recognition bookkeeping has no skippable operation (every downstream per-candidate step costs the same flat amount regardless of parent arity); earlier recognition via raw neighbor count is negative even for the cheapest case (79.4% of forced parents are free-to-know raw-degree-1 dead ends, but still need their one candidate's hard-pruning verdict evaluated). Reopen only for a materially different sound recognizer, not a retest of raw neighbor count or a re-run of either closed form. [consumer-oracle result](../reports/2026-09-25-forced-work-capture-economics-per-parent-consumer-oracle-result-001.md) · [phase census](../reports/2026-09-25-forced-work-capture-economics-phase-census-result-001.md) · [seam audit](../reports/2026-09-21-forced-work-capture-economics-seam-audit-001.md) | `WS2-FORCED-WORK-CAPTURE-ECONOMICS` |
| 1 | Automatic action selection | `supporting` | `design` | **NEW SINGLE-STAGE PLAN DESIGNED, NOT DISPATCHED** | Fresh 24-parent canary (seed 2026092201) found 0/5 scoreable validation-split levels with a nominated pre-winner boundary, below the precommitted >=3 floor; per the preflight's own stop rule, Stage B (96-parent confirmation, seed 2026092202) was not generated. A power analysis found that floor was under-sized relative to the historical 25%/68.8% capture/solve rates (E[nominated] at n=24 was ~1.24, ~81% chance of failing the >=3 floor even if the mechanism transfers exactly) -- the negative is consistent with a sizing artifact, not necessarily an absent mechanism. New single-stage plan: N=160 fresh parents (E[nominated]~8, ~98.6% power against pure sampling-variance false stops), prespecified confirmation-grade floor, replacing the two-stage structure. Retained-evidence positive result stands; not yet dispatched. [single-stage plan](../reports/2026-09-25-ws1-late-continuation-single-stage-acquisition-plan-001.md) · [Stage A result](../reports/2026-09-25-ws1-late-continuation-stage-a-opportunity-canary-result-001.md) · [preflight](../reports/2026-09-22-ws1-independent-continuation-confirmation-preflight-001.md) | `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE` |
| 1A | Remaining-length allocation | `closed` | `reopen-only` | **STAGE A BRIDGE-NEGATIVE** | Frozen 20-level direct A/B: 0 treatment-only solves, 0 control-only losses, treatment work 0.82% higher than control (not lower); mechanism genuinely exercised (1,617 triggers across 19/20 levels). Closes this tested intra-solve transport of the cross-row H3/Card-E effect; does not affect H3/Card-E itself. Reopen only for a materially different transport mechanism, not a retune of this ordering key/cap combination. [result](../reports/2026-09-25-ws1-remaining-length-intrasolve-bridge-stage-a-result-001.md) · [preflight](../reports/2026-09-22-ws1-remaining-length-intrasolve-bridge-preflight-001.md) | `WS1-REMAINING-LENGTH-INTRA-SOLVE-BRIDGE` |
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

# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, state, and next gates.
> **Reconciled:** 2026-09-26.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness/generalization.
> **Historical snapshot:** [pre-compaction queue](../reports/2026-09-25-solver-optimization-workstreams-precompaction-snapshot-001.md).

Method: [operating model](solver-research-operating-model.md) · [scheduling](solver-scheduling-policy.md) · [evidence](solver-evaluation-evidence.md) · [atlas](solver-reasoning-capability-atlas.md) · [invention](solver-capability-invention-program.md) · [future work](solver-future-work.md).

## Data guardrail

C1 is not cross-generator transfer; C2 is a mixed development lab. Cold procedures may derive board facts, never historical outcomes/identity/hints. Negatives close only tested claims.

## Current execution priority

### 1. WS2 repair-deadline allocation — CLOSED, PROMOTED

**State:** CONCLUDED-POSITIVE. Production constants raised.

The frozen 53-parent matched-work A/B produced **7 treatment-only gains and 0 losses**. A follow-up disjoint 150-level solved-control confirmation (180/180 combined, zero regressions) closed the regression-safety leg cleanly, and economics/concentration are already closed positive. Flipping the production constants (`EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET` 2M->21M, `EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET` 6M->38M) surfaced a real, previously-unchecked interaction: `EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP` (a 20-minute per-attempt wall-clock trip-wire, sized for the *old* 6M worst case) would need to cover a much larger worst case at the same conservative contended-throughput floor. Tracing the full resolution path (`disableExtraBudgetPasses: true`, set by both interactive production callers, zeroes `repairAdditiveBudgetMultiplier`, which makes the probe's own call-site gate false) showed the interactive path never runs this probe regardless of MS_CAP's value — only the batch/research path (the same population this promotion's evidence was measured against) can ever hit it. MS_CAP raised proportionally (1.2M->7.6M ms) to preserve the original safety margin, with no interactive-UX cost and no caller-differentiated cap needed.

Question: `WS2-REPAIR-DEADLINE-ALLOCATION` — closed.

Evidence: [promotion result](../reports/2026-09-26-ws2-repair-deadline-ms-cap-resolution-and-promotion-result-001.md) · [confirmation result](../reports/2026-09-26-ws2-repair-deadline-solved-control-confirmation-result-001.md) · [nomination result](../reports/2026-09-25-ws2-repair-deadline-admissible-order-matched-work-ab-result-001.md) · [preflight](../reports/2026-09-25-ws2-repair-deadline-allocation-node-cap-seam-and-ab-preflight-001.md).

### 2. WS2 capability-invention promotion — CLOSED, PROMOTED

**State:** CONCLUDED-POSITIVE. Both flags default-ON.

CID-0027 (`STRATEGY_NEAR_HAMILTONIAN_INTERSECTION_HARVEST_MECHANIC_BUCKET_EXPOSURE`) and CID-0028 (`STRATEGY_VERY_HIGH_INT_WIDTH2000_HARVEST_KNOT_MUSTCROSS_EXPOSURE`) cleared pilot + confirmation + a full residual-unsolved sweep of both branches:
- 7 referee-valid solves for CID-0027 (target `R00118` + 6 new), 3 for CID-0028 (target `R02696` + 2 new) — 10 total, 8 new;
- 0 regressions across every tested row in both branches (156/196 = 79.6% and 148/335 = 44.2% branch coverage; the untested CID-0028 remainder is exclusively already-solved regression-safety exposure, since every unsolved branch row was tested);
- promoted to production default-ON 2026-09-26 (removed from `OPT_IN_FEATURES`); both `attempts.ts` read sites also fixed from `cfg && cfg.FLAG === true` to `!cfg || cfg.FLAG === true` (the same silent-no-op gotcha every other default-on flag promotion in this ledger has needed).

Question: `WS2-CAPABILITY-INVENTION-DEMAND` — closed.

Evidence: [residual-unsolved result](../reports/2026-09-26-capability-invention-demand-ew1-residual-unsolved-upside-round-result-001.md) · [confirmation](../reports/2026-09-25-capability-invention-demand-ew1-routing-exposure-confirmation-ab-result-001.md) · [pilot](../reports/2026-09-25-capability-invention-demand-ew1-routing-exposure-pilot-ab-result-001.md).

### 3. WS1 automatic action selection — CLOSED, CONFIRMATION NEGATIVE

**State:** CONCLUDED-NEGATIVE.

The properly-powered N=160 single-stage confirmation (seed `2026092591`, dispatched exactly once from merged main after #2122/#2124 CI fixes) came back decisively negative: **0 nominated pre-winner boundaries across all 44 solved validation-split levels**, `preWinnerWork: 0` before any nomination filtering — not a near-miss of the `>=3` floor, a clean zero, at a sizing where ~11 nominations were expected if the historical mechanism transferred. This closes the fresh-acquisition confirmation line for the frozen 15-signature model in this tested form. The retained-evidence historical-population result (6.93-9.91% capture across three C2 regimes) is not overturned on its own population, but is not production-consumable without transfer this model does not show.

Question: `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE` — closed. Reopen only with a materially different signal/model design, not a retest of this exact frozen model at any size.

Evidence: [confirmation result](../reports/2026-09-26-ws1-late-continuation-single-stage-confirmation-result-001.md) · [plan](../reports/2026-09-25-ws1-late-continuation-single-stage-acquisition-plan-001.md) · [recovery](../reports/2026-09-25-ws1-precommitment-overlap-recovery-001.md) · [Stage A](../reports/2026-09-25-ws1-late-continuation-stage-a-opportunity-canary-result-001.md).

### 4. BC1 later-disposition shadow

**State:** SUPPORTING / bounded-compute.

BC1 remains live only as a production-inert later-disposition safety/economics consumer after ordinary hard-prune survival. Record proof cost, work-at-proof, later reject/cull/descendant work, and valid/reference safety. No hot-path prune yet.

Question: `WS2-CUT-BALANCE-PROJECTION`.

Evidence: [seam audit](../reports/2026-09-21-bc1-removable-work-economics-seam-audit-001.md).

### 5. WS6 repair reachability / speed

**State:** SUPPORTING.

Use independent-parent interface replication / fresh speed profiling only when it becomes the immediate queue gate.

Question: `WS6-DEPENDENCY-CONDITIONED-REPAIR`.

## Supporting infrastructure — research execution efficiency

Scientific priority remains owned by this queue.

Current facts:
- maintained research workflows use exact Node runtimes;
- parity-rehearsed scientific producers and deterministic helper/harvest/integrity workflows use 22.23.2;
- solver diagnostics remains on exact 20.20.2 pending diagnostics-specific cross-major parity;
- targeted-sweep planning uses sparse materialization plus exact dependency-tree reuse with safe `npm ci` fallback;
- canonical Hint persistence remains owned by `harvest-solver-evidence.yml`;
- live search-vs-plumbing audit found no accidental solver-as-fixture defect in generic targeted sweep or WS1 frozen scoring.

Next infrastructure gate:
- obtain real production hit/miss timing from a targeted dispatch;
- extend dependency-tree reuse only to short jobs where bootstrap is material;
- audit BC1/WS6 search-vs-plumbing only when either becomes immediate;
- do not optimize closed historical harnesses.

Plan: [execution efficiency](solver-research-execution-efficiency-plan.md) · [handoff](../reports/2026-09-25-research-execution-efficiency-session-handoff-001.md) · [topology census](../reports/2026-09-25-solver-research-execution-topology-starting-census-001.md).

## Cross-program convergence follow-through

The September 20–25 retrospective found several lessons not yet fully propagated across CI/research/evidence systems. They are now tracked in the [cross-program convergence backlog](cross-program-convergence-backlog.md), with a machine-readable quality contract.

Near-term order:
1. ~~finish #2122 / WS1 confirmation~~ — done 2026-09-26, concluded-negative;
2. ~~keep live WS2 gates moving~~ — repair-deadline allocation promoted 2026-09-26, closed; capability-invention already closed;
3. execute the highest-leverage convergence audits without creating a second scientific queue.

Backlog themes:
- research evidence cadence/claim ownership;
- semantic freshness/invalidation pilots;
- proof-owner / duplicate-proof census;
- derived-resource generation ownership;
- governance-check historical value;
- bounded phase-local hostile sampling;
- factual cost-of-knowing queryability;
- evidence-gated remaining CI structural work.

## Closed / reopen-only summary

These tested forms are closed and should not consume execution priority unless their named premise changes:
- admissible-order reserve fraction 0.35;
- forced-work global compression and remaining post-recognition numerators;
- parity phase-distance static form;
- checkerboard-capacity static form;
- parity response static form;
- remaining-length intra-solve bridge;
- separator/decomposition frozen forms;
- typed reuse phase-0;
- tested relational-feasibility ranking consumer;
- causal-revision form;
- complete-path LNS at tested doses;
- class-3 dose form.

Detailed closeout evidence and reopen conditions are preserved in the [pre-compaction queue snapshot](../reports/2026-09-25-solver-optimization-workstreams-precompaction-snapshot-001.md) and [solver future work](solver-future-work.md).

## Workstream state

| ID | Workstream | Execution state | Gate class | State / context | Next gate | Stable question ref |
|---:|---|---|---|---|---|---|
| 2 | Repair-deadline allocation | `closed` | `reopen-only` | PROMOTED 2026-09-26: 7 gains/0 losses nomination + 180/180 zero-regression confirmation both positive; MS_CAP interaction resolved (interactive path never runs the probe regardless of its value) | none; reopen only for a materially different dose/premise | `WS2-REPAIR-DEADLINE-ALLOCATION` |
| 2I | Capability invention | `closed` | `reopen-only` | PROMOTED 2026-09-26: both flags default-ON, 10 referee-valid solves (8 new), 0 regressions across every tested branch row | none; reopen only for a materially different exposure form | `WS2-CAPABILITY-INVENTION-DEMAND` |
| 1 | Automatic action selection | `closed` | `reopen-only` | CONCLUDED-NEGATIVE: N=160 confirmation found 0/44 nominated validation levels, well below the well-powered expectation | reopen only with a materially different signal/model design | `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE` |
| 2X | Small exact projections | `supporting` | `bounded-compute` | BC1 production-inert later-disposition economics/safety consumer | beam-hosted later-disposition shadow when immediate | `WS2-CUT-BALANCE-PROJECTION` |
| 2F | Forced-work capture economics | `closed` | `reopen-only` | tested global-compression/post-recognition forms closed; broader question identity retained | reopen only for a materially different sound recognizer | `WS2-FORCED-WORK-CAPTURE-ECONOMICS` |
| 2R | Parity response signature | `on-demand` | `reopen-only` | static parity form closed; dormant conditional lane retained for materially different mechanism evidence | reopen only on materially different parity opportunity structure | `WS2-PARITY-RESPONSE-SIGNATURE` |
| 6/7 | Repair reachability / speed | `supporting` | `bounded-compute` | independent-parent replication/speed support lane | replication/speed profiling when immediate | `WS6-DEPENDENCY-CONDITIONED-REPAIR` |
| 5 | Exact/reference service | `on-demand` | `service` | exact/reference truth service for microscopes | use only when a live discriminator requires it | — |
| 3 | Generalization method | `method-complete` | `method` | independent-unit / selection-pressure methodology established | preserve method in future confirmations | — |

All other tested forms are closed/reopen-only/subsumed. See the historical snapshot and future-work authority for exact reopen conditions.

## Queue-transition closure

Research-state changes are transactional across their owning authorities. If a result changes a row's `Execution state`, `Gate class`, `Next gate`, stable-question disposition, or a treatment's production/default disposition, reconcile every affected owner in the same change rather than treating the queue edit as sufficient.

At minimum, inspect the corresponding record in `solver-research-question-relations.json`, the dated result/closeout, `solver-opt-in-experiment-ledger.md` when promotion/default-OFF status changed, and `solver-future-work.md` when reopen/deferred routing changed. Also update or retire contract tests that intentionally encode the old state. Run the existing research authority/query contracts before calling the transition complete; do not add bespoke CI jobs for individual transitions.

## Standing research rules

- Compare techniques with `workSpent`; nodes are within-technique diagnostics.
- Cold routing cannot consume IDs, historical outcomes, hints, family labels, or stored answers.
- Separate semantic premise from tested form before transporting a negative.
- Match protocol identity, not nominal reach; timeout/errors are indeterminate.
- Single-level microscopes generate premises, never production exceptions.
- Prefer cheapest information-value tests and hold out independent units.
- Hard consumers require soundness; correlation/signatures are not proofs.
- Classify proposed solver work as **HARVEST / EXTENSION / INVENTION** before implementation.
- No generic engine from an open gap: **positive premise -> smallest consumer -> matched-work economics -> broader architecture only if earned**.
- Keep execution/infrastructure work subordinate to the live scientific queue.

## Cheap evidence routing

Prefer indexed retained evidence before bespoke acquisition. Measurements belong in dated reports; deferred forms and exact reopen triggers belong in [solver future work](solver-future-work.md).

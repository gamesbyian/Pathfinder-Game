# WS2 repair-deadline allocation: node-cap seam and matched-work A/B preflight 001

> **Status:** active
> **Last evidence:** 2026-09-20 — GHA run `35531721218` (frozen 53-parent shared acquisition: 23 Class-3 residual + 30 solved controls, `node_budget=50000000`), full compact-failure-response document durably persisted at `reports/stress/failure-evidence/targeted-sweep-runs/35531721218/compact-failure-response.json`. This report adds the implementation seam and the A/B design; it dispatches nothing new.
> **Decision:** the `earlyRepairSearchOrdinaryNodeBudgetOverride` / `earlyRepairSearchBiasedNodeBudgetOverride` SolveOpts seam is implemented and unit-tested. Predeclare a matched-total-work A/B over the SAME frozen 53-parent population, raising only the early-repair-search probe's own node caps (production defaults 2,000,000 ordinary / 6,000,000 biased) toward the frozen T1-isolated rescuer-cost distribution.
> **Remaining gate:** run the execution-family canary, then dispatch the predeclared A/B; do not change production defaults from this report alone.
> **Evidence role:** implementation + design, per `docs/solver-optimization-workstreams.md`'s WS2 gate ("Add repair node-cap seam; preflight matched-work A/B").
> **Research question:** `WS2-REPAIR-DEADLINE-ALLOCATION`
> **Gate class:** `implementation` (seam) -> `bounded-compute` (the predeclared A/B, not yet dispatched).

## Why this is earned

`reports/2026-09-20-class3-dose-exposure-resolved-result-001.md` and its companion
`reports/2026-09-20-ws2-failure-response-reconnaissance-stage-a-final-result-001.md` resolved the
2026-09-17 dose/exposure ambiguity on the frozen 53-parent shared acquisition: **0/23 Class-3 rows
are exposure-gapped**, **20/23 are censored-dose**, **3/23 are exposed-and-negative**. Of the 20
censored rows, 5 are the already-tracked `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION` mechanism
(uniform ~12.5M-node reserve ceiling, folded into that question). The remaining **16 rows are a
materially different, so-far-untracked mechanism**: the early-repair-search probe's own
per-attempt node cap (`EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET` = 2,000,000,
`EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET` = 6,000,000, `modules/solver/orchestration-early-repair.ts`)
truncates the exact known T1-isolated rescuer well below its own isolated solve cost.

That report explicitly nominated, but did not implement or dispatch, "a bounded, matched-work
allocation experiment for the repair-family per-attempt deadline... mirroring the reserve-starvation
A/B's own discipline" and flagged the implementation prerequisite: "add narrow experiment-only
SolveOpts for ordinary and biased early-repair node caps; keep them separate so the 2M ordinary and
6M biased calibrations cannot silently move together." `docs/solver-optimization-workstreams.md`
carries this as WS2's current HARVEST gate: "Add repair node-cap seam; preflight matched-work A/B."

## The 16 censored repair-family rows (existing evidence, no new acquisition)

Extracted directly from the two already-committed, durable artifacts this run produced —
`reports/stress/failure-evidence/class3-dose-expectations-2026-09-19.json` (T1-isolated rescuer
cost, derived without solver search) joined against
`reports/stress/failure-evidence/class3-dose-analysis-2026-09-20.json` (observed production
disposition) by `parentId` + `actionKey`. No new solver execution was needed to produce this table.

| Parent | Rescuer family | Isolated `nodesExpanded` |
|---|---|---:|
| R00306 | must-turn-biased | 20,823,229 |
| R02160 | must-turn-biased | 37,136,975 |
| R02561 | must-turn-biased | 38,656,658 |
| R02835 | must-turn-biased | 4,084,816 |
| R02844 | must-turn-biased | 27,959,034 |
| R01011 | standard | 37,210,562 |
| R01086 | standard | 2,190,036 |
| R01724 | standard | 20,436,729 |
| R02138 | standard | 14,583,047 |
| R02160 | standard | 13,806,334 |
| R02458 | standard | 1,730,495 |
| R02892 | standard | 5,503,860 |
| R02997 | standard | 36,458,318 |
| R03109 | standard | 12,710,452 |
| R03251 | standard | 10,547,738 |
| R03323 | standard | 349,380 |

(R02160 appears twice: the same residual parent has two distinct T1-isolated repair rescuers, one
in each family. 15 unique parents, 16 rescuer opportunities.)

Percentiles (n=11 standard, n=5 must-turn-biased — the must-turn-biased sample is small; treat its
high percentiles as coarse):

| Family | Production cap today | min | p50 | p75 | p90/max |
|---|---:|---:|---:|---:|---:|
| standard | 2,000,000 | 349,380 | 12,710,452 | 20,436,729 | 36,458,318 / 37,210,562 |
| must-turn-biased | 6,000,000 (2,100,024 floor at `MIN_SCALE`) | 4,084,816 | 27,959,034 | 37,136,975 | 38,656,658 / 38,656,658 |

## Implementation: the node-cap seam

Landed in this commit (see the diff this report accompanies):

- `modules/solver/orchestration-early-repair.ts`: exported `EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET`
  (previously private) and added two optional trailing parameters to `runEarlyRepairSearch`
  (`ordinaryNodeBudget`, `biasedNodeBudget`), each defaulting to its own production constant. The
  ordinary-tier assignment and the `biasedNodeBudgetForTier` closure now read these parameters
  instead of the module constants directly.
- `modules/solver/orchestration-contracts.ts`: added `earlyRepairSearchOrdinaryNodeBudgetOverride`
  and `earlyRepairSearchBiasedNodeBudgetOverride` to `SolveOpts`, matching the existing
  `earlyRepairSearchAdaptiveBiasedBadnessGateOverride`/`...MinScaleOverride` shape (dedicated
  top-level scalar, NOT an ablation flag, undefined preserves the production constant exactly).
  Deliberately two separate fields, never one shared override — the 2,000,000/6,000,000 values were
  independently calibrated against different evidence (see that file's header comment) and must stay
  independently movable.
- `modules/solver/orchestration.ts`: threads both overrides into the `runEarlyRepairSearch` call site
  the same way the existing badness-gate/min-scale overrides are threaded.
- `scripts/level-blind-capability-sweep.mjs`: added `--early-repair-search-ordinary-node-budget` and
  `--early-repair-search-biased-node-budget` CLI flags (same optional/omitted-means-production-default
  shape as the sibling `--early-repair-search-adaptive-*` flags), for level-blind A/B dispatch via
  `solver-level-blind-targeted-sweep.yml`.
- `modules/solver/orchestration-early-repair.test.ts`: 5 new regression tests — override changes the
  ordinary/biased cap, override still composes with `STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET`'s
  own scale, and undefined preserves each production constant exactly.

Verification: `npm run check:types`, `npm run check:types:tests`, targeted `vitest run
modules/solver/orchestration-early-repair.test.ts` (23/23), the broader orchestration suite
(`orchestration-core`, `orchestration-work-budget`, `orchestration-retry-tier-reserves`,
`orchestration-late-repair-retry`, `orchestration-main-search-reserves`: 103/103), `npm run
test:level-blind-capability-sweep-cli`, `npm run test:cli-option-contracts`, and the full `npm run
ci` gate — all green with zero production-default behavior change (every new field is
undefined-by-default and threads through unchanged when omitted).

## What the seam does not authorize

- No change to `EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET`/`EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET`
  themselves. Every production/interactive call site (no override passed) is byte-identical to
  before this change.
- No dispatch of the A/B below. The seam only makes the A/B possible without editing solver source
  between arms.

## Matched-work A/B design (predeclared, not dispatched)

Mirrors `reports/2026-09-20-admissible-order-reserve-starvation-probe-result-001.md`'s own
discipline: same frozen population both arms, same overall per-level node/work budget both arms
(the treatment only reallocates *within* the existing `mainSearchEarlyNodeBudget` shared pool — see
`orchestration-early-repair.ts`'s header comment on why the probe and the early main-search configs
already draw from one unprotected shared ceiling — it does not add new total budget), and explicit
earlier-stage/solved-control loss controls.

### Population

Reuse the existing frozen population file verbatim — **no new generation**:

`reports/stress/failure-evidence/ws2-class3-shared-acquisition-population-2026-09-20.json`

- `class3-residual` tranche: 23 ids (includes the 16 repair-family rows above, the 5
  admissible-order-reserve rows, and 2 exposed-and-negative-only rows not expected to move).
- `solved-controls` tranche: 30 ids — the earlier-stage/regression control population.
- Corpus: `data/stress/stress-levels-random.json`. Solver ref/protocol: same shared production
  protocol as the originating run (re-resolve at dispatch time; do not assume the 2026-09-20 sha is
  still current `main`).

### Arms

Both arms: `scripts/level-blind-capability-sweep.mjs --scheduler-mode`-equivalent production
defaults, `--node-budget=50000000`, derived `--work-budget=67000000` (matching the originating run's
own protocol), `--budget-ms` generous/non-binding, no baseline, no prime-winner, no attempt-cache
(level-blind, matching this tool's own invariant).

- **Control:** no `--early-repair-search-*-node-budget` flags (production defaults: 2,000,000
  ordinary / 6,000,000 biased, before `STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET`'s own
  live-evidence scale, unchanged).
- **Treatment:** `--early-repair-search-ordinary-node-budget=21000000
  --early-repair-search-biased-node-budget=38000000`.

### Predeclared cap sizing (fixed now, not fit to outcomes)

- **Ordinary: 21,000,000.** Covers the standard-family p75 (20,436,729) with a small margin, a ~10.5x
  increase over the 2,000,000 production default. Deliberately targets p75, not the 37.2M max: the
  max is a single n=11 sample point, and chasing it would size the treatment off one outlier rather
  than the recurring shape of the distribution.
- **Biased: 38,000,000.** Covers the must-turn-biased-family p75 (37,136,975) with a small margin —
  necessarily close to this family's own max (38,656,658) because n=5 is too small to separate a
  robust p75 from the tail. This is acknowledged up front as a smaller, less confident sample, not
  discovered after seeing results.
- Both values are picked **before** dispatch and must not be revised after seeing the A/B's own
  outcome. `STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET`'s live-evidence scale still applies
  on top of the treatment's biased cap exactly as it does on top of the production constant today
  (this seam does not touch that mechanism).

### Advance rule

Run the treatment and control arms on the full 53-parent population, then compare:

1. **Rescue count:** how many of the 16 repair-family censored rows now reach a real
   `exhausted`/`solved` outcome on that exact rescuer (not just a longer `deadline-truncated` run) —
   report per-row, not just an aggregate count.
2. **Earlier-stage/solved-control loss:** any of the 30 solved-control rows, or any currently-solved
   non-target row inside the 23-row residual tranche, that regresses to unsolved under the treatment.
   Per the reserve-starvation A/B's own bar, **the target is zero losses**; a nonzero loss requires
   forensic review (which stage lost its share of `mainSearchEarlyNodeBudget`, and whether a smaller
   cap would avoid it) before any promotion discussion — it does not automatically kill the treatment,
   but it is never waved through either.
3. **workSpent economics:** aggregate and per-row `workSpent` delta between arms on rows that don't
   change solved status, since the treatment is a pure reallocation within the same total budget, not
   free extra search.
4. **Concentration:** no single parent should account for most of the treatment's total added cost
   (mirrors this workstream's standing rule against one-off wins driving a portfolio decision).

A positive result here is nomination/allocation evidence for these two constants specifically, not
authorization to reopen the closed-negative broad 4x work-ladder economics question, and not a
production change by itself — the next gate after a clean positive is the ordinary promotion path
(matched-work confirmation at production scale, per this workstream's standing rules), the same path
`WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION` and `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION` are already on.

### Before dispatch

Per the operating model's "before expensive decision-bearing runs" checklist: run one representative
execution-family canary under the exact resolved treatment config (one repair-gated level, e.g.
R00306) verifying the override actually reaches `SolveOpts` and that `deadlineTruncated` no longer
fires below the raised cap, before committing to the full 53-parent matrix.

**Canary confirmation (2026-09-25):** ran `--corpus=data/stress/stress-levels-random.json --levels=pos:38
--node-budget=50000000 --work-budget=67000000 --early-repair-search-ordinary-node-budget=21000000
--early-repair-search-biased-node-budget=38000000` against R00306 (corpus position 38).
`effectiveConfig` confirms both overrides reached `SolveOpts`
(`earlyRepairSearchOrdinaryNodeBudgetOverride: 21000000`, `...BiasedNodeBudgetOverride: 38000000`);
the level solved (`deadlineTruncated: false`) with its ordinary-tier `early-repair-search` attempt
using `allocatedNodeCeiling: 21000000` (matching the raised cap) before falling through to a
successful retry. Canary passes. Given the observed ~235s single-level cost at this budget (and the
WS2-2A canary's ~450s at the same node/work scale), the full 53-level x 2-arm matrix (106 solves) is
dispatched via GHA (`solver-level-blind-targeted-sweep.yml`,
`node_cap_overrides=earlyRepairSearchOrdinaryNodeBudget=21000000,earlyRepairSearchBiasedNodeBudget=38000000`
for treatment), not locally — this revises this report's original local-run plan, made before real
per-level costs at this budget were observed.

## What this preflight does not authorize

- No dispatch of the A/B above — design only.
- No change to production defaults from this report or from the A/B's eventual result alone; a
  positive result still needs the ordinary matched-work confirmation/promotion path.
- No widening beyond these two constants (e.g. touching
  `EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE`/`_MIN_SCALE`, `REPAIR_ADDITIVE_BUDGET_MULTIPLIER`,
  or any other repair-family tier) — those stay their own separately-tracked questions/overrides.
- No merging this question into `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION`; the two mechanisms are
  cross-validated but distinct, per the originating report.
- No revising the predeclared 21,000,000/38,000,000 caps after seeing the A/B's outcome.

## Artifacts

- `reports/stress/failure-evidence/class3-dose-expectations-2026-09-19.json`,
  `class3-dose-analysis-2026-09-20.json` — source of the 16-row table above (already committed,
  no new acquisition).
- `reports/stress/failure-evidence/ws2-class3-shared-acquisition-population-2026-09-20.json` — the
  frozen 53-parent population this A/B reuses verbatim.
- `modules/solver/orchestration-early-repair.ts`, `orchestration-contracts.ts`, `orchestration.ts`,
  `scripts/level-blind-capability-sweep.mjs`, `modules/solver/orchestration-early-repair.test.ts` —
  the implemented seam.

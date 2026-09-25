# WS2 admissible-order reserve repricing: matched-work A/B design 001

> **Status:** active
> **Last evidence:** 2026-09-20 — `reports/2026-09-20-admissible-order-reserve-starvation-probe-result-001.md` (isolated 300M-node single-technique probe, frozen 40-parent sample): 2/40 genuine reserve-starvation opportunities (R01154 179.0M, R03270 172.7M nodes). This report designs the matched-work A/B that probe explicitly deferred; it dispatches nothing new.
> **Decision:** precommit the smallest matched-total-work `admissibleOrderNodeReserveFractionOverride` A/B at **normal production scale** (50M node budget), sized from a different, already-committed evidence source than the isolated probe: the same frozen Class-3 dose-expectations file used for `WS2-REPAIR-DEADLINE-ALLOCATION` also carries 5 admissible-order-rescued residual rows whose isolated cost is directly comparable to 50M-scale budget, not the isolated probe's 300M scale.
> **Remaining gate:** run the execution-family canary, then dispatch the predeclared A/B on the existing frozen 53-parent shared-acquisition population; do not change `ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION` from this report alone.
> **Evidence role:** design, per `docs/solver-optimization-workstreams.md`'s WS2-2A gate ("Precommit the smallest matched-total-work reserve-fraction A/B... no dispatch until that design is frozen").
> **Research question:** `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION`
> **Gate class:** `design` -> `bounded-compute` (the predeclared A/B, not yet dispatched).

## Why the isolated probe's own exemplars cannot size this A/B

The 300M-node isolated probe found R01154 (179,026,618 nodes) and R03270 (172,663,501 nodes) as
genuine reserve-starvation opportunities — but both costs are themselves far beyond normal
production's 50,000,000-node total budget. Neither is reachable by *any* reserve fraction at normal
scale (even a 100% reserve caps admissible-order-fallback at 50M, well short of either cost). Sizing
a normal-scale A/B off those two numbers would either force an unfounded extrapolation across a 6x
scale change, or covertly reopen the closed-negative broad 4x-total-budget escalation question by
running the A/B at 300M instead of 50M — both explicitly forbidden by the probe's own
non-authorization list and by this workstream's standing rules.

## A better-grounded, already-local sizing source

`reports/stress/failure-evidence/class3-dose-expectations-2026-09-19.json` — the same frozen,
already-committed file this branch already mined for `WS2-REPAIR-DEADLINE-ALLOCATION`'s node-cap
seam — contains isolated-cost rows for every exact-action rescuer type, not only repair. Filtering to
the `admissible-order` family (rather than `repair`) surfaces exactly the **5 residual rows** the
2026-09-20 class-3 dose-exposure report identified as the admissible-order-reserve mechanism, at
normal 50,000,000-node production scale:

| Parent | Isolated `nodesExpanded` | As a fraction of 50M | Current production dose |
|---|---:|---:|---:|
| R02219 | 14,300,785 | 28.6% | 12,499,968 (uniform) |
| R03354 | 16,076,371 | 32.2% | 12,499,968 (uniform) |
| R02277 | 31,237,421 | 62.5% | 12,499,968 (uniform) |
| R01269 | 33,782,273 | 67.6% | 12,499,968 (uniform) |
| R02979 | 48,231,138 | 96.5% | 12,499,968 (uniform) |

Every row's observed production dose is the *identical* 12,499,968 — exactly `50,000,000 x 0.25`,
confirming the current reserve fraction is the binding ceiling for all 5, with `outcome:
deadline-truncated` at that ceiling (never `node-limited`/`work-limited`), per
`reports/2026-09-20-class3-dose-exposure-resolved-result-001.md`.

This is a materially different, better-fitting sizing basis than the isolated probe: it is measured
at the *same* scale the actual production A/B will run at, and it splits cleanly into two bands —
two rows (R02219, R03354) needing only a modest reserve increase (28.6%/32.2%, barely above the
current 25%), and three rows (R02277, R01269, R02979) needing 62.5-96.5%, which would leave earlier
stages a shared pool of 3.5-37.5% of the total budget — a far larger, riskier reallocation.

## Predeclared treatment fraction (fixed now, not fit to outcomes)

**Treatment: `admissibleOrderNodeReserveFractionOverride = 0.35`.**

Deliberately targets only the cheap band (covers R02219 at 28.6% and R03354 at 32.2% with margin,
a ~1.4x increase over the 0.25 default) and deliberately excludes the expensive band (R02277/R01269/
R02979 stay out of scope for this first treatment). This mirrors the same "smallest consumer first"
discipline as the repair-deadline node-cap A/B: a 10x-plus reallocation aimed at the three expensive
rows would be a much larger bet on earlier-stage collateral than this first step should take. If 0.35
earns a clean positive, a second, separately-designed and separately-justified escalation toward the
expensive band is a distinct future decision, not implied by this one.

**Control: `admissibleOrderNodeReserveFractionOverride` omitted** (production default 0.25).

## Population (reuse verbatim, no new acquisition)

`reports/stress/failure-evidence/ws2-class3-shared-acquisition-population-2026-09-20.json` — the
same frozen 53-parent population already used for the repair-deadline A/B design:

- `class3-residual` tranche (23 ids): includes all 5 admissible-order-rescued rows above, the 16
  repair-family rows tracked separately under `WS2-REPAIR-DEADLINE-ALLOCATION`, and 2
  exposed-and-negative-only rows not expected to move under either treatment.
- `solved-controls` tranche (30 ids): the earlier-stage/regression control population. This is the
  set that matters most here: increasing the reserve *shrinks* the shared pool available to every
  tier before admissible-order-fallback runs (from 75% to 65% of the 50M total), so any solved
  control whose winning tier currently needs more than 65% of budget to win is now at genuine risk
  of losing its solve, not merely a theoretical concern.
- Corpus: `data/stress/stress-levels-random.json`. Re-resolve solver ref/protocol at dispatch time.

Reusing one population for both this A/B and the repair-deadline A/B is deliberate: it lets a single
53-parent dispatch answer two independent allocation questions (repair-family node caps and
admissible-order reserve fraction) under one shared set of earlier-stage loss controls, rather than
requiring two separate 53-parent acquisitions.

## Arms

Both arms: `scripts/level-blind-capability-sweep.mjs` production defaults, `--node-budget=50000000`,
derived `--work-budget=67000000` (matching the originating runs' own protocol), generous non-binding
`--budget-ms`, level-blind (no baseline/prime-winner/attempt-cache).

- **Control:** no override (production default reserve fraction 0.25).
- **Treatment:** `--admissible-order-node-reserve-fraction=0.35`.

The CLI flag already exists (`scripts/level-blind-capability-sweep.mjs` line ~63-64,
`solveOpts.admissibleOrderNodeReserveFractionOverride`) — no implementation seam is needed for this
question, unlike `WS2-REPAIR-DEADLINE-ALLOCATION`'s node-cap override, which this branch added.

## Advance rule

Run both arms on the full 53-parent population, then compare:

1. **Rescue count:** does either of R02219/R03354 (or any other residual row) reach a real
   `success` outcome under the treatment. Report per-row.
2. **Earlier-stage/solved-control loss:** any of the 30 solved-control rows, or any currently-solved
   non-target row inside the 23-row residual tranche, that regresses to unsolved under the treatment.
   Target is **zero losses**, mirroring the repair-deadline A/B's own bar; a nonzero loss requires
   forensic review (which tier lost its shrunk 65% shared-pool share) before any promotion
   discussion, not an automatic kill.
3. **workSpent economics:** aggregate and per-row `workSpent` delta on rows that don't change solved
   status — this is a pure reallocation within the same 50M total, not free extra search.
4. **Concentration:** no single parent should account for most of the treatment's total added cost.

A positive result is nomination/allocation evidence for this specific fraction, not a production
change by itself and not authorization to escalate toward the expensive band (R02277/R01269/R02979)
without a new, separately-justified design.

## Before dispatch

Per the operating model's "before expensive decision-bearing runs" checklist: run one representative
execution-family canary under the exact resolved treatment config (one admissible-order-gated level,
e.g. R02219) verifying the override actually reaches `SolveOpts` and that the reserve is genuinely
~17,499,968 attempted budget under fraction 0.35 (was avg dose observed at 12,499,968 under 0.25;
corrected from this report's original "14,999,968" transcription, which did not match 0.35 x 50M).

**Canary confirmation (2026-09-25):** ran `--corpus=data/stress/stress-levels-random.json --levels=pos:550
--node-budget=50000000 --work-budget=67000000 --admissible-order-node-reserve-fraction=0.35` against
R02219 (corpus position 550). `effectiveConfig.admissibleOrderNodeReserveFractionOverride: 0.35`
confirms the override reached `SolveOpts`; the `admissible-order-fallback` attempt's
`allocatedNodeCeiling` was `17,499,829` (vs. `12,499,950` for the untreated
`admissible-order-alternate-tiebreak-retry` stage, which this override does not touch), matching the
predicted 0.35/0.25 = 1.4x ratio to within rounding. `deadlineTruncated: false`. Canary passes; given
the empirical ~450s single-level cost at this budget observed on this canary and the WS2 repair-
deadline canary's ~235s, the full 53-level x 2-arm matrix (106 solves) is now dispatched via GHA
(`solver-level-blind-targeted-sweep.yml`, `node_cap_overrides=admissibleOrderNodeReserveFraction=0.35`
for treatment), not locally — this revises this report's original plan to run locally, made before
real per-level costs at this budget were observed.

## What this design does not authorize

- No dispatch of the A/B above — design only.
- No change to `ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION` from this report or from the A/B's eventual
  result alone.
- No escalation toward the expensive band (0.625-0.965 fraction territory) without a new,
  separately-justified design that explicitly models the larger earlier-stage risk.
- No reopening of the closed-negative broad 4x total-budget escalation question; this A/B stays at
  normal 50M production scale throughout.
- No revising the predeclared 0.35 fraction after seeing the A/B's outcome.
- No merging this question with `WS2-REPAIR-DEADLINE-ALLOCATION`; the two mechanisms are already
  cross-validated as distinct (per `reports/2026-09-20-class3-dose-exposure-resolved-result-001.md`)
  and only share a population, not a treatment or a decision rule.

## Artifacts

- `reports/stress/failure-evidence/class3-dose-expectations-2026-09-19.json` — source of the 5-row
  admissible-order table above (already committed, no new acquisition).
- `reports/stress/failure-evidence/ws2-class3-shared-acquisition-population-2026-09-20.json` — the
  frozen 53-parent population this A/B reuses verbatim.
- `reports/2026-09-20-admissible-order-reserve-starvation-probe-result-001.md` — the isolated-scale
  probe this design explicitly does not re-derive its fraction from, and why.

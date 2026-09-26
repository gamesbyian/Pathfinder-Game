# WS2 repair-deadline node-cap promotion completion: economics closeout + disjoint solved-control confirmation design 001

> **Status:** active
> **Last evidence:** 2026-09-25 — analysis of the already-completed A/B's own job logs (no new solver execution) plus a fresh zero-compute residual-atlas regeneration; this report also predeclares, but has not yet dispatched, a disjoint solved-control confirmation population.
> **Decision:** the preflight's own criteria 3 (per-row `workSpent` economics) and 4 (concentration) are now complete for the existing 53-parent result and both pass cleanly. A structurally disjoint *gain-side* population does not exist at the current production boundary (Class 3 is exhaustive at 23/23, already fully dispatched). The one dimension that genuinely was under-sampled — solved-control regression safety, tested on only 30/1,169 production solves — gets a disjoint, properly-sized 150-level confirmation population, predeclared here, not dispatched in this report.
> **Remaining gate:** dispatch the predeclared 150-level disjoint solved-control A/B (control vs. `earlyRepairSearchOrdinaryNodeBudgetOverride=21000000,earlyRepairSearchBiasedNodeBudgetOverride=38000000`); zero losses closes the promotion contract's regression-safety leg.
> **Evidence role:** closeout analysis (existing data) + acquisition design (new, not yet dispatched)
> **Research question:** `WS2-REPAIR-DEADLINE-ALLOCATION`
> **Production effect:** none yet.

## Why this report exists

`reports/2026-09-25-ws2-repair-deadline-admissible-order-matched-work-ab-result-001.md` concluded
"POSITIVE (nomination)" on the frozen 53-parent population (23 Class-3 residual + 30 solved controls)
and named the remaining gate as "the ordinary promotion path (matched-work confirmation at production
scale)," citing `WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION` as the precedent. That precedent's own
"confirmation at production scale" step
(`reports/2026-09-16-class4-113-allocation-promotion-001.md`) was a run over a **materially larger**
earned population (113 rows) than its own preceding freshness canary (8 rows) — a real second, bigger
population, not just re-analysis of the same run.

This report checks whether that same shape is available here, and finds a mixed answer:

1. **On the gain side, no larger population exists.** Class 3 ("known rescuer dispatched/reached;
   target-action dose not established") is defined over the *entire* current 531-row C2 residual, and
   the frozen 23-row population already **is** that entire class, not a subsample of it. A fresh,
   zero-compute atlas regeneration (below) confirms this is still exactly true today.
2. **On the regression-safety side, a much larger population is available and was not exhausted.**
   The original design tested only 30 of the 1,169 currently-solved C2 levels for regressions. That
   30-row sample is far too small to rule out a materially damaging regression rate with any real
   confidence, and 1,139 more disjoint solved levels are sitting right there, already solved, cheap to
   re-check.

Rather than force an artificial "bigger gain-side population" that cannot exist without new solver
evidence moving the production boundary, this report (a) finishes the original preflight's own
un-executed analysis on the existing result, using only already-collected data, and (b) sizes and
predeclares the confirmation population that actually is available and actually under-tested.

## Part 1 — Closing preflight criteria 3 and 4 on the existing result (no new solver execution)

`reports/2026-09-25-ws2-repair-deadline-allocation-node-cap-seam-and-ab-preflight-001.md`'s advance
rule had four numbered checks. The result report fully answered 1 (rescue count, per-row) and 2
(solved-control loss, zero) but only gave aggregate figures for 3 (workSpent economics) and 4
(concentration), not the per-row breakdown the preflight itself asked for. GHA artifact downloads to
`*.blob.core.windows.net` remain blocked by this environment's egress policy (same gap
`reports/2026-09-20-class3-dose-exposure-resolved-result-001.md` hit and worked around), so this
report reads the same `summarize-targeted-sweep-work.mjs` per-level table directly from the
`Combine final results` job logs of both already-completed runs
([control `36119211454`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36119211454),
[treatment `36119216418`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36119216418)) —
the same source the 113-row portal-coarse promotion report used for the same reason.

### Per-row workSpent, the 7 treatment-only gains

| Parent | Control `workSpent` (unsolved, node-budget-reached) | Treatment `workSpent` (solved) | Work saved by solving early |
|---|---:|---:|---:|
| R00306 | 216,462,326 | 89,160,899 | 127,301,427 |
| R01086 | 212,555,807 | 6,883,675 | 205,672,132 |
| R02138 | 192,932,795 | 22,824,473 | 170,108,322 |
| R02892 | 206,301,700 | 20,325,131 | 185,976,569 |
| R03109 | 175,907,136 | 51,447,287 | 124,459,849 |
| R03251 | 308,126,652 | 48,220,319 | 259,906,333 |
| R03323 | 182,530,860 | 4,746,337 | 177,784,523 |

Every one of the 7 gained rows costs **less** total `workSpent` under the treatment than the control
spent failing to solve it (control rows run to `node-budget-reached` near the full ~67M-derived work
ceiling; treatment rows stop the moment they solve). This is the same mechanism
`reports/2026-09-16-class4-113-allocation-promotion-001.md` documented for portal coarse-state
("a solved row stops rather than exhausting its full node/work budget") and it is the direct
row-level explanation for the previously-reported aggregate nodes ratio of 0.827 (fewer total nodes
despite raising a per-attempt cap): the 7 early exits more than pay for the raised repair-stage
allowance spent on rows that still don't solve.

### Concentration

Summing the 7 gained rows' own treatment `workSpent` (the interpretable per-row cost figure available
without re-deriving a per-row control/treatment allocation split inside a shared budget pool):

| Parent | Share of the 7 gains' combined workSpent |
|---|---:|
| R00306 | 36.6% |
| R03109 | 21.1% |
| R03251 | 19.8% |
| R02138 | 9.4% |
| R02892 | 8.3% |
| R01086 | 2.8% |
| R03323 | 1.9% |

The preflight's own bar was "no single parent should account for **most** of the treatment's total
added cost." R00306 is the largest single contributor at 36.6%, well under a "most" (>50%) bar, and
every gained row's *added* cost is actually negative (a savings, per the table above) — there is no
row whose gain came at outsized expense of the others. **Criterion 4 passes.**

### What this does and does not close

This closes the preflight's own predeclared analysis on the **existing** 53-parent result. It is not
new solver evidence and does not by itself authorize promotion — see Part 2 for the one leg of the
promotion contract that still needs more data than this population can supply.

## Part 2 — Confirming no larger gain-side population exists (zero-compute, current boundary)

Regenerated the canonical residual atlas from the same pinned boundary the frozen Class-3 population
already uses (`35066677597` production/lifecycle, `33717910218` technique census — unchanged per the
2026-09-22 broad-refresh closeout's "zero solved-set churn"):

```
node scripts/run-bundled.mjs scripts/stress/analyze-post-1029-residual-atlas.mjs -- \
  --baseline=reports/stress/capability-runs/35066677597/per-level-corpus2.json \
  --lifecycle=reports/stress/capability-runs/35066677597/lifecycle-failure-map-corpus2.json \
  --census=reports/stress/technique-census/33717910218/combined-cells.json \
  --hints-dir=data/stress/hints-random
```

Result: **531 residual, primary Class 3 = 23** — identical to the frozen population, confirming the
boundary has not moved and the 23-row set is still the complete Class-3 population, not a sample of
a larger one. Checked one candidate escape hatch: residual rows whose *primary* class is 2
("known rescuer offered but not reached or **materially starved**") with a contributing repair-family
win specifically marked `familyStarved` — the same node-cap-censoring signature, one class down. Only
**3 rows** (`R00565`, `R02092`, `R03064`) match, far too few to be a separate confirmation population
and not pursued further here (a 3-row population would be a single-digit microscope, not evidence,
per this workstream's own standing rules on comparable-work dose).

**Conclusion: there is no larger or disjoint gain-side population available for this exact question
at the current production boundary.** The 53-parent A/B's residual tranche is not a subsample
awaiting a bigger confirmation draw; it already is the full addressable Class-3 population. Waiting
for one to appear is not a defensible gate — it would require the production boundary itself to move
first (new solves, new promotions), which is not something to engineer for this question.

## Part 3 — What actually is under-sampled: solved-control regression safety

The one leg of the promotion contract that a genuinely larger, genuinely disjoint population *can*
serve is the regression-safety check. The original design tested 30 of the 1,169 currently-solved C2
levels (2.6%) — a reasonable cheap first check, but far too small to rule out a low-but-real
regression rate before flipping a production default: at a true 2% per-level regression rate, the
chance of observing zero losses by luck alone on 30 independent draws is `0.98^30 ≈ 54.5%` — a coin
flip, not confirmation. `reports/2026-09-25-capability-invention-demand-ew1-routing-exposure-confirmation-ab-result-001.md`
(the other currently-positive WS2 promotion candidate) used a **104-level** combined solved-control
check for exactly this reason.

### Design

- **Population:** 150 solved C2 levels, disjoint from the original 30-id solved-control tranche and
  disjoint from the 23-id Class-3 residual tranche (both explicitly excluded from the sampling pool).
  Sampled deterministically from the 1,139 eligible solved levels by ranking
  `sha256("ws2-repair-deadline-solved-control-confirmation-2026-09-25|" + id)` and taking the lowest
  150 keys — reproducible from the seed string alone, no manual curation, no outcome-based selection.
  Frozen list: `data/stress/ws2-repair-deadline-solved-control-confirmation-150-ids.json` /
  `...-ids.txt` (also usable directly as the `ids_file` input to
  `solver-level-blind-targeted-sweep.yml`).
- **Combined power:** 150 fresh + 30 original = 180 total independent solved-control observations
  once this arm completes. If all 180 show zero losses, that rules out (at ~95% confidence) any true
  per-level regression rate at or above `1 - 0.05^(1/180) ≈ 1.66%` — comfortably below the 2% design
  target above.
- **Arms:** identical to the original A/B — control (production defaults) vs. treatment
  (`earlyRepairSearchOrdinaryNodeBudgetOverride=21000000`,
  `earlyRepairSearchBiasedNodeBudgetOverride=38000000`), same protocol
  (`level-blind-capability-sweep.mjs` via `solver-level-blind-targeted-sweep.yml`,
  `--node-budget=50000000`, derived `--work-budget=67000000`, non-binding `--budget-ms`, level-blind).
- **Corpus:** `data/stress/stress-levels-random.json` (all 150 ids resolve in this corpus, verified).
- **Advance rule:** the *only* question this population answers is regression safety — it is not
  expected to produce new gains (every level is already known-solved in production). **Target: zero
  control-only losses across all 150.** Per this workstream's standing practice (matching the original
  preflight's own bar), a nonzero loss does not automatically kill the treatment but blocks promotion
  pending forensic review of which stage lost its share of the shared `mainSearchEarlyNodeBudget` pool
  on that specific row.
- **Before dispatch:** run the same execution-family canary discipline the original preflight used —
  one representative level from this population under the resolved treatment config, verifying
  `effectiveConfig` carries both overrides and the solve completes, before the full 150×2-arm matrix.

### What this design does not authorize

- No claim that 150 is the unique correct size — it is sized to move combined confidence from "a coin
  flip against a 2% regression rate" (the original 30 alone) to "~95% confidence against a ~1.7%
  regression rate" (180 combined), matching the same style of explicit power reasoning
  `reports/2026-09-25-ws1-late-continuation-single-stage-acquisition-plan-001.md` used for its own
  fresh-acquisition sizing this session.
- No dispatch — population and protocol are frozen here; dispatch is the next action.
- No change to the treatment's node-cap values (21,000,000/38,000,000) — unchanged from the original
  preflight, not re-tuned in response to any result.
- No claim that this closes `WS2-REPAIR-DEADLINE-ALLOCATION` by itself. A clean zero-loss result on
  this population, combined with Part 1's completed economics/concentration analysis, would clear
  every element of the original preflight's promotion contract; a nonzero loss reopens the question
  with a specific row to investigate rather than a diffuse "maybe."

## Artifacts

- `data/stress/ws2-repair-deadline-solved-control-confirmation-150-ids.json`,
  `...-ids.txt` — the frozen 150-id disjoint confirmation population.
- GHA job logs (existing runs, no re-execution): control
  [36119211454](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36119211454) job
  `108024650553` ("Combine final results"), treatment
  [36119216418](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36119216418) job
  `108028926491` ("Combine final results").
- `reports/2026-09-25-ws2-repair-deadline-allocation-node-cap-seam-and-ab-preflight-001.md` — the
  advance rule this report completes/extends.
- `reports/2026-09-25-ws2-repair-deadline-admissible-order-matched-work-ab-result-001.md` — the
  nomination result this report builds on.

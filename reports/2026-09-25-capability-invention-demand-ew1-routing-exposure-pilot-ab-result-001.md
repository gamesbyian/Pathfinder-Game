# Capability-invention demand: EW1 routing-exposure pilot A/B result 001

> **Status:** active
> **Last evidence:** 2026-09-25 — matched-work pilot A/B, both flags: clean POSITIVE. `STRATEGY_NEAR_HAMILTONIAN_INTERSECTION_HARVEST_MECHANIC_BUCKET_EXPOSURE` (CID-0027): control 12/13 (R00118 unsolved, node-budget-reached) -> treatment 13/13 (R00118 solved, zero regressions). `STRATEGY_VERY_HIGH_INT_WIDTH2000_HARVEST_KNOT_MUSTCROSS_EXPOSURE` (CID-0028): control 12/13 (R02696 unsolved, node-budget-reached) -> treatment 13/13 (R02696 solved, zero regressions). Every row across all four runs reports `refereeValid === true`.
> **Decision:** advance per each row's own precommitted `advanceIf` (referee-valid target-row gain, zero same-branch solved-level regressions in the sample) — both rows satisfy it cleanly. Do not promote to a production default yet: the 13-level pilot samples only ~6.6%/3.9% of each branch's 196/335-level population, far short of a promotion-grade regression-safety claim.
> **Remaining gate:** a larger confirmation sample (or, if warranted by cost, the full branch) before any `OPT_IN_FEATURES` default change, per this workstream's own promotion discipline.
> **Evidence role:** confirmation (matched-work A/B, dispatched via `solver-level-blind-targeted-sweep.yml`)
> **Research question:** `WS2-CAPABILITY-INVENTION-DEMAND`
> **Production effect:** none. Both flags remain `OPT_IN_FEATURES`, default OFF.

## Correction: control-run mislabeling in the dispatch record

`reports/2026-09-25-capability-invention-demand-ew1-routing-exposure-test-design-001.md` and
`docs/solver-opt-in-experiment-ledger.md` (as committed in `605ae450`) swapped the two **control**
run IDs. Both `enable=none` control runs were dispatched close together (19:08:34 and 19:08:43) and
I assumed run-creation order matched dispatch order; it did not run in the order I assumed. The two
**treatment** run IDs were correctly labeled (their `enable_flags` value is visible directly in the
run name, so there was no ambiguity there). Verified the actual arm of each control run from its
combine-job log population (the specific level IDs each run actually swept), not from creation order:

| Arm | Run (as originally documented) | Run (actual, verified by population) |
|---|---|---|
| CID-0027 control | `36177860900` (wrong) | `36177843641` |
| CID-0028 control | `36177843641` (wrong) | `36177860900` |
| CID-0027 treatment | `36177853014` | `36177853014` (unchanged, correct) |
| CID-0028 treatment | `36177869048` | `36177869048` (unchanged, correct) |

This correction does not change either result: the treatment/target-row pairing was always right, and
both controls behaved identically to their sibling (12/13 solved, only the branch's own target row
unsolved) — the swap only affected the label attached to each control run's own artifact link.

## Results

Fetched via `mcp__github__get_job_logs` on each run's "Combine final results" job (the GHA artifact
host itself, `productionresultssa8.blob.core.windows.net`, is blocked by this environment's network
policy — same limitation as the technique-census artifact; job logs are not blocked and the combine
step prints the full solved/unsolved summary there).

### CID-0027 (near-Hamiltonian rule, target R00118)

| Arm | Run | Solved | Unsolved | Target row |
|---|---|---:|---:|---|
| Control (no flags) | [36177843641](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36177843641) | 12/13 | 1 | R00118: **unsolved** (node-budget-reached) |
| Treatment (`STRATEGY_NEAR_HAMILTONIAN_INTERSECTION_HARVEST_MECHANIC_BUCKET_EXPOSURE`) | [36177853014](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36177853014) | 13/13 | 0 | R00118: **solved** |

Control solved set: R02464, R02851, R02931, R02972, R00506, R02095, R02109, R03014, R02172, R02798,
R02845, R02858 (all 12 controls). Treatment solved set: the same 12 controls plus R00118 — byte-exact
match on the control population, zero regressions. All 13 treatment rows report `refereeValid ===
true`.

### CID-0028 (very-high-requiredIntersections non-portal rule, target R02696)

| Arm | Run | Solved | Unsolved | Target row |
|---|---|---:|---:|---|
| Control (no flags) | [36177860900](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36177860900) | 12/13 | 1 | R02696: **unsolved** (node-budget-reached) |
| Treatment (`STRATEGY_VERY_HIGH_INT_WIDTH2000_HARVEST_KNOT_MUSTCROSS_EXPOSURE`) | [36177869048](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36177869048) | 13/13 | 0 | R02696: **solved** |

Control solved set: R02719, R02147, R02265, R02447, R03366, R02052, R02496, R02706, R03023, R02169,
R02761, R02875 (all 12 controls). Treatment solved set: the same 12 controls plus R02696 — byte-exact
match on the control population, zero regressions. All 13 treatment rows report `refereeValid ===
true`.

## Protocol actually run (matches the design report's protocol exactly)

`scripts/level-blind-capability-sweep.mjs` production defaults, `--node-budget=50000000` (workflow
default), derived `--work-budget=67000000`, generous non-binding `budget_ms` (86400000 default),
level-blind, via `solver-level-blind-targeted-sweep.yml`, commit `b70fac12`. Each branch's control and
treatment ran over the identical 13-level population (target row + the same 12 stratified solved
controls drawn in the design report), differing only in `enable_flags`.

## Interpretation

Both flags cleared their own precommitted `advanceIf` with no ambiguity: a referee-valid gain on the
target row, and the entire same-branch solved-control sample stayed solved (byte-identical solved
sets, not just equal counts). This is two independent-mechanism confirmations (disjoint rules,
disjoint level populations, disjoint flags) of the same underlying pattern this workstream's EW1
routing-gap sample first surfaced: a level's actual matched `ATTEMPT_POLICY` rule can omit an action
that independently, cheaply solves it in EW1 isolation, and exposing that action recovers the level
at production budget with no observed cost to the rest of that rule's already-solved population.

This is real signal toward the stated goal of new cold solves at typical production budgets — both
R00118 and R02696 move from node-budget-limited failures to referee-valid solves at the exact same
node budget, from a one-line routing change each.

## What this does not yet authorize

- **No production default change.** 13 levels is a real but small fraction of each branch (196 and
  335 Corpus 2 levels respectively) — 6.6% and 3.9% coverage. Zero regressions in 12 samples is
  reassuring, not a promotion-grade regression bound; a materially larger sample (or the full branch,
  if its cost is acceptable) is needed before treating either flag as a production-default candidate.
- **No claim about the two other rows/branches' base rate for this exact mechanism** beyond what the
  original EW1 routing-gap sample already established (2 exact-config F8 routing/deployment misses;
  see `reports/2026-09-25-capability-invention-demand-ew1-routing-gap-sample-001.md`).
- **No claim about generalization to a differently-shaped exposure flag** — this result is specific to
  the two located rules and the two specific actions each adds.

## Artifacts

- Combine-final job logs for all four runs (solved/unsolved summary, per-level `refereeValid`,
  workSpent): `36177843641`, `36177853014`, `36177860900`, `36177869048`.
- `reports/2026-09-25-capability-invention-demand-ew1-routing-exposure-test-design-001.md` — design,
  implementation, and population-sizing for this pilot (control-run labels there are corrected by this
  report, not edited in place, per this repo's provenance convention against rewriting dated reports).
- `docs/solver-opt-in-experiment-ledger.md` — both flags' ledger rows.

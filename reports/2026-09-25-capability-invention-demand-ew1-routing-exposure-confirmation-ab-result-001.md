# Capability-invention demand: EW1 routing-exposure confirmation A/B result 001

> **Status:** active
> **Last evidence:** 2026-09-25 — 40-level confirmation A/B, both flags: clean POSITIVE, zero regressions. All four runs (CID-0027 control/treatment, CID-0028 control/treatment) report 40/40 solved, 0 unsolved, 0 `refereeValid !== true`, byte-identical solved sets between control and treatment in both branches.
> **Decision:** combined with the 13-level pilot (`reports/2026-09-25-capability-invention-demand-ew1-routing-exposure-pilot-ab-result-001.md`), each flag now has zero regressions across 52 solved-control levels (12 pilot + 40 confirmation), plus its own referee-valid target-row gain. This is materially stronger evidence than the pilot alone, but still short of full-branch coverage.
> **Remaining gate:** a promotion decision (default-ON for either or both flags) is a reasoned next step, not automatic from this result; this report documents the evidence, it does not flip either flag's `OPT_IN_FEATURES` default.
> **Evidence role:** confirmation (matched-work A/B, dispatched via `solver-level-blind-targeted-sweep.yml`)
> **Research question:** `WS2-CAPABILITY-INVENTION-DEMAND`
> **Production effect:** none. Both flags remain `OPT_IN_FEATURES`, default OFF.

## Results

Four runs, commit `acc99809`, `--node-budget=50000000` production default, level-blind, fetched via
`mcp__github__get_job_logs` on each run's "Combine final results" job (GHA artifact downloads remain
blocked by this environment's network policy). Arm determined from each run's own `enable_flags`
value and independently cross-checked against the actual solved-ID set in its log — not from dispatch
order (the pilot round's control runs were mislabeled this way once already; see the pilot result
report's correction section).

| Run | Branch | Arm | Solved | Unsolved | `refereeValid !== true` |
|---|---|---|---:|---:|---:|
| [36181303084](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36181303084) | CID-0027 | control | 40/40 | 0 | 0 |
| [36181311678](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36181311678) | CID-0027 | treatment (`STRATEGY_NEAR_HAMILTONIAN_INTERSECTION_HARVEST_MECHANIC_BUCKET_EXPOSURE`) | 40/40 | 0 | 0 |
| [36181320698](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36181320698) | CID-0028 | control | 40/40 | 0 | 0 |
| [36181331412](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36181331412) | CID-0028 | treatment (`STRATEGY_VERY_HIGH_INT_WIDTH2000_HARVEST_KNOT_MUSTCROSS_EXPOSURE`) | 40/40 | 0 | 0 |

Each branch's control and treatment solved sets are set-identical (verified by diffing the two 40-ID
lists as sets — empty symmetric difference in both branches). Zero regressions, zero new losses.

These 40 levels per branch were a fresh, disjoint draw from each branch's remaining solved population
(excluding the 12 already tested in the pilot): CID-0027 drew from the 80 solved levels outside the
pilot's 12 (out of 196 total in the branch); CID-0028 drew from the 227 outside the pilot's 12 (out of
335 total).

## Combined evidence (pilot + confirmation)

| Branch | Target row | Solved-control levels tested, zero regressions | Branch coverage |
|---|---|---:|---:|
| CID-0027 | R00118: unsolved (control) -> solved (treatment) | 52 / 196 | 26.5% |
| CID-0028 | R02696: unsolved (control) -> solved (treatment) | 52 / 335 | 15.5% |

Using the rule-of-three heuristic (a 95% upper confidence bound on a true failure rate, given zero
observed failures in `n` trials, is approximately `3/n`), 0 regressions in 52 trials bounds each
branch's true regression rate at roughly **<=5.8%** with 95% confidence — a materially tighter bound
than the pilot's own `n=12` alone gave (`<=25%`).

## Interpretation

This is decisive matched-work evidence for both flags at this scale: two independent mechanisms
(disjoint rules, disjoint populations, disjoint flags), each showing a referee-valid target-row gain
and zero regressions across a genuinely growing, disjoint sample (13 -> 65 levels tested per branch
across the two rounds). Nothing in this round weakens either result; it strengthens both.

## What this does not yet authorize

- **Still no production default change.** 52/196 and 52/335 are real, materially improved coverage
  over the pilot's 13, but neither is full-branch coverage, and this report does not itself decide
  what coverage threshold this project treats as promotion-grade. That decision belongs to whoever
  reviews this evidence against the project's own promotion bar (see
  `docs/solver-opt-in-experiment-ledger.md`'s disposition conventions), not to this report.
- **No claim about the untested remainder of either branch** (144/196 for CID-0027, 283/335 for
  CID-0028) beyond the base-rate context already established.
- **No claim about the currently-unsolved remainder of either branch** — this confirmation sampled
  only from the already-solved population (a regression check), not the residual-unsolved population
  where further target-row-style gains might exist. A future round could sample from the residual
  instead, if more upside discovery (not just regression safety) is the priority.

## Artifacts

- Combine-final job logs for all four runs (solved/unsolved summary, per-level `refereeValid`):
  `36181303084`, `36181311678`, `36181320698`, `36181331412`.
- `reports/2026-09-25-capability-invention-demand-ew1-routing-exposure-pilot-ab-result-001.md` — the
  13-level pilot this confirmation extends.
- `reports/2026-09-25-capability-invention-demand-ew1-routing-exposure-test-design-001.md` — original
  design, implementation, and population-sizing.

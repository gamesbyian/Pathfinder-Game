# BC1 fresh-connectivity prune: matched-budget beam A/B result

> **Status:** concluded-positive
> **Last evidence:** 2026-09-30 — 24-parent and disjoint 300-level raw-beam A/B, control vs STRATEGY_BC1_FRESH_CONNECTIVITY_PRUNE.
> **Decision:** the opt-in beam consumer `STRATEGY_BC1_FRESH_CONNECTIVITY_PRUNE` (theorem BC1, evaluated only where ordinary connectivity was just computed, so zero canonical flood work) converts **20 control-unsolved levels to solved with 1 loss** on a disjoint 300-level seeded population, and 1 gain / 0 loss on the 24 Stage-B parents. Earns a production-ladder (full-solver) A/B on the gain/loss levels before any default change.
> **Remaining gate:** production-ladder (full-solver) A/B on gain/loss ids, then solved-control regression set; no default change before that.
> **Evidence role:** development.
> **Owner:** `WS2-CUT-BALANCE-PROJECTION`.

## Protocol
Raw `beamSearchFromGate` from first gate, width 500, 3M node budget, default scoring profile, control = production defaults, treatment = flag on. Population: 300 ids seeded-shuffled (seed 2026093001) from `stress-levels-random.json` excluding the 24 Stage-B parents; frozen in `data/stress/bc1-prune-ab-001-shard{0,1,2}-ids.txt`. Script `scripts/stress/bc1-prune-ab.mjs`. Beam exhausts at ~25-50k nodes on these levels (width-limited, not budget-limited), so this is not a work-matched budget question; canonical `workSpent` was +4.1% (101.35M vs 97.38M treatment) in aggregate.

| Population | levels | control solved | treatment solved | gains | losses |
|---|---:|---:|---:|---:|---:|
| Stage-B 24 parents | 24 | 3 | 4 | 1 | 0 |
| Disjoint 300 | 300 | 23 | 42 | 20 | 1 |

Gain ids + loss id: `data/stress/bc1-prune-ab-001-gain-loss-ids.txt`. Solutions are beam paths returned by the same referee-gated search; BC1 only removes candidates the theorem proves have no completion, so gains are trajectory changes from freed beam slots, not relaxed validity.

## Caveats
- Raw width-500 beam, not the production ladder: many of these levels may already be solved by wider/later attempts. Not yet a cold-solve claim.
- The single loss (R01210) is a trajectory perturbation; BC1 is sound so it cannot be pruning the solution.
- Wall cost (fast path re-run of the 300-level A/B: identical solved sets and per-level `workSpent`; control 83.9 s vs treatment 97.4 s = 1.16x wall): the first run's slow Map/Set BC1 path made treatment ~13.7x slower. A typed-array fast path (`bc1HasConflictFast`, differentially verified 0 mismatches over ~32k fresh-connectivity checks on 6 parents) is now used by the consumer.

## Next gate
Level-blind targeted sweep (control vs `enable_flags=STRATEGY_BC1_FRESH_CONNECTIVITY_PRUNE`) at production budget on the 21 gain/loss ids; then a solved-control regression set.

## Production-ladder result (GHA, level-blind targeted sweep, 50M default budget, same commit 1d8eb451)

21 gain/loss ids, control (runs/36688413338) vs `enable_flags=STRATEGY_BC1_FRESH_CONNECTIVITY_PRUNE` (runs/36688416642):

| | control | treatment |
|---|---:|---:|
| solved | 20/21 | **21/21** |
| total `workSpent` | 1,345,288,939 | 1,131,275,702 (-15.9%) |
| nodes | 531,027,610 | 370,523,567 (-30.2%) |

The single control-unsolved level (`R00180`, node-limited after exhausting the retry ladder) is solved by treatment: **1 new production cold solve**. The other 19 shared solves were already production-solved (the raw-beam "gains" are mostly already recovered by the wider ladder), but treatment reaches them with less work (earlier solves skip later retry tiers: goal-attraction-disabled-retry 21->9 attempts; coarse-near-tie / connectivity-axis / must-cross / guidance retries 13 attempts each -> 0). `R01210` (the raw-beam loss) is solved in both arms at production.

Caveat: population is outcome-nominated (levels where raw beam flipped), so the work reduction is a benefit-enriched, not representative, figure; regression safety and representative work need the solved-control set and a representative sample (solved-control treatment run 36688582123 pending at time of writing).

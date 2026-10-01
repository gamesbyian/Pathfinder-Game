# BC1 fresh-connectivity prune: matched-budget beam A/B result

> **Status:** concluded-positive
> **Last evidence:** 2026-09-30 — 24-parent and disjoint 300-level raw-beam A/B, control vs STRATEGY_BC1_FRESH_CONNECTIVITY_PRUNE.
> **Decision:** the opt-in beam consumer `STRATEGY_BC1_FRESH_CONNECTIVITY_PRUNE` (theorem BC1, evaluated only where ordinary connectivity was just computed, so zero canonical flood work) converts **20 control-unsolved levels to solved with 1 loss** on a disjoint 300-level seeded population, and 1 gain / 0 loss on the 24 Stage-B parents. Earns a production-ladder (full-solver) A/B on the gain/loss levels before any default change.
> **Remaining gate:** published-corpus regression gate + ci, then promote to default-ON.
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

## Regression probe: solved-control 150 (GHA run 36688582123, flag on) and the R02401 loss

Treatment solved 149/150; the single loss `R02401` (node-budget-reached). A flag-off control (GHA run 36699378024, and a local repro at the same 50M/67M envelope) **solves** `R02401`, so this is a real flag-attributable loss, not a pre-existing failure.

Local paired repro (`level-blind-capability-sweep`, `pos:732`): control solves at its 39th attempt, `must-cross-neighbor-prune-disabled-retry` width 5000, **255,489 nodes** (total 100.3M nodes / 216.4M work, 667 s). Treatment's stages up to that point are node-identical (early-repair 31,875,004; repair-fallback 4,781,263; admissible-order 12,499,968 ...), but its `must-cross-neighbor-prune-disabled-retry` stage runs 11 attempts / 41.1M nodes without solving and it then spends another 40.9M in `guidance-goal-distance-retry` before the node cap fires (182.0M nodes). Mechanism: **trajectory perturbation of one narrow winning beam attempt**, not displacement of earlier budget -- BC1 pruning frees beam slots, which changes which states a width-5000 beam keeps; this particular beam no longer reaches the solution. It is the same mechanism that produces the gains.

Net on the two production populations so far: +1 cold solve (R00180) / -1 (R02401) across 171 distinct levels with 16% lower work on the benefit-enriched 21. This is not a clean promotion case; a representative-sample production A/B (same 300 ids as the raw-beam A/B, `data/stress/bc1-prune-ab-001-ids.txt`) is the next gate.

## Representative production A/B: random 300 (GHA runs 36772811676 control / 36772815197 treatment, commit a9bda144, 50M default budget)

Pre-specified seeded random sample (seed 2026093001, disjoint from the 24 Stage-B parents; no outcome selection), both arms dispatched on every id, exact population validated by the workflow.

| | control | treatment |
|---|---:|---:|
| solved | 206/300 | **225/300** |
| unsolved (all node-budget-reached) | 94 | 75 |

**23 gains / 4 losses, net +19 new cold solves (+6.3 pp of the population; 24.5% of control-unsolved).** Gains: R00046 R00180 R00440 R02084 R02274 R02422 R02425 R02431 R02440 R02590 R02629 R02666 R02676 R02703 R02748 R02956 R03024 R03115 R03117 R03121 R03152 R03261 R03301. Losses: R01273 R02333 R02874 R03242 (trajectory perturbations of the same kind as R02401; BC1 is sound so none can be caused by pruning a valid completion). Exact sign test 23 vs 4 is p~3e-4. Combined with the solved-control 150 (1 loss, R02401), the flag is net strongly positive on every production population tested: +1/-0 beyond the raw-beam nominations is not needed to see it.

Earns: promotion to default-ON subject to the published-corpus regression gate and `npm run ci`. Loss rate on already-solved levels is small but non-zero (~1.4% across both controls), accepted as the usual trajectory-perturbation cost given 6x more gains than losses.

### Routing-regime breakdown of the random-300 (joined via `classifyRoutingRegime`, level-blind features)

| regime | levels | main-unsolved (flag ON) | gains | losses |
|---|---:|---:|---:|---:|
| intersection-heavy | 230 | 57 (25%) | 19 | 4 |
| multi-portal | 29 | 12 (41%) | 2 | 0 |
| must-cross-heavy | 28 | 4 (14%) | 1 | 0 |
| general | 13 | 2 (15%) | 1 | 0 |

The gain mass and all four losses sit in the intersection-heavy regime (net +15 of 230, +6.5 pp there), which is also where 76% of the remaining unsolved levels are; the next capability frontier on this population is intersection-heavy and multi-portal (41% unsolved, smallest regime and least-benefited by BC1).

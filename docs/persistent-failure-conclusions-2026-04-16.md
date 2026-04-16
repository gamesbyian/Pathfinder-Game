# Persistent solver failures: new conclusions from latest telemetry (2026-04-16)

Source window analyzed:
- `2026-04-16T03-06-15Z-713b8daed2bc.json`
- `2026-04-16T04-39-08Z-61d7d009d287.json`
- `2026-04-16T05-06-56Z-ed7bc20c68ad.json`

## 1) Persistent hard set is still timeout-only and unchanged for core blockers
Across all three latest runs, the persistent set is still **92, 108, 134**, all in `healthy-expansion-timeout`.

## 2) New telemetry counters indicate rescue paths are not engaging
The newly tracked counters remain effectively dormant on persistent failures:
- `rescueTriggeredNearClosure = 0`
- `rootFamiliesAttemptedBeforeTimeout = 0`
- `rootFamiliesStarved = 0`
- `retryFingerprintDupes = 0`
- `mustCrossRescueTriggered = 0`

Interpretation: the current policy ladder is timing out before (or without) activating the intended rescue/diversification mechanisms.

## 3) L108 is now clearly a "near-solve but no closure" profile
For L108 in all latest runs:
- `bestLowerBoundToValidSolution` is pinned at **1**.
- Near-solution mass remains large in closure/interaction dimensions.
- `mustCrossScheduleInfeasibleFrontierStates` is non-zero.

Interpretation: this failure is no longer about finding candidate space; it is about converting near-complete states into valid closure under budget.

## 4) L92 remains dominated by must-cross obligations (not closure)
For L92:
- `bestLowerBoundToValidSolution` is much higher (17-24 across attempts).
- Near-solution evidence is almost exclusively `must-cross` and disappears in the newest run.

Interpretation: L92 is primarily a schedule/planning bottleneck for must-cross obligations, not a terminal closure issue.

## 5) L134 shows deterministic early-pass repetition
Duplicate attempt fingerprints are repeated across all three latest runs:
- `A->B(5468,49), B->C(5468,49)`

Interpretation: early attempts are overlapping heavily and likely wasting budget on equivalent search trajectories before diversified profiles engage.

## 6) New non-persistent signal appeared: L7 collapse-family regression
The newest run adds L7 as `no-solution-inconclusive` / `low-expansion-collapse` while core persistent levels remain timeout-class.

Interpretation: there is an intermittent collapse-family regression in parallel with the long-standing timeout family; this is separate from the persistent timeout triad.

## 7) Overall conclusion for next fix direction
The new telemetry strengthens this split diagnosis:
- **108**: near-closure conversion/rescue activation gap.
- **92**: must-cross schedule feasibility gap.
- **134**: attempt diversification/redundancy gap.

So the blocker is less about adding more pruning telemetry and more about making rescue/diversification paths actually trigger and spend budget on non-duplicate trajectories.

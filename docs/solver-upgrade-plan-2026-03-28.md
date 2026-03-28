# Solver Upgrade Plan (March 28, 2026)

## Scope

This note summarizes the most recent three raw audit exports and translates those observations into solver upgrade priorities that reduce non-deterministic failures without level-specific logic.

## Latest three-run snapshot

Raw files reviewed (chronological):

1. `2026-03-28T22-37-50Z-6ccd6b9bd89e.json`
2. `2026-03-28T23-06-47Z-195767f37a01.json`
3. `2026-03-28T23-20-53Z-ae7d45424ab9.json`

Failure totals by run:

- 7 failures: `7, 26, 47, 74, 92, 108, 130`
- 7 failures: `7, 26, 47, 73, 92, 108, 130`
- 8 failures: `7, 26, 47, 50, 74, 92, 108, 130`

## Why failures moved from 7 to 8

The increase from 7 to 8 did **not** come from a stable new regression that always fails.

- Level 50 solved in the first two runs, then timed out in the third run.
- In the same window, level 73 and level 74 alternated between solved and timeout.
- The persistent core failure set remained `7, 26, 47, 92, 108, 130` across all three runs.

Interpretation: level 50 behaves like a borderline search budget case under current attempt ordering and timeout escalation policy. It can solve when early branch ordering aligns; it can timeout when exploration spends budget in less productive subtrees.

## Level 50: introduced failure vs. borderline variance

Current evidence points to **borderline variance**, not a deterministic new level-50 break:

- Level 50 has both solved and timeout outcomes across consecutive commits/runs.
- Timeout classification is `healthy-expansion-timeout`, which indicates high expansion rather than immediate collapse.
- Node counts vary heavily for successful runs vs. timeout runs, consistent with sensitivity to branch ordering quality.

## Observed failure families to target

1. **Healthy-expansion timeouts** (levels 26, 47, 50/73/74, 92, 108, 130 depending on run).
2. **Low-expansion collapse** (level 7 remains `no-solution-inconclusive`).

## Upgrade priorities (solver-general, no level-specific behavior)

### 1) Deterministic multi-policy beam at root (highest priority)

Problem: one policy can over-commit to a bad subtree even if expansion is high.

Upgrade:

- Keep top-K root candidates from at least two scoring policies (e.g., progress-biased and feasibility-biased).
- Interleave expansions by quota rather than fully committing to one policy-first path.
- Preserve determinism via fixed policy order and fixed tie-breaking.

Expected effect: reduce variance on borderline levels (50/73/74) and convert a portion of healthy-expansion timeouts to solves.

### 2) Budget slices with checkpoint restarts

Problem: escalation currently increases budget, but late-stage rescue can still inherit poor frontier composition.

Upgrade:

- Split attempt budget into fixed slices (e.g., 3 slices).
- At slice boundaries, checkpoint best frontier bundles and restart from alternate bundle if progress stalls.
- Use generic progress deltas (must-pass covered, remaining constraints, distance-to-goal lower bound) to trigger bundle switch.

Expected effect: better budget utilization and less dependence on first slice branch luck.

### 3) Frontier diversity constraint

Problem: candidate expansion can become homogeneous and repeatedly chase similar dead-end geometry.

Upgrade:

- Track lightweight frontier signatures (remaining must-pass hash, last-turn pattern class, local obstacle density band).
- Enforce per-signature cap in open set.
- Promote underrepresented signatures when timeout risk rises.

Expected effect: larger effective search coverage with similar node budget.

### 4) Progressive contradiction probes (fast pruning pass)

Problem: some high-expansion branches consume budget before contradictions become apparent.

Upgrade:

- Add periodic shallow contradiction probes every N expansions (small capped DFS/constraint check burst).
- Raise prune priority for branches that repeatedly fail probes.
- Keep thresholds static and global to remain deterministic.

Expected effect: lower wasted expansion in timeout-heavy levels.

### 5) Rapid-collapse recovery extension for low-expansion class

Problem: level 7 stays in low-expansion-collapse family.

Upgrade:

- Add a dedicated recovery template for low-root-frontier signatures that injects forced detour seeds and relaxed early pruning for first M expansions.
- Trigger only from generic predicates already emitted by collapse diagnostics.

Expected effect: turn persistent inconclusive low-expansion failures into either solved or proven-unsat outcomes.

## Instrumentation upgrades to validate improvements

1. Add per-attempt `frontierDiversityScore` and `policyShare` telemetry.
2. Add `sliceProgress` snapshots at budget checkpoints.
3. Emit `rootCandidateSurvival` stats to show whether alternates were explored before timeout.

These metrics will make it clear whether a change improves actual search robustness or only shifts which borderline level fails.

## Immediate execution order

1. Implement deterministic multi-policy root beam + interleaved quotas.
2. Add budget slices with checkpoint restarts.
3. Re-run full audit 3 times and require stable <=6 failures in all runs before further tuning.
4. Then tackle low-expansion collapse template (level-7 family).

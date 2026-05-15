# Level 92 audit-history analysis (through 2026-05-15)

- Samples reviewed: **158** runs from `audits/raw/*.json` where `level==92`.
- Outcome distribution: {'no-solution-inconclusive': 4, 'timeout': 144, 'error': 10} (successes: 0).
- Earliest run: `2026-03-28T20-58-14Z`; latest run: `2026-05-15T08-38-07Z`.

## What has changed in the solver approach

1. **Retry breadth increased**: `attemptCount` moved from early 0-7 patterns to frequent 7-8 and occasional 9-12 runs (max 12).
2. **Root diversification got enabled more often**: `forcedRootDiversity` active in 112/158 runs.
3. **Low-branch mode became the norm**: `lowBranchModeActivated` active in 137/158 runs.
4. **Failure mode consolidated**: dominant terminal state is timeout, with early engineering errors largely reduced.

## What has *not* changed (or has not improved)

1. **No solves at all**: zero `success` outcomes across all 158 sampled L92 attempts.
2. **Near-closure rescue is unused**: `nearClosureRescueActivated` is never true, so the endgame rescue path is not helping L92.
3. **Search still exhausts budget**: despite strategy toggles, status remains predominantly timeout (144/158).
4. **Extra retries did not translate to breakthrough**: higher attempt counts correlate with continued timeout, not solved exits.

## Success trajectory by period
- **early** (111 runs): outcomes={'no-solution-inconclusive': 4, 'timeout': 97, 'error': 10}, avg nodes=6755, avg attempts=6.1, forcedDiversity=65/111, lowBranch=90/111.
- **mid** (14 runs): outcomes={'timeout': 14}, avg nodes=6274, avg attempts=7.5, forcedDiversity=14/14, lowBranch=14/14.
- **late** (33 runs): outcomes={'timeout': 33}, avg nodes=9648, avg attempts=7.1, forcedDiversity=33/33, lowBranch=33/33.

## Opportunities to refine solver for L92

1. **Add an L92-specific late-stage policy switch**: when timeout risk rises (e.g., depth plateaus + repeated root fingerprints), pivot from generic diversification to targeted completion heuristics (intersection closure / must-cross completion).
2. **Activate near-closure rescue earlier for this archetype**: current zero activation suggests thresholding is too strict for L92.
3. **Penalize repeated root families across retries**: retries appear to explore breadth without escaping the same basin; add cross-attempt novelty penalties keyed by root family/fingerprint.
4. **Instrument “distance-to-feasibility” trend per attempt**: track if must-pass/must-cross residuals improve; abort unproductive attempts earlier and reallocate budget to structurally different roots.
5. **Introduce replay-guided branching around known valid path prefixes**: `audits/hint-path-replay/l92-rank.json` indicates replay path validity; use it as a scaffold to bias search toward historically promising corridor families.
6. **Create a dedicated L92 benchmark harness**: gate solver changes on L92-specific metrics (time-to-best-lower-bound, residual constraints at timeout), not only global pass-rate.

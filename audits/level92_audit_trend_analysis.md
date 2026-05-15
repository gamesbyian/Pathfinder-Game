# Level 92 Audit-Log Trend Analysis

## Scope and data source
- Primary source: `audits/metrics/history.ndjson` (full run history through 2026-05-15).
- Spot-check source: `audits/metrics/latest.json` (latest run details for Level 92).

## Executive summary
- **Level 92 was solved only early** (3 times, all by 2026-03-29), then regressed into persistent failure.
- Since then, failures are dominated by **healthy-expansion timeouts** rather than crash-like faults.
- The solver now explores more deeply and with richer telemetry, but this has not translated into success on L92.
- The most promising opportunity is **attempt diversity and targeted rescue logic**: current attempts are highly correlated and repeatedly end in the same frontier shape.

## What has changed over time

### 1) Failure mode shifted from mixed issues to mostly timeout
- Across 163 historical runs containing L92:
  - `success`: 3
  - `no-solution-inconclusive`: 4
  - `error`: 12
  - `timeout`: 144
- Early window (2026-03-28 to 2026-03-29) contains all successes.
- From 2026-04-16 onward, L92 is consistently tagged as `healthy-expansion-timeout` in failure signatures.

### 2) More structured retry ladders are being used
- Recent runs usually spend **7–8 attempts** on L92 (`A`..`G` or `A`..`H`) before cap-reached termination.
- This indicates the orchestration layer is retrying robustly, but not finding qualitatively different branches.

### 3) Search reaches deeper states than earlier attempts
- Latest run reaches depth up to **84** in several attempts (e.g., `D/E/F/H`), with endgame IDA* trigger present.
- This is deeper than many earlier L92 runs, suggesting search stamina improved.

### 4) Telemetry and pruning instrumentation matured
- Latest logs show rich prune accounting (`bound`, `memo`, `dominance`, `other`) and counter-integrity OK.
- This supports confidence in diagnostics: failures appear algorithmic, not observability gaps.

## What has *not* changed (or not improved enough)

### 1) Outcome plateau: no success after 2026-03-29
- Last recorded success for L92 in history is 2026-03-29T23:06:31.614Z.
- No later change-set has restored solvability on this level.

### 2) Retry attempts are not diverse enough
- In latest run, `diversityMetrics` show pairwise overlap/correlation effectively 1.0.
- Multiple attempts (`E/F/H`) are numerically near-identical (same depth 84, same node counts and diagnostics).
- This suggests retries are mostly budget replays, not hypothesis changes.

### 3) Rescue systems are mostly gated off for this level
- `nearClosureRescueEligible` and `nearClosureRescueActivated` remain false.
- Gate miss reason often `repeatedTimeoutOutcome`.
- `endgameIDAStarTriggered` occurs, but contributes negligible expansion (e.g., 1 node, 2 iterations) and no solve.

### 4) Root-space bottleneck persists
- `rootCandidatesGenerated` remains 4 and `rootCandidatesExpanded` 4 in latest run.
- `forcedRootDiversity` is true, but with only 4 roots, downstream variety is constrained.

## Why L92 is likely hard for the current policy
- Feature signature on latest run: `G1|F0|X0|I1` (high-intersection burden archetype).
- Timeout diagnostics repeatedly report no near-solution states and non-trivial lower bound to valid completion (best bound often ~13 late in run).
- Causality fields for L92 frequently show very low obligation-reduction slope and limited frontier diversity change.

## Concrete improvement opportunities

### A) Make retries *structurally distinct* (highest priority)
1. Add **forced policy perturbations** across attempts for L92-like signatures:
   - Explicitly vary ordering policy, scoring mode, and phase policy per attempt family.
   - Include one or two “anti-greedy” attempts that prioritize interaction-deficit reduction over immediate length pressure.
2. Enforce a **minimum divergence contract**:
   - If new attempt’s early prefix matches prior attempt above threshold, auto-reseed/reorder root expansion.
3. Add **attempt novelty scoring** and abort/restart retries that duplicate earlier frontier trajectories.

### B) Expand root hypothesis width adaptively
1. Raise root candidate beam for high-intersection timeout family (e.g., from 4 to 6–8 when repeated timeout signature detected).
2. Include a root-family sampler to ensure attempts touch disjoint root move families rather than re-ranking same 4 roots.

### C) Improve rescue trigger criteria
1. Current near-closure gate appears too strict for L92 (never eligible). Add alternate trigger:
   - fire when repeated timeout + stable best-lower-bound plateau + high depth reached.
2. Strengthen endgame IDA* handoff:
   - trigger earlier than depth 84 for this archetype;
   - allocate guaranteed budget slice and allow broader bound ceiling when repeated timeout family detected.

### D) Target intersection-deficit dynamics directly
1. Add heuristic term to reduce frontierInteractionDeficit histogram mass at high deficit bins.
2. Insert scheduled “intersection harvest phases” earlier in attempt sequence (not only late), with temporary scoring bias.

### E) Add level-family memory (cross-run learning)
1. Persist “failed attempt fingerprints” for Level 92 or its archetype and penalize regenerating them in later runs.
2. Promote historically distinct successful motifs from adjacent levels with similar feature signatures.

## Suggested experiment plan (small, high signal)
1. **Diversity-only patch**: no new pruning, only attempt diversification + divergence guard.
2. **Adaptive root-beam patch** for repeated healthy-expansion timeout levels.
3. **Rescue-threshold patch** for near-closure and endgame IDA* budget.
4. Evaluate on rolling 20-run audit subset and compare:
   - L92 success rate
   - bestLowerBoundToValidSolution minima
   - attempt diversity metrics (overlap/correlation)
   - solve-time regression on already-easy levels.

## Quick interpretation
The solver is no longer “breaking” on L92; it is **consistently doing competent but repetitive search** that times out. The key unlock is not just more budget—it is **more distinct hypotheses and earlier, better-targeted rescue transitions** for this failure family.

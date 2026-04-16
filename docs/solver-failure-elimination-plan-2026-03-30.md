# Solver failure elimination plan (revised 2026-04-12)

> This document **replaces** the previous 2026-03-30 version while keeping the same filename for continuity.

## 1) Current state (validated on latest audit windows)

Using the most recent raw exports and analyzer output, the persistent unsolved set is stable:

- Failing (timeout): **92, 108, 134**
- Solved counterpart in the same family: **135**
- Failure class remains `healthy-expansion-timeout` (not contradiction/pre-expansion collapse)

This indicates the problem is still search quality/completeness under budget, not invalid-level detection.

## 2) What changed since the prior plan

Several ideas from the original plan now appear in code (at least partially):

- Optional non-improving portal filtering instrumentation and rejection path are present.
- Must-cross demand-flow estimate is integrated into must-cross bound diagnostics/pruning context.
- Root suppression / memo / dominance controls are active at depth 0-1.

Despite these additions, the persistent failure set did not clear, so remaining work is about **coverage and ordering efficacy**, not only adding more rules.

## 3) Updated diagnosis by failure family

### Family A — Level 108 (near-solution timeout)

Observed pattern:

- Consistently times out at cap.
- Reaches large near-solution frontier mass but fails to close final branch.

Interpretation:

- This is primarily a **branch ordering + rescue coverage** issue.
- Existing portal filtering helps, but current attempt ladder still misses at least one decisive branch under budget.

### Family B — Levels 92 and 134 (must-cross schedule pressure)

Observed pattern:

- Both remain timeout-class under high node counts.
- Portal removal alone does not explain resolution (134 still fails while 135 solves).

Interpretation:

- Primary issue remains **long-horizon must-cross scheduling**, especially interaction between remaining steps, must-cross revisit obligations, and intersection constraints.

## 4) Replacement execution plan

## Phase 0 — Stabilize and baseline (mandatory first)

0.1 Freeze validation protocol:

1. `npm run audit:newhint:full`
2. `node scripts/analyze-audit-failures.mjs`
3. Save both artifacts and compare against previous run.

0.2 Treat 92/108/134 as a permanent gate in CI-like checks:

- Add a targeted script/check that fails if any of these regress from solved→timeout or remain timeout after intended fix phase.
- Add a collapse-family regression guard for **L7** over rolling windows (fail when L7 is unsolved in 2 consecutive full audits).

Success criteria:

- Every solver change reports explicit before/after for these three levels.

## Phase 1 — Level 108 closure reliability

1.1 Add deterministic root diversification contract:

- Guarantee each distinct depth-0 candidate family receives budget before deepening any one family.
- Prevent early root starvation by memo/dominance interactions in first ply.

1.2 Add “close-the-last-gap” rescue profile:

- Trigger when timeout diagnostics show low lower-bound (e.g., near-closing condition) but no solve.
- Temporarily rebalance scoring toward terminal feasibility and obligation completion over exploration breadth.

1.3 Add audit-visible counters:

- `rescueTriggeredNearClosure`
- `rootFamiliesAttemptedBeforeTimeout`
- `rootFamiliesStarved`

Success criteria:

- Level 108 reaches solved in full audit with no regression on 135.

## Phase 2 — Must-cross schedule solver for 92/134

2.1 Replace independent local lower-bounds with schedule-aware joint bound:

- Build a conservative bound combining:
  - remaining must-pass obligations,
  - must-cross revisit demand,
  - interaction deficit,
  - and path-length slack.

2.2 Introduce must-cross unlock scoring term:

- Score moves by expected reduction in future must-cross infeasibility, not just immediate deficit.
- Reward preserving/reopening corridors required for second visits.

2.3 Add must-cross-specific timeout rescue attempt:

- Late-stage profile that reduces portal bias and maximizes must-cross closure pressure + corridor preservation.

2.4 Add audit-visible counters:

- `mustCrossScheduleInfeasibleFrontierStates`
- `mustCrossUnlockProgressEvents`
- `mustCrossRescueTriggered`

Success criteria:

- Levels 92 and 134 solve in full audit.
- No regressions on currently solved high-length / must-cross levels.

## Phase 3 — Ensure changes are robust (not level-specific overfit)

3.1 Feature-signature slices in analyzer output:

- Report solve/fail deltas by topology bucket (portal optionality, must-cross density, required intersections, long-length class).

3.2 Stability checks over rolling windows:

- Require improvements to hold across at least 3 consecutive full audits.

Success criteria:

- Persistent hard-level set is empty for 3 windows.

## 5) Guardrails / non-goals

- No hardcoded level IDs in solver decision logic.
- No hint seeding from known solution paths.
- Avoid adding heavy brute-force fallbacks that only pass by raising time cap.

## 6) Immediate next implementation order

1. Phase 1.1 root diversification contract
2. Phase 1.2 near-closure rescue profile
3. Phase 2.1 joint schedule bound
4. Phase 2.3 must-cross rescue profile
5. Phase 3 analyzer slice reporting

This order prioritizes converting 108 quickly while building the machinery needed for 92/134.

---

## 7) Proposal in response to latest telemetry review (2026-04-16)

To address review feedback, I propose we stop adding one-off telemetry dump files to `docs/` and instead land focused, testable solver changes in small PRs with before/after metrics.

### Proposed execution slices

### Slice A (first): make diversification/rescue actually fire on L108

Implementation:
- Enforce a strict round-robin first-pass over depth-0 root families before any family gets additional deepening budget.
- Add a hard trigger for the near-closure rescue profile when timeout diagnostics report `bestLowerBoundToValidSolution <= 1` with repeated timeout outcome.
- Log per-attempt activation reason so we can verify rescue engagement instead of inferring from final timeout counters.

Success criteria:
- In 3 consecutive full audits, L108 solves at least once per run and no regression appears on L135.
- `rescueTriggeredNearClosure` becomes non-zero on at least one L108 attempt in those runs.

### Slice B: reduce redundant early attempts on L134

Implementation:
- Add a retry de-duplication guard that blocks scheduling a profile if `(nodesExpanded,maxDepth,nearSolutionByDimension fingerprint)` matches any of the last two attempts.
- If blocked, force next attempt to use an alternate ordering policy with reduced portal preference.

Success criteria:
- Duplicate fingerprint pattern `A->B, B->C` disappears in analyzer output for L134.
- L134 node budget is reallocated to non-duplicate attempts (measurable by increased unique attempt fingerprints).

### Slice C: must-cross schedule pressure for L92

Implementation:
- Introduce a schedule-aware must-cross feasibility scorer in attempt ranking (penalize states likely to trap second-visit obligations).
- Trigger a must-cross rescue attempt when `mustCrossScheduleInfeasibleFrontierStates` grows while lower-bound does not improve.

Success criteria:
- L92 best lower bound trends downward across attempts/runs.
- `mustCrossRescueTriggered` becomes non-zero in failing runs; eventual solve in rolling 3-run window.

### Reporting format for each slice

For each slice PR, include:
1. Exact analyzer command used.
2. Before vs after for levels 92/108/134 only.
3. One short conclusion: solved, improved-but-not-solved, or no improvement.

This keeps telemetry evidence reproducible while avoiding large static log artifacts in source control.

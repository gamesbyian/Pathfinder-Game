# Pathfinder Solver Refactor Master Plan

## Document Purpose

This document defines a comprehensive, stage-gated, audit-driven refactor plan for the Pathfinder solver based on the expert panel diagnosis and the 2026-03-28 to 2026-04-18 audit corpus.

The plan is intentionally structured to:

1. **Fix observability first** so every downstream change can be evaluated reliably.
2. **Separate distinct failure modes** (intersection-heavy vs portal-closure-heavy) before deep architecture changes.
3. **Introduce complete-search guarantees** (IDA*-style bounded search) once instrumentation and mode routing are stable.
4. **Increase pruning and learning power** only after baseline behavior is trustworthy.
5. **Consolidate to a simpler, principled two-layer architecture** and retire unstable adaptive complexity.

---

## Baseline Facts (Reference State)

### Audit corpus summary
- Runs: **96**
- Levels: **137**
- Total nodes expanded: **~3.87M**
- Period: **2026-03-28 to 2026-04-18**

### Chronic failures
- **Level 92**: 92/92 failures
- **Level 108**: 92/92 failures
- **Level 134**: 53/53 failures

### Intermittent failure cluster
- **Level 26**: 31/92 failures (34%)
- **Level 7**: 27/92 failures (29%)
- **Level 61**: 24/92 failures (26%)
- **Level 47**: 12/92 failures (13%)

### Core evidence from audits
1. **Attempts are not genuinely diverse** in hard cases.
2. **Intersection-deficit is largely unreduced** in high-`reqInt` failures.
3. Dominant failure category is **healthy-expansion-timeout**, not velocity collapse.
4. **Prune counters appear all-zero**, indicating a critical instrumentation gap or propagation bug.
5. **Level 108-like closure trap** is distinct from intersection-heavy failures.

---

## Strategic Principles

1. **No algorithmic conclusions without trustworthy counters.**
2. **Gate each refactor segment with explicit audit criteria.**
3. **Do not combine major search rewrites in the same milestone.**
4. **Track regressions on the full level set (not only hard levels).**
5. **Treat reproducibility as a first-class requirement** (seeded runs, profile hashes, deterministic logging schema).

---

## Program Structure

The refactor is divided into eight segments with hard gates:

- Segment 0: Observability repair
- Segment 1: Real portfolio diversification
- Segment 2: Failure-mode classifier + routing
- Segment 3: Mode A solver (intersection pre-planning)
- Segment 4: Mode B solver (backward/bidirectional closure)
- Segment 5: Core search upgrade (IDA* threshold framework)
- Segment 6: Learning + pruning upgrades (coarse memo, nogoods, backjumping)
- Segment 7: Two-layer architecture consolidation + adaptive system retirement

Each segment includes:
- Scope and implementation work
- Required telemetry additions
- Experiment design
- Acceptance criteria
- Failure contingencies
- Deliverables

---

## Segment 0 — Observability Repair (Gate A)

### Objective
Restore trust in metrics, especially prune/memo counters, before any algorithmic interpretation.

### Scope
- `debugStats` end-to-end wiring from in-solver accumulation to persisted attempt records.
- Attempt-level and aggregate-level counter integrity.

### Implementation tasks
1. Audit stats lifecycle:
   - Initialization
   - Mutation points
   - Merge/aggregation
   - Serialization/export
2. Eliminate silent defaulting/overwrites to zero during object merges.
3. Add `counterIntegrityStatus` at attempt finalization.
4. Add provenance metadata:
   - producer module
   - producer function
   - producer version/hash
5. Add invariants:
   - If `expandedNodes > 0`, at least one meaningful search/progress/prune counter must be nontrivial.
   - If internal prune counters are non-zero but exported prune counters are zero, mark telemetry error.
6. Add schema checks to CI for required audit fields.

### New telemetry required
- `pruneBreakdown` (bound/memo/dominance/nogood/backjump-related)
- `memoHitRate`
- `dominanceHitRate`
- `counterIntegrityStatus`
- `statsProvenance`

### Evaluation protocol
- Re-run representative subset:
  - Hard levels: 92, 108, 134
  - Mixed easy/medium sample (at least 15 levels)
- Compare internal vs exported counters.

### Acceptance criteria (Gate A)
- No all-zero pathological prune profile across entire validation sample.
- Counter integrity checks pass for 100% of attempts.
- Audit exports contain all required fields.

### Contingency
If any integrity check fails, **block Segment 1+** and repair telemetry first.

### Deliverables
- Telemetry schema update
- Counter propagation fix
- Validation report with before/after counter snapshots

---

## Segment 1 — Portfolio Diversification Rebuild (Gate B)

### Objective
Ensure multi-attempt solving produces truly different search trajectories.

### Scope
Replace pseudo-diversity (near-identical attempts) with explicit, measurable portfolio diversity.

### Implementation tasks
1. Define 4–6 profile families with hard behavioral differences:
   - Goal-distance dominant
   - Obligation-first (mustPass/mustCross/intersection)
   - Portal-conservative
   - Portal-aggressive
   - Randomized high-entropy tie-break
   - Endgame closure-priority
2. Freeze profile identity:
   - `policyProfileId`
   - immutable config hash
3. Seed design:
   - deterministic seed = `(globalSeed, levelId, attemptId, profileId)`
4. Remove/limit mid-run policy oscillation that erases attempt identity.
5. Add diversity metrics:
   - `frontierDiversityDelta`
   - visited-state overlap across attempts
   - early branching rank-correlation
6. Add minimum diversity threshold; regenerate weakly-diverse attempts.

### Diversity metrics wiring (Option A — required approach)

The raw `attemptsUsed` array **must never be attached to `solverResult`** or
allowed to flow through `createCanonicalSolveResult` and into `runHintLadder`.
Those objects are large, contain complex nested fields, and cause serialization
exceptions in `toAuditRefereeAttemptHistory` that silently swallow the hint
result and produce `status:"error"` / `attemptCount:0` across all affected levels.

The safe pattern is:

1. Inside `solveLevel`, **before** calling `createCanonicalSolveResult`, call
   `computeLevelDiversityMetrics(attemptsUsed)` while `attemptsUsed` is still
   in scope.
2. Assign the returned scalar/plain-object result to a dedicated key on
   `solverResult` **after** canonicalization:

   ```js
   const _diversityMetrics = computeLevelDiversityMetrics(attemptsUsed);
   solverResult = createCanonicalSolveResult(solverResult || {});
   solverResult.portfolioDiversityMetrics = _diversityMetrics;
   ```

3. `runHintLadder` reads `hintRes.portfolioDiversityMetrics` — no raw attempt
   objects ever leave `solveLevel`.

This approach was chosen over alternatives because:
- No large objects flow through the hint ladder loop (no exception risk).
- `toAuditAttemptSummary` / `toAuditRefereeAttemptHistory` never see the raw
  attempts (regression-safe).
- `computeLevelDiversityMetrics` already exists and has access to everything
  it needs at the `solveLevel` call site.

**Do not use** the `_preCanonAttempts` pattern (preserving `attemptsUsed` across
canonicalization and re-attaching to `solverResult`) — this was the root cause
of the 133-level regression introduced in commit `de16858` and partially reverted
by `b54cd5d` before being fully reverted in `0401458`.

### New telemetry required
- `policyProfileId`
- `policyConfigHash`
- `attemptSeed`
- `pairwiseStateOverlap`
- `branchDecisionCorrelation`
- `portfolioDiversityMetrics` (computed in-place inside `solveLevel` via Option A above)

### Evaluation protocol
- Run hard set + intermittent set with fixed total node budgets.
- Compare pairwise overlap and solve lift.

### Acceptance criteria (Gate B)
- Positive and meaningful diversity metrics on hard levels.
- Clear profile separation in trajectory diagnostics.
- Reduced repeated-subtree behavior.

### Contingency
If diversity remains low, add orthogonal perturbations (move ordering randomization, different obligation scheduling strategies).

### Deliverables
- Profile library
- Diversity dashboard
- A/B report (old portfolio vs new portfolio)

---

## Segment 2 — Failure-Mode Classifier & Solver Routing (Gate C)

### Objective
Operationalize the empirically distinct failure modes and route levels to specialized pipelines.

### Mode definitions
- **Mode A (Intersection-heavy):** high `reqInt`, persistent intersection deficit, near-zero schedule progress.
- **Mode B (Portal closure trap):** frequent depth completion near reqLen with many near-solution states and failed closure.
- **Mode M (Mixed/uncertain):** ambiguous signals; split budget across A/B pipelines.

### Implementation tasks
1. Feature extraction pre-solve and early-solve:
   - static level features
   - first-window telemetry features
2. Implement lightweight classifier (rules first, then optional learned model).
3. Route attempt budgets by predicted mode.
4. Log prediction confidence and post-run observed mode.
5. Produce confusion matrix and threshold tuning scripts.

### New telemetry required
- `predictedMode`
- `predictionConfidence`
- `observedFailureSignature`
- classifier features snapshot

### Evaluation protocol
- Backtest on historical audit corpus.
- Validate on fresh run set not used for threshold tuning.

### Acceptance criteria (Gate C)
- Strong precision/recall for A/B separation on known hard levels.
- Routed pipelines outperform generic baseline under equal budgets.

### Contingency
If classifier uncertainty is high, default to hybrid budget split until confidence model stabilizes.

### Deliverables
- Mode classifier implementation
- Routing policy
- Backtest + holdout validation report

---

## Segment 3 — Mode A Solver: Intersection Pre-Planning (Gate D)

### Objective
Resolve persistent high-intersection-deficit failures by proactively planning intersections instead of reactive handling.

### Implementation tasks
1. Build crossing-eligible cell generator:
   - local degree/topology constraints
   - filter compatibility
   - portal reachability compatibility
2. Construct candidate intersection plans (size = `reqInt`) with feasibility scoring.
3. Add symmetry reduction to avoid redundant plans.
4. Integrate plan execution model:
   - early soft guidance
   - escalating constraint weight as `stepsRemaining` shrinks
5. Add plan-failure detection and failover to alternative plan.
6. Track per-plan outcomes for offline ranking improvements.

### New telemetry required
- `intersectionPlanId`
- `intersectionPlanScore`
- `intersectionPlanProgress`
- `planSwitchCount`
- failure reasons by plan

### Evaluation protocol
- Target cohort: levels 92, 61, 26, 7 plus controls.
- Compare deficit trajectories over depth percentiles.

### Acceptance criteria (Gate D)
- Significant reduction in persistent max-deficit frontier states.
- Improved solve rate on high-`reqInt` cohort.
- Stable behavior across seeds (no single-seed luck dependence).

### Contingency
If plans stall early, increase candidate pool diversity and add lookahead feasibility tests before committing.

### Deliverables
- Intersection planner module
- Plan telemetry + ranking report
- Cohort solve-rate delta report

---

## Segment 4 — Mode B Solver: Backward/Bidirectional Closure (Gate E)

### Objective
Solve portal-topology closure failures by adding goal-backward reasoning and meet-in-the-middle closure checks.

### Implementation tasks
1. Implement reverse or predecessor transition logic across portals/filters/flips.
2. Build backward closure index keyed by remaining steps and essential constraints.
3. During forward expansion, query compatibility with backward closure states.
4. Introduce closure-aware branch prioritization.
5. Add pruning when no compatible backward closure exists.
6. Instrument closure match attempts and rejection causes.

### New telemetry required
- `closureMatchAttempts`
- `closureMatches`
- `closureRejectReasonBreakdown`
- backward index stats (size, hit rate)

### Evaluation protocol
- Target cohort: levels 108 and 134 first, then broader portal-heavy set.
- Compare “near-solution but no close” signature before/after.

### Acceptance criteria (Gate E)
- Increased successful closure matches.
- Reduced depth-complete dead-end populations.
- Meaningful solve lift on portal-hard cohort.

### Contingency
If reverse transitions are expensive, cache by level topology and reuse across attempts.

### Deliverables
- Backward closure module
- Meet-in-middle integration
- Portal-hard benchmark report

---

## Segment 5 — Core Search Upgrade to IDA*-Style Thresholding (Gate F)

### Objective
Replace greedy DFS commitment behavior with bounded complete search progression.

### Implementation tasks
1. Introduce iterative threshold loop over `f = g + h_lb`.
2. Rework expansion loop to respect threshold admissibility.
3. Keep heuristic scoring as tie-breaker only within admissible bounds.
4. Preserve strict feasibility pruning checks.
5. Add threshold telemetry and per-threshold expansion accounting.
6. Validate monotonic threshold progression behavior.

### Admissibility audit tasks
1. Formal review of each lower bound component:
   - distance-to-goal
   - parity
   - must-pass and must-cross estimates
   - MST/DP behavior under portal shortcuts
2. Add targeted adversarial unit tests for potential overestimation scenarios.
3. Mark any non-admissible heuristic as non-binding scoring signal only.

### New telemetry required
- `idaThresholdCurrent`
- `idaThresholdNext`
- `nodesPerThreshold`
- `firstSolutionThreshold`
- `boundPruneRate`

### Evaluation protocol
- Compare against pre-IDA baseline under equal time and node caps.
- Evaluate consistency across multiple seeds.

### Acceptance criteria (Gate F)
- Bound correctness validated by tests.
- Improved hard-level solve outcomes and/or stronger partial-progress guarantees.
- Lower run-to-run variance than greedy DFS baseline.

### Contingency
If threshold growth is too coarse, refine next-threshold scheduling and bound granularity.

### Deliverables
- IDA* search loop implementation
- Bound admissibility test suite
- Comparative benchmark report

---

## Segment 6 — Pruning and Learning Upgrade (Gate G)

### Objective
Increase pruning hit rates and reduce wasted chronological exploration using stronger abstraction and learned nogoods.

### Implementation tasks
1. Implement coarser canonical memo key (position + steps + obligation state + minimal feature state).
2. Add hybrid safety for portal-history-sensitive cases:
   - coarse-first
   - selective fallback to fine key
3. Replace exact-state-only fail memo with subsumption-based nogoods.
4. Add conflict attribution signals (which obligation/constraint failed).
5. Implement non-chronological backjumping to relevant decision depth.
6. Add regression checks for over-pruning risk.

### New telemetry required
- `coarseMemoHitRate`
- `fineMemoHitRate`
- `nogoodHitRate`
- `backjumpCount`
- `avgBackjumpDistance`
- false-prune sentinel checks

### Evaluation protocol
- Run hard + intermittent + full-regression sets.
- Compare prune efficiency and solve lift.

### Acceptance criteria (Gate G)
- Significant rise in effective prune hits.
- Reduced wasted backtracking chains.
- No systematic false infeasibility regressions.

### Contingency
If over-pruning suspected, tighten subsumption conditions and widen fallback usage.

### Deliverables
- Memo abstraction refactor
- Nogood/backjump module
- Safety regression report

---

## Segment 7 — Two-Layer Architecture Consolidation (Gate H)

### Objective
Consolidate gains into a simpler and more robust architecture; retire brittle adaptive machinery.

### Target architecture
- **Layer 1:** global plan synthesis
  - waypoint order selection
  - step-budget allocation with parity/distance checks
- **Layer 2:** segment-level constrained solvers
  - bidirectional search
  - local obligation handling

### Implementation tasks
1. Implement Layer 1 planner with feasibility pruning.
2. Implement Layer 2 segment solver interfaces.
3. Orchestrate plan portfolio under shared timeout and first-valid completion.
4. Remove/disable legacy adaptive guardrail thrash mechanisms once replacement passes benchmarks.
5. Freeze benchmark harness and reporting format.

### New telemetry required
- `globalPlanId`
- `segmentSolveStats`
- plan feasibility rejection reasons
- layer-level time/node budget use

### Evaluation protocol
- Full 137-level regression.
- Hard-cohort stress with expanded attempt counts.
- Stability tests across seeds/config variants.

### Acceptance criteria (Gate H)
- Material reduction in hard-level failures vs baseline.
- Stable, interpretable telemetry.
- No broad regressions on previously stable levels.
- Legacy adaptive components no longer required for competitiveness.

### Contingency
If decomposition overhead dominates on tiny levels, keep a fast-path solver bypass for trivial instances.

### Deliverables
- Two-layer solver implementation
- Legacy feature retirement plan
- Final benchmark + architecture report

---

## Cross-Segment Benchmarking & Governance

### Benchmark tiers
1. **Tier 1 Hard:** 92, 108, 134
2. **Tier 2 Intermittent:** 26, 7, 61, 47
3. **Tier 3 Full Regression:** all 137 levels

### Run protocol standards
- Fixed seed suites + rotating seed suites
- Fixed budget comparisons (time and nodes)
- Confidence intervals for solve rates and key telemetry

### Mandatory report content per gate
- Summary table (before/after)
- Failure category shifts
- Telemetry integrity checks
- Reproducibility notes
- Known regressions + mitigation plan

### Gate policy
- No progression if gate fails.
- No cross-segment scope creep unless gate risk requires it.
- Every gate must include explicit rollback notes.

---

## Suggested Timeline (Indicative)

- **Week 1:** Segment 0
- **Week 2:** Segment 1
- **Week 3:** Segment 2
- **Weeks 4–5:** Segments 3 and 4 (parallel if staffing allows)
- **Week 6:** Segment 5
- **Week 7:** Segment 6
- **Weeks 8–9:** Segment 7 + full stabilization

This timeline assumes dedicated engineering capacity and stable CI/audit infrastructure.

---

## Risk Register

1. **Telemetry misinterpretation risk**
   - Mitigation: strict schema + invariants + provenance tags.
2. **Over-pruning false infeasibility risk**
   - Mitigation: conservative fallback mode + sentinel regression suite.
3. **Classifier misrouting risk**
   - Mitigation: confidence-thresholded hybrid routing.
4. **Complexity creep risk**
   - Mitigation: hard deprecation criteria for legacy adaptive components.
5. **Performance regressions on easy levels**
   - Mitigation: fast-path bypass and tiered benchmark gating.

---

## Definition of Success

The program is successful when all of the following are true:

1. Hard-level failure rates (especially 92/108/134) are materially reduced.
2. High-`reqInt` failures show real intersection schedule progress rather than persistent max-deficit plateaus.
3. Portal-hard closure levels no longer produce large near-solution dead populations without closure.
4. Telemetry is complete, trustworthy, and diagnostic for every attempt.
5. Solver architecture is simpler, more principled, and less dependent on brittle mid-run policy switching.

---

## Immediate Next Step

Start with **Segment 0 (observability repair)** immediately. No further algorithmic conclusions should be accepted until Gate A is passed.

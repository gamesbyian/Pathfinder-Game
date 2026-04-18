# Pathfinder Solver Refactor Status Review (2026-04-18)

## Inputs reviewed
- Refactor plan: `docs/pathfinder-solver-refactor-plan.md`.
- Latest metrics audit log: `audits/metrics/latest.json` (timestamp `2026-04-18T20:43:35.200Z`).
- Latest raw audit log: `audits/raw/latest.json`.
- Recent audit history: tail entries from `audits/metrics/history.ndjson`.

## What appears implemented vs the plan

### Segment 0 (Observability Repair) — **Partially implemented; Gate A not passed yet**
Evidence of implementation work:
- Attempt records now include the planned observability fields (`pruneBreakdown`, `memoHitRate`, `dominanceHitRate`, `nogoodHitRate`, `counterIntegrityStatus`, `statsProvenance`) in latest raw audit output.

Evidence gate is still failing:
- For the latest run, these fields are present but null across attempts (e.g., `pruneBreakdown: null`, `counterIntegrityStatus: null`, `statsProvenance: null`).
- This still matches the plan’s pre-refactor failure signature (“prune counters appear all-zero / instrumentation gap”).
- Gate A requires non-pathological prune profiles and passing counter-integrity checks, which is not demonstrated in latest logs.

Assessment:
- Schema/plumbing hooks seem present, but counter propagation and integrity computation are not finished.

### Segment 1 (Portfolio diversification) — **Not implemented (or not active in production path)**
Expected telemetry per plan includes `policyProfileId`, `policyConfigHash`, `attemptSeed`, overlap/correlation diversity metrics.

Latest logs show:
- No `policyProfileId`, `policyConfigHash`, `attemptSeed`, `pairwiseStateOverlap`, or `branchDecisionCorrelation` fields.
- Existing `policyProfile` value is consistently `"unknown"` in attempts, indicating no meaningful profile identity freezing/diversity telemetry yet.

Assessment:
- Segment 1 gate expectations are not currently met.

### Segment 2 (Failure-mode classifier + routing) — **Not implemented**
Expected telemetry includes `predictedMode`, `predictionConfidence`, `observedFailureSignature`.

Latest logs show none of these fields.

Assessment:
- No evidence of mode classifier/routing pipeline in audit output.

### Segments 3–7 (specialized solvers, IDA*, learning/pruning upgrades, architecture consolidation) — **No direct evidence in latest audit schema**
Expected telemetry for these segments is absent in latest logs:
- Segment 3: no `intersectionPlan*` fields.
- Segment 4: no `closureMatch*` fields.
- Segment 5: no `idaThreshold*` fields.
- Segment 6: no `coarseMemoHitRate` / `backjump*` fields.
- Segment 7: no `globalPlanId` / segment-solver telemetry fields.

Assessment:
- No audit-log evidence that these segments are implemented yet.

## Latest audit posture (2026-04-18)
- Latest run (`2026-04-18T20:43:35.200Z`) solved 133/137 levels; failing set is `[7, 92, 108, 134]`.
- The three chronic hard levels (92/108/134) remain unsolved in latest run.
- Recent history on 2026-04-18 fluctuates between 3 and 5 failing levels; hard failures persist and level 7/61 intermittently reappear.

## Recommended next steps (strictly aligned to plan gates)
1. **Finish Segment 0 and enforce Gate A before any algorithmic segment work.**
   - Implement actual `counterIntegrityStatus` computation with explicit pass/fail values.
   - Ensure `statsProvenance` is always populated.
   - Backfill non-null `pruneBreakdown` and hit-rate counters from solver internals.
   - Add hard invariant checks at export time (fail fast if counters are missing when `nodesExpanded > 0`).

2. **Add a tiny Gate-A validation script in CI.**
   - Read the latest raw/metrics export and assert:
     - required Segment-0 fields exist,
     - required fields are non-null for non-trivial attempts,
     - at least one prune-related counter is non-zero somewhere in a representative hard-level run.

3. **Only after Gate A passes: implement Segment 1 minimally but fully measurable.**
   - Introduce 4 fixed profile IDs and deterministic attempt seeds.
   - Emit `policyProfileId`, `policyConfigHash`, `attemptSeed`.
   - Add a first-cut overlap metric (`pairwiseStateOverlap`) to prove trajectory diversity.

4. **Then implement Segment 2 rules-based classifier as light routing scaffolding.**
   - Start with deterministic rules over existing causality/failure signatures.
   - Emit `predictedMode`, `predictionConfidence`, `observedFailureSignature` and validate with backtest script.

5. **Defer Segments 3–7 until telemetry + routing are trustworthy.**
   - This is explicitly required by the plan’s gate policy and immediate next-step section.

## Practical execution order for the next 1–2 weeks
- Week 1:
  - close Segment 0 counter propagation and integrity,
  - add CI schema/invariant gate,
  - run focused validation on levels 92/108/134 + mixed sample.
- Week 2:
  - ship measurable Segment 1 profile/seed telemetry,
  - run diversity A/B and confirm reduced repeated-attempt behavior.
- Start Week 3 only if Gates A and B pass:
  - add Segment 2 classifier+routing and holdout validation.

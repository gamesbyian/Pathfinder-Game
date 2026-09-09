# Stage-lifecycle instantiation projection gap 001

> **Status:** active
> **Last evidence:** 2026-09-09 — current `modules/solver/orchestration.ts`, `stage-plan.ts`, and `stage-policy.ts` on the portal-restoration evidence-hardening branch
> **Decision:** repair the lifecycle `instantiated` projection before the next production/capability refresh. Two live canonical stages are present in the stage plan and can execute, but are absent from the hand-maintained instantiation map, so their `mechanicallyEligible` / `instantiated` telemetry is falsely reported as `false`.
> **Remaining gate:** add the two missing projections plus a regression test, keep solver behaviour unchanged, then regenerate any eligibility-filtered telemetry used for post-restoration opportunity sizing.
> **Evidence role:** telemetry correctness / research-integrity prerequisite

## Finding

`solveLevel()` builds lifecycle `runnable` state from `buildSolverStagePlan()`. That plan already has canonical entries and eligibility booleans for:

- `guidance-goal-distance-retry`;
- `late-repair-multiseed-retry`.

Immediately afterward, `finish()` separately constructs a hand-maintained `instantiated` map. That map currently ends at `late-repair-search` and omits both newer stages. Lifecycle rows are then projected with:

```text
mechanicallyEligible: instantiated.get(name) === true
instantiated: instantiated.get(name) === true
```

Because the missing lookup returns `undefined`, both fields become `false` even when the corresponding stage is mechanically available and can later produce attempts.

This does **not** change search behaviour, stage execution, `workSpent`, winning-stage attribution, or attempt identity. It corrupts only the lifecycle eligibility/instantiation projection. The practical risk is downstream analysis that filters or prices opportunities using `mechanicallyEligible` / `instantiated`: those consumers can undercount the two stages or misclassify genuine exposure as structural ineligibility.

## Minimal source repair

In the existing `instantiated` map inside `orchestration.ts`:

- add `['guidance-goal-distance-retry', hasMainConfig]`;
- add `['late-repair-multiseed-retry', !hasRepairConfig]`.

The second polarity deliberately matches the late-repair treatment family: these stages are constructed for the population that has no configured repair fallback. Do not infer it from `SolverStageSpec.attemptSource === 'configured-repair'`; the late-repair stages synthesize their repair attempt and therefore have the opposite configuration precondition from ordinary `repair-fallback`.

No scheduler, budget, routing, or search-policy change is needed.

## Regression coverage

Add a lifecycle-telemetry test using a simple level with a main config and no configured repair fallback. Require both rows to exist and report:

```text
guidance-goal-distance-retry.mechanicallyEligible === true
guidance-goal-distance-retry.instantiated === true
late-repair-multiseed-retry.mechanicallyEligible === true
late-repair-multiseed-retry.instantiated === true
```

The test does not need either late stage to win or even run. The defect is the structural projection itself.

A stronger follow-up is worthwhile if this area is edited again: derive the instantiation decision from the canonical stage-plan/spec metadata where possible, with explicit exceptions for the late-repair family, or add an invariant that every lifecycle `runnable` row has an explicit instantiation decision. That would turn future stage additions from silent `false` projections into visible test failures.

## Research consequence

The current committed production boundary remains usable for solve counts, attempt work, reached-stage participation, and winning-stage attribution. Treat any analysis that depends on `mechanicallyEligible` / `instantiated` for these two stages as suspect until the projection is repaired and rerun.

Before the post-portal-restoration refresh feeds WS2B repricing or WS1 residual classification, fix this projection first. Otherwise the new boundary could repeat the same eligibility undercount and contaminate the exact opportunity-sizing work the refresh is meant to clean up.

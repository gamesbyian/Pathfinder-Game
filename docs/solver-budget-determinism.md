# Solver work budgets and determinism

> **Status:** current contract.
> **Priority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **Allocation policy:** [`solver-scheduling-policy.md`](solver-scheduling-policy.md).
> **Pre-consolidation migration narrative:** [`archive/snapshots/solver-budget-determinism-2026-09-04-pre-consolidation.md`](archive/snapshots/solver-budget-determinism-2026-09-04-pre-consolidation.md).

Solver allocation uses machine-independent **work**. Wall time is a latency/safety constraint, not a search-allocation currency.

## Work unit

[`../modules/solver/work-meter.ts`](../modules/solver/work-meter.ts):

```text
work = applyMove calls + 12 * isConnected calls
```

Use `workSpent` for cross-technique search cost. Raw nodes are within-technique diagnostics. Wall time measures implementation/runtime cost. Work is an allocation currency, not a claim that the weighted primitives have identical literal CPU cost on every machine.

## Work scopes

| Counter | Scope / authority |
|---|---|
| `prep._workMeter.units` | Fresh per `solveLevel()`; authority for internal caps, allocation, and `SolveResult.workSpent` |
| module-global `workMeter.units` | Monotonic realm/process discovery counter; **not** a solve-budget authority |

Concurrent solves cannot consume one another's `prep._workMeter`. Multi-solve tooling that needs an isolated session budget should sum each call's `SolveResult.workSpent` or use a caller-owned session counter, not infer a session budget from the realm-global meter.

## Budget roles

| Field | Role |
|---|---|
| `baseWorkBudget` | Preferred name for the deterministic base allocation |
| `workBudget` | Compatibility alias for `baseWorkBudget`; conflicting simultaneous values are an error |
| `strictTotalWorkBudget` | Makes the configured work budget an immutable whole-solve ceiling |
| `nodeBudget` | Deterministic within-technique/local diagnostic guard; not portable cross-technique cost |
| `timeBudgetMs` | Outer latency/safety deadline; must not control deterministic allocation when an explicit work budget is supplied |

If work is omitted by an ms-shaped compatibility caller, the boundary converts once through `modules/solver/budget-units.ts` using `LEGACY_MS_TO_WORK_RATE`. Do not copy that calibration elsewhere or derive allocation from live host throughput.

## Base versus total work

Under ordinary production/offline-ladder semantics, `workBudget` is historically a **base allocation**, not necessarily the whole-solve cost. Additive stages can receive fresh deterministic work beyond it. Therefore:

- `workSpent > workBudget` can be legal;
- equal base budgets do not prove equal treatment cost when additive-stage reach differs;
- use `strictTotalWorkBudget: true` for matched experiments that require a true shared envelope;
- changing default production to strict-total semantics is a policy change and requires solve-retention evidence.

New APIs should prefer explicit `baseWorkBudget` / `totalWorkCap` language rather than extending the historical ambiguity.

## Current migration state

The old pattern in which additive tiers re-converted `timeBudgetMs` into fresh work is **closed**. Nine work-dose sites were migrated to work-derived sizing, and whole-ladder tests now check that changing a non-binding deadline does not resize their explicit-work trajectories.

Current exceptions are different in kind:

- **`admissible-order-fallback`:** installs no fresh soft `_workCap`, but the dispatched `admissibleOrderSearch` does not consult that soft cap outside the opt-in equal-work research harness. This was verified harmless; no migration/fix is pending.
- **`goal-attraction-disabled-retry`:** deliberately shares the already-depleting outer work pool rather than owning a fresh pool. This is not ms-to-work debt. Existing evidence shows the shared work dimension can starve otherwise eligible attempts, so changing it would be a genuine allocation-policy experiment, not cleanup. It is not automatically the current Workstream-2 priority.

`scripts/check-solver-budget-boundaries.mjs` is the ratchet. New time-derived allocation sites are forbidden. The only approved direct ms→work conversion is the centralized boundary resolution used when no explicit work budget exists.

Historical per-tier migration evidence remains in dated reports and the pre-consolidation snapshot; do not append that chronology back into this contract.

## Determinism contract

With equal level/configuration/seed and equal deterministic allocation, a **non-binding** wall deadline must not change the search trajectory merely because host speed/load changes.

For decision-bearing offline comparisons:

1. pin the work envelope;
2. keep wall deadlines non-binding;
3. record and reject/separately classify `deadlineTruncated`;
4. compare `workSpent` for cross-technique/treatment cost;
5. record commit, protocol, flags, corpus, and budget semantics.

A binding historical wall deadline may be useful for continuity, but it is not machine-independent causal evidence.

## Deadline truncation

`deadlineTruncated` means the requested deterministic search did not complete before the latency envelope. It is not ordinary unsolved-at-work evidence. Offline tools must expose it and exclude or classify it separately in decision-bearing comparisons.

Clock-shaped compatibility names such as `--wall-ms` or `wallClockDeadlineMs` may survive in old APIs even where the implementation converts once to work and never gates search extent on `Date.now()`. Treat names according to the owning implementation, not by string inference.

## Scheduler-envelope rules

Detailed scheduling policy lives in [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Budget-specific invariants are:

- adding an action/configuration does not grant free aggregate work;
- protected minima/tranches must be visible inside the shared envelope;
- retries/tails must displace weaker work, be conditionally routed, or explicitly justify a larger envelope;
- scheduler decisions cannot depend on live host speed or wall-derived throughput;
- during matched scheduler A/Bs, prefer `strictTotalWorkBudget` when legacy additive semantics would otherwise make total treatment cost differ;
- if strict containment is intentionally not used, report the actual total-work difference as part of the treatment.

Technique-specific depth/cap evidence belongs in the reports and scheduling policy, not here. Use node-depth curves to understand one technique; use `workSpent` to compare its tranche against other actions.

## Provenance units

Keep units explicit in solver/hint/research artifacts:

- `workSpent`: comparable algorithmic allocation cost;
- `workBudget` / `baseWorkBudget`: deterministic allocation input;
- `strictTotalWorkBudget`: whole-solve-envelope mode;
- `deadlineTruncated`: wall interference;
- `nodesExpanded`: within-technique diagnostic/legacy measure;
- `elapsedMs`: runtime latency.

Never silently compare or merge node and work values.

## Offline workflow control

Level-blind sweep/confirmation workflows expose `strict_total_work_budget` where matched whole-solve envelopes are needed. A workflow's `node_budget` or base `workBudget` must not be described as a whole-solve ceiling unless strict-total semantics actually make it one.

When a workflow or tool changes budget semantics, update its input description and evidence/report contract at the same time.

# Solver work budgets and determinism

> **Status:** current contract; migration complete.
> **History:** [`archive/snapshots/solver-budget-determinism-2026-08-20.md`](archive/snapshots/solver-budget-determinism-2026-08-20.md).

Solver allocation uses one machine-independent work currency; wall clock is only an outer latency deadline.

## Work unit

[`../modules/solver/work-meter.ts`](../modules/solver/work-meter.ts):

```text
work = applyMove calls + 12 * isConnected calls
```

The fitted connectivity weight reduced DFS/beam/repair work-rate spread from ~11x under `nodesExpanded` to ~1.02x under `workSpent`. Raw nodes are comparable only within a technique.

`workSpent` is an allocation currency, not literal CPU cost: the weight fairly divides finite search across techniques but does not claim every `isConnected()` costs exactly 12 `applyMove()` calls. A pure implementation optimization may reduce wall time with unchanged work; a policy change may reduce work without making primitives faster.

Use pinned work for deterministic search-effort/policy comparisons. For hot-path speed, also report wall time and whether primitive cost changes. Matched work alone cannot prove an implementation speedup.

## Work scopes

Both counters use the same work unit:

| Counter | Scope / authority |
|---|---|
| `prep._workMeter.units` | Fresh per `solveLevel()`. Authority for internal caps, attempt allocation, and `SolveResult.workSpent`; concurrent solves cannot consume each other's budgets. |
| module-global `workMeter.units` | Monotonic realm/process total for discovery tooling spanning sequential black-box solves. Not a solve-budget authority. |

`applyMove()` and `isConnected()` increment both. Keep internal checks on `prep._workMeter`; cumulative tooling must not assume the global counter is session-isolated when unrelated solves can coexist. Isolated multi-solve budgets should use caller-owned scope or sum `SolveResult.workSpent`. Migration direction: [`architecture-unification-audit.md`](architecture-unification-audit.md).

## Budget roles

| Field | Role |
|---|---|
| `workBudget` | Primary cross-technique machine-independent budget. Pin for CI/A-B/benchmarks/research/reproducible diagnostics. |
| `timeBudgetMs` | Outer latency/safety deadline; may truncate but must not size attempt shares. |
| `nodeBudget` | Legacy/diagnostic or technique-specific cap; not portable cross-technique currency. |
| `strictTotalWorkBudget` | Experiment-only whole-solve ceiling when additive retry/tail tiers must fit one envelope. |

If `workBudget` is omitted, ms-shaped callers convert at the run boundary using committed work-per-ms calibration; live host speed never controls allocation.

## Reproducible comparison

For decision-bearing offline work:

1. pin `workBudget`;
2. use non-binding `timeBudgetMs` or deterministic workflow mode;
3. exclude/separately classify `deadlineTruncated`;
4. compare `workSpent` for cost;
5. record protocol, commit, flags, corpus, budget.

Equal level/config/seed/work budget with non-binding deadline is deterministic across host speed/load. Remote A/Bs: `solver-typical-budget-baseline.yml` with `deterministic: true`. Binding historical baselines may preserve continuity but are not machine-independent causal evidence.

## Deadline truncation

A wall deadline can end a solve before its work budget. `deadlineTruncated` means requested deterministic search did not complete within the latency envelope, not reproducible unsolved-at-budget evidence. Offline tools must exclude or label it.

## Hint discovery and provenance

Phase/escalation decisions use work, not elapsed time; cooperative yielding/latency reporting may read the clock.

- `workSpent`: comparable algorithmic cost.
- `workBudget`: intended deterministic ceiling.
- `deadlineTruncated`: wall interference.
- `nodesExpanded`: within-technique diagnostics/legacy data.
- `elapsedMs`: runtime latency.

Label units in old/new provenance; never mix nodes and work silently.

## Matched-work experiments

Declare whether additive retries/passes are inside the envelope. If treatment can spend extra work, use `strictTotalWorkBudget` or report extra cost. Equal `nodeBudget` does not imply equal work when technique mixes differ.

## Non-regression rules

- No wall-clock-derived attempt shares/escalation thresholds.
- No live warm-up speed measurement in solver policy.
- No raw nodes as portable cross-technique cost.
- No deadline-truncated failure recorded as ordinary unsolved capability.
- No hidden total-work increase behind retry/reserve mechanisms.
- Work-meter weight changes are budget-unit migrations requiring cross-technique calibration plus reproducibility/regression validation.

The archived snapshot preserves nondeterminism measurements, raw-node prototype failure, fitting, migration, hint-workbench diagnosis, and tool-conversion history.

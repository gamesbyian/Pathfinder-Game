# Solver work budgets and determinism

> **Status:** current contract; migration complete.
> **History:** [`archive/snapshots/solver-budget-determinism-2026-08-20.md`](archive/snapshots/solver-budget-determinism-2026-08-20.md).

Solver allocation uses one machine-independent work currency. Wall clock is only an outer latency deadline.

## Work unit

[`../modules/solver/work-meter.ts`](../modules/solver/work-meter.ts):

```text
work = applyMove calls + 12 * isConnected calls
```

The fitted connectivity weight reduced measured DFS/beam/repair work-rate spread from ~11x under `nodesExpanded` to ~1.02x under `workSpent`. Use raw nodes only within a technique.

## Budget roles

| Field | Role |
|---|---|
| `workBudget` | Primary machine-independent budget shared among gate/config attempts. Pin for CI, A/Bs, benchmarks, corpus research, and reproducible diagnostics. |
| `timeBudgetMs` | Outer latency/safety deadline. It may truncate a run but must not size attempt shares. |
| `nodeBudget` | Legacy/diagnostic or technique-specific cap; not the cross-technique currency. |
| `strictTotalWorkBudget` | Experiment-only whole-solve ceiling when additive retry/tail tiers must fit inside one total envelope. |

If `workBudget` is omitted, ms-shaped callers convert at the run boundary using the committed default work-per-ms calibration. Live host speed never controls allocation.

## Reproducible comparison

For decision-bearing offline work:

1. pin `workBudget`;
2. use a non-binding `timeBudgetMs` or deterministic workflow mode;
3. reject or separately classify `deadlineTruncated` results;
4. compare `workSpent` for cost;
5. record protocol, commit, flags, corpus, and budget.

With equal level/config/seed/work budget and a non-binding deadline, search is deterministic across host speed/load. For remote A/Bs use `solver-typical-budget-baseline.yml` with `deterministic: true`.

A binding historical baseline may remain useful for continuity, but not as machine-independent causal evidence.

## Deadline truncation

A wall deadline may end an interactive solve before its work budget is spent. `deadlineTruncated` means the requested deterministic search did not finish within the latency envelope; it does not establish a reproducible unsolved result at the declared work budget.

Offline tools must exclude or label these results rather than turning machine load into a negative.

## Hint discovery and provenance

Hint discovery follows the same rule: phase/escalation decisions use work, not elapsed time. Cooperative yielding and latency reporting may read the clock.

Use:

- `workSpent`: comparable algorithmic cost;
- `workBudget`: intended deterministic ceiling;
- `deadlineTruncated`: whether wall time interfered;
- `nodesExpanded`: within-technique diagnostics or legacy data;
- `elapsedMs`: user/runtime latency.

Label units when reading old/new provenance; never mix nodes and work silently.

## Matched-work experiments

State whether additive retries/passes are inside or outside the declared envelope. If treatment can spend extra work, use `strictTotalWorkBudget` or report the extra cost explicitly. Equal `nodeBudget` does not imply equal work when technique mixes differ.

## Non-regression rules

- No wall-clock-derived attempt shares or escalation thresholds.
- No live warm-up speed measurement in solver policy.
- No raw nodes as portable cross-technique cost.
- No deadline-truncated failure recorded as ordinary unsolved capability.
- No hidden total-work increase behind retry/reserve mechanisms.
- Changing work-meter weights is a budget-unit migration and requires cross-technique calibration plus reproducibility/regression validation.

The archived snapshot contains the nondeterminism measurements, raw-node prototype failure, work-unit fitting, migration, hint-workbench diagnosis, and tool conversion history.

# Solver work budgets and determinism

> **Status:** current budget/determinism contract. The implementation migration is complete.
> **Historical investigation:** [`archive/snapshots/solver-budget-determinism-2026-08-20.md`](archive/snapshots/solver-budget-determinism-2026-08-20.md).

Pathfinder uses one machine-independent work currency for solver allocation. Wall clock is an outer latency deadline, not an allocation currency.

## Canonical work unit

[`../modules/solver/work-meter.ts`](../modules/solver/work-meter.ts) defines:

```text
work = applyMove calls + 12 * isConnected calls
```

The connectivity weight was fitted from measured cross-technique cost rather than guessed. It reduced the measured DFS/beam/repair work-rate spread from roughly 11x under `nodesExpanded` to about 1.02x under `workSpent`.

`nodesExpanded` remains useful as technique-local telemetry, but one node does not represent the same primitive in DFS, beam, repair, and admissible-order search. Do not compare raw node counts across techniques as though they were a common cost unit.

## Budget roles

| Field | Role |
|---|---|
| `workBudget` | Primary machine-independent solver budget and the quantity shared among gate/config attempts. Pin this explicitly for CI, A/Bs, benchmarks, corpus research, and reproducible diagnostics. |
| `timeBudgetMs` | Outer wall-clock deadline. It can truncate a run for latency/safety but must not size attempt shares. |
| `nodeBudget` | Legacy/diagnostic cap retained for callers and technique-specific experiments. It is not the cross-technique allocation currency. |
| `strictTotalWorkBudget` | Experiment-only whole-solve ceiling. Use when additive retry/tail tiers must fit inside the same total work envelope rather than exceeding the historical main-ladder budget. |

If `workBudget` is omitted, ms-shaped callers are converted at the run boundary using the solver's committed default work-per-ms calibration. This preserves approximate historical cost without using live machine speed to make allocation decisions.

## Deterministic-run contract

A solver comparison is reproducible only when the wall deadline cannot bind.

For decision-bearing offline work:

1. pin `workBudget` explicitly;
2. use a generous/non-binding `timeBudgetMs` or the workflow's deterministic mode;
3. reject or separately classify any `deadlineTruncated` / clock-bound result;
4. compare `workSpent` for machine-independent cost;
5. record the exact protocol, commit, flags, corpus, and budget.

With the same level/config/seed/work budget and a non-binding deadline, the search is deterministic across host speed/load. The completed migration was verified under CPU contention with identical solve results and work despite wall-time changes.

For the standard remote baseline workflow, use `solver-typical-budget-baseline.yml` with `deterministic: true` when the run is intended as an A/B or reproducibility check. Historical headline baseline series may intentionally preserve binding-deadline continuity; such a run is useful as that series, not as machine-independent causal evidence.

## Deadline truncation is indeterminate

Interactive solving has a real latency promise. A wall deadline may therefore cut the search off before its work budget is spent.

Such a result means:

> the requested deterministic search was not completed within the latency envelope.

It does **not** mean the level is reproducibly unsolved at the declared work budget.

`SolveResult.deadlineTruncated` / deadline-truncated status and work telemetry exist so offline tooling can exclude or label this case rather than silently turning machine load into a negative solver result.

## Hint discovery

Hint discovery/enumeration follows the same principle. Phase/escalation decisions are bounded by work, not live elapsed time. Cooperative-yield timing and elapsed-time reporting may read the clock; they must not decide which search branch or phase receives budget.

This matters because hint provenance is research data. A stored cost should reflect solver work rather than the incidental speed of the machine that produced the hint.

## Cost and provenance fields

Prefer:

- `workSpent` for comparable solver cost;
- `workBudget` for the intended deterministic ceiling;
- `deadlineTruncated` / clock-bound status for whether wall time interfered;
- `nodesExpanded` only for within-technique diagnostics or historical datasets that lack work data;
- `elapsedMs` for user/runtime latency, not algorithmic work comparison.

Tools that support both old and new provenance must label the unit rather than silently mixing nodes and work.

## Experimental fairness

A matched-work A/B should specify whether additive passes/retries are inside or outside the declared work envelope. If the treatment can spend extra work after the ordinary ladder, compare it either with `strictTotalWorkBudget` or with an explicit accounting that makes the extra cost visible.

Do not call two arms "same budget" merely because they share the same `nodeBudget` when their technique mixes differ.

## Rules that should not regress

- Do not reintroduce wall-clock-derived attempt shares or escalation thresholds.
- Do not use a live warm-up speed measurement to decide solver policy; that recreates host dependence.
- Do not treat raw nodes as a portable cross-technique currency.
- Do not record deadline-truncated failures as ordinary unsolved capability results.
- Do not hide a changed total-work envelope behind a new retry/reserve mechanism.
- Do not change the work-meter weights casually. A new weight is a budget-unit migration and needs cross-technique calibration plus reproducibility/regression validation.

The frozen historical document records the original nondeterminism measurements, raw-node prototype failure, work-unit fitting, migration phases, hint-workbench diagnosis, and tool-by-tool conversion chronology. Keep those facts as evidence, but use this file for current behavior.

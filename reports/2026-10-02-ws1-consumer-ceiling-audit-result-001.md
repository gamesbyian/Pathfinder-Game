# WS1 consumer Gate 1: ceiling audit result

> **Status:** concluded-positive
> **Last evidence:** 2026-10-02 — frozen 15-signature rule applied to every reachable attempt boundary of the corrected confirmation run's retained rows (run 36952383630, harvested to `reports/stress/experiment-evidence/36952383630__run-36952383630__attempt-1`).
> **Decision:** Gate 1 passes. The rule nominates 6.73% of solved-parent work (8.06% on the validation split) and 18.1% of their nodes, and all 35 unsolved (node-capped) parents carry nominated attempts worth 9.75% of work and 18.9% of nodes, with 19 of the 35 above 10% per parent. A defer-to-end consumer has real headroom on both objectives; the lane advances to a preregistered work-matched A/B (Gate 2), which needs the consumer implemented behind an opt-in flag first.
> **Remaining gate:** Gate 2 preregistration plus an attempt-scheduler seam audit and opt-in implementation; no solver run until both exist.
> **Evidence role:** development.
> **Research question:** `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`
> **Owner:** `docs/solver-optimization-workstreams.md`.

Audit: `scripts/stress/ws1-consumer-ceiling-audit.mjs`; rows `data/stress/ws1-consumer-ceiling-audit-001.json`. No solver was run. Design and thresholds: `reports/2026-10-02-ws1-late-continuation-consumer-design-001.md`.

## Result (all 160 fresh parents; thresholds from the design)

| Group | parents | parents with nominated | nominated / total work | nominated / total nodes | parents >10% nominated work |
|---|---:|---:|---:|---:|---:|
| solved, all | 125 | 31 | 6.73% | 18.1% | 17 |
| solved, validation | 46 | 12 | 8.06% | 20.4% | 8 |
| unsolved (node-capped), all | 35 | 35 | 9.75% | 18.9% | 19 |
| unsolved, validation | 13 | 13 | 9.72% | 20.0% | 7 |

Design thresholds: close the lane if the solved-parent work ceiling is below 3% and no unsolved parent has nominated work above 10%. Observed 6.73% and 19 unsolved parents above 10%: neither close condition holds.

## Reading

- **Work objective.** 6.73% is a ceiling, not a forecast: deferral only saves a nominated attempt's work if the winner is found without running it, and the winner can itself be a deferred attempt.
- **Solve objective.** Every unsolved parent ends `node-budget-reached` at the 50M cumulative node cap after spending 190-407M canonical work, so nodes are the binding resource, and nominated attempts consume 18.9% of those nodes. Whether redirecting them yields solves is exactly what the A/B must test; the audit only shows the nominated mass is not negligible.
- **Winner protection.** One winner row is nominated across all 125 solved parents (a development-split parent); none on the validation split. Under defer-to-end that winner is delayed, not lost, but it shows protection is empirical, not guaranteed.
- **Independence.** All 160 parents are fresh relative to the model's historical development data; the dev/validation split here is only the preregistered scoring convention, so development-split rows are also out-of-sample for the model.

## What this does not establish

That deferral improves solves or total work (no counterfactual ran); effects of reordering on later attempts' budgets or determinism; transfer to other populations. Node counts come from `nodesExpanded` per attempt; canonical work from `workSpent`.

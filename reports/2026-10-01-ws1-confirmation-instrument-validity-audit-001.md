# WS1 late-continuation confirmation: instrument-validity audit

> **Status:** concluded-positive
> **Last evidence:** 2026-10-01 — audit of the retained evidence bundle for run 36220112812 plus code-path and local-repro checks.
> **Decision:** the N=160 single-stage confirmation (and, by the same producer, the Stage A canary) could not have nominated any boundary: its input rows carry no per-attempt `workSpent`, and every frozen signature requires a cumulative work band of `>=10m`. The "decisively negative" conclusion is retracted as uninformative about transfer; the question returned to `deferred-reopen` pending a re-run. (Resolved 2026-10-02: the corrected re-run is positive.)
> **Remaining gate:** none — the identical protocol was re-dispatched with per-attempt work telemetry and passed every criterion (`reports/2026-10-02-ws1-telemetry-corrected-confirmation-result-001.md`).
> **Evidence role:** forensic.
> **Research question:** `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`
> **Owner:** `docs/solver-optimization-workstreams.md`.

## What was checked

Reproduce with `node scripts/stress/ws1-confirmation-instrument-audit.mjs`.

1. **Retained bundle** (`reports/stress/experiment-evidence/36220112812__run-36220112812__attempt-1`): 160 parents, 5,167 reachable-or-later attempts, **0** with a finite `workSpent` (all `null`). Parent-level `workSpent` is present for 160/160, which is why the run's totals looked healthy.
2. **Scorer** (`scripts/analyze-action-selection-legal-signals.mjs`): per-attempt work is read as `num(attempt.workSpent)`, which maps a missing value to 0. So every row has `nextAttemptWork = 0`, every `cumulativeWork = 0` and hence `cumulativeWorkBand = "0"`. The scoring output agrees: `preWinnerWork: 0` and `work: 0` in every `baselineByPriorOutcome` class despite 665 attempts.
3. **Frozen model**: all 15 signatures have layout `[priorStage, priorOutcome, priorWorkBand, cumulativeWorkBand, nextStage]` with `cumulativeWorkBand = ">=10m"` (15/15). A row whose cumulative work is always `"0"` can never match, so zero nominations was guaranteed whatever the 44 validation levels contained.
4. **Producer**: per-attempt `workSpent` is emitted only when `prep._attemptBudgetTelemetry` is set (`modules/solver/orchestration-run-attempt.ts`), i.e. under `--lifecycle-telemetry`, `--attempt-budget-telemetry` or a strict total work budget (`orchestration.ts`). The historical C2 source (`solver-stress-refresh.yml` → `level-blind-capability-sweep.mjs --lifecycle-telemetry`) enables it; `portfolio-solve-sweep.mjs --scheduler-mode=production`, which the confirmation used, does not. A local production sweep on current main reproduces it (R00001: 73 attempts, 0 with `workSpent`).

The plan (`reports/2026-09-25-ws1-late-continuation-single-stage-acquisition-plan-001.md`) did record that the level-blind sweep was not an interchangeable surface without a row-semantics parity proof, but the parity gap that mattered ran the other way: the model's work-banded features need telemetry the chosen producer omits.

## Consequences

- The N=160 result says nothing about fresh-population transfer. The power analysis ("~11 nominations expected, observed 0") compared the observed zero against a mechanism the instrument could not detect.
- The Stage A canary (n=24, 0 nominated) used the same producer and is equally uninformative.
- The refresh report's lane E premise ("clean transfer failure with an explicit historical/fresh contrast") is withdrawn: the contrast was an instrument change, not a population change. P112/P181/P199/P206 evidence-state updates that cited WS1 as a transfer failure should be read as untested.
- The retained-evidence historical result (6.93-9.91% capture on three C2 regimes) is unaffected and still carries its own caveats (development evidence, selection on the validation split).

## What changed in the repository

- `attemptWorkCoverage()` in `scripts/analyze-action-selection-legal-signals.mjs`; `apply-action-selection-legal-signal-model.mjs` now records coverage in its result and exits 3 when any reachable attempt lacks `workSpent` (override `--allow-missing-work` for exploration only); the confirmation evaluator refuses a verdict (exit 2) on an incomplete-coverage scoring input. Both have node tests.
- Authority corrections: the confirmation result report status block, `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE` in `docs/solver-research-question-relations.json` (`deferred-reopen`), and `docs/solver-optimization-workstreams.md`.

## Producer fix and re-dispatch recipe

`portfolio-solve-sweep.mjs` now accepts `--attempt-budget-telemetry` (sets `SolveOpts.attemptBudgetTelemetry`, the flag `--lifecycle-telemetry` implies in the level-blind sweep). Local check on R00001 at a small budget: 73/73 attempts carry `workSpent`, the scorer reports complete coverage and exits 0, and total work (6,449,417), nodes (1,350,035) and attempt count (73) are identical to the run without the flag. Telemetry only relabels some attempt outcomes (`budget-starved` instead of `timed-out`, derived from the pre-dispatch work-ceiling snapshot); the scorer maps both to `censored`, and the historical producer carried the same labels.

A corrected re-dispatch is the frozen workflow's solve step plus this one flag (seed `2026092591`, 160 parents, 50M nodes / 67M work, frozen model and split, no other change). The workflow file itself was not edited, because it carries the frozen plan-quality contract; whoever dispatches should add the flag in a dedicated revision and keep the scorer's coverage gate on.

## What this does not establish

That the frozen model would transfer (or not); that a re-dispatch is worth its cost (about one 160-parent production solve at 50M/67M, 40 shards); or that the other WS1 evidence is affected. The retained evidence bundle's other fields were not re-audited.

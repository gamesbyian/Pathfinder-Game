# WS1 late-continuation confirmation, telemetry-corrected re-run: result

> **Status:** concluded-positive
> **Last evidence:** 2026-10-02 — GHA run [36952383630](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36952383630) (workflow `ws1-late-continuation-single-stage-confirmation.yml`, branch `chatgpt/post-exhaustion-premise-refresh-2026-10-01`, commit `326935d3834ab0416f984eeccbd9cdae8c31df6c`), the identical preregistered protocol with per-attempt work telemetry.
> **Decision:** the frozen 15-signature `prior-response+work+next-stage` model passes every preregistered criterion on 160 fresh independent parents: it captures 8.42% of validation pre-winner work with zero winner endangerment across 12 independently nominated parents. Historical-population capture (6.93-9.91%) transfers to a fresh population. This is a confirmation of the capture signal, not evidence of production value; no scheduling change is earned.
> **Remaining gate:** a bounded consumer design (what would a counterfactual late-continuation policy do to cold solves at fixed work?); not queued, owner decides priority.
> **Evidence role:** confirmation.
> **Research question:** `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`
> **Owner:** `docs/solver-optimization-workstreams.md`.
> **Production effect:** none; the frozen model was scored offline and never consumed live.

## Why a re-run

The 2026-09-26 run of this protocol was instrument-invalid: its per-attempt rows carried no `workSpent` and every frozen signature requires a cumulative work band of `>=10m` (`reports/2026-10-01-ws1-confirmation-instrument-validity-audit-001.md`). The re-run changes only the producer's telemetry: `--attempt-budget-telemetry` on the solve step, an assertion that every reachable attempt carries `workSpent`, and the scorer's coverage gate. Seed `2026092591`, the 160-parent block, the frozen model, the 70/30 split, budgets (50M nodes / 67M work) and every threshold are unchanged. The decision to re-run followed the audit, not the earlier outcome, and nothing was retuned.

## Result

| Criterion (preregistered) | Threshold | Observed | Pass |
|---|---|---:|:---:|
| winner safety (endangered validation winner levels) | 0 | 0 | yes |
| captured pre-winner work share | >= 5% | **8.42%** (381,461,219 / 4,529,699,364 work) | yes |
| independently nominated parents | >= 3 | **12** | yes |
| max single-parent share of nominated work | <= 35% | 15.9% | yes |
| same-stage late-continuation share of nominated work | > 50% | 97.8% | yes |

Instrument checks: attempt `workSpent` coverage 4,282/4,282 reachable attempts (complete); 160/160 parents observed, 125 solved; 46 solved validation-split levels, 1,717 validation boundary rows. The verdict was `positive`; the workflow's decision-bearing publication step also passed.

## Interpretation and limits

- The historical C2 result is confirmed on a sample-independent population in the same capture range, with the protection property (0 endangered winners over 46 levels) intact. This resolves the question's remaining confirmation gate.
- It is an **offline** capture result: it counts work in attempts before the recorded winner that the rule would have nominated. It does not show that skipping or reordering them would produce cold solves at fixed work; pre-winner attempts can carry information or change later state (the question's own constraints). A consumer needs its own work-matched falsifier.
- The production solver differs from the 2026-09-26 one (BC1 default-ON, solved 125/160 versus 113/160), so this is a confirmation on current production, not a re-scoring of the old run.
- Concentration is modest (12 parents, top parent 15.9%) and 97.8% of nominated work is same-stage continuation, consistent with the historical regimes.
- Rare-winner protection is observed, not proven: 0/46 validation levels, one population.

## Evidence retention

The artifact `ws1-late-continuation-single-stage-confirmation` (id 11206065826, expires 2026-12-31) holds `scoring.json`, `verdict.json` and the contract. The numbers above were read from the score job's log because the artifact host is blocked by the session's egress policy. The run was dispatched from a branch, so the central harvester may not retain it under `reports/stress/experiment-evidence/`; retaining it durably is an open housekeeping item.

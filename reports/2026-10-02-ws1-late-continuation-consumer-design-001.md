# WS1 late-continuation consumer design

> **Status:** concluded-positive
> **Last evidence:** 2026-10-02 — design from the confirmed offline capture (`reports/2026-10-02-ws1-telemetry-corrected-confirmation-result-001.md`); no solver execution.
> **Decision:** the smallest consumer is a lossless reorder of late additive tiers, judged on machine-independent work at equal solves. Gate 1 passed; the seam audit then showed it cannot add cold solves (no unsolved parent was tier-starved) and is worth roughly 8-9% of solved-parent work, so it is parked as a work-only option rather than queued.
> **Remaining gate:** none queued. Gate 1 passed and the seam audit (`reports/2026-10-02-ws1-consumer-seam-audit-001.md`) found the consumer is work-only (about 8-9% net of solved-parent work, no cold-solve upside), so implementation is parked.
> **Evidence role:** design.
> **Research question:** `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`
> **Owner:** `docs/solver-optimization-workstreams.md`.

## What is and is not established

Confirmed offline: the frozen 15-signature rule nominates 8.42% of validation pre-winner work (381,461,219 of 4,529,699,364 units) across 12 independent parents with 0/46 winners endangered. Not established: that acting on those attempts changes cold solves or total work. Pre-winner attempts can carry information or change later state, and the nominated attempts' work only becomes value if it is reallocated or never spent.

## Consumer forms (ordered smallest first)

1. **Defer-to-end (chosen).** An attempt whose boundary matches a frozen signature moves behind the remaining unmatched ladder attempts for the same parent. Nothing is removed, so with enough budget the solve set is unchanged; only order and work-to-solve change.
2. Truncate (descendant, only if 1 shows value): cap a matched attempt's work at a smaller ceiling.
3. Skip (rejected): drops capability and is exactly the winner-endangerment risk the model was selected to avoid.

Inputs are the boundary facts the frozen model already uses (prior stage, prior outcome class, prior-attempt and cumulative work bands, next stage); no level identity, hints or historical outcomes, so it stays level-blind (solve-local derivation).

## Where value can come from

- **Work reduction on parents solved after nominated attempts** (the machine-independent-work objective). Ceiling is the nominated share of the total work of such parents, not the 8.42% of pre-winner work.
- **Cold solves on cap-limited parents**, only if their ladder is *not* exhausted below the 67M work cap. If the retry ladder is exhausted first (as in the R00180 production note), a reorder cannot add solves.

## Gate 1: ceiling audit (existing data, no solver run)

Using the corrected run's per-attempt rows (160 parents, including attempts after the winner or on unsolved parents), report:

1. nominated attempts' work as a share of the total work of solved parents (work-reduction ceiling), per-parent distribution and top-parent share;
2. for unsolved parents, the fraction whose ladder finishes below the cap, and the nominated share of their work;
3. the same two numbers with development parents reported separately from validation parents (the model's own split), because the model was fit on the development split.

**Close the consumer lane** if the work-reduction ceiling is below 3% of total solved-parent work and no unsolved parent has an unexhausted ladder with nominated work above 10%. Otherwise proceed to Gate 2.

Prerequisite resolved: the central harvester retained the run under `reports/stress/experiment-evidence/36952383630__run-36952383630__attempt-1`. **Result: Gate 1 passed** (6.73% of solved-parent work and 18.9% of unsolved-parent nodes nominated; `reports/2026-10-02-ws1-consumer-ceiling-audit-result-001.md`). Note that unsolved parents end node-capped (50M cumulative nodes), so the resource to count for the solve objective is nodes, not only work.

## Gate 2: work-matched A/B (only if Gate 1 passes)

Fresh preregistered block (new seed, independent parents), arms control = production ladder vs treatment = defer-to-end with the frozen rule, identical caps and flags; run an execution-family canary under exact flag semantics first. Size N from informative rows (parents with at least one nominated attempt) per `docs/solver-experiment-opportunity-sizing.md`, using Gate 1's rates; parents are the independent unit. Report separately: solves at the fixed work cap (gains/losses), `workSpent` on parents solved by both arms, and any parent solved only by control (winner loss). Promotion needs net non-negative solves, a material paired work reduction, and zero unexplained winner losses.

## Risks

- The model was fit on a historical regime and confirmed on one fresh block; a consumer changes the ladder those signatures were measured on (order feedback).
- Interaction with default-ON flags promoted since (BC1, capability exposure, repair deadline); the A/B must run on current production.
- Attempt order is part of solver determinism; a reorder needs the budget-determinism and request-identity contracts (`docs/solver-budget-determinism.md`).

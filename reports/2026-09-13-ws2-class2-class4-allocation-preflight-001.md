# WS2 class-2 / class-4 allocation preflight 001

> **Status:** active
> **Last evidence:** 2026-09-13 — current Class-2 7M must-turn integration evidence, current Class-4 portal-coarse freshness replay, current additive-tier ordering, and the closed global portal-coarse regression evidence
> **Decision:** freeze the next two WS2 composition/allocation gates: a participant-aware 60-row economics/collateral A/B for Class 2, and a dedicated default-off true-dead-last additive whole-ladder retry canary for Class 4.
> **Remaining gate:** materialize/run the frozen Class-2 cohort; implement the Class-4 retry and pass its canary before any 113-row population test.
> **Evidence role:** preregistered design / implementation handoff
> **Scope:** Class 2 and Class 4 only. No Class-5, categorical full-pool, or homotopy work.

## Executive decision

Both live composition questions are narrow enough that the next expensive step should be decision-bearing rather than exploratory.

- **Class 2:** the 7M `late-repair-must-turn-biased-retry` is already implemented, default-off, and reproduced on `R02768` and `R02180` only after ordinary late repair fails. The next question is economics and collateral, not mechanism discovery.
- **Class 4:** the portal coarse-state capability is fresh, but global enablement remains closed negative. The next treatment is a genuinely dead-last additive whole-ladder retry with the merge enabled only inside that retry.

## Class 2: frozen economics/collateral A/B

### Treatment

Do not retune it:

- `STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY=true`;
- stage `late-repair-must-turn-biased-retry`;
- existing 7,000,000 stage-local node cap;
- existing fresh stage work scope and placement;
- all other production defaults unchanged.

No 13M widening and no slower historical-winner harvesting.

### Population

Freeze one ID file before either arm runs, using control-side facts only. A candidate row must:

1. contain at least one must-turn obligation;
2. actually participate in ordinary `late-repair-search`;
3. satisfy the current structural gates for the child retry;
4. reach the point where the child treatment would be legal if enabled.

Split into:

- **gain stratum:** control remains unsolved after the full ladder;
- **collateral stratum:** control solves only after `late-repair-search` through a later production stage.

The collateral stratum is mandatory because the must-turn tier sits before later specialists and can consume resources before them.

Freeze **60 rows**: 40 deterministic-seeded gain rows + 20 deterministic-seeded collateral rows, or all available collateral rows with unused slots transferred to gain. Exclude `R02768` and `R02180` from the primary cohort because they were development rows; keep them only as positive controls. Exclude `R03049` from must-turn-guidance gain accounting because it is a dose/allocation case.

Commit or artifact-pin the exact IDs/hash, corpus hash, base SHA, selection seed/version, arm flags, node/work envelope, deadline, scheduler/workers, and relevant stage ordering before outcomes are inspected.

### A/B contract

Use identical frozen IDs and production-shaped starting envelope in both arms.

Control: candidate flag OFF.

Treatment: identical settings with `STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY` ON.

Pin the existing production-shaped envelope explicitly, including 50M starting node budget and 67M starting work budget, with the current additive semantics. Do not silently convert this marginal-value test into a strict fixed-total-work substitution.

A row counts as treatment-participating only if the target stage records nonzero nodes or `workSpent`. The run is decision-bearing only if at least 75% of gain rows genuinely reach/participate in the treatment and at least 75% of collateral rows still reach the insertion point under current HEAD. Otherwise classify population/config drift and rematerialize.

### Required accounting

Per level and aggregate preserve:

- solved/referee-valid outcome and winning stage;
- stage-local and whole-solve `workSpent`;
- nodes/attempts by stage;
- wall time;
- target-stage entry/exit accounting;
- censoring/stop reason;
- whether downstream control-winning stages still received meaningful work in treatment.

Report exact paired gains, exact losses, downstream displacement, and incremental work/wall cost. Use `workSpent` for cross-technique economics.

### Advancement rule

Advance only if there is at least one new referee-valid target-stage solve, zero credible solve losses, no material downstream capability starvation, valid treatment participation, symmetric censoring, and clean enough cost measurement to quote incremental cost per gained solve.

A credible loss demotes this unconditional exposure. Zero gains after informative participation on at least 30 gain rows is also a stop: do not automatically widen the dose. Gains with no losses but poor economics remain default-off and become a WS1/allocation-selection question.

No solver runtime implementation is required for this gate; only minimal cohort materialization/analysis tooling if existing lifecycle tooling cannot emit the population directly.

## Class 4: dead-last portal coarse-state retry

### Changed treatment

Implement one new default-off retry tier:

- stable explicit stage ID, recommended `portal-coarse-state-merge-retry`;
- portal-bearing level + flag ON + no prior solution;
- **true final position after every currently promoted additive retry**;
- run through the existing whole-ladder retry architecture;
- enable `STRATEGY_PORTAL_COARSE_STATE_MERGE` only via the retry-local proxy override;
- fresh work scope and explicit additive node reserve;
- no carving resources from earlier stages;
- lifecycle telemetry distinguishing eligibility, entry, participation, and stage solve.

Do not run the treatment arm by globally enabling `STRATEGY_PORTAL_COARSE_STATE_MERGE`; that would repeat the already-closed global experiment.

### Implementation proof obligations

Before any population test, prove by tests/telemetry:

1. default-off behavior is unchanged;
2. non-portal levels never participate;
3. the tier is actually last;
4. work scope is fresh and additive;
5. enabling it cannot alter attempts/work before an earlier production solve;
6. worker/sequential transport semantics are explicit.

Freeze the exact additive node/work dose before canary outcomes are inspected. Use one production-sized retry dose, not 10x capability-sweep sizing.

### Canary

Reuse the existing prespecified freshness sample:

`R00082, R02173, R02807, R03365, R00466, R03228, R00329, R03303`.

Add `R01273` as the known global-form regression control and at least two non-portal no-op controls.

Advance only if at least one freshness row is solved by the new retry stage, all claimed solves are referee-valid, `R01273`'s earlier production solve/path is unaffected, non-portal controls have zero participation, fresh nonzero retry work is proven, no earlier stage loses work, and the wall deadline is nonbinding.

If the canary is 0/8 with genuine participation, stop before the 113-row population. Diagnose the precise exposure mismatch rather than reopening global merge or simply scaling dose.

### First population gate

Only a passing canary earns the **113 current Class-4 portal-coarse nominations** as the first allocation population. Freeze the IDs and current residual identity before dispatch. Measure retry participation, referee-valid gains, additive `workSpent`, wall cost, and any unexpected collateral. Because the treatment is truly dead-last, prior solved levels should be structurally protected; any earlier-stage divergence is an implementation defect, not acceptable experimental collateral.

## Bottom line

Class 2 is ready for a bounded participant-aware economics run. Class 4 is ready for a small implementation canary. Neither needs broader premise work before those gates return evidence.

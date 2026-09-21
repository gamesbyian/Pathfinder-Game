# Solver research batch decision-latency audit 001

> **Status:** architecture/method audit complete; historical savings census still open.
> **Date:** 2026-09-20
> **Parent plan:** [`../docs/solver-batch-digestion-architecture-audit-plan.md`](../docs/solver-batch-digestion-architecture-audit-plan.md)
> **Evidence role:** research-execution architecture.
> **Decision:** pursue only monotone, prospectively frozen early-stop conditions first. The safest high-value initial form is irreversible negative stopping (for example, a zero-loss gate after the first real loss). Do not infer early positive promotion from incomplete populations.

## 1. Question

The user's practical pain is wall-clock waiting for large experiments.

That is not identical to solver CPU efficiency.

Can a research batch terminate once the frozen decision is mathematically determined, instead of continuing to fill rows that cannot change the disposition?

## 2. Existing infrastructure already has the execution primitive

`scripts/solver-worker-pool.mjs` already supports:

- dynamic scheduling across persistent child workers;
- `onResult` in **completion order**;
- a `stopAfter(index, result)` callback;
- immediate cancellation of the remaining pool when `stopAfter` returns true.

Therefore adaptive stopping does **not** require a new scheduler framework.

The missing layer is scientific:

> which partial-result conditions are allowed to terminate a frozen experiment without manufacturing evidence?

## 3. Existing paired gate

`classify-paired-solver-outcome.mjs` classifies a complete paired population using:

- `minGains`;
- `maxLosses`;
- optional `maxWorkDeltaPct`.

It correctly requires complete paired population integrity before classification.

That final classifier must stay complete-population-only.

An adaptive stopper is a different object: it can stop only when every possible completion of the unseen rows leads to the same relevant disposition.

## 4. Monotone negative locks

Let:

- `G` = treatment-exclusive gains observed so far;
- `L` = control-exclusive losses observed so far;
- `R` = independent decision units still unseen;
- gate requires `G >= minGains` and `L <= maxLosses`.

Ignoring the work gate for the moment, promotion is irreversibly impossible when either:

### Loss ceiling already broken

`L > maxLosses`

Losses cannot be undone by later rows.

For the common `maxLosses = 0` gate:

> the first genuine treatment regression permanently kills promotion.

This can happen extremely early.

### Not enough remaining units to reach gain floor

`G + R < minGains`

Even if every remaining unit becomes a gain, the promotion threshold cannot be reached.

This tends to fire near the tail, but it is exact.

## 5. Positive locks are much rarer

A positive promotion decision can be guaranteed only when unseen rows cannot violate a gate.

For gains/losses alone:

- `G >= minGains`; and
- `L + R <= maxLosses`.

With `maxLosses = 0`, this normally requires `R = 0`.

So zero-loss experiments have a strong asymmetry:

- bad treatments can often be killed early;
- good treatments generally cannot be promoted early.

This is fine. The goal is to reduce waiting, not force symmetric stopping rules.

## 6. Work/economics gate is not automatically monotone

`maxWorkDeltaPct` can move both directions as more paired rows arrive.

Do **not** early-stop from the observed partial work delta unless a mathematically valid bound on unseen work proves the final threshold unreachable or guaranteed.

Possible future forms:

- per-row frozen maximum work budgets may bound worst-case remaining treatment/control work;
- a conservative interval for final aggregate delta may be derivable.

But this is a second-stage refinement.

The first stopper should operate only on gates whose lock is obvious from gains/losses.

## 7. Independence is load-bearing

`R` must count the experiment's actual independent decision units.

If several rows are siblings under one parent:

- they do not become multiple independent chances to meet a confirmation threshold merely because workers finish separately;
- a stop rule must aggregate at the same unit as the frozen experiment contract.

The existing research-unit/independence machinery should own that mapping.

## 8. Early-stopped output must remain visibly incomplete

Current final paired classification correctly requires:

- coverage-complete;
- decision-valid-complete;
- exact expected IDs.

An early stop must **not** fake those fields.

A future partial terminal artifact should say something like:

```
executionStatus: decision-locked
decisionLock: {
  disposition: cannot-promote,
  reason: max-losses-exceeded,
  observedIndependentUnits: ...,
  remainingIndependentUnits: ...,
  frozenGate: ...
}
coverageComplete: false
decisionValidComplete: false
```

The decision lock is authoritative only for the narrow proposition it proves:

> continuing this frozen experiment cannot produce a promotable outcome.

It is not a complete estimate of treatment effect, gain set, loss set, or total economics.

## 9. Decision stop versus characterization continuation

Some experiments may still be worth completing after promotion becomes impossible because the remaining rows answer other questions:

- how broad is the regression?
- which capabilities are displaced?
- are there compensating gains?
- does a negative treatment reveal a useful complementary mechanism?
- what is total compute impact?

Therefore future experiment contracts should distinguish:

### Required decision acquisition

Rows necessary to decide the promotion gate.

### Optional characterization acquisition

Additional rows useful for capability memory or mechanism understanding.

The user should not have to wait for optional characterization before the system reports the decision.

Workers can continue only when that extra evidence is explicitly worth its compute.

## 10. Completion-order execution matters

`runWorkerPool` calls `onResult` and `stopAfter` in completion order.

That is exactly the order relevant to human wait time.

Historical result files often preserve population order rather than actual completion timestamps/order. Therefore a retrospective over array prefixes may estimate sample efficiency but cannot honestly claim wall-clock savings.

A strong historical savings audit needs either:

- recorded completion order/timestamps from existing artifacts; or
- bounds/simulation under the actual worker scheduling model.

Do not silently treat file order as wall-clock order.

## 11. Parallel stopping granularity

When one completed task locks the decision:

- other workers may already have in-flight jobs;
- the pool kills workers in `finish()`;
- work spent on already-running jobs up to cancellation is sunk.

Savings therefore depend on:

- concurrency;
- job duration variance;
- where the decisive row finishes;
- cancellation responsiveness.

This is still likely valuable for long heterogeneous solves, but exact savings must be measured at the pool level.

## 12. Recommended first prospective form

Start with a deliberately narrow contract:

> **loss-ceiling stopper**

Eligible only when:

- paired treatment/control comparison;
- frozen `maxLosses`;
- no claim that a complete effect estimate is being produced;
- independent unit mapping is explicit;
- a newly completed independent unit establishes `losses > maxLosses`.

Action:

- record the irreversible cannot-promote decision immediately;
- stop required decision acquisition;
- optionally continue characterization only under a separately authorized reason.

This needs almost no statistics and cannot create a false positive promotion.

## 13. Historical sizing before implementation

Before wiring it into portfolio/paired runners, census recent completed experiments:

- population size;
- frozen max-loss gate;
- number of losses;
- earliest loss position where completion order is actually known;
- compute/wall after that point;
- whether later rows materially changed a separate interpretation that would have justified continuing.

If historical completion order is absent, report only theoretical row savings under population order or best/worst bounds.


## 13A. Historical artifact audit: general wall-savings reconstruction is not currently sound

A spot audit of durable decision-bearing experiment evidence under
`reports/stress/experiment-evidence/**` found that current manifests preserve strong final-state
facts:

- exact intended/observed population identity;
- coverage completeness and decision-valid completeness;
- aggregate outcome counts;
- run/workflow identity and resource ceilings;
- per-level result rows with solve work/time.

They do **not** generally preserve both pieces required for a truthful retrospective adaptive-stop
wall-clock replay:

1. the frozen promotion/stop gate in a machine-readable generic form; and
2. actual per-independent-unit completion order/timestamps across parallel shards/workers.

Result-array order is not a substitute for completion order, especially for heterogeneous long-running
solver rows. Likewise, prose saying a treatment later closed on a loss is not a frozen generic
`maxLosses` contract.

Therefore this audit will not publish synthetic "hours saved" numbers by replaying file order.

This is itself a useful architectural finding: prospective decision-lock support should record the
small terminal certificate at execution time instead of requiring forensic reconstruction later.
The required additional evidence is tiny compared with storing full scheduling traces:

- frozen decision gate relevant to the lock;
- independent-unit identity;
- observed gains/losses at lock time;
- remaining unit count;
- lock reason;
- wall timestamp / elapsed wall at lock;
- optional in-flight task count.

Do not add broad completion tracing solely for this question.

## 14. Broader sequential stopping

Only after the narrow negative stopper proves useful should the audit consider:

- gain-floor futility;
- bounded work-delta futility;
- sequential confidence/credible intervals;
- stratified minimums;
- witness-count stopping;
- adaptive sampling.

Those forms introduce much more selection/inference complexity.

## 15. Disposition

The “wait less” lane is **architecturally promising and cheaper than expected** because the worker cancellation primitive already exists.

The first missing capability is not scheduling. It is a small, explicit scientific contract for irreversible decision locks.

No production/research runner change is authorized until the historical opportunity census shows enough real saved work.

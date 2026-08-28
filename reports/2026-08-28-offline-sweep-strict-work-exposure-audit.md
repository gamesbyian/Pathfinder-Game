# Offline sweep strict-work exposure audit

> **Status:** concluded-positive
> **Last evidence:** 2026-08-28 — seven active level-blind sweep/confirmation workflows audited and given opt-in strict_total_work_budget plumbing with legacy default false
> **Decision:** make true whole-solve work ceilings explicit and selectable in offline workflows without silently changing historical default semantics
> **Remaining gate:** none for exposure plumbing; individual decision-bearing experiments opt in when matched whole-solve work is required

## Finding

The underlying sweep script already supports `--strict-total-work-budget`, and the additive-tier participation audit established that this flag is the mechanism that turns the supplied work budget into a genuine whole-solve cap. But every active GitHub Actions workflow using the level-blind sweep omitted it.

The affected workflow family was:

- `solver-archetype-sample-ab.yml`
- `solver-broad-confirmation.yml`
- `solver-level-blind-targeted-sweep.yml`
- `solver-repair-fallback-reserve-sample-ab.yml`
- `solver-repair-probe-adaptive-sample-ab.yml`
- `solver-residual-confirmation.yml`
- `solver-stress-refresh.yml`

All seven derive a work allocation from the node input at the established 1.34 ratio. Before this change, none offered a workflow input capable of passing `--strict-total-work-budget`. Several simultaneously described `node_budget` as a "cumulative node ceiling" or said the node budget was "the real ceiling", even though late additive tiers can spend beyond the nominal base allocation.

## Change

Each workflow now exposes:

```text
strict_total_work_budget = false
```

When set to `true`, the workflow passes `--strict-total-work-budget` to every relevant level-blind sweep invocation. The default remains `false`, preserving all historical/additive execution semantics unless the experiment explicitly opts into a fixed whole-solve envelope.

Descriptions of `node_budget` and `budget_ms` were corrected where they implied a hard node ceiling. `budget_ms` is described as wall-safety; the node/work inputs are base allocations under legacy semantics, while strict total work is the true whole-solve deterministic ceiling.

## Why this is deliberately opt-in

Changing existing confirmation/stress workflows wholesale to strict work would alter the search treatment. The additive tiers are genuine capability contributors in offline runs, so removing their ability to exceed the base envelope is a scheduler-policy change, not documentation cleanup.

This patch therefore separates two concerns:

1. **Legibility and experimental control:** fixed now. A researcher can request a genuine matched-work envelope, and the workflow UI no longer overstates the node input.
2. **Whether standard confirmation/stress runs should switch defaults:** still a policy experiment. This patch makes no such decision.

## Queue consequence

Queue #2's equal-work/fixed-envelope work no longer needs a bespoke workflow merely to obtain a true whole-solve cap. Decision-bearing routing/scheduler pilots can opt into the existing solver mechanism at dispatch time, while historical refresh/confirmation semantics remain reproducible by leaving the new input false.

The next budget-model implementation work remains the explicit budget-context/ownership migration and one-at-a-time additive-tier conversion already named in the queue. This change removes a tooling/interpretation obstacle in front of those steps; it does not claim the additive-tier migration itself is complete.

# Computational work elimination audit: wait-less disposition 001

> **Status:** ROUTED TO EXISTING DECISION-LATENCY AUTHORITY; no new framework earned.
> **Date:** 2026-09-21.
> **Parent:** [solver computational work elimination audit](../docs/solver-computational-work-elimination-audit-plan.md).
> **Existing authority:** [solver research batch decision-latency audit](2026-09-20-solver-research-batch-decision-latency-audit-001.md).
> **Operating rule:** [solver research operating model](../docs/solver-research-operating-model.md), rule 28.

## Question

The computational-work-elimination audit's "wait less" lane asks:

> Which expensive research batches keep computing after the frozen scientific decision has already become irreversible?

Repository/source audit shows this lane is already architecturally well-formed and should **not** become a second project.

## Existing execution primitive

`scripts/solver-worker-pool.mjs` already provides exactly the execution mechanism needed:

- persistent child workers;
- dynamic work assignment;
- `onResult` in actual completion order;
- `stopAfter(index, result)`;
- immediate cancellation of the remaining pool when `stopAfter` locks.

Therefore the missing capability is not scheduling or worker persistence.

## Existing scientific boundary

The research operating model now states the narrow rule prospectively:

- only a **frozen monotone** decision gate may stop required acquisition early;
- the stop must be irreversible under every possible unseen completion;
- record lock reason, observed independent support, remaining units, elapsed wall and in-flight work;
- keep `coverageComplete` and `decisionValidComplete` false;
- claim only the locked disposition, not a complete effect estimate;
- optional characterization is separate;
- never derive the stopping rule retrospectively from the observed sequence.

The existing complete paired classifier correctly remains complete-population-only. It uses frozen `minGains`, `maxLosses`, and optionally `maxWorkDeltaPct`, and refuses incomplete population integrity.

That separation should remain.

## First admissible consumer

The strongest cheap form remains the already-identified **loss-ceiling lock**.

For a paired experiment with frozen `maxLosses`:

> once completed independent units establish `losses > maxLosses`, promotion is irreversibly impossible.

For the common `maxLosses = 0` gate, one genuine independent-unit regression is enough.

No sequential statistics are required.

A second exact form exists near the tail:

> if observed gains + remaining independent units < frozen `minGains`, the gain floor is unreachable.

This is also monotone but is usually less valuable for latency.

## Forms deliberately not generalized

### Positive promotion locks

With a zero-loss gate, a positive lock usually requires all independent units to finish because any unseen unit could still be a loss.

Do not invent probabilistic early promotion.

### Work/economics gates

Observed partial `maxWorkDeltaPct` is not generally monotone.

Do not stop from a favorable/unfavorable partial work delta unless the frozen per-unit resource contract provides a mathematically valid final bound.

### Generic sequential inference

Confidence sequences, credible intervals, adaptive sampling, witness-count stopping and stratified sequential rules are not earned by the current consumer.

## Historical evidence boundary

The September 20 decision-latency audit already established that durable historical artifacts generally lack both:

1. the machine-readable frozen generic gate; and
2. true independent-unit completion order/timestamps across the parallel execution.

Therefore this successor audit will not manufacture retrospective wall-hour savings.

Prospective terminal certificates are cheap enough that future qualifying experiments should record the truth at execution time.

## Small terminal certificate

A qualifying runner needs only a bounded object such as:

```json
{
  "executionStatus": "decision-locked",
  "decisionLock": {
    "disposition": "cannot-promote",
    "reason": "max-losses-exceeded",
    "observedIndependentUnits": 0,
    "remainingIndependentUnits": 0,
    "elapsedWallMs": 0,
    "inFlightTasks": 0
  },
  "coverageComplete": false,
  "decisionValidComplete": false
}
```

The actual values must come from live completion-order execution and the experiment's frozen independent-unit mapping.

## Computational-work-elimination disposition

This lane is a **surviving operational rule, not an implementation program**.

- Do not build a generic sequential-statistics engine.
- Do not modify the complete paired classifier to accept partial populations.
- Do not add broad completion tracing.
- Do not retrofit every workflow.
- When the next genuinely expensive paired experiment has a frozen monotone negative gate, wire the smallest lock callback into that runner using the existing worker pool and retain the terminal certificate.
- If optional characterization remains valuable, report the locked decision immediately and treat characterization as a separately justified continuation.

## Reopen / advance condition

Additional infrastructure is earned only after at least two distinct expensive research consumers require the same non-trivial lock bookkeeping beyond the existing `stopAfter` callback and terminal certificate.

Until then, bespoke runner wiring is cheaper, clearer, and scientifically safer.

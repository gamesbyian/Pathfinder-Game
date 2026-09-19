# Common failure-response query Phase-2 closeout 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-19 — automatic compact query gained document protocol fallback, parent/protocol summaries, exact-attempt dose, badness support and longitudinal repeat accounting.
> **Decision:** Phase 2 of the failure-evidence integration plan is complete for the automatic compact-response layer. Diagnostic prune/flow/progress fields remain intentionally conditional on research-only opt-in rather than blocking this closeout.
> **Remaining gate:** none for the automatic reducer. Extend the query additively only when a promoted/scoped diagnostic field or a real consumer requires it.
> **Evidence role:** infrastructure/query closeout; no solver efficacy claim.

## Supported automatic queries

`scripts/failure-response-query.mjs` now supports:

- parent, outcome, action, stage, producer, run and protocol filters;
- participation/reach filters;
- solved-parent-with-failed-attempt filtering;
- exact attempt outcome/action/stage filtering;
- work-range filtering;
- document-level protocol/solver identity fallback when rows do not repeat it;
- parent-level independent-unit counts;
- solved vs non-solved parent counts;
- parent terminal composition;
- action/stage/run/protocol/solver-ref summaries;
- protocol partitions;
- explicit unknown/mixed protocol accounting;
- row work and node descriptive statistics;
- best/final badness descriptive support;
- exact-attempt work/node dose by action and stage;
- median/min/max/mean/total support values;
- multi-record parent counts;
- multi-run parent counts;
- stricter protocol-compatible multi-run counts.

The output explicitly states that row/attempt counts are support diagnostics rather than prevalence denominators.

## Longitudinal rule

Three notions are kept separate:

1. `multiRecordParents`: more than one compact record exists for a parent;
2. `multiRunParents`: records contain more than one known `runId`;
3. `protocolComparableMultiRunParents`: multi-run parent under exactly one known shared `protocolHash`, with no unknown protocol rows.

Only the third is automatically eligible for protocol-compatible longitudinal comparison.

Even then, repeated observations remain dependent parent history, not extra independent parents.

## Exact-action dose

The reducer reports exact-attempt dose separately from parent total work.

This distinction is necessary for Class-3 exposure analysis:

- parent total `workSpent` says what the whole solve consumed;
- `attempts.byAction[identity].work` says what the exact action's retained attempts consumed.

The reducer does not claim that repeated-attempt total equals a scheduler allocation or that isolated technique cost equals shared-production required dose.

## Badness

Badness is preserved descriptively only.

The query may report best/final values and `finalMinusBest` where both exist. It does not assign directionality, progress semantics or causal interpretation to those numbers.

The bounded progress observer remains the authoritative richer source when progress trajectory matters.

## Conditional diagnostic fields

Phase 2 does not require automatic prune/flow/progress persistence because Phase 1 deliberately kept that bundle research-only opt-in.

When a consuming investigation enables compact diagnostics, its analysis may either:

- use the producer-specific result directly; or
- extend this reducer additively if the field has earned a reusable cross-producer query contract.

Do not add dormant schema merely to anticipate hypothetical consumers.

## Exit condition

Ordinary compact response can now answer the plan's common low-cost questions without ad-hoc JSON surgery:

```text
Did it participate?
How much exact action/stage dose is visible?
How did it terminate?
Was it censored or exhausted?
Do solved controls show similar failed attempts?
Are repeated observations actually protocol-comparable?
What descriptive badness/work/node support exists?
```

That satisfies the Phase-2 automatic-layer exit condition.

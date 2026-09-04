# Resumable solver search

> **Status:** opt-in beam continuation primitive exists; no production scheduling policy currently consumes it.
> **Priority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) decides whether resumability work is active.
> **History:** [`archive/snapshots/solver-search-resumability-2026-09-04-pre-consolidation.md`](archive/snapshots/solver-search-resumability-2026-09-04-pre-consolidation.md) plus dated reports below.

This document owns the **current resumability mechanism and research dispositions**, not the experiment diary.

## Implemented primitive

`beamSearchFromGate` has default-off continuation support for bounded research:

- `resumeFrom`: resume an existing in-memory beam continuation;
- `pauseAfterPhases`: pause at a deterministic phase boundary;
- `captureContinuationOnBudgetExit`: capture continuation at an exact work-cap exit when the budget check reaches that boundary first.

Same-policy pause/resume has reproduced uninterrupted `W + Δ` execution with the same solve/unsolved outcome, solution, and cumulative canonical work. Correct continuation carries the live mutable working/search state as well as the frontier; frontier-only replay incorrectly repays work.

The primitive is **in-memory only**. It does not authorize serialization, cross-process checkpoints, persisted continuation compatibility, or production scheduler use.

Primary feasibility evidence: [`../reports/2026-09-03-beam-resumability-feasibility-pilot-001.md`](../reports/2026-09-03-beam-resumability-feasibility-pilot-001.md).

## Continuation contract

A continuation is an execution object, not scheduler policy. It must preserve enough state to resume correctly, including as applicable:

- frontier/beam and phase/depth;
- parent-pointer/retention/dedup state required by future phases;
- deterministic insertion/tree ordering state;
- mutable path/constraint state needed to reconstruct the next frontier node;
- cumulative nodes/work and budget-boundary state;
- PRNG state for randomized configurations.

Rules:

- resumed work charges only newly performed work;
- natural exhaustion produces no continuation;
- pause/censoring is distinct from failure/exhaustion;
- continuation cannot contain identity-derived policy or historical per-level outcomes;
- default production behavior remains unchanged unless a separately validated scheduler policy promotes continuation use;
- fresh-vs-resumed equivalence tests must guard hidden predecessor-state dependence.

## Tested policy-switch forms

### One beam-policy handoff

A single `intersectionHarvest → objectiveFirst` inherited-frontier switch produced rare complementarity on two independent 30-level Corpus-2 samples: 2/60 cases solved only by inherited switching, with no opposite-direction loss in that pilot. This is **development evidence**, not a production rule or cross-generator confirmation.

Evidence: [`../reports/2026-09-03-beam-policy-switch-complementarity-pilot-001.md`](../reports/2026-09-03-beam-policy-switch-complementarity-pilot-001.md).

### Repeated/staged switching

For that same profile family:

- cyclic `A,B,A,B,...` alternation added no reliable value over one handoff across tested segment sizes;
- a non-cyclic three-profile staged schedule also added no value over the two-profile handoff.

Those schedule shapes are closed for the tested profile family. Reopen only with a structurally different premise, such as policies differing materially in retention/ordering behavior rather than another schedule variation.

Evidence: [`../reports/2026-09-03-beam-alternating-policy-schedule-pilot-001.md`](../reports/2026-09-03-beam-alternating-policy-schedule-pilot-001.md), [`../reports/2026-09-03-beam-staged-three-policy-pilot-001.md`](../reports/2026-09-03-beam-staged-three-policy-pilot-001.md).

## Cross-method handoff

The simplest beam→DFS form, handing one inherited beam state directly to DFS without a selection strategy, is closed negative for the tested population/profile pair. Shared state representation does not imply compatible search shape; fresh-gate DFS was materially better.

A **genuine state-selection mechanism** that chooses a DFS-suitable frontier state remains a distinct untested form. It has no current priority merely because it remains logically open.

Evidence: [`../reports/2026-09-03-beam-to-dfs-handoff-pilot-001.md`](../reports/2026-09-03-beam-to-dfs-handoff-pilot-001.md).

## Research interpretation

Resumability changes the executable cost of “give this attempt another tranche”:

```text
0→W + resume W→W+Δ
```

instead of repaying:

```text
0→W + restart 0→W+Δ
```

That can matter for racing/dynamic allocation, but a useful continuation primitive does not itself prove that continuation should receive production work. Scheduler value must be established under a fixed/shared work envelope and current residual population.

## Reopen/extension gates

Do not generalize resumability merely because the primitive exists. Additional work needs a current workstream premise and should isolate one of these distinct questions:

- same search, later tranche value;
- same frontier, materially different future beam policy;
- selected-state cross-method handoff;
- memory/runtime overhead of retained continuations;
- only after those earn it, persistence/checkpointing across process boundaries.

Any production-facing policy remains level-blind and follows [`solver-scheduling-policy.md`](solver-scheduling-policy.md), [`solver-budget-determinism.md`](solver-budget-determinism.md), and [`solver-research-operating-model.md`](solver-research-operating-model.md).

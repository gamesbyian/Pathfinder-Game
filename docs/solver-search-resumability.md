# Resumable solver search

> **Status:** bounded feasibility research. The live gate is owned by [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **Motivation:** the 2026-09-03 dynamic tranche-value pilot found real continuation-value information, but current attempts cannot resume; allocating more work requires restarting and repaying prior work.

## Question

Can a capped search preserve enough in-memory execution state that a later tranche continues from the exact budget boundary instead of restarting from zero?

The first target is **one deterministic beam configuration only**. This is not authorization to make every solver family resumable.

## Why this matters

Current static portfolios assign bounded work to independent attempts. A later scheduler may correctly infer that a censored attempt deserves more work, but without resumability the executable treatment is a larger fresh restart. The dynamic tranche pilot demonstrated the consequence: capped attempts had later rescues, yet unused same-envelope work could not fund any 2x restart.

A real continuation primitive would make the economic unit genuinely incremental:

`search 0→W` + `resume W→W+Δ`

rather than:

`search 0→W` + `restart 0→W+Δ`.

This could support both dynamic allocation and static racing/interleaving without double-paying early work.

## Scope

Start with **in-memory continuation inside one `solveLevel()`**. Do not design serialization, persistence across processes, checkpoint compatibility, or resumability for DFS/IDA/repair until beam earns the abstraction.

Beam is the first candidate because the current implementation already materializes parent-pointer frontier nodes and reconstructs one mutable working state while walking the frontier.

A continuation may need to own, at minimum:

- current frontier/beam and phase/depth;
- parent-pointer nodes and retention/dedup state needed for the next phase;
- deterministic insertion/tree ordering counters;
- enough mutable path/constraint state to reconstruct the next frontier node correctly;
- search/work counters and explicit budget-boundary state;
- any PRNG state if the selected configuration is randomized.

The continuation object must not own level identity-derived policy or hidden historical outcomes.

## Feasibility pilot

Use one existing deterministic beam action on a small set of real levels.

For each case compare:

1. uninterrupted execution to work ceiling `W + Δ`;
2. execution to `W`, pause at the deterministic work boundary, then resume the same continuation for `Δ`.

Prefer several boundaries and both solved/unsolved cases.

### Success

The resumed path should reproduce uninterrupted search strongly enough to establish semantic continuation:

- same solve/unsolved result;
- same solution when solved;
- same cumulative `workSpent`;
- same nodes/attempt outcome where those are deterministic;
- ideally the same frontier/search trace after the boundary.

Checkpoint/resume overhead and retained memory must be modest relative to the search being preserved.

### Stop

Do not generalize the architecture if:

- a pause boundary cannot be made deterministic without invasive search redesign;
- resumed execution changes search semantics in unexplained ways;
- retained state approaches a duplicate full solver/level state with large memory cost;
- bookkeeping/continuation overhead erases plausible tranche value.

A negative beam pilot closes this architectural form until a materially different mechanism appears.

## Architecture rules

- Continuation state is an **execution object**, not a scheduler policy.
- The scheduler decides whether to resume; the search engine owns what is required to resume correctly.
- Work accounting remains cumulative and canonical. A resumed `Δ` tranche must charge only newly performed work.
- Natural exhaustion produces no resumable continuation.
- A censored continuation must distinguish pause from failure/exhaustion.
- Default production behavior must remain unchanged until matched-work evidence promotes a policy that consumes continuations.
- Tests must guard fresh-vs-resumed equivalence and avoid hidden predecessor-state dependence.

## Beyond the pilot

Only after beam feasibility succeeds:

1. test whether resumable beam tranches make the existing lifecycle/censoring signal actionable under a fixed envelope;
2. test simple static racing/interleaving before sophisticated dynamic policies;
3. consider DFS/IDA continuations separately;
4. treat repair continuation/restart semantics as a distinct question;
5. consider serialization only if a real cross-process use case emerges.

Do not jump directly to hazard models, bandits, ML scheduling, generalized coroutine infrastructure, or persistent checkpoints.

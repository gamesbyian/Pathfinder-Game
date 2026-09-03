# Resumable solver search

> **Status:** bounded feasibility research. The live gate is owned by [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **Motivation:** the 2026-09-03 dynamic tranche-value pilot found real continuation-value information, but current attempts cannot resume; allocating more work requires restarting and repaying prior work.
> **2026-09-03: rung 1 (same beam, same policy: pause/resume equivalence) is concluded-positive.** `beamSearchFromGate` (`modules/solver/search.ts`) gained opt-in `resumeFrom`/`pauseAfterPhases` params — default off, no effect on any existing call site — that pause at a phase boundary and resume later, reproducing an uninterrupted run's solve/unsolved outcome, solution, and cumulative canonical work exactly. The continuation must carry the search's live mutable state (`ws`/undo stack) forward, not just the frontier — an initial frontier-only design silently overcharged work accounting by replaying from scratch on resume; see [`2026-09-03-beam-resumability-feasibility-pilot-001.md`](../reports/2026-09-03-beam-resumability-feasibility-pilot-001.md) for the full mechanism, measurement, and fix. This is a working primitive, not yet a scheduling win — rung 2 (below) is the next open step.

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

**2026-09-03: complete, concluded-positive.** See [`2026-09-03-beam-resumability-feasibility-pilot-001.md`](../reports/2026-09-03-beam-resumability-feasibility-pilot-001.md) and the status-block addendum above. The rest of this section is retained as the original pilot specification, not a still-open task.

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

## Policy switching and cross-method handoff

Resumability could support more than “same search, more work,” but there are two distinct mechanisms and they should not be conflated.

### Same-state policy switching

The lower-risk extension is to resume the **same beam frontier** under a different continuation policy. The already-paid search state is retained; only the policy governing future expansion changes.

Possible switches include:

- scoring profile;
- structural ordering bias;
- beam width;
- retention/dedup policy;
- another beam-local choice whose semantics apply to future frontier expansion rather than past ancestry.

This enables a direct complementarity question that independent portfolio attempts cannot answer:

> Does policy B add more value when inheriting policy A's frontier than either A or B obtains by spending the same total work from the gate?

A positive result would recast some current “techniques” as **operators over a shared evolving search state**, rather than necessarily independent searches. It could support staged beam policies such as broad early exploration followed by specialist exploitation, or alternating operators within one fixed work envelope.

Policy switching requires its own equivalence/control discipline. The first resumed segment under policy B is not expected to reproduce an uninterrupted policy-A trace; the comparator is instead a fixed-work causal test against A-only, B-only, and fresh-start A→B alternatives. Any switching rule used in production must remain level-blind and use only legal current state/telemetry.

### Cross-method state handoff

Beam → DFS, beam → repair, or other algorithm changes are not strict continuation of one execution. They are **state handoff**: one search produces partial states/frontier candidates that another search consumes without rediscovering the prefix from the gate.

For example, beam → DFS might select one or a bounded number of beam frontier states and launch DFS from those exact residual states. Beam pays for breadth; DFS pays only for drilling deeper from the inherited states. A repair consumer might similarly inherit a promising partial path/residual configuration rather than reproduce it independently.

Cross-method handoff is more demanding because producer and consumer have different native execution state. It therefore requires a typed contract specifying:

- which partial-path/residual state is handed off;
- what history is required for exact legality and future resource accounting;
- how work already spent by the producer is charged;
- whether the consumer can reconstruct required internal state cheaply and exactly;
- how many frontier states may be handed off under the shared envelope;
- whether the handoff information is genuinely novel versus something the consumer could cheaply rediscover.

This is related to, but narrower than, the producer→consumer artifact idea in the research operating model. Do not build a general blackboard or universal shared-state substrate from this possibility alone.

### Research ladder

Do not skip rungs:

1. same beam, same policy: pause/resume equivalence;
2. same beam frontier, changed beam policy: fixed-work complementarity test;
3. shared beam frontier among multiple beam policies;
4. bounded beam → DFS handoff from selected frontier states;
5. only after repeated positives, consider a generalized shared search-state/operator architecture.

Repair handoff should remain separate because repair's value may depend on perturbation/restart semantics rather than continuation.

A failure at an earlier rung does not prove later handoff impossible, but it removes the main architectural justification for generalizing the resumable-state abstraction.

## Beyond the pilot

Only after beam feasibility succeeds:

1. test whether resumable beam tranches make the existing lifecycle/censoring signal actionable under a fixed envelope;
2. test simple static racing/interleaving before sophisticated dynamic policies;
3. test whether one beam policy can profitably inherit another's frontier under fixed work;
4. only if that succeeds, test bounded beam → DFS state handoff;
5. consider DFS/IDA continuations separately;
6. treat repair continuation/restart semantics as a distinct question;
7. consider serialization only if a real cross-process use case emerges.

Do not jump directly to hazard models, bandits, ML scheduling, generalized coroutine infrastructure, or persistent checkpoints.

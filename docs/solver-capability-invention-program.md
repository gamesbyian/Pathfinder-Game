<!-- agent-context-budget: warn=6500 max=8500 -->
# Solver capability invention program

> **Status:** active portfolio authority for acquiring solver capabilities that do not already exist.
> **Priority owner:** [solver optimization workstreams](solver-optimization-workstreams.md).
> **Semantic map:** [reasoning-capability atlas](solver-reasoning-capability-atlas.md).
> **Failure diagnosis:** [first-loss causal taxonomy](solver-first-loss-causal-taxonomy.md).
> **Deferred descendants:** [solver future work](solver-future-work.md).

## Purpose

The solver has mature machinery for exploiting capabilities it already owns: routing, staged budgets, retries, beam/DFS/repair composition, exposure, and matched-work evaluation. As that harvest queue contracts, solve growth must not depend on inventing ever-finer ways to redeploy the same reasoning.

This program makes **capability acquisition** an explicit research objective.

A capability is not a strategy flag, scorer profile, stage, or retry shell. It is a semantic operation the solver can perform: represent a completion-relevant fact, derive a new conclusion, preserve knowledge, compose facts, revise a causal commitment, manipulate a new search object, communicate a fact between search processes, or convert knowledge into a decision.

The goal is still the repository's ordinary goal: **new cold level-blind solves at acceptable machine-independent work**. Invention is not exempt from economics.

## Work classification

Every new solver proposal should be classified before implementation.

### HARVEST

The solver already possesses the relevant reasoning operation; the proposal changes exposure, placement, allocation, scheduling, dose, restart, retention policy, or composition.

Examples: protecting an existing late action from starvation; exposing an existing beam family to a missing archetype; dead-last retry of an existing treatment.

Harvest work remains valuable when evidence nominates recoverable latent capability. It should not automatically expand merely because an additional tuning axis exists.

### EXTENSION

An existing semantic primitive gains genuinely new scope, inputs, or consequences.

Examples: extending a sound propagation rule across a mechanic interaction it previously could not reason about; deriving a new actionable consequence from an existing graph invariant.

Extension enlarges reasoning coverage even when the underlying family already exists.

### INVENTION

The solver gains a semantic operation it previously lacked.

Examples include:
- representing mutually exclusive completion regimes;
- bounded per-instance joint-feasibility queries;
- reusable causal failure explanations;
- selective revision/backjumping from a causal explanation;
- backward or region-interface reasoning;
- preserving complete global structure while locally repairing it;
- solve-local typed fact handoff between search processes;
- an information-gathering action whose value is knowledge rather than immediate path progress.

New orchestration around unchanged intelligence is HARVEST, not INVENTION.

## Portfolio rule

A shrinking optimization queue is not evidence that solver idea-space is exhausted. It is evidence that the currently named harvest opportunities are being consumed.

Active solver research therefore maintains two concurrent fronts:

1. **Harvest front:** run cheap, strongly nominated experiments that may recover already-demonstrated capability.
2. **Acquisition front:** diagnose current misses and acquire missing semantic operations.

Harvest descendants do not inherit priority merely because they are implementation-ready. A weakly nominated tuning experiment competes with a well-grounded acquisition probe.

As harvest experiments become null, displacement-only, or pure repricing, capacity should move toward acquisition rather than manufacturing new tuning descendants.

## Demand before architecture

Do not begin capability acquisition by choosing an algorithm.

Begin with a current residual miss and ask:

1. **Representation:** what completion-relevant distinction is absent from solver state or preprocessing?
2. **Inference:** what conclusion would materially help here that the solver cannot derive?
3. **Composition:** what facts exist individually but cannot be reasoned about jointly?
4. **Persistence:** what useful knowledge is derived and then forgotten?
5. **Action:** what known distinction has no pruning/ranking/retention/allocation/revision consumer?
6. **Revision:** can the solver identify which earlier commitment caused failure?
7. **Communication:** can another search process reuse the fact without rediscovery?
8. **Search object:** is a valid forward prefix the wrong intermediate object for this miss?
9. **Information:** could bounded work profitably buy knowledge instead of blindly extending search?

Record the answer as a **capability demand**, not as an algorithm recommendation.

## Primary acquisition instrument: first-loss demand sampling

[The first-loss causal taxonomy](solver-first-loss-causal-taxonomy.md) already defines the causal classes F0-F14. What is missing is prevalence and conversion from diagnosed loss to capability demand.

Run a stratified sample of current unsolved parents through the taxonomy using existing evidence wherever possible: production traces, compact failure response, exact/reference labels, sibling assets, known-support extinction, treatment participation, continuation evidence, counterfactual replay, and canonical validation.

For each parent, record:

- population and provenance;
- earliest resolved first-loss class, or `UNRESOLVED_EARLIER_CLASS`;
- evidence strength and unresolved earlier alternatives;
- minimal counterfactual intervention when established;
- work/allocation explanation if HARVEST suffices;
- otherwise the missing semantic operation in atlas dimensions;
- smallest probe that could test whether that operation matters;
- whether the demand is parent-specific, mechanism-family-specific, or recurrent across independent parents.

Do not force a capability label when causality is unresolved.

The durable machine-readable register is `data/stress/capability-invention-demand.json`, validated against `docs/solver-capability-invention-demand.schema.json`.

## Acquisition ladder

A candidate capability climbs this ladder:

### 1. EXISTENCE

Show that the proposed fact/relation/failure phenomenon occurs on real hard states.

A forensic anecdote may nominate the premise. It does not earn production work.

### 2. DISTINCTION

Show that the capability distinguishes states or decisions that existing production machinery treats equivalently or inadequately.

If production already makes the same decision, the tested consumer stops even when the semantic fact is real.

### 3. ACTION

Identify the smallest decision seam that could use the distinction: prune, retain, order, query, revise, decompose, hand off, route, or allocate.

Prefer a production-inert observer before a broad subsystem.

### 4. SOLVES

Test the smallest consumer on a frozen population with independent confirmation appropriate to selection pressure.

### 5. ECONOMICS

Compare at matched machine-independent work. A real semantic capability can still be uneconomic in a particular placement or implementation.

A negative at stages 2-5 closes only the tested form/consumer/economics contract. Preserve the parent semantic premise unless the evidence actually falsifies it.

## Capability probe contract

When practical, new reasoning probes should expose a small bounded interface conceptually equivalent to:

```text
current state -> YES | NO | UNKNOWN
             + optional witness/certificate
             + work spent
             + dependency/support metadata
```

This is not a mandate for one generic implementation. It is a research contract that makes unlike inventions comparable and allows bounded exact or conservative procedures to fail safely with `UNKNOWN`.

Natural users include:

- joint-obligation feasibility;
- future-intersection realizability;
- topology consequences;
- separator-side feasibility;
- excursion/order commutativity;
- causal conflict/core derivation;
- bounded backward/interface reachability.

Only sound `NO` may justify hard pruning unless a weaker consumer is explicitly declared.

## Initial acquisition themes

These are semantic demand families, not preauthorized architectures.

### Joint future feasibility

Production has strong individual necessary conditions and narrow joint propagators, but weak general reasoning about whether several individually feasible obligations can coexist.

Seek per-instance bounded consequences rather than another universal low-dimensional descriptor.

### Failure explanation and selective revision

Search often discovers eventual failure without retaining a causal explanation. Look for compact current-instance causes that can prevent rediscovery or identify a smaller revision locus than ordinary backtracking/restart.

Do not build a generic blackboard, clause learner, or backjumper before recurring useful facts exist.

### Completion regimes and regime-aware retention

Test whether strategically distinct completion futures are being conflated by scalar ranking or state retention. The object of interest is coverage of viable completion regimes, not generic feature diversity.

### Alternative search objects

Continue cheap falsifiers for objects other than valid forward prefixes: relaxed complete candidates, region/interface plans, backward abstractions, or other representations. Earn each architecture from a changed search geometry, not from conceptual attractiveness.

### Topology, parity, and other invariants

Observers matter only if they expose a decision-bearing distinction. Advance from invariant -> consequence -> smallest consumer. Avoid decorative descriptors.

### Solve-local knowledge

Measure repeated derivation before building persistence. A capability demand exists when the same sound fact or stronger equivalent is repeatedly paid for and could be reused across branches, attempts, stages, or search paradigms.

## What not to do

- Do not rename a new stage or retry as a new capability.
- Do not generate broad algorithm wishlists detached from current misses.
- Do not escalate from one forensic positive directly to architecture.
- Do not require cross-level recurrence of the *output* of a generic current-input procedure; require procedure generalization, soundness, decision value, and economics.
- Do not treat a shrinking active queue as a stop condition for premise generation.
- Do not reopen closed scorer/width/retry forms merely to keep an execution queue populated.
- Do not use known identities, answers, hints, or historical outcomes as cold production routing inputs.

## Promotion into the live queue

A capability-demand row may nominate a live research question when all are true:

1. the failure/demand is causally supported enough to rule out cheaper earlier explanations;
2. the missing operation is stated independently of a favored algorithm;
3. there is a bounded discriminator/probe with a declared decision-changing outcome;
4. the population and independence unit are explicit;
5. existing closed forms have been reconciled narrowly;
6. the cheapest useful next action is smaller than building the full architecture.

At promotion, register the research question in the ordinary question authority and let [solver optimization workstreams](solver-optimization-workstreams.md) own priority. This document is not a second execution queue.

## Near-term execution

The first program increment is deliberately modest:

1. establish the machine-readable demand register and validator;
2. populate a stratified seed sample from current residual evidence without launching expensive new sweeps;
3. measure how many rows resolve to HARVEST versus EXTENSION/INVENTION demand;
4. identify recurrent acquisition demands across independent parents;
5. promote only the smallest probe(s) that have both causal support and plausible solve leverage.

The important output is not a grand architecture plan. It is an empirical answer to:

> **What capabilities does the current residual actually demand?**

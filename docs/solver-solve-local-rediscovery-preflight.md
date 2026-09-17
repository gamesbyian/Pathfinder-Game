# Solve-local fact rediscovery preflight

> **Status:** DESIGNED / NOT YET EXECUTED.
> **Question:** does one cold solve repeatedly derive the same expensive sound or decision-useful current-instance facts across branches, attempts, or stages often enough that typed solve-local reuse could add capability or save material work?
> **Priority:** supporting investigation only. Do not leapfrog the active solve-acquisition queue in `solver-optimization-workstreams.md`.
> **Premise lineage:** [`solver-reasoning-capability-atlas.md`](solver-reasoning-capability-atlas.md), [`solver-capability-gap-stop-condition-reconciliation.md`](solver-capability-gap-stop-condition-reconciliation.md), and the August connectivity-certificate audits.

## Why this question is now worth asking

The old learned-failure-certificate line found that a connectivity boundary/reached-set abstraction recurred much more often than literal exact state inside the same level, but it stopped because the original experiment required cross-level recurrence. That correctly closed a shared cross-level reason checker; it did not test the newer, narrower premise that a **generic solve-local procedure may derive and reuse board-specific facts within one invocation**.

The 2026-09-16 level-blindness correction makes this route explicitly legal. Legality is not enough: this preflight exists to test rediscovery, sound-key feasibility, consumer reach and economics before any shared store or blackboard is built.

## Hypothesis

A meaningful fraction of expensive current-state reasoning is recomputed in one invocation under states that share a sound dependency projection or a reusable sufficient certificate.

The useful unit is not “same level ID” or “same historical winner.” It is a current-invocation fact with an explicit dependency contract.

## Candidate fact classes

Start with already-existing computations. Do not add exact solvers or new graph analyses merely to populate this study.

### A. Connectivity / residual reachability

Potential facts:

- goal unreachable;
- pending objective unreachable;
- residual volume insufficient;
- conservative boundary/blocker certificate where one can be expressed from facts cheaper than another flood fill.

Existing August Stage-B evidence is a nomination source because the same reached/boundary shapes recurred strongly within levels. It is not enough by itself to prove a reusable key or economic win.

**This fact class's own Phase 0 has already been run and closed.** `reports/2026-09-13-class5-dead-cause-current-population-rejoin-result-001.md` prespecified and tested exactly this population-survival question for the dominant connectivity-rejection cluster (goal-rejection, no pending must-pass/must-cross) on a 12-row current-Class-5 sample: only 1/12 levels met the required informativeness floor (needed >=6/12). The local recurrence signal is real on one level (`R03046`, 71-85% sharing) but does not survive broadly enough on the current residual to justify compact-cause extraction. Do not re-run this Phase 0 unchanged. The closure is population-scoped, not premise-scoped (`solver-capability-gap-stop-condition-reconciliation.md`'s `CROSS-LEVEL-CLOSED + OPEN-PER-INSTANCE`/`POPULATION-LIMITED` distinction applies): it reopens only with a materially changed residual or an independently nominated failure population. The fresh exact-DEAD sibling harvest (`solver-fresh-dead-sibling-harvest-preflight.md`, 75 states/25 parents, post-Class-4-promotion residual, with real exact labels the Sept-13 population lacked) is exactly such an independent nomination and is the natural way to reopen fact class A if this line is picked back up -- start fact-class rediscovery work on B/C/D instead of re-deriving this result.

### B. Admissible lower-bound results

MustPass/MustCross lower bounds already memoize projected numeric values. Treat these as a **positive control** for what sound dependency-keyed reuse looks like.

Measure their hit/reuse behavior only if existing telemetry or a tiny observer can do so without perturbing search materially. Do not rebuild the existing memoization experiment.

### C. Mechanic-specific proof facts

Examples: forced-neighbor consequences, portal parity facts, must-turn deadlock facts. Most are cheap to recompute and are expected negative controls for general memory. Include only enough to verify that the method does not “discover reuse” where reuse is economically silly.

### D. Future exact/interface facts

If fresh sibling/topology/separator work already pays for an exact or bounded interface query, record its dependency key and ask whether another branch/attempt asks the same question. Do not create such queries for this study.

## Phase 0: retained-evidence rejoin

Before new compute, inspect retained August connectivity-rejection records and any current lifecycle/attempt telemetry that can answer:

- recurrence within the same level split by action/stage, not just aggregate level;
- recurrence across distinct exact-state fingerprints;
- temporal distance/work gap between repeated abstract shapes;
- whether repeats occur after the originating action has ended, which is the minimum evidence for cross-attempt value;
- whether the existing record contains enough blocker/resource state to define a candidate key without another flood fill.

If retained evidence lacks action/stage or ordering identity needed for these questions, record the missing fields explicitly rather than guessing.

### Phase-0 advance gate

Advance to a current observer only if at least one fact family shows one of:

- substantial same-attempt re-derivation with a plausible cheaper key/check;
- cross-attempt/stage recurrence of a sound fact;
- expensive recomputation separated by enough work that sharing could matter.

If recurrence is almost entirely exact-state repetition already handled by local machinery, or matching requires recomputing the expensive analysis, stop.

## Phase 1: bounded current observer

Only if Phase 0 earns it, add an observational seam on a small residual-selected development cohort.

For each candidate fact record:

- current solve invocation ID scoped only in memory/tool output;
- canonical action/stage identity;
- work point;
- fact type and result;
- exact-state fingerprint for comparison only;
- declared dependency projection/certificate;
- derivation work/cost proxy if measurable;
- whether an earlier matching fact existed;
- whether the earlier fact came from the same action or another action/stage.

Observation must not alter:

- pruning;
- ranking;
- beam retention;
- attempt ordering;
- PRNG consumption;
- work budgets;
- connectivity scheduling/throttling.

## Soundness classes

Every candidate reusable fact must be placed in one of these classes before any behavioral reuse:

1. **EXACT DEPENDENCY MEMO** — result is a pure function of a proved-complete dependency key. Safe to reuse directly.
2. **SUFFICIENT CERTIFICATE** — stored literals imply the fact even if they are not future-complete state identity. Safe only while all certificate literals still hold.
3. **MONOTONE CERTIFICATE** — once true, current-state evolution cannot invalidate it within the declared scope. Requires an explicit monotonicity proof.
4. **EXPERIENCE ONLY** — recurrence predicts likely failure/value but does not prove it. May guide incomplete search, never hard-prune or assert equivalence.
5. **CORRELATED SIGNATURE** — observational only; no behavioral consumer until upgraded to one of the classes above.

This classification prevents a repeat of the semantic slippage between repair experience memory and logical nogoods.

## The connectivity-specific trap

A cached `reachedFingerprint` is not useful if computing the lookup key requires the same flood fill it is meant to avoid.

Therefore any connectivity reuse candidate must answer **before implementation**:

- what cheaper current-state facts select the cached certificate?
- why do those facts suffice for the exact action taken?
- can certificate validity be checked cheaper than `isConnected`?
- can it fire between ordinary connectivity checkpoints, creating earliness value, or only replace a scheduled flood fill?

If the only reliable key is the already-computed reached set, connectivity reuse is descriptive recurrence, not an optimization/capability premise.

## Metrics

Report separately:

- derivations by fact family;
- distinct dependency keys/certificates;
- repeat rate over exact state and over projected key;
- same-action vs cross-action vs cross-stage repeats;
- work between first derivation and reuse opportunity;
- estimated derivation work eligible to avoid;
- key/certificate construction and matching cost;
- coverage of residual rows/actions;
- any live counterexample to a proposed sufficient certificate.

Do not sum heterogeneous “saved calls” without canonical work/economic normalization.

## Advancement gates

A typed solve-local reuse prototype is earned only if one fact family satisfies all of:

1. recurrence is not merely exact-state duplication already captured locally;
2. the reusable result has an explicit soundness class appropriate to the consumer;
3. lookup/key validation is materially cheaper than re-derivation;
4. reuse opportunities cover meaningful work or expose earlier rejection/decision value;
5. evidence survives independent levels/parents as evidence that the **procedure** is useful, even though stored facts themselves are level-specific;
6. the candidate consumer can be isolated so a prototype does not require a general blackboard framework.

## First prototype shape, if earned

Build exactly one typed producer/consumer pair, for example:

`connectivity certificate producer -> later connectivity-check consumer`

or

`bounded interface query -> later branch/stage consumer`.

Do not begin with a generic knowledge bus, clause database, shared cache hierarchy, or cooperative portfolio.

## Stop conditions

Stop this line if:

- retained evidence shows no material rediscovery beyond exact state;
- useful recurrence is confined to facts cheaper to recompute than to store/match;
- any sound projected key becomes future-complete/expensive enough to recreate the original computation;
- reuse cannot cross the lifetime boundary of machinery already caching it;
- a proposed certificate has LIVE counterexamples or no soundness argument;
- observed savings are negligible relative to total retained-population work.

## Relationship to other work

- **Capability memory** is experiment-level research evidence, not solve-local memory.
- **Repair nogood cache** is an experience-only positive example with one-repair-call scope.
- **DEAD-core work** may eventually produce sound conflict facts; if so, this preflight supplies the reuse/economics questions, not the core-extraction method.
- **Cooperative blackboard portfolio** remains deferred until one concrete typed handoff proves that cross-process reuse pays.
- **Class-3 dose reconciliation** is an exposure question and should not be mixed into this capability study.

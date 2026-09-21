# Computational work elimination: connectivity certificate economics preflight

> **Status:** PRECOMMITTED OPPORTUNITY-SIZING DESIGN; no production behavior change.
> **Date:** 2026-09-21.
> **Parent:** [computational work elimination audit](solver-computational-work-elimination-audit-plan.md).
> **Existing producer:** `modules/solver/topology.ts` / `ConnectivityRejectionObserver`.
> **Historical evidence:** [Stage B connectivity rejection audit](../reports/2026-08-28-connectivity-rejection-stage-b-audit.md).
> **Prior solve-local closure:** [Lane C Phase 0](../reports/2026-09-17-lane-c-phase0-retained-evidence-rejoin-result-001.md).

## Question

The recurrence premise does not need to be rediscovered.

On the frozen 80-level Corpus-2 Stage-B population, the dominant goal-unreachable/no-pending-obligation cluster already showed:

- 12,905 rejection records;
- 7,934 distinct exact-state fingerprints;
- 3,661 distinct reached-set fingerprints;
- 83.1% of records in a reached-set shape shared by another record;
- 52.6% of records in an exact-state group shared by another record;
- recurrence overwhelmingly within one level rather than cross-level.

The successor question is therefore:

> **Can any cheaper sound pre-flood-fill certificate identify a useful fraction of those recurring connectivity deaths, or is the recurrence only knowable after paying for `isConnected()`?**

A second independent question is:

> **Could such a certificate fire earlier than the existing connectivity schedule often enough to remove downstream search rather than merely replace a scheduled flood fill?**

## Why this is materially different from prior work

The August Stage-B audit measured recurrence after the flood fill and explicitly did not measure matching cost or certificate soundness.

The September Lane-C Phase-0 rejoin correctly declined to build a new observer from the then-current residual because its tested compact-cause population did not clear its informativeness gate.

This preflight does not rerun either result.

It asks a narrower consumer-economics question against already-observed within-solve recurrence:

1. what information is available **before** the flood fill?
2. can that information prove a previously observed death still applies?
3. is checking that proof cheaper than the flood fill?
4. can it act at an earlier node than the normal connectivity checkpoint?

## Candidate certificate classes

Only classes with explicit proof semantics are admissible.

### C1 — exact dependency identity

A complete pre-BFS key proves that the inputs relevant to the connectivity result are identical.

This is sound but may be useless if constructing/comparing the key costs as much as connectivity or effectively serializes the whole search state.

### C2 — sufficient blocker certificate

A prior rejection leaves a finite set of literals such that, while those literals remain true, the relevant goal/objective remains unreachable.

Candidate literals may concern:

- specific static or permanently consumed boundary cells;
- used flippers;
- axis-exhausted cells;
- visited-wall conditions whose relevant revisit budget cannot recover;
- endpoint/objective side relation where a proved separator remains closed.

The certificate need not identify the entire reached component. It must prove the same rejection.

### C3 — monotone closure certificate

A previously proved obstruction remains true under all subsequent state evolution in a declared scope.

This is attractive because validation may be cheap, but monotonicity must be demonstrated for the exact literals. Ordinary path evolution can both consume resources and move the current position, so monotonicity must not be assumed from "more cells are used."

### C4 — correlated boundary signature

Examples: reached fingerprint or normalized blocker set after the BFS.

This class is **discovery only**. It cannot authorize skipped connectivity work because it is unavailable before the computation it is meant to avoid and is not itself a proof certificate.

## Source audit before runtime instrumentation

For each rejection subtype, inspect `isConnected()` and its helper predicates and enumerate the exact dynamic inputs that can change the result:

- current position;
- current/intersection reserve regime;
- visited / edge-use walls;
- pending must-cross exemptions;
- used flippers;
- portal reachability semantics;
- goal / pending objective target;
- remaining-volume requirement where applicable.

Then attempt to derive the **smallest proof-producing literal set**, not a generic state hash.

If every sound candidate requires reconstructing the reachable component or scanning essentially the same dynamic occupancy surface, stop before runtime work.

## Smallest production-inert probe if source audit survives

Do not alter connectivity behavior.

Extend the existing research-only observer with an optional **certificate-candidate evaluator** that runs only after an ordinary rejection has already occurred.

For each rejected state:

1. construct the proposed bounded certificate from already-materialized flood-fill/boundary data;
2. store its normalized literal identity;
3. on later candidate states in the same solve, before a scheduled connectivity call, test only the certificate's cheap literals;
4. **record a shadow hit but still run normal `isConnected()`**;
5. compare the shadow prediction with the real result;
6. record work point and whether the shadow could have fired at a node where connectivity was not otherwise scheduled.

The shadow must never:
- prune;
- alter connectivity throttling;
- change ordering;
- alter work budgets;
- change PRNG consumption.

### Required counters

Per certificate family:

- certificates produced;
- validation checks;
- validation cost proxy;
- shadow hits;
- shadow hits confirmed by real connectivity;
- false-positive count;
- exact-state vs cross-exact-state hits;
- same-attempt vs cross-attempt/stage hits if attempt context is available;
- hits at ordinary scheduled connectivity points;
- hits between scheduled connectivity points;
- connectivity calls that would be replaceable;
- estimated connectivity work avoided;
- estimated downstream work avoidable from earlier firing.

Any false positive closes that certificate form as a hard consumer.

## Work accounting

Use the solver's canonical work model where possible.

Two savings buckets must remain separate:

### Replacement savings

A sound certificate fires exactly where connectivity would have run.

Upper bound:

`avoided connectivity derivation work - certificate lookup/validation work`

This is a pure computation-reuse case.

### Earliness savings

A sound certificate can fire before the connectivity throttle would next run.

Upper bound:

`downstream search work from shadow-fire point to the later ordinary rejection`

This is potentially much larger, but only valid if the certificate is proved to remain applicable throughout that interval.

Do not count later work after a shadow hit if the ordinary run would not actually reject for the same certified reason.

## Population

Do not reuse the old Stage-B 80 rows for a promotion-shaped claim.

Use it only for certificate discovery and offline literal analysis.

If a candidate survives source audit, run the shadow probe on:

1. a small current hard-search development sample selected independently of certificate outcome;
2. if positive, an independent parent-level confirmation sample.

The unit of inference is parent/level, even though recurrence is measured within solve.

## Advance gate

A production-shaped prototype is earned only if one certificate family shows all of:

- zero false positives under shadow verification;
- a proof argument strong enough for the declared mechanic scope;
- validation materially cheaper than a fresh connectivity call;
- non-trivial recurrence across distinct exact states on multiple independent parents;
- measurable replaceable connectivity work **or** earlier dominated search work;
- no need for a generic proof store or whole-state canonicalizer.

## Stop gates

Close a candidate form if:

- its only useful key is the post-BFS reached fingerprint;
- proof validation reconstructs the same flood fill;
- recurrence is exact-state-only and already captured elsewhere;
- candidate literals are not monotone/sufficient under real mechanics;
- shadow hits are too rare;
- replaceable work is negligible;
- earlier firing cannot be made sound;
- storage/lookup exceeds derivation savings.

A negative here does not close other exact reason families. It closes the tested connectivity-certificate form.

## Implementation boundary

Do not implement memoization in this phase.

The first code, if earned by source audit, is a **shadow verifier** attached to existing research-only connectivity instrumentation. A behavioral consumer requires a separate matched-work safety/economics experiment.

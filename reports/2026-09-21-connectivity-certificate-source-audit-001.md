# Computational work elimination: connectivity certificate source audit 001

> **Status:** CONCLUDED-POSITIVE FOR ONE NARROW SHADOW CANDIDATE; no production behavior change.
> **Date:** 2026-09-21.
> **Parent preflight:** [connectivity certificate economics](../docs/solver-computational-work-elimination-connectivity-certificate-preflight.md).
> **Source inspected:** `modules/solver/topology.ts`, current PR #1947 branch.
> **Prior evidence:** [2026-08-28 Stage B](2026-08-28-connectivity-rejection-stage-b-audit.md).

## Decision

One bounded certificate form survives source audit and earns a production-inert shadow probe.

It is **not** "same reached fingerprint means same future."

It is a one-way sufficient cut certificate:

> On a portal-free level, if an earlier connectivity rejection produced a reached component (R) with target (t \notin R), and a later state has current position inside (R) while every cell on the earlier cardinal boundary of (R) is still non-traversable under the later state's connectivity predicate, then (t) is still unreachable.

This is **IMPLICATION**, not identity or equivalence.

The first probe should restrict further to the historical dominant cluster:

- rejection subtype `goal`;
- no pending must-pass;
- no pending must-cross;
- no reserved-wall regime;
- portal-free level.

That keeps the first theorem and consumer small.

## Why the theorem is sound in this scope

Let (R) be exactly the set reached by the earlier `isConnected()` flood fill.

On a portal-free grid, every path from a cell in (R) to a cell outside (R) must cross a cardinal adjacency from (R) to a cell outside (R).

Stage-B's boundary sketch enumerates every such outside cardinal neighbor and records why it was not traversable.

For a later state:

1. require the later current position to belong to the stored (R);
2. require the goal to remain outside (R) (fixed for this level and already true when the certificate was created);
3. re-evaluate every stored boundary cell using the later state's connectivity passability rules;
4. accept the certificate only if **every** boundary cell is still blocked.

Then no later connectivity path can leave (R), regardless of whether cells inside (R) have become less traversable. The goal therefore remains unreachable.

The certificate may safely miss opportunities. It must never accept if any boundary cell has become passable.

## Why portals are excluded initially

`isConnected()` traverses portal edges as non-local graph edges.

The current `ConnectivityBoundarySketch` enumerates cardinal boundary neighbors; it does not encode a complete portal-edge cut boundary.

Therefore the cardinal-boundary theorem above is incomplete on portal levels.

A portal-aware form could be derived later by including every portal transition crossing from (R) to outside (R), but current evidence does not require that generalization. First test the simpler portal-free form.

## Dynamic blocker semantics

The existing diagnostic classifier mirrors connectivity passability and recognizes:

- `static`;
- `used-flipper`;
- `axis-exhausted`;
- `visited-wall`.

For reuse validation the blocker does **not** need to remain blocked for the same historical reason. It only needs to remain non-traversable now.

That allows a single shadow validation helper to ask the current connectivity predicate whether each stored boundary cell is blocked.

### Static

Permanent by level definition.

### Used flipper

Once the flipper-used bit is set, current search semantics never unset it along one state history. Across a sibling state it may be unset, so validation must check current state rather than assume ancestry.

### Axis exhausted

`edgeUsage == 3` is a hard wall under current connectivity semantics. Across siblings it must be checked afresh.

### Visited wall

Depends on current visit count, remaining intersection regime, and must-cross exemption.

The first dominant-cluster scope excludes pending must-cross/reserved-wall complexity, but validation should still use the same current-state passability predicate rather than encode a weaker historical assumption.

## Why this can be cheaper than a flood fill

A fresh `isConnected()`:

- rebuilds dynamic passability as needed;
- floods a reachable component;
- checks target/objective reachability;
- computes fresh volume.

The candidate certificate validation needs only:

- O(1) current-position membership in stored (R);
- O(|boundary|) current blocker checks.

It performs no graph traversal.

This is not automatically cheaper: on a large/open boundary, `|boundary|` may approach grid size, while the bit-parallel fill is already highly optimized. The shadow probe must measure boundary-size distribution and lookup cost rather than assume a win.

## Relationship to historical Stage B

The 80-level Stage-B result already showed why this is worth sizing:

- exact-state sharing: 52.6% of dominant-cluster records;
- reached-set-shape sharing: 83.1%;
- recurrence overwhelmingly within a level.

But Stage B grouped records **after** each flood fill. It did not ask whether an earlier component's cut remained valid in a later state.

The new certificate is stronger semantically and cheaper computationally in principle:

- it uses the old reached set only for membership/target-side identity;
- it validates the complete old exit boundary under the new state;
- it never claims two residuals are equivalent.

## Smallest shadow experiment

Do not add a cache.

Add an opt-in research-only **certificate shadow** with one-solve lifetime.

### Producer

Only after a normal portal-free `goal` connectivity rejection in the simple dominant scope:

- retain the reached-set row bitset;
- retain the complete cardinal boundary cell list;
- retain minimal creation metadata (work point, optional exact-state fingerprint for analysis).

Bound the number of retained certificates. If capacity fills, stop recording new certificates; never evict in a way that changes search.

### Consumer shadow

At a later **scheduled connectivity point** in the same solve, before the real flood fill:

1. scan retained certificates newest-first or cheapest-boundary-first under a fixed research-only policy;
2. require current position membership in stored (R);
3. validate all boundary cells are currently non-traversable;
4. if one validates, record a shadow hit;
5. still run the ordinary `isConnected()`;
6. record whether ordinary connectivity also rejects on goal reachability.

Starting with scheduled points gives an empirical safety differential without extra flood fills and without changing search behavior.

Do **not** test unscheduled earliness in Phase 1. That would complicate verification and work accounting before replacement economics are known.

### Required measurements

Per parent and aggregate:

- certificates produced;
- retained certificate count / capacity censoring;
- boundary-size distribution;
- validation attempts;
- boundary-cell checks;
- shadow hits;
- hits across a different exact-state fingerprint;
- ordinary connectivity confirmation for each hit;
- false positives;
- connectivity calls potentially replaceable;
- canonical connectivity work units potentially replaceable;
- certificate construction overhead;
- certificate validation wall/work proxy;
- total solve work.

If a shadow hit occurs but ordinary connectivity rejects for a different subtype, report it separately. The first hard consumer is only licensed for the proved goal-unreachable implication.

## Phase-1 success gate

Advance to a behavioral matched-work prototype only if:

1. **0 false positives** in development shadow verification;
2. repeated hits occur on multiple independent parents;
3. a material share of scheduled connectivity calls is replaceable;
4. average validation cost is clearly below the replaced connectivity computation;
5. the candidate remains useful after certificate-construction overhead;
6. no large/full-state key is needed.

A positive Phase 1 still licenses only portal-free, simple-scope goal-unreachability replacement.

## Phase-1 stop gate

Close this certificate form if:

- hits are rare despite the old reached-shape recurrence;
- boundary scans cost approximately as much as the bit-parallel fill;
- most matching components fail current blocker validation;
- exact-state recurrence explains nearly all confirmed hits;
- retained-certificate lookup cost dominates;
- any false positive occurs;
- savings are negligible relative to whole-solve work.

If replacement economics fail, do not proceed to earlier-than-scheduled firing.

## Possible Phase 2, only after positive replacement economics

Then ask whether the same certificate can be checked at nodes where connectivity is currently throttled off.

That is an **earliness** experiment, not the same experiment.

A bounded research observer could record certificate hits at unscheduled nodes and replay a capped sample offline to measure how much search occurs before the ordinary connectivity schedule would discover the same obstruction.

Do not mix that with Phase 1.

## Engineering note

The current Stage-B `ConnectivityBoundarySketch` serializes `reachedFingerprint` as hex text for artifacts. The runtime shadow should keep row bitsets/compact cells in memory and serialize only bounded examples/summaries.

Do not turn the artifact encoding into a hot-path representation.

## Result

**One narrow shadow probe is earned.**

This is a stronger stopping point than "connectivity recurrence looks interesting": the candidate now has a proof class, mechanic scope, producer, consumer, cost model, safety differential, and exact stop gate.

No production memoization or pruning change is earned yet.

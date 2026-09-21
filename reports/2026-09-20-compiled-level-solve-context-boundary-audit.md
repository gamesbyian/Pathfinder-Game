# Compiled-level / solve-context boundary audit

> **Status:** concluded architecture inventory; implementation remains measurement-gated.
> **Date:** 2026-09-20
> **Parent plan:** [`../docs/solver-batch-digestion-architecture-audit-plan.md`](../docs/solver-batch-digestion-architecture-audit-plan.md)
> **Evidence role:** static ownership/dependency audit.
> **Decision:** the current `PrepLevel` has a viable conceptual split into immutable compiled problem data and fresh solve-local execution state. Do not implement the split until current-head fixed-cost and reuse-frequency measurements show enough ceiling.

## Question

Is `PrepLevel` merely a convenient bag of solver data, or does it currently fuse two distinct architectural objects whose separation could enable safe compile-once / solve-many execution?

## Verdict

Yes, the type fuses two lifetimes.

A clean conceptual model is:

```ts
interface CompiledLevel {
    level: NormalizedLevel;
    compileKey: CompileKey;
    // immutable geometry, indexes, distance/resource tables,
    // static mechanic/landmark derivations, initial masks
}

interface SolveContext {
    compiled: CompiledLevel;
    // work meter / caps / metrics / observers / cfg
    // state buffers / continuations / attempt-local context
    // optional solve-local memo tables
}
```

This is a **conceptual boundary**, not yet an implementation prescription. The present function signatures pass `(level, prep)` throughout the solver, so a premature split could create widespread churn for negligible wall benefit.

## Dependency classes

### G — grid geometry / static occupancy

Likely dependent on grid dimensions plus static passability/object placement:

- `gridW`;
- `reachBlockedArr`;
- `reachPassableRows`;
- `staticNeighborKeys`;
- `deadFlipperKeys`;
- `gateFlags`.

These are potential family/shared-compilation candidates only when the relevant occupancy is unchanged.

### O — objective placement

Depends on goal/must-pass/must-cross placement and static movement geometry:

- `distMap`, `goalDistArr`, `guidanceGoalDistArr`;
- `mustPassDistMaps`, `mpDistArrs`;
- `mustCrossDistMaps`, `mcDistArrs`;
- `objectiveDistMaps`, `objDistArrs`;
- `mustPassToGoalDist`, `mustCrossToGoalDist`;
- `mpPairDist`, `mcPairDist`;
- `objectiveKeys`;
- `mustPassIndex`, `mustCrossIndex`;
- `initialMustMask`, `initialMustCrossMask`;
- `mustMaskForDFS` (also challenge-metric dependent through required-path coverage).

A child variant that changes only required length may reuse most of this class; a moved objective invalidates its related distance family.

### M — mechanic placement/state model

- `flipperIndexMap`, `flipperKeys`, `flipperInitAxes`;
- `flipperApproachEven`, `flipperApproachOdd`;
- `mcApproachDistMaps`;
- `parityPortalDistMaps`;
- `gateForcedFirstStepKey`;
- level-static joint-obligation clusters.

The exact dependency differs by field. This is where an incremental compiler would need a real invalidation graph rather than a single "mechanics changed" bit.

### L — landmark placement

- surround neighbor masks/index/keys/distances;
- adjacent-turn indexes/distances;
- must-turn keys/dirs/index/distances;
- initial surround/adjacent-turn/must-turn masks;
- `hasLandmarkConstraints`.

### C — challenge metric

Required path length/intersection targets do not invalidate every static geometry table. They do affect at least routing/density-derived decisions such as `mustMaskForDFS`, and downstream search policy may depend on them through the normalized level.

This is important for required-length sweeps: their current full `prepLevel()` rebuild is broader than the conceptual invalidation caused by changing only `reqLen`.

### P — preparation option

Current compile options are semantically material:

- `allowFalseGoalNeighbors` changes the passability assumptions used by distance-map construction for false-goal trigger search;
- `includeParityPhaseGoalDist` determines whether optional parity-phase arrays are built.

A reusable artifact therefore needs a compile key. A minimal conceptual key is not merely `level.id`; it must include semantic level identity and compile-option polarity.

## Execution-local fields

The following must not be shared as immutable compiled problem state:

- `_workMeter`;
- `_workCap`;
- `_strictWorkCap`;
- `_metrics`;
- `_cfg`;
- `_forcedFirstStepKey`;
- `_forcedPortalExitKey`;
- `_stateBufs`;
- research observers/counters/attempt contexts;
- repair research seed and sinks;
- test-only representation flags.

The concurrency history around `_workMeter` and `_stateBufs` is especially load-bearing. Both were moved away from module-global ownership after real cross-solve interference. Any compile-reuse design that places them on a shared compiled object would recreate the same bug class.

## Lazy caches: three different cases

### Lower-bound memo tables

`_mpLowerBoundCache` and `_mcLowerBoundCache` cache exact deterministic lower-bound values. Current comments establish safety across attempts/gates *within one solve*. Broader reuse is plausible but not automatically authorized because:

- cache use is ablation-gated;
- key completeness must be re-audited against every value dependency;
- memory growth across many solves could dominate saved compute;
- concurrent solves would need immutable/read-safe or synchronized ownership;
- benchmark semantics must decide whether a warm cross-solve cache is legal for the target use.

Disposition: **separate opportunity question, not part of the first compiled-level prototype.**

### Joint-obligation clusters

`findObligationClusters` explicitly states the candidate clusters are level-static and currently caches them on `prep`. This field is the cleanest example of something whose present solve-local lifetime is shorter than its semantic lifetime.

It is also cheap to recompute, so its architectural purity does not imply performance value.

### Search-state buffers

These are reuse-by-allocation, not memoized knowledge. They must remain execution-local.

## Normalized level ownership

The normalized `level` object itself contains Maps/Sets and arrays that search treats as static. A future `CompiledLevel` need not copy it. The natural shape is to retain the normalized level by reference and add derived immutable tables.

This avoids turning the refactor into a serialization redesign.

For persistent/cross-process compilation, serialization becomes a separate project and must be earned independently.

## Proposed compile key

For same-process reuse, prefer semantic identity over incidental object identity:

```
CompileKey = hash(
    normalized level semantics,
    allowFalseGoalNeighbors,
    includeParityPhaseGoalDist
)
```

However, hashing itself has cost. The cheapest first prototype, if earned, may instead cache by the normalized level object's identity in a caller that already reuses that object. That would test the economics without designing a persistent identity protocol.

Only if cross-call callers reconstruct equivalent normalized objects does semantic hashing become necessary.

## Minimal implementation path if Phase 1 earns it

Do not begin with a global cache.

1. Introduce an internal static-data builder returning a `CompiledLevelData` subset.
2. Keep `prepLevel()` as the compatibility constructor:
   - obtain/build static data;
   - create a fresh execution shell;
   - attach/reference static data.
3. Add one explicit `solveCompiledLevel()` or internal orchestration seam only for the measurement caller.
4. Compare:
   - cold ordinary solve;
   - compile once + repeated solve contexts;
   - memory retention;
   - exact search/work parity.
5. Remove the seam if realistic reuse counts do not repay complexity.

This preserves current public API until reuse is proven.

## Required measurement before implementation

Phase 1 should answer:

1. current HEAD median/p90 validation, normalization and prep time on:
   - published/many-short;
   - realistic mixed;
   - hard C2 sample;
2. same-level solve multiplicity in the expensive research workflows;
3. expected retained compiled bytes per resident level;
4. break-even reuse count:
   `compile overhead saved / cache-management + memory cost`;
5. how often compile-option differences defeat reuse.

The new `scripts/solver-batch-cost-probe.mjs` exists to answer item 1 without first changing production code.

## Incremental family compilation implications

The dependency classes above imply that "family reuse" should not initially mean "copy the parent's whole compiled object."

Instead, size reuse by field family:

- same geometry, changed challenge metric;
- same geometry/object placement, moved goal;
- one added/removed block;
- one moved must-pass/cross;
- symmetry transform;
- mechanic-only delta.

For each generator family, count how often each dependency class remains invariant. Only then decide whether partial invalidation machinery has enough hit rate.

## Relationship to whole dense-core idea

A `CompiledLevel` split and a solver-native dense-ID representation are independent decisions.

A compiled boundary could keep current packed keys and still pay off via reuse.
A dense-ID core could be useful even without cross-solve reuse.

Do not bundle them into one experiment. The historical six-array dense conversion already showed why representation changes can improve fixed cost while hurting the hard hot path.

## Disposition

- **Conceptual split:** supported by current ownership/lifetime evidence.
- **Implementation:** deferred pending Phase 1 ceiling and reuse-frequency measurements.
- **Persistent compiled artifacts:** further deferred.
- **Cross-solve lower-bound memoization:** separate correctness/economics audit.
- **Family partial compilation:** opportunity-size from actual variant deltas before implementation.

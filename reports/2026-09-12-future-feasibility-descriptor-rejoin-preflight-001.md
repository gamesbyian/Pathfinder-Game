# Future-feasibility descriptor rejoin preflight 001

> **Status:** superseded
> **Last evidence:** 2026-09-12 — prespecified six-descriptor pass executed over the expanded exact-labelled B1/B2 + `R03229` set; result is recorded in `2026-09-12-future-feasibility-descriptor-rejoin-result-001.md`.
> **Decision:** this document remains the frozen pre-result specification proving the candidate set was fixed before empirical inspection.
> **Remaining gate:** none; the result report owns the disposition.

## Fixed candidate set

This pass tests six scalar summaries from the three already-authorized families. No additional descriptors may be added after result inspection without a new premise.

### Exact-resource attainable capacity

1. **`intersectionCapacitySlack`** = count of previously visited, non-terminal cells that remain categorically re-enterable at least once, minus intersections still required. This is an optimistic capacity summary, not a prune.
2. **`freeIntersectionSlackAfterMustCross`** = intersections still required minus the number of pending must-cross obligations. This is deliberately simple and may prove redundant with existing resource accounting.

### Residual topology scarcity

3. **`pendingLowDegree2`** = count of pending must-pass/must-cross obligation cells with at most two cardinal neighbours that are not categorical hard walls under the current state.
4. **`minPendingDegree`** = minimum such currently-usable cardinal degree across pending must-pass/must-cross obligations.

These are predictive summaries only. They do not assert that low degree is a sound dead-state proof; previous work explicitly established that generic degree pruning is unsound.

### Joint-obligation compatibility

5. **`activeJointClusters`** = number of currently active clusters returned by the existing observer-only joint-obligation evaluator.
6. **`jointRejects`** = number of those clusters receiving its existing `reject` verdict.

This reuses the already-defined obligation semantics rather than inventing a second model.

## Negative controls / guards

The output also records remaining intersections, pending must-cross, pending must-pass, and real path length as context/negative controls. Progress masks, bucket identity, historical level identity, exact labels, family identity, stored hints, and capability-memory membership are never runtime candidate inputs.

The clean/confounded mechanic-composition cases and perturbation susceptibility remain external calibration only. They cannot select a descriptor and then validate it.

## Advancement gate

A result is premise evidence only if a descriptor distinguishes exact future feasibility across unrelated parents while adding information beyond obvious progress/resource state. Perfect separation is not required; one-level or one-family separation is insufficient. A descriptor that simply duplicates an existing prune, progress count, or one specimen's geometry closes rather than advances its route.

No solver behavior changes in this pass. Any treatment requires a separate bounded implementation/confirmation step.
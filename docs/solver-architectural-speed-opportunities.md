# Solver architectural speed opportunities

> **Status:** supporting program; no current candidate is nominated.
> **Priority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **History:** [`archive/snapshots/solver-architectural-speed-opportunities-2026-09-04-pre-consolidation.md`](archive/snapshots/solver-architectural-speed-opportunities-2026-09-04-pre-consolidation.md) plus dated reports.

This document keeps only current speed-research rules, surviving opportunities, and closed forms. Experimental chronology belongs in reports/archive.

## Working rule

Internal representation, traversal plumbing, object shape, module boundaries, and implementation language are not compatibility contracts. Correctness, level-blindness, deterministic work semantics, and measured solve/search behavior are.

Profile first. A pure implementation speedup should preserve logical search decisions and `workSpent`; changed ordering/search extent is a behavior experiment and needs matched-work evaluation. Microbenchmarks nominate work but do not establish end-to-end value.

Implementation speed creates latency headroom. The scheduler, not the speed optimization, decides whether that headroom should buy additional search.

## Current dispositions

### Scoring specialization

A bounded plain/default/no-template fast path preserved solve/node traces but did not improve representative end-to-end wall time. That branch-deletion specialization is **closed negative**.

Reopen scorer specialization only with a materially different mechanism that removes/fuses measured computation rather than deleting statically impossible branches from the same generic scorer.

Evidence: [`../reports/2026-08-26-current-head-specialized-scorer-pilot.md`](../reports/2026-08-26-current-head-specialized-scorer-pilot.md).

### Candidate apply/evaluate/undo fusion

Profiling established candidate generation/apply/undo as a major beam cost center. The bounded mechanic-free fused JS kernel preserved decisions but regressed/failed to improve end-to-end time and had narrow eligibility. That exact per-candidate branch-inlining form is **closed negative**.

Two nearby allocation-avoidance descendants were also closed by value-of-information measurement before implementation:

- fixed neighbor-slot replacement: `getNeighbors` itself was only a minority of candidate-generation cost;
- batched-candidate/object-allocation restructuring: targeted allocation share was also too small relative to the already-negative superset.

A future hot-loop candidate needs a materially different mechanism, not another reshuffling of the same dead branches/allocations.

Evidence: [`../reports/2026-08-27-beam-cost-breakdown-candidate-generation-dominant.md`](../reports/2026-08-27-beam-cost-breakdown-candidate-generation-dominant.md), [`../reports/2026-08-27-fused-plain-candidate-kernel-pilot.md`](../reports/2026-08-27-fused-plain-candidate-kernel-pilot.md), [`../reports/2026-09-02-getneighbors-allocation-share-pilot.md`](../reports/2026-09-02-getneighbors-allocation-share-pilot.md), [`../reports/2026-09-02-batched-candidates-allocation-share-pilot.md`](../reports/2026-09-02-batched-candidates-allocation-share-pilot.md).

### Dense level-local indexing

Dense indexing remains viable only when it removes both storage and hot indirection:

- removing the large `cellDenseIndex` indirection while retaining row-major `staticNeighborKeys` was positive on published short solves and approximately flat on the hard Corpus-2 sample;
- naively converting six mechanic arrays to dense storage regressed the hard sample, likely because repeated `denseIndex()` arithmetic moved into hot readers.

Future dense-storage work must be profile-led and should hoist/reuse row calculation per hot key rather than independently recomputing it for each metadata read.

Evidence: [`../reports/2026-08-26-dense-index-architecture-followup.md`](../reports/2026-08-26-dense-index-architecture-followup.md).

### Beam materialization/replay

Do not build snapshots/checkpoint-plus-delta materialization merely because parent replay exists. Measure current replay share first. Reopen only if replay is again a material end-to-end cost center.

### Work-meter/secondary overhead

Only optimize meter/accounting/secondary plumbing when profiling shows material cost. Exact budget/provenance semantics must survive unchanged.

## Native/WASM boundary

Broad per-candidate native/WASM migration is closed under the current solver shape: enough mutable mechanic/path/search state crosses the boundary that avoiding frequent crossings becomes a search-core migration rather than a compact kernel optimization.

Reopen only when all are true:

- a compact kernel owns material end-to-end time;
- inputs/state cross a small stable boundary;
- a disposable prototype is cheap;
- logical work/decisions can be preserved or precisely compared.

Measure boundary/copy/setup/JIT cost and both short-solve and long-hard workloads. A fast microkernel without representative end-to-end gain is negative evidence.

Evidence: [`../reports/2026-08-24-speed-substrate-static-audit.md`](../reports/2026-08-24-speed-substrate-static-audit.md).

## Other closed unchanged forms

Do not retest without new profile/mechanism evidence:

- exact DFS/beam transposition/dedup as a major speed opportunity when measured true beam duplicates remain negligible;
- removing coarse beam dedup, which also performs survivor compression/diversity management;
- fixed-width numeric beam signatures that assume obsolete mechanic cardinalities;
- `UndoToken` object pooling;
- beam quickselect when sort is not dominant;
- sparse→dense conversion justified only by cache-locality intuition;
- naive multi-array dense conversion with repeated hot `denseIndex()` calls;
- pre-resolving ablation gates while retaining the same scorer;
- custom hash tables merely because native `Map` looks high-level.

Dated reports own exact historical measurements.

## Measurement protocol

A speed candidate should normally provide:

1. current-HEAD profile showing the target is material;
2. representative short and hard workloads;
3. pinned deterministic work / non-binding deadlines;
4. solve/node/search-signature parity before timing is interpreted when the candidate claims pure speed;
5. interleaved repeated timing, not a single wall-clock observation;
6. end-to-end movement large enough to matter beyond the microbenchmark.

If behavior changes, stop calling it a pure speed optimization and evaluate it through the solver research/promotion process.

## Reopen gate

No speed implementation is currently earned by this document. Reopen when a fresh profile identifies a material hotspot and a candidate has a mechanism materially different from the closed forms above.

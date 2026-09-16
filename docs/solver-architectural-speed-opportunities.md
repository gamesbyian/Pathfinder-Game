<!-- agent-context-budget: warn=8000 max=10500 -->
# Solver architectural speed opportunities

> **Status:** supporting program; no current candidate is nominated.
> **Priority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **History:** [`archive/snapshots/solver-architectural-speed-opportunities-2026-09-04-pre-consolidation.md`](archive/snapshots/solver-architectural-speed-opportunities-2026-09-04-pre-consolidation.md) plus dated reports.
> **2026-09-15 methodology review:** [`../reports/2026-09-15-speed-negative-methodology-review-001.md`](../reports/2026-09-15-speed-negative-methodology-review-001.md).

This document keeps only current speed-research rules, surviving opportunities, and disposition scope. Experimental chronology belongs in reports/archive.

## Working rule

Internal representation, traversal plumbing, object shape, module boundaries, and implementation language are not compatibility contracts. Correctness, level-blindness, deterministic work semantics, and measured solve/search behavior are.

Profile first. A pure implementation speedup should preserve logical search decisions and `workSpent`; changed ordering/search extent is a behavior experiment and needs matched-work evaluation. Microbenchmarks nominate work but do not establish end-to-end value.

Implementation speed creates latency headroom. The scheduler, not the speed optimization, decides whether that headroom should buy additional search.

### Speed-evidence disposition vocabulary

Do not compress all non-promoted speed ideas into "closed negative". Use four distinct meanings:

- **FALSIFIED_EXACT_FORM**: an actual treatment was implemented and lost under an adequate representative protocol. Do not retest unchanged absent a materially changed runtime/representation or evidence that the old protocol no longer answers the question.
- **DEFERRED_LOW_VALUE**: profiling/opportunity sizing says expected value does not justify implementation now. This is not evidence that the candidate would lose.
- **ARCHITECTURALLY_DEFERRED**: no compact/economical treatment boundary is currently apparent. This is not an empirical negative.
- **STALE_REPROFILE**: an older result may no longer transfer after a material runtime, bundler, object-shape, representation, search-core, or workload change. Reprofile before deciding whether to rerun.

A failed adjacent or broader-looking implementation can justify deferring engineering work; it cannot manufacture experimental evidence for a different treatment. Preserve **premise -> treatment -> measured result -> inference scope -> reopen condition**.

## Current dispositions

### Scoring specialization

A bounded plain/default/no-template fast path preserved solve/node traces but did not improve representative end-to-end wall time. That exact branch-deletion specialization is **FALSIFIED_EXACT_FORM**.

Reopen scorer specialization only with a materially different mechanism that removes/fuses measured computation rather than deleting statically impossible branches from the same generic scorer. Do not generalize this result into "scorer work is exhausted" or "V8 already optimizes every useful form."

Evidence: [`../reports/2026-08-26-current-head-specialized-scorer-pilot.md`](../reports/2026-08-26-current-head-specialized-scorer-pilot.md).

### Candidate apply/evaluate/undo fusion

Profiling established candidate generation/apply/undo as a major beam cost center. The bounded mechanic-free fused JS kernel preserved decisions but regressed/failed to improve end-to-end time and had narrow eligibility. That exact per-candidate branch-inlining form is **FALSIFIED_EXACT_FORM**.

Two nearby allocation-avoidance descendants were measured but **not implemented** and therefore are not empirical negatives:

- **fixed neighbor-slot replacement / `getNeighbors`: DEFERRED_LOW_VALUE.** The September pilot found `getNeighbors` only a minority of candidate-generation cost. Its prior "negative superset" argument was invalid because the fused candidate-kernel experiment explicitly left neighbor generation untouched. Reopen only if a current-head profile makes the cost material enough to justify a cheap fixed-slot treatment.
- **batched-candidate/object-layout restructuring: DEFERRED_LOW_VALUE.** The September pilot found candidate-object construction/allocation a modest share. The fused-kernel experiment did not test batching/layout and cannot close it by analogy. Reopen only if current profiling plus a concrete batch/layout design yields worthwhile expected end-to-end value.

A future hot-loop candidate needs a measured current cost and a concrete mechanism. It need not be categorically different from every historical idea; it must differ materially from any **actually falsified treatment** being invoked as negative evidence.

Evidence: [`../reports/2026-08-27-beam-cost-breakdown-candidate-generation-dominant.md`](../reports/2026-08-27-beam-cost-breakdown-candidate-generation-dominant.md), [`../reports/2026-08-27-fused-plain-candidate-kernel-pilot.md`](../reports/2026-08-27-fused-plain-candidate-kernel-pilot.md), [`../reports/2026-09-02-getneighbors-allocation-share-pilot.md`](../reports/2026-09-02-getneighbors-allocation-share-pilot.md), [`../reports/2026-09-02-batched-candidates-allocation-share-pilot.md`](../reports/2026-09-02-batched-candidates-allocation-share-pilot.md).

### Dense level-local indexing

Dense indexing remains viable only when it removes both storage and hot indirection:

- removing the large `cellDenseIndex` indirection while retaining row-major `staticNeighborKeys` was positive on published short solves and approximately flat on the hard Corpus-2 sample;
- naively converting six mechanic arrays to dense storage regressed the hard sample, likely because repeated `denseIndex()` arithmetic moved into hot readers. That exact multi-array/repeated-index form is **FALSIFIED_EXACT_FORM**.

Future dense-storage work must be profile-led and should hoist/reuse row calculation per hot key rather than independently recomputing it for each metadata read.

Evidence: [`../reports/2026-08-26-dense-index-architecture-followup.md`](../reports/2026-08-26-dense-index-architecture-followup.md).

### Beam materialization/replay

Snapshot/checkpoint-plus-delta materialization was not implemented in the historical closeout. "Replay is not the largest bucket" is prioritization evidence, not falsification. Current disposition: **DEFERRED_LOW_VALUE / REPROFILE**.

Reopen only if current replay is again a material end-to-end cost center and a concrete materialization design has plausible net savings after snapshot/write/read overhead. A 12-16% bucket can still be worth optimizing if much of it is cheaply removable; compare expected removable cost, not merely hotspot rank.

### DFS/beam transposition and dedup

Exact beam duplicate elimination is a credible **FALSIFIED_EXACT_FORM as a major speed reservoir** on the measured workload: after correcting an initially binding wall-cap experiment, genuine duplicates remained negligible. Do not conflate this with coarse beam dedup/survivor compression, which also manages diversity, or with semantic-equivalence schemes.

DFS transposition has weaker historical support because selected probes and exact-signature construction contaminate economics. Treat broad DFS transposition as **DEFERRED_LOW_VALUE / STALE_REPROFILE**, not a family-wide falsification. A materially cheaper incremental fingerprint is a different treatment and still requires a current hotspot/revisit-rate premise.

### `UndoToken`, sort selection, and hash layout

- reusable `UndoToken` pooling was implemented with parity and ran slower: **FALSIFIED_EXACT_FORM** under the current JS/V8/object-shape regime;
- beam quickselect was not implemented because sort was tiny relative to replay on the investigated profile: **DEFERRED_LOW_VALUE**, not falsified;
- the tested custom numeric hash arena failed to beat native numeric `Map`: **FALSIFIED_EXACT_FORM** under the current runtime/layout.

Runtime/compiler-sensitive exact-form negatives become **STALE_REPROFILE** after a material Node/V8, bundler/module, search-core, object-shape, or representation change, but only if profiling shows the hotspot remains relevant. Do not rerun on a calendar.

### Work-meter/secondary overhead

Only optimize meter/accounting/secondary plumbing when profiling shows material cost. Exact budget/provenance semantics must survive unchanged.

## Native/WASM boundary

Broad per-candidate native/WASM migration is **ARCHITECTURALLY_DEFERRED** under the current solver shape: enough mutable mechanic/path/search state crosses the boundary that avoiding frequent crossings becomes a search-core migration rather than a compact kernel optimization. This is an engineering deferment, not an empirical negative.

Reopen only when all are true:

- a compact kernel owns material end-to-end time;
- inputs/state cross a small stable boundary;
- a disposable prototype is cheap;
- logical work/decisions can be preserved or precisely compared.

Measure boundary/copy/setup/JIT cost and both short-solve and long-hard workloads. A fast microkernel without representative end-to-end gain is negative evidence only for that tested boundary/treatment.

Evidence: [`../reports/2026-08-24-speed-substrate-static-audit.md`](../reports/2026-08-24-speed-substrate-static-audit.md).

## Other exact-form negatives and deferments

Do not retest unchanged **FALSIFIED_EXACT_FORM** results without a material expiry trigger or changed treatment:

- scoring branch deletion while retaining the same generic scorer;
- mechanic-free fused per-candidate apply/evaluate/undo kernel;
- exact beam duplicate elimination as a major speed reservoir on the measured architecture/workload;
- naive multi-array dense conversion with repeated hot `denseIndex()` calls;
- `UndoToken` object pooling;
- the tested custom numeric hash arena versus native numeric `Map`;
- unconditional surround/adjacent-turn MST tightening in its historical per-candidate form.

Keep these as **DEFERRED_LOW_VALUE / profile-gated**, not falsified:

- fixed neighbor-slot / `getNeighbors` allocation avoidance;
- batched-candidate/object-layout restructuring;
- beam materialization/replay;
- beam quickselect while sort remains minor;
- broad DFS transposition;
- sparse→dense conversion justified only by cache-locality intuition without a measured reader/indirection mechanism;
- pre-resolving ablation gates unless a traceable historical negative with adequate provenance is recovered or a current profile makes the question worth revisiting.

Do not remove coarse beam dedup merely to save its local cost; it also performs survivor compression/diversity management, so that is a behavior experiment rather than a pure-speed edit. Fixed-width numeric signatures that assume obsolete mechanic cardinalities remain invalid on representation/correctness grounds rather than as speed negatives.

Dated reports own exact historical measurements.

## Measurement protocol

A speed candidate should normally provide:

1. current-HEAD profile showing the target is material;
2. representative short and hard workloads, plus mechanism/search-mode stratification when relevant;
3. pinned deterministic work / non-binding deadlines;
4. solve/node/search-signature parity before timing is interpreted when the candidate claims pure speed;
5. interleaved repeated timing, not a single wall-clock observation;
6. end-to-end movement large enough to matter beyond the microbenchmark;
7. both typical per-level latency and **total CPU/work-weighted runtime over the retained solve population** when the campaign objective is reducing total compute;
8. explicit instrumentation-overhead accounting when nested timers are inserted into hot loops.

Many tiny levels can dominate a per-level geometric mean while a small hard tail dominates actual compute. Do not choose one summary statistic and mistake it for the whole speed objective.

If behavior changes, stop calling it a pure speed optimization and evaluate it through the solver research/promotion process. A failed treatment rejects that treatment; it does not automatically falsify the underlying hotspot or causal premise.

## Reopen gate

No speed implementation is currently earned by this document. Reopen when a fresh profile identifies a material hotspot, the proposed treatment is concrete, and expected removable end-to-end cost justifies implementation. Historical exact-form negatives constrain unchanged treatments; deferred candidates remain legitimate if current evidence earns them.

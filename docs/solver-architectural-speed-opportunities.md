# Solver architectural speed opportunities

> **Status:** supporting program; no current implementation candidate is nominated.
> **Priority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **History:** [`archive/snapshots/solver-architectural-speed-opportunities-2026-09-04-pre-consolidation.md`](archive/snapshots/solver-architectural-speed-opportunities-2026-09-04-pre-consolidation.md) plus dated reports.
> **2026-09-15 audits:** [`negative review`](../reports/2026-09-15-speed-negative-methodology-review-001.md), [`full lineage audit`](../reports/2026-09-15-solver-performance-evidence-lineage-audit-001.md).
> **2026-09-21 batch-digestion closeout:** [`recovered execution evidence`](../reports/2026-09-21-solver-batch-digestion-audit-recovered-evidence-closeout-001.md).

This file owns current performance methodology/dispositions. Chronology and detailed measurements belong in reports. The live queue remains `solver-optimization-workstreams.md`.

## Evidence vocabulary

- **SUPPORTED_EXACT_FORM:** representative end-to-end gain with required search/work parity.
- **FALSIFIED_EXACT_FORM:** adequate representative implementation test lost.
- **DEFERRED_LOW_VALUE:** opportunity sizing makes implementation unattractive.
- **ARCHITECTURALLY_DEFERRED:** no economical treatment boundary is known.
- **STALE_REPROFILE:** historical magnitude may not transfer to current runtime/search.
- **EVIDENCE_INCOMPLETE:** decision-grade lineage is missing.
- **BEHAVIOR_CHANGE_NOT_PURE_SPEED:** judge as solver policy, not semantics-preserving speed.

Pure-speed work preserves logical search/work. Profiles nominate targets; only end-to-end evidence establishes value. Adjacent negatives do not falsify unimplemented mechanisms.

## Historical positives

| Treatment | Status | Scope |
|---|---|---|
| July bit-parallel connectivity + related hoists | **SUPPORTED_EXACT_FORM historically / STALE_REPROFILE** | Fixed-work A/B: ~-27.1% published, -13.2% hard-C2; identical node work. |
| Beam parent-tree frontier walk | **BEHAVIOR_CHANGE_NOT_PURE_SPEED** | Changed traversal and lost `R00526`; treat as search policy. |
| Lazy beam dedup/diversity keys | **SUPPORTED_EXACT_FORM historically** | Deterministic search/work parity plus material end-to-end gain. |
| Mixed-radix numeric beam keys | **SUPPORTED_EXACT_FORM historically / STALE_REPROFILE** | Strong parity/timing; later radix fixes changed the measured form. |
| Dense `staticNeighborKeys` | **SUPPORTED_EXACT_FORM within measured role** | Better short/batch overhead; hard-tail movement near noise. |
| Remove `cellDenseIndex` | **EVIDENCE_INCOMPLETE** | Replication reversed the first timing sign; retained for simpler representation. |

Evidence: [`July hot path`](../reports/2026-07-30-solver-hot-path-pure-speed.md), [`lazy keys`](../reports/2026-08-23-beam-dedup-key-lazy-build-experiment.md), [`numeric keys`](../reports/2026-08-23-beam-dedup-numeric-key-arena.md), [`dense static neighbors`](../reports/2026-08-23-dense-static-neighbor-keys.md), [`dense follow-up`](../reports/2026-08-26-dense-index-architecture-followup.md).

## Current batch-digestion ceilings (2026-09-21)

- Raw validation/normalization is negligible for solver speed. Fresh medians were 0.003-0.018 ms for normalization across published/Corpus-1/Corpus-2 samples.
- `prepLevel` is measurable but a tiny share of realistic solve wall: about **0.335%** of a 160-level published fixed-node run and **0.0113%** of a 24-level hard Corpus-2 sample.
- A complete 1,962-level published + Corpus-1 + Corpus-2 census found **0 exact duplicate groups** and **0 strict 8-way symmetry-equivalent groups**.
- Initial all-gates parity infeasibility and initial BC1 bridge-excursion presolve each had **0 incidence** across all 1,962 levels.
- Family constructive reuse is provenance-owned operational evidence and forbidden as hidden blind-solver steering. Compilation deltas are heterogeneous: only 243/1,265 variants change at most one broad dependency class, so no generic incremental compiler is earned.

Current dispositions:

| Family | Status | Boundary / reopen condition |
|---|---|---|
| Raw level tokenization / alternate serialization / normalization cache | **DEFERRED_LOW_VALUE via strong opportunity sizing** | Reopen only for correctness/storage reasons or if a materially different workload makes ingestion a measured bottleneck. |
| General reusable `CompiledLevel` speed refactor | **DEFERRED_LOW_VALUE via solve-relative ceiling** | Semantic lifetime split remains valid, but speed case is too small. Reopen only for a concrete high-multiplicity consumer whose end-to-end wall is demonstrably setup-dominated. |
| Global exact/symmetry canonicalization to avoid solves | **DEFERRED_LOW_VALUE via zero-hit census** | 0/1,962 current levels collapse. Reopen only after corpus/generator changes create measurable natural duplicate/equivalence burden. |
| Generic family incremental compiler | **ARCHITECTURALLY_DEFERRED** | Controlled deltas exist but are mode-dependent; start with a narrow live consumer such as required-metric or density sweeps before building invalidation machinery. |
| Initial parity / initial BC1 presolve as speed treatment | **DEFERRED_LOW_VALUE via zero-incidence census** | Dynamic BC1 is a distinct search-reduction question and is not closed by this initial-state result. |

These ceilings do not settle hot-path representation work during search.

## Negative/deferred dispositions

| Family | Status | Boundary / reopen condition |
|---|---|---|
| Static plain/default scorer branch deletion | **FALSIFIED_EXACT_FORM** | Parity held; no representative end-to-end gain. Reopen scorer work only for a materially different remove/fuse mechanism backed by fresh profiling. |
| Mechanic-free fused per-candidate apply/evaluate/undo | **FALSIFIED_EXACT_FORM** | Exact branch-inlining form lost; does not test neighbor generation or batching. |
| Fixed neighbor slots / `getNeighbors` | **DEFERRED_LOW_VALUE** | Cost share measured, no treatment implemented. Fused-kernel negative did not include neighbor generation. |
| Batched candidate/object layout | **DEFERRED_LOW_VALUE** | Allocation share measured, batching/layout untested. |
| Naive six-array densification with repeated `denseIndex()` | **FALSIFIED_EXACT_FORM** | Hard-tail regression; hoisted/shared row calculation is distinct. |
| Beam checkpoint/materialization | **DEFERRED_LOW_VALUE / STALE_REPROFILE** | Replay measured historically; no snapshot treatment ran. Reopen only if replay is currently material and expected net savings survive snapshot overhead. |
| Exact beam transposition as speed reservoir | **DEFERRED_LOW_VALUE via strong opportunity sizing** | Sound-signature observer found ~0.019% exact duplicate slots; no production exact-dedup treatment A/B ran. |
| Remove coarse beam merge | **BEHAVIOR_CHANGE_NOT_PURE_SPEED** | Corrected non-binding test produced real solve divergence. Merge is width/diversity policy, not exact-equivalence machinery. |
| Broad DFS transposition | **DEFERRED_LOW_VALUE / STALE_REPROFILE** | Sound revisit rate mostly modest and exact signatures costly. Cheap incremental fingerprint is a distinct treatment. |
| Reusable `UndoToken` | **FALSIFIED_EXACT_FORM** | About 4.6% slower under tested JS/V8/object shape. |
| Beam quickselect | **DEFERRED_LOW_VALUE** | Sort was too small to justify implementation. |
| Custom numeric hash arena vs native numeric `Map` | **FALSIFIED_EXACT_FORM** | Tested arena did not beat native numeric `Map`; runtime/layout sensitive. |
| Unconditional stronger surround/adjacent-turn MST | **FALSIFIED_EXACT_FORM** | Fewer nodes but worse wall/capability economics. Gated/cheaper forms are different treatments. |
| Broad native/WASM candidate kernel | **ARCHITECTURALLY_DEFERRED** | Current mutable state boundary is too broad. Reopen for a compact hot kernel with small stable boundary and cheap end-to-end prototype. |

Evidence anchors: [`scorer`](../reports/2026-08-26-current-head-specialized-scorer-pilot.md), [`fused kernel`](../reports/2026-08-27-fused-plain-candidate-kernel-pilot.md), [`getNeighbors`](../reports/2026-09-02-getneighbors-allocation-share-pilot.md), [`batching`](../reports/2026-09-02-batched-candidates-allocation-share-pilot.md), [`beam dedup`](../reports/2026-08-06-beam-state-dedup-sound-signature-audit.md), [`DFS`](../reports/2026-07-17-dfs-state-revisit-rate-transposition-premise.md), [`substrate`](../reports/2026-08-24-speed-substrate-static-audit.md).

## Future speed campaign

When solve acquisition is no longer dominant, keep one queue: first reduce machine-independent `workSpent` through WS1/WS2/WS6/WS7; then profile a stable retained boundary and optimize only measured CPU/wall cost centers. Historical scoring, replay, layout, indexing and native/WASM ideas remain hypotheses.

Retain the solve boundary, total and pre-winner work/wall, winner action/config, redundant earlier cost, displaced capability, technique participation, major-hotspot shares, representative short/hard latency and total population compute.

## Measurement contract

Pure-speed candidates require: a fresh material profile target; representative short/hard workloads; deterministic non-binding work/node/wall contracts; solve/search parity; interleaved repeated timing; end-to-end population compute; and allocation/GC inspection for representation changes. Treat nested hot-loop timers as perturbative unless calibrated.

Use `workSpent` across techniques; nodes only within technique. Binding wall caps can erase differences, and fewer nodes can still cost more CPU.

## Reopen gate

No implementation-speed candidate is currently earned. Reopen only when a fresh current-head profile identifies a material cost center and a concrete treatment has worthwhile expected removable end-to-end cost. Exact-form negatives constrain unchanged treatments; deferred candidates remain legitimate when fresh evidence earns them.

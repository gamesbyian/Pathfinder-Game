<!-- agent-context-budget: warn=8000 max=10500 -->
# Solver architectural speed opportunities

> **Status:** supporting program; no current implementation candidate is nominated.
> **Priority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **History:** [`archive/snapshots/solver-architectural-speed-opportunities-2026-09-04-pre-consolidation.md`](archive/snapshots/solver-architectural-speed-opportunities-2026-09-04-pre-consolidation.md) plus dated reports.
> **2026-09-15 audits:** [`negative review`](../reports/2026-09-15-speed-negative-methodology-review-001.md), [`full lineage audit`](../reports/2026-09-15-solver-performance-evidence-lineage-audit-001.md).

This file owns current performance methodology/dispositions. Chronology and detailed measurements belong in reports. The live queue remains `solver-optimization-workstreams.md`.

## Evidence vocabulary

- **SUPPORTED_EXACT_FORM:** implemented treatment produced a trustworthy representative end-to-end speed gain, with work/search parity where pure speed was claimed.
- **FALSIFIED_EXACT_FORM:** implemented treatment lost under an adequate representative protocol.
- **DEFERRED_LOW_VALUE:** profiling/opportunity sizing makes implementation unattractive; no losing implementation is implied.
- **ARCHITECTURALLY_DEFERRED:** no compact/economical treatment boundary is apparent; no empirical negative is implied.
- **STALE_REPROFILE:** historical result may not transfer after material runtime, bundler, representation, object-shape, search-core, or workload change.
- **EVIDENCE_INCOMPLETE:** current disposition/magnitude lacks decision-grade lineage.
- **BEHAVIOR_CHANGE_NOT_PURE_SPEED:** treatment changes search ordering/extent and must be judged as solver policy.

Pure implementation speed preserves logical search/work while reducing CPU/wall cost. Profiles and microbenchmarks nominate work; they do not establish end-to-end value. A failed adjacent treatment may reduce value-of-information but cannot falsify an unimplemented mechanism.

## Historical positives

| Treatment | Status | Scope |
|---|---|---|
| July bit-parallel connectivity + pooled urgency context + flood-fill closure hoist | **SUPPORTED_EXACT_FORM historically** | Fixed-work interleaved A/B: about -27.1% published and -13.2% hard-C2 sample with identical node work. Current marginal magnitude is **STALE_REPROFILE**. |
| Beam parent-tree frontier walk | **BEHAVIOR_CHANGE_NOT_PURE_SPEED** | Replay fell sharply, but mid-phase traversal order changed and `R00526` was lost. Treat as current search policy, not a semantics-preserving kernel win. |
| Lazy beam dedup/diversity key construction | **SUPPORTED_EXACT_FORM historically** | Identical deterministic work/search plus material end-to-end improvement. |
| Mixed-radix numeric beam keys | **SUPPORTED_EXACT_FORM historically / STALE_REPROFILE magnitude** | Strong parity/timing evidence; later radix-boundary fixes mean current code is not byte-identical to the measured form. |
| Dense `staticNeighborKeys` | **SUPPORTED_EXACT_FORM within measured role** | Short/batch overhead improved; individual hard-tail movement was near noise. |
| Remove `cellDenseIndex` | **EVIDENCE_INCOMPLETE as speed-positive** | First short run improved, replication reversed sign; source report explicitly found no reliable wall-time gain. Landed for simpler representation/no hard-tail cost. |

Evidence: [`July hot path`](../reports/2026-07-30-solver-hot-path-pure-speed.md), [`lazy keys`](../reports/2026-08-23-beam-dedup-key-lazy-build-experiment.md), [`numeric keys`](../reports/2026-08-23-beam-dedup-numeric-key-arena.md), [`dense static neighbors`](../reports/2026-08-23-dense-static-neighbor-keys.md), [`dense follow-up`](../reports/2026-08-26-dense-index-architecture-followup.md).

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

When solve acquisition is no longer dominant, activate two linked programs without creating a second queue.

**Algorithmic efficiency first:** freeze a retained solve boundary, then use WS1/WS2/WS6/WS7 to reduce machine-independent `workSpent`: action selection/ladder ordering, redundant retry/action cost, routing, repair futility/reachability, forced-chain traversal, pruning economics, and only earned resumability/handoff questions.

**Implementation efficiency second:** once that logical-search boundary is stable enough to optimize, profile current HEAD on the retained workload and nominate only measured CPU/wall cost centers. Historical scoring, replay, allocation/layout, indexing, state plumbing and native/WASM ideas are hypotheses, not a standing backlog.

Activation baseline should retain: solve boundary, total `workSpent`, total wall/CPU, work and wall/CPU before winner, winning action/config, redundant earlier-action cost, displaced capability, DFS/beam/repair contribution, participation/dose, current replay/forced-chain/major-hotspot shares, representative short/hard latency, and total retained-population compute.

## Measurement contract

For pure-speed candidates:

1. current-head profile identifies a material target;
2. representative short/hard workloads are included;
3. deterministic work/node limits are pinned and wall deadlines are non-binding;
4. solve/search parity is required before timing interpretation;
5. timing is interleaved and repeated sufficiently for the claimed effect;
6. end-to-end and total retained-population compute are reported, not only microbenchmarks/geometric means;
7. allocation/GC is inspected for representation changes;
8. nested hot-loop timers are treated as perturbative unless observer overhead is measured.

Use `workSpent` across techniques; nodes are within-technique diagnostics; wall/CPU measures implementation cost. A binding wall cap can erase treatment differences, and fewer nodes can still cost more CPU.

## Reopen gate

No implementation-speed candidate is currently earned. Reopen only when a fresh current-head profile identifies a material cost center and a concrete treatment has worthwhile expected removable end-to-end cost. Exact-form negatives constrain unchanged treatments; deferred candidates remain legitimate when fresh evidence earns them.

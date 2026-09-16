<!-- agent-context-budget: warn=8000 max=10500 -->
# Solver architectural speed opportunities

> **Status:** supporting program; no current candidate is nominated.
> **Priority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **History:** [`archive/snapshots/solver-architectural-speed-opportunities-2026-09-04-pre-consolidation.md`](archive/snapshots/solver-architectural-speed-opportunities-2026-09-04-pre-consolidation.md) plus dated reports.
> **2026-09-15 review:** [`../reports/2026-09-15-speed-negative-methodology-review-001.md`](../reports/2026-09-15-speed-negative-methodology-review-001.md).

This file owns current speed methodology, dispositions, and reopen gates. Experimental chronology belongs in reports/archive.

## Rules

Profile current HEAD before implementation. Pure speed preserves logical search/work; changed ordering or search extent is a solver-policy experiment. Microbenchmarks nominate work but do not establish end-to-end value. Faster execution creates headroom; scheduling policy decides whether to spend it on more search.

Use these negative/deferred dispositions precisely:

- **FALSIFIED_EXACT_FORM:** an implemented treatment lost under an adequate representative protocol.
- **DEFERRED_LOW_VALUE:** profiling/opportunity sizing makes implementation unattractive; no losing implementation is implied.
- **ARCHITECTURALLY_DEFERRED:** no compact/economical treatment boundary is currently apparent.
- **STALE_REPROFILE:** an older result may not transfer after material runtime, bundler, object-shape, representation, search-core, or workload change.

A neighboring failed treatment may reduce value-of-information; it cannot falsify an unimplemented mechanism. Preserve premise, treatment, result, inference scope, and reopen condition separately.

## Current dispositions

| Family | Status | Current boundary / reopen condition |
|---|---|---|
| Static plain/default scorer branch deletion | **FALSIFIED_EXACT_FORM** | Preserved trace parity but no representative end-to-end gain. Reopen only for a materially different remove/fuse mechanism backed by a fresh profile. |
| Mechanic-free fused per-candidate apply/evaluate/undo | **FALSIFIED_EXACT_FORM** | Exact tested branch-inlining form lost. It does not cover neighbor generation or batching. |
| Fixed neighbor slots / `getNeighbors` | **DEFERRED_LOW_VALUE** | Cost share was modest and no treatment was implemented. Reopen if current profiling makes the removable cost worthwhile. |
| Batched candidate/object layout | **DEFERRED_LOW_VALUE** | Allocation share was measured; batching/layout itself was not tested. Reopen only from current allocation/profile evidence plus a concrete design. |
| Six mechanic arrays naively densified with repeated `denseIndex()` | **FALSIFIED_EXACT_FORM** | Hard-tail regression. A hoisted/shared row calculation is a distinct treatment. |
| Beam checkpoint/materialization | **DEFERRED_LOW_VALUE / STALE_REPROFILE** | Replay was measured but no snapshot treatment was run. Reopen only if replay is currently material and a concrete design has plausible net savings after snapshot overhead. |
| Exact beam duplicate elimination as a major speed reservoir | **profile-led negative** | Sound-signature duplicates were negligible on the measured workload. Keep separate from coarse merge/diversity policy. |
| Broad DFS transposition | **DEFERRED_LOW_VALUE / STALE_REPROFILE** | Historical revisit ceiling was modest and exact signatures were costly. A much cheaper incremental fingerprint is a distinct treatment. |
| Reusable `UndoToken` | **FALSIFIED_EXACT_FORM** | Measured slower under the tested JS/V8/object-shape regime. |
| Beam quickselect | **DEFERRED_LOW_VALUE** | Sort was too small to justify implementation. Reprofile only if cull selection becomes material. |
| Custom numeric hash arena vs native numeric `Map` | **FALSIFIED_EXACT_FORM** | Tested arena did not beat native numeric `Map`; runtime/layout changes are expiry triggers. |
| Unconditional stronger surround/adjacent-turn MST tightening | **FALSIFIED_EXACT_FORM** | Fewer nodes did not translate to lower wall cost and solved-population economics were negative. Gated/cheaper forms are different treatments. |
| Broad native/WASM per-candidate kernel | **ARCHITECTURALLY_DEFERRED** | Current mutable state boundary is too broad. Reopen only for a compact hot kernel with a small stable boundary and cheap disposable prototype. |

Evidence anchors: [`scorer`](../reports/2026-08-26-current-head-specialized-scorer-pilot.md), [`beam breakdown`](../reports/2026-08-27-beam-cost-breakdown-candidate-generation-dominant.md), [`fused kernel`](../reports/2026-08-27-fused-plain-candidate-kernel-pilot.md), [`getNeighbors`](../reports/2026-09-02-getneighbors-allocation-share-pilot.md), [`batching`](../reports/2026-09-02-batched-candidates-allocation-share-pilot.md), [`dense follow-up`](../reports/2026-08-26-dense-index-architecture-followup.md), [`beam dedup`](../reports/2026-08-06-beam-state-dedup-sound-signature-audit.md), [`DFS transposition`](../reports/2026-07-17-dfs-state-revisit-rate-transposition-premise.md), [`substrate audit`](../reports/2026-08-24-speed-substrate-static-audit.md).

## Runtime-sensitive expiry

Object pooling, native `Map`, object shape, inlining/module-boundary and similar results are contingent on Node/V8/bundling and representation. Do not rerun on a calendar. Reclassify to **STALE_REPROFILE** only after a material environment/search-core/representation change and a current profile shows the hotspot still matters.

## Measurement protocol

For pure-speed candidates:

1. state the current measured hotspot/share;
2. use representative short and hard workloads;
3. pin deterministic work/node limits and keep wall deadlines non-binding;
4. require solve/search parity before timing interpretation;
5. use interleaved repeated timing with enough repetitions for the claimed effect;
6. report end-to-end movement, not only a microbenchmark;
7. inspect allocation/GC for representation changes;
8. treat nested hot-loop timers as potentially perturbative unless their overhead is measured;
9. when total compute is the objective, report both representative latency and total CPU/work-weighted runtime over the retained solve population.

A binding wall deadline can make both arms look identical. Fewer nodes are not automatically faster; `workSpent` is the cross-technique algorithmic currency and wall/CPU measures implementation cost.

## Reopen gate

No speed implementation is currently earned by this document. Reopen only when a fresh current-head profile identifies a material end-to-end cost center and a concrete treatment has worthwhile expected removable cost. Exact-form negatives constrain unchanged treatments; deferred candidates remain legitimate when fresh evidence earns them.

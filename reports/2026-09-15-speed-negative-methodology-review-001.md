# Speed-negative methodology review (2026-09-15)

> **Status:** concluded-negative
> **Last evidence:** 2026-09-15 — historical speed-negative claims traced to source treatments, populations, and measurement protocols.
> **Decision:** preserve credible exact-form negatives while reclassifying unimplemented/profile-led and architectural deferments.
> **Remaining gate:** none from this review; future speed work remains current-profile and reopen-condition gated.

## Purpose

Hostile review of historical decisions that rejected solver speedups across implementation speed, search work, traversal/materialization, allocation/layout, routing, pruning, transposition/dedup, and native/WASM.

The experiment layer is mostly credible. The recurring problem is later compression of narrow evidence into broader durable closure claims. Current authority: [`../docs/solver-architectural-speed-opportunities.md`](../docs/solver-architectural-speed-opportunities.md).

## Disposition rules

- **FALSIFIED_EXACT_FORM:** an actual implementation/treatment ran under an adequate protocol and lost.
- **DEFERRED_LOW_VALUE:** profiling/opportunity sizing made implementation unattractive; no losing implementation is implied.
- **ARCHITECTURALLY_DEFERRED:** the treatment boundary is currently unattractive/too broad without an empirical negative.
- **STALE_REPROFILE:** a historical result may not transfer after material runtime, bundler, representation, object-shape, search-core, or workload change.

A neighboring failed implementation may reduce value-of-information. It does not experimentally falsify a different unimplemented mechanism.

## Corrected findings

| Family | Correct disposition | Evidence boundary |
|---|---|---|
| Plain/default scorer branch deletion | **FALSIFIED_EXACT_FORM** | Implemented with search/node parity; no representative end-to-end gain. Does not exhaust scorer work generally. |
| Mechanic-free fused apply/evaluate/undo | **FALSIFIED_EXACT_FORM** | Implemented, parity-clean, and slower/flat on eligible populations. Does not test neighbor generation or batching. |
| Fixed neighbor slots / `getNeighbors` | **DEFERRED_LOW_VALUE** | Cost share measured; treatment never implemented. The fused-kernel “superset” rationale was false because that pilot left neighbor generation untouched. |
| Batched candidate/object layout | **DEFERRED_LOW_VALUE** | Allocation share measured; batching/layout itself was not tested. |
| Naive six-array densification | **FALSIFIED_EXACT_FORM** | Short sample improved but hard sample regressed; repeated hot `denseIndex()` arithmetic is the likely mechanism. |
| Beam replay/materialization | **DEFERRED_LOW_VALUE / STALE_REPROFILE** | Replay was measured, but no checkpoint/snapshot treatment ran. “Not largest hotspot” is triage, not falsification. |
| `UndoToken` pooling | **FALSIFIED_EXACT_FORM** | Reusable token preserved parity but ran about 4.6% slower under the tested JS/V8 shape. |
| Beam quickselect | **DEFERRED_LOW_VALUE** | Sort was profiled as small; quickselect was not implemented. |
| Broad DFS transposition | **DEFERRED_LOW_VALUE / STALE_REPROFILE** | Sound revisit rate was generally modest and exact-signature construction costly; no cheap table treatment ran. |
| Custom numeric hash arena | **FALSIFIED_EXACT_FORM** | Tested arena did not beat native numeric `Map`; runtime/layout sensitive. |
| Native/WASM broad candidate kernel | **ARCHITECTURALLY_DEFERRED** | Mutable solver state makes a compact crossing boundary unattractive; no native prototype lost. |
| Unconditional stronger MST tightening | **FALSIFIED_EXACT_FORM** | Initial unsolved-only selection could not reveal regressions; broader evidence found fewer nodes but worse wall/capability economics. |

Evidence anchors: [`scorer`](2026-08-26-current-head-specialized-scorer-pilot.md), [`fused kernel`](2026-08-27-fused-plain-candidate-kernel-pilot.md), [`getNeighbors`](2026-09-02-getneighbors-allocation-share-pilot.md), [`batching`](2026-09-02-batched-candidates-allocation-share-pilot.md), [`dense follow-up`](2026-08-26-dense-index-architecture-followup.md), [`July hot-path work`](2026-07-30-solver-hot-path-pure-speed.md), [`beam dedup`](2026-08-06-beam-state-dedup-sound-signature-audit.md), [`DFS transposition`](2026-07-17-dfs-state-revisit-rate-transposition-premise.md), [`substrate audit`](2026-08-24-speed-substrate-static-audit.md), [`MST closeout`](2026-07-30-mst-tightening-reverted-net-negative.md).

## Methodology failures worth preserving

### Binding wall caps

The beam dedup/coarse-merge episode initially produced a null when both arms were constrained by a 2.5-second wall cap. Re-running under the same deterministic node limit with a non-binding deadline exposed real divergence. Decision-bearing pure-speed work must pin deterministic work and keep wall deadlines non-binding.

### Selected populations

The MST tightening treatment initially looked attractive on unsolved-only levels, a population incapable of exposing solved-to-unsolved regressions. Broader measurement reversed the conclusion. Population design must allow both gains and losses relevant to the decision.

### Fewer nodes are not lower compute

The MST treatment reduced node count while raising wall cost. Cross-technique algorithmic work uses `workSpent`; implementation cost uses wall/CPU. Neither substitutes for the other.

### Nested timers perturb hot loops

Nested high-resolution timers are useful reconnaissance but can alter the enclosing hot-loop cost. Prefer sampling profiles for discovery; measure observer overhead before treating small timed sub-buckets as precise opportunity ceilings.

### Runtime-sensitive conclusions expire conditionally

Object pooling, native `Map`, inlining/module boundaries, allocation and object-shape results depend on Node/V8/bundling and representation. Do not retest on a calendar. Reprofile after a material environment/search-core change and only if the hotspot remains relevant.

## Queue consequence

This review does not earn a new speed implementation and should not interrupt active WS2 work. Deferred candidates become eligible only when a fresh current-head profile identifies material end-to-end cost and a concrete treatment has worthwhile expected removable value. Exact-form negatives remain closed to unchanged retests unless their evidence has genuinely expired.

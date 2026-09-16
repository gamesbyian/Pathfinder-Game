# Speed-negative methodology review (2026-09-15)

> **Status:** concluded-negative
> **Last evidence:** 2026-09-15 — historical negative claims reconciled against source treatments and the broader performance lineage audit.
> **Decision:** preserve credible exact-form negatives while separating observer-only sizing, deferments, and behavior-changing policy treatments.
> **Remaining gate:** none from this review; future speed work remains current-profile and reopen-condition gated.

## Purpose

Hostile review of historical decisions that rejected solver speedups. The experiment layer is mostly credible; later summaries sometimes promoted narrower evidence into broader closure. The broader positive/negative reconciliation is [`2026-09-15-solver-performance-evidence-lineage-audit-001.md`](2026-09-15-solver-performance-evidence-lineage-audit-001.md).

## Disposition rules

- **FALSIFIED_EXACT_FORM:** an implemented treatment lost under an adequate representative protocol.
- **DEFERRED_LOW_VALUE:** profiling/opportunity sizing made implementation unattractive; no losing implementation is implied.
- **ARCHITECTURALLY_DEFERRED:** no compact/economical treatment boundary is apparent; no empirical negative is implied.
- **STALE_REPROFILE:** a historical result may not transfer after material runtime, bundler, representation, object-shape, search-core, or workload change.
- **BEHAVIOR_CHANGE_NOT_PURE_SPEED:** treatment changes search ordering/extent and belongs in solver-policy economics.

A neighboring failed implementation may reduce value-of-information. It does not falsify a different unimplemented mechanism.

## Corrected findings

| Family | Correct disposition | Evidence boundary |
|---|---|---|
| Plain/default scorer branch deletion | **FALSIFIED_EXACT_FORM** | Implemented with trace parity; no representative end-to-end gain. |
| Mechanic-free fused apply/evaluate/undo | **FALSIFIED_EXACT_FORM** | Implemented, parity-clean, slower/flat on eligible populations. Does not test neighbor generation or batching. |
| Fixed neighbor slots / `getNeighbors` | **DEFERRED_LOW_VALUE** | Cost share measured; no treatment implemented. Historical “superset” rationale was invalid. |
| Batched candidate/object layout | **DEFERRED_LOW_VALUE** | Allocation share measured; batching/layout itself untested. |
| Naive six-array densification | **FALSIFIED_EXACT_FORM** | Short sample improved but hard sample regressed. |
| Beam replay/materialization | **DEFERRED_LOW_VALUE / STALE_REPROFILE** | Replay measured; no checkpoint/snapshot treatment ran. |
| `UndoToken` pooling | **FALSIFIED_EXACT_FORM** | Implemented with parity; about 4.6% slower under tested JS/V8 shape. |
| Beam quickselect | **DEFERRED_LOW_VALUE** | Sort profiled as small; quickselect not implemented. |
| Exact beam transposition as speed reservoir | **DEFERRED_LOW_VALUE via strong opportunity sizing** | Sound-signature observer found ~0.019% exact duplicate slots; no production exact-dedup treatment A/B ran. |
| Disable coarse beam merge | **BEHAVIOR_CHANGE_NOT_PURE_SPEED** | Corrected non-binding test produced real solve divergence. Merge is width/diversity policy, not exact equivalence. |
| Broad DFS transposition | **DEFERRED_LOW_VALUE / STALE_REPROFILE** | Sound revisits generally modest; exact signature itself costly; no cheap table treatment ran. |
| Custom numeric hash arena | **FALSIFIED_EXACT_FORM** | Tested arena did not beat native numeric `Map`; runtime/layout sensitive. |
| Native/WASM broad candidate kernel | **ARCHITECTURALLY_DEFERRED** | Mutable state makes the boundary broad; no native prototype lost. |
| Unconditional stronger MST tightening | **FALSIFIED_EXACT_FORM** | Broader evidence found fewer nodes but worse wall/capability economics. |
| Connectivity-throttle / old routing forms | **BEHAVIOR_CHANGE_NOT_PURE_SPEED** | Historical treatments changed search policy and lost capability; they do not falsify adaptive allocation/routing as a class. |

Evidence anchors: [`scorer`](2026-08-26-current-head-specialized-scorer-pilot.md), [`fused kernel`](2026-08-27-fused-plain-candidate-kernel-pilot.md), [`getNeighbors`](2026-09-02-getneighbors-allocation-share-pilot.md), [`batching`](2026-09-02-batched-candidates-allocation-share-pilot.md), [`dense`](2026-08-26-dense-index-architecture-followup.md), [`July hot path`](2026-07-30-solver-hot-path-pure-speed.md), [`beam dedup`](2026-08-06-beam-state-dedup-sound-signature-audit.md), [`DFS`](2026-07-17-dfs-state-revisit-rate-transposition-premise.md), [`substrate`](2026-08-24-speed-substrate-static-audit.md), [`MST`](2026-07-30-mst-tightening-reverted-net-negative.md).

## Measurement lessons

**Binding wall caps:** the beam coarse-merge episode initially produced a null because both arms were wall-censored. Decision-bearing pure-speed work must pin deterministic search and keep wall deadlines non-binding.

**Selected populations:** the MST treatment initially looked attractive on unsolved-only rows, which could not reveal solved-to-unsolved regressions. Populations must expose both gains and losses relevant to the decision.

**Nodes are not compute:** MST tightening reduced nodes while increasing wall cost. Use `workSpent` for cross-technique algorithmic cost and wall/CPU for implementation cost.

**Nested timers perturb hot loops:** prefer sampling profiles for discovery; quantify observer overhead before treating small timed sub-buckets as precise ceilings.

**Runtime-sensitive evidence expires conditionally:** object pooling, native `Map`, inlining/module boundaries, allocation and object shapes depend on Node/V8/bundling and representation. Reprofile only after material change and only if the hotspot is still relevant.

## Queue consequence

This review earns no speed implementation and does not interrupt WS2. Deferred candidates become eligible only when current profiling identifies material end-to-end cost and a concrete treatment has worthwhile expected removable value. Exact-form negatives remain closed to unchanged retests unless their evidence genuinely expires.

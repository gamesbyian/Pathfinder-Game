# Solver performance evidence-lineage audit (2026-09-15)

> **Status:** concluded-positive
> **Last evidence:** 2026-09-15 — source reports, current authorities, current solver representation, and PR #1808 reconciled end to end.
> **Decision:** preserve strong exact-form positives/negatives, repair overclaims, and stage future speed work as algorithmic efficiency before implementation efficiency.
> **Remaining gate:** no implementation-speed work is earned; fresh current-head profiling is required when speed becomes an active objective.

## Verdict

Solver performance knowledge is **strong at the experiment layer and weaker at the later summary/disposition layer**. The best historical campaigns already used deterministic work/node limits, non-binding wall deadlines, search/solve parity, interleaved timing, representative workloads, and end-to-end measurement. The main failures were evidence compression: opportunity sizing promoted into treatment falsification, behavior-changing search work bundled into “pure speed,” and one non-reproduced representation result retained as a positive shorthand.

This audit reconstructs important claims through:

`premise -> treatment -> eligible population -> execution conditions -> instrumentation -> observed result -> interpretation -> later reuse -> current disposition`

## Claim ledger

| Claim / family | Correct status | Evidence entitlement |
|---|---|---|
| July connectivity + urgency-context pooling + flood-fill closure hoist | **SUPPORTED_EXACT_FORM historically / STALE_REPROFILE current magnitude** | First three order-preserving changes cut fixed-work wall time about 27.1% published and 13.2% on a hard C2 sample with identical node work. |
| Beam parent-tree frontier walk | **BEHAVIOR_CHANGE_NOT_PURE_SPEED** | Replay fell sharply, but mid-phase traversal order changed and `R00526` was lost even at very large node budgets. |
| Lazy beam key construction | **SUPPORTED_EXACT_FORM historically** | Deterministic parity plus material end-to-end improvement on published and hard workloads. |
| Mixed-radix numeric beam keys | **SUPPORTED_EXACT_FORM historically / STALE_REPROFILE magnitude** | Strong parity/timing evidence; later radix-boundary fixes mean current implementation differs from the originally measured form. |
| Dense `staticNeighborKeys` | **SUPPORTED_EXACT_FORM within measured role** | Short/batch overhead improved; individual hard-tail effect was near noise. |
| Remove `cellDenseIndex` | **EVIDENCE_INCOMPLETE as speed-positive** | First short run -1.66%, replication +1.49%; hard workload flat. Source report explicitly withdrew a reliable speed claim. |
| Static scorer branch deletion | **FALSIFIED_EXACT_FORM** | Implemented, trace parity held, no representative end-to-end gain. |
| Mechanic-free fused candidate kernel | **FALSIFIED_EXACT_FORM** | Implemented with exact decision parity; slower/flat on eligible populations. |
| Fixed `getNeighbors` slots | **DEFERRED_LOW_VALUE** | Cost share measured; no implementation. Fused-kernel pilot left neighbor generation untouched. |
| Batched candidate/object layout | **DEFERRED_LOW_VALUE** | Allocation share measured; batching/layout not implemented. |
| Six-array dense mechanic conversion | **FALSIFIED_EXACT_FORM** | Parity held; short sample improved but hard C2 regressed ~2.82%. |
| Reusable `UndoToken` | **FALSIFIED_EXACT_FORM**, runtime-sensitive | Implemented with parity; about 4.6% slower. |
| Beam quickselect | **DEFERRED_LOW_VALUE** | Sort was small; treatment not implemented. |
| Custom numeric hash arena | **FALSIFIED_EXACT_FORM for tested arena/runtime** | Native numeric `Map` matched/beat the tested arena. |
| Beam checkpoint/materialization | **DEFERRED_LOW_VALUE / STALE_REPROFILE** | Replay measured; no snapshot/checkpoint treatment ran. |
| Exact beam transposition as speed reservoir | **DEFERRED_LOW_VALUE via strong opportunity sizing** | Sound-signature observer found ~0.019% exact duplicate slots; no production exact-dedup treatment A/B ran. |
| Disable coarse beam merge | **BEHAVIOR_CHANGE_NOT_PURE_SPEED** | Initial wall-capped null was invalid; corrected non-binding test produced 19/75 divergences strongly favoring merge. |
| DFS transposition | **DEFERRED_LOW_VALUE / STALE_REPROFILE** | Sound revisits generally ~1-2% with one 16% outlier; exact signature costly; no cheap table treatment ran. |
| Broad native/WASM kernel | **ARCHITECTURALLY_DEFERRED** | Static boundary audit found too much mutable state for a compact crossing; no native prototype lost. |
| Unconditional stronger MST tightening | **FALSIFIED_EXACT_FORM** | Unsolved-only discovery could not show regressions; broader evidence found fewer nodes but worse wall/capability economics. |
| Connectivity-throttle / old routing forms | **BEHAVIOR_CHANGE_NOT_PURE_SPEED** | Historical policies lost capability; they do not falsify adaptive work reduction/routing as a class. |
| Same-policy beam continuation residual tranche | **FALSIFIED_EXACT_FORM / CLOSED NULL for that use** | Continuation participated 64 times in a 120-row fixed-work A/B with zero gains or losses. Primitive remains valid. |
| Historical forced-chain traversal | **EVIDENCE_INCOMPLETE for current solver** | SolverV2 reported compression but bundled connectivity-frequency changes; current treatment must start with an observer census. |

## Positive evidence

The July report's “-31.3%” headline bundles a behavior-changing beam traversal with three pure-speed changes. The clean pure-speed result is the separately reported changes 1-3 A/B: published 13,103 ms -> 9,550 ms and C2 sample 71,813 ms -> 62,369 ms at identical deterministic nodes and zero divergence. That remains strong historical evidence.

The tree-order beam walk belongs on the algorithmic side. `insOrd` restores post-phase candidate ordering, but terminal and budget checks still execute during tree-order traversal. The later `R00526` diagnosis proves this changes which work is reached before a budget exit.

The August lazy-key and numeric-key experiments are also strong positives. The dense `staticNeighborKeys` change is supported in its short/batch role. By contrast, the later `cellDenseIndex` removal did not reproduce its initial short-level gain and should not be carried as a throughput positive.

Evidence: [`July hot path`](2026-07-30-solver-hot-path-pure-speed.md), [`lazy keys`](2026-08-23-beam-dedup-key-lazy-build-experiment.md), [`numeric keys`](2026-08-23-beam-dedup-numeric-key-arena.md), [`dense static neighbors`](2026-08-23-dense-static-neighbor-keys.md), [`dense follow-up`](2026-08-26-dense-index-architecture-followup.md).

## Negative evidence and methodology failures

**Observer sizing is not treatment falsification.** Exact beam duplicates are too rare to make an expensive transposition design attractive on the measured workload, but that conclusion came from observer instrumentation. It rationally defers engineering without creating an A/B that never happened.

**Binding wall caps can manufacture nulls.** The coarse-merge episode looked null under a 2.5-second cap and diverged strongly with a non-binding 120-second cap at the same deterministic node limit.

**Selected populations can manufacture wins.** MST tightening initially looked attractive on an unsolved-only population incapable of showing losses. Broader solved-population evidence reversed the decision.

**Nodes are not compute.** MST tightening reduced nodes but increased wall cost. Use canonical `workSpent` across techniques and wall/CPU for implementation cost.

**Nested timers are reconnaissance.** Candidate-generation subshares moved as nested `hrtime` probes were added. Prefer sampling profiles for discovery and quantify instrumentation overhead before treating small sub-buckets as precise ceilings.

## Current code-shape consequence

Current `prep.ts` stores `staticNeighborKeys` row-major as `gridW * gridH * 4`, addressed by `denseIndex(key, gridW)`; the former `cellDenseIndex` table has been removed. The architecture authority is repaired alongside this audit so documentation no longer describes the old representation.

No current-head CPU profile was run here. Historical hotspot shares are therefore archaeology, not a current implementation queue.

## Future speed campaign

When solve acquisition stops dominating, freeze a retained solve boundary first and run two linked programs.

### 1. Algorithmic efficiency

Preserve the boundary while reducing machine-independent work:

- **WS1:** action selection, routing, ladder ordering, predictable redundant-action avoidance;
- **WS2:** fixed-work repricing, winner economics, work before winner, participation/dose, displaced capability;
- **WS6:** repair reachability and dependency-conditioned futile repair work;
- **WS7:** architecture-level work removal such as an observer-earned certified forced-chain treatment.

Conditional observers such as cross-attempt basin overlap, repair descent shadow, forced-chain census, and distinct resumability/handoff premises remain in `solver-future-work.md` until their gates are earned. Same-policy residual continuation is already closed null.

### 2. Implementation efficiency

Once the logical-search boundary is stable enough to optimize, collect a fresh current-head sampling profile on that retained workload. Only current measured cost centers should create an implementation backlog. Historical representation, scoring, candidate-loop, replay, allocation/layout, indexing, work-meter, or native/WASM ideas remain hypotheses until then.

The activation baseline should retain solve boundary, total `workSpent`, total wall/CPU, work and wall/CPU before winner, winner action/config, redundant earlier-action cost, displaced capability, DFS/beam/repair contribution, participation/dose, current major hotspot shares, representative short/hard latency, and total retained-population compute.

For pure-speed work require deterministic search budgets, non-binding deadlines, search/solve parity, interleaved repetitions, representative short/hard workloads, and end-to-end movement. Inspect allocation/GC for representation changes and measure nested-instrumentation overhead where used.

## Documentation consequence

- `docs/solver-architectural-speed-opportunities.md` now owns the full performance evidence taxonomy and compact corrected dispositions.
- `docs/solver-optimization-workstreams.md` remains the single live queue; future speed activation is mapped compactly onto WS1/WS2/WS6/WS7.
- `docs/solver-future-work.md` remains deferred/reopen-only and was compacted back under its context budget.
- `reports/2026-09-15-speed-negative-methodology-review-001.md` is corrected for exact-beam-dedup classification and source citation.
- `docs/solver-architecture.md` is repaired to describe current row-major `staticNeighborKeys` addressing without `cellDenseIndex`.

## Remaining questions

The exact current marginal benefit of historical landed speedups is unknown and normally not worth retesting until a current profile or planned refactor makes it decision-relevant. The future retained solve boundary itself must be chosen prospectively when the speed campaign activates. No current implementation candidate is nominated by this audit.

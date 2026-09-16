<!-- agent-context-budget: warn=8000 max=10500 -->
# Solver architectural speed opportunities

> **Status:** supporting program; no current implementation candidate is nominated.
> **Priority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **History:** [`archive/snapshots/solver-architectural-speed-opportunities-2026-09-04-pre-consolidation.md`](archive/snapshots/solver-architectural-speed-opportunities-2026-09-04-pre-consolidation.md) plus dated reports.
> **2026-09-15 audits:** [`speed-negative methodology review`](../reports/2026-09-15-speed-negative-methodology-review-001.md) and [`performance evidence-lineage audit`](../reports/2026-09-15-solver-performance-evidence-lineage-audit-001.md).

This document is the current authority for speed methodology and performance dispositions. Chronology and exact measurements belong in dated reports. Execution priority stays in `solver-optimization-workstreams.md`.

## Working rule

Internal representation, traversal plumbing, object shape, module boundaries, and implementation language are not compatibility contracts. Correctness, level-blindness, deterministic work semantics, and measured solve/search behavior are.

A **pure implementation speedup** preserves logical search decisions and machine-independent work while reducing CPU/wall cost. A change that alters ordering, search extent, which action is reached, or which state is examined before a budget check is a **solver-policy treatment**, even if it also lowers wall time. Microbenchmarks and profiles nominate work; they do not establish end-to-end value.

Implementation speed creates latency headroom. The scheduler decides whether that headroom should reduce compute/latency or buy additional search.

## Performance-evidence vocabulary

Use the strongest status actually earned by the lineage:

- **SUPPORTED_EXACT_FORM**: an implemented treatment produced a trustworthy representative end-to-end speed gain under adequate protocol, with logical-work/search parity when pure speed was claimed.
- **FALSIFIED_EXACT_FORM**: an implemented treatment lost under an adequate representative protocol. Do not retest unchanged absent a material expiry trigger or evidence that the old protocol no longer answers the question.
- **DEFERRED_LOW_VALUE**: profiling/opportunity sizing made implementation unattractive. This is not evidence that an implementation would lose.
- **ARCHITECTURALLY_DEFERRED**: no compact/economical treatment boundary is currently apparent. This is not an empirical negative.
- **STALE_REPROFILE**: an older result may no longer transfer after a material runtime, bundler, representation, search-core, object-shape, or workload change. Reprofile before deciding whether to rerun.
- **EVIDENCE_INCOMPLETE**: the disposition or magnitude carried by the repo is not supported by a complete decision-grade lineage.
- **BEHAVIOR_CHANGE_NOT_PURE_SPEED**: the treatment changed search decisions/order/extent. Judge it through retained-capability plus work/compute economics, not as an implementation-speed A/B.

Preserve **premise -> treatment -> population -> execution conditions -> instrumentation -> observed result -> inference scope -> later reuse -> reopen condition**. A failed adjacent or broader-looking treatment can lower value-of-information; it cannot manufacture falsification of an unimplemented mechanism.

## Historical positive knowledge

### July order-preserving hot-path stack

The 2026-07-30 campaign established a strong historical pure-speed result for its first three landed changes: bit-parallel/lazily banded connectivity, pooled `buildCurUrgencyContext` scratch, and hoisted flood-fill closures. On the direct fixed-node A/B, those three together reduced published wall time from 13.10s to 9.55s (**-27.1%**) and a 40-level Corpus-2 sample from 71.81s to 62.37s (**-13.2%**) with identical node work and no solve divergence. Status: **SUPPORTED_EXACT_FORM historically**.

Do not blindly reuse those percentages as current-HEAD expectations. Solver shape and cost mix have changed substantially since July. The mechanisms remain landed; any claim about their *current marginal share* is **STALE_REPROFILE**.

The same report's beam parent-tree frontier walk is different. It cut replay dramatically, but mid-phase terminal/budget checks now occur in tree order. It lost `R00526` even at very large node budgets and was later diagnosed as an ordering/extent effect. Status: **BEHAVIOR_CHANGE_NOT_PURE_SPEED**. It is part of the current search policy and future retained-solve-boundary baselines, not evidence that tree-order walking is a semantics-preserving kernel optimization.

Evidence: [`2026-07-30-solver-hot-path-pure-speed.md`](../reports/2026-07-30-solver-hot-path-pure-speed.md).

### August beam-key / representation stack

Three August forms have strong historical parity evidence:

- lazy construction of beam dedup/diversity keys: **SUPPORTED_EXACT_FORM historically**;
- mixed-radix numeric `Map` keys with exact fallback: **SUPPORTED_EXACT_FORM historically** for the populations/configuration actually tested; the later schema-boundary radix correction means the current implementation is not byte-for-byte the originally measured form, so current magnitude is **STALE_REPROFILE**;
- dense `staticNeighborKeys`: **SUPPORTED_EXACT_FORM** for reducing short/batch overhead, with only noise-level individual hard-tail movement. The cumulative August 23 stack was materially positive with identical deterministic search work.

A later change removed the 1 MiB `cellDenseIndex` table entirely. Its first short-level run looked positive, but replication reversed the sign; the promotion report explicitly concludes **no reliable wall-time speedup was established**. It landed for simpler representation/smaller working set with no demonstrated hard-tail penalty. Do not cite `cellDenseIndex` removal itself as a speed win. Speed status: **EVIDENCE_INCOMPLETE / no supported positive**; architecture disposition remains landed.

Evidence: [`lazy keys`](../reports/2026-08-23-beam-dedup-key-lazy-build-experiment.md), [`numeric keys`](../reports/2026-08-23-beam-dedup-numeric-key-arena.md), [`dense static neighbors`](../reports/2026-08-23-dense-static-neighbor-keys.md), [`dense follow-up`](../reports/2026-08-26-dense-index-architecture-followup.md).

## Current negative and deferred dispositions

### Scoring specialization

A bounded plain/default/no-template fast path preserved solve/node traces but did not improve representative end-to-end wall time. Status: **FALSIFIED_EXACT_FORM** for that branch-deletion specialization. Three repetitions are adequate to reject a claimed material win, but not to support a universal statement that scorer work is exhausted.

Reopen only with a materially different mechanism that removes/fuses measured computation rather than deleting statically impossible branches from the same generic scorer.

Evidence: [`2026-08-26-current-head-specialized-scorer-pilot.md`](../reports/2026-08-26-current-head-specialized-scorer-pilot.md).

### Candidate apply/evaluate/undo fusion

Profiling established candidate generation/apply/undo as a major beam cost center. The bounded mechanic-free fused JS kernel preserved decisions but regressed/failed to improve representative end-to-end time and had narrow eligibility. Status: **FALSIFIED_EXACT_FORM** for that per-candidate branch-inlining form.

Two descendants were measured but not implemented:

- fixed neighbor-slot replacement / `getNeighbors`: **DEFERRED_LOW_VALUE**. The September pilot found a modest share; the fused-kernel experiment explicitly left neighbor generation untouched.
- batched candidate/object-layout restructuring: **DEFERRED_LOW_VALUE**. Candidate-object allocation was a modest share; the fused per-candidate kernel did not test batching/layout.

Evidence: [`beam cost breakdown`](../reports/2026-08-27-beam-cost-breakdown-candidate-generation-dominant.md), [`fused pilot`](../reports/2026-08-27-fused-plain-candidate-kernel-pilot.md), [`getNeighbors pilot`](../reports/2026-09-02-getneighbors-allocation-share-pilot.md), [`batching pilot`](../reports/2026-09-02-batched-candidates-allocation-share-pilot.md).

### Dense mechanic arrays

Naively converting six mechanic arrays to dense storage improved the short sample but regressed the hard sample, plausibly because repeated `denseIndex()` arithmetic moved into hot readers. Status: **FALSIFIED_EXACT_FORM** for the repeated-index multi-array conversion. Dense local layouts remain live only when a current profile identifies a cost and the treatment removes storage/indirection without inserting comparable hot arithmetic.

### Beam exact duplicates, coarse merge, and DFS transposition

The beam sound-signature audit measured genuine exact duplicate slots at only about 0.019% of generated candidates. That is strong **opportunity-sizing evidence**, but the sound exact-dedup treatment was not installed as a production A/B. Therefore exact beam transposition as a speed reservoir is **DEFERRED_LOW_VALUE**, not `FALSIFIED_EXACT_FORM`.

Disabling the shipped coarse merge *was* executed and cost solves once the initially binding wall cap was corrected. Coarse merge is diversity/width policy, not exact equivalence. Its removal is **BEHAVIOR_CHANGE_NOT_PURE_SPEED** and negative for that removal treatment.

DFS sound-signature revisit measurement found mostly ~1-2% revisits with one 16% outlier while exact-signature construction itself was expensive. No cheap production table was tested. Broad DFS transposition is **DEFERRED_LOW_VALUE / STALE_REPROFILE**. A substantially cheaper incremental fingerprint is a distinct treatment and needs a current revisit-rate/cost premise.

Evidence: [`beam sound-signature audit`](../reports/2026-08-06-beam-state-dedup-sound-signature-audit.md), [`DFS premise audit`](../reports/2026-07-17-dfs-state-revisit-rate-transposition-premise.md).

### Beam replay/materialization

Historical profiling found replay nontrivial, but no checkpoint/snapshot treatment was tested. Status: **DEFERRED_LOW_VALUE / STALE_REPROFILE**. Reopen only if current replay is material and a concrete snapshot/delta design has plausible savings after write/read/storage overhead.

### `UndoToken`, sort selection, numeric hash arena

- reusable `UndoToken` pooling was implemented with parity and ran about 4.6% slower: **FALSIFIED_EXACT_FORM** under that JS/V8/object-shape regime;
- beam quickselect was not implemented because sort was minor: **DEFERRED_LOW_VALUE**;
- a custom numeric hash arena did not beat native numeric `Map` in the measured design: **FALSIFIED_EXACT_FORM** for that arena/runtime combination.

Runtime/compiler-sensitive exact-form results become **STALE_REPROFILE** only after a material Node/V8, bundler/module, search-core, object-shape, or representation change *and* a current profile shows the hotspot still matters.

### Stronger MST/connectivity/routing forms

Unconditional surround/adjacent-turn MST tightening ultimately reduced nodes while increasing wall cost and causing more losses than gains on the relevant solved population. Status: **FALSIFIED_EXACT_FORM** for that unconditional per-candidate treatment. The structural premise and cheaper/gated forms are not thereby falsified.

Historical connectivity-throttle narrowing and old routing forms changed search policy and lost capability in their tested forms. Status: **BEHAVIOR_CHANGE_NOT_PURE_SPEED**. They constrain unchanged policies, not the general idea of reducing total work through better allocation/routing.

### Native/WASM

Broad per-candidate native/WASM migration is **ARCHITECTURALLY_DEFERRED**. Enough mutable mechanic/path/search state crosses the boundary that avoiding frequent calls becomes a search-core migration rather than a compact kernel optimization. This is engineering evidence, not an empirical runtime negative.

Reopen only when a compact kernel owns material end-to-end time, crosses a small stable state boundary, has a cheap disposable prototype, and permits exact logical-work/decision comparison.

Evidence: [`2026-08-24-speed-substrate-static-audit.md`](../reports/2026-08-24-speed-substrate-static-audit.md).

## Future speed campaign

When solve acquisition stops dominating, activate two connected programs in this order.

### 1. Algorithmic efficiency: preserve the chosen solve boundary, spend less machine-independent work

Start by freezing a retained solve set/boundary and measuring where its successful work is spent. The live queue already contains most mechanism families:

- **WS1:** action selection, ladder ordering, structural routing, and eventually avoidance of predictably redundant action families;
- **WS2:** fixed-work allocation, repricing/removal of weak retries, participation/dose, winner economics, displaced capability, and retained-solve accounting;
- **WS6:** repair reachability and dependency-conditioned repair work, including whether earlier coupled commitments make later repair futile;
- **WS7:** architectural search efficiency such as certified forced-chain traversal and other machine-independent redundant-work removal.

High-value observers already preserved outside the active queue include cross-attempt basin overlap, forced-chain census, repair descent shadow, and carefully earned resumability/handoff questions. Same-policy portfolio continuation is already closed null in its tested form; a different handoff requires a distinct premise.

Do not score algorithmic efficiency by nodes across techniques. Use canonical `workSpent`, plus actual CPU/wall because a lower-work policy can still be more expensive per work unit.

### 2. Implementation efficiency: preserve resulting logical search, reduce CPU/wall per unit of work

Do **not** preload a long micro-optimization queue. Once the algorithmic boundary is stable enough to matter, profile current HEAD on the retained workload and nominate only measured cost centers. Historical candidates such as scoring, candidate/apply/undo, replay/materialization, allocation/object layout, indexing, work-meter plumbing, or runtime substrate are hypotheses, not current priorities.

Prefer sampling CPU profiles for discovery. Nested hot-loop timers can materially perturb the loop; use them only to answer a narrower question and measure their observer cost.

## Future baseline and measurement contract

The activation baseline should retain, per level and in aggregate:

- retained solve set / solve boundary;
- total `workSpent` and total wall/CPU time;
- work and wall/CPU before the winning action;
- winning action/config and action order;
- redundant earlier action families and their work/cost;
- displaced capability from repricing/removal;
- DFS/beam/repair contribution;
- participation and dose for conditional actions;
- replay, forced-chain, connectivity/scoring/candidate-generation and other major hotspot shares from current profiling;
- representative short-level and hard-level latency;
- total compute over the retained solve population, so expensive hard-tail wins are not washed out by many trivial solves.

For pure-speed candidates require deterministic work/node budgets as appropriate, non-binding wall deadlines, search/solve parity, interleaved timing, sufficient repetition, representative short/hard workloads, and end-to-end movement beyond the targeted microbenchmark. When representation changes allocation behavior, inspect allocation/GC too.

If search behavior changes, evaluate retained capability, `workSpent`, total compute, winner/displacement, and generalization through the solver-policy research process. Do not relabel fewer nodes as a kernel speedup.

## Reopen gate

No implementation-speed candidate is currently earned by this document. Reopen implementation work only after a fresh current-HEAD profile identifies a material end-to-end cost center and a concrete treatment has worthwhile expected removable cost. Historical exact-form negatives constrain unchanged treatments; deferred candidates remain legitimate when fresh evidence earns them. Algorithmic-efficiency work remains governed by the live WS1/WS2/WS6/WS7 queue rather than by this supporting document.

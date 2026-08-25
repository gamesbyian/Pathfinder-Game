# Solver architectural speed opportunities

> **Status:** active supporting program; [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) owns rank.
> **Current boundary:** broad per-candidate native/WASM migration is closed after the 2026-08-24 substrate audit. Reopen only if a genuinely compact kernel/interface emerges.

Use with [`solver-architecture.md`](solver-architecture.md), [`solver-budget-determinism.md`](solver-budget-determinism.md), and [`solver-research-operating-model.md`](solver-research-operating-model.md).

## Working rule

Internal representation, object shape, traversal plumbing, module boundaries, and implementation language are not compatibility contracts. Correctness, level-blindness, deterministic work semantics, reproducible measurement, and measured solve/cost behavior are.

Profile first. Pure-speed work must preserve logical search decisions/work; changed ordering is a behavior experiment and needs matched-work evaluation. Microbenchmarks nominate work but do not establish end-to-end value.

Implementation speed can create latency headroom, but the scheduler decides whether buying more search work with that headroom is worthwhile.

## Current opportunities

### Specialized scoring

`scoreMove` remains a broad interpreter of scoring features. If fresh profiling still shows scoring/candidate evaluation dominant, test a scorer compiled once per `(level, profile/template)` that removes impossible mechanics/zero-weight terms and precomputes profitable static quantities.

This is distinct from the negative experiment that only pre-resolved ablation booleans while retaining the same computation. Count setup cost on short solves as well as hard-search savings. Treat changed floating-point ordering as behavior change unless decision identity is demonstrated.

### Fused move/state kernel

If profiles nominate candidate generation/apply/undo overhead, test a fused JS kernel using fixed neighbor slots, dense mechanic metadata, direct legality/state updates, and primitive undo storage. This asks whether general candidate/undo representations can disappear from the hot loop; it is not another `UndoToken` pooling experiment.

### Dense level-local indexing

The positive `staticNeighborKeys` conversion showed that sparse packed-key storage can be wasteful when a hot structure only needs live cells. Extend dense indexing only when profiles identify a specific allocation/lookup cost. Prefer coherent level-local `0..N-1` representations over isolated churn when several interacting hot structures benefit.

### Beam state materialization

Tree-order parent replay is already optimized. Before trying snapshots/checkpoint-plus-delta/other materialization, measure replay share on current HEAD. If replay is no longer material, close this direction.

### Work-meter/secondary overhead

Only test batched/local work accumulation or other secondary micro-optimizations when profiling shows material cost, and preserve exact budget/provenance semantics.

## Native/WASM disposition

The current candidate-generation/apply/undo/scoring region mutates broad path/resource/mechanic state and reads substantial prepared metadata. Moving enough state native to avoid frequent crossings becomes a search-core migration, so the broad per-candidate prototype failed its bounded-interface premise.

Reopen native/WASM only when all are true:

- a compact hot kernel accounts for material end-to-end time;
- inputs/state cross the boundary without redesigning a large fraction of the solver;
- a disposable prototype is cheap;
- logical work/decisions can be preserved or precisely compared.

Include boundary/copy/setup/JIT costs and both short-solve and long-hard workloads. A fast microkernel with no representative end-to-end gain is negative evidence, not a migration argument. See [`../reports/2026-08-24-speed-substrate-static-audit.md`](../reports/2026-08-24-speed-substrate-static-audit.md).

## Closed unchanged forms

Do not retest without new profile evidence:

- sound DFS/beam transposition/dedup as a major speed opportunity: true beam duplicates were about 0.019%;
- removing coarse beam dedup: it also performs survivor compression/diversity management;
- fixed-width numeric beam signatures that assume obsolete mechanic cardinalities;
- `UndoToken` object pooling;
- beam quickselect replacing sort when sort is not dominant;
- sparse-to-dense conversion justified only by cache-locality intuition;
- pre-resolving ordinary ablation gates while retaining the same scorer;
- custom hash tables merely because native `Map` looks high-level: numeric-keyed `Map` matched/beat the measured custom form.

Dated reports retain exact measurements.

## Current beam representation

The August 23 work already:

- made dedup/diversity key construction lazy;
- replaced string-heavy hot keys with a mixed-radix numeric fast path plus exact string fallback when the composed product is unsafe; the schema-valid 31/32-flipper radix defect remains tracked in [`solver-correctness-hardening.md`](solver-correctness-hardening.md);
- found no value in the custom hash/typed-array arena once native `Map` received numeric keys;
- made candidate generation/scoring/state work the leading documented beam target again.

## Execution order

1. Re-profile current HEAD.
2. Pursue specialized scoring/fused JS state work only where the profile supports it.
3. Extend dense indexing only for measured hot structures.
4. Re-measure replay before alternative beam materialization.
5. Touch work-meter/secondary overhead only if measured.
6. Reopen native/WASM only if a new compact boundary clears the gate above.

## Evaluation protocol

For pure speed claims:

1. state the measured hotspot/share;
2. use representative short, medium, and long-hard workloads;
3. pin deterministic work/node limits and keep wall deadlines non-binding;
4. require identical outcomes/work and, where claimed, search decisions;
5. use interleaved repeated wall measurements with warm-up order controlled;
6. report variance and per-workload effects, not only one aggregate;
7. inspect allocation/GC when representation changes memory behavior;
8. stop after a clear negative rather than tuning the benchmark until positive.

Behavior-changing refactors use the standard level-blind matched-work promotion contract instead.

## Scheduling interaction

Keep policy and kernel effects separable. Scheduler decisions use machine-independent `workSpent`; pure implementation-speed tests pin search work. Do not credit less work as a kernel speedup, faster primitives as scheduler intelligence, or a speedup as automatic permission to increase aggregate production work.

## Evidence anchors

- [`../reports/2026-08-24-speed-substrate-static-audit.md`](../reports/2026-08-24-speed-substrate-static-audit.md)
- [`../reports/2026-07-30-solver-hot-path-pure-speed.md`](../reports/2026-07-30-solver-hot-path-pure-speed.md)
- [`../reports/2026-08-23-dense-static-neighbor-keys.md`](../reports/2026-08-23-dense-static-neighbor-keys.md)
- [`../reports/2026-08-23-beam-dedup-key-lazy-build-experiment.md`](../reports/2026-08-23-beam-dedup-key-lazy-build-experiment.md)
- [`../reports/2026-08-23-beam-dedup-numeric-key-arena.md`](../reports/2026-08-23-beam-dedup-numeric-key-arena.md)
- [`../reports/2026-08-06-beam-state-dedup-sound-signature-audit.md`](../reports/2026-08-06-beam-state-dedup-sound-signature-audit.md)
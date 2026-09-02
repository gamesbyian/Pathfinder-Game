# Solver architectural speed opportunities

> **Status:** active supporting program; [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) owns current execution priority.
> **Current boundary:** broad per-candidate native/WASM migration is closed after the 2026-08-24 substrate audit. Reopen only if a genuinely compact kernel/interface emerges.

Use with [`solver-architecture.md`](solver-architecture.md), [`solver-budget-determinism.md`](solver-budget-determinism.md), and [`solver-research-operating-model.md`](solver-research-operating-model.md).

## Working rule

Internal representation, object shape, traversal plumbing, module boundaries, and implementation language are not compatibility contracts. Correctness, level-blindness, deterministic work semantics, reproducible measurement, and measured solve/cost behavior are.

Profile first. Pure-speed work must preserve logical search decisions/work; changed ordering is a behavior experiment and needs matched-work evaluation. Microbenchmarks nominate work but do not establish end-to-end value.

Implementation speed can create latency headroom, but the scheduler decides whether buying more search work with that headroom is worthwhile.

## Current opportunities

### Specialized scoring

Fresh 2026-08-26 profiling still found `scoreMove` material (9.55% self-time on all 160 published levels; 14.56% on a 24-level hard Corpus-2 sample), so the predeclared bounded specialization pilot was earned. A conservative static fast path for plain/default/no-template levels then preserved every solve/node trace but produced **+0.91% slower** paired geometric-mean wall time on published and **-0.05%** on the hard sample. The exact branch-deletion form is therefore closed: the generic scorer's apparent breadth is not translating into recoverable end-to-end overhead under V8.

A materially different scorer candidate needs new evidence and a different mechanism, such as eliminating or fusing computation rather than merely deleting statically impossible branches. See [the current-HEAD scorer pilot](../reports/2026-08-26-current-head-specialized-scorer-pilot.md).

### Fused move/state kernel

**Nominated by the 2026-08-27 beam cost breakdown, tested, CLOSED NEGATIVE the same day.** The existing `PF_BEAM_DEBUG=1` counters, run on three independent 24-level hard-Corpus-2 stride samples plus the full published corpus, showed candidate generation/apply/undo at 46.5-55.3% of instrumented beam time on every workload — 2-4x connectivity (16.6-27.2%) and replay (12.3-16.2%). See [`../reports/2026-08-27-beam-cost-breakdown-candidate-generation-dominant.md`](../reports/2026-08-27-beam-cost-breakdown-candidate-generation-dominant.md).

A bounded pilot then eligibility-gated (no must-pass/must-cross/portal/flipper/landmark mechanics, production config, non-research — the only shape where every mechanic branch inside `applyMove`/`evaluatePrunedMove`/`undoMove` is provably dead) inline replacement using fixed candidate-loop code, direct state mutation, and primitive (non-allocating, non-closure) undo storage instead of a per-candidate `UndoToken` object — genuinely different from the already-closed `UndoToken`-pooling form, which still allocated/reused an object. It preserved every solve/node trace exactly (byte-identical on the eligible-level A/B and on the full 160-level `solver:regression --check`) but was **+3.13% slower** (geometric mean, slower in every one of 5 reps) on the 24 published levels that engage it, and effectively flat/noisy (-0.11%) on the 4 Corpus-2 levels that do — only 24/160 published and 4/1700 Corpus-2 levels are ever eligible for this exact mechanic-free shape. See [`../reports/2026-08-27-fused-plain-candidate-kernel-pilot.md`](../reports/2026-08-27-fused-plain-candidate-kernel-pilot.md).

Close this exact branch-inlining form: V8's existing generic dispatch (monomorphic inline caching on the stable-shape `UndoToken`, nursery-allocation GC) is evidently cheaper than the branch/verdict-computation overhead a hand-inlined replacement adds, reinforcing the closed scorer pilot's own conclusion from a different angle. A materially different fused-kernel candidate needs a different mechanism than "delete/inline the same dead branches a different way" — batching work across candidates rather than fusing one candidate's apply/evaluate/undo cycle at a time remains untested — not a wider eligibility gate or more tuning of this same approach. Use the closed scorer pilot's exact evaluation protocol (deterministic node budget, non-binding wall deadline, byte-identical `id:solved:nodes` signatures required before timing is interpreted, interleaved reps on the actual eligible-level population) for any such descendant.

**2026-09-02, `getNeighbors`'s own array-allocation share measured, CLOSED NEGATIVE before implementation.** A new nested `_BEAM_DEBUG` sub-timer isolated `getNeighbors`'s own share of `candGenExcl`, reproducing the 2026-08-27 breakdown's exact protocol/workloads/beam-call-counts (90 on Corpus-2 stride 70, 91 on published — both matching exactly) as a value-of-information check before spending implementation effort on the "fixed neighbor slots" candidate named above. Result: `getNeighbors` is a **minority** of `candGenExcl` on both workloads (8.3% on the hard Corpus-2 sample, 14.2% on published) — a smaller absolute share of beam time (4.7-6.7%) than what the already-closed fused-kernel pilot eliminated (a strict superset including `getNeighbors`) and still lost net wall time on. Close the "fixed neighbor slots" candidate without an implementation attempt. See [`../reports/2026-09-02-getneighbors-allocation-share-pilot.md`](../reports/2026-09-02-getneighbors-allocation-share-pilot.md). **2026-09-02, same day: the "batched candidates" descendant closed the same way** — see [`../reports/2026-09-02-batched-candidates-allocation-share-pilot.md`](../reports/2026-09-02-batched-candidates-allocation-share-pilot.md); no further descendant of the fused-kernel entry is currently nominated.

### Dense level-local indexing

The positive `staticNeighborKeys` conversion showed that sparse packed-key storage can be wasteful when a hot structure only needs live cells. The 2026-08-26 follow-up sharpened the boundary:

- removing the 1 MiB `cellDenseIndex` indirection while keeping `staticNeighborKeys` directly row-major passed repeated A/B measurement: published short solves improved about 1.66%, while the hard Corpus-2 sample was effectively flat (+0.05%) with identical decisions/nodes;
- naively converting the six remaining `prepLevel()` mechanic arrays to dense storage improved the short sample but regressed the hard sample about 2.82%, so that exact form is closed;
- the likely failure mode is repeated `denseIndex()` arithmetic in hot readers, not dense storage itself. A future mechanic-array candidate must hoist/reuse a row calculation per hot key rather than independently recomputing it for each metadata read.

Extend dense indexing only when profiles identify a specific allocation/lookup cost. Prefer coherent level-local `0..N-1` representations where they remove both storage and indirection, and treat arithmetic inserted into per-node loops as a first-class cost. See [`../reports/2026-08-26-dense-index-architecture-followup.md`](../reports/2026-08-26-dense-index-architecture-followup.md).

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
- naive six-array `prepLevel()` dense conversion with independent `denseIndex()` calls at each reader: hard Corpus-2 sample regressed about 2.82%;
- pre-resolving ordinary ablation gates while retaining the same scorer;
- static plain/default/no-template scorer specialization that only deletes impossible scoring branches: deterministic parity held, but published was about 0.91% slower and the hard Corpus-2 sample was effectively flat (-0.05%);
- eligibility-gated fused plain-candidate move/state kernel (inlined `applyMove`/`evaluatePrunedMove`/`undoMove` with primitive, non-allocating undo storage, for the same mechanic-free shape): deterministic parity held on every eligible level in both corpora, but published (the 24 eligible levels) was about 3.13% slower in all 5 measured reps and Corpus-2 (the 4 eligible levels) was flat/noisy (-0.11%);
- custom hash tables merely because native `Map` looks high-level: numeric-keyed `Map` matched/beat the measured custom form.

Dated reports retain exact measurements.

## Current beam representation

The August 23 work already:

- made dedup/diversity key construction lazy;
- replaced string-heavy hot keys with a mixed-radix numeric fast path plus exact string fallback when the composed product is unsafe; the schema-valid 31/32-flipper radix defect remains tracked in [`solver-correctness-hardening.md`](solver-correctness-hardening.md);
- found no value in the custom hash/typed-array arena once native `Map` received numeric keys;
- made candidate generation/scoring/state work the leading documented beam target again.

## Execution order

1. Current-HEAD profile complete: hard-beam work remains the largest named bucket; the static scorer specialization it nominated is closed negative.
2. **Done (2026-08-27):** the existing debug-only beam breakdown, run on the hard Corpus-2 workload plus published, separated replay/candidate-generation/connectivity/dedup/sort. Candidate generation/apply/undo dominates (46.5-55.3%) on every workload; connectivity and replay are real but clearly secondary.
3. **Done (2026-08-27), closed negative:** the bounded fused-JS move/state-kernel pilot (candidate generation/apply/undo dominated, so it was earned) preserved every decision but was measurably slower on the levels it could engage. Replay/state-materialization stays closed — it was measured present but not dominant, not merely unmeasured. Do not retest this exact branch-inlining form; a descendant needs a different mechanism per the pilot report. **2026-09-02:** the "fixed neighbor slots" descendant is also closed, this time by a value-of-information measurement before any implementation — `getNeighbors`'s own share of `candGenExcl` is a minority (8.3-14.2%) on both re-measured workloads. **2026-09-02, same day: the "batched candidates" descendant is also closed the same way.** The concrete allocation that redesign would target — the per-candidate `BeamNode` object-literal push (`cands.push({...})`) — is, on its own, another minority share of `candGenExcl` (11.5-12.7%, the same order of magnitude as `getNeighbors`'s own share). Combined, the two together (~20-27% of `candGenExcl`) are still smaller than the superset the already-closed fused-kernel pilot eliminated and still lost net wall time on. This closes the last named descendant of the fused-kernel entry — see [`batched-candidates allocation share pilot`](../reports/2026-09-02-batched-candidates-allocation-share-pilot.md). No further candidate is currently nominated on this hot loop; a future attempt needs a materially different mechanism, not another allocation-avoidance/restructuring variant.
4. Extend dense indexing only for measured hot structures; do not repeat the naive six-array form.
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

- [`../reports/2026-08-27-fused-plain-candidate-kernel-pilot.md`](../reports/2026-08-27-fused-plain-candidate-kernel-pilot.md)
- [`../reports/2026-08-27-beam-cost-breakdown-candidate-generation-dominant.md`](../reports/2026-08-27-beam-cost-breakdown-candidate-generation-dominant.md)
- [`../reports/2026-08-26-current-head-specialized-scorer-pilot.md`](../reports/2026-08-26-current-head-specialized-scorer-pilot.md)
- [`../reports/2026-08-26-dense-index-architecture-followup.md`](../reports/2026-08-26-dense-index-architecture-followup.md)
- [`../reports/2026-08-24-speed-substrate-static-audit.md`](../reports/2026-08-24-speed-substrate-static-audit.md)
- [`../reports/2026-07-30-solver-hot-path-pure-speed.md`](../reports/2026-07-30-solver-hot-path-pure-speed.md)
- [`../reports/2026-08-23-dense-static-neighbor-keys.md`](../reports/2026-08-23-dense-static-neighbor-keys.md)
- [`../reports/2026-08-23-beam-dedup-key-lazy-build-experiment.md`](../reports/2026-08-23-beam-dedup-key-lazy-build-experiment.md)
- [`../reports/2026-08-23-beam-dedup-numeric-key-arena.md`](../reports/2026-08-23-beam-dedup-numeric-key-arena.md)
- [`../reports/2026-08-06-beam-state-dedup-sound-signature-audit.md`](../reports/2026-08-06-beam-state-dedup-sound-signature-audit.md)
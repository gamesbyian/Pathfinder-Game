# Solver architectural speed opportunities

> **Status:** **HIGH PRIORITY ACTIVE PROGRAM** alongside scheduler/generalization work; it must not displace the P0 research-validity blocker.
> **Peer priority:** [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Scheduling reduces wasted work; this program reduces the cost of work still worth executing.

Use with [`solver-architecture.md`](solver-architecture.md), [`solver-budget-determinism.md`](solver-budget-determinism.md), [`solver-research-operating-model.md`](solver-research-operating-model.md), and [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).

## Working rule

The solver is an experimental system. Internal representation, object shape, traversal plumbing, module boundaries, and implementation language are not compatibility contracts. Correctness, level-blindness, deterministic work semantics, reproducible measurement, and measured solve/cost behavior are.

Profile first. Prefer reversible high-upside experiments. A claimed pure-speed change must preserve search work and decisions; a change that alters ordering is a behavior experiment and must be evaluated at matched work.

Do not optimize because a construct looks inefficient in source. Measure self-time/allocation/GC/lookup cost on representative workloads first. A spectacular microbenchmark that does not move end-to-end solver time is a closed result, not motivation to keep digging.

## Why speed still matters

Implementation-level work has repeatedly paid off. The July hot-path campaign cut published-corpus wall time by roughly 27% and a Corpus-2 sample by roughly 13% while preserving search behavior; beam tree-order walking saved roughly 16-30% in measured cases. On 2026-08-23, lazy beam-key construction and collision-free numeric keys produced further multi-percent/double-digit gains at identical search work, while dense `staticNeighborKeys` removed a plainly oversized allocation.

Under a fixed product latency ceiling, faster identical search creates potential search headroom. **Do not automatically spend that headroom on a larger ladder.** The scheduler/allocation program decides whether more work is actually valuable.

## Stop re-testing these unchanged forms

- fully sound DFS/beam transposition/dedup as a major opportunity: measured true beam duplicates were ~0.019%; weak ceiling;
- removing coarse beam dedup: negative because it functions as width/diversity management, not merely exact equivalence;
- old fixed-width numeric beam signatures: invalid once mechanic cardinalities exceeded their assumed bit fields;
- `UndoToken` object pooling: measured slower; a different state representation remains open;
- beam quickselect replacing sort: sort was not a dominant measured cost;
- sparse-to-dense conversion justified only by cache-locality intuition: weak in the tested form;
- pre-resolving ordinary ablation gates while retaining the same scorer: slower;
- hand-rolled hash structures merely because native `Map` seems high-level: numeric-keyed native `Map` already matched/beaten the measured custom form.

Dated reports retain exact measurements.

## Bounded execution-substrate benchmark

The offline research solver now consumes enough compute that the assumption “the hot kernel remains JavaScript/V8” deserves one explicit bounded test.

This is **not** a rewrite proposal and is not allowed to block already-profiled JavaScript work if the prototype cannot be made cheaply. It is a feasibility benchmark intended to close or elevate the question.

### Entry gate

Run this only when all are true:

- profiling identifies a compact hot kernel that accounts for material end-to-end time;
- its inputs/state can cross a native/WASM boundary without first redesigning half the solver;
- a disposable prototype can be built with bounded effort;
- the benchmark can preserve or precisely compare logical search work.

If reaching native code first requires a large architectural rewrite, the experiment has failed its own feasibility gate. Continue the measured V8 work instead.

### Prototype scope

Choose one representative hot kernel with minimal integration surface, preferably candidate generation/scoring plus state apply/undo for DFS or beam. Implement the same semantics in one native-compiled form that can realistically be invoked from the current toolchain, such as Rust/C++ compiled to WASM or a native helper where CI/research runners permit it.

Requirements:

- identical level/config/seed/work inputs;
- identical search decisions where the prototype claims semantic equivalence;
- include JS↔WASM/native boundary, copying, marshalling, setup, and teardown cost;
- benchmark both many-short-solves and long-hard-level workloads;
- measure cold/startup and warm steady-state separately;
- account for V8 JIT warm-up rather than comparing warmed native code with cold JS;
- include allocation/GC behavior where the alternative changes memory ownership;
- keep the prototype disposable unless the result is material.

### Decision gate

If representative **end-to-end** solver work is not materially faster after integration overhead, close the native/WASM direction and continue V8-focused optimization. Do not migrate because native code feels more respectable, because one microkernel is faster, or because a synthetic benchmark excludes data movement.

If the gain is large enough to change research throughput materially, write a separate migration proposal with a narrow boundary, portability/CI costs, debugging/observability costs, and a staged rollback path. The benchmark itself should not grow into that migration.

## Profile-led compiled/dense hot kernel

### Dense-native indexing

The grid has at most 225 live cells while historical packed-key storage addressed a 1,048,576-key universe. `staticNeighborKeys` previously allocated about 16.8 MB for at most ~900 useful directed-neighbor slots; the 2026-08-23 dense conversion produced a measurable speedup.

Continue dense indexing only where profiles show worthwhile allocation/lookup cost. Favor a coherent per-level `0..N-1` compiled representation over isolated conversions when several interacting hot structures benefit. Avoid blanket churn where pooled packed arrays are already cheap.

**Gate:** each additional conversion should name the measured cost it removes and compare end-to-end speed. “The representation is cleaner/smaller” is not enough for a speed-priority change.

### Specialized scoring kernel

`scoreMove` remains a broad interpreter of scoring features. Prototype a scorer compiled once per `(level, profile/template)` that removes impossible mechanics and zero-weight terms and precomputes static quantities where profitable.

This is distinct from the failed experiment that only pre-resolved ablation booleans while leaving the same computation. Treat changed floating-point ordering as a behavior change unless decision identity is demonstrated.

**Pilot gate:** profiling must show scoring/candidate evaluation remains a dominant self-time bucket after recent key optimizations. Compare specialization setup cost on short solves as well as steady-state savings on hard searches.

### Fused move/state kernel

Candidate generation currently crosses relatively general abstractions despite at most four grid neighbors. Profile a fused kernel with fixed neighbor slots, dense mechanic metadata, direct legality/state updates, and primitive undo storage rather than fresh candidate arrays and object-shaped undo records.

Do not confuse this with `UndoToken` pooling. The question is whether the representation can disappear from the hot loop.

**Stop gate:** if fusion gains come mainly from changing search order/object semantics rather than implementation cost, reclassify it as a behavior experiment instead of continuing to call it pure speed.

## Beam state materialization

Parent pointers plus mutable replay have already been optimized heavily; tree-order walking substantially reduced replay steps. Remaining open alternatives are compact snapshots, checkpoint-plus-delta state, or another materialization strategy that avoids long ancestor reconstruction.

Race prototypes against the current replay machine. Do not assume copying more state is faster.

Before implementation, quantify current replay share after tree-order walking. If replay is no longer material in representative profiles, demote this direction.

## Work-meter and secondary overhead

`applyMove()` and `isConnected()` update both per-solve and legacy cumulative work counters. Only pursue local accumulation/batched flushes if profiling shows material self-time, and preserve exact budget/provenance semantics.

Likewise, avoid speculative micro-optimization of maps, sorts, allocation sites, branch hints, cache layouts, or numeric tricks that are not visible in representative profiles. Hot-path cleverness has a maintenance/correctness cost and must earn it.

## Current beam representation status

Two major 2026-08-23 costs are already addressed:

- dedup/diversity string keys are built lazily rather than for every accepted candidate;
- collision-free mixed-radix numeric keys use level-specific cardinalities with a safe-integer check and exact string fallback.

A hand-rolled custom hash table did not beat native numeric-keyed `Map`, so the custom hash/typed-array arena variant is closed absent new profile evidence. The dominant documented beam cost moved back toward candidate generation/scoring/state work.

## Suggested execution order

1. Keep working measured current hot spots immediately; do not wait on speculative substrate work.
2. Run the native/WASM feasibility benchmark only if its compact-entry gate is satisfied; then close or elevate it once.
3. Continue profile-led compiled scoring/fused move-state work where current profiles justify it.
4. Continue dense-native conversion only for structures with measured cost.
5. Re-measure beam replay before prototyping alternative materialization.
6. Touch work-meter/secondary overhead only when profiles nominate it.

This order deliberately avoids making one speculative native experiment a dependency for known profitable work.

## Representative benchmark set

Do not let speed work optimize only whichever corpus is convenient. Use a compact set covering:

- many short/easy published solves, where fixed setup/allocation cost dominates;
- representative medium searches;
- long hard Corpus-2 searches, where per-node/per-candidate cost dominates;
- beam-heavy and DFS/repair-relevant workloads when the changed kernel touches them.

Report per-class effects as well as an aggregate. A change can be good for short solves and irrelevant or negative on the expensive tail, or vice versa.

## Interaction with scheduling

Keep policy and kernel experiments separable:

- scheduler decisions use machine-independent `workSpent`, never live host speed;
- pure implementation-speed experiments pin deterministic work and non-binding deadlines;
- if an architectural change alters search order, evaluate gains/losses at matched work;
- do not credit less work as a kernel speedup or faster primitives as scheduler intelligence;
- do not use a speedup as automatic permission to increase aggregate production work.

A faster implementation may allow a product latency budget to be converted into more work later, but that is a separate allocation decision.

## Evaluation protocol

For pure speed claims:

1. profile first and state the measured hotspot/share being targeted;
2. use representative workloads rather than microbenchmarks alone;
3. pin work/node limits and keep wall deadlines non-binding;
4. require identical outcomes/work and, where claimed, search decisions;
5. compare interleaved repeated wall measurements with warm-up order controlled;
6. report variance and both short-solve/hard-level behavior;
7. inspect allocation/GC when representation changes plausibly move them;
8. validate the production/browser/worker boundary if a native/WASM change affects it;
9. stop after a clear negative rather than tuning the benchmark until it becomes positive.

For behavior-changing refactors, use the standard level-blind matched-work promotion contract instead.

## Evidence anchors

- [`../reports/2026-07-30-solver-hot-path-pure-speed.md`](../reports/2026-07-30-solver-hot-path-pure-speed.md)
- [`../reports/2026-08-23-dense-static-neighbor-keys.md`](../reports/2026-08-23-dense-static-neighbor-keys.md)
- [`../reports/2026-08-23-beam-dedup-key-lazy-build-experiment.md`](../reports/2026-08-23-beam-dedup-key-lazy-build-experiment.md)
- [`../reports/2026-08-23-beam-dedup-numeric-key-arena.md`](../reports/2026-08-23-beam-dedup-numeric-key-arena.md)
- [`../reports/2026-08-06-beam-state-dedup-sound-signature-audit.md`](../reports/2026-08-06-beam-state-dedup-sound-signature-audit.md)
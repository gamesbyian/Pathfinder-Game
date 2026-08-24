# Solver architectural speed opportunities

> **Status:** **ASAP / HIGH PRIORITY ACTIVE PROGRAM**.
> **Peer priority:** [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Scheduling reduces wasted work; this program reduces the cost of work still worth executing.

Use with [`solver-architecture.md`](solver-architecture.md), [`solver-budget-determinism.md`](solver-budget-determinism.md), [`solver-research-operating-model.md`](solver-research-operating-model.md), and [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).

## Working rule

The solver is an experimental system. Internal representation, object shape, traversal plumbing, module boundaries, and implementation language are not compatibility contracts. Correctness, level-blindness, deterministic work semantics, reproducible measurement, and measured solve/cost behavior are.

Profile first. Prefer reversible high-upside experiments. A claimed pure-speed change must preserve search work and decisions; a change that alters ordering is a behavior experiment and must be evaluated at matched work.

## Why speed still matters

Implementation-level work has repeatedly paid off. The July hot-path campaign cut published-corpus wall time by roughly 27% and a Corpus-2 sample by roughly 13% while preserving search behavior; beam tree-order walking saved roughly 16-30% in measured cases. On 2026-08-23, lazy beam-key construction and collision-free numeric keys produced further multi-percent/double-digit gains at identical search work, while dense `staticNeighborKeys` removed a plainly oversized allocation.

Under any latency ceiling, faster identical search translates into more usable search headroom. That makes architecture work a capability multiplier as well as a convenience.

## Stop re-testing these unchanged forms

- fully sound DFS/beam transposition/dedup as a major opportunity: measured true beam duplicates were ~0.019%; weak ceiling;
- removing coarse beam dedup: negative because it functions as width/diversity management, not merely exact equivalence;
- old fixed-width numeric beam signatures: invalid once mechanic cardinalities exceeded their assumed bit fields;
- `UndoToken` object pooling: measured slower; a different state representation remains open;
- beam quickselect replacing sort: sort was not a dominant measured cost;
- sparse-to-dense conversion justified only by cache-locality intuition: weak in the tested form;
- pre-resolving ordinary ablation gates while retaining the same scorer: slower.

Dated reports retain exact measurements.

## Priority 0: benchmark the execution substrate

The offline research solver now consumes enough compute that the assumption “the hot kernel remains JavaScript/V8” deserves one explicit bounded test.

This is **not** a rewrite proposal. It is a feasibility benchmark intended to close or elevate the question cheaply.

### Prototype scope

Choose one representative hot kernel with minimal integration surface, preferably candidate generation/scoring plus state apply/undo for DFS or beam. Implement the same semantics in one native-compiled form that can realistically be invoked from the current toolchain, such as Rust/C++ compiled to WASM or a native helper where CI/research runners permit it.

Requirements:

- identical level/config/seed/work inputs;
- identical search decisions where the prototype claims semantic equivalence;
- include JS↔WASM/native boundary and marshalling cost;
- benchmark both many-short-solves and long-hard-level workloads;
- use warm steady-state and cold/startup measurements where relevant;
- keep the prototype disposable unless the result is material.

### Decision gate

If representative end-to-end solver work is not materially faster after integration overhead, **close the native/WASM direction** and continue V8-focused optimization. Do not migrate because native code feels more respectable.

If the gain is large enough to change research throughput materially, write a separate migration proposal with a narrow boundary and preserve the JavaScript game/runtime interface. The benchmark itself should not grow into that migration.

## Priority 1: compiled/dense hot kernel

### Dense-native indexing

The grid has at most 225 live cells while historical packed-key storage addressed a 1,048,576-key universe. `staticNeighborKeys` previously allocated about 16.8 MB for at most ~900 useful directed-neighbor slots; the 2026-08-23 dense conversion produced a measurable speedup.

Continue dense indexing only where profiles show worthwhile allocation/lookup cost. Favor a coherent per-level `0..N-1` compiled representation over isolated conversions when several interacting hot structures benefit. Avoid blanket churn where pooled packed arrays are already cheap.

### Specialized scoring kernel

`scoreMove` remains a broad interpreter of scoring features. Prototype a scorer compiled once per `(level, profile/template)` that removes impossible mechanics and zero-weight terms and precomputes static quantities where profitable.

This is distinct from the failed experiment that only pre-resolved ablation booleans while leaving the same computation. Treat changed floating-point ordering as a behavior change unless decision identity is demonstrated.

### Fused move/state kernel

Candidate generation currently crosses relatively general abstractions despite at most four grid neighbors. Profile a fused kernel with fixed neighbor slots, dense mechanic metadata, direct legality/state updates, and primitive undo storage rather than fresh candidate arrays and object-shaped undo records.

Do not confuse this with `UndoToken` pooling. The question is whether the representation can disappear from the hot loop.

## Priority 2: beam state materialization

Parent pointers plus mutable replay have already been optimized heavily; tree-order walking substantially reduced replay steps. Remaining open alternatives are compact snapshots, checkpoint-plus-delta state, or another materialization strategy that avoids long ancestor reconstruction.

Race prototypes against the current replay machine. Do not assume copying more state is faster.

## Priority 3: work-meter and secondary overhead

`applyMove()` and `isConnected()` update both per-solve and legacy cumulative work counters. Only pursue local accumulation/batched flushes if profiling shows material self-time, and preserve exact budget/provenance semantics.

Likewise, avoid speculative micro-optimization of maps, sorts, allocation sites, or cache layouts that are not visible in representative profiles.

## Current beam representation status

Two major 2026-08-23 costs are already addressed:

- dedup/diversity string keys are built lazily rather than for every accepted candidate;
- collision-free mixed-radix numeric keys use level-specific cardinalities with a safe-integer check and exact string fallback.

A hand-rolled custom hash table did not beat native numeric-keyed `Map`, so the custom hash/typed-array arena variant is closed absent new profile evidence. The dominant documented beam cost moved back toward candidate generation/scoring/state work.

## Suggested execution order

1. Run the bounded native/WASM feasibility benchmark once; either close it or elevate it based on end-to-end evidence.
2. Continue profile-led compiled scoring and fused move/state work.
3. Continue dense-native conversion where measured cost justifies it.
4. Race alternative beam-state materialization against current replay.
5. Touch work-meter/secondary overhead only when profiles nominate it.

The native/WASM benchmark is deliberately first because it can change the return on every later hot-loop optimization, but it must remain small enough to abandon immediately if the result is weak.

## Interaction with scheduling

Keep policy and kernel experiments separable:

- scheduler decisions use machine-independent `workSpent`, never live host speed;
- pure implementation-speed experiments pin deterministic work and non-binding deadlines;
- if an architectural change alters search order, evaluate gains/losses at matched work;
- do not credit less work as a kernel speedup or faster primitives as scheduler intelligence.

A faster implementation may allow a larger product latency budget to be converted into more work later, but that is a separate policy decision.

## Evaluation protocol

For pure speed claims:

1. use representative workloads rather than microbenchmarks alone;
2. pin work/node limits and keep wall deadlines non-binding;
3. require identical outcomes/work where order preservation is claimed;
4. compare interleaved repeated wall measurements, including JIT warm-up considerations;
5. report both short-solve and hard-level behavior when fixed per-solve costs differ;
6. validate the production/browser boundary if a native/WASM change affects it.

For behavior-changing refactors, use the standard level-blind matched-work promotion contract instead.

## Evidence anchors

- [`../reports/2026-07-30-solver-hot-path-pure-speed.md`](../reports/2026-07-30-solver-hot-path-pure-speed.md)
- [`../reports/2026-08-23-dense-static-neighbor-keys.md`](../reports/2026-08-23-dense-static-neighbor-keys.md)
- [`../reports/2026-08-23-beam-dedup-key-lazy-build-experiment.md`](../reports/2026-08-23-beam-dedup-key-lazy-build-experiment.md)
- [`../reports/2026-08-23-beam-dedup-numeric-key-arena.md`](../reports/2026-08-23-beam-dedup-numeric-key-arena.md)
- [`../reports/2026-08-06-beam-state-dedup-sound-signature-audit.md`](../reports/2026-08-06-beam-state-dedup-sound-signature-audit.md)

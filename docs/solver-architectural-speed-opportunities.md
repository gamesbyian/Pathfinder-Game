# Solver architectural speed opportunities

> **Status:** **ASAP / HIGH PRIORITY ACTIVE PROGRAM**.
> **Peer priority:** [`solver-scheduling-policy.md`](solver-scheduling-policy.md) is also **ASAP / HIGH PRIORITY**. Scheduling reduces wasted search work; this program reduces the cost of the work the scheduler chooses to execute.

Architecture-level runtime opportunities complement the ranked live solve queue. Use with [`solver-architecture.md`](solver-architecture.md), [`solver-budget-determinism.md`](solver-budget-determinism.md), [`solver-scheduling-policy.md`](solver-scheduling-policy.md), and [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).

## Working rule

The solver is an experimental system, not a public-facing service. Internal representation, traversal order, object shape, and module boundaries are not compatibility contracts. Correctness, level-blindness, reproducible measurement, and measured solve/cost behavior are.

Prefer directly testing a reversible high-upside refactor over spending comparable effort proving it safe in advance. A failed large experiment is useful evidence. Search-order changes are allowed, but must be evaluated as behavior changes rather than mislabeled pure-speed work.

## Evidence that implementation speed is still material

The 2026-07-30 hot-path campaign found large constant-factor wins: order-preserving changes cut published-corpus wall time 27.1% and a Corpus-2 sample 13.2%; beam tree-order walking was worth roughly 16-30% on measured populations. Later state-buffer reuse, urgency-context pooling, and dense distance storage added further double-digit batch wins. See [`../reports/2026-07-30-solver-hot-path-pure-speed.md`](../reports/2026-07-30-solver-hot-path-pure-speed.md).

The lesson is not that the current kernel is poor; it is that representation-level work has repeatedly paid enough to justify larger experiments. This is therefore near-term execution work, not a passive idea list.

## Already tested: do not rediscover unchanged forms

- **Fully sound DFS/beam transposition/dedup:** weak ceiling. Beam true duplicates were ~0.019% of candidates. See [`../reports/2026-08-06-beam-state-dedup-sound-signature-audit.md`](../reports/2026-08-06-beam-state-dedup-sound-signature-audit.md).
- **Removing coarse beam dedup:** negative. On the corrected 75-level test, dedup-on had 18 exclusive solves versus 1 dedup-off exclusive solve. The mechanism is valuable as width/diversity management even though it is not exact state equivalence.
- **Old numeric beam signature:** invalid above four bits per mechanic field. Production now uses collision-free delimited string tuples; do not restore the old packing scheme.
- **`UndoToken` object pooling:** 4.6% slower at identical search work. A different state/undo representation remains open; reusing the same object shape does not.
- **Beam quickselect replacing sort:** profiling showed phase sort too small to matter in the measured case.
- **Sparse-to-dense for cache locality alone:** weak on the 15x15 access pattern. Dense storage still won elsewhere by reducing allocation/initialization, not by the originally proposed cache-aliasing mechanism.
- **Pre-resolving ordinary ablation gates:** 2.4% slower; production `cfg === null` is already a cheap fast path.

## Open architectural experiments

### 1. Dense-native search core

Distance arrays are dense, but `staticNeighborKeys`, `visited`, `edgeUsage`, `buildIndexArr` outputs, `gateFlags`, and `reachBlockedArr` still use the packed-key `KEY_SPACE` representation. A grid has at most 225 live cells while `KEY_SPACE` is 1,048,576; `staticNeighborKeys` reserves `KEY_SPACE * 4` slots for at most about 900 useful directed-neighbor slots.

Prototype a compiled per-level representation with internal cells `0..N-1`; convert packed keys only at solver boundaries. Move state arrays, mechanic indexes/flags, adjacency, portal destinations, and hot lookup tables onto dense indices together rather than as isolated micro-edits.

This extends an already successful migration. Reuse the distance-array safety pattern: compiler-forced accessor changes where possible, temporary bounds guards, large-corpus read validation, then deterministic A/B.

**2026-08-23 first step: `staticNeighborKeys` converted to dense per-level indexing.** A microbenchmark confirmed the KEY_SPACE-sized `Int32Array(KEY_SPACE * 4)` (16.8 MB) was costing ~2ms per allocation purely from its size (not from filling it — only real cells were ever written either way); it's now a compact per-level array addressed via a new `cellDenseIndex: Uint8Array(KEY_SPACE)` (1 MB, same size class as the existing `mustPassIndex`/`mustCrossIndex`/`flipperIndexMap`), ~30x cheaper to allocate. Order-preserving (`nodesExpanded` bit-identical, `solver:bench --check` byte-identical baseline), −2.7% published wall time (consistent, 3/3 rounds), ≈−1% Corpus-2 (noise-level — this specific array's fixed per-solve cost matters far more for many-quick-solves workloads than for individual long hard-level solves). `visited`, `edgeUsage`, `gateFlags`, and `reachBlockedArr` remain packed-key-indexed — not attempted this pass; `gateFlags`/`reachBlockedArr` are 16x smaller than the old `staticNeighborKeys` so the same conversion there would need to independently earn its complexity, and `visited`/`edgeUsage` are already pooled/reused across attempts within one solve (search-state.ts's `STATE_BUF_*` slots) rather than reallocated per prepLevel call, so their allocation-cost profile is different. See [`../reports/2026-08-23-dense-static-neighbor-keys.md`](../reports/2026-08-23-dense-static-neighbor-keys.md).

### 2. Beam coarse-dedup representation: optimized; arena/hash form closed

Current beam phases allocate `BeamNode` objects, build native dedup maps (plus a near-tie map), sort arrays, and optionally build diversity `Map`/`Set` structures. Preserve the **current coarse merge semantics** exactly; do not replace them with fully sound state equivalence, whose ceiling is already measured as negligible.

The documented proposal was to prototype parallel typed arrays / an arena for candidate fields and a custom hash table over the existing scalar tuple, with parent indices replacing object references. The 2026-08-23 work below found that the important cost was string-key construction, removed it with lazy construction and collision-free numeric keys, and found a hand-rolled custom hash table no faster than native numeric-keyed `Map`. The custom-hash-table/typed-array-arena form is therefore closed for now; do not treat it as an outstanding task without new profile evidence. Further dominant beam hot-path work is in items 4/5, while dense-native conversion remains separately open where profiling supports it.

**2026-08-23 partial progress:** the two per-candidate delimited-string dedup/diversity keys (`sc`/`sk`) used to be built unconditionally for every accepted beam candidate, even in the (common) phases that never reach the `cands.length > beamWidth` branch that consumes them. `BeamNode` now stores the underlying 7 numeric fields as scalars and builds the strings lazily, only where actually consumed — order-preserving (`nodesExpanded` bit-identical, `solver:bench --check` byte-identical baseline node count), −7.8% published / −11.2% Corpus-2-sample wall time on interleaved node-budgeted medians. See [`../reports/2026-08-23-beam-dedup-key-lazy-build-experiment.md`](../reports/2026-08-23-beam-dedup-key-lazy-build-experiment.md).

**2026-08-23 further progress:** the delimited-string `Map<string, BeamNode>` dedup/diversity keys themselves are now replaced with a provably collision-free numeric encoding (`Map<number, BeamNode>`) wherever it fits — a mixed-radix positional key whose per-field multipliers are each level's own true mechanic cardinalities (never a fixed-width assumption), with a runtime `Number.isSafeInteger` overflow check falling back to the exact same string key on the rare level where it wouldn't fit. A standalone microbenchmark found the win comes from avoiding string construction, not from Map's hashing algorithm — a hand-rolled custom hash table (the literal form suggested above) measured no faster than a native `Map` keyed by a plain number, so the custom-hash-table/typed-array-arena idea was not pursued further; a native `Map` gets the same speed while keeping its insertion-order semantics for free, avoiding having to hand-replicate the near-tie-retention `dm2` map's delete/re-insert ordering. Verified via both a new differential unit test (byte-identical decisions against the string-key fallback on a real search) and the usual node-budgeted A/B: order-preserving, further −5.9% published / −4.9% Corpus-2-sample wall time on top of the lazy-string-key change. See [`../reports/2026-08-23-beam-dedup-numeric-key-arena.md`](../reports/2026-08-23-beam-dedup-numeric-key-arena.md). The candidate-generation/scoring segment remains the dominant remaining self-time bucket within `beamSearchFromGate` — items 4/5 below, not this one, are where further gains would come from.

### 3. Alternative beam-state materialization

Parent pointers plus one mutable replay state have already been optimized heavily. Tree-order walking reduced replay from 9.78M to 2.08M steps in one measured case, so "walk related paths together" is not new.

What remains untested in the documented record is a different state architecture: compact snapshots, checkpoint-plus-delta state, or an arena representation that materializes an expansion state without reconstructing an ancestor path first. Race prototypes; do not assume snapshots beat the current replay machine.

### 4. Compiled/specialized scoring kernel

`scoreMove` remains a broad interpreter of every scoring feature. Build a scorer once per `(level, profile, template)` that omits impossible mechanics and zero-weight terms and precomputes static candidate quantities where profitable. This is materially different from the already-negative experiment that merely pre-resolved ablation booleans while keeping the same computation.

Judge by CPU profile plus deterministic work/outcome comparison. Specialization that changes floating-point operation order is a behavior change unless proven decision-identical.

### 5. Fused move/state kernel

`getNeighbors()` still returns a fresh array despite a maximum of four grid neighbors, and the architecture doc already lists scratch reuse as open. A larger version is worth testing after dense indexing: fixed neighbor slots, dense mechanic metadata, direct dynamic validity checks, and primitive undo stacks/slabs rather than a general candidate array plus object-shaped `UndoToken`.

Do not confuse this with the failed `UndoToken` pooling experiment. The open question is whether the hot kernel can avoid that representation, not whether V8 should recycle the same object.

### 6. Work-meter hot writes

The canonical work currency is a contract; its per-operation implementation is not. `applyMove()` and `isConnected()` currently update both the per-solve authority and a legacy module-global cumulative counter. Profile whether local primitive accumulation with bounded flushes can preserve exact budget/provenance semantics more cheaply. Treat as lower priority unless profiling shows material self-time.

## Suggested order

1. Continue dense-native conversion only where profiling shows worthwhile packed-key allocation/lookup cost.
2. Compiled scoring and fused move generation/state mutation, now the dominant documented beam hot-path opportunity.
3. Alternative beam-state materialization.
4. Work-meter write cleanup only if profiling nominates it.

The scoring/move kernel has the strongest immediate profile evidence; dense-native work remains attractive when it removes measured representation/allocation cost rather than as a blanket conversion project.

## Interaction with scheduling work

Keep the two programs experimentally separable. Scheduler comparisons use machine-independent work so faster or slower hosts do not alter allocation. Pure implementation-speed experiments should preserve search work and decisions when claiming order preservation. If an architectural refactor intentionally changes search order, evaluate it as a behavior change under matched work.

A scheduler gain must not be described as a kernel speedup merely because it performs less work; a kernel speedup must not silently change scheduler action shares because wall speed is not an allocation input.

## Evaluation

For a claimed pure implementation speedup: pin deterministic work/node limits, make wall time non-binding, require identical outcomes/search work where the design claims order preservation, and compare interleaved wall medians. For a deliberate search-order/behavior change: use a level-blind matched-work population A/B and report gains, losses, work, and wall time separately.

A regression is not inherently disqualifying during experimentation; measure it, understand the trade, and revert if the net result is poor. See [`solver-research-operating-model.md`](solver-research-operating-model.md) for evidence rules and [`solver-future-work.md`](solver-future-work.md) for deferred capability ideas.
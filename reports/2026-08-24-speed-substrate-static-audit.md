# Speed / execution-substrate static audit (2026-08-24)

## Decision

Keep #8 active as a **profile-led JavaScript hot-kernel program**, but narrow its next speculative work:

- **Do not run the native/WASM prototype against the current per-candidate search boundary.** The present hot region is not compact enough to satisfy the architecture document's own entry gate without migrating a substantial fraction of the solver core.
- **A true level/profile/template-specialized scoring pilot remains plausible**, but only as a bounded generated/compiled-JS experiment that actually removes unreachable mechanic/template branches. Merely pre-resolving ablation booleans or hoisting cheap table reads has already failed to earn meaningful speed.
- Continue to prefer measured order-preserving V8 representation wins. The 2026-08-23 work demonstrates that this lane still has material headroom.

This is a static architecture audit, not a new benchmark. No production speed claim follows from it.

## Current empirical baseline

The relevant recent profile history is already strong enough to rule out several speculative directions.

### 2026-07-30 profile

Representative self-time shares included:

- connectivity flood fill: 34.1% published / 11.6% Corpus-2;
- `beamSearchFromGate`: 11.4% / 15.8%;
- `scoreMove`: 9.2% / 17.5%;
- `buildCurUrgencyContext`: 7.7% / 11.2%;
- `applyMove`: 5.5% / 9.0%;
- GC: roughly 4-5%.

That campaign produced large real wins but also several valuable negatives: `UndoToken` pooling was 4.6% slower; quickselect was not worth pursuing because sort was not dominant; sparse-packed indexing was not intrinsically slow for a 15x15 live footprint; and beam tree-order walking, while fast, was not purely behavior-preserving under mid-phase budget exits.

See `reports/2026-07-30-solver-hot-path-pure-speed.md`.

### 2026-08-23 fresh beam profile

Before that day's key work, `beamSearchFromGate` was again the largest single self-time entry at about 24.9% of published-corpus self-time. `PF_BEAM_DEBUG` attributed instrumented beam time roughly as:

- candidate generation: 5,397 ms;
- connectivity: 1,719 ms;
- replay: 1,017 ms;
- dedup: 476 ms;
- sort: 466 ms.

The subsequent changes were strongly positive and order-preserving:

- lazy dedup/diversity string construction: about -7.8% published, -11.2% Corpus-2 sample;
- loop-invariant portal lookup hoist: about -1.1% published;
- collision-free mixed-radix numeric beam keys: about -5.9% published, -4.9% Corpus-2;
- dense `staticNeighborKeys`: about -2.7% published, approximately -1% Corpus-2 on its own.

The combined 2026-08-23 stack measured baseline-to-HEAD at about **-9.3% published** and **-16.2% Corpus-2 sample**, with identical search work.

See:

- `reports/2026-08-23-beam-dedup-key-lazy-build-experiment.md`;
- `reports/2026-08-23-beam-dedup-numeric-key-arena.md`;
- `reports/2026-08-23-dense-static-neighbor-keys.md`.

These results argue against declaring the V8 path exhausted.

## Native/WASM entry-gate audit

`docs/solver-architectural-speed-opportunities.md` correctly requires a native/WASM feasibility benchmark to begin from a **compact material hotspot whose inputs/state can cross the boundary without redesigning half the solver**.

The obvious current candidate would be the beam/DFS candidate-generation region: move generation, `applyMove`/`undoMove`, scoring, and perhaps pruning.

On current code that boundary is not compact.

### Mutable search state crossing the candidate kernel

`applyMove` reads/writes:

- the path stack;
- `visited`, a `Uint16Array(KEY_SPACE)`;
- `edgeUsage`, a `Uint8Array(KEY_SPACE)`;
- intersection count;
- must-pass masks;
- must-cross mask plus per-cell `crossCounts`;
- portal jump state;
- flipper-used state;
- surround masks and per-neighbor residual masks;
- must-turn state;
- adjacent-turn state;
- work counters;
- an undo record carrying the exact prior values needed to reverse all of the above.

The backing arrays are reused and efficiently local inside JavaScript, but a native call cannot treat the move as a handful of scalar arguments unless those arrays/state objects themselves live on the native side.

### Scoring state crossing the same boundary

`scoreMove` additionally consumes substantial prepared state:

- goal/objective/must-pass/must-cross distance arrays;
- must-cross perpendicular-approach maps;
- portal-parity maps;
- turn/surround/adjacent-turn distance structures;
- level geometry and exact-resource state;
- profile weights;
- structural template fields;
- ablation configuration;
- current residual masks/history.

Moving only `scoreMove` native would therefore require repeated access/marshalling of a large JS-owned `PrepLevel`. Moving enough prepared and mutable state native to avoid that traffic begins to look like migrating the search core rather than benchmarking one kernel.

### Consequence

A per-candidate JS -> WASM/native call is unlikely to be a fair compact-boundary benchmark, while a prototype that moves state creation, candidate generation, apply/undo, scoring, distance storage, and pruning into native code violates the bounded-entry gate before measurement begins.

**Disposition:** native/WASM is **not justified against the current architecture boundary**. Reopen only if a later dense/compiled refactor naturally creates a compact self-contained kernel with cheap shared-memory semantics, or a fresh profile identifies a different isolated hotspot that already has such a boundary.

This closes the current form without claiming native code could never help a redesigned solver.

## Specialized scorer audit

A generated/compiled JavaScript scorer has a better boundary because it can retain the existing `state`/`prep` objects and execute inside the same VM while removing generic branches at function-construction time.

However, the reason must be stated correctly.

### What is *not* sparse

The ordinary named profiles are not mostly zero-weight vectors. Across the 12 standard profiles, goal/objective/finish/perimeter/must-pass/must-cross/intersection/anti-dither/revisit terms are all generally nonzero. The repair profile deliberately zeros only must-turn urgency and must-turn exit guidance.

Therefore “compile away zero weights” is not enough to justify a scorer compiler.

### What *is* static per level/profile/template

A specialized scorer can potentially freeze or remove:

- entire mechanic blocks for levels with no must-pass, must-cross, portal-parity, must-turn, surround, or adjacent-turn structures;
- template branches when no template is active, or when one specific template shape is fixed;
- resolved profile weights and template constants;
- default production ablation polarity when no research override is active;
- distance-array references and static mechanic counts;
- some loop bounds and optional-map existence checks.

Dynamic residual conditions still remain genuinely dynamic, for example whether a mask is still pending, whether a MustCross is on first or second pass, and phase/resource state. These must not be accidentally compiled away.

### Important negative precedents

Two nearby “obvious” optimizations are already negative:

- pre-resolving ordinary ablation gates while retaining the same scorer measured slower;
- hoisting `goalDistCur`, a cheap distance-array lookup, into `CurUrgencyContext` measured only about -0.4% noise and was reverted.

So the next pilot must be a **real structural specialization**, not another layer of booleans or cached fields around the same generic body.

## Smallest scorer value-of-information pilot

Before building a general code generator, choose two or three representative static scorer shapes:

1. a plain level with no landmark/portal mechanics and no structural template;
2. a MustCross-heavy level where MC guidance remains active;
3. optionally a perimeter-template level.

For each, hand or mechanically construct one specialized scorer that preserves the exact arithmetic/order of the surviving terms while deleting blocks known impossible from the static level/profile/template contract.

Benchmark against current `scoreMove` under:

- fixed deterministic work and non-binding wall deadlines;
- identical candidate order / node counts;
- many-short-solves and long-hard-level workloads;
- scorer construction/setup cost included;
- interleaved warm measurements.

The pilot is about **ceiling**, not production architecture.

Proceed toward a reusable scorer compiler only if the specialized form moves representative end-to-end wall time materially, not merely scorer microbench time.

Stop if:

- V8 already optimizes the stable branch pattern well enough that end-to-end gain is noise;
- setup cost erases the gain on short solves;
- preserving exact floating-point/order semantics becomes fragile;
- most savings come from changed search decisions rather than cheaper identical decisions.

## Move/state kernel

`applyMove` remains a plausible V8 optimization target only if a fresh profile still shows material self-time after the 2026-08-23 stack.

The current representation already contains an important optimization: the huge `visited`/`edgeUsage` buffers are reused per solve/call-site and only in-grid rows are cleared, eliminating the old repeated multi-megabyte allocation/zeroing cost. A future “dense state” refactor therefore must beat the **current pooled baseline**, not the historical allocation problem.

A fused move/state experiment should target a measured cost such as:

- object-shaped undo materialization;
- packed-key-to-metadata lookups;
- general mechanic dispatch;
- candidate-array materialization.

But note the existing negative result: reusing a mutable `UndoToken` object was slower than V8 nursery allocation. “Avoid objects” is not itself an optimization plan.

## Beam replay/materialization

The 2026-08-23 beam breakdown put replay at roughly 1,017 ms versus 5,397 ms candidate-generation time before that day's later changes. Tree-order walking had already reduced replay dramatically.

Therefore alternative snapshot/checkpoint materialization should remain behind a fresh profiling gate. It is no longer self-evidently the largest beam opportunity.

## Repo-integrity observations from the speed reports

The 2026-08-23 lazy-key report recorded several failures present on that day's unmodified HEAD:

- `test:race-stage-parity` lagged the newly promoted `goal-attraction-legacy-distance-retry` and `repair-late-probe-multi-seed-retry` stages;
- the workflow/documentation index had stale references/missing entries.

Current `scripts/solver-parallel/race-stage-parity-node-test.mjs` now includes both promoted stages in its intentional sequential-only list, so that specific parity staleness has already been repaired on current `main` and should not be treated as an open task.

Current `.github/workflows/README.md` also includes the newer targeted/archetype A/B workflows and the specialist census diagnostics visible in the current workflow tree. Do not copy the August 23 report's “pre-existing failure” note into the live queue without re-running the current check; it is historical evidence, not necessarily current repo state.

## Updated #8 execution order

1. Re-profile current HEAD after the August 23 stack before selecting another hot-path target.
2. If scoring/candidate generation remains dominant, run the bounded **true specialized-JS scorer** pilot above.
3. Continue dense/fused V8 representation work only against a named measured cost.
4. Re-measure replay share before any beam snapshot/checkpoint experiment.
5. Keep native/WASM closed for the current broad candidate-kernel boundary; reopen only if a compact boundary emerges naturally.
6. Reprice any speed-created wall-clock headroom through the scheduler rather than automatically increasing production work.

## Status

**KEEP #8 ACTIVE, but narrow it.**

The strongest current opportunity is not an execution-language rewrite. It is one more disciplined profile pass followed, if justified, by a small structural scorer-specialization experiment. The current native boundary fails the architecture program's own bounded-feasibility gate before implementation.

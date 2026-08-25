# Speed / execution-substrate static audit

> **Status:** active
> **Last evidence:** 2026-08-24 — current scoring/search-state architecture plus 2026-07-30 and 2026-08-23 profile/speed reports
> **Decision:** keep #8 as a profile-led V8 hot-kernel program. Close native/WASM for the current broad per-candidate boundary because the boundary is not compact; retain one bounded generated/specialized-JS scorer pilot if fresh profiling still shows scoring/candidate generation dominant.
> **Remaining gate:** re-profile current HEAD after the August 23 speed stack; if scoring remains material, compare a genuinely structurally specialized JS scorer against current `scoreMove` at identical deterministic work including setup cost.
> **Evidence role:** discovery
> **Selection:** observational — candidate substrate/scorer directions were narrowed after reading current source and recent performance evidence.

## Current empirical baseline

Recent pure-speed work shows the V8 path is still productive and that source-level intuition alone is unreliable.

The 2026-07-30 profile put major self-time in connectivity, beam, scoring, urgency-context construction, `applyMove`, and GC. That campaign produced large wins but also important negatives: `UndoToken` pooling was slower; quickselect targeted a non-dominant sort; sparse packed indexing was not intrinsically expensive on the tiny live grid; beam tree-order walking bought speed but changed which mid-phase work could be reached under budget.

The 2026-08-23 beam campaign again found `beamSearchFromGate` dominant. Order-preserving changes then produced material end-to-end gains:

- lazy dedup/diversity string construction;
- loop-invariant portal lookup hoisting;
- collision-free mixed-radix numeric beam keys;
- dense `staticNeighborKeys` indexing.

The combined 2026-08-23 stack measured roughly **-9.3% published** and **-16.2% Corpus-2 sample** against that session's original baseline with identical deterministic search work.

Conclusion: do not declare V8 exhausted.

## Native/WASM entry-gate audit

`docs/solver-architectural-speed-opportunities.md` requires a compact hotspot whose state can cross the boundary cheaply. The obvious current candidate, candidate generation plus apply/undo/scoring/pruning, fails that gate.

`applyMove` mutates or depends on:

- path stack;
- `visited` and `edgeUsage` arrays;
- intersection/resource state;
- must-pass/must-cross masks and `crossCounts`;
- portal/flipper state;
- surround/must-turn/adjacent-turn state;
- work counters and undo state.

`scoreMove` additionally reads a broad `PrepLevel` containing goal/objective/landmark/portal/MustCross distance maps, template/config/profile state, and current residual history.

A JS→WASM call per candidate would cross too much mutable state. Moving enough state native to avoid that traffic begins to migrate a substantial search core, violating the bounded-prototype premise before measurement.

**Disposition:** close native/WASM for the current broad candidate-kernel boundary. Reopen only if a later refactor naturally creates a compact self-contained shared-memory kernel or a fresh profile identifies a different isolated hotspot with a cheap boundary.

This is not a claim that native code could never help a redesigned solver.

## Specialized scorer audit

A generated/specialized JavaScript scorer has a much cleaner boundary because it can keep the existing JS state/prep objects while removing branches fixed by `(level, profile, template)`.

The justification is **not sparse weights**. Ordinary named profiles generally keep all major weights nonzero; repair deliberately zeros only must-turn urgency/exit terms.

The plausible static specialization comes from:

- absent mechanics on a particular level;
- fixed template shape or no template;
- resolved profile constants;
- production/default ablation polarity;
- fixed distance-array references and mechanic counts;
- removal of optional-map existence/config dispatch known constant for the attempt.

Genuinely dynamic residual conditions must remain dynamic, including pending masks, first/second MustCross phase, exact-resource state, and phase progression.

Two nearby negative precedents are load-bearing:

- pre-resolving ordinary ablation gates while retaining essentially the same scorer measured slower;
- hoisting the cheap `goalDistCur` lookup into the urgency context measured only noise and was reverted.

So the next scorer experiment must be **real structural specialization**, not another wrapper of cached booleans/fields.

## Smallest scorer pilot

Only if fresh profiling still shows scoring/candidate generation materially hot, compare current `scoreMove` with two or three static specialized shapes, for example:

1. plain level with no portal/landmark extras and no structural template;
2. MustCross-heavy level with active approach guidance;
3. optional perimeter-template level.

Require:

- fixed deterministic work and non-binding deadlines;
- identical candidate/search decisions where pure-speed equivalence is claimed;
- setup/construction cost included;
- many-short-solves and long-hard-level workloads;
- interleaved warm measurements.

Proceed to a reusable scorer compiler only if representative **end-to-end** time moves materially.

Stop if V8 already folds the stable branches well enough, setup erases short-solve gains, exact arithmetic/order becomes fragile, or gains arise mainly from changed search decisions.

## Move/state and beam-materialization constraints

`applyMove` remains a possible V8 target only if a fresh profile shows material self-time. Any future dense/fused treatment must beat the **current** pooled state baseline, not the historical multi-megabyte allocation problem already fixed.

Likewise, alternative beam snapshots/checkpoints should stay behind a fresh replay-share profile. Tree-order walking already cut replay heavily, and 2026-08-23 candidate generation remained the larger segment.

Do not revive `UndoToken` pooling merely because object allocation looks ugly. It was measured slower than V8's nursery allocation.

## Repo-integrity note

The 2026-08-23 speed report recorded some pre-existing documentation/parity failures on that day's HEAD. Current `scripts/solver-parallel/race-stage-parity-node-test.mjs` now includes the newly promoted late stages in its intentional sequential-only list, and the current workflow index includes the newer targeted/archetype and census diagnostic workflows. Treat the old report's failure notes as historical, not automatically current tasks.

## Updated #8 execution order

1. Re-profile current HEAD after the August 23 stack.
2. If scoring/candidate generation remains dominant, run one bounded true specialized-JS scorer pilot.
3. Continue dense/fused V8 work only against a named measured cost.
4. Re-measure replay before any snapshot/checkpoint experiment.
5. Keep native/WASM closed for the present broad candidate-kernel boundary.
6. Route any wall-clock headroom through scheduler repricing rather than automatically enlarging production search work.

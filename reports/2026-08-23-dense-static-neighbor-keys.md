# `staticNeighborKeys` converted from a flat KEY_SPACE-sized array to dense per-level indexing (2026-08-23)

> **Status:** concluded-positive
> **Last evidence:** 2026-08-23 — this report's own interleaved node-budgeted A/B and `solver:bench --check`
> **Decision:** landed directly (order-preserving, no flag needed)
> **Remaining gate:** none

Branch `claude/solver-speed-optimizations-mtbemk`. First concrete step on item 1 of
[`../docs/solver-architectural-speed-opportunities.md`](../docs/solver-architectural-speed-opportunities.md)
("Dense-native search core"), following the beam dedup-key work earlier the same day
([`2026-08-23-beam-dedup-key-lazy-build-experiment.md`](2026-08-23-beam-dedup-key-lazy-build-experiment.md),
[`2026-08-23-beam-dedup-numeric-key-arena.md`](2026-08-23-beam-dedup-numeric-key-arena.md)).

## Motivation

`prepLevel`'s own self-time was a small but non-trivial CPU-profile entry (~3.3% of published-
corpus self-time). Unlike the per-node hot-path functions this session's other changes targeted,
`prepLevel` runs once per `solveLevel()` call — its cost is fixed allocation overhead, not
per-candidate work, so the natural hypothesis was the architecture doc's own one:
`staticNeighborKeys` is a flat `Int32Array(KEY_SPACE * 4)` — 4,194,304 slots, 16.8 MB — indexed
directly by packed cell key, for a grid that has at most a few hundred live cells. `gateFlags` and
`reachBlockedArr` (`Uint8Array(KEY_SPACE)` each, 1 MB) share the same shape but are 16x smaller and
not targeted here.

## Measuring the actual cost before touching production code

A standalone microbenchmark (2000 repeated allocations each) isolated the SIZE cost alone (writing
only a single element, never filling the array — matching what `prepLevel` already does, since only
real cells were ever written even in the old form):

| allocation | time |
|---|---|
| `Int32Array(KEY_SPACE * 4)` — current `staticNeighborKeys` | 1.98 ms/alloc |
| `Uint8Array(KEY_SPACE)` — `cellDenseIndex` (this change's new array) | 0.064 ms/alloc |
| `Int32Array(900)` — dense `staticNeighborKeys` (~225-cell grid) | 0.001 ms/alloc |

The new form pays `cellDenseIndex` (0.064 ms) + the tiny dense array (~0.001 ms) ≈ 0.065 ms total,
against the old form's 1.98 ms — roughly 30x less allocation cost for this one array.

Confirms the size itself, not any fill loop, is the cost: V8's typed-array allocator scales with
array size for allocations this large (well past the young-generation nursery), so shrinking the
array is a direct win independent of what's written into it.

## The change

`prep.cellDenseIndex`: a new `Uint8Array(KEY_SPACE)` (1 MB — same size class as the existing
`mustPassIndex`/`mustCrossIndex`/`flipperIndexMap` arrays `buildIndexArr` already builds) mapping
every live (non-block/non-goose) packed cell key to a dense per-level row index, 1-biased so 0
means "not a live cell" — the same zero-means-absent convention already used throughout this file.
`prep.staticNeighborKeys` shrinks from `KEY_SPACE * 4` to `liveCellCount * 4` (at most ~900 slots),
addressed as `(cellDenseIndex[pos] - 1) * 4 + d` instead of `pos * 4 + d`. Every direct consumer
updated to the new indexing: `search-state.ts`'s `getNeighbors` (the hot-path reader), `prep.ts`'s
own `gateForcedFirstStepKey` derivation, and `lower-bounds.ts`'s two must-cross deadlock checks
(`mustCrossForcedNeighborDeadlocked`, `mustCrossNeighborBudgetDeadlocked`). All four sites read a
key that is always a live cell by construction (the current search position, a gate, or a
must-cross cell), so `cellDenseIndex[key]` is always nonzero there — no new fallback/guard needed.
Three unit tests (`prep.test.ts`, `representation-contracts.test.ts`) that directly indexed
`staticNeighborKeys[packedKey * 4 + d]` were updated to resolve the dense row via
`cellDenseIndex` first, matching production's own new convention.

`gateFlags` and `reachBlockedArr` are untouched — 16x smaller than the old `staticNeighborKeys`, so
the same conversion there would need to independently earn its complexity; not attempted this pass.

## Verification

- Types clean (`tsconfig.json` and `tsconfig.test.json`).
- `solver:bench --check`: 160/160, byte-identical 45,859,097 nodes.
- Full solver-directory test suite, deep mode (no `SOLVER_DEEP_TESTS=0` override): 35 files, 445
  tests, all pass.
- Full `SOLVER_DEEP_TESTS=0` suite: 92 files, 1230 passed / 9 skipped.
- `test:hint-path-oracle`: all 160 published levels' stored hints re-validated against the PLAY
  referee — exercises the domain/move-rules path independently of the solver's own search, an
  additional correctness signal beyond solver-internal tests.
- `test:node:fast`'s hint/family/portfolio sub-suite: all pass except the already-known,
  independently-confirmed-pre-existing `test:race-stage-parity` failure (unrelated stage-ID drift,
  present on unmodified `HEAD`; see the numeric-key report's own note on this).

Node-budgeted interleaved A/B against the branch's prior state (numeric dedup keys already landed):

**Published corpus** (3 rounds): `nodesExpanded` bit-identical every round (6,344,576).

| round | prior | dense |
|---|---|---|
| 1 | 10.56s | 10.29s |
| 2 | 10.65s | 10.43s |
| 3 | 10.69s | 10.36s |

Median 10.65s → 10.36s, **−2.7%**, faster in all 3 rounds.

**Corpus-2 sample** (3 rounds): `nodesExpanded` bit-identical every round (14,870,405).

| round | prior | dense |
|---|---|---|
| 1 | 60.17s | 59.32s |
| 2 | 60.11s | 61.67s |
| 3 | 60.78s | 59.55s |

Median 60.17s → 59.55s, **≈−1.0%**, mixed (2/3 rounds faster, 1 slower) — essentially noise-level on
this population. Consistent with the mechanism: `prepLevel` runs once per `solveLevel()` call, so
its fixed allocation cost is a much smaller fraction of a Corpus-2 level's ~60s search than of a
published level's much shorter one. This change's value is concentrated in workloads with many
quick solves (a batch/portfolio sweep, or any published-corpus-shaped population), not in
individual hard-level wall time — plus the stated architectural goal of shrinking the working set
`staticNeighborKeys` shares with later dense-indexing ideas (item 1's own "move state arrays...
together" framing), which this measurement doesn't capture directly.

## Disposition

Strictly order-preserving (unchanged move-generation semantics, only the storage indexing scheme).
Landed directly, no flag. `gateFlags`/`reachBlockedArr` remain open for a future pass if profiling
ever nominates them specifically; the doc's own suggested order groups this with a future beam
arena, not as a standalone campaign.

## Cumulative effect of all five changes landed this session

Direct interleaved node-budgeted A/B, original session baseline (`6a2dc24`) vs this commit,
superseding the earlier reports' compounded-estimate figures with one directly-measured number
covering all of: lazy beam dedup/diversity string keys, the portal-lookup hoist, the numeric
dedup/diversity key encoding, and this dense `staticNeighborKeys` change (the `goalDistCur` idea
was tried and reverted, contributing nothing to this number).

**Published corpus**, 3 rounds: `nodesExpanded` bit-identical every round (6,344,576) — order fully
preserved across the whole stack of changes, not just each individual step.

| round | original baseline | current HEAD |
|---|---|---|
| 1 | 11.59s | 10.56s |
| 2 | 11.87s | 10.40s |
| 3 | 11.57s | 10.51s |

Median 11.59s → 10.51s, **−9.3%**.

**Corpus-2 sample**, 3 rounds: `nodesExpanded` bit-identical every round (14,870,405).

| round | original baseline | current HEAD |
|---|---|---|
| 1 | 71.40s | 60.20s |
| 2 | 71.13s | 59.24s |
| 3 | 71.16s | 59.60s |

Median 71.16s → 59.60s, **−16.2%**.

Both populations faster in every single round (6/6) against the original baseline, with zero
search-decision divergence anywhere in the stack.

# Beam dedup/diversity keys switched from delimited strings to a provably collision-free numeric encoding (2026-08-23)

> **Status:** concluded-positive
> **Last evidence:** 2026-08-23 — this report's own interleaved node-budgeted A/B, `solver:bench --check`, and a new differential unit test proving numeric/string key equivalence
> **Decision:** landed directly (order-preserving, no flag needed)
> **Remaining gate:** none

Branch `claude/solver-speed-optimizations-mtbemk`. Continues item 2 of
[`../docs/solver-architectural-speed-opportunities.md`](../docs/solver-architectural-speed-opportunities.md)
("Beam candidate arena and cheaper coarse dedup"), following
[`2026-08-23-beam-dedup-key-lazy-build-experiment.md`](2026-08-23-beam-dedup-key-lazy-build-experiment.md)'s
lazy string-key construction from earlier the same day.

## Motivation

That earlier report deferred *building* the delimited-string dedup/diversity keys until actually
needed, but every phase that DOES reach the dedup branch still pays for `Map<string, BeamNode>`
construction/lookup with string keys — and profiling showed `beamSearchFromGate` remains the
solver's single largest self-time entry. The architecture doc's own suggested next step is a
custom hash table over the scalar tuple; before committing to that (real complexity: the
production dedup logic has a second `dm2` near-tie-retention map with `.delete()`/re-insert
semantics whose exact insertion-order iteration would need to be hand-replicated to preserve
tie-break behavior byte-for-byte) a standalone microbenchmark de-risked the idea first.

## Microbenchmark: where does the cost actually come from?

A synthetic benchmark (5000 candidates/phase, 600 unique constraint-state combos, 2000 phases —
roughly beam5000 scale) compared four dedup implementations:

| implementation | time (2 runs) |
|---|---|
| native `Map<string, BeamNode>` (current shipped form) | 4167ms / 4087ms |
| hand-rolled open-addressing hash table over the scalar tuple | 587ms / 582ms |
| native `Map<number, BeamNode>` (packed numeric key) | 509ms / 507ms |
| native `Map<BigInt, BeamNode>` (packed BigInt key) | 1961ms / 1988ms |

The finding that mattered: **the cost is dominated by string construction, not Map's hashing
algorithm.** A native `Map` keyed by a plain JS number is *as fast as* (marginally faster than, in
this synthetic test) a hand-rolled hash table, while keeping `Map`'s exact insertion-order
iteration semantics for free — sidestepping the `dm2` delete/re-insert replication risk entirely.
BigInt keys are faster than strings but far slower than plain numbers (boxing/hashing overhead),
so a numeric key is only useful if it can be built without BigInt.

## Building a numeric key without repeating the original bug

The old bit-packed beam signature (`reports/2026-08-06-beam-state-dedup-sound-signature-audit.md`)
was unsound because it assumed a *fixed* 4-bit width per field regardless of the level's actual
mechanic count. The fix here is not a fixed-width pack: it's a **mixed-radix positional encoding**
where every field's multiplier is that level's own true value range, derived from prep fields that
already exist for other reasons:

```
dk = adjTurnMask
dk = dk * turnBase      + mustTurnMask       // turnBase      = initialMustTurnMask + 1  (= 2^turnCellCount)
dk = dk * surroundBase  + surroundMask       // surroundBase  = initialSurroundMask + 1  (= 2^surroundCellCount)
dk = dk * flipperBase   + flipperUsedMask    // flipperBase   = 1 << flipperKeys.length
dk = dk * mcBase        + mustCrossMask      // mcBase        = 1 << mustCrossKeys.length
dk = dk * mpBase        + mpVisitedMask      // mpBase        = 1 << mustPassKeys.length
dk = dk * intsBase      + ints               // intsBase      = reqInt + 1
dk = dk * KEY_SPACE     + key
```

Every field is strictly smaller than its own base by construction (masks are `< 2^bitCount` by
definition; `ints` is bounded by `evaluatePrunedMove`'s own fundamental-limit reject
`state.ints > level.reqInt`, so always `<= reqInt`; packed cell keys are always `< KEY_SPACE` for a
`<=15×15` grid) — so this is a **provable bijection** between the (key, 7-field) tuple and the
resulting number, not a heuristic. The only remaining risk is the *product* of all bases exceeding
`Number.MAX_SAFE_INTEGER` (2^53), computed once per `beamSearchFromGate` call and gated behind
`Number.isSafeInteger()`: whenever it wouldn't fit — several landmark mechanic types simultaneously
present, each near this specific level's own maximum, plus a long `reqInt` — the code falls back to
the exact same delimited-string key it always used. Correctness never depends on the product
fitting; only speed does. `_diverseSelect`'s 2-field key (`mustCrossMask * flipperBase +
flipperUsedMask`) needs no such fallback — its product is always comfortably small even at
stress-corpus-2's raised 8-cell caps.

Implementation duplicates the dedup loop body into two structurally identical branches (numeric-key
`Map<number, BeamNode>` vs string-key `Map<string, BeamNode>`) rather than a shared generic
function, matching this file's own established precedent (`dm`/`dm2` are already kept as two
separate monomorphic maps rather than one union-typed map, after a documented ~30% per-op slowdown
from losing monomorphism — `reports/2026-08-15-connectivity-axis-exhausted-regression.md`). Two
distinct code paths avoid the same risk for the key type, not just the value type.

## Verification

**Differential unit test** (new, `search.test.ts`): a `PrepLevel._forceBeamDedupStringKeyForTests`
test-only override forces the string-key fallback regardless of computed safety. Two new tests run
an identical search (open 9×9 grid, 3 must-pass cells, 2 flipper cells, `reqLen` far above Manhattan
distance to force many phases and heavy dedup activity, beamWidth narrow enough to trigger the
dedup branch every phase) once through each key representation — with `diverseBeam` off and on —
and assert **byte-identical solved path and node count**, not just "both solve." This is a direct
proof the numeric encoding reproduces the string encoding's actual merge/near-tie decisions on real
candidate batches, not just that individual keys are theoretically collision-free.

**Order preservation on real corpora**, same node-budgeted interleaved-median protocol as the
lazy-string-key report:

- `solver:bench --check`: 160/160, byte-identical 45,859,097 nodes.
- Full solver test suite (`SOLVER_DEEP_TESTS=0 vitest run`): 92 files, 1230 passed / 9 skipped
  (includes the 2 new differential tests).
- Published corpus, 3 interleaved rounds vs the branch's prior state (lazy string keys + portal
  hoist): `nodesExpanded` bit-identical every round (6,344,576).

| round | prior state | numeric key |
|---|---|---|
| 1 | 11.31s | 10.67s |
| 2 | 11.28s | 10.62s |
| 3 | 10.95s | 10.59s |

Median 11.28s → 10.62s, **−5.9%**.

- Corpus-2 sample, 5 interleaved rounds: `nodesExpanded` bit-identical every round (14,870,405).

| round | prior state | numeric key |
|---|---|---|
| 1 | 64.38s | 60.13s |
| 2 | 64.02s | 59.99s |
| 3 | 62.84s | 60.46s |
| 4 | 63.06s | 59.54s |
| 5 | 62.10s | 59.61s |

Median 63.06s → 59.99s, **−4.9%**.

Faster in every single round on both corpora (8/8), smaller than the microbenchmark's raw ~8x
dedup-only speedup because dedup is only one segment of the full beam pipeline (candidate
generation/scoring remains the dominant self-time bucket — see the lazy-string-key report's
`PF_BEAM_DEBUG` breakdown) — consistent with, not contradicting, the isolated measurement.

## Disposition

Strictly order-preserving. Landed directly (no flag): both the mathematical safety argument (exact
bijection, runtime-checked overflow fallback) and the differential test give stronger correctness
assurance than a typical order-preserving change, on top of the usual node-budgeted A/B evidence.

## Combined effect of this branch's three landed changes so far

Published corpus, 160 levels, node-budgeted: baseline → lazy string keys (−7.8%) → portal-lookup
hoist (−1.1%) → numeric key (−5.9%), each measured against the immediately preceding state.
Compounding these (not independently re-measured against the original baseline in one pass, but
multiplicatively consistent with each stage's own interleaved measurement): roughly **−14% to −15%**
published wall time so far this session, plus a similarly-shaped Corpus-2 improvement. A fourth idea
(hoisting `scoreMove`'s `goalDistCur`) was tried and reverted — see the lazy-string-key report's
addendum — for measuring no real benefit.

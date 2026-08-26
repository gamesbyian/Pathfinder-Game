# Dense-index architecture follow-up

Status: active
Last evidence: GitHub Actions run 32918990093
Decision: Keep the narrow `cellDenseIndex` removal candidate; close the naive six-array `prepLevel()` conversion.
Remaining gate: Final-tree CI and merge for the narrow candidate.

Evidence role: architecture/performance development evidence
Selection: current solver architecture; no solve-set selection

## Context

This pass resumed the interrupted `claude/solver-speed-optimizations-mtbemk` architecture-speed work from current `main`. The interrupted agent had proposed extending the already-proven `denseIndex(key, gridW)` pattern from distance arrays to the remaining `KEY_SPACE`-sized `prepLevel()` arrays.

The current solver still had six fresh `KEY_SPACE`-sized per-level arrays in that group:

- `mustPassIndex`
- `mustCrossIndex`
- `flipperIndexMap`
- `mustTurnCellIndex`
- `gateFlags`
- `reachBlockedArr`

A separate 1 MiB `cellDenseIndex` table mapped packed keys to rows for the already-compact `staticNeighborKeys` adjacency array.

## Experiment 1: convert all six remaining prep arrays

The first candidate converted the six arrays above to row-major dense indexing and rewrote all production/test readers to use `denseIndex(key, gridW)`.

Correctness was clean:

- TypeScript passed.
- `solver:bench -- --check` passed.
- Repeated speed probes produced identical solve outcomes and node counts.

Repeated interleaved timing showed a split result:

- short/published sample: about **5.83% faster**
- hard Corpus-2 sample: about **2.82% slower**

The hard-tail regression is decisive because difficult and unsolved Corpus-2 work dominates batch cost. This implementation is therefore **closed negative** and must not be merged merely for memory compactness.

### Interpretation

The result does not falsify dense level-local storage. It shows that naively replacing packed-key array reads with repeated `denseIndex()` arithmetic can move cost from allocation/setup into hot per-node loops. In particular, readers such as move application and reachability can reuse the same key several times; recomputing a dense row independently for each array read is a plausible source of the hard-tail loss.

A future variant may test hoisting one dense-row calculation per hot key and sharing it across multiple mechanic reads. That is a distinct candidate, not permission to resurrect the rejected naive conversion.

## Experiment 2: remove `cellDenseIndex` only

The narrower candidate removes the 1 MiB packed-key-to-row indirection used only by `staticNeighborKeys`.

Instead:

- `staticNeighborKeys` is allocated directly as `gridW * gridH * 4`.
- `denseIndex(key, gridW)` supplies the row.
- block/goose rows remain zero.
- the `PrepLevel.cellDenseIndex` field disappears entirely.

This is structurally cleaner than the six-array conversion because it removes both a large allocation and an additional lookup layer rather than adding dense-index arithmetic to several mechanic-array reads.

### Run 32918990093

All scientific gates passed before a later temporary-workflow cleanup bug:

- production TypeScript: pass
- test TypeScript: pass
- `solver:bench -- --check`: pass
- all three baseline/treatment timing rounds: pass
- identical IDs, solve outcomes, and node counts in every round
- performance gate: pass

Median timings:

| sample | baseline median | treatment median | delta |
|---|---:|---:|---:|
| published 40 | 602.8 ms | 592.8 ms | **-1.66%** |
| Corpus-2 hard 24 | 23,055.0 ms | 23,066.7 ms | **+0.05%** |

The hard sample is effectively flat and remains well inside the predeclared +0.5% regression guardrail; short solves improve modestly.

The red conclusion of run 32918990093 was **not** a scientific failure. After the comparison passed, `Prepare final tree` accidentally attempted to run the codemod a second time against an already-transformed tree and failed on missing original source text. The workflow was subsequently corrected so final-tree preparation only removes temporary experiment files.

## Architectural disposition

1. **Promote the narrow `cellDenseIndex` removal** if final-tree CI remains clean.
2. **Do not merge the naive six-array conversion.** It is documented negative evidence.
3. Keep `visited`, `edgeUsage`, and reusable reachability scratch separate. Their allocation lifetime and hot-path economics differ from fresh `prepLevel()` arrays and were intentionally not bundled into these tests.
4. If dense mechanic arrays are revisited, test a hoisted-index implementation where each hot key is converted once and reused across all relevant array reads.

The broader lesson is that reducing sparse `KEY_SPACE` storage is not automatically a speed win. The profitable cases are those that remove allocation or indirection without inserting repeated address arithmetic into the hottest search loops.
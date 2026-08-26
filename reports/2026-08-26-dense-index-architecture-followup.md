# Dense-index architecture follow-up

> **Status:** concluded-positive
> **Last evidence:** 2026-08-26 — GitHub Actions run `32919924101`
> **Decision:** promote the narrow `cellDenseIndex` removal as an architecture simplification with no measured hard-tail penalty; close the naive six-array `prepLevel()` conversion.
> **Remaining gate:** merge the validated narrow candidate.

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

### First complete A/B: run `32918990093`

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

The red conclusion of run `32918990093` was **not** a scientific failure. After the comparison passed, `Prepare final tree` accidentally attempted to run the codemod a second time against an already-transformed tree and failed on missing original source text.

### Replication on documented head: run `32919593955`

After fixing final-tree preparation and adding the report, the full three-round A/B was repeated. Again:

- all baseline/treatment rows had identical IDs, solve outcomes, and node counts;
- the performance gate passed;
- final-tree preparation passed;
- `solver:bench -- --check` passed earlier in the treatment correctness gate.

Median timings on this rerun were:

| sample | baseline median | treatment median | delta |
|---|---:|---:|---:|
| published 40 | 597.2 ms | 606.1 ms | **+1.49%** |
| Corpus-2 hard 24 | 23,123.2 ms | 23,127.3 ms | **+0.02%** |

This replication changes the speed claim. The earlier short-solve improvement did **not** reproduce; both short and hard timing differences are consistent with runner noise. The robust conclusion is therefore not “this makes the solver ~1.7% faster.” It is:

- the 1 MiB per-level `cellDenseIndex` allocation and lookup layer can be removed;
- search behavior is unchanged;
- the hard-search throughput that dominates batch cost is measurably unaffected at this probe scale;
- no reliable wall-time speedup has been established.

Run `32919593955` reached `ci:fast`; every reported check passed except documentation navigation, which rejected this report's original unformatted metadata block.

### Final validated tree: run `32919924101`

After correcting the metadata convention, the same final-head workflow completed successfully end to end:

- three baseline/treatment rounds: pass;
- identical IDs, outcomes, and node counts: pass;
- performance guardrail: pass;
- final-tree preparation with temporary harness removal: pass;
- `ci:fast`: pass;
- commit/push of the durable solver tree: pass.

This is the promotion-bearing validation. The temporary workflow and codemod do not remain in the resulting branch.

## Architectural disposition

1. **Promote the narrow `cellDenseIndex` removal.** Its value is simpler representation and a smaller per-level working set without a demonstrated hard-tail cost, not a claimed throughput speedup.
2. **Do not merge the naive six-array conversion.** It is documented negative performance evidence.
3. Keep `visited`, `edgeUsage`, and reusable reachability scratch separate. Their allocation lifetime and hot-path economics differ from fresh `prepLevel()` arrays and were intentionally not bundled into these tests.
4. If dense mechanic arrays are revisited, test a hoisted-index implementation where each hot key is converted once and reused across all relevant array reads.

The broader lesson is that reducing sparse `KEY_SPACE` storage is not automatically a speed win. Profitable representation changes must remove allocation or indirection without inserting enough address arithmetic into hot loops to outweigh that benefit.
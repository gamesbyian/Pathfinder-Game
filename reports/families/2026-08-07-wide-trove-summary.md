# Wide trove: generation + solve + hint-extraction coverage

15553/7842 (level, mode) tasks completed (1962 levels in manifest across published/corpus1/corpus2).

A "0-variant" task is a level with no eligible objects for that mode (e.g. local-mutant
on a level with zero movable objects) -- expected, not a failure.

## By corpus

| Corpus | Tasks | Levels | Variants solved | Solve rate | 0-variant tasks |
|---|---|---|---|---|---|
| published | 1559 | 160 | 11041/11065 | 99.8% | 292 |
| corpus1 | 996 | 101 | 7352/8744 | 84.1% | 56 |
| corpus2 | 12998 | 1700 | 54254/124927 | 43.4% | 50 |

## By mode

| Mode | Tasks | Levels | Variants solved | Solve rate | 0-variant tasks |
|---|---|---|---|---|---|
| symmetry | 1956 | 986 | 10902/13534 | 80.6% | 0 |
| local-mutant | 1956 | 986 | 14915/19062 | 78.2% | 42 |
| swap | 3891 | 1961 | 13774/35756 | 38.5% | 264 |
| constrained-shuffle | 3891 | 1961 | 16604/38404 | 43.2% | 42 |
| group-reshuffle | 3859 | 1945 | 16452/37980 | 43.3% | 50 |

## Coverage gaps

0 manifest level(s) have zero completed tasks (shard didn't reach them / stopped early on the wall-clock budget). First 50:

(none)

## Failure provenance

78399 full per-variant attempt records (attempts, failedStrategies, nodesExpanded,
winningConfig -- not just solved/total) consolidated into 7 file(s):
`reports/families/2026-08-07-wide-trove-attempts-<corpus>-part<NN>.json`, chunked at ~40MB/file
(GitHub hard-rejects any single pushed file over 100MB) -- concatenate a corpus's parts' `levels`
arrays to reconstruct the full per-corpus set. Each part is independently in the same
`{levels:[...]}` shape `scripts/stress/rank-levels.mjs` / `cluster-unsolved-failures.mjs` already read.

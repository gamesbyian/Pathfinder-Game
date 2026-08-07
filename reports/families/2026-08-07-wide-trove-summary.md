# Wide trove: generation + solve + hint-extraction coverage

7839/7842 (level, mode) tasks completed (1962 levels in manifest across published/corpus1/corpus2).

A "0-variant" task is a level with no eligible objects for that mode (e.g. local-mutant
on a level with zero movable objects) -- expected, not a failure.

## By corpus

| Corpus | Tasks | Levels | Variants solved | Solve rate | 0-variant tasks |
|---|---|---|---|---|---|
| published | 787 | 160 | 5587/5599 | 99.8% | 146 |
| corpus1 | 503 | 101 | 3722/4419 | 84.2% | 28 |
| corpus2 | 6549 | 1700 | 27313/62947 | 43.4% | 25 |

## By mode

| Mode | Tasks | Levels | Variants solved | Solve rate | 0-variant tasks |
|---|---|---|---|---|---|
| symmetry | 986 | 986 | 5493/6820 | 80.5% | 0 |
| local-mutant | 986 | 986 | 7519/9611 | 78.2% | 21 |
| swap | 1961 | 1961 | 6953/18032 | 38.6% | 132 |
| constrained-shuffle | 1961 | 1961 | 8362/19357 | 43.2% | 21 |
| group-reshuffle | 1945 | 1945 | 8295/19145 | 43.3% | 25 |

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

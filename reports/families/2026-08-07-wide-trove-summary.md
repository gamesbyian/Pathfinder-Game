# Wide trove: generation + solve + hint-extraction coverage

7711/7842 (level, mode) tasks completed (1962 levels in manifest across published/corpus1/corpus2).

A "0-variant" task is a level with no eligible objects for that mode (e.g. local-mutant
on a level with zero movable objects) -- expected, not a failure.

## By corpus

| Corpus | Tasks | Levels | Variants solved | Solve rate | 0-variant tasks |
|---|---|---|---|---|---|
| published | 772 | 157 | 5454/5466 | 99.8% | 146 |
| corpus1 | 493 | 99 | 3630/4325 | 83.9% | 28 |
| corpus2 | 6446 | 1672 | 26941/61950 | 43.5% | 25 |

## By mode

| Mode | Tasks | Levels | Variants solved | Solve rate | 0-variant tasks |
|---|---|---|---|---|---|
| symmetry | 970 | 970 | 5409/6714 | 80.6% | 0 |
| local-mutant | 970 | 970 | 7396/9451 | 78.3% | 21 |
| swap | 1929 | 1928 | 6821/17714 | 38.5% | 132 |
| constrained-shuffle | 1929 | 1928 | 8242/19037 | 43.3% | 21 |
| group-reshuffle | 1913 | 1912 | 8157/18825 | 43.3% | 25 |

## Coverage gaps

33 manifest level(s) have zero completed tasks (shard didn't reach them / stopped early on the wall-clock budget). First 50:

P00008, P00068, P00128, R00087, R01685, R00347, R00690, R01022, R01382, R01724, R02015, R02075, R02135, R02195, R02255, R02315, R02375, R02435, R02495, R02555, R02615, R02675, R02735, R02795, R02855, R02915, R02975, R03035, R03095, R03155, R03215, R03275, R03335

## Failure provenance

77145 full per-variant attempt records (attempts, failedStrategies, nodesExpanded,
winningConfig -- not just solved/total) consolidated into 7 file(s):
`reports/families/2026-08-07-wide-trove-attempts-<corpus>-part<NN>.json`, chunked at ~40MB/file
(GitHub hard-rejects any single pushed file over 100MB) -- concatenate a corpus's parts' `levels`
arrays to reconstruct the full per-corpus set. Each part is independently in the same
`{levels:[...]}` shape `scripts/stress/rank-levels.mjs` / `cluster-unsolved-failures.mjs` already read.

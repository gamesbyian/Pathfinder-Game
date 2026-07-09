# Determinism Report

Date: 2026-07-09  
Repo: Pathfinder-Game  
Corpus: `data/levels.json`  
Per-level solver budget: 30,000 ms  
Primary tooling added in this investigation: `scripts/solver-fingerprint.mjs` and `scripts/compare-solver-fingerprints.mjs`

## Executive summary

The published corpus still solves completely in every corpus-order run I performed: default order, reverse order, and three randomized orders all solved 156/156 levels. However, richer fingerprinting shows the solver is not deterministic at the internal-result level.

The clearest non-deterministic symptoms are concentrated in levels 131 and 145:

- Level 131 can return different valid solution hashes and dramatically different node counts while keeping the same winning strategy.
- Level 145 can return different solution hashes, different winning strategies, different attempt counts, different winner indexes, and different node counts.
- Level 145 reproduces non-determinism even when run alone in separate fresh Node processes.
- Level 131 was stable when run alone twice, but changed in full-corpus and targeted paired probes.

The current evidence points to two classes of behavior:

1. Level 145 appears intrinsically non-deterministic or affected by module/runtime state that is present even in fresh single-level process runs.
2. Level 131 appears sensitive to solve context/order in broader runs, but was stable in the specific isolated repeat test.

No solve/fail regression was observed. The findings are about solution identity, attempt route, and search effort.

## Tooling used

### `scripts/solver-fingerprint.mjs`

This script runs the solver over the published corpus and writes JSON fingerprints. It should be invoked through the existing esbuild wrapper so it uses the same fast bundled path as the other solver tools:

```bash
node scripts/run-bundled.mjs scripts/solver-fingerprint.mjs [options]
```

Important options:

- `--order=default|reverse|random` controls traversal order.
- `--seed=<n>` controls deterministic shuffling for `--order=random`.
- `--levels=all|1,2,3|1-10` selects levels. Unlike `solver-bench`, explicit comma order is preserved, so `--levels=145,131` is different from `--levels=131,145`.
- `--fresh-solver-per-level` creates a new `createSolver()` instance before each level. This does not isolate module-level state, but it does isolate instance-level state.
- `--out=<path>` writes JSON output.

Per-level fields captured include:

- `ok`
- `status`
- `elapsedMs`
- `nodesExpanded`
- `attemptCount`
- `winnerIndex`
- `winningStrategy`
- `failedStrategies`
- `attemptHash`
- normalized `attempts`
- `solutionLength`
- `solutionHash`
- `refereeValid`
- `refereeError`

The script also writes run summary totals: solved count, failed count, total time, total nodes expanded, and total attempts.

### `scripts/compare-solver-fingerprints.mjs`

This script compares a base fingerprint JSON file against one or more other fingerprint JSON files:

```bash
node scripts/compare-solver-fingerprints.mjs base.json other.json [more.json ...]
```

It reports differences grouped by severity:

- `critical`: `ok`, `status`, `refereeValid`, `solutionHash`, or missing/present level changes.
- `strong`: `winningStrategy`, `winnerIndex`, `attemptCount`, or `attemptHash` changes.
- `medium`: `solutionLength` and `nodesExpanded` changes.

The comparator exits non-zero if it finds any differences. For investigative runs where differences are expected, use `|| true` when saving logs.

## Saved logs

The full JSON fingerprint files were generated under `/tmp/pathfinder-fingerprint` during the investigation and were not committed because they are bulky generated artifacts. The important comparison outputs have been saved in this repo:

- `audits/solver-determinism/full-corpus-compare.log`
- `audits/solver-determinism/default-repeat-compare.log`
- `audits/solver-determinism/targeted-131-145-compare.log`
- `audits/solver-determinism/isolated-131-compare.log`
- `audits/solver-determinism/isolated-145-compare.log`

These logs are enough to reconstruct the key conclusions without needing the temporary JSON files.

## Full-corpus experiment

### Commands run

```bash
mkdir -p /tmp/pathfinder-fingerprint
node scripts/run-bundled.mjs scripts/solver-fingerprint.mjs --order=default --out=/tmp/pathfinder-fingerprint/default.json
node scripts/run-bundled.mjs scripts/solver-fingerprint.mjs --order=reverse --out=/tmp/pathfinder-fingerprint/reverse.json
node scripts/run-bundled.mjs scripts/solver-fingerprint.mjs --order=random --seed=101 --out=/tmp/pathfinder-fingerprint/random-101.json
node scripts/run-bundled.mjs scripts/solver-fingerprint.mjs --order=random --seed=202 --out=/tmp/pathfinder-fingerprint/random-202.json
node scripts/run-bundled.mjs scripts/solver-fingerprint.mjs --order=random --seed=303 --out=/tmp/pathfinder-fingerprint/random-303.json
node scripts/compare-solver-fingerprints.mjs /tmp/pathfinder-fingerprint/default.json /tmp/pathfinder-fingerprint/reverse.json /tmp/pathfinder-fingerprint/random-101.json /tmp/pathfinder-fingerprint/random-202.json /tmp/pathfinder-fingerprint/random-303.json > audits/solver-determinism/full-corpus-compare.log || true
```

### Outcome summary

All five runs solved 156/156 levels.

Total times and total node counts from `full-corpus-compare.log`:

| Run | Solved | Time | Total nodes |
| --- | ---: | ---: | ---: |
| default | 156/156 | 25.136s | 13,869,667 |
| reverse | 156/156 | 25.643s | 12,139,083 |
| random seed 101 | 156/156 | 25.141s | 12,131,310 |
| random seed 202 | 156/156 | 23.985s | 13,883,073 |
| random seed 303 | 156/156 | 25.054s | 12,033,678 |

### Differences found

Compared to the default run:

- Reverse order:
  - Level 131 solution hash changed.
  - Level 131 nodes changed from 1,926,137 to 203,222.
  - Level 145 nodes changed from 1,059,880 to 1,052,211.
- Random seed 101:
  - Level 131 solution hash changed.
  - Level 131 nodes changed from 1,926,137 to 203,222.
  - Level 145 nodes changed from 1,059,880 to 1,044,438.
- Random seed 202:
  - Level 145 solution hash changed.
  - Level 145 attempt count changed from 2 to 1.
  - Level 145 attempt hash changed.
  - Level 145 winner index changed from 1 to 0.
  - Level 145 winning strategy changed from `intersectionHarvest@beam5000(diverse)` to `repair@dfs(repair)`.
  - Level 145 nodes changed from 1,059,880 to 1,073,286.
- Random seed 303:
  - Level 131 solution hash changed.
  - Level 131 nodes changed from 1,926,137 to 203,222.
  - Level 145 nodes changed from 1,059,880 to 946,806.

### Full-corpus conclusion

There is no solve/fail corpus-order flake in this run set. There is clear internal non-determinism in solution identity and search effort. Level 131 and level 145 are the only levels surfaced by these full-corpus comparisons.

## Repeated default-order experiment

### Commands run

```bash
node scripts/run-bundled.mjs scripts/solver-fingerprint.mjs --order=default --out=/tmp/pathfinder-fingerprint/default-2.json
node scripts/compare-solver-fingerprints.mjs /tmp/pathfinder-fingerprint/default.json /tmp/pathfinder-fingerprint/default-2.json > audits/solver-determinism/default-repeat-compare.log || true
```

### Results

Both default-order runs solved 156/156 levels.

The second default-order run differed from the first:

- Level 131 solution hash changed.
- Level 131 nodes changed from 1,926,137 to 203,222.
- Level 145 nodes changed from 1,059,880 to 996,003.

### Default-repeat conclusion

The observed differences are not limited to changing corpus order. At least some non-determinism reproduces between two same-order full-corpus runs in fresh processes.

## Targeted level 131/145 experiment

### Commands run

```bash
node scripts/run-bundled.mjs scripts/solver-fingerprint.mjs --levels=131,145 --out=/tmp/pathfinder-fingerprint/131-145.json
node scripts/run-bundled.mjs scripts/solver-fingerprint.mjs --levels=145,131 --out=/tmp/pathfinder-fingerprint/145-131.json
node scripts/run-bundled.mjs scripts/solver-fingerprint.mjs --levels=131,145 --fresh-solver-per-level --out=/tmp/pathfinder-fingerprint/131-145-fresh.json
node scripts/run-bundled.mjs scripts/solver-fingerprint.mjs --levels=145,131 --fresh-solver-per-level --out=/tmp/pathfinder-fingerprint/145-131-fresh.json
node scripts/compare-solver-fingerprints.mjs /tmp/pathfinder-fingerprint/131-145.json /tmp/pathfinder-fingerprint/145-131.json /tmp/pathfinder-fingerprint/131-145-fresh.json /tmp/pathfinder-fingerprint/145-131-fresh.json > audits/solver-determinism/targeted-131-145-compare.log || true
```

### Results

Base run `131,145` solved both levels in 4.031s with 1,077,410 total nodes.

Run `145,131` solved both levels in 2.113s with 2,999,423 total nodes and differed from the base run:

- Level 131 solution hash changed.
- Level 145 solution hash changed.
- Level 145 attempt count changed from 2 to 1.
- Level 145 attempt hash changed.
- Level 145 winner index changed from 1 to 0.
- Level 145 winning strategy changed from `intersectionHarvest@beam5000(diverse)` to `repair@dfs(repair)`.
- Level 131 nodes changed from 203,222 to 1,926,137.
- Level 145 nodes changed from 874,188 to 1,073,286.

Run `131,145 --fresh-solver-per-level` produced the same major differences relative to the base run as `145,131`, despite creating a new solver instance per level.

Run `145,131 --fresh-solver-per-level` only differed from the base run in level 145 nodes: 874,188 to 953,731.

### Targeted conclusion

Levels 131 and 145 are sufficient to reproduce the interesting behavior without running the full corpus. The `--fresh-solver-per-level` result suggests that simply recreating the solver object is not enough to eliminate all state sensitivity; possible explanations include module-level state, runtime state, or intrinsic non-determinism in lower-level solver logic.

## Isolated single-level experiments

### Commands run

```bash
node scripts/run-bundled.mjs scripts/solver-fingerprint.mjs --levels=131 --out=/tmp/pathfinder-fingerprint/131-alone-a.json
node scripts/run-bundled.mjs scripts/solver-fingerprint.mjs --levels=131 --out=/tmp/pathfinder-fingerprint/131-alone-b.json
node scripts/compare-solver-fingerprints.mjs /tmp/pathfinder-fingerprint/131-alone-a.json /tmp/pathfinder-fingerprint/131-alone-b.json > audits/solver-determinism/isolated-131-compare.log

node scripts/run-bundled.mjs scripts/solver-fingerprint.mjs --levels=145 --out=/tmp/pathfinder-fingerprint/145-alone-a.json
node scripts/run-bundled.mjs scripts/solver-fingerprint.mjs --levels=145 --out=/tmp/pathfinder-fingerprint/145-alone-b.json
node scripts/compare-solver-fingerprints.mjs /tmp/pathfinder-fingerprint/145-alone-a.json /tmp/pathfinder-fingerprint/145-alone-b.json > audits/solver-determinism/isolated-145-compare.log || true
```

### Level 131 alone

Both isolated runs solved level 131 with the same fingerprint:

- 1/1 solved in both runs.
- Nodes were 1,926,137 in both runs.
- No critical, strong, or medium differences.

### Level 145 alone

Both isolated runs solved level 145, but they differed:

- First run: 3.296s, 1,067,958 nodes.
- Second run: 1.600s, 1,073,286 nodes.
- Solution hash changed.
- Attempt count changed from 2 to 1.
- Attempt hash changed.
- Winner index changed from 1 to 0.
- Winning strategy changed from `intersectionHarvest@beam5000(diverse)` to `repair@dfs(repair)`.

### Isolated conclusion

Level 145 alone is sufficient to reproduce non-deterministic successful-method and solution-hash changes across fresh processes. Level 131 was stable in this limited isolated repeat, so its differences appear more tied to full-corpus or paired-run context.

## What future investigators should do next

1. Start with level 145 alone. It is the smallest known reproducer for winner/attempt/solution-hash non-determinism.
2. Run level 145 repeatedly in fresh processes and count the distribution of:
   - `winningStrategy`
   - `attemptCount`
   - `winnerIndex`
   - `solutionHash`
   - `nodesExpanded`
3. Search the solver for unseeded randomness, unstable tie-breaks, and iteration-order-sensitive code. Important suspects include:
   - `Math.random()`
   - randomized shuffles
   - sort comparators that return `0` for non-identical candidates
   - `Map`/`Set` traversal used as an implicit tie-break
   - object-key iteration over objects built from non-deterministic insertion order
   - module-level mutable state
   - reusable scratch memory that may not be fully cleared
4. For level 131, use paired and full-corpus probes. It is not currently the best single-level reproducer, but it clearly changes in context.
5. If fixing determinism, use `scripts/solver-fingerprint.mjs` before and after the change and compare with `scripts/compare-solver-fingerprints.mjs`. A successful determinism fix should make repeated level 145 alone runs match on solution hash, winning strategy, attempt hash, and nodes expanded.

## Validation commands run while adding the tooling

```bash
npx eslint scripts/solver-fingerprint.mjs scripts/compare-solver-fingerprints.mjs --max-warnings=0
node scripts/check-package-scripts.mjs
```

Both completed successfully. The npm invocation printed this environment warning, which did not fail the command:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
```

# Determinism Report

Date: 2026-07-09  
Report version: latest consolidated follow-up restored for main  
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

## Follow-up: novel hints saved

After the initial determinism audit, I compared every unique solution hash present in the generated fingerprint artifacts against the saved hint paths for its level. The comparison used exact packed-key path identity: `sha256(JSON.stringify(path))` for solver solutions and for each saved hint path in `data/hints/<NNN>.json`.

That check found 12 exact solver paths that were not already present in the saved hint library. I reproduced those paths, verified their hashes, and appended them to their respective per-level hint files.

Saved additions:

| Level | Added hint index | Solution hash |
| ---: | ---: | --- |
| 72 | 81 | `e22518f8fd1bb3692715457dacb1365d03cc1ca9779b0c2b74086a84dd572d22` |
| 123 | 61 | `90b839ba6f4d43a5820573e021cf4807c71912b655096905d3f7984a55989e58` |
| 129 | 27 | `a99b381852ca221004c4c5ff65f31663791b04b44773f6febc411fb3e316bf05` |
| 131 | 55 | `0bfa099bbe23e9c2fea070ab7b90114b6bddd6984e9bf394d59ade6e1b14f8a1` |
| 136 | 30 | `ad8b76adc9dcf301f35b9e80308dc303f388357d1351cd325d1424cad42c45e5` |
| 138 | 58 | `39d90ae09862d7fe2a8a27c1eeb0e717f9d4d00c4b523e2eb080b09a394b489f` |
| 139 | 55 | `01f752239ed21d42fca677f1ae51e4e2e5b3e5f0d629db345c349de6f5b6dc49` |
| 141 | 36 | `42a8c06cc5a133811705f977fafdeaec8b817176fa2467d04f1ca0f2ee5a4f01` |
| 144 | 18 | `ed747abf2264a661cc8270d85c9a3fa59113ca6b09c48e77753d3e72d029ff99` |
| 145 | 16 | `d6100403e8369cddd7d1613dfbf7ab384b38e8855369580ecf7095dc7016e322` |
| 145 | 17 | `d82949328c40769f3c68646c1e7a67b391c68f7c1fd0535c2560d139dbf3711d` |
| 146 | 48 | `4732cee36404b4f054fbd4da4cfd005c3b1caf1939a48bdc99a9d223932a0637` |

Saved log: `audits/solver-determinism/novel-hints-added.log`. Because the saved hint corpus changed, I also regenerated `data/level-heatmaps.json` with `npm run levels:generate-heatmaps`.

Conclusion: the non-determinism audit is not only exposing unstable internal solve routes; it is also discovering valid solved paths that were missing from the existing saved hint corpus. Level 145 is the clearest example: both non-deterministic winning paths observed for that level were novel relative to `data/hints/145.json`, so both were added.

## Follow-up: repeated level 145 alone

I ran level 145 alone 20 times in fresh `node scripts/run-bundled.mjs scripts/solver-fingerprint.mjs --levels=145` invocations.

Summary:

- 20/20 runs solved level 145.
- 17/20 runs solved via `repair@dfs(repair)` in a single attempt.
- 3/20 runs solved via `intersectionHarvest@beam5000(diverse)` after two attempts.
- The repair winner always returned solution hash `d82949328c40769f3c68646c1e7a67b391c68f7c1fd0535c2560d139dbf3711d` and 1,073,286 nodes.
- The intersection/diverse-beam winner always returned solution hash `d6100403e8369cddd7d1613dfbf7ab384b38e8855369580ecf7095dc7016e322`, with node counts varying among 1,069,517, 953,638, and 1,068,095.

Saved log: `audits/solver-determinism/level-145-repeat.log`.

Interpretation: level 145's nondeterminism is reproducible with a minimal single-level fresh-process runner. The dominant branch is the early repair probe succeeding inside its wall-clock budget. The minority branch is the repair probe missing its wall-clock cutoff, after which the next main-loop attempt solves via intersection/diverse beam.

## Follow-up: root-cause reconnaissance

I searched the solver code for likely nondeterminism sources: unseeded randomness, unstable tie-breaks, Map/Set ordering effects, module-level mutable state, and scratch-memory reuse.

### Unseeded randomness

I did not find `Math.random()` in the solver hot path. Repair search uses a deterministic `mulberry32` PRNG seeded from the gate key, and comments explicitly state it is intended to be reproducible. Attempt-order randomization also uses a seeded LCG.

Relevant files:

- `modules/solver/repair-search.ts`
- `modules/solver/attempts.ts`

### Strongest current hypothesis: wall-clock race in the repair probe

The most actionable finding is that level 145 appears to race against the early repair probe's wall-clock budget.

Evidence:

1. Normal level-145-alone repeat: 17/20 runs returned the repair solution in one attempt, while 3/20 missed that early route and solved via the next intersection/diverse-beam attempt.
2. The ordinary repair probe budget is fixed at 1500ms (`REPAIR_PROBE_ORDINARY_MS = 1500`).
3. The successful repair runs in the repeat log were around 1500-1600ms total process-level solve time, i.e. near the probe threshold once wrapper/reporting overhead is included.
4. Disabling the repair probe made 10/10 runs solve consistently via `intersectionHarvest@beam5000(diverse)` with the same solution hash.

Command used for the no-repair-probe check:

```bash
node --import tsx /tmp/run-145-ablation.mjs | tee audits/solver-determinism/level-145-no-repair-probe.log
```

Saved log: `audits/solver-determinism/level-145-no-repair-probe.log`.

This points less toward truly random behavior and more toward deterministic search being cut at slightly different wall-clock points. In other words: the path returned can depend on whether the deterministic repair probe crosses the solution before the local `Date.now()` budget check expires on that process run.

### Other possible contributors still worth checking

These did not become the lead hypothesis, but are still worth future review:

- `pool.sort((a, b) => b.score - a.score)` in beam search has no explicit tie-breaker. If equal scores occur, insertion order becomes the implicit tie-break.
- `_diverseSelect()` iterates `Map` buckets in insertion order. This should be deterministic if candidate insertion order is deterministic, but it remains an implicit dependency.
- Several module-level scratch buffers exist in hot-path modules, including lower-bound MST scratch arrays, topology reachability buffers, and scoring scratch buffers. Prior comments already mention scratch-buffer bugs and silent TypedArray overflow risks. I did not prove any active corruption here in this follow-up, but these remain relevant areas if wall-clock cutoff changes do not fully explain all observed level 131 behavior.

## Updated next recommendations

1. Treat level 145 as a wall-clock budget determinism issue first.
2. Make the early repair probe deterministic by work budget rather than wall-clock budget, or record/report probe timeout as expected nondeterminism if wall-clock racing is acceptable.
3. Re-run `audits/solver-determinism/level-145-repeat.log` style checks after any repair-probe change. node scripts/run-bundled.mjs scripts/solver-fingerprint.mjs --order=reverse --out=/tmp/pathfinder-fingerprint/reverse.json
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

# Solver Architecture

`modules/Solver.ts` is the public facade over `modules/solver/*`. This doc covers solution generation; hint display/cycling is separate: [`hint-curation.md`](hint-curation.md).

> **Level-blind policy:** strategy may use mechanics/current state (`reqInt`, `navDensity`, counts, gates, `reqLen`, etc.), never level identity. `check:no-solver-level-numbers` enforces this.
>
> **Corpus caveat:** before tuning to stress pass rates, read [`data/stress/README.md`](../data/stress/README.md) “Batches.” Some batches target known historical weaknesses and are not independent generalization evidence.

## Core flow

1. `normalizeRawLevel()` converts 1-indexed wire data to 0-indexed packed-key form.
2. `prepLevel()` builds distances, adjacency, masks, and indexes.
3. `solveLevel()` runs gates × attempt configs through DFS/beam plus later tiers.
4. `validateCandidatePath()` performs canonical rule validation.
5. Return `{ ok, solution, attempts, totalMs }`.

## Attempt configs

`getAttemptConfigs(level)` returns:

```js
{ profileName, template: Object|null, beamWidth?, minBudgetFraction?, diverseBeam? }
```

`beamWidth` selects beam; otherwise DFS. `minBudgetFraction` protects critical configs from dilution.

### Archetypes (`detectArchetype`)

Priority:

1. **near-closure:** `reqInt <= 1 && navDensity < 0.35`.
2. **high-intersection-burden:** `(reqInt>=5 && density>=0.45) || (reqInt>=4 && density>=0.55) || reqInt>=10`.
3. **must-cross-heavy:** `mustCrossKeys.length >= 2 && reqInt >= 2`.
4. **portal-heavy:** `portalMap.size >= 4`.
5. **default**.

`navDensity = reqLen / navArea`, with `navArea = w*h - blocks - geese - falseGoals - gates`.

### Attempt policy

`modules/solver/attempts.ts` is authoritative: ordered first-match-wins `ATTEMPT_POLICY` rules over `LevelFeatures`, thresholds in `POLICY.*`, bundles built from `dfs()`/`beam()`/`profilesFirst()`.

- **near-closure:** `nearClosureRescue -> harvestThenFinish -> finishFirst -> perimeterSweep`, then templates.
- **high-intersection-burden:**
  - `reqInt >= POLICY.VERY_HIGH_REQINT (7)`: beam first; portal-dense (`portals >= 2`) leads `objectiveFirst`, otherwise `intersectionHarvest`; DFS fallback.
  - `navDensity >= POLICY.NEAR_HAMILTONIAN_DENSITY (0.82)`: skip leading beams; DFS perimeter both directions.
  - otherwise perimeter/objective beams first; long multi-gate (`reqLen >= 90 && gates >= 2`) gets budget floors; DFS prefers objectives when `mustPass >= 3`, CCW when `reqInt <= 4 && mustPass = 0`.
- **portal-heavy:** `portalFirstTransfer`, `portalCommitted`, then templates.
- **must-cross-heavy:**
  - `mustPass >= 3 && flippers >= 2`: diverse `intersectionHarvest` beam 5000, then DFS; repair early probe now handles nearly all before this loop. Beam 15000/50000 tiers were removed after zero-yield natural exhaustion.
  - `mustPass >= 3`: objective/must-cross beams first.
  - `mustCross >= 3 && mustPass >= 2`: beam first.
  - otherwise cornerHarvest/perimeterCW DFS, then beams, then DFS profiles.
- **default:** with `mustPass = 0`, CCW template precedes CW; otherwise default template order, then all profiles.

Default templates:

```js
const ATTEMPT_CONFIGS = [
  { profileName: 'perimeterSweep', template: TEMPLATES.cornerHarvest  },
  { profileName: 'perimeterSweep', template: TEMPLATES.perimeterCW    },
  { profileName: 'perimeterSweep', template: TEMPLATES.perimeterCCW   },
  { profileName: 'perimeterSweep', template: TEMPLATES.sideCommitment },
  ...PROFILE_ORDER.map(profileName => ({ profileName, template: null })),
];
// 16 total: 4 templates + 12 profiles
```

The ladder is hand-tuned, not mined. Historical corpus1 analysis found 79% of solved-level time before the winner (75–86% for must-cross-heavy/high-intersection); `navDensity` predicted repair wins only weakly. Re-test on current corpus2 evidence before further hand-ordering. See [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md).

## DFS (`dfsFromGate`)

- Iterative DFS with undo tokens; no recursion.
- `applyMove()` mutates and returns an undo token; `undoMove()` restores.
- LDS probes `k = 0,1,2,4,8`, then unbounded. Each wave has `probeCapMs = min(floor(levelBudgetMs*0.5), 4000)` plus deterministic node limits; a flat time floor was tested and reverted after trading one budget-dilution failure for another.
- Prunes: over-length/intersection, must-cross ceiling, goal-distance, parity, MP/MC MST lower bounds, connectivity.
- `mustPassLowerBound`/`mustCrossLowerBound` are memoized under `STRATEGY_LOWER_BOUND_MEMO`. Keys must include every dependency; must-cross needs more than `(pos, mask)`. See the MST bug below.

## Beam search (`beamSearchFromGate`)

- Parent-pointer frontier `{ key, prev, depth, score, sc, sk? }`.
- Reconstructs into reusable `_scratch[]`; replay uses `_beamResetState()` + `applyMove()`.
- Uses DFS pruning.
- `scoreAndSort` uses `_sas[4]` `Float64Array` scratch + insertion sort.
- Default width 2000; hard-level width 5000.
- **State dedup:** equal `(key, sc)` keeps highest score. Key is `c.key + c.sc * KEY_SPACE` as exact float64. Disabled for portal levels because `sc` omits portal usage.

```js
sc = (adjTurnMask&0xF)<<24 |
     (mustTurnMask&0xF)<<20 |
     (surroundMask&0xF)<<16 |
     (flipperUsedMask<<12) |
     (mustCrossMask<<8) |
     (mpVisitedMask<<4) |
     (ints&0xF)
```

- **Diverse beam:** `_diverseSelect` buckets by `sk = (flipperUsedMask<<4)|(mustCrossMask&0xF)`, guarantees `floor(beamWidth/numBuckets)` per bucket, then fills globally.
- Must-cross+flipper fallback is diverse bw=5000; former 15000/50000 tiers were removed after zero-yield natural exhaustion.

## Key state

```js
state = {
  path: number[],
  visited: Uint16Array,
  edgeUsage: Uint8Array,   // 1=H, 2=V
  ints: number,
  mustMask: number,
  mustCrossMask: number,
  crossCounts: Uint8Array,
  mpVisitedMask: number,
  portalJumps: number,
  flipperUsedMask: number,
  lastWasPortalJump: boolean,
  surroundMask: number,
  surroundNeighborRemainingMasks: Uint8Array,
  mustTurnMask: number,
  adjTurnMask: number,
}
```

## `prepLevel()` data

- `distMap`, `goalDistArr` (`0xFFFF = unreachable/Infinity`).
- `mpDistArrs[]`, `mcDistArrs[]`, `objDistArrs[]`.
- `staticNeighbors`: valid `[nk, axis, ...]`, excluding blocks/geese/false-goals/gates/wrong regular-filter axis.
- `mustPassIndex`, `mustCrossIndex`, `flipperIndexMap`, `flipperInitAxes`.
- `mcPairDist`, `mpPairDist`, `mcApproachDistMaps`.
- `surroundNeighborIndex`, `surroundInitNeighborMasks`, `surroundNeighborDistMaps`.
- `mustTurnCellIndex`, `mustTurnDirs`, `adjTurnDistMaps`.
- `mustMaskForDFS`: `initialMustMask`, or 0 for `navDensity >= DENSE_LEVEL_NAV_DENSITY`.
- `hasLandmarkConstraints` fast path.

## Encoding

```js
PACK(x, y)  = ((y << 16) | x) >>> 0
UNPACK(k)   = { x: k & 0xFFFF, y: (k >>> 16) & 0xFFFF }
KEY_SPACE   = 1 << 20
AXIS_H = 1
AXIS_V = 2
AXIS_NONE = 0
```

## Ablation laboratory

57 togglable flags; see [`ablation.md`](ablation.md). Quick start: `npm run ablation:baseline`, `npm run ablation:single`, `npm run ablation:analyze`.

`normalizeAblationConfig()` in `orchestration.ts` normalizes sparse external configs: supplied keys pass through, missing boolean flags read `true`, absent `ATTEMPT_ORDER`/`_randomSeed` stay `undefined`; null/absent config keeps the fast path. `race.mjs` normalizes before `postMessage` because `Proxy` cannot cross workers. This fixed the sparse-config bug where omitted strategies became disabled.

## CLI and tooling

> Use the esbuild-bundled CLI, not raw `tsx`; the hot path is ~5× slower under raw `tsx`.

### `solver:bench` vs `solver:direct`

- `solver:bench -- --check`: solved/failed regression truth against `logs/solver-baseline.json` plus order probes. `--update-baseline` only for verified intentional change. It does **not** measure cost.
- `solver:direct`: debugging with `--verbose`/structured `--output`; no baseline comparison.

```bash
npm run solver:direct -- --levels=pos:133,pos:146 --budget-ms=30000 --output=logs/Solver/out.json
npm run solver:direct -- --levels=all --budget-ms=30000 --output=logs/Solver/full.json
npm run check:audit-output -- logs/Solver/full.json
```

| Flag | Default | Meaning |
|---|---|---|
| `--levels=pos:1,pos:2` / `all` | all | Explicit selectors; bare numbers rejected. |
| `--budget-ms=30000` | 30000 | Per-level time budget. |
| `--output=...` | none | JSON report. |
| `--verbose` | off | Per-attempt logs. |

Audit rows contain level/status/ok/elapsed/nodes/solvedBy plus attempts with gate, profile, template, beam width, success, elapsed, allocated budget, and nodes.

### Debugging

Use `solver:direct` on the target, inspect attempt order/winner/budget/nodes, change `modules/solver/attempts.ts` if policy is at fault, then rerun targets, full audit, `npm run ci`, and `solver:bench -- --check` before completion claims.

`npm run audit:newhint:full` keeps rolling causality history beside `logs/solver-workflow/latest.json` (`HISTORY_MAX_BYTES = 95 MB`, `HISTORY_MAX_ENTRIES = 4000`).

### Speed-only optimization (`solver:speed-probe`)

Wall-bounded runs let faster code expand more nodes, so pin a generous non-binding wall deadline and deterministic node/work budget. A pure speed change should produce identical search work; compare interleaved wall-time medians because shared hosts vary ±5–10%. See [`reports/2026-07-30-solver-hot-path-pure-speed.md`](../reports/2026-07-30-solver-hot-path-pure-speed.md).

### Trap-spot / false-goal audits

```bash
npm run solver:trap-audit -- --levels=all --extended-budget=60000
npm run solver:trap-audit -- --check-false-goals --fg-budget=90000
```

False-goal timeouts are `inconclusive`, never invalid. Parity resolves most; goal-directed solve can prove reachability more cheaply than full enumeration.

### Editor trap-scan runtime

“Trap” means false-goal trap spots, not accessibility focus traps. `worker.js` handles `TRAP`; `solver-worker-client.ts` streams `TRAP_PROGRESS` (~100 ms batches) and `TRAP_RESULT`. `trap-scan-controller.ts` provides background parity/confirmed overlays, explicit scan/cancel/budget escalation, `editor.trapScanState = stale|scanning|done|partial|failed`, mutation invalidation via `clearEditorValidTrapSpots`, and cooperative main-thread fallback.

## Parallel Find-all enumeration (browser)

Only complete-mode Find-all uses this pool; targeted tiers stay main-thread. See [`solve-button-variety.md`](solve-button-variety.md).

- One `(gate, root-child)` shard/job; `EnumOptions.rootChildren` restricts roots. Same-gate shard signatures cannot overlap at cell 1; union tests prove coverage.
- Workers stream `ENUMERATE_PROGRESS`; PLAY validation/dedup stay on main thread in `createEnumerationPoolClient`.
- Protocol: `ENUMERATE`, cached `prepLevel()` per `levelKey`, `ENUMERATE_PROGRESS`/`RESULT`/`ERROR`, `CANCEL`.
- Pool size `navigator.hardwareConcurrency - 1`; `exhausted` requires every shard to exhaust without cap/cancel/node limit. Return shape matches `VarietyResult`.
- Pool failure permanently falls back to main-thread complete search for the session; accumulated results survive 2,500 -> 5,000 no-cap transitions without loss/duplication.
- Covered by sharding, fake/real worker, multiworker Chromium, resume, cancellation, and forced-fallback tests.

## Parallel attempt racing (backend only)

`scripts/solver-parallel/` races the same `getConfiguredAttemptConfigs × getActiveGates` attempts as sequential `solveLevel()`. First success wins; other workers terminate. Node-only tooling, never browser-imported.

### Race engine

`race.mjs` exports `solveLevelRaced()` and `createRacePool()`; bundled `worker-source.mjs` reuses `prepLevel()`.

- Two queues: repair and main. `min(repairJobs.length, poolSize-1)` workers (for `poolSize>=2`) prefer repair, then fall back to main.
- `budgetForMainJob`/`budgetForRepairJob` mirror sequential dynamic sharing, multiplied by queue worker count for wave execution; `minBudgetFraction` remains honored.
- CPU contention can make racing slower or change deadline outcomes; do not interpret that as queue logic failure.
- `benchmark.mjs` writes raced-only `benchmark-raced-latest.json` (`engine: 'raced'`) and must never replace production benchmark truth.
- Real worker tests cover solved/unsolved, poolSize 1, validity, reuse, and cleanup.

### Persistent pool across levels

A short-sequential-then-race hybrid was reverted because shrinking `timeBudgetMs` changed proportional attempt shares. `createRacePool()` instead reuses workers unchanged across levels; caches key by `levelKey`, resets per-job metrics/config, respawns broken workers, and kills/replaces stragglers before reuse.

- `stress:benchmark`: raced by default; `--engine=sequential` for production-exact behavior; `--parallel` forces inner sequential mode to avoid nested oversubscription.
- `stress:benchmark:raced`: one persistent pool/run.
- `solver:bench`, `stress:regression`, `solver-fingerprint`: sequential for parity/determinism.

2026-07-10, 4-vCPU, first 50 corpus1, 8 s: old per-level pool 49/50 in 287,180 ms; persistent pool 49/50 in 272,536 ms, **5.1% faster overall** and **13.96% faster** on the 45 fast levels.

## Which large-batch tool?

| Tool | Engine | Use |
|---|---|---|
| `solver:bench -- --check` | sequential | CI solved-set regression truth. |
| `stress:regression` / `solver:fingerprint` | sequential | baseline/determinism. |
| `stress:benchmark` | raced default; sequential opt-in; `--parallel` across levels | corpus iteration/perf. |
| `stress:benchmark:raced` | persistent raced pool | raced-specific output. |
| `solver:direct` | sequential | single/few-level debugging. |
| `solver:req-length-sweep` | sequential | controlled `reqLen` scaling. |
| `portfolio-solve-sweep.mjs` | configurable/resumable | repeated hard-population iteration. |
| `repair-direct-probe.mjs` | direct repair | repair-only development; bypasses ladder. |

Start whole-corpus speed work with `stress:benchmark`. Across-level `--parallel` may beat within-level racing for mostly-fast levels; do not combine them there. `portfolio-solve-sweep` is the composed-concurrency tool for small hard sets. None replace `solver:bench --check`.

Batch tools must persist between levels: `stress:benchmark` writes partial output and supports `--skip-existing-dir`; `portfolio-solve-sweep` uses JSONL + `--resume` (same `--out` alone does not resume). Use the cheapest population/budget that decides the gate; do not run competing CPU-bound timing arms concurrently on one host.

## `--levels` syntax

Shared parsers in `scripts/level-data-io.mjs` reject ambiguous bare numbers/ranges (`AmbiguousLevelSpecError`):

- `pos:<n>` / `pos:<a-b>`: 1-indexed array position.
- `id:<n>` / `id:<a-b>`: id suffix in id-aware tools; supports mixed S/R corpus1 families.
- full ID such as `R00237`: unambiguous.
- `all` / omitted: all levels.

Known gap: `stress:benchmark` still assumes wrapped `{levels:[...]}` input and crashes on bare-array corpora.

## Fast portfolio scheduler experiment

`opts.schedulerMode` is `'legacy'` or offline-only `'portfolio-experiment'`; live Play/Editor/Review/hint discovery use legacy. Portfolio tiers run cheap broad passes, feature-gated specialists, then full legacy fallback.

**Not production-ready.** Best published 2026-07-12 variant (500/2000/5000 ms) was **1.51×** legacy with equal solves. After the 2026-07-16 elite-splice repair fix, a corpus1 1–20 stress comparison changed from **0.57×** to **1.45×**, showing that portfolio results must be revalidated after legacy speed changes. See `reports/portfolio/portfolio-scheduler-decision.md` and the 2026-07-16 reverification report.

Commands: `npm run solver:portfolio-report ...`, `npm run solver:portfolio-replay ...`, and bundled `scripts/portfolio-solve-sweep.mjs`. The sweep records full attempt/referee/failed-strategy telemetry, can `--save-hints`, and can flatten to benchmark shape via `portfolio-sweep-reports-to-benchmark.mjs`.

### Repair extra-budget policy

Repair-gated levels can receive `REPAIR_EXTRA_BUDGET_FRACTION = 6.0`; a 30 s solve may spend 180 extra seconds. `--node-budget` and top-level `repairBudgetFractionOverride` control it. Corpus1 measurement: fraction 0 cut wall from ~51 to ~18 min, losing six solves arriving at 35–115 s. Therefore **testing/benchmarking uses 0; hint discovery keeps 6×**; interactive 30 s UIs also use 0.

The override is top-level `SolveOpts`, not sparse `ablation`; its old location triggered the sparse-default bug.

### Batch-scale features

`portfolio-solve-sweep.mjs` supports:

- `--resume` JSONL checkpoint;
- mechanics `--feature-filter`;
- `--baseline` + `--priority`/`--priority-order` including `stability`;
- `--attempt-cache`: negative-result reuse keyed by attempt-family dependency hashes (`dfs-beam`, `repair`), invalidating shared scheduling changes and never fabricating solves;
- `--workers`: child-process level parallelism, main-process-only hint writes;
- `--race-pool-size`: combines outer workers with persistent inner race pools. Total concurrency = workers × race-pool-size; legacy scheduler only, incompatible with `--node-budget`, honors repair fraction.

`repair-direct-probe.mjs` calls `repairSearchFromGate` directly. `--races=N` runs independently salted searches; `seedSalt` defaults 0. Measure restart diversity per change.

## Memory / hot-path work

### Tier 1: flattening — DONE

Converted to typed arrays/`IntHashMap`: MP/MC lower-bound caches; `staticNeighbors -> staticNeighborKeys`; flipper approach distances; `mustTurnCellIndex`; `gateSet -> gateFlags`; removed `objectiveKeyToIndex`. `adjTurnCellIndex`/`surroundNeighborIndex` stay Maps because one key may map to multiple values. Conversions were differentially checked across published + stress corpora, then `solver:bench` + CI.

### Tier 2: allocation — PARTLY DONE / REFUTED

- `buildCurUrgencyContext` pooling: done, ~11–12% full-corpus wall win.
- `UndoToken` pooling: reverted, **4.6% slower** at identical nodes; do not retry without a winning microbenchmark.
- `getNeighbors` scratch and beam phase allocations remain untried.

Allocation inventory: `applyMove` allocates one undo/candidate; `getNeighbors` one candidate array/node; beam culling allocates dedup/bucket structures per phase.

### Tier 3: dense indexing — PARTLY DONE

`KEY_SPACE = 1,048,576` arrays for <=225 live cells create >99.9% padding and rough **60–90 MB** max-level resident use. Cache-locality was mostly refuted (15×15 sparse/dense neighbor microbench 456 vs 449 ms); allocation cost was the real payoff (`createState` 15.2% CPU, `prepLevel` 14.5%, `distMapToArray` 7.3%, GC 11%; `staticNeighborKeys` 16 MB fill, `visited+edgeUsage` 3 MB/attempt).

Distance arrays now use dense `gridW*gridH` indexing via `denseIndex`: 225 entries instead of 1,048,576 on 15×15. With state-buffer reuse/zero-means-absent encoding, batch-shaped work became ~40% faster. Temporary bounds guard saw **1.63B reads, zero violations**.

Still sparse: `staticNeighborKeys`, state `visited`/`edgeUsage`, `buildIndexArr` outputs, `gateFlags`/`reachBlockedArr`; each needs per-site audit + bounds guards.

## Wall-clock-gated probes

Local fixes improve determinism, but top-level `orchestration.ts` still derives attempt shares from remaining wall time. Repeat provenance showed 84.2% of same-code/config/budget/seed groups differing in `nodesExpanded`, median 3.18× spread. See [`solver-budget-determinism.md`](solver-budget-determinism.md).

### `runRepairProbe` — DONE

Seeded repair probes now combine calibrated `REPAIR_PROBE_ORDINARY_NODE_BUDGET` / `_BIASED_NODE_BUDGET` with the outer ms limit. The prior wall race changed winners under contention. Verification included 5/5 identical formerly-flaky runs, two zero-diff fingerprints, `solver:bench` 156/156, and CI; landed in `92f6bf9`.

### `dfsFromGateLDS` — DONE

Each LDS wave uses feature-scaled `getLdsProbeNodeBudget` plus `probeCapMs`, accumulating nodes across waves. Calibration covered 144/156 published probe-solved and 71/150 hypothesis-stress levels; hardest published probe required 1,926,137 nodes with ~1.64× coefficient headroom. One stress outlier deterministically falls through and still solves. Verification included type/lint, 747 tests, fingerprints, `solver:bench` 156/156, stress regression, and CI.

## Attraction-diversity last-resort pass

After main + repair fail, `solveLevel()` can rerun `mainConfigs` with `ATTRACTION_DIVERSITY_CANDIDATE_FLAGS` (currently `SCORE_GOAL_ATTRACTION`) disabled under independent `ATTRACTION_DIVERSITY_BUDGET_FRACTION = 1.0`.

- Override: `attractionDiversityBudgetFractionOverride`; interactive UIs set 0 for it and repair extra budget.
- Gate: `STRATEGY_ATTRACTION_DIVERSITY`.
- Zero cost to earlier solves.
- Historical validation: 4/4 predicted-rescuable variants solved, 2/2 controls stayed unsolved; 30-case `dfs-plain` sample gained 3. See [`reports/2026-07-16-phase-d-attraction-diversity-implementation.md`](../reports/2026-07-16-phase-d-attraction-diversity-implementation.md).

## Admissible-order node reserve

A time fraction cannot protect the final tier from a cumulative `nodeBudget`. In a 2026-07-30 20M-node corpus2 baseline, all **141** unsolved levels with validated admissible-order hints hit the cap after mean **14.4** ladder attempts; admissible-order appeared on only **1**.

`ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION = 0.25` withholds early-tier nodes through `earlyTierNodeBudget`; admissible-order runs last against the full external ceiling.

- Only finite node budgets where the tier will run; reserve predicate and tier predicate must match.
- `nodeBudgetReached` reports early-tier truncation even if final total is below the external cap.
- Historical result on 141: **+21 net** (22 gained, 1 lost), participation 73/141 -> 141/141; all gains referee-valid `ida:*`.
- Earlier `ida:default` may consume reserve before a later winner; no sub-slicing because it won 21/22 gains.
- Batch flags: `--admissible-order-budget-fraction`, `--admissible-order-node-reserve-fraction`, `--disable-extra-budget-passes`; race pool does not support this tier/node budget.

Report: [`reports/2026-07-30-admissible-order-node-reserve.md`](../reports/2026-07-30-admissible-order-node-reserve.md).

## AI-assisted manual solving

[`ai-assisted-manual-solving.md`](ai-assisted-manual-solving.md) records the demonstration. Useful manual/AI input is a canonically accepted path used for differential diagnosis against solver trace, not narrative “strategy.” Manual provenance needs a distinct solver id, never `SOLVER_ID`/`HUMAN_PLAYER_ID`.

## Current speed/robustness backlog

Done: Tier1 flattening; browser Find-all pool; backend racing/persistent pool; repair/LDS probe determinism; urgency-context pooling; dense distance arrays/state reuse; attraction-diversity and admissible reserve mechanisms.

Still measurable: `getNeighbors` scratch reuse, beam per-phase allocation cleanup, and remaining dense-array conversions with dedicated safety guards. `UndoToken` pooling is closed negative absent a contrary microbenchmark.

Regression-set housekeeping was resolved 2026-08-07: five solved canaries + three known-hard targets, guarded by `stress:regression -- --update-baselines`; manual because repair-heavy cases take minutes.

## MST-bound scratch-buffer bug

`_mstEdges` assumed “max 6 nodes,” but must-turn landmarks also enter `mustPassKeys`. TypedArray OOB writes silently no-op, leaving stale data and producing an invalid lower bound (**34 vs correct 27** in one stress case), allowing false prune. Fixed in `ed6c9e6`/`3424772` with generous fallback sizing plus correctly keyed must-cross caching; independently checked on ~30,000 states. See `data/stress/README.md`. New memoization/buffer reuse needs comparable differential soundness evidence.

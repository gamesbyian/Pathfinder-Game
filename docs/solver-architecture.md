# Solver Architecture

`modules/Solver.ts` is the public facade over `modules/solver/*`. This doc covers solution generation; hint display/cycling: [`hint-curation.md`](hint-curation.md).

> **Level-blind:** strategy may use mechanics/current state (`reqInt`, `navDensity`, counts, gates, `reqLen`, etc.), never level identity. `check:no-solver-level-numbers` enforces this.
>
> **Corpus caveat:** before stress pass-rate tuning, read [`data/stress/README.md`](../data/stress/README.md) “Batches.” Some batches target historical weaknesses and are not independent generalization evidence.

## Core flow

1. `normalizeRawLevel()` converts 1-indexed wire data to 0-indexed packed-key form.
2. `prepLevel()` builds distances, adjacency, masks, indexes.
3. `solveLevel()` runs gates × attempt configs through DFS/beam plus later tiers.
4. `validateCandidatePath()` performs canonical validation.
5. Return `{ ok, solution, attempts, totalMs }`.

## Attempt configs

`getAttemptConfigs(level)` returns:

```js
{ profileName, template: Object|null, beamWidth?, minBudgetFraction?, diverseBeam? }
```

`beamWidth` selects beam; otherwise DFS. `minBudgetFraction` protects critical configs from dilution.

### Archetypes (`detectArchetype`)

1. **near-closure:** `reqInt <= 1 && navDensity < 0.35`.
2. **high-intersection-burden:** `(reqInt>=5 && density>=0.45) || (reqInt>=4 && density>=0.55) || reqInt>=10`.
3. **must-cross-heavy:** `mustCrossKeys.length >= 2 && reqInt >= 2`.
4. **portal-heavy:** `portalMap.size >= 4`.
5. **default**.

`navDensity = reqLen / navArea`, `navArea = w*h - blocks - geese - falseGoals - gates`.

### Attempt policy

`modules/solver/attempts.ts` is authoritative: first-match-wins `ATTEMPT_POLICY` over `LevelFeatures`, thresholds in `POLICY.*`, bundles from `dfs()`/`beam()`/`profilesFirst()`.

- **near-closure:** `nearClosureRescue -> harvestThenFinish -> finishFirst -> perimeterSweep`, then templates.
- **high-intersection-burden:**
  - `reqInt >= POLICY.VERY_HIGH_REQINT (7)`: beam first; portal-dense (`portals >= 2`) leads `objectiveFirst`, otherwise `intersectionHarvest`; DFS fallback.
  - `navDensity >= POLICY.NEAR_HAMILTONIAN_DENSITY (0.82)`: DFS perimeter both directions; skip leading beams.
  - otherwise perimeter/objective beams first; long multi-gate (`reqLen >= 90 && gates >= 2`) gets budget floors; DFS prefers objectives when `mustPass >= 3`, CCW when `reqInt <= 4 && mustPass = 0`.
- **portal-heavy:** `portalFirstTransfer`, `portalCommitted`, then templates.
- **must-cross-heavy:**
  - `mustPass >= 3 && flippers >= 2`: diverse `intersectionHarvest` beam 5000, then DFS; 15000/50000 tiers were removed after zero-yield natural exhaustion.
  - `mustPass >= 3`: objective/must-cross beams first.
  - `mustCross >= 3 && mustPass >= 2`: beam first.
  - otherwise cornerHarvest/perimeterCW DFS, beams, DFS profiles.
- **default:** with `mustPass = 0`, CCW before CW; otherwise default template order, then profiles.

```js
const ATTEMPT_CONFIGS = [
  { profileName: 'perimeterSweep', template: TEMPLATES.cornerHarvest  },
  { profileName: 'perimeterSweep', template: TEMPLATES.perimeterCW    },
  { profileName: 'perimeterSweep', template: TEMPLATES.perimeterCCW   },
  { profileName: 'perimeterSweep', template: TEMPLATES.sideCommitment },
  ...PROFILE_ORDER.map(profileName => ({ profileName, template: null })),
];
// 16 total
```

The ladder is hand-tuned. Historical corpus1 analysis found 79% of solved-level time before the winning attempt; `navDensity` predicted repair wins only weakly. Re-test current corpus2 evidence before further hand-ordering. See [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md).

## DFS (`dfsFromGate`)

- Iterative with undo tokens; no recursion.
- `applyMove()` mutates/returns undo; `undoMove()` restores.
- LDS probes `k = 0,1,2,4,8`, then unbounded. Each wave has `probeCapMs = min(floor(levelBudgetMs*0.5), 4000)` plus deterministic node limits.
- Prunes: over-length/intersection, must-cross ceiling, goal distance, parity, MP/MC MST bounds, connectivity.
- `mustPassLowerBound`/`mustCrossLowerBound` memoize under `STRATEGY_LOWER_BOUND_MEMO`; keys must include every dependency. See MST bug below.

## Beam search (`beamSearchFromGate`)

- Parent-pointer frontier `{ key, prev, depth, score, sc, sk? }`.
- Reconstruction uses reusable `_scratch[]`; replay uses `_beamResetState()` + `applyMove()`.
- Uses DFS pruning; `scoreAndSort` uses `_sas[4]` `Float64Array` scratch + insertion sort.
- Default width 2000; hard width 5000.
- **Dedup:** equal `(key, sc)` keeps highest score; key = `c.key + c.sc * KEY_SPACE` as exact float64. Disabled for portals because `sc` omits portal usage.

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
- Must-cross+flipper fallback is diverse bw=5000.

## Key state

```js
state = {
  path: number[], visited: Uint16Array, edgeUsage: Uint8Array,
  ints: number, mustMask: number, mustCrossMask: number,
  crossCounts: Uint8Array, mpVisitedMask: number,
  portalJumps: number, flipperUsedMask: number,
  lastWasPortalJump: boolean, surroundMask: number,
  surroundNeighborRemainingMasks: Uint8Array,
  mustTurnMask: number, adjTurnMask: number,
}
```

`edgeUsage`: 1=H, 2=V.

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

## Ablation

57 togglable flags; see [`ablation.md`](ablation.md). Quick start: `ablation:baseline`, `ablation:single`, `ablation:analyze`.

`normalizeAblationConfig()` normalizes sparse external configs: supplied keys pass through, missing booleans read `true`, absent `ATTEMPT_ORDER`/`_randomSeed` stay `undefined`; null/absent keeps the fast path. `race.mjs` normalizes before `postMessage` because `Proxy` cannot cross workers.

## CLI and tooling

> Use esbuild-bundled CLIs, not raw `tsx`; hot solver paths are ~5× slower under raw `tsx`.

### `solver:bench` vs `solver:direct`

- `solver:bench -- --check`: solved/failed regression truth against `logs/solver-baseline.json` plus order probes. `--update-baseline` only for verified intentional change. Does **not** measure cost.
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

Audit rows include level/status/ok/elapsed/nodes/solvedBy and per-attempt gate/profile/template/beam/success/elapsed/budget/nodes.

Use `solver:direct` to inspect attempt order/winner/budget/nodes; if policy is at fault change `attempts.ts`, then rerun targets, full audit, `npm run ci`, and `solver:bench -- --check`. `audit:newhint:full` retains rolling history beside `logs/solver-workflow/latest.json` (`95 MB`, 4000 entries).

### Speed-only optimization

With wall-bounded runs, faster code searches farther. Pin a non-binding wall deadline and deterministic node/work budget; pure speed changes should produce identical search work. Compare interleaved wall medians; shared hosts vary ±5–10%. See [`reports/2026-07-30-solver-hot-path-pure-speed.md`](../reports/2026-07-30-solver-hot-path-pure-speed.md).

### Trap audits/runtime

```bash
npm run solver:trap-audit -- --levels=all --extended-budget=60000
npm run solver:trap-audit -- --check-false-goals --fg-budget=90000
```

False-goal timeouts are `inconclusive`, never invalid. `worker.js` handles `TRAP`; `solver-worker-client.ts` streams `TRAP_PROGRESS` (~100 ms) / `TRAP_RESULT`. `trap-scan-controller.ts` owns background parity/confirmed overlays, explicit scan/cancel/budget escalation, `editor.trapScanState = stale|scanning|done|partial|failed`, mutation invalidation via `clearEditorValidTrapSpots`, and main-thread fallback.

## Parallel Find-all enumeration (browser)

Complete-mode Find-all alone uses this pool; targeted tiers stay main-thread. See [`solve-button-variety.md`](solve-button-variety.md).

- One `(gate, root-child)` shard/job via `EnumOptions.rootChildren`; union tests prove coverage.
- Workers stream `ENUMERATE_PROGRESS`; PLAY validation/dedup stay main-thread in `createEnumerationPoolClient`.
- Protocol: `ENUMERATE`, cached `prepLevel()` by `levelKey`, progress/result/error, `CANCEL`.
- Pool size `navigator.hardwareConcurrency - 1`; `exhausted` requires every shard to exhaust without cap/cancel/node limit; return shape = `VarietyResult`.
- Pool failure falls back to main-thread complete search for the session; accumulated results survive 2,500 -> 5,000 continuation.

## Parallel attempt racing (backend only)

`scripts/solver-parallel/` races the same configured attempts/gates as sequential `solveLevel()`. First success wins; others terminate. Node-only, never browser-imported.

`race.mjs` exports `solveLevelRaced()` / `createRacePool()`; bundled workers reuse `prepLevel()`.

- Repair/main queues; up to `min(repairJobs.length, poolSize-1)` workers prefer repair then main.
- `budgetForMainJob`/`budgetForRepairJob` mirror sequential sharing, adjusted for worker waves; `minBudgetFraction` remains honored.
- CPU contention can make racing slower/change deadline outcomes.
- Raced-only benchmark output must never replace production regression truth.
- Persistent pools reuse workers across levels; broken/straggling workers are replaced. A short-sequential-then-race hybrid was reverted because shrinking `timeBudgetMs` changed attempt shares.

`stress:benchmark` defaults raced; `--engine=sequential` is production-exact; `--parallel` forces inner sequential mode. `stress:benchmark:raced` uses one persistent pool. `solver:bench`, `stress:regression`, `solver-fingerprint` remain sequential. 2026-07-10 first-50 corpus1: persistent pool kept 49/50 solves and cut 287,180 -> 272,536 ms (**5.1%**).

## Large-batch tools

| Tool | Engine | Use |
|---|---|---|
| `solver:bench -- --check` | sequential | solved-set regression truth |
| `stress:regression` / `solver:fingerprint` | sequential | baseline/determinism |
| `stress:benchmark` | raced default; sequential opt-in | corpus iteration/perf |
| `stress:benchmark:raced` | persistent race pool | raced-specific output |
| `solver:direct` | sequential | few-level debugging |
| `solver:req-length-sweep` | sequential | controlled `reqLen` scaling |
| `portfolio-solve-sweep.mjs` | configurable/resumable | repeated hard-population iteration |
| `repair-direct-probe.mjs` | direct repair | repair-only; bypasses ladder |

Across-level `--parallel` may beat within-level racing for mostly-fast levels; do not combine them in `stress:benchmark`. Long batch tools must persist per-level progress: benchmark partial output/`--skip-existing-dir`; portfolio JSONL/`--resume`. Use the cheapest population/budget that decides the gate; do not time competing CPU-bound arms concurrently.

## `--levels` syntax

Shared `level-data-io.mjs` parsers reject bare numeric ambiguity:

- `pos:<n>` / `pos:<a-b>`: 1-indexed position.
- `id:<n>` / `id:<a-b>`: ID suffix in ID-aware tools, including mixed S/R corpus1.
- full ID such as `R00237`: unambiguous.
- `all` / omitted: all.

Known gap: `stress:benchmark` assumes wrapped `{levels:[...]}` and crashes on bare-array corpora.

## Offline portfolio experiment

`opts.schedulerMode = 'portfolio-experiment'` is offline-only; live Play/Editor/Review/hint discovery use `'legacy'`. Best published 2026-07-12 variant was **1.51×** legacy with equal solves; a later repair-speed change moved a stress comparison from **0.57×** to **1.45×**, so portfolio results are not production-stable. See `reports/portfolio/portfolio-scheduler-decision.md` and 2026-07-16 reverification.

Tools: `solver:portfolio-report`, `solver:portfolio-replay`, `portfolio-solve-sweep.mjs`. The sweep supports JSONL `--resume`, mechanic filters, baseline/priority ordering, dependency-hashed negative `--attempt-cache`, child `--workers`, and `--race-pool-size`; legacy scheduler required for race pools, which are incompatible with `--node-budget`.

### Repair extra budget

`REPAIR_EXTRA_BUDGET_FRACTION = 6.0`; 30 s can add 180 s. `--node-budget` / top-level `repairBudgetFractionOverride` control it. Corpus1: fraction 0 cut ~51 -> ~18 min while losing six 35–115 s solves. **Testing/benchmarking uses 0; hint discovery keeps 6×; interactive 30 s UIs use 0.** Keep the override outside sparse `ablation`.

`repair-direct-probe.mjs` calls `repairSearchFromGate` directly; `--races=N` runs salted restarts, `seedSalt` default 0.

## Memory / hot path

- **Flattening done:** MP/MC caches, `staticNeighbors -> staticNeighborKeys`, flipper approach distances, `mustTurnCellIndex`, `gateSet -> gateFlags`; removed `objectiveKeyToIndex`. Multi-value `adjTurnCellIndex`/`surroundNeighborIndex` remain Maps.
- **Allocation:** `buildCurUrgencyContext` pooling won ~11–12% full-corpus wall; `UndoToken` pooling was **4.6% slower** at identical nodes and is closed absent a contrary microbenchmark. `getNeighbors` scratch / beam-phase allocations remain measurable.
- **Dense indexing:** cache-locality hypothesis was weak (15×15 456 vs 449 ms), but allocation cost was large. Distance arrays now use `gridW*gridH` via `denseIndex`; with state reuse/zero-absent encoding, batch work improved ~40%. Bounds guard saw **1.63B reads, zero violations**. Still sparse: `staticNeighborKeys`, state `visited`/`edgeUsage`, `buildIndexArr`, `gateFlags`/`reachBlockedArr`; convert only with per-site audit/guards.

## Wall-clock-gated probes

Top-level `orchestration.ts` still derives attempt shares from remaining wall time; same-code/config/budget/seed provenance groups historically differed in `nodesExpanded` 84.2% of the time (median 3.18×). See [`solver-budget-determinism.md`](solver-budget-determinism.md).

- `runRepairProbe`: calibrated `REPAIR_PROBE_ORDINARY_NODE_BUDGET` / `_BIASED_NODE_BUDGET` plus outer ms cap; prior pure wall race changed winners. Landed `92f6bf9` after repeated fingerprints/regression/CI.
- `dfsFromGateLDS`: feature-scaled `getLdsProbeNodeBudget` + `probeCapMs`, accumulating nodes across waves. Calibration covered 144/156 published probe solves and 71/150 stress; hardest published case 1,926,137 nodes with ~1.64× headroom.

## Attraction-diversity pass

After main + repair fail, `solveLevel()` may rerun `mainConfigs` with `ATTRACTION_DIVERSITY_CANDIDATE_FLAGS` (currently `SCORE_GOAL_ATTRACTION`) disabled under `ATTRACTION_DIVERSITY_BUDGET_FRACTION = 1.0`.

- `attractionDiversityBudgetFractionOverride`; interactive UIs set 0 along with repair extra budget.
- Gate: `STRATEGY_ATTRACTION_DIVERSITY`; zero cost to earlier solves.
- Historical validation: 4/4 predicted rescues, 2/2 controls unchanged, 3/30 gain in `dfs-plain` sample. See [`reports/2026-07-16-phase-d-attraction-diversity-implementation.md`](../reports/2026-07-16-phase-d-attraction-diversity-implementation.md).

## Admissible-order node reserve

Time fractions cannot protect a last tier from cumulative `nodeBudget`. `ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION = 0.25` withholds early-tier nodes via `earlyTierNodeBudget`; admissible-order then sees the full external ceiling.

- Only finite node budgets when the tier will run; reserve/run predicates must match.
- `nodeBudgetReached` reports early-tier truncation even if final total < external cap.
- 2026-07-30 20M-node corpus2 target: participation 73/141 -> 141/141, **+21 net** (22 gained, 1 lost), referee-valid `ida:*`.
- Earlier `ida:default` may consume reserve before a later winner; no sub-slicing because it won 21/22 gains.
- Flags: `--admissible-order-budget-fraction`, `--admissible-order-node-reserve-fraction`, `--disable-extra-budget-passes`; race pool does not support this tier/node budget.

Report: [`reports/2026-07-30-admissible-order-node-reserve.md`](../reports/2026-07-30-admissible-order-node-reserve.md).

## AI/manual diagnosis

[`ai-assisted-manual-solving.md`](ai-assisted-manual-solving.md): useful human/AI input is a canonically accepted path for differential diagnosis against solver trace, not narrative strategy. Manual provenance needs a distinct solver ID, never `SOLVER_ID`/`HUMAN_PLAYER_ID`.

## Remaining speed work

Measurable: `getNeighbors` scratch reuse, beam-phase allocation cleanup, remaining dense-array conversions with safety guards. `UndoToken` pooling is closed negative. Current solver priority belongs in [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).

## MST-bound scratch-buffer bug

`_mstEdges` assumed “max 6 nodes,” but must-turn landmarks also enter `mustPassKeys`. TypedArray OOB writes silently no-op, leaving stale data and producing an invalid bound (**34 vs correct 27** in one stress case), allowing false prune. Fixed in `ed6c9e6`/`3424772` with fallback sizing + correctly keyed must-cross caching; independently checked on ~30,000 states. See `data/stress/README.md`. New memoization/buffer reuse needs comparable differential soundness evidence.

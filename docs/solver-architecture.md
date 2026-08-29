# Solver Architecture

`modules/solver.ts` is the public facade over `modules/solver/*`. This doc covers solution generation; hint display/cycling: [`hint-curation.md`](hint-curation.md).

> **Level-blind:** strategy may use mechanics/current state (`reqInt`, `requiredPathCoverageRatio`, counts, gates, `reqLen`, etc.), never level identity. `check:no-solver-level-numbers` enforces this.
>
> **Corpus caveat:** before stress pass-rate tuning, read [`data/stress/README.md`](../data/stress/README.md), especially “Corpus 1: hypothesis-driven.” Some batches target historical weaknesses and are not independent generalization evidence.

Technique/config names do not by themselves imply distinct search behavior. See [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md) when comparing scoring profiles, structural ordering biases, beam retention modes, admissible-order, repair, retries, or budget contexts.

## Core flow

1. `normalizeRawLevel()` converts 1-indexed wire data to 0-indexed packed-key form.
2. `prepLevel()` builds distances, adjacency, masks, indexes.
3. `solveLevel()` runs gates × attempt configs through DFS/beam plus later tiers.
4. `validateCandidatePath()` performs canonical validation.
5. Return `{ ok, solution, attempts, totalMs }`.

## Attempt configs

`getAttemptConfigs(level)` returns:

```js
{ scoringProfileId, orderingBias: Object|null, beamWidth?, minBudgetFraction?, mechanicBucketRetention? }
```

`beamWidth` selects beam; otherwise DFS. `minBudgetFraction` protects critical configs from dilution.

### Routing regimes (`classifyRoutingRegime`)

1. **sparse-low-intersection:** `reqInt <= 1 && requiredPathCoverageRatio < 0.35`.
2. **intersection-heavy:** `(reqInt>=5 && requiredPathCoverageRatio>=0.45) || (reqInt>=4 && requiredPathCoverageRatio>=0.55) || reqInt>=10`.
3. **must-cross-heavy:** `mustCrossKeys.length >= 2 && reqInt >= 2`.
4. **multi-portal:** `portalMap.size >= 4`.
5. **general**.

`requiredPathCoverageRatio = reqLen / nonGateWinningPathCellCount`, where `nonGateWinningPathCellCount = w*h - blocks - geese - falseGoals - gates`.

### Attempt policy

`modules/solver/attempts.ts` is authoritative: first-match-wins `ATTEMPT_POLICY` over `LevelFeatures`, thresholds in `POLICY.*`, bundles from `dfs()`/`beam()`/`profilesFirst()`.

- **sparse-low-intersection:** `nearClosureRescue -> harvestThenFinish -> finishFirst -> perimeterSweep`, then structural ordering biases.
- **intersection-heavy:**
  - `reqInt >= POLICY.VERY_HIGH_REQINT (7)`: beam first; portal-dense (`portals >= 2`) leads `objectiveFirst`, otherwise `intersectionHarvest`; DFS fallback.
  - `requiredPathCoverageRatio >= POLICY.NEAR_HAMILTONIAN_COVERAGE_THRESHOLD (0.82)`: DFS perimeter both directions; skip leading beams.
  - otherwise perimeter/objective beams first; long multi-gate (`reqLen >= 90 && gates >= 2`) gets budget floors; DFS prefers objectives when `mustPass >= 3`, CCW when `reqInt <= 4 && mustPass = 0`.
- **multi-portal:** `portalFirstTransfer`, `portalCommitted`, then structural ordering biases.
- **must-cross-heavy:**
  - `mustPass >= 3 && flippers >= 2`: mechanic-bucket-retaining `intersectionHarvest` beam 5000, then DFS; 15000/50000 tiers were removed after zero-yield natural exhaustion.
  - `mustPass >= 3`: objective/must-cross beams first.
  - `mustCross >= 3 && mustPass >= 2`: beam first.
  - otherwise cornerHarvest/perimeterCW DFS, beams, DFS profiles.
- **default:** with `mustPass = 0`, CCW before CW; otherwise default structural-ordering-bias order, then scoring profiles.

```js
const ATTEMPT_CONFIGS = [
  { scoringProfileId: 'perimeterSweep', orderingBias: STRUCTURAL_ORDERING_BIASES.cornerHarvest  },
  { scoringProfileId: 'perimeterSweep', orderingBias: STRUCTURAL_ORDERING_BIASES.perimeterCW    },
  { scoringProfileId: 'perimeterSweep', orderingBias: STRUCTURAL_ORDERING_BIASES.perimeterCCW   },
  { scoringProfileId: 'perimeterSweep', orderingBias: STRUCTURAL_ORDERING_BIASES.sideCommitment },
  ...SCORING_PROFILE_ORDER.map(scoringProfileId => ({ scoringProfileId, orderingBias: null })),
];
// 16 total
```

The ladder is hand-tuned. Historical corpus1 analysis found 79% of solved-level time before the winning attempt; `requiredPathCoverageRatio` predicted repair wins only weakly. Re-test current corpus2 evidence before further hand-ordering. See [`archive/snapshots/solver-improvement-research-notes.md`](archive/snapshots/solver-improvement-research-notes.md).

## DFS (`dfsFromGate`)

- Iterative with undo tokens; no recursion.
- `applyMove()` mutates/returns undo; `undoMove()` restores.
- LDS probes `k = 0,1,2,4,8`, then unbounded. Each wave also honors deterministic node/work limits and the outer deadline.
- Prunes: over-length/intersection, must-cross ceiling, goal distance, parity, MP/MC MST bounds, connectivity.
- `mustPassLowerBound`/`mustCrossLowerBound` memoize under `STRATEGY_LOWER_BOUND_MEMO`; keys must include every dependency. See MST bug below.

## Beam search (`beamSearchFromGate`)

- Parent-pointer frontier nodes store `{ key, prev, depth, score, ...constraintState, insOrd, treeOrd }`. The constraint-state scalars (`ints`, MP/MC/flipper/surround/must-turn/adj-turn masks) are snapshotted only so coarse-state merging and mechanic-bucket retention can key candidates without eagerly constructing strings.
- One mutable working state `ws` is moved between frontier nodes: `_reconstructBeamPath()` fills reusable scratch, then the solver undoes/replays only the divergent suffix from the currently loaded path.
- Frontier walking is parent-tree ordered to reduce replay. `insOrd` restores the generation order that score-order walking would have produced before coarse-state merge/width selection; mid-phase terminal/budget checks still occur in tree order.
- Uses DFS pruning; `scoreAndSort` uses `_sas[4]` `Float64Array` scratch + insertion sort.
- Default width 2000; hard width 5000.
- **Coarse state merge:** non-portal beams merge the deliberately coarse tuple `(key, ints, mpVisitedMask, mustCrossMask, flipperUsedMask, surroundMask, mustTurnMask, adjTurnMask)`, keeping the highest score plus an optional near-tie runner-up. This is width/retention management, not exact future-state equivalence. The tuple normally uses a per-level mixed-radix numeric fast path and falls back to an exact delimited string when the composed product is unsafe. **Known schema-boundary defect:** the current flipper radix is still computed with an int32 shift, so schema-valid 31/32-flipper levels do not have the intended collision-free numeric guarantee; see [`solver-correctness-hardening.md`](solver-correctness-hardening.md). Current published/stress corpora are below that boundary. The representation is intended as a pure speed choice; merge semantics are unchanged.

  The older fixed-width numeric packing was removed after real Corpus-2 masks exceeded four bits and corrupted adjacent fields. The 2026-08-23 design replaced it with per-level mixed-radix bases plus a string fallback, but the current flipper-base implementation has the 31/32 edge defect above. Exact beam-state deduplication was separately measured at only ~0.019% true-duplicate slots; removing the coarse mechanism cost real solves. See [`../reports/2026-08-06-beam-state-dedup-sound-signature-audit.md`](../reports/2026-08-06-beam-state-dedup-sound-signature-audit.md) and [`../reports/2026-08-23-beam-dedup-numeric-key-arena.md`](../reports/2026-08-23-beam-dedup-numeric-key-arena.md).
- **Mechanic-bucket retention:** `_mechanicBucketSelect` buckets by `(flipperUsedMask, mustCrossMask)` and guarantees `floor(beamWidth/numBuckets)` per bucket before filling globally. Its positional numeric fast path shares the same 31/32-flipper radix defect; see [`solver-correctness-hardening.md`](solver-correctness-hardening.md).
- Must-cross+flipper fallback uses mechanic-bucket retention at width 5000.

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
- `cellDenseIndex`: packed key -> dense live-cell row + 1 (`0` means no live non-block/non-goose cell).
- `staticNeighborKeys`: flat fixed-stride `Int32Array` sized `liveCellCount * 4`; `staticNeighborKeys[(cellDenseIndex[packedKey]-1)*4+d]` stores `neighborKey+1`, with 0 meaning no static neighbor. It excludes blocks/geese/false-goals/gates/wrong regular-filter axis. This replaces the former `KEY_SPACE * 4` adjacency allocation without changing neighbor semantics. See [`../reports/2026-08-23-dense-static-neighbor-keys.md`](../reports/2026-08-23-dense-static-neighbor-keys.md).
- `mustPassIndex`, `mustCrossIndex`, `flipperIndexMap`, `flipperInitAxes`.
- `mcPairDist`, `mpPairDist`, `mcApproachDistMaps`.
- `surroundNeighborIndex`, `surroundInitNeighborMasks`, `surroundNeighborDistMaps`.
- `mustTurnCellIndex`, `mustTurnDirs`, `adjTurnDistMaps`.
- `mustMaskForDFS`: `initialMustMask`, or 0 for `requiredPathCoverageRatio >= DENSE_LEVEL_COVERAGE_THRESHOLD`.
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

The feature registry lives in `modules/solver/ablation-config.ts`; see [`solver-ablation.md`](solver-ablation.md). Quick start: `ablation:baseline`, `ablation:single`, `ablation:analyze`.

`normalizeAblationConfig()` normalizes sparse external configs: supplied keys pass through, missing booleans read `true`, absent `ATTEMPT_ORDER`/`_randomSeed` stay `undefined`; null/absent keeps the fast path. `race.mjs` normalizes before `postMessage` because `Proxy` cannot cross workers.

## CLI and tooling

> Use esbuild-bundled CLIs, not raw `tsx`; hot solver paths are ~5× slower under raw `tsx`.

### `solver:bench` vs `solver:direct`

- `solver:bench -- --check`: solved/failed regression truth against `logs/solver-baseline.json` plus order probes. `--update-baseline` only for verified intentional change. Does **not** measure cost.
- `solver:direct`: debugging with `--verbose`/structured `--output`; no baseline comparison.

```bash
npm run solver:direct -- --levels=pos:133,pos:146 --budget-ms=30000 --output=logs/solver-direct/out.json
npm run solver:direct -- --levels=all --budget-ms=30000 --output=logs/solver-direct/full.json
npm run check:audit-output -- logs/solver-direct/full.json
```

| Flag | Default | Meaning |
|---|---|---|
| `--levels=pos:1,pos:2` / `all` | all | Explicit selectors; bare numbers rejected. |
| `--budget-ms=30000` | 30000 | Per-level time budget. |
| `--output=...` | none | JSON report. |
| `--verbose` | off | Per-attempt logs. |

Audit rows include level/status/ok/elapsed/nodes/solvedBy and per-attempt gate/scoring-profile/ordering-bias/beam/success/elapsed/budget/nodes.

Use `solver:direct` to inspect attempt order/winner/budget/nodes; if policy is at fault change `attempts.ts`, then rerun targets, full audit, `npm run ci`, and `solver:bench -- --check`. `audit:newhint:full` retains rolling history beside `logs/solver-workflow/latest.json` (`95 MB`, 4000 entries).

### Speed-only optimization

With wall-bounded runs, faster code searches farther. Pin a non-binding wall deadline and deterministic node/work budget; an order-preserving pure speed change should produce identical search work. Compare interleaved wall medians; shared hosts vary ±5–10%. See [`reports/2026-07-30-solver-hot-path-pure-speed.md`](../reports/2026-07-30-solver-hot-path-pure-speed.md) and [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md).

### False-goal triggerability audits/runtime

```bash
npm run solver:audit-false-goal-triggerability -- --levels=all --extended-budget=60000
npm run solver:audit-false-goal-triggerability -- --check-false-goals --fg-budget=90000
```

False-goal timeouts are `inconclusive`, never invalid. `worker.js` handles `FALSE_GOAL_TRIGGER_SEARCH`; `solver-worker-client.ts` streams `FALSE_GOAL_TRIGGER_SEARCH_PROGRESS` / `FALSE_GOAL_TRIGGER_SEARCH_RESULT`. `false-goal-trigger-scan-controller.ts` owns background parity/confirmed overlays, explicit scan/cancel/budget escalation, `editor.falseGoalTriggerScanState = stale|scanning|complete|partial|failed`, mutation invalidation via `clearEditorTriggerableFalseGoalCells`, and main-thread fallback.

## Parallel Find-all enumeration (browser)

Complete-mode Find-all alone uses this pool; targeted tiers stay main-thread. See [`hint-variety-search.md`](hint-variety-search.md).

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

For isolated method research, prefer `method-probe.mjs --work-budget=<units>` with a generously non-binding `--budget-ms`. The work ceiling is cumulative across the level just like its node ceiling; a row whose wall deadline binds first is marked `deadlineTruncated` and the work-bounded run exits non-zero. Omit `--work-budget` only when the question is deliberately about historical wall-bounded behavior.

## `--levels` syntax

Shared `level-data-io.mjs` parsers reject bare numeric ambiguity:

- `pos:<n>` / `pos:<a-b>`: 1-indexed position.
- `id:<n>` / `id:<a-b>`: ID suffix in ID-aware tools, including mixed S/R corpus1.
- full ID such as `R00237`: unambiguous.
- `all` / omitted: all.

`stress:benchmark` accepts both wrapped `{levels:[...]}` corpora and bare-array corpora.

## Offline portfolio experiment

`opts.schedulerMode = 'legacy-latency-portfolio-experiment'` is offline-only; live Play/Editor/Review/hint discovery use `'production'`. Its `pass1Ms`/`pass2Ms`/`pass3Ms` policy is explicitly a **legacy wall-clock scheduler experiment**, useful for historical latency/architecture questions but not machine-independent equal-work evidence. Best published 2026-07-12 variant was **1.51×** legacy with equal solves; a later repair-speed change moved a stress comparison from **0.57×** to **1.45×**, illustrating exactly why elapsed-time thresholds are host/implementation sensitive. New scheduler research should use work quanta rather than extending this ms policy. See `reports/portfolio/portfolio-scheduler-decision.md` and 2026-07-16 reverification.

Tools: `solver:portfolio-report`, `solver:portfolio-replay`, `portfolio-solve-sweep.mjs`. The sweep supports JSONL `--resume`, mechanic filters, baseline/priority ordering, dependency-hashed negative `--attempt-cache`, child `--workers`, and `--race-pool-size`; legacy scheduler required for race pools, which are incompatible with `--node-budget`.

### Repair extra budget

`REPAIR_EXTRA_BUDGET_FRACTION = 6.0`; 30 s can add 180 s. `--node-budget` / top-level `repairBudgetFractionOverride` control it. Corpus1: fraction 0 cut ~51 -> ~18 min while losing six 35–115 s solves. **Testing/benchmarking uses 0; hint discovery keeps 6×; interactive 30 s UIs use 0.** Keep the override outside sparse `ablation`.

`repair-direct-probe.mjs` calls `repairSearchFromGate` directly; `--races=N` runs salted restarts, `seedSalt` default 0. `--work-budget=<n>` instead runs `restart-continuation-harness.ts`'s equal-canonical-`workSpent` continuation-vs-restart comparison (seed 0 to `n`, versus seed 0 to `n/2` then, only on failure, fresh seed 1 for the remainder) — see [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) item 0 and the 2026-08-24 restart-continuation-value audit; mutually exclusive with `--races`.

## Memory / hot path

- **Flattening done:** MP/MC caches, `staticNeighbors -> staticNeighborKeys`, flipper approach distances, `mustTurnCellIndex`, `gateSet -> gateFlags`; removed `objectiveKeyToIndex`. Multi-value `adjTurnCellIndex`/`surroundNeighborIndex` remain Maps.
- **Allocation:** `buildCurUrgencyContext` pooling won ~11–12% full-corpus wall; `UndoToken` pooling was **4.6% slower** at identical nodes and is closed absent a materially different representation. `getNeighbors` scratch / beam-phase allocations remain measurable.
- **Dense indexing:** cache-locality hypothesis was weak (15×15 456 vs 449 ms), but allocation cost was large. Distance arrays use `gridW*gridH` via `denseIndex`; `staticNeighborKeys` now uses `liveCellCount*4` via `cellDenseIndex`, removing the former 16.8 MB per-level adjacency allocation while preserving packed-key neighbor values. With state reuse/zero-absent encoding, prior batch work improved ~40%; the adjacency conversion adds a further measured speed win, strongest on many-quick-solves workloads. Still packed-key-indexed: state `visited`/`edgeUsage`, `buildIndexArr`, `gateFlags`/`reachBlockedArr`.
- Architecture-level continuations, prior negatives, and evaluation rules: [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md).

## Work-budget determinism

Solver allocation's target currency is machine-independent work `applyMove + 12 * isConnected`. The main ladder already divides work, not elapsed milliseconds. A finite inventoried set of additive legacy tiers still derives fresh work from ms-shaped stage fractions; `check:solver-budget-boundaries` prevents that debt from growing while it is migrated. Internal search loops may also honor technique/node caps. See [`solver-budget-determinism.md`](solver-budget-determinism.md).

## Goal-attraction-disabled retry

`goal-attraction-disabled-retry` runs after `main-search` and `repair-fallback` fail. `solveLevel()` reruns `mainConfigs` with `GOAL_ATTRACTION_DISABLED_RETRY_CANDIDATE_FLAGS` (currently `SCORE_GOAL_ATTRACTION`) disabled under `GOAL_ATTRACTION_DISABLED_RETRY_BUDGET_FRACTION = 1.0`.

- `goalAttractionDisabledRetryBudgetFractionOverride` (`attractionDiversityBudgetFractionOverride` is a deprecated compatibility alias, dual-read only); interactive UIs set 0 along with repair extra budget.
- Gate: `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY`; zero cost to earlier solves.
- Historical validation: 4/4 predicted rescues, 2/2 controls unchanged, 3/30 gain in `dfs-plain` sample. See [`reports/2026-07-16-phase-d-attraction-diversity-implementation.md`](../reports/2026-07-16-phase-d-attraction-diversity-implementation.md).

## Admissible-order node reserve

Time fractions cannot protect a last tier from cumulative `nodeBudget`. `ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION = 0.25` withholds early-tier nodes via `earlyTierNodeBudget`; admissible-order then sees the full external ceiling.

- Only finite node budgets when the tier will run; reserve/run predicates must match.
- `nodeBudgetReached` reports early-tier truncation even if final total < external cap.
- 2026-07-30 20M-node corpus2 target: participation 73/141 -> 141/141, **+21 net** (22 gained, 1 lost), referee-valid admissible-order attempts.
- Earlier `admissible-order|tieBreak=default|lds=off` may consume reserve before a later winner; no sub-slicing because it won 21/22 gains.
- Flags: `--admissible-order-budget-fraction`, `--admissible-order-node-reserve-fraction`, `--disable-extra-budget-passes`; race pool does not support this tier/node budget.

Report: [`reports/2026-07-30-admissible-order-node-reserve.md`](../reports/2026-07-30-admissible-order-node-reserve.md).

## AI/manual diagnosis

[`archive/snapshots/ai-assisted-manual-solving.md`](archive/snapshots/ai-assisted-manual-solving.md): useful human/AI input is a canonically accepted path for differential diagnosis against solver trace, not narrative strategy. Manual provenance needs a distinct solver ID, never `SOLVER_ID`/`HUMAN_PLAYER_ID`.

## Remaining speed work

See [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md) for the current architecture-level list and closed negatives. The shortest known open forms are `getNeighbors` allocation removal, beam-phase representation/allocation cleanup, and completing dense indexing with safety guards. Current solve-capability priority belongs in [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).

## MST-bound scratch-buffer bug

`_mstEdges` assumed “max 6 nodes,” but must-turn landmarks also enter `mustPassKeys`. TypedArray OOB writes silently no-op, leaving stale data and producing an invalid bound (**34 vs correct 27** in one stress case), allowing false prune. Fixed in `ed6c9e6`/`3424772` with fallback sizing + correctly keyed must-cross caching; independently checked on ~30,000 states. See `data/stress/README.md`. New memoization/buffer reuse needs comparable differential soundness evidence.
# Solver Architecture

`modules/Solver.ts` is a thin public facade over `modules/solver/*`. This document covers solution generation; stored-hint display/cycling is separate: [`hint-curation.md`](hint-curation.md).

> **Level-blind policy:** strategy may use features (`reqInt`, `navDensity`, mechanic counts, gates, `reqLen`, current state), never level identity. `check:no-solver-level-numbers` enforces this in solver source/docs.
>
> **Corpus caveat:** before corpus-pass-rate tuning, read [`data/stress/README.md`](../data/stress/README.md) “Batches.” Some stress batches were designed around known historical weaknesses and are not independent generalization evidence.

## Core Flow

1. `normalizeRawLevel()` -> 1-indexed wire format to 0-indexed packed-key representation.
2. `prepLevel()` -> distances, adjacency, masks, indexes.
3. `solveLevel()` -> gates × attempt configs; each attempt runs DFS or beam.
4. `validateCandidatePath()` -> canonical rule validation.
5. Return `{ ok, solution, attempts, totalMs }`.

## Attempt Configs

`getAttemptConfigs(level)` returns configs shaped as:

```js
{ profileName, template: Object|null, beamWidth?, minBudgetFraction?, diverseBeam? }
```

`beamWidth` selects beam; otherwise DFS. `minBudgetFraction` protects critical configs from budget dilution.

### Archetypes (`detectArchetype`)

Priority order:

1. **near-closure:** `reqInt <= 1 && navDensity < 0.35`.
2. **high-intersection-burden:** `(reqInt>=5 && density>=0.45) || (reqInt>=4 && density>=0.55) || reqInt>=10`.
3. **must-cross-heavy:** `mustCrossKeys.length >= 2 && reqInt >= 2`.
4. **portal-heavy:** `portalMap.size >= 4`.
5. **default**.

`navDensity = reqLen / navArea`, where `navArea = w*h - blocks - geese - falseGoals - gates`.

### Attempt policy

`modules/solver/attempts.ts` is authoritative: ordered first-match-wins `ATTEMPT_POLICY` rules over `LevelFeatures`, with thresholds in documented `POLICY.*` constants and bundles built from `dfs()`/`beam()`/`profilesFirst()`.

- **near-closure:** `nearClosureRescue -> harvestThenFinish -> finishFirst -> perimeterSweep`, then templates.
- **high-intersection-burden:**
  - `reqInt >= POLICY.VERY_HIGH_REQINT (7)`: beam first; portal-dense (`portals >= 2`) leads `objectiveFirst`, otherwise `intersectionHarvest`; DFS fallback.
  - `navDensity >= POLICY.NEAR_HAMILTONIAN_DENSITY (0.82)`: skip leading beams; DFS perimeter both directions.
  - otherwise: perimeter/objective beams first; long multi-gate (`reqLen >= 90 && gates >= 2`) gets budget floors; DFS order prefers objectives when `mustPass >= 3`, CCW when `reqInt <= 4 && mustPass = 0`.
- **portal-heavy:** `portalFirstTransfer`, `portalCommitted`, then templates.
- **must-cross-heavy:**
  - `mustPass >= 3 && flippers >= 2`: diverse `intersectionHarvest` beam 5000, then DFS; repair early probe now solves nearly all before this loop. Beam 15000/50000 tiers were removed after isolated zero-yield natural exhaustion.
  - `mustPass >= 3`: objective/must-cross beams first.
  - `mustCross >= 3 && mustPass >= 2`: beam first.
  - otherwise: cornerHarvest/perimeterCW DFS, then beams, then DFS profiles.
- **default:** with `mustPass = 0`, CCW template before CW; otherwise default template order, then all profiles.

Default template list:

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

The ladder is hand-tuned, not mined. [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md) found 79% of solve time on solved corpus1 levels occurred before the winning attempt (75–86% for must-cross-heavy/high-intersection); `navDensity` predicts repair wins better than chance but not strongly enough for policy. Re-test with corpus2 evidence before further hand-ordering.

## DFS (`dfsFromGate`)

- Iterative DFS with undo tokens; no recursion.
- `applyMove()` mutates state and returns an undo token; `undoMove()` restores it.
- LDS probes `k = 0,1,2,4,8`, then unbounded. Each probe wave has `probeCapMs = min(floor(levelBudgetMs*0.5), 4000)` plus the deterministic node budget described under wall-clock probes. A flat time floor was tested and reverted because no value fixed one budget-dilution failure without creating another deterministic failure; see `data/stress/README.md`.
- Prunes: over-length, over-intersection, must-cross ceiling, goal-distance, parity, MP/MC MST lower bounds, connectivity.
- `mustPassLowerBound`/`mustCrossLowerBound` are memoized under `STRATEGY_LOWER_BOUND_MEMO`. Keys must encode every state dependency; must-cross needs more than `(pos, mask)`. An unsound MST scratch/cache bug previously produced an invalid tighter bound; see “MST-bound scratch-buffer bug” below.

## Beam Search (`beamSearchFromGate`)

- Parent-pointer frontier `{ key, prev, depth, score, sc, sk? }`.
- Reconstructs into reusable `_scratch[]`; replay uses `_beamResetState()` + `applyMove()`.
- Uses DFS pruning.
- `scoreAndSort` uses module `_sas[4]` `Float64Array` scratch + insertion sort.
- Default width 2000; hard-level width 5000.
- **State dedup:** merge candidates with equal `(key, sc)`, keeping highest score. Key: `c.key + c.sc * KEY_SPACE` as exact float64. Disabled for portal levels because `sc` omits portal usage.

```js
sc = (adjTurnMask&0xF)<<24 |
     (mustTurnMask&0xF)<<20 |
     (surroundMask&0xF)<<16 |
     (flipperUsedMask<<12) |
     (mustCrossMask<<8) |
     (mpVisitedMask<<4) |
     (ints&0xF)
```

- **Diverse beam:** `_diverseSelect` buckets by `sk = (flipperUsedMask<<4)|(mustCrossMask&0xF)`, guarantees `floor(beamWidth/numBuckets)` per bucket, then fills globally. Prevents collapse to one constraint mode.
- Must-cross+flipper-heavy fallback is diverse bw=5000. Former 15000/50000 tiers were removed after the widest naturally exhausted with zero solves on the target archetype.

## Key State

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

## `prepLevel()` Data

- `distMap`: BFS Map from goal.
- `goalDistArr`: typed-array goal distance; typed distance sentinel `0xFFFF = unreachable/Infinity`.
- `mpDistArrs[]`, `mcDistArrs[]`, `objDistArrs[]`: objective distances.
- `staticNeighbors`: precomputed valid `[nk, axis, ...]`, excluding blocks/geese/false-goals/gates/wrong regular-filter axis.
- `mustPassIndex`, `mustCrossIndex`: bitmask indexes.
- `flipperIndexMap`, `flipperInitAxes`: flipper state.
- `mcPairDist`, `mpPairDist`: MST pair distances.
- `mcApproachDistMaps`: must-cross second-visit approach distances.
- `surroundNeighborIndex`, `surroundInitNeighborMasks`, `surroundNeighborDistMaps`.
- `mustTurnCellIndex`, `mustTurnDirs`.
- `adjTurnDistMaps`.
- `mustMaskForDFS`: `initialMustMask`, or 0 for `navDensity >= DENSE_LEVEL_NAV_DENSITY`.
- `hasLandmarkConstraints`: fast-path boolean.

## Encoding

```js
PACK(x, y)  = ((y << 16) | x) >>> 0
UNPACK(k)   = { x: k & 0xFFFF, y: (k >>> 16) & 0xFFFF }
KEY_SPACE   = 1 << 20
AXIS_H = 1
AXIS_V = 2
AXIS_NONE = 0
```

## Ablation Laboratory

57 togglable feature flags; see [`ablation.md`](ablation.md). Quick start: `npm run ablation:baseline`, `npm run ablation:single`, `npm run ablation:analyze`.

Sparse external `ablation` objects are normalized by `normalizeAblationConfig()` in `orchestration.ts`: caller keys pass through, missing boolean flags read `true`, while absent `ATTEMPT_ORDER`/`_randomSeed` remain `undefined`. `null`/absent config keeps the byte-identical fast path. This fixed the 2026-07-18 bug where sparse objects disabled every omitted strategy. `race.mjs` must normalize on its own side of `postMessage` because `Proxy` cannot cross worker boundaries.

## CLI and Tooling

> **Use the esbuild-bundled CLI, not raw `tsx`.** `solver:direct` and `solver:bench` run through `scripts/run-bundled.mjs`; the hot path is ~5× slower under raw `tsx`. Production was unaffected because Vite/esbuild bundles it.

### `solver:bench` vs `solver:direct`

- **`solver:bench -- --check`:** regression gate against `logs/solver-baseline.json`; solved/failed set plus order probes. Use `--update-baseline` only for verified intentional improvement. It does not measure cost.
- **`solver:direct`:** debugging; supports `--verbose` and structured `--output`, no baseline comparison.

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

Use `solver:direct` on the target selector, inspect attempt order, winning config, budget use, and nodes, then modify `modules/solver/attempts.ts` if policy is the issue. Re-run targeted cases, then full audit, `npm run ci`, and `solver:bench -- --check` before completion claims.

`npm run audit:newhint:full` keeps rolling causality history beside `logs/solver-workflow/latest.json` (`HISTORY_MAX_BYTES = 95 MB`, `HISTORY_MAX_ENTRIES = 4000`).

### Speed-only optimization (`solver:speed-probe`)

Wall-clock-bounded runs make a faster solver expand more nodes, so node counts are not comparable. Pin a generous non-binding wall deadline and a deterministic `--node-budget`/work budget; a true speed-only change must produce bit-identical search work, while wall time carries the speed signal. Compare interleaved medians; single shared-host runs vary ±5–10%. This method caught an order bug missed by 6.6M differential comparisons. See [`reports/2026-07-30-solver-hot-path-pure-speed.md`](../reports/2026-07-30-solver-hot-path-pure-speed.md).

### Trap-spot / false-goal audits

```bash
npm run solver:trap-audit -- --levels=all --extended-budget=60000
npm run solver:trap-audit -- --check-false-goals --fg-budget=90000
```

False-goal timeouts are `inconclusive`, never invalid. Parity resolves most; a goal-directed solve can prove reachability more cheaply than full enumeration.

### Editor trap-scan runtime

“Trap” here means false-goal trap spots, not accessibility focus traps.

`worker.js` handles `TRAP`; `solver-worker-client.ts` sends normalized levels and receives `TRAP_PROGRESS` batches (~100 ms flush) plus `TRAP_RESULT`. `trap-scan-controller.ts` manages:

- background scan when the false-goal tool is selected, with instant faint parity candidates and streamed confirmed spots;
- explicit Trap Spots scan with overlay/cancel and budget escalation via `computeTrapRetryBudget` on rerun;
- `editor.trapScanState`: `stale|scanning|done|partial|failed`; any level mutation calls `clearEditorValidTrapSpots`, invalidating/cancelling stale work;
- cooperative main-thread fallback if workers fail.

## Parallel “Find all” Enumeration (Browser Production Path)

Only complete-mode Find-all uses this pool; targeted tiers remain main-thread because their bottleneck is curation, not raw DFS. See [`solve-button-variety.md`](solve-button-variety.md).

- **Partition, do not race:** one `(gate, root-child)` shard per job. `EnumOptions.rootChildren` restricts complete DFS root children. Same-gate shards cannot share a path signature because they differ at cell 1. “Union of shards” tests prove coverage.
- Workers stream raw candidates in `ENUMERATE_PROGRESS`; PLAY validation/dedupe remain on the main thread in `createEnumerationPoolClient`, preserving the same save invariant as `variety-search.ts`.
- Worker protocol: `ENUMERATE`, cached `prepLevel()` per `levelKey`, `ENUMERATE_PROGRESS`/`RESULT`/`ERROR`, existing `CANCEL` mechanism.
- Default pool size: `navigator.hardwareConcurrency - 1`. Every worker contributes results; `exhausted` requires every shard to exhaust without cap/cancel/node limit. Return shape matches `VarietyResult`.
- Pool construction/run failure permanently falls back to main-thread complete search for the browser session. The controller explicitly accumulates pool results so a 2,500 -> 5,000 no-cap transition may fall back without loss/double-counting.
- Verification: sharding unit tests; real worker/pool tests through `FakeWorker`; live Chromium with a real 3-worker pool, 902/1000-capped result on a real level, working 2,500->5,000 resume, clean cancellation, and identical forced-worker-failure fallback.

## Parallel Attempt Racing (Backend Only)

`scripts/solver-parallel/` races the same `getConfiguredAttemptConfigs` × `getActiveGates` attempts as sequential `solveLevel()`. First success wins; other in-flight workers terminate. Node-only tooling, never imported by browser solver modules.

### Race engine

`race.mjs` exports `solveLevelRaced()` and persistent `createRacePool()`. `worker-source.mjs` is esbuild-bundled and reuses `prepLevel()` per level.

- **Two queues:** repair and main. A bounded worker slice (`min(repairJobs.length, poolSize-1)` when `poolSize>=2`) prefers repair so fast repair wins do not sit behind long main-ladder jobs; repair workers fall back to main when empty. This fixed a case where a 2.5 s repair winner surfaced after 22.7 s because FIFO queued it late.
- **Budget math mirrors sequential sharing.** An early implementation gave each job full `timeBudgetMs`, multiplying provisioned work by configs × gates and preventing later winning configs from running. Current `budgetForMainJob`/`budgetForRepairJob` reproduce dynamic pair sharing, multiplied by queue worker count because jobs clear in waves. `minBudgetFraction` floors remain honored.
- **CPU contention remains a limitation.** On a 4-vCPU sandbox with pool size 3, a 2.77M-node job taking ~700 ms alone reached only 213,975 nodes in >945 ms under 3-way contention. One hard case solved sequentially in ~14.4 s, raced in ~23.6 s with a 60 s budget, but failed at a 20 s budget. This is environment throughput, not queue logic.
- `benchmark.mjs` writes raced-only output (`benchmark-raced-latest.json`, `engine: 'raced'`, warning) and must never become the production benchmark baseline. It processes levels one at a time while racing within each.
- Real worker-thread tests cover solved/unsolved, poolSize 1, sequential/raced validity, repeated calls, and pool cleanup.

### Persistent pool across levels

Per-level pool startup dominated fast cases. A “short sequential probe then race” hybrid was **tried and reverted** because shrinking `timeBudgetMs` reshaped proportional attempt shares and could starve the config that solves under the normal budget.

`createRacePool()` instead starts workers once and reuses them across levels without changing scheduling/budget math. Workers cache by unique `levelKey`; prep metrics/config reset every job. Broken workers respawn; in-flight stragglers at level settlement are hard-killed/replaced before reuse.

Wiring:

- `stress:benchmark` defaults to `--engine=raced`; `--engine=sequential` gives production-exact behavior; `--parallel` forces sequential inside outer workers to avoid nested oversubscription.
- `stress:benchmark:raced` uses one persistent pool for the run.
- `solver:bench`, `stress:regression`, and `solver-fingerprint` remain sequential for parity/determinism.

Measured 2026-07-10 on 4-vCPU, first 50 corpus1 levels, 8 s budget:

| Engine | solved | wall |
|---|---:|---:|
| old per-level pool | 49/50 | 287,180 ms |
| persistent pool | 49/50 | 272,536 ms |

Persistent pool was **5.1% faster overall**, 45/50 levels individually faster, and **13.96% faster** on the 45 fast levels (91,983 -> 79,142 ms), with identical solved set. Pool tests include multiple levels, exhausted->solvable sequence, poolSize 1, and post-shutdown rejection.

## Which Large-Batch Tool?

| Tool | Engine | Use |
|---|---|---|
| `solver:bench -- --check` | sequential | CI solved-set regression truth. |
| `stress:regression` / `solver:fingerprint` | sequential | baseline/determinism; racing would add schedule noise. |
| `stress:benchmark` | raced default; sequential opt-in; `--parallel` across levels | general corpus iteration/perf. |
| `stress:benchmark:raced` | raced persistent pool | raced-specific report/output. |
| `solver:direct` | sequential | single/few-level debugging. |
| `solver:req-length-sweep` | sequential | controlled `reqLen` scaling; use narrow ranges/node budgets while exploring. |
| `portfolio-solve-sweep.mjs` | selectable + resume/cache/priority/workers/race pool | repeated iteration on unsolved populations. |
| `repair-direct-probe.mjs` | direct repair search | repair-only development; bypasses ladder. |

For whole-corpus speed, start with `stress:benchmark`. Across-level `--parallel` may beat within-level racing when most levels are individually fast; do not combine them there. `portfolio-solve-sweep` is the deliberate composed-concurrency tool for small hard sets. None of these replace `solver:bench --check` for regression truth.

### Batch-tool requirements

1. **Persist between levels.** Long runs must lose at most the in-flight level. `stress:benchmark` writes partial output after each level and can skip prior output via `--skip-existing-dir`; `portfolio-solve-sweep` uses JSONL checkpoint + `--resume`. Reusing the same `--out` alone does not resume.
2. **Default to the cheapest sufficient experiment.** Start with narrow budgets/samples and widen only when the question needs it. Do not run competing CPU-bound timing arms concurrently on the same host.

## `--levels` Selector Syntax

Shared parsers in `scripts/level-data-io.mjs` now reject ambiguous bare numbers/ranges (`AmbiguousLevelSpecError`). Use:

- `pos:<n>` / `pos:<a-b>`: 1-indexed array position; supported by all tools.
- `id:<n>` / `id:<a-b>`: id-suffix lookup in id-aware tools; detects actual prefix/width families, including mixed S/R corpus1 ids.
- full id such as `R00237`: inherently unambiguous in id-aware tools.
- `all` / omitted: all levels.

This fixed real silent wrong-level selection caused by two historical parser conventions and removed `run-ablation.mjs`'s stale S-only bespoke parser. Known separate gap: `stress:benchmark` still assumes wrapped `{levels:[...]}` input and crashes on bare-array corpus files.

## Fast Portfolio Scheduler Experiment

`opts.schedulerMode` is `'legacy'` or offline-only `'portfolio-experiment'`; live Play/Editor/Review/hint discovery use legacy. Portfolio tiers in `data/config/portfolio-experiment.js` run broad cheap timed passes, with feature-gated specialist passes, then full legacy fallback, so solvability cannot be below legacy but runtime can be worse.

**Verdict: not production-ready.** 2026-07-12 best measured published variant (500/2000/5000 ms) was still **1.51×** legacy while preserving solves. Re-verification 2026-07-16 after the elite-splice repair fix weakened the stress case: an earlier corpus1 1–20 result of **0.57×** became **1.45×** on the same config/subset, with two levels falling from portfolio-tier solve to fallback. Portfolio comparisons must be revalidated whenever legacy speed changes. See `reports/portfolio/portfolio-scheduler-decision.md` and the 2026-07-16 reverification report.

Commands:

- paired comparison: `npm run solver:portfolio-report ...`;
- offline telemetry replay: `npm run solver:portfolio-replay ...`;
- single-solve sweep: `scripts/portfolio-solve-sweep.mjs` via `run-bundled.mjs`.

`portfolio-solve-sweep` records full attempt/referee/failed-strategy telemetry and may `--save-hints` with canonical provenance. Reports can be flattened to benchmark shape with `portfolio-sweep-reports-to-benchmark.mjs`.

### Repair extra-budget policy

Repair-gated levels can receive `REPAIR_EXTRA_BUDGET_FRACTION = 6.0` additional time. A 30 s solve can therefore spend up to 180 extra seconds; paired portfolio comparison can pay this twice. `--node-budget` and top-level `repairBudgetFractionOverride` control it without touching ablation.

Measured corpus1 policy result: fraction 0 reduced total wall from ~51 min to ~18 min while losing only six solves that arrived at 35–115 s. Therefore **testing/benchmarking should use repair fraction 0; hint discovery keeps default 6×**. Interactive 30 s solve UIs also set 0. `stress:benchmark` exposes the flag.

The override originally lived inside sparse `ablation` and accidentally disabled every omitted strategy; a normally ~1 s solved stress case then failed with only `--repair-budget-fraction=1`. Moving it to top-level `SolveOpts` fixed this; full repair tests, `solver:bench` (161/161 at the time), raced smoke, and CI passed.

### Batch-scale iteration features

`portfolio-solve-sweep.mjs` supports:

- `--resume` + JSONL checkpoint, one row per completed level;
- `--feature-filter` over mechanics (`reqLen`, `reqInt`, gates, MP/MC, mustTurn, portals, filters, flippers; comparison operators);
- `--baseline` + `--priority`/`--priority-order`, including `stability` ordering;
- `--attempt-cache`: safe negative-result reuse keyed by current attempt-family dependency hashes (`dfs-beam`, `repair`), invalidating shared scheduling changes; never fabricates a solve;
- `--workers`: OS child-process parallelism, with main-process-only hint writes. Worker entries are esbuild-bundled; portfolio `Set` fields serialize to arrays and are restored across JSON IPC;
- `--race-pool-size`: combines outer cross-level workers with each process's persistent within-level race pool. Total concurrency = workers × race-pool-size, warned if above core count. Requires legacy scheduler; incompatible with `--node-budget`; honors repair fraction.

`repair-direct-probe.mjs` calls `repairSearchFromGate` directly on one level/gate. `--races=N` runs independently salted repair searches in parallel; `seedSalt` defaults 0, leaving production unchanged. This trades one accumulating elite search for restart diversity and must be measured per change.

## Memory / Hot-Path Work

### Tier 1: flattening — DONE

Converted to typed arrays/`IntHashMap`:

- MP/MC lower-bound caches;
- `staticNeighbors` -> `staticNeighborKeys`;
- flipper approach-distance maps;
- `mustTurnCellIndex`;
- `gateSet` -> `gateFlags`;
- deleted unused `objectiveKeyToIndex`.

`adjTurnCellIndex`/`surroundNeighborIndex` remain Maps because one key may map to multiple values. Every conversion was checked against standalone original logic across published + hypothesis stress corpora, then `solver:bench` + CI. End-to-end node A/B was unsuitable because wall-gated repair probes made nodes non-reproducible.

### Tier 2: allocation — PARTLY DONE / PARTLY REFUTED

- `buildCurUrgencyContext` pooling: **done**, ~11–12% full-corpus wall-time win after lifetime/reentrancy audit.
- `UndoToken` pooling: **tried and reverted**, **4.6% slower** despite identical nodes; V8 nursery allocation beat field-by-field object reuse. Do not retry without a winning microbenchmark.
- `getNeighbors` scratch array and beam phase allocations remain untried; measure before assuming fewer allocations help.

Historical allocation inventory: `applyMove` creates one undo object per attempted candidate; `getNeighbors` creates a candidate array per node; `buildCurUrgencyContext` formerly allocated 4 structures per node; beam culling allocates dedup/bucket structures per phase.

### Tier 3: dense indexing — PARTLY DONE; rationale changed

Original cache-locality hypothesis: `KEY_SPACE = 1,048,576` arrays for <=225 live cells waste memory and vertically adjacent packed keys are 65,536 elements apart. Max-level rough resident estimate was **60–90 MB** per solve with >99.9% sentinel padding.

Connectivity microbenchmark refuted a major cache-locality payoff: sparse vs dense 15×15 neighbor access was 456 ms vs 449 ms. Bit-parallel topology work, not layout, made flood fill ~3× faster.

A separate allocation-cost profile showed the real payoff: on short batch solves, `createState` 15.2% CPU, `prepLevel` 14.5%, `distMapToArray` 7.3%, GC 11%; `staticNeighborKeys` alone was a 16 MB fill and `visited+edgeUsage` 3 MB per attempt.

**Done for distance arrays (2026-07-30):** dense `gridW*gridH` indexing via `denseIndex`; a 15×15 map is 225 entries instead of 1,048,576. Together with state-buffer reuse and zero-means-absent encoding, batch-shaped work became ~40% faster. Safety relied on compiler-forced stride parameters and a temporary bounds guard: **1.63 billion reads, zero out-of-grid violations**.

Still sparse: `staticNeighborKeys`, state `visited`/`edgeUsage`, `buildIndexArr` outputs, `gateFlags`/`reachBlockedArr`. These lack one accessor and need per-site audit + bounds guards.

## Wall-Clock-Gated Search Probes

These local fixes improve determinism but do not solve the larger top-level issue: `orchestration.ts` still sizes attempt shares from remaining wall clock. Provenance repeat runs show 84.2% of same-code/config/budget/seed groups differ in `nodesExpanded`, median 3.18× spread. See [`solver-budget-determinism.md`](solver-budget-determinism.md).

### `runRepairProbe` — DONE

A deterministic seeded probe formerly raced a small wall window and changed which valid strategy won under contention (17/20 repair wins, 3/20 beam fallback; disabling probe gave 10/10 consistency). It now uses calibrated node budgets (`REPAIR_PROBE_ORDINARY_NODE_BUDGET`, `_BIASED_NODE_BUDGET`) in addition to the outer ms limit.

Calibration directly replayed winning gate/config pairs on published + selected stress cases; a larger attempted calibration was killed after 600 s because individual hard direct probes can take ~25 s / 10.19M nodes. Verification: previously flaky case 5/5 identical hash/strategy/nodes; two full fingerprint runs 0 diffs; `solver:bench` 156/156; CI. Landed in `92f6bf9`.

Separate note: the then-pinned regression set was found stale; re-baselining was independent work.

### `dfsFromGateLDS` — DONE

Each LDS probe wave now has feature-scaled `getLdsProbeNodeBudget` plus the existing `probeCapMs`; node spend accumulates across waves. Time cap remains the protection for heavily diluted attempts, while deterministic nodes can stop well-funded probes earlier and fall through to unbounded `k=∞`.

Direct calibration covered 144/156 published probe-solved levels and 71/150 hypothesis-stress levels. Hardest published probe case required 1,926,137 nodes; coefficients provide ~1.64× headroom. One stress outlier undershoots and deterministically falls back, still solving. Verification: type/lint, 747 tests, no-level-number check, repeated fingerprints, `solver:bench` 156/156, stress regression 0 regressions (15 improvements against stale pin), CI.

## Attraction-Diversity Last-Resort Pass

Some `dfs-plain` failures unlock when one scoring term is disabled, but the culprit varies. After main + repair fail, `solveLevel()` reruns the same `mainConfigs` with `ATTRACTION_DIVERSITY_CANDIDATE_FLAGS` (currently `SCORE_GOAL_ATTRACTION`) disabled, using independent `ATTRACTION_DIVERSITY_BUDGET_FRACTION = 1.0`.

- Own override: `attractionDiversityBudgetFractionOverride`; interactive UIs set 0 for it and repair extra budget.
- `STRATEGY_ATTRACTION_DIVERSITY` gates it.
- Zero cost to earlier solves.
- Validation: 4/4 predicted-rescuable variants solved; 2/2 predicted-unrescuable stayed unsolved. A 30-case `dfs-plain` sample gained 3/30, rough ~80 corpus-wide estimate with wide uncertainty. Implementation also exposed sparse-ablation normalization bugs in sequential and raced paths. See [`reports/2026-07-16-phase-d-attraction-diversity-implementation.md`](../reports/2026-07-16-phase-d-attraction-diversity-implementation.md).

## Admissible-Order Node Reserve

Time fractions do not protect a last tier from one cumulative `nodeBudget`. In the 2026-07-30 20M-node corpus2 baseline, all **141** unsolved levels with validated admissible-order hints hit the cap after mean **14.4** ladder attempts, and the admissible tier appeared on only **1**.

`ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION = 0.25` withholds a slice from early tiers via `earlyTierNodeBudget`; admissible-order still runs last and can use the full external ceiling.

- Reserve applies only with finite node budget and when the tier will actually run; otherwise it would strand nodes.
- Keep reserve predicate and tier run predicate identical.
- `nodeBudgetReached` must report early-tier truncation even if total usage ends below the full external cap.
- Result on the 141: **+21 net** (22 gained, 1 lost), all gains referee-valid `ida:*`; worst-case control of 45 already-solved gained +2 net with nodes/time slightly down; participation 73/141 -> 141/141.
- Known loss: an earlier `ida:default` profile can consume the reserve before a later winning profile; sub-slicing was not adopted because `ida:default` won 21/22 gains.
- Batch flags: `--admissible-order-budget-fraction`, `--admissible-order-node-reserve-fraction`, `--disable-extra-budget-passes`; race pool does not support this tier/node budget.

Full report: [`reports/2026-07-30-admissible-order-node-reserve.md`](../reports/2026-07-30-admissible-order-node-reserve.md).

## AI-Assisted Manual Solving

[`ai-assisted-manual-solving.md`](ai-assisted-manual-solving.md) documents one demonstration and a proposed method. Verdict: narrative “strategy” from manual AI reasoning mostly reconstructs existing heuristics; the useful form is differential diagnosis of a canonically accepted manual path against solver trace. The worked example included a real invalid manual path caught by `validateCandidatePath`. Manual provenance must use a distinct solver id, never `SOLVER_ID`/`HUMAN_PLAYER_ID`.

## Current Speed/Robustness Backlog

**Done:** Tier1 flattening; browser Find-all pool; backend attempt racing + persistent pool; repair-probe determinism; LDS probe determinism; urgency-context pooling; dense distance arrays/state reuse; attraction-diversity and admissible reserve mechanisms as documented.

**Still measurable candidates:** `getNeighbors` scratch reuse and beam per-phase allocation cleanup. `UndoToken` pooling is closed negative unless a microbenchmark overturns the V8 result. Remaining dense-array conversions need a dedicated safety/audit pass, not casual continuation.

Regression-set housekeeping was resolved 2026-08-07: five solved canaries + three known-hard targets, with guarded `stress:regression -- --update-baselines`. The tier remains manual because repair-heavy cases make it minutes long.

## History: MST-Bound Scratch-Buffer Bug

`_mstEdges` was sized for “max 6 nodes,” but must-turn landmarks also enter `mustPassKeys`. TypedArray out-of-bounds writes silently no-op, leaving stale data and producing an invalid lower bound (**34 instead of correct 27** in one real stress case), which could falsely prune a solvable state. Fixed in `ed6c9e6`/`3424772` with generous fallback sizing plus correctly keyed must-cross caching. Verified against an independent reference on ~30,000 states. Full record: `data/stress/README.md` MST-bound section. New state memoization/buffer reuse requires comparable differential soundness evidence.
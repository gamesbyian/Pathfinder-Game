# Solver Architecture

The hint solver lives in `modules/Solver.ts` (a thin public facade) over `modules/solver/*`. This is
the deep per-topic reference; CLAUDE.md keeps only a short overview and links here.

> This doc covers hint *generation* (finding solutions). Deciding **which** of a level's stored
> solutions the player actually cycles through is a separate concern — see
> [`hint-curation.md`](hint-curation.md).

> **Strategy is selected by level *features*, never level identity.** The attempt policy branches on
> `reqInt`, `navDensity`, must-pass/must-cross counts, portal/flipper counts, gates, and `reqLen` —
> not on which numbered level is being solved. `check:no-solver-level-numbers` enforces this over the
> solver source **and this document** (no `L###` / `level N`).

> **Before tuning scoring/pruning/templates against a corpus's pass rate, read
> [`data/stress/README.md`](../data/stress/README.md)'s "Batches" table.** Several stress-corpus
> batches were built with explicit knowledge of this solver's own historical weaknesses —
> validating a change only against those risks measuring "still handles what we already knew
> about," not general robustness.

## Core Flow
1. `normalizeRawLevel()` — convert wire format (1-indexed) to internal representation (0-indexed, packed keys)
2. `prepLevel()` — precompute per-level data (dist maps, adjacency, masks)
3. `solveLevel()` — attempt loop over gates × configs; each attempt runs DFS or beam
4. `validateCandidatePath()` — verify returned solution against domain rules
5. Return `{ ok, solution, attempts, totalMs }`

## Attempt Configs
Selected by `getAttemptConfigs(level)`. Each config is:
```js
{ profileName: String, template: Object|null, beamWidth?: Number, minBudgetFraction?: Number, diverseBeam?: Boolean }
```
- If `beamWidth` is set: run beam search. Otherwise: DFS.
- `minBudgetFraction`: minimum fraction of per-gate budget this config must receive (for critical configs that need full budget to converge).

## Archetypes (detectArchetype)
Checked in priority order:
1. **near-closure** — `reqInt ≤ 1 AND navDensity < 0.35` — near-loop sparse levels
2. **high-intersection-burden** — `(reqInt≥5 AND density≥0.45) OR (reqInt≥4 AND density≥0.55) OR reqInt≥10`
3. **must-cross-heavy** — `mustCrossKeys.length ≥ 2 AND reqInt ≥ 2`
4. **portal-heavy** — `portalMap.size ≥ 4`
5. **default** — everything else

`navDensity = reqLen / navArea` where `navArea = w×h − blocks − geese − falseGoals − gates`.

## Attempt policy (`getAttemptConfigs` → `ATTEMPT_POLICY`)
`modules/solver/attempts.ts` is the **declarative source of truth**: an ordered `ATTEMPT_POLICY`
array of `{ when(features), build(features), why }` rules, evaluated first-match-wins over a named
`LevelFeatures` struct, with every threshold a documented `POLICY.*` constant. Config bundles are
built from a small `dfs()`/`beam()`/`profilesFirst()` vocabulary. The rules, by feature regime:

- **near-closure** — closure/harvest profiles first (`nearClosureRescue → harvestThenFinish → finishFirst → perimeterSweep`), then templates.
- **high-intersection-burden**:
  - `reqInt ≥ POLICY.VERY_HIGH_REQINT (7)` — beam first for budget; portal-dense (`portals ≥ 2`) leads with `objectiveFirst` beam, else `intersectionHarvest` beam; DFS fallbacks follow.
  - `navDensity ≥ POLICY.NEAR_HAMILTONIAN_DENSITY (0.82)` — near-Hamiltonian: skip leading beams, DFS perimeter (both directions).
  - otherwise (medium reqInt) — perimeter/objective beams first (budget-floored on long multi-gate levels: `reqLen ≥ 90 AND gates ≥ 2`), then feature-ordered DFS (objective-directed first when `mustPass ≥ 3`; CCW-first when `reqInt ≤ 4 AND mustPass = 0`).
- **portal-heavy** — portal-transfer profiles (`portalFirstTransfer`, `portalCommitted`) first, then templates.
- **must-cross-heavy**:
  - `mustPass ≥ 3 AND flippers ≥ 2` — `intersectionHarvest` diverse beam (bw 5000), then DFS fallbacks; the repair fallback's early probe (always present for this rule) now solves nearly everything in this archetype before this main loop even runs. (Wider beam tiers up to bw 50000 were removed — proven not to help this archetype; see data/stress/README.md.)
  - `mustPass ≥ 3` — objective/must-cross beams lead.
  - `mustCross ≥ 3 AND mustPass ≥ 2` — beam first (thread the combined constraints without burning DFS timeouts).
  - otherwise — template DFS (cornerHarvest, perimeterCW) first, then beams, then DFS profiles.
- **default** — `mustPass = 0`: CCW template before CW; otherwise the standard `ATTEMPT_CONFIGS` template order; then all `PROFILE_ORDER` profiles.

### ATTEMPT_CONFIGS (default template list)
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

> **This ladder is hand-tuned, not mined.** `detectArchetype`'s 5 threshold rules and
> `ATTEMPT_POLICY`'s ordering were arrived at by reading logs, not by systematically mining which
> profile actually wins for which feature regime. [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md)
> probed this directly: 79% of solve time on solved corpus-1 levels was spent on attempts *before*
> the actual winner (worse for `must-cross-heavy`/`high-intersection-burden`, 75-86%), and a
> single-feature rule (`navDensity`) predicts `repair`-strategy wins better than chance but not yet
> well enough to act on — re-test once corpus-2's benchmark data lands. See that doc's "Using this
> to attack corpus-2" section before hand-editing this ladder further.

## DFS (`dfsFromGate`)
- Iterative DFS with undo tokens (not recursive, avoids stack overflow)
- `applyMove()` mutates state + returns undo token; `undoMove()` restores all state
- LDS (Limited Discrepancy Search) wrapper: probes k=0,1,2,4,8 then unbounded, each probe wave
  capped at `probeCapMs = min(floor(levelBudgetMs*0.5), 4000)` so the probe phase can't starve
  the unbounded fallback. **A flat floor on `probeCapMs` was tried and reverted** — it traded
  one budget-diluted level's flakiness for a different level's fully deterministic failure,
  with no overlapping value that helped both; see `data/stress/README.md`'s "tried and REVERTED a
  dfsFromGateLDS probe-floor fix" snapshot for the full root-cause and counter-example before
  attempting anything in this area again.
- Pruning heuristics:
  - Over-length: path can't reach goal without exceeding `reqLen`
  - Over-intersection: current ints > reqInt
  - MC ceiling: can't achieve required must-cross count from here
  - Goal distance: BFS distance to goal > remaining length budget
  - Parity: (goal_parity XOR position_parity XOR remaining_steps_parity) ≠ 0
  - MP/MC lower bounds: MST distance to remaining objectives > remaining steps
  - Connectivity: isolating a region that must be visited

  `mustPassLowerBound`/`mustCrossLowerBound` are exactly memoized (`prep._mpLowerBoundCache`/
  `_mcLowerBoundCache`, toggle: ablation flag `STRATEGY_LOWER_BOUND_MEMO`) — **see CLAUDE.md's
  "Common gotchas" for why the cache key must fully capture the state the bound depends on, and
  why must-cross's key is more than `(pos, mask)`.** Getting this wrong silently tightens a bound
  past what's mathematically valid, which can wrongly prune a reachable solution — this already
  happened once for real (the MST scratch-buffer sizing bug, `data/stress/README.md`'s MST-bound
  snapshot) and is a correctness bug, not a performance regression.

## Beam Search (`beamSearchFromGate`)
- Frontier of parent-pointer nodes `{ key, prev, depth, score, sc, sk? }`
- Path reconstructed into reusable `_scratch[]` array — no O(depth) allocations per candidate
- Replay via `_beamResetState()` + `applyMove()` loop from reconstructed path
- Same pruning checks as DFS applied to each candidate
- `scoreAndSort` uses module-level `_sas[4]` Float64Array scratch + insertion sort (no per-call allocation)
- Default beam width: 2000. Wide beam (5000) for hard levels.
- **State dedup**: before sort+select, candidates sharing `(key, sc)` are merged — only the highest-scoring path to each `(position, constraint-state)` tuple survives. Map key is `c.key + c.sc * KEY_SPACE` (exact float64). Disabled for portal levels (portal usage isn't in `sc`, so merging would be incorrect).
  - `sc = (adjTurnMask&0xF)<<24 | (mustTurnMask&0xF)<<20 | (surroundMask&0xF)<<16 | (flipperUsedMask<<12) | (mustCrossMask<<8) | (mpVisitedMask<<4) | (ints&0xF)`
- **Diverse beam** (`diverseBeam` flag + `_diverseSelect`): buckets candidates by `sk = (flipperUsedMask<<4)|(mustCrossMask&0xF)`, guarantees `floor(beamWidth/numBuckets)` per bucket, then fills remaining slots from the global top. Prevents beam collapse to one constraint-state mode on levels with flippers and must-cross cells.
- **Diverse-beam fallback**: the must-cross+flipper-heavy rule uses `[bw=5000 diverse]` before its DFS fallbacks. Formerly widened further to bw=15000/50000 (the latter with `minBudgetFraction: 1.0`); removed after a dedicated isolated run proved the widest tier naturally exhausts (not budget-cut) with zero solves on this archetype — see `modules/solver/attempts.ts`'s `BEAM` comment and `data/stress/README.md`.

## Key Data Structures
```js
state = {
  path: number[],          // packed cell keys (current path)
  visited: Uint16Array,    // visit counts (KEY_SPACE = 1<<20 entries)
  edgeUsage: Uint8Array,   // per-cell axis bits: 1=H used, 2=V used
  ints: number,            // intersection count so far
  mustMask: number,        // 32-bit: bit i set while must-pass[i] unvisited
  mustCrossMask: number,   // 32-bit: bit i set while must-cross[i] unsatisfied
  crossCounts: Uint8Array, // crossing count per must-cross cell
  mpVisitedMask: number,   // 32-bit: bit i set once must-pass[i] visited
  portalJumps: number,     // portal jumps so far (subtracted from counted length)
  flipperUsedMask: number, // bitmask tracking which flippers have been used
  lastWasPortalJump: boolean,
  surroundMask: number,              // 32-bit: bit i set while surround[i] has unvisited neighbors
  surroundNeighborRemainingMasks: Uint8Array, // per surround cell: 8-bit mask of unvisited neighbors
  mustTurnMask: number,              // 32-bit: bit i set while must-turn[i] unsatisfied
  adjTurnMask: number,               // 32-bit: bit i set while adj-turn[i] unsatisfied
}
```

## prepLevel() Precomputed Data
- `prep.distMap` — BFS distance Map from goal to all reachable cells
- `prep.goalDistArr` — Uint16Array[KEY_SPACE] mirror of distMap (fast O(1) lookup). In all typed-array dist maps the sentinel `0xFFFF` means unreachable/Infinity.
- `prep.mpDistArrs[]` — Uint16Array per must-pass cell (typed array BFS distance)
- `prep.mcDistArrs[]` — Uint16Array per must-cross cell
- `prep.objDistArrs[]` — Uint16Array per objective key
- `prep.staticNeighbors` — Map<packedKey, Int32Array> of precomputed valid neighbors; stored as flat `[nk, axis, nk, axis, ...]` pairs; excludes blocks, geese, false-goals, gate-cells, and regular-filter axis violations
- `prep.mustPassIndex / mustCrossIndex` — Map<key, index> for bitmask indexing
- `prep.flipperIndexMap / flipperInitAxes` — flipper state tracking
- `prep.mcPairDist / mpPairDist` — pairwise BFS distances for MST lower bounds
- `prep.mcApproachDistMaps` — BFS distances to approach cells for must-cross 2nd-visit requirements
- `prep.surroundNeighborIndex` — Map<neighborKey, surroundIdx> for O(1) lookup when entering a cell adjacent to a surround landmark
- `prep.surroundInitNeighborMasks` — Uint8Array: initial 8-bit neighbor bitmask per surround cell
- `prep.surroundNeighborDistMaps` — BFS dist arrays to each surround neighbor (for lower-bound pruning)
- `prep.mustTurnCellIndex` — Map<key, idx>; `prep.mustTurnDirs` — required turn direction per must-turn cell
- `prep.adjTurnDistMaps` — BFS dist arrays to approach cells for each adj-turn landmark
- `prep.mustMaskForDFS` — `initialMustMask`, or 0 when `navDensity ≥ DENSE_LEVEL_NAV_DENSITY` (see prep.ts)
- `prep.hasLandmarkConstraints` — boolean fast-path flag; `false` for levels without any landmark constraints (avoids overhead on the vast majority of levels)

## Cell Key Encoding
```js
PACK(x, y)  = ((y << 16) | x) >>> 0   // 0-indexed
UNPACK(k)   = { x: k & 0xFFFF, y: (k >>> 16) & 0xFFFF }
KEY_SPACE   = 1 << 20   // 1M entries — covers all grids up to 15×15
```

## Axis Encoding
```js
AXIS_H = 1   // horizontal move (dx ≠ 0)
AXIS_V = 2   // vertical move (dy ≠ 0)
AXIS_NONE = 0
```

## Ablation Laboratory
The solver ships an ablation framework (57 togglable feature flags) for measuring what each search
feature contributes. Full reference: [`ablation.md`](ablation.md). Quick start: `npm run
ablation:baseline`, `npm run ablation:single`, `npm run ablation:analyze`.

## Command-line usage & tooling

> **The solver CLI runs through an esbuild bundle, NOT raw `tsx`.** `solver:direct` and
> `solver:bench` go through `scripts/run-bundled.mjs` (esbuild-bundle → `node`). The hot search
> loops run **~5× slower under `tsx`** (it transforms each `.ts` module separately, so per-node
> cross-module calls in the hot path don't inline). This regressed silently when the hot solver
> files became `.ts` (production was never affected — it ships a Vite/esbuild bundle). Do **not**
> revert these scripts to `tsx`. `npm run solver:bench -- --check` guards the full-corpus solve
> rate against `logs/solver-baseline.json` (note: the single hardest level can time out under a
> CPU-throttled sandbox — confirm any suspected regression by re-running the pre-change code).

### `solver:bench` vs `solver:direct` — which to use

Both run the full published corpus through `Solver.solve()` and both print per-level progress as
they go, but they answer different questions:

- **`solver:bench -- --check`** — the CI regression gate. Diffs the solved/failed set against the
  committed `logs/solver-baseline.json`; also probes order-independence (`--order=reverse|random`).
  Use this to confirm a solver change didn't regress anything, and use `--update-baseline` only
  when a change is an intentional, verified improvement.
- **`solver:direct`** — the ad-hoc debugging tool. No baseline comparison; instead it supports
  `--verbose` per-attempt logging and a structured `--output` JSON dump (see "Audit JSON format"
  below) for inspecting *why* a specific level is slow or failing. Use this to investigate, not to
  gate a change.

```bash
npm run solver:direct -- --levels=133,146 --budget-ms=30000 --output=logs/Solver/out.json
npm run solver:direct -- --levels=all --budget-ms=30000 --output=logs/Solver/full.json
npm run check:audit-output -- logs/Solver/full.json   # validate audit JSON structure
```

| Flag | Default | Description |
|---|---|---|
| `--levels=1,2,3` or `--levels=all` | all | Levels to solve |
| `--budget-ms=30000` | 30000 | Time budget per level in ms |
| `--output=path/to/out.json` | (none) | Write JSON results |
| `--verbose` | off | Extra per-attempt logging |

### Audit JSON format
Each entry in `data.levels[]`:
```js
{
  level: Number,            // 1-indexed level number
  status: 'success'|'failed',
  ok: Boolean,
  elapsedMs: Number,
  nodesExpanded: Number,    // total neighbor evaluations across all attempts
  solvedBy: String,         // profileName that won
  attempts: [{
    gateKey: Number,        // packed cell key
    profile: String,        // profileName
    template: String|null,  // template id or null
    beamWidth: Number|null, // null = DFS
    ok: Boolean,
    elapsedMs: Number,
    allocatedBudgetMs: Number, // this attempt's allotted budget slice
    nodesExpanded: Number|null
  }, ...]
}
```

### Debugging a slow or failing level
```bash
npm run solver:direct -- --levels=<N> --budget-ms=60000 --verbose
# Or inspect the attempt breakdown from a JSON run:
npm run solver:direct -- --levels=<N> --budget-ms=30000 --output=logs/Solver/debug.json
node -e "
  import { readFileSync } from 'fs';
  const d = JSON.parse(readFileSync('logs/Solver/debug.json'));
  d.levels.find(l => l.level === <N>).attempts.forEach((a,i) =>
    console.log(i+1, a.profile, a.template, 'bw=' + (a.beamWidth||0), a.ok ? 'WIN' : 'fail', a.elapsedMs + 'ms')
  );
"
```

### Performance-optimization workflow
1. Full audit: `npm run solver:direct -- --levels=all --budget-ms=30000 --output=logs/Solver/full.json`
2. Identify slow levels (>2000ms per level is notable) and check each one's attempt breakdown (above).
3. Identify which config wins and at what attempt number.
4. Modify the policy in `modules/solver/attempts.ts` (not `Solver.ts` — that is a thin facade).
5. Re-run targeted levels, then the full audit to check for regressions.
6. `npm run ci` (and `npm run solver:bench -- --check`) before committing.

`npm run audit:newhint:full` runs the full causality-metric audit, maintaining a rolling history
alongside `logs/solver-workflow/latest.json` (`HISTORY_MAX_BYTES` = 95 MB, `HISTORY_MAX_ENTRIES` = 4000).

### Level archetype investigation
```bash
node --input-type=module << 'EOF'
import { readFileSync } from 'fs';
const RAW_LEVELS = JSON.parse(readFileSync('./data/levels.json', 'utf8'));
const { SOLVER_TESTING_API } = await import('./modules/Solver.js');   // .js: ESM specifier for Solver.ts
const level = SOLVER_TESTING_API.normalizeRawLevel(RAW_LEVELS[N - 1]); // N = level number
const arch = SOLVER_TESTING_API.detectArchetype(level);
const navArea = level.grid.w * level.grid.h - level.blockSet.size - level.gooseSet.size - level.falseGoalKeys.size - level.gateKeys.length;
console.log('arch:', arch, 'navDensity:', (level.reqLen / navArea).toFixed(3));
console.log('reqInt:', level.reqInt, 'mp:', level.mustPassKeys.length, 'mc:', level.mustCrossKeys.length, 'portals:', level.portalMap.size);
EOF
```

### Trap-spot & false-goal audits (separate from the hint solver)
```bash
# Trap-spot timing audit:
npm run solver:trap-audit -- --levels=all --extended-budget=60000

# False-goal viability: flag levels whose false goals sit where no path can ever end (the trap
# could never fire). Timeouts report "inconclusive", never "invalid". A cheap parity test resolves
# most cases even when full enumeration times out (incl. portal levels whose portals are
# parity-preserving); for a cell left "inconclusive", a goal-directed solve (set that cell as the
# goal, run solver:direct) is far cheaper than enumeration — a solved path proves reachability.
npm run solver:trap-audit -- --check-false-goals --fg-budget=90000
npm run solver:trap-audit -- --check-false-goals --levels=63
```

### Editor trap-scan runtime (worker + streaming)

> "Trap" here always means the trap-spot search below (false-goal placement), not
> `modules/ui/focus-trap.ts`'s unrelated accessibility "focus trap" (keeping keyboard
> focus inside an open modal) — an unlucky naming collision, not the same concept.

In the app, trap-spot searches run off-thread through the solver Web Worker
(`worker.js` `TRAP` message; `solver-worker-client.js` `findTrapSpots()`). The worker
takes the editor's **normalized** working level — postMessage's structured clone
carries its Sets/Maps intact — and streams `TRAP_PROGRESS` messages (newly-found spot
keys via `findTrapSpots`' `onSpot` hook, flushed at most every ~100ms, plus per-gate
sweep progress) before the final `TRAP_RESULT`.

The editor consumes this through `modules/input/trap-scan-controller.ts`:

- Selecting the false-goal palette tool auto-starts a **background** scan (no blocking
  overlay) that paints confirmed spots onto the grid as they arrive. A cheap
  `isParityReachableEndpoint` pass paints an instant faint "not ruled out yet"
  candidate layer first; a complete sweep clears it, so a lone faint outline always
  means the scan is still undecided there.
- The Trap Spots button runs an explicit scan through the same seam with the progress
  overlay/cancel UI. A timed-out sweep is reported as incomplete in its toast, and
  pressing Trap Spots again re-runs with an escalated budget (`computeTrapRetryBudget`)
  — there is no retry prompt.
- Scan lifecycle lives in `editor.trapScanState`
  (`stale`/`scanning`/`done`/`partial`/`failed`). Every level-mutating edit funnels
  through `clearEditorValidTrapSpots`, which resets the state to `stale`; an
  in-flight scan observes that and cancels, so on-screen spots always describe the
  on-screen level. If the worker can't be used, the controller falls back to the
  cooperatively-yielding main-thread search with the same streaming hooks.

### Parallel "Find all" enumeration (browser Web Worker pool)

Unlike the racing tooling below (Node-only, first-success-wins, no production use), this pool
IS a production browser code path: it backs the Editor/Review Solve button's **"Find all"**
tiers (see [`docs/solve-button-variety.md`](solve-button-variety.md)). Profiling found
complete-mode enumeration is 84-92% raw DFS time on real levels — genuinely single-thread
CPU-bound, unlike the targeted tiers (few/many/lots/custom), where periodic curation recompute
dominates instead (see that doc's profiling note) — so only "Find all" uses the pool; targeted
tiers stay on the main thread.

- **Sharding, not racing: every worker's finds are kept, not just the first.** One job per
  `(gate, root-child)` pair — a gate's immediate neighbors (`getNeighbors` on the gate)
  partition its search tree into disjoint subtrees, each a complete, independent enumeration.
  This is sound with **no cross-worker dedup coordination** beyond checking against
  pre-existing hints: every path from one gate shares cell 0 (the gate) but diverges at cell 1
  (the shard's own first move), so `pathSignature` (`path.join(',')`) can never collide across
  two shards of the same gate — proven in `modules/solver/hint-enumeration.test.ts`'s "union of
  shards" test. `modules/solver/hint-enumeration.ts`'s `EnumOptions.rootChildren` is the
  primitive this relies on: an optional shard filter on `completeFromState`'s root, intersected
  against the real neighbor list for safety (a stale/wrong shard can only narrow the search,
  never widen it) — the DFS itself is completely unmodified.
- **PLAY validation and dedup happen on the main thread, never in the worker** — identical to
  `variety-search.ts`'s own `consider()`. A worker just runs the shard's DFS and streams raw
  candidate paths back in batches (`ENUMERATE_PROGRESS`, flushed ~100ms, mirroring `TRAP`'s
  existing streaming pattern); `modules/solver/solver-worker-client.ts`'s
  `createEnumerationPoolClient` is the only place that calls `validateCandidatePath` and
  pushes into the accumulating pool. Moving the DFS off-thread changes *where* it runs, never
  *how* a candidate becomes an accepted, saved solution — the invariant "every saved hint
  passes `validateCandidatePath` in PLAY context" holds identically to the single-thread path.
- **Worker protocol**: `modules/solver/worker.js`'s `ENUMERATE` message type (alongside the
  pre-existing `SOLVE`/`TRAP`) takes a NORMALIZED level (same convention as `TRAP` — structured
  clone carries its Sets/Maps intact) plus a `levelKey`-cached `prepLevel()` (many shards of
  one "Find all" run share a level, so BFS precomputation is paid once per worker, mirroring
  `scripts/solver-parallel/worker-source.mjs`'s `cachedLevelKey` pattern) and posts
  `ENUMERATE_PROGRESS`/`ENUMERATE_RESULT`/`ERROR`; `CANCEL` reuses the existing
  `cancelledIds` mechanism.
- **Pool client** (`createEnumerationPoolClient` in `solver-worker-client.ts` — the one file in
  `modules/solver/` eslint-exempted for the `Worker` global): dispatches the flat job queue
  across `poolSize` workers (default `navigator.hardwareConcurrency - 1`) with the same
  "worker pulls the next job" idiom `race.mjs`/`stress/benchmark.mjs` already use, but
  ACCUMULATES every result instead of racing for one; `exhausted` is true only if every
  dispatched shard finished with `exhausted: true` (none hit the cap/cancel/node-budget).
  Returns a `VarietyResult`-shaped object (`{newlySaved, shown, savedCount, curatedCount,
  outcome}`) — a drop-in for what `variety-search.ts`'s own `session.run({mode:'complete'})`
  returns, so `solver-controller.ts`'s summary/persistence code doesn't need to branch on which
  path ran.
- **Fallback**: `solver-controller.ts` lazily constructs the pool and permanently falls back to
  the main-thread `session` for the rest of the browser session if construction or a run
  throws — same pattern as `trap-scan-controller.ts`'s `getClient()`. Because the pool is
  stateless per call (unlike `session`, which accumulates internally across repeated `run()`
  calls) and "Find all — no cap" can transition from pool to fallback mid-run (2,500 → 5,000
  stage), the controller tracks cumulative finds explicitly rather than trusting either source's
  own accumulator, and — once the pool has contributed anything — routes any subsequent
  main-thread fallback through a fresh one-off session seeded with everything found so far
  instead of reusing the original session, so nothing the pool already found is lost or
  double-counted.
- **Verified**: unit tests (`hint-enumeration.test.ts`'s sharding tests, `solver-worker-unit-
  tests.mjs`'s `ENUMERATE` and pool-client tests using a `FakeWorker` that routes through the
  real `handleWorkerMessage`) plus live browser verification (Playwright + Chromium against a
  real build): a real 3-worker pool found 902/1000-capped solutions on a real level with no
  errors; the no-cap variant's mid-run 2,500 prompt and resume-to-5,000 stage both worked
  through the real pool; cancellation settled cleanly; and simulating `Worker` construction
  failure produced an identical result via the main-thread fallback.

### Parallel attempt racing (backend-only tooling)

`scripts/solver-parallel/` races the SAME policy-selected attempts a normal `solveLevel()`
call would run (`getConfiguredAttemptConfigs` + `getActiveGates` — identical selection, no
new/removed/reordered attempts) across a pool of `node:worker_threads`, instead of running
them one at a time. First success wins; every other in-flight worker is terminated. This is
**Node-only CLI tooling** — it deliberately lives under `scripts/`, is never imported by
`modules/solver/*.ts` (which is also bundled for the browser via Vite), and carries zero risk
to the production single-threaded path. There is no production/browser use case for it; it
exists purely to make local iteration on hard stress-corpus levels faster. (The browser DOES
have a production worker pool of its own now — see "Parallel 'Find all' enumeration" above —
but it accumulates every shard's finds rather than racing for one, a different problem shape.)

- **`race.mjs`** exports `solveLevelRaced(rawLevel, opts)`. `worker-source.mjs` is a
  persistent per-worker job processor (esbuild-bundled on demand, same rationale as
  `scripts/run-bundled.mjs`: `tsx` runs the solver hot path ~5x slower than plain `node`);
  one worker handles many jobs across its lifetime, reusing one `prepLevel()` per level
  instead of repeating BFS precomputation per attempt.
- **Two independent dispatch queues** (repair, main), not one priority-ordered list.
  Sequential `solveLevel()` runs repair strictly *last*, after the main DFS/beam ladder
  fully fails, specifically so repair never dilutes the main loop's shared budget on a
  single thread. That constraint doesn't exist under true concurrency (separate cores, not
  timeslices) — but a naive combined FIFO queue (repair sorted last, as the policy already
  produces it) measurably regressed levels where repair is fast: repair jobs don't fail
  fast (no natural "exhausted" signal — an iterated-local-search that's going to fail burns
  its *full* budget before giving up), so they'd sit queued behind the whole main-loop
  ladder even when a repair attempt could have solved the level in a couple of seconds
  (found on S043: raced at 22.7s wall time for a winning job that only needed 2.5s). Fix: a
  bounded slice of the worker pool (`min(repairJobs.length, poolSize-1)`, only when
  `poolSize >= 2`) is permanently reserved to prefer the repair queue, falling back to the
  main queue once it empties so no worker idles.
- **Budget model mirrors `orchestration.ts`'s own sharing, not a fixed per-job amount.**
  `runInterleavedAttempts`'s `pairShare` deliberately dilutes budget across every
  `(config, gate)` pair (recomputed at each dispatch from *remaining* time and
  *pairs-still-queued*, so slack from attempts that fail fast flows to later ones) — an
  early version of this file instead gave every job its own **full** `timeBudgetMs`, on the
  theory that concurrency removes the need to share a timeslice. That reasoning was
  backwards: it inflated total provisioned work by a factor of `configs × gates`, which on
  a 4-gate level (S118 — the same level `ADAPTIVE_GATE_THRESHOLD`'s own comment documents
  as the original budget-dilution discovery level) blew through the overall wall-clock cap
  before the config ladder ever reached the combo that actually solves it. The fix
  (`budgetForMainJob`/`budgetForRepairJob` in `race.mjs`) reproduces `pairShare`'s dynamic
  reallocation, but multiplies each share by the queue's own worker count
  (`mainWorkerCount`/`repairWorkerCount`) — `poolSize` concurrent workers can clear
  `pairsLeft` jobs in `pairsLeft / poolSize` waves, not `pairsLeft` of them, so each job can
  afford a `poolSize`×-larger share while the *worst case* (every job burns its full share)
  still finishes within the same `timeBudgetMs` window sequential targets. `minBudgetFraction`
  floors are honored the same way `runInterleavedAttempts` honors them.
- **Known limitation: CPU contention on constrained hardware.** The budget math above
  assumes each worker gets throughput close to a dedicated core. On a CPU-scarce sandbox
  (measured: a 4-vCPU box, `poolSize = availableParallelism() - 1 = 3`), running several
  million-node DFS searches concurrently was observed to degrade single-worker throughput
  by well over an order of magnitude relative to isolated execution (a job that completes
  2.77M nodes in ~700ms alone took `>945ms` to reach only 213,975 nodes under 3-way
  contention) — far worse than the naive `1/poolSize` slowdown the budget math assumes.
  S118 is the concrete case: it solves sequentially in ~14.4s but needs a larger overall
  `timeBudgetMs` than the sequential default to solve under racing on this hardware (60s
  budget: solves in ~23.6s; 20s budget: exhausts all attempts without success). This is a
  hardware/environment property, not a scheduling bug — consistent with CLAUDE.md's
  existing note that the single hardest level can fail under sandbox CPU-throttling. On
  less contended hardware (more real cores than concurrent heavy searches), this gap should
  shrink or disappear.
- **`benchmark.mjs`** mirrors `scripts/stress/benchmark.mjs`'s structure/output using
  `solveLevelRaced` in place of the production `solveLevel()`, for direct comparison —
  but it is explicitly **not** the official benchmark: it measures a different (multi-core,
  Node-only) execution model than what ships to players, writes to
  `reports/stress/benchmark-raced-latest.json` (never `benchmark-latest.json`), and tags its
  output `engine: 'raced'` with an `engineWarning` field. Its numbers must never be
  committed as the `solver:bench`/`stress:benchmark` regression baseline. Run via
  `npm run stress:benchmark:raced -- [--levels=S001,S030|1-20] [--budget-ms=20000]
  [--pool-size=N] [--out=path]`. Levels are still processed one at a time (each level's own
  race tears its worker pool down before the next level starts) — orthogonal to, and not
  combined with, `stress:benchmark`'s own `--parallel` flag (which parallelizes *across*
  levels instead of *within* one level's attempt ladder).
- **Test coverage**: `scripts/solver-parallel-unit-tests.mjs` — real (not mocked)
  `node:worker_threads` + esbuild-bundled-worker integration tests on tiny synthetic levels:
  a solved level's raced solution passes the PLAY referee, a genuinely unsolvable level
  reports failure cleanly (no hang/throw), `poolSize: 1` works, racing finds an independently
  referee-valid solution on the same level sequential does (not necessarily the same path),
  and two back-to-back `solveLevelRaced` calls both complete (a cheap indirect check against a
  leaked/hung worker pool from the first call blocking the second).

### Making racing the default for batch runs — DONE (persistent pool)

Original measured finding (before the fix below): racing was **not** a blanket win for
batch-solving a whole corpus. A 15-level sample (`data/stress/stress-levels.json`, budget
8000ms) showed racing made 13/15 levels *individually slower* than sequential (worker-pool
spin-up cost dominates on already-fast levels), and only 2/15 (the genuinely slow ones) got
faster — the aggregate total was ~8% faster only because those 2 outliers dominate the sum, a
thin, fragile margin that would likely flip negative on a corpus with fewer slow outliers
relative to fast ones (most of the published/stress corpora, where genuinely hard levels are a
small minority).

**Tried and reverted**: a "sequential-first with a short probe budget, escalate to racing
only if the probe fails" hybrid (mirroring the repair-probe/LDS-probe cheap-probe-escalate
idiom one level up, as batch-tooling scheduling rather than solver-internal search control).
**Do not re-attempt this exact design** — it has a real, demonstrated bug: `orchestration.ts`'s
attempt ladder divides its budget *proportionally* across every attempt config
(`runInterleavedAttempts`'s `pairShare`), so shrinking `timeBudgetMs` for "just a quick probe"
doesn't only bound wall time, it *reshapes* how that budget splits across configs — it can
starve the specific config that would have solved the level fine given its normal share. This
was caught concretely: a stress-corpus level (needing 574ms–3.7s under both pure sequential
and pure raced execution, with the level's real budget) failed outright after 30+ seconds
under the probe-based hybrid, because a small probe budget (2000ms) distorted the ladder
enough that the config which normally solves it never got a workable share.

**Root cause and fix**: the measured overhead wasn't the search itself, it was that `race.mjs`
spun up a fresh N-worker pool *per level* and tore it down before the next one (each worker's
own Node runtime/V8 isolate startup is a real, then-repeated-every-level cost). The individual
workers already supported processing many *jobs* across their lifetime *within* one level's race
(`worker-source.mjs`'s persistent-worker comment) — the fix extends that same reuse *across
levels too*: `race.mjs` now exports `createRacePool(opts) → { solveLevel(rawLevel, levelOpts),
shutdown() }`. `createRacePool` spins up `poolSize` `node:worker_threads` **once**; every
`solveLevel()` call races that level's policy-selected attempts across the same, already-warm
workers instead of spawning new ones. `solveLevelRaced(rawLevel, opts)` still exists as a
one-shot convenience wrapper (`createRacePool` + one `solveLevel()` + `shutdown()`) for
single-level callers, but batch callers now share one pool across the whole run.

- **Pool-lifecycle-only change, budget math untouched**: `budgetForMainJob`/`budgetForRepairJob`
  and the two-queue (repair/main) scheduling are byte-for-byte the same logic as before, just
  living inside `solveLevel()`'s closure instead of `solveLevelRaced`'s. This was a deliberate
  scope boundary — the probe-based hybrid failed by reshaping the budget math; this fix doesn't
  touch it at all.
- **Verified `cachedLevelKey`/`cachedPrep` correctness under many levels per worker**:
  `worker-source.mjs` was already keyed per-job by a caller-supplied `levelKey` (a
  timestamp+random string, unique per `solveLevel()` call), and `prep._cfg`/`prep._metrics` were
  already reset on every job regardless of level — confirmed by grepping `modules/solver/*.ts`
  for module-level mutable state: the only other file-scope mutable caches are
  `topology.ts`'s `_reachGen`/`_reachGenBuf` (a generation-stamped BFS scratch buffer, already
  proven safe across many levels in one process — that's exactly what any single-threaded
  `solveLevel()`-per-level batch run, e.g. `solver-bench.mjs` over 150+ levels, already does) and
  the various `IntHashMap` lower-bound caches, which live on `prep` itself and get rebuilt fresh
  every `prepLevel()` call (i.e. every level change). No new cross-level leakage risk.
- **Worker health-checking/replacement** (didn't exist before): a worker that throws is marked
  `broken` and respawned lazily on its next use. A worker whose job is still in flight when a
  level's race settles (an early success elsewhere, or the overall timeout) can't be handed a new
  job safely (`node:worker_threads` has no cooperative mid-search cancellation) — it's hard-killed
  and replaced in the background, so one level's straggler never blocks the next level's dispatch.
- **Wired in**: `scripts/stress/benchmark.mjs` now defaults to `--engine=raced` (the persistent
  pool), with `--engine=sequential` as an explicit escape hatch for exact production numbers (and
  forced automatically when `--parallel` is used, since nested worker pools would oversubscribe
  CPU). `scripts/solver-parallel/benchmark.mjs` (the dedicated raced-only tool, distinct default
  output path `benchmark-raced-latest.json`) was updated to create one `createRacePool` for its
  whole run instead of one `solveLevelRaced` call per level. `scripts/solver-bench.mjs` (the
  `solver:bench` regression gate) and `scripts/stress/regression.mjs`/`scripts/solver-fingerprint.mjs`
  were **not touched**, per the non-negotiable production-parity/determinism constraints.

**Re-measured aggregate wall time** (2026-07-10, 4-vCPU sandbox, `poolSize` default 3): OLD
(`solveLevelRaced` — pool spun up/torn down per level) vs. NEW (`createRacePool`, one pool shared
across the run), both racing the identical policy-selected attempts, over the first 50 levels of
`data/stress/stress-levels.json` at budget 8000ms:

| | solved | total wall time |
|---|---|---|
| OLD (per-level pool) | 49/50 | 287,180ms |
| NEW (persistent pool) | 49/50 | 272,536ms |

**5.1% faster in aggregate** — and, unlike the old per-level design (2/15 levels individually
faster), **45/50 levels (90%) were individually faster** under the persistent pool, only 4 were
slower (noise-level, consistent with CPU-contention variance between runs) and 1 tied. Excluding
the 5 slowest (genuinely-hard) levels, the remaining 45 "fast" levels — the exact population that
regressed under the old per-level design — were **13.96% faster in aggregate** (91,983ms →
79,142ms) under the persistent pool. This directly confirms the fix: the win is no longer coming
from 2 outlier-slow levels dominating the sum, it's a broad-based improvement from eliminating the
per-level worker-thread spin-up tax. Solved/failed *set* was identical between OLD and NEW (both
solved 49/50, the same level — a genuinely-hard-within-budget one — failing in both), confirming
the persistent pool changed only *when/where* attempts run, never *which* attempts get tried.
Full run log and raw per-level numbers are reproducible via the comparison harness described
above (OLD = `solveLevelRaced` looped per level, NEW = one `createRacePool` shared across the
loop) — not committed as a script since it's a one-off verification, not ongoing tooling.

Test coverage: `scripts/solver-parallel-unit-tests.mjs` adds pool-specific cases —
`createRacePool` solving several different levels in sequence (referee-valid solutions each
time, exercising the cross-level cache-eviction path), an exhausted level followed by a solvable
one on the same pool (no cross-level corruption), `poolSize: 1` across two levels, and
`solveLevel()` rejecting (not hanging) after `shutdown()`.

### Which tool for a corpus/large-batch solve — favor speed where it's safe to

Several `npm run` entrypoints all "run the solver over a bunch of levels" but answer different
questions; picking the fastest one that still answers YOUR question matters more than defaulting
to whichever is fastest in isolation. **None of the racing engines are available for the rows
marked "never races" below — that's not an oversight, it's the whole point of those tools (see
"Making racing the default for batch runs" above).**

| Tool | Engine | When to use | Speed |
|---|---|---|---|
| `solver:bench -- --check` | sequential, never races | The CI regression gate — diffs the solved/failed set against `logs/solver-baseline.json`. Use this to confirm a solver change didn't regress anything; it's the only source of truth for that question. | Slowest (intentionally — production parity, not speed) |
| `stress:regression` / `solver:fingerprint` | sequential, never races | Drift/determinism detection against a pinned baseline or a repeated-run comparison. Racing's own scheduling nondeterminism would inject spurious noise here, defeating the tool's purpose. | Slowest (same reason) |
| `stress:benchmark` | **raced by default** (persistent pool); `--engine=sequential` for exact production numbers; `--parallel` auto-forces sequential | The general iteration/exploration tool — "did my change make the corpus faster/slower, what's winning where." This is the one to reach for by default for a large batch run when you just want it done and don't need production-exact per-level timings. | **Fastest single-process default** — ~5–14% faster aggregate than the old per-level-pool racing (see measurement above), and dramatically faster than sequential on any run with a genuinely slow level |
| `stress:benchmark --parallel[=N]` | sequential, across **levels** (N worker threads, each solving whole levels one at a time) | You have spare cores and want to blast through many levels' *wall time*, and don't need within-level racing (e.g. a broad corpus sweep where no single level dominates). Not comparable to sequential/raced per-level timings — CPU-contended by design. | Fastest for "many levels, none individually slow" — scales with `N` up to core count |
| `stress:benchmark:raced` | always raced (persistent pool) | You specifically want the raced-only report shape/output path (`benchmark-raced-latest.json`) rather than `stress:benchmark`'s toggleable default. Functionally now equivalent to `stress:benchmark --engine=raced` with a different default `--out`. | Same as `stress:benchmark`'s raced mode |
| `solver:direct` | sequential | Ad-hoc single/few-level debugging (`--verbose`, structured `--output` JSON) — not a batch tool at all. | N/A (not a batch tool) |

**Practical guidance for "run the whole corpus, favor speed"**: use `stress:benchmark` with no
flags (raced-by-default) for a normal large-batch run. If the run is dominated by many
individually-fast levels rather than a few slow ones, `--parallel` (across-level) may win by a
wider margin than within-level racing — the two are NOT combined (see above), so on a
multi-core box it's worth trying both and comparing `totalMs` for your specific batch shape
rather than assuming one always dominates. Whatever you do, never treat `stress:benchmark`'s
raced-mode numbers (or `stress:benchmark:raced`'s) as a `solver:bench` regression baseline or a
`stress:regression` pass/fail signal — both explicitly reject that use (see their own file-header
warnings and `engineWarning`/`parallelWarning` fields in the JSON output).

## Reducing the solver's memory-bandwidth footprint — Tier 1 implemented, Tier 2/3 scoped only

Motivated by investigating S118's residual flakiness (see `data/stress/README.md`'s
floor+ceiling snapshot): after ruling out a solver bug, a memory leak, and generic CPU
throttling, the remaining suspect was memory-subsystem contention (shared cache/bandwidth
with other tenants on the host) — invisible to CPU-bound code, but real for
allocation/memory-access-heavy code. A leaner, more cache-friendly hot path can't eliminate
that kind of external contention, but it genuinely reduces how *exposed* the solver is to it
— fewer bytes moved per node means less to contend for. This is general solver-quality work,
independent of any one flaky level: less garbage collection, better cache behavior, and
(most likely) faster solves across the whole corpus, not just the marginal cases.

A full survey of `modules/solver/{search,scoring,search-state,lower-bounds,prep}.ts`'s
hot-path allocation and access patterns found the codebase already did much of this work —
this session's own distance-map flattening pass (typed arrays instead of `Map`s, see
`data/stress/README.md`'s flattening snapshots) covers most of `prep.ts`. What's below is what's
left, organized by expected risk/effort so a future pass can pick off the safe wins first.

### Tier 1 — finish the flattening pass already 90% done (low risk, node-count A/B applies exactly) — DONE

All six candidate structures are now flat typed arrays instead of `Map`s: the MP/MC
lower-bound caches (→ `IntHashMap`, `modules/solver/int-hash-map.ts` — a custom
open-addressing hash table, needed because must-cross cache keys can exceed 32 bits),
`staticNeighbors` (→ `staticNeighborKeys: Int32Array`), the flipper approach-distance maps
(→ `{ dist: Uint16Array; empty: boolean }[]`), `mustTurnCellIndex` (→ flat `Int8Array`),
and `gateSet` (→ `gateFlags: Uint8Array`); the never-read `objectiveKeyToIndex` was deleted
outright. `adjTurnCellIndex`/`surroundNeighborIndex` deliberately stay `Map`s — they're
variable-multiplicity-per-key, which doesn't fit a fixed-stride flat array without either a
generous stride (an under-sizing risk — see CLAUDE.md's memoization gotcha) or a second
indirection layer that erases the benefit. Verification for every item: an exhaustive,
timing-independent direct comparison (the original `Map`-based logic reimplemented standalone
and compared cell-by-cell/state-by-state against the flattened structure across all 156
published + 150 stress-corpus levels, zero mismatches) plus `solver:bench --check` + full
`npm run ci`. (End-to-end node-count A/B was tried first and found unreliable for this class
of change — `REPAIR_PROBE_ORDINARY_MS` races real computation time on a handful of levels,
making `nodesExpanded` non-reproducible independent of any solver-source change.)

### Tier 2 — reduce per-node/per-candidate allocation (medium risk, needs care around correctness of pooled/reused state)

- **`applyMove` allocates a fresh `UndoToken` object on every candidate examined** —
  DFS (`search.ts:73`), beam (`:429`), and repair's `takePly` (`repair-search.ts:147`) all
  call it for *every* candidate, including ones immediately rejected by the cheapest prune
  (over-length, over-intersection) before any of the more expensive checks run. This is the
  single largest, most uniform allocation source across all three search strategies — one
  object per candidate move attempted, not just per accepted move. `search-state.ts:129-130`
  already documents that the team trimmed the non-landmark shape to 15 fields specifically to
  reduce GC pressure on beam search's "~1M applyMove/undoMove cycles" — the *object-per-call*
  pattern itself was never removed, only shrunk. A pooled/reusable token (a small ring buffer
  of pre-allocated token objects, reused via LIFO since DFS/beam apply-then-undo is strictly
  nested) is the natural next step, but needs careful verification that no code path holds a
  reference to an `UndoToken` past its `undoMove` call (a reused/mutated-in-place token would
  silently corrupt state if one did).
- **`getNeighbors` allocates a fresh `candidates: number[] = []` every call**
  (`search-state.ts:274`) — one per node expansion in DFS and beam. A shared scratch array
  (matching the `_scratch`/`_sas` pattern already used in beam search and `scoreAndSort`)
  would need care for **reentrancy**: confirm no caller holds onto the returned array across
  a *nested* call to `getNeighbors` before consuming it (a quick audit of call sites, not
  expected to be an issue given the DFS/beam control flow, but must be checked, not assumed).
- **`buildCurUrgencyContext` allocates 4 fresh structures per call** (`scoring.ts:148-183`:
  a `Float64Array(mpN)`, a `Float64Array(mcN)`, a plain `Array(mcN)` of typed-array
  references, and a `Uint8Array(mcN)`) — called once per DFS node (`scoreAndSort`), once per
  beam frontier node (`search.ts:425`), and once per repair ply (`repair-search.ts:116`).
  `mpN`/`mcN` are small (≤4-6) but the call volume is exactly "once per node," matching
  `dfsFromGate`'s own hot loop. Pooling these behind a max-size scratch buffer (similar to
  `_mstEdges`) is plausible but needs the same generous-sizing discipline CLAUDE.md's
  memoization gotcha already flags for `_mstEdges` — an under-sized reused buffer is a
  silent-corruption risk, not just a missed optimization.
- **Beam's per-*phase* (not per-node) culling allocations** (`search.ts:509-534`): a `Map`
  for state dedup plus `[...dm.values()]` spread when collisions occur, a fresh sort
  comparator closure, and `.slice()`/`_diverseSelect`'s Map+per-bucket-arrays+Set+result-array
  (4+ heap objects) when diverse-beam mode is active. Lower call volume than the per-node
  items above (once per beam phase, not once per node), so lower priority, but real garbage
  on every level that hits the `cands.length > beamWidth` culling path — which, per how beam
  search is used in the attempt ladder, is common.

### Tier 3 — dense per-level indexing instead of `KEY_SPACE`-sized sparse arrays (high risk, high reward, NOT scoped in detail here)

The deepest finding, and the one with the most theoretical upside for cache-locality
specifically (as opposed to raw allocation count): every flat array in `prep.ts` is sized
`KEY_SPACE = 1,048,576` (`encoding.ts:9`, covering the full 20-bit packed-key space) even
though a 15×15 grid — CLAUDE.md's documented max — has only 225 live cells. Rough estimate
at max feature counts (4 must-cross, 4-6 must-pass, 3 twist-portal pairs): **60-90 MB of
resident memory per level solve, well over 99.9% of it unused sentinel padding.** Worse than
the raw size: because `PACK(x, y) = (y << 16) | x`, vertically-adjacent cells are `0x10000`
(65,536) elements apart in every one of these arrays — no two cells in the same grid *column*
ever share a cache line, only horizontal (x, x+1) neighbors do. Since pathfinding moves
up/down roughly as often as left/right, this means a large fraction of every distance-array
read is a fresh cache-line fetch from a mostly-empty 2 MB region, regardless of how "flat"
the array already is — flattening a `Map` to a sparse `TypedArray` fixed the hash-lookup
cost but did not fix cache locality.

A fix would translate the canonical packed key to a **dense, grid-bounded index**
(`y * gridWidth + x`, sized `gridWidth * gridHeight` ≤ 225) for the solver's own internal
per-cell arrays specifically — without touching `PACK`/`UNPACK` themselves, which are used
far more broadly than `modules/solver/` (level normalization, rendering, persistence) and
must stay as the canonical key encoding everywhere else. This is deliberately **not** scoped
to an implementation plan here: it touches every accessor in the hot path (every
`getDistanceFromArray` call site and every direct per-cell array index across `search.ts`,
`scoring.ts`, `search-state.ts`, `lower-bounds.ts`, `prep.ts`), is the largest and riskiest
item in this list by a wide margin, and its actual cache-locality payoff (as opposed to the
easier-to-predict allocation-count wins in Tiers 1-2) can only be confirmed by measurement,
not reasoning — a candidate for a dedicated follow-up investigation, not a line item to pick
up casually alongside Tier 1/2 work.

### Recommended order and verification

Tier 1 (the `Map`→flat-array conversions) is now complete — see each item's "Done" note
above for what verification recipe was actually used (node-count A/B was tried first but
proven unreliable by the Determinism Report; exhaustive direct comparison replaced it). Tier
2 needs the same rigor *plus* explicit reentrancy/lifetime audits before pooling anything (a
reused buffer that outlives its intended scope is a correctness bug, not a performance
regression — same class of risk CLAUDE.md's memoization gotcha already warns about for
`_mstEdges`). Tier 3 needs its own dedicated scoping pass once Tier 2 is in and measured;
don't attempt it as a quick follow-on. Every change needs `solver:bench --check` (156
published levels) and the full stress corpus (102 levels as of the 2026-07-11 square-grid
cleanup — see `data/stress/README.md`), same as any other solver hot-path change.

## Wall-clock-gated search probes

`reports/solver-determinism/Determinism Report.md` (produced by a separate investigation,
merged to main) root-caused level 145's flaky solution/strategy identity to
`runRepairProbe` (`orchestration.ts`): a deterministic seeded ILS search raced against a
small wall-clock window, whose win/loss decides which of two *different, both-valid*
strategies produces the final returned solution. Under memory/CPU contention the probe can
miss its own deadline on a run that would otherwise have succeeded, so the same level/seed
returns a different (still-valid) solution depending on machine load — not "less search," but
"a different branch of the ladder wins." The report found 17/20 repeated runs won via
`repair@dfs(repair)`, 3/20 fell through to `intersectionHarvest@beam5000(diverse)`; disabling
the probe made 10/10 consistent.

### `runRepairProbe` — DONE

Fixed: `runRepairProbe`'s ms-based probe cap is now a node-count budget
(`REPAIR_PROBE_ORDINARY_NODE_BUDGET`/`_BIASED_NODE_BUDGET`, `orchestration.ts`), checked via
a new optional `nodeBudget`/`out` parameter pair threaded through `repairSearchFromGate` and
`dfsFromGate` (in ADDITION to, never a substitute for, their existing ms budget — the overall
per-level ms envelope is untouched, only the probe's own win/loss decision is now
contention-independent). Calibrated by direct measurement — calling `repairSearchFromGate`
directly on the winning `(gate, config)` pair, isolated from the rest of the ladder's own
node cost, on the published corpus plus the small set of stress levels the original ms
constants were calibrated against (S030/S033/S039/S043) — **not** a guessed ms-to-nodes
conversion factor and **not** a run over the full 2000-level stress corpus (far too slow for
this kind of per-level direct-replay measurement; a full-corpus attempt was killed after 600s
having only covered 200/306 levels — S033 alone genuinely needs ~25s/10.19M nodes even cold
and isolated, which is why it stalled there). Verified via `scripts/solver-fingerprint.mjs` +
`scripts/compare-solver-fingerprints.mjs`: 5/5 identical solution hash/winning
strategy/node count on repeated isolated runs of the previously-flaky level, 0 diffs across
two full 156-level fingerprint runs, `solver:bench --check` (156/156, no regressions), and
the full `npm run ci` gate. Landed in `92f6bf9`.

(Separately, and unrelated to this fix: `data/stress/regression-set.json`'s pinned "known-hard"
baseline is currently stale — many of its levels now solve, confirmed to reproduce
identically with or without this change, i.e. caused by earlier work in this session, not
this one. `stress:regression` isn't part of the `npm run ci` gate, so this went unnoticed
until manually run. Re-baselining that pin file is a separate task, not started.)

### `dfsFromGateLDS` — DONE

Fixed: each probe wave (`_LDS_PROBE_K = [0, 1, 2, 4, 8]`) in `dfsFromGateLDS` now caps on a
feature-scaled node budget (`getLdsProbeNodeBudget`, `search.ts`) in addition to the existing
`probeCapMs` — via the same `nodeBudget`/`out` parameter pair already threaded through
`dfsFromGate` for `runRepairProbe`, accumulated across waves (`probeNodesUsed`) the same way
`runRepairProbe` accumulates node spend across gates. `probeCapMs` itself is untouched — same
floor/ceiling formula, same constants — and remains the active protector for a heavily
budget-diluted attempt exactly as before; the node budget can only make a well-funded attempt's
probe phase stop *sooner* (once its deterministic node allotment is spent), never later, so it
cannot reintroduce the cross-attempt starvation that sank the three earlier `probeCapMs`
redesigns (see the "why this one is harder" writeup below, kept for the reasoning trail). If the
per-level budget undershoots a genuinely hard level, the probe phase simply exhausts its
allotment and falls through to the existing, already-tested unbounded `k=∞` fallback —
deterministically, every run — rather than timing out.

Calibrated by direct measurement: `dfsFromGateLDS` called directly (`PF_LDS_DEBUG=1`, isolated
fresh `prep`, mirroring the repair-probe recipe) on the winning `(gate, config)` pair for every
probe-phase-solved level across the published corpus (144 of 156) and the 150-level hypothesis
stress corpus (71 of 150) — **not** the ~2000-level random stress corpus (too slow for
per-level direct-replay measurement, confirmed by re-hitting the same wall a prior attempt hit:
killed after 600s having covered a fraction of a much smaller combined set). The published
corpus's hardest probe-solved case needs 1,926,137 nodes (area 144, reqLen 59, 2 special
objectives — the same level and node count the Determinism Report and this section's original
audit both independently cite); the chosen coefficients give it ~1.64x headroom. Across the full
215-level calibration set only one stress-corpus outlier undershoots (a level whose real cost
isn't well explained by area/reqLen/special alone) — it deterministically takes the unbounded
fallback path instead of the probe, still solves, not a stress-regression by definition (a
regression is a previously-solved level that becomes unsolved).

Verified: `tsc --noEmit` + `eslint` clean; full `vitest run` (747/747, including two new
`getLdsProbeNodeBudget` unit tests mirroring `getTrapSpotBudgetMs`'s own scaling-and-bounds
test); `check:no-solver-level-numbers` clean; level 131 and level 145 (the repair-probe case,
to confirm no disturbance) each 5/5 identical `solutionHash`/`winningStrategy`/`nodesExpanded`
on isolated fresh-solver runs; two full 156-level `solver-fingerprint` runs, 0 diffs;
`solver:bench --check` 156/156, no regressions vs. `logs/solver-baseline.json`;
`stress:regression` on the 150-level hypothesis corpus, 0 regressions (15 improvements against
the separately-known-stale pin file, unrelated to this change); full `npm run ci` green.

The original scoping notes that motivated this fix (the level-131 contention-signature
analysis, why a flat node-count constant was rejected in favor of feature-scaled budgeting,
and the two things the fix deliberately avoided reusing) are superseded by the shipped design
above; see git history on this file for the full reasoning trail if it's ever needed again —
the shape of the fix (scale by static level features, same principle as `getTrapSpotBudgetMs`)
is what matters going forward, not the trail that arrived at it.

## Solver speedup & robustness backlog (current-state summary)

Kept as one place to check "what's done, what's scoped, what's untouched" without re-reading
every section above in full.

**Done, shipped:**
- Tier 1 memory-bandwidth flattening (`staticNeighborKeys`, `flipperApproachEven`/`Odd`,
  `gateFlags`, `mustTurnCellIndex`, `mustPass`/`mustCrossLowerBound` caches via `IntHashMap`,
  dead `objectiveKeyToIndex` deleted) — see "Reducing the solver's memory-bandwidth
  footprint" above.
- Parallel attempt racing (`scripts/solver-parallel/`, Node-only backend tooling, zero
  production/browser risk) — see "Parallel attempt racing" above.
- `runRepairProbe`'s wall-clock determinism bug — see above, this section.
- `dfsFromGateLDS`'s wall-clock determinism bug — see above, this section.

**Scoped in detail, not implemented (safe to pick up directly from this doc):**
- Tier 2 memory-bandwidth (per-node/candidate allocation reduction: `UndoToken` pooling,
  `getNeighbors`'s per-call `candidates` array, `buildCurUrgencyContext`'s 4 per-call
  allocations, beam's per-phase dedup `Map`) — see Tier 2 under the memory-bandwidth section.
  Needs reentrancy/lifetime audits before pooling anything, same rigor as Tier 1.

**Named but deliberately not scoped in detail (bigger, needs its own dedicated pass):**
- Tier 3 memory-bandwidth (dense per-level cell indexing instead of `KEY_SPACE`-sized sparse
  arrays, fixing the cache-locality cost `PACK`'s `(y<<16)|x` layout imposes on every
  vertically-adjacent-cell access) — see Tier 3 under the memory-bandwidth section. Largest,
  riskiest item surveyed; payoff can only be confirmed by measurement, not reasoning.

**Housekeeping, not a solver-speed issue but affects verification hygiene:**
- `data/stress/regression-set.json`'s pinned "known-hard" baseline is stale (many pinned levels
  now solve, unrelated to any change made in this pass) and `stress:regression` isn't wired
  into `npm run ci`, so staleness like this goes unnoticed until someone runs it by hand.
  Re-baselining the pin file (and/or wiring the check into `ci`) is a separate task.

**Not yet investigated at all** (no scoping work done, raised here only so it isn't lost):
none identified beyond the above as of this session — the memory-bandwidth survey and the
wall-clock-probe audit were both deliberately broad (full `modules/solver/*.ts` hot-path
sweeps), so anything genuinely new would need its own fresh survey pass rather than picking
up a dangling thread from this one.

## History: the MST-bound scratch-buffer bug

CLAUDE.md's memoization gotcha references this as the concrete example of why an under-keyed
or under-sized cache is a correctness bug, not a performance one. Full writeup: the MST lower
bound's shared scratch buffer (`_mstEdges`) was sized for "max 6 nodes," but must-turn
landmarks fold into `mustPassKeys`, silently exceeding that count on some levels. TypedArray
writes past the end are silent no-ops, so the bound was computed from stale data and came out
*tighter than mathematically valid* — 34 instead of the correct 27 on a real stress-corpus
level, a live risk of declaring a genuinely solvable level unsolvable. Fixed in `ed6c9e6`/
`3424772`: generous, defensive-fallback sizing for the scratch buffer, plus a correctly-keyed
must-cross lower-bound cache (the base-4-digit-per-must-cross-index key described in CLAUDE.md)
verified via ~30,000 differential-tested states against an independent reference
implementation. Full snapshot: `data/stress/README.md`'s MST-bound section. Any new memoization on
solver state should ship with the same differential-testing rigor before being trusted.

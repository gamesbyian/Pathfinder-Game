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
  - `mustPass ≥ 3 AND flippers ≥ 2` — progressive diverse-beam ladder (`intersectionHarvest` bw 5000→15000 diverse, then bw 50000) as the sole strategy.
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

## DFS (`dfsFromGate`)
- Iterative DFS with undo tokens (not recursive, avoids stack overflow)
- `applyMove()` mutates state + returns undo token; `undoMove()` restores all state
- LDS (Limited Discrepancy Search) wrapper: probes k=0,1,2,4,8 then unbounded
- Pruning heuristics:
  - Over-length: path can't reach goal without exceeding `reqLen`
  - Over-intersection: current ints > reqInt
  - MC ceiling: can't achieve required must-cross count from here
  - Goal distance: BFS distance to goal > remaining length budget
  - Parity: (goal_parity XOR position_parity XOR remaining_steps_parity) ≠ 0
  - MP/MC lower bounds: MST distance to remaining objectives > remaining steps
  - Connectivity: isolating a region that must be visited

## Beam Search (`beamSearchFromGate`)
- Frontier of parent-pointer nodes `{ key, prev, depth, score, sc, sk? }`
- Path reconstructed into reusable `_scratch[]` array — no O(depth) allocations per candidate
- Replay via `_beamResetState()` + `applyMove()` loop from reconstructed path
- Same pruning checks as DFS applied to each candidate
- `scoreAndSort` uses module-level `_sas[4]` Float64Array scratch + insertion sort (no per-call allocation)
- Default beam width: 2000. Wide beams (5000, 50000) for very hard levels.
- **State dedup**: before sort+select, candidates sharing `(key, sc)` are merged — only the highest-scoring path to each `(position, constraint-state)` tuple survives. Map key is `c.key + c.sc * KEY_SPACE` (exact float64). Disabled for portal levels (portal usage isn't in `sc`, so merging would be incorrect).
  - `sc = (adjTurnMask&0xF)<<24 | (mustTurnMask&0xF)<<20 | (surroundMask&0xF)<<16 | (flipperUsedMask<<12) | (mustCrossMask<<8) | (mpVisitedMask<<4) | (ints&0xF)`
- **Diverse beam** (`diverseBeam` flag + `_diverseSelect`): buckets candidates by `sk = (flipperUsedMask<<4)|(mustCrossMask&0xF)`, guarantees `floor(beamWidth/numBuckets)` per bucket, then fills remaining slots from the global top. Prevents beam collapse to one constraint-state mode on levels with flippers and must-cross cells.
- **Progressive widening**: hard levels use `[bw=5000 diverse, bw=15000 diverse, bw=50000]` config sequence — narrow beams solve fast if they can; wide beam is a fallback with `minBudgetFraction: 1.0`.

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
The solver ships an ablation framework (45 togglable feature flags) for measuring what each search
feature contributes. Full reference: [`ablation.md`](ablation.md). Quick start: `npm run
ablation:baseline`, `npm run ablation:single`, `npm run ablation:analyze`.

## Command-line usage & tooling

> **The solver CLI runs through an esbuild bundle, NOT raw `tsx`.** `solver:direct` and
> `solver:bench` go through `scripts/run-bundled.mjs` (esbuild-bundle → `node`). The hot search
> loops run **~5× slower under `tsx`** (it transforms each `.ts` module separately, so per-node
> cross-module calls in the hot path don't inline). This regressed silently when the hot solver
> files became `.ts` (production was never affected — it ships a Vite/esbuild bundle). Do **not**
> revert these scripts to `tsx`. `npm run solver:bench -- --check` guards the full-corpus solve
> rate against `audits/solver-baseline.json` (note: the single hardest level can time out under a
> CPU-throttled sandbox — confirm any suspected regression by re-running the pre-change code).

### `solver:direct`
```bash
npm run solver:direct -- --levels=133,146 --budget-ms=30000 --output=audits/local-v2/out.json
npm run solver:direct -- --levels=all --budget-ms=30000 --output=audits/local-v2/full.json
npm run check:audit-output -- audits/local-v2/full.json   # validate audit JSON structure
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
    elapsedMs: Number
  }, ...]
}
```

### Debugging a slow or failing level
```bash
npm run solver:direct -- --levels=<N> --budget-ms=60000 --verbose
# Or inspect the attempt breakdown from a JSON run:
npm run solver:direct -- --levels=<N> --budget-ms=30000 --output=audits/local-v2/debug.json
node -e "
  import { readFileSync } from 'fs';
  const d = JSON.parse(readFileSync('audits/local-v2/debug.json'));
  d.levels.find(l => l.level === <N>).attempts.forEach((a,i) =>
    console.log(i+1, a.profile, a.template, 'bw=' + (a.beamWidth||0), a.ok ? 'WIN' : 'fail', a.elapsedMs + 'ms')
  );
"
```

### Performance-optimization workflow
1. Full audit: `npm run solver:direct -- --levels=all --budget-ms=30000 --output=audits/local-v2/full.json`
2. Identify slow levels (>2000ms per level is notable) and check each one's attempt breakdown (above).
3. Identify which config wins and at what attempt number.
4. Modify the policy in `modules/solver/attempts.ts` (not `Solver.ts` — that is a thin facade).
5. Re-run targeted levels, then the full audit to check for regressions.
6. `npm run ci` (and `npm run solver:bench -- --check`) before committing.

`npm run audit:newhint:full` runs the full causality-metric audit, maintaining a rolling history
alongside `audits/raw/latest.json` (`HISTORY_MAX_BYTES` = 95 MB, `HISTORY_MAX_ENTRIES` = 4000).

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
npx tsx scripts/trap-search-audit.mjs --levels=all --extended-budget=60000

# False-goal viability: flag levels whose false goals sit where no path can ever end (the trap
# could never fire). Timeouts report "inconclusive", never "invalid". A cheap parity test resolves
# most cases even when full enumeration times out (incl. portal levels whose portals are
# parity-preserving); for a cell left "inconclusive", a goal-directed solve (set that cell as the
# goal, run solver:direct) is far cheaper than enumeration — a solved path proves reachability.
npx tsx scripts/trap-search-audit.mjs --check-false-goals --fg-budget=90000
npx tsx scripts/trap-search-audit.mjs --check-false-goals --levels=63
```

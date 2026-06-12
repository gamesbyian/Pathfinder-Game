# Pathfinder Game — Developer Reference

## Project Overview
A browser-based puzzle game where players draw paths on a grid from a starting gate to a goal cell. The path must satisfy constraints: required length, required intersections, must-pass cells, must-cross cells, filters, flipping filters, portals, geese, and false goals.

The solver (SolverV2.js) generates hint paths used in the game's hint system.

## Key Files

| File | Purpose |
|---|---|
| `SolverV2.js` | Main solver — 1900+ lines, DFS + beam search |
| `levels.js` | 147 level definitions (raw wire format) |
| `modules/domain/` | Game domain logic (move rules, path validation, etc.) |
| `modules/domain/path-validator.js` | Used by solver to validate returned paths |
| `scripts/run-solverv2-direct.mjs` | CLI for running the solver directly |
| `audits/raw/latest.json` | Latest full 147-level audit baseline |
| `audits/local-v2/` | Local test outputs |

## Testing Commands

```bash
# Unit tests (fast, ~5s)
npm run test:domain
npm run test:startup-smoke
npm run test:hint-path-oracle   # validates solver output against all 147 levels

# Targeted solver runs
npm run solver:direct -- --levels=145,146,147 --budget-ms=30000 --output=audits/local-v2/out.json
npm run solver:direct -- --levels=74,129,130,140,145,146,147 --budget-ms=30000 --output=audits/local-v2/out.json
npm run solver:direct -- --levels=all --budget-ms=30000 --output=audits/local-v2/full.json

# CI suite
npm run ci
```

## Level Stats (as of 2026-06-12)
- 147 levels total
- Max must-pass cells: 4
- Max must-cross cells: 4
- Max portals: 3
- Max flipping filters: 4
- Grid sizes up to 15×15
- All masks fit in 32-bit integers (no BigInt needed)

## Solver Architecture (SolverV2.js)

### Core Flow
1. `normalizeRawLevelV2()` — convert wire format to internal representation
2. `prepLevel()` — precompute per-level data (dist maps, adjacency, masks)
3. `solveLevelV2()` — attempt loop over gates × configs; each attempt runs DFS or beam
4. Return `{ ok, solution, attempts, totalMs }`

### Attempt Configs
Selected by `getAttemptConfigs()` based on level archetype:
- `near-closure` — sparse near-loop levels
- `high-intersection-burden` — reqInt ≥ 4 and density ≥ 0.55
- `must-cross-heavy` — ≥2 must-cross and reqInt ≥ 2
- `portal-heavy` — ≥4 portal endpoints
- `default` — all other levels

### DFS (`dfsFromGate`)
- Iterative DFS with undo tokens (not recursive)
- `applyMove()` mutates state + returns undo token; `undoMove()` restores
- LDS (Limited Discrepancy Search) wrapper: probes k=0,1,2,4,8 then unbounded
- Pruning: over-length, over-intersection, MC ceiling, goal distance, parity, MP/MC lower bounds, connectivity

### Beam Search (`beamSearchFromGate`)
- Frontier of parent-pointer nodes `{ key, prev, depth, score }`
- Path reconstructed into reusable `_scratch[]` array — no O(depth) allocations per candidate
- Replay via `_beamResetState()` + `applyMove()` loop from reconstructed path
- Same pruning checks as DFS applied to each candidate

### Key Data Structures
```js
state = {
  path: number[],        // packed cell keys
  visited: Uint16Array,  // visit counts (KEY_SPACE = 1<<20)
  edgeUsage: Uint8Array, // axis bits: 1=H, 2=V used
  ints: number,          // intersection count so far
  mustMask: number,      // 32-bit: bit i set while must-pass[i] unvisited
  mustCrossMask: number, // 32-bit: bit i set while must-cross[i] unsatisfied
  crossCounts: Uint8Array,
  mpVisitedMask: number, // 32-bit: bit i set once must-pass[i] visited
  portalJumps: number,
  flipperUsedMask: number,
  lastWasPortalJump: boolean,
}
```

### prepLevel() Precomputed Data
- `prep.distMap` — BFS distance Map from goal to all cells
- `prep.goalDistArr` — Uint16Array mirror of distMap (fast O(1) array lookup)
- `prep.mpDistArrs[]` — Uint16Array per must-pass cell (typed array lookup)
- `prep.mcDistArrs[]` — Uint16Array per must-cross cell
- `prep.objDistArrs[]` — Uint16Array per objective key
- `prep.staticNeighbors` — Map<packedKey, Int32Array> of precomputed static neighbors, stored as flat [nk, axis, nk, axis, ...] pairs; excludes blocks/geese/false-goals/gate-cells and regular-filter violations
- `prep.mustPassIndex / mustCrossIndex` — Map<key, index>
- `prep.flipperIndexMap / flipperInitAxes` — flipper state tracking
- `prep.mcPairDist / mpPairDist` — pairwise BFS distances for MST lower bounds
- `prep.mcApproachDistMaps` — BFS distance to approach cells for must-cross 2nd visits

### Cell Key Encoding
```js
PACK(x, y) = ((y << 16) | x) >>> 0
UNPACK(k)  = { x: k & 0xFFFF, y: (k >>> 16) & 0xFFFF }
KEY_SPACE  = 1 << 20  // 1M entries for Uint16Array/Uint8Array
```

### Axis Encoding
```js
AXIS_H = 1  // horizontal move
AXIS_V = 2  // vertical move
AXIS_NONE = 0
```

## Performance Baseline (audits/raw/latest.json — 2026-06-11)
- 147/147 solved
- Total runtime: ~127.7s
- Slow levels: L145 (24.9s, intersectionHarvest beam w=50000), L140 (14.5s), L74 (15s), L129 (19.3s), L130 (13.9s), L146 (8s), L147 (3.4s)

## Optimizations Applied (branch: claude/solverv2-hard-perf-t87ltu)
1. **BigInt → Number masks (P2)**: `mustMask` and `mustCrossMask` converted from BigInt to 32-bit Number throughout. Max 4 bits needed; saves BigInt overhead in hot paths.
2. **Static adjacency precomputation (P3)**: `prepLevel()` builds `prep.staticNeighbors` (Map of Int32Array pairs) encoding all statically-valid neighbors per cell. `getNeighbors()` now iterates this precomputed list; only dynamic checks (edge usage, portal revisit, MC lock, flipper orientation) remain in the hot loop.
3. **Beam parent-pointer nodes (P1+P5)**: Beam frontier entries replaced from `{ path: [...], score }` to `{ key, prev, depth, score }`. Eliminates O(depth) path array copies per candidate. Path reconstruction uses a single reusable `_scratch[]` array.
4. **Typed array dist maps**: `prep.goalDistArr`, `prep.mpDistArrs[]`, `prep.mcDistArrs[]`, `prep.objDistArrs[]` are `Uint16Array(KEY_SPACE)` mirrors of the corresponding Maps. `_dget(arr, k)` replaces `map.get(k) ?? Infinity` in scoring and pruning hot paths.
5. **scoreAndSort**: Eliminated per-call `scored` array allocation; uses module-level `_sas[4]` Float64Array scratch + insertion sort.

## After-Optimization Results (full 147-level run)
- 147/147 solved (no regressions)
- Total runtime: ~113s (-11.4% vs baseline)
- L145: -26%, L146: -26%, L147: -24%, L140: -4%, L130: -4%

## Common Gotchas
- **Portal forced-move**: when at a portal cell and last move was NOT a portal jump, `getNeighbors()` returns only `[portal.dest]`, bypassing static adjacency. This is intentional.
- **Gate cells cannot be re-entered**: Excluded from `staticNeighbors` targets; also guards in `isValidMove`.
- **Must-cross lock**: Turning at a 1st-pass must-cross cell would consume both axis bits, blocking the required 2nd crossing. This dynamic check remains in `_isMoveDynValid`.
- **Flipping filters**: Current orientation depends on `flipperUsedMask` (how many others have been used). Fully dynamic — cannot be statically precomputed.
- **Dense levels (density ≥ 0.70)**: `mustMask` is set to 0 (not `initialMustMask`) to avoid disrupting near-Hamiltonian DFS ordering. Must-pass correctness is enforced via `mpVisitedMask` instead.
- **Uint16Array dist sentinel**: `0xFFFF` means "unreachable/Infinity" in typed array dist maps.

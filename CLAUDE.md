# Pathfinder Game — Developer Reference

## Project Overview

Pathfinder is a browser-based grid puzzle game. The player draws a continuous path on a rectangular grid from a starting gate to a goal cell. A solution is accepted only when all constraints are simultaneously satisfied: exact path length, exact intersection count, and all object-specific obligations (must-pass, must-cross, portals, filters, etc.).

The solver (`SolverV2.js`) generates hint paths used by the in-game hint system. This document covers the solver architecture, game rules, repository layout, and all tools.

---

## Pathfinder Game Rules

### Core Path Mechanics
- Path starts on a **gate** and ends on the **goal** (true goal, not a false goal).
- **Counted length** = number of nodes − 1 − portal jumps. Portals teleport for free.
- **Intersection** = entering a previously visited cell (excluding gate and goal revisits).
- The path must hit **exact** length (`reqLen`) and **exact** intersection count (`reqInt`).
- Moving diagonally or more than 1 step at a time is not permitted.

### Grid Objects
| Object | Behavior |
|---|---|
| **Gate** | Path start. Multiple gates possible (player picks one). Cannot be re-entered once left. |
| **Goal** | Path end (true win condition). Only one true goal per level. |
| **False goal** | Looks like a goal. Entering it triggers a trap (hazard) — path fails. Solver ignores false goals (MoveContext.SOLVER). |
| **Block** | Impassable. BFS distances and neighbors precomputed excluding blocks. |
| **Must-pass** | Cell that the path must visit at least once. Tracked via `mustMask` / `mpVisitedMask`. |
| **Must-cross** | Cell the path must enter from two opposite sides (i.e., cross through it at least twice). Uses `mustCrossMask` + `crossCounts`. |
| **Filter (regular)** | Forces entry along a fixed axis (axis=1 H, axis=2 V). Statically filtered out of `staticNeighbors` for wrong-axis neighbors. |
| **Flipping filter** | Starts with its declared axis; flips to the other axis each time the path uses it (based on `flipperUsedMask` count parity). Cannot turn on it. Fully dynamic — can't be precomputed. |
| **Portal** | Pair of cells. Entering a portal forces an immediate jump to the paired exit at zero path-length cost. Portals cannot be reused. When standing on a portal cell and the last move was NOT a portal jump, `getNeighbors()` returns only the portal destination — bypassing static adjacency entirely. |
| **Goose** | Hazard. Entering a goose cell in PLAY mode fails the path. The solver ignores geese (MoveContext.SOLVER). |

### Win Condition
All of the following must be true simultaneously when the path reaches the goal:
1. Counted length = `reqLen`
2. Intersection count = `reqInt`
3. All must-pass cells visited (`mustMask === 0` or `mpVisitedMask === initialMpMask`)
4. All must-cross constraints satisfied (`mustCrossMask === 0`)

---

## Repository Layout

```
/
├── SolverV2.js              Main solver facade — thin shim over modules/solver/
├── levels.js                147 levels as window.RAW_LEVELS (1-indexed coords)
├── PATHFINDER_SPEC.md       Full product spec (authoritative game rules)
├── design_bible.txt         Design notes
├── index.html               Main browser entry point (inline styles include
│                            `.hidden { display: none !important; }` so hide/show
│                            works without Tailwind CDN)
├── eslint.config.mjs        ESLint 9 flat config covering modules/ + scripts/
├── playwright.config.mjs    Playwright config (uses pre-installed Chromium via
│                            PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH env var)
├── themes.js                Theme definitions
├── firebase-config.js       Firebase public web config (client-side)
├── firebase.json            Firebase deploy config
├── firestore.rules          Firestore security rules
├── firestore.indexes.json   Firestore composite indexes
├── package.json             NPM scripts (CI is 38+ steps; see Testing Commands)
│
├── tests/                   Playwright browser tests
│   ├── smoke.spec.mjs       Boot, load, navigation tests (7 tests)
│   └── gameplay.spec.mjs    Path drawing, reset/undo, guide modal (5 tests)
│
├── modules/
│   ├── domain/              Core game logic (pure functions, no DOM)
│   │   ├── cell-key.js      PACK/UNPACK encoding
│   │   ├── geometry.js      Grid geometry helpers
│   │   ├── level-codec.js   Level encode/decode
│   │   ├── level-fingerprint.js  Level dedup/identity
│   │   ├── level-validation.js   Editor validation
│   │   ├── move-context.js  MoveContext presets (PLAY/SOLVER/TAP_ROUTE/EDITOR)
│   │   ├── move-rules.js    isValidMove — the single source of truth for legal moves
│   │   ├── path-validator.js  validateCandidatePath — used by solver to verify results
│   │   └── portal-utils.js  resolvePortal
│   ├── editor/              Level editor model and history
│   ├── engine/              Engine sub-controllers (createXxxController factories)
│   │   ├── challenge-options.js  Challenge option handling
│   │   ├── hazard-controller.js  Goose/hazard animation timers
│   │   ├── level-flow.js         Level load/advance/prev/restart flow
│   │   ├── overlay-controller.js Game overlay transitions
│   │   ├── path-navigator.js     Path drawing and navigation
│   │   ├── render-loop.js        Canvas render-dirty signaling
│   │   ├── review-mode.js        Review-mode state management
│   │   ├── solver-manager.js     In-game hint/solver lifecycle
│   │   ├── step-dispatcher.js    Per-step event dispatch
│   │   ├── tap-router.js         Tap/click routing to game objects
│   │   └── win-controller.js     Win detection and modal flow
│   ├── input/               Controllers (gamepad, pointer, solver overlay, etc.)
│   ├── persistence/         Firebase client, progress store, submission repo
│   ├── render/              Canvas renderer and draw helpers
│   ├── runtime/             Game-rules, path-state, state machine, step processor
│   │   ├── game-rules.js    Win metrics and win-condition logic
│   │   ├── path-state.js    Path mutations and derived path state
│   │   ├── state-machine.js Legal logic-state transitions
│   │   └── step-processor.js Per-step computation and event generation
│   ├── solver/              Modularized solver internals (15 files)
│   │   ├── archetype.js     Level archetype detection
│   │   ├── attempts.js      Attempt config generation (getConfiguredAttemptConfigs)
│   │   ├── distance.js      BFS distance utilities
│   │   ├── encoding.js      Cell key encoding helpers
│   │   ├── lower-bounds.js  MST/MP/MC lower-bound pruning
│   │   ├── normalization.js Raw-to-internal level normalization
│   │   ├── orchestration.js Main solve loop (solveLevelV2)
│   │   ├── policy.js        Policy profiles and structural templates
│   │   ├── prep.js          Per-level precomputation (prepLevel)
│   │   ├── scoring.js       Move scoring (scoreMoveV2)
│   │   ├── search-state.js  Mutable DFS/beam state object
│   │   ├── search.js        DFS + beam search primitives
│   │   ├── solution.js      Solution validation and result packing
│   │   ├── testing-api.js   Test/debug helpers exposed by SolverV2
│   │   ├── topology.js      Connectivity pruning
│   │   └── trap-search.js   Trap spot detection
│   ├── theme/               Theme normalization and registry
│   ├── ui/                  Modal, toast, layout, loading, solver overlay UI
│   ├── app.js               App construction and dependency wiring
│   ├── boot.js              Boot sequence
│   ├── core.js              Core constants, mode/status enums, audio bus
│   ├── data.js              Level data access
│   ├── debug.js             Debug helpers
│   ├── editor.js            Editor integration
│   ├── engine.js            Game engine facade (coordinates sub-controllers)
│   ├── input.js             Input integration
│   ├── levelutils.js        Level utility functions
│   ├── loader.js            Level/theme loader
│   ├── persistence.js       Persistence integration
│   ├── renderer.js          Renderer integration
│   ├── state-actions.js     State mutation helpers (all ENGINE mutations go here)
│   ├── state-slices.js      State slice factories (nav, editor, etc.)
│   ├── state.js             App state (top-level ENGINE object)
│   ├── theme-engine.js      Theme engine
│   ├── themes.js            Theme definitions
│   └── ui.js                UI integration
│
├── scripts/                 Node.js CLI tools (ES modules)
│   ├── run-solverv2-direct.mjs      Main solver CLI
│   ├── hint-path-oracle.mjs         CI gate — validates hint paths
│   ├── domain-unit-tests.mjs        Domain unit tests
│   ├── startup-smoke-test.mjs       Boot harness integration tests
│   ├── check-audit-output.mjs       Validate audit telemetry JSON structure
│   ├── check-audit-artifacts.mjs    CI gate for audit artifact presence
│   ├── check-dead-scripts / check-package-scripts.mjs  Verify all npm script targets exist
│   ├── check-engine-state-boundary.mjs  Enforce ENGINE mutations via state-actions.js only
│   ├── check-raw-inner-html.mjs     Ban unsafe innerHTML patterns
│   ├── check-secret-hygiene.mjs     Scan for committed secrets
│   ├── check-third-party-dependencies.mjs  Audit CDN/external deps
│   ├── diagnose-failing-levels.mjs  Diagnostic for specific failing levels
│   ├── editor-validation-test.mjs   Editor behavior tests
│   ├── engine-controllers-unit-tests.mjs  Engine sub-controller tests
│   ├── export-data-assets.mjs       Bundle data assets for serving
│   ├── firestore-rules-test.mjs     Firestore security rules tests
│   ├── import-published-levels.mjs  Import levels from Firestore (needs FIREBASE_BEARER_TOKEN)
│   ├── run-audit-export.mjs         Full causality-metric audit export (rolling history)
│   ├── solver-*-unit-tests.mjs      13 solver module unit test files
│   ├── state-unit-tests.mjs / state-actions-unit-tests.mjs
│   ├── trap-search-audit.mjs        findTrapSpots timing audit
│   ├── validate-bundled-levels.mjs  Validates all 147 bundled levels at CI time
│   ├── ablation-config.mjs          Ablation feature registry + experiment catalogue
│   ├── run-ablation.mjs             Ablation experiment runner (controlled measurement)
│   └── analyze-ablation.mjs         Ablation analysis + report generator
│
├── audits/
│   ├── raw/latest.json      Original performance baseline (147/147, ~127.7s)
│   ├── local-v2/            Local solver run outputs (JSON)
│   │   ├── full-after-*.json   Full 147-level run snapshots at each optimization step
│   │   └── *.json              Targeted level run outputs
│   ├── local/               Older local outputs
│   ├── local-direct/        Direct solver run outputs
│   ├── hint-path-replay/    Hint replay validation results
│   ├── hint-validation/     Hint validation outputs
│   └── ablation/            Ablation lab outputs (run-*.json, analysis JSON)
```

> **Note**: `package.json` includes `check:dead-scripts` to catch npm scripts that reference missing local Node entrypoints. `check:engine-state-boundary` enforces that all `modules/engine/*.js` files mutate ENGINE state only through `modules/state-actions.js` helpers.

---

## Testing Commands

```bash
# Full CI suite (~38 steps: checks + unit/integration/browser tests)
npm run ci

# Individual check commands
npm run check:dead-scripts           # Verify all npm script targets exist
npm run check:lint                   # ESLint across modules/ + SolverV2.js + scripts/
npm run check:secret-hygiene         # Scan for committed secrets
npm run check:engine-state-boundary  # Enforce ENGINE mutations via state-actions.js
npm run check:raw-inner-html         # Ban unsafe innerHTML patterns
npm run check:audit-artifacts        # Verify audit artifact presence

# Unit / integration tests
npm run test:domain             # Domain unit tests
npm run test:startup-smoke      # Boot harness integration tests
npm run test:hint-path-oracle   # Validates solver output against all 147 levels
npm run test:bundled-levels     # Validates all 147 bundled levels (schema + solver)
npm run test:engine-controllers # Engine sub-controller unit tests
npm run test:path-navigator     # Path navigator unit tests
npm run test:overlay-controller # Overlay controller unit tests
npm run test:state              # State slice unit tests
npm run test:state-actions      # State-actions mutation tests
npm run test:firestore-rules    # Firestore security rules tests
# ... and 15+ more test:* targets for individual modules (see package.json ci chain)

# Playwright browser tests (12 tests across smoke + gameplay specs)
npm run test:e2e
# If browser path differs from expected, set env var:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run test:e2e

# Targeted solver runs
npm run solver:direct -- --levels=133,146 --budget-ms=30000 --output=audits/local-v2/out.json
npm run solver:direct -- --levels=all --budget-ms=30000 --output=audits/local-v2/full.json
npm run solver:direct -- --levels=74,129,130,140,145,146,147 --budget-ms=30000 --output=audits/local-v2/hard.json

# Validate audit JSON structure
npm run check:audit-output -- audits/local-v2/full.json

# Trap-spot timing audit (separate from hint solver)
node scripts/trap-search-audit.mjs --levels=all --extended-budget=60000
```

### solver:direct flags
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

---

## Level Stats (as of 2026-06-12)
- 147 levels total
- Max must-pass cells: 4
- Max must-cross cells: 4
- Max portals: 3 pairs (6 portal keys)
- Max flipping filters: 4
- Grid sizes up to 15×15
- All masks fit in 32-bit integers (no BigInt needed)
- Level coordinates in `levels.js` are **1-indexed**; solver normalizes to 0-indexed internally

---

## Solver Architecture (SolverV2.js)

### Core Flow
1. `normalizeRawLevelV2()` — convert wire format (1-indexed) to internal representation (0-indexed, packed keys)
2. `prepLevel()` — precompute per-level data (dist maps, adjacency, masks)
3. `solveLevelV2()` — attempt loop over gates × configs; each attempt runs DFS or beam
4. `validateCandidatePath()` — verify returned solution against domain rules
5. Return `{ ok, solution, attempts, totalMs }`

### Attempt Configs
Selected by `getAttemptConfigs(level)` based on level archetype. Each config is:
```js
{ profileName: String, template: Object|null, beamWidth?: Number, minBudgetFraction?: Number }
```
- If `beamWidth` is set: run beam search. Otherwise: DFS.
- `minBudgetFraction`: minimum fraction of per-gate budget this config must receive (for critical configs that need full budget to converge).

### Archetypes (detectArchetype)
Checked in priority order:
1. **near-closure** — `reqInt ≤ 1 AND navDensity < 0.35` — near-loop sparse levels
2. **high-intersection-burden** — `(reqInt≥5 AND density≥0.45) OR (reqInt≥4 AND density≥0.55) OR reqInt≥10`
3. **must-cross-heavy** — `mustCrossKeys.length ≥ 2 AND reqInt ≥ 2`
4. **portal-heavy** — `portalMap.size ≥ 4`
5. **default** — everything else

`navDensity = reqLen / navArea` where `navArea = w×h − blocks − geese − falseGoals − gates`.

### DFS (`dfsFromGate`)
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

### Beam Search (`beamSearchFromGate`)
- Frontier of parent-pointer nodes `{ key, prev, depth, score, sc, sk? }`
- Path reconstructed into reusable `_scratch[]` array — no O(depth) allocations per candidate
- Replay via `_beamResetState()` + `applyMove()` loop from reconstructed path
- Same pruning checks as DFS applied to each candidate
- `scoreAndSort` uses module-level `_sas[4]` Float64Array scratch + insertion sort (no per-call allocation)
- Default beam width: 2000. Wide beams (5000, 50000) for very hard levels.
- **State dedup**: before sort+select, candidates sharing `(key, sc)` are merged — only the highest-scoring path to each `(position, constraint-state)` tuple survives. Map key is `c.key + c.sc * KEY_SPACE` (exact float64). Disabled for portal levels (portal usage isn't in `sc`, so merging would be incorrect).
  - `sc = (flipperUsedMask<<12)|(mustCrossMask<<8)|(mpVisitedMask<<4)|(ints&0xF)`
- **Diverse beam** (`diverseBeam` flag + `_diverseSelect`): buckets candidates by `sk = (flipperUsedMask<<4)|(mustCrossMask&0xF)`, guarantees `floor(beamWidth/numBuckets)` per bucket, then fills remaining slots from the global top. Prevents beam collapse to one constraint-state mode on levels with flippers and must-cross cells.
- **Progressive widening**: hard levels use `[bw=5000 diverse, bw=15000 diverse, bw=50000]` config sequence — narrow beams solve fast if they can; wide beam is a fallback with `minBudgetFraction: 1.0`.

### Key Data Structures
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
}
```

### prepLevel() Precomputed Data
- `prep.distMap` — BFS distance Map from goal to all reachable cells
- `prep.goalDistArr` — Uint16Array[KEY_SPACE] mirror of distMap (fast O(1) lookup)
- `prep.mpDistArrs[]` — Uint16Array per must-pass cell (typed array BFS distance)
- `prep.mcDistArrs[]` — Uint16Array per must-cross cell
- `prep.objDistArrs[]` — Uint16Array per objective key
- `prep.staticNeighbors` — Map<packedKey, Int32Array> of precomputed valid neighbors; stored as flat `[nk, axis, nk, axis, ...]` pairs; excludes blocks, geese, false-goals, gate-cells, and regular-filter axis violations
- `prep.mustPassIndex / mustCrossIndex` — Map<key, index> for bitmask indexing
- `prep.flipperIndexMap / flipperInitAxes` — flipper state tracking
- `prep.mcPairDist / mpPairDist` — pairwise BFS distances for MST lower bounds
- `prep.mcApproachDistMaps` — BFS distances to approach cells for must-cross 2nd-visit requirements

### Cell Key Encoding
```js
PACK(x, y)  = ((y << 16) | x) >>> 0   // 0-indexed
UNPACK(k)   = { x: k & 0xFFFF, y: (k >>> 16) & 0xFFFF }
KEY_SPACE   = 1 << 20   // 1M entries — covers all grids up to 15×15
```

### Axis Encoding
```js
AXIS_H = 1   // horizontal move (dx ≠ 0)
AXIS_V = 2   // vertical move (dy ≠ 0)
AXIS_NONE = 0
```

---

## getAttemptConfigs() Sub-branches

### near-closure
Reorders PROFILE_ORDER to put `nearClosureRescue → harvestThenFinish → finishFirst → perimeterSweep` first, then appends template configs.

### high-intersection-burden
Split by reqInt:
- **reqInt ≥ 7** (L136, L144, L146):
  - If `portalMap.size ≥ 2`: `objectiveFirst bw=5000` first (L146: portals=4)
  - Otherwise: `intersectionHarvest bw=5000` first (L136, L144)
  - DFS fallbacks follow in either case
- **reqInt < 7** (medium-high, e.g. L130, L138, L140, L147):
  - `navDensity ≥ 0.82`: skip beams; DFS perimeter templates first (L140)
  - `mustPassKeys.length ≥ 3`: `objectiveFirst` DFS before `perimeterSweep` (L130)
  - `reqInt ≤ 4 AND mp = 0`: CCW before CW (L110)
  - Default: CW before CCW, then beams and DFS fallbacks

### must-cross-heavy
- `mustPassKeys.length ≥ 3`:
  - `flippingFilterMap.size ≥ 2`: `intersectionHarvest bw=50000` sole config (L140)
  - Otherwise: beam variants lead
- `mustCrossKeys.length ≥ 3 AND mustPassKeys.length ≥ 2`: beam first (L129)
- Default: DFS templates (cornerHarvest, perimeterCW), then beams, then DFS profiles

### portal-heavy
Portal profiles (`portalFirstTransfer`, `portalCommitted`) moved first, then all others.

### default
- `mustPassKeys.length === 0`: CCW before CW in template list (L133: CCW wins)
- Otherwise: standard ATTEMPT_CONFIGS order (cornerHarvest, CW, CCW, sideCommitment)
- Followed by all PROFILE_ORDER profiles

---

## ATTEMPT_CONFIGS (default template list)
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

---

## Ablation Laboratory

The ablation framework measures what each solver feature actually contributes. Every major capability is independently togglable via an ablation config passed through `opts.ablation`. Defaults are all-enabled; the baseline behaviour is identical to the unmodified solver.

### Feature flags (45 total)

| Group | Flags | Controls |
|---|---|---|
| **scoring** (13) | `SCORE_GOAL_ATTRACTION`, `SCORE_FINISH_COMMITMENT`, `SCORE_OBJECTIVE_ATTRACTION`, `SCORE_MUST_PASS_URGENCY`, `SCORE_MUST_CROSS_URGENCY`, `SCORE_MC_APPROACH_GUIDANCE`, `SCORE_FLIPPER_URGENCY`, `SCORE_INTERSECTION_SETUP`, `SCORE_PERIMETER_BIAS`, `SCORE_PHASE_SCALING`, `SCORE_ANTI_DITHER`, `SCORE_REVISIT_PENALTY`, `SCORE_TEMPLATE_BONUS` | Move scoring terms in `scoreMoveV2` |
| **pruning** (7) | `PRUNE_MC_CEILING`, `PRUNE_DISTANCE_BOUND`, `PRUNE_PARITY`, `PRUNE_MUST_PASS_LB`, `PRUNE_MUST_CROSS_LB`, `PRUNE_INTERSECTION_DEFICIT`, `PRUNE_CONNECTIVITY` | Dead-branch pruning in DFS + beam |
| **strategy** (5) | `STRATEGY_LDS`, `STRATEGY_DIVERSE_BEAM`, `STRATEGY_STATE_DEDUP`, `STRATEGY_GATE_INTERLEAVING`, `STRATEGY_PARITY_GATE_FILTER` | Search-level optimisations |
| **templates** (8) | `TEMPLATE_CORNER_HARVEST`, `TEMPLATE_PERIMETER_CW`, `TEMPLATE_PERIMETER_CCW`, `TEMPLATE_SIDE_COMMITMENT`, `TEMPLATE_SIDE_X_LOW/HIGH`, `TEMPLATE_SIDE_Y_LOW/HIGH` | Structural traversal templates |
| **profiles** (12) | `PROFILE_<name>` for every policy profile | Attempt config eligibility |

Additionally, `ATTEMPT_ORDER` can be set to `'reverse'`, `'random'` (with `_randomSeed`), or `'profile-grouped'` to test ordering sensitivity.

### Ablation commands

```bash
# One-shot baseline (fast — just measures solve rate + nodes at default settings)
npm run ablation:baseline -- --budget-ms=15000 --output=audits/ablation/baseline.json

# Single-feature ablations (one feature off per run, all 45 features)
npm run ablation:single -- --budget-ms=10000 --output=audits/ablation/single.json

# Profile ablations (each profile off + solo)
npm run ablation:profiles -- --budget-ms=10000 --output=audits/ablation/profiles.json

# Template ablations
npm run ablation:templates -- --budget-ms=10000 --output=audits/ablation/templates.json

# Attempt order sensitivity
npm run ablation:order -- --budget-ms=10000 --output=audits/ablation/order.json

# Pairwise combination testing
npm run ablation:pairs -- --budget-ms=10000 --output=audits/ablation/pairs.json

# Full lab (all 101 experiments — runs in background, takes ~1-3h depending on budget)
npm run ablation:full -- --budget-ms=5000 --output=audits/ablation/lab-full.json

# Analyse results and print ranked report
npm run ablation:analyze -- --input=audits/ablation/lab-full.json --text

# Targeted: only pruning rules on hard levels
node scripts/run-ablation.mjs \
  --experiment=single-feature \
  --levels=74,129,130,140,145,146,147 \
  --filter=PRUNE \
  --budget-ms=30000

# Reuse a saved baseline to skip re-running it
node scripts/run-ablation.mjs \
  --experiment=single-feature \
  --baseline=audits/ablation/baseline.json \
  --budget-ms=10000 \
  --output=audits/ablation/single.json
```

### run-ablation.mjs flags

| Flag | Default | Description |
|---|---|---|
| `--experiment=<phase>` | `full` | `baseline`, `single-feature`, `profiles`, `templates`, `order`, `pairs`, `full` |
| `--levels=<spec>` | `all` | Level filter (same syntax as `solver:direct`) |
| `--budget-ms=<n>` | `10000` | Per-level time budget |
| `--output=<path>` | auto-timestamped | Write JSON results |
| `--baseline=<path>` | — | Reuse a saved baseline run (skips re-running it) |
| `--filter=<substr>` | — | Only run experiments whose name contains this substring |
| `--concise` | off | Omit per-level attempt lists to save space |

### Ablation JSON format

Top-level output contains `runs[]`, each with:
```js
{
  name: String,           // e.g. "disable:SCORE_GOAL_ATTRACTION"
  label: String,          // human-readable description
  config: Object|null,    // ablation config (null = baseline)
  summary: {
    solved, failed, errors, total,
    solveRate,            // fraction 0–1
    totalMs, avgMs, medianMs, p95Ms,
    nodesExpanded,        // total across all levels
    nodesPerSolved,       // avg nodes for solved levels
    nodesPerFailed,       // avg nodes for failed levels
  },
  solvedLevels: Number[], // 1-indexed level numbers solved
  failedLevels: Number[],
  levels: [{              // per-level detail
    level, status, ok, elapsedMs, nodesExpanded, solvedBy, attempts?
  }, ...]
}
```

### Analysis output (analyze-ablation.mjs)

Reads the run JSON, computes deltas vs baseline, and emits:
- `featureRanking[]` — all single-feature ablations sorted by importance score
- `tierSummary` — features bucketed as `critical | strong | helpful | neutral | negative`
- `profileRanking[]` — per-profile win count, unique wins, solo solve count
- `templateRanking[]` — per-template win count + unique wins
- `attemptOrderSensitivity[]` — delta per order variant
- `redundancyAnalysis[]` — pairwise redundancy detection with ratio
- `recommendations[]` — machine-readable action items

**Importance score formula:**
```
score = (baselineSolved − ablationSolved) × 100
      + max(0, (ablationMs − baselineMs) / baselineMs) × 50
      + max(0, (ablationNodes − baselineNodes) / baselineNodes) × 20
      − (ablationSolved − baselineSolved) × 20   // bonus for negative features
```

**Tier thresholds:**
| Tier | Condition |
|---|---|
| `critical` | Any solve loss (`solveLoss > 0`) |
| `strong` | `importanceScore ≥ 15`, no solve loss |
| `helpful` | `5 ≤ score < 15` |
| `neutral` | `−5 ≤ score < 5` |
| `negative` | `score < −5` (removing improves results) |

### Using ablation config in code

```js
import { withFeatureDisabled, withFeaturesDisabled, soloConfig } from './scripts/ablation-config.mjs';

// Disable one feature
const result = await SolverV2.solve(level, {
  timeBudgetMs: 15000,
  ablation: withFeatureDisabled('SCORE_GOAL_ATTRACTION'),
});
console.log(result.nodesExpanded); // now available on every solve result

// Disable all pruning (WARNING: very slow)
const noPrune = withFeaturesDisabled(['PRUNE_DISTANCE_BOUND', 'PRUNE_CONNECTIVITY', ...]);

// Only one profile active
const singleProfile = soloConfig(['PROFILE_perimeterSweep']);
```

---

## Performance History

### Baseline (audits/raw/latest.json, 2026-06-11)
- 147/147 solved, total ~127.7s
- Slow levels: L145 (24.9s), L129 (19.3s), L130 (13.9s), L140 (14.5s), L74 (15s), L146 (8s)

### P1–P5 Optimizations (branch: claude/solverv2-hard-perf-t87ltu)
1. **BigInt→Number masks**: `mustMask` and `mustCrossMask` converted from BigInt to 32-bit Number. Saves BigInt overhead in hot paths.
2. **Static adjacency precomputation**: `prepLevel()` builds `prep.staticNeighbors`. Only dynamic checks (edge usage, portal revisit, MC lock, flipper orientation) remain in the hot loop.
3. **Beam parent-pointer nodes**: Frontier entries are `{ key, prev, depth, score }` instead of full path arrays. Eliminates O(depth) copies per candidate.
4. **Typed array dist maps**: `Uint16Array(KEY_SPACE)` for all BFS distance lookups; `_dget(arr, k)` replaces `map.get(k) ?? Infinity`.
5. **scoreAndSort scratch**: Module-level `_sas[4]` Float64Array + insertion sort eliminates per-call allocation.
- **After P1–P5**: ~113s (−11.4%)

### Gate Interleaving (2026-06-12)
Extended config-outer/gate-inner scheduling to ALL multi-gate levels. Previously only near-closure levels were interleaved; now every level with `activeGates.length > 1` uses interleaving. Prevents infeasible Gate 1 exhausting full budget before Gate 2 tries Config 1.
- L74: 15,003ms → 941ms (Gate 2 solves on Config 1)
- **After interleaving**: ~96.6s (−14.7% vs P1–P5)

Multi-gate levels: L74 (2), L129 (2, must-cross-heavy), L140 (3), L144 (2, must-cross-heavy), L147 (3, near-closure).

### Config Ordering Improvements (2026-06-12)
Targeted `getAttemptConfigs()` sub-branching:

1. **L129** (mc≥3+mp≥2): beam `mustCrossFirst bw=2000` leads → 19,110ms → ~355ms (−98%)
2. **L140** (navDensity≥0.82): DFS perimeter first → 10,479ms → ~2,512ms (−76%)
3. **L130** (mp≥3): `objectiveFirst` DFS before `perimeterSweep` → 13,408ms → ~2,493ms (−81%)
4. **L110** (reqInt≤4+mp=0): CCW before CW → 7,308ms → ~1,592ms (−78%)
- **After config reordering**: ~54.3s (−43.7% vs interleaving)

### L133 and L146 Fixes (2026-06-12)
5. **L133** (default arch, mp=0): CCW before CW in no-must-pass default branch → 3,937ms → ~2,062ms (−48%)
6. **L146** (high-int reqInt≥7, portals=4): `objectiveFirst bw=5000` before `intersectionHarvest` → 6,392ms → ~2,934ms (−54%)
- **After L133/L146 fixes**: ~47.3s (−12.9% vs config reordering, −63.0% vs original baseline)

### Diverse Beam + Progressive Widening (2026-06-12)
7. **L145** (must-cross-heavy, mp≥3, flippers≥2): Added `diverseBeam` flag + `_diverseSelect` bucketing by `(flipperUsedMask, mustCrossMask)`. Config sequence: `bw=5000 diverse → bw=15000 diverse → bw=50000`. Prevents beam collapse to one flipper-ordering mode.
   - L145: ~18,000ms → ~8,750ms (bw=15000 diverse wins)
- **After diverse beam**: ~38.1s (−19.4% vs L133/L146 fixes)

### State-based Beam Dedup (2026-06-12)
8. **All beam levels (portal-free)**: Before sort+select, merge candidates sharing `(position, constraint-state sc)`, keeping highest-scoring path per `(cell, flipper+MC+MP+ints)` tuple. Map key: `c.key + c.sc * KEY_SPACE`. Disabled for portal levels.
   - L145: 8,750ms → 2,295ms (bw=5000 diverse now wins; was bw=15000)
- **After state dedup**: ~26.8s (−29.6% vs diverse beam, −79.0% vs original baseline)

### Current State (2026-06-12)
- 147/147 solved
- Total runtime: ~26.8s
- Slowest levels: L146 (~3.5s), L147 (~3.0s), L140 (~2.5s), L145 (~2.3s), L133 (~2.1s)
- No single dominant bottleneck — top-10 levels all under 3.6s

### Ablation Framework (2026-06-12)
- Added `opts.ablation` config to `solveLevelV2` — 45 independently togglable feature flags
- `nodesExpanded` now returned in every solve result
- Scripts: `ablation-config.mjs`, `run-ablation.mjs`, `analyze-ablation.mjs`
- 101 experiment definitions across 8 phases (single-feature, profiles, templates, order, pairs)
- See **Ablation Laboratory** section above for full documentation

---

## Common Gotchas

- **Portal forced-move**: When at a portal cell and last move was NOT a portal jump, `getNeighbors()` returns only `[portal.dest]`, bypassing static adjacency. This is intentional — portal entry forces the exit.
- **Gate cells cannot be re-entered**: Excluded from `staticNeighbors` targets; `isValidMove` also guards this.
- **Must-cross lock**: Turning at a 1st-pass must-cross cell would consume both H and V axis bits, blocking the required 2nd crossing. This dynamic check remains in `_isMoveDynValid`.
- **Flipping filters**: Current axis depends on `flipperUsedMask` (parity of how many flippers have been traversed before this one). Fully dynamic — cannot be precomputed into `staticNeighbors`.
- **Dense levels (navDensity ≥ 0.70)**: `mustMask` is set to 0 (not `initialMustMask`) to avoid disrupting near-Hamiltonian DFS ordering. Must-pass correctness enforced via `mpVisitedMask` instead.
- **Uint16Array dist sentinel**: `0xFFFF` means unreachable/Infinity in typed array dist maps.
- **Parity filter on gates**: Before the attempt loop, gates are pre-filtered by `(gate_parity XOR goal_parity XOR reqLen_parity) == 0`. Only applies to portal-free levels.
- **`minBudgetFraction`**: When > 0, a config's budget is `max(floor(gateShare * minFrac), pairShare)`. Used to guarantee a critical config (e.g., L140's `intersectionHarvest bw=50000`) receives enough budget to converge.

---

## Firebase Integration

The app reads/writes level submissions and player progress to Firestore. Firebase config is in `firebase-config.js` (public client-side web config). See `docs/firebase-config-and-secret-hygiene.md` for what may be committed and what must remain secret. The `modules/persistence/` directory contains:
- `firebase-client.js` — Firebase SDK wrapper
- `level-submission-repository.js` — Hint path storage (encode/decode for Firestore)
- `local-session-store.js` — Local session state (fallback when offline)
- `progress-store.js` — Player progress persistence
- `review-repository.js` — Level review/rating data

To import published levels from Firestore:
```bash
FIREBASE_BEARER_TOKEN=<token> npm run levels:import-published
```

---

## Development Workflows

### Adding a new level
1. Add entry to `levels.js` `RAW_LEVELS` array (1-indexed coordinates)
2. Run `npm run test:hint-path-oracle` — will fail if solver can't find a valid path
3. If solver fails: debug with `npm run solver:direct -- --levels=<N> --verbose`

### Debugging a slow or failing level
```bash
# Run with verbose output to see per-attempt details
npm run solver:direct -- --levels=<N> --budget-ms=60000 --verbose

# Check the attempt breakdown in JSON
npm run solver:direct -- --levels=<N> --budget-ms=30000 --output=audits/local-v2/debug.json
node -e "
  import { readFileSync } from 'fs';
  const d = JSON.parse(readFileSync('audits/local-v2/debug.json'));
  d.levels.find(l => l.level === <N>).attempts.forEach((a,i) =>
    console.log(i+1, a.profile, a.template, 'bw=' + (a.beamWidth||0), a.ok ? 'WIN' : 'fail', a.elapsedMs + 'ms')
  );
"
```

### Solver audit workflow and log retention

`npm run audit:newhint:full` runs the full causality-metric audit. It writes output to `audits/local-v2/` and maintains a **rolling history** alongside `audits/raw/latest.json`:
- `HISTORY_MAX_BYTES` = 95 MB — older entries are trimmed when history exceeds this
- `HISTORY_MAX_ENTRIES` = 4000 — hard cap on number of stored audit entries
- This lets you track solver regression over time without unbounded disk growth

### Performance optimization workflow
1. Run full audit: `npm run solver:direct -- --levels=all --budget-ms=30000 --output=audits/local-v2/full.json`
2. Identify slow levels from output (>2000ms per level is notable)
3. Check attempt breakdown for each slow level (as above)
4. Identify which config wins and at what attempt number
5. Modify `getAttemptConfigs()` in `modules/solver/attempts.js` (not SolverV2.js directly — that is now a thin shim)
6. Re-run targeted levels to verify improvement
7. Re-run full audit to verify no regressions
8. Run `npm run ci` before committing

### Level archetype investigation
```bash
node --input-type=module << 'EOF'
globalThis.window = globalThis;
await import('./levels.js');
const { createSolverV2 } = await import('./SolverV2.js');
const solver = createSolverV2();
const raw = globalThis.RAW_LEVELS[N - 1];  // N = level number
const level = solver._normalizeRawLevel(raw);
const arch = solver._detectArchetype(level);
const navArea = level.grid.w * level.grid.h - level.blockSet.size - level.gooseSet.size - level.falseGoalKeys.size - level.gateKeys.length;
console.log('arch:', arch, 'navDensity:', (level.reqLen / navArea).toFixed(3));
console.log('reqInt:', level.reqInt, 'mp:', level.mustPassKeys.length, 'mc:', level.mustCrossKeys.length, 'portals:', level.portalMap.size);
EOF
```

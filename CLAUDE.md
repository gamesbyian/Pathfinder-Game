# Pathfinder Game — Developer Reference

## Project Overview

Pathfinder is a browser-based grid puzzle game. The player draws a continuous path on a rectangular grid from a starting gate to a goal cell. A solution is accepted only when all constraints are simultaneously satisfied: exact path length, exact intersection count, and all object-specific obligations (must-pass, must-cross, portals, filters, etc.).

The solver (`Solver.js`) generates hint paths used by the in-game hint system. This document is the **current-state developer reference**: solver architecture, game rules, repository layout, commands, and gotchas. The dated build history (session logs, bug-fix narratives, retracted experiments) lives in [`docs/history/development-journal.md`](docs/history/development-journal.md); the authoritative per-topic docs and ADRs are indexed in [`docs/README.md`](docs/README.md).

---

## Deployment

The game is built with **Vite** and served as a static site via **GitHub Pages** (github.io). There is no Firebase Hosting — `firebase.json` only configures Firestore rules and indexes.

- **Build step (Vite).** `npm run build` → `dist/`; `npm run dev` (dev server) / `npm run preview`
  (serve the build). `vite.config.ts` uses `base: './'` (relative asset URLs work at the Pages
  subpath and at root) and copies the runtime-fetched `data/*.json` + `firebase-config.js` into
  `dist/`. Deploy is automated: `.github/workflows/deploy-pages.yml` builds and publishes `dist/`
  on push to `main` (Pages source = "GitHub Actions"). See
  [`docs/adr/0010-build-step-vite.md`](docs/adr/0010-build-step-vite.md).
  - **The dev server (`npm run dev`) is NOT CSP-clean** (HMR uses inline scripts/eval); that's
    local-only. CI/e2e and the deployed site use the production build, which is clean.
- **CSS is a single semantic system, no utility layer.** `styles/app.css` is a thin aggregator that
  `@import`s `reset.css` (Preflight) → `tokens.css` (`:root` design tokens + the `.type-*` scale) →
  `components.css` (every semantic component/id rule + the `--theme-*` colour system). There is no
  Tailwind toolchain and no `utilities.css`; each element is described by a semantic class that owns
  its full appearance. See [`docs/styling-semantic-migration-plan.md`](docs/styling-semantic-migration-plan.md).
- **Content-Security-Policy is enforced** via a `<meta http-equiv>` in `index.html` (Pages can't set
  response headers), kept in sync with `security/csp-policy.json` by `npm run check:csp`. `index.html`
  ships **no inline JS** (the boot entry is `modules/boot-entry.js`) so `script-src` needs no
  `'unsafe-inline'`. See [`docs/content-security-policy.md`](docs/content-security-policy.md).
- Firebase (Firestore + Auth, modular SDK) and Tone.js are **bundled by Vite** (npm `dependencies`),
  not loaded from CDNs. Only the local `firebase-config.js` remains a plain `<script>` (it sets
  `window.__firebase_config` etc.). `apis.google.com` stays in `script-src` because Firebase Auth's
  `signInWithPopup` injects the gapi iframe loader at runtime.

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
| **Surround landmark** | Impassable. Path must visit all reachable 8-adjacent cells before finishing. Tracked via `surroundMask` + `surroundNeighborRemainingMasks`. |
| **Must-turn landmark** | Passable. Path must make a turn (of required direction: `either`/`left`/`right`) at this cell. Tracked via `mustTurnMask`. |
| **Adjacent-turn landmark** | Impassable. Path must make a required turn at one of its 8-adjacent passable cells. Tracked via `adjTurnMask`. |
| **Decorative landmark** | Impassable. No path constraint — visual only. |

### Win Condition
All of the following must be true simultaneously when the path reaches the goal:
1. Counted length = `reqLen`
2. Intersection count = `reqInt`
3. All must-pass cells visited (`mustMask === 0` or `mpVisitedMask === initialMpMask`)
4. All must-cross constraints satisfied (`mustCrossMask === 0`)
5. All surround neighbor cells visited (`surroundMask === 0`)
6. All must-turn cells turned in required direction (`mustTurnMask === 0`)
7. All adj-turn constraints satisfied (`adjTurnMask === 0`)

### Landmark Wire Format
Landmarks are declared in the raw level JSON as a `landmarks` array. Each entry has `x`, `y`, `objectType` (visual asset name), and `role`:

```js
landmarks: [
  { x: 5, y: 5, objectType: 'park',     role: 'surround' },
  { x: 3, y: 3, objectType: 'library',  role: 'mustTurn',       turn: 'either' },
  { x: 2, y: 7, objectType: 'library',  role: 'mustTurnLeft' },
  { x: 7, y: 2, objectType: 'fountain', role: 'adjacentTurn',   turn: 'right' },
  { x: 6, y: 8, objectType: 'lamppost', role: 'adjacentTurnLeft' },
  { x: 9, y: 4, objectType: 'statue',   role: 'decorative' },
]
```

Role passability:
- **Passable** (path may enter): `mustPass`, `mustTurn`, `mustTurnLeft`, `mustTurnRight`
- **Impassable** (added to `blockSet`): `surround`, `adjacentTurn`, `adjacentTurnLeft`, `adjacentTurnRight`, `decorative`

Normalized level fields produced by `normalizeLevel()`:
```js
surroundKeys:       number[]                      // packed keys of surround landmarks
adjacentTurnKeys:   number[]                      // packed keys of adj-turn landmarks
adjacentTurnDirs:   string[]                      // parallel: 'either'|'left'|'right'
mustPassTurnDirs:   Map<key, 'either'|'left'|'right'>  // turn direction per must-turn cell
landmarkMeta:       Map<key, { objectType, role }> // visual/role metadata for renderer/editor
```

---

## Repository Layout

```
/
├── data/                    Runtime-fetched JSON (loaded at boot; no window globals):
│   ├── levels.json          156 levels (1-indexed). Sole source of truth for level data.
│   ├── level-heatmaps.json  Generated companion (per-level heatmap + visitTotals from saved
│   │                        hints[]); rebuild via `npm run levels:generate-heatmaps`.
│   └── themes.json          Theme definitions.
├── index.html               Browser entry. Loads modules/boot-entry.js (no inline JS); carries
│                            the enforcing <meta> CSP.
├── security/csp-policy.json Single source of truth for the CSP (validated by check:csp).
├── styles/                  Single semantic-CSS system (app.css @imports reset → tokens →
│                            components; no utilities, no build step). See styling docs.
├── eslint.config.mjs        ESLint 9 flat config; also the AST architecture rules (see Notes).
├── vite.config.ts           Production build (base './', copies data/ + firebase-config.js).
├── vitest.config.mjs        Discovers colocated modules/**/*.test.ts + the residual
│                            scripts/*-unit-tests.mjs validator/harness suites.
├── playwright.config.mjs    e2e config (builds + `vite preview`, so e2e hits the prod bundle).
├── firebase-config.js / firebase.json / firestore.rules / firestore.indexes.json
│                            Firebase public web config + Firestore rules/indexes (no hosting).
├── .github/workflows/       ci.yml, deploy-pages.yml, deploy-firestore-rules.yml, audit-export.yml.
├── tests/                   Playwright browser specs (smoke, gameplay, a11y, editor, csp, …).
├── modules/                 Application source (all TypeScript; ADR 0011). Not enumerated here —
│                            see "modules/ source tree" below + docs/architecture.md.
├── scripts/                 Node CLI tools + node-validator test suites. Not enumerated here (it
│                            rots); package.json's npm scripts are the entrypoint map. Key ones:
│                            run-solverv2-direct (solver CLI), solver-bench (regression gate),
│                            hint-path-oracle + validate-bundled-levels (CI gates), check-*.mjs
│                            (content/asset checks), ablation:* + levels:* tooling.
├── audits/                  Solver/audit run outputs. audits/solver-baseline.json is the committed
│                            solver-bench baseline; the rest are generated run snapshots.
└── docs/                    Per-topic docs + ADRs — see docs/README.md.
```

> **Notes:**
> - `check:dead-scripts` catches npm scripts that reference missing local Node entrypoints.
> - **Architecture invariants are AST-based ESLint rules** (in `eslint.config.mjs`, run by `check:lint`), not regex scripts — precise, editor-visible, and tripwire-tested (`scripts/eslint-rules-unit-tests.mjs`): `local/engine-state-boundary` (the consumer layers `modules/engine.ts`, `modules/engine/`, `modules/input/`, `modules/ui/` mutate ENGINE state only through `modules/state-actions.js`; the implementation layers `modules/state/actions/`, `modules/runtime/`, editor history are not scanned); scoped `no-restricted-globals`/`no-restricted-imports` keep `domain`/`runtime`/`solver` browser- and adapter-free; and `no-restricted-syntax` bans raw HTML injection + raw event-type strings. (These replaced the former `check-engine-state-boundary`/`check-domain-purity`/`check-raw-inner-html` scripts.)
> - `check:third-party` enforces that only allowlisted CDN URLs appear in `index.html`.
> - Canonical level objects returned by `normalizeLevel()` are shallow-frozen — property replacement throws in strict mode. Editor always uses `deepCloneLevel()` working copies.

### `modules/` source tree

The application source lives under `modules/` (all TypeScript; ADR 0011). Rather than mirror the
file tree here — where it rots on every move/rename — read the layout from the directory itself and
the durable references:

- **Layering model + injected ports + "where to put new code":** [`docs/architecture.md`](docs/architecture.md).
- **How deeply each layer is typed (logic core vs. `any`-line adapter boundary):** [`docs/typing.md`](docs/typing.md).
- **Per-topic detail and ADRs:** the [`docs/`](docs/) index ([`docs/README.md`](docs/README.md)).

At a glance: `domain/` → `runtime/` → `solver/` is the pure logic core (no DOM); `engine*`,
`input/`, `render/`, `ui/`, `persistence/` are the browser-adapter/controller boundary; `state*`
holds the typed `EngineState` tree mutated only through `state-actions`.

---

## Build & Dev Commands

```bash
npm run dev        # Vite dev server (HMR). NOTE: not CSP-clean — local dev only.
npm run build      # Production build → dist/ (what deploys to GitHub Pages)
npm run preview    # Serve the built dist/ (vite preview); used by the e2e webServer
```

Deploy is automated by `.github/workflows/deploy-pages.yml` on push to `main` (build → Pages).

## Testing Commands

```bash
# Full CI suite. Composed of three groups:
#   npm run check         — static checks (dead-scripts, lint, secret-hygiene, csp, types, etc.)
#   npm run test:coverage — Vitest: all 38 unit/integration suites (~504 tests) in one ~4s pass,
#                           with v8 coverage enforced over the logic surface (see docs/testing.md)
#   npm run test:node     — node validators (startup-smoke, hint-path-oracle, loader,
#                           data-asset-runtime-smoke, firestore-rules, bundled-levels)
npm run ci

# Vitest unit/integration suites (domain, solver-*, state, engine, runtime, ui-dom, …)
npm run test:unit               # one parallel pass over all suites
npm run test:unit:watch         # watch mode
npx vitest run solver           # filter suites by filename substring
npx vitest run -t "portal"      # filter by test-name substring

# Individual check commands
npm run check:dead-scripts           # Verify all npm script targets exist
npm run check:lint                   # ESLint across modules/ + scripts/
npm run check:csp                    # Enforcing <meta> CSP matches security/csp-policy.json
npm run check:types                  # tsc --noEmit over the @ts-check allowlist
npm run check:third-party            # Verify CDN URLs against allowlist

# Node validators (kept as node scripts — not Vitest unit tests)
npm run test:node               # all of the below in sequence
npm run test:hint-path-oracle   # Validates solver output against all bundled levels
npm run test:bundled-levels     # Validates all 156 bundled levels (schema + solver)
npm run test:firestore-rules    # Firestore security rules characterization
npm run test:startup-smoke      # Boot harness integration tests
npm run test:loader             # Loader browser-adapter characterization

# Playwright functional browser tests (smoke + gameplay + theme-coverage + a11y + editor +
# csp + security specs). Runs the 'chromium' project; excludes the visual baselines. The
# webServer runs `npm run build && vite preview`, so e2e exercises the production bundle.
# Fully parallel; a shared fixture (tests/fixtures.mjs) aborts third-party requests for speed +
# determinism (see docs/testing.md). Granular subsets for focused runs:
npm run test:e2e            # full suite
npm run test:e2e:smoke      # boot + gameplay (fastest)
npm run test:e2e:a11y       # accessibility
npm run test:e2e:editor     # level editor
npm run test:e2e:security   # debug-surface + CSP
npm run test:e2e:theme      # per-theme colour coverage
# If browser path differs from expected, set env var:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run test:e2e

# Visual-regression baselines (modal layout) — 'visual' Playwright project. NOT part of
# test:e2e or ci (baselines are environment-sensitive; a developer harness for refactors).
npm run test:visual           # compare modals against committed baselines
npm run test:visual:update    # regenerate baselines (tests/visual.spec.mjs-snapshots/)

# Targeted solver runs
npm run solver:direct -- --levels=133,146 --budget-ms=30000 --output=audits/local-v2/out.json
npm run solver:direct -- --levels=all --budget-ms=30000 --output=audits/local-v2/full.json
npm run solver:direct -- --levels=74,129,130,140,145,146,147 --budget-ms=30000 --output=audits/local-v2/hard.json

# Validate audit JSON structure
npm run check:audit-output -- audits/local-v2/full.json

# Trap-spot timing audit (separate from hint solver). Run via tsx (modules are TS).
npx tsx scripts/trap-search-audit.mjs --levels=all --extended-budget=60000

# False-goal viability check: flag levels whose placed false goals sit in squares
# no path can ever end on (the trap could never fire). Timeouts report as
# "inconclusive", never as invalid. Cheap parity test resolves most cases even
# when full enumeration times out (incl. portal levels whose portals are
# parity-preserving). For a cell left "inconclusive", a goal-directed solve
# (set that cell as the goal, run solver:direct) is far cheaper than enumeration —
# a solved path proves reachability.
npx tsx scripts/trap-search-audit.mjs --check-false-goals --fg-budget=90000
npx tsx scripts/trap-search-audit.mjs --check-false-goals --levels=63

# Regenerate per-level hint heat maps (run after any hints[] change in data/levels.json)
npm run levels:generate-heatmaps

# Report dead squares + grid-trim candidates from the generated heat maps
npm run levels:heatmap-report
npm run levels:heatmap-report -- --json

# (The "boredom score" ranker — levels:boredom-report — was REMOVED; its approach was disproven.
#  See docs/history/development-journal.md for the history.)

# Retrieve Dev Mode level ratings/tags (public-read collection — no token needed)
npm run levels:ratings-report
npm run levels:ratings-report -- --json
```

### solver:direct flags
| Flag | Default | Description |
|---|---|---|
| `--levels=1,2,3` or `--levels=all` | all | Levels to solve |
| `--budget-ms=30000` | 30000 | Time budget per level in ms |
| `--output=path/to/out.json` | (none) | Write JSON results |
| `--verbose` | off | Extra per-attempt logging |

> **Solver CLI runs through an esbuild bundle, NOT raw `tsx`.** `solver:direct` and `solver:bench`
> go through `scripts/run-bundled.mjs` (esbuild-bundle → `node`). The solver's hot search loops run
> **~5× slower under `tsx`** than bundled, because `tsx` transforms each `.ts` module separately and
> the per-node cross-module calls in the hot path don't inline. This regressed silently when the hot
> solver files became `.ts` in the TypeScript migration (production was never affected — it ships a
> Vite/esbuild bundle). Do **not** revert these scripts to `tsx`. `npm run solver:bench --check`
> guards the full-corpus solve rate against `audits/solver-baseline.json`.

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

## Level Stats
- **156 levels total** (test levels 148–150 use landmark mechanics).
- Max must-pass cells: 4 · max must-cross cells: 4 · max portals: 3 pairs (6 keys) ·
  max flipping filters: 4 · grid sizes up to 15×15.
- All masks fit in 32-bit integers (no BigInt needed).
- Level coordinates in `data/levels.json` are **1-indexed**; the solver normalizes to 0-indexed
  internally.
- ~8,300 total hint paths across all levels. The hint-discovery sweep is complete (no further
  batches planned); this tripled `data/levels.json`'s raw size (~2.4× gzipped), accepted as-is.
- New player-submitted levels are imported from Firestore via `npm run levels:import-published`
  (`scripts/import-published-levels.mjs`), which dedupes by structural fingerprint (ignoring
  `hints`/`designerName`/`description`/`difficulty`) and regenerates `data/level-heatmaps.json`.

---

## Solver Architecture (Solver.js)

`modules/Solver.js` is a thin facade over `modules/solver/*`. Full deep reference (DFS/beam
mechanics, pruning, `prepLevel` data, the attempt policy, data structures):
**[`docs/solver-architecture.md`](docs/solver-architecture.md)**.

### Core Flow
1. `normalizeRawLevel()` — wire format (1-indexed) → internal representation (0-indexed, packed keys)
2. `prepLevel()` — precompute per-level data (dist maps, adjacency, masks)
3. `solveLevel()` — attempt loop over gates × configs; each attempt runs DFS or beam
4. `validateCandidatePath()` — verify returned solution against domain rules
5. Return `{ ok, solution, attempts, totalMs }`

### Archetypes (detectArchetype), in priority order
1. **near-closure** — `reqInt ≤ 1 AND navDensity < 0.35`
2. **high-intersection-burden** — `(reqInt≥5 AND density≥0.45) OR (reqInt≥4 AND density≥0.55) OR reqInt≥10`
3. **must-cross-heavy** — `mustCrossKeys.length ≥ 2 AND reqInt ≥ 2`
4. **portal-heavy** — `portalMap.size ≥ 4`
5. **default** — everything else

`navDensity = reqLen / navArea` (`navArea = w×h − blocks − geese − falseGoals − gates`).

### Attempt policy
`getAttemptConfigs(level)` is a **pure function of level features** (never level identity;
`check:no-solver-level-numbers` enforces this). It is a declarative, ordered `ATTEMPT_POLICY` table
of `{ when(features), build(features), why }` rules in `modules/solver/attempts.ts` — the source of
truth; see the doc above for the per-regime breakdown. Each config runs DFS, or beam when
`beamWidth` is set; `minBudgetFraction` guarantees a critical config enough budget to converge.

### Cell Key & Axis Encoding
```js
PACK(x, y) = ((y << 16) | x) >>> 0;  UNPACK(k) = { x: k & 0xFFFF, y: (k >>> 16) & 0xFFFF }
KEY_SPACE  = 1 << 20   // covers grids up to 15×15
AXIS_H = 1  // horizontal (dx≠0)   AXIS_V = 2  // vertical (dy≠0)   AXIS_NONE = 0
```

---

## Common Gotchas

- **Portal forced-move**: When at a portal cell and last move was NOT a portal jump, `getNeighbors()` returns only `[portal.dest]`, bypassing static adjacency. This is intentional — portal entry forces the exit.
- **Gate cells cannot be re-entered**: Excluded from `staticNeighbors` targets; `isValidMove` also guards this.
- **Must-cross lock**: Turning at a 1st-pass must-cross cell would consume both H and V axis bits, blocking the required 2nd crossing. This dynamic check remains in `_isMoveDynValid`.
- **Flipping filters**: Current axis depends on `flipperUsedMask` (parity of how many flippers have been traversed before this one). Fully dynamic — cannot be precomputed into `staticNeighbors`.
- **Dense levels (navDensity ≥ `DENSE_LEVEL_NAV_DENSITY`, a named constant in `solver/prep.ts`)**: `mustMaskForDFS` is set to 0 (not `initialMustMask`) to avoid disrupting near-Hamiltonian DFS ordering. Must-pass correctness enforced via `mpVisitedMask` instead.
- **Uint16Array dist sentinel**: `0xFFFF` means unreachable/Infinity in typed array dist maps.
- **Parity filter on gates**: Before the attempt loop, gates are pre-filtered by `(gate_parity XOR goal_parity XOR reqLen_parity) == 0`. Only applies to portal-free levels.
- **`minBudgetFraction`**: When > 0, a config's budget is `max(floor(gateShare * minFrac), pairShare)`. Used to guarantee a critical config (e.g. the wide `intersectionHarvest bw=50000` on flipper-heavy must-cross levels) receives enough budget to converge.
- **Styling is single-system semantic CSS — no utility layer.** The Tailwind-derived
  `styles/utilities.css` is **deleted** (see [`docs/styling-semantic-migration-plan.md`](docs/styling-semantic-migration-plan.md)).
  Do **not** add Tailwind-style utility classes (`flex`, `mb-4`, `bg-[var(...)]`, …) to
  markup — `check:css-class-coverage` hard-fails on `bg-[var(...)]` arbitrary-value classes. To
  style an element, add/extend a **semantic component class or id rule** in `styles/components.css`
  (design tokens + the `.type-*` scale live in `styles/tokens.css`). The only kept non-component
  classes are the type scale, the `.hidden`/`.is-shown`/`.selected` state hooks, and the pure JS
  query-selector hooks (`.palette-tool`, `.palette-group-icon`).
- **Frozen canonical levels**: `normalizeLevel()` returns a shallow-frozen object. Do NOT attempt to assign to level properties. Use `deepCloneLevel(level)` for mutable copies (editor always does this).
- **Editor validator is a local heuristic, not a solver**: `validateLevelDetailed()`'s diagonal-obstacle/must-cross checks only inspect a handful of nearby cells — they cannot detect routes around through the rest of a large grid and can both false-positive and false-negative relative to true solvability. Don't trust its "invalid" reasons as proof of infeasibility on a real level; confirm with the solver when it matters (history: docs/history/development-journal.md, "MustCross Diagonal-Trap Validation Fix").

---

## Firebase Integration

The app reads/writes level submissions and player progress to Firestore. Firebase config is in `firebase-config.js` (public client-side web config — safe to commit). See `docs/firebase-config-and-secret-hygiene.md` for what may be committed and what must remain secret. The `modules/persistence/` directory contains:
- `firebase-client.js` — Firebase SDK wrapper
- `level-submission-repository.js` — Hint path storage (encode/decode for Firestore)
- `local-session-store.js` — Local session state (fallback when offline)
- `progress-store.js` — Player progress persistence
- `review-repository.js` — Level review/rating data
- `level-rating-repository.js` — Dev Mode level rating/tagging storage (admin-only)

Firebase uses the **modular SDK** (`firebase/app`, `firebase/auth`, `firebase/firestore`), bundled by
Vite — no CDN compat scripts. `firebase-client.ts` wraps init + auth (the typed seam); the repos/
stores call the modular Firestore free functions (`collection`/`doc`/`getDocs`/`onSnapshot`/…)
directly. There is no Firebase Hosting — the app is served by GitHub Pages.

To import published levels from Firestore:
```bash
FIREBASE_BEARER_TOKEN=<token> npm run levels:import-published
```

---

## Development Workflows

### Adding a new level
1. Add entry to `data/levels.json` array (1-indexed coordinates)
2. Run `npm run test:hint-path-oracle` — will fail if solver can't find a valid path
3. If solver fails: debug with `npm run solver:direct -- --levels=<N> --verbose`

### Styling an element (semantic CSS, no utility layer)
There is no Tailwind build step and **no `styles/utilities.css`** (see
[`docs/styling-semantic-migration-plan.md`](docs/styling-semantic-migration-plan.md)). Style an
element by adding/extending a **semantic component class or id rule** in `styles/components.css`
(or a `:root` token / `.type-*` scale step in `styles/tokens.css`). Do not add Tailwind-style
utility classes to markup; the `check:css-class-coverage` gate hard-fails on `bg-[var(...)]`
arbitrary-value classes. When reproducing an existing look, copy the *computed* value — old
utilities were unlayered and some were inert at equal specificity (see the cascade-order notes in
that migration doc).

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
5. Modify `getAttemptConfigs()` in `modules/solver/attempts.js` (not Solver.js directly — that is now a thin facade)
6. Re-run targeted levels to verify improvement
7. Re-run full audit to verify no regressions
8. Run `npm run ci` before committing

### Level archetype investigation
```bash
node --input-type=module << 'EOF'
import { readFileSync } from 'fs';
const RAW_LEVELS = JSON.parse(readFileSync('./data/levels.json', 'utf8'));
const { SOLVER_TESTING_API } = await import('./modules/Solver.js');
const raw = RAW_LEVELS[N - 1];  // N = level number
const level = SOLVER_TESTING_API.normalizeRawLevel(raw);
const arch = SOLVER_TESTING_API.detectArchetype(level);
const navArea = level.grid.w * level.grid.h - level.blockSet.size - level.gooseSet.size - level.falseGoalKeys.size - level.gateKeys.length;
console.log('arch:', arch, 'navDensity:', (level.reqLen / navArea).toFixed(3));
console.log('reqInt:', level.reqInt, 'mp:', level.mustPassKeys.length, 'mc:', level.mustCrossKeys.length, 'portals:', level.portalMap.size);
EOF
```

---

## Project History & Decision Records

CLAUDE.md is the **current-state reference**. The chronological build history — dated session
entries, bug-fix narratives, retracted experiments — lives separately so this file stays a
reference, not a diary:

- **[`docs/README.md`](docs/README.md)** — docs index + modernization progress board.
- **[`docs/architecture.md`](docs/architecture.md)** — layered architecture (durable).
- **[`docs/testing.md`](docs/testing.md)** — test tiers and script→tier map.
- **[`docs/security.md`](docs/security.md)**, **[`docs/content-security-policy.md`](docs/content-security-policy.md)**,
  **[`docs/firestore-security-model.md`](docs/firestore-security-model.md)** — security model.
- **[`docs/typing.md`](docs/typing.md)** — the typed-surface allowlist and how to grow it.
- **[`docs/adr/`](docs/adr/)** — Architecture Decision Records (the authoritative "why").
- **[`docs/modernization-plan.md`](docs/modernization-plan.md)** and
  **[`docs/codebase-quality-review-plan.md`](docs/codebase-quality-review-plan.md)** — active plans.
- **[`docs/history/development-journal.md`](docs/history/development-journal.md)** — the full dated
  narrative (2026-06-11 onward), including retracted experiments. History only; not current truth.

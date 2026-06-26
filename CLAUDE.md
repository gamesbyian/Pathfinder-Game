# Pathfinder Game — Developer Reference

## Project Overview

Pathfinder is a browser-based grid puzzle game. The player draws a continuous path on a rectangular grid from a starting gate to a goal cell. A solution is accepted only when all constraints are simultaneously satisfied: exact path length, exact intersection count, and all object-specific obligations (must-pass, must-cross, portals, filters, etc.).

The solver (`SolverV2.js`) generates hint paths used by the in-game hint system. This document is the **current-state developer reference**: solver architecture, game rules, repository layout, commands, and gotchas. The dated build history (session logs, bug-fix narratives, retracted experiments) lives in [`docs/history/development-journal.md`](docs/history/development-journal.md); the authoritative per-topic docs and ADRs are indexed in [`docs/README.md`](docs/README.md).

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
- Firebase (Firestore + Auth) and Tone.js are still loaded via CDN scripts in `index.html`.

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
├── data/
│   ├── levels.json          150 levels (1-indexed coords). Sole source of truth for
│   │                        level data — loaded as JSON (no window.RAW_LEVELS).
│   ├── level-heatmaps.json  Generated companion to levels.json: per-level heatmap +
│   │                        visitTotals matrices derived from saved hints[]. Built by
│   │                        scripts/generate-level-heatmaps.mjs; regenerate after any
│   │                        hints[] change.
│   └── themes.json          Theme definitions — loaded as JSON (no window.THEMES).
├── PATHFINDER_SPEC.md       Full product spec (authoritative game rules)
├── design_bible.txt         Design notes
├── index.html               Main browser entry point. Links app.css; loads
│                            modules/boot-entry.js (no inline JS — strict CSP). Carries the
│                            enforcing <meta> CSP. A few inline style= attrs remain.
├── security/
│   └── csp-policy.json       Single source of truth for the CSP, validated by check:csp.
├── styles/                  Single semantic-CSS system (no utilities, no build step):
│   ├── app.css              Aggregator: @import reset.css → tokens.css → components.css.
│   ├── reset.css            Preflight browser normalization.
│   ├── tokens.css           :root design tokens (theme system) + the .type-* scale.
│   └── components.css       Semantic component/id rules, layouts, --theme-* colour rules.
├── eslint.config.mjs        ESLint 9 flat config (modules/ + scripts/).
│                            Includes no-restricted-syntax rules banning raw event-type
│                            strings ('sound', 'logic_state', 'goose_jumpscare',
│                            'bomb_detonation') in type: property positions.
├── vite.config.ts           Vite build config (base './', modulePreload polyfill off,
│                            esbuild CSS minify, copies data/ + firebase-config.js to dist/).
├── playwright.config.mjs    Playwright config (uses pre-installed Chromium via
│                            PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH env var). webServer builds +
│                            runs `vite preview`, so e2e exercises the production bundle.
├── .github/workflows/       ci.yml (checks+tests), deploy-pages.yml (Vite build → GitHub
│                            Pages on main), deploy-firestore-rules.yml, audit-export.yml.
├── firebase-config.js       Firebase public web config (client-side, safe to commit)
├── firebase.json            Firestore rules + indexes config only (no hosting)
├── firestore.rules          Firestore security rules
├── firestore.indexes.json   Firestore composite indexes
├── vitest.config.mjs        Vitest config (node env; discovers scripts/*-unit-tests.mjs).
├── package.json             NPM scripts: ci = check + test:unit (Vitest) + test:node.
│
├── tests/                   Playwright browser tests
│   ├── smoke.spec.mjs       Boot, load, navigation tests (7 tests)
│   └── gameplay.spec.mjs    Path drawing, reset/undo, guide modal (5 tests)
│
├── modules/
│   ├── domain/              Core game logic (pure functions, no DOM). **Fully TypeScript**
│   │   │                    (ADR 0011), like runtime/. solver/ → state/ → adapters next.
│   │   ├── cell-key.ts      PACK/UNPACK encoding
│   │   ├── geometry.js      Grid geometry helpers
│   │   ├── level-codec.js   Level encode/decode. parseRawLevel (silent null on
│   │   │                    failure) and parseRawLevelDetailed (structured errors).
│   │   ├── level-fingerprint.js  Level dedup/identity
│   │   ├── level-schema.js  JSON Schema validator for raw level objects.
│   │   │                    Used by parseRawLevelDetailed for structured errors.
│   │   ├── level-validation.js   Editor validation
│   │   ├── move-context.js  MoveContext presets (PLAY/SOLVER/TAP_ROUTE/EDITOR)
│   │   ├── move-rules.js    isValidMove — the single source of truth for legal moves
│   │   ├── path-validator.js  validateCandidatePath — used by solver to verify results
│   │   ├── portal-utils.js  resolvePortal
│   │   └── heatmap.js       Browser-side heatmap helpers: buildPathListHeatmap(pathList)
│   │                        (Map<key,count> of distinct paths visiting each cell) and
│   │                        heatmapToCells(heatmap, pathCount) (→ {x,y,intensity} for
│   │                        rendering). Counterpart to scripts/generate-level-heatmaps.mjs.
│   ├── editor/              Level editor model and history
│   ├── engine/              Engine sub-controllers (createXxxController factories).
│   │   │                    All ENGINE state mutations go through state-actions.js —
│   │   │                    enforced by check:engine-state-boundary.
│   │   ├── challenge-options.js  Play challenge options. applyPlayChallengeOptions()
│   │   │                    returns { playable, level } with a derived copy — the
│   │   │                    input level is never mutated.
│   │   ├── hazard-controller.js  Goose/hazard animation timers. computeJumpScareEffects()
│   │   │                    and computeBombDetonationEffects() are pure (DOM-free).
│   │   │                    scheduleTimer injected for testability.
│   │   ├── level-flow.js    Level load/advance/prev/restart flow.
│   │   │                    scheduleTimer injected for testable cheat timer.
│   │   ├── level-rating-manager.js  Dev Mode level rating/tagging: fingerprint lookup,
│   │   │                    Firestore load/save, stale-response guard via requestId.
│   │   ├── overlay-controller.js Game overlay transitions
│   │   ├── path-navigator.js     Path drawing and navigation
│   │   ├── render-loop.js        Canvas render-dirty signaling
│   │   ├── review-mode.js        Review-mode state management
│   │   ├── solver-manager.js     In-game hint/solver lifecycle
│   │   ├── step-dispatcher.js    Per-step event dispatch. Routes ActionType events
│   │   │                    directly; delegates EffectType events to runEffects().
│   │   ├── tap-router.js         Tap/click routing to game objects
│   │   └── win-controller.js     Win detection and modal flow. computeWinEffects()
│   │                             is a pure function returning Effects[] for DOM-free
│   │                             testing.
│   ├── input/               Controllers (gamepad, pointer, solver overlay, etc.)
│   ├── persistence/         Firebase client, progress store, submission repo
│   ├── render/              Canvas renderer and draw helpers
│   ├── runtime/             Game-rules, path-state, state machine, step processor
│   │   ├── actions.js       Frozen ActionType constants + factory helpers (13 types)
│   │   ├── effect-runner.js runEffects(effects, adapters) — central dispatcher for
│   │   │                    all 11 EffectType constants. win-controller, hazard-
│   │   │                    controller, and step-dispatcher all route through it.
│   │   ├── effects.js       Frozen EffectType constants + factory helpers (11 types)
│   │   ├── game-rules.js    Win metrics and win-condition logic
│   │   ├── path-state.js    Path mutations and derived path state
│   │   ├── state-machine.js Legal logic-state transitions
│   │   └── step-processor.js Per-step computation and event generation. Emits
│   │                         ActionType / EffectType constants throughout — raw strings
│   │                         banned by ESLint no-restricted-syntax rule.
│   ├── solver/              Modularized solver internals (18 files)
│   │   ├── archetype.js     Level archetype detection
│   │   ├── attempts.js      Attempt config generation (getConfiguredAttemptConfigs)
│   │   ├── distance.js      BFS distance utilities
│   │   ├── diversification.js  Resumable diverse-hint-search session (browser-safe,
│   │   │                    budget-bounded port of scripts/hint-diversification.mjs).
│   │   │                    createDiversificationSession(level, existingHints, opts)
│   │   │                    returns { runUntil(getDeadline, runOpts), isComplete }; phase
│   │   │                    state machine baseline → gate-direction → portal-direction →
│   │   │                    done lives in closures so repeated runUntil() calls resume
│   │   │                    exactly where they left off. Also exports pathSignature(path)
│   │   │                    and mergeUniqueHints(baseHints, extraHints).
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
│   │   ├── trap-search.js   Trap spot detection
│   │   ├── worker.js        Web Worker script — runs solver off-thread. Exports
│   │   │                    handleWorkerMessage() for Node.js unit testing.
│   │   └── solver-worker-client.js  Client adapter: createSolverWorkerClient(url)
│   │                                returns an object with solve() compatible with
│   │                                SolverV2.solve() but delegates to a Worker.
│   ├── SolverV2.js          Main solver facade — thin shim over modules/solver/.
│   │                        Moved from root so ESLint, imports, and audit triggers
│   │                        all resolve under modules/ consistently.
│   ├── theme/               Theme normalization and registry
│   ├── ui/                  Modal, toast, layout, loading, solver overlay UI.
│   │                        svg-defs.js holds the icon sprite sheet (SVG <defs> for
│   │                        <use href="#def-*">), injected at boot by injectSvgDefs().
│   │                        focus-trap.js provides modal focus-trapping (activate/release),
│   │                        wired into modal-ui.js openModal/closeModal (Tab containment,
│   │                        Escape-to-close, focus restore). editor-palette.js holds the
│   │                        data-driven object-tool list (EDITOR_PALETTE_TOOLS) rendered into
│   │                        #editorPalette .palette-grid at boot by renderEditorPaletteItems().
│   │                        modal-icons.js injects the shared close-X icon into every
│   │                        .modal-close-btn at boot (injectModalCloseIcons()).
│   ├── app.js               App construction and dependency wiring. bootstrapApp()
│   │                        exposes read-only window.PATHFINDER diagnostics by default and
│   │                        gates the full mutable window.APP = createAppFacade(app) facade
│   │                        behind the ?debug query param (see
│   │                        docs/refactor-notes/2026-06-20-app-architecture-refactor.md).
│   ├── boot.js              Boot sequence
│   ├── core.js              Core constants, mode/status enums, audio bus. DEV = false.
│   ├── data.js              Level data access
│   ├── debug.js             Debug helpers (no-op when core.DEV = false)
│   ├── editor.js            Editor integration
│   ├── engine.js            Game engine facade (coordinates sub-controllers)
│   ├── input.js             Input integration
│   ├── levelutils.js        Level utility functions. normalizeLevel() validates with
│   │                        parseRawLevelDetailed and returns a shallow-frozen level
│   │                        object (prevents accidental property replacement).
│   ├── loader.js            Level/theme loader
│   ├── persistence.js       Persistence integration
│   ├── renderer.js          Renderer integration
│   ├── state-actions.js     Re-export barrel for ENGINE state mutation helpers. Real
│   │                        implementations live in modules/state/actions/*.js, split by
│   │                        slice (core/navigation/hazard/hint/solver/review/editor/ui/
│   │                        runtime/rating). All ENGINE mutations go through these helpers.
│   ├── state/actions/       Per-slice state-action modules (split from state-actions.js).
│   │                        shared.js holds resolveEngineState; one file per ENGINE slice.
│   ├── state-slices.js      State slice factories (nav, editor, etc.)
│   ├── state.js             App state (top-level ENGINE object)
│   ├── theme-engine.js      Theme engine
│   └── ui.js                UI integration
│
├── scripts/                 Node.js CLI tools (ES modules)
│   ├── run-solverv2-direct.mjs      Main solver CLI
│   ├── hint-path-oracle.mjs         CI gate — validates hint paths
│   ├── hint-weight-calibration.mjs  Replays verified hint paths through scoreMoveV2 per
│   │                        policy profile; reports top1Rate/MRR/mean hinge loss.
│   │                        `--search` runs single-axis coordinate descent over scoring
│   │                        weights to suggest a locally-optimal vector (manual review only
│   │                        — never auto-applied to policy.js).
│   ├── *-unit-tests.mjs             Vitest unit/integration suites (domain, solver-*, state,
│   │                    engine, runtime, ui-dom, …) — run via `npm run test:unit`, not node.
│   ├── domain-unit-tests.mjs        Domain unit tests (Vitest)
│   ├── startup-smoke-test.mjs       Boot harness integration tests (node validator)
│   ├── check-audit-output.mjs       Validate audit telemetry JSON structure
│   ├── check-audit-artifacts.mjs    CI gate for audit artifact presence
│   ├── check-modal-a11y.mjs         CI gate: every .screen-modal/.modal-overlay in index.html
│   │                    must have role="dialog" + aria-modal="true" + a non-empty aria-label
│   ├── check-dead-scripts / check-package-scripts.mjs  Verify all npm script targets exist
│   ├── check-engine-state-boundary.mjs  Enforce ENGINE mutations via state-actions.js only
│   │                    (scans the engine, input, and ui consumer layers)
│   ├── check-raw-inner-html.mjs     Ban unsafe innerHTML patterns
│   ├── check-secret-hygiene.mjs     Scan for committed secrets
│   ├── check-third-party-dependencies.mjs  Audit CDN/external deps against allowlist
│   ├── diagnose-failing-levels.mjs  Diagnostic for specific failing levels
│   ├── editor-validation-test.mjs   Editor behavior tests
│   ├── effect-runner-unit-tests.mjs 15 tests for modules/runtime/effect-runner.js
│   ├── engine-controllers-unit-tests.mjs  Engine sub-controller tests (29 tests)
│   ├── firestore-rules-test.mjs     Firestore security rules tests
│   ├── import-published-levels.mjs  Import levels from Firestore (needs FIREBASE_BEARER_TOKEN)
│   ├── level-schema-unit-tests.mjs  40 tests for modules/domain/level-schema.js
│   ├── run-audit-export.mjs         Full causality-metric audit export (rolling history)
│   ├── solver-*-unit-tests.mjs      13 solver module unit test files
│   ├── state-unit-tests.mjs / state-actions-unit-tests.mjs
│   ├── step-processor-unit-tests.mjs 15 tests including portal+false-goal detonation
│   ├── trap-search-audit.mjs        findTrapSpots timing audit
│   ├── validate-bundled-levels.mjs  Validates all 150 bundled levels at CI time
│   ├── ablation-config.mjs          Ablation feature registry + experiment catalogue
│   ├── run-ablation.mjs             Ablation experiment runner (controlled measurement)
│   ├── analyze-ablation.mjs         Ablation analysis + report generator
│   ├── generate-level-heatmaps.mjs  Builds data/level-heatmaps.json from each level's
│   │                        saved hints[]. Exports collectObjectCells(raw),
│   │                        buildLevelHeatmap(raw), writeHeatmapsFile(rawLevels, path)
│   │                        (reused by import-published-levels.mjs).
│   ├── level-heatmap-report.mjs     Cross-references level-heatmaps.json against
│   │                        levels.json to report dead squares (zero hint visits + no
│   │                        grid object) and grid-trim candidates (equal empty border
│   │                        rows/cols). Supports --json for machine-readable output.
│   │                        (level-boredom-report.mjs was REMOVED — its "boredom score" ranking
│   │                        approach was disproven/retracted; see docs/history/
│   │                        development-journal.md for the history.)
│   └── level-ratings-report.mjs     Retrieves Dev Mode level ratings/tags (preset + custom
│                            tags, difficulty/fun) from the public-read level_ratings Firestore
│                            collection (writes remain admin-only). FIREBASE_BEARER_TOKEN
│                            optional. Supports --json.
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
│   ├── hint-weight-calibration/  hint-weight-calibration.mjs reports: all-profiles.json
│   │                        (full-corpus top1/MRR/hinge per profile) and
│   │                        default-search.json (coordinate-descent result)
│   └── ablation/            Ablation lab outputs (run-*.json, analysis JSON)
│
└── docs/
    └── comprehensive-codebase-plan.md  5-phase modernization plan (all phases complete)
```

> **Notes:**
> - `check:dead-scripts` catches npm scripts that reference missing local Node entrypoints.
> - `check:engine-state-boundary` enforces that the consumer layers — `modules/engine.js`, `modules/engine/`, `modules/input/`, and `modules/ui/` — mutate ENGINE state only through `modules/state-actions.js` helpers. The implementation layers that legitimately own raw mutation (`modules/state/actions/`, `modules/runtime/`, editor history) are intentionally not scanned.
> - `check:third-party` enforces that only allowlisted CDN URLs appear in `index.html`.
> - Canonical level objects returned by `normalizeLevel()` are shallow-frozen — property replacement throws in strict mode. Editor always uses `deepCloneLevel()` working copies.

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
#   npm run check      — static checks (dead-scripts, lint, secret-hygiene, csp, types, etc.)
#   npm run test:unit  — Vitest: all 33 unit/integration suites (~440 tests) in one ~3s pass
#   npm run test:node  — node validators (startup-smoke, hint-path-oracle, loader,
#                        data-asset-runtime-smoke, firestore-rules, bundled-levels)
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

# Trap-spot timing audit (separate from hint solver)
node scripts/trap-search-audit.mjs --levels=all --extended-budget=60000

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
  - `sc = (adjTurnMask&0xF)<<24 | (mustTurnMask&0xF)<<20 | (surroundMask&0xF)<<16 | (flipperUsedMask<<12) | (mustCrossMask<<8) | (mpVisitedMask<<4) | (ints&0xF)`
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
  surroundMask: number,              // 32-bit: bit i set while surround[i] has unvisited neighbors
  surroundNeighborRemainingMasks: Uint8Array, // per surround cell: 8-bit mask of unvisited neighbors
  mustTurnMask: number,              // 32-bit: bit i set while must-turn[i] unsatisfied
  adjTurnMask: number,               // 32-bit: bit i set while adj-turn[i] unsatisfied
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
- `prep.surroundNeighborIndex` — Map<neighborKey, surroundIdx> for O(1) lookup when entering a cell adjacent to a surround landmark
- `prep.surroundInitNeighborMasks` — Uint8Array: initial 8-bit neighbor bitmask per surround cell
- `prep.surroundNeighborDistMaps` — BFS dist arrays to each surround neighbor (for lower-bound pruning)
- `prep.mustTurnCellIndex` — Map<key, idx>; `prep.mustTurnDirs` — required turn direction per must-turn cell
- `prep.adjTurnDistMaps` — BFS dist arrays to approach cells for each adj-turn landmark
- `prep.hasLandmarkConstraints` — boolean fast-path flag; `false` for levels without any landmark constraints (avoids overhead on the vast majority of levels)

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

The solver ships an ablation framework (45 togglable feature flags) for measuring what each
search feature contributes. Full reference: [`docs/ablation.md`](docs/ablation.md). Quick start:
`npm run ablation:baseline`, `npm run ablation:single`, `npm run ablation:analyze`.

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
- **Styling is single-system semantic CSS — no utility layer.** The Tailwind-derived
  `styles/utilities.css` is **deleted** (see [`docs/styling-semantic-migration-plan.md`](docs/styling-semantic-migration-plan.md)).
  Do **not** add Tailwind-style utility classes (`flex`, `mb-4`, `bg-[var(...)]`, …) to
  markup — `check:css-class-coverage` hard-fails on `bg-[var(...)]` arbitrary-value classes. To
  style an element, add/extend a **semantic component class or id rule** in `styles/components.css`
  (design tokens + the `.type-*` scale live in `styles/tokens.css`). The only kept non-component
  classes are the type scale, the `.hidden`/`.is-shown`/`.selected` state hooks, and the pure JS
  query-selector hooks (`.palette-tool`, `.palette-group-icon`).
- **Frozen canonical levels**: `normalizeLevel()` returns a shallow-frozen object. Do NOT attempt to assign to level properties. Use `deepCloneLevel(level)` for mutable copies (editor always does this).
- **Editor validator is a local heuristic, not a solver**: `validateLevelDetailed()`'s diagonal-obstacle/must-cross checks only inspect a handful of nearby cells — they cannot detect routes around through the rest of a large grid and can both false-positive and false-negative relative to true solvability. Don't trust its "invalid" reasons as proof of infeasibility on a real level; confirm with SolverV2 when it matters (history: docs/history/development-journal.md, "MustCross Diagonal-Trap Validation Fix").

---

## Firebase Integration

The app reads/writes level submissions and player progress to Firestore. Firebase config is in `firebase-config.js` (public client-side web config — safe to commit). See `docs/firebase-config-and-secret-hygiene.md` for what may be committed and what must remain secret. The `modules/persistence/` directory contains:
- `firebase-client.js` — Firebase SDK wrapper
- `level-submission-repository.js` — Hint path storage (encode/decode for Firestore)
- `local-session-store.js` — Local session state (fallback when offline)
- `progress-store.js` — Player progress persistence
- `review-repository.js` — Level review/rating data
- `level-rating-repository.js` — Dev Mode level rating/tagging storage (admin-only)

Firebase is loaded via gstatic CDN compat scripts (`firebase-app-compat.js` etc.). There is no Firebase Hosting — the app is served by GitHub Pages.

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
5. Modify `getAttemptConfigs()` in `modules/solver/attempts.js` (not SolverV2.js directly — that is now a thin shim)
6. Re-run targeted levels to verify improvement
7. Re-run full audit to verify no regressions
8. Run `npm run ci` before committing

### Level archetype investigation
```bash
node --input-type=module << 'EOF'
import { readFileSync } from 'fs';
const RAW_LEVELS = JSON.parse(readFileSync('./data/levels.json', 'utf8'));
const { SOLVER_TESTING_API } = await import('./modules/SolverV2.js');
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

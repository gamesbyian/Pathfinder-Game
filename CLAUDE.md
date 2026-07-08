# Pathfinder Game — Developer Reference

## Project Overview

Pathfinder is a browser-based grid puzzle game. The player draws a continuous path on a rectangular grid from a starting **gate** to a **goal** cell. A solution is accepted only when all constraints hold simultaneously: exact path length, exact intersection count, and every object-specific obligation (must-pass, must-cross, portals, filters, landmarks, …).

`Solver.ts` generates the hint paths the in-game hint system serves. This file is the **current-state reference**: orientation, game rules, and the non-obvious rules/gotchas that prevent mistakes. Deep per-topic detail lives under [`docs/`](docs/README.md) (indexed in `docs/README.md`); the dated build history is in [`docs/history/development-journal.md`](docs/history/development-journal.md).

---

## Working in This Codebase

Rules earned by watching the same mistakes twice. The model is fast at producing *plausible* code and slow to notice that plausible ≠ correct, so the discipline lives in the process, not the generation.

- **Read before you write.** This repo is documented on purpose: the [`docs/`](docs/README.md) index + ADRs are the authoritative "why", and [`docs/architecture.md`](docs/architecture.md) says where new code goes. Read the doc *and* the files you're about to touch, then copy the pattern that's already there. Architecture invariants are machine-enforced (AST-based ESLint rules — see the Notes under Repository Layout); don't fight them, understand them.
- **Think, and state assumptions.** Many requests are underspecified ("add a constraint" is several different features). Name the interpretation you picked and the tradeoff. If a mechanic is genuinely ambiguous, ask — don't fill the gap with plausible code that passes a casual read and fails at the win-condition check.
- **Simplicity, minimal diff.** This codebase carries scars from over-abstraction and haphazard growth (that's what the quality-review work has been undoing — see the journal). Write the smallest change the task allows; don't reformat untouched code; justify every changed line by the task. Abstract only after the third copy, never "in case we need it."
- **Verify before you claim done.** `npm run ci` must pass (static checks + Vitest + node validators). If you touched the solver's hot search path, `npm run solver:bench -- --check` must show **no regression vs the baseline** — the single hardest level can fail under sandbox CPU-throttling, which is *not* a code regression (confirm by re-running the pre-change code). Fixing a bug? Write the failing test first, watch it fail, then fix. Test behavior that can break, not that a constructor sets a field.
- **Debugging: investigate, don't guess.** Read the whole error, reproduce before changing anything, change one thing at a time. Don't silence an unexpected `null`/`undefined` with a guard — find *why* it's there or the bug just moves somewhere quieter.
- **Dependencies and platform constraints are load-bearing.** Every runtime dependency must be **bundled by Vite** (no new CDN `<script>`s) and survive `check:csp` + `check:third-party`. Prefer the stdlib or an existing utility over a new package; when you must add one, say why.
- **Solver strategy is keyed on level *features*, never level *identity*.** `check:no-solver-level-numbers` enforces this over the solver source and its docs — cite the feature regime ("navDensity ≥ 0.82", "≥3 must-pass"), not a level number, in code and comments.
- **New canvas-drawn visuals must be themed.** `check:canvas-theme-coverage` scans `modules/render/*.ts` and fails on any hex color literal that isn't sourced from `theme.colors.*` (see `theme-engine.ts`'s `deriveTokens` + `theme-normalizer.ts` for the fallback pattern) — a hardcoded color is invisible to every other check (not a CSS class, not banned syntax), which is exactly how the landmark objects and turn/satisfied badges shipped fully unthemed before this existed. A literal that must stay fixed regardless of theme (a universal hazard icon like the goose/bomb, an object's material cue like a fountain's water highlight, the intentional multi-color "rainbow" path style) needs a `// theme-exempt: <reason>` comment on the same line — the reason is the justification, not a rubber stamp.
- **Communicate precisely, especially uncertainty.** Say what you did and why, flag concerns even when you did exactly what was asked, and report what you did *not* run (e.g. the Playwright e2e/visual suites are not part of `ci`). "I'm not sure this path is CSP-clean" tells the reader what to check; "should be fine" does not.

---

## Deployment & Build

- **Vite → GitHub Pages.** `npm run build` → `dist/`; `npm run dev` (HMR) / `npm run preview` (serve the build). Static site on GitHub Pages; there is **no Firebase Hosting** (`firebase.json` only configures Firestore rules/indexes). Deploy is automated by `.github/workflows/deploy-pages.yml` on push to `main`. See [`docs/adr/0010-build-step-vite.md`](docs/adr/0010-build-step-vite.md).
- **The dev server (`npm run dev`) is NOT CSP-clean** (HMR uses inline scripts/eval) — local-only. CI/e2e and the deployed site use the production build, which is clean.
- **CSP is enforced** via a `<meta http-equiv>` in `index.html` (Pages can't set response headers), kept in sync with `security/csp-policy.json` by `check:csp`. `index.html` ships **no inline JS** (boot entry is `modules/boot-entry.js`). Firebase (Firestore + Auth, modular SDK) and Tone.js are **bundled by Vite** — no CDN `<script>`s. See [`docs/content-security-policy.md`](docs/content-security-policy.md).
- **CSS is one semantic system, no utility layer.** `styles/app.css` `@import`s `reset.css` → `tokens.css` (`:root` tokens + the `.type-*` scale) → `components.css` (semantic component/id rules + the `--theme-*` colours). There is no Tailwind and no `utilities.css`; style an element by adding/extending a semantic component class or id rule (not utility classes) — `check:css-class-coverage` hard-fails on `bg-[var(...)]` arbitrary-value classes. See [`docs/styling-semantic-migration-plan.md`](docs/styling-semantic-migration-plan.md).

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
| **Must-turn landmark** | Passable. Path must make a turn (of required direction: `either`/`cw`/`ccw`, relative to the level's default unrotated/unmirrored orientation) at this cell. Tracked via `mustTurnMask`. |
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
Landmarks are declared in the raw level JSON as a `landmarks` array; each entry has `x`, `y`, `objectType` (visual asset name), and `role` (`turn` optional for the non-suffixed turn roles):

```js
landmarks: [
  { x: 5, y: 5, objectType: 'park',     role: 'surround' },
  { x: 3, y: 3, objectType: 'library',  role: 'mustTurn',     turn: 'either' },
  { x: 2, y: 7, objectType: 'library',  role: 'mustTurnCcw' },
  { x: 7, y: 2, objectType: 'fountain', role: 'adjacentTurn', turn: 'cw' },
  { x: 9, y: 4, objectType: 'statue',   role: 'decorative' },
]
```

- **Passable** (path may enter): `mustPass`, `mustTurn`, `mustTurnCw`, `mustTurnCcw`.
- **Impassable** (added to `blockSet`): `surround`, `adjacentTurn`, `adjacentTurnCw`, `adjacentTurnCcw`, `decorative`.

`parseRawLevel` normalizes these into `surroundKeys`/`adjacentTurnKeys`/`adjacentTurnDirs` (parallel arrays), `mustPassTurnDirs: Map<key, TurnDir>`, and `landmarkMeta: Map<key, {objectType, role}>`. The coordinate-bearing field set has a single source of truth — `LEVEL_KEY_FIELDS` in `domain/level-codec.ts` (drives `remapLevelKeys`/`forEachLevelKey`), so shifts/resizes/bounds can't silently drop a field. The reverse direction has one too: **`buildWireLevelData()`** (same file) is the only normalized→raw serializer — used by editor export, submission, and review publish — so persisted levels always carry `landmarks` (a hand-rolled submission serializer formerly flattened them to plain `blocks`/`mustPass`, silently downgrading the mechanics on review). Duplicate detection (`domain/level-fingerprint.ts`, fingerprint **v2**) canonicalizes by landmark *mechanics*: landmark-derived coords are excluded from the generic buckets, so equivalent wire shapes fingerprint identically while a plain block ≠ a landmark at the same cell. See [`docs/landmark-submission-serialization-plan.md`](docs/landmark-submission-serialization-plan.md).

`TurnDir` (`'either' | 'cw' | 'ccw'`) is always relative to the level's default (unrotated, unmirrored) orientation — never to the path's travel direction or the currently displayed variant. Two independent transforms touch it, and must treat rotations and reflections differently because a reflection reverses chirality while a rotation preserves it: (1) the **editor's Rotate/Mirror buttons** (`input/editor-toolbar-controller.ts`) permanently rewrite the canonical level's coordinates via `levelUtils.applyCoordMapToLevel` → `remapLevelKeys` (`domain/level-codec.ts`) — Mirror passes `reflect: true`, which flips `mustPassTurnDirs`/`adjacentTurnDirs` values via `flipTurnDir` (`domain/landmark-rules.ts`); Rotate passes no reflect flag, correctly leaving them unchanged. (2) **Play-mode's random-per-load / "Whoa"-button display variant** (`engine/level-flow.ts`, `domain/geometry.ts`'s 8-way `transformPoint`/`transformAxis`) never touches the canonical level — only screen position and click-input are remapped — so the render layer applies `transformTurnDir(dir, variant)` (`domain/geometry.ts`) when drawing the mustTurn/adjacentTurn visual cue, flipping cw↔ccw for the 4 reflecting variants (4–7) so the on-screen arrow matches what's actually required in the displayed orientation.

---

## Repository Layout

```
/
├── data/                    Runtime-fetched JSON (loaded at boot; no window globals):
│   ├── levels.json          156 levels (1-indexed). Sole source of truth for authored level data (no inline hints).
│   ├── hints/<NNN>.json     Generated hint corpus, one file per level (join key: 1-based level number). Lazy-loaded at runtime via data.getHints(levelNumber); tools read/write via scripts/level-data-io.mjs.
│   ├── level-heatmaps.json  Generated companion (rebuild: npm run levels:generate-heatmaps).
│   └── themes.json          Theme definitions.
├── index.html               Browser entry; loads modules/boot-entry.js; carries the enforcing <meta> CSP.
├── security/csp-policy.json Single source of truth for the CSP (validated by check:csp).
├── styles/                  Single semantic-CSS system (app.css @imports reset → tokens → components).
├── eslint.config.mjs        ESLint 9 flat config + the AST architecture rules (see Notes).
├── vite.config.ts           Production build (base './', copies data/ + firebase-config.js).
├── vitest.config.mjs        Discovers colocated modules/**/*.test.ts + residual scripts/*-unit-tests.mjs.
├── firebase.json / firestore.rules / firestore.indexes.json   Firestore rules/indexes (no hosting).
├── .github/workflows/       ci.yml, deploy-pages.yml, deploy-firestore-rules.yml, audit-export.yml.
├── tests/                   Playwright browser specs (smoke, gameplay, a11y, editor, csp, …).
├── modules/                 Application source (all TypeScript; ADR 0011). See docs/architecture.md.
├── scripts/                 Node CLI tools + node-validator suites. package.json scripts are the map.
├── audits/                  Solver run outputs. audits/solver-baseline.json is the solver-bench baseline.
└── docs/                    Per-topic docs + ADRs — see docs/README.md.
```

At a glance: `domain/` → `runtime/` → `solver/` is the pure logic core (no DOM); `engine*`, `input/`, `render/`, `ui/`, `persistence/` are the browser-adapter/controller boundary; `state*` holds the typed `EngineState` tree, mutated only through `state-actions`. Layering, injected ports, and where-to-put-new-code: [`docs/architecture.md`](docs/architecture.md); how deeply each layer is typed: [`docs/typing.md`](docs/typing.md).

> **Notes:**
> - **Architecture invariants are AST-based ESLint rules** (in `eslint.config.mjs`, run by `check:lint`), tripwire-tested in `scripts/eslint-rules-unit-tests.mjs`: `local/engine-state-boundary` (the `engine`/`input`/`ui` consumer layers mutate ENGINE state only through `state-actions`); scoped `no-restricted-globals`/`no-restricted-imports` keep `domain`/`runtime`/`solver` browser- and adapter-free; `no-restricted-syntax` bans raw HTML injection + raw event-type strings. See [`docs/testing.md`](docs/testing.md).
> - Canonical level objects from `normalizeLevel()` are **shallow-frozen** — property replacement throws in strict mode. Use `deepCloneLevel()` for mutable copies (the editor always does).
> - **Failure paths report through the `reportError` seam** (`modules/error-reporting.ts`, injected from the composition root) — never a bare `console.error`/`console.warn` in a `catch` or `.catch`, and never an empty catch. Advisory failures still report (they just don't rethrow). See docs/architecture.md "Stage 1".

---

## Solver Architecture

`modules/Solver.ts` is a thin facade over `modules/solver/*`. Strategy is selected by **level features, never identity** (see the Working rules). The full reference — core flow, archetypes, the declarative `ATTEMPT_POLICY`, DFS/beam mechanics, pruning, `prepLevel` data, plus CLI usage, the audit-JSON format, and debug/perf recipes — is **[`docs/solver-architecture.md`](docs/solver-architecture.md)**.

Cell-key & axis encoding (used throughout the domain/solver core):
```js
PACK(x, y) = ((y << 16) | x) >>> 0;  UNPACK(k) = { x: k & 0xFFFF, y: (k >>> 16) & 0xFFFF }
KEY_SPACE  = 1 << 20   // covers grids up to 15×15
AXIS_H = 1  // horizontal (dx≠0)   AXIS_V = 2  // vertical (dy≠0)   AXIS_NONE = 0
```

### Common gotchas
- **Portal forced-move**: at a portal cell when the last move was not a portal jump, `getNeighbors()` returns only `[portal.dest]`, bypassing static adjacency — portal entry forces the exit.
- **Gate cells cannot be re-entered**: excluded from `staticNeighbors` targets; `isValidMove` also guards this.
- **Must-cross lock**: turning at a 1st-pass must-cross cell consumes both H and V axis bits, blocking the required 2nd crossing. Dynamic check in `_isMoveDynValid`.
- **Flipping filters** are fully dynamic — current axis depends on `flipperUsedMask` parity, so they can't be precomputed into `staticNeighbors`.
- **Dense levels** (`navDensity ≥ DENSE_LEVEL_NAV_DENSITY`, named in `solver/prep.ts`): `mustMaskForDFS` is 0, not `initialMustMask`, to avoid disrupting near-Hamiltonian DFS ordering; must-pass correctness is enforced via `mpVisitedMask` instead.
- **Editor validator is a heuristic, not a solver**: `validateLevelDetailed()` inspects only nearby cells and can both false-positive and false-negative on real solvability — confirm with the solver when it matters (the function's own docstring says so).

---

## Level Stats
- **156 levels total** (test levels 148–150 use landmark mechanics).
- Max must-pass 4 · max must-cross 4 · max portals 3 pairs (6 keys) · max flipping filters 4 · grids up to 15×15. All masks fit in 32-bit integers (no BigInt).
- Level coordinates in `data/levels.json` are **1-indexed**; the solver normalizes to 0-indexed internally.
- ~9,600 hint paths total feed the in-game hint system; stored in the per-level `data/hints/<NNN>.json` artifact (split out of `levels.json` so the boot payload is the ~144 KB authored data, not the ~2.5 MB corpus) and **lazy-loaded per level** on first hint request via `data.getHints(levelNumber)`. `getHints` always returns the **full** hint set — curation and the heat-map are client-side derivations over it. In play mode the player cycles a **curated** mutually-distinct subset (not all of them) — the selection metric, coverage guarantees, and cap live in `modules/domain/hint-selection.ts` ([`docs/hint-curation.md`](docs/hint-curation.md)); the heat-map still uses the full set.
- Player-submitted levels are imported from Firestore via `npm run levels:import-published` (runs under `tsx`; matches by the same canonical `domain/level-fingerprint.ts` fingerprint the app uses for submission/publish duplicate detection — a level already in `levels.json` has only its *new* hints merged in — deduped by path signature, capped at 1,000 — instead of being re-appended as a duplicate; genuinely new levels are added; regenerates `level-heatmaps.json` when anything changed). The script exports its pure helpers (`normalizeLevel`/`fingerprint`/`mergeNewHints`, unit-tested in `scripts/import-published-levels-unit-tests.mjs`) and guards its network-touching `main()` behind an `import.meta.url` entrypoint check, so importing it never has side effects.

---

## Firebase Integration

The app reads/writes level submissions and player progress to Firestore. `firebase-config.js` is the **public client-side web config — safe to commit** (authorization lives in Firestore rules). Firebase uses the **modular SDK** (`firebase/app`/`auth`/`firestore`), bundled by Vite (no CDN compat scripts); there is no Firebase Hosting. `modules/persistence/` holds the client wrapper (`firebase-client.ts`, the typed seam) plus the submission/progress/review/rating repos and the offline `local-session-store`. See [`docs/firebase-config-and-secret-hygiene.md`](docs/firebase-config-and-secret-hygiene.md) and [`docs/firestore-security-model.md`](docs/firestore-security-model.md).

---

## Testing & Workflows

- **`npm run ci`** — required pre-merge gate: static checks + Vitest unit/integration + node validators (browser-free). **`npm run ci:full`** adds Playwright e2e. **`npm run test:visual`** is opt-in (environment-sensitive baselines). Tier map, filters, coverage, and e2e/visual detail: [`docs/testing.md`](docs/testing.md).
- **Solver hot-path change** → `npm run solver:bench -- --check` (no regression vs `audits/solver-baseline.json`).
- **Adding a new level**: append to `data/levels.json` (1-indexed; hints, if any, go in `data/hints/<NNN>.json` — write them via `scripts/level-data-io.mjs`), run `npm run test:hint-path-oracle` (fails if the solver can't find a valid path); debug with `npm run solver:direct -- --levels=<N> --verbose`.
- **Solver CLI, audit-JSON format, and debug/perf/archetype/trap recipes**: [`docs/solver-architecture.md`](docs/solver-architecture.md).

---

## Docs & History

This file is the current-state reference, not a diary. [`docs/README.md`](docs/README.md) is the index: per-topic references, ADRs (the authoritative "why"), and the modernization progress board. The full dated build narrative — session logs, bug-fix writeups, retracted experiments — is [`docs/history/development-journal.md`](docs/history/development-journal.md) (history only; not current truth).

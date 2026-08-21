# Pathfinder Game — Developer Reference

## Project Overview

Pathfinder is a browser grid puzzle. The player draws a continuous gate-to-goal path satisfying exact length, exact intersections, and all object constraints (must-pass, must-cross, portals, filters, landmarks, etc.).

`Solver.ts` generates hint paths. This is the current-state reference for orientation, game rules, and non-obvious constraints. Deep references: [`docs/README.md`](docs/README.md). Dated history: [`docs/history/development-journal.md`](docs/history/development-journal.md).

---

## Working in This Codebase

- **Read before editing.** Use [`docs/README.md`](docs/README.md), ADRs, [`docs/architecture.md`](docs/architecture.md), and the files being changed. Follow existing patterns and machine-enforced architecture rules.
- **State assumptions.** Resolve underspecified mechanics explicitly; ask when genuinely ambiguous.
- **Keep diffs small.** Do not reformat unrelated code or abstract speculatively. Abstract after repeated need, not pre-emptively.
- **Separate iteration from completion gates.** Explore cheaply on small samples. To claim a change done/validated/mergeable: `npm run ci` must pass. Solver hot-path changes also need `npm run solver:bench -- --check` for solved-set regressions **and** a full-corpus cost comparison (`nodesExpanded`/time; use `npm run solver:speed-probe`). Sandbox throttling can make the hardest level fail; confirm against pre-change code. `solver:bench --check` does not measure cost. Bug fixes should start with a failing behavioral test. See [`docs/testing.md`](docs/testing.md).
- **Debug causes, not symptoms.** Reproduce, read the full error, change one thing at a time, and do not hide unexpected `null`/`undefined` behind guards.
- **Runtime dependencies are bundled by Vite.** No new CDN `<script>`s. Changes must survive `check:csp` + `check:third-party`; prefer stdlib/existing utilities.
- **Solver strategy uses level features, never level identity.** `check:no-solver-level-numbers` enforces this in solver source/docs. Cite feature regimes, not level numbers.
- **Canvas visuals must be themed.** `check:canvas-theme-coverage` rejects hex literals in `modules/render/*.ts` unless sourced from `theme.colors.*` or accompanied on the same line by `// theme-exempt: <reason>`. See `deriveTokens`/`theme-normalizer.ts`.
- **Report uncertainty precisely.** Say what ran, what did not, and what remains uncertain; Playwright e2e/visual suites are not part of `ci`.

---

## Deployment & Build

- **Vite -> GitHub Pages.** `npm run build` -> `dist/`; `npm run dev` uses HMR; `npm run preview` serves the build. There is **no Firebase Hosting**; `firebase.json` configures Firestore rules/indexes. `.github/workflows/deploy-pages.yml` deploys pushes to `main`. See [`docs/adr/0010-build-step-vite.md`](docs/adr/0010-build-step-vite.md).
- **`npm run dev` is not CSP-clean** because HMR needs inline/eval behavior. CI/e2e and deployment use the clean production build.
- **CSP** is an `index.html` `<meta http-equiv>` synchronized with `security/csp-policy.json` by `check:csp`. `index.html` has no inline JS; Firebase modular SDK and Tone.js are Vite-bundled. See [`docs/content-security-policy.md`](docs/content-security-policy.md).
- **CSS is semantic, with no utility layer.** `styles/app.css` imports `reset.css` -> `tokens.css` -> `components.css`. No Tailwind/`utilities.css`; add semantic component/id rules. `check:css-class-coverage` rejects arbitrary-value utility classes such as `bg-[var(...)]`. See [`docs/architecture.md`](docs/architecture.md#ui--styling-modulesui-styles).

---

## Pathfinder Game Rules

### Core Path Mechanics

- Start on a **gate**, end on the true **goal**.
- **Counted length** = nodes - 1 - portal jumps; portal jumps cost zero length.
- **Intersection** = entering a previously visited cell, excluding gate/goal revisits.
- Must hit exact `reqLen` and exact `reqInt`.
- No diagonal or >1-cell ordinary moves.

### Grid Objects

| Object | Behavior |
|---|---|
| **Gate** | Start; multiple possible. Cannot be re-entered after leaving. |
| **Goal** | True endpoint; one per level. |
| **False goal** | PLAY hazard; solver ignores it (`MoveContext.SOLVER`). |
| **Block** | Impassable; excluded from precomputed BFS/neighbors. |
| **Must-pass** | Must be visited; tracked by `mustMask` / `mpVisitedMask`. |
| **Must-cross** | Must be crossed from opposite sides on two passes; `mustCrossMask` + `crossCounts`. |
| **Filter** | Fixed entry axis (`1` H, `2` V); wrong-axis neighbors omitted from `staticNeighbors`. |
| **Flipping filter** | Single-use (2026-08-06 ruling, `flipperUsedMask`). For the *k*-th distinct flipper crossed board-wide, required axis is declared when *k* is odd and flipped when even. Cannot turn on it; fully dynamic. |
| **Portal** | Paired forced zero-length jump; no reuse. From a portal cell when the last move was not a portal jump, `getNeighbors()` returns only the destination. |
| **Goose** | PLAY hazard; solver ignores it. |
| **Surround landmark** | Impassable; all reachable 8-neighbors must be visited. `surroundMask` + `surroundNeighborRemainingMasks`. |
| **Must-turn landmark** | Passable; requires `either`/`cw`/`ccw` turn relative to the default unrotated/unmirrored level orientation. `mustTurnMask`. |
| **Adjacent-turn landmark** | Impassable; required turn at one 8-adjacent passable cell. `adjTurnMask`. |
| **Decorative landmark** | Impassable; visual only. |

**Cell occupancy invariant:** one conceptual object per cell; a portal destination is always its paired portal terminal. `validateRawLevel` (`domain/level-schema.ts`) is the hard schema gate; `validateLevelDetailed` and editor `getOccupant`/`placeOccupant` mirror it. Move code still defensively rejects portal destinations that are block/goose/false-goal cells. Landmark-derived cells may appear both in `landmarks` and derived `blocks`/`mustPass`; validators exclude these via `baseLandmarkRole`. Historical gaps: goal/portal-destination overlap and missing landmark exclusion in `validateRawLevel`; see [`development-journal.md`](docs/history/development-journal.md#cell-occupancy-schema-gaps-2026-07-11--2026-07-15).

### Win Condition

At the goal, all must hold:

1. counted length = `reqLen`;
2. intersections = `reqInt`;
3. must-pass satisfied (`mustMask === 0` or `mpVisitedMask === initialMpMask`);
4. `mustCrossMask === 0`;
5. `surroundMask === 0`;
6. `mustTurnMask === 0`;
7. `adjTurnMask === 0`.

### Landmark Wire Format

```js
landmarks: [
  { x: 5, y: 5, objectType: 'park',     role: 'surround' },
  { x: 3, y: 3, objectType: 'library',  role: 'mustTurn',     turn: 'either' },
  { x: 2, y: 7, objectType: 'library',  role: 'mustTurnCcw' },
  { x: 7, y: 2, objectType: 'fountain', role: 'adjacentTurn', turn: 'cw' },
  { x: 9, y: 4, objectType: 'statue',   role: 'decorative' },
]
```

- **Passable:** `mustPass`, `mustTurn`, `mustTurnCw`, `mustTurnCcw`.
- **Impassable / in `blockSet`:** `surround`, `adjacentTurn`, `adjacentTurnCw`, `adjacentTurnCcw`, `decorative`.

`parseRawLevel` creates `surroundKeys`, `adjacentTurnKeys`/`adjacentTurnDirs`, `mustPassTurnDirs`, and `landmarkMeta`. `LEVEL_KEY_FIELDS` (`domain/level-codec.ts`) is the single coordinate-field source for remap/iteration. `buildWireLevelData()` is the only normalized->raw serializer used by editor export, submission, and review publish; this prevents landmarks being flattened into plain blocks/must-pass. Fingerprint v2 (`domain/level-fingerprint.ts`) canonicalizes landmark mechanics, excluding derived landmark coordinates from generic buckets so equivalent wire forms match while a plain block differs from a landmark. Design record: [`docs/archive/landmark-submission-serialization-plan.md`](docs/archive/landmark-submission-serialization-plan.md).

**Fingerprint-version bump:** the fingerprint is also the Firestore Dev-Mode rating key and feeds `scripts/import-published-levels.mjs` duplicate detection. A version bump can orphan ratings and diverge scripts with private structural comparisons. `level-rating-manager.ts` uses `getLegacyLevelFingerprints`: fallback on miss, migrate forward on read. Any future bump must preserve that pattern and use `getLevelFingerprintSource` rather than independent comparison logic. Last bump: v1->v2 on 2026-07-03.

`TurnDir` (`either|cw|ccw`) is relative to the canonical unrotated/unmirrored level. Editor **Mirror** permanently remaps coordinates with `reflect: true` and flips turn direction via `flipTurnDir`; editor **Rotate** preserves chirality and does not flip. Play-mode display variants never mutate the canonical level; rendering uses `transformTurnDir(dir, variant)` to flip cw<->ccw for reflecting variants 4–7. Relevant paths: `input/editor-toolbar-controller.ts`, `domain/level-codec.ts`, `domain/landmark-rules.ts`, `engine/level-flow.ts`, `domain/geometry.ts`.

---

## Repository Layout

```text
/
├── data/
│   ├── levels.json          160 authored levels; no inline hints.
│   ├── hints/<id>.json      Generated hint corpus, lazy-loaded by persistent level id.
│   ├── level-heatmaps.json  Generated companion (`npm run levels:generate-heatmaps`).
│   ├── themes.json          Theme definitions.
│   └── stress/              Non-player stress corpora + pinned regression set; never shipped.
├── index.html               Browser entry; `modules/boot-entry.js`; enforcing meta CSP.
├── security/csp-policy.json CSP source of truth.
├── styles/                  Semantic CSS: reset -> tokens -> components.
├── eslint.config.mjs        ESLint 9 + AST architecture rules.
├── vite.config.ts           Production build; explicit player-data copy list.
├── vitest.config.mjs        `modules/**/*.test.ts` + residual script unit tests.
├── firebase.json / firestore.rules / firestore.indexes.json
├── .github/workflows/       CI, Pages, Firestore rules, audit/export, solver research jobs.
├── tests/                   Playwright specs.
├── modules/                 TypeScript application source.
├── scripts/                 Node CLI/tools/validators.
├── logs/                    Raw runs/audits; includes solver baseline and workflow history.
├── reports/                 Human-readable generated analysis; see `reports/README.md`.
└── docs/                    Topic docs + ADRs.
```

`domain/` -> `runtime/` -> `solver/` is the DOM-free logic core. `engine*`, `input/`, `render/`, `ui/`, `persistence/` are browser/controller layers. `state*` contains typed `EngineState`, mutated through `state-actions`. See [`docs/architecture.md`](docs/architecture.md) and [`docs/typing.md`](docs/typing.md).

Key repository invariants:

- AST ESLint rules in `eslint.config.mjs` enforce ENGINE mutation boundaries, browser-free core imports/globals, no raw HTML injection, and no raw event-type strings; tripwire tests are in `scripts/eslint-rules-unit-tests.mjs`.
- `normalizeLevel()` outputs shallow-frozen canonical levels; use `deepCloneLevel()` for mutable copies.
- Failure paths use injected `reportError` (`modules/error-reporting.ts`), not bare `console.error`/`console.warn` or empty catches; advisory failures still report.
- The three local corpora (`levels.json`, `stress-levels.json`, `stress-levels-random.json`) serialize each LEVEL on one compact line while wrapper metadata stays pretty-printed. All writers must use `stringifyCorpusJson` (`scripts/level-json-format.mjs`); `check:corpus-level-formatting` enforces this.

---

## Solver Architecture

Read [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md) before proposing/tuning solver behavior. [`docs/future-work.md`](docs/future-work.md) is deferred/reopen material, not a second queue.

`modules/Solver.ts` is a facade over `modules/solver/*`; strategy is feature-based and level-blind. Full flow, archetypes, `ATTEMPT_POLICY`, DFS/beam, pruning, prep data, CLI/audit/debug/perf: [`docs/solver-architecture.md`](docs/solver-architecture.md).

Other solver-analysis surfaces:

- **Solution-space fingerprints:** `scripts/stress/solution-profile*.mjs`, [`docs/solution-profile.md`](docs/solution-profile.md). Aggregate accepted-hint behavior (cell/edge/turn/portal/must-cross distributions, distinctiveness, saturation), not level shape. Compare unsolved levels with `npm run stress:solution-profile-compare -- --target-level=<n>`. Distinct from `domain/level-fingerprint.ts` and `scripts/solver-fingerprint.mjs`. Committed published/corpus1 profile libraries auto-refresh when live hint signatures differ.
- **AI/manual solving:** [`docs/ai-assisted-manual-solving.md`](docs/ai-assisted-manual-solving.md). One worked demo; not validated on a truly unsolved level. Main recommended use is differential diagnosis of an accepted manual path against solver trace, not narrative strategy mining. Validate with `validateCandidatePath`; record unique solver id and `getLevelFingerprint` for `levelRevision`.
- **Fast portfolio scheduler:** `schedulerMode: 'portfolio-experiment'`, config `data/config/portfolio-experiment.js`, [`docs/fast-portfolio-scheduler-plan.md`](docs/fast-portfolio-scheduler-plan.md). Offline opt-in only; all app paths use `legacy`. Current verdict: not production-ready because measured variants are slower than legacy on published levels even when solvability matches.
- **Large-batch solving:** use the tool-selection table in [`docs/solver-architecture.md`](docs/solver-architecture.md). `.github/workflows/solver-stress-refresh.yml` shards both stress corpora across one 20-job matrix and commits combined results; it replaced the old 20-branch corpus2 workflows. Batch tools must persist/report between levels and default to the cheapest configuration answering the question. Current counts/history: `data/stress/README.md`; batch-speed/provenance work: [`reports/2026-07-23-solver-batch-speed-and-hint-provenance.md`](reports/2026-07-23-solver-batch-speed-and-hint-provenance.md).

Cell/axis encoding:

```js
PACK(x, y) = ((y << 16) | x) >>> 0
UNPACK(k)   = { x: k & 0xFFFF, y: (k >>> 16) & 0xFFFF }
KEY_SPACE   = 1 << 20
AXIS_H = 1; AXIS_V = 2; AXIS_NONE = 0
```

### Common gotchas

- **Portal forced move:** from a portal cell after a non-portal-jump move, `getNeighbors()` returns only `portal.dest`.
- **Gate re-entry:** gate cells are excluded from `staticNeighbors` targets and guarded by `isValidMove`.
- **Must-cross lock:** turning on first pass consumes both axis bits and blocks the required second crossing; `_isMoveDynValid` enforces this.
- **Flippers are dynamic:** axis depends on `flipperUsedMask` parity; do not precompute into `staticNeighbors`.
- **Dense must-pass handling:** for `navDensity >= DENSE_LEVEL_NAV_DENSITY`, `mustMaskForDFS = 0`; correctness uses `mpVisitedMask` so near-Hamiltonian ordering is not disrupted.
- **Editor validation is heuristic:** `validateLevelDetailed()` may false-positive/false-negative solvability; use the solver when it matters.
- **Memoization keys must contain every state dependency.** `mustPassLowerBound` is safely keyed by `(pos, mpVisitedMask)`. `mustCrossLowerBound` also depends on `crossCounts` and first-visit axis (`edgeUsage`), so its cache encodes a base-4 digit per must-cross. An undersized MST scratch buffer once caused stale TypedArray data to make a bound unsound; new state memoization needs differential soundness testing. See [`solver-architecture.md`](docs/solver-architecture.md#history-the-mst-bound-scratch-buffer-bug).
- **`solver:bench --check` checks outcomes, not cost.** An early repair-probe multi-seed retry kept 160/160 but made the corpus ~14% slower because one level exhausted every retry seed; retry width was reduced. Any widening needs full-corpus timing. `scripts/stress/hint-cost-drift.mjs` can mine same-config/same-solution provenance across commits; as of 2026-07-29 it found 949 comparisons (800 byte-identical, 149 drifted). Treat drift as a lead, not a verdict.
- **Shared-path correctness fixes can orphan caller-specific behavior.** Consolidating pruning into `evaluatePrunedMove()` correctly prevented repair search from walking past a non-winning goal, but also removed the only trigger for near-miss/elite bookkeeping; generalizing bookkeeping to `'deadend'` recovered ~20% corpus performance. When a formerly-falling-through case becomes rejected, grep all consumers of the old outcome. See [`reports/2026-07-16-repair-search-elite-splice-regression.md`](reports/2026-07-16-repair-search-elite-splice-regression.md).
- **Scoring can fail only on rare dense regimes and even vary by orientation.** `SCORE_INTERSECTION_SETUP`, `SCORE_SURROUND_URGENCY`, and sometimes `SCORE_PHASE_SCALING`/`SCORE_REVISIT_PENALTY` can lock in unrecoverable early crossings on near-Hamiltonian high-`reqInt` levels. No global term was removed; a bounded last-resort pass reruns the ladder with `SCORE_GOAL_ATTRACTION` disabled after main + repair failure, at zero cost to earlier solves. About 7% of a `dfs-plain` sample are confirmed cases. See [`solver-architecture.md`](docs/solver-architecture.md#attraction-diversity-last-resort-pass-2026-07-16) and [`solver-development-roadmap.md`](docs/solver-development-roadmap.md).
- **Timed-out DFS/beam attempts once reported `nodesExpanded = 0`.** Timeout exits did not credit metrics, making cost clustering meaningless. Fixed 2026-07-16/17 for both search functions with search regression tests; see [`reports/2026-07-16-beam-nodesexpanded-instrumentation-gap.md`](reports/2026-07-16-beam-nodesexpanded-instrumentation-gap.md).
- **Worst-case solve wall budget can exceed `timeBudgetMs`.** Up to `(1 + 6 + 1 + N) × timeBudgetMs`, where repair fallback is 6x, attraction diversity 1x, and admissible-order has `N = ADMISSIBLE_ORDER_PROFILES.length` sequential full-fraction subpasses (5 as of 2026-07-24, including `'none'`). Three independent options control these: `repairBudgetFractionOverride`, `attractionDiversityBudgetFractionOverride`, `admissibleOrderBudgetFractionOverride`; `disableExtraBudgetPasses: true` zeroes all unless individually overridden. Interactive solve UIs use that convenience. New extra-budget passes must wire into it.
- **Time fractions do not create node budget.** `nodeBudget` is one cumulative ceiling across tiers. In the 2026-07-30 typical-budget corpus2 baseline, all 141 unsolved levels with validated admissible-order hints hit exactly 20M nodes after mean 14.4 ladder attempts; the admissible tier appeared on only 1 because earlier tiers consumed the cap. `ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION = 0.25` now withholds nodes via `earlyTierNodeBudget` when that tier will actually run. Keep reserve gating and tier run condition identical; preserve `nodeBudgetReached` when early tiers hit their reduced ceiling. See [`reports/2026-07-30-admissible-order-node-reserve.md`](reports/2026-07-30-admissible-order-node-reserve.md).
- **Sparse `ablation` objects once disabled every omitted flag.** Read sites use `(!cfg || cfg.FLAG)`, so `{ STRATEGY_REPAIR_PROBE: true }` made other missing flags false. `normalizeAblationConfig()` now wraps external configs in a boundary `Proxy`; do not hand-merge `defaultConfig()` elsewhere. See [`solver-architecture.md`](docs/solver-architecture.md#ablation-laboratory).
- **Open board space is a solver variable.** Re-embedding a repair-gated level with only extra empty space flipped repair-probe success/failure across sizes. Treat navDensity/grid size relative to content as first-class difficulty dimensions. See [`reports/families/2026-07-15-re-embedded-cousin-grid-growth.md`](reports/families/2026-07-15-re-embedded-cousin-grid-growth.md) and [`docs/sibling-cousin-system.md`](docs/sibling-cousin-system.md).
- **Batch `--levels` selectors require explicit `pos:`/`id:` on bare numbers/ranges.** A full id string needs no prefix. Fixed 2026-07-18 after inconsistent numeric interpretation silently selected wrong levels. See [`solver-architecture.md`](docs/solver-architecture.md#--levels-selector-syntax--explicit-posid-prefix-required-fixed-2026-07-18).
- **Used-axis does not always mean blocked.** If currently standing on a cell just entered via an already-used axis, continuing straight on that same axis can remain legal even when both `edgeUsage` bits are set. This trap affected topology flood fill, caused a 261-false-rejection near-miss in `mustCrossForcedNeighborDeadlocked`, and falsified two must-cross forced-edge derivations (63,496 violations over 1.1M edges; narrower form still 5,206 over 225K). Any hard “cell/edge unusable” proof must rule this out and be falsified against all stored solutions, not only fixtures.
- **Prep indexes use index+1, zero=absent.** `mustPassIndex`, `mustCrossIndex`, and `flipperIndexMap` do not use -1 for absence. Stale comments once caused `gateForcedFirstStepKey` to treat every cell as must-cross; a “90 instances, 0 violations” check was vacuous because a gate's only neighbor is forced regardless. Comments are fixed in `types.ts`; suspiciously exact/low soundness counts should trigger derivation review.

---

## Level Stats

- **160 published levels**. IDs `P00001`–`P00161` with `P00153` withdrawn, so id != array position after 152. Landmark mechanics: `P00148`–`P00150`, `P00160`, `P00161`.
- Published maxima: must-pass 4; must-cross 4; portals 3 pairs/6 keys; flipping filters 22 (`P00159`; prior authored max 4); grids up to 15×15 and **always square**. Masks fit 32-bit integers.
- **Square grids are schema-enforced** by `validateRawLevel`; rectangular levels cannot enter any corpus. See `data/stress/README.md` “Square-grid cleanup.”
- Stress maxima are higher: must-pass 8, must-cross 8, 7 portal pairs, 8 flippers; schema permits 32 flippers. Published maxima are not solver bounds.
- `data/levels.json` coordinates are 1-indexed; solver internals are 0-indexed.
- Hint corpus snapshot: ~58,000 published hints (58,179 on 2026-08-12), stored in `data/hints/<id>.json` rather than the ~127 KB authored `levels.json`; total corpus file volume is ~95 MB. Hints lazy-load via `data.getHints(level)`. Published levels additionally merge Firestore supplemental hints through `withFirestoreHints`; stress corpora do not. `getHints` returns the full merged set; play-mode curation (`modules/domain/hint-selection.ts`, [`docs/hint-curation.md`](docs/hint-curation.md)) selects the distinct subset while heatmaps use all hints.
- Every published level has a persistent non-reused `P` id. `P00001`..`P00156` were backfilled 2026-07-15; `P00157+` are minted at import. `npm run levels:import-published` matches Firestore submissions by canonical fingerprint, merges only new path signatures into existing levels (cap 1,000), or appends a new level with the next id, then regenerates heatmaps if changed. Pure helpers are unit-tested and `main()` is entrypoint-guarded. Firestore staging keeps opaque doc ids + fingerprint; permanent level id is assigned only on graduation. See `docs/archive/level-id-unification-plan.md`.

---

## Provenance

Hint and level provenance are independent append-only schemas. Neither affects `level-fingerprint.ts`.

### Hint provenance

- Canonical `Hint = { path: number[]; provenance: HintProvenanceEntry[] }` in `modules/domain/hint-types.ts`. One provenance entry = one discovery event. Rediscovering the same path appends provenance to the same hint. Entry subobjects: `solver`, `search`, `context`.
- **Same-technique repeats are usually meaningful.** 2026-07-29 snapshot: 6,570 hints had multiple same-technique entries; only ~5% changed attempt config. Solver commit/cost differences are often the useful signal. Do not collapse entries differing in `solver.version`, `attemptIndex`, or `nodesExpanded`. Only same-run double-appends are redundant: identical except `foundAt` and host-dependent `elapsedMs`/`cumulative*`. 47 such entries (0.05% of 88,451) were removed by idempotent dry-run-by-default `scripts/dedupe-hint-provenance.mjs`; their `foundAt` gaps were 0–1 ms. Excluding wall-clock from identity was necessary: requiring equal `elapsedMs` found only 24/47. Those absolute counts predate corpus growth to 477,925 entries.
- After dedupe, fields independently separating coexisting entries included `nodesExpanded` (11,061 entries), `solver.forcing` (2,290), and `solver.version` (287). Non-redundant does not imply demonstrated utility; the cross-commit cost tool currently consumes ~949 groups.
- **Coverage is near-total except published intake.** Re-measured 2026-08-12 across 253,491 hints / 477,925 entries: both stress corpora 100%; published 89.5%, with 6,093/58,179 uncovered. The gap is a live intake leak from Firestore import and Play-mode win auto-save, not old backlog; `P00158` alone accounts for 999 and has `unknown/imported-without-provenance` level provenance. Do not repeat obsolete earlier figures claiming 7,270/12,517 published missing and 0% stress coverage.
- **Hint-guided rates differ sharply:** prefix-anchored touches corpus1 28.6% (9,264/32,374), corpus2 7.6% (12,327/162,938), published 2.8% (1,655/58,179). Strict cold-evidence shares (`hintGuided === false`, `usedExistingHints === false`, excluding witness/human) are 63.0%, 88.0%, 86.8%. `hintGuided` alone is insufficient because another 36,381 entries set `usedExistingHints`; using only it overstates corpus1 cold share by 13 points. Use `isColdCapabilityEvidence` (`scripts/stress/provenance-classes.mjs`) and regenerate with `npm run stress:provenance-coverage`; `--standard=narrow` is acceptable for candidate derivation, not population capability claims.
- **The hint corpus is valid solutions from any source, not cold-solver capability.** `Solver.solve()` never reads saved hints, but System B / `prefix-anchored` starts from known hint prefixes and can find valid solutions unreachable cold. These use `context.hintGuided: true` and `solver.technique: 'prefix-anchored'`. Capability benchmarking must exclude hint-guided/prefix-anchored and witness/human entries. `check:hint-validity` proves PLAY validity only. `classifyProvenanceSource` in solution-profile tooling provides existing buckets.
- **Dual fields:** path-only `.hints`/`.foundHintsSinceLoad` coexist with canonical `.hintRecords`/`foundHintsSinceLoadRecords`. Reconcile only through `reconcileHints`/`mergeHints`; do not hand-roll merges.
- **Attempt provenance was expanded 2026-07-23:** `HintSolverProvenance` gained `beamWidth`, `diverseBeam`, `gateKey`; `HintSearchProvenance` gained `seedSalt`; `HintSolverForcing` gained `repairMustTurnBiased`/`repairTurnBiased`. Attraction-diversity winners use existing `disabledFeatures`. These were code fixes, not backfills; old hints lack fields until rediscovered.
- On disk all three corpora use `{schemaVersion: 3, hints: Hint[]}` via `scripts/level-data-io.mjs` only. Paths: published `data/hints/<id>.json`; corpus1 `data/stress/hints/<id>.json`; corpus2 `data/stress/hints-random/<id>.json`. `hintKeyForLevel()` uses persistent id verbatim when present, else 1-based position. Runtime `DataService.getHints` takes the level object, uses `level.id`, and falls back to inline `.hints` for id-less drafts/staging data.
- **Intermediate provenance fields can still be dropped before persistence.** On 2026-07-25, `admissibleOrder` had been added to generator/intermediate objects but `candidateEventFromDiscovery` never read it, so persisted entries lost it; the same happened to `orderBy: 'admissible-slack'`. Fix: technique colon suffixes such as `enumerate-targeted:admissible-slack` / `ablation-full:baseline-admissible-order` plus existing `profile`, rather than another boolean. When adding provenance, trace the value to `makeProvenanceEntry`/`hintProvenanceEntryForEvent`; use `.startsWith` rather than exact technique equality when suffixes are valid. See [`reports/2026-07-25-hint-tool-comparison.md`](reports/2026-07-25-hint-tool-comparison.md).
- Provenance is attached at find-time through `modules/solver/hint-provenance.ts` (`deriveSolveAttemptInfo`, `provenanceFromSolveResult`, `hintsFromVarietyResult`) and reused by UI + scripts. It survives editor -> submission -> review -> publish unchanged except appended entries.
- **Published supplemental hints also live in Firestore** at `local_level_hints/{fingerprint}/entries/{entryId}`. Authenticated sessions may add entries; `data.getHints` merges them with local hints. Writes come from hints-only resubmission of an existing published level and fire-and-forget Play-mode win auto-save, both novelty-gated against merged hints and softly capped at 5,000 per level. See [`docs/firestore-security-model.md`](docs/firestore-security-model.md).

### Level provenance

- Canonical `LevelProvenance = { history, origin, confidence }` in `modules/domain/level-provenance-types.ts`. Each history entry records `actor`, `action`, `method`, `detail`, `timestamp`. `origin`/`confidence` are derived by `deriveOrigin` through `appendProvenanceEntry`, never independently set.
- Stored directly as `EngineLevel.provenance`; `null` explicitly means unknown provenance.
- **Every new level is stamped at creation:** editor `createNewLevel()` -> human/authored; both stress generators -> procedural/generated with generator + batch/seed detail; submission -> human/submitted; review approval -> human/reviewed-approved.
- Serialization explicitly carries `provenance` through `normalizeMetadata`, `denormalizeLevel`, and `buildWireLevelData`; new boundaries must name it explicitly.
- `check:level-provenance` hard-fails any level in the three real corpora with missing/empty history.
- One-time backfill covered then-existing 156 published + 450 corpus1 + 1700 corpus2 levels. Published confidence came from a retired classifier using Firestore rating tags (`great`/`common` -> certain-human/certain-ai, else likely for untagged <=130); stress provenance came from `stressMeta` with certain confidence. Corpus sizes later changed (corpus1 102 after 2026-07-11 square cleanup; published now 160). This stored provenance replaced the deleted read-side-only classifier system.

---

## Firebase Integration

The app uses Firestore for submissions and player progress. `firebase-config.js` is public client web config and safe to commit; authorization is in rules. Firebase modular SDK is Vite-bundled; there is no Firebase Hosting. `modules/persistence/` contains `firebase-client.ts`, typed repositories, and offline `local-session-store`. See [`docs/firebase-config-and-secret-hygiene.md`](docs/firebase-config-and-secret-hygiene.md) and [`docs/firestore-security-model.md`](docs/firestore-security-model.md).

---

## Testing & Workflows

- **`npm run ci`**: required pre-merge static checks + Vitest + node validators. **`npm run ci:full`** adds Playwright. **`npm run test:visual`** is opt-in. See [`docs/testing.md`](docs/testing.md).
- **Solver hot-path completion gate:** after cheap iteration, run `solver:bench -- --check` plus a full-corpus cost comparison. Prefer `npm run solver:speed-probe` with pinned `--work-budget=<n>` and generous non-binding `--budget-ms`; wall time then carries the speed signal. Prefer `workSpent` to `nodesExpanded` across different search techniques because DFS/beam/repair do different work per “node.”
- **Work-meter caveat:** it models operation cost with fixed charges. A change that makes an operation cheaper without changing call count can look worse in `workSpent`. Example: `PRUNE_MC_RESERVED_WALL` reduced connectivity flood cost and halved CPU while the meter reported +11% work (89.4M vs 80.2M units for the same 20M nodes; 36.0s vs 81.0s). For such changes use interleaved wall-clock at pinned nodes. See [`reports/2026-07-31-reserved-intersection-wall.md`](reports/2026-07-31-reserved-intersection-wall.md).
- A true speed-only change should be bit-identical in `nodesExpanded` under pinned work budget. Compare medians of interleaved runs; single runs vary ±5–10%. See [`reports/2026-07-30-solver-hot-path-pure-speed.md`](reports/2026-07-30-solver-hot-path-pure-speed.md) and [`docs/solver-budget-determinism.md`](docs/solver-budget-determinism.md).
- **Corpus2 ±5 solved is within observed clock-budget noise.** Two typical-budget refreshes on solver-identical code produced 506 vs 505, with five flipped levels; corpus1 reproduced exactly. The binding `--budget-ms` caused this. For decision-bearing A/B use `solver-typical-budget-baseline.yml` with `deterministic: true` or a large local `--budget-ms`. `deadlineTruncated` is indeterminate, not unsolved. See [`reports/2026-07-31-refresh-nondeterminism.md`](reports/2026-07-31-refresh-nondeterminism.md).
- **Adding a level:** append to `data/levels.json` with next unused `P` id; hints go through `scripts/level-data-io.mjs` into `data/hints/<id>.json`; run `npm run test:hint-path-oracle`; debug with `npm run solver:direct -- --levels=<N> --verbose`.
- Solver CLI, audit JSON, debug/perf/archetype/trap recipes: [`docs/solver-architecture.md`](docs/solver-architecture.md).

---

## Docs & History

This file describes current state. [`docs/README.md`](docs/README.md) indexes topic references, ADRs, and modernization status. [`docs/history/development-journal.md`](docs/history/development-journal.md) preserves dated sessions, bug histories, and retracted experiments; it is historical evidence, not current truth.
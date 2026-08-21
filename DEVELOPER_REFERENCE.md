# Pathfinder Game — Developer Reference

## Project Overview

Pathfinder is a browser grid puzzle. The player draws a continuous gate-to-goal path satisfying exact length, exact intersections, and all object constraints.

This file preserves rare game-rule, solver-gotcha, level-data, and provenance facts. Start with [`AGENTS.md`](AGENTS.md) and [`docs/README.md`](docs/README.md); use topic docs for current workflow and architecture. Dated history lives in [`docs/history/development-journal.md`](docs/history/development-journal.md) and [`reports/`](reports/README.md).

## Working in This Codebase

Current working rules are owned by [`AGENTS.md`](AGENTS.md), [`docs/architecture.md`](docs/architecture.md), [`docs/testing.md`](docs/testing.md), and [`docs/tooling-catalog.md`](docs/tooling-catalog.md). This file is not a competing workflow authority.

## Deployment & Build

Vite builds the static GitHub Pages app. Firebase Hosting is not used. Runtime dependencies are bundled. CSP/dependency/deployment details live in [`docs/architecture.md`](docs/architecture.md), [`docs/content-security-policy.md`](docs/content-security-policy.md), and [`docs/third-party-dependencies.md`](docs/third-party-dependencies.md).

`npm run dev` is not production-CSP-clean because Vite HMR needs development-only behavior; CI/e2e and deployment exercise the production build.

## Pathfinder Game Rules

### Core Path Mechanics

- Start on a gate; end on the true goal.
- Counted length = nodes - 1 - portal jumps; portal jumps cost zero length.
- Intersection = entering a previously visited cell, excluding gate/goal revisits.
- Must hit exact `reqLen` and exact `reqInt`.
- Ordinary moves are orthogonal and one cell.

### Grid Objects

| Object | Behavior |
|---|---|
| Gate | Start; multiple possible; cannot be re-entered. |
| Goal | True endpoint; one per level. |
| False goal / Goose | PLAY hazards; structurally impassable to solver search. |
| Block | Impassable. |
| Must-pass | Must be visited; `mustMask` / `mpVisitedMask`. |
| Must-cross | Must be crossed from opposite sides on two passes; `mustCrossMask` + `crossCounts`. |
| Filter | Fixed entry axis (`1` H, `2` V); wrong-axis neighbors omitted statically. |
| Flipping filter | Single-use. For the kth distinct flipper crossed board-wide, declared axis applies when k is odd and flips when even. Cannot turn on it. |
| Portal | Paired forced zero-length jump; terminals single-use. After normal entry, only the destination is legal. |
| Surround landmark | Impassable; all reachable 8-neighbors must be visited. |
| Must-turn landmark | Passable; requires `either`/`cw`/`ccw` turn relative to canonical orientation. |
| Adjacent-turn landmark | Impassable; required turn at one 8-adjacent passable cell. |
| Decorative landmark | Impassable; visual only. |

Dynamic state/cardinality/model assumptions: [`docs/mechanic-state-contracts.md`](docs/mechanic-state-contracts.md).

**Cell occupancy invariant:** one conceptual object per cell; a portal destination is its paired terminal. `validateRawLevel` is the schema gate. Landmark-derived cells may also appear in derived `blocks`/`mustPass`, so validators exclude those duplicates via `baseLandmarkRole`. Move code still defensively rejects portal destinations overlapping block/goose/false-goal cells.

### Win Condition

At the goal: counted length = `reqLen`; intersections = `reqInt`; must-pass satisfied; and `mustCrossMask`, `surroundMask`, `mustTurnMask`, and `adjTurnMask` are all zero.

### Landmark Wire Format

```js
landmarks: [
  { x: 5, y: 5, objectType: 'park', role: 'surround' },
  { x: 3, y: 3, objectType: 'library', role: 'mustTurn', turn: 'either' },
  { x: 2, y: 7, objectType: 'library', role: 'mustTurnCcw' },
  { x: 7, y: 2, objectType: 'fountain', role: 'adjacentTurn', turn: 'cw' },
  { x: 9, y: 4, objectType: 'statue', role: 'decorative' },
]
```

Passable roles: `mustPass`, `mustTurn`, `mustTurnCw`, `mustTurnCcw`. Impassable/block roles: `surround`, `adjacentTurn`, `adjacentTurnCw`, `adjacentTurnCcw`, `decorative`.

`parseRawLevel` creates `surroundKeys`, `adjacentTurnKeys`/`adjacentTurnDirs`, `mustPassTurnDirs`, and `landmarkMeta`. `LEVEL_KEY_FIELDS` is the coordinate-field source for remap/iteration. `buildWireLevelData()` is the normalized-to-raw serializer for editor export, submission, and review publish. Fingerprint v2 canonicalizes landmark mechanics while keeping a plain block distinct from a landmark.

**Fingerprint-version bump:** fingerprints key Firestore Dev-Mode ratings and duplicate detection. `level-rating-manager.ts` falls back through `getLegacyLevelFingerprints` and migrates forward on read. Future bumps must preserve that pattern and use `getLevelFingerprintSource`. Last bump: v1 to v2, 2026-07-03.

`TurnDir` is relative to canonical unrotated/unmirrored orientation. Editor Mirror flips turn direction via `flipTurnDir`; Rotate preserves chirality. Display variants do not mutate the canonical level; reflecting variants 4–7 flip cw/ccw with `transformTurnDir`.

## Repository Layout

Use [`docs/architecture.md`](docs/architecture.md) and [`docs/typing.md`](docs/typing.md). Rare invariants retained here:

- `normalizeLevel()` returns shallow-frozen canonical levels; use `deepCloneLevel()` for mutable copies.
- Failure paths use injected `reportError`; advisory failures still report.
- Local corpus writers use `stringifyCorpusJson`; `check:corpus-level-formatting` enforces one-line level objects.

## Solver Architecture

[`docs/solver-architecture.md`](docs/solver-architecture.md) owns implementation detail. [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md) owns ranked work.

```js
PACK(x, y) = ((y << 16) | x) >>> 0
UNPACK(k)   = { x: k & 0xFFFF, y: (k >>> 16) & 0xFFFF }
KEY_SPACE   = 1 << 20
AXIS_H = 1; AXIS_V = 2; AXIS_NONE = 0
```

### Common gotchas

- Portal entry after a normal move forces `portal.dest`.
- Gates cannot be re-entered.
- Turning on a must-cross first pass consumes both axis bits and blocks its required second crossing.
- Flipper axis depends on global `flipperUsedMask` parity; never precompute it statically.
- For `navDensity >= DENSE_LEVEL_NAV_DENSITY`, `mustMaskForDFS = 0`; correctness still uses `mpVisitedMask`.
- `validateLevelDetailed()` is heuristic; use the solver when solvability matters.
- Memoization keys need every future-relevant dependency. `mustCrossLowerBound` depends on `crossCounts` and first-visit axis as well as position/mask. An undersized MST scratch buffer once made a bound unsound. See [`docs/solver-correctness-archaeology.md`](docs/solver-correctness-archaeology.md).
- Outcome regression checks do not prove cost. One repair-probe retry preserved the solved set but made the published corpus about 14% slower. `hint-cost-drift.mjs` found 949 same-config/same-solution cross-commit comparisons in its 2026-07-29 snapshot: 800 byte-identical, 149 drifted.
- A shared prune refactor removed repair's near-miss/elite trigger; extending bookkeeping to `deadend` recovered about 20% corpus performance. Audit consumers whenever a formerly falling-through case becomes rejected. See [`reports/2026-07-16-repair-search-elite-splice-regression.md`](reports/2026-07-16-repair-search-elite-splice-regression.md).
- Dense high-`reqInt` scoring can be orientation-sensitive. Treat orientation dependence as evidence of search/representation weakness, not a production rotate/mirror retry policy.
- Timed-out DFS/beam attempts once reported `nodesExpanded = 0`; preserve timeout accounting on new exits.
- Extra passes can multiply wall budget. New extra-budget passes must honor `disableExtraBudgetPasses` and the existing independent overrides.
- Time fractions do not create node/work budget. Early tiers can consume the cumulative ceiling before late tiers run. See [`docs/solver-budget-determinism.md`](docs/solver-budget-determinism.md).
- Sparse ablation objects once disabled omitted flags. Normalize external configs through `normalizeAblationConfig()`; do not create another default-merging path.
- Open board space is a solver variable; grid/open area relative to content can change repair success.
- Numeric `--levels` selectors require `pos:` or `id:`. Full persistent IDs need no prefix.
- **Used-axis does not always mean blocked.** After entry via an already-used axis, continuing straight can remain legal even when both `edgeUsage` bits are set. This caused 261 false rejections and falsified proposed forced-edge derivations with 63,496/1.1M and 5,206/225K violations. Hard unusability proofs must rule this out against stored solutions.
- Prep indexes use index+1, zero=absent. `mustPassIndex`, `mustCrossIndex`, and `flipperIndexMap` do not use `-1`. A stale comment once made `gateForcedFirstStepKey` treat every cell as must-cross; a 90-instance/0-violation check was vacuous because the gate neighbor was forced independently.

## Level Stats

- 160 published levels, IDs `P00001`–`P00161` with `P00153` withdrawn; ID != array position after 152. Landmark mechanics: `P00148`–`P00150`, `P00160`, `P00161`.
- Published maxima: must-pass 4; must-cross 4; portals 3 pairs/6 keys; flipping filters 22 (`P00159`); grids up to 15x15 and always square. Published maxima are not solver bounds.
- Stress generators can exceed published maxima; square grids are schema-enforced. See [`data/stress/README.md`](data/stress/README.md).
- Wire coordinates are 1-indexed; solver internals are 0-indexed.
- Published hints live in `data/hints/<id>.json`, lazy-load by persistent ID, and merge Firestore supplemental hints. Stress corpora do not merge Firestore hints. Play curation selects a display subset; heatmaps use all hints.
- Published IDs are persistent and non-reused. `P00001`–`P00156` were backfilled 2026-07-15; `P00157+` are minted at import. Firestore staging uses opaque doc IDs until graduation.

## Provenance

Hint and level provenance are independent append-only schemas and do not affect level fingerprints.

### Hint provenance

- Canonical `Hint = { path: number[]; provenance: HintProvenanceEntry[] }`. One entry is one discovery event; rediscovery appends provenance to the same path.
- Same-technique repeats can be meaningful when solver version, attempt/config, forcing, or cost differs. A 2026-07-29 cleanup removed only 47 same-run duplicate appends, 0.05% of the then-88,451-entry corpus. Requiring identical `elapsedMs` would have found only 24/47.
- After that dedupe, independently differing fields included `nodesExpanded` (11,061 entries), `solver.forcing` (2,290), and `solver.version` (287). Non-redundant does not imply useful.
- Provenance coverage must be measured. On 2026-08-12: 253,491 hints / 477,925 entries; both stress corpora 100%; published 89.5%, with 6,093/58,179 hints uncovered. Regenerate with `npm run stress:provenance-coverage` rather than quoting older figures.
- Cold evidence is stricter than `hintGuided === false`. At that snapshot, prefix-anchored touched 28.6% of corpus1, 7.6% of corpus2, 2.8% of published hints; strict cold shares were 63.0%, 88.0%, 86.8%. Another 36,381 entries set `usedExistingHints`, so checking only `hintGuided` overstated corpus1 cold share by 13 points. Use `isColdCapabilityEvidence`.
- Valid hint corpus != cold solver capability. Witness, human, prefix-anchored, and other hint-guided paths are valid solutions but not evidence that production `Solver.solve()` finds them cold. `check:hint-validity` proves PLAY validity only.
- Path-only `.hints`/`.foundHintsSinceLoad` coexist with canonical `.hintRecords`/`foundHintsSinceLoadRecords`. Reconcile only with `reconcileHints`/`mergeHints`.
- On disk all three corpora use schemaVersion 3 through `scripts/level-data-io.mjs`: `data/hints/<id>.json`, `data/stress/hints/<id>.json`, `data/stress/hints-random/<id>.json`.
- Intermediate provenance can be lost before persistence. A 2026-07-25 bug carried admissible-order fields through search but dropped them before persistence. When adding provenance, trace it to `makeProvenanceEntry`/`hintProvenanceEntryForEvent`; technique suffixes are valid, so consumers may need prefix matching.
- Published supplemental hints also live in Firestore and merge through `data.getHints`; see [`docs/firestore-security-model.md`](docs/firestore-security-model.md).

### Level provenance

- Canonical `LevelProvenance = { history, origin, confidence }`; history records `actor`, `action`, `method`, `detail`, `timestamp`; origin/confidence are derived.
- `null` explicitly means unknown provenance.
- New levels are stamped at creation: editor human/authored; stress procedural/generated with generator/batch/seed; submission human/submitted; approval human/reviewed-approved.
- Serialization must explicitly carry provenance through `normalizeMetadata`, `denormalizeLevel`, and `buildWireLevelData`.
- `check:level-provenance` rejects real-corpus levels with missing/empty history.

## Firebase Integration

Current Firebase/Firestore contracts are owned by [`docs/security.md`](docs/security.md), [`docs/firestore-security-model.md`](docs/firestore-security-model.md), and [`docs/firebase-config-and-secret-hygiene.md`](docs/firebase-config-and-secret-hygiene.md).

## Testing & Workflows

Use [`docs/testing.md`](docs/testing.md) and [`docs/tooling-catalog.md`](docs/tooling-catalog.md).

Two recurring measurement cautions:

- `workSpent` is the portable cross-technique currency, but fixed work-meter charges can miss an operation becoming cheaper. `PRUNE_MC_RESERVED_WALL` halved CPU while measured work rose 11%: 89.4M vs 80.2M work for the same 20M nodes; 36.0s vs 81.0s. Use pinned-node interleaved wall time when operation cost changes without call count.
- Binding wall deadlines make negative capability results indeterminate. Historical solver-identical Corpus-2 refreshes produced 506 vs 505 with five flipped levels while Corpus 1 reproduced exactly. Use deterministic work-budget protocols and classify `deadlineTruncated` separately.

## Docs & History

[`docs/README.md`](docs/README.md) routes current topics. [`reports/README.md`](reports/README.md) and [`docs/history/development-journal.md`](docs/history/development-journal.md) preserve evidence and chronology.
# Pathfinder Game — Developer Reference

Pathfinder is a browser grid puzzle: draw a gate-to-goal path satisfying exact length, intersections, and object constraints.

This file preserves rare rule, solver-gotcha, level-data, and provenance facts. Start with [`AGENTS.md`](AGENTS.md) / [`docs/README.md`](docs/README.md); topic docs own workflow/architecture. History: [`docs/history/development-journal.md`](docs/history/development-journal.md), [`reports/`](reports/README.md).

> **Contracts vs measurements:** rules, wire formats, and named invariants are durable unless superseded. Counts/maxima/percentages/performance/dates are measurements; regenerate cheap facts and check reports before decision-bearing use.

## Deployment

Vite builds the static GitHub Pages app; Firebase Hosting is unused; runtime dependencies are bundled. See [`docs/architecture.md`](docs/architecture.md), [`docs/content-security-policy.md`](docs/content-security-policy.md), [`docs/third-party-dependencies.md`](docs/third-party-dependencies.md). `npm run dev` is not production-CSP-clean because Vite HMR needs development-only behavior; CI/e2e/deployment exercise the production build.

## Game rules

### Core path

- Start on a gate; end on the true goal.
- Counted length = nodes - 1 - portal jumps; portal jumps cost zero.
- Intersection = entering a visited cell, excluding gate/goal revisits.
- Exact `reqLen` and `reqInt` required.
- Ordinary moves are orthogonal one-cell steps.

### Grid objects

| Object | Behavior |
|---|---|
| Gate | Start; multiple possible; cannot be re-entered. |
| Goal | True endpoint; one per level. |
| False goal / Goose | PLAY hazards; impassable to solver search. |
| Block | Impassable. |
| Must-pass | Must be visited; `mustMask` / `mpVisitedMask`. |
| Must-cross | Opposite-side crossing on two passes; `mustCrossMask` + `crossCounts`. |
| Filter | Fixed entry axis (`1` H, `2` V); wrong-axis neighbors omitted statically. |
| Flipping filter | Single-use. kth distinct flipper board-wide uses declared axis for odd k, flipped for even k; cannot turn on it. |
| Portal | Paired forced zero-length jump; terminals single-use; after normal entry only destination is legal. |
| Surround landmark | Impassable; all reachable 8-neighbors must be visited. |
| Must-turn landmark | Passable; requires `either`/`cw`/`ccw` turn relative to canonical orientation. |
| Adjacent-turn landmark | Impassable; required turn at one 8-adjacent passable cell. |
| Decorative landmark | Impassable; visual only. |

Dynamic assumptions: [`docs/mechanic-state-contracts.md`](docs/mechanic-state-contracts.md).

**Cell occupancy:** one conceptual object/cell; portal destination = paired terminal. `validateRawLevel` is the schema gate. Landmark-derived cells may also appear in derived `blocks`/`mustPass`; validators exclude duplicates via `baseLandmarkRole`. Move code still rejects portal destinations overlapping block/goose/false-goal cells.

### Win condition

At goal: counted length = `reqLen`; intersections = `reqInt`; must-pass satisfied; `mustCrossMask`, `surroundMask`, `mustTurnMask`, `adjTurnMask` all zero.

### Landmark wire format

```js
landmarks: [
  { x: 5, y: 5, objectType: 'park', role: 'surround' },
  { x: 3, y: 3, objectType: 'library', role: 'mustTurn', turn: 'either' },
  { x: 2, y: 7, objectType: 'library', role: 'mustTurnCcw' },
  { x: 7, y: 2, objectType: 'fountain', role: 'adjacentTurn', turn: 'cw' },
  { x: 9, y: 4, objectType: 'statue', role: 'decorative' },
]
```

Passable: `mustPass`, `mustTurn`, `mustTurnCw`, `mustTurnCcw`. Impassable/block: `surround`, `adjacentTurn`, `adjacentTurnCw`, `adjacentTurnCcw`, `decorative`.

`parseRawLevel` creates `surroundKeys`, `adjacentTurnKeys`/`adjacentTurnDirs`, `mustPassTurnDirs`, `landmarkMeta`. `LEVEL_KEY_FIELDS` owns coordinate-bearing fields. `buildWireLevelData()` serializes normalized levels for editor export/submission/review publish. Fingerprint v2 canonicalizes landmark mechanics while distinguishing plain blocks.

**Fingerprint bumps:** fingerprints key Dev-mode ratings/duplicate detection. `level-rating-manager.ts` tries `getLegacyLevelFingerprints` and migrates forward; future bumps must preserve this and use `getLevelFingerprintSource`. Last bump v1→v2: 2026-07-03.

`TurnDir` is relative to canonical unrotated/unmirrored orientation. Editor Mirror uses `flipTurnDir`; Rotate preserves chirality. Display variants do not mutate canonical levels; reflected variants 4–7 use `transformTurnDir` to flip cw/ccw.

## Repository invariants

See [`docs/architecture.md`](docs/architecture.md), [`docs/typing.md`](docs/typing.md).

- `normalizeLevel()` returns shallow-frozen canonical levels; use `deepCloneLevel()` for mutable copies.
- Failure paths use injected `reportError`; advisory failures still report.
- Local corpus writers use `stringifyCorpusJson`; `check:corpus-level-formatting` enforces one-line level objects.

## Solver gotchas

Implementation: [`docs/solver-architecture.md`](docs/solver-architecture.md). Ranked work: [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md).

```js
PACK(x, y) = ((y << 16) | x) >>> 0
UNPACK(k)   = { x: k & 0xFFFF, y: (k >>> 16) & 0xFFFF }
KEY_SPACE   = 1 << 20
AXIS_H = 1; AXIS_V = 2; AXIS_NONE = 0
```

- Portal entry after a normal move forces `portal.dest`.
- Gates cannot be re-entered.
- Turning on a must-cross first pass consumes both axis bits and blocks its required second crossing.
- Flipper axis depends on global `flipperUsedMask` parity; never precompute statically.
- For `navDensity >= DENSE_LEVEL_NAV_DENSITY`, `mustMaskForDFS = 0`; correctness still uses `mpVisitedMask`.
- `validateLevelDetailed()` is heuristic; use the solver for solvability.
- Memo keys need every future dependency. `mustCrossLowerBound` depends on `crossCounts` and first-visit axis plus position/mask; undersized MST scratch once made the bound unsound. See [`docs/solver-correctness-hardening.md`](docs/solver-correctness-hardening.md).
- Outcome regression does not prove cost. One repair-probe retry preserved solves but made published corpus ~14% slower. `hint-cost-drift.mjs` (2026-07-29) found 949 same-config/same-solution cross-commit pairs: 800 byte-identical, 149 drifted.
- A shared prune refactor dropped repair's near-miss/elite trigger; extending bookkeeping to `deadend` recovered ~20% corpus performance. Audit consumers when falling-through cases become rejected. See [`reports/2026-07-16-repair-search-elite-splice-regression.md`](reports/2026-07-16-repair-search-elite-splice-regression.md).
- Dense high-`reqInt` scoring can be orientation-sensitive; treat this as search/representation weakness, not a production rotate/mirror retry policy.
- Timed-out DFS/beam once reported `nodesExpanded = 0`; preserve timeout accounting on new exits.
- Extra passes multiply wall budget; honor `disableExtraBudgetPasses` and independent overrides.
- Time fractions do not create node/work budget; early tiers can exhaust cumulative ceilings before late tiers. See [`docs/solver-budget-determinism.md`](docs/solver-budget-determinism.md).
- Normalize sparse external ablation configs through `normalizeAblationConfig()`; omitted flags once became disabled.
- Open area relative to content can change repair success.
- Numeric `--levels` require `pos:` or `id:`; full persistent IDs need no prefix.
- **Used-axis ≠ always blocked.** After entry via a used axis, straight continuation may remain legal even with both `edgeUsage` bits set. This caused 261 false rejections and falsified forced-edge derivations with 63,496/1.1M and 5,206/225K violations. Hard unusability proofs must rule this out against stored solutions.
- Prep indexes are index+1, zero=absent. `mustPassIndex`, `mustCrossIndex`, `flipperIndexMap` never use `-1`. A stale comment once made `gateForcedFirstStepKey` treat every cell as must-cross; a 90-instance/0-violation check was vacuous because the gate neighbor was independently forced.

## Level stats (generated snapshot)

> Re-check canonical data before decision-bearing use; these are not solver/schema bounds.

<!-- generated: current-level-facts; npm run facts:levels -- --write -->
- 160 published levels, IDs `P00001`–`P00161` with `P00153` withdrawn; ID != array position after 152. Landmark mechanics: `P00148`, `P00149`, `P00150`, `P00160`, `P00161`.
- Published maxima: must-pass 4; must-cross 4; portals 3 pairs/6 keys; flipping filters 22 (`P00159`); grids up to 15x15 and always square. Published maxima are not solver bounds.
- Stress-corpus maxima: must-pass 8; must-cross 8; portals 7 pairs; flipping filters 8. See [`data/stress/README.md`](data/stress/README.md).
<!-- /generated: current-level-facts -->

Schema allows 32 flippers and enforces square grids; these are contracts.
- Wire coordinates: 1-indexed; solver: 0-indexed.
- Published hints: `data/hints/<id>.json`, lazy-loaded by persistent ID, merged with Firestore supplemental hints. Stress corpora do not merge Firestore. Play shows a curated subset; heatmaps use all hints.
- Published IDs are persistent/non-reused. `P00001`–`P00156` backfilled 2026-07-15; `P00157+` minted at import. Firestore staging uses opaque doc IDs until graduation.

## Provenance

Hint and level provenance are independent append-only schemas and do not affect fingerprints.

### Hint provenance

- Canonical `Hint = { path: number[]; provenance: HintProvenanceEntry[] }`; rediscovery appends another event to the same path.
- Same-technique repeats may matter when version/config/forcing/cost differs. 2026-07-29 cleanup removed 47 same-run duplicate appends, 0.05% of then 88,451 entries; requiring identical `elapsedMs` would find only 24/47.
- After dedupe, differing fields included `nodesExpanded` (11,061), `solver.forcing` (2,290), `solver.version` (287). Non-redundant ≠ useful.
- Coverage is measured, not assumed. 2026-08-12: 253,491 hints / 477,925 entries; both stress corpora 100%; published 89.5%, with 6,093/58,179 uncovered. Regenerate via `npm run stress:provenance-coverage`.
- Cold evidence is stricter than `hintGuided === false`. Snapshot: prefix-anchored touched 28.6% corpus1, 7.6% corpus2, 2.8% published; strict-cold shares 63.0%, 88.0%, 86.8%. Another 36,381 entries set `usedExistingHints`; checking only `hintGuided` overstated corpus1 cold share by 13 points. Use `isColdCapabilityEvidence`.
- Valid hint corpus ≠ cold capability. Witness/human/prefix/guided paths may be valid without being cold `Solver.solve()` results. `check:hint-validity` proves PLAY validity only.
- Path-only `.hints`/`.foundHintsSinceLoad` coexist with canonical `.hintRecords`/`foundHintsSinceLoadRecords`; reconcile only via `reconcileHints`/`mergeHints`.
- All corpora use schemaVersion 3 through `scripts/level-data-io.mjs`: `data/hints/<id>.json`, `data/stress/hints/<id>.json`, `data/stress/hints-random/<id>.json`.
- Attempt provenance may include `beamWidth`, `diverseBeam`, winner `gateKey`, `seedSalt`, `repairMustTurnBiased`/`repairTurnBiased`; old hints may lack later fields.
- Provenance can be lost before persistence. A 2026-07-25 admissible-order bug did so. Trace additions through `makeProvenanceEntry`/`hintProvenanceEntryForEvent`; technique suffixes mean consumers may need prefix matching.
- Published supplemental hints also live in Firestore and merge through `data.getHints`; see [`docs/security.md#supplemental-published-level-hints`](docs/security.md#supplemental-published-level-hints).

### Level provenance

- `LevelProvenance = { history, origin, confidence }`; history has `actor`, `action`, `method`, `detail`, `timestamp`; origin/confidence derived.
- `null` means unknown provenance.
- Creation stamps: editor human/authored; stress procedural/generated with generator/batch/seed; submission human/submitted; approval human/reviewed-approved.
- Serialization carries provenance through `normalizeMetadata`, `denormalizeLevel`, `buildWireLevelData`.
- `check:level-provenance` rejects real-corpus levels with missing/empty history.

## Firebase

Contract: [`docs/security.md`](docs/security.md). CSP remains separate at [`docs/content-security-policy.md`](docs/content-security-policy.md).

## Testing cautions

Use [`docs/testing.md`](docs/testing.md) / [`docs/tooling-catalog.md`](docs/tooling-catalog.md).

- `workSpent` is portable allocation currency but fixed charges can miss cheaper operations. `PRUNE_MC_RESERVED_WALL` halved CPU while work rose 11%: 89.4M vs 80.2M for the same 20M nodes; 36.0s vs 81.0s. Use pinned-node interleaved wall time when per-operation cost changes.
- Binding wall deadlines make negative capability indeterminate. Solver-identical Corpus-2 refreshes once gave 506 vs 505 with five flipped levels while Corpus1 reproduced exactly. Use deterministic work-budget protocols and classify `deadlineTruncated` separately.

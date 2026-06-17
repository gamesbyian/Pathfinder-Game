# Landmark / Grid-Object Unification Plan

## Premise

Landmarks (`park`, `market`, `fountain`, `lamppost`, `library`, `statue`) are not
a special category of grid object — they are grid objects, exactly like `gate`,
`block`, `goose`, `filterH`, or `portal`. Nothing in the code should treat them
as a separate hierarchy bolted on top of the "real" object types. This document
records the concrete places where that separation still leaks through, and the
plan to remove it. Scope is deliberately limited to **incidental** duplication —
places where landmarks grew their own parallel code path for no reason tied to
performance or correctness. It explicitly excludes the solver's hot-path
per-constraint bitmasks (`mustTurnMask`, `adjTurnMask`, `surroundMask`), which
already follow the same one-mask-per-constraint-type pattern as the original
`mustMask`/`mustCrossMask` and exist for measured performance reasons, not
historical accident.

## Findings

1. **Editor toolType format is non-uniform.** Every other tool is a single
   atomic string (`'block'`, `'filterH'`, `'flipV'`). Landmarks alone are
   encoded as a colon-delimited compound string (`'landmark:park:surround'`)
   parsed via `.split(':')` in a dedicated branch of
   `modules/editor/editor-occupancy.js::placeOccupant` that sits *before* the
   main `switch (toolType)` used by everything else. The expandable-palette UI
   (`editor-toolbar-controller.js`'s `PALETTE_GROUPS`) already proves atomic
   strings work fine for grouped variants — `filterH`/`filterV` and
   `flipH`/`flipV` use exactly that shape today.

2. **Turn direction is resolved redundantly in four places**, each
   reimplementing the same ternary:
   `modules/domain/level-codec.js` (`parseRawLevel`),
   `modules/solver/normalization.js` (`normalizeRawLevelV2`),
   `modules/editor/editor-occupancy.js` (`placeOccupant`), and the role-name
   matching duplicated again in `modules/domain/level-validation.js`'s
   `impassableRoles` set. Wire format intentionally supports two equivalent
   spellings (`role: 'mustTurnLeft'` vs `role: 'mustTurn', turn: 'left'`) —
   that flexibility is fine and stays — but four independent reimplementations
   of "which spelling won" is not.

3. **That duplication has already produced a live rendering bug.** In
   `modules/render/draw-assets.js`, the adjacentTurn ring badge is computed as
   `role.endsWith('Left') ? 'L' : role.endsWith('Right') ? 'R' : '↺'`
   (line ~215), reading the *raw* role string stored in `landmarkMeta`. If a
   level author writes `{ role: 'adjacentTurn', turn: 'left' }` (the
   documented, equally-valid alternate spelling), `landmarkMeta.role` is
   `'adjacentTurn'` with no suffix, so the badge silently renders `'↺'`
   instead of `'L'`. The already-resolved direction lives in
   `level.adjacentTurnDirs`, but nothing passes it to the renderer — direction
   gets re-derived from the role string instead of read from the one place
   that already knows it authoritatively.

4. **Export has a matching gap.** `level-codec.js::_denormLandmarks` attaches
   `turn` only from `mustPassTurnDirs`; it never consults `adjacentTurnDirs`.
   Today this is silently masked because `landmarkMeta.role` happens to still
   carry the original suffix when placed through the editor — but it means
   the round-trip correctness is an accident of one code path, not a
   guarantee.

## Status: Implemented

All six plan items below are complete. `modules/domain/landmark-rules.js` is the
single source of truth for landmark mechanics; `level-codec.js`,
`solver/normalization.js`, and `editor/editor-occupancy.js` all call into it.
Editor toolTypes are flat atomic strings everywhere (`index.html`,
`editor-toolbar-controller.js`'s `PALETTE_GROUPS`, `editor-occupancy.js`'s
`LANDMARK_TOOL_DEFS`). The adjacentTurn badge bug and the `_denormLandmarks`
export gap are both fixed at the root. `level-validation.js`'s
`impassableRoles` is collapsed to base-form roles only. `editor.js`'s
`createNewLevel()` now initializes the landmark-related fields
(`surroundKeys`/`adjacentTurnKeys`/`adjacentTurnDirs`/`mustPassTurnDirs`/
`landmarkMeta`) so a level built from scratch in the editor supports
landmarks identically to one loaded from `data/levels.json`. Verified via
`npm run test:domain` (159 passed, including new GROUP 11 landmark cases),
the full `npm run ci` chain (lint excluded — broken in this environment for
unrelated reasons), and a manual normalize→denormalize round-trip trace of
all four turn-direction spellings.

## Plan

### 1. Single shared landmark-application helper (`modules/domain/landmark-rules.js`)

New pure module, no DOM/engine deps, exporting:
- `resolveLandmarkTurn(role, turn)` — the one canonical ternary.
- `baseLandmarkRole(role)` — collapses `mustTurnLeft`/`mustTurnRight` →
  `mustTurn`, `adjacentTurnLeft`/`adjacentTurnRight` → `adjacentTurn`.
- `applyLandmark(level, key, objectType, role, turn)` — mutates a normalized
  level's `landmarkMeta`/`blockSet`/`surroundKeys`/`mustPassKeys`/
  `mustPassTurnDirs`/`adjacentTurnKeys`/`adjacentTurnDirs` exactly as the three
  existing copies do today, but in one place. Internal role stored in
  `landmarkMeta` is always the base form going forward.
- `removeLandmark(level, key)` — the inverse, replacing the hand-rolled
  cleanup block in `editor-occupancy.js::removeOccupant`.

`modules/domain/level-codec.js` and `modules/solver/normalization.js` both
call `applyLandmark` from their landmark loop instead of duplicating the
switch. (Solver currently keeps its own `pack()`/encoding separate from
`modules/domain/cell-key.js` by design; this only shares the pure
role/turn-resolution logic, not cell-key encoding, so it doesn't violate that
separation.)

### 2. Flatten editor toolTypes to atomic strings

Replace `landmark:<objectType>:<role>[:<turn>]` with one atomic string per
placeable variant, matching the `filterH`/`flipV` precedent:

| Old | New |
|---|---|
| `landmark:park:surround` | `park` |
| `landmark:market:surround` | `market` |
| `landmark:fountain:adjacentTurn` | `fountain` |
| `landmark:fountain:adjacentTurnLeft` | `fountainLeft` |
| `landmark:fountain:adjacentTurnRight` | `fountainRight` |
| `landmark:lamppost:adjacentTurn` | `lamppost` |
| `landmark:lamppost:adjacentTurnLeft` | `lamppostLeft` |
| `landmark:lamppost:adjacentTurnRight` | `lamppostRight` |
| `landmark:library:mustTurn` | `library` |
| `landmark:library:mustTurnLeft` | `libraryLeft` |
| `landmark:library:mustTurnRight` | `libraryRight` |
| (unexposed today) | `statue` (decorative; table-supported for completeness, no new palette UI) |

`editor-occupancy.js::placeOccupant` looks each atomic toolType up in a small
`LANDMARK_TOOL_DEFS` table (`{ objectType, role, turn? }`) and calls
`applyLandmark` — no string parsing left. `removeOccupant`'s landmark branch
calls `removeLandmark`. `getOccupant` is unchanged — it already treats
landmarks as just one more check in its flat chain, which is the correct
shape and needs no edit.

`index.html` (two default `data-type` attributes) and
`editor-toolbar-controller.js`'s `PALETTE_GROUPS` variants are updated to the
new atomic strings. No UI/UX change — same buttons, same icons, same groups.

### 3. Fix the adjacentTurn badge bug at the root

`render-layers.js`'s impassable-landmark draw loop builds a small
`key → dir` lookup from `adjacentTurnKeys`/`adjacentTurnDirs` (same pattern
already used correctly for `mustTurnLandmark`) and passes `turnDir` into
`drawAsset('landmark', ...)`. `draw-assets.js`'s badge logic switches from
`role.endsWith(...)` to reading `options.turnDir` directly. Role checks
simplify since `role` is now always the base form (no more `|| role ===
'adjacentTurnLeft' || role === 'adjacentTurnRight'`).

### 4. Fix the export gap

`_denormLandmarks` builds the same kind of `adjacentTurnKeys`/`Dirs` lookup
and falls back to it when `mustPassTurnDirs` has no entry for the key, so
saved levels carry the correct `turn` field for adjacentTurn landmarks
regardless of which internal role form produced them.

### 5. Simplify `level-validation.js`'s `impassableRoles`

Once `landmarkMeta.role` is guaranteed to be base-form, the set collapses
from `['surround', 'adjacentTurn', 'adjacentTurnLeft', 'adjacentTurnRight',
'decorative']` to `['surround', 'adjacentTurn', 'decorative']`.

### 6. Test coverage

`scripts/domain-unit-tests.mjs` GROUP 11 currently has zero coverage of
landmark placement/removal through `getOccupant`/`removeOccupant`/
`placeOccupant`. Add cases for: placing each landmark family (surround,
adjacentTurn ± direction, mustTurn ± direction, decorative), removing one,
and confirming `applyLandmark`/`removeLandmark` round-trip cleanly.

## Explicitly out of scope

- The wire-format schema (`level-schema.js`'s `_validRoles`,
  `data/levels.json`) keeps accepting both turn-direction spellings — no
  data migration, no schema tightening.
- Solver internals (masks, typed arrays, `prepLevel`) — already uniform with
  pre-landmark constraint types; touching them risks the documented
  performance baseline for no architectural benefit.
- Theme/color sourcing for landmark `objectType`s (`OBJ_COLORS` in
  `draw-assets.js` vs. the editor palette's CSS-variable accents) — a real
  but separate, cosmetic/product question, not a code-structure one.
- `modules/editor/editor-model.js`'s `TOOL_TYPES`/`DEFAULT_TOOL` — already
  disconnected from real toolType strings (snake_case vs. camelCase,
  pre-existing, untouched by landmarks) — unrelated pre-existing issue.

## Verification

- `npm run test:domain`, `npm run test:level-schema`,
  `npm run test:bundled-levels`, `npm run test:hint-path-oracle`.
- `node --check` on every edited file (ESLint is broken in this environment
  due to a missing `@eslint/js` dependency, unrelated to this change).
- Manual trace of all four turn-direction spellings (`mustTurnLeft`,
  `mustTurn`+`turn:left`, `adjacentTurnLeft`, `adjacentTurn`+`turn:left`)
  through normalize → render → denormalize to confirm the badge and the
  save round-trip are both correct for every spelling, not just the one
  shipped levels happen to use.

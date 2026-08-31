# Hint-display curation

How Play mode chooses a small, varied subset from a level's stored solutions. Hint generation/saving is separate; see [`hint-workbench.md`](hint-workbench.md) and [`hint-variety-search.md`](hint-variety-search.md).

## Implementation

| Concern | Location |
|---|---|
| Pure selector | `modules/domain/hint-selection.ts` → `selectDisplayHints()` |
| State | `EngineState.hinter.displayIndices`, `moreSolutionsSimilar` |
| Compute | `setHintPaths(..., { curate: true })` in `modules/state/actions/hint-actions.ts` |
| Play trigger | `showSavedHint()` / `hintBtn` |
| End-of-cycle message | `startHintAnimation()` |
| Rendering | `create-render-model.ts` / `render-loop.ts` |

`selectDisplayHints()` is pure and DOM-free. It takes the full `pathList` plus level features and returns `{ indices, moreButSimilar }`. Results are memoized by path-list identity and resolved feature context.

## Distinctiveness metric

Path distance is in `[0,1]` and uses the maximum applicable variety axis:

1. **Edge-set Jaccard**, always. Portal jumps are excluded because they are not drawn segments.
2. **Self-intersection-cell Jaccard** when `requiredPathCoverageRatio >= 0.82`. Near-Hamiltonian paths often share most edges while crossing locations differ.
3. **Must-cross order** when there are at least two must-cross cells. First-entry and completion order are compared separately with normalized Kendall tau. Any non-zero order difference is lifted to at least `MUSTCROSS_ORDER_MIN = 0.66` so it clears the ordinary diversity floor.

Shared feature/distance primitives live in [`modules/domain/path-features.ts`](../modules/domain/path-features.ts) and are reused by discovery policy so the two systems do not define variety independently.

## Coverage guarantee

Before diversity selection, paths are partitioned by `(gate, directed portal-usage signature)`. One representative, the longest path, from every coverage cell is mandatory.

This guarantees at least one displayed hint for every viable gate and every distinct per-gate portal-use pattern/direction. Portal traversal order is not a mandatory coverage axis; visibly different orders can still be selected by distance.

Coverage overrides the distance floor and may exceed the display cap if mandatory cells alone exceed it.

## Selection

`coverageSelect()`:

1. Adds all mandatory coverage representatives.
2. Fills remaining slots by farthest-point max-min selection until the cap or no candidate clears the floor.
3. Sets `moreButSimilar=true` only when hidden paths remain and none clears the floor. Hidden paths dropped only because of the cap do not set it.
4. Interleaves selected indices by gate for display.

## Constants

| Constant | Value | Meaning |
|---|---:|---|
| `DEFAULT_FLOOR` | 0.65 | Minimum distance for an optional additional hint. |
| `DEFAULT_CAP` | 15 | Normal display ceiling; mandatory coverage may exceed it. |
| `NEAR_HAMILTONIAN_COVERAGE_THRESHOLD` | 0.82 | Enables crossing-location distance. |
| `MUSTCROSS_ORDER_MIN` | 0.66 | Minimum distance for differing must-cross order. |

`requiredPathCoverageRatio = requiredLength / nonGateWinningPathCellCount`, where `nonGateWinningPathCellCount = w*h - blocks - geese - falseGoals - gates`.

## Display behavior

Curation affects only the Play-mode cycle. The heat map is built from the full path list before curation.

Review/editor hint browsing remains uncurated so makers can inspect every solution, including near-duplicates and newly found hints. A live single-solver result is also uncurated.

When `moreSolutionsSimilar` is true, the final hint message notes that other solutions exist but closely resemble those shown.

## Discovery relationship

Discovery decides what enters the stored hint corpus; curation decides what the player sees. Current discovery engines, policies, caps, auditing, write behavior, and exhaustive enumeration are documented in [`hint-workbench.md`](hint-workbench.md) and [`hint-variety-search.md`](hint-variety-search.md). Do not duplicate those contracts here.

## Tests

[`modules/domain/hint-selection.test.ts`](../modules/domain/hint-selection.test.ts) covers distinct selection, early stop/`moreButSimilar`, caps, gate interleave, empty/single lists, memoization, near-Hamiltonian crossing rescue, gate/portal coverage, and must-cross order. Read-only `scripts/analyze-hint-*.mjs` tools support metric calibration.

# Hint-Display Curation

How the in-game hint system decides **which** of a level's stored solution paths the player cycles
through. This is distinct from hint *generation* (the solver — see
[`solver-architecture.md`](solver-architecture.md)): generation produces every discovered solution;
curation picks the small, mutually-distinct subset worth showing.

## Why

A level's `hints` array (in `data/levels.json`) holds every solution the audit found — sometimes
hundreds. Cycling through all of them overwhelms the player and mostly shows near-duplicates. Curation
shows "a few clearly different approaches": enough to convey the real variety, capped so the cycle
stays short, and it tells the player when the hidden remainder is just more of the same.

## Where it lives

| Concern | Location |
|---|---|
| Pure selection core | [`modules/domain/hint-selection.ts`](../modules/domain/hint-selection.ts) — `selectDisplayHints()` |
| State fields | `EngineState.hinter.displayIndices` + `moreSolutionsSimilar` (`modules/state-slices.ts`) |
| Wiring (compute) | `setHintPaths(..., { curate: true })` in `modules/state/actions/hint-actions.ts` |
| Play-mode trigger | `showSavedHint()` → `hintBtn` (`modules/input/submission-controller.ts`) |
| End-of-cycle message | `startHintAnimation()` (`modules/engine/overlay-controller.ts`) |
| Render (draw the active hint) | `create-render-model.ts` / `render-loop.ts` read `pathList[displayIndices[currentPathIdx]]` |

`selectDisplayHints` is **pure** and DOM-free (domain layer). It takes the full `pathList` plus a few
level features and returns `{ indices, moreButSimilar }`. Results are memoized by `pathList` identity
(the hint button re-requests the same array each click), keyed on the resolved feature context so a
re-query under different features recomputes.

## What "distinct" means — the distance metric

Distinctiveness between two paths is a distance in `[0, 1]` (`0` = identical, `1` = completely
different), taken as the **max of every applicable variety axis**. Each axis is inert when it doesn't
apply, so the common case is pure edge distance.

1. **Edge-set Jaccard (always).** The overlap of *drawn segments* — the orthogonal steps a player
   actually sees. Portal jumps aren't drawn edges, so they're excluded. This is the primary signal.
2. **Crossing placement (near-Hamiltonian levels only).** When `navDensity ≥ NEAR_HAMILTONIAN_DENSITY`
   (0.82, the solver's threshold) every solution fills almost the whole grid, so the drawn *lines* are
   nearly identical and edge distance goes blind. There we also fold in the Jaccard distance of the
   **self-intersection cells** (where the path crosses itself), which still vary. Off near-Hamiltonian
   levels the crossing set is tiny and noisy, so it's ignored.
3. **Must-cross order (levels with ≥2 must-cross squares).** The *order* the squares are crossed is a
   variety axis the drawn line and the crossing-set can both miss — the same squares are crossed either
   way. Two sub-orders are considered separately because they vary independently:
   - **first-entry order** — the order squares are first visited;
   - **full-crossing order** — the order squares complete their crossing (2nd visit / opposite-side
     entry). A level can pin the entry order yet vary which square completes first.
   Any order difference is lifted to at least `MUSTCROSS_ORDER_MIN` (0.66, just above the floor, so a
   different order is always surfaced) and graded up by how scrambled the orders are (normalized
   Kendall-tau), so the most-different orders rank first.

## Coverage guarantee (takes precedence over the cap)

Before diversity, solutions are partitioned into **coverage cells** keyed by
`(gate, portal-usage-signature)`, and **one representative of every cell is always shown** (its
longest path — the richest drawn content). This guarantees the player sees:

- **at least one hint from every viable gate** (a gate that has any stored solution), and
- per gate, **at least one of every distinct way the portals are used or not** — no portal at all, and
  each pair, each combination of pairs, and each entry/exit direction.

The **portal-usage signature** is the sorted set of *directed* portal jumps a path takes (a jump = any
consecutive non-adjacent step; portals can't be reused, so the set pins down exactly which pairs, which
combinations, and which directions). Traversal *order* of multiple portals is deliberately **not** a
coverage axis (it would multiply cells); when it produces a visibly different path the diversity fill
still catches it.

Coverage overrides the distinctiveness floor (two portal directions that draw nearly the same line are
both shown) and overrides the cap **only** when a level has more mandatory cells than the cap.

## The selection algorithm

`coverageSelect()` runs a coverage-seeded farthest-point (max–min) selection:

1. **Coverage reps first.** Add the representative of every cell (longest-first). These are mandatory —
   included even where they resemble each other.
2. **Diversity fill.** Repeatedly add the remaining path that is *most distinct* from everything chosen
   (max–min under the metric above), until the cap is reached or nothing left is `FLOOR`-distinct
   (early-stop).
3. **`moreButSimilar`.** `true` iff something is hidden **and** the most-distinct hidden path is still
   below the floor — i.e. every hidden solution merely resembles the shown set (as opposed to distinct
   ones dropped only because of the cap). Drives the end-of-cycle message.
4. **Display order.** The chosen indices are interleaved by gate so cycling alternates gates.

## Cap and the player message

`DEFAULT_CAP` is 15 — a ceiling, not a target; most levels show fewer. The cap is exceeded only when the
mandatory coverage cells exceed it (in the current corpus this happens on exactly **one** level, which
has 17 gate×portal-usage cells). When `moreSolutionsSimilar` is set and the player reaches the last
hint, the overlay appends *"· other solutions exist, but closely resemble these"* so they know the
cycle isn't hiding meaningfully different approaches.

## Heat-map is unaffected

Curation only filters what the player **cycles through**. The heat-map is built from the **full**
`pathList` in `setHintPaths` (via `buildPathListHeatmap`) before curation, so it always reflects every
solution. `displayIndices` is decoupled from `pathList` precisely to keep this true.

## Play vs. review/editor

Curation runs in **play mode only** (`hintBtn` → `setHintPaths(..., { curate: true })`).
Review mode and the editor's hint button (`reviewHintBtn`) show the **full, uncurated** list — makers
want to see every solution, including near-duplicates and, in the editor, hints merged from the diverse
search (`foundHintsSinceLoad`). The live-solver single result (`solver-controller`) is also uncurated
(one path).

## Constants (calibration)

| Constant | Value | Meaning |
|---|---|---|
| `DEFAULT_FLOOR` | 0.65 | Min distance to count as a "genuinely different line"; early-stop threshold. |
| `DEFAULT_CAP` | 15 | Max hints cycled (ceiling; exceeded only by mandatory coverage overflow). |
| `NEAR_HAMILTONIAN_DENSITY` | 0.82 | `navDensity` at/above which crossing placement is folded into the distance (matches the solver). |
| `MUSTCROSS_ORDER_MIN` | 0.66 | Floor a non-zero must-cross-order difference is lifted to, so it clears `DEFAULT_FLOOR`. |

`navDensity = reqLen / navArea`, where `navArea = w·h − blocks − geese − falseGoals − gates`
(mirrors the solver's `getNavigableDensity`; computed locally in `hint-actions.ts` so the hint slice
doesn't depend on the solver layer).

## Tests

Unit tests in [`modules/domain/hint-selection.test.ts`](../modules/domain/hint-selection.test.ts) cover:
distinct-set selection, early-stop + `moreButSimilar`, cap behavior (single-cell fan), gate interleave,
empty/single lists, memoization, near-Hamiltonian crossing rescue, `(gate, portal-usage)` coverage
overriding the floor, and must-cross order surfacing an order that edges alone would hide. The metric is
calibrated against the level corpus with the read-only analyzers under `scripts/analyze-hint-*.mjs`.

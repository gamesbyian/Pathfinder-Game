# Frontier/ZDD Pathfinder pilot specification

Date: 2026-08-24
Status: implementation handoff; research-only, no production solver changes
Parent census: `reports/2026-08-24-external-solver-code-census.md`

## Goal

Test whether a frontier-based exact search has a useful capability regime on Pathfinder levels, using a representation materially different from both the native prefix-growing DFS/beam solver and the time-expanded CP-SAT oracle.

The first pilot should answer one question cheaply: **does geometric frontier-state merging remain tractable on real Pathfinder boards once exact length and self-crossings are represented correctly?**

Do not integrate a new production attempt tier. Do not attempt every mechanic in v1. Do not treat experimental acceptance as correctness; every emitted path must pass the native `validateCandidatePath` referee.

## External implementation to start from

Primary readable reference: `junkawahara/frontier_basic_tdzdd`, MIT licensed, especially `FrontierSTPath.hpp` and `FrontierManager.hpp`.

The reference `s-t` implementation stores, for each vertex currently crossing the frontier, only:

- selected degree (`deg`);
- connected-component identity (`comp`).

When a vertex leaves the frontier it immediately enforces its final degree and rejects any selected component that closes while another selected component remains. This is the exact general mechanism to preserve.

Other MIT references:

- `kunisura/TdZdd` — framework;
- `kunisura/algorithms2012` — Numberlink ZDD implementation;
- `junkawahara/frontier` — broader frontier-method implementation.

If source is copied/adapted rather than independently reimplemented, preserve required MIT copyright/license attribution. Do not copy AGPL source from `thomasahle/numberlink` into Pathfinder.

## Critical Pathfinder rule derivation

A Pathfinder crossing must **not** be modeled as an ordinary graph vertex of degree 4.

Native state tracks horizontal and vertical axis use independently (`edgeUsage`: H/V bits). A move onto a cell is rejected when that axis was already used there. Turning onto the other axis marks both axes at the cell, which then prevents any later revisit. Therefore a cell can be visited twice only as two orthogonal **straight-through** passes: one horizontal and one vertical. At the crossing, those two passes geometrically share a cell but do not switch strands.

`mustCross` has the same structural consequence: its two visits must be the two straight orthogonal passes. The native lock rule explicitly rejects consuming the second axis by turning on the first pass.

This means ordinary grid-vertex connectivity is wrong for frontier search because it would connect H and V strands merely because they occupy the same cell.

## Expanded lane graph

For every passable Pathfinder cell `c`, create two graph vertices:

- `c:H`
- `c:V`

Create three classes of edges.

### 1. Horizontal movement edges

For horizontally adjacent passable cells `a,b`, add:

`a:H -- b:H`

Selecting this edge contributes **1** to Pathfinder path length.

### 2. Vertical movement edges

For vertically adjacent passable cells `a,b`, add:

`a:V -- b:V`

Selecting this edge contributes **1** to Pathfinder path length.

### 3. Internal turn edge

For each cell `c`, add:

`c:H -- c:V`

Selecting this edge means the path turns at `c`. It contributes **0** to Pathfinder path length.

This construction preserves crossing semantics: an intersection uses both `c:H` and `c:V` as independent straight-through lane vertices with no internal turn edge. A turn joins the two lanes through the internal edge.

## Degree rules

For the selected expanded graph:

- Exactly one chosen gate and the goal are path endpoints. The selected gate-side lane and goal-side lane have degree 1.
- Every other used lane-node has degree 2.
- Every unused lane-node has degree 0.
- At most one of `c:H` and `c:V` may be an endpoint; endpoint handling may be implemented by allowing total cell degree 1 across its two lanes.

These degree rules automatically forbid nonsensical combinations such as selecting two horizontal movement edges plus a turn edge at the same H lane-node (degree 3).

Other gates are impassable for a solve from the chosen gate, matching native neighbor preparation. Run one exact search per eligible gate if necessary.

Blocks, geese, false goals, and impassable landmark cells are omitted from the expanded graph.

## Exact Pathfinder counters and obligations

### Path length

`selected horizontal movement edges + selected vertical movement edges == reqLen`

Internal turn edges do not count.

### Intersection count

A cell is an intersection exactly when:

- `c:H` has its two horizontal movement edges selected;
- `c:V` has its two vertical movement edges selected;
- the internal `H--V` turn edge is not selected.

Because all non-endpoint used lane-nodes have degree 2, this is equivalent to both straight lanes being used. Count exactly `reqInt` such cells. Gate and goal cannot satisfy this under endpoint degree rules.

### Must-pass

A must-pass cell must be used by the route. Require at least one of its lane-nodes to have degree 2 (or endpoint degree if schema ever permits an endpoint overlap; validate against actual level invariants before assuming this cannot happen).

### Must-cross

A must-cross cell must be an intersection: both straight lanes used, internal turn edge absent.

This is stronger and cleaner than carrying visit counts through the frontier.

## Connectivity requirement

The selected **expanded lane graph** must contain exactly one connected `gate -> goal` path component. Connectivity must never be computed on unsplit Pathfinder cells, or crossings will falsely connect strands.

The standard frontier `deg + comp` machinery is applicable to the expanded graph. Reject a selected component when its last frontier vertex leaves unless it is the completed gate-goal component and no other selected component can remain.

With all non-endpoint used expanded vertices degree 2 and exactly two degree-1 endpoints, one connected selected component is a simple `s-t` path in the expanded graph. Mapping it back to Pathfinder produces the ordered traversal; crossing the same physical cell on H and V is no longer a repeated expanded vertex, so ordinary path reconstruction works.

## Frontier state for v1

At minimum state identity needs:

Per live frontier expanded vertex:

- degree so far: 0..2;
- canonical connected-component label.

Global scalars:

- counted movement edges so far (`0..reqLen`);
- finalized intersection count so far (`0..reqInt`);
- optional compact obligation counts/masks only if an obligation cannot be enforced locally when its cell leaves the frontier.

Prefer enforcing must-pass/must-cross/intersection status when both lane-nodes and all incident edges for a physical cell are finalized. Do not retain per-cell history after that cell leaves the frontier.

Canonicalize component labels before state hashing/merging. The external reference's component-number replacement is correct but canonical renumbering is preferable if the implementation otherwise allows equivalent label permutations to create distinct states.

## Edge ordering

Ordering is likely decisive. The first implementation should use a geometric sweep designed to minimize the maximum number of live physical cells/lane-nodes. Test both row-major and column-major orientation and choose the smaller frontier for each level using only level geometry.

Internal turn edges must be positioned in the ordering so a physical cell can be finalized promptly after its incident movement edges are decided. Do not blindly append all internal edges after all grid edges.

Record maximum frontier size independently of DD state count so failures can be attributed to geometry versus state richness.

## Safe pruning available immediately

These are exact, not heuristics:

- movement-edge count > `reqLen` => reject;
- movement-edge count + maximum still-selectable movement edges < `reqLen` => reject;
- finalized intersections > `reqInt` => reject;
- finalized intersections + maximum remaining possible crossings < `reqInt` => reject;
- lane-node degree > 2 => reject;
- finalized non-endpoint used lane-node degree != 2 => reject;
- finalized endpoint cell has total selected endpoint degree != 1 => reject;
- finalized must-pass cell unused => reject;
- finalized must-cross cell not a crossing => reject;
- premature selected-component closure while another selected component exists/can be required => reject.

Do not import native heuristic scoring. The point is to measure this representation cleanly.

## Mechanics deliberately excluded from pilot v1

Exclude levels containing any mechanic whose validity depends on traversal order or direction until the base representation is measured:

- portals;
- flipping filters;
- static filters (unless later added as a trivial validated lane restriction);
- chirality-sensitive must-turn / adjacent-turn landmarks;
- any other landmark whose semantics have not been explicitly translated and referee-tested.

It is acceptable, and preferable, for the pilot loader to emit a machine-readable `unsupported-mechanics` result rather than silently relax a rule.

A later version may discover that some currently excluded mechanics are local in this representation. Add them one family at a time only after v1 establishes a useful state-count regime.

## Reconstruction and referee

On a 1-terminal/satisfying DD state, reconstruct the selected expanded edges, then traverse the unique expanded `s-t` path from the chosen gate lane to the goal lane.

Map each movement edge to the destination physical grid cell. Internal turn edges change lane but append no Pathfinder step. The resulting physical cell sequence must then be passed to the canonical native `validateCandidatePath`.

Classification:

- `referee-valid`: usable experimental solve;
- `referee-rejected`: encoding/reconstruction bug, never a solve;
- `unsat/exhausted`: exact negative only if the implementation genuinely enumerated/exhausted the complete supported model;
- `timeout/state-cap`: inconclusive;
- `unsupported-mechanics`: abstain.

Any referee rejection is a correctness alarm and blocks capability conclusions until root-caused.

## Pilot population

Select 20–50 levels from the current stress corpus using reproducible selectors, not hand-picked IDs as production policy.

Stratify by:

- smaller vs larger minimum grid dimension (proxy for frontier width);
- lower vs near-Hamiltonian `navDensity`;
- `reqInt` 0 / low / high where supported;
- native status: currently unsolved plus a smaller set of expensive known solves as positive controls.

The population should contain only v1-supported mechanics.

Do not tune the implementation on all sampled levels and then claim the same population as held-out evidence. The first pilot is feasibility research, but preserve enough untouched levels for a follow-up if results look promising.

## Required metrics

Per `(level, gate, sweep orientation)` record at least:

- level id and mechanics summary;
- grid width/height and chosen sweep orientation;
- maximum frontier physical-cell count and expanded-vertex count;
- DD/frontier states created;
- peak live states at any decision level;
- transitions evaluated;
- terminal classification;
- wall time (diagnostic only);
- selected movement edges / turn edges for a witness;
- referee result;
- native baseline status/nodes/work if available;
- CP-SAT status/time for the same level if an existing comparable result is available without launching a large new campaign.

Primary feasibility plots/tables should use deterministic state/work counts, not wall time alone.

## Early-abort gates

This experiment should be cheap to kill.

Abort expansion of a single level at a configurable state cap and return `state-cap`, preserving metrics.

Do not proceed toward production integration unless at least one meaningful structural cohort shows repeatable tractability and either:

1. solves levels the native solver currently misses; or
2. resolves expensive levels with sufficiently low deterministic state counts to plausibly be useful; or
3. exposes exact state-equivalence/pruning rules that are demonstrably transplantable into native search.

If state growth is simply exponential in minimum grid dimension with no useful real-level regime, document that boundary and stop. A clean negative is success for the pilot.

## Implementation boundary

Prefer an offline research tool under `scripts/` or an isolated experimental native helper. Do not add it to `solveLevel()`, `ATTEMPT_POLICY`, stage budgeting, browser bundles, or production dependencies during the pilot.

If TdZdd/C++ is used directly, keep build/install mechanics isolated from normal `npm ci` / browser build unless and until the experiment passes its gate. A standalone research executable invoked by a Node wrapper is acceptable.

If the small reference algorithm is independently reimplemented in TypeScript/JavaScript instead, preserve the algorithm/source attribution in the report and compare state counts against a tiny known graph fixture before trusting real-level results.

## Correctness fixtures before stress-corpus work

Create tiny synthetic levels covering, separately:

1. straight gate-goal path, `reqInt=0`;
2. one ordinary turn;
3. exact-length rejection (same geometry, wrong `reqLen`);
4. one genuine self-crossing requiring two straight passes through one cell;
5. must-pass satisfied / omitted pair;
6. must-cross satisfied / replaced-by-turn-invalid pair;
7. disconnected cycle plus gate-goal component, which must be rejected despite local degrees;
8. multiple gates, proving nonchosen gates are unavailable.

For every accepted fixture, reconstruct and run the native referee. Include at least one fixture that ordinary unsplit degree-4 connectivity would falsely accept, to permanently guard the lane-splitting requirement.

## Suggested implementation sequence

1. Build expanded lane graph + fixture printer only.
2. Implement frontier manager / edge ordering and report max frontier sizes, with no search.
3. Implement degree + component state and enumerate simple `s-t` paths on tiny fixtures.
4. Add movement-edge exact count.
5. Add crossing count and lane-split reconstruction.
6. Add must-pass/must-cross local finalization.
7. Run correctness fixtures through native referee.
8. Add state caps and structured JSON output.
9. Run the small stratified pilot.
10. Write a dated report before considering any solver integration.

This sequence deliberately creates useful stop points. If expanded-frontier geometry is already hopeless at step 2, no search engine needs to be written.

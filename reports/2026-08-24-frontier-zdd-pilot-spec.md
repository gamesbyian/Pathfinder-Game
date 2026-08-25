# Frontier/ZDD Pathfinder pilot specification

> **Status:** cancelled
> **Last evidence:** 2026-08-24 — final literature synthesis and current queue reconciliation demoted general frontier/DD implementation behind higher-value interface and evidence gates
> **Decision:** do not implement this pilot now. Preserve the expanded-lane crossing model and frontier-state design as a ready deferred specification, but reopen only if beam/reference/residual work independently demonstrates a compact interface question for which frontier-state merging has plausible value. Do not add a production solver tier or dependency from this document.
> **Remaining gate:** reopen only when a ranked Pathfinder question identifies a supported mechanic subset, a compact expected frontier/interface regime, and a decision that cannot be answered more cheaply with existing native/CP-SAT machinery
> **Evidence role:** discovery
> **Selection:** observational

## Why the original handoff was cancelled

The external-code census identified frontier/ZDD search as the strongest genuinely different mature representation available under usable licenses. That conclusion still stands.

What changed is priority.

The full August 24 research reconciliation established that Pathfinder already has several cheaper unresolved gates:

- P0 cross-stage validity;
- current fixed-work scheduler repricing;
- exact beam-extinction labels that have not yet been fully mined;
- bounded residual-interface/descriptor questions;
- exact repair liveness versus reconstructability.

The literature also sharpened a key warning: an exact interface can be mathematically elegant and still be useless if its width/state count is too large.

Therefore a frontier framework should not be built simply to discover whether Pathfinder has an interface problem. A concrete Pathfinder question should nominate the interface first.

This file remains because it contains one nontrivial Pathfinder-specific graph derivation that would be expensive to rediscover correctly.

## Deferred goal

If reopened, the pilot should test one question:

> Does geometric frontier-state merging remain tractable on a real, explicitly supported Pathfinder subset once exact length and self-crossings are represented correctly?

It is a research oracle/representation experiment, not a production solver proposal.

## External implementation references

Preferred permissive references:

- `junkawahara/frontier_basic_tdzdd` — MIT, small frontier `s-t` path example;
- `kunisura/TdZdd` — MIT framework;
- `kunisura/algorithms2012` — MIT Numberlink ZDD source;
- `junkawahara/frontier` — MIT broader frontier implementation.

If source is copied/adapted, preserve required MIT attribution/license.

Do not copy AGPL source from `thomasahle/numberlink` unless Pathfinder intentionally accepts those obligations.

## Critical Pathfinder crossing derivation

A Pathfinder self-intersection must **not** be modeled as an ordinary graph vertex of degree 4.

Native state tracks horizontal and vertical axis use separately. A cell can be visited twice only as two orthogonal straight-through passes. The two strands geometrically share the cell but do not switch between each other.

MustCross has the same structural consequence.

### Expanded lane graph

For every passable physical cell `c`, create:

- `c:H`
- `c:V`

Edges:

1. horizontally adjacent cells connect H lanes; selecting one contributes 1 Pathfinder step;
2. vertically adjacent cells connect V lanes; selecting one contributes 1 Pathfinder step;
3. an internal `c:H -- c:V` edge represents a turn at `c` and contributes 0 Pathfinder steps.

A crossing uses both straight lane paths **without** selecting the internal turn edge.

This prevents the false connectivity that an ordinary degree-4 cell would introduce.

## Deferred exact constraints

For a chosen gate and goal:

- exactly two endpoint lane nodes have selected degree 1;
- every other used lane node has degree 2;
- unused lane nodes have degree 0;
- total selected horizontal/vertical movement edges equals `reqLen`;
- a physical cell counts as an intersection exactly when both straight lanes are used and the internal turn edge is absent;
- exact intersection count equals `reqInt`;
- MustPass requires the physical cell to be used;
- MustCross requires the crossing form;
- selected expanded-lane graph forms one connected gate→goal path component.

Other gates remain impassable for a solve from the chosen gate.

Blocks/geese/false goals/impassable landmarks are omitted from the graph for the relevant solver scope.

## Frontier state if reopened

The minimal exact state should retain, for live frontier **lane vertices**:

- selected degree so far;
- canonical connected-component label.

Global counters:

- selected movement-edge count up to `reqLen`;
- finalized intersection count up to `reqInt`;
- obligation bits only when they cannot be enforced at physical-cell finalization.

Enforce MustPass/MustCross/intersection status when the physical cell leaves the frontier whenever possible, so old interior history disappears.

Canonicalize component labels before state hashing/merging.

## Ordering

Ordering is likely decisive because frontier width drives state explosion.

If reopened:

- compare row-major and column-major geometric sweeps using only level geometry;
- place internal turn edges so a physical cell can be finalized promptly;
- record maximum live physical cells/lane vertices separately from DD state count.

Do not choose the favorable orientation from solver outcome. Geometry-only minimum-frontier orientation is legitimate if fixed before solving.

## Exact pruning available to a pilot

The deferred model can safely reject on:

- movement edges > `reqLen`;
- movement edges + maximum selectable remainder < `reqLen`;
- finalized intersections > `reqInt`;
- finalized intersections + remaining maximum crossings < `reqInt`;
- lane degree >2;
- finalized used non-endpoint lane degree !=2;
- invalid finalized endpoint degree;
- finalized MustPass unused;
- finalized MustCross not crossed;
- premature selected-component closure.

Do not import native heuristic scoring into the exact pilot.

## Mechanics excluded from a first reopened pilot

The first experiment should remain deliberately narrow and abstain on mechanics whose validity depends on traversal order/direction until explicitly translated and validated, including initially:

- portals;
- flipping filters;
- static filters unless represented as a validated trivial lane restriction;
- chirality-sensitive must-turn / adjacent-turn mechanics;
- any other order-sensitive landmark not proved compatible with the edge-set representation.

Use machine-readable `unsupported-mechanics`; never silently relax.

## Reconstruction/referee contract

A satisfying expanded graph must be reconstructed into the unique expanded gate→goal path, mapping movement edges back to physical Pathfinder cells and treating internal turn edges as zero-length lane changes.

Every emitted candidate must pass the canonical native `validateCandidatePath` referee.

Classify outcomes distinctly:

- `referee-valid`;
- `referee-rejected` correctness alarm;
- exact exhausted/UNSAT only if the complete supported model was enumerated;
- timeout/state-cap inconclusive;
- unsupported abstention.

## Reopen population and metrics

If the pilot is ever reactivated, keep it small and reproducible, roughly 20–50 supported levels, stratified by:

- minimum grid dimension / expected frontier width;
- density/navDensity;
- intersection burden;
- native status, with both unresolved levels and expensive known solves as controls.

Primary deterministic metrics:

- maximum frontier width;
- states created;
- peak live states;
- transitions evaluated;
- terminal classification;
- referee result.

Wall time is secondary. Compare native/CP-SAT evidence only where a fair existing result is available.

Use a hard state cap so individual instances fail cheaply.

## Reopen success gate

Do not discuss production integration unless a meaningful structural cohort shows at least one of:

1. exact solves of native misses;
2. exact resolution of expensive levels at plausibly competitive deterministic state counts;
3. an exact frontier equivalence/pruning rule that can be transplanted into native reasoning.

If state growth is simply dominated by frontier width with no useful Pathfinder regime, close the family cleanly.

## Current disposition

The lane-graph derivation and pilot design are worth retaining. The implementation handoff is not.

The current queue intentionally says not to build production or broad research DD/ZDD machinery before a bounded interface question earns it. This file is therefore a deferred specification, not active work.

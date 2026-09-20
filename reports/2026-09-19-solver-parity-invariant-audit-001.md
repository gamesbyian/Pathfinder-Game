# Solver parity invariant audit

> **Status:** in progress
> **Started:** 2026-09-19
> **Branch:** `chatgpt/solver-parity-invariant-audit-2026-09-19`
> **Scope:** solver correctness, feasibility, search ordering, state identity, scheduling, repair, portal semantics, and research surfaces where checkerboard/grid parity or equivalent bipartite-walk invariants can affect decisions.
> **Production behavior:** unchanged by this initial inventory commit.

## Question

Audit the solver from first principles rather than by vocabulary:

> Which facts implied by the grid's bipartite structure, exact counted path length, portal phase changes, and remaining path resources are already represented correctly; which are represented only at one layer; which are missing from decision-making; and which apparent parity rules would be unsafe or redundant?

The audit is deliberately two-sided. It looks for both missed deductions and parity assumptions that become invalid in the presence of zero-length portal jumps or dynamic mechanics.

## Core model

For an ordinary orthogonal move, checkerboard color flips and counted length increases by one. For a portal jump, counted length increases by zero while checkerboard color changes by

`keyParity(source) XOR keyParity(destination)`.

Call an opposite-color portal pair a **twist portal**. Every twist jump toggles the ordinary endpoint-parity phase; a same-color portal jump does not. At any stable non-portal state, exact completion to the goal therefore obeys:

`parity(pos) XOR parity(goal) XOR (remainingCountedSteps mod 2) XOR (futureTwistJumps mod 2) = 0`.

Portal-free and same-color-portal-only levels collapse to the ordinary bipartite invariant because the final term is necessarily zero.

This identity is the reference point for the rest of the audit. It is stronger and less ambiguous than searching source for the word “parity”.

## Existing coverage found so far

### Correctness / hard pruning

`hard-prune-pipeline.ts` already has a production-default `PRUNE_PARITY` check. It applies:
- on portal-free levels;
- on portal levels with no twist pairs, where zero-length portal jumps preserve parity;
- on the first counted step always, and deeper only under the existing corridor-rich gate (`blockSet.size >= 10`).

The retained default-off `PRUNE_PORTAL_PARITY_ENVELOPE` handles twist-portal levels conservatively: at stable non-portal positions, a naive parity mismatch becomes fatal only after every twist pair has been consumed. The 2026-08-08 experiment found this existence-only envelope sound but operationally negligible and closed that exact experiment shape.

The default hard-prune stack was replayed over 207,900 referee-valid stored paths / 20,127,497 steps on 2026-09-11 with zero violations. Any stronger hard parity deduction must preserve that soundness discipline.

### Gate selection

`getActiveGates` in `orchestration-contracts.ts` already extends parity gate filtering to portal levels with zero twist pairs when a prepared level is available. This is newer than the terse ablation description (“portal-free levels”) and means the obvious gate-scheduling propagation gap is already closed on the production solve path.

### Portal guidance

`prep.ts` precomputes distance maps to twist portal pairs. `scoring.ts` uses them when gate/goal/required-length parity requires an odd number of twist crossings.

This is guidance only, not a correctness authority.

### False-goal endpoint reasoning

`false-goal-trigger-search.ts` rules endpoint cells out by parity when no twist portal exists. If any twist portal exists it conservatively treats both endpoint parities as possible.

### State identity

Beam coarse-state identity now carries a bitset of consumed portal pairs. Repair's fine-grained state signature includes path length, portal jump count, visited/edge state, and `lastWasPortalJump`. The audit has not found a parity-relevant state distinction being silently erased at these two caches.

## Concrete propagation seams under investigation

### 1. Admissible-order ranking does not mirror parity feasibility

`admissible-order-search.ts::admissibleRemainingBound` says it mirrors the hard-prune bounds used by `evaluatePrunedMove`, but currently includes distance/objective lower bounds and omits parity.

Consequently a child that the shared hard-prune pipeline can prove parity-dead immediately may still receive finite admissible slack and rank ahead of a live child. The hard prune later rejects it, so this is not a correctness bug, but it is a real mismatch between the documented ordering contract and the solver's available exact knowledge.

Questions:
- quantify how often parity-dead siblings are ranked ahead of live siblings;
- decide whether the shared parity predicate should become a reusable helper consumed by both pruning and admissible ordering;
- preserve the existing deep-check gate unless evidence justifies changing policy separately.

### 2. Portal-parity guidance models “first twist used”, not current phase

The scoring term computes whether the start-to-goal problem requires odd twist parity, then disables itself permanently once *any* twist terminal has been visited.

That is a coarse proxy for the actual invariant:
- entering a twist portal terminal marks it visited before the forced zero-length jump occurs, so guidance can switch off one transition early;
- after one completed twist crossing the parity deficit is repaired;
- after a second completed twist crossing the phase toggles back, but the current scorer never asks for another compensating odd crossing;
- the beam implementation already has pair-consumption machinery, showing the repo can represent more precise portal history when it matters.

This is guidance-only, so the safe first move is measurement, not promotion of a more aggressive rule.

### 3. Exact-length repair has no explicit parity residual

Repair badness prominently models exact length, exact intersections, and structural deficits, and repair itself shares the hard-prune pipeline. But its optimization landscape does not appear to distinguish a residual that is parity-compatible from one that requires a twist-phase change.

This may matter precisely in the documented plateau where all structural obligations are satisfied and repair is trying to hit exact integer length/intersection targets. The right question is not “add a parity penalty” blindly; it is whether parity compatibility predicts which near-finish states can be usefully repaired under the remaining operators.

### 4. Lower bounds encode distance magnitude, not parity/capacity structure

The ordinary endpoint parity test already captures the total path-length congruence on a bipartite graph. Simply rounding every BFS/MST lower bound to the desired parity would be suspect or redundant because intermediate waypoint parities telescope to the endpoint parity.

A genuinely stronger parity bound would need additional resource information, not just distance parity. Candidate families include checkerboard-color visit capacity and reachability-constrained future twist phase. These require derivation before code.

## Important non-findings / traps

- Turns do not change checkerboard parity behavior: every ordinary orthogonal move flips color whether it turns or continues straight.
- Intersection count has no obvious standalone checkerboard parity congruence; do not invent one from the fact that revisits occur.
- Flipping-filter “even/odd” orientation state is a different parity concept. It can interact with reachability, but it is not checkerboard parity by itself.
- A portal-aware distance of `d` does not imply endpoint checkerboard difference `d mod 2`, because twist portal edges have zero counted cost and may flip color.
- The August existence-only portal envelope is a closed negative. Re-running “all twist portals consumed” without a materially tighter premise would ignore existing evidence.

## Next audit passes

1. Trace parity-relevant behavior through every search family (DFS, beam, admissible-order, repair, false-goal search, variety search) and every cache/merge boundary.
2. Derive checkerboard color-capacity bounds from actual visit/edge rules and determine whether any sound nontrivial bound exists.
3. Audit portal phase at the action level: entry, forced jump, exit, consumption, revisit prohibition, and multi-twist sequences.
4. Inspect policy/features/budgeting for places where a static parity signature could change attempt selection without leaking level identity.
5. Build small synthetic witnesses for confirmed gaps before touching production behavior.
6. Prefer observer/probe evidence for guidance/order changes; require stored-solution/referee/differential evidence for any hard prune.

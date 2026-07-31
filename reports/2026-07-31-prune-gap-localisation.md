# The solver enters ~3 of every 4 provably-dead branches, and none of its prunes can catch them early (2026-07-31)

Differential diagnosis, following [`2026-07-31-cpsat-encoding-bug-and-external-hints.md`](2026-07-31-cpsat-encoding-bug-and-external-hints.md).
Answers the question that report left open: *we now know these levels are not intrinsically hard —
so what specifically is our search missing?*

**Headline**: at every decision point along a known solution, of the sibling branches that are
**provably dead** (no valid completion exists), our prune gauntlet rejects only about a quarter.
**74% of dead branches are entered** — 35/45 on R00044, 32/46 on R00001. Zero unsound prunes in 32
live branches, so this is purely missing inference, not a correctness problem. Critically, the
misses are spread evenly across the whole path, including branches with 90 steps remaining, and
**forcing connectivity on at every node does not catch them**.

---

## Method

`scripts/stress/prune-gap-probe.mjs`. Walk a stored referee-valid solution; at each decision point
take every alternative `getNeighbors` offers and cross two facts:

1. **Does our gauntlet prune it?** — `evaluatePrunedMove` from `modules/solver/prune-gauntlet.ts`,
   the real function `dfsFromGate` calls, not a reimplementation. Run with `cfg = null` (every prune
   enabled) and `runConnectivity: true`, so a "passed" verdict is a genuine miss and not an artifact
   of the search's own every-8-steps connectivity schedule.
2. **Is it actually dead?** — `cpsat-full-probe.py --prefix=<path+alt>` as a feasibility oracle:
   does any valid completion exist from that partial path?

An oracle timeout is `unknown` and excluded, never counted as "alive" — treating an indeterminate
result as a negative is the mistake `docs/solver-budget-determinism.md` warns about.

## Result

| | R00044 | R00001 |
|---|---|---|
| reqLen / reqInt / mustCross | 91 / 6 / 6 | 84 / 6 / 6 |
| dead branches | 45 | 46 |
| …pruned by us | 10 | 14 |
| …**entered** | **35 (78%)** | **32 (70%)** |
| alive branches | 11 | 21 |
| …wrongly pruned | **0** | **0** |
| oracle unknown | 0 | 3 |

**Zero unsound prunes across 32 live branches.** The probe doubles as a soundness audit and the
gauntlet passes it clean — worth having on its own, given how much of this codebase's history is
unsound-prune bugs.

## Three things this rules out

**1. It is not an ordering problem** — already known (68.1% first-choice accuracy on unsolved vs
65.1% on solved), and this is the complementary half: ordering decides which child to try *first*,
but three quarters of the doomed children are ones we should never have entered at all.

**2. It is not connectivity.** `isConnected` was forced on at *every* evaluated node here, not on
its production schedule (`rSteps <= 20 || (realLen & 7) === 0`), and 74% of dead branches still
passed. Making the connectivity check more aggressive is therefore not the fix — a cheap negative
result that saves someone an experiment.

**3. It is not primarily must-cross-positional.** Only **8 of the 35** R00044 misses are on or
orthogonally adjacent to a must-cross cell. A prune reasoning about where must-cross intersections
get spent — the plateau report's surviving lead — would address at most about a quarter of the gap.
This is the second independent result this week pointing the same way (21 must-cross-saturated
levels solved in 4–38s); the mechanic is real, but it is not the main lever.

## What the misses have in common: our prunes are budget-comparative

Position of the R00044 misses along the path, in deciles: `{0:4, 1:2, 2:5, 3:6, 4:4, 5:5, 6:6, 8:3}`
— essentially uniform. Remaining-steps at each miss runs from **90** down to 15. The early ones are
the expensive ones: a dead branch entered with 90 steps left can absorb an enormous subtree.

That distribution has a structural explanation in the gauntlet's own shape. Almost every prune we
have is a comparison against remaining budget:

```
PRUNE_DISTANCE_BOUND        gd  > rSteps
PRUNE_MUST_PASS_LB          lb  > rSteps
PRUNE_MUST_CROSS_LB         lb  > rSteps
PRUNE_SURROUND_LB           lb  > rSteps
PRUNE_ADJ_TURN_LB           lb  > rSteps
PRUNE_INTERSECTION_DEFICIT  (reqInt - ints) > rSteps
```

When `rSteps` is 90, every one of these is vacuous: no admissible bound on an 11x11 grid approaches
90. They are structurally incapable of firing early, which is exactly where the costly misses are.
The three prunes that are *not* budget-comparative — `PRUNE_MC_CEILING`, `PRUNE_MUST_TURN_DEADLOCK`,
and connectivity — are the only ones that can fire early, and between them they account for the 24
branches we do catch.

This is a hypothesis about *why*, resting on reading the gauntlet, not a measurement of which prune
fired on which branch. The uniform miss distribution and the zero-effect connectivity result are the
measured parts. Attributing each of the 24 catches to a specific prune is the obvious next
refinement and is not done here.

## What CP-SAT does differently

It does not ask "is a lower bound bigger than the remaining budget." It propagates the constraints
against each other over the *whole remaining assignment* — the exact-intersection cardinality
constraint, the per-visit axis rule and reachability jointly — and derives that a partial assignment
is inconsistent regardless of how much budget is left. That is why it answers these prefix queries
in seconds and why its advantage does not decay when `rSteps` is large.

## The actionable shape

The gap is not a missing admissible bound; it is the absence of any inference that is not
budget-relative. Three directions, in increasing order of cost, none of them yet validated:

1. **Attribute the 24 catches per-prune, and characterise the 67 misses.** Cheap, and it tells us
   whether the misses share a structure narrower than "constraint propagation" — the difference
   between a targeted prune and a general mechanism.
2. **A periodic bounded propagation pass.** Not a per-node bound but an occasional consistency sweep
   over the remaining free cells, in the spirit of connectivity but reasoning about intersection
   budget and axis usage jointly rather than reachability alone.
3. **CP-SAT as a subroutine.** Pragmatic and unglamorous: call the oracle on a partial path at a few
   depths. Wildly too slow for the production hot loop, but it would upper-bound the prize before
   anyone builds a propagator — if a perfect dead-branch oracle does not convert these levels, the
   whole direction is wrong.

**Correctness bar.** Anything here is a new prune on solver state, which is the single most
dangerous change class in this codebase (the MST scratch-buffer bug; the nogood signature that was
unsound on the first level tested). An under-keyed or over-eager prune silently discards reachable
solutions. This probe is itself a usable gate — its `alive + pruned` cell is exactly a soundness
check, and any candidate prune should be run through it on a corpus slice before it goes near
`solver:bench`.

## Caveats

- **Two levels**, both 11x11 and both must-cross-saturated. The 74% is not a corpus statistic.
- **Siblings of a known solution only.** This measures how readily the search steps into a doomed
  subtree adjacent to the right path; it does not measure the far larger waste deep inside wrong
  subtrees. If anything that makes 74% a floor on the problem, not a ceiling.
- Inherits the CP-SAT model's scope: no portals / filters / flipping filters (328/1700 corpus-2).
- The branching along a correct solution is remarkably low — on R00044, 47 of 91 decision points
  have **no** alternative at all, and the whole path offers just 56. Whatever the search is doing
  with 20M nodes, it is not exploring near the solution.

## Reproducing

```
node scripts/run-bundled.mjs scripts/stress/prune-gap-probe.mjs -- \
  --level=R00044 --every=1 --oracle-limit=30 --out=reports/stress/prune-gap-R00044.json
```

Per-branch data (including every missed branch's step and coordinates) in
`reports/stress/prune-gap-R00044.json` and `prune-gap-R00001.json`.

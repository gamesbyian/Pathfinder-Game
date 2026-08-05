# Solver-aware game architecture

> **Status:** exploratory design note, not an implementation plan.
>
> This document asks a specific lateral question: now that substantial effort has gone into making the solver better at Pathfinder, are there changes to the **game's rule representation, domain model, compilation pipeline, or mechanic contracts** that could make the solver faster, safer to optimize, or capable of finding more solutions?
>
> The answer is yes, but the easy version of this idea has already been implemented. Pathfinder already has a pure domain/runtime layer, normalized levels, a substantial `prepLevel()` phase, reversible solver mutation, typed-array hot paths, topology analysis, final candidate validation, and differential/invariant testing. The remaining opportunities are not ordinary cleanup. They concern how completely the game exposes the mathematical state of the puzzle.

## Current baseline

The current architecture already gives the solver a strong foundation:

- `modules/Solver.ts` is a thin facade over the search implementation in `modules/solver/`.
- `normalizeRawLevel()` converts wire-format levels into the solver's packed internal representation.
- `prepLevel()` precomputes distances, static adjacency, masks, mechanic indexes, approach maps, pairwise objective distances, portal-parity guidance, and bit-parallel connectivity data.
- DFS uses mutable state with `applyMove()` / `undoMove()` rather than cloning at every node.
- Beam search uses parent-pointer nodes and replays into a reusable scratch state.
- Returned candidates are checked by the domain-level `validateCandidatePath()` referee.
- Runtime path derivation is centralized and cross-checked by invariant tests.
- Solver policy is selected by level features rather than level identity.

Accordingly, this note does **not** recommend simply sharing UI code with the solver, replacing the solver with the runtime engine, or moving all solver precomputation into the game. Those would either duplicate current work or risk slowing hot search paths.

## Central idea: make future-relevant state explicit

Pathfinder is history-sensitive. Two paths can end on the same cell with the same length and intersection count but have different legal futures because they used different axes at cells, satisfied different constraints, entered from different directions, used different portals or flippers, or left different local topology behind.

The most valuable game-side contribution would be a formal answer to:

> What is the complete minimum state that determines every legal continuation from this point?

This is not necessarily the same as the solver's current state object, and it is certainly smaller than the entire path. It is a semantic contract: two path histories are equivalent exactly when every future move sequence is legal or illegal in the same way and produces the same win result.

A canonical definition of that equivalence could support stronger and safer:

- beam deduplication,
- transposition tables,
- memoization,
- dominance relations,
- meet-in-the-middle experiments,
- frontier-size measurement,
- cross-attempt state reuse,
- external oracle encodings.

Recent work on `mitm-frontier-probe.mjs` demonstrates how easy it is to under-key Pathfinder state. Its old key omitted general per-cell edge-axis usage, flipper state, turn and surround masks, portal state, and the incoming axis at the current position. That merged histories with different future legality. Any production state identity must therefore be derived from an explicit semantic specification, not assembled opportunistically around whichever fields a particular experiment happens to notice.

## Opportunity 1: a canonical future-state schema

Introduce a domain-level specification of future-relevant state, separate from any one optimized encoding.

Conceptually:

```ts
interface FutureState {
  position: CellId;
  stepsUsed: number;
  intersections: number;

  // Per-cell path consequences
  visitState: VisitState;
  axisUsage: AxisUsageState;

  // Constraint progress
  mustPass: Mask;
  mustCross: CrossState;
  mustTurn: Mask;
  adjacentTurn: Mask;
  surround: SurroundState;

  // Dynamic mechanics
  portals: PortalState;
  flippers: FlipperState;

  // Local continuation context
  incomingAxis: Axis | None;
  lastTransitionKind: TransitionKind;
}
```

This should be treated as a semantic inventory, not a proposed allocation-heavy runtime object. The solver may encode it into typed arrays, bitsets, integers, hashes, or multiple tiered keys.

### Why this could produce more solves

A complete state identity permits exact merging of equivalent histories. Search effort currently lost on duplicate futures can instead widen the frontier, deepen attempts, or fund additional strategies.

The most obvious production target is beam deduplication. The current packed beam constraint code intentionally omits some history and therefore cannot be used universally. A richer key may allow safe deduplication on more mechanic combinations, including portal levels, provided the cost of computing and storing it does not erase the benefit.

### Required validation

A candidate key must be tested in both directions:

1. **Soundness:** states sharing a key must have identical legal futures.
2. **Usefulness:** the key must actually merge enough states to repay hashing, storage, and cache pressure.

Differential tests should compare legal-neighbour sets and subsequent transition results for sampled same-key states. A naive exact reference key can be used in experiments even if it is too expensive for production.

## Opportunity 2: first-class dynamic mechanic state

Every mechanic whose history affects future legality should expose that history directly rather than requiring consumers to reconstruct it from the path.

Portals are the clearest example. The domain model should specify precisely:

- whether use is tracked per terminal, per pair, or per traversal,
- whether entry and exit terminals have distinct future consequences,
- whether portal jumps affect counted length,
- what local direction context survives a jump,
- what must be included in an exact future-state key.

The same contract should exist for flipping filters and future dynamic mechanics.

A mechanic definition could publish a compact semantic footprint:

```ts
interface MechanicStateContract {
  stateCardinality: number | 'unbounded';
  monotonic: boolean;
  affectsMoveLegality: boolean;
  affectsConnectivity: boolean;
  affectsWinState: boolean;
  requiresIncomingDirection: boolean;
  supportsCanonicalEncoding: boolean;
}
```

This is useful before implementation as well as after it. A mechanic with rich behaviour but a few bounded state bits is solver-friendly. A superficially similar mechanic whose future depends on an arbitrary ordered history can multiply the search space dramatically.

## Opportunity 3: a shared compiled puzzle graph

`prepLevel()` already performs extensive solver-specific compilation. The game/domain layer could still own a smaller canonical compiled graph used by the editor, runtime validation, generator, solver preparation, and external oracles.

Possible contents:

- dense cell IDs from `0..N-1`,
- packed-key to dense-ID conversion,
- static geometric adjacency,
- move axes,
- static impassability,
- portal transitions,
- mechanic indexes,
- connected components,
- parity classes,
- articulation cells and bridges,
- corridor and separator structure,
- symmetry information.

The solver would build its hot-path arrays and heuristic data on top of this artifact. It would not be required to use a domain object in inner loops.

### Benefits

- All systems agree on the same logical topology.
- CP-SAT and other oracle encodings consume the same compiled semantics rather than reinterpreting raw level JSON.
- Structural features become available for portfolio selection and analysis.
- Dense IDs may enable smaller experimental state encodings and bitsets.
- New mechanics have one place to declare their graph effects.

### Important caution

The present packed-key / `KEY_SPACE` design exists because direct typed-array access has measured hot-loop advantages. A dense representation should be benchmarked as an additional compiled view, not adopted as an aesthetic rewrite. Conversion once per level is cheap; adding indirection to every move may not be.

## Opportunity 4: certified forced-sequence macro transitions

The game compiler can identify stretches where the player appears to make several moves but the logical continuation contains no branch.

Examples may include:

- a forced portal transition,
- a corridor with one legal exit at each interior cell,
- a filter passage with only one valid continuation,
- a locally forced turn sequence,
- a degree-one chain created by static obstacles.

The solver could apply these as macro transitions while still updating every underlying visit, axis use, intersection, constraint, and length effect.

### Potential gain

Macro transitions reduce effective search depth and repeated neighbour-generation overhead. They are especially attractive when long deterministic stretches occur inside otherwise difficult levels.

### Safety condition

A macro must be certified by the canonical transition semantics. It must stop immediately before any genuine choice or any step whose legality depends on state not included in the macro precondition. This should begin as an experimental successor generator behind an ablation flag.

## Opportunity 5: region and separator facts as guidance

The domain compiler can expose structural graph facts that are useful even when they do not justify a sound prune:

- articulation cells,
- bridges,
- biconnected components,
- narrow separators,
- objective distribution by region,
- minimum region-entry counts,
- regions requiring a return through the same boundary,
- local capacity for revisits or intersections.

The recent CP-SAT prune-atlas work suggests there may be little remaining easy territory for new hard prunes in the modelled subset. That does not imply structural analysis has no value. A branch can be viable but strategically poor under a finite node budget.

Region facts can inform:

- move ordering,
- beam diversity buckets,
- attempt selection,
- repair strategy,
- budget allocation,
- level-family classification.

The right initial use is advisory rather than pruning. Shadow evaluation can measure whether a reasoner ranks known-live and known-dead branches differently before it is allowed to affect search.

## Opportunity 6: explicit symmetry support

For levels with valid geometric and mechanic symmetry, the compiled puzzle could expose its automorphisms and state transforms.

Possible uses:

- skip symmetric root branches,
- canonicalize symmetric states,
- avoid duplicate template attempts,
- transform solutions back into display coordinates,
- classify generated level families without counting rotations/reflections as distinct.

This is likely uneven in value. Hand-authored levels may have little exact symmetry, while procedural families may contain substantial duplication. The first experiment should measure symmetry prevalence and root-branch duplication across the real corpora before implementing canonicalization in hot search.

## Opportunity 7: preserve generation history as optional evidence

Procedural generation often knows facts that are discarded when only the final level is saved:

- a construction or witness path,
- the order in which constraints were imposed,
- a solvable parent level,
- mutations and symmetry transforms,
- intended regions or intersection sites,
- biasing or guidance used during generation.

This metadata should remain provenance, not privileged truth about all solutions. It can nevertheless help with:

- portfolio selection,
- seed generation,
- diagnostic comparison,
- level-family analysis,
- hint diversification,
- training or evaluating guidance systems.

The cold general solver must continue to work without it. Generated levels simply need not arrive with deliberate amnesia.

## Opportunity 8: codify solver-compatible mechanic design

Future mechanics should be reviewed partly in terms of their state-space footprint.

Questions to answer before shipping a mechanic:

1. How many bits or bounded counters of history does it add?
2. Is the state local, global, or per cell?
3. Is it monotonic?
4. Can different histories merge again?
5. Does it alter static topology or only move legality?
6. Does it require remembering incoming direction?
7. Can it be represented in CP-SAT or another oracle without silently relaxing it?
8. Does it preserve any symmetry?
9. Can a sound relaxation provide distances or lower bounds?
10. Must it be included in every transposition key?

This is not an argument for simpler puzzles. Complexity placed in bounded geometry and finite-state mechanics is generally more tractable than complexity placed in arbitrary ordered history.

## Opportunity 9: formal domain limits that enable compact encodings

Pathfinder already has practical caps on board size and object counts. Promoting appropriate caps to explicit domain invariants could make fixed-width state representations provably complete.

Candidates include:

- maximum grid dimensions,
- maximum must-pass / must-cross / flipper / portal counts,
- maximum landmark counts,
- maximum meaningful visit count per cell,
- maximum counted path length.

This could support:

- compact transposition keys,
- fixed-size worker messages,
- bitset operations,
- bounded oracle models,
- lower-allocation beam candidates.

Limits should be justified by game design and existing content, not selected solely for an encoding trick. The payoff must also be measured: a smaller representation can still be slower if it requires expensive packing and unpacking in hot loops.

## Ranked research programme

The strongest near-term experiments are:

### 1. Exact future-state key laboratory

Build a deliberately complete, possibly expensive reference key from the current solver state. Use it to measure:

- duplicate-state rates by level family,
- how much the existing beam key over-splits or under-represents state,
- portal-level dedup potential,
- memory and hashing costs,
- whether exact dedup converts any current failures into solves.

Do not begin by changing production beam search. First establish the ceiling.

### 2. Portal-aware beam dedup experiment

Extend the beam key only with the minimum portal and local-direction state shown necessary by the exact-key laboratory. Run as an isolated ablation on portal levels.

Success criteria should include:

- zero divergence from referee validity,
- no loss of baseline solves,
- meaningful candidate reduction,
- at least one of lower nodes, lower runtime, or new solves.

### 3. Structural feature extraction in shadow mode

Compile region/separator features and evaluate them against the CP-SAT-labelled branch atlas and known solution continuations. Determine whether they provide predictive information beyond current scores and prunes.

Only features with stable out-of-sample value should be allowed into move ordering or portfolio policy.

### 4. Forced-sequence macro ablation

Identify only the safest static forced chains first. Compare node count and wall time with search order otherwise held constant. Expand to state-dependent macros only if the static version demonstrates value.

### 5. Symmetry prevalence audit

Measure exact automorphisms across bundled and stress corpora, then estimate how many root branches and attempt templates are duplicated. Implement symmetry reduction only if the corpus contains enough exploitable structure.

### 6. Shared compiled-graph feasibility

Prototype a domain-level compiled graph used by one additional consumer, preferably the CP-SAT translator or editor validation, while leaving solver hot paths unchanged. This tests whether the shared artifact actually reduces semantic drift before broad adoption.

## What is most likely to find more solves?

The ideas do not have equal expected value.

Most plausible direct routes to additional solves:

1. **Exact state equivalence and safe transposition merging.** This can reduce the effective state space rather than merely make each node faster.
2. **Portal-aware beam deduplication.** This is a concrete restricted case of the first item.
3. **Region/separator features used for strategy and diversity.** The likely remaining deficit is often choosing and sustaining the right search mode, not discovering another obvious prune.
4. **Certified macro transitions.** More nodes and greater effective depth can rescue budget-limited searches.
5. **Optional generation provenance as guidance.** Valuable for generated corpora without weakening the cold-solve standard.

More architectural or long-horizon benefits:

- shared compiled puzzle graph,
- mechanic semantic contracts,
- explicit domain limits,
- symmetry support.

## Non-goals and cautions

- **Do not make gameplay call the solver's hot transition code.** The domain referee and optimized search engine have different performance and ergonomics needs.
- **Do not make the solver call DOM/controller/runtime machinery.** The existing pure-layer boundary is a strength.
- **Do not assume a more compact representation is faster.** Benchmark against the current typed-array design.
- **Do not derive transposition keys from an incomplete field list.** Recent MITM work demonstrated the risk directly.
- **Do not convert advisory structural facts into prunes without proof.** Shadow evaluation and CP-SAT labelling are appropriate gates.
- **Do not hand generated construction paths to the solver and then count the result as a cold solve.** Preserve provenance distinctions.
- **Do not redesign mechanics merely to make the solver happy unless the player-facing formulations are genuinely equivalent.** Solver-aware design should prevent accidental computational explosions, not flatten the game.

## Conclusion

Pathfinder's present code is already unusually solver-conscious. The next frontier is not general refactoring. It is to make the game publish a more complete mathematical account of itself:

- which parts of history affect the future,
- how each mechanic contributes state,
- which histories are equivalent,
- what static graph structure a level contains,
- and which construction facts are known but optional.

The highest-value first step is an **exact future-state identity laboratory**, grounded in the corrected MITM findings and validated against real transitions. If meaningful duplicate futures exist, safely merging them could buy something ordinary scoring and pruning work cannot: a smaller problem.
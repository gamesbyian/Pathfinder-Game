# Symmetry-control audit for solver family diagnosis

**Status:** current-code audit / diagnostic guidance, not a solver change  
**Date:** 2026-08-11  
**Decision:** future symmetry-family diagnosis must control semantic equivariance, intentional directional policy, deterministic tie order, and repair PRNG trajectory before interpreting an orientation solve-status cliff as a missing heuristic.

## 1. Why this audit was needed

The active variant-family programme uses exact rotations/reflections as a controlled probe of solver sensitivity. A solve-status difference between isomorphic orientations is scientifically useful, but “orientation matters” can arise from several mechanisms that mean very different things.

This audit checked the current solver and family tooling for the concrete sources of asymmetry that should be separated before deeper heuristic archaeology.

The central result is that Pathfinder currently has at least **four distinct sources of orientation-dependent finite-budget behavior before any emergent beam/frontier effect is considered**.

## 2. Symmetry generator foundation appears sound

The family generator's symmetry mode uses the canonical domain geometry functions rather than implementing its own transform math:

- `transformPoint` for coordinates;
- `transformAxis` for H/V mechanics;
- `transformTurnDir` for reflected chirality.

The transformed witness, portal terminals, filters, flipping filters, landmarks, gates, blocks, must-pass/must-cross cells, geese, and false goals are transformed through that machinery. The generated witness is revalidated before acceptance.

`modules/domain/geometry.test.ts` directly checks all eight transforms, inverse mapping, axis swapping, and reflection-induced `cw`/`ccw` reversal. The family generator also has end-to-end symmetry coverage.

**Conclusion:** there is no current evidence that the observed orientation cliffs are primarily artifacts of an obviously broken symmetry generator. Continue to validate transforms, but diagnose the solver rather than assuming bad test data.

## 3. Static attempt routing is largely symmetry-invariant

`modules/solver/attempts.ts` selects the attempt bundle from level features such as:

- archetype;
- navigable density;
- `reqLen` / `reqInt`;
- gate count;
- must-pass / must-cross / portal / flipper / must-turn counts.

`modules/solver/archetype.ts` likewise uses density and mechanic counts.

Those quantities are unchanged by exact rotation/reflection.

**Conclusion:** a symmetry sibling should normally receive the same high-level feature-keyed attempt bundle. This rules out one crude explanation: rotation does not simply reclassify the puzzle into a different solver archetype.

## 4. Intentional directional policies remain real

Individual search configurations are not all symmetry-invariant, and they are not required to be.

Examples in `modules/solver/policy.ts` / `scoring.ts` include:

- `perimeterCW` versus `perimeterCCW`;
- side commitment relative to the X midpoint;
- `sideXLow`, `sideXHigh`, `sideYLow`, `sideYHigh` templates.

A reflection maps abstract clockwise behavior to counter-clockwise behavior. A 90-degree rotation maps an X-relative side preference into a Y-relative one.

The production portfolio runs literal configurations in its configured order rather than transforming the policy vocabulary along with a symmetry sibling.

**Interpretation:** this is **directional strategy asymmetry**, not automatically a semantic bug. A portfolio can deliberately contain directional specialists. The important system-level question is whether the portfolio/budget compensates adequately so equivalent puzzles do not experience arbitrary competence cliffs.

When diagnosing a symmetry family, record whether the solving/non-solving attempts used directional templates before blaming a generic score term.

## 5. Fixed neighbor order is an arbitrary deterministic symmetry breaker

`modules/solver/encoding.ts` defines the shared 4-neighbor order as:

1. East (`+x`)
2. West (`-x`)
3. South (`+y`)
4. North (`-y`)

`getNeighbors()` in `search-state.ts` emits candidates in that order.

`scoreAndSort()` uses a stable insertion sort and only moves a candidate ahead when its score is **strictly greater**. Equal-scored candidates therefore retain the original E/W/S/N order.

This affects multiple techniques:

- DFS explores the first tied child first;
- beam preserves/restores generation order around dedup and stable score sorting because changing that order was previously measured to change solve outcomes;
- admissible-order's no-tie-break mode explicitly leaves equal-slack children in `getNeighbors()` order;
- repair builds survivor lists in neighbor order and updates the greedy winner only for `sc > bestScore`, so a score tie keeps the earlier candidate.

Therefore an exact rotation/reflection can change the **abstract branch selected first** even when every semantic heuristic value transforms perfectly.

**Conclusion:** future symmetry diagnosis needs an explicit “equal-score/equal-slack directional tie” category. Do not call such a cliff a heuristic-value failure unless the tie has been controlled or shown not to matter.

## 6. Repair random trajectories are coordinate-seeded

`repair-search.ts` makes repair deterministic by seeding its primary PRNG from the packed gate key:

```text
repairPrimarySeed(startKey, seedSalt)
= ((startKey * 2654435761) ^ (seedSalt * 0x9E3779B1)) >>> 0
```

Production uses `seedSalt = 0`.

An exact symmetry transform generally moves the gate to a different packed coordinate. Therefore the isomorphic sibling receives a **different deterministic repair PRNG stream** before any geometry-specific heuristic effect is needed.

The must-turn-biased repair path also uses a second stream whose seed depends on `startKey` and `seedSalt`.

Repair then uses the stream for:

- fresh-versus-elite splice decisions;
- elite/prefix choice;
- epsilon-greedy exploration;
- exploratory survivor index selection.

So a repair solve-status symmetry cliff can currently mean only that two different deterministic stochastic trajectories behaved differently.

This is still a real robustness property, but it is not evidence of orientation-sensitive semantic reasoning by itself.

### Required research control

For symmetry diagnosis involving repair, add a tooling-only way to supply the same **abstract PRNG stream(s)** to each symmetry sibling.

Prefer an explicit research seed override over trying to reverse-engineer a compensating `seedSalt`, because biased repair has more than one coordinate-derived stream.

Production seeding need not change merely to run this experiment.

Compare at least:

1. production coordinate-derived seeds;
2. normalized research seed(s) shared across the isomorphic pair.

If the solve-status cliff disappears under shared streams, classify it primarily as stochastic trajectory sensitivity rather than heuristic geometry sensitivity.

## 7. Repair's random survivor indexing adds another ordering interaction

`takePly()` chooses an exploratory move with:

```text
Math.floor(rand() * survivors.length)
```

where `survivors` is constructed in the solver's fixed neighbor order.

This same general sensitivity was already demonstrated by the must-cross neighbor-budget experiment: removing a dead survivor could reindex the same seeded random draw onto a different move and change the entire later trajectory, which motivated scoping that prune out of repair's random candidate-selection path.

For symmetry work, the implication is similar: even with a normalized PRNG stream, transformed survivor ordering may map a draw to a different abstract move unless the research control also compares candidates under a canonical transformed order.

Do not change production ordering yet. First measure whether this explains real cliffs.

## 8. Existing family divergence tooling is the correct extension point

`scripts/stress/family-pair-divergence.mjs` already:

- inverse-maps symmetry paths through canonical geometry;
- reconstructs real solver state for parent and variant;
- compares per-step candidate rank and counts;
- finds first meaningful rank divergence;
- runs `SCORE_*` ablation differentials.

`scripts/stress/divergence-lib.mjs` already centralizes the replay logic.

Therefore a semantic symmetry audit should **extend this path**, not create a parallel solver or transform implementation.

The missing pre-score comparison layer should inspect corresponding transformed states and compare, where applicable:

- candidate sets under inverse mapping;
- move-legality decisions;
- mechanic masks/substate;
- hard lower-bound values;
- prune-gauntlet verdicts;
- neutral dynamic metrics such as crossing slack;
- score components expected to be symmetry-respecting.

Directional templates should be explicitly marked as such rather than treated as failed invariants.

## 9. Proposed diagnosis taxonomy

Every high-priority symmetry cliff should be assigned to the earliest applicable category.

### A. Semantic equivariance violation

Corresponding transformed states disagree on legality, a mechanic state update, a hard bound, a prune, or another quantity that should be invariant/equivariant.

**Meaning:** correctness/representation bug until disproved.

### B. Intentional directional strategy asymmetry

The divergence comes from a strategy whose policy is explicitly coordinate/chirality relative, such as CW/CCW or side-X/side-Y templates.

**Meaning:** portfolio design/coverage question, not necessarily a bug in the strategy.

### C. Arbitrary deterministic tie asymmetry

Semantic scores/bounds are equal but fixed E/W/S/N or stable generation order chooses a different abstract branch.

**Meaning:** search-order robustness problem. Candidate for canonical tie experiments or bounded diversity, not for inventing a new semantic rule immediately.

### D. Stochastic trajectory asymmetry

Repair uses different coordinate-derived PRNG streams, or the same random draw indexes a differently ordered survivor list.

**Meaning:** stochastic robustness/control problem. Normalize research streams/order before inferring heuristic geometry dependence.

### E. Emergent search/retention asymmetry

After A-D are controlled, corresponding local semantics remain aligned but finite frontier width, accumulated branch ordering, dedup, budget, or later retention causes one orientation to lose viable structure.

**Meaning:** genuinely interesting search-control/retention evidence. Use winning-lineage survival and first-divergence analysis.

## 10. Recommended symmetry investigation protocol

For each high-ranked independent solve-status cliff from the wide family report:

1. validate the parent/variant transform and mapped solution;
2. confirm the same static attempt-policy feature bundle;
3. identify whether the relevant attempts use directional templates;
4. replay corresponding prefixes and compare mapped candidate sets / semantic state / hard bounds;
5. find the first local rank divergence;
6. determine whether it is an equal-score/equal-slack fixed-order tie;
7. if repair participates, repeat with normalized research PRNG stream(s), and if needed canonical mapped survivor ordering;
8. only then use `SCORE_*` ablations to search for a recurring heuristic mechanism;
9. where beam is implicated, use [`../docs/winning-lineage-survival-analysis.md`](../docs/winning-lineage-survival-analysis.md) to identify the actual retention-loss stage;
10. stop after a recurring mechanism appears across independent families or the top independent cases remain mechanistically distinct.

## 11. Metamorphic testing opportunity

Exact symmetry gives the solver a rare metamorphic oracle.

A future tooling/test layer can transform a level and path prefix and assert that symmetry-respecting semantic quantities map exactly. This is stronger than merely observing similar solve rates.

Potential assertions:

- transformed legal-candidate set equivalence;
- state-mask/substate equivalence after mapped replay;
- lower-bound equality;
- prune-verdict equality;
- transformed turn/filter axis correctness;
- neutral metric equality;
- score-component equality for components declared symmetry-respecting.

This should be developed as a testing/analysis extension only when it serves the family diagnosis programme. It should not force intentionally directional portfolio strategies to become invariant.

## 12. Differential reduction implication

If several independent cliffs reduce to the same category/mechanism, the existing automatic level reducer becomes a strong candidate for a **differential predicate** extension.

Examples:

- preserve “orientation A fails, mapped B solves” while symmetrically simplifying both;
- preserve a large work ratio;
- preserve a specific first-divergence tie or semantic mismatch.

The current reducer is single-level and signature-based; this is not already implemented. Reuse its candidate simplification, validation, deterministic budgets, fixed-point loop, and safeguards rather than building a second reducer.

Do not prioritize this extension until recurring differential specimens exist.

## 13. Current conclusion

The user's earlier intuition remains directionally correct: if a level's solvability changes under an exact orientation transform, that is evidence about solver robustness rather than a reason to ship rotate-and-retry.

But “orientation sensitivity” is not one failure mode.

Current code shows concrete, independent pathways through which it can arise:

- intentional directional specialists;
- fixed E/W/S/N tie resolution;
- coordinate-derived repair random streams;
- random survivor-index sensitivity;
- and only then deeper semantic/frontier differences.

Future family research should control these in that order so expensive heuristic work is aimed at the actual mechanism rather than at the word “rotation.”

## 14. Tooling implementation cross-link

The semantic snapshot comparator and coordinate-independent repair research-seed control described above are now implemented and unit-validated. The bounded R02248 semantic-prefix and matched-seed survivor-order pilots are now complete; they classify a controlled C→D interaction without population inference. See [`2026-08-11-solver-research-observation-tooling-pilot.md`](2026-08-11-solver-research-observation-tooling-pilot.md).

## 15. First semantic-prefix pilot

Two R02248 symmetry witnesses (beam/profile and repair/profile) produced zero semantic mismatches over
202 corresponding prefixes; their first ranking divergences were steps 7 and 81 respectively. This
rules out observed-path legality/lower-bound/prune drift in those cases but does not yet distinguish
score tie order from retention or normalized-seed repair trajectory. See
[`2026-08-11-symmetry-equivariance-prefix-pilot.md`](2026-08-11-symmetry-equivariance-prefix-pilot.md).

## 16. Matched-seed survivor-order result

On R02248/F02248-sym-02, a shared explicit repair research seed exposed equal mapped survivor sets in
different production order at choice 0. At choice 14 identical exploratory draws selected different
mapped moves solely through that order; stream consumption diverged at choice 15. Both matched
100,000-node searches failed, which is mechanism validation rather than a historical-cliff verdict.
See [`2026-08-11-symmetry-equivariance-prefix-pilot.md`](2026-08-11-symmetry-equivariance-prefix-pilot.md).

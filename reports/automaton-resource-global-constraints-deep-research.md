# Automaton/global-constraint resource propagation research

**Role:** external-literature reference. This memo covers `REGULAR`, `COST-REGULAR`, `MULTICOST-REGULAR`, regular counting, solution-density search, and Parikh/resource reasoning as a middle layer between cheap scalar bounds and full exact residual solving. It is not an implementation plan. Current execution priority remains [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md).

## Executive answer

Constraint programming has a mature family of global constraints that combine:

- finite-state sequence legality;
- exact or bounded integer resource totals;
- forward/backward dynamic programming;
- shortest/longest resource reasoning;
- incomplete but useful propagation when full exact filtering is NP-hard.

This substantially strengthens the earlier feasibility work. The most important lesson is not “compile Pathfinder into one automaton.” It is:

> whenever part of the residual semantics is genuinely finite-state, exact resource counters can be propagated jointly with that state machine more strongly than by independent scalar bounds, without requiring a full general-purpose exact solve.

A second major lesson is that one often does **not** need to construct the entire attainable-resource spectrum `R(s)`. It can be cheaper to answer the target-specific membership question `R(s) ∩ T != empty` through lazy arithmetic/connectivity propagation.

---

## 1. `REGULAR`: finite-state sequence constraints as a layered graph

The `REGULAR` global constraint requires a sequence of decision variables to form a word accepted by a deterministic finite automaton.

The standard propagation construction unfolds the automaton over sequence positions into a layered directed acyclic graph:

- layer `i` represents automaton states after assigning the first `i` variables;
- an arc corresponds to choosing a value for variable `x_i` and taking the matching automaton transition;
- accepting source-to-sink paths correspond to satisfying assignments.

Forward and backward reachability remove values that occur on no accepting path.

This representation is important because it provides a compact exact state machine for sequence mechanics whose relevant history is finite-state.

### Transfer limit

Arbitrary path-history restrictions such as which grid cells/edges have already been consumed are generally not finite-state at small cost. A finite product state can encode them only by exponential state expansion. The useful transfer is therefore modular: isolate finite-state mechanic/order semantics where possible rather than assuming all path legality is regular.

---

## 2. `COST-REGULAR`: exact/bounded resources on automaton paths

`COST-REGULAR` associates integer costs with automaton transitions and constrains the total accumulated cost.

The same layered automaton graph supports resource filtering through forward/backward shortest and longest paths.

For a candidate variable/value arc, one can combine:

- minimum cost from the start to the arc;
- arc cost;
- minimum cost from the arc to acceptance;

and similarly maximum costs.

If every accepting path through that arc lies outside the permitted cost domain, the value can be removed.

This is a direct mature precedent for maintaining both:

- **lower required resource**, and
- **upper achievable resource**

within one stateful sequence representation.

It is stronger than independently computing a lower bound and a crude global capacity when finite-state structure constrains which resource totals can coexist with which mechanic states.

---

## 3. `MULTICOST-REGULAR`: multiple exact resources and the hardness boundary

The French/Québécois CP literature extends this framework to multiple simultaneous resource dimensions.

Each transition carries a resource vector. The residual filtering problem becomes a resource-constrained shortest/longest path problem through the layered automaton.

Full arc/domain consistency is generally NP-hard once multiple resources interact. Practical `MULTICOST-REGULAR` propagation therefore uses relaxations such as Lagrangian methods rather than pretending the complete multidimensional attainable set is cheap.

This is a mature example of the exact trade Pathfinder repeatedly encounters:

> exact multi-resource feasibility is hard, but a sound incomplete propagator can still rule out many impossible choices cheaply.

The result reinforces a useful hierarchy:

1. independent scalar bounds;
2. joint finite-state/resource relaxation;
3. exact bounded/subproblem DP;
4. full exact residual solver.

The literature gives substantial precedent for operating in level 2 rather than jumping directly from 1 to 4.

---

## 4. Regular counting constraints and exact-equality hardness

Counter-DFAs augment automata with counters that increment when designated transitions/patterns occur.

Regular counting constraints ask how many times a regular-language event occurs in the sequence.

Important complexity split:

- useful `at-most` and `at-least` one-counter forms admit polynomial domain-consistency propagation under common assumptions;
- the **exact-count** form is NP-hard.

Beldiceanu, Flener, Pearson, and Van Hentenryck therefore develop an intentionally incomplete exact-count propagator rather than treating NP-hardness as a reason to abandon propagation.

This is especially relevant to exact resource/count puzzles. Equality changes the problem qualitatively:

`minimum <= target <= maximum`

is necessary but may miss unattainable holes.

Yet the practical response need not be “compute the full exact spectrum.” Incomplete exact propagation can exploit structure while remaining polynomial/compact enough for practical CP use.

---

## 5. Attainability without materializing the whole spectrum

Earlier research framed exact feasibility through an attainable set

`R(s) = { resource vectors of valid completions }`.

That remains the mathematically strongest object, but constructing all of `R(s)` may be unnecessary.

A target-specific query needs only:

`R(s) ∩ T != empty`

for the current target condition `T`.

Automaton/resource and Parikh-automata methods can attack this membership/existence question directly through:

- finite-state reachability;
- integer transition-count variables;
- flow/conservation constraints;
- Presburger arithmetic;
- lazy product construction;
- conflict-driven strengthening.

This can avoid explicitly enumerating every attainable resource vector.

The transfer principle is:

> if the downstream search asks one target-membership question repeatedly, optimize for deciding that predicate rather than compiling a universal exact spectrum unless repeated-query economics justify compilation.

---

## 6. Parikh automata and lazy arithmetic/connectivity reasoning

Parikh-image methods count how many times symbols/transitions occur in accepting runs, discarding sequence order in the resulting count vector.

Parikh automata combine:

- a finite automaton;
- transition-count vectors;
- arithmetic/semilinear conditions on the final counts.

Modern work by Stjerna and Rümmer avoids eagerly constructing huge product automata or complete Parikh images. Instead it interleaves arithmetic propagation, automaton connectivity, and lazy refinement/construction.

A useful conceptual decomposition is:

- arithmetic constraints say which transition-count vectors are numerically plausible;
- flow/connectivity constraints say which count vectors can correspond to actual runs;
- deductions from either side shrink the other.

This is a strong external precedent for **joint topology/sequence + exact-resource reasoning** rather than separate independent scalar tests.

### Caveat

Parikh counts forget order. Any mechanic whose legality depends on ordering must remain in the automaton/product state. Arbitrary simple-path/revisit history can still dominate complexity.

---

## 7. Solution-density search: local feasible mass as a heuristic

The layered automaton representation can count accepting paths, not only determine existence.

For a candidate assignment `x_i = d`, forward path counts into the corresponding arc and backward counts from it to an accepting state give the number of accepted automaton sequences containing that assignment.

Define a constraint-level solution density:

`rho(x_i=d | c) = #solutions of constraint c using x_i=d / #solutions of c`.

Counting-based search uses these densities to guide branching toward assignments supported by large fractions of a constraint's solution set.

This adds a new cheap-ish form of **basin-width information**:

- not total number of complete puzzle solutions;
- not merely number of legal next moves;
- rather, how much abstract/global-constraint solution mass supports each candidate decision.

### Important limit

Constraint-level solution density is not global solution probability. Different global constraints interact. A value can have high support in an automaton relaxation yet be impossible once topology/resource/mechanic constraints are combined.

Therefore solution density is heuristic/predictive information unless computed in a model known to be exact for the queried property.

---

## 8. Finite-state mechanics versus history-sensitive path reuse

Regular-path-query research provides a useful hardness boundary.

Finite-state restrictions on ordinary walks can often be handled by product-graph reachability. Requiring simple paths or trails can change complexity dramatically because the solver must remember vertex/edge reuse history.

This implies:

> finite-state mechanics themselves may not be the main source of combinatorial explosion; coupling them to elementarity, bounded revisits, crossing history, or resource equality often is.

For modeling/research, it is therefore useful to distinguish:

- finite mechanic state suitable for an automaton/product node;
- exact integer counters suitable for resource propagation;
- residual topology/reuse state that may require a separate graph/interface representation.

This separation aligns closely with the emerging residual-interface vocabulary.

---

## 9. Exact, relaxed, and heuristic roles

Automaton/resource reasoning can serve several rigor levels.

### Exact propagator
The automaton and counters fully capture the queried residual semantics; rejection is a proof.

### Safe relaxation
The automaton/resource model over-approximates the true completion set. If even the relaxation cannot meet the target, true completion is impossible.

### Predictive density/heuristic
Counts or cost structure are derived from a relaxation and used for ranking. They are not hard pruning evidence.

### Diagnostic/reference model
A richer automaton/resource construction may be too expensive online but useful for offline exact-label or counterexample generation.

Do not mix these roles.

---

## 10. Pathfinder-facing implications, not implementation instructions

**Residual feasibility:** specialized finite-state/resource propagators are a legitimate middle ground between current simple bounds and full CP-SAT residual solving.

**Exact resources:** equality-target hardness supports looking for incomplete one-sided propagation rather than expecting cheap full attainable-set maintenance.

**Beam:** constraint-level solution densities could be offline descriptors of abstract future mass, subject to the same random-reserve/width and exact-label controls as other beam features.

**Repair:** finite-state/resource subproblems may be materially easier to reconstruct exactly than the whole residual if path-history topology is fixed behind a small interface.

**Learned failure:** modular/residue/resource contradictions produced by a propagator can become compact proof explanations when their scope is explicit.

**Reference model:** a bounded automaton/global-constraint model can serve as an intermediate oracle if it answers ranked questions more cheaply than full CP-SAT.

---

## 11. What this literature does not establish

It does not establish that:

- Pathfinder mechanics can be represented compactly by a single automaton;
- `COST-REGULAR`/`MULTICOST-REGULAR` directly model self-intersections or arbitrary residual topology;
- solution-density estimates from a relaxation correlate with actual Pathfinder completion probability;
- a specialized propagator will beat existing prune/check cost;
- full multi-resource domain consistency is practical.

Those require project-specific evidence.

---

## Selected sources

- Gilles Pesant, **A Regular Language Membership Constraint for Finite Sequences of Variables**, CP 2004.
- Sophie Demassey, Gilles Pesant, Louis-Martin Rousseau, **A Cost-Regular Based Hybrid Column Generation Approach**, and related `COST-REGULAR` work.
- Nicolas Beldiceanu, Pierre Flener, Justin Pearson, Pascal Van Hentenryck, **Propagating Regular Counting Constraints**, AAAI 2014 / arXiv `1309.7145`.
- French/Québécois `MULTICOST-REGULAR` literature and current Choco `PropMultiCostRegular` implementation/documentation.
- Stjerna and Rümmer, 2024 work on Parikh automata / lazy product and arithmetic-connectivity reasoning, DOI `10.1145/3649855`.
- Gilles Pesant, Claude-Guy Quimper, Alessandro Zanarini and related work on **counting-based search / solution densities**.

## Bottom line

The CP automaton literature supplies a missing middle layer:

`finite-state mechanic abstraction + exact counters + incomplete/safe propagation`.

It reinforces four durable ideas:

1. exact equality is genuinely harder than one-sided resource bounds;
2. lower and upper resource opportunity should be propagated together;
3. target membership can be easier than materializing the full attainable spectrum;
4. constraint-level solution mass can be a useful heuristic description of future width without pretending to be a proof.
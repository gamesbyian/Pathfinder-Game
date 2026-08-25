# Future-opportunity and exact-feasibility reasoning in constrained path search

## Scope

A partial path can be locally legal yet already incapable of exact completion because remaining length, intersections, mandatory visits, topology, or stateful mechanics cannot all still be satisfied.

The useful question is broader than “what is the shortest remaining path?”:

> **What remaining resource vectors and structural completions are still attainable from this state?**

This distinction matters whenever constraints require **exact totals** rather than simple upper bounds.

## Exact resource accounting

Classical resource-constrained shortest-path methods maintain labels containing position plus resource usage and other path state. Dominance pruning discards a label only when every completion available from it can be matched or improved by another label.

For ordinary upper-bounded resources, componentwise “less used is better” can justify strong dominance rules.

For **exact consumption**, that monotonic rule is generally unsafe.

Example: if the target is exactly 10 intersections, a state with 7 used does not automatically dominate one with 9 used. The first still needs exactly 3 achievable intersections; the second needs exactly 1. Either remainder may be easier or impossible depending on the residual graph and mechanic state.

The correct abstraction is the **set of attainable remaining resource vectors**. Label A dominates B only when A's possible completions safely subsume B's under the relevant state constraints. Simple scalar slack rules are valid only under additional monotonicity assumptions that must be proved.

This is a central caution for exact-length/exact-intersection puzzles.

## Completion bounds

Cheap one-sided bounds remain extremely useful.

### Minimum remaining work

A lower bound `LB(s)` on additional steps/resources is admissible when

`LB(s) <= true minimum required completion resource`.

For distance, an admissible heuristic never **overestimates** the required remaining cost.

If

`used + LB > target`,

exact completion is impossible.

Examples include:

- shortest path to goal in a relaxed residual graph;
- minimum cost to connect remaining mandatory points;
- minimum additional visits/crossings forced by unresolved obligations;
- parity/congruence lower bounds when geometry forces resource parity.

### Maximum remaining capacity

Exact targets also benefit from an **upper bound** on how much resource can still be consumed. If

`used + UB < target`,

the state is dead even though reaching the goal may be easy.

Upper-capacity reasoning is often more important in exact-feasibility problems than in ordinary shortest-path optimization.

Potential sources include remaining usable cells/edges, revisit limits, crossing capacity, mechanic-specific usage limits, and topology-induced restrictions.

### Attainability gaps

Even `LB <= remaining <= UB` is not enough if only certain values are achievable. Parity, modular restrictions, mandatory sequence lengths, or discrete intersection opportunities can leave holes in the attainable set.

The strongest general object is therefore not a scalar bound but an approximation to:

`A(s) = {resource vectors achievable by some valid completion from s}`.

Useful reasoning may approximate `A(s)` cheaply through intervals, parity classes, small bitsets, or other summaries.

## Residual topology and connectivity

Graph structure can prove infeasibility before numerical bounds do.

Useful residual-graph questions include:

- is the goal reachable at all?
- are all mandatory locations reachable from the current endpoint under current move legality?
- has the partial path separated required regions?
- are bridges or articulation vertices now forced?
- would using a candidate edge isolate an obligation?
- do residual components contain enough capacity to satisfy required length/crossings?

Connectivity, articulation points, and bridges are computable in linear time in the residual graph. The expensive part is often **recomputing or maintaining the correct state-dependent residual graph**, especially with portals, revisits, directionality, or mechanics that change future legality.

These tests are one-sided: connectivity is necessary but rarely sufficient.

## Separator and cut reasoning

Cuts can express stronger obligations than simple reachability.

If every completion must cross a cut a certain number of times, the residual number/direction of usable crossing edges can yield:

- hard infeasibility proofs;
- forced-edge deductions;
- minimum remaining length/crossing counts;
- warnings that a locally attractive move consumes a scarce bridge between future obligations.

This kind of reasoning is common in graph constraint propagation and routing formulations.

## Global path constraints and propagation

Constraint-programming path propagators combine degree, connectivity, ordering, and reachability reasoning to remove arcs or values that cannot participate in any completion.

Conceptually useful forms include:

- forced/forbidden edges;
- component reachability;
- degree viability;
- mandatory-path ordering;
- bridge/cut deductions;
- propagation from global resource counts.

Their advantage is **joint reasoning** across constraints. Their cost is repeated graph analysis and the complexity of representing dynamic mechanics exactly.

For heuristic search, the transferable lesson is not “embed a full CP solver.” It is that some failures become visible only when multiple residual obligations are reasoned about together rather than through independent scalar bounds.

## Relaxations

A relaxed residual problem removes some constraints so it is cheaper to solve.

Examples in path literature include partial elementarity, ng-route ideas, decremental state-space relaxation, ignoring selected mechanics, or simplifying revisit restrictions.

If the relaxation is a **superset** of the true completion set, then:

- relaxed infeasible ⇒ true problem infeasible;
- relaxed feasible does **not** prove true feasibility.

This can produce sound pruning or optimistic guidance.

Relaxations are useful when they preserve the bottleneck structure cheaply. They are weak when the omitted constraints are exactly what makes the residual hard.

Be precise about direction: enlarging the feasible set can only maintain or improve an optimization optimum; it does not make positive-cost cycles intrinsically beneficial.

## Bidirectional and reverse reasoning

Forward/backward labeling and meet-in-the-middle search can reduce effective depth when future state can be represented compatibly in both directions.

However, there is no general guarantee that an exponential `2^N` problem becomes `2^(N/2)`. The number of forward/backward labels and join compatibility checks can themselves be exponential.

Bidirectional methods work best when:

- the split resource is meaningful;
- reverse mechanics are well-defined;
- labels have compact compatibility conditions;
- the join is much smaller than the full forward state space.

Reverse searches are also useful for lower bounds. A shortest path in a **relaxed** reverse graph can provide an admissible distance-to-go bound. It is “perfect” only for that relaxed graph/objective, not for the full constrained residual problem.

## State-space relaxations for elementarity

Elementary-path methods often encode visited-set information, which causes exponential state growth. Partial-elementarity relaxations remember only selected recent/nearby visitation information, then tighten when necessary.

The transferable insight is broader:

> Remember only the history needed to preserve the future distinction relevant to the current bound or dominance rule.

But any history compression used for hard pruning needs a sound argument. Exact stateful mechanics can make superficially similar labels have different futures.

## Dominance and Pareto labels

Multi-resource labels are useful when no single scalar describes future quality. A label may carry remaining length, remaining intersections, obligations, topology state, and mechanic state.

Pareto filtering can remove labels that are unambiguously worse under a **proven dominance relation**.

For exact-target search, useful dominance may require more than resource vectors, such as:

- same current position;
- compatible or subsuming visited/edge-use state;
- compatible mechanic history;
- a proof that one state's attainable completion set contains the other's.

If these conditions are too strong, true dominance may be rare. That itself is informative: exact feasibility may need heuristic survivor selection rather than aggressive sound dominance.

## Hamiltonian/self-avoiding analogies

Tight grid paths resemble self-avoiding or Hamiltonian path problems, so degree, parity, connectivity, and capacity arguments can transfer.

Exact longest-simple-path computation is NP-hard and generally too expensive as a routine bound. Cheap relaxations can still help:

- residual degree checks;
- bipartite/parity balance;
- forced corridors;
- component capacity;
- spanning-tree or Steiner-style lower bounds for remaining obligations.

If revisits/intersections are allowed, strict self-avoiding arguments must be used carefully. A relaxation that forbids revisits may produce false infeasibility for a puzzle where revisits are essential; it is not automatically a sound lower/upper bound in the needed direction.

## Hard proof vs heuristic guidance

Keep four roles separate:

1. **Hard feasibility proof:** soundly rejects a state.
2. **Admissible bound:** one-sided quantity used for safe pruning.
3. **Heuristic guidance:** predicts future opportunity but may be wrong; use for ranking/retention, not hard rejection.
4. **Diagnostic label:** expensive/exact offline truth used to understand search failures.

A powerful offline predictor should not become a production prune merely because it correlates with exact labels.

## How to judge future-opportunity information

Useful empirical signatures include:

- infeasible branches rejected materially earlier;
- reduced downstream work after a new bound fires;
- exact-live/dead separation before the current heuristic diverges;
- stronger dominance with low false-comparison rate;
- residual descriptors that predict beam survival or repair difficulty across unrelated parents;
- improved cold solve/work after a heuristic descriptor is used for ranking;
- low checking overhead relative to avoided work.

For a proposed hard prune, also measure **new pruning opportunity not already covered by existing bounds**. A mathematically elegant condition that almost never fires has little practical value.

## Most transferable ideas

For exact constrained grid paths, the strongest general concepts are:

1. **Lower and upper residual-resource bounds**, not lower bounds alone.
2. **Attainable-resource summaries** such as parity/congruence or small feasible-value sets.
3. **Residual connectivity, cuts, bridges, and forced corridors.**
4. **Joint obligation/topology reasoning** inspired by global path propagators.
5. **Multi-resource/Pareto state descriptions**, with dominance only where exact-completion subsumption is proved.
6. **Relaxed residual solvers** used one-sidedly for pruning or as offline/heuristic guidance.
7. **Bidirectional/reverse bounds** where mechanics admit compact reverse state.

## Bottom line

Classical RCSP intuition must be modified for exact targets. “Less resource used” is not automatically better, and a shortest-path lower bound answers only one side of feasibility.

The most useful question is:

> **What exact resource consumption and structural obligations are still achievable from this partial state?**

Cheap approximations to that answer can serve as hard prunes, heuristic future-opportunity descriptors, repair diagnostics, beam survivor features, or failure explanations depending on their soundness and cost.
# Future Equivalence and Feasible-Basin Width

## Core distinction

Two different questions are often conflated:

1. **Future equivalence:** do two current states expose the same or substitutable continuation possibilities?
2. **Basin width:** how many feasible completions, viable next decisions, or robust continuation routes lie behind one state?

A state can be unique but have a broad basin; another can look similar yet have a single brittle completion.

## Exact future equivalence

Let `C(s)` be the continuation language/outcome set from state `s`.

The cleanest notion is:

`A ~ B  iff  C(A) = C(B)`

under whatever mapping aligns resource offsets, transformed actions, and goal outcomes.

This is the same family of idea as Myhill-Nerode equivalence, bisimulation/language equivalence, quotient transition systems, and exact state aggregation: current-history distinctions can be discarded only when they never affect relevant futures.

For resource-labelled futures, use a weighted/resource-labelled continuation language or a set of attainable outcome vectors, not just unlabelled reachability.

## Substitutability and dominance

A weaker safe relation is simulation/substitutability:

`C(B) subseteq C(A)`.

Then A may replace B for pure feasibility if every relevant continuation of B can be matched from A. Exact-resource targets require target-compatible inclusion, not ordinary scalar dominance.

Safe merging is stronger than safe pruning:
- equivalence can justify merging;
- one-way simulation can justify dominance/pruning in the correct direction;
- approximate similarity justifies neither without an independent soundness argument.

## Practical future signatures

Exact continuation equivalence is usually too expensive. Mature abstractions therefore keep only selected future-relevant variables.

Strong precedents include:

### Planning abstractions
Pattern databases, Cartesian abstractions, merge-and-shrink and domain projections map many concrete states to one abstract state while preserving selected transition/reachability information. Shrinking trades precision for bounded representation size.

### Separator/interface signatures
Treewidth/pathwidth DP, transfer-matrix methods, AND/OR search and context-minimal graphs exploit the fact that a solved region communicates with the unresolved remainder only through a small interface. States agreeing on the boundary assignment/context can share the same residual subproblem.

This is one of the strongest precedents for a compact structural future signature: **remember the interface, forget irrelevant interior history**.

### Constraint/CSP interchangeability
CSP literature distinguishes value/state interchangeability, substitutability and neighborhood interchangeability. These relations are exact only under their stated scopes; local forms are cheaper but weaker.

### Bisimulation/partition refinement
When an explicit finite transition system exists, partition refinement can compute behavioral equivalence efficiently. The difficulty in combinatorial search is that constructing the relevant full state graph is often already the expensive problem.

## Candidate ingredients with external precedent

Approximate future signatures often combine:
- endpoint/current abstract location;
- finite mechanic/product state;
- remaining obligations;
- residual resource bounds or attainable residues/classes;
- reachable landmark/goal sets;
- component/articulation/separator structure;
- boundary/interface state;
- abstract successor profile;
- pattern-database or causal/dependency projection.

No theorem says this particular bundle is universally sufficient. The transferable lesson is to preserve variables that mediate interaction with the unresolved future.

## Quantitative future similarity

Exact equivalence can be relaxed to distances between future behaviors:
- bisimulation metrics;
- distances between transition/outcome distributions;
- overlap/Jaccard of reachable abstract outcomes;
- distance between attainable-resource sets;
- differences in abstract successor profiles.

These are useful for clustering/diversity but are not sound equivalence certificates unless a bound connecting the metric to preserved behavior is proved.

## Basin width

For a feasible state `s`, the most direct width measure is

`N(s) = number of valid completions`.

`log N(s)` is a natural solution entropy. But raw solution count is not a complete difficulty measure: solutions may be highly clustered, hidden behind deceptive branching, or share a large frozen core.

Other useful notions include:
- number of viable immediate actions;
- viable branching factor over the next `d` levels;
- forced-variable/forced-choice fraction;
- backbone size: decisions shared by all completions;
- local entropy: completions within a radius of a reference solution;
- solution-space clustering/frozen cores;
- robustness radius under local edits;
- discrepancy distance from a default heuristic policy;
- separator/interface width or residual treewidth.

A “needle” residual often has few viable actions, long forced chains, large backbone/frozen fraction, small local entropy, or a narrow separator even when total solution count is not literally one.

## Exact and approximate counting

### Exact counting
#SAT/#CSP, decision diagrams, d-DNNF/SDD, separator DP and bounded-treewidth methods can count completions and answer conditional counts after fixing a partial state. These are exact but generally #P-hard without exploitable structure.

### Approximate counting
Hashing-based approximate model counting can give probabilistic multiplicative estimates in Boolean settings but requires repeated solver calls and is usually diagnostic rather than hot-loop machinery.

### Propagation-derived proxies
Cheaper proxies include:
- product/sum of residual domain sizes;
- fraction of variables/actions forced by propagation;
- propagation closure depth;
- residual branching entropy;
- conflict/tightness measures;
- limited-depth viable-prefix counts;
- randomized probing/sampling.

They estimate freedom, not solution count exactly. Correlation with search difficulty is domain dependent.

## What predicts difficulty?

Research across SAT/CSP consistently shows no one scalar is universal.

Useful empirical associations include:
- large backbones/frozen cores can make local search brittle;
- solution clustering and narrow gateways can make many-solution instances difficult;
- propagation strength and residual treewidth often track exact-search cost;
- phase-transition/constrainedness measures can predict hardness in ensembles but transfer poorly to individual structured instances.

Therefore “more solutions = easier” is not reliable. Geometry and accessibility matter.

## Connection between equivalence and counting

Several mature representations support both roles:

- AND/OR context caching identifies equivalent residual subproblems and can store their solution counts.
- Separator/tree-decomposition DP groups states by boundary signature and aggregates counts/feasibility behind each signature.
- Decision diagrams merge equivalent suffix subproblems and support counting/sampling.
- Weighted automata/weighted model compilation attach weights/counts to future-equivalent states.
- Probabilistic bisimulation/lumpability preserves selected future distributions.

This is strong precedent for one abstraction serving both **which futures are distinct?** and **how much future mass lies behind them?**

## Finite-width survivor sets

If a survivor budget is limited, candidate value can depend on marginal set contribution rather than standalone score. Relevant objective families include:
- coverage of abstract future classes;
- facility-location/submodular coverage;
- entropy/stratification over future signatures;
- quality-plus-distance/crowding;
- Pareto coverage over residual capabilities;
- DPP-style quality/diversity kernels.

The descriptor remains the load-bearing object. A sophisticated selector over an irrelevant signature preserves cosmetic variety.

Simple stratification/quotas and random reserve are important conceptual controls because they distinguish descriptor information from the generic benefit of not taking deterministic top-K.

## Complexity boundaries

- Rich continuation-language equivalence can be as hard as solving the underlying reachability problem and may be undecidable in sufficiently expressive infinite-state systems.
- Explicit finite-state bisimulation may be tractable, but constructing the explicit state graph can be exponential.
- Exact completion counting is generally #P-hard.
- Minimal approximate abstractions can themselves be NP-hard to find.
- Product-state augmentation for exact resources/stateful mechanics can explode exponentially.
- Exact solution-space geometry may require essentially compiling the residual problem.

## Bottom line

The strongest external answer to “same future” is **continuation-language equivalence**, with simulation/substitutability as the safe one-way weakening.

The strongest practical precedent for approximation is **interface/context abstraction**: retain only information through which the solved past can affect the unresolved future.

For basin width, solution count is only the starting point. Forced-choice fraction, viable branching, backbone/frozen structure, local entropy, separator width, propagation closure and conditional counts capture different forms of brittleness.

Most importantly, separator DP, AND/OR contexts and compiled decision diagrams demonstrate that one compact state representation can simultaneously support equivalence, memoization, counting and sampling when the unresolved problem has a small interface.
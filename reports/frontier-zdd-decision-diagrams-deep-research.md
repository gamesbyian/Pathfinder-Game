# Frontier/ZDD, representative-set, and decision-diagram research

**Role:** external-literature reference. This memo records mature algorithms and transfer limits; it is not a Pathfinder implementation plan. Current execution priority remains [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md).

## Executive answer

The frontier/ZDD and connectivity-DP literature gives the strongest constructive precedent yet for Pathfinder's emerging **residual interface** idea.

For a graph processed through a frontier, a state keeps only information on the processed/unprocessed boundary that can affect future completion. For path/connectivity problems this commonly includes boundary degree and connectivity/partition information. When that boundary description is sufficient, different interior histories can be merged exactly because the unprocessed graph cannot distinguish them.

Three additional ideas materially expand the earlier future-equivalence/beam research:

1. **Interface width matters.** State explosion is governed by frontier/path/tree width and ordering, not merely total residual graph size.
2. **Representative families are stronger than pairwise dedup/dominance.** A small retained set can collectively preserve all relevant extensions even when no individual retained state dominates every discarded state.
3. **Restricted and relaxed decision diagrams form a useful dual.** Restricted DDs under-approximate the feasible set, closely resembling beam search; relaxed DDs over-approximate it and can provide safe optimistic bounds.

These ideas do not imply that a full ZDD/DD engine belongs in Pathfinder. They provide a much sharper theory of exact interfaces, bounded future representations, and what finite-width search loses.

---

## 1. Frontier-based search and exact boundary state

### Core construction

Frontier-based search processes graph edges or vertices in an order. At each step, the **frontier** contains vertices touching both processed and unprocessed portions of the graph.

A frontier state stores only information about those frontier vertices that can still constrain the unresolved portion. For connected-subgraph/path problems, state fields can include:

- whether a frontier vertex is unused or already selected;
- its current partial degree;
- connectivity/component labels among frontier vertices;
- endpoint status;
- problem-specific finite labels or resource state.

When a processed vertex leaves the frontier, any information about it that cannot affect the future is discarded.

This is a direct constructive form of future sufficiency:

`I(A) = I(B)  =>  same future subproblem`

for the exact property represented by the frontier state.

Jun Kawahara's frontier/ZDD work explicitly constructs ZDDs for `s-t` paths and other graph families this way. The associated reference implementation supports directed/undirected `s-t` paths, spanning trees/forests, cuts, counting, enumeration, and random sampling.

### Why this is unusually relevant

This is not ordinary state compression by historical similarity. It asks:

> What can the unprocessed graph still observe about the already processed graph?

That is almost exactly the durable residual-interface question now shared by Pathfinder beam, repair, learned-failure, and exact-reference research.

### Transfer limit

The interface is exact only for the state semantics actually encoded. Stateful mechanics, bounded revisits, exact resource counters, or arbitrary history-sensitive legality require additional boundary/product state. If important history is omitted, merging becomes unsound.

---

## 2. Ordering, frontier width, pathwidth, and state explosion

Frontier methods can be spectacular or useless depending on boundary width.

The number of simultaneous frontier vertices depends strongly on edge/vertex ordering. Closely related graph parameters include vertex separation, pathwidth, branchwidth, and treewidth. For a fixed-width decomposition, connectivity problems can often be solved in time exponential in width but only polynomial/linear in graph size.

Therefore:

> A residual can be large in vertex count yet easy to represent if it has a narrow interface; a smaller but broad residual can be difficult.

For grid-like graphs, width typically grows with the thinner grid dimension. The number of possible connectivity partitions on a frontier can itself be super-polynomial/exponential in frontier width.

This adds **interface width** as a structural difficulty measure distinct from:

- residual cell count;
- raw solution count/basin width;
- shortest/longest remaining path;
- backdoor depth.

Ordering is not cosmetic. Choosing an order that minimizes the frontier profile can dominate ZDD/DD construction cost.

---

## 3. ZDDs as compiled families of graph solutions

A zero-suppressed binary decision diagram (ZDD) compactly represents a family of sets. In graph applications, the sets can be edge subsets corresponding to paths, cycles, trees, cuts, and other structures.

Once a graph family is compiled, the representation can support:

- feasibility/existence;
- exact counting;
- enumeration;
- uniform/random sampling;
- intersections/differences with other represented families;
- filtering by additional constraints;
- weighted selection/optimization in suitable formulations.

Graphillion and TdZdd/frontier implementations demonstrate that this is mature software, not only asymptotic theory.

### Cost/length filtering

ZDD research includes cost/length-bounded path and Hamiltonian-path families. This reinforces that exact/bounded resource requirements can sometimes be applied to a compiled structural representation rather than solved from scratch for every target.

### Complexity warning

The ZDD may still be exponential. Compactness is an empirical/structural property governed heavily by ordering and residual width. A ZDD compiler is therefore not a generic escape from combinatorial explosion.

---

## 4. Connectivity DP and representative sets

Classical tree-decomposition DP for connectivity problems stores partitions describing which boundary vertices are connected through the processed subgraph. The number of partitions can dominate runtime.

### Cut&Count

Cut&Count showed that many connectivity problems, including Hamiltonian Path and Steiner Tree, admit randomized single-exponential algorithms in treewidth rather than the older `tw^tw`-style dependence.

The importance here is conceptual as much as algorithmic: global connectivity can be represented through carefully structured boundary information without retaining the entire processed subgraph.

### Rank-based representative families

Bodlaender, Cygan, Kratsch, Nederlof and collaborators developed deterministic rank-based reductions for weighted and counting connectivity problems.

Instead of retaining every partial solution in a DP table, the method computes a much smaller **representative family** that preserves all relevant future extensions for the optimization/counting property.

This is stronger than duplicate removal or pairwise dominance.

Suppose `F` is a large family of partial states and `F'` is a representative subfamily. The guarantee has the form:

> for every compatible future extension, if some member of `F` can participate in an optimal/feasible completion, then some member of `F'` can do so as well.

No one member of `F'` need individually dominate every discarded member.

Experimental work on Steiner Tree found that representative-set reductions can substantially reduce table sizes and runtimes, so the technique is not purely theoretical.

### Beam interpretation

This supplies a rigorous aspirational target for finite-width survivor selection:

> preserve a small set whose **collective extension capability** covers the useful futures of a much larger frontier.

Ordinary beam search provides no such guarantee. But this is a much more meaningful external concept than generic geometric diversity.

---

## 5. Exact, restricted, and relaxed decision diagrams

Decision-diagram optimization starts from a dynamic-programming model whose states form diagram nodes by decision layer.

### Exact DD

An exact DD represents the true feasible state/solution space. Nodes may be merged only when the state model proves the merge exact for future behavior.

This corresponds to exact future equivalence/context merging.

### Restricted DD

A restricted DD deliberately represents only a subset of feasible solutions, usually to maintain a maximum layer width.

Common construction strategies include:

- retain only highest-priority nodes;
- discard excess nodes;
- merge in a direction that cannot introduce infeasible solutions.

Restricted DD construction is explicitly described in the literature as closely related to beam search.

For pure feasibility:

`restricted feasible => original feasible`

but

`restricted infeasible` gives no proof about the original problem.

### Relaxed DD

A relaxed DD represents a **superset** of feasible solutions by merging states with a valid relaxation operator.

For feasibility:

`relaxed infeasible => original infeasible`

but

`relaxed feasible` does not prove true feasibility.

For optimization, relaxed DDs provide optimistic bounds.

A merge is valid only when the merged state safely relaxes the original states and subsequent transitions preserve that relation. Similarity alone is insufficient.

### The useful bracket

The three representations give:

`restricted futures ⊆ true futures ⊆ relaxed futures`

This creates a useful conceptual bracketing of uncertainty:

- restricted representation supplies constructive witnesses/candidate completions;
- relaxed representation supplies safe impossibility/bound information;
- the gap describes futures neither side resolves exactly.

This dual was missing from the earlier beam/diversity literature review.

---

## 6. Width-bounded DDs and beam search

The relationship is deeper than an analogy.

A width-bounded restricted DD processes states layer by layer and keeps only a bounded number according to a priority rule. This is structurally beam search over a dynamic-programming state model.

The DD literature adds two questions often absent from beam research:

1. Can the state representation merge future-equivalent candidates **before** the width cap is applied?
2. Can a relaxed diagram provide an optimistic representation of the capability lost by restriction?

This does **not** imply that a production beam should construct two DDs. It gives theory for separating:

- score error;
- redundant exact/interface states;
- finite-width restriction loss;
- optimistic residual capability.

---

## 7. Counting and path-family competition evidence

The International Competition on Graph Counting Algorithms has used length-constrained simple paths as a benchmark problem. Results showed complementary strengths among backtracking, dynamic-programming, and model-counting/#SAT approaches rather than one universally dominant method.

This supports two existing Pathfinder conclusions:

- path-family compilation/DP is highly structure dependent;
- heterogeneous exact/heuristic approaches can have real portfolio complementarity.

It does not imply that graph-counting competition solvers transfer directly to stateful Pathfinder mechanics.

---

## 8. New cross-topic vocabulary

### Exact interface
A boundary/context state proven sufficient to determine the future property being queried.

### Interface width
The size/complexity of the boundary information that must coexist. Often a stronger predictor of DP representational cost than total residual size.

### Representative family
A small set of partial states that collectively preserves all relevant future extension possibilities of a larger set.

### Restricted representation
An under-approximation: preserves only some true futures. Beam search is naturally interpreted this way.

### Relaxed representation
An over-approximation: may add spurious futures but preserves every true one, allowing safe negative conclusions when the relaxation itself fails.

### Representation gap
The difference between restricted and relaxed capability. Conceptually, this is uncertainty about the true future space rather than merely heuristic-score uncertainty.

---

## 9. Pathfinder-facing research implications, not implementation instructions

These results sharpen existing ranked questions rather than create a new solver rewrite.

**Beam:** descriptor-aware survivor selection can be reframed as approximating a representative family over future interfaces, rather than maximizing pairwise diversity.

**Exact/reference:** a reduced frontier/DD formulation could serve as an oracle or counterexample generator where a small interface exists, but no broad compiler is justified by literature alone.

**Memoization:** low full-state recurrence does not close context-equivalent residual caching if a future-sufficient interface is independently proved. Approximate interfaces remain unsafe for exact caching.

**Repair:** repair-window boundaries can be viewed as interfaces; narrow interfaces may make exact/DP reconstruction attractive even when rollback distance is large.

**Residual difficulty:** interface width becomes a candidate offline structural label alongside basin width and backdoor depth.

---

## 10. What this literature does not establish

It does not establish that:

- Pathfinder residuals usually have small frontier/pathwidth;
- a useful exact interface can be updated cheaply online;
- representative-set algebra extends directly to Pathfinder's stateful/exact-intersection semantics;
- a ZDD/DD representation would outperform the existing heuristic solver;
- a relaxed DD formulation for Pathfinder is obvious or cheap;
- width-bounded DD machinery should replace beam search.

Those are project-specific empirical/modeling questions.

---

## Selected sources

- Jun Kawahara, **ZDDs and Frontier-Based Search for Solving Combinatorial Problems** (2025), DOI `10.1007/978-981-96-0668-9_3`.
- Kawahara frontier reference implementation: `github.com/junkawahara/frontier`.
- Marek Cygan et al., **Solving Connectivity Problems Parameterized by Treewidth in Single Exponential Time** (Cut&Count, FOCS 2011).
- Hans L. Bodlaender, Marek Cygan, Stefan Kratsch, Jesper Nederlof, **Deterministic Single Exponential Time Algorithms for Connectivity Problems Parameterized by Treewidth** / weighted-counting variants.
- Stefan Fafianie, Hans L. Bodlaender, Jesper Nederlof, **Speeding up Dynamic Programming with Representative Sets**.
- David Bergman, Andre A. Cire, Willem-Jan van Hoeve, John Hooker, **Decision Diagrams for Optimization** (Springer, 2016).
- Bergman et al., **Discrete Optimization with Decision Diagrams**, INFORMS Journal on Computing 28(1), 2016, DOI `10.1287/ijoc.2015.0648`.

## Bottom line

Frontier/ZDD and DD research turns the residual-interface hypothesis into a mature hierarchy of representations:

`exact context -> representative family -> restricted under-approximation / relaxed over-approximation`.

The deepest new lesson for Pathfinder is that finite-width search quality can be understood as a **set-preservation problem over future extensions**, while feasibility bounds can use a dual relaxed representation. Interface width/order determines whether these representations stay tractable.
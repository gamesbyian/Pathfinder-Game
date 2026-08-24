# Structured Sequence Repair and Narrow-Residual Reconstruction

## Core decomposition

Repair success has two distinct gates:

1. **Neighborhood reachability:** did the repair operation reopen every commitment that must change for some feasible solution to exist?
2. **Residual reconstructability:** given that a solution exists inside the neighborhood, can the chosen reconstruction process actually find it within budget?

A useful conceptual factorization is:

`P(success) = P(solution lies in neighborhood) * P(reconstructor finds one | solution lies in neighborhood)`.

This is not an independence claim. It is a diagnostic decomposition.

## Repair beyond routing ALNS

The most relevant external literature is broader than remove/reinsert routing.

### Plan repair: unrefinement + refinement
Automated-planning research explicitly treats repair as two activities: remove obstructing actions/orderings/constraints, then refine the resulting partial plan. Failure during refinement can trigger further unrefinement.

This maps naturally to “reopen more structure only when the preserved structure is proven or strongly suspected to block repair.”

### Repair windows
Planning systems also isolate a flawed **window** of the plan and solve that portion as a smaller planning problem. If no repair exists, the window expands; in the limit this degenerates to replanning from scratch.

This is an important precedent for adaptive repair scope and for the fact that local repair may be as hard as full solve when the true dependency crosses the chosen window.

### Plan deordering / dependency extraction
Numeric-resource plan-repair work uses causal, ordering, threat, and resource dependencies to derive more independent substructures and macro actions. The general lesson is that sequential adjacency is not the same as causal dependency.

### Constraint-based repair
CSP/SAT/MIP repair, diagnosis, local branching, fix-and-optimize and relaxation methods preserve most assignments while reopening a subset chosen by conflicts, distance, or structure. Exact residual solving cleanly separates “neighborhood has no solution” from “heuristic repair missed it.”

### Path/trajectory rerouting
Graph/path replanning and trajectory repair commonly preserve unaffected prefix/suffix structure and reconnect through a changed region. Transfer is strongest where the repaired object exposes stable interfaces; continuous motion-planning results transfer less directly to discrete exact-resource paths.

## What should define a repair neighborhood?

External precedent favors **dependency units**, not one universal geometric unit.

Useful neighborhood bases include:
- contiguous sequence windows when dependencies are mostly local;
- causal-link/threat clusters in planning;
- constraint-incidence/conflict components;
- resource-coupled decisions;
- graph regions bounded by small interfaces/separators;
- minimal correction sets or unsat-core-related commitments;
- ejection chains where relaxing one decision forces a cascade of linked changes.

The recurring principle is:

> Reopen decisions that interact through the constraints responsible for infeasibility, even when they are distant in the sequence or geometry.

## Effective neighborhood size

Nominal size counts reopened variables/actions. Effective size asks how much genuine freedom remains after propagation and frozen context.

External proxies include:
- residual domain sizes;
- number/fraction of forced variables after propagation;
- conditional model count or solution entropy;
- viable branching factor;
- residual treewidth/induced width;
- separator/interface size;
- number of unfixed degrees of freedom;
- discrepancy radius from the preserved candidate.

There is no universal scalar “effective size.” The strongest theoretical quantities are residual solution count and structural width; cheaper proxies are domain/propagation summaries.

## Neighborhood reachability

A repair neighborhood contains a solution iff the original constraints plus all preserved commitments are satisfiable.

This connects to:
- nearest-solution / bounded edit-distance problems;
- local branching;
- discrepancy neighborhoods;
- minimal correction subsets;
- diagnosis;
- unsat cores/MUSes;
- backdoors and parameterized repair.

A certificate that the neighborhood is too small is simply an infeasibility proof under the frozen commitments. A conflict/core can additionally identify which preserved assumptions participate in the impossibility.

Finding a minimum set of commitments to relax is generally hard. Subset-minimal correction sets are cheaper than minimum-cardinality repair sets; the latter can require optimization over many alternatives.

## Narrow but feasible residuals

A feasible residual can still be hostile to heuristic reconstruction.

Characteristics associated with narrowness include:
- small conditional solution count;
- high backbone/frozen fraction;
- strong propagation that forces many decisions;
- long forced-choice chains;
- low viable branching;
- small separator/interface with strong coupling across it;
- high residual treewidth despite small nominal neighborhood;
- large discrepancy from the heuristic reconstruction policy;
- clustered solutions reachable only through narrow gateways.

Raw solution count is insufficient: many solutions can be hidden behind a deceptive or low-probability gateway, while one solution can be easy if propagation forces it.

## Can reconstructability be estimated before full repair?

External fields use several forms of cheap probing:
- propagation and domain reduction;
- limited lookahead;
- strong-branching/pseudocost-style probes;
- sampled/randomized short continuations;
- conflict counts;
- relaxation quality;
- approximate counts/entropy;
- residual graph/treewidth/interface estimates.

These are predictors, not proofs of search difficulty. Their value is application dependent.

## Reconstruction paradigms by residual structure

### CP/SAT/SMT completion
Strong when the reopened residual has tight interacting constraints and propagation can expose forced structure. Exact within the encoded neighborhood; cost can jump sharply near hard SAT/UNSAT boundaries.

### MIP local branching / fix-and-optimize
Useful when decisions and resource equations have strong linear formulations. Hamming-radius/local-branch constraints bound change from the incumbent. Weak relaxations can make exact combinatorial paths expensive.

### Limited discrepancy search
Attractive when the incumbent/default heuristic is mostly right and a solution differs in only a few important branch choices. It is poorly matched when the required repair is structurally distant.

### Beam/bounded heuristic search
Useful when several plausible completions should be retained but exact solving is too costly. It remains vulnerable to narrow gateways and heuristic mis-ranking.

### AND/OR search / context caching
Strong when the residual constraint graph decomposes and subproblems share small contexts. Complexity is governed by induced width rather than sequence length alone.

### Separator/treewidth DP
Excellent when a residual has small treewidth/pathwidth or interface size; exact but exponential in width.

### Meet-in-the-middle / bidirectional completion
Useful when forward and backward state summaries can be made compatible and the join interface is manageable. Stateful/directional mechanics can make reverse representation expensive.

### Bounded decision diagrams
Can compactly enumerate a repair neighborhood, support counting, and expose exact feasible residuals when width remains controlled. Worst-case width is exponential.

### Ejection chains / compound moves
Effective where one repair displaces a resource/commitment and a predictable chain restores feasibility. They encode dependency structure directly but require domain-specific move semantics.

## Complementary repair operators

Adaptive selection is justified only when operators are meaningfully complementary.

Evidence of complementarity includes:
- nontrivial exclusive successes;
- different success regions conditional on structural state;
- low or structured outcome correlation;
- positive marginal portfolio contribution after accounting for cost;
- phase-dependent usefulness;
- one operator succeeding on neighborhoods/residuals where another systematically fails.

A globally dominant operator makes adaptation unnecessary. Different mean success rates alone do not establish complementarity.

Adaptive operator selection also faces nonstationarity: operator calls change the incumbent and therefore change later reward distributions. Per-call reward can overfavor cheap operators; progress/value should be normalized by work when costs differ.

## Complexity boundaries

- General planning and plan repair can be as hard as replanning; preserving an incumbent does not guarantee an easier problem.
- Nearest-solution and bounded-edit feasibility are NP-hard in many CSP/planning formulations.
- Minimum correction/minimum repair is generally harder than finding any repair.
- Conditional solution counting is #P-hard in general.
- Exact residual solving remains exponential unless parameters such as edit distance, resource bounds, treewidth or separator size are small.

## Diagnostic taxonomy

Repair failure can be separated into:

1. **wrong neighborhood:** every feasible solution changes a preserved commitment;
2. **narrow residual:** solution exists but the feasible continuation set is tiny/brittle;
3. **reconstructor mismatch:** another method could exploit the same neighborhood much better;
4. **budget shortage:** the chosen method is appropriate but truncated too early;
5. **stochastic miss:** adequate method and neighborhood, but random sampling failed.

Terminal failure alone cannot distinguish these.

## Bottom line

The strongest expansion beyond routing ALNS is automated **plan repair**: unrefinement/refinement, repair windows, causal/resource dependency extraction, and exact residual planning provide a closer conceptual match to stateful sequential repair.

The deepest recurring distinction is still **reachability versus reconstructability**. Dependency/core/interface structure tells us what must reopen; propagation, solution-space geometry and residual width tell us how hard it is to rebuild. Adaptive operator selection becomes sensible only after distinct operators are shown to cover different residual regimes.
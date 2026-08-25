# Exact Attainability and Upper Residual Capacity

## Core question

For exact-resource search, the right object is not merely a lower/upper interval. For state `s`, define an attainable continuation set

`R(s) = { r : some legal completion from s consumes exactly resource vector r }`.

A target can satisfy `LB <= target <= UB` and still be impossible because the target lies in a hole of `R(s)`.

## Exact attainable-resource representations

### Bitset / pseudo-polynomial DP

For one modest nonnegative integer resource, an exact DP can represent attainable totals as a bitset. Transitions shift/OR reachable totals **only when the DP state already contains every graph/mechanic dependency needed for correctness**.

This is not ordinary subset-sum over path edges: path legality couples choices. The bitset is compact only after a sound state decomposition exists.

Strengths:
- exact membership for bounded integer targets;
- cheap bit operations once a suitable DP decomposition exists;
- natural truncation at the target.

Limits:
- pseudo-polynomial in resource range;
- graph/history state may dominate cost;
- multidimensional bitsets grow as the product of resource ranges.

### Residue/congruence sets

Parity and modulo-`k` reachable-residue sets are safe relaxations when derived from a relaxation that contains every legal completion.

They preserve arithmetic holes while discarding exact magnitudes. A target residue absent from the relaxed residue set is impossible. Residue sets are often dramatically cheaper than exact spectra.

Useful forms include:
- parity;
- a small set of residues modulo `k`;
- gcd/lattice constraints;
- intersections of several small moduli.

### Unions of intervals / arithmetic progressions

Some finite-state or eventually periodic resource systems admit compact descriptions as unions of intervals or arithmetic progressions. Semilinear/Presburger and Parikh-image theory explains why such periodic structure appears in finite-state/counting models.

Important caveat: rich simple-path/history constraints may require enormous state augmentation before these results apply. Semilinearity is theoretical support for periodic summaries, not a general cheap solver primitive.

### Decision diagrams / automata

BDD/MDD/ZDD and weighted/finite automata can compactly represent feasible combinations when the residual constraint structure has exploitable regularity. Once compiled, membership, counting, projection, and conditional queries may be cheap.

Compilation can itself be exponential. These are strongest for bounded interfaces, repeated queries, or oracle/diagnostic use.

### Meet-in-the-middle

Exact-resource completions can sometimes be split into two partial searches whose resource summaries are joined. This replaces full-depth enumeration with two frontier sets, but compatibility joins can still dominate and stateful mechanics complicate reversal.

It is a structural technique, not a guaranteed square-root reduction.

## Equality-resource dominance

Ordinary RCSP dominance such as “uses no more of every resource” is generally unsafe when totals must be exact.

Let `C(s)` be the set of valid continuation outcomes from state `s`. A safe target-relative dominance relation requires that every target-compatible continuation available from `B` can be matched by one from `A` under the state mapping.

A sufficient abstract condition is:

`R_target(B) subseteq R_target(A)`

plus preservation of all non-resource continuation constraints.

For full future dominance, require continuation-language inclusion, not merely resource-set inclusion.

Cheap scalar dominance is valid only when additional monotonicity/substitutability assumptions are proved. Less consumed resource is not intrinsically better under equality constraints.

## Upper residual capacity

The dual of a minimum completion bound is a sound upper bound `UB(s)` on how much additional legal resource can still be consumed. If remaining target exceeds `UB(s)`, completion is impossible.

### Cheap structural bounds

**Reachable component size.** Immediate but often weak: a simple completion cannot use more residual vertices than the relevant reachable region permits.

**Bipartite/color bounds.** On bipartite graphs, any simple path alternates colors. Endpoint colors and residual color-class imbalance bound how many vertices can coexist on one path. This can be strictly tighter than component size.

**Degree/end-point constraints.** Vertices that cannot acquire the required path degree, or sets forcing too many endpoints, can exclude capacity.

**Articulation/bridge/block structure.** Reachability overcounts vertices when a single completion cannot visit several branches separated by an articulation or bridge and still satisfy endpoint/order constraints. Block-cut decomposition can therefore produce compositional upper bounds stronger than raw component size.

**Separator/cut capacity.** If several residual regions or obligations require crossings through a small interface, traversal/revisit limits can bound how many regions or resources one completion can service.

### Matching and path-cover relaxations

Matching deficiency, path-cover relaxations, cycle-cover/assignment relaxations, and related degree models can prove that too many residual vertices cannot be incorporated into a single admissible path. They are polynomial in some formulations and stronger than local degree checks, but translating their bound to stateful/revisiting walks requires care.

### Exclusion/incompatibility graphs

A useful synthesis is to build an auxiliary graph where two residual opportunities are adjacent when no valid completion may contain both. Any completion corresponds to an independent set, so an upper bound on independent-set size becomes an upper bound on usable opportunity.

Exact maximum independent set is NP-hard, but cheap relaxations/coloring bounds can still certify reduced capacity. The deeper principle is valuable: **capacity is about mutually compatible opportunity, not merely reachable opportunity**.

### Special-structure exact methods

Longest-path style reasoning becomes tractable on DAGs and can be fixed-parameter/polynomial on bounded-treewidth, cactus, series-parallel, or small-separator structures via dynamic programming. Treewidth/pathwidth and separator size can turn an otherwise hard upper-capacity problem into a manageable residual oracle.

### Expensive oracle-quality bounds

Exact longest simple path, Hamiltonian completion, MIP/CP/SAT formulations, or full residual DP provide strong bounds/proofs but are generally NP-hard. They are best understood as reference tools unless residual structure is deliberately bounded.

## Bounds plus spectra

A useful layered view is:

`LB(s) <= remaining_target <= UB(s)`

and

`remaining_target in R_hat(s)`

where `R_hat` is an exact or safe relaxed attainable set.

Intervals catch gross impossibility; residues/small spectra catch arithmetic holes; topology/capacity catches mutually incompatible future use. These sources of information are complementary.

## Multiple resources

For `(length, intersections, ...)`, exact attainable sets become multidimensional. Pareto/resource-label sets, multidimensional bitsets, generating functions, decision diagrams, and lattice/residue projections all exist, but dimensionality is the principal barrier.

Practical compression usually means projection:
- exact treatment of one small resource;
- coarse residues/intervals for others;
- selected joint pairs rather than a full tensor;
- bounded interface/state decomposition.

Any projection used as a hard proof must be one-sided in the correct direction.

## Stateful mechanics

Finite mechanic state can be folded into product-graph nodes and the same resource machinery applied there. Correctness is straightforward if augmented state captures every future-relevant dependency; state explosion is the cost.

Automata minimization, quotienting, separator interfaces, or abstractions can reduce the product only when their future-preservation conditions are established.

## Complexity boundaries

- Exact simple/longest path is NP-hard in general.
- Exact multidimensional resource spectra may be exponential.
- Single-resource bounded-integer DP can be pseudo-polynomial.
- Counting completions is generally #P-hard in rich combinatorial settings.
- Semilinear/automata descriptions can be exponentially large even when they exist.
- Compact dominance capable of deciding general exact continuation inclusion would inherit hard reachability/equivalence problems.

Therefore the realistic target is a hierarchy of increasingly informative safe summaries, not a universally cheap exact continuation spectrum.

## Bottom line

The strongest transferable ideas are:

1. Treat exact feasibility as **membership in an attainable continuation set**, not interval slack.
2. Use parity/residue/lattice summaries as cheap safe information between scalar bounds and exact spectra.
3. Add **upper residual capacity** to the usual lower-bound viewpoint.
4. Exploit articulation, separators, color/degree structure, matching/path-cover relaxations, and mutual incompatibility to tighten capacity beyond reachability counts.
5. Define equality-resource dominance through **continuation-set inclusion**, never ordinary “less used is better” intuition.
6. Expect exact multidimensional representations to be expensive unless the residual problem has small resource ranges or small structural interfaces.
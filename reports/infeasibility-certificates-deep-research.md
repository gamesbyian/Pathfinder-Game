# Structural Infeasibility Certificates, Explanations, and Minimization

## Core vocabulary

A **detector** says a state appears or is known dead.
A **certificate** is a checkable proof object for infeasibility.
An **explanation** identifies commitments/constraints sufficient for that proof.
A **nogood** is a reusable forbidden condition implied by the model.

These are not interchangeable. A cheap detector may have no compact proof; a valid global proof may be a poor reusable explanation; a minimal conflict need not identify a unique causal mistake.

## Cheap structural certificates

### Connectivity and cuts
If current endpoint and required goal/obligation lie in different residual components, infeasibility is immediate. A cut/separator can be a compact witness.

Menger/max-flow formulations generalize this: if satisfying residual obligations requires more vertex/edge-disjoint passage capacity than a separator provides, the cut is a sound certificate.

With bounded revisits/crossings, cuts behave like finite-capacity interfaces: total required entries/exits across a separator can exceed allowed traversal capacity.

### Articulation, bridges, block structure
An articulation/bridge can certify that multiple residual regions cannot all be visited in one admissible path under endpoint/revisit constraints. Block-cut trees make these dependencies explicit.

These are sound only when the path/walk semantics used in the argument match the actual revisit and edge-use rules.

### Degree/end-point certificates
Simple/Hamiltonian path reasoning yields necessary degree conditions: too many vertices forced to degree 1, isolated required vertices, or incompatible endpoint obligations prove impossibility.

### Bipartite/parity certificates
Grid graphs are bipartite. Any simple path alternates color, giving endpoint/color-class count constraints. Exact length and some visit structures therefore admit parity/color-balance certificates.

### Matching/Hall witnesses
If residual obligations require assignment to distinct compatible resources/entries and a subset has fewer available neighbors than required, a Hall-deficient subset is a compact infeasibility certificate. Matching deficiency can similarly prove path-cover or assignment relaxations impossible.

These relaxations are incomplete for path existence but their failures are sound when the relaxation is necessary.

## Exact-resource certificates

For remaining target `r`:

- `r < LB` gives a lower-bound contradiction;
- `r > UB` gives an upper-capacity contradiction;
- absent parity/residue/gcd class gives an arithmetic certificate;
- absence from an exact/safe attainable-value set gives a nonattainment certificate.

A target can therefore be impossible even when `LB <= r <= UB`.

Bitset/DP/decision-diagram nonattainment may prove this exactly, but the full DP table is often larger than a useful explanation. Smaller explanations can sometimes be extracted as:
- a modular invariant;
- a small set of resource contributors/constraints;
- a cut/obligation interaction;
- an unsat core under assumptions.

There is no guarantee that every nonattainment proof has a tiny structural explanation.

## LP/MIP certificates

### Farkas certificates
For linear infeasibility, a dual multiplier vector can certify that a linear combination of constraints yields a contradiction. Verification is cheap once the ray is supplied.

### IIS / conflict refiners
An irreducible infeasible subsystem is infeasible and becomes feasible if any member is removed. In MIP practice, conflict refiners identify small conflicting subsets, but they need not be minimum-cardinality or unique.

### Benders feasibility cuts
A subproblem infeasibility proof can be projected into a cut over master decisions. Logic-based/combinatorial Benders extends the idea beyond linear duality: explain which high-level commitments make the subproblem impossible, then forbid/generalize that combination.

This is a strong external precedent for turning a residual infeasibility certificate into reusable structured pruning.

## SAT/SMT/CP explanations

### UNSAT cores
An unsat core is any subset of assumptions/clauses that is itself inconsistent. It need not be minimal.

### MUS
A **minimal unsatisfiable subset** is subset-minimal: removing any one member makes it satisfiable. This does not mean smallest cardinality.

### MCS / MSS
A **minimal correction set** is a subset whose removal restores satisfiability, with no proper subset sufficient. Its complement is a maximal satisfiable subset under the usual formulation.

MUSes and MCSes are linked by hitting-set duality.

### Learned clauses/nogoods
CDCL derives clauses implied by the original formula. LCG/CP explanation systems make propagator deductions explainable in a Boolean language so conflicts can be learned.

A learned reason is safe outside its discovery state only if it is logically implied under the scope in which it will later be applied. Merely projecting away inconvenient state fields is not sound.

### SMT theory lemmas
Arithmetic, difference logic and other theories can emit theory-valid conflict clauses/cores. Their usefulness depends on whether the path/state constraints are represented in a theory with informative explanations.

## Explanation minimization

### Deletion-based shrinking
Start with an inconsistent set and try removing each constraint. Simple, general, and often expensive in solver calls.

### QuickXplain / divide-and-conquer
Uses recursive consistency checks to find a subset-minimal conflict with fewer oracle calls on many instances. It returns a minimal conflict, not necessarily a minimum one.

### Hitting-set / MARCO-style enumeration
Alternates between satisfiable and unsatisfiable regions to enumerate MUSes/MCSes or optimize explanations. Powerful but potentially exponential because the number of cores can itself be exponential.

### Proof trimming / assumption cores
SAT/SMT solvers can derive a core from a proof/assumption interface and then shrink it. Fast first cores are often nonminimal.

### Weighted/minimum explanations
Finding a smallest or minimum-cost explanation is an optimization problem and can be much harder than finding any core. Weights can encode repair cost or interpretability but do not change the underlying hardness.

## Safe generalization

A dead exact state can be memoized under a sound complete state identity.

To generalize, let assumptions `A` describe selected commitments. A projected nogood over subset `A'` is sound only if

`Model entails not(all commitments in A')`.

Equivalently, the original constraints plus `A'` must themselves be unsatisfiable regardless of omitted variables.

This is existential projection/implicate reasoning. Dropping state fields because they “seem irrelevant” is unsafe unless unsatisfiability remains after the drop.

Useful generalizations often arise from:
- assumption-based unsat cores;
- cut/flow/matching witnesses;
- resource invariants;
- global-constraint explanations;
- Benders cuts;
- theory lemmas.

## Explanation quality

Smaller is not automatically better. Useful criteria include:
- verification/check cost;
- recurrence/generalization;
- propagation strength;
- subsumption of weaker reasons;
- work avoided when it fires;
- stability across nearby states;
- repair relevance;
- storage/lookup cost.

SAT measures such as LBD/activity are search-quality heuristics, not logical strength measures.

A MUS is a minimal contradictory set, not a causal attribution. Multiple incomparable MUSes may exist. Counterfactual repair questions are better represented by correction sets/diagnoses than by pretending one core is “the cause.”

## Incremental certification

Strong precedent exists for incremental maintenance:

- SAT/SMT assumptions permit repeated nearby solves while retaining learned clauses;
- CP propagators can emit explanations incrementally during backtracking;
- rollback/persistent graph data structures can maintain connectivity and some component information through DFS;
- dynamic/rollback union-find handles connectivity efficiently, though fully dynamic bridges/articulation structure is more complex;
- incremental matching/flow algorithms exist but may be too expensive for hot-loop use;
- bounded resource bitsets/residue summaries can often be updated incrementally when the decomposition supports local transitions.

Theoretical dynamic algorithms are not automatically practical inside a combinatorial search tree; rollback-friendly structures are often the more relevant implementation model.

## Certificate portfolio

Many solvers effectively use a cost-ordered cascade:

1. local arithmetic/degree/parity checks;
2. reachability/cut/resource bounds;
3. matching/flow/relaxation checks;
4. full CP/SAT/MIP residual proof.

A stronger certificate may subsume weaker ones, but explanations are generally a partial order: multiple incomparable reasons can prove the same state dead.

## Complexity boundaries

- Finding a solution may be NP-hard; proving UNSAT may require large proofs in a chosen proof system.
- MUS/MCS enumeration can be exponential.
- Minimum-cardinality/minimum-cost explanations are generally hard.
- General path/Hamiltonian infeasibility lacks a universal cheap structural certificate beyond incomplete necessary conditions.
- Projection/generalization of a conflict can be as hard as quantifier elimination or solving additional SAT/CP queries.
- Counting-based explanation quality is generally #P-hard.

Therefore “find the smallest reason this state is dead” can be substantially harder than detecting deadness.

## Bottom line

The strongest certificate families for constrained paths are:

1. connectivity/separator/cut-capacity witnesses;
2. degree, parity/color, matching/Hall and path-cover obstructions;
3. lower/upper/exact-resource nonattainment certificates;
4. assumption-based SAT/SMT/CP cores and global-constraint explanations;
5. Benders/IIS/Farkas-style projected infeasibility proofs where a suitable formulation exists.

For reusable search learning, the critical transition is from **proof of this state** to a smaller condition that is still logically sufficient for infeasibility. Core shrinking can help, but sound projection matters more than small size.
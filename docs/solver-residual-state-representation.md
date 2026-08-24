# Solver residual-state representation research

> **Role:** durable cross-cutting research reference for how Pathfinder should *reason about* unresolved futures. This is not a production architecture, implementation mandate, or ranked queue. Current priority remains [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md); research/promotion rules remain [`solver-research-operating-model.md`](solver-research-operating-model.md).

This document consolidates the external-literature concepts that now recur across beam retention, residual feasibility, exact/reference work, repair, learned failure, and later dynamic scheduling.

Primary evidence/synthesis:

- [`../reports/2026-08-24-external-research-pathfinder-synthesis.md`](../reports/2026-08-24-external-research-pathfinder-synthesis.md)
- [`../reports/2026-08-24-external-research-cross-pollination-audit.md`](../reports/2026-08-24-external-research-cross-pollination-audit.md)
- [`../reports/frontier-zdd-decision-diagrams-deep-research.md`](../reports/frontier-zdd-decision-diagrams-deep-research.md)
- [`../reports/automaton-resource-global-constraints-deep-research.md`](../reports/automaton-resource-global-constraints-deep-research.md)
- [`../reports/abstraction-refinement-backdoors-core-guided-deep-research.md`](../reports/abstraction-refinement-backdoors-core-guided-deep-research.md)
- earlier feasibility/equivalence/certificate/repair reports indexed in [`../reports/README.md`](../reports/README.md)

## Central object: the unresolved future

For a partial solver state `s`, the strongest conceptual object is its continuation set/language:

`C(s) = all legal target-compatible completions/outcomes from s`.

For exact resources, also consider:

`R(s) = resource vectors achievable by legal completions from s`.

These exact objects are usually too expensive to materialize. The research problem is therefore to retain or infer **just enough future-relevant information** for a stated role.

The current shared hypothesis is:

> **Residual interface:** the smallest boundary/context through which the committed past can still affect the unresolved future.

Possible fields can include endpoint/boundary occupancy, finite mechanic state, outstanding obligations, exact-resource state, residual connectivity across a separator, and any history required by future legality.

Do not assume this interface is small. Do not assume a useful predictive signature is an exact interface.

## Four rigor levels

The same-looking descriptor can have radically different guarantees.

### 1. Exact/proof interface

A state summary `I(s)` is exact for a property only when equality or a proved relation on `I` is sufficient for the required future statement.

Strong form:

`I(A) = I(B) => C(A) = C(B)`

for the modeled continuation property.

Uses:

- exact context caching/memoization;
- sound duplicate/state merging;
- separator/frontier dynamic programming;
- exact decision diagrams;
- exact residual decomposition.

Approximate similarity is not enough.

### 2. Safe relaxed interface

A relaxed state intentionally represents a **superset** of true futures.

If `C(s) ⊆ C_relaxed(I(s))`, then:

- relaxed infeasible => true infeasible;
- relaxed feasible does not prove true feasibility.

Uses:

- admissible lower/upper bounds;
- exact-resource impossibility checks;
- relaxed decision diagrams;
- automaton/resource relaxations;
- structural cut/capacity relaxations.

### 3. Restricted/representative future set

A finite-width search often represents only **some** real futures.

A restricted representation obeys:

`C_restricted ⊆ C_true`.

A found solution is real; failure is not proof of true infeasibility.

Beam search naturally belongs here.

A stronger set-level target is a **representative family**: a retained subset that collectively preserves every relevant future extension of a larger family even when no pairwise dominance relation exists.

### 4. Predictive/diagnostic abstraction

A descriptor may correlate with liveness, basin width, repair difficulty, or algorithm value without any proof guarantee.

Uses:

- beam ranking/coverage;
- repair-regime diagnosis;
- heuristic opportunity scores;
- later scheduler telemetry;
- offline analysis.

No predictive abstraction may silently become a hard prune or exact cache key.

## Restricted versus relaxed bracketing

Decision-diagram research supplies a useful dual:

`restricted futures ⊆ true futures ⊆ relaxed futures`.

Interpretation:

- **restricted:** finite-width search has thrown some real futures away;
- **relaxed:** abstraction has added fake futures to remain cheap/safe;
- **exact:** true residual future space.

This creates two complementary questions:

1. what real capability did finite-width restriction lose?
2. what fake capability does the relaxation still permit?

If a restricted representation finds a completion, it is constructive evidence. If a sound relaxed representation cannot complete, it is negative proof. The gap is unresolved future uncertainty.

Do not infer that Pathfinder should literally maintain two DDs. This is a research model for reasoning about beam loss versus feasibility relaxation.

## Frontier/context state

Frontier-based ZDD and bounded-width graph DP give the strongest constructive example of an exact residual interface.

Process a graph through a frontier separating processed from unprocessed structure. The state records only boundary facts that the unresolved graph can observe, such as:

- partial degree;
- component/connectivity partition;
- endpoint status;
- finite labels/resources required by the problem.

Interior history disappears once it can no longer influence future completion.

The key structural parameter is **interface/frontier width**, strongly related to pathwidth/treewidth/vertex separation and ordering.

A residual can therefore be large but representation-friendly if it has a narrow boundary; a smaller broad residual can be difficult.

### Ordering matters

The decomposition/order determines which variables/vertices must coexist on the interface. “Find the right state summary” and “find a good processing/decomposition order” are coupled problems.

This is an important transfer guardrail for any future frontier/DP experiment.

## Representative families and beam retention

Beam diversity should not be confused with visual/history diversity.

Portfolio and representative-set research suggest a stronger set-valued objective:

> retain states for their **marginal future extension capability** not already covered by the survivor set.

Representative-set theory proves this property for certain bounded-width connectivity DPs: a reduced table can collectively preserve all relevant extensions of a much larger one.

Pathfinder does not currently possess the algebra/proof required for such a guarantee. But this gives a rigorous target for interpreting A/D beam extinction:

- duplicated future capability wastes width;
- a lower-score survivor can be valuable if it preserves an otherwise absent future class;
- pairwise distance is secondary to set-level extension coverage.

Current beam gates remain in [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).

## Interface width, basin width, and backdoor depth are different

Three distinct structural quantities now matter conceptually.

### Interface width

How much boundary/context information must remain simultaneously visible to represent the unresolved problem.

Relevant to:
- DP/DD/ZDD state explosion;
- decomposition;
- exact context caching;
- repair-window interfaces.

### Basin width

How much feasible continuation mass/flexibility exists behind a state.

Possible proxies:
- solution count/entropy;
- viable branching;
- forced-choice fraction;
- local solution density;
- backbone/frozen structure.

A wide basin is not necessarily structurally easy.

### Backdoor depth

How many **adaptive hard decisions** are required before the residual falls into a tractable class.

A problem may have large conventional backdoor size but shallow backdoor depth because different branches require different critical variables.

This introduces **distance to tractability** as a third axis of reconstructability/search difficulty.

Do not collapse these three into one “complexity” score without evidence.

## Finite-state mechanics plus exact resources

`REGULAR`, `COST-REGULAR`, `MULTICOST-REGULAR`, counter automata, and Parikh-automata research supply a middle layer between scalar bounds and full exact solving.

When part of residual legality is genuinely finite-state:

- unfold mechanic state across sequence positions;
- propagate forward/backward reachability;
- compute shortest/longest resource opportunity;
- combine multiple resources through safe relaxations when full consistency is NP-hard;
- ask target membership directly rather than always materializing the full attainable spectrum.

Important hierarchy:

1. scalar lower/upper bounds;
2. joint finite-state/resource relaxation;
3. small exact resource DP/bitset/DD;
4. full exact residual solve.

Exact equality is a major hardness boundary. The existence of NP-hard full propagation does not imply that useful incomplete one-sided propagation is impossible.

### Finite-state versus history-sensitive reuse

Separate:

- mechanic/order state that can live in a compact automaton/product node;
- integer resource counters;
- path reuse/elementarity/history that may require explicit graph/interface state.

Regular-walk tractability does not transfer automatically to simple/trail/bounded-reuse paths.

## Solution density as predictive future mass

Automaton/global-constraint DPs can count accepting completions through each candidate assignment.

A constraint-level density such as

`rho(move | abstraction) = accepting abstract completions using move / all accepting abstract completions`

can estimate how much **abstract feasible mass** supports a decision.

This is richer than counting legal successors, but it is not global completion probability unless the abstraction is exact.

Potential roles:

- offline basin-width descriptor;
- beam/ranking signal;
- repair diagnostic;
- later dynamic scheduler telemetry.

No hard prune follows from a density estimate alone.

## Discovering the interface: CEGAR and interpolation

A future interface need not be designed completely in advance.

### CEGAR loop

1. begin with a coarse abstraction;
2. find an abstract continuation/plan;
3. concretize/check it;
4. if spurious, determine the missing distinction;
5. refine only that distinction;
6. repeat until the abstraction is adequate for its role or resource budget.

This provides a disciplined alternative to broad feature shopping.

### Exact/reference role

Pathfinder's reference model can potentially do more than label one prefix live/dead. For a proposed signature `I`, it can search for a **distinguishing counterexample**:

> two states share `I`; does one have a valid continuation/property the other lacks?

One counterexample falsifies exact sufficiency even though finite testing cannot prove universal equivalence.

### Interpolation

Proof/interpolation literature adds a more precise abstraction language. Given incompatible past/future formulas, an interpolant uses only shared vocabulary and can summarize a boundary predicate sufficient to rule out the false future.

This is especially attractive as an offline source of candidate interface predicates or learned reasons. It is not automatically a cheap runtime feature.

## Failure explanations and repair unrefinement

The same exact residual failure can support multiple roles.

- **UNSAT core:** assumptions sufficient for contradiction.
- **MUS:** subset-minimal conflict.
- **MCS/diagnosis:** assumptions whose removal restores satisfiability.
- **interpolant:** shared-boundary predicate ruling out the false future.
- **CEGAR refinement:** state distinction to add to the abstraction.

This gives a clean bridge between learned failure and repair:

> a proof can say both **why this frozen neighborhood is impossible** and **which commitments might need reopening**.

Do not mistake one core for a unique cause or an MUS for a minimum repair.

## Context-equivalent caching

Full-state DFS recurrence has already been measured as weak and remains closed as a broad optimization direction.

A different future question exists only if a compact interface is independently shown to be exact/future-sufficient:

`I(A)=I(B) => C(A)=C(B)`.

Only then may different histories share an exact residual result keyed by `I`.

This is **not** permission to revive loose transposition signatures. Approximate/predictive interfaces cannot back exact caching.

## Symmetry as a representation-quality audit

Every descriptor claimed to encode intrinsic residual structure should declare how it transforms under exact puzzle symmetries.

Typical expectations:

- scalar capacities/counts: invariant;
- directional boundary fields: equivariant;
- connectivity partitions: transformed consistently under the geometry mapping;
- random/canonical IDs: should not inject arbitrary orientation dependence into structural identity.

This does not require every finite-budget search trace to be symmetric. It is a check that the representation itself is not accidentally encoding coordinate convention.

See [`variant-level-research.md`](variant-level-research.md).

## Relation to the scheduler

Residual representation work is not a reason to jump to a dynamic scheduler.

If simple static scheduling later leaves held-out headroom, cheap telemetry derived from:

- basin/solution density;
- interface width;
- forced-choice structure;
- conflict/certificate class;
- distance-to-tractability/backdoor proxies

could become Generation-B continuation-value features.

They first need independent predictive value at matched work. See [`solver-scheduling-policy.md`](solver-scheduling-policy.md).

## Research gates

### Candidate exact interface

Promote toward exact context use only if:

- every future-relevant state field is identified/proved;
- reference/counterexample search fails to find distinctions on a broad adversarial suite;
- a formal/model argument establishes the intended scope;
- recurrence or decomposition opportunity is large enough to repay representation cost.

### Candidate relaxed interface/propagator

Promote toward hard pruning only if:

- relaxation direction is explicit;
- rejecting the relaxation logically implies true infeasibility;
- it adds information beyond existing prunes;
- check/update cost is below avoided work.

### Candidate predictive interface

Promote toward ranking/retention/repair only if:

- it separates exact outcomes or future coverage beyond current score/state;
- it survives unrelated parents/held-out confirmation;
- symmetry expectations are satisfied or intentional exceptions explained;
- cold solve/work improves under a simple treatment.

### Candidate representative-set/beam idea

Do not escalate to complex subset optimization until a simple descriptor-aware reserve/quota demonstrates future-coverage information beyond random reserve and width increase.

### Candidate CEGAR/refinement work

Use exact counterexamples to refine a **specific** candidate abstraction. Do not build a general abstraction-refinement framework before one coarse abstraction has demonstrated value and concrete counterexamples repeatedly identify compact missing distinctions.

## Explicit non-actions

This literature does not currently justify:

- a full ZDD/Graphillion/TdZdd production rewrite;
- a general decision-diagram engine;
- replacing beam with restricted DD machinery;
- maintaining exact multidimensional resource spectra in the hot loop;
- implementing generic `MULTICOST-REGULAR` machinery before a bounded finite-state subproblem earns it;
- automatic online CEGAR;
- interpolation infrastructure before exact failures demonstrate useful compact boundary predicates;
- backdoor detection framework before a plausible tractable residual class is identified;
- context caching from an approximate interface;
- MCS-guided destroy policies before offline core/diagnosis evidence proves useful.

## Bottom line

The external literature now supports a much more precise research picture:

- **frontier state** shows what an exact future interface can look like;
- **representative families** show that set-level future preservation is stronger than pairwise diversity;
- **restricted/relaxed DDs** bracket the true future space from below and above;
- **automaton/resource propagators** provide a middle layer between scalar bounds and full exact solving;
- **solution density** estimates local future mass;
- **CEGAR/interpolation** show how abstractions can be refined from exact counterexamples;
- **backdoor depth** measures adaptive distance to tractability;
- **cores/MCSs** connect failure explanation to repair unrefinement.

The unresolved Pathfinder question is no longer “what concepts exist?” It is whether the project's residual states exhibit enough small-interface, representative, propagatable, or shallow-backdoor structure for any of these concepts to pay rent.
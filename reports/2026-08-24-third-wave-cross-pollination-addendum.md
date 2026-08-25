# Third-wave external research cross-pollination addendum

> **Status:** superseded
> **Last evidence:** 2026-08-24 — final external-research synthesis and durable residual-state representation reference incorporated the third-wave concepts
> **Decision:** retain this file as the provenance record for the final three reviews, but use [`2026-08-24-external-research-pathfinder-synthesis.md`](2026-08-24-external-research-pathfinder-synthesis.md), [`../docs/solver-residual-state-representation.md`](../docs/solver-residual-state-representation.md), and the current queue for decisions.
> **Remaining gate:** none
> **Evidence role:** discovery
> **Selection:** observational

## Third-wave sources

The final literature wave added:

- frontier/ZDD/decision diagrams: exact frontier interfaces, representative families, restricted/relaxed DDs;
- automaton/resource global constraints: `REGULAR`, `COST-REGULAR`, `MULTICOST-REGULAR`, exact counting, solution density, Parikh/resource propagation;
- abstraction/refinement/backdoors/core-guided reasoning: CEGAR, interpolation, backdoor depth, UNSAT cores and correction/diagnosis sets.

These reviews strengthened the representation theory around the existing queue. They did not create a new top-level implementation project.

## Durable transfers

### Representative families sharpen beam's target

Pairwise diversity is not the ideal object. In exact bounded-width connectivity DP, a reduced **set** can collectively preserve all relevant future extensions of a larger set.

Pathfinder does not currently have the algebra or exact interface needed for such a guarantee. The useful transfer is conceptual: beam survivor quality should be interpreted as set-level future-extension coverage, not maximal pairwise distance.

### Restricted and relaxed future spaces form a useful dual

Conceptually:

`restricted futures ⊆ true futures ⊆ relaxed futures`.

- restricted success gives a true witness;
- restricted failure is inconclusive;
- sound relaxed failure can prove true impossibility;
- relaxed success is inconclusive.

This unifies finite-width beam loss and safe residual feasibility relaxation without implying that production should maintain decision diagrams.

### Exact interfaces need both sufficiency and economy

Even a logically sufficient residual interface is useless for caching/DP if its width or state count explodes.

Any exact-context proposal therefore needs two gates:

1. semantic sufficiency;
2. representational economy/recurrence.

### Repair windows are frontier boundaries viewed from the other side

A frontier summarizes what the unresolved side needs from processed structure. A repair interface summarizes what a reopened region needs from frozen structure.

Repair difficulty therefore depends on interface complexity as well as rollback distance.

### Finite-state mechanics + exact resources form a middle layer

Global-constraint work shows a useful space between scalar bounds and full CP-SAT:

`finite-state semantics + exact counters + safe/incomplete propagation`.

Full exact propagation may be hard while target-specific or one-sided propagation remains useful.

### Target membership can be cheaper than full attainable spectra

For many residual questions the useful query is not “materialize every attainable vector” but:

`does the attainable set intersect the exact target condition?`

That is a distinct future research option for bounded finite-state/resource subproblems.

### Solution density is abstract future mass, not completion probability

Constraint-level counting can estimate how much abstract feasible mass supports a decision. This can be an offline beam/repair diagnostic, but it is not whole-puzzle completion probability unless the abstraction is exact.

### CEGAR gives a disciplined way to discover missing state distinctions

A future signature can begin deliberately coarse:

`coarse abstraction -> spurious equivalence/future -> exact counterexample -> add the missing distinction`.

The reference model can falsify overcoarse abstractions by finding live/dead or otherwise future-distinct states that the abstraction merges.

Finite testing can falsify sufficiency; it cannot prove universal sufficiency without a formal argument.

### Cores/MCS and backdoor depth separate repair failure types

- cores diagnose frozen assumptions sufficient for contradiction;
- correction/diagnosis sets ask what must be reopened;
- backdoor depth asks how many adaptive hard decisions remain before the residual reaches a tractable class.

These are different from nominal neighborhood size and basin width.

## Representation hierarchy retained in durable docs

The final synthesis distinguishes:

| Representation | Guarantee | Typical role |
|---|---|---|
| exact context/interface | same context preserves exact queried future | exact DP/cache/merge |
| representative family | retained set preserves relevant extensions | idealized width reduction |
| restricted under-approximation | only real futures, not necessarily all | beam/constructive search |
| relaxed over-approximation | all real futures plus possible spurious ones | safe bounds/negative proof |
| predictive abstraction | empirical signal only | ranking/diagnosis/scheduling |

CEGAR is a refinement process, not a sixth guarantee class.

## Difficulty axes kept separate

The third wave reinforced that Pathfinder should not collapse these into one generic “difficulty” score:

- interface width;
- basin width;
- backdoor depth / distance to tractability;
- exact-resource opportunity/attainability.

## Explicit non-promotions

This literature did **not** justify:

- production TdZdd/Graphillion integration;
- replacing beam with DDs;
- representative-set machinery without a matching exact algebra;
- generic `REGULAR`/`MULTICOST-REGULAR` infrastructure;
- online CEGAR/interpolation;
- generic backdoor detection;
- approximate-interface exact caching;
- automatic core/MCS-driven repair.

## Supersession

The durable interpretation now lives in [`../docs/solver-residual-state-representation.md`](../docs/solver-residual-state-representation.md). The complete cross-wave conclusion is [`2026-08-24-external-research-pathfinder-synthesis.md`](2026-08-24-external-research-pathfinder-synthesis.md).

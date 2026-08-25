# Third-wave external research cross-pollination addendum

> **Status:** superseded
> **Last evidence:** 2026-08-25 — final external-research synthesis and durable residual-state representation reference incorporated the third-wave concepts; later cross-audit added four opportunistic reuse links without reopening this report as an authority
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

## Opportunistic reuse links added after the synthesis

These are not new top-level projects. They are cheap secondary questions to ask **only if** a bounded frontier/DD or other independent exact representation is already being built for a ranked reason.

### Frontier ordering can separate structural orientation effects from arbitrary representation bias

Orientation dependence has at least two very different sources:

- **structural orientation cost:** one geometric processing order produces a genuinely smaller frontier/interface width than another;
- **representation bias:** compass priority, coordinate order, tie-breaking, iteration order, or PRNG consumption favors one encoding for reasons unrelated to intrinsic residual structure.

A geometry-only frontier-width calculation chosen before solving is legitimate structural information. It can therefore serve as a control in symmetry/orientation audits: if rotated variants differ because their minimum geometric interface widths differ under a fixed processing scheme, that is a structural search-cost explanation; if widths are equivalent but finite-budget behavior still diverges, investigate representation-dependent ranking/retention/order instead.

Do not use solve outcome to choose the favorable orientation and then call the result structural.

### Dead exact frontier states can feed learned-certificate research

If an exact frontier/DD experiment already enumerates or rejects many dead residual interface states, preserve enough provenance to ask whether recurring dead interfaces expose compact sufficient failure reasons.

The economic pipeline is:

`exact dead residuals -> recurring projected reason candidate -> live-counterexample search / mathematical soundness proof -> cheap native checker`

This does **not** justify building a frontier engine to create training data for learning. It means already-paid exact dead-state populations may be reused by the existing learned-failure program instead of discarded.

### Exact continuation counts can become basin-width ground truth

If an exact bounded representation already supports counting, record continuation counts or coarse log-count bins for queried residuals where doing so is cheap.

Those counts can provide unusually strong offline labels for:

- live-but-narrow versus live-and-broad beam states;
- repair reconstructability/basin-width analysis;
- later evaluation of cheap predictive descriptors.

The count is exact only within the exact supported representation. For relaxed/restricted abstractions it must retain the appropriate under/over-approximation semantics. Do not promote exact continuation count directly into production ranking without held-out value and cost evidence.

### Independent exact representations can provide epistemic triangulation

A frontier/edge-based exact model can have research value even when it contributes no unique solve if its modeling failure modes differ materially from CP-SAT.

For high-value bounded labels, agreement among independently structured exact encodings plus canonical native referee validation gives stronger evidence than repeated agreement within one encoding family. Disagreement is especially valuable: treat it as a modeling/correctness investigation rather than selecting the convenient answer.

This is opportunistic triangulation, not a mandate to maintain two complete exact solvers or duplicate mechanic coverage.

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

The later opportunistic reuse links also do **not** justify building an exact representation solely to obtain symmetry diagnostics, dead-state populations, continuation counts, or triangulation evidence.

## Supersession

The durable interpretation now lives in [`../docs/solver-residual-state-representation.md`](../docs/solver-residual-state-representation.md). The complete cross-wave conclusion is [`2026-08-24-external-research-pathfinder-synthesis.md`](2026-08-24-external-research-pathfinder-synthesis.md).

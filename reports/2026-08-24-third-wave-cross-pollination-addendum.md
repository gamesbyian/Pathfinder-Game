# Third-wave external research cross-pollination addendum

**Date:** 2026-08-24  
**Role:** addendum to [`2026-08-24-external-research-cross-pollination-audit.md`](2026-08-24-external-research-cross-pollination-audit.md). The original audit covered the first eleven literature memos. This document records the nontrivial transfers introduced by the final three reviews without pretending the old 11×11 matrix was a 14×14 prespecified analysis.

Durable cross-cutting vocabulary lives in [`../docs/solver-residual-state-representation.md`](../docs/solver-residual-state-representation.md). Canonical execution priority remains [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md).

## Third-wave sources

- **Z** — [`frontier-zdd-decision-diagrams-deep-research.md`](frontier-zdd-decision-diagrams-deep-research.md): frontier/ZDD interfaces, representative sets, restricted/relaxed DDs.
- **G** — [`automaton-resource-global-constraints-deep-research.md`](automaton-resource-global-constraints-deep-research.md): `REGULAR`, `COST-REGULAR`, `MULTICOST-REGULAR`, exact counting, solution density, Parikh/resource propagation.
- **A3** — [`abstraction-refinement-backdoors-core-guided-deep-research.md`](abstraction-refinement-backdoors-core-guided-deep-research.md): CEGAR/interpolation, backdoors, cores/MCS diagnosis.

## Strong new transfers

### Z -> beam: representative families are a stronger target than pairwise diversity

The earlier beam/portfolio synthesis said a survivor can be valuable for marginal future coverage. Representative-set theory strengthens this from an analogy into a rigorous set-level concept in bounded-width connectivity DP.

A reduced family can collectively preserve every relevant future extension of a larger family even when no individual survivor pairwise-dominates every discarded state.

**Consequence:** the conceptual target for beam diversity is not maximal pairwise distance. It is **future-extension coverage by the retained set**.

**Guardrail:** Pathfinder currently lacks the algebra/exact interface required for representative-set guarantees. This sharpens interpretation of simple descriptor/reserve tests; it does not justify rank-based DP machinery.

### Z -> feasibility/reference: restricted and relaxed future spaces are dual

Restricted DDs under-approximate true futures; relaxed DDs over-approximate them:

`restricted ⊆ true ⊆ relaxed`.

This connects beam loss and feasibility relaxation within one framework.

- a restricted completion is a true witness;
- restricted failure is inconclusive;
- relaxed failure is a true impossibility proof if the relaxation direction is sound;
- relaxed success is inconclusive.

**Consequence:** future-opportunity research can explicitly ask whether an offline restricted representation and a sound relaxed representation bracket a difficult residual tightly enough to explain beam extinction or prove deadness.

**Guardrail:** this is a conceptual/oracle use first, not a mandate to construct production DDs.

### Z -> memoization: exact interface width determines whether context caching is plausible

Future-equivalence research already left open exact context-equivalent residual caching behind a strict sufficiency proof. Frontier DP adds the missing structural cost measure: even a logically sufficient interface can be useless if its width/number of connectivity states is too large.

**Consequence:** any future exact-context caching question now needs two gates:

1. **semantic sufficiency**: same interface truly means same queried future;
2. **representational economy/recurrence**: the interface is small/recurrent enough to beat full-state search cost.

### Z -> repair: repair windows and frontiers are the same boundary question from opposite sides

A frontier state summarizes everything the unresolved region needs to know about processed structure. A repair-window interface summarizes everything the reopened region needs to know about frozen structure.

**Consequence:** repair scope should be thought about in terms of **interface complexity**, not only rollback distance or number of reopened moves.

A large repair window behind a narrow interface can be structurally easier than a small window coupled to many external commitments.

### G -> feasibility: specialized global propagation fills the scalar-bound/exact-solver gap

The earlier feasibility work offered scalar bounds, spectra, relaxations, and CP as distinct ideas. `COST-REGULAR`/`MULTICOST-REGULAR` show a mature middle layer:

`finite-state semantics + exact counters + incomplete/safe propagation`.

**Consequence:** research should not assume the only choices are cheap hand bounds or full CP-SAT. A small finite-state/resource subproblem may admit stronger joint lower/upper/target-membership propagation.

### G -> exact attainability: membership can be cheaper than spectrum construction

The earlier attainable-resource memo naturally focused on representing `R(s)`. Parikh/resource propagation sharpens the practical query:

`Does R(s) intersect the one target condition we currently care about?`

**Consequence:** target-specific lazy membership reasoning becomes a distinct research option from building reusable full spectra/bitsets.

### G -> basin width/beam: solution density is local abstract future mass

Automaton/global-constraint DPs can count how many accepting continuations support each candidate value.

**Consequence:** basin-width work gains a middle-cost descriptor between legal-successor count and full model counting: **constraint-level solution density**.

**Guardrail:** density in a relaxation/global constraint is predictive only; it is not whole-puzzle completion probability.

### G -> learned failure: exact-count propagators can produce compact arithmetic reasons

Joint automaton/resource propagation can reject a decision because every accepting finite-state continuation lies outside an exact counter domain.

**Consequence:** these contradictions can supply compact reason vocabulary combining mechanic state and exact resources, stronger than a scalar parity/overflow explanation.

### A3 -> future equivalence: abstraction fields can be discovered by counterexample, not feature shopping

CEGAR adds a process to the future-signature problem:

`coarse signature -> spurious equivalence/future -> exact counterexample -> refinement`.

**Consequence:** once a candidate interface exists, the reference model can be used specifically to find pairs/states that the interface wrongly merges. Refinement should add only distinctions evidenced by counterexamples.

**Guardrail:** finite testing can falsify sufficiency, not prove universal sufficiency.

### A3 -> reference model: exact oracle becomes an abstraction-refinement instrument

Reference use expands beyond live/dead labels. One exact failure can generate:

- a distinguishing counterexample;
- an assumption core;
- a candidate correction set;
- potentially a proof/interpolant over shared boundary variables.

**Consequence:** the oracle can answer “what distinction/commitment matters?” rather than only “is this prefix live?” when its encoding/proof support permits.

### A3 -> repair: MCS/diagnosis and backdoors separate two kinds of structural difficulty

MCS/diagnosis asks what frozen assumptions must be relaxed to restore feasibility. Backdoor depth asks how many adaptive hard choices remain before the residual enters a tractable class.

**Consequence:** repair-hostile residuals can now be decomposed more precisely:

- wrong frozen commitments;
- high interface coupling;
- narrow basin;
- shallow-but-hard backdoor requiring a few critical choices;
- genuinely broad residual far from a tractable class.

This is a richer model than nominal neighborhood size.

### A3 -> scheduler: distance to tractability is a possible later dynamic signal

If different residual states become easy for different tractable classes/solver paradigms after a few critical decisions, backdoor/tractability structure could eventually help choose continuation actions.

**Guardrail:** this remains behind static scheduler headroom and the typed-telemetry gate. No tractable residual class has yet been demonstrated for Pathfinder.

## New three-way synthesis

### Preserve, overapproximate, refine

The three reviews create a useful cycle:

1. **restricted/representative search** tries to preserve real future capability under finite width;
2. **relaxed propagation** adds fake futures in a controlled direction to obtain safe bounds/impossibility tests;
3. **CEGAR/proof refinement** uses counterexamples to remove only the spurious distinctions/futures that matter.

This is more precise than treating all abstractions as one feature vector.

### Four state-space representations

The mature external vocabulary now distinguishes:

| Representation | Guarantee | Typical role |
|---|---|---|
| Exact context/interface | same context preserves the exact queried future | exact DP/cache/merge |
| Representative family | retained set collectively preserves relevant extensions | width reduction / survivor-set ideal |
| Restricted under-approximation | contains only true futures, but not all | beam / constructive search |
| Relaxed over-approximation | contains all true futures plus possibly spurious ones | bounds / safe negative proof |
| Predictive abstraction | no proof relation, only empirical signal | ranking/repair/scheduling |

CEGAR can refine any coarse representation when exact counterexamples expose an important missing distinction, subject to the role's soundness requirements.

### Three different notions of residual difficulty

The combined literature now supports keeping these separate:

1. **interface width:** how much information must cross the past/future boundary;
2. **basin width:** how much feasible continuation mass/flexibility exists;
3. **backdoor depth:** how many adaptive hard choices remain before reaching a tractable regime.

A fourth quantity, exact-resource slack/attainability, describes numerical opportunity rather than structural width.

Do not collapse these into one score without evidence.

## Explicit non-promotions

The third wave does **not** justify:

- production ZDD/Graphillion/TdZdd integration;
- replacing beam with a decision-diagram solver;
- rank-based representative-set machinery without a matching exact interface/algebra;
- generic `REGULAR`/`MULTICOST-REGULAR` infrastructure;
- global model-counting or density-guided production search;
- online CEGAR/interpolation;
- backdoor detection infrastructure without a demonstrated tractable target class;
- exact context caching based on approximate interface descriptors;
- core/MCS-driven repair without bounded offline evidence.

## Bottom line

The final literature wave adds a missing **representation theory** to the earlier research:

- frontier/ZDD work shows what an exact boundary state looks like;
- representative sets show how a *set* of survivors can preserve future capability;
- restricted/relaxed DDs bracket the true future space;
- automaton global constraints show how finite-state mechanics and exact counters can be propagated jointly;
- solution density supplies local abstract future mass;
- CEGAR/interpolation provide a disciplined way to discover missing interface distinctions;
- backdoor depth describes adaptive distance to tractability;
- MCS/diagnosis connects exact failure proofs to what repair must reopen.

These additions reinforce the existing queue rather than creating a new top-level project. The durable interpretation is maintained in [`../docs/solver-residual-state-representation.md`](../docs/solver-residual-state-representation.md).
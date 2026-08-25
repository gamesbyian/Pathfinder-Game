# External research → Pathfinder development synthesis

> **Status:** concluded-positive
> **Last evidence:** 2026-08-24 — fourteen external-literature reviews reconciled against current Pathfinder solver evidence and promoted into the residual-state and scheduler research vocabulary
> **Decision:** the literature materially sharpens Pathfinder's research questions around continuation value, residual interfaces, exact attainability, set-level future coverage, repair reconstructability, structural certificates, abstraction refinement, and symmetry quality. It does **not** justify replacing the solver with a generic RCSP, ZDD/DD, ALNS, CDCL/LCG, model-counting, graph-canonicalization, survival/bandit, or CEGAR framework. Use the literature as hypothesis/proof vocabulary behind the current queue.
> **Remaining gate:** none for the literature synthesis itself; each promoted concept proceeds only through the role-specific gate in [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md)
> **Evidence role:** discovery
> **Selection:** observational

## Inputs

The synthesis covers fourteen compact technical reviews in three waves.

First wave:

- repair/LNS;
- learned failure/nogoods;
- beam survivor selection/diversity;
- sequential portfolios/continuation value;
- symmetry/equivariance/representation bias;
- residual feasibility.

Second wave:

- exact attainability and upper capacity;
- future equivalence and basin width;
- structured repair/reconstruction;
- infeasibility certificates/cores;
- censored continuation and randomized equivariance.

Third wave:

- frontier/ZDD/decision diagrams and representative families;
- automaton/resource global constraints;
- abstraction refinement, backdoors, and core-guided diagnosis.

Underlying literature reports remain under `reports/`. The first-eleven and third-wave cross-pollination notebooks are now explicitly superseded historical rationale:

- [`2026-08-24-external-research-cross-pollination-audit.md`](2026-08-24-external-research-cross-pollination-audit.md)
- [`2026-08-24-third-wave-cross-pollination-addendum.md`](2026-08-24-third-wave-cross-pollination-addendum.md)

Durable vocabulary lives in [`../docs/solver-residual-state-representation.md`](../docs/solver-residual-state-representation.md). Scheduler consequences live in [`../docs/solver-scheduling-policy.md`](../docs/solver-scheduling-policy.md).

## Central synthesis: future opportunity

Across otherwise different literatures, the recurring object is the unresolved future of a partial state.

For a state `s`, conceptually:

- `C(s)` is the set/language of valid completions;
- `R(s)` is the set of exact resource vectors attainable by those completions.

Those objects are usually too expensive to materialize. Pathfinder therefore needs role-specific approximations or interfaces that preserve the right information for a stated purpose.

The most useful shared concept is the **residual interface**:

> the smallest boundary/context through which the committed past can still affect the unresolved future.

It can contain endpoint/connectivity state, finite mechanic state, exact-resource counters, unresolved obligations, and history required by future legality.

## Representation hierarchy

The literature now gives a clean way to separate objects that previously risked being conflated.

| Representation | Guarantee | Legal role |
|---|---|---|
| exact interface/context | equality preserves the queried exact future | exact DP/cache/merge |
| representative family | retained set collectively preserves relevant extensions | exact set reduction in supported algebras; aspirational beam analogue |
| restricted under-approximation | contains only true futures, but may omit many | beam/constructive search |
| relaxed over-approximation | contains all true futures plus possible fake ones | safe negative proof/bounds |
| predictive abstraction | empirical correlation only | ranking, diversity, repair diagnosis, later scheduling |

No predictive abstraction may silently become an exact cache key or hard prune.

A useful conceptual bracket is:

`restricted futures ⊆ true futures ⊆ relaxed futures`.

## Allocation and continuation value

Portfolio/survival research strongly supports the current scheduler framing:

- value the **next** tranche conditional on the action still being unsolved;
- distinguish natural exhaustion from right-censored budget stops;
- charge failed work;
- preserve rare exclusive capability;
- treat predecessor-conditioned historical success as observational when latent hardness, budget depletion, or hidden state are uncontrolled;
- compute fixed-work oracle/Pareto headroom before building a dynamic scheduler;
- test a simple static repricing first.

This is now queue #1/#3 rather than a literature-only idea.

## Exact feasibility and attainability

Classical shortest-path lower bounds are insufficient for exact-target Pathfinder search.

Useful future questions include:

- lower residual requirement;
- **upper** residual capacity;
- parity/residue constraints;
- attainable exact resource sets or target membership;
- separator/cut/component capacity;
- matching/Hall-style obligation incompatibility;
- finite-state mechanic + exact-counter propagation;
- joint topology/resource contradictions.

The important hardness boundary is exact equality. A state can have abundant nominal unused resource and still lack any continuation that realizes the exact target.

The literature does not justify a generic RCSP engine. It motivates bounded one-sided propagators, small exact DPs/bitsets, or oracle questions only where a concrete Pathfinder residual subproblem earns them.

## Beam as a restricted future representation

Finite beam search keeps only some real futures. The strongest conceptual target from beam, portfolio, and representative-set research is therefore:

> preserve **marginal future-extension capability** of the survivor set.

Pairwise novelty or path-history distance is only a proxy.

This interpretation fits the exact A/D extinction evidence already in the repo. It supports cheap descriptor/quota/reserve experiments after recurrence is shown; it does not authorize a generic quality-diversity or representative-set framework.

## Repair as unrefinement plus reconstruction

Repair literature becomes much clearer when two problems are kept separate:

1. frozen commitments exclude every valid completion;
2. an exact-live residual exists, but the current reconstructor cannot find it.

Exact retreat depth, repair-window interface width, basin width, and distance to tractability are therefore different quantities.

Core/MUS/MCS literature adds a formal language for the first case:

- why frozen assumptions are inconsistent;
- which assumptions might need reopening.

Those proof objects remain offline diagnostics until recurrent deep-retreat evidence justifies a bounded treatment.

## Failure learning

The strongest transfer is not “Pathfinder should become CDCL.”

It is:

> if an expensive sound failure can be expressed as a compact reason that recurs across distinct exact states or fires materially earlier, then explanation storage may repay its cost.

Cheap direct predicates and already-memoized lower bounds are poor learning targets. Structural cut/capacity/resource conflicts are more plausible.

This is now narrowed in [`2026-08-24-learned-failure-certificate-audit.md`](2026-08-24-learned-failure-certificate-audit.md).

## Abstraction discovery through counterexamples

CEGAR/interpolation literature supplies a disciplined alternative to indefinite feature shopping:

1. begin with a coarse state abstraction;
2. find a spurious equivalence/future;
3. use exact/reference evidence to identify the missing distinction;
4. refine only that distinction.

For Pathfinder, the reference model is especially valuable as a **falsifier** of proposed exact interfaces. One live/dead pair sharing the same proposed exact signature disproves sufficiency immediately.

Finite testing cannot prove universal exactness without a formal/model argument.

## Difficulty axes kept separate

At least four residual quantities should not be collapsed casually:

- **interface width:** how much boundary/context state must remain visible;
- **basin width:** how much feasible continuation mass/flexibility remains;
- **backdoor depth / distance to tractability:** how many adaptive hard choices separate the residual from an easier class;
- **exact-resource opportunity:** which exact resource targets remain attainable.

A single scalar “difficulty” can hide opposite mechanisms.

## Symmetry as a representation audit

Every allegedly intrinsic descriptor should state how it transforms under exact puzzle symmetries.

Typical expectations:

- counts/capacities invariant;
- directional fields equivariant;
- connectivity/interface identity transformed consistently;
- arbitrary coordinate enumeration not treated as intrinsic structure.

This does not imply every finite-budget search trace must be symmetric.

## Reference-model role

The literature broadens the useful *questions* an exact/reference model can answer:

- prefix liveness;
- exact/relaxed attainable resources;
- counterexamples to proposed state sufficiency;
- structural failure certificates/cores;
- frozen-assumption repair diagnosis;
- reduced exact/relaxed interface models.

It does not justify broadening the maintained CP-SAT mechanic surface without a ranked decision need.

## Explicit non-actions

This synthesis does **not** justify, by itself:

- general RCSP/label-setting rewrite;
- production ZDD/Graphillion/TdZdd integration;
- replacing beam with decision diagrams;
- generic representative-set machinery;
- generic `REGULAR`/`MULTICOST-REGULAR` infrastructure;
- global model counting / density-guided hot-loop search;
- general ALNS controller;
- adaptive repair bandits/RL;
- broad CDCL/LCG conversion;
- exact context caching from approximate signatures;
- online CEGAR/interpolation/backdoor machinery;
- survival/frailty/bandit scheduler before static fixed-work headroom;
- same-seed transformed runs as semantic RNG coupling;
- global symmetry canonicalization merely because orientations differ;
- hard pruning from predictive descriptors.

## Current development consequences

The literature changes vocabulary and gates, not queue rank.

The strongest active consequences are already represented as:

- #1/#3: conditional fixed-work portfolio value;
- #4: survivor-set future coverage at exact extinction boundaries;
- #5: bounded exact/reference questions;
- #6: equal-work restarts and structural failure reasons;
- #7: retreat versus reconstructability;
- cross-cutting: residual interfaces and symmetry-quality checks.

See [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) for the current smallest executable gate for each.

## Disposition

The literature program succeeded by **narrowing** implementation, not expanding it.

Its durable contribution is a more precise language for future opportunity and a series of proof/evidence gates that prevent Pathfinder from adopting sophisticated frameworks before a concrete residual question earns them.

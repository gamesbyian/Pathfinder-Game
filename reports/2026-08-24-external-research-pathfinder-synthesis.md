# External research → Pathfinder development synthesis

**Date:** 2026-08-24  
**Scope:** reconcile fourteen compact external-literature reviews against Pathfinder's existing solver evidence. Literature supplies mechanisms, abstractions and diagnostic distinctions; it is not an implementation backlog.

Cross-links:

- second-order audit across the first eleven reports: [`2026-08-24-external-research-cross-pollination-audit.md`](2026-08-24-external-research-cross-pollination-audit.md)
- third-wave addendum: [`2026-08-24-third-wave-cross-pollination-addendum.md`](2026-08-24-third-wave-cross-pollination-addendum.md)
- durable residual-representation vocabulary: [`../docs/solver-residual-state-representation.md`](../docs/solver-residual-state-representation.md)
- canonical execution priority: [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md)

## External inputs

### First wave

- [`deep-research-report.md`](deep-research-report.md) — repair/LNS.
- [`nogood-deep-research-report.md`](nogood-deep-research-report.md) — learned failure.
- [`beam-deep-research-report.md`](beam-deep-research-report.md) — beam survivor selection.
- [`portfolios-deep-research-report.md`](portfolios-deep-research-report.md) — sequential portfolios.
- [`heuristic-symmetry-deep-research-report.md`](heuristic-symmetry-deep-research-report.md) — symmetry/equivariance.
- [`feasibility-deep-research-report.md`](feasibility-deep-research-report.md) — residual feasibility.

### Second wave

- [`exact-attainability-upper-capacity-deep-research.md`](exact-attainability-upper-capacity-deep-research.md) — exact attainable resource sets and upper residual capacity.
- [`future-equivalence-basin-width-deep-research.md`](future-equivalence-basin-width-deep-research.md) — continuation equivalence and feasible-basin width.
- [`structured-repair-reconstruction-deep-research.md`](structured-repair-reconstruction-deep-research.md) — plan/sequence repair and narrow residual reconstruction.
- [`infeasibility-certificates-deep-research.md`](infeasibility-certificates-deep-research.md) — structural certificates, cores and explanation minimization.
- [`censored-continuation-symmetry-randomization-deep-research.md`](censored-continuation-symmetry-randomization-deep-research.md) — censored continuation value and randomized equivariance.

### Third wave

- [`frontier-zdd-decision-diagrams-deep-research.md`](frontier-zdd-decision-diagrams-deep-research.md) — exact frontier states, representative families, restricted/relaxed decision diagrams.
- [`automaton-resource-global-constraints-deep-research.md`](automaton-resource-global-constraints-deep-research.md) — `REGULAR`, `COST-REGULAR`, `MULTICOST-REGULAR`, exact counting, solution density, Parikh/resource propagation.
- [`abstraction-refinement-backdoors-core-guided-deep-research.md`](abstraction-refinement-backdoors-core-guided-deep-research.md) — CEGAR/interpolation, backdoor depth, cores/MCS diagnosis.

## Executive decision

The literature still does **not** justify replacing Pathfinder with a new RCSP engine, ZDD/DD framework, ALNS controller, CDCL/LCG architecture, general model counter, graph canonicalizer, survival/bandit scheduler, or generic CEGAR/backdoor system.

The third wave changes the **representation vocabulary**, not the ranked queue.

The strongest current synthesis is:

1. **Allocation:** value the next work tranche conditionally on what has already happened, while distinguishing censoring, exhaustion, overlap and latent instance hardness.
2. **Exact feasibility:** think in terms of attainable continuation sets, upper as well as lower capacity, arithmetic holes, and structural cuts.
3. **Residual representation:** distinguish exact interfaces, representative families, restricted under-approximations, relaxed over-approximations and merely predictive abstractions.
4. **Beam:** finite-width search is a restricted representation; survivor quality is fundamentally a set-level future-coverage problem, not generic pairwise diversity.
5. **Repair:** distinguish wrong frozen commitments from a narrow/hard but feasible residual; interface complexity matters as much as rollback distance.
6. **Failure learning:** prefer compact sound certificates/cores over arbitrary approximate patterns; correction sets answer a different repair question from UNSAT cores.
7. **Abstraction discovery:** a future signature can be refined from exact counterexamples using CEGAR/proof ideas rather than feature-shopping indefinitely.
8. **Residual difficulty:** keep interface width, basin width, backdoor depth/distance to tractability and exact-resource opportunity as separate axes.
9. **Symmetry:** every allegedly structural descriptor should have an explicit invariance/equivariance expectation.

Across these tracks, the shared object is the **residual interface**: the smallest boundary/context through which the committed past can still affect the unresolved future.

---

## Track A — scheduler continuation value remains first

**Queue:** #1.

The portfolio/survival literature remains correctly reflected in the current scheduler design:

- build well-defined tranche risk sets;
- distinguish natural exhaustion from right censoring;
- measure incremental solves/work and exclusivity;
- keep `P(B solves | A failed)` observational when predecessor state/latent hardness is uncontrolled;
- compute fixed-work oracle/Pareto headroom;
- test simple static repricing before survival/frailty/bandit/VOC machinery.

The third wave adds only a later possibility: if simple static scheduling leaves held-out headroom, cheap residual telemetry such as interface width, forced-choice/solution-density signals, conflict class, or distance-to-tractability proxies could become Generation-B features. None is currently demonstrated to predict action value.

P0 unexplained stage-history dependence still blocks causal-looking sequence conclusions for affected actions.

---

## Track B — residual feasibility and exact-resource opportunity

**Queue:** feeds #4, #5, #6 and #7.

Pathfinder already uses overflow, goal distance, parity, MP/MC lower bounds and connectivity. New research must add information beyond that gauntlet.

Candidate information remains:

- upper residual capacity;
- exact/relaxed attainable-resource sets and residue classes;
- component capacity;
- bipartite/color/degree restrictions;
- articulation/bridge/block-cut and separator capacity;
- matching/Hall/path-cover incompatibility;
- joint resource + obligation + topology contradictions.

The third wave adds a missing middle layer between scalar checks and full CP-SAT:

> **finite-state mechanic abstraction + exact counters + incomplete/safe global propagation**.

`COST-REGULAR`/`MULTICOST-REGULAR` and regular-counting work show that exact equality can make full propagation NP-hard while still leaving useful polynomial/incomplete propagators. Parikh/resource work further shows that target-specific membership may be cheaper than constructing a universal exact spectrum.

Therefore the useful hierarchy is now:

1. current scalar lower/upper/arithmetic checks;
2. joint finite-state/resource relaxation where a compact finite-state subproblem exists;
3. small exact DP/bitset/DD on a bounded interface/resource range;
4. full exact residual solver.

**Gate:** every new hard condition must have an explicit one-sided proof and incremental information beyond existing prunes. A density/predictor is not a prune.

---

## Track C — beam as a restricted future representation

**Queue:** #4.

Existing A/D exact labels show score-preferred dead states displacing exact-live alternatives. B-class near-ties remain a different live/live regime.

Earlier research supplied future signatures and portfolio-style marginal coverage. Frontier/DD research sharpens that picture substantially.

### Exact interface

Frontier/ZDD methods give a constructive example of exact state compression: retain only boundary degree/connectivity/resource/mechanic information through which processed structure can affect the unresolved graph.

### Interface width

The difficulty of such a representation depends on frontier/path/tree width and ordering, not merely residual size.

### Representative family

Connectivity-DP representative-set theory shows that a retained **set** can collectively preserve all relevant future extensions even when no pairwise dominance relation explains every discard.

This is the strongest rigorous analogue yet for the beam goal:

> preserve marginal future extension capability, not merely pairwise state distance.

### Restricted versus relaxed dual

A width-bounded restricted DD closely resembles beam search:

`restricted futures ⊆ true futures`.

A relaxed DD merges states in a safe optimistic direction:

`true futures ⊆ relaxed futures`.

Thus:

`restricted ⊆ true ⊆ relaxed`.

The restricted side provides witnesses but cannot prove deadness; the relaxed side can prove deadness if even its over-approximation fails.

This is a research model, not a proposal to maintain two production diagrams.

**Gate:** current beam work should still start from cheap descriptors and the simplest quota/reserve treatment. Representative-set/DD machinery is downstream of discovering a real reusable interface/extension structure, not a first implementation.

---

## Track D — repair as unrefinement + reconstruction + interface complexity

**Queue:** #7.

Current exact retreat evidence already separates:

1. early-broken prefixes where preserved structure excludes all repairs;
2. exact-live late residuals that current repair/reconstruction nevertheless cannot solve.

Plan-repair literature names the first side unrefinement and the second refinement/reconstruction.

Third-wave research adds two stronger structural lenses.

### Repair-window interface

A repair window is easiest to reason about when frozen exterior and reopened interior interact through a small sufficient boundary. Therefore nominal rollback distance/number of reopened decisions is not the whole complexity story. A large window behind a narrow interface may be easier than a smaller window coupled through many obligations/resources.

### Core/MCS-guided unrefinement

When an exact residual under frozen assumptions is UNSAT:

- a core identifies assumptions sufficient for contradiction;
- an MUS makes one conflict subset-minimal;
- an MCS/diagnosis identifies assumptions whose removal restores satisfiability.

This formalizes the difference between “why this neighborhood is impossible?” and “what must be relaxed so some repair is possible?”

### Backdoor depth

A residual can be feasible but repair-hostile because a few adaptive critical decisions separate it from a tractable class. Backdoor depth captures this better than nominal neighborhood size in some SAT/CSP families.

Thus repair difficulty can arise from:

- wrong frozen commitments;
- high interface width;
- narrow basin/forced chains;
- shallow but difficult backdoor decisions;
- genuinely broad residual far from a tractable regime;
- reconstructor mismatch/budget.

**Gate:** use exact/shadow evidence first. Core/MCS/backdoor/interface ideas are offline explanatory tools until a recurring cheap legal runtime descriptor or bounded reconstructor earns a treatment test.

---

## Track E — failure certificates, context caching, and abstraction refinement

**Queue:** #6 supported by #5.

Useful candidate structural reasons remain:

- resource target outside lower/upper/attainable set;
- parity/residue contradiction;
- separator/cut-capacity failure;
- matching/Hall deficiency in a necessary relaxation;
- obligation isolation;
- joint resource/topology incompatibility;
- assumption-based core from a validated exact model.

The practical value test remains:

`work avoided > derivation + checking + storage`.

### Exact context caching stays behind a proof gate

Weak full-state recurrence does not close the theoretical possibility that different histories expose the same exact residual subproblem.

Frontier DP clarifies the two required gates:

1. **semantic sufficiency:** same interface truly preserves the queried future;
2. **representational economy:** the interface is small/recurrent enough to repay caching/DP cost.

Without both, this does not reopen loose transposition caching.

### CEGAR/proof-guided refinement

A candidate future signature can begin deliberately coarse:

`coarse abstraction -> spurious future/equivalence -> exact counterexample -> add missing distinction`.

The reference model can therefore be used not only to label live/dead states, but to **falsify overcoarse interfaces** by finding two states the signature merges despite different exact futures.

Proof/interpolation literature adds a possible offline language for boundary predicates: an interpolant can summarize a contradiction using only variables shared between past and future formulas.

**Gate:** do not build generic CEGAR/interpolation infrastructure. Use the idea only after one concrete candidate abstraction repeatedly produces compact, decision-relevant counterexamples/refinements.

---

## Track F — exact/reference model as a research microscope

**Queue:** #5.

The maintained reference model remains bounded by support/validation economics. The literature expands the types of questions it may eventually answer:

- prefix live/dead;
- lower/upper/attainability labels;
- counterexamples to proposed interface sufficiency;
- structural reason/core extraction;
- correction-set/diagnosis questions for frozen repair commitments;
- reduced exact/relaxed models of a small frontier/interface;
- comparison between restricted and relaxed residual representations.

A smaller trustworthy oracle remains preferable to a broad fuzzy model.

---

## Track G — symmetry and representation quality

**Queue:** supporting variant research.

The existing first-divergence policy remains correct. Same raw seed is not semantic random coupling; distributional equivariance is the clean randomized notion.

The third wave strengthens the role of symmetry as a **representation audit**.

Any descriptor claimed to encode intrinsic residual structure should state its expected transform:

- scalar capacity/count: invariant;
- directional boundary state: equivariant;
- connectivity partition/interface: transformed consistently;
- cache/reason identity: should not fragment merely because raw coordinates changed.

This applies to frontier signatures, automaton/resource summaries, CEGAR predicates, learned reasons, repair descriptors and later scheduler telemetry.

---

## Cross-cutting representation hierarchy

The literature now supports five distinct representations of future state.

| Representation | Guarantee | Typical research role |
|---|---|---|
| **Exact interface/context** | same context preserves exact queried future | exact DP/cache/merge |
| **Representative family** | retained set collectively preserves relevant extensions | idealized set reduction/survivor coverage |
| **Restricted under-approximation** | contains only real futures, not necessarily all | beam / constructive search |
| **Relaxed over-approximation** | contains every real future plus possible spurious ones | safe bounds / negative proof |
| **Predictive abstraction** | empirical correlation only | ranking / repair diagnosis / later scheduling |

CEGAR/refinement is a process for improving an abstraction when exact counterexamples show that an omitted distinction matters.

Do not silently promote a predictive abstraction into an exact context or relaxed proof model.

---

## Cross-cutting difficulty axes

The expanded literature suggests keeping at least four quantities separate.

### Interface width

How much boundary/context information must coexist to represent the residual.

### Basin width

How much feasible continuation mass/flexibility remains. Cheap proxies include viable branching, forced-choice fraction, and constraint-level solution density.

### Backdoor depth / distance to tractability

How many adaptive hard choices remain before the residual enters an easy class/decomposition regime.

### Exact-resource opportunity

Which exact resource totals/vectors remain attainable, including arithmetic holes and upper/lower capacity.

A single “difficulty score” can hide these qualitatively different structures.

---

## Current development DAG

| Premise | Positive result unlocks | Negative result closes/demotes |
|---|---|---|
| Fixed-work tranche/oracle headroom after proper risk-set accounting | simple repriced schedule; later dynamic modeling only if needed | survival/bandit/VOC complexity |
| New residual bound/resource propagator adds early exact separation | one role-specific prune/relaxation/heuristic | generic feasibility machinery |
| A/D future signature carries real survivor-set information | simple quota/crowding/reserve; later set-level work only if needed | broad diversity frameworks |
| A compact future interface is evidenced and small | bounded frontier/context/DD/reference question | general DD/ZDD engine |
| Repair failure separates into neighborhood vs reconstruction regimes | one regime-specific reopening/reconstructor; core/MCS only if diagnostic value is shown | generic adaptive repair |
| Compact structural certificate recurs and is early | one bounded reason-producing mechanism | broad CDCL/LCG |
| A proposed abstraction repeatedly yields compact exact counterexamples | bounded CEGAR-style refinement study | general abstraction-refinement framework |
| Recurrent harmful non-equivariant mechanism | smallest representation/order/randomness correction | global canonicalization/invariance work |

## Explicit non-actions

The fourteen-report synthesis does **not** justify:

- general RCSP/label-setting rewrite;
- production ZDD/Graphillion/TdZdd compiler;
- replacing beam with decision diagrams;
- rank-based representative-set machinery without a matching exact interface/algebra;
- generic `REGULAR`/`MULTICOST-REGULAR` framework;
- exact multidimensional spectra/model counting in the hot loop;
- general ALNS/plan-repair controller;
- adaptive repair bandits/RL before complementary operators exist;
- automatic destroy sets from one core/MCS;
- DPP/MAP-Elites/large novelty archives;
- broad CDCL/LCG conversion;
- context caching from an approximate interface;
- online CEGAR/interpolation/backdoor machinery;
- survival/frailty/bandit scheduler before simple static scheduling leaves headroom;
- same-seed transformed runs as semantic RNG controls;
- global canonicalization merely because orientations differ;
- hard pruning from merely predictive descriptors.

## Bottom line

The first two waves discovered that Pathfinder's central research problem is **future opportunity**. The third wave supplies a mature representation theory for that idea.

The strongest general picture is now:

- **frontier state** shows what an exact future interface can look like;
- **representative families** show that useful finite-width preservation is a set-level property;
- **restricted/relaxed DDs** bracket the true future space from below and above;
- **automaton/resource propagators** provide a middle layer between scalar bounds and full exact solving;
- **solution density** estimates local abstract future mass;
- **CEGAR/interpolation** provide a disciplined route for discovering missing state distinctions;
- **backdoor depth** measures adaptive distance to tractability;
- **cores/MCSs** connect exact failure to repair unrefinement.

The ranked Pathfinder work remains the current queue. The major remaining uncertainty is empirical: whether Pathfinder residual states actually exhibit enough small-interface, representative, propagatable, or shallow-backdoor structure for any of these ideas to improve cold solve/work.
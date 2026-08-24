# External research → Pathfinder development synthesis

**Date:** 2026-08-24  
**Scope:** reconcile eleven compact external-literature reviews against Pathfinder's existing solver evidence. Literature supplies mechanisms, abstractions and diagnostic distinctions; it is not an implementation backlog.

Second-order pairwise audit: [`2026-08-24-external-research-cross-pollination-audit.md`](2026-08-24-external-research-cross-pollination-audit.md). That audit asks whether ideas from each research area materially change how the other ten should be understood, rather than reading the reports only vertically by topic.

## External inputs

First wave:
- [`deep-research-report.md`](deep-research-report.md) — repair/LNS;
- [`nogood-deep-research-report.md`](nogood-deep-research-report.md) — learned failure;
- [`beam-deep-research-report.md`](beam-deep-research-report.md) — beam survivor selection;
- [`portfolios-deep-research-report.md`](portfolios-deep-research-report.md) — sequential portfolios;
- [`heuristic-symmetry-deep-research-report.md`](heuristic-symmetry-deep-research-report.md) — symmetry/equivariance;
- [`feasibility-deep-research-report.md`](feasibility-deep-research-report.md) — residual feasibility.

Second wave:
- [`exact-attainability-upper-capacity-deep-research.md`](exact-attainability-upper-capacity-deep-research.md) — exact attainable resource sets and upper residual capacity;
- [`future-equivalence-basin-width-deep-research.md`](future-equivalence-basin-width-deep-research.md) — continuation equivalence and feasible-basin width;
- [`structured-repair-reconstruction-deep-research.md`](structured-repair-reconstruction-deep-research.md) — plan/sequence repair and narrow residual reconstruction;
- [`infeasibility-certificates-deep-research.md`](infeasibility-certificates-deep-research.md) — structural certificates, cores and explanation minimization;
- [`censored-continuation-symmetry-randomization-deep-research.md`](censored-continuation-symmetry-randomization-deep-research.md) — censored continuation value and randomized equivariance.

Canonical priority remains [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md). The second wave and cross-pollination audit sharpen existing queue items rather than creating new top-level projects.

## Executive decision

Do **not** respond to the literature by building a new RCSP engine, ALNS framework, CDCL/LCG system, model counter, decision-diagram compiler, graph canonicalizer, survival/bandit scheduler, or generic plan-repair framework.

The useful convergence is more specific:

1. **Allocation:** continuation tranches should be valued conditionally among comparable unsolved risk sets, while distinguishing censoring, exhaustion, overlap and latent instance hardness.
2. **Future opportunity:** exact-resource feasibility is membership in a continuation set, not merely `LB <= target <= UB`; cheap residues, upper capacity, cuts and small interface signatures can carry information between scalar bounds and exact solving.
3. **Beam:** finite slots should cover materially different futures; the most promising abstraction family is an interface/context signature of the unresolved problem, not raw path/history distance.
4. **Repair:** neighborhood reachability and residual reconstructability are separate failure modes. Plan-repair literature reinforces unrefinement/window expansion and dependency-guided reopening rather than generic ruin size.
5. **Failure learning:** useful reasons should be compact **certificates** such as cut/resource/obligation conflicts or assumption cores, not arbitrary approximate patterns.
6. **Symmetry:** randomized robustness is distributional equivariance. Same raw seed does not control semantic randomness once transformed executions consume draws differently.

Across beam, repair and learned failure, the strongest shared hypothesis is now **residual interface state**: a compact description of how the unresolved future connects to the already-committed past, carrying exact resources, obligations, topology/cut state and finite mechanic state across that interface.

This is a research hypothesis, not authorization to build a grand unified state representation.

---

## Track A — Scheduler continuation value remains first

**Queue:** #1.

Pathfinder already has capped/tranche census data, `workSpent`, natural beam exhaustion, deep repair yield and action overlap. The second-wave survival review adds two cautions.

First, the correct empirical object for tranche `t -> t+Δ` is the incremental success/work distribution **among runs that are genuinely still at risk at `t`**. Natural exhaustion leaves the risk set; a budget stop is right censoring.

Second, `P(B solves | A failed to t)` mixes B's complementarity with information that A's failure reveals about the instance. Shared latent difficulty can depress all algorithms simultaneously. Historical ladder conditioning can additionally contain predecessor state, reach-selection and code/provenance effects.

Therefore:
- empirical tranche tables remain the first model;
- report independent denominators and uncertainty for sparse late tranches;
- pair/cluster by independent level/parent where repeated runs exist;
- do not extrapolate beyond observed tails without explicit modeling assumptions;
- treat survival/frailty models as escalation only when simple tables leave material predictive uncertainty/headroom;
- bandit/value-of-computation control remains later still.

The existing [`2026-08-23-solver-portfolio-repricing-design.md`](2026-08-23-solver-portfolio-repricing-design.md) is already the correct first implementation-facing design. P0 unexplained stage-history dependence still blocks causal-looking sequence conclusions for affected actions.

---

## Track B — Residual future opportunity beyond current prunes

**Queue:** feeds #4, #5, #6 and #7; no new ranked item.

Pathfinder already hard-prunes length/intersection overflow, distance, parity, MP/MC lower bounds and connectivity. Do not rediscover those under academic names.

The genuinely new candidate information is:

- **upper residual capacity**, not only minimum required resource;
- small exact/relaxed attainable-resource spectra or residue sets;
- component capacity rather than reachability alone;
- bipartite/color/degree restrictions;
- articulation/bridge/block-cut structure;
- separator/corridor traversal capacity;
- matching/Hall/path-cover style incompatibility where a necessary relaxation fits;
- joint resource + obligation + topology conditions.

The strongest exact formulation is continuation-set membership. For state `s`, target resource must belong to `R(s)`, the set of resource vectors of legal completions. Safe equality-resource dominance requires continuation-set inclusion; “less resource used is better” remains forbidden unless a monotonicity proof exists.

The cheapest plausible summaries sit between current scalar bounds and a full oracle: parity/modulo residues, small attainable-value bitsets on bounded subproblems, upper-capacity relaxations, and small structural interfaces.

**Gate:** a new summary must add early exact-live/dead information beyond current prune outcomes at plausible cost. A predictor is not a hard prune unless its one-sided proof is explicit.

---

## Track C — Beam future equivalence and survivor-set quality

**Queue:** #4.

Existing exact labels already show A/D extinctions where a score-preferred state is dead while a lower-ranked sibling is live. B-class near-ties have resolved live/live. True exact beam duplicates are negligible; coarse dedup is useful population shaping.

The second-wave abstraction literature sharpens “same future”:

- exact equivalence means equal continuation languages/outcomes;
- one-way simulation/substitutability means every useful continuation of B can be matched from A;
- practical approximation often comes from **interface/context signatures** used in treewidth DP, AND/OR search, planning abstractions and decision diagrams.

Candidate signature ingredients should remain small and prespecified:
- current endpoint/finite mechanic state;
- remaining exact-resource slack plus cheap attainable residues/capacity;
- unresolved obligations;
- residual component/cut/interface structure;
- existing MustCross/flipper state.

Basin-width literature adds a separate dimension: two states can expose different amounts of future mass even when both are live. Useful diagnostic quantities include viable next-action count, forced-choice fraction, limited-depth viable branching, propagation closure and, offline only where tractable, conditional completion counts/entropy.

Portfolio research adds a useful set-level interpretation: a beam candidate is valuable partly by the **marginal future capability it adds beyond survivors already retained**, analogous to a rare specialist algorithm adding portfolio coverage. This sharpens the descriptor objective but does not justify a complex portfolio/DPP optimizer.

**Gate:** at unrelated exact-labeled A/D parents, a descriptor must distinguish useful future coverage beyond score, current diversity state and a neutral random-reserve explanation. If not, do not escalate to DPP/QD/novelty machinery.

---

## Track D — Repair as unrefinement + reconstruction

**Queue:** #7.

Exact retreat work already establishes two regimes: some repair elites require reopening much earlier structure; other late prefixes remain exactly live yet current repair/`closeLengthGap` fails to reconstruct them.

The structured-plan-repair literature gives this distinction mature names and mechanisms:

- **unrefinement/refinement:** remove obstructing commitments, then solve the resulting partial plan;
- **repair windows:** solve a bounded region, expanding the window if the preserved context makes it infeasible;
- **dependency-guided repair:** use causal, threat, resource or conflict structure rather than sequence adjacency alone;
- **exact residual reconstruction:** distinguish “no solution in this neighborhood” from “heuristic reconstruction missed one.”

This supports a sharper diagnostic decomposition:

1. neighborhood excludes every solution;
2. neighborhood contains a solution but has a narrow/frozen residual basin;
3. reconstruction paradigm is mismatched;
4. suitable method is budget-limited;
5. stochastic reconstruction simply misses.

Useful external proxies for narrowness include forced-variable fraction, viable branching, residual treewidth/interface width, propagation closure and discrepancy from the incumbent/default policy. Raw solution count alone is not enough.

The certificate literature adds a new offline diagnostic path: when an exact residual model proves a frozen neighborhood UNSAT, an assumption core can identify preserved commitments already sufficient for impossibility, while correction-set/diagnosis concepts formalize which assumptions might need relaxing to restore satisfiability. This is stronger than geometric rollback as causal evidence, but minimum correction is expensive and one core is not a unique cause.

Future-equivalence literature adds a complementary view: a repair-window boundary is strongest when the frozen exterior interacts with the reopened interior only through a small sufficient interface. “What may remain frozen?” and “what past history may be forgotten?” are dual questions.

**Gate:** first distinguish reachability from reconstructability with existing exact/shadow tools. Core/correction-set or interface evidence is diagnostic only until a recurring simple legal descriptor exists. Only then does one dependency-targeted reopening or stronger bounded residual reconstructor deserve a treatment test. Adaptive operator selection still waits until at least two complementary operators independently earn value.

---

## Track E — Structural failure certificates before generic nogoods

**Queue:** #6, supported by #5 exact/reference.

Pathfinder already knows that repair exact-state repetition is useful while sound DFS exact-state recurrence is usually weak. The second-wave certificate literature provides a better reason vocabulary than arbitrary clauses:

- connectivity/separator/cut-capacity witnesses;
- degree, parity/color and matching/Hall obstructions;
- exact-resource lower/upper/residue/nonattainment contradictions;
- assumption-based UNSAT cores from an exact residual model;
- CP global-constraint explanations;
- IIS/Farkas/Benders-style projected infeasibility where a suitable formulation exists.

Important distinctions:
- an UNSAT core need not be minimal;
- a MUS is subset-minimal, not minimum-cardinality;
- an MCS describes a minimal set whose removal restores satisfiability;
- smaller explanations are not automatically better search knowledge;
- safe generalization requires the projected commitments themselves to imply infeasibility.

The practical value criterion is:

`work avoided by early/recurrent reason > discovery + checking + storage cost`.

A reason that merely restates a current cheap prune, fires only at the existing rejection point, or requires almost the full state should be rejected.

Future-equivalence research creates one important deferred distinction. Low **full-state** recurrence does not imply low recurrence of **exactly equivalent residual subproblems**. AND/OR context caching and separator DP merge different histories only when a boundary/context is proven future-sufficient. If Pathfinder ever discovers such a sufficient interface independently, context-equivalent caching would be a different question from the already-weak exact DFS transposition work. Without that proof, it remains the same unsafe abstraction trap in new clothing.

**Gate:** before conflict-learning infrastructure, find at least one compact sound reason class that recurs across distinct states/parents and becomes knowable materially earlier. Core minimization is secondary; a nonminimal cheap recurring core may be more useful than an expensive minimum explanation. Do not pursue context caching unless a future-sufficient interface has first been established.

---

## Track F — Symmetry and semantic randomness

**Queue:** supporting variant research, not a new ranked item.

The existing orientation policy is conceptually correct: locate the first non-equivariant decision and distinguish harmful bias from useful diversification.

The second-wave randomized-search review adds a critical experimental distinction:

- **independent randomness** tests equality of outcome distributions;
- **same raw seed** only synchronizes PRNG position and may cease to align semantic choices as soon as execution order diverges;
- **equivariant coupling** assigns corresponding random variates to corresponding transformed state/action events and is the right tool for pathwise first-divergence diagnosis.

Distributional equivariance is:

`Law[A(gx)] = g_* Law[A(x)]`.

It requires the whole randomized transition policy to commute with the symmetry in distribution. Invariant scalar scores or uniform tie-breaking alone are insufficient.

Common-random-number coupling is a variance-reduction design, not a correctness theorem; it reduces variance only when the induced pairing is favorably correlated. Counter-based/stateless RNG enables addressable reproducible randomness but does not automatically make a policy equivariant.

Balanced orientation inversions may represent useful diversification. A robust equivariant base and deliberately sampled symmetry breaking are conceptually different from accidental coordinate/order bias.

The cross-pollination audit makes symmetry a broader representation-quality check: any descriptor claimed to encode intrinsic puzzle structure should state whether it should be invariant or equivariant under exact puzzle transforms. Unexpected coordinate/orientation dependence can indicate representation leakage even when that descriptor was invented for beam, repair, learned failure or scheduling rather than symmetry research.

**Gate:** first-divergence traces should distinguish deterministic representation bias from random-call-order divergence. Do not infer anything from “same seed” alone. Structural descriptors need a declared symmetry expectation before being treated as generic features.

---

## Cross-cutting interface hypothesis

The two research waves repeatedly converge on one abstraction family:

> **Residual interface signature:** the smallest state through which the committed past can affect the unresolved future.

Possible fields include:
- endpoint / boundary occupancy;
- finite mechanic/product state;
- exact-resource slack and cheap attainable residue/capacity summaries;
- outstanding obligations;
- separator/cut traversal state;
- local boundary connectivity.

This has precedent across separator/treewidth DP, AND/OR context caching, decision diagrams, planning abstractions, repair windows and structural conflict explanations.

If a small signature independently helps:
- distinguish beam futures;
- predict repair residual narrowness/reachability;
- express recurring failure certificates;
- predict action continuation value,

then it may deserve a shared research representation. Until that convergence is measured, keep each use local and cheap.

Do **not** build a general interface engine in advance.

### What the horizontal audit adds

The pairwise audit strengthens the interface hypothesis in five ways:

1. **Repair and certificates:** a residual proof can potentially say not only that a repair window is impossible, but which frozen assumptions participate in the obstruction and which relaxations restore satisfiability.
2. **Equivalence and caching:** a proven sufficient interface could let distinct histories share exact residual results even when full-state recurrence is rare. This is a new deferred question, not a reopening of loose transposition caching.
3. **Beam and portfolios:** survivor value can be framed as marginal coverage of future capability already absent from the retained set, rather than generic pairwise diversity.
4. **Symmetry and representation:** every purportedly structural interface field should have an explicit invariance/equivariance expectation.
5. **Basin width and scheduling:** cheap forced-choice/interface/viable-branching signals may later become dynamic continuation-value features if static scheduling leaves headroom.

A sixth, more speculative transfer is **certificate-to-scheduler telemetry**: if a search stage emits a cheap structural failure class that another action can exploit, it could become a typed producer-to-scheduler signal. Existing typed-handoff rules already impose the correct evidence gate, so this does not justify new plumbing now.

### Four roles for the same interface

The same abstract object can have different rigor requirements:

- **proof interface:** sufficient for sound pruning, certification or exact context caching;
- **predictive interface:** correlated with future opportunity and usable for ranking/repair/scheduling, but not hard rejection;
- **diagnostic interface:** expensive/oracle-derived representation used to understand failures;
- **allocation interface:** cheap current-run summary that predicts which computation has marginal continuation value.

Do not silently promote a predictive or diagnostic interface into a proof interface.

---

## Current development DAG

| Premise | Positive result unlocks | Negative result closes/demotes |
|---|---|---|
| Fixed-work tranche/oracle headroom after proper risk-set accounting | simple repriced schedule; later dynamic modeling only if needed | survival/bandit/VOC complexity |
| New residual bound/spectrum/interface adds early exact separation | role-specific prune/heuristic/reason work | generic feasibility machinery |
| A/D future signature carries real survivor-set information | simple quota/crowding/reserve treatment | broad beam-diversity frameworks |
| Repair failure can be classified as neighborhood vs reconstruction | one regime-specific reopening/reconstruction treatment; core/correction-set evidence only if it clarifies what must reopen | generic adaptive repair |
| Compact structural certificate recurs and is early | one bounded reason-producing prune/store | broad CDCL/LCG/nogood architecture |
| A compact interface is independently proven future-sufficient | bounded context-equivalence/cache question becomes legitimate | loose/approximate residual-state caching remains closed |
| Recurrent harmful non-equivariant mechanism | smallest ordering/retention/randomness correction | global canonicalization/invariance work |

## Explicit non-actions

The expanded literature still does **not** justify:

- a general RCSP/label-setting rewrite;
- exact multidimensional attainable spectra in the hot loop;
- exact model counting as a production feature;
- a general ALNS/plan-repair framework;
- adaptive repair bandits/RL before complementary operators exist;
- automatic destroy sets from one UNSAT core or expensive minimum-correction search before diagnostic value is established;
- DPP/MAP-Elites/large novelty archives;
- a portfolio-style complex beam optimizer before a useful future signature exists;
- broad CDCL/LCG conversion;
- minimum-core/MUS enumeration as routine search work;
- context-equivalent caching from an approximate interface that lacks a future-sufficiency proof;
- a survival/frailty/bandit scheduler before simple tranche repricing leaves proven headroom;
- treating same-seed transformed runs as semantically coupled;
- graph/state canonicalization merely because orientations differ;
- any new hard prune derived from a merely predictive descriptor.

## Bottom line

The second wave did not add five algorithms, and the horizontal audit did not add another eleven. It sharpened the project's core research object.

The most promising general concept is now **future opportunity through a compact residual interface**, with four rigor levels:

1. **proof:** sound bounds, attainable-resource exclusions, structural certificates and only then any exact context caching;
2. **representation:** approximate future signatures and basin-width descriptors for ranking/retention/repair diagnosis;
3. **diagnosis:** exact/oracle labels, cores and counterexamples used to understand boundaries without becoming runtime features;
4. **allocation:** conditional value of spending more work on a search process given what its trajectory has already revealed.

The strongest new cross-topic ideas are certificate-guided repair unrefinement, context-equivalent residual caching behind a strict sufficiency proof, portfolio-style marginal beam coverage, symmetry as a general descriptor audit, and basin-width signals as later scheduler telemetry.

The next useful Pathfinder work remains the current queue. The literature mainly improves what those queue items should measure and what evidence is required before larger mechanisms are allowed.
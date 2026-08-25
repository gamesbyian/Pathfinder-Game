# External research cross-pollination audit

**Date:** 2026-08-24  
**Scope:** second-order audit across the eleven compact external-research memos. The question here is not “what does each literature say about its own topic?” but “does a mechanism, abstraction, proof object, or empirical lesson from one topic materially change how another topic should be understood?”

Canonical execution priority remains [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md). This report is evidence/rationale, not a second roadmap.

## Sources

Abbreviations used below:

- **R** — repair/LNS: [`deep-research-report.md`](deep-research-report.md)
- **N** — nogoods/conflict learning: [`nogood-deep-research-report.md`](nogood-deep-research-report.md)
- **B** — beam survivor selection: [`beam-deep-research-report.md`](beam-deep-research-report.md)
- **P** — portfolios/continuation value: [`portfolios-deep-research-report.md`](portfolios-deep-research-report.md)
- **S** — symmetry/representation bias: [`heuristic-symmetry-deep-research-report.md`](heuristic-symmetry-deep-research-report.md)
- **F** — residual feasibility: [`feasibility-deep-research-report.md`](feasibility-deep-research-report.md)
- **A** — exact attainability/upper capacity: [`exact-attainability-upper-capacity-deep-research.md`](exact-attainability-upper-capacity-deep-research.md)
- **E** — future equivalence/basin width: [`future-equivalence-basin-width-deep-research.md`](future-equivalence-basin-width-deep-research.md)
- **Q** — structured plan/sequence repair: [`structured-repair-reconstruction-deep-research.md`](structured-repair-reconstruction-deep-research.md)
- **C** — infeasibility certificates/explanations: [`infeasibility-certificates-deep-research.md`](infeasibility-certificates-deep-research.md)
- **X** — censored continuation/randomized symmetry: [`censored-continuation-symmetry-randomization-deep-research.md`](censored-continuation-symmetry-randomization-deep-research.md)

## Pairwise map

Legend:

- **●** strong nontrivial transfer with a concrete research consequence;
- **○** useful conceptual/diagnostic transfer, but no new current gate by itself;
- **×** mainly a guardrail or reason not to over-transfer;
- blank = no material additional connection beyond ordinary shared context.

|   | R | N | B | P | S | F | A | E | Q | C | X |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **R** | — | ● | ○ | ● | ○ | ● | ● | ● | ● | ● | ● |
| **N** |  | — | ○ | ○ | ● | ● | ● | ● | ● | ● | ○ |
| **B** |  |  | — | ● | ● | ● | ● | ● | ○ | ○ | ○ |
| **P** |  |  |  | — | ● | ○ | ○ | ● | ● | ● | ● |
| **S** |  |  |  |  | — | ● | ● | ● | ○ | ● | ● |
| **F** |  |  |  |  |  | — | ● | ● | ● | ● | ○ |
| **A** |  |  |  |  |  |  | — | ● | ● | ● | ○ |
| **E** |  |  |  |  |  |  |  | — | ● | ● | ● |
| **Q** |  |  |  |  |  |  |  |  | — | ● | ● |
| **C** |  |  |  |  |  |  |  |  |  | — | ● |
| **X** |  |  |  |  |  |  |  |  |  |  | — |

The matrix is deliberately dense because several reports independently rediscovered the same structural idea from different directions. The important task is to identify which overlaps produce **new** questions rather than merely restating the synthesis.

---

## Highest-value sideways transfers

### 1. Infeasibility certificates -> repair: cores and correction sets can identify what to reopen

This is the strongest underused connection.

Structured repair asks:

> Which frozen commitments prevent any feasible reconstruction?

Certificate/diagnosis literature offers a direct formalization:

- an **UNSAT core** identifies a subset of frozen assumptions already sufficient for infeasibility;
- a **MUS** shrinks that to a subset-minimal conflicting set;
- a **minimal correction set (MCS)** identifies a subset whose removal restores satisfiability;
- weighted correction/diagnosis variants can express different relaxation costs.

This is almost exactly the “unrefinement” side of plan repair. It creates a sharper distinction than generic rollback depth or geometry: a repair neighborhood may be too small because a specific preserved commitment participates in every infeasibility proof available under the chosen formulation.

**Pathfinder reconciliation:** current CP-SAT prefix work already proves some preserved prefixes dead, but the reference tooling is presently used mainly as a SAT/UNSAT/live/dead oracle, not as an assumption-core/correction-set oracle. This is therefore a genuinely new diagnostic possibility, not an existing experiment under another name.

**Guardrail:** a core is not automatically the unique cause; a MUS is not a minimum repair set; extracting minimum correction sets can be expensive. Use as offline causal/repair evidence first, not as a production destroy policy.

**Disposition:** sharpen repair/reference future work. Do not create a general core-guided repair framework.

### 2. Future equivalence -> memoization: exact-state recurrence can be low while residual-subproblem recurrence is high

Systematic DFS exact-state transposition is already weak/closed as a major opportunity. That result answers:

> Do identical full logical states recur often enough?

It does **not** answer:

> Do different histories expose exactly the same residual subproblem through a sufficient interface?

AND/OR context caching, separator DP and decision diagrams deliberately merge distinct histories when a boundary/context signature is sufficient to determine the future. If an interface `I(s)` is proven future-sufficient, states with the same interface can share residual feasibility/count/value even though their full histories differ.

This is a different species of memoization from the previously tested loose signatures. Its soundness criterion is essentially continuation equivalence:

`I(A) = I(B) => C(A) = C(B)`

for the property being cached.

**Pathfinder reconciliation:** no current repo evidence establishes such a sufficient interface. Therefore this does **not** reopen generic/approximate transposition caching. It becomes a deferred possibility only if beam/repair/feasibility work independently discovers a compact interface whose future sufficiency can be proved or exactly validated.

**Disposition:** new deferred question with a very high proof gate; keep exact-TT closure intact.

### 3. Portfolio construction -> beam survivor selection: a beam is itself a tiny portfolio

Portfolio research values an algorithm by **marginal capability not already supplied by the current portfolio**, protecting rare specialists when they add exclusive coverage.

Finite-width beam selection has the same set-valued structure:

- a candidate can be individually strong but redundant with survivors already retained;
- a lower-ranked candidate can be valuable because it uniquely covers a future class;
- beam width is the portfolio budget;
- future-signature overlap is analogous to algorithm outcome overlap;
- “rare specialist” states correspond to low-score states preserving otherwise absent future capability.

This suggests a cleaner interpretation of descriptor-aware beam work: estimate **marginal future coverage**, not generic diversity distance.

**Pathfinder reconciliation:** the current queue already asks whether retained A/D candidates represent redundant futures and compares descriptor-aware selection with random reserve/width controls. The portfolio analogy therefore sharpens the objective but does not create a new experiment.

**Disposition:** fold into synthesis/beam rationale, not a new selector.

### 4. Symmetry -> every structural descriptor: equivariance is a representation-quality test

The symmetry reports should not remain isolated to orientation research.

Any descriptor claimed to represent intrinsic residual structure should state its transformation law:

- scalar capacities/counts should normally be invariant under exact puzzle symmetries;
- directional/interface fields should transform equivariantly;
- arbitrary coordinate lexicography, hash order or enumeration order should not silently enter an allegedly structural signature.

This applies to:
- beam future signatures;
- repair-regime descriptors;
- structural learned reasons;
- exact-resource summaries;
- scheduler features intended to represent puzzle structure.

A descriptor that changes under rotation for no semantic reason may simply encode representation bias or family identity rather than future opportunity.

**Pathfinder reconciliation:** variant research already has a first-divergence symmetry policy, but current general research rules do not explicitly use symmetry as a feature-quality check.

**Disposition:** add a cross-cutting guardrail for new structural descriptors; do not require every implementation to be trace-equivariant.

### 5. Basin width -> scheduler: residual geometry can be a later continuation-value feature

Basin-width research introduced quantities such as viable branching, forced-choice fraction, propagation closure, frozen/backbone structure and residual interface width mainly for repair/beam diagnosis.

Those quantities may also update algorithm continuation value. A narrow, strongly forced residual and a broad, weakly constrained residual can plausibly favor different search paradigms even if their static level features are identical.

Formally, scheduler Generation B seeks telemetry `z_t` for which

`P(action succeeds in next tranche | static x, history, z_t)`

changes materially relative to the static policy.

Basin-width proxies are therefore candidate **dynamic scheduler signals**, not only repair metrics.

**Pathfinder reconciliation:** scheduler policy already allows dynamic frontier/retention/progress telemetry but rightly defers it until a simple static schedule shows headroom. No evidence yet says these particular signals predict action value.

**Disposition:** record as a later Generation-B candidate, not current scheduler scope.

### 6. Future equivalence -> repair windows: “what may remain frozen?” and “what history may be forgotten?” are dual questions

Separator/context abstraction asks which past details can be forgotten because only a small interface affects the unresolved future.

Plan repair asks which incumbent commitments can remain frozen without excluding all repairs.

These are nearly dual:

- a future-sufficient interface says interior history outside the interface is irrelevant to continuation;
- a valid repair window boundary says frozen exterior structure interacts with the repaired interior only through a sufficient interface.

This gives stronger conceptual justification for **interface-bounded repair windows** than generic contiguous rollback.

**Pathfinder reconciliation:** current repair work already prioritizes dependency-targeted reopening over generic ruin size. Interface sufficiency gives a sharper theoretical target but no current proven interface.

**Disposition:** sharpen repair hypothesis; no implementation until a recurring small interface is evidenced.

### 7. Exact attainability -> learned failure: arithmetic holes are naturally compact reasons

An attainable-resource spectrum is not only a feasibility test. Nonmembership can yield a compact reusable reason:

- target parity absent;
- target residue modulo `k` absent;
- upper capacity below target;
- obligation/resource combination outside an attainable set.

These explanations can generalize across many exact states if the proof depends only on the retained structural/resource summary.

**Pathfinder reconciliation:** the current learned-failure queue already lists unattainable resource and residual-capacity reasons. The cross-pollination audit strengthens why these are attractive: their proof objects may be substantially smaller than the exact state.

**Disposition:** already absorbed; no new action.

### 8. Certificates -> scheduler: reason type can be typed current-run information

A search stage may discover not merely “failed,” but a structured reason: cut exhaustion, resource nonattainment, narrow interface, repeated conflict class, etc.

If such a reason is legal current-run information and predicts that a different algorithm family has higher residual value, it could become a typed producer -> scheduler signal. This is stronger than conditioning only on elapsed work.

**Pathfinder reconciliation:** the operating model already allows typed producer/receptor artifacts only after independent evidence shows that the receptor cannot cheaply rediscover the information and that consuming it improves matched-work outcomes. No such certificate-to-scheduler value is currently demonstrated.

**Disposition:** conceptual connection only; keep behind typed-handoff gate.

### 9. Symmetry -> learned reasons and caches: reusable abstractions should transform cleanly

A sound structural reason about an isomorphic residual should have a corresponding transformed reason. If reason identity depends on raw coordinates/ordering, equivalent failures may fragment into multiple cache entries or, worse, an abstraction may become accidentally orientation-specific.

Canonicalizing **reason identity** is conceptually different from canonicalizing the whole search state. A reason can often be normalized under a much smaller local symmetry/interface.

**Pathfinder reconciliation:** there is no demonstrated reason vocabulary yet, so this is premature for implementation. It is a future representation-quality criterion if learned structural reasons earn continuation.

**Disposition:** guardrail, not a new symmetry project.

### 10. Repair/operator adaptation -> scheduler: the same complementarity test applies at two scales

ALNS says adaptive operator selection is pointless until operators have complementary conditional value. Portfolio scheduling says the same about algorithms/configurations.

The transferable criterion is identical:

- exclusive successes;
- conditional success regions;
- overlap/correlation;
- marginal contribution per work;
- value changes with search phase/state.

This means repair adaptation should use the same economic standard as top-level scheduling rather than an unrelated reward system.

**Pathfinder reconciliation:** already strongly reflected in current docs: do not build adaptive repair selection before two operators independently earn complementary value.

**Disposition:** already absorbed.

### 11. Basin width -> failure learning: repeated conflicts may be a symptom of narrowness, not only a caching opportunity

Large backbone/frozen fractions, forced chains and low viable branching can generate recurring conflict structures. Therefore repeated explanations can serve two roles:

1. reusable pruning knowledge;
2. evidence that the residual feasible basin is narrow or fragmented.

Conversely, if conflicts are highly heterogeneous despite low solution count, abstract learning may remain weak.

**Pathfinder reconciliation:** useful for interpreting future reason-census results, but no current measurement exists.

**Disposition:** diagnostic interpretation only.

### 12. Feasibility/certificates -> beam: distance to a proof threshold may be heuristic information, but not a proof

Cut scarcity, matching deficiency, upper-capacity slack and residue restrictions can be predictive before they become outright contradictions. Their continuous/near-threshold versions may therefore guide beam ranking or survivor coverage.

This is exactly where the detector/certificate/heuristic distinction matters: a “nearly violated Hall condition” is not necessarily a sound prune.

**Pathfinder reconciliation:** current queue already allows feasibility-derived beam descriptors only when they add information beyond existing prunes and remain heuristic unless proven one-sided.

**Disposition:** already absorbed, with explicit role separation retained.

### 13. Future-equivalence abstractions -> exact/reference tooling: the oracle can test sufficiency, not merely liveness

Reference solving is currently used mostly to label a prefix live/dead. A stronger use is to search for counterexamples to a proposed abstraction:

> Two states share signature `I`; can the exact model find a continuation/property available from one but not the other?

This is an abstraction-refinement/CEGAR-like role. It does not prove universal equivalence from finite testing, but it can efficiently falsify an overcoarse interface before runtime integration.

**Pathfinder reconciliation:** the reference program already names counterexample search for new propagators/reasons, so this is a natural extension once a candidate interface exists.

**Disposition:** sharpen reference-oracle role; no new model program.

### 14. Portfolio/survival -> repair budgets: continuation value applies inside one repair trajectory too

The continue/restart/switch distinction exists inside repair:

- continue current repair trajectory;
- restart repair with new randomness;
- switch repair operator/reconstructor;
- abandon repair for another solver family.

This means “stagnation” should be valued conditionally by remaining opportunity, not merely iterations since improvement. LNS literature independently reached the same work-normalized conclusion.

**Pathfinder reconciliation:** multi-seed repair and scheduler repricing already make this connection visible. More repair-budget machinery is not justified until current tranche economics are measured.

**Disposition:** already absorbed.

### 15. Symmetry + portfolios -> controlled diversification

An equivariant base policy and intentional symmetry-breaking diversification are compatible. One can seek representation robustness while deliberately sampling alternate frames/orderings as portfolio variation.

The important distinction is between:
- accidental orientation bias;
- controlled random symmetry breaking with invariant aggregate behavior;
- measured complementary directional configurations.

**Pathfinder reconciliation:** aggregate directional inversions are currently balanced. Therefore eliminating every asymmetry could remove useful diversity; production variants still need fixed-work scheduler value.

**Disposition:** already absorbed in variant/scheduler policy.

---

## Cross-links that should **not** be promoted

Several plausible transfers are attractive but unsupported or duplicate closed work:

- **Future equivalence -> generic loose transposition tables:** unsafe unless the interface is proved sufficient; does not reopen the closed exact/loose DFS caching work.
- **Basin width -> production model counting:** exact/approximate completion counting is too expensive to assume useful; start from cheap proxies and oracle use only.
- **Certificates -> full CDCL/LCG:** a useful core does not imply a general conflict-learning architecture.
- **Certificates -> automatic repair destroy sets:** one core is not the unique cause, and minimum correction can be expensive.
- **Portfolio theory -> complex beam set optimizer:** the analogy supports marginal coverage, not DPP/submodular framework work before a descriptor earns value.
- **Symmetry -> canonicalize everything:** use symmetry as a representation audit; canonicalization addresses a different redundancy problem.
- **Attainability -> exact multidimensional spectra in the hot loop:** dimensionality remains the barrier.
- **Plan repair -> generic plan-repair subsystem:** the useful transfer is unrefinement/window/interface reasoning, not importing an architecture wholesale.

---

## Repo-aware disposition

### Already adequately absorbed

The current synthesis/queue already capture:

- feasibility/attainability -> beam future descriptors;
- feasibility/attainability -> repair regime descriptors;
- feasibility/certificates -> learned structural reasons;
- portfolio survival -> tranche repricing;
- operator complementarity -> no repair bandits before useful operators;
- symmetry -> first-divergence diagnosis and fixed-work diversification;
- basin width -> repair reconstructability;
- exact/reference model -> live/dead/counterexample microscope.

### Sharpen existing active work

1. **Repair:** when an exact residual neighborhood is UNSAT, consider assumption-core/correction-set information as offline evidence about which preserved commitments participate in the obstruction.
2. **Beam:** describe future-coverage value in portfolio terms: marginal capability not already represented by survivors, not generic distance.
3. **Representation research:** every proposed intrinsic descriptor should state expected invariance/equivariance under puzzle symmetries.
4. **Reference model:** once a candidate residual interface exists, use exact counterexample search to falsify insufficient signatures.

### New deferred questions, not current queue items

1. **Sound residual-context caching:** if a compact interface is independently shown/proved future-sufficient, can distinct histories share exact residual feasibility/search results despite low full-state recurrence?
2. **Certificate-guided unrefinement:** can exact residual cores/correction sets identify useful repair windows more directly than geometric rollback or coarse dependency proxies?
3. **Basin-width scheduler telemetry:** after static scheduling leaves headroom, do cheap forced-choice/interface/viable-branching signals predict which algorithm deserves the next tranche?
4. **Certificate-to-scheduler handoff:** does a structural failure/reason class produced by one stage predict the residual value of another strongly enough to justify a typed artifact?

These questions require evidence before implementation and should not compete with higher-ranked current work.

---

## Strongest common abstraction after the audit

The previous synthesis identified **residual interface state**. The cross-pollination audit strengthens that idea and clarifies what “interface” means.

It is not merely a feature vector. Ideally it is a boundary/context through which four kinds of information pass:

1. **feasibility:** what exact resources/outcomes remain attainable;
2. **equivalence:** which histories are substitutable because they expose the same future;
3. **repair:** which frozen commitments actually constrain the rebuilt region;
4. **explanation:** which subset of boundary commitments is sufficient to prove deadness.

Basin-width information adds a fifth, quantitative layer: how much feasible continuation mass/flexibility lies behind the interface.

Portfolio/scheduler research then asks whether that state predicts **which computation has marginal value**.

This gives a useful hierarchy:

- **proof interface:** sufficient for a sound prune/certificate/cache;
- **predictive interface:** correlated with future opportunity but not sound for hard rejection;
- **diagnostic interface:** expensive/oracle-derived representation used only to understand failures;
- **allocation interface:** cheap current-run summary that predicts action continuation value.

Do not silently promote one role into another.

## Bottom line

The eleven reports are more mutually reinforcing than the vertical synthesis alone made visible. The most important new sideways results are:

1. **cores/MCSs connect failure explanation directly to repair unrefinement;**
2. **future-equivalent residual contexts create a new, strictly sounder memoization question than exact-state recurrence;**
3. **beam selection can be understood as marginal portfolio coverage of future classes;**
4. **symmetry should audit every purportedly structural descriptor, not only orientation-specific work;**
5. **basin-width signals may later connect search-state geometry to scheduler continuation value.**

None of these justifies a framework build today. They improve the premises and failure modes of work already in the queue and create a small number of tightly gated deferred questions.
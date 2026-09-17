# Solver premise-space third pass

> **Status:** concluded-positive / ontology expanded
> **Base:** `main` at `ad8f86648d3f36198147b4c2121dff5f1961735c` (merged PR #1830)
> **Decision:** add P177-P196, first-loss causal taxonomy F0-F14, typed v3 relation delta, and an explicit warning that lifecycle transitions and observation mechanisms are premise-bearing objects.
> **Boundary:** research archaeology/documentation only; no production solver behavior change and no expensive experiment.

## Recovery and continuation

The stalled-session work requested for recovery was found intact and had already progressed farther than the old checkpoint described. Merged PR #1830 contains:

- the 92-proposition baseline register;
- the 26-proposition hostile second-pass extension P151-P176;
- human-readable atlas;
- typed relation graph and completeness matrix;
- second-pass audit/report and concept-map source.

That makes the recovered merged inventory **118 normalized propositions** before this pass. Because #1830 had already merged, it could not remain the live continuation PR. This pass therefore created one continuation branch/PR from the merge commit and kept all further work there.

## What this pass searched differently

The second pass correctly inverted the original method by searching every discovered category independently. Its remaining structural weakness was subtler: its main completeness object was still a matrix of **loci × claim types**. A well-filled matrix can miss assumptions that live:

- on transitions between loci;
- in the policy/budget under which an equivalence statement is made;
- in how the residual population was created;
- in observation/missing-data mechanisms;
- in counterfactual causal attribution;
- or in a search action whose value is informational rather than path-progressing.

This pass therefore used six additional lenses:

1. **edge/transition lens** — what can be lost between two locally adequate stages?
2. **counterfactual lens** — what minimal decision change would restore any accepted continuation?
3. **conditioning lens** — on what policy, budget, predecessor set, residual, or observer is a claim conditional?
4. **option/information-value lens** — can a branch be worth keeping or exploring without looking immediately good?
5. **population-formation lens** — how did the current residual/corpus become the population being reasoned about?
6. **ontology-failure lens** — what kinds of questions are not representable as cells in the existing map?

## New propositions

P177-P196 add 20 normalized propositions, bringing the descriptive inventory to **138**.

The most important additions are not algorithm proposals. They change the shape of the conceptual map.

### 1. Lifecycle handoffs are first-class causal loci

P177/P193 distinguish a new parent region: the interface between beam, DFS, repair, gates, attempts, external observers, and other stages.

The architecture already demonstrates why this matters. Production beam attempts discard live frontiers when a work cap ends even though an opt-in resumability primitive can reproduce uninterrupted continuation exactly. That establishes a concrete separation between **work stopped** and **search state destroyed**. P178 turns the architectural choice into an explicit proposition rather than treating it as incidental control flow.

The broader question is not merely beam resumability. It is whether every stage boundary has a sufficient handoff contract for:

- puzzle state;
- frontier/search state;
- remaining budget and censoring state;
- learned causal facts/proofs;
- uncertainty/diagnostic state;
- continuation rights and ownership.

### 2. Equivalence and dominance are policy-relative questions

P179/P180 challenge an implicit absoluteness in state-equivalence research. Two puzzle states can be indistinguishable under one remaining action set/budget and importantly different under another. Conversely, one state may dominate another only when continuation rights, learned knowledge, and remaining work are included.

This does not invalidate exact identity, coarse merge, behavioral-state quotient work, or sound dominance. It identifies the quantifier they require:

> equivalent/dominating **with respect to which legal future policy and work envelope?**

### 3. The residual is endogenous

P181/P182 elevate survivor-population formation into a governing epistemic premise.

The repo already documents selection conditioning in Corpus 1/2, solver-positive migration, cleanup/regeneration, repeated mining, and first-success portfolio censoring. The same logic applies to the live unsolved residual: every promotion removes the failures it can solve and leaves a population enriched for what the current architecture cannot.

Therefore:

- prevalence is epoch-relative;
- a technique's observed residual is predecessor-conditioned;
- historical nulls can become newly informative or newly irrelevant after large capability shifts;
- and a “Class-5 property” may partially describe the survivor process that created Class 5 rather than an intrinsic class of Pathfinder levels.

### 4. First divergence is not first causal loss

P183 is a critical refinement of P135.

Three events must be separated:

1. first divergence from one accepted witness;
2. first exact DEAD state on a production lineage;
3. earliest commitment whose minimal counterfactual revision restores at least one accepted continuation.

On multi-solution levels these can be far apart. A path can diverge from a witness while remaining LIVE; a later state can become provably DEAD due to a much earlier commitment. The new `solver-first-loss-causal-taxonomy.md` therefore requires causal classes to be assigned in order and allows `UNRESOLVED_EARLIER_CLASS` rather than forcing a convenient later explanation.

### 5. Option value and information value are not ordinary score

P184/P185 split two notions previously compressed into ranking/diversity/uncertainty language.

**Option value:** a poor-looking branch can be strategically valuable because it preserves a rare completion regime or keeps a reversible choice open.

**Information value:** an action can be useful because it reveals feasibility/conflict/structure even if that excursion will never be part of the final path.

These questions matter because the current architecture overwhelmingly values paths as candidate solutions. A premise-space map that shares that ontology can fail to imagine search actions whose product is knowledge.

### 6. Abandonment is an adaptive-control decision

P186 makes stopping one active hypothesis/architecture explicit. Scheduling research asks which action receives work and whether continuation has value. A distinct question is whether evidence accumulated during the run should cause the solver to **stop buying that kind of work** and redirect before the outer budget forces termination.

This is the negative face of adaptive routing: not only “what should run next?” but “what has earned the right to stop?”

### 7. Capability is non-monotone under a finite envelope

P187 generalizes a fact already implicit in matched-work gates and gain/loss accounting. More precision, larger state, extra search work, or another treatment does not form a monotone capability lattice in production. It can:

- displace unique work;
- change ordering;
- alter retention;
- consume budgets before complementary stages;
- destroy rare winners even while increasing net solve count.

This means architectural reasoning cannot use set-inclusion intuition such as “the new solver can do everything the old one can, plus X” unless execution semantics actually preserve that property.

### 8. Instrumentation has a missing-data mechanism

P188 extends P167 trace censoring. The observer sees states generated by the policy being studied, under an observer budget, and the observer itself can consume work or require reduced tracing.

Absence of an observed distinction can therefore mean:

- the distinction does not exist;
- the policy never reached it;
- tracing ended first;
- telemetry did not record the required state;
- instrumentation cost changed the encounter distribution.

The premise map should treat `observed=false` and `semantically absent` as different states.

### 9. Solve-local knowledge needs legality/provenance

P189 sits at the intersection of level blindness and communication. Facts can be:

- legal current-instance deductions available to production;
- offline exact/oracle facts used only for research labels;
- hypotheses inferred from historical evidence;
- hidden witness information forbidden as steering.

A future proof store/blackboard without provenance would face a false choice between illegal oracle leakage and throwing away useful legal deductions. Provenance is therefore part of the representation problem, not merely governance paperwork.

### 10. Generator coverage should target solver-relevant structural space

P190/P191 refine the generator question.

The current apparatus already has three materially different construction regimes, and its contracts carefully limit transfer claims. The missing parent question is whether coverage is being measured in dimensions that matter to **solver failure**:

- solution multiplicity/regime geometry;
- path-history topology;
- separator/interface structure;
- resource-contention patterns;
- reachable LIVE/DEAD sibling structures;
- action-source scarcity;
- state-equivalence counterexamples;
- causal first-loss classes.

A superficially broad level distribution can still be narrow in those dimensions. Further, solvable-by-construction retention induces its own distribution over solution topology. This does not make generated corpora invalid; it tells research what they do not automatically represent.

### 11. Credit may belong to compositions, not named techniques

P192 turns predecessor dependence into a causal-attribution question. A solve produced only by A→B or by a fact learned in A and consumed in B should not necessarily be credited cleanly to B as a standalone capability.

This matters to capability memory and closure. If the causal unit is a sequence, preserving only the nominal winner can destroy the actual mechanism.

### 12. Upstream setup can be a revisable hypothesis

P195 fills two cells the completeness matrix itself marked effectively empty: revision semantics for preprocessing and start/action generation.

If dynamic topology, causal failure, or repeated non-yield reveals that root preprocessing, a gate assumption, or the action grammar is inadequate, downstream ranking/repair cannot recover a successor that the current representation/source never permits.

## First-loss causal taxonomy

The dedicated instrument defines F0-F14:

- F0 semantic/input mismatch;
- F1 representation absence;
- F2 source/action absence;
- F3 unsound rejection;
- F4 antecedent commitment causing later inevitable rejection;
- F5 ranking suppression;
- F6 retention/merge extinction;
- F7 work starvation;
- F8 routing/deployment miss;
- F9 repeated known failure;
- F10 explanation failure;
- F11 revision mismatch;
- F12 handoff loss;
- F13 terminal/validation rejection;
- F14 measurement misdiagnosis.

The taxonomy's key rule is causal precedence. A later observed event is not the first-loss cause while a plausible earlier class remains unresolved.

## Historical conclusions whose scope should change

This pass did not reopen closed treatments automatically. It narrowed several tempting over-generalizations:

- **Broad retries/randomization closed** does not imply history-sensitive abandonment, stochastic diagnosis, or continuation-state preservation is closed.
- **Behavioral-state quotient tested-form negative** does not imply all useful equivalence/dominance relations are false; policy-relative equivalence and proof-bearing partial orders remain different parents.
- **Ranking/scoring saturation** does not imply frontier option value or information-valued actions are exhausted; those use different decision objects.
- **One accepted witness explains a miss** is too strong without solution-space multiplicity or a counterfactual minimal-cause argument.
- **A technique has value V on the residual** is incomplete without predecessor/portfolio context because the evaluated population is endogenous.
- **Generator independence provides adequate coverage** is too broad; independence of construction method and coverage of solver-relevant structural state are separate claims.
- **Budget stop is merely less work** is too broad when the architecture discards continuation state at the stop.

## Negative-space regions after the third pass

The densest remaining negative space now has a recognizable structure.

### A. Edge semantics

The repo is much better at specifying mechanic-state contracts than search-stage contracts. The question is what information must survive boundaries so a downstream capability can exploit evidence already paid for upstream.

### B. Counterfactual causal diagnosis

LIVE/DEAD labels and divergence traces answer observational questions. The missing layer is minimal intervention: which smallest earlier choice changes the reachable completion set?

### C. Conditional semantics

Equivalence, dominance, continuation value, technique value, and residual prevalence all require explicit conditioning variables: policy, budget, predecessor sequence, architecture epoch, and population formation.

### D. Search actions that produce knowledge

The dominant ontology still assumes an action's product is a better candidate path. Exact queries, probes, diagnostic excursions, and uncertainty-reducing branches suggest a second product type: information that changes future decisions.

### E. Solver-relevant distribution geometry

Current corpora are increasingly well-governed by provenance, but there is still no established coordinate system for whether generated populations span the structures that distinguish solver capabilities.

## Hostile completeness audit

### Premise types

- mechanism: independently searched again, particularly continuation, retention option value, information-valued action, stopping;
- architecture: independently searched at loci **and transitions**, including state/equivalence, handoffs, setup revision, frontier lifetime;
- epistemic: independently searched for endogenous selection, instrumentation/missingness, composition credit, generator selection, and provenance.

### Question functions

The existing functions remain populated. This pass adds or sharpens three function families that deserve explicit recognition:

- **handoff / interface** — what must survive between reasoning/search stages;
- **conditioning / scope formation** — what policy/population/predecessor makes the claim true;
- **information acquisition** — actions whose primary output is knowledge rather than path progress.

These should be treated as cross-cutting functions rather than forced under communication, evidence, or routing alone.

### Major solver subsystems

The pass checked the current architectural flow, attempt policy, DFS/beam split, coarse merge, mechanic-bucket retention, production frontier disposal/resumability, state object fields, preprocessing, routing regimes, and validation boundary. Code-only assumptions extracted include:

- root preprocessing is largely static;
- production state excludes explicit solve-local epistemic/work-history state;
- attempt configs are first-match/hand-tuned policy products;
- beam merge is knowingly lossy and policy-specific;
- live beam continuation is disposable in production despite a proved resumability primitive;
- frontier state and learned evidence do not have a general cross-stage contract.

### Historical/epistemic material

The pass reconciled merged premise-map work, current architecture, stress-corpus provenance/generator contracts, reasoning-capability atlas conclusions already merged via #1828, and the contemporaneous Lane D/LNS results visible in recent PR history. The latter reinforce rather than replace premise-map conclusions: per-instance relational queries are showing within-state decision signal, while cheap full-path construction remains method-limited.

### Parent versus tested form

No new parent was declared closed from a child null. The third-pass relations explicitly preserve tested-form, specialization, dependency, confounding, and prerequisite distinctions.

### Empty/sparse cells

The second-pass matrix's explicit empties around preprocessing revision and start/action persistence/revision were investigated rather than merely listed. P195 is the resulting parent premise. The broader discovery is that sparse **edges between rows** can matter even where both endpoint cells are populated.

## What would make this map embarrassingly incomplete?

Plausible failure modes considered:

1. **The ontology only describes current runtime objects.** Mitigation: alternative search objects, information actions, and generator/state-space coverage remain explicit.
2. **It confuses observations with causes.** Mitigation: counterfactual first-loss taxonomy and minimal-intervention requirement.
3. **It ignores population formation.** Mitigation: endogenous residual and portfolio-conditioned survivor premises.
4. **It assumes more capability is monotone.** Mitigation: non-monotone/displacement premise.
5. **It treats stage boundaries as plumbing.** Mitigation: handoff/interface premises and F12.
6. **It cannot represent questions about the observer.** Mitigation: instrumentation/missing-data premise and F14.
7. **It makes witness-relative diagnosis universal.** Mitigation: solution multiplicity plus causal-loss distinction.
8. **It inventories nodes but not relations.** Mitigation: typed v3 relation delta and ontology-edge meta-premise P196.
9. **It overfits generated distributions.** Mitigation: solver-relevant coverage and construction-solvability selection premises.
10. **It misses ideas that existed only in deleted/unindexed history or conversation.** This remains genuinely possible. The map can reduce the risk by making structural holes visible, but cannot prove recovery of undocumented thought.

## Practical exhaustiveness assessment

The map is now substantially more exhaustive as a **conceptual instrument** than as a historical transcript. It spans runtime mechanism, architecture, research epistemology, solution-space structure, population formation, lifecycle transitions, causal attribution, and ontology self-critique.

The highest-value remaining incompleteness is no longer “there must be another list of heuristics somewhere.” It is empirical: the map still does not know the **distribution of causal first-loss classes**, the **geometry/multiplicity of accepted solution regimes**, the **prevalence of search-stage handoff losses**, or the **coverage of solver-relevant structural state across available generators**.

Those are premise-generating unknowns, not arguments for immediately implementing a mechanism.

## Artifacts added by this pass

- `docs/solver-premise-space-extension-2026-09-17b.csv` — P177-P196;
- `docs/solver-first-loss-causal-taxonomy.md` — F0-F14 causal-loss instrument;
- `docs/solver-premise-space-relations-v3.json` — typed relation delta;
- this report — methodology, negative-space findings, hostile completeness audit, and provenance.

## Surfaces searched / limitations

Searched/reconciled directly in this continuation:

- merged PR #1830 and its durable premise-map artifacts;
- current `main` architecture documentation;
- second-pass completeness matrix and extension register;
- stress-corpus/generator contract and selection-provenance discussion;
- recent PR history around #1827-#1833, including reasoning-capability atlas, separator census, sibling harvest, relational-feasibility work, and complete-path LNS falsifier;
- repository tree/workflow surface sufficiently to confirm the breadth of solver evidence infrastructure.

The prior #1830 pass had already performed the deeper archaeology over current authorities, dead tooling, and historical lineages. This continuation did not rerun every historical commit diff from scratch. Local-only worktrees/stashes cannot be inspected through the GitHub connector; the recovery requirement was satisfied because the formerly stalled material was found durable in the merged remote PR before expansion.

No expensive experiment was run.
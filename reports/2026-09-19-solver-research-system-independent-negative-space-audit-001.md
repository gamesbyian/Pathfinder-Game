# Independent audit of the Pathfinder solver-research system

> **Status:** concluded-positive
> **Last evidence:** 2026-09-19 — independent audit frozen before PR #1921 exposure
> **Decision:** preserve this audit as the primary independent record; its earned refinements are incorporated through the reconciliation report and plan
> **Remaining gate:** none
> **Date:** 2026-09-19
> **Independence boundary:** this report was completed from current `main` before reading PR #1921, branch `chatgpt/research-system-consolidation-epistemic-coverage-2026-09-19`, or `docs/solver-research-system-consolidation-and-epistemic-coverage-plan.md`.
> **Purpose:** audit the coupled relationship among solver architecture, research infrastructure, research questions, and scientific method.
> **Priority boundary:** this report does not change solver execution priority. `docs/solver-optimization-workstreams.md` remains authoritative.
> **Compute:** repository archaeology, existing artifacts, schemas, code, and reports only. No large solver/reference compute was launched.
> **Search limitation:** GitHub code search was unavailable for this repository during the audit, so the reconstruction used direct file reads, commit archaeology, current authorities, implementation files, and emitted-artifact contracts rather than search-index summaries.

## Executive conclusion

Pathfinder has built a genuinely sophisticated research system. It is substantially more than a pile of well-linked reports. Discoverability and referential interoperability are strong, scientific guardrails are unusually mature for an engineering research project, negative-result discipline is generally good, and recent work has explicitly repaired population selection, causal ancestry, evidence-role consumption, opportunity denominators, instrument abstention, and claim-propagation errors.

It is not yet fully **scientifically interoperable**.

The main weakness is not missing metadata. It is that scientific meaning is still carried by a mixture of structured objects, local adapters, report conventions, and expert prose. A research block knows one `independentUnit`; a result manifest knows a population, limits, execution mode and a question; a report knows selection history and inference scope; a Resource Contract knows dependence and admissible use; an exact instrument knows abstention; a question knows reopen conditions. These pieces often compose correctly because the current research discipline is careful. They do not yet compose correctly **by construction** across every important evidence-to-decision boundary.

The system is therefore strongest at answering questions once they have been converted into one of its mature experimental shapes. It is weaker at three things:

1. carrying scientific semantics across heterogeneous subsystems without relying on prose;
2. identifying correlated epistemic channels when apparently independent findings share an oracle, normalizer, analysis method, ontology, source history, or research agent;
3. discovering questions whose relevant object is weakly represented in both the solver and the research system.

The most important negative-space result is that Pathfinder has already done serious ontology escape. The premise map explicitly contains uncertainty, information-valued actions, completion-regime option value, causal loss, alternative search objects, information authority, information half-life, generalization-unit questions, and reciprocal completeness. Re-inventing those ideas under new names would be fake novelty. The remaining problem is more interesting: several important concepts are **representable but low-answerability**. The repo can name them, but it lacks the observer, intervention, exact primitive, population constructor, or solver object required to turn them into discriminating evidence.

The strongest credible dual deficit is **completion-regime or option-set state**. The repo already names the concept, but the solver does not carry an explicit representation of which qualitatively distinct completion regimes remain, and the research system does not have a direct primitive for labelling the remaining option set of a candidate. Current exact tooling is excellent at asking whether one explicit prefix, event, or commitment is feasible. It is much less direct at asking which distinct forms of future completion remain available and which decision destroys a uniquely valuable one. That gap plausibly connects several otherwise separate failures of scalar descriptors, generic diversity, event vocabularies, and forward-prefix ranking. It is not yet evidence for a production feature. A small offline discriminator is warranted before any architecture.

The strongest research-system-only deficit is that the **research agenda itself is an endogenous survivor population**. Pathfinder explicitly understands that the solver residual is conditioned by the predecessor portfolio. The same logic has not been made equally explicit for research questions. Questions become salient because current telemetry, corpora, exact models, forward-prefix objects, asset joins, and historical vocabulary make them measurable. The question registry records causal succession through `triggeredBy`, but not the selection history of the agenda itself. This matters because a repository-relative premise map can reach semantic saturation while still being blind to questions for which the repository never emitted the necessary object.

A bounded blinded agenda reconstruction is the right discriminator. A new registry is not.

The strongest concrete implementation defect found is smaller but unambiguous: **the v3 experiment-result JSON Schema is already inconsistent with the v3 artifacts the publisher intentionally emits.** The publisher and its tests use fields such as `population.researchBlock`, `population.corpusIdentity`, `population.selection`, and `limits.representation`, while the nested schema sets `additionalProperties: false` and does not admit those fields. No separate schema-validation path was found that repairs the discrepancy. This is direct evidence for the audit premise that a shared `schemaVersion` does not establish semantic compatibility.

Overall, the next useful step is not a research operating system. It is a small set of semantic repairs plus a few bounded investigations:

- repair the v3 schema/producer mismatch and actually validate a representative emitted artifact;
- carry richer scientific unit semantics across decision-bearing handoffs instead of one scalar `independentUnit`;
- make the most decision-sensitive analysis semantics and negative-resolution boundary travel with durable evidence, without forcing every exploratory run into ceremony;
- represent multidimensional dependence when evidence is being claimed as triangulation;
- add bounded derivation/invalidation edges only where a shared instrument or decision-bearing transformation can materially contaminate downstream claims;
- run a blinded agenda reconstruction before creating agenda-provenance infrastructure;
- run a tiny option-set/completion-regime surrogate before implementing a new solver search object.

That is enough to expand the project’s useful knowledge surface without turning research infrastructure into the project’s new optimization target.

## 1. Independent reconstruction of the research architecture

### 1.1 Authority and execution

`docs/solver-optimization-workstreams.md` is the sole current priority authority. It owns live gates and keeps current solver work from being displaced by interesting infrastructure. `docs/solver-future-work.md` holds deferred ideas and explicit reopen conditions. `docs/solver-opt-in-experiment-ledger.md` owns disposition of default-off implementation forms. This separation is healthy: scientific interest, execution priority, and production disposition are not conflated.

The live workstream has also become increasingly question-shaped rather than patch-shaped. Current lanes distinguish capability existence, production participation, work dose, decision-context disagreement, exact/reference support, and matched-work economics. Several recent lines close narrow tested forms without pretending to close semantic parents.

### 1.2 Questions, premises and measurement opportunities

The question relation registry is deliberately sparse. It records durable question identities, state, `answeredBy`, `triggeredBy`, `implies`, calibration/control relations, constraints, premise references, measurement opportunities and reopen conditions. It is a cross-question memory, not a second queue.

The premise-map system is much broader. It has undergone:

- independent reconstruction under quarantine;
- reciprocal source coverage;
- hardening against source-space incompleteness;
- a preregistered twelve-lens mining round;
- ontology stress tests;
- explicit treatment of causal ancestry, consumed evidence roles, claim drift, rival discriminability, opportunity denominators, information authority, mechanism maturity, generalization units, and information lifetime.

The important audit result is that the premise map is not merely a mechanism taxonomy. It already contains much of the project’s epistemology. Its own closeout correctly claims repository-relative saturation rather than universal conceptual completeness.

Measurement Opportunities add another layer. They require a live ambiguity and discriminating observable and explicitly avoid granting priority merely because an instrument exists.

### 1.3 Research assets and resource contracts

The research-data asset registry provides strong discoverability and join topology. It records grain, join keys, affordances, caveats, and evidence roles. The Resource Contract is the strongest current cross-system scientific contract. It asks not only what a resource contains but what it is entitled to support. It includes identity layers, selection/conditioning, dependence, missingness, information loss, consumer blast radius, and prospective repair.

This is a major strength. It also exposes the current architecture’s asymmetry: audited durable resources receive rich semantic treatment, while experiment/result/question handoffs carry a thinner subset of those meanings.

### 1.4 Population, generation and family lineage

The generation system preserves productive implementation diversity. Targeted, random and topology generators share a research-facing dispatcher but remain separate algorithms and evidence regimes. Multi-source suites coordinate acquisition without pooling evidence identities. Outcome-blind matched cohorts add selection provenance without manufacturing a new independent unit.

The corpus-selection reconstruction is an especially important scientific correction. Current Corpus 1 and Corpus 2 are historically selected mixtures, so their filenames do not imply generator independence. This materially narrowed prior transfer claims. The correction demonstrates that Pathfinder can revise its own evidence ontology when selection history proves a prior abstraction false.

Variant-family research similarly handles descendant dependence correctly: parent is the relevant broad independent unit, and descendants are controlled transformations rather than independent replication.

### 1.5 Experiment contracts and durable evidence

Modern experiment contracts are fail-closed on many important execution facts:

- immutable execution identity;
- configuration identity;
- intended population identity;
- complete versus decision-valid coverage;
- solver history-awareness and level-blindness;
- scheduler mode;
- work/node/wall limits;
- side effects;
- explicit research question ambiguity and discriminating observable where supplied.

Durable experiment bundles preserve manifests and included evidence files with hashes. This gives the project good reconstruction of **what ran**.

The thinner point is reconstructing **what inferential transformation was licensed** from that run. Some of that lives in the report, preflight, question registry, research block, and Resource Contract rather than the durable result object itself.

### 1.6 Instruments

Exact/reference tooling is notably disciplined. CP-SAT explicit-prefix reference keeps LIVE/DEAD separate from timeout, unsupported mechanics, model invalidity, illegal prefixes, and referee-rejected witnesses. Known-solution-prefix survival explicitly treats its oracle set as a conditioning set and refuses to infer full solution extinction from loss of known support.

Production-inert decision observation is also scientifically strong. It preserves actual candidate ordering, retention and work context, and permits annotations to be `SUPPORTED`, `UNKNOWN`, or `UNSUPPORTED`. D1’s preflight requires observer-on/off behavioral parity.

The system is therefore not generally weak at instrument validity. Its larger issue is **correlated instrument dependence across research lines**.

## 2. Interoperability findings

### 2.1 Discoverability interoperability: strong

Question lookup, the status index, asset registry, premise map, Resource Contract audits, research relations, acquisition preflight, capability memory, and durable evidence create several useful ways to discover adjacent evidence.

A researcher can usually find that a relevant artifact exists.

### 2.2 Referential interoperability: strong but heterogeneous

Stable question IDs, block IDs, parent IDs/content identities, population hashes, experiment IDs, run IDs, generator/source identities, evidence roles, and artifact paths allow many correct joins.

However, the same scientific concept appears in several value dialects. Examples include:

- population identity in experiment contracts versus research blocks versus Resource Contracts;
- independent unit as a scalar string in research blocks while reports reason about more complex clustering;
- outcome terminology adapted separately for solver sweeps and CP-SAT cases;
- evidence roles in blocks versus report conventions;
- source/generator and selection semantics spread across generation manifests and corpus-selection authority.

Local adapters are often the right choice. The problem begins when a field name creates the impression that two objects carry the same scientific meaning when they only carry compatible identifiers.

### 2.3 Semantic interoperability: uneven

The strongest common semantics are:

- evidence role;
- population identity;
- generation versus selection;
- work versus raw nodes versus wall time;
- timeout/error/unsupported abstention;
- level-blindness;
- parent-family dependence;
- production disposition versus demonstrated capability.

The weakest shared semantics are:

- observation, assignment, dependence, analysis and generalization units as distinct objects;
- estimand or discriminating quantity after it leaves a preflight/report;
- analysis-plan identity and amendment history under high selection pressure;
- negative-result resolution;
- multidimensional independence;
- claim scope;
- instrument/common-method dependence;
- derivation and reverse invalidation.

These meanings are often handled correctly in an individual report. They are not yet reliably portable between subsystems.

### 2.4 Inferential interoperability: good locally, weaker transitively

A carefully designed lane can move safely from question to design to execution to claim because the preflight and report own the whole chain.

The transitive case is weaker. When the result moves through:

`report -> question state -> capability memory -> future work -> workstream decision`

scope, conditioning, maturity, ancestry and evidence role are partly prose-dependent. The premise-map hardening work explicitly discovered this as claim-propagation drift.

The system therefore has **good local inference discipline without a fully explicit cross-system inference type**.

### 2.5 Productive independence: recognized, but incomplete as a method

The repo correctly preserves independent generator implementations and keeps exact/reference tooling distinct from the production solver. The independent premise reconstruction also used a real quarantine boundary.

But the project usually treats “independent” through data/sample, source/distribution and parent/cluster dimensions. Important additional common-mode dependencies are rarely made explicit:

- exact oracle/model;
- normalizer;
- instrumentation code;
- analysis implementation;
- critical libraries;
- model/agent family;
- ontology;
- historical narrative/source exposure.

This matters most when several results are presented as corroborating one conceptual conclusion.

## 3. Concrete semantic defect: v3 schema drift

This audit found a direct contract mismatch on current `main`.

`scripts/publish-solver-sweep-result.mjs` intentionally emits scientific fields including:

- `population.corpusIdentity`;
- `population.selection`;
- `population.researchBlock`;
- `limits.representation`;
- top-level `researchQuestion`;
- top-level failure-evidence metadata.

Its node test explicitly asserts the research block and representation fields.

But `docs/solver-experiment-result.schema.json` declares `additionalProperties: false` inside both `population` and `limits`, while omitting those fields. A representative artifact produced by the current publisher can therefore violate the published v3 schema.

No separate current validator was found that reconciles or validates the publisher output against that JSON Schema. The historical evidence-integrity audit is a different authority and does not close this gap.

**Classification:** strongly supported by current evidence.

**Smallest fix:** update the schema to the actual supported v3 shape and add one test that validates a representative publisher output against the schema. Do not use the repair as an excuse to add speculative scientific fields.

This finding is small architecturally but important epistemically: schema identity currently overstates semantic compatibility.

## 4. Evidence-to-decision chain findings

### 4.1 Problem and question

Current questions are usually well-scoped once admitted. The question registry and premise map prevent many forms of rediscovery.

The weak seam is earlier: **why did this question become an object of research at all?** The registry records question ancestry among admitted questions, not the selection history of the possibility space.

### 4.2 Rivals and design

Recent preflights increasingly state live ambiguities, discriminating observables, and outcome interpretations. The experiment preflight can carry them as structured `researchQuestion` metadata.

This is good. It means a blanket recommendation for “preregistration” would be academic theater.

The remaining opportunity is to make pre-outcome analysis semantics travel with decision-bearing evidence when the analysis has meaningful degrees of freedom. Current report conventions freeze:

- treatment/control;
- population and selection;
- inference scope;
- primary outcome;
- candidate handling;
- stop/advance rules;
- external/reference baseline.

They do not generally give the durable result a machine-joinable analysis-plan identity or amendment trail.

### 4.3 Population and treatment participation

This is one of Pathfinder’s strongest areas. Opportunity populations, target-stage participation, control-failure conditioning, independent-unit sizing, family grouping, population integrity, and treatment reach are all explicitly treated.

The remaining weakness is portability of **unit semantics**, not lack of awareness.

### 4.4 Instrument and execution

Instrumentation parity, exact/reference abstention, work ceilings, deadlines, run identity, source revision and side effects are handled well.

Shared instrument defects can nevertheless create correlated false confidence because instrument dependence is not normally part of a triangulation record.

### 4.5 Analysis and negative resolution

Reports are often excellent at saying exactly what a negative closed. H1 closes a frozen event vocabulary, not all relational feasibility. DEAD-core closes size-1, not size-2. Lane E reports the true number of independent divergence points rather than nominal candidate rows.

What does not travel uniformly is a compact answer to:

> What magnitude, frequency, class, or opportunity rate was this negative capable of detecting or excluding?

For deterministic bounded forms, the tested-form definition is often enough. For sampled or sparse-opportunity questions, a negative-resolution statement would protect later readers from silently broadening the result.

### 4.6 Claim, decision and downstream propagation

Question closeout and capability memory correctly separate production disposition from demonstrated capability.

The weak seam is derivation. There is not a general machine-readable chain from:

`primary evidence -> transformation/analysis -> report claim -> question disposition -> queue/capability-memory descendant`.

Resource Contract blast-radius analysis and consumption lineage solve parts of this. A universal provenance warehouse is not justified. A bounded derivation relation for decision-bearing closeouts and shared high-leverage instruments would materially improve reverse invalidation.

## 5. Negative-space findings

### N1. The research agenda is itself a conditioned survivor population

**Hidden assumption:** the set of research questions being considered is a neutral sample of important solver questions.

**Why it escaped notice:** the repo correctly models conditioning in solver residuals and corpus selection, but question admission is mostly treated as a knowledge-management problem after a question already exists.

**Evidence:** current research is naturally dense around objects the system can observe and join: forward-prefix states, beam ranking/retention, current residual classes, exact-labelled prefixes, family transformations, scalar work and existing generator regimes. The premise-map completeness report itself notes that all source material is historically conditioned by the apparatus that produced it.

**Newly expressible question:** which important solver questions would an investigator generate without exposure to the current question registry, premise map, queue, historical narrative and standard instrument vocabulary?

**Answerability:** plausible and cheaply testable.

**Smallest discriminator:** one blinded reconstruction round using game rules, objective, raw current solver architecture/behavior and carefully chosen primary evidence while quarantining current research synthesis, question registry and premise map. Compare only after the independent question set is frozen.

**Solver implication:** may expose a missing solver object or architecture rather than another treatment inside the current search grammar.

**Research-system implication:** if a bounded repeat produces material solver-relevant questions absent from the current map, then question-selection provenance deserves a lightweight first-class treatment. If not, do not build it.

### N2. Repository-relative ontology saturation can coexist with low-answerability

**Hidden assumption:** once an important concept has a premise ID or ontology location, the system can meaningfully investigate it.

**Why it escaped notice:** premise mapping is necessarily representation-focused, while research execution is instrument-focused.

**Evidence:** P148/P184/P185/P199/P200 and related lanes already name uncertainty, option value, information-valued action, generalization unit and information lifetime. Several remain difficult to test because no direct observer, intervention, exact primitive, controlled population or solver consumer exists.

**Newly expressible question:** which premise families have high conceptual coverage but no cheap discriminating experimental path?

**Answerability:** strongly supported as a distinction, candidate-by-candidate answerability varies.

**Smallest discriminator:** derive an “answerability sketch” only for high-value current premises, naming observer, intervention, unit, support envelope, smallest falsifier and plausible consumer. Do not create a complete new registry.

**Solver implication:** redirects work from feature invention toward missing experimental primitives only where a consumer exists.

**Research-system implication:** prevents conceptual completeness from being mistaken for empirical reach.

### N3. Current exactness is predicate-rich but option-set-poor

**Hidden assumption:** asking enough feasibility questions about explicit prefixes/events/commitments will expose the important future structure.

**Why it escaped notice:** the CP-SAT/reference stack is powerful and scientifically disciplined, so its representational boundary is easy to confuse with the puzzle’s natural ontology.

**Evidence:** exact tooling cleanly answers prefix feasibility, pinned events, revisit commitments and relaxations. H1’s prespecified event vocabulary failed to produce a recurring descriptor; generic structural diversity also failed to preserve viable future optionality; D1 produced a forensic exact discriminator but no production decision disagreement.

**Newly expressible question:** from one current candidate, what qualitatively distinct completion regimes remain, and does a retention decision destroy a regime not represented elsewhere?

**Answerability:** plausible and cheaply testable on a small selected frontier, but currently low-answerability as a general construct.

**Smallest discriminator:** on a tiny set of cutoff-bearing sibling candidates, prespecify a small set of mutually exclusive future commitment regimes, exact-label which regimes remain feasible, and test whether regime-set identity adds information beyond current score/obligation descriptors and touches an actual retention decision.

**Solver implication:** only a positive discriminator would earn an option-preserving retention/search-object experiment.

**Research-system implication:** may require a set-valued exact label and regime identity, not a general new exact service.

### N4. Scientific units are richer than the current portable unit field

**Hidden assumption:** one `independentUnit` is enough to prevent pseudoreplication.

**Why it escaped notice:** careful reports manually repair the ambiguity, so local inference often remains correct.

**Evidence:** recent reports distinguish 449 queries from parent support, 12,277 segment pairs from three independent flipper-bearing levels, and four candidate pairs from two independent divergence points. Opportunity sizing separately distinguishes informative rows from independent opportunity units.

**Newly expressible question:** for a decision-bearing result, what are the observation, assignment, opportunity, dependence/cluster, analysis and generalization units?

**Answerability:** strongly supported.

**Smallest discriminator:** introduce a small structured unit-semantics value object at decision-bearing handoffs and migrate only one or two high-value producers first. If it does not prevent an actual ambiguous join or analysis, stop.

**Solver implication:** none directly, but it prevents false confidence that can steer solver implementation.

**Research-system implication:** high-value semantic interoperability improvement with little new machinery.

### N5. “Independent” evidence can share a common epistemic implementation

**Hidden assumption:** independent samples, parents, or generators are sufficient to call two conclusions independent.

**Why it escaped notice:** those are the most common dependence errors in solver experiments, and the repo has correctly focused on them.

**Evidence:** the independent premise reconstruction was genuinely ontology-quarantined, but it still drew from the same repository, history, code and evidence universe. Many research lines share the same CP-SAT model, normalizers, referee, telemetry producers, analytical helpers and likely research-agent/model family.

**Newly expressible question:** along which dimensions are two corroborating channels independent, and along which do they share common-mode failure?

**Answerability:** strongly supported conceptually; materiality is claim-specific.

**Smallest discriminator:** for conclusions explicitly presented as triangulated, record categorical dependency dimensions such as data/parent/source, instrument/oracle, normalization, analysis method, model/agent, ontology and critical implementation. No scalar score.

**Solver implication:** can distinguish real replication from one measurement channel repeated.

**Research-system implication:** protects the strongest claims without burdening every artifact.

### N6. Scientific memory can contaminate independent reconstruction without becoming factually false

**Hidden assumption:** if historical evidence is correctly marked current/superseded/forensic, making it maximally discoverable is always beneficial.

**Why it escaped notice:** the repo has had large real problems with forgotten evidence, so preservation and discoverability were rational priorities.

**Evidence:** the premise reconstruction needed explicit quarantine to avoid recent ontology contamination. Current status tooling already prefers current authority, but ordinary archaeology exposes agents to historical vocabulary, framing and “obvious” question lineages.

**Newly expressible question:** when should evidence remain retrievable but be withheld from a reconstruction whose purpose is independent question generation?

**Answerability:** plausible and cheaply testable.

**Smallest discriminator:** reuse a documented blinded-source bundle for one agenda-reconstruction exercise. Do not add automatic time decay.

**Solver implication:** indirect, through more independent hypothesis generation.

**Research-system implication:** quarantine and salience become deliberate experimental controls rather than permanent metadata states.

### N7. Derivation is less reconstructable than execution

**Hidden assumption:** preserving the run, its population, its files and its report is enough to reconstruct the downstream scientific claim.

**Why it escaped notice:** recent durable-evidence work correctly focused first on preventing loss of primary execution evidence.

**Evidence:** durable bundles retain strong run provenance, but report-level transformations and downstream claim/disposition edges are not uniformly represented. Question `answeredBy` and report links are not equivalent to a derivation graph.

**Newly expressible question:** if a shared oracle, normalizer, population reconstruction or analysis is later invalidated, which decision-bearing conclusions need reconsideration?

**Answerability:** strongly supported for bounded high-leverage chains.

**Smallest discriminator:** add derivation/transformation references only to decision-bearing closeouts and shared high-leverage instrument outputs, then verify reverse traversal for one known historical correction.

**Solver implication:** reduces persistence of invalid research decisions after an evidence defect is found.

**Research-system implication:** bounded reverse invalidation, not a universal provenance warehouse.

### N8. A correct promotion objective can still make precursor capability invisible

**Hidden assumption:** capabilities worth researching will quickly show a matched-work solve/work effect.

**Why it escaped notice:** requiring solve/work value for promotion is correct and protects the project from proxy optimization.

**Evidence:** multiple lines correctly stop after a phenomenon fails to touch a current decision seam. But some plausible precursor capabilities, such as uncertainty estimation, information acquisition, option preservation, recovery and alternative search objects, may only become valuable when paired with a consumer that does not yet exist.

**Newly expressible question:** which precursor capability has a concrete downstream decision that would change if the capability existed, even though the end-to-end consumer is not yet implemented?

**Answerability:** conceptually represented by the mechanism maturity ladder; candidate-specific.

**Smallest discriminator:** require a counterfactual consumer test or offline decision replay before implementation. A precursor with no decision-changing consumer remains scientifically interesting but out of solver scope.

**Solver implication:** protects high-leverage stepping stones without weakening the promotion contract.

**Research-system implication:** separates “not production valuable yet” from “not worth investigating.”

## 6. Dual-deficit map

| Candidate | Solver deficit | Research deficit | Current traces | Smallest discriminator | Classification |
|---|---|---|---|---|---|
| Completion-regime / option-set state | no explicit representation of qualitatively distinct remaining completion regimes | no direct set-valued regime label or prevalence instrument | generic-diversity null, H1 partial blocked interfaces, exact sibling contrasts, retention traces | exact-label a prespecified small regime set on cutoff-bearing siblings | **plausible and cheaply testable; concept already represented** |
| Epistemic / uncertainty state | no calibrated belief/uncertainty object used by policy | no standard decision-conditioned information-gain instrument | heuristic disagreement, UNKNOWN exact answers, shadow probes, failure history | test whether one bounded information query changes a real later choice under fixed work | **plausible but currently low-answerability; concept already represented** |
| Alternative abstract/backward plan object | production search remains predominantly forward-prefix | exact/replay tooling is predominantly prefix/current-state shaped | G2 deferred line, P143/P149, decomposition and revision failures | one relaxed backward/obligation plan surrogate with an explicit forward consumer | **represented under another vocabulary; investigate only if cheaper discriminator appears** |
| Compositional interface contract | no general runtime interface/proof object | interface contract size and local exact semantics only partly instrumented | separator/decomposition census already positive on a bounded subpopulation | run the already-earned local residual/interface query and measure compression | **already represented and already has a research path; no new framework** |
| Reusable proof fragment | no general proof-carrying fact object beyond specialized memoized facts | exact outputs are mostly verdicts rather than reusable proof dependencies | lower-bound memo positive control, Lane C null on new reuse | wait for a fact family with repeated expensive re-derivation | **scientifically interesting but not currently earned** |
| Counterfactual search-object diversity | production portfolio diversity is mostly technique/policy diversity | no standard comparison among distinct state-object grammars | Lane G nursery, P143/P195 | one bounded alternate-object solver on selected states with explicit work accounting | **plausible, but current G evidence says do not implement yet** |

The first candidate is the strongest actual dual deficit. The rest mostly demonstrate that the repo has already named the conceptual territory and needs evidence, not vocabulary.

## 7. Structurally silent questions

The highest-value silent questions are those for which both solver and research apparatus lack a natural event.

1. **Which completion regime was lost?** The solver records candidates and culls, not a canonical set of qualitatively distinct futures.
2. **What did the solver learn, and did that knowledge change the next action?** Failure and exact-query artifacts exist, but information state is not a general policy object.
3. **Which research questions never entered the agenda because no current instrument could make them legible?** The research system tracks admitted questions well, not the counterfactual question set.
4. **Which corroborations share a hidden common-mode epistemic dependency?** Independence is well handled at sample/source/parent levels, less so at oracle/analysis/ontology/agent levels.
5. **Which downstream decisions are invalid after an upstream analysis interpretation changes?** Execution provenance is stronger than claim derivation provenance.

These are more consequential than missing fields around already mature experiment types.

## 8. Research-agenda path dependence

Path dependence is real but not automatically harmful.

### Productive specialization

- Corpus 2 is intentionally a powerful development/capability laboratory.
- Exact-prefix tooling makes representation/retention questions unusually answerable.
- Family perturbations make local causal contrasts unusually answerable.
- Production frontier sampling makes forward-search decision seams unusually answerable.

These are valuable specializations.

### Accidental lock-in risks

**Instrument founder effect:** CP-SAT support makes explicit feasibility predicates easy to ask, which can steer research toward questions expressible as pinned constraints.

**Ontology founder effect:** once current failure taxonomies, premise IDs and research-function vocabulary become canonical, independent agents can reproduce the same partition even while nominally red-teaming it.

**Corpus founder effect:** current residual and known stress corpora make some failure modes richly sampled while future human/editor distributions remain undefined.

**Benchmark founder effect:** solve/work on current corpora is the right operational laboratory objective, but claims about future human/editor levels require a distinct source/claim scope.

**Historical-agent framing effect:** repeated agent archaeology can make inherited problem decompositions unusually salient.

The first action should be a blinded agenda reconstruction, because it tests several founder effects at once without requiring new infrastructure.

## 9. Scientific rigor gaps that matter

### Design

**Existing strength:** lightweight precommitment already covers treatment/control, population, evidence role, inference scope, primary outcome, candidate handling, stop rules and reference baselines.

**Gap:** under high analysis freedom, the durable evidence does not reliably carry the analysis-plan identity or amendments that separate pre-outcome analysis from post-outcome exploration.

**Smallest change:** optional `analysisPlanRef`/hash plus explicit amendment record only for decision-bearing/high-selection-pressure studies.

### Execution

**Existing strength:** participation, limits, coverage, run identity, canaries, side effects and abstention are strong.

**Gap:** one portable unit field cannot express all scientific unit roles.

**Smallest change:** structured unit semantics at decision-bearing handoffs.

### Measurement

**Existing strength:** exact/reference support envelopes and observer parity are good.

**Gap:** common-mode instrument dependencies are not normally represented when evidence is triangulated.

**Smallest change:** categorical dependence declaration on triangulated claims.

### Analysis

**Existing strength:** multiple-candidate selection pressure and opportunity sizing are explicitly recognized.

**Gap:** estimand/discriminating quantity and negative resolution are not consistently carried into durable closeout objects.

**Smallest change:** for sampled decision-bearing negatives, state the discriminating quantity and what frequency/effect/opportunity class the design could actually rule out.

### Claim

**Existing strength:** reports often state inference scope and close only tested forms.

**Gap:** claim scope remains mostly report metadata rather than a reusable cross-system value.

**Smallest change:** use a small controlled claim-scope vocabulary only at closeout: benchmark laboratory, current residual, confirmation source, transfer/challenge source, human/editor source, adversarial semantic challenge, cold legal deployment envelope. Do not invent a distribution where none exists.

### Confirmation

**Existing strength:** consumed evidence roles, locked blocks and treatment-lineage logic are mature.

**Gap:** analyst/method/ontology contamination can survive untouched data.

**Smallest change:** use independence dimensions when independent corroboration is itself part of the claim.

### Triangulation

**Gap:** disagreement among channels is not yet a first-class useful state. Two channels may measure different constructs rather than one being wrong.

**Smallest change:** when channels disagree, preserve construct/support-envelope distinctions instead of forcing a reconciled verdict.

### Invalidation

**Gap:** bounded reverse invalidation across claims/decisions is incomplete.

**Smallest change:** derivation edges for high-leverage decision-bearing transformations only.

## 10. Semantic dialect findings

### Subject/content/population identity

Generally strong. Content hashes and stable IDs are increasingly separated. Corpus filenames are correctly rejected as sufficient population identity.

### Selection identity

Strong in generation/family/block machinery. Less uniformly attached to legacy reports and question-level conclusions.

### Source/generator identity

Strong and intentionally plural.

### Observation/assignment/dependence/analysis/generalization units

This is the largest unit-semantics gap. The concepts are understood but not carried as one interoperable object.

### Evidence role

Strong conceptually, with some vocabulary variation between research blocks and report conventions. This is manageable but should be normalized at handoff boundaries rather than by rewriting historical prose.

### Treatment/comparator and participation

Strong in modern preflights. Participation is sometimes still inferred through workflow-specific telemetry, which is scientifically appropriate because participation semantics genuinely differ by treatment.

### Work/resource ceilings/scheduler mode

Strong and increasingly canonical.

### Outcome/termination/censoring/abstention

Strong, with appropriate family-specific adapters. Do not over-unify CP-SAT and solver-sweep outcomes.

### Reproducibility and decision-bearing status

Mechanically strong, but `decisionBearing` is necessarily coarser than scientific disposition. Keep it a publication gate, not a substitute for claim semantics.

### Claim/inference scope

Strong in prose convention, weak as a portable value.

### Provenance/derivation

Execution provenance strong; inferential derivation weaker.

## 11. Instrument validity findings

The main repeated instruments should be treated as follows:

**Canonical referee:** product truth authority. Keep implementation independence from exact/reference models.

**CP-SAT explicit-prefix reference:** sound bounded reference within supported mechanics and model fidelity. UNKNOWN/unsupported/model errors abstain. Its common use across many lines creates a shared-instrument dependency that should be acknowledged in triangulation.

**Known-solution-prefix survival:** conditioned positive-oracle observer, not full-solution-space truth. Its recent oracle-set identity work is exactly the right direction.

**Production decision observation:** strong instrument when parity holds and actual decision context is captured.

**Family perturbations:** strong causal microscopes within parent, weak prevalence evidence across dependent descendants.

**Resource/asset joins:** strong for hypothesis nomination, but a join is not causal evidence merely because IDs line up.

No evidence supports replacing these instruments with one shared implementation. Some implementation independence is scientifically valuable.

## 12. Negative-result intersection mining

Several recent clean or bounded negatives share an assumption worth isolating:

- scalar future-feasibility descriptors failed;
- H1’s prespecified event vocabulary failed as a universal compact descriptor;
- size-1 DEAD cores failed on the strongest matched frontier population;
- dependency-defined revision failed to find daylight beyond naive divergence in tested regimes;
- solve-local reuse found no new repeated expensive fact family;
- D1 forensic exact information failed to disagree with production retention on its confirmation slice;
- generic structural diversity failed to preserve the relevant viability distinction.

These results do **not** jointly imply that future structure is unimportant. They share a deeper formulation bias: each asks whether future structure can be compressed into an object already convenient for the current forward-prefix solver and its instruments, such as a scalar descriptor, a small event vocabulary, a single relaxed commitment, a divergence point, a reusable local fact, or one exact annotation.

The intersection-mined parent question is:

> Is the missing information inherently set-valued or alternative-structured, such that the important property is not one feature of the current state but which mutually exclusive future completion regimes remain available?

That is the strongest new scientific question from the negative-space audit. It is still a hypothesis. The tiny regime-set discriminator in N3 should precede any implementation.

## 13. Target and deployment semantics

Pathfinder should continue to distinguish at least these scopes:

- current benchmark objective;
- development laboratory;
- current residual population;
- confirmation block;
- cross-construction transfer/challenge population;
- adversarial semantic challenge;
- human/editor source population;
- legal cold deployment envelope.

There is no justified probability distribution over all future human/editor Pathfinder levels. The research system should not fabricate one.

The correct broad product statement is therefore conditional: current benchmark and transfer evidence establish capability on named populations/sources; cold deployment legality constrains what production may use; broader unseen-level claims require explicit source/challenge evidence rather than rhetorical extrapolation.

## 14. Epistemic phase-transition candidates

### 14.1 Set-valued completion-regime reference primitive

Potentially high leverage because option preservation, information-valued action, alternative search objects and selective revision all need a way to talk about future alternatives rather than one scalar state label.

**Gate:** tiny exact surrogate first. No general service until it changes a real decision on more than a curiosity.

### 14.2 Structured scientific unit semantics

This is a research-system phase transition rather than a solver capability. A small value object could eliminate repeated local reinterpretation across experiments, families and query batches.

**Gate:** prove it resolves at least one current ambiguous handoff before broad migration.

### 14.3 Blinded agenda reconstruction

One procedure could test ontology, historical narrative, instrument and question-selection founder effects at once.

**Gate:** one bounded exercise. Institutionalize only if it discovers solver-relevant question territory missing from current synthesis.

### 14.4 Alternative search-object harness

A cheap harness for one abstract/backward/relaxed search object could make several deferred questions answerable.

**Gate:** do not build a framework. One object, one population, one explicit forward consumer.

## 15. Research-capability gaps

| Gap type | Current condition | Smallest useful change |
|---|---|---|
| Missing concept | few genuinely missing concepts; agenda-survivor population is the clearest | test through blinded reconstruction before naming a permanent object |
| Observer | weak for set-valued completion regimes and decision-conditioned information value | tiny offline observer on selected cutoff decisions |
| Intervention | strong for many existing treatment forms; weaker for representational transitions | one bounded alternate-object/counterfactual consumer |
| Exact/reference capability | strong for explicit feasibility predicates, weaker for alternative-set labels | small set-valued regime query, only if prespecified |
| Unit semantics | concepts known, portable object too coarse | structured observation/assignment/opportunity/dependence/analysis/generalization units |
| Population/source | strong in current generators/corpora, undefined for future human/editor universe | preserve named-source claims rather than invent distribution |
| Analysis/estimand | often clear in preflight prose, weakly carried with durable result | optional analysis-plan identity + discriminating quantity at decision-bearing closeout |
| Independence semantics | strong for sample/source/parent, weaker for oracle/method/agent/ontology | categorical dependency dimensions on triangulated claims |
| Provenance/invalidation | execution strong, claim derivation incomplete | bounded derivation edges for high-leverage closeouts/instruments |
| Alternative search object | represented in premises/future work, few cheap execution surfaces | single-purpose harness before framework |

## 16. What not to build

This audit does **not** support:

1. a universal solver-research provenance warehouse;
2. one mega-schema for every research artifact;
3. a scalar evidence-confidence or independence score;
4. a general solver blackboard/proof store before a recurring fact family earns it;
5. a production exact-query service because exact tooling is scientifically useful offline;
6. a new registry for every negative-space concept;
7. a researcher or agent productivity/ranking system;
8. always-on high-cardinality metadata for every row;
9. automatic evidence expiry based only on elapsed time;
10. a shared exact/reference and production-solver implementation;
11. a unified generator implementation that removes construction-method independence;
12. another large corpus without a question, independent unit, intended analysis and stop rule;
13. an ML research-question prioritizer;
14. a general completion-regime engine before the bounded discriminator;
15. a new queue competing with `solver-optimization-workstreams.md`;
16. a new plan competing with the existing consolidation plan once reconciliation begins.

The system already has enough registries. The useful work is to make a few meanings travel farther and to create evidence for currently low-answerability concepts.

## 17. Minimum change set

### Repair now

**R1. Bring the v3 result schema back into agreement with actual v3 publisher output and validate a representative emitted manifest against it.**

This is correctness maintenance, not research expansion.

### Harden scientific handoffs

**R2. Define a small structured scientific-unit object for decision-bearing evidence.**

At minimum distinguish:

- observation unit;
- assignment unit when applicable;
- opportunity unit;
- dependence/cluster unit;
- analysis unit;
- generalization unit.

Keep specialized producer row shapes. This object belongs at the handoff where evidence changes scientific role, not necessarily in every raw artifact.

**R3. Let high-selection-pressure decision-bearing evidence carry analysis identity and negative resolution.**

Use existing precommitment. Add only what is necessary to reconstruct whether the decisive analysis was pre-outcome and what class of negative it could resolve. Do not require this for ordinary exploratory diagnostics.

**R4. Make triangulation dependencies explicit when independence is part of the claim.**

Use dimensions, not scores. Record only relevant dependencies.

**R5. Add bounded derivation/invalidation edges for high-leverage claims.**

Start with one shared instrument/resource correction and prove reverse traversal works. Reuse `research-relations`; do not build another graph store.

### Investigate before implementation

**I1. Blinded agenda reconstruction.**

Quarantine current question/premise synthesis and test whether an independent reconstruction generates materially new, solver-relevant question families.

**I2. Completion-regime/option-set surrogate.**

On a tiny set of cutoff-bearing sibling states, exact-label a prespecified set of distinct future regimes. Stop if the label collapses to existing descriptors or never changes a decision.

**I3. One alternative search-object surrogate only if I2 or another independent result nominates it.**

No framework-first work.

## 18. Classification of new ideas

| Idea | Classification |
|---|---|
| v3 schema drift | **strongly supported by current evidence** |
| structured scientific unit semantics | **strongly supported by current evidence** |
| research agenda as selected survivor population | **plausible and cheaply testable** |
| multidimensional epistemic independence | **strongly supported as a dependence distinction; materiality is claim-specific** |
| bounded reverse invalidation | **strongly supported as a current reconstructability gap** |
| completion-regime/option-set state | **plausible and cheaply testable; already represented conceptually** |
| uncertainty/information state | **plausible but currently low-answerability; already represented conceptually** |
| backward/abstract plan object | **already represented under another vocabulary** |
| general proof store | **scientifically interesting but not solver-relevant without recurrence evidence** |
| universal provenance warehouse | **unjustified** |
| scalar independence/confidence score | **unjustified and scientifically lossy** |
| broad new corpus generation | **not earned by this audit** |

## 19. Final hostile review

**Did this audit actually escape the repo ontology?** Partly. Its strongest genuinely outside move is to treat the research-question population itself as selected and conditioned, then ask for a blinded reconstruction. Most solver-side “new concepts” were already present in the premise map, which is evidence against pretending to have escaped merely by renaming them.

**Did it mistake missing instrumentation for a missing phenomenon?** No. Completion-regime state and uncertainty state remain hypotheses until a discriminator produces decision-relevant evidence.

**Did it mistake clean schemas for rigor?** No. The audit found a live schema/artifact contradiction and treats schema alignment as necessary correctness, not scientific sufficiency.

**Did it mistake more metadata for more knowledge?** The recommendations are deliberately event- and decision-scoped. Most proposed ideas begin as investigations rather than fields.

**Did it recommend common code where independence is useful?** No. Generator diversity, exact/reference separation, challenger analyses and ontology-independent reconstruction should remain implementation-diverse where common-mode defects matter.

**Did it propose infrastructure before a consumer?** The main speculative solver idea is explicitly gated by a tiny consumer-facing discriminator.

**Did it ignore objective-induced blind spots?** No. The promotion objective remains correct, but precursor capabilities are permitted only when an explicit downstream decision can be named.

**Did it distinguish benchmark progress from deployment claims?** Yes. No universal unseen-level distribution is assumed.

**Did it preserve disagreement?** Yes. Channel disagreement should remain visible when constructs differ.

**Would any finding materially change which question Pathfinder asks next?** Yes, but only conditionally. A blinded agenda reconstruction can test whether the current question space is founder-conditioned. A tiny completion-regime surrogate can test whether several current negative lines share an inadequate representational primitive. Neither should displace an active solver gate without earning that right.

**Did the audit find something neither the solver nor research system currently represents?** The strongest such finding is not a brand-new puzzle concept. It is the counterfactual selection history of the **research agenda itself**. On the solver side, completion-regime option sets are conceptually named but not operationally represented, which is the more important dual deficit than inventing another vocabulary term.

## Bottom line

Pathfinder’s research system is already good enough that the next gains do not come from simply adding “more rigor,” “more provenance,” or “more ontology.”

Its remaining weakness is a boundary problem.

The solver exposes certain objects. Instruments make certain properties of those objects measurable. The research system consequently asks unusually good questions about them. The danger is that this closed loop can become self-confirming: what is representable becomes measurable, what is measurable becomes a question, what becomes a question gets infrastructure, and what gets infrastructure becomes the next thing the solver learns to optimize.

The right response is not to blow up the architecture. It is to create a few controlled escape hatches:

- make scientific units and high-value inferential semantics portable;
- know when allegedly independent evidence shares a common epistemic implementation;
- make important invalidation paths reversible;
- periodically generate questions under deliberate informational quarantine;
- and test one or two missing research primitives only when they expose a real decision the current system cannot express.

That is the smallest credible way to widen what Pathfinder can know without allowing the machinery for knowing to become the thing it is optimizing.

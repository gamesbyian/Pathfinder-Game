# Independent negative-space audit of the solver-research system

> **Status:** independent conceptual audit from `main`, completed before reading PR #1921 or `docs/solver-research-system-consolidation-and-epistemic-coverage-plan.md`.
> **Date:** 2026-09-19
> **Evidence posture:** repository reconstruction + hostile conceptual audit. This report is not a queue, does not authorize solver implementation, and deliberately distinguishes strong repo-supported findings from hypotheses that need cheap discrimination.
> **Priority authority:** `docs/solver-optimization-workstreams.md` remains authoritative.

## Executive conclusion

The repository already represents substantially more of the obvious negative space than a first pass suggests. Current `main` explicitly names completion regimes, backward reasoning, alternative search objects, uncertainty, information-producing actions, option value, endogenous residuals, first-loss causality, search-stage handoffs, solve-local information lifetime, evidence consumption, ontology escape, causal ancestry, opportunity populations, and research-vocabulary bias. A fresh audit that merely recommends those objects would mostly rename work the repo already knows.

The stronger residual blind spots are one level more structural.

First, **both solver reasoning and research reasoning weakly represent dependency-bearing commitments**. The solver can retain state, experience, exact labels and selected telemetry, but generally cannot say which conclusions or commitments depend on which earlier assumptions and therefore cannot selectively invalidate only the affected reasoning when one assumption fails. The research system preserves provenance, consumption, question relations and historical blast-radius prose, but usually cannot mechanically answer the analogous question: if one evidence interpretation is corrected or narrowed, exactly which downstream claims, gates and decisions depend on it, and which do not? This is the strongest credible dual deficit found here.

Second, **both systems are better at choosing among represented alternatives than at observing the limits of the alternative grammar itself**. The solver has rich machinery for ranking, retaining and allocating among generated forward-prefix actions, while source/action/search-object absence remains difficult to diagnose. The research system has rich machinery once a question, premise, population, instrument and estimand are representable, while `ONTOLOGY_ESCAPE` and source-coverage hardening remain special audit procedures rather than ordinary evidence about what never entered the question grammar. This means a well-instrumented null can still be epistemically downstream of a more basic omission: the relevant action, representation, estimand or question was never in the candidate set.

Third, **independence is currently represented more strongly as ancestry/unit discipline than as a vector of possible shared failure modes**. Parent grouping and causal ancestry are mature. Much less is explicit about analyst/model independence, ontology independence, implementation independence, reference-model independence, shared prompt/framing, or shared source exposure. Several nominally separate research passes can therefore be independent in one dimension and tightly coupled in another. An analogous issue exists in solver portfolios: different named actions may share engine, scorer, representation and trajectory even when their outcomes differ.

Fourth, **the repository has strong memory discipline but only partial machinery for controlled non-exposure**. Frozen snapshots, evidence roles and consumed confirmation blocks protect some forms of independence, but fresh conceptual reconstruction is still normally performed in a repository saturated with canonical vocabulary, archaeology and prior conclusions. A clean-room procedure that deliberately withholds derived conclusions while exposing primary evidence could cheaply test whether the current knowledge system anchors later inquiry. This is a scientific procedure, not a proposal to delete history.

The audit therefore did reveal genuinely new territory, but not an argument for a new universal schema. The most important new scientific question is:

> Can Pathfinder make both solver commitments and research claims **dependency-addressable**, so that contradiction or reinterpretation causes minimal justified revision rather than broad rollback, archaeology, or silent persistence?

A second high-value question is:

> How often are solver failures and research blind spots caused by **candidate-grammar absence** rather than poor selection among represented candidates?

The interaction between infrastructure and question generation is now clearer. Pathfinder's strongest instruments naturally make questions about rank, retention, exact LIVE/DEAD labels, matched populations, work dose, families and JSON-joinable provenance comparatively cheap. The premise map has correctly diagnosed much of this bias. The remaining risk is that the research system can become increasingly rigorous about questions whose objects it already knows how to serialize while still under-sampling questions about absent objects, dependency structure, representation changes, and research-method contamination.

## 1. Reconstructed research architecture from `main`

The effective research architecture is not one system but a set of deliberately separated authorities and instruments.

- `solver-optimization-workstreams.md` owns current priority and next gates.
- The operating model owns evidence discipline, stop rules, fixed-work economics, selection pressure and premise-first escalation.
- Question relations preserve sparse question identity, tested-form scope, successor/reopen relations and current discoverability.
- The premise map, relation graphs, hardening process and source-coverage audits model the broader conceptual space and explicitly permit `ONTOLOGY_ESCAPE`.
- The capability atlas asks which semantic operations the solver can represent, infer, compose, persist, act on, revise and communicate.
- Capability memory preserves complementary historical capability without turning it into runtime steering or a second queue.
- Archaeology reconstructs treatments, participation failures, renamed mechanisms and dirty negatives.
- Research assets + Resource Contracts preserve resource grain, identities, conditioning, dependence, missingness, freshness, information loss and consumer semantics.
- Experiment contracts/manifests preserve execution identity, population identity, scientific ambiguity, discriminating observable, work limits and side effects.
- Research blocks and consumption sidecars preserve population identity, independent unit, evidence role and later consumption.
- Failure-response and search-loss layers preserve bounded process observations while refusing to manufacture causal failure labels.
- Exact/reference, frontier sampling, decision observation, family microscopes, covariance and work-response tools provide specialist observations rather than one universal trace.
- Inference audits and navigation fault injection test whether evidence is converted into appropriately scoped claims and next actions.

This architecture is unusually explicit about authority separation. The main integration risk is therefore not simple fragmentation. It is **semantic incompleteness at the boundaries between otherwise well-specified objects**.

## 2. Negative-space findings

### Finding N1 — dependency-bearing commitments and selective invalidation

**Hidden assumption**

Provenance plus a record of consumption is treated as nearly sufficient to reconstruct how knowledge should change when an upstream assumption is contradicted. It is not. Provenance answers where a fact came from. A dependency relation answers what would cease to be justified if that fact changed.

**Why it remained hidden**

Both sides have nearby concepts that make the gap easy to mistake for solved territory.

On the solver side, the capability atlas already names failure explanation, conflict/core learning, persistence, typed handoff and selective commitment revision. Repair has a failed-state cache and search can backtrack/restart. On the research side, P203 requires downstream claims to preserve scope/authority/ancestry, Resource Contracts require a historical-claim blast radius, question relations carry outgoing edges, and research-block consumption records later use. Those are all necessary, but none is a general dependency-bearing reason graph.

**Repo evidence**

The atlas states that DFS backtracking forgets causal explanations, beam does not accumulate proofs of why discarded/dead states failed, production stages lack a general proof/conflict/interface blackboard, and selective revision has no first-class causal commitment object. The first-loss taxonomy separately distinguishes antecedent commitment (F4), repeated-known-failure (F9), explanation failure (F10), revision mismatch (F11), and handoff loss (F12).

On the research side, the inference framework still uses a temporary manually reconstructed claim spine. Resource audits require human disposition of historical claim blast radius. Question relations encode selected semantic relations but not "claim X is valid only if evidence interpretation Y and assumption Z hold." Consumption lineage records that an artifact was used, not the specific proposition derived from it or the conditions under which that proposition should retract.

**New question made expressible**

> Given a contradicted assumption or reinterpreted observation, what is the smallest set of solver commitments or research claims that must be revised, and what unaffected work can safely survive?

This is stronger than "where did this come from?" and narrower than "build a universal proof system."

**Current answerability**

Strongly supported as a representational gap; prevalence/economic value is not yet established.

**Smallest discriminator**

Research-side: choose two or three known reinterpretations with real downstream history, such as a capability-union correction, a selected-path causal overclaim, or a participation/provenance correction. Starting only from the corrected source, ask whether existing normal front doors can enumerate the materially affected downstream decisions without broad text archaeology. Record false-positive blast radius as well as misses.

Solver-side: on a small exact-labelled failure population, compare geometric rollback/divergence depth with the smallest demonstrable causal commitment set. If no materially smaller reusable dependency set appears, a general reason-dependency mechanism is not earned.

**Solver implication**

A future capability, if earned, would attach compact reason/assumption dependencies to one selected fact family or commitment family so revision can preserve unrelated structure. Do not begin with a universal proof store or CDCL framework.

**Research-system implication**

A future capability, if repeated audits earn it, would preserve narrow claim-to-evidence/assumption dependencies at decision-bearing closeout and permit reverse invalidation queries. Do not turn every report sentence into a graph node.

**Classification:** **strongly supported conceptual gap; cheaply testable value**.

### Finding N2 — candidate-grammar absence is a shared blind spot

**Hidden assumption**

Once alternatives are explicit, good selection/retention/allocation plus good evidence can find the right answer. The more primitive failure is that the relevant alternative may never be generated in the first place.

**Why it remained hidden**

The repo already names source/action absence (F2), forward-prefix dominance (P070), alternative search objects, action-grammar revision (P195), vocabulary bias (P131), source-coverage hardening and `ONTOLOGY_ESCAPE`. Because the problem is named in several places, it can appear operationally covered. But those mechanisms mostly detect candidate-grammar failure after an external analyst supplies a missing alternative.

**Repo evidence**

The solver is exceptionally instrumented after candidates exist: ordered candidates, retained candidates, work, rank/retention decisions and exact annotations can all be observed. Yet the atlas still marks forward valid prefixes as the dominant search object and backward contracts, abstract completion plans and relaxed complete paths as absent/deferred.

The research system is similarly rich after a question is registered. Dossiers can join premises, evidence, assets and blocks; acquisition preflight can route among known resources/generators; integration audits validate references. None can enumerate scientifically important questions that the ontology never generated. Source-coverage and alien ontology passes are therefore external corrective procedures, which is evidence that ordinary machinery has no denominator for "possible questions not proposed."

**New question made expressible**

> Is this failure due to poor choice within the current action/question grammar, or because the useful action/question/representation never entered the grammar?

For solver research this also creates a stronger experiment-design distinction: **selection error versus proposal error**.

**Current answerability**

The concept is strongly supported; frequency on current residual and research agenda is poorly answerable.

**Smallest discriminator**

Solver-side: on a stratified set of first-loss cases, require the analysis to state whether a restoring counterfactual exists inside the current action/search-object grammar. Cases requiring a new search object remain a separate bin rather than being forced into rank/retention/work.

Research-side: audit a small sample of recent high-leverage "next experiment" decisions and reconstruct the candidate research alternatives that were actually considered. Then run one deliberately alien decomposition over the same primary evidence. New high-value questions that were absent from the original candidate set are evidence of proposal-space limitation, not merely wrong prioritization.

**Solver implication**

No generic mechanism follows. A recurring proposal deficit might justify a new action grammar, representation or search object only after one missing class repeatedly explains real losses.

**Research-system implication**

Preserve proposal-set/alternative rationale only for high-leverage research decisions where it changes interpretation. Do not build a universal idea registry.

**Classification:** **strongly supported shared structural risk; prevalence poorly answerable but cheap to sample**.

### Finding N3 — independence needs a failure-mode vector, not only an independent unit

**Hidden assumption**

If rows are collapsed to the right independent unit and causal ancestry is not duplicated, remaining support is sufficiently independent for the intended conclusion.

**Why it remained hidden**

Pathfinder has correctly fought the largest pseudoreplication problems: family siblings, replay -> hint -> Profile descendants, residual selection, repeated parent rows and consumed confirmation blocks. That success makes the remaining dependence subtler.

**Repo evidence**

Research blocks persist one `independentUnit`; P201 addresses causal ancestry. Premise-map hardening values independent rediscovery but does not encode independent *with respect to what*. Research contracts do not currently distinguish shared analyst/model, ontology, implementation, prompt framing, source exposure, reference model or normalization path.

The solver has the analogous issue in a better-developed form: technique taxonomy distinguishes source/config similarity, outcome similarity and operational similarity because different action names do not establish behavioral diversity. That logic has not been fully imported into epistemic independence.

**New question made expressible**

> Which failure modes can this purportedly independent evidence share with the evidence it is meant to corroborate?

Useful dimensions include population/parent, source ancestry, implementation, observer/reference model, ontology/representation, analyst/model/prompt framing, and transformation/normalization path. The dimensions are question-dependent; there is no single independence score.

**Current answerability**

Strong evidence of representational underspecification; no evidence yet that it has caused a current wrong solver decision.

**Smallest discriminator**

Take a handful of claims currently described as independently rediscovered/confirmed and annotate the relevant dependence dimensions manually. Ask whether any confidence statement or next action changes. If not, no schema change is earned.

A sharper clean test is to compare two reconstruction passes over the same primary evidence where one is allowed canonical ontology/vocabulary and the other is forbidden it. Agreement establishes ontology-independent convergence more strongly than two agents reading the same conceptual scaffolding.

**Solver implication**

Where portfolio diversity matters, evaluate shared representation/scorer/search trajectory in addition to action identity. Existing operational-similarity machinery may already be enough; no new solver abstraction is automatically needed.

**Research-system implication**

If repeated audits find material cases, add a lightweight optional **independence vector** to decision-bearing audit/claim capsules. Do not replace `independentUnit`; they answer different questions.

**Classification:** **plausible and cheaply testable; partly covered under existing ancestry and operational-similarity vocabularies**.

### Finding N4 — controlled forgetting / non-exposure is a missing experimental method

**Hidden assumption**

Better preserved and more discoverable scientific memory monotonically improves future inquiry as long as evidence roles and provenance are correct.

**Why it remained hidden**

The repo has repeatedly suffered from lost history, so preservation is rationally privileged. It also already has sophisticated anti-contamination mechanisms: frozen premise snapshots, untouched confirmation blocks, evidence consumption, branch/PR separation, and mining/freeze separation. These protect data independence more than conceptual independence.

**Repo evidence**

Premise-map hardening explicitly values alien ontology stress tests and independent rediscovery. Yet ordinary future agents operate inside a repository whose canonical vocabulary, archaeology register and prior dispositions are extremely discoverable. There is no standard procedure for reconstructing a problem from primary observations/code while intentionally hiding derived conceptual conclusions.

**New question made expressible**

> How much of apparent conceptual convergence survives when a fresh investigation is prevented from consuming canonical derived interpretations?

This is not an argument to delete evidence. It is a way to measure anchoring and ontology founder effects.

**Current answerability**

Plausible and cheaply testable. Existing freeze/mining discipline partly covers it.

**Smallest discriminator**

Run one bounded paired reconstruction on a question with rich primary evidence. Arm A sees normal authorities; Arm B sees only primary artifacts/code plus game/solver semantics and is explicitly denied premise-map/archaeology/result summaries until it freezes its own concepts. Compare new parent concepts, ontology escapes and materially different discriminators, not stylistic wording.

**Solver implication**

None directly. The analogous solver concept is controlled forgetting/restart of search knowledge, but production value must be separately demonstrated.

**Research-system implication**

Document a clean-room reconstruction procedure if and only if the paired test produces materially different useful hypotheses. No quarantine registry is justified yet.

**Classification:** **plausible, cheap, and method-level; partially covered by existing snapshot/mining separation**.

### Finding N5 — agenda selection has ancestry, but the repository rarely preserves its candidate denominator

**Hidden assumption**

Research-question provenance is adequately reconstructed from the question's evidence and relations. That omits why this question became cheap/salient enough to be asked while alternatives did not.

**Why it remained hidden**

Evidence-selection history is now mature at the population level, and question relations preserve successors/constraints. Research-agenda selection is a different selection process.

**Repo evidence**

P131 already states that current vocabulary biases attention toward measurable ranking/order questions. The capability atlas calls local ranking machinery "very strong machinery; heavily researched" while joint feasibility, revision, communication, completion-regime representation and backward reasoning remain thin. Tooling similarly makes rank/retention, exact-label, family and work-response questions cheap.

Archaeology supplies concrete instrument-founder examples: old basin-overlap telemetry created an apparent result before transport defects were corrected; target-feasibility and other removed tools left unresolved questions; once exact LIVE/DEAD and family machinery became available they generated many descendants. These examples show that instrumentation can shape inquiry, but they do not by themselves quantify the agenda-wide effect.

**New question made expressible**

> Which current research families exist partly because an earlier instrument made them cheap, and which high-value families stayed thin because no cheap observer existed?

**Current answerability**

Plausible, with qualitative support; a causal historical claim would currently overreach.

**Smallest discriminator**

For 8-12 recent major research-gate transitions, reconstruct:
1. candidate alternatives named at the time;
2. which had an available cheap instrument;
3. which were deferred specifically for missing observability;
4. which later became active after tooling appeared.

This tests instrument founder effects without hindsight-scoring whether old priorities were "wrong."

**Solver implication**

Protect against benchmark/instrument-induced over-specialization by keeping acquisition lanes tied to semantic gaps rather than tool availability alone.

**Research-system implication**

For high-leverage gate choices, recording "important alternative currently unmeasurable and its enabling trigger" may be more valuable than adding more question metadata. `solver-future-work.md` already provides much of the right surface.

**Classification:** **plausible and supported in examples; agenda-wide magnitude poorly answerable**.

### Finding N6 — completion-regime / future-set semantics are already named, but remain a credible dual operational deficit

**Hidden assumption**

Binary LIVE/DEAD, scalar progress and individual-prefix observations are adequate scientific objects for studying future optionality.

**Why it remained hidden**

The repo has already named this problem unusually well: completion regimes, option value, set-state abstraction, topology, partial-order commutativity and future-state equivalence are explicit premises. The missing piece is not vocabulary but an operational object.

**Repo evidence**

The solver has no first-class completion-regime object and beam states remain individual prefixes. Research can exact-label selected states and compare witnesses/families, but it usually observes whether *some* completion exists, not a compact identity/topology/volume of the remaining completion set. The first-loss taxonomy itself warns that divergence from one witness is not causal when many completion regimes remain.

**New question made expressible**

> When two states are both LIVE, how different are the sets of completion regimes they preserve, and does that difference predict later extinction or recovery better than current score/progress features?

**Current answerability**

Plausible but currently poorly answerable. This is not a reason to invent a regime schema.

**Smallest discriminator**

Use a tiny exact-supported puzzle subset where multiple completions can actually be enumerated or systematically sampled. Test whether a cheap coarse future-set descriptor separates states that current scalar/progress descriptors conflate. If no useful signal appears even in the tractable subset, defer the abstraction.

**Solver implication**

If real, a future object might support regime-aware retention, partial-order planning or option preservation.

**Research-system implication**

The same future-set object would give research a non-binary estimand for optionality and representation loss. The prerequisite should be earned by the exact tractable pilot, not by conceptual elegance.

**Classification:** **already conceptually covered, operationally missing, plausible phase-transition candidate**.

## 3. Shared-assumption map

| Shared assumption | Solver manifestation | Research-system manifestation | Audit disposition |
|---|---|---|---|
| Provenance is close to dependency | state/trace ancestry exists without causal reason graph | source/consumption lineage exists without selective claim dependency | **newly important** |
| Candidate set is given | optimize generated prefixes/actions | optimize registered questions/assets/experiments | **newly important** |
| Independence is approximately one partition/ancestry relation | named actions can share behavior | agents/reports can share ontology/implementation/framing | **underrepresented** |
| Memory is normally beneficial | retain elites/caches where local | maximize archaeology/discoverability | **needs clean-room falsifier, not doctrine change** |
| LIVE/DEAD plus progress is a sufficient future object | individual prefixes + scalar scores | exact state labels + witness-relative diagnostics | **known conceptual gap, no operational object** |
| Architecture epoch captures temporal relevance | state facts die at coarse lifecycle boundaries | claims use freshness/reopen/epoch boundaries | **mostly covered; avoid new time ontology until a discriminator fails** |
| Solve gain is the final value signal | production objective | research priority authority | **correct final objective, but precursor information/robustness value already explicitly recognized** |

## 4. Dual-deficit map

### D1. Dependency-addressable commitments

**Solver missing:** compact reason/assumption dependencies that support targeted invalidation and revision.

**Research missing:** compact claim/evidence/assumption dependencies that support targeted narrowing/retraction and reverse impact analysis.

**Indirect telemetry:** solver rollback windows, exact cores, first-loss evidence, stage handoffs; research question relations, consumption events, Resource Contract blast radius, corrections.

**Cheap falsifier:** demonstrate that real corrections/contradictions rarely have a materially smaller dependency set than broad rollback/manual audit. If so, do not build.

**Phase-transition potential:** high. One real dependency-bearing primitive could support conflict reuse, selective revision, typed handoff and safer persistence on the solver side, while supporting precise supersession/invalidation on the research side.

### D2. Candidate-grammar awareness

**Solver missing:** routine ability to distinguish "bad candidate chosen" from "needed candidate/search object never generated."

**Research missing:** routine ability to distinguish "weak answer to current question" from "scientifically important question/estimand absent from the ontology."

**Indirect telemetry:** F2, action/source coverage, `ONTOLOGY_ESCAPE`, source-coverage audits, archaeology of dead tools.

**Cheap falsifier:** stratified first-loss + paired alien-decomposition audit.

**Phase-transition potential:** medium/high when a recurring omitted object is found; low if omissions are heterogeneous.

### D3. Completion-set semantics

**Solver missing:** first-class representation of future regime sets/optionality.

**Research missing:** estimand/instrument for future-set identity/volume/structure beyond binary viability and sampled witnesses.

**Indirect telemetry:** topology forks, live/dead siblings, option-value premises, witness sensitivity, family variants.

**Cheap falsifier:** exact-enumerable tiny subset.

**Phase-transition potential:** high but speculative; explicitly resist premature implementation.

### D4. Multi-dimensional independence

This is a softer dual deficit.

**Solver side:** action identities do not imply behavioral independence; existing operational-similarity work already addresses much of it.

**Research side:** independent unit/ancestry does not express ontology/model/implementation/reference independence.

**Cheap falsifier:** manual independence vectors on a few decision-bearing claims.

**Phase-transition potential:** low. Likely a methodological refinement rather than a new architecture.

## 5. Infrastructure -> question-space effects

The following question families are unusually cheap because the infrastructure already contains their objects:

1. **Ranking/retention questions.** Candidate order, beam culls, prefix survival, exact LIVE/DEAD annotations and decision observations make "was useful material ranked/retained?" natural and cheap.
2. **Residual-driven questions.** Production residuals, capability memory and class joins make "what explains today's survivors?" much easier than questions about capability outside the residual's endogenous ecology.
3. **Exact-label-friendly questions.** Binary feasibility is a powerful common currency; concepts without an exact binary label, such as option value, completion-set diversity or representation inadequacy, are harder to turn into experiments.
4. **JSON-join-friendly questions.** Stable IDs, population hashes, manifests and resource contracts encourage questions whose units already have identities. Transitions, counterfactual dependencies and absent candidate objects are harder.
5. **Family-friendly causal questions.** Variant machinery makes controlled structural perturbation attractive where the intervention can be encoded as a family transform.
6. **Scalar/value-curve questions.** Work response, badness/progress and covariance instruments make dose/threshold questions cheap compared with relational semantic objects.

These are strengths, not defects. The risk appears only when instrument availability is mistaken for scientific importance.

## 6. Question-space -> missing infrastructure

Important questions reveal the following missing or thin capabilities.

| Type | Missing/thin capability | Consumer that would justify it |
|---|---|---|
| scientific concept | dependency-bearing commitment / selective invalidation | first-loss revision or real research correction with bounded blast radius |
| measurement | completion-set/regime structure for LIVE states | option-value/retention question that binary LIVE/DEAD cannot decide |
| intervention | targeted revision of one causal commitment while preserving unrelated solver structure | F4/F11 population with smaller causal sets than rollback |
| exact/reference | tractable enumeration/summary of multiple completion regimes on tiny supported states | falsifier for completion-set semantics |
| unit semantics | research-decision candidate set / proposal opportunity set | agenda founder-effect audit |
| independence semantics | dimension-specific independence vector | a decision whose confidence changes after shared ontology/implementation/framing is exposed |
| analysis/claim semantics | explicit dependency from selected claim to assumptions/evidence | repeated reverse-impact audits |
| population/source | clean-room primary-evidence reconstruction population | anchoring/ontology-founder test |
| search representation | action/search-object grammar outside forward prefix | recurring F2/architectural first-loss evidence |

## 7. Research-agenda path dependence

### Conceptual founder effects

**Supported qualitatively, not quantified.** Ranking/retention language and machinery are old and dense. The premise map itself now calls this out (P131). Completion regimes, causal revision and knowledge handoff were later named partly by audits designed to leave the old decomposition.

### Instrument founder effects

**Supported in examples.** Exact prefix/state labels enabled extinction/retention microscopes; family generation enabled controlled-variant questions; capability-memory joins enabled complementarity questions without rerunning search. Archaeology also documents old instruments whose bugs or disappearance shaped what appeared answered.

The stronger causal claim "the current agenda is dominated by what these tools made cheap" remains unproven.

### Benchmark founder effects

**Strongly supported as a risk, partly controlled.** The current residual is explicitly endogenous (P181), source/generator selection is explicit, and current policy avoids treating C1/C2 as universal transfer populations. No new benchmark-governance system is justified by this audit.

### Ontology founder effects

**Plausible and directly testable.** Canonical terminology and premise maps make rediscovery efficient but may reduce the probability of ontology escape in later "independent" passes. The clean-room paired reconstruction is the smallest useful test.

## 8. Unrepresented value under the solve objective

The final objective of additional or cheaper correct cold solves remains the right production objective. It is not epistemically neutral during capability acquisition.

Several precursor values are already explicitly named on `main` and therefore are not fresh conceptual gaps:

- information-producing actions (P136/P142/P185);
- option preservation (P140/P184);
- robustness/fragile winners (P144, capability churn);
- uncertainty/disagreement (P044/P148);
- exact knowledge purchase (P037/P159);
- transferable solve-local knowledge (P067/P162/P200);
- calibration and work-history-conditioned choice (P146/P194).

The gap is mainly **operational valuation**, not missing vocabulary. A precursor should be promoted only when a bounded consumer shows a causal path to solve/work value. MO-007 is therefore appropriately an observable, not a new optimization target.

One additional value deserves explicit attention in future experiments: **revision value**. A representation or fact may be useful not because it predicts success but because it makes a wrong commitment cheap to retract while preserving unrelated work. That value is naturally tested under Finding N1 and should not become a separate score.

## 9. Epistemic phase-transition candidates

### PT1 — dependency-bearing knowledge

Several thin regions may share one prerequisite:

- causal conflict/core reuse;
- selective commitment revision;
- safe cross-stage fact handoff;
- persistence with explicit validity scope;
- research claim narrowing/retraction;
- precise reverse impact analysis.

This is a credible phase-transition candidate because the same missing semantic operation, explicit dependency, appears on both sides. It is **not** yet an implementation mandate. The discriminator is whether real cases have compact stable dependency structure.

### PT2 — completion-set / regime representation

Regime-aware retention, option preservation, backward planning, partial-order obligation reasoning and better witness-insensitive diagnosis may all become easier if states can be compared by the structure of their remaining completion sets rather than binary viability. The concept is attractive enough to demand a hostile cheap exact pilot before any framework work.

### PT3 — explicit proposal-space diagnostics

A recurring ability to detect that the useful action/question lies outside current grammar could change both solver acquisition and research-agenda generation. But this becomes a phase transition only if omissions cluster around a reusable missing object. Heterogeneous "other" cases do not justify a framework.

## 10. What not to build

This audit does **not** justify:

- a universal belief graph;
- a repository-wide dependency registry for every claim;
- a Bayesian confidence ledger;
- a researcher/agent score or ranking;
- an "independence score";
- a universal basin ID;
- a completion-regime schema before a tractable exact pilot;
- a generic solver blackboard or proof store;
- a quarantine database for stale knowledge;
- mandatory candidate-set logging for every research decision;
- another queue or research-plan authority;
- a generalized dynamic scheduler from information-value arguments;
- a research metric that replaces solves with MO-007 yield;
- automatic invalidation of conclusions based on metadata alone.

The right near-term moves are **small discriminators and procedures**. Infrastructure is earned only if a real consumer repeatedly fails without it.

## 11. Findings deliberately rejected as "new"

The audit considered several attractive ideas and rejected them as already represented under current vocabulary:

- information half-life: P200 plus freshness/revision contracts;
- architecture-relative truth: P005, Resource Contract freshness, question reopen semantics;
- endogenous residual drift: P181/P182;
- information-producing actions: P136/P142/P185;
- option-value preservation: P140/P184;
- completion regimes as a concept: P013 and descendants;
- backward/bidirectional reasoning: P071/P072;
- proof/certificate authority distinctions: P197 plus exact/reference contracts;
- uncertainty state: P044/P148;
- alternative search objects: P070/P143;
- evidence consumption/path dependence: P202;
- ontology escape: P196 + source-coverage `ONTOLOGY_ESCAPE`;
- causal ancestry/pseudoreplication: P201 plus historical claim-lineage audit;
- observer/constructor effects: P188/P190/P191/P158;
- mechanism interactions: P133/MO-003;
- research-process yield: MO-007.

Their implementation depth varies, but adding synonyms would reduce rather than improve conceptual clarity.

## 12. Final hostile check

### Did this audit actually leave the existing ontology?

Partly. The dependency-bearing-commitment finding arose from comparing the solver's revision problem with the research system's manual blast-radius problem, not from an empty premise-map cell. Candidate-grammar absence similarly treats the *proposal set* as an object instead of another search stage or research question.

### Did it invent synonyms for known concepts?

Several candidates did; they were rejected in section 11. Completion regimes remain in the report only as an operational dual deficit, not a newly discovered concept.

### Did it treat speculative elegance as evidence?

No major recommendation depends on elegance alone. Multi-dimensional independence, clean-room reconstruction and completion-set semantics are explicitly cheap-test hypotheses. Dependency-bearing knowledge is strongly supported as a gap but not as an economical implementation.

### Did it mistake missing measurement for missing phenomenon?

The report separates them. Completion-set semantics may be a missing instrument rather than an important phenomenon. Candidate-grammar absence can only be established by a restoring alternative, not by failure to measure one.

### Did it recommend infrastructure before a consumer?

No. Every possible new representation has a discriminator and a concrete consumer gate.

### Did it preserve benchmark progress versus broader generalization?

Yes. The cold-solve objective remains final production authority; precursor values are research evidence until they show a causal path to that objective.

### Did it weaken evidentiary independence through shared implementation?

No. The independence-vector finding argues in the opposite direction: some validators, reconstructions and challenger analyses may need deliberately different implementation/ontology paths.

### Did it confuse absence of evidence with evidence of absence?

No. The candidate-grammar finding specifically makes this distinction central.

### Did it preserve cheap decision-making where completeness is unnecessary?

Yes. Most current queue decisions do not need a universal dependency or independence model. Decision sufficiency remains cheaper than inquiry-space completeness.

### Did it find anything that could materially change future solver-research question selection?

Yes, if the discriminators survive:

1. prefer questions that expose **compact causal dependency** when current failures require broad rollback/restart or research corrections require broad archaeology;
2. explicitly test **proposal-space absence** before spending heavily optimizing selection within the current search/question grammar;
3. demand dimension-specific independence only when a conclusion relies on apparent corroboration across agents/tools/analyses;
4. use clean-room reconstruction selectively when conceptual independence matters;
5. treat a tractable completion-set pilot as a possible prerequisite for several option/regime questions, not as a new standing workstream.

Those changes would alter how Pathfinder decides *which question is worth asking next* without creating another research bureaucracy.

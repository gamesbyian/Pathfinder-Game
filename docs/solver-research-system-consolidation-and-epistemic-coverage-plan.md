<!-- agent-context-budget: warn=24000 max=32000 -->
# Solver research-system consolidation and epistemic-coverage plan

> **Status:** proposed implementation plan; not an execution-priority authority.
> **Created:** 2026-09-19.
> **Purpose:** consolidate the September 2026 solver-research infrastructure expansion; repair control-plane weaknesses exposed by recent execution; reduce documentation and agent-context burden; make invalid research artifacts harder to construct; and add a bounded research-portfolio/reflexivity layer that can detect instrument-shaped attention, preserve live rival explanations, expose answerability gaps and ontology escapes, and trigger independent exploration without displacing the solve-directed objective.
> **Priority authority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **Method authority:** [`solver-research-operating-model.md`](solver-research-operating-model.md).
> **Evidence authority:** [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md).
> **Deferred/reopen authority:** [`solver-future-work.md`](solver-future-work.md).
> **Conceptual-gap authority:** [`solver-reasoning-capability-atlas.md`](solver-reasoning-capability-atlas.md).
> **Premise-map authority:** [`solver-premise-map-snapshot-v2.json`](solver-premise-map-snapshot-v2.json) plus its hardening/measurement overlays.
> **Question authority:** [`solver-research-question-relations.json`](solver-research-question-relations.json).
> **Resource authority:** [`solver-research-data-assets.json`](solver-research-data-assets.json), [`solver-research-resource-contract.md`](solver-research-resource-contract.md), and audit declarations.
> **Historical rationale:** this plan extends rather than replaces the August process critique, September inference-audit/resource work, premise-map program, capability-atlas program, higher-order infrastructure composition work, search-loss/failure-evidence work, and planning-authority cleanup.

## 1. Why this plan exists now

The solver-research program changed character between September 12 and September 19.

It was already a sophisticated evidence-heavy solver project on September 12. By September 19 it had become a substantial research control plane with:

- stable research-question identities and cross-question relations;
- premise maps, premise relations, hardening overlays, independent reconstruction, mining and replication;
- measurement-opportunity representation;
- reasoning-capability and capability-memory views;
- research asset cataloguing and Resource Contract semantics;
- resource/inference audits;
- generation-source and family/population lineage;
- frozen research blocks and consumption/enrichment lineage;
- experiment contracts/manifests and durable decision-bearing evidence;
- evidence-integrity indexing;
- exact/reference-model support;
- production-frontier sampling and decision observations;
- work-ladder and response-covariance reducers;
- automatic compact failure response;
- bounded rich search-loss capture;
- hint provenance, replayability and sibling-discovery evidence;
- question dossiers, relation discovery and acquisition preflight;
- solver queue/future-work/plan-lifecycle reconciliation.

This expansion has already paid for itself in several ways. The production boundary advanced materially during the same week. Existing evidence was repeatedly reused instead of regenerated. Several attractive lines were stopped cheaply by precommitted falsifiers. Exact/reference evidence became a targeted discriminator rather than an occasional curiosity. Negative results increasingly close tested forms instead of spawning endless neighboring parameter sweeps.

The expansion also exposed a second-order problem: the research system is now itself a nontrivial software system whose identities, schemas, lifecycle rules, generated views, human authorities and scientific assumptions can fail.

Recent examples are concrete:

- Lane A exact-label work successfully produced expensive shard data, but population identity failed first because local case IDs were not unique across cut groups and then because disambiguated composite IDs containing commas were reparsed with comma splitting.
- The recovery path preserved the underlying evidence, demonstrating the value of separating raw acquisition from combine/report layers.
- A one-line noncanonical report `Status:` value subsequently broke documentation validation for later PRs, showing that post-hoc validation is carrying errors that common artifact constructors should prevent.
- Several September audits found semantic information present in individual subsystems but missing at the exact composition boundary where a research decision was made, including independent-unit propagation and exact-source evidence-integrity joins.
- Plans, future-work entries, question state and workstream state have repeatedly required reconciliation because a completed or superseded instruction can remain textually live after its scientific obligation moved elsewhere.
- The repository now contains enough Markdown, reports, registries and generated artifacts that retrieval quality is becoming a research reliability concern, not merely a documentation-style concern.

The next phase should therefore not be another broad conceptual build-out. It should make the existing system smaller at its human-facing surface, more compositional internally, harder to misuse mechanically, easier to recover, and better at recognizing questions for which it currently lacks an adequate observational or experimental path.

## 2. Governing principle

The research system exists to improve cold, level-blind solver capability and/or machine-independent work while protecting correctness and generalization.

The system itself is justified only when it does one or more of the following:

1. prevents invalid scientific inference;
2. avoids unnecessary solver/reference compute;
3. closes a question faster or more decisively;
4. preserves evidence that would otherwise be lost;
5. makes an important previously inaccessible question testable;
6. exposes a solver capability gap that produces a productive intervention;
7. reduces agent/human retrieval and coordination cost;
8. improves the probability that solver-development effort creates additional solves.

Research-system elegance is not an independent objective.

### 2.1 The target: a bounded research operating system

The standard is not "maximum scientific completeness." Pathfinder is an engineering-research program with a concrete objective: more or cheaper correct cold solves on unseen editor levels. The target is therefore a **bounded research operating system** with five coupled functions:

1. **State** — preserve what is currently believed, with scope, evidence role, ancestry and authority.
2. **Execution** — acquire valid evidence reproducibly, economically and recoverably.
3. **Inquiry** — preserve live questions, rival explanations, missing semantic operations and ontology escapes.
4. **Portfolio** — make visible where research attention is going, why it is going there, and which high-value uncertainties are neglected because they are hard or poorly instrumented.
5. **Reflexivity** — detect when the research system's own vocabulary, instruments, source distributions, historical expectations or local stop rules are shaping the agenda more than the solver problem itself.

The first two functions are already strong. Inquiry is substantially developed through the premise map, capability atlas, archaeology, question registry and measurement-opportunity work. The principal missing layer is persistent **portfolio/reflexivity control**.

This layer must remain descriptive and decision-supporting. It must not become an automatic research scheduler, a numerical research score, or another priority authority.

### 2.2 Decision sufficiency is not inquiry-space completeness

Two standards must remain separate:

- **decision sufficiency:** enough valid evidence exists to make the next scoped solver/research decision;
- **inquiry-space completeness:** the explanatory/model space is broad enough that important alternatives are not being systematically omitted.

A decision may be justified while the broader phenomenon remains incompletely understood. Do not require conceptual completeness before taking a scoped action when the evidence is sufficient for that action.

Conversely, a locally decisive result must not be broadened into semantic closure merely because no currently represented rival survives.

Record unresolved conceptual uncertainty separately from the decision disposition.

### 2.3 Scientific compromises must be explicit, not eliminated indiscriminately

Several departures from maximal academic-style rigor are intentional and useful:

- enriched populations may be used to test whether a mechanism can work before estimating prevalence;
- diagnostic evidence may nominate a treatment without independent confirmation;
- cross-generator transfer is unnecessary for narrow corpus-scoped decisions;
- historical evidence need not be ceremonially replicated when it is not decision-bearing;
- deterministic mechanistic questions do not require statistical ceremony;
- scientifically interesting phenomena with no plausible solve-directed consequence need not consume active research capacity.

The requirement is not "always use the strongest possible evidence." It is:

> use evidence strong enough for the exact decision being made, preserve the limitations that prevent broader claims, and keep unresolved high-value uncertainty discoverable.

## 3. Existing substrate: extend these, do not replace them

A major risk of this plan is accidental duplication. The following capabilities already exist and should be extended or composed rather than reimplemented.

### 3.1 Priority and question semantics

Existing owners:

- `solver-optimization-workstreams.md`: sole live priority/current-gate authority;
- `solver-future-work.md`: deferred descendants and reopen conditions;
- `solver-research-question-relations.json`: sparse stable question identities/relations;
- `research-status-index`: current/historical evidence discovery;
- `research:dossier`: question-centric join.

Do not create a second queue, question database, or priority score.

### 3.2 Conceptual structure

Existing owners:

- canonical premise-map snapshot and typed relation graph;
- premise-map hardening;
- independent premise reconstruction;
- shadow mining and replication;
- measurement-opportunity overlay;
- solver reasoning-capability atlas;
- capability-gap stop-condition reconciliation;
- operational taxonomy.

Do not create another broad premise ontology or another list of named "moonshots" as an authority.

### 3.3 Resources, populations and source lineage

Existing owners:

- research-data asset registry;
- Resource Contract semantics/audits;
- generation registry and source matching;
- research blocks;
- family/population lineage;
- consumption/enrichment lineage;
- independent-unit contracts.

Do not create a new central research database merely to make joins more convenient.

### 3.4 Evidence and inference

Existing owners:

- experiment contracts/manifests;
- durable experiment-evidence bundles;
- evidence-integrity index;
- evaluation-evidence role semantics;
- inference-audit framework;
- capability memory;
- exact/reference evidence;
- failure-response/search-loss resources.

Do not collapse all evidence into one mega-schema.

### 3.5 Measurement and acquisition

Existing owners:

- measurement-opportunity registry;
- acquisition preflight;
- decision observations;
- production-frontier sampling;
- work-ladder analysis;
- response covariance;
- family microscopes;
- exact/reference probes;
- failure-response query/reducers.

Do not infer that a measurement primitive should become universal merely because it exists.

### 3.6 Process governance and validation

Existing owners:

- research integration audit;
- research question-authority audit;
- report conventions/documentation links;
- tooling census/orphan checks;
- evidence-integrity guard;
- agent context-budget ratchets;
- plan/history archival conventions.

The plan below should strengthen composition and construction-time safety before adding more independent validators.

## 4. Historical lessons this plan must preserve

This work should be read in continuity with the repository's development history.

### 4.1 August lesson: recognize the real optimization problem earlier

The August process critique found that Pathfinder had effectively become a manually configured algorithm portfolio before the project recognized algorithm selection, configuration, allocation and evidence discipline as architectural problems. Measurement semantics and capability census arrived too late, creating later archaeology.

Implication for this plan: do not let the research system repeat the same mistake by becoming a manually coordinated portfolio of overlapping registries, documents and query tools. Normalize the architecture while the control plane is still tractable.

### 4.2 Naming-cleanup lesson: definition-site completion is not system completion

The naming-cleanup program repeatedly found that a definition could be "done" while workers, workflows, scripts, historical readers, aliases and documentation consumers remained inconsistent.

Implication: research-system changes must be audited across producer, persistence, transport, consumer, workflow, generated evidence, current authority and historical-reader boundaries.

### 4.3 September 12 lesson: planning authority can drift

The planning-authority audit found stale live triggers in future work, completed remediation still presented as active, and reopen premises compressed out of current surfaces.

Implication: every scientific closeout has an outbound propagation obligation. Current queue, future work, question relations, capability memory and plan lifecycle must remain consistent without duplicating state.

### 4.4 September 14 lesson: resource cleanliness is not enough

The inference-audit framework correctly reframed the problem as:

`world -> observation -> evidence -> interpretation -> belief -> priority -> intervention -> solver behavior -> solves`

Implication: consolidation must optimize inference reliability, not merely schema completeness or link validity.

### 4.5 September 17 lesson: independent conceptual reconstruction matters

The premise-map program used hostile completeness passes, independent peer construction, shadow mining, relation grammar, replication and measurement-completion hardening. It found both robust regions and ontology-dependent omissions.

Implication: future blind-spot discovery must preserve independent question-generation routes rather than allowing the mature research ontology to become the only language in which new ideas are generated.

### 4.6 September 17-18 lesson: composition seams are the current risk

Higher-order research-infrastructure audits found that many primitives already existed. Failures increasingly arose because the right facts were not joined at the decision boundary.

Implication: prefer derived composition views and end-to-end transaction tests over new primitive stores.

### 4.7 September 18-19 lesson: automatic evidence and recovery are valuable, but control-plane bugs can waste compute

Failure-response/search-loss work demonstrated that common evidence can be collected cheaply and used as an information ladder. Lane A demonstrated that expensive acquisition can survive a combine-layer failure when immutable inputs and recombination exist.

Implication: construction-time identity safety, recovery semantics and end-to-end fixtures are first-class research capabilities.

# Part I - Stabilize and consolidate the existing control plane

## Phase 0 - Establish a bounded consolidation period

Adopt a temporary presumption against new broad research-system concepts while this plan is active.

A new durable registry, identity namespace, evidence store, canonical prose authority, causal taxonomy, or broad observer framework requires a short extension preflight answering:

1. Which existing primitive is inadequate?
2. Is the deficiency semantic, scientific, or merely ergonomic?
3. Which real consumer needs the new structure?
4. Can a derived view or an extension of an existing authority serve it?
5. Which existing surface becomes simpler, smaller or removable if the new structure lands?
6. What is the stop condition if the abstraction does not earn reuse?

This does not restrict experiment-specific scripts, direct solver work, or a new semantic measurement that is required to answer a live question.

### Implementation

Extend the existing "frameworks must earn implementation" rule in `solver-research-operating-model.md` rather than creating a new policy document.

### Exit criterion

Future agents can distinguish a genuine missing research primitive from a convenience-driven parallel abstraction.

## Phase 1 - Build a derived research-system architecture map

The September higher-order composition report already described eight interacting planes. Turn that into a compact machine-derived architecture inventory.

For every major subsystem record or derive:

- canonical authority;
- structured source;
- human view;
- producer(s);
- consumer(s);
- stable identity domain;
- lifecycle states;
- validation owner;
- whether the source is authoritative or derived;
- queue authority, if any;
- production-policy authority, if any;
- archive/retirement semantics;
- primary join keys;
- known semantic caveats.

Start from existing registries/tooling rather than hand-authoring another encyclopedic document.

### Required output

A generated graph/table suitable for:

- duplicate-authority detection;
- orphan producer/consumer detection;
- identifying manual multi-source joins that still exist only in researcher reasoning;
- identifying concepts declared in several manually maintained locations.

### Explicit non-goal

The map is not a new authority. It is a health/architecture view over existing authorities.

## Phase 2 - Run a control-plane identity audit

Audit every research identity that crosses process, file, workflow or shard boundaries.

At minimum:

- level/parent/family identity;
- research-block identity;
- population row/case identity;
- frontier/state identity where persisted;
- cut/interface identity;
- question/premise/MO identity;
- experiment/contract/run/attempt identity;
- selection/consumption identity;
- evidence/bundle/resource identity;
- generator/source identity.

For every identity establish:

- uniqueness scope;
- canonical serialization;
- component typing;
- whether components can contain delimiters;
- whether parsing uses structured data or informal string splitting;
- whether order is semantically relevant;
- whether round-trip tests exist;
- shard uniqueness/recombination behavior;
- collision and duplicate detection semantics;
- legacy-reader expectations.

### Required fix class

Composite identities used for scientific integrity must use structured serialization or an escaping-safe canonical codec. Informal delimiter parsing must not be the semantic boundary.

### Required adversarial fixtures

Test components containing commas, colons, separators, spaces, Unicode, repeated local IDs under different parents/scopes, and reordered components where order should or should not matter.

### Historical target

The Lane A duplicate-case-ID and comma-splitting failures should become permanent regression fixtures, not merely fixed incidents.

## Phase 3 - Shift common validity from validators into constructors

Inventory validation failures and research-control-plane bugs from the recent six-week period.

Classify each as:

1. preventable by producer/constructor;
2. detectable only by consumer/context validation;
3. semantic/human-judgment dependent.

For class 1, prefer constructor hardening.

Candidate conversions include:

- report status enum;
- evidence role/status enum;
- durability/disposition enum;
- experiment identity construction;
- population and independent-unit declarations;
- common provenance/run identity;
- Resource Contract references;
- block/experiment independent-unit propagation;
- canonical composite IDs.

### Principle

Validators should remain defense in depth. Common artifact writers should not routinely be able to produce a structurally invalid canonical artifact.

### Success test

Deliberately malformed common artifacts fail at creation or local targeted tests rather than after merge in repo-wide validation.

## Phase 4 - Add end-to-end "research transaction" fixtures

The unit of correctness is increasingly larger than one script.

Create tiny deterministic fixtures that exercise:

`question -> population/resource -> block -> experiment contract -> execution/shards -> combine -> durable evidence -> query/reducer -> report/result -> question/queue/future-work disposition`

No expensive solver run is required. Use synthetic/tiny fixtures where possible.

Required cases:

- duplicate local case IDs in distinct semantic groups;
- partial/missing shard;
- successful shards plus combine failure;
- recombination without new solver compute;
- exact/reference abstain/unsupported outcomes;
- selected/development population;
- solved controls;
- cross-resource derived evidence;
- superseded result/plan;
- family/parent independent-unit propagation;
- archive/retirement transition;
- stale evidence-integrity index;
- report status creation;
- question closeout with outbound relation/future-work consequences.

### Why this is distinct from existing integration audits

The current integration audit checks cross-system references and selected semantics. This fixture tests the scientific transaction as an executable lifecycle.

## Phase 5 - Make recovery semantics first-class

Generalize the useful property demonstrated by Lane A.

Every expensive sharded evidence workflow should be able to declare, where applicable:

- immutable input population identity/hash;
- shard plan identity;
- raw shard outputs;
- combine implementation/version;
- validation stages;
- durable-result stage;
- whether combine/revalidation can be rerun without solver/reference compute;
- which failures leave raw evidence valid;
- which failures invalidate the acquisition itself.

Prefer a shared recovery/recombine interface when existing workflow shapes permit it.

### Non-goal

Do not force workflows with materially different evidence semantics into a fake common combine format.

### Success criterion

A reporting, indexing or combine-layer bug does not automatically imply rerunning valid expensive acquisition.

# Part II - Finish integration of systems already built

## Phase 6 - Complete hint/failure evidence symmetry only where semantics are genuinely shared

The September 19 hint/failure cross-pollination work already added:

- replayability classes;
- termination/censoring classes;
- sibling discovery-process evidence;
- purpose-aware failure queries;
- search-loss/hint joins;
- capability-memory integration;
- durable future-work hooks.

Audit the combined systems for shared concepts that still diverge unnecessarily:

- source/run/protocol identity;
- reconstruction/replayability;
- selection/exposure ancestry;
- termination/censoring;
- cost/work;
- consumer purpose;
- parent/family dependence;
- exact/reference enrichment;
- evidence-role transition;
- novelty/saturation;
- phenotype/recurrence derivation.

Where meaning is truly shared, prefer common helper/query vocabulary.

Where meaning differs, preserve separate schemas and document the boundary.

Do not:

- make rich search-loss capture universal;
- rewrite historical Hint records merely for symmetry;
- create a universal "failure/hint" database;
- backfill unsupported historical semantics.

Condition-gated phases in the existing failure/search-loss plans remain condition-gated.

## Phase 7 - Reconcile question, premise, capability-gap, MO and queue coverage

Perform a bidirectional derived audit.

### 7.1 Question -> authority

Every stable active/deferred question should resolve to exactly one practical state:

- live current workstream gate;
- parallel active investigation;
- blocked on data/acquisition/compute;
- deferred with explicit reopen condition;
- concluded/archived;
- superseded/duplicate.

### 7.2 Queue -> question/premise

Every nontrivial scientific gate in the live queue should have discoverable question/premise lineage unless it is a straightforward correctness/performance implementation task.

### 7.3 Capability gap -> research disposition

Every high-value gap in the reasoning-capability atlas should resolve to one or more of:

- active question;
- tested closed form;
- explicit surviving semantic route;
- future trigger;
- deliberate non-investigation with rationale.

### 7.4 MO -> live ambiguity

Measurement opportunities remain non-queue. For every currently relevant MO, show which live ambiguity it can discriminate, what primitive/resource/population can instantiate it, and what is missing if it cannot.

### 7.5 Result -> outbound propagation

A decisive result should be checked for material consequences in:

- question state/relations;
- workstream gate;
- future/reopen condition;
- capability memory;
- plan lifecycle;
- evidence-integrity/durable bundle where applicable.

Automation may flag missing or contradictory state. It must not semantically close/reopen questions by itself.

## Phase 8 - Implement selected higher-order composition views already identified

The September 18 higher-order composition report already identified valuable larger joins. Implement only the ones with demonstrated current consumers.

Priority candidates:

### 8.1 Reopen-status view

Compose:

`reopensOn + archaeology disposition + evidence integrity + current production boundary + new measurement/support evidence + Resource Contract caveats`

Return explanatory states such as:

- trigger evidence absent;
- trigger evidence present but historical evidence nonportable;
- trigger evidence present and old evidence portable;
- rerun required;
- current source cannot support the intended claim.

Never automatically reopen a question.

### 8.2 Exact/reference campaign preflight

Compose:

`question mechanics + population mechanics + reference support envelope + expected abstention + label cost + independent units + decision value`

Primary output:

- unsupported mechanic fraction;
- expected usable independent units;
- expected abstention;
- cost envelope;
- whether the exact campaign can actually discriminate the live rivals.

Never auto-launch labeling.

### 8.3 MO implementation-coverage view

Compose:

`MO -> primitive -> required resource -> supported population -> live question consumers -> durable path -> blind spot`

This is especially useful for differentiating "concept represented" from "operationally testable."

### 8.4 Prospective selection-provenance summary

At planning time, summarize structured facts already represented across existing systems:

- prespecified vs mined;
- candidate/config/threshold/seed search;
- residual/cohort selection;
- outcome-blind matching;
- exact-label exposure before treatment freeze;
- family exploration;
- source selection after seeing outcomes.

Do not compress these into a scalar "selection score."

### 8.5 Capability-memory x operational-taxonomy crosswalk

Use the canonical operational taxonomy to prevent clouds of configurations from appearing as independent capability mechanisms in derived analysis.

Do not alter capability-memory's solve-set semantics.

## Phase 9 - Delay phenotype/mechanism memory until consumers earn it

The higher-order composition work correctly identified that non-solve phenomena can disappear into prose even when they may matter across investigations.

Candidate recurring phenomena include:

- exact-LIVE candidates repeatedly below cutoff;
- decision-rank disagreement;
- frontier survival/extinction;
- dose-response shape;
- structural response across family siblings;
- representation-specific survival.

However, do not implement a durable phenotype-memory schema merely because the gap is conceptually attractive.

Promotion gate:

1. at least two live consumers need the same bounded non-solve signature;
2. existing reports/search-loss/failure-response queries cannot serve them economically;
3. the proposed schema has clear conditioning, independent-unit and provenance semantics;
4. it remains explicitly outside solve-capability union/headroom and production routing.

Until then, use derived analyses and reports.

# Part III - Reduce documentation and context gravity

## Phase 10 - Classify documentation by cognitive role

The repository can retain rich history without requiring agents to treat it all as live.

Classify documents into four roles.

### A. Small canonical current authorities

Keep this set intentionally small and budgeted.

Examples include:

- live workstreams;
- research operating model;
- evaluation evidence;
- level-blindness;
- future work;
- capability atlas;
- research data/resource overview;
- tooling family overview.

Each authority must have:

- one ownership sentence;
- a context-size budget;
- explicit information that belongs elsewhere;
- a generated/detail source where appropriate.

### B. Generated current-state views

Prefer generated views for volatile multi-system state, for example:

- active questions;
- blocked acquisitions;
- recent conclusions;
- capability-gap disposition;
- open plan obligations;
- resource health;
- MO operational coverage;
- changed-since summaries.

Generated views are not authorities.

### C. Dated evidence reports

Retain them. Index/query them. Keep them out of ordinary context unless relevant.

### D. Historical/archive material

Completed plans, superseded authorities, old notebooks and handoffs should be frozen and excluded from normal "what is current?" retrieval.

## Phase 11 - Build a compact research front door from existing authorities

Extend existing query infrastructure rather than creating a new store.

A command such as `npm run research:brief` should synthesize a compact current-state briefing.

Candidate output:

- current production boundary;
- top live workstream gates;
- active questions;
- data/acquisition/compute-blocked questions;
- recently concluded questions;
- highest-value capability gaps and their dispositions;
- relevant assets/Resource Contract/integrity warnings;
- unfinished plan obligations;
- next legal cheap action for each live gate;
- changed-since summary.

Useful filters:

- `--question=<id>`
- `--lane=<name>`
- `--capability=<term>`
- `--changed-since=<date/ref>`
- `--blocked`
- `--needs-data`
- `--needs-code`
- `--needs-compute`
- `--plans`

### Relationship to existing tools

This should compose `research-status-index`, `research:dossier`, relation discovery, asset/resource queries, capability atlas state and workstream/future-work authority. It should not supersede their detailed functions.

## Phase 12 - Add documentation-entropy diagnostics

Measure the burden that matters, not just file count.

Candidate diagnostics:

- number of canonical-current prose authorities;
- total bytes/tokens of current authorities;
- count of active/condition-gated plans;
- count of documents claiming current/active/canonical status;
- duplicated authority declarations;
- stale active wording;
- unreachable reports/assets;
- number of manually repeated concepts/fields across authorities;
- orphan tools/scripts;
- weekly report/document growth;
- ratio of generated current-state views to hand-maintained volatile state;
- agent context-budget warnings.

Use these as warning signals, not score targets.

### Anti-Goodhart rule

Do not delete valuable evidence merely to make counts smaller. The objective is lower current-state retrieval entropy, not a small repository.

## Phase 13 - Plan lifecycle completion audit

The repository has already begun retiring completed plans. Generalize the process.

Audit plans/preflights/handoffs from the recent eight-week period and classify each:

- live authority;
- active execution plan;
- condition/data blocked;
- implementation complete with future gates routed elsewhere;
- superseded;
- concluded/archive;
- historical evidence only.

For every non-live plan:

- stop stale active wording;
- route surviving obligations to workstreams/future work/question relations;
- add successor/predecessor links where useful;
- archive/freeze when current discovery improves;
- ensure a query can answer "what unfinished obligations survive this plan?"

Do not preserve plans as pseudo-queues.

# Part IV - Add research-portfolio and reflexivity control

The repository already contains much of the scientific doctrine needed here: P204's rival-discrimination rule, the inference-audit framework, source-coverage anti-self-sealing rules, ontology-escape handling, independent premise reconstruction, the completeness matrix, the measurement-opportunity overlay, and MO-007 research-process metrology.

Do not create a parallel "science layer." The work below operationalizes those existing principles across research attention over time.

## Phase 14 - Build a bounded research-attention topology using MO-007

Before building broad new epistemic machinery, measure whether the suspected myopia is actually present.

Create a read-only retrospective view over a bounded recent window, preferably derived from existing PR/report/question/experiment metadata.

Where recoverable without heroic archaeology, classify activity by:

- premise/capability-atlas region;
- system locus and claim type from the premise completeness matrix;
- research function (encode, derive, generate, reject, prefer, retain, remember, allocate, select, transfer, recognize, measure, infer from evidence);
- question source/provenance;
- evidence family used;
- research cost proxies available without inventing false precision (PR/experiment count, solver/reference compute when recorded, repeated reopen/iteration cycles);
- whether the work changed a research decision;
- whether it created/refined a semantic premise;
- whether it changed solver behavior;
- whether it produced or preserved cold-solve capability.

### Interpretation

This is a **topology**, not a productivity score.

Look for:

- dense regions receiving repeated descendants while thin/high-value regions remain untouched;
- repeated work generated by one instrument/source family;
- many PRs/experiments with little belief or decision movement;
- high-value low-answerability gaps receiving no inquiry;
- overconcentration on current residual/tool vocabulary;
- areas where negative results are successfully terminating work.

Do not infer causal research effectiveness from simple counts.

### Existing authority

Use MO-007 (research-process yield / premise fertility) as the conceptual home. Do not create another measurement-opportunity identity merely for attention topology.

## Phase 15 - Preserve live rival sets at decision-bearing causal gates

P204 and the inference-audit framework already require rival explanations. The missing operational seam is that rivals can disappear as one explanation becomes instrumentable.

For causal/discriminating investigations, extend existing preflight/report conventions with a compact optional rival block:

- **live rivals:** materially different explanations still compatible with current evidence;
- **discriminating observable/intervention:** what could separate them;
- **outcome interpretation:** which rivals are strengthened, weakened, closed, or left untouched by each material outcome;
- **unrepresented/unanswerable rival:** plausible explanation the current experiment cannot adjudicate;
- **decision consequence:** what action changes if discrimination succeeds.

Do not create a hypothesis registry.

### Closeout rule

A tested rival may close only to the extent the experiment could observe/manipulate the distinction. "Not discriminated" is not a negative result.

## Phase 16 - Decompose answerability instead of treating it as one property

A mature research system can prefer questions it already knows how to answer. Make the source of answerability explicit.

For important active/deferred questions, derive or state these layers where relevant:

1. **conceptual answerability** — are the competing explanations specified precisely enough to distinguish?
2. **observational answerability** — can current instrumentation observe a difference?
3. **experimental answerability** — can an intervention or controlled construction separate the rivals?
4. **reference answerability** — can exact/reference machinery adjudicate the needed fact, with support/abstention known?
5. **population answerability** — do suitable independent units/opportunity populations exist?
6. **economic answerability** — can enough information be acquired at sensible work/cost?
7. **inferential answerability** — would the resulting evidence justify the intended claim rather than only a narrower one?
8. **decision answerability** — would resolving the ambiguity change implementation, queue state, reopen logic, or the solver model?

Low answerability must not imply low scientific value.

### Deficit vocabulary

Reuse existing terminology rather than creating a parallel ontology:

- **evidence deficit:** concept and measurement path exist; needed evidence is not yet acquired;
- **measurement deficit:** question is sufficiently specified, but the necessary observer/intervention/oracle/population/replay/generation path is not operational;
- **ONTOLOGY_ESCAPE:** the important distinction cannot be represented cleanly in the current premise/research language without distortion.

Do not introduce "concept deficit" as a competing durable term.

## Phase 17 - Add an answerability-gap / MO operational-coverage view

Extend the existing measurement-opportunity and higher-order composition work into a derived view.

For each material live/deferred ambiguity, show where possible:

question -> live rivals -> premise neighborhood -> MO/discriminator -> primitive -> required resource -> supported population -> reference support -> durable evidence path -> missing link -> decision consequence

Missing-link classes should include:

- observer;
- intervention;
- exact/reference support;
- eligible population;
- independent source;
- replay/reconstruction;
- counterfactual;
- generation/control;
- alternative search object;
- ontology escape;
- prohibitive cost.

A gap is not automatically implementation work.

Closing the gap is earned only when the resulting information can plausibly change a live or foreseeable solve-directed decision.

## Phase 18 - Derive a compact research-system capability audit

The solver capability atlas asks what semantic operations the solver lacks. Build a smaller derived audit of what the **research system** can and cannot do.

Candidate functions:

- observe;
- reconstruct/replay;
- intervene;
- exact-label/prove;
- generate controlled cases;
- match/control;
- estimate prevalence/opportunity;
- preserve causal ancestry/independent units;
- compare at matched work;
- test transfer/source robustness;
- reason across attempts/stages;
- evaluate alternative search objects;
- preserve durable evidence;
- recover interrupted acquisition;
- preserve prospective expectation/surprise.

Classify each as:

- strong;
- partial;
- specialist/narrow;
- absent;
- possible but currently uneconomic.

Map weaknesses to actual questions/capability gaps.

### Important boundary

Start as a generated audit report. Do not build a permanent schema unless repeated consumers earn one.

## Phase 19 - Audit question provenance for instrument-shaped research

For important questions where provenance is recoverable, classify the primary question-generation source:

- solver failure/residual evidence;
- existing tool/data opportunity;
- capability-atlas semantic-demand analysis;
- premise-map mining;
- historical anomaly/archaeology;
- human/editor observation;
- exact/reference discrepancy;
- external literature/algorithm family;
- independent peer/red-team reconstruction;
- adversarial/synthetic construction;
- unexpected experiment result.

Join this with Phase 14's attention topology.

### Interpretation

A concentration of questions originating from existing telemetry/tool availability is evidence of possible instrument-shaped research, especially when high-value atlas gaps remain measurement-poor.

Do not optimize for equal source counts. A highly productive source may legitimately dominate for a period.

## Phase 20 - Use trigger-based exploration instead of a fixed exploration budget

Do not reserve an arbitrary percentage of effort for moonshots.

Earn a bounded ontology-challenging exploration when one or more signals fire:

- several successive questions arise from the same evidence/tool family;
- Phase 14 shows sustained concentration in one dense premise region;
- a high-value capability gap remains low-answerability across multiple queue cycles;
- multiple clean negatives share a major architectural/representational assumption;
- MO-007 shows substantial effort with little decision movement;
- independent reconstruction produces a material semantic delta;
- a robust unresolved anomaly conflicts with the current explanatory model;
- the active queue contains only questions already well served by existing instrumentation.

An exploration response may be:

- bounded independent/tool-blind reconstruction;
- adversarial semantic challenge generation;
- external semantic-operation review;
- counterfactual archaeology;
- an offline surrogate for a currently unobservable concept.

### Protection rule

When an exploration trigger is satisfied, the bounded exploration may proceed even if it lacks the immediate expected solve value demanded of an ordinary exploitative experiment. It still requires a stop condition and must not become an open-ended research program.

## Phase 21 - Reuse independent premise reconstruction as a saturation instrument

The September independent premise reconstruction already demonstrated the method. Do not create another standing premise-map program.

Run smaller **independent inquiry probes** when exploration is triggered:

1. freeze the source bundle before inquiry;
2. withhold recent canonical premise-map structure, named lanes and detailed tool inventory;
3. expose Pathfinder semantics, high-level solver architecture, selected evidence/residual examples and computational constraints;
4. derive missing operations, rival explanations, alternative search objects and desired discriminators in the probe's native vocabulary;
5. reconcile afterward against the canonical premise map/capability atlas/history;
6. classify outputs as rediscovery, scope refinement, relation-only, new semantic parent, or ONTOLOGY_ESCAPE.

### Saturation interpretation

- repeated independent rediscovery -> stronger confidence that the conceptual map is broad enough for current purposes;
- mostly scope/refinement deltas -> ontology reasonably stable;
- recurring new semantic parents -> independent exploration remains high-value;
- recurring ontology escapes -> current research language needs revision.

No result proves unknown-unknown completeness.

## Phase 22 - Preserve prospective expectations and distinguish surprise from anomaly

The repository now has enough disciplined preflight history to begin preserving what researchers expected before expensive/high-value tests.

For future decision-bearing investigations where expectations are material, record lightweight prospective fields in the existing preflight/report surface:

- **expected discriminating outcome:** the qualitative outcome currently judged most plausible;
- **surprise condition:** an outcome that would materially change the explanatory model or research direction.

Do not require numeric probabilities unless a particular experiment naturally supports them.

### Surprise versus anomaly

Keep these distinct:

- **surprise:** result differs materially from the recorded prior expectation;
- **research anomaly:** reproducible observation materially inconsistent with the current explanatory model/scope assumptions, not explained by known execution/plumbing error, and not yet captured by a sufficiently discriminating existing question.

An anomaly can be expected; a surprise can be quickly explained and cease to be anomalous.

### Storage discipline

Initially keep these as report/preflight metadata discoverable through the existing status index. Do not create an anomaly registry unless recurring consumers demonstrate the need.

## Phase 23 - Mine intersections of negative results for shared hidden assumptions

The current system correctly prevents one failed implementation from closing its semantic parent. Add a complementary mining lens:

> when several cleanly closed tested forms cluster around a broader problem, what important assumption did all of them share?

Candidate shared assumptions include:

- forward-prefix search object;
- intervention only through local ranking;
- fixed root preprocessing;
- low-cardinality/scalar representation;
- no solve-local cross-process fact sharing;
- irreversible stage boundaries;
- one-pass rather than revisable information;
- one witness/basin notion of progress;
- same residual/source conditioning.

Use the premise relation graph, archaeology dispositions, capability-gap reconciliation and reports as inputs.

This is **negative-space intersection mining**, not an automatic premise generator.

A shared assumption earns a new premise/question only through normal semantic-novelty and evidence rules.

# Part V - Use epistemic blind spots to generate bounded new research

## Phase 24 - Use adversarial level construction to probe absent reasoning

Current generation infrastructure should sometimes construct populations around a semantic demand rather than merely sample what the current solver already fails on.

Candidate challenge families:

- joint individually-feasible but collectively-infeasible obligations;
- path-history topology with matched scalar/mechanic progress;
- narrow separator/interface contracts;
- delayed irreversible commitments;
- backward completion requirements;
- structurally different solution basins with similar local scores;
- cases where useful exact micro-queries have high expected value;
- cases where forward-prefix search objects are systematically awkward.

Construction should be outcome-blind to the current solver whenever the purpose is semantic capability testing.

Preserve generator/source identity. Synthetic challenge success establishes capability on the challenge, not prevalence in the production distribution.

## Phase 25 - Use counterfactual archaeology as a question generator

For selected historical/current failures that fit no current explanation cleanly, ask:

> What fact, relation, proof, plan, intervention or search object would have made this instance easy if the solver had possessed it?

Then ask:

- is that information legal from current input?
- can it be derived offline?
- does it correspond to a current capability-atlas gap?
- does any current observer represent it?
- can controlled siblings/adversarial construction vary it?
- would a consumer decision actually change?

This is particularly useful for **absence-of-representation blindness**: an absent semantic object emits no telemetry.

## Phase 26 - Continue external conceptual imports at the semantic-operation layer

The August external-research lesson remains valid.

When reviewing SAT/SMT, constraint programming, automated planning, graph decomposition, program synthesis, theorem proving, routing, game search or learned search, ask:

- what semantic operation does this family possess that Pathfinder lacks?
- what information does it preserve or derive?
- what intervention becomes possible because of it?
- can the premise be tested cheaply with existing offline exact/reference or controlled construction?

External techniques nominate missing operations. They do not receive implementation authority by reputation.

## Phase 27 - Use a standard ladder for any new research-system capability

For every proposed new observer, intervention, evidence layer or research primitive:

1. **Name the missing decision.**
2. **Specify the hypothetical information.**
3. **Build or identify an offline surrogate.**
4. **Estimate opportunity on independent units.**
5. **Price acquisition.**
6. **Build the smallest observer/intervention/query.**
7. **Demonstrate a consumer that changes a useful decision.**
8. **Only then generalize infrastructure.**

This applies premise-before-treatment discipline to research infrastructure itself.

## Phase 28 - Prioritize the research-system blind spots current evidence says are real

### 28.1 Absence-of-representation blindness

The system is strong at explaining events emitted by existing searches. It is weaker at detecting semantic objects the solver never represents.

Examples:

- joint future obligation plans;
- separator contracts;
- backward completion requirements;
- causal commitments;
- abstract completion regimes.

Use independent inquiry, offline surrogates and adversarial matched constructions to ask whether existing telemetry could ever expose the missing distinction.

### 28.2 Absent-search-object blindness

Most instrumentation assumes forward-prefix search or repair/reconstruction of prefixes.

Cheaply falsify or support alternate objects before implementing them:

- abstract obligation/order plans;
- backward contracts;
- separator-region contracts;
- relaxed complete paths;
- bounded conflict/constraint objects.

### 28.3 Intervention deficit

Observation has advanced faster than causal manipulation.

Audit which live rival sets are currently distinguishable only correlationally because the system cannot independently vary:

- retention/rank decision;
- structural commitment;
- obligation order;
- topology relation;
- region/interface state;
- exact-query availability;
- stage/attempt handoff.

Prefer production-inert counterfactuals, family contrasts and adversarial generation before runtime treatments.

### 28.4 Distribution/source blindness

Current corpora and generators determine which phenomena become visible.

Use source-adequacy reasoning to identify:

- mechanics/structures underrepresented by current sources;
- construction regimes sharing witness/generator bias;
- semantic challenge families not independently producible;
- "rare opportunity" conclusions that are only population-conditional.

Do not convert synthetic challenge prevalence into production prevalence.

### 28.5 Language/ontology blindness

The premise-map hardening already guards against ontology artifacts.

Permit independent inquiry to use alien vocabulary before reconciliation. Treat awkward forced placement as ONTOLOGY_ESCAPE, not as evidence the idea is invalid.

### 28.6 Cheap-test gravitational bias

The smallest-decisive-evidence rule is correct **after a question exists**.

Use attention topology, provenance and answerability to detect the upstream bias where questions served by existing JSON joins, telemetry or exact models are generated more often than equally important poorly instrumented questions.

### 28.7 Local-stop-rule aggregation blindness

A local stop rule can be correct while the collection of stopped forms reveals an untested shared assumption.

Use Phase 23 to distinguish:

- repeated evidence against a semantic parent;
- repeated failure of forms sharing an architectural worldview.

# Part VI - Documentation, implementation and operational guardrails

## Phase 29 - Protect direct solver capability work

This plan is supporting infrastructure. It must not consume the whole development program.

Rules:

- direct active premise-acquisition lanes continue in parallel;
- housekeeping does not block solver experiments unless correctness/evidence validity is at risk;
- prefer zero/low-compute consolidation;
- new research infrastructure competes for attention under the same value-of-information principle as solver infrastructure;
- once the major control-plane repairs and blind-spot views land, default to maintenance mode.

## Phase 30 - Add research-infrastructure ROI review

At a bounded cadence, review infrastructure added since the previous checkpoint.

For each item ask:

- Did it prevent invalid evidence?
- Did it avoid compute?
- Did it shorten a research line?
- Did it expose a previously inaccessible question?
- Did it contribute to a solver change/new solve?
- Does more than one real consumer use it?
- Can it now be simplified, merged, frozen, archived or deleted?

Possible dispositions:

- retain;
- simplify;
- merge;
- generate instead of maintain;
- freeze;
- archive;
- delete.

Do not convert these into one productivity score.

## Phase 31 - Add targeted observer-effect recalibration triggers

Automatic compact failure evidence is valuable because it is cheap and parity-calibrated. Rich capture is intentionally more expensive.

Do not rerun calibration constantly. Trigger a bounded recalibration when:

- observer semantics materially change;
- instrumentation moves into a hotter code path;
- a new solver family is instrumented;
- payload volume changes materially;
- randomness/cache/work semantics change near instrumentation;
- parity is questioned by a regression.

Preserve current separation between automatic compact response and selective rich capture.

# Part VII - Implementation order

## Stage A - Immediate stabilization

Do first because these reduce correctness and coordination risk with little solver compute.

1. Phase 0: research-system extension gate.
2. Phase 1: derived architecture map.
3. Phase 2: identity audit and regression fixtures.
4. Phase 3: constructor-hardening audit.
5. Phase 4: end-to-end research-transaction fixture.
6. Phase 5: recovery/recombine contract audit.
7. Phase 7: question/premise/capability/MO/queue consistency audit.
8. Phase 13: plan lifecycle audit.

## Stage B - Measure the portfolio before correcting it

9. Phase 14: bounded MO-007 research-attention topology.
10. Phase 19: question-provenance join over the same bounded window.
11. Phase 16: answerability decomposition on a small high-value question sample.
12. Report whether the hypothesized instrument/attention bias is actually visible and which later epistemic phases remain earned.

This stage deliberately precedes broad reflexivity infrastructure. Do not build a cure for an unmeasured pathology.

## Stage C - Consolidation and retrieval

13. Phase 10: documentation role classification.
14. Phase 11: compact research front door.
15. Phase 12: documentation-entropy diagnostics.
16. Phase 8: highest-value existing composition views.
17. Phase 6: hint/failure symmetry cleanup only where earned.

## Stage D - Earned epistemic/reflexivity controls

Only the findings from Stages A-B should determine how much of this stage is needed.

18. Phase 15: rival-set preservation in existing preflight/report contracts.
19. Phase 17: answerability-gap/MO operational-coverage view.
20. Phase 18: research-system capability audit.
21. Phase 23: first negative-space intersection-mining pass.
22. Phase 22: prospective expectation/surprise capture for new high-value investigations.
23. Phase 20: run one bounded triggered-exploration response if the trigger conditions are actually met.
24. Phase 21: use independent inquiry as the preferred first ontology-challenging response when appropriate.

## Stage E - Blind-spot-driven scientific work

25. Phase 25: counterfactual archaeology pilot where a robust unexplained failure earns it.
26. Phase 24: one adversarial semantic challenge population for a high-value capability gap where source construction is the missing discriminator.
27. Phase 26: bounded external semantic-operation review only when it illuminates a live blind spot.
28. Use Phase 27 for any new research primitive.
29. Revisit Phase 9 phenotype/mechanism memory only if two real consumers still require it.
30. Maintain Phase 30 ROI review and Phase 29 protection of direct solver work.

# Part VIII - Verification and closeout

## 27. Required audits before calling consolidation complete

### 27.1 Authority audit

Verify:

- only workstreams rank live work;
- future work remains reopen/deferred;
- question relations remain sparse/non-priority;
- plans do not compete with queue authority;
- generated briefs/views identify themselves as derived.

### 27.2 Identity audit

Verify all research-critical composite IDs have declared scope/codec and regression coverage.

### 27.3 End-to-end lifecycle audit

Verify a representative transaction can be created, interrupted, recovered, combined, persisted, queried and closed without losing identity, independent-unit or selection provenance.

### 27.4 Documentation audit

Verify current-state retrieval does not require scanning large historical report sets and that completed plans no longer masquerade as active.

### 27.5 Epistemic-coverage audit

Verify the system can explicitly represent:

- a high-value question that is currently answerable;
- an evidence-deficit question;
- a measurement-deficit question;
- an ONTOLOGY_ESCAPE;
- a question with a desired discriminator but no suitable population;
- a question blocked by exact/reference support;
- a question that is conceptually answerable but not experimentally answerable;
- a question that is experimentally answerable but not inferentially sufficient for the intended claim;
- a question whose low answerability does not demote its scientific importance;
- a scoped decision that is justified even though inquiry-space completeness remains unresolved.

### 27.6 ROI audit

Verify the consolidation has reduced at least one of:

- duplicate architecture;
- current-context burden;
- invalid-artifact escape;
- rerun risk after recoverable workflow failure;
- manual multi-system reconciliation;
- untracked unanswerable questions.

# Part IX - Success criteria

This plan is successful when the following are true.

1. Current research state is primarily reconstructable from machine-readable authorities plus compact generated views.
2. The number and size of manually maintained current-state prose surfaces stops growing faster than the information they uniquely own.
3. Common malformed artifacts are rejected by constructors/local tests before merge.
4. Composite research identities have explicit domains/codecs and end-to-end regression coverage.
5. Expensive evidence survives recoverable combine/report/control-plane failures without unnecessary recompute.
6. Active/deferred/concluded question state cannot silently disappear between queue, question relations, future work and plans.
7. Completed plans are easy to retire while surviving obligations remain discoverable.
8. Existing research subsystems compose at decision boundaries without requiring a researcher to remember undocumented joins.
9. Rich evidence remains selective; compact evidence remains cheap and automatic where justified.
10. The system can say why an important question is currently unanswerable.
11. Low answerability is not conflated with low scientific value.
12. Independent/tool-blind question generation periodically produces proposals outside the current observer/tool vocabulary.
13. At least some of those proposals can be tested through small new measurements, adversarial populations or offline surrogates without immediately building full architectures.
14. New research-system primitives become rarer and better justified.
15. Research-system work increasingly shows concrete returns in avoided compute, better closures, new capability premises, implementations, or solve gains.
16. Direct solver acquisition work continues while the control plane moves into maintenance mode.
17. A bounded attention-topology view can show where research effort is concentrated without pretending to rank productivity.
18. Important causal investigations preserve their live rival set long enough that instrument availability cannot silently redefine the question.
19. Exploration is triggered by evidence of concentration, ontology escape, anomaly or shared-negative assumptions rather than by a standing moonshot quota.
20. Independent inquiry probes can be used as a saturation check without creating a second premise-map authority.
21. Prospective surprise conditions make genuinely model-changing results distinguishable from hindsight narrative.
22. Clusters of closed forms can be mined for shared untested assumptions without automatically reopening them.
23. The system distinguishes evidence deficits, measurement deficits and ontology escapes using existing vocabulary.
24. The system can act on decision-sufficient evidence while preserving wider unresolved conceptual uncertainty.

# Part X - Explicit non-goals

Do not use this plan to:

- create a universal research database;
- merge every evidence type into one schema;
- create a second live solver queue;
- create a second premise ontology;
- create a second measurement-opportunity registry;
- create a second capability atlas for the solver;
- automatically rank questions by answerability;
- turn MO-007 into a single research-productivity score;
- impose a fixed exploration/moonshot percentage;
- create a permanent anomaly database before recurring consumers earn it;
- create a second hypothesis/rival registry;
- automatically close/reopen scientific questions;
- make rich search-loss capture universal;
- force specialist topology/exact/family tools through one generic format;
- backfill historical evidence with semantics it never recorded;
- delete historical evidence merely to reduce documentation counts;
- equate synthetic challenge prevalence with production prevalence;
- promote a new research framework without a real consumer;
- recurse indefinitely into research about research.

# Part XI - First implementation tranche recommendation

A future implementation session should begin with a bounded tranche rather than attempting the full plan.

Recommended first tranche:

1. add the research-system extension gate and decision-sufficiency/inquiry-completeness distinction to the operating model;
2. generate the architecture inventory from existing registries/tools;
3. perform the identity/serialization audit and add the Lane A regressions;
4. classify recent validator/control-plane failures into constructor-fix versus consumer/context-validation classes and fix obvious constructor-owned cases;
5. implement one tiny end-to-end research-transaction fixture;
6. audit expensive workflows for recoverable recombination semantics;
7. run the question/premise/capability/MO/queue consistency audit;
8. run the recent-plan lifecycle audit;
9. produce the first bounded MO-007 attention-topology/provenance report over recent research activity using only recoverable existing metadata;
10. apply the decomposed answerability model to a small sample of high-value active/deferred questions and report which gaps are evidence deficits, measurement deficits or ontology escapes;
11. inspect one cluster of clean negative results for a shared untested architectural/representational assumption;
12. report which proposed later phases are already fully served by existing infrastructure and delete/merge those plan items rather than implementing them.

The first tranche should answer three meta-questions before more reflexivity infrastructure is built:

1. **Is research attention measurably concentrated in ways not explained by current solver value?**
2. **Are high-value questions being neglected primarily because they are poorly answerable with the present research substrate?**
3. **Do multiple negative lines expose shared assumptions that the current premise map/queue is not treating as questions?**

Only positive evidence on those questions should earn the corresponding heavier portfolio/reflexivity mechanisms.

This ordering intentionally makes the plan self-correcting: the first implementation work should reduce control-plane risk, measure the suspected research-portfolio pathology, and remove recommendations already satisfied by the repo before the plan is allowed to expand the architecture it is meant to simplify.

# Solver research-system cross-integration audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-21 — cross-read of the September 17-21 premise/measurement, population-lineage, relation/dossier, failure/search-loss, shared-domain, capability-invention, response-guided, information-retention and computational-work-elimination systems, including open PRs #1947-#1949.
> **Decision:** the research system is locally much stronger than it was several days ago, but several newest layers sit beside rather than fully on top of the shared semantic spine. Repair a small number of cross-system joins and lifecycle edges before adding another broad research abstraction.
> **Remaining gate:** reconcile the stale question transitions, then implement the smallest read-only/metadata bridges in the order recommended below; do not create a warehouse, universal study object, or generic transition engine.
>
> **Evidence role:** forensic
> **Inference scope:** solver-research control plane, evidence plumbing, research metadata and recent development-only experiment surfaces; no solver-efficacy claim
> **Proposal provenance:** cross-system integration audit prompted by recent rapid expansion of solver research infrastructure

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-21","decision":"Recent research-system components are individually strong but several newest capability, response-guided and bespoke-probe surfaces bypass shared relation, lineage, resolution or closeout semantics; repair those joins before adding another broad abstraction.","remainingGate":"First reconcile stale question authority, then add capability-demand row relations, shared diagnosis/resolution linkage, response-guided lineage, thin bespoke-probe provenance, and successor-aware closeout edges where the concrete seams below justify them.","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"research-system changes and current/open integration work from 2026-09-17 through 2026-09-21","inferenceScope":"research-system architecture and cross-system coherence only"},"claimRefs":[],"sourceArtifacts":["docs/solver-research-operating-model.md","docs/solver-research-question-relations.json","docs/solver-research-data-assets.json","docs/solver-research-population-family-integration-plan.md","docs/solver-capability-invention-program.md","docs/solver-response-guided-capability-invention.md","docs/solver-search-loss-evidence-implementation-plan.md","scripts/research-relations-lib.mjs","scripts/research-question-dossier-lib.mjs","scripts/research-system-inventory-lib.mjs","scripts/research-resolution-envelope-lib.mjs","scripts/research-unit-topology-lib.mjs","scripts/solver-research-block-lineage.mjs","scripts/solver-experiment-contract.mjs","scripts/investigation-report-metadata.mjs","scripts/capability-invention-demand.mjs","scripts/freeze-response-guided-contrasts.mjs"],"prospective":{"expectation":"most recent improvements would share the same semantic spine, with remaining problems dominated by stale documentation","surprise":"the largest gaps are not missing primitives but newest systems bypassing primitives that already exist, especially capability-demand rows, response-guided populations, bespoke probe envelopes and structured closeout transitions","anomaly":null}} -->

## Executive finding

The last several days produced a real research architecture rather than a pile of scripts.

The repository now has strong shared owners for semantic identity, population identity, observation integrity, unit topology, evidence applicability, question contracts, research blocks/consumption, experiment contracts, closeout metadata, resolution/observability, data assets, research relations/dossiers, and capability evidence. The recent failure/search-loss and protocol-contraction work also removed several compatibility ambiguities.

The main weakness is now **cross-system adoption lag**.

Several systems created after or alongside those primitives correctly preserve some of the same ideas, but do so in local fields and prose rather than participating in the common relation/lineage/resolution/lifecycle machinery. This is not a call for another grand abstraction. In most cases the missing repair is a read-only relation, an envelope field, or one shared helper.

The most important theme is:

> **Do not invent another semantic owner. Make the newest research surfaces legible to the owners that already exist.**

## Scope and method

This audit followed the main research-system changes from September 17 through September 21:

- premise map, measurement opportunities and replication;
- population/family blocks, consumption lineage and generation integration;
- research relations, dossiers, acquisition preflight and integration audit;
- decision observation and work accounting;
- search-loss and compact failure-response evidence;
- hint/failure cross-pollination;
- consolidation, closeout metadata, portfolio retrospective and prospective rigor;
- shared research-domain primitives and adjacent audits;
- capability-invention demand;
- parity/small-exact/response-guided capability work;
- protocol/schema contraction;
- information-retention work in open PR #1948;
- computational-work-elimination work in open PR #1947;
- handoff reconciliation in open PR #1949.

For each seam the question was not merely whether a feature exists. It was whether the downstream system consumes the strongest semantics that upstream systems now preserve.

## Finding 1 — capability-invention demand is catalogued, but its rows are outside the general relation spine

**Severity:** high  
**Type:** missing composition

data/stress/capability-invention-demand.json is a first-class asset and has a validator/query command. The asset registry correctly lists its join keys and related assets.

But scripts/research-relations-lib.mjs has no capabilityDemands relation. research-question-dossier-lib.mjs, research-system-inventory-lib.mjs and research-status-index-lib.mjs likewise do not reason over individual capability-demand rows.

That means the general research system can discover **that the asset exists**, but cannot natively answer questions such as:

- which capability-demand rows support this question?
- which first-loss classes recur across independent parents?
- which demands are HARVEST versus EXTENSION/INVENTION?
- which demand rows cite a report that was later superseded?
- which atlas dimensions are represented in the current acquisition portfolio?
- which question or premise consumed a particular demand?

This is exactly the kind of compositional knowledge the relation/dossier work was built to expose.

### Smallest repair

Add a read-only capabilityDemands relation to research-relations-lib.mjs using the existing validator as the authority. Expose it through the dossier/inventory views.

Do **not** create a second demand database or move priority into the relation model.

Useful row joins already exist:

- subject.levelId / subject.parentId;
- evidenceRefs;
- firstLossClass;
- atlasDimensions;
- workClass.

A later enhancement may add direct question/premise refs, but the read-only relation is useful before schema expansion.

## Finding 2 — capability demand re-created a weaker notion of “resolved”

**Severity:** high  
**Type:** semantic duplication / missed methodological propagation

The capability-demand schema defines:

- diagnosisStatus = resolved | partial | unresolved;
- recurrenceScope;
- evidenceStrength.

Separately, the consolidation work created research-resolution-envelope-lib.mjs, with explicit axes for:

- eligibility;
- opportunity;
- reach;
- participation;
- measurement support;
- fidelity;
- coverage;
- censoring.

The historical-negative retrospective then demonstrated why this matters: a large apparently clean negative can be unusable for the current claim because fidelity is wrong even when coverage and dose look excellent.

Capability demand currently has no machine link to that resolution semantics. A row may say resolved without preserving **which observability axes were actually resolved** or what rival explanation was eliminated.

That is especially risky because capability invention is precisely where false “missing capability” diagnoses are expensive.

### Smallest repair

Do not replace the capability register or copy all eight axes into every row.

Instead, allow a demand row or its owning analysis to carry one of:

- an inline shared resolution envelope; or
- a durable resolutionRef to an artifact containing one.

Then define diagnosisStatus as the capability-program disposition, while the shared resolution envelope remains the authority for whether the underlying discriminator was observable/resolution-ready.

For new INVENTION/EXTENSION nominations, require a resolution-ready or explicitly blocked envelope before promoting the demand into a live question.

## Finding 3 — response-guided contrast populations use a parallel lineage dialect

**Severity:** high  
**Type:** population/selection lineage disconnect

scripts/freeze-response-guided-contrasts.mjs is careful in several important ways. It records:

- exact level identities;
- source path and SHA-256;
- evidence role;
- an explicit prohibition on runtime historical-ID routing;
- the exact outcome-selected contrast population.

But it does so in a private artifact shape:

- no researchBlock;
- no canonical populationIdentity;
- no block consumption events;
- no question lineage;
- no standard enrichment envelope.

This is a particularly awkward place to bypass the population-lineage work because response-guided cohorts are **deliberately outcome-selected development populations**. Selection history is not incidental here. It is the central evidence limitation.

### Smallest repair

Have the freezer emit or wrap a normal research artifact envelope:

- frozen source-specific block/population identity;
- evidence role development;
- explicit selection/conditioning event for technique discordance;
- independent unit parent level;
- source artifact hash;
- owning question at creation, followed by consumption links for sibling analyses.

The existing response-guided fields can remain as payload. The shared block should own lineage rather than replacing the specialist contrast schema.

This also lets research:relations and research:dossier discover the cohort without special lexical knowledge.

## Finding 4 — newest bespoke empirical probes bypass the experiment/evidence spine

**Severity:** high  
**Type:** provenance / reconstructability / integrity disconnect

Several valuable recent tools are intentionally bespoke rather than generic sweeps. That is good. The problem is that “bespoke” has also meant “outside the shared experiment/evidence envelope.”

Examples:

- scripts/stress/cut-bridge-incidence.mjs;
- open-PR #1947 scripts/connectivity-certificate-shadow-audit.mjs;
- open-PR #1947 scripts/stress/compare-paired-beam-width-frontiers.mjs.

These scripts preserve useful local fields such as evidence role, parent identity, work spent and frozen level lists. But they do not consistently carry:

- experiment/protocol identity;
- immutable solver ref;
- canonical population integrity;
- shared research block/consumption lineage;
- shared unit topology;
- resolution envelope;
- standard durable-evidence linkage.

The information-retention audit in #1948 correctly argues against retaining everything. That does not imply decision-bearing probe outputs should be hard to reconstruct. These probes advance or close research gates and therefore meet the audit's own “materially needed for durable decision” test.

### Smallest repair

Do not force these tools through the solver-sweep report schema.

Introduce or reuse a **thin research-probe envelope** composed from existing owners:

- question ID;
- population identity / research block ref;
- evidence role;
- independent/dependence unit;
- solver ref;
- protocol/config identity where applicable;
- source artifact hashes;
- population integrity;
- selection/conditioning;
- optional resolution envelope.

The specialist payload stays specialist.

The important rule is that a new one-shot research runner should not have to reinvent provenance.

## Finding 5 — structured closeout adoption is inconsistent across simultaneous work

**Severity:** high  
**Type:** lifecycle/inventory disconnect

The information-retention reports in open PR #1948 use pathfinder.research-closeout/v1 correctly.

Several concluded computational-work-elimination reports in open PR #1947 do not, including:

- 2026-09-21-computational-work-elimination-reasoning-seam-map-001.md;
- 2026-09-21-computational-work-elimination-reusable-failure-output-001.md;
- 2026-09-21-computational-work-elimination-wait-less-disposition-001.md;
- later connectivity economics/disposition reports.

They have excellent human headers, but without structured closeouts the inventory/status machinery cannot consume the richer scope, source, question, premise and prospective fields.

This is not merely stylistic. One of the consolidation program's goals was to stop downstream tooling from scraping decision prose.

### Smallest repair

Before #1947 closes, add closeout capsules to its concluded reports that materially affect future routing. Active preflights need not pretend to be concluded.

No new schema is needed for this part.

## Finding 6 — transition coherence drift has already recurred after the transition audit

**Severity:** high  
**Type:** stale authority / half-applied transition

The September 20 transition-coherence audit correctly identified gate drift as more common than top-level status drift.

It has already recurred.

### WS2-PARITY-RESPONSE-SIGNATURE

The current question registry still says:

> “Analysis queued.”

But the September 21 response-guided report has already executed the static parity analysis and the canonical workstream says the richer static portal decomposition is **closed in tested form** and the next useful sibling requires a different parity mechanism / operational evidence.

### WS2-CUT-BALANCE-PROJECTION

The question registry says:

> “Next gate is sampled production-state incidence.”

That gate already happened. The Stage-B result found BC1 conflicts on 22/24 eligible parents, and the canonical workstream now says **BC1 CONSUMER EARNED** with a production-inert safety/economics next gate.

### WS1-REMAINING-LENGTH-ALLOCATION

The question's primary result correctly says independent transfer is complete, but one constrains sentence still says:

> “The next test should be one independent shared-budget ... population”

and acquisitionNeed still says fresh-independent-parents.

The transfer it asks for has already happened.

Open PR #1949 improves workstream/future-work visibility but does not currently repair this question-registry drift.

### Smallest repair

Reconcile those question rows immediately.

Then strengthen the integration audit so a question-linked concluded report can expose that the registry's remaining gate/result predates a later structured successor.

This leads directly to Finding 7.

## Finding 7 — authored successor identity has probably crossed its promotion threshold

**Severity:** medium-high  
**Type:** lifecycle composition

The transition-coherence audit deliberately did **not** build a generic transition engine. It suggested a narrower future check only after real authored successor identities existed.

The closeout capsule still has only prose remainingGate. It has no structured successor question or successor artifact refs.

Since that audit:

- several rapid research chains have produced parent -> successor -> result transitions;
- stale parent-plan gates had to be repaired in #1949;
- the question registry now contains fresh examples of stale “next gate” prose after the successor ran;
- open #1947 contains multiple sequentially numbered connectivity reports with explicit parent/successor semantics.

That looks like sufficient recurrence to earn the narrow mechanism the prior audit described.

### Smallest repair

Extend closeout metadata with optional:

- successorQuestions;
- successorArtifacts.

Use existing repository-ref and question-ID validators.

Then add one bounded integration check:

> if a report is concluded and names a structured successor that is itself concluded or represented by later evidence, surface stale parent remainingGate/question-state context for reconciliation.

Do not build a universal state machine.

## Finding 8 — proposal-method provenance was applied selectively

**Severity:** medium  
**Type:** methodological propagation

The proposal-method calibration audit concluded that a machine enum was not yet earned, but established a prospective human-readable Proposal provenance line for newly nominated questions/candidates whose origin is genuinely known before outcome.

The September 21 response-guided nomination report uses it correctly.

The initial capability-invention seed census does not, even though capability invention is itself now a first-class proposal channel and the report creates/organizes future acquisition candidates.

Several new computational-work and exact-projection reports likewise omit it when their origin is in fact known.

This does not justify a schema or backfill. It does mean the prospective sample needed to ever calibrate proposal methods will remain starved unless new nomination surfaces remember the convention.

### Smallest repair

Add the line to the lightweight report/preflight checklist for **new nominations**, not every report.

Use multiple labels when origins are genuinely mixed. Keep it prose until the prior promotion threshold is met.

## Finding 9 — #1948's action/config identity repair needs an explicit downstream acceptance rule

**Severity:** medium  
**Type:** cross-PR identity propagation

Open PR #1948 correctly separates action identity from configuration identity and introduces a shared historical read-time view rather than rewriting frozen evidence.

Its changed consumers cover the current failure-response query, novelty, purpose and hint/failure joins.

Capability invention explicitly intends to sample future first-loss demand from compact failure response, but its current register is static/manual and its validator does not consume the shared identity view.

Similarly, response-guided and technique-relative analyses operate on technique/config identities from older artifacts.

There is no current bug proven here, but there is a clear integration requirement:

> any future automatic failure-response -> capability-demand or failure-response -> response-guided join must consume the shared identity view from #1948, never re-infer action/config semantics locally.

Record this as a contract now so the next automation does not recreate the defect.

## Finding 10 — the asset registry has caught up faster than the relationship graph

**Severity:** medium  
**Type:** weak semantic join

The asset registry now includes capability-invention-demand with useful relatedAssets and join keys.

That is good catalogue-level discovery. But the explicit relationships layer has not yet grown a bounded relationship describing how:

- compact failure response;
- exact/reference evidence;
- technique capability;
- capability demand

compose to justify a first-loss/capability nomination.

This is less urgent than Finding 1 because the register is already discoverable as an asset. But once demand rows become a relation, one explicit relationship would make the evidence boundary machine-readable and prevent a level-ID-only join from being mistaken for causal support.

The relationship should state the same constraints the program already knows:

- protocol/config comparability;
- parent/dependence unit;
- evidence-role/selection limitations;
- UNKNOWN preservation;
- no production routing from historical identity.

## What is working well

The audit did **not** find a need for another broad framework.

Several recent systems are communicating correctly:

1. **Measurement opportunities -> question contracts.** MOs are already first-class in research relations and question contracts.
2. **Population blocks -> durable evidence.** Experiment persistence can carry question/block lineage into durable evidence bundles.
3. **Failure evidence -> hint/process joins.** The hint/failure work has unusually explicit protocol/config/solver identity and applicability boundaries.
4. **Shared domain primitives.** Population identity, observation integrity, semantic identity, evidence applicability and unit-topology owners are appropriately narrow.
5. **Information-retention work.** #1948 is using the closeout system, preserves historical evidence rather than rewriting it, and rejects full compact persistence on measured economics rather than instinct.
6. **Naming cleanup.** The capability-memory -> capability-evidence rename improved semantics without rewriting frozen historical artifact identities.
7. **Level-blindness discipline.** None of the reviewed research systems attempts to turn historical outcome/identity into a production routing feature.
8. **No warehouse pressure.** The system still favors read-time joins and source-owned artifacts over central duplication.

The central lesson is therefore not “consolidate harder.” It is **make new specialist systems publish into the existing thin common spine**.

## Recommended repair order

### P0 — reconcile current authority drift

Repair the three demonstrated question rows:

1. WS2-PARITY-RESPONSE-SIGNATURE;
2. WS2-CUT-BALANCE-PROJECTION;
3. WS1-REMAINING-LENGTH-ALLOCATION.

Also reconcile any equivalent changes introduced when #1947-#1949 merge.

This is the cheapest repair and prevents agents from following already-completed gates.

### P1 — make capability demand a first-class read-only relation

Add capabilityDemands to:

- research-relations-lib.mjs;
- dossier rendering/query;
- inventory/brief where useful;
- integration tests.

Keep data/stress/capability-invention-demand.json authoritative.

### P2 — connect capability diagnosis to shared resolution semantics

Add a resolutionRef or equivalent composition point. Do not duplicate the eight-axis envelope into a second schema.

Use this especially for EXTENSION/INVENTION promotion decisions.

### P3 — put response-guided populations on research-block lineage

Wrap the existing contrast payload in the normal artifact/block envelope, including explicit outcome-selection conditioning and consumption links.

Do not alter its development-only interpretation.

### P4 — give bespoke probes a thin common provenance envelope

Start with BC1 and connectivity-certificate probes because they are current, decision-bearing, and already have frozen populations.

Reuse existing primitives instead of forcing them into sweep schema.

### P5 — finish closeout adoption and add successor refs

First add current v1 closeouts to concluded #1947 reports.

Then, because transition drift has now recurred, extend the closeout contract narrowly with optional structured successor question/artifact refs and one integration diagnostic.

### P6 — preserve proposal provenance and identity contracts prospectively

- add Proposal provenance to nomination/report checklists;
- require future failure-response -> capability-demand automation to use #1948's shared action/config identity view.

## Explicit non-goals

This audit does **not** recommend:

- a research database or warehouse;
- a universal Study object;
- one schema for every research artifact;
- a generic state-transition engine;
- a global proposal-method enum;
- retrofitting every historical report;
- storing every attempt or raw trace;
- making research metadata available to cold production routing;
- replacing specialist exact/search-loss/failure schemas with one common payload.

The common layer should remain narrow:

> identity, lineage, observability, independence, applicability, lifecycle and provenance.

Specialist science should remain specialist.

## Bottom line

The recent research-system work largely succeeded. The new failure mode is a sign of maturity: useful specialist systems are now being created faster than the common spine is being adopted.

The most consequential disconnects are not missing algorithms. They are:

1. capability-demand rows cannot yet participate in the general research graph;
2. capability diagnosis does not inherit the shared resolution semantics;
3. response-guided cohorts do not inherit shared population/consumption lineage;
4. bespoke decision-bearing probes do not inherit shared provenance/integrity envelopes;
5. closeout/successor semantics are not consistently consumed;
6. question authority is already drifting behind completed results again.

Repair those seams, then return attention to solver questions. Another broad consolidation project is not earned.

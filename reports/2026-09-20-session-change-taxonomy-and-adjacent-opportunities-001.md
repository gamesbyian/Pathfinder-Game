# Session change taxonomy and adjacent-opportunity audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — all 298 commits from PR #1923 were walked from base `26ec521fadfe679137382543993d86b8fe414323` to head `b83868991bf61ad3751293a3fa30102ca582ba20`, then cross-checked against the base→head file delta (96 changed files) and the whole-session local-optima retrospective.
> **Decision:** classify the session by concrete change type, not only by conceptual lens; use each class to generate adjacent audits, while distinguishing immediate high-yield checks from already-saturated or intentionally claim-relative areas.
> **Remaining gate:** none for the bounded taxonomy-driven audit program. The full adjacent-audit sequence is closed in `reports/2026-09-20-session-change-taxonomy-adjacent-audits-closeout-001.md`; reopen individual categories only on their recorded concrete triggers.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-20","decision":"use the complete 298-commit change taxonomy to drive adjacent-category audits rather than relying on the remembered conceptual arc","remainingGate":"none for the bounded taxonomy-driven audit program; reopen individual categories only on their recorded concrete triggers","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"all commits in PR 1923 after base 26ec521 plus base-to-head file delta","inferenceScope":"research-system architecture and hardening opportunities; not solver-efficacy evidence"},"claimRefs":[],"sourceArtifacts":["reports/2026-09-20-research-session-local-optima-retrospective-001.md","reports/2026-09-20-distributed-knowledge-hardening-audit-001.md","reports/2026-09-19-research-domain-bones-audit-001.md","reports/2026-09-20-session-change-taxonomy-adjacent-audits-closeout-001.md"],"prospective":{"expectation":"commit-level reconstruction will expose categories underrepresented in the lens-based retrospective","surprise":"a large fraction of the work was contract transport, authority transition, parser/persistence correctness, test semantics, and context-routing rather than new domain concepts","anomaly":null}} -->

## Method

This audit does not summarize the session by remembered themes.

It reconstructs the session from:

1. **298 commits** on PR #1923 after base `26ec521...`;
2. the **96-file base→head delta**;
3. dated audit reports and structured closeouts;
4. the later local-optima retrospective, used only as a cross-check.

A category is included when the session changed, added, replaced, tightened, demoted, or made explicit something in that class.

For each category below:

- **Changed this session** enumerates the concrete change family;
- **Comparable things to inspect** identifies same-category or adjacent-category surfaces elsewhere;
- **Priority** is one of:
  - **HIGH** — concrete repeated risk / likely correctness or capability benefit;
  - **MEDIUM** — plausible but should be evidence-triggered;
  - **LOW / trigger-only** — already largely saturated or likely to become framework-for-framework's-sake.

---

# A. Shared semantic/domain primitives

## A1. Semantic identity and canonical hashing

### Changed this session

Added `research-semantic-identity-lib.mjs` and moved generic semantic hashing out of solver-experiment ownership.

Consumers migrated included:

- experiment contract;
- research-block lineage;
- WS2 analysis contracts;
- research relations;
- claim identity.

The session also separated **hash mechanism** from **hash domain**: the shared owner canonicalizes and hashes, while specialist contracts decide what fields belong in identity.

### Comparable things to inspect

**HIGH**
- Any remaining module importing a large specialist contract only to obtain a hash/canonicalizer.
- Any local SHA-256 / stable-stringify implementation in research tooling.
- Any persisted identity whose hash domain includes incidental paths/timestamps/order where semantics should be content-based.

**MEDIUM**
- Identity equivalence across historical compatibility readers.

**Do not unify**
- Order-sensitive identities where sequence is scientific content.

---

## A2. Claim identity, dependency and bounded reverse invalidation

### Changed this session

Added `research-claim-lib.mjs`.

Moved generic claim semantics out of WS2-specific claim code:

- content-derived claim identity;
- material dependency edges;
- bounded reverse invalidation;
- stable derivation relations.

WS2 retained specialist population, routing, instrument, limitation, and consequence semantics.

### Comparable things to inspect

**HIGH**
- Other persisted scientific conclusions that have upstream evidence/analysis identities but no explicit material-dependency edge.
- Places where superseding evidence should force review but today only a human notices.

**MEDIUM**
- Promotion decisions and closeouts that reference reports but not claim identities.

**Trigger-only**
- Global claim graph / universal claim schema. Not earned until durable claim capsules become common.

---

## A3. Shared research-question semantic contract

### Changed this session

Added `research-question-contract-lib.mjs`.

Unified:

- `liveAmbiguity`;
- `discriminatingObservable`;
- `outcomeInterpretation`;
- `measurementOpportunity` syntax;
- optional vs required stable question IDs across old/new contract families.

### Comparable things to inspect

**HIGH**
- Other experiment/preflight formats that restate ambiguity/discriminator/outcome semantics locally.
- Any question-adjacent schema that validates `MO-NNN` independently.

**MEDIUM**
- Whether question contracts need a future rival-set scope/provenance field once two live consumers require it.

**Do not unify**
- Historical manifests that intentionally lack stable question IDs.

---

## A4. Evidence applicability lattice

### Changed this session

Added `research-evidence-applicability-lib.mjs`.

Shared exact lattice:

- admissible;
- context-bound;
- inadmissible.

Hint provenance and failure evidence kept different purpose taxonomies/classifiers.

### Comparable things to inspect

**HIGH**
- Any third evidence family that independently emits the same applicability outcomes.
- Places that collapse `context-bound` into either fully admissible or inadmissible.

**Do not unify**
- Instrument support (`SUPPORTED/UNKNOWN/UNSUPPORTED`);
- purpose taxonomies;
- evidence-specific classifiers.

---

## A5. Population identity/canonicalization

### Changed this session

Added `research-population-identity-lib.mjs`.

Centralized:

- one-identity-per-line parsing;
- canonical unique identity sets;
- duplicate handling;
- population semantic hashes;
- identity codec inclusion in hash domain;
- delimiter-safe identity transport.

Migrated generic sweep validation, combiner, CP-SAT reference integrity and publisher consumers.

### Comparable things to inspect

**HIGH**
- Every persisted population transport that still uses delimiter-splitting rather than one-identity-per-line / structured identity.
- Any population hash that omits encoding/codec/source basis.
- Any join keyed only by display IDs where content identity can drift.

**MEDIUM**
- Historical readers that still accept comma/colon compound IDs.

**Do not unify**
- research-block parent-id + content-identity seals with generic logical population IDs.

---

## A6. Observation outcome / population integrity

### Changed this session

Added `research-observation-integrity-lib.mjs`.

Centralized:

- observation identity extraction;
- generic solver outcome classes;
- expected-versus-observed integrity;
- structural coverage vs decision-valid completeness.

Failure response, sweep validation and publication moved to this owner.

### Comparable things to inspect

**HIGH**
- Other reducers that infer completeness from row counts alone.
- Tools that treat deadline/work/node truncation as ordinary negative outcome.
- Any duplicated generic solver-row classifier.

**Do not unify**
- CP-SAT LIVE/DEAD/referee/correctness taxonomy;
- specialist classifications with different scientific semantics.

---

## A7. Resolution envelope / observability readiness

### Changed this session

Added `research-resolution-envelope-lib.mjs`.

Axes evolved through live use to include:

- eligibility;
- opportunity;
- reach;
- participation;
- measurement support;
- fidelity/comparability;
- coverage;
- censoring.

Added:

- required-axis declaration;
- axis states;
- blocker projection;
- default remediation classes;
- tamper-resistant recomputation of blockers/readiness;
- `resolution-ready | observability-blocked`.

Wired two live consumers:

- failure-response reconnaissance;
- reserve-starvation recurrence probe.

Specialist decisions became hard-gated on resolution readiness.

### Comparable things to inspect

**HIGH**
- Other decision-bearing negative/null reducers that can conclude while one of these dimensions is unknown.
- Experiments whose readiness logic does not distinguish fidelity from participation.
- Results where zero work / no reach / unsupported measurement can masquerade as negative evidence.

**MEDIUM**
- Instrument reactivity/observer effects as a future axis, but only after a second live consumer needs machine blocking.

---

## A8. Independence / causal-ancestry vector

### Changed this session

Added `research-independence-vector-lib.mjs`.

Canonical dimensions include:

- sample/data;
- parent/family;
- source construction;
- decision seam;
- instrument implementation;
- analysis method;
- analyst/model;
- framing/prompt;
- authority-context exposure;
- ontology/vocabulary;
- critical shared code.

Two live consumers:

- failure-response reconnaissance;
- reserve-starvation sample design.

No scalar confidence score.

### Comparable things to inspect

**HIGH**
- Decision-bearing reports using raw N / row count where effective independent units are clustered.
- Multiple artifacts treated as independent although they share source experiment, oracle, code, or population.
- Confirmation reports that say “independent” without naming the dimensions.

**MEDIUM**
- Adaptive dependence over time: later samples/instruments/questions selected because of earlier results.

**Do not build**
- aggregate independence/confidence score.

---

## A9. Evaluation evidence-role vocabulary

### Changed this session

Added `research-evaluation-evidence-role-lib.mjs`.

Centralized:

- development;
- confirmation;
- transfer.

Migrated:

- targeted generator;
- random generator;
- topology generator;
- research-generation dispatcher;
- research-block lineage;
- integration audit.

Added ownership guard against local redeclaration.

### Comparable things to inspect

**HIGH**
- Other small categorical vocabularies duplicated across 3+ producer/consumer boundaries.
- Tests copying enum literals rather than asking the owner.

**Do not unify**
- broader report/closeout roles such as `forensic`.

---

# B. Authority ownership and current-state semantics

## B1. Structured report closeout authority

### Changed this session

Changed status-index semantics so structured closeout capsules own machine state for new reports.

Legacy visible Markdown status blocks remain:

- human mirrors;
- compatibility fallback.

Added agreement checks for canonical mirrored fields without requiring exact prose equality for human decision/gate paraphrases.

Added:

- metadata source identification;
- source artifact propagation;
- structured-closeout indexing tests.

### Comparable things to inspect

**HIGH**
- Other machine consumers that still parse visible report prose for current status/decision/gate despite closeouts.
- Report generators producing structured closeouts but downstream indexes ignoring them.

**MEDIUM**
- Require structured closeout for future decision-bearing report classes where currently optional.

**Do not do**
- mass migrate historical reports merely for uniformity.

---

## B2. Workstream execution state

### Changed this session

Made workstream execution state explicit and stopped inferring it from prose/context.

Downstream inventory/integration logic now consumes explicit state.

Legacy prose normalization was quarantined to fallback.

### Comparable things to inspect

**HIGH**
- Any workflow/queue reader still using status words from human descriptions.
- Other control-plane tables where “active/deferred/closed” is inferred from section headings or prose.

---

## B3. Experiment promotion state

### Changed this session

Made opt-in/default-off promotion state explicit in the ledger.

Downstream code reads structured promotion state rather than prose keywords.

Integration validation now requires promotion state for default-off experiments.

### Comparable things to inspect

**HIGH**
- Other rollout/default polarity ledgers where state is encoded only in prose.
- Runtime flags whose docs imply promoted/default-on but no structured disposition exists.

---

## B4. Research question lifecycle vocabulary

### Changed this session

Made canonical state vocabulary explicit.

Added lifecycle classifier rather than prefix inference.

Preserved query-status compatibility while separating state spelling from lifecycle class.

Later distributed-knowledge audit caught:

- stale `active-diagnostic` prose;
- question-authority audit using `startsWith('active')`.

Both were repaired.

Human state-semantics doc is now checked against machine vocabulary.

### Comparable things to inspect

**HIGH**
- Any other lifecycle consumer inferring meaning from token prefix/suffix.
- Human docs that enumerate canonical states but are not checked against owner.

**MEDIUM**
- lifecycle transition legality, not just vocabulary, once two systems need the same transition checker.

---

## B5. Execution priority vs scientific question lifecycle

### Changed this session

Made queue-to-question relationship explicit.

Added relation classes such as:

- active-question;
- reopen-trigger-gate;
- terminal-question;
- missing-question.

Allowed active execution to service a deferred-reopen question when current work is satisfying its reopen trigger.

Added symmetric validation:

- active queue may not point to unknown question;
- active queue may not point to terminal question.

### Comparable things to inspect

**HIGH**
- Other orthogonal state systems incorrectly collapsed into one “status.”
- Future work / queue entries referencing question IDs without lifecycle-aware relation checks.

---

## B6. Production realization / runtime default authority

### Changed this session

Initially considered a `ChangeRealization` object, then rejected it after deeper audit.

Found existing organ already includes:

- runtime default-polarity owner;
- default config equivalence;
- production-shaped regression tests;
- docs coverage for default-off dispositions.

Then added narrower provenance:

- promotion decision-evidence edge;
- promoted mechanism relation;
- runtime polarity conformance;
- evidence-to-runtime provenance ownership.

### Comparable things to inspect

**HIGH**
- Other promoted mechanisms lacking primary decision-evidence reference where retained evidence exists.
- Runtime defaults whose historical promotion evidence has become untraceable.

**Trigger-only**
- realization registry, supersession/qualification object only if multiple real consumers need it.

---

# C. Relation graph and provenance hardening

## C1. Stable authored relations vs lexical joins

### Changed this session

Distinguished:

- stable authored joins;
- lexical discovery joins.

Question dossiers now prefer stable relations.

Report hyperlinks are discovery-only, not authority.

### Comparable things to inspect

**HIGH**
- Any scientific join inferred from filename similarity, sibling directory, matching prose title, or shared token.
- Tools that still treat Markdown links as authoritative scientific relations.

---

## C2. Durable evidence bundle → manifest edge

### Changed this session

Added explicit manifest edge to retained evidence bundle.

Resolution no longer depends on sibling-file convention.

### Comparable things to inspect

**HIGH**
- Other bundles where “manifest”, “result”, “contract”, “analysis”, or “claim” are paired by co-location/naming rather than authored identity.

---

## C3. Question answeredBy / constrains typing

### Changed this session

Typed/deduped question answer edges.

Separated answer vs constraint relations in dossiers.

Cross-checked question answer edges against structured report joins.

Rejected duplicate/self edges.

### Comparable things to inspect

**HIGH**
- Other relation arrays with heterogeneous semantics in one untyped list.
- Supersession/calibration/constraint relations lacking direction or type.

---

## C4. Deferred-question acquisition relations

### Changed this session

Added authored acquisition needs to deferred questions.

Required explicit acquisition relation for deferred questions.

Exposed basis/provenance in:

- dossiers;
- preflight CLI;
- research brief.

### Comparable things to inspect

**HIGH**
- Active or closed-tested-form questions that repeatedly require the same missing acquisition class but still encode it in prose.
- Acquisition routes whose source recommendation is inferred rather than authored.

**MEDIUM**
- Claim-side support requirements for transport decisions once live use demands it.

---

## C5. Research-block consumption lineage

### Changed this session

Validated consumption lineage edges.

Added integrity tests and integration-audit coverage.

### Comparable things to inspect

**HIGH**
- Other selection/tuning/confirmation histories where consumption affects independence but is not machine-recorded.
- Derived datasets created from prior research blocks without consumption provenance.

---

## C6. Reciprocal calibration edges

### Changed this session

Restored and required reciprocal calibration relation.

Added integrity test.

### Comparable things to inspect

**MEDIUM**
- Other semantically reciprocal relations represented one-way only where downstream interpretation depends on both sides agreeing.
- Paired instrument/reference calibrations.

---

## C7. Authored asset/resource cross-registry edges

### Changed this session

Validated:

- asset graph edges;
- resource-contract cross-registry references;
- owning resource validators.

Exposed relation coverage metrics.

### Comparable things to inspect

**HIGH**
- Registries that reference file-like paths but mix paths with prose.
- Cross-registry foreign keys not checked by owning validator.
- Asset IDs reused with different semantics.

---

## C8. Promotion decision evidence → runtime mechanism

### Changed this session

Added explicit promotion decision-evidence refs and promoted-mechanism relation.

Checked against runtime polarity.

### Comparable things to inspect

**HIGH**
- Non-promotion implementation choices (scheduler policy, budget allocation defaults, generator defaults) whose current behavior is decision-bearing but provenance is only historical prose.

---

# D. Identity encoding, persisted transport and path independence

## D1. Delimiter-safe population identities

### Changed this session

Fixed comma-bearing identity corruption in:

- population combiner;
- timeout recovery;
- gap-fill selector;
- generic sweep integrity.

Codified one-identity-per-line rule.

### Comparable things to inspect

**HIGH**
- Every persisted list field using comma/colon/pipe splitting.
- shell/workflow inputs that flatten IDs into delimited strings.
- case IDs composed from multiple semantic fields.

---

## D2. Structured Lane-A case identity

### Changed this session

Preferred structured cut/case source identity over parsing compound case IDs.

Preserved structured case source through exact-reference rows.

Marked old case-id parsing as legacy compatibility.

### Comparable things to inspect

**HIGH**
- Any other “parse meaning back out of display ID” path.
- filenames used as scientific identifiers.

---

## D3. Semantic analysis identity path independence

### Changed this session

WS2 analysis identities became independent of:

- input order;
- file location;
- source-file path.

Added content-level derivation hashes and canonical analysis identity producer.

### Comparable things to inspect

**HIGH**
- Analysis/result identities whose hash includes path, timestamp, run directory, or arbitrary input ordering.
- claims whose identity can change when identical evidence is copied.

---

## D4. Identity codec in hash domain

### Changed this session

Population hash now includes explicit identity codec.

### Comparable things to inspect

**MEDIUM**
- Other hashes where serialization/normalization assumptions are not domain-separated.

---

# E. Schema and contract conformance

## E1. Experiment-result schema audit

### Changed this session

Added emitted-result contract audit.

Made audit schema-aware.

Added full local conformance checks.

Made schema/checker drift fail visibly.

Reconciled maintained publisher with v3 schema.

### Comparable things to inspect

**HIGH**
- Other JSON schemas with handwritten partial validators that can silently lag.
- producer outputs validated only by tests, not contract shape.

---

## E2. Recovery provenance

### Changed this session

Added recovery provenance shape to v3 result schema.

Validated semantics and malformed metadata.

Preserved provenance through publication.

Distinguished acquisition retry vs recombine.

### Comparable things to inspect

**HIGH**
- Any retry/recovery/combine workflow where final artifact does not reveal what was reused vs rerun.
- reports that collapse original and recovered rows without provenance.

---

## E3. Structured closeout codec

### Changed this session

Added closeout capsule codec and first structured closeout.

Fed closeouts into inventory.

Expanded closeout scope/provenance.

### Comparable things to inspect

**HIGH**
- Other report families with machine-relevant decision/scope fields still only in Markdown.
- closeout fields whose semantics have multiple local codecs.

---

## E4. WS2 frozen analysis contract

### Changed this session

Built a rich machine analysis contract around a real vertical slice:

- question identity;
- discriminator;
- target envelope;
- unit topology;
- instrument semantics;
- abstention/support;
- adaptive lineage;
- independence vector;
- selection;
- negative-resolution scope;
- calibration profile;
- live rivals;
- required observability axes;
- resolution interpretation.

Bound analysis identity and claim creation to the frozen contract.

### Comparable things to inspect

**HIGH**
- Another decision-bearing research path whose analysis design is still split across preflight prose, script defaults and report interpretation.
- experiments where thresholds/actions/sample rules are not frozen pre-outcome.

**Trigger-only**
- generic ResearchStudy object.

---

## E5. Reserve-starvation frozen quantitative design

### Changed this session

Moved decision-bearing values into frozen sample artifact:

- reserveNodes;
- totalNodes;
- expectedAction;
- resolutionDesign;
- independenceDesign.

CLI overrides must agree rather than silently mutate design.

### Comparable things to inspect

**HIGH**
- Precommitted experiments whose script defaults still own scientific thresholds, caps, action IDs, sample sizes, or cut points.
- tests copying those numbers/prose rather than reading frozen design.

---

# F. Scientific transaction and end-to-end conformance

## F1. Research transaction fixture

### Changed this session

Extended a cross-system fixture through:

- research block lineage;
- experiment contract;
- population integrity;
- recovery;
- analysis;
- closeout;
- workflow retirement;
- solved controls;
- abstention/dependence;
- supersession/question relation.

### Comparable things to inspect

**HIGH**
- Other vertical paths whose individual schemas pass but no transaction fixture verifies the joins.
- failure-evidence → question → acquisition → experiment → claim transitions.

**MEDIUM**
- second materially different transaction fixture to expose hidden assumptions in the first.

---

## F2. Treatment nonparticipation

### Changed this session

Made treatment nonparticipation fail transaction gate.

### Comparable things to inspect

**HIGH**
- experiments where assignment exists but treatment never actually executes.
- analyses that infer treatment efficacy from config assignment rather than observed participation.

---

# G. Observability, identifiability and negative-evidence semantics

## G1. Observability before negative inference

### Changed this session

Made “null is negative only inside required observability envelope” an operating rule.

Added blocker-specific remediation.

### Comparable things to inspect

**HIGH**
- historical and current negatives with no explicit opportunity/reach/participation/fidelity/censoring proof.

---

## G2. Identifiability and rival discrimination

### Changed this session

Paired:

- live rivals;
- discriminator;
- outcome interpretation;
- observability requirements.

Added second-pass rule that rival sets are decision-bounded, not exhaustive by default.

### Comparable things to inspect

**HIGH**
- reports whose conclusion names one mechanism although measured observable is compatible with several.
- questions with “A vs B” framing but no explicit statement that C/D remain possible.

**MEDIUM**
- proposal/rival-generation provenance.

---

## G3. Historical negative calibration

### Changed this session

Used known 0/483 false-negative case to discover missing fidelity axis.

Reclassified several historical negatives by exact scope.

### Comparable things to inspect

**HIGH**
- historical negatives still materially constraining current queue, especially across solver revisions or changed execution regime.
- old “zero” results reused across history-aware vs level-blind boundaries.

---

## G4. Measurement reactivity

### Changed this session

Later local-optima pass added doctrine requiring parity and bounded overhead/volume evidence when instrumentation touches measured path.

### Comparable things to inspect

**HIGH**
- new rich telemetry/instrumentation with no overhead and outcome-parity calibration.
- observers that alter scheduling, memory, ordering or allocation.

**Trigger-only**
- shared machine reactivity axis after two live resolution consumers need it.

---

# H. Independence, confirmation and generalization

## H1. Causal ancestry rather than row count

### Changed this session

Generalized independence audit.

Found D3 raw candidate count overstated independent support.

Added shared vector and surfaced it in resolution view.

### Comparable things to inspect

**HIGH**
- any report stating N observations without effective cluster count.
- multi-report “triangulation” where channels share exact/reference implementation or source population.

---

## H2. Confirmation boundary audits

### Changed this session

Audited:

- D1 channel disagreement;
- work-ladder confirmation boundary.

Separated fresh sample / independent seam / shared implementation dimensions.

### Comparable things to inspect

**HIGH**
- confirmation workflows that use “independent” as a scalar adjective.
- reused exact/reference oracle across nominally independent confirmations.

---

## H3. Adaptive dependence / selection history

### Changed this session

Research-block consumption lineage and independence doctrine cover parts of adaptive dependence, but no general machine derivation exists.

### Comparable things to inspect

**MEDIUM-HIGH**
- later “confirmation” samples/instruments chosen because of development outcomes.
- candidate families iterated using previous held-out feedback.

---

# I. Transportability and generator support

## I1. Producer-owned topology support envelope

### Changed this session

Added `topology-generation-support-lib.mjs`.

Made current support machine-readable:

- supported mechanics;
- unsupported mechanics;
- grid sizes;
- topology grammar/families.

Producer, dispatcher, acquisition guidance and docs now share/reference same owner.

### Comparable things to inspect

**HIGH**
- targeted/random generator support boundaries still `unknown` in generic helper.
- exact/reference and instrument support envelopes for other acquisition sources.

---

## I2. Multidimensional generation support

### Changed this session

Later follow-up extended support assessment beyond mechanics to:

- grid/scale;
- topology families.

Dispatcher/acquisition logic uses multidimensional helper.

### Comparable things to inspect

**HIGH**
- target overlap / response-region coverage: source may technically support mechanics/topology yet miss target regime.
- generator support for gate count, density, path-length/intersection envelopes where claims depend on them.

**MEDIUM**
- claim-side required support contract once a live transfer decision needs software rejection.

---

# J. Derived views, inventories and front doors

## J1. Research-system inventory

### Changed this session

Inventory grew to cover:

- relation model;
- integration health;
- documentation roles/burden;
- lifecycle candidates;
- workflows and retirement;
- command → workflow topology;
- shared contract owners;
- semantic join coverage;
- authority findings;
- current queue/question relation;
- structured closeouts;
- derived front-door inputs.

Added focused views and compact text brief.

### Comparable things to inspect

**HIGH**
- any inventory metric still functioning as a proxy for semantic membership (the structured-closeout count bug was one example).
- any derived view consumed as if authoritative instead of source-backed.

**MEDIUM**
- stale/orphan diagnostics for newly added registries.

---

## J2. Status index

### Changed this session

Status index became substantially more structured:

- structured closeout precedence;
- legacy fallback;
- explicit metadata source;
- promotion/workstream states;
- source artifacts;
- ledger parsing fixes.

### Comparable things to inspect

**HIGH**
- remaining regex-based readers of machine state.
- status-index outputs materialized and later consumed without source refresh.

---

## J3. Question dossiers

### Changed this session

Dossiers now distinguish:

- stable vs lexical joins;
- authored vs discovered evidence;
- answer vs constraint edges;
- acquisition relation basis.

### Comparable things to inspect

**HIGH**
- other dossiers/crosswalks where discovered links are visually indistinguishable from authored scientific edges.

---

## J4. Documentation cognitive roles and current-reference authority

### Changed this session

Centralized current-reference parsing.

Derived documentation roles:

- canonical-current;
- dated-evidence;
- historical/archive;
- retained-reference/evidence.

Tracked burden/status-claim entropy.

Demoted concluded plans/routes from current references.

### Comparable things to inspect

**HIGH**
- other docs claiming “current” outside indexed current-reference section.
- archived/historical docs still linked by agent routing as mandatory current context.

---

# K. Workflow topology and lifecycle

## K1. Workflow producer/lifecycle inventory

### Changed this session

Derived:

- maintained/retired workflow semantics;
- producer topology;
- research command → workflow consumers;
- retired workflow reappearance diagnostics.

### Comparable things to inspect

**HIGH**
- workflows still producing evidence with no registered consumer/contract.
- scripts reachable from workflows but absent from tooling/inventory.
- retired producers reintroduced under renamed workflow.

---

## K2. Exact-reference recombine provenance

### Changed this session

Published real recombine provenance and pinned workflow behavior.

### Comparable things to inspect

**HIGH**
- sharded/combine workflows where recombined output lacks shard/retry lineage.

---

# L. Documentation and agent-context architecture

## L1. Agent-context budget/routing

### Changed this session

Changed route composition to avoid overloading scheduler-research context.

Later compressed:

- research closure doctrine;
- workstream framing.

Preserved mandatory-context byte budgets.

### Comparable things to inspect

**HIGH**
- other agent routes requiring broad operating-model docs when a narrower authority suffices.
- duplicated mandatory context across router layers.
- route budgets masking architecture bloat rather than information need.

**MEDIUM**
- context content freshness/authority checks, not just byte size.

---

## L2. Tooling catalog / cheap discovery

### Changed this session

Added resolution-view command and routed cheap research discovery through compact brief/inventory.

### Comparable things to inspect

**MEDIUM**
- other high-value research commands that exist but are absent from the catalog/front door.
- catalog entries pointing to wrappers instead of real producers.

---

# M. Parser, regex and textual-structure hardening

## M1. Structured ledger parsing

### Changed this session

Fixed:

- promoted-ledger backtick parsing;
- structured ledger row regex;
- closeout regex braces;
- status Markdown regex;
- documentation index Unicode regex.

### Comparable things to inspect

**HIGH**
- every regex parser over Markdown tables/status blocks that has a structured source alternative.
- path/token extraction regexes with no round-trip test.
- “current” metadata parsed from formatting rather than schema.

---

## M2. Exact machine path fields

### Changed this session

`producerAuthority` values now must be singular exact repository paths rather than prose mixed with paths.

### Comparable things to inspect

**HIGH**
- all fields named:
  - `*Ref`;
  - `*Path`;
  - `*Authority`;
  - `sourceArtifacts`;
  - `manifest`;
  - `report`;
that are typed only as arbitrary strings.

---

# N. Test semantics and CI hardening

## N1. Ownership-boundary tests

### Changed this session

Added `research-domain-ownership-node-test.mjs`.

Guards shared owners and prevents specialist semantics leaking into generic primitives.

Later guards added for:

- resolution envelope;
- independence vector;
- evidence roles;
- lifecycle classifier;
- topology support authority.

### Comparable things to inspect

**HIGH**
- other extracted primitives with no ownership regression guard.
- compatibility aliases that future consumers may import instead of true owner.

---

## N2. Proxy assertion replacement

### Changed this session

Replaced brittle proxies:

- structured closeout count → explicit required report membership;
- wall-clock attempt count alias parity → semantic biased-tier budget equivalence;
- copied frozen prose → read frozen contract;
- copied active state token → derive lifecycle class.

### Comparable things to inspect

**HIGH**
- tests asserting counts, timing, ordering or wording when the real invariant is identity/membership/equivalence.
- tests with exact prose matches across human-facing docs.
- timing-sensitive tests for deterministic configuration behavior.

---

## N3. Fixture realism

### Changed this session

Improved fixtures to include:

- real opportunity boundary;
- frozen quantitative design;
- resolution design;
- independence design;
- solved controls;
- recovery provenance.

### Comparable things to inspect

**HIGH**
- synthetic fixtures that omit fields required in production and therefore test a weaker contract.
- tests creating “valid” rows that real constructors would reject.

---

# O. Scientific design freezing and preregistration

## O1. Freeze design before outcome

### Changed this session

Failure-response and reserve-starvation pilots now source design from pre-outcome machine artifacts rather than analyzer-local constants.

Reserve sample owns:

- quantitative thresholds;
- action identity;
- rivals;
- discriminator;
- observability requirements;
- outcome interpretation;
- independence design.

### Comparable things to inspect

**HIGH**
- active experiments where analyzer script defaults still define scientific design.
- post-hoc interpretation code with thresholds not present in preflight/contract.

---

## O2. Expectation / surprise / anomaly semantics

### Changed this session

Bundle-F work added prospective expectation, surprise and anomaly semantics to real WS2 work.

### Comparable things to inspect

**MEDIUM**
- other expensive experiments where expectation/surprise is still reconstructed after outcome.
- whether anomaly capture should be required only for specific decision-bearing classes.

---

# P. Instrument semantics and calibration

## P1. Compact failure-response instrument

### Changed this session

Formalized:

- construct measured;
- support/abstention;
- calibration profile;
- protocol-relative applicability;
- target envelope.

### Comparable things to inspect

**HIGH**
- exact/reference observer;
- search-loss observer;
- hint provenance observer;
- rich failure capture;
where support/calibration/null semantics exist but are not packaged together.

**Promotion trigger**
- second reusable instrument needing same support/abstention/calibration contract may earn shared instrument interface.

---

# Q. Unit topology and estimand semantics

## Q1. WS2 unit topology

### Changed this session

Made explicit:

- observation unit;
- opportunity/exposure unit;
- assignment/treatment unit;
- dependence cluster;
- analysis unit;
- generalization unit.

### Comparable things to inspect

**HIGH**
- family experiments;
- variant interventions;
- opportunity sizing;
- repeated attempt/parent data;
where those units are currently implicit or partly conflated.

**Promotion trigger**
- second machine analysis contract duplicates the same topology semantics.

---

# R. Selection, target envelope and negative-resolution scope

## R1. Selection and target envelope

### Changed this session

WS2 analysis/claim carries:

- selection;
- target envelope;
- negative-resolution scope;
- claim scope.

### Comparable things to inspect

**HIGH**
- results that state a conclusion but omit exact target/generalization population.
- closeouts where negative result scope is broader than selected analysis population.

---

# S. Adaptive lineage and derivation provenance

## S1. Adaptive-lineage semantics

### Changed this session

WS2 froze and propagated adaptive lineage through analysis → claim.

### Comparable things to inspect

**HIGH**
- multi-stage studies where stage N was chosen because of stage N-1 outcome but final claim lacks that dependence history.
- confirmation claims downstream of adaptive selection.

---

## S2. Content-level derivation identities

### Changed this session

Claims preserve content hashes and derivation identities, not merely filenames.

### Comparable things to inspect

**HIGH**
- evidence chains where copied/moved files break lineage.
- report refs that identify paths but not content version.

---

# T. Research-to-production conversion fidelity

## T1. Class-4 conversion-fidelity test

### Changed this session

Added production-shaped participation/equivalence proof for promoted Class-4 behavior.

Narrowed to ordinary caller shapes.

### Comparable things to inspect

**HIGH**
- promoted features whose experiment harness exercised a path that ordinary callers may bypass.
- config null/empty/default normalization at every promotion seam.

---

# U. Portfolio / research-program meta-analysis

## U1. Bounded portfolio retrospective

### Changed this session

Added:

- retrospective derivation/CLI/tests;
- frozen dataset;
- all-negative inclusion;
- distinction between missing evidence and missing measurement;
- concrete answerability gates;
- provenance trigger;
- expectation/surprise follow-up.

### Comparable things to inspect

**HIGH**
- proposal-method yield and blind spots once proposal origin is prospectively captured.
- whether unanswered questions fail from acquisition, instrumentation, compute economics, or conceptual ambiguity.

**MEDIUM**
- longitudinal answerability trends across workstreams.

---

# V. Research-system lifecycle / plan closure

## V1. Plan/preflight/handoff lifecycle inventory

### Changed this session

Broadened lifecycle inventory beyond `*-plan.md`.

Derived lifecycle dispositions.

Demoted completed plans/remediation routes from current authority while retaining history.

Added closeout guard.

### Comparable things to inspect

**HIGH**
- other current-reference docs that are operationally concluded.
- handoffs/preflights with no terminal disposition.
- historical plan documents still pulled into agent mandatory context.

---

# W. Data hygiene / canonical artifacts

## W1. Removed noncanonical raw workflow artifact

### Changed this session

Removed `logs/solver-workflow/compact-failure-response.json` from branch.

### Comparable things to inspect

**HIGH**
- generated/raw workflow outputs checked into canonical surfaces without provenance/stability contract.
- logs accidentally treated as durable research assets.

---

# X. Compositional / latent joins

## X1. Cheap failure-response joins

### Changed this session

Later follow-up added cheap compositional joins:

- compact failure response + static descriptors + production boundary;
- compact failure response + variant families.

Framed as development evidence with dependence caveats.

### Comparable things to inspect

**HIGH**
- exact/reference disagreement × failure phenotype;
- capability memory × current residual atlas;
- generator/source lineage × failure-response phenotype;
- work-dose response × mechanism activation/participation;
- hint provenance × compact failure-response route.

These should be evaluated as **latent joins**, not auto-authored relation edges.

---

# Y. Transport/support beyond mechanics

## Y1. Multidimensional source support

### Changed this session

Support assessment expanded from mechanic list to include:

- mechanics;
- grid sizes;
- topology families.

### Comparable things to inspect

**HIGH**
- target response-region overlap;
- path length / intersection-demand range;
- gate-count support;
- mechanic density / composition;
- solver-stage activation opportunity.

These are more likely to matter for real transfer validity than merely “source differs.”

---

# Z. Research-method doctrine added during the session

## Z1. Abstraction promotion rule

### Changed this session

Explicit rule: frameworks/primitives must earn implementation from repeated live consumers.

### Comparable things to inspect

Use as a **negative control** against every opportunity in this report.

---

## Z2. Prose-vs-machine-state rule

### Changed this session

Current control state must be machine-readable; prose is mirror/fallback.

### Comparable things to inspect

Applies to any remaining machine reader of Markdown rhetoric.

---

## Z3. Relation-quality rule

### Changed this session

Stable authored scientific edges outrank lexical/file-layout discovery.

### Comparable things to inspect

Applies to every graph-like crosswalk/dossier.

---

## Z4. Observability-before-negative rule

### Changed this session

Negative inference requires claim-relative observability proof.

### Comparable things to inspect

Applies to all null/negative experimental conclusions.

---

## Z5. Co-design observability and discrimination

### Changed this session

Discriminator determines required observability; observability feasibility constrains discriminator.

### Comparable things to inspect

Applies prospectively to new experiment design.

---

## Z6. Distributed-knowledge hardening rule

### Changed this session

When correctness requires multiple places to “already know” same thing, classify:

- shared invariant;
- canonical authority;
- adapter;
- derived view;
- intentional separation.

### Comparable things to inspect

This report itself is the broad application list.

---

## Z7. Second-pass closure rule

### Changed this session

After first productive audit finding, explicitly look for:

- transitions;
- omitted alternatives;
- quantitative authority;
- measurement reactivity;
- target support;
- compositional joins.

### Comparable things to inspect

This should become the default audit closeout discipline.

---

# Highest-value adjacent audits suggested by the taxonomy

The commit-level reconstruction points to the following opportunities as the most likely to pay off next.

## 1. Quantitative-authority sweep — **HIGH**

Search all active/precommitted experiments for decision-bearing values still owned by:

- script defaults;
- CLI defaults;
- prose;
- test constants.

Specifically:

- thresholds;
- node/work budgets;
- sample sizes;
- action/config IDs;
- cut points;
- stop rules;
- minimum support counts;
- dose ladders.

Why high priority: reserve-starvation already demonstrated this failure class concretely.

---

## 2. Compound-identity / delimiter sweep — **HIGH**

Search shell, workflow, persisted JSON/text and report tooling for:

- `.split(',')`;
- `.split(':')`;
- `.join(',')`;
- display IDs parsed back into semantic components.

Why high priority: the session fixed several real comma/delimiter bugs in independent places before centralizing the rule.

---

## 3. Machine-path field typing sweep — **HIGH**

Audit every field named like:

- `*Ref`;
- `*Path`;
- `*Authority`;
- `sourceArtifacts`;
- `manifest`;
- `report`;
- `contract`.

Ask whether arbitrary prose can inhabit what downstream code treats as a repository path/ID.

Why high priority: `producerAuthority` failed this exact way.

---

## 4. Frozen-design sweep — **HIGH**

For every active decision-bearing experiment, verify that pre-outcome artifacts own:

- population identity;
- action/treatment identity;
- thresholds/budgets;
- discriminator;
- outcome interpretation;
- stop/reopen rule.

Why high priority: both successful pilots improved when analyzer-local constants moved into frozen design.

---

## 5. Instrument support/calibration inventory — **HIGH**

Compare the mature compact failure-response instrument contract against:

- search-loss observer;
- exact/reference observer;
- hint provenance observer;
- rich failure capture;
- decision observation.

Ask which already independently encode:

- construct;
- support/abstention;
- calibration;
- observer effects;
- protocol/revision identity;
- null meaning.

Why high priority: likely candidate for the next earned shared primitive, but only if a second machine consumer truly matches.

---

## 6. Unit-topology audit across non-WS2 studies — **HIGH**

Check family/variant, repeated-attempt, opportunity-sizing, hint/failure and exact/reference studies for implicit conflation among:

- observation unit;
- exposure/opportunity unit;
- assignment unit;
- dependence cluster;
- analysis unit;
- generalization unit.

Why high priority: row-count pseudoreplication and treatment/exposure conflation are recurring.

---

## 7. Transition-coherence audit — **HIGH**

Take real closeouts/promotions/deferred-reopen transitions and verify all affected authorities change coherently:

- report closeout;
- question state;
- workstream execution/gate;
- experiment promotion state;
- production provenance.

Do not create a transition engine yet.

Why high priority: authority ownership is now good enough that half-applied transitions become the next likely failure class.

---

## 8. Latent-join opportunity audit — **HIGH**

Systematically ask which current unanswered questions can be attacked using existing assets joined under authored/stable identities.

Candidate joins:

- exact/reference disagreement × failure phenotype;
- failure phenotype × static descriptors;
- failure phenotype × variants;
- capability memory × current residual;
- generation lineage × failure phenotype;
- hint provenance × failure response;
- work-dose response × participation/exposure.

Why high priority: this expands capability without new solver compute.

---

## 9. Confirmation/common-mode audit — **HIGH**

Find reports labelled confirmation/replication and record:

- independent unit;
- sample independence;
- source construction independence;
- instrument implementation independence;
- critical-code common mode;
- framing/ontology independence.

Why high priority: D1/D3 already show “independent” is frequently multidimensional.

---

## 10. Measurement-reactivity audit — **MEDIUM-HIGH**

Inventory instrumentation touching solver execution and check for:

- outcome parity;
- work parity;
- timing overhead;
- memory/volume overhead;
- scheduling/order perturbation.

Why high priority: compact/rich failure instrumentation already demonstrates that observer cost can materially differ.

---

## 11. Target-support / transfer-overlap audit — **MEDIUM-HIGH**

Beyond mechanic/grid/topology support, inspect whether transfer sources overlap the target regime on:

- path length;
- required intersections;
- mechanic density/composition;
- gate count;
- residual difficulty/work-response;
- relevant solver-stage activation.

Why important: technically supported cross-construction data may still be poor transport evidence.

---

## 12. Test-proxy audit — **MEDIUM-HIGH**

Search tests for semantic intent asserted through:

- counts;
- elapsed time;
- total attempt count;
- exact prose;
- array order;
- raw filename;
- current enum spelling.

Replace only where a stable semantic owner exists.

Why important: several CI failures in this session were proxy-test failures, not product failures.

---

## 13. Relation lifecycle / invalidation audit — **MEDIUM**

Inspect authored relations for temporal validity:

- evidence superseded;
- solver/config changed;
- population boundary changed;
- material dependency invalidated.

Why medium: current graph integrity is good, but durable claim usage is not yet broad enough for a global invalidation substrate.

---

## 14. Proposal-method calibration — **MEDIUM**

Prospectively capture known question origin when stable:

- premise-map mining;
- archaeology;
- negative-space audit;
- failure-response nomination;
- capability-memory contrast;
- variant-family microscope;
- exact/reference disagreement;
- human/agent reconstruction.

Later compare yield/redundancy/answerability.

Why medium: valuable only once enough prospective origin data exists.

---

## 15. Agent-context authority audit — **MEDIUM**

Beyond byte budgets, inspect whether each route loads:

- the narrowest actual authority;
- unnecessary historical plans;
- duplicate operating-model material;
- generated views instead of source authorities where appropriate.

Why medium: one route already exceeded budget because the authority set was too broad.

---

# Areas that currently look saturated or deliberately bounded

Do not spend effort here without a new concrete trigger:

- universal `ResearchStudy` object;
- universal `PopulationSpec`;
- universal independent-unit enum;
- global knowledge graph;
- scalar independence/confidence score;
- `ChangeRealization` registry;
- generic transportability registry;
- mass migration of historical reports to structured closeouts;
- flattening report roles into evaluation evidence roles;
- flattening measurement support into evidence applicability.

---

# Recommended next sequence

The commit taxonomy suggests the next work should not be “invent the next concept.”

The highest-yield sequence is:

1. **quantitative-authority sweep**;
2. **compound-identity/delimiter sweep**;
3. **machine-path field typing sweep**;
4. **frozen-design sweep**;
5. **instrument support/calibration comparison**;
6. **unit-topology audit**;
7. **transition-coherence audit**;
8. **latent-join opportunity audit**;
9. **confirmation/common-mode audit**;
10. only then reassess whether a new shared primitive has actually emerged.

This ordering follows the strongest empirical lesson of the 298 commits:

> the repo's biggest gains came when a concrete repeated correctness failure forced a small owner, not when a concept was elegant enough to deserve one in advance.

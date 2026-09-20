# Research-domain bones audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-19 — Shared semantic ownership was traced across experiment contracts, research blocks, WS2 analysis/claims, hint/failure evidence, sweep integrity, CP-SAT integrity, report closeouts, and authority routing.
> **Decision:** extract only repeated correctness-critical scientific invariants; keep specialist payloads, adapters, derived views, and orthogonal authorities separate.
> **Remaining gate:** promote another shared primitive or lifecycle owner only after a second materially different live consumer demonstrates the same invariant or state transition.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-19","decision":"extract repeated correctness-critical invariants only; keep specialist semantics and derived connective tissue separate","remainingGate":"another materially different live consumer must demonstrate the same invariant before further promotion","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"cross-system ownership and semantic-convergence audit","inferenceScope":"research-system architecture and semantic ownership; not solver-efficacy evidence"},"claimRefs":[],"sourceArtifacts":["scripts/research-semantic-identity-lib.mjs","scripts/research-population-identity-lib.mjs","scripts/research-observation-integrity-lib.mjs","scripts/research-question-contract-lib.mjs","scripts/research-evidence-applicability-lib.mjs","scripts/research-claim-lib.mjs","reports/2026-09-19-research-authority-ownership-audit-001.md"],"prospective":{"expectation":null,"surprise":null,"anomaly":null}} -->

> **Scope:** identify places where research-system connective tissue is carrying a domain concept that has become stable enough to deserve a first-class implementation owner.

## Bottom line

The September consolidation work succeeded at composition strongly enough to expose a new distinction:

- some bridges are correctly derived views, adapters, audits or front doors and should remain connective tissue;
- some repeated cross-system semantics have become load-bearing domain concepts and should be promoted to small shared primitives.

The safest promotion rule is **repeated semantic convergence across real producers/consumers**, not conceptual attractiveness. A shared primitive should be extracted only when at least two real call sites need the same invariant and keeping the invariant local would permit semantic drift or duplicated correctness logic.

This pass initially found six such primitives; the subsequent synchronous observability/identifiability pilot earned a seventh, the independence/causal-ancestry pass earned an eighth, and the distributed-knowledge audit earned a ninth. It also found several attractive near-misses that should remain separate for now.

## Shared primitives extracted

### 1. Semantic identity

Before this follow-up, canonical order-insensitive semantic hashing existed independently in:

- the v3 solver experiment contract;
- research-block lineage, indirectly by importing the solver experiment contract only for its hash helper;
- the WS2 analysis-contract/analysis identity code;
- the WS2 claim code.

That is a real cross-domain invariant, and the ownership was visibly wrong: research blocks depended on a solver-experiment module merely to construct their own identities.

The shared owner is now:

- `scripts/research-semantic-identity-lib.mjs`

It owns only canonical object-key ordering and SHA-256 semantic hashing. Specialist owners still decide what belongs in their hash domain and whether array order is semantic. The v3 experiment contract retains its `stableHash` export as a compatibility alias, but research blocks, analysis contracts and claims no longer need the experiment contract as their identity owner.

### 2. Research claim/dependency primitive

The live WS2 Bundle-C slice already contained generic semantics inside a specialist file:

`analysis -> claim -> decision`

with:

- content-derived claim identity;
- explicit evidence/analysis dependencies;
- material-dependency relations;
- bounded reverse invalidation;
- separation of scientific and decision dispositions;
- no automatic downstream rewriting.

Those semantics now have a shared owner in:

- `scripts/research-claim-lib.mjs`

The WS2 claim builder remains the specialist producer. It still owns routing semantics, population scope, instrument meaning, limitations and route consequences, but delegates common claim identity/dependency/invalidation behavior to the shared primitive.

This is intentionally **not** a universal claim schema or knowledge graph. Specialist payloads remain specialist; only the invariant skeleton is shared.

### 3. Research-question contract

Two independently evolved experiment systems duplicated the same scientific question semantics:

- the v3 solver experiment contract;
- the older experiment-manifest family.

Both require a live ambiguity, discriminating observable, non-empty outcome interpretation and canonical `MO-NNN` measurement-opportunity syntax. Their only material difference is that current v3 decision-bearing contracts require a stable question ID while older manifests may omit it.

The shared owner is now:

- `scripts/research-question-contract-lib.mjs`

The common validator exposes that one difference explicitly through `requireQuestionId` rather than forcing historical manifests into a stronger contract they never claimed.

### 4. Evidence-applicability lattice

Hint provenance and compact failure evidence deliberately retain different evidence-purpose taxonomies and different classifiers, but both independently use the same epistemic result lattice:

- `admissible`;
- `context-bound`;
- `inadmissible`.

That shared meaning now has one owner:

- `scripts/research-evidence-applicability-lib.mjs`

Hint provenance and failure evidence re-export/use the shared values while keeping their purpose-specific logic separate.

This extraction is intentionally small. It does **not** imply that hint and failure evidence share one schema, purpose taxonomy, dependence model or classifier.


### 5. Population identity and canonicalization

Population identity primitives had also accumulated in the wrong owner. Generic sweep validation, population combining and CP-SAT reference integrity all depended on `solver-experiment-contract.mjs` for identity-line parsing, duplicate-safe canonicalization and semantic population hashes.

Those semantics now have a dedicated owner:

- `scripts/research-population-identity-lib.mjs`

It owns:

- one-identity-per-line parsing;
- canonical unique identity sets;
- population hash construction over explicit kind/basis/corpus/selection/codec semantics.

The solver experiment contract keeps compatibility exports, while generic consumers now depend on the shared owner directly.

This does **not** create a universal population/sample object. Research blocks still use their stricter parent-id + content-identity seal because that contract protects a different failure mode.

### 6. Observation outcome and population integrity

The v3 experiment contract also owned generic row outcome classification and population coverage/decision-validity logic, even though compact failure response, generic sweep validation and publication use those semantics independently of the experiment-contract lifecycle.

Those semantics now have a dedicated owner:

- `scripts/research-observation-integrity-lib.mjs`

It owns:

- common observation identity extraction;
- solved / exhausted-negative / budget-limited / deadline-truncated / harness-error / malformed / unknown classification;
- expected-versus-observed population integrity;
- the distinction between structural coverage completeness and decision-valid completeness.

Specialist adapters remain specialist. In particular, CP-SAT explicit-prefix reference integrity retains its LIVE/DEAD/timeout-abstain/correctness-alarm taxonomy rather than being forced through the generic solver-row classifier.

### 7. Research resolution envelope

A later paired observability/identifiability pilot supplied the required second live consumer for another repeated invariant.

The shared owner is now:

- `scripts/research-resolution-envelope-lib.mjs`

It owns only:

- canonical observability axes;
- canonical axis statuses;
- required-axis declaration;
- structural validation;
- blocker projection;
- `resolution-ready | observability-blocked` readiness classification.

The two proving consumers are materially different:

- WS2 failure-response reconnaissance, a discriminator-routing screen;
- admissible-order reserve-starvation recurrence, a prospective isolated cost-curve probe.

Their required axes differ, and neither delegates specialist scientific verdicts to the shared helper.

The reserve-starvation integration immediately found two false-readiness paths: missing action identity and missing solver identity could previously survive into decision readiness. That is concrete evidence that the shared invariant is correctness-bearing rather than cosmetic.

See `reports/2026-09-19-synchronous-observability-identifiability-pilot-001.md`.

### 8. Research independence vector

The next pass found another repeated correctness-bearing invariant: evidence channels need the same explicit dimensions of independence/common-mode dependence even when their scientific payloads differ.

The shared owner is now:

- `scripts/research-independence-vector-lib.mjs`

It owns canonical axes and structural validation only. The first two live consumers are:

- WS2 failure-response reconnaissance;
- admissible-order reserve-starvation recurrence.

The shared axes cover sample/data, parent/family, source construction, decision seam, instrument implementation, analysis method, analyst/model, framing/context exposure, ontology/vocabulary and critical-code ancestry.

Specialist artifacts still own the actual relationship statements. No scalar independence score exists.

See `reports/2026-09-20-research-independence-causal-ancestry-audit-002.md`.

### 9. Evaluation evidence-role vocabulary

The distributed-knowledge hardening pass found the same correctness-bearing three-value evaluation role contract independently encoded in:

- targeted, random and topology generators;
- the research generation dispatcher;
- research-block lineage;
- the integration audit.

The shared owner is now:

- `scripts/research-evaluation-evidence-role-lib.mjs`

It owns only:

- `development`;
- `confirmation`;
- `transfer`;
- membership validation.

This does **not** absorb broader report/closeout evidence roles such as `forensic`. The common invariant is specifically the evaluation/population role used across generation and research-block boundaries.

See `reports/2026-09-20-distributed-knowledge-hardening-audit-001.md`.

## Near-misses deliberately not unified

### Measurement support versus evidence applicability

Decision observations use `SUPPORTED | UNKNOWN | UNSUPPORTED` for whether an annotation/instrument can support a measurement. Hint/failure evidence use `admissible | context-bound | inadmissible` for whether an existing observation may support a stated research purpose.

The vocabularies rhyme but answer different questions. They remain separate.

### Hint/failure evidence purposes

Hint provenance and failure evidence now share applicability outcomes, but their purpose sets are materially different. They remain specialist.

### Population identity

The v3 experiment contract canonicalizes logical population identities plus kind/basis/selection/codec semantics. Research blocks instead seal aligned parent display IDs to parent content identities to prevent content drift under stable names.

They now also share the low-level identity/canonicalization owner where semantics genuinely match, but the full population contracts still differ enough that a generic `PopulationSpec` would erase useful distinctions.

## Concepts that look like real future organs but have not yet earned extraction

### 1. Research study / investigation lifecycle

The system repeatedly composes:

`design -> acquisition -> observation -> analysis -> claim -> decision -> production realization`

This is now a coherent conceptual object, but only one current vertical slice exercises most of the full chain in machine-readable form. Creating a universal `ResearchStudy` object now would freeze one experiment family's accidental shape.

**Promotion trigger:** a second materially different research path needs to carry the same lifecycle transitions and invariants. At that point extract lifecycle identity/state ownership while retaining specialist experiment payloads.

### 2. Population/sample specification

Population identity, source lineage, selection, enrichment, independent units, confirmation consumption and generalization targets recur across several systems.

The semantic pressure is real, but those systems still have meaningfully different population representations.

**Promotion trigger:** two current decision-bearing producers need the same transformation chain

`universe/source -> eligibility -> selection -> observed sample -> analysis population -> generalization target`

and currently duplicate validation or reinterpretation logic.

Do not build a central population database.

### 3. Research instrument contract

Reusable instruments increasingly need shared answers about:

- construct measured;
- support/abstention conditions;
- calibration;
- observer effects;
- revision identity;
- what a null can mean.

The current WS2 compact-failure-response analysis contract demonstrates the shape, but there is not yet a second instrument implementing the same machine contract.

**Promotion trigger:** another reusable instrument needs the same support/abstention/calibration semantics. Then extract the smallest common instrument interface and keep instrument-specific payloads separate.

### 4. Unit topology

Observation, opportunity/exposure, assignment, dependence-cluster, analysis and generalization units are explicit in the WS2 slice and conceptually recur elsewhere.

**Promotion trigger:** a second machine-readable analysis contract needs the same six-axis topology. Then extract a shared constructor/validator rather than copying the WS2 field checks.

### 5. Production realization

A deeper authority pass found more existing structure than this audit initially credited.

Production realization is already protected by:

- the runtime `OPT_IN_FEATURES`/default-config owner;
- generic default-polarity conformance tests;
- generic null-config versus empty-config production-default equivalence tests across routing/scheduling/allocation;
- documentation coverage requiring every retained default-OFF flag to have a disposition;
- specialist production-shaped participation tests where a promotion exposes a unique realization hazard.

That is already a functioning organ rather than mere connective tissue.

The previously identified narrow provenance seam has now earned and received the smallest useful extraction: promoted/default-ON ledger rows may carry a primary `Decision evidence ref`, exposed through the research relations model and checked against runtime polarity. Historical promotions without a defensible retained primary report remain explicitly unlinked.

This closes the decision-evidence -> listed runtime-default provenance question without creating a `ChangeRealization` registry.

**Next promotion trigger:** only add more realization structure if multiple real consumers need implementation-target identity, qualification/invalidation state, or supersession history beyond the current evidence-ref edge.

## Connective tissue that should remain connective tissue

Do **not** promote the following merely because they compose many sources:

- research-system inventory and architecture map;
- generated front-door/brief views;
- dossiers;
- queue/future-work reconciliation;
- portfolio/reflexivity retrospective;
- crosswalk reports;
- documentation routing;
- hint/failure-evidence specialist payloads.

These are useful precisely because they remain derived and non-authoritative.

## Architectural rule going forward

When consolidation discovers repeated glue, classify it before adding more glue:

1. **Derived view:** joins existing authorities for retrieval or diagnosis. Keep it derived.
2. **Adapter:** translates between two legitimately different specialist contracts. Keep it local and explicit.
3. **Invariant:** multiple producers/consumers must mean the same thing and correctness depends on that shared meaning. Extract a small first-class primitive.
4. **Lifecycle owner:** multiple systems are reconstructing the same state machine from references. Promote the lifecycle only after at least two real vertical slices prove the state transitions.
5. **Tempting ontology:** a concept is elegant but has no repeated live consumer. Do not build it.

The target is a small research-domain model embedded inside the existing research system, not a new research framework.

## Result

This follow-up now promotes nine proven common invariants while explicitly declining several superficially similar abstractions.

That is the intended direction of travel: continue to prefer composition, but once composition repeatedly reconstructs the same correctness-critical meaning, stop adding bridges and give that meaning a proper owner.

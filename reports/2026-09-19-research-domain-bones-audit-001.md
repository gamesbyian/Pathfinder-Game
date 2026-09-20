# Research-domain bones audit 001

> **Date:** 2026-09-19  
> **Status:** concluded architectural follow-up  
> **Scope:** identify places where research-system connective tissue is carrying a domain concept that has become stable enough to deserve a first-class implementation owner.

## Bottom line

The September consolidation work succeeded at composition strongly enough to expose a new distinction:

- some bridges are correctly derived views, adapters, audits or front doors and should remain connective tissue;
- some repeated cross-system semantics have become load-bearing domain concepts and should be promoted to small shared primitives.

The safest promotion rule is **repeated semantic convergence across real producers/consumers**, not conceptual attractiveness. A shared primitive should be extracted only when at least two real call sites need the same invariant and keeping the invariant local would permit semantic drift or duplicated correctness logic.

This pass found six such primitives. It also found several attractive near-misses that should remain separate for now.

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

The Class-4 portal retry regression established a real post-decision lifecycle:

`decision intent -> implementation target -> production reachability -> behavioral participation -> qualification`

For now this is correctly protected by production-shaped tests rather than a deployment subsystem.

**Promotion trigger:** a second evidence-backed production change needs the same realization metadata and invalidation behavior. Then extract a compact `ChangeRealization` value object.

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

This follow-up now promotes six proven common invariants while explicitly declining several superficially similar abstractions.

That is the intended direction of travel: continue to prefer composition, but once composition repeatedly reconstructs the same correctness-critical meaning, stop adding bridges and give that meaning a proper owner.

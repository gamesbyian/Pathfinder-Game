# Research-domain bones audit 001

> **Date:** 2026-09-19  
> **Status:** concluded architectural follow-up  
> **Scope:** identify places where research-system connective tissue is carrying a domain concept that has become stable enough to deserve a first-class implementation owner.

## Bottom line

The September consolidation work succeeded at composition strongly enough to expose a new distinction:

- some bridges are correctly derived views, adapters, audits or front doors and should remain connective tissue;
- some repeated cross-system semantics have become load-bearing domain concepts and should be promoted to small shared primitives.

The safest promotion rule is **repeated semantic convergence across real producers/consumers**, not conceptual attractiveness. A shared primitive should be extracted only when at least two real call sites need the same invariant and keeping the invariant local would permit semantic drift or duplicated correctness logic.

## Extraction landed in this follow-up

The first concept that clearly passed that test is the **research claim/dependency primitive**.

The live WS2 Bundle-C slice already contained generic semantics inside a specialist file:

`analysis -> claim -> decision`

with:

- content-derived claim identity;
- explicit evidence/analysis dependencies;
- material-dependency relations;
- bounded reverse invalidation;
- separation of scientific and decision dispositions;
- no automatic downstream rewriting.

Those semantics are not intrinsically WS2-specific. They now have a shared owner in:

- `scripts/research-claim-lib.mjs`

The WS2 claim builder remains the specialist producer. It still owns its routing semantics, population scope, instrument meaning, limitations and route consequences, but delegates common claim identity/dependency/invalidation behavior to the shared primitive.

This is intentionally **not** a universal claim schema or knowledge graph. Specialist payloads remain specialist; only the invariant skeleton is shared.

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

Observation, opportunity/exposure, assignment, dependence-cluster, analysis and generalization units are now explicit in the WS2 slice and conceptually recur elsewhere.

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

This follow-up therefore makes one concrete architectural promotion now and records promotion thresholds for the larger candidates.

The system should continue to prefer composition. But once composition repeatedly reconstructs the same invariant, another bridge is no longer the cheapest architecture.

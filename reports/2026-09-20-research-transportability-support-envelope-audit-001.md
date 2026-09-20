# Research transportability / support-envelope audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — evaluation/transfer doctrine, level-blindness, research generation, generator descriptors, acquisition preflight, and the topology-composition producer were compared for repeated generalization/support semantics.
> **Decision:** treat transportability as claim-relative support across population/source/regime boundaries, not as a synonym for fresh samples or cross-construction provenance. A source must both differ in the dimension relevant to the claim and represent the mechanics/topology needed for the claim to express itself.
> **Remaining gate:** add claim-side machine support requirements only when a live transfer decision needs software to reject a cross-construction source whose support envelope is scientifically insufficient.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-20","decision":"treat transportability as claim-relative source/population support, not mere source novelty; expose generator support envelopes before transfer use","remainingGate":"add claim-side support requirements only when a live transfer decision needs a machine support join","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"cross-system transfer/generalization and generator-support audit","inferenceScope":"research-system transport/generalization semantics; not solver-efficacy evidence"},"claimRefs":[],"sourceArtifacts":["docs/solver-evaluation-evidence.md","docs/solver-level-blindness.md","docs/solver-research-generation.md","scripts/research-level-generation-lib.mjs","scripts/stress/generate-topology.mjs","scripts/stress/topology-generation-support-lib.mjs","scripts/research-acquisition-preflight-lib.mjs"],"prospective":{"expectation":"fresh-sample, cross-construction and support-envelope distinctions will recur but should remain claim-relative","surprise":"distributionClass was machine-readable while the topology generator's narrower mechanic support remained mostly prose at the research-dispatch boundary","anomaly":null}} -->

## Bottom line

The next concept after resolution readiness and causal independence is **transportability**:

> To what target population/source/regime may this identified result legitimately travel?

Pathfinder already has good doctrine for this, but the semantics are distributed.

The important distinctions are:

- **fresh sample**: new units, possibly same construction family;
- **sample-independent confirmation**: evaluation units did not choose the candidate;
- **cross-construction challenge**: source process materially differs;
- **supported transfer**: the source also represents the mechanics/topology needed for the claim;
- **broad generalization**: evidence spans enough relevant source/regime variation to justify a broader target claim.

These are not interchangeable.

## Existing doctrine is already strong

### Fresh sample is not transfer

A new seed from `generate-random.mjs` can be excellent sample-independent confirmation.

It remains witness-first construction and is not distributionally independent from Corpus 2 merely because the IDs are fresh.

### Cross-construction is not automatically relevant transfer

The topology-composition generator is materially different from witness-first generation.

But v0.1 deliberately omits:

- portals;
- static filters;
- surround;
- adjacent-turn;
- multi-gate.

It also represents only:

- 12x12 / 15x15 grids;
- a perfect-maze-diameter macro grammar;
- no arbitrary macro cycles, competing macro routes, open-region or room/corridor grammar.

Therefore an otherwise pristine topology null cannot argue against a portal-dependent treatment.

The source is independent but does not support the phenomenon.

### Level-blindness is not transportability

A runtime-generic solver policy can still be selected/tuned to one repeatedly mined distribution.

Level-blind execution establishes a legal cold-information boundary.

It does not establish that an effect travels to unseen construction regimes.

### Family generalization is its own target

Variant siblings can identify causal transformations inside one parent.

Whole-parent holdout is required before claiming the relation generalizes across families.

That target differs from cross-generator transfer.

## The transportability relation

A useful transfer claim needs three things.

### 1. Source relationship

How does the evaluation source differ from development?

Examples:

- same construction family, fresh block;
- different source selection philosophy, same broad construction family;
- cross-construction procedural source;
- human/editor source;
- held-out parent families.

This is partly covered by the independence vector.

### 2. Claim support

Can the target source actually express the phenomenon?

Relevant dimensions include:

- mechanic support;
- topology grammar;
- grid/scale envelope;
- action/treatment activation opportunity;
- outcome/reference/instrument support.

A different source with zero opportunity is not negative transfer evidence.

### 3. Target scope

What is the intended generalization claim?

Examples:

- this frozen residual;
- unseen parents from the same generator family;
- topology-composition levels with supported mechanics;
- unrelated parent families;
- unseen Pathfinder levels broadly.

The broader the target, the more source regimes/support dimensions are required.

## Concrete hardening found by this audit

The research generator dispatcher already had machine-readable:

- `sourceFamily`;
- `distributionClass`;
- default evidence roles.

But the topology generator's narrower mechanic/topology support was largely carried in prose at the dispatcher boundary.

That creates a dangerous asymmetric fact:

> software can know that topology is cross-construction before it can know whether topology supports the claim.

The producer already owns a precise support contract in its implementation comments, generated output, and tests, so the fix is not a new registry.

### Producer-owned support envelope

A new tiny owner now exists:

- `scripts/stress/topology-generation-support-lib.mjs`

It records the current topology producer's:

- generator version;
- grid sizes;
- topology grammar;
- supported mechanics;
- unsupported mechanics;
- unsupported topology families.

`generate-topology.mjs` publishes that exact envelope in generated output.

### Dispatcher reuse

`research-level-generation-lib.mjs` references the same producer-owned envelope.

It exposes:

`assessGenerationMethodSupport(method, { requiredMechanics })`

with three outcomes:

- `supported`;
- `unsupported`;
- `unknown`.

The asymmetry is deliberate.

Topology has an explicit support contract.

Targeted/random remain `unknown` through this helper until their own producer contracts earn equally explicit support statements. Unknown is safer than assuming universal support.

### Acquisition guidance

Cross-source acquisition preflight now exposes each candidate method's support envelope.

It does not yet automatically reject a candidate based on question mechanics because research questions do not currently own a canonical machine-readable `requiredMechanics` contract.

That missing join is now visible rather than silently inferred.

## Why not add requiredMechanics to every question now?

Because transportability is claim-relative.

A question can involve portals in its surrounding population without the discriminator itself requiring portal activation.

Conversely, a nominally generic selector may rely on a topology regime not captured by a simple mechanic inventory.

A universal question-level mechanic list would be too coarse unless a real consumer needs it.

The right promotion trigger is narrower:

> a live transfer/challenge decision needs software to decide whether an otherwise-independent source can express the phenomenon required by the claim.

Then add the smallest claim-side support requirement needed for that decision.

## Synchronous relationship with earlier concepts

Transportability sits downstream of the previous lenses.

### Resolution readiness

Within each source:

- is the phenomenon observable?
- is the discriminator identifiable?
- is execution fidelity correct?

### Independence / causal ancestry

Across evidence channels:

- which support units and common-mode failures are genuinely independent?

### Transportability

Across source/population regimes:

- which target claim is supported by those sources?
- does each source represent the required phenomenon?
- what broader scope remains unsupported?

A cross-construction source that is observability-blocked contributes no negative transfer evidence.

A resolution-ready same-family confirmation can strongly support a narrow claim without becoming broad transfer.

## A useful target/source matrix

| Evidence source | What it can establish by default |
|---|---|
| same development rows | development/diagnosis only |
| fresh locked same-generator block | sample-independent confirmation |
| unrelated held-out parent families | family-level generalization |
| topology-composition source | cross-construction transfer within represented mechanic/topology support |
| human/editor source | external-construction challenge when untouched and claim-relevant |
| one fresh seed from existing generator | not universal unseen-level generalization |

The role is still claim-relative and selection-history dependent.

## Next machine primitive?

Not yet.

The producer-side support envelope has earned structure because it is a real source property and already existed in multiple producer surfaces.

A generic `TransportabilitySpec` has not earned extraction.

Possible future machine semantics would need to prove repeated use of:

- source relationship;
- required claim support;
- target generalization envelope;
- transfer outcome interpretation.

Until a second live transfer decision reconstructs those same meanings, keep transportability as an audit/design lens and reuse producer support contracts.

## Standing rule

**A different source is not transfer evidence unless it can express the phenomenon the claim needs.**

State separately:

1. how the source is independent;
2. what the source supports;
3. what target population/regime the result is allowed to generalize to.

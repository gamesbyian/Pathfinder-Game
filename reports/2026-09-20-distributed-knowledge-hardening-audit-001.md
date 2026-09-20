# Distributed-knowledge hardening audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — CI contract drift, research-domain ownership, resource-contract authorities, generator support envelopes, evaluation evidence roles, question lifecycle states, and frozen analysis contracts were compared as specimens of knowledge distributed across repo surfaces.
> **Decision:** treat repeated "the repo already knows X, but the knowledge is scattered across..." findings as a standing architecture-audit lens. Classify each case by whether correctness requires the scattered pieces to agree, then choose shared invariant, canonical authority, derived view, adapter, or intentional specialist separation.
> **Remaining gate:** apply this lens opportunistically to correctness-bearing repeated knowledge; do not build a global knowledge registry merely to inventory repetition.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-20","decision":"use distributed-knowledge reconstruction as a standing hardening lens; promote only correctness-bearing repeated semantics/authority","remainingGate":"apply opportunistically; no global knowledge registry without a live consumer","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"targeted repeated-knowledge and CI-drift audit","inferenceScope":"research-system architecture, semantic ownership, and authority hardening; not solver-efficacy evidence"},"claimRefs":[],"sourceArtifacts":["scripts/research-domain-ownership-node-test.mjs","docs/solver-research-resource-contract-audits.json","scripts/research-evaluation-evidence-role-lib.mjs","scripts/research-question-relations-lib.mjs","scripts/stress/topology-generation-support-lib.mjs","reports/2026-09-19-research-domain-bones-audit-001.md"],"prospective":{"expectation":"some repeated knowledge will prove healthy specialist composition while a smaller subset will be missing owners","surprise":"the same CI run exposed three distinct scattering modes at once: copied lifecycle spelling, copied contract prose/error wording, and machine-path fields containing human prose","anomaly":null}} -->

## Motivation

A recurring research/audit sentence in Pathfinder is:

> the repo already knows X, but that knowledge is scattered across ...

That sentence should trigger an architecture question, not merely a documentation observation.

The useful follow-up is:

> Does anything have to reconstruct those scattered pieces in order to be correct?

If yes, the scattering may be hiding a missing owner, missing invariant, or missing derived view.

If no, the scattering may be healthy specialization.

## Five classes of scattered knowledge

### 1. Repeated semantic invariant

Several producers/consumers independently encode the same exact meaning.

Failure mode:

- one enum/list/hash rule/identity rule changes;
- another copy does not;
- joins remain syntactically valid but scientifically disagree.

Correct response:

- extract the smallest shared semantic owner;
- keep specialist payloads local.

Examples already promoted in this branch include semantic identity, research-question contract, evidence applicability, resolution axes, independence axes, and now evaluation evidence roles.

### 2. One fact with several writable authorities

Several files can each appear to answer "what is the current state?"

Failure mode:

- reconciliation is required to discover which one wins;
- stale state remains plausible rather than obviously historical.

Correct response:

- identify one writer/authority;
- turn other surfaces into derived views, indexes, or compatibility pointers.

This is the "missing authority" form of scattered knowledge.

### 3. One authority, many copied spellings

Consumers copy a token, regex, error wording, status label, or prose sentence instead of depending on the semantic owner.

Failure mode:

- the owner evolves correctly;
- descendant tests/tools fail for irrelevant wording drift or, worse, silently keep old semantics.

Correct response:

- import/use the owner when the consumer means the category;
- assert semantic paths/outcomes rather than incidental phrasing.

### 4. Legitimately different specialist concepts with similar vocabulary

Two systems use the same word but mean different things.

Examples already found:

- report closeout `evidenceRole` may be `forensic`;
- evaluation evidence role is specifically `development | confirmation | transfer`;
- measurement support `SUPPORTED/UNKNOWN/UNSUPPORTED` is not evidence applicability;
- population identity is not a full population specification.

Correct response:

- keep separate;
- add an adapter/crosswalk only when a real join needs one.

### 5. A distributed fact that is correctly derived

No one artifact should own the answer because the answer is intentionally computed from several authorities.

Examples:

- research-system inventory;
- question dossier;
- resolution view;
- capability-memory joins;
- architecture/dependency views.

Correct response:

- preserve the derived view as read-only;
- make source authorities explicit;
- do not turn the view into a second writer.

## CI as a distributed-knowledge detector

The 2026-09-20 CI failure on PR #1923 is a useful specimen.

### Resource producer authority mixed machine references and prose

`docs/solver-research-resource-contract-audits.json` had entries such as:

- a string naming two scripts joined by "and";
- a script path followed by explanatory prose;
- data-directory README paths that are not stable authorities under CI runtime-data materialization.

The integration audit correctly interpreted those strings as repository references and failed.

The fix was not to weaken the validator.

`producerAuthority` now contains singular, stable, machine-resolvable authority paths only.

Explanatory meaning remains in the contract's semantic fields.

The integration audit now also validates the field's *shape*: any authority value that begins as a repository path must be one exact path token rather than prose with conjunctions or trailing explanation.

### Question lifecycle spelling was copied into a transaction fixture

The lifecycle owner already defines `active-candidate` and maps it to lifecycle class `active`.

A transaction fixture copied the obsolete token `active`.

Rather than merely replacing one literal with another, the fixture now derives the active state from:

- `RESEARCH_QUESTION_STATES`;
- `researchQuestionLifecycleClass()`.

The test therefore asks for the semantic class it needs rather than today's spelling.

The same pass found the stronger version of the defect in current authority surfaces:

- `docs/solver-research-question-relations.md` still named the removed `active-diagnostic` token;
- `research-question-authority-audit-lib.mjs` still inferred activity with `state.startsWith('active')` even though the shared lifecycle classifier already existed.

Those are now repaired together. The authority audit consumes `researchQuestionLifecycleClass()`, and it checks the human State-semantics section against the exact canonical state vocabulary. The ownership guard forbids reintroducing prefix-based active-state inference there.

### Contract wording was copied into descendant tests

The reserve-starvation test copied a negative-interpretation sentence.

The experiment-manifest test expected the old local error wording for measurement-opportunity validation.

Those tests now assert against:

- the frozen input contract itself;
- the shared question contract's semantic error path.

This reduces false coupling to incidental prose.

## Evaluation evidence roles: a newly promoted invariant

The audit found six independent places knowing the same decision-evidence role vocabulary:

- targeted generator;
- random generator;
- topology generator;
- research generation dispatcher;
- research block lineage;
- integration audit.

Every one needed exactly:

- `development`;
- `confirmation`;
- `transfer`.

This is correctness-bearing because those values cross producer, block, generation, and validation boundaries.

A new shared owner now exists:

- `scripts/research-evaluation-evidence-role-lib.mjs`

It owns:

- the canonical role vocabulary;
- membership validation.

It deliberately does **not** own broader report roles such as `forensic`.

The ownership test prevents the six consumers from drifting back to local definitions.

## Generator support envelope: another distributed-fact specimen

The topology generator had long known its own support boundary in:

- implementation comments;
- generated output description;
- tests;
- generation docs.

The research dispatcher knew only that topology was cross-construction.

That meant software knew:

> this source is different

without knowing:

> this source can express the phenomenon.

The support boundary is now producer-owned in:

- `scripts/stress/topology-generation-support-lib.mjs`

and reused by generation output, dispatcher, and acquisition guidance.

This is the canonical-authority form of hardening, not a new global transportability framework.

## Healthy distributed knowledge: current production boundary

The current residual/production boundary appears in both current and historical material, but the ownership is correctly partitioned:

- `docs/solver-optimization-workstreams.md` owns the current boundary/counts;
- `reports/2026-09-16-post-promotion-production-boundary-refresh-001.md` owns the dated evidence establishing that boundary;
- `docs/solver-capability-memory.md` explicitly says derived views must treat the owning current workstream as authoritative.

This is **not** duplicate authority.

The report should remain immutable history. The workstream should remain the mutable current-state owner.

A new production-boundary registry is not earned unless a real machine consumer repeatedly needs structured current boundary identity and cannot safely receive it explicitly.

## Human mirrors should point at machine owners

The topology generator supplied another healthy repair pattern.

Before this pass, `solver-evaluation-evidence.md` repeated the producer's exact unsupported-mechanic list in multiple places. That made human guidance a parallel source of current support truth.

The exact set now belongs to `scripts/stress/topology-generation-support-lib.mjs`. Evaluation guidance explains the scientific rule and points to that owner instead of maintaining a second exact list.

The ownership test requires that pointer to remain.

## Repeated terminology that should remain claim-relative: independent unit

`independent unit` appears across research blocks, experiment populations, opportunity sizing, family research and evaluation doctrine.

That repetition does **not** imply one global independent-unit enum.

The unit depends on the claim:

- ordinary level-population inference may use one level as the unit;
- variant-family generalization uses parent family;
- repeated attempts/records on one parent collapse to that parent;
- opportunity sizing may use an explicitly supplied cluster field;
- other causal designs may need another legitimate unit.

The existing hardening is correctly about **propagation and agreement**, not vocabulary centralization:

- research blocks author `independentUnit`;
- decision-grade experiment populations propagate it;
- the experiment contract rejects disagreement with its source block;
- the integration audit warns on legacy evidence that failed to propagate it.

Do not replace this with a universal independent-unit taxonomy unless two live consumers need the same finite categorical semantics rather than merely the same field name.

## Retrospective extension: complementary knowledge

The first pass of this audit emphasized duplicated truth and authority. The session retrospective identified a second form of distributed knowledge: different assets can contain complementary pieces of a fact that becomes knowable only after a scientifically valid join.

Two such joins are now authored in the asset registry:

- compact failure response + static descriptors + production boundary;
- compact failure response + variant-family data.

These are research relationships, not inferred truths. Their boundaries preserve selected-population and parent-family dependence.

The standing extension is to look for **latent compositional answerability** without auto-generating edges from lexical join-key overlap.

See `reports/2026-09-20-research-session-local-optima-retrospective-001.md`.

## A practical audit procedure

When "the repo already knows X, but..." appears during research or implementation:

1. **Name X precisely.**
   - Is it a token vocabulary, state, identity rule, support boundary, lifecycle transition, current disposition, or derived inference?

2. **List every place that appears to know X.**
   - producers;
   - validators;
   - docs;
   - registries;
   - tests;
   - reports;
   - workflows.

3. **Ask whether those places must agree for correctness.**
   - If no, keep specialization.
   - If yes, continue.

4. **Identify the relationship.**
   - same invariant;
   - one authority + readers;
   - translation between different concepts;
   - legitimately derived composition.

5. **Apply the smallest repair.**
   - shared value/helper;
   - canonical writer;
   - derived read-only view;
   - explicit adapter;
   - ownership/CI guard.

6. **Delete or demote reconstructed copies.**
   - especially local enums, regexes, status inference, path lists, and prose-derived state.

7. **Test the ownership boundary.**
   - not just the value.

## High-yield search smells

The following should now trigger scrutiny:

- the same small enum/list appears in multiple modules;
- regexes independently validate one namespace;
- a test copies a lifecycle/status token owned elsewhere;
- a registry field named `...Authority` contains prose;
- two docs both claim "current";
- a producer contract is described in comments/docs but not exposed to consumers;
- a downstream tool reconstructs state from prose;
- several reports must be read together to know whether a fact is current;
- a derived view starts acquiring mutation/write authority;
- a common word is reused across domains but consumers assume the meanings match.

## What not to build

Do not build a repository-wide knowledge graph or global semantic registry merely because scattered knowledge exists.

The repo is large enough that some knowledge *should* be distributed.

The trigger for hardening is one of:

- semantic drift can invalidate a scientific join;
- authority ambiguity can change current state;
- reconstruction is repeated in multiple consumers;
- a missing machine boundary permits a known false interpretation;
- CI repeatedly catches copied knowledge after the owner evolves.

## Standing rule

**When correctness requires several places to "already know" the same thing, ask why there is no explicit owner.**

If one owner would be wrong, make the composition or translation explicit instead of pretending the repetition is one concept.

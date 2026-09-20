# Relation lifecycle and invalidation audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — traced question/report/premise/resource relations, durable-claim reverse invalidation, dossier evidence matching and current applicability ownership.
> **Decision:** keep relation identity and evidence applicability separate. Stable authored edges establish ancestry/association; freshness, protocol compatibility, population support and admissibility remain claim/purpose-specific. No global invalidation engine is earned.
> **Remaining gate:** add stronger lifecycle machinery only when multiple live consumers need the same temporal/material-invalidity semantics.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-20","decision":"separate stable relation identity from claim-specific current applicability and expose that boundary in the question dossier","remainingGate":"promote lifecycle/invalidation structure only after repeated live consumers share the same invalidity semantics","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"question relations, dossiers, durable claims, resource applicability and integration audits","inferenceScope":"relation temporal validity and invalidation semantics"},"claimRefs":[],"sourceArtifacts":["docs/solver-research-question-relations.json","scripts/research-question-dossier-lib.mjs","scripts/research-claim-lib.mjs","scripts/research-evidence-applicability-lib.mjs","scripts/research-integration-audit-lib.mjs","reports/2026-09-20-session-change-taxonomy-and-adjacent-opportunities-001.md"],"prospective":{"expectation":"graph integrity will be stronger than temporal applicability because current relations primarily solve rediscovery/ancestry","surprise":"the main practical ambiguity was the dossier field name: stable question/path-linked evidence sat under currentAuthorityMatches without explicitly saying applicability was unassessed","anomaly":null}} -->

## What the current graph proves

Authored question relations and integration audits are strong at referential claims:

- question IDs resolve;
- reciprocal calibration edges agree;
- answeredBy/constrainedBy paths exist;
- structured report question IDs agree with authored answeredBy relationships;
- durable bundles agree with their retained manifests;
- queue rows point to live/nonterminal scientific questions.

Those are structural integrity guarantees.

They do not prove that an old result remains applicable after a solver revision, protocol change, changed residual population, changed allocation regime or materially invalidated dependency.

## Existing invalidation machinery

`research-claim-lib.mjs` already has the right narrow model for durable claims: material dependency edges plus bounded reverse invalidation. Invalidating one dependency flags materially dependent descendants for re-evaluation rather than automatically rewriting their dispositions.

That is appropriate because dependency impact is claim-specific. A solver commit may invalidate one performance claim while leaving a mathematical impossibility result untouched.

The evidence-applicability lattice is likewise purpose/regime-specific rather than a timeless `valid` boolean.

## Dossier ambiguity found

The question dossier gathers report evidence through two strong relationship routes:

- stable structured `researchQuestion` ID;
- authored `answeredBy` path.

That is substantially better than lexical discovery, but the result lived under `currentAuthorityMatches.evidence`. Without an explicit qualifier, a consumer could read that as current applicable evidence.

The dossier now exposes `evidenceApplicability.status = not-assessed` and states that stable linkage does not establish freshness, protocol compatibility, population support or admissibility for a new claim.

This is deliberately additive. It preserves the useful exact relation while preventing a stronger inference than the machinery actually supports.

## Temporal invalidity patterns

Current relations can become scientifically stale in several distinct ways:

1. **solver/config drift** — the treatment or control no longer means the same thing;
2. **population drift** — the current residual/support region differs materially from the result population;
3. **protocol drift** — work accounting, censoring, observer or allocation semantics changed;
4. **dependency invalidation** — a premise/reference/result used materially by a claim is overturned;
5. **supersession** — a successor question/result answers the same tested form under a better/current contract.

These should not be collapsed into one global `stale` flag. Their consequences differ.

## Why no invalidation engine

The repo does not yet have multiple machine consumers demanding one common temporal-invalidity calculation. Most current decisions are already scoped in question `reopensOn` prose, report closeouts, resource freshness contracts or explicit claim dependencies.

A global engine now would either:

- encode vague prose as brittle rules;
- require a huge nullable schema;
- or falsely imply that every solver/config change has the same evidentiary effect.

## Practical rule

Treat a stable edge as answering **what this evidence is related to**.

Treat applicability machinery as answering **whether this evidence may support this claim, for this purpose, under this regime now**.

Never infer the second from the first.

## Promotion trigger

A shared lifecycle/invalidation primitive becomes earned when at least two live consumers independently need the same structured dimensions, for example the same solver-revision compatibility relation plus the same population/protocol invalidity semantics.

Until then, keep invalidation bounded to owning claims/contracts and make non-assessment explicit at discovery surfaces.

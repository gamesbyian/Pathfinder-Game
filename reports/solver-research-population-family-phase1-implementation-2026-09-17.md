# Solver research population + family integration Phase 1 implementation

> Date: 2026-09-17
> Scope: Phase 1 only of `docs/solver-research-population-family-integration-plan.md`
> Predecessor: `reports/solver-research-population-family-phase0-audit-2026-09-17.md`
> Priority authority: `docs/solver-optimization-workstreams.md`
> Method authorities: `docs/solver-research-operating-model.md`, `docs/solver-evaluation-evidence.md`
> Durable-resource authority: `docs/solver-research-resource-contract.md`

## Result

Phase 1 is implemented as a narrow prospective lineage seam. It does not add a database, warehouse, master JSON, asset registry, generation campaign, or family campaign.

The implementation keeps the existing experiment/population contract as the durable carrier and adds one small shared helper for the research-specific facts that the Phase-0 audit proved were missing:

- prospective frozen-block identity;
- stable research-question identity;
- source regime/revision;
- independent-unit semantics;
- parent IDs plus parent content identities;
- source/generation/creation references;
- evidence role at creation;
- append-only consumption-event semantics;
- conservative eligibility facts.

## Implementation

### Shared block lineage helper

`scripts/solver-research-block-lineage.mjs` owns the prospective research-block contract.

A valid block requires:

- `blockId`;
- registry-compatible `questionId` at the producer boundary;
- `sourceRegime`;
- `sourceRevision`;
- `evidenceRole` in `development | confirmation | transfer`;
- `independentUnit`;
- non-empty aligned `parentIds` and `parentContentIdentities`;
- non-empty `sourceArtifactRefs`;
- creation producer + manifest reference, with optional run reference;
- explicit generated-source reference or `null`;
- a consumption-event array;
- an existing SHA-256 population identity supplied by the surrounding population contract.

The block does not contain child observations, exact labels, frontier states, treatment outcomes, or family payloads. Those remain in their owning artifacts.

### Existing population seal is the content-integrity primitive

`scripts/write-solver-experiment-contract.mjs` now validates an optional
`population.researchBlock` only after the existing population-seal logic has resolved
`population.corpusIdentity`.

This establishes the intended distinction:

- `blockId`: research-lineage identity;
- `population.corpusIdentity`: sealed subject-content identity.

The block contract does not mint a competing content hash.

### Stable question identity

When a research block is emitted through the native experiment-contract writer, its `questionId`
must exist in `docs/solver-research-question-relations.json`.

This is additive. The existing experiment-manifest research-question semantics remain canonical:

- `liveAmbiguity`;
- `discriminatingObservable`;
- `outcomeInterpretation`;
- optional `measurementOpportunity`.

Phase 1 does not rename or duplicate them.

### Consumption event

A consumption event records:

- `questionId`;
- decision/report reference;
- scope kind + identity: `block | parent | family`;
- evidence role at use;
- named conditioning;
- opened outcome kinds;
- run reference or explicit `null`;
- timestamp.

The shared append helper returns a new block value and does not mutate the original object.

There is deliberately no `spent`, `fresh`, `contaminated`, or equivalent global boolean.

### Conservative eligibility

`researchBlockEligibility(...)` answers only mechanical facts.

For confirmation/transfer:

- a matching recorded consumption makes the requested scope mechanically unavailable for that supplied question lineage;
- if the caller does not supply question-lineage context, eligibility is `null` with
  `question-lineage-not-proven`;
- lack of a matching event is therefore not automatically upgraded to proof of freshness.

Development remains mechanically usable while still exposing prior-consumption facts.

This is intentionally narrower than scientific judgment. It does not decide whether a source is
distributionally appropriate, whether a claim is too broad, or whether a treatment deserves
promotion.

## Tests

`scripts/solver-research-block-lineage-node-test.mjs` covers:

- valid prospective block shape;
- population-identity requirement;
- aligned parent/content identities;
- deterministic block identity;
- append without mutation;
- non-empty named conditioning;
- matching-consumption exclusion;
- unrelated-question handling when lineage is supplied explicitly;
- unknown confirmation eligibility when lineage is omitted.

The test is wired into `test:node` as `test:solver-research-block-lineage`.

`scripts/write-solver-experiment-contract-node-test.mjs` additionally covers:

- carrying a valid research block through the existing sealed-population writer;
- rejecting a research block without a population seal/content identity;
- rejecting an unknown research-question ID.

## Historical handling

No historical artifact is backfilled.

Missing historical:

- question ID;
- conditioning;
- source revision;
- parent content identity;
- independent-unit provenance;
- role at creation;
- exposure/consumption history;

remains unknown unless the original artifact already preserves it.

The helper is prospective and does not infer cleanliness from silence.

## Phase-1 acceptance check

The implementation now provides the missing seams identified in Phase 0:

1. **Frozen block identity:** yes, prospectively.
2. **Source regime/revision:** yes.
3. **Literal parents/content identities:** yes.
4. **Evidence role at creation:** yes.
5. **Independent unit:** yes.
6. **Existing population seal reuse:** yes.
7. **Creation/source/generation refs:** yes.
8. **Question-specific consumption lineage:** yes.
9. **Named conditioning:** yes.
10. **Conservative eligibility with unknown handling:** yes.
11. **No global fresh/spent flag:** yes.
12. **No new evidence warehouse/registry:** yes.

## Why Phase 2 is deferred

Phase 2 is not implemented in this change.

The reason is practical rather than conceptual: the new block contract is prospective, and the
repository does not yet contain a real decision-bearing block written through it. Building a
question/block/enrichment query layer before one or more genuine block artifacts exist would force
the query design to guess filenames, artifact placement, discovery scope, and producer conventions.

That would recreate the exact failure mode this plan is meant to avoid: infrastructure designed
ahead of evidence.

The next Phase-2 trigger should be the first real use of a research block. At that point the smallest
query extension can be built against actual artifact placement and joins, preferably through
`research:relations` or `research-asset-query`.

## Intentionally deferred

Still deferred:

- compact Phase-2 lineage queries;
- producer threading into witness-first/topology generation;
- generic family-generation block ancestry;
- frontier/D1 block ancestry;
- exact/reference reverse indexing;
- acquisition routing;
- new level generation;
- new family generation;
- historical reconstruction/backfill;
- any change to queue priority;
- any conflation of canonical `workSpent` with nodes, depth, wall time, or other progress telemetry.

## Validation limitation

The changed tests are wired into the repository's normal Node test suite. This session could not run
the checkout locally because the scratch execution environment could not resolve GitHub to clone the
branch. No claim is made that local `npm` validation ran here. Normal PR CI is therefore the
execution check for the new tests and existing repository finish line.

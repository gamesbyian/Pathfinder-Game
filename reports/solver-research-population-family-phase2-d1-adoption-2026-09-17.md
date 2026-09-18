# Solver research population + family integration: D1 adoption / Phase 2

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — D1 producer adoption + artifact-backed relation implementation
> **Decision:** the Phase-1 block contract now has a real producer shape in the active D1 workflow, and Phase 2 can compose capture/annotation artifacts read-only without a persistent block index.
> **Remaining gate:** execute the already-authorized D1 production-inert canary/pilot under `docs/solver-d1-production-inert-evidence-preflight.md`; scientific D1 conclusions remain unchanged until that run exists.

> **Evidence role:** forensic
> **Selection:** implementation follows the already-ranked D1 evidence gate; no D1 outcomes were generated or inspected in this change
> **Population identity:** prospective; each D1 capture seals its literal selected parents from canonical structural fingerprints
> **Selection history:** parent selection remains owned by the D1 preflight; this implementation does not select parents or generate levels
> **Inference scope:** infrastructure lineage/query behavior only; no claim about D1 opportunity prevalence, disagreement, or economics

## Scope

This follow-on starts from merged Phase 0/1 substrate (#1870) and does two bounded things:

1. make the current D1 production-inert capture/annotation pair the first producer to adopt the research-block contract;
2. implement Phase 2 as an explicit-artifact, read-only `research:relations` composition surface.

It does not execute the D1 scientific experiment, generate levels, alter solver ranking, add exact queries to production, or create a persistent research-block registry.

## D1 producer adoption

`scripts/stress/capture-d1-production-decisions.mjs` now records, before any D1 exact annotation:

- stable `questionId`, defaulting to `WS2-D1-PRODUCTION-INERT-OBSERVATION`;
- deterministic `blockId` derived from the sealed population unless `--block-id` is supplied;
- source regime as the literal corpus reference;
- source revision as SHA-256 of the corpus bytes;
- canonical v2 structural fingerprint for each literal selected parent;
- a population content identity derived from the aligned parent IDs/content identities;
- `evidenceRole: development` under the existing isolated-current-policy capture boundary;
- `independentUnit: parent-level`;
- source/capture artifact references;
- no generation ref, because D1 reuses existing parents;
- an empty consumption-event list at capture time.

Duplicate parent IDs are rejected before solver work.

The block builder lives in the existing D1 observation library so the metadata contract is unit-testable without running an expensive solver capture.

### Freeze / annotation boundary

`scripts/stress/annotate-d1-production-decisions.mjs` copies the exact `populationIdentity` and
`researchBlock` from the frozen capture.

It does not:

- mint a new block;
- change parent identity;
- append a consumption event merely because exact labels were computed;
- alter the existing capture-before-annotation scientific boundary.

A later decision/report that actually opens labelled outcomes is the correct point to append consumption.

## Population identity

`scripts/solver-research-block-lineage.mjs` now exposes
`researchPopulationIdentity(parentIds, parentContentIdentities)`.

The identity:

- requires aligned, non-empty parent/content arrays;
- rejects duplicate parent IDs;
- sorts the pair records before hashing, so identity is population-order invariant;
- uses the repository's canonical stable SHA-256 hashing primitive.

This is the D1 equivalent of the content-seal principle established in Phase 1. It is not a second corpus registry.

## Phase 2 query surface

`research:relations` now accepts repeatable explicit artifacts:

```bash
npm run research:relations -- \
  --artifact=<capture.json> \
  --artifact=<annotation.json> \
  --relation=researchBlocks
```

The relation builder reads supplied artifacts only. It does not crawl the repository or maintain an index.

Two relations are added when artifacts are supplied:

### `researchBlocks`

One row per unique `blockId`, including:

- question ID;
- population identity;
- source regime/revision;
- evidence role;
- independent unit;
- independent parent count;
- merged append-only consumption events;
- artifact refs;
- enrichment refs grouped as observation, exact, treatment, or generic artifact;
- optional conservative eligibility result.

Multiple artifacts carrying the same block are merged only when population identity and the non-consumption block definition agree. Conflicts fail loudly.

### `researchParents`

One row per block × parent, preserving:

- parent ID;
- canonical parent content identity;
- source/block/question ancestry;
- evidence role / independent-unit semantics;
- artifact/enrichment refs;
- optional block-level eligibility result.

Child rows never become additional independent support.

## Eligibility query

Callers may add:

```text
--eligibility-question=<question-id>
--eligibility-role=<development|confirmation|transfer>
--related-questions=<comma-separated-question-ids>
```

The eligibility question and related IDs must exist in the canonical research-question registry.

For confirmation/transfer, omitted lineage still yields unknown rather than a guessed untouched state. This preserves Phase-1 semantics.

## Tests

Existing test targets were extended rather than creating a parallel suite.

`test:solver-research-block-lineage` now covers:

- deterministic order-invariant population seals;
- duplicate-parent rejection.

`test:d1-production-observation` now covers:

- D1 block construction;
- D1 question/source/parent identity;
- empty capture-time consumption lineage;
- parent-level independence.

`test:research-relations` now covers paired capture/annotation fixtures:

- one block reconstructed from two artifacts;
- two independent parent rows;
- observation + exact enrichment refs;
- append-only consumption merge;
- confirmation ineligibility after matching consumption.

## What was deliberately not done

- No D1 scientific run was executed in this session.
- No level generation occurred.
- No confirmation/transfer role was asserted for D1's isolated-attempt capture.
- No global `fresh` or `spent` state was added.
- No persistent research-block JSON catalogue/index was created.
- No filesystem crawl/discovery convention was invented.
- No family, frontier, generic exact, or treatment producer was hardened yet.
- No acquisition router was implemented.
- No solver behavior changed.

## Phase 2 acceptance

The first useful composition chain is now representable by refs as:

```text
question
 -> D1 research block
 -> canonical parent
 -> frozen production decision observations
 -> offline exact annotation
```

The query layer can reconstruct that chain from explicitly supplied capture/annotation artifacts while preserving:

- one parent as one independent support unit;
- content identity;
- capture-before-label boundary;
- canonical `workSpent` inside the observation payload rather than converting node telemetry into work;
- unknown eligibility when question lineage is not supplied.

The remaining scientific step is execution, not more substrate design.

## Next plan work

After the first D1 canary/pilot artifact exists, the next integration phase should be Phase 3 producer hardening:

1. witness-first/topology locked-output lineage;
2. generic family-generation originating block refs;
3. human/editor block ancestry where prospectively frozen;
4. then Phase 4 reference threading into frontier/exact/treatment enrichments.

Do not start a generation campaign merely to exercise those producers. Harden them when a ranked question actually needs their route.

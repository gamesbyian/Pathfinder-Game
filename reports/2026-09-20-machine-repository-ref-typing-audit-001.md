# Machine repository-ref typing audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — traced path-like fields through question relations, promotion history, structured report closeouts and the data-asset registry after the session taxonomy identified prose-as-path failures as a repeated class.
> **Decision:** extract one small exact-repository-ref validator and wire only consumers whose fields are machine repository identities; preserve specialist existence/root rules at each consumer.
> **Remaining gate:** extend only when another machine field is actually consumed as a repository identity; do not convert descriptive prose fields merely because their names contain “ref” or “path”.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-20","decision":"share exact repository-ref syntax and apply it to machine-consumed question, promotion-evidence and closeout-artifact refs","remainingGate":"adopt opportunistically at additional machine path boundaries, with consumer-specific root/existence rules","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"machine fields currently consumed as repository identities","inferenceScope":"repository-reference correctness only; no scientific-result inference"},"claimRefs":[],"sourceArtifacts":["reports/2026-09-20-session-change-taxonomy-and-adjacent-opportunities-001.md","scripts/research-repository-ref-lib.mjs","scripts/research-question-relations-lib.mjs","scripts/research-status-index-lib.mjs","scripts/investigation-report-metadata.mjs","scripts/solver-research-data-assets-lib.mjs"],"prospective":{"expectation":"several machine path fields will independently validate only string-ness/prefix despite downstream file assumptions","surprise":"the data-asset registry was already strong; the weaker seams were question answer/constraint refs and promotion/report metadata","anomaly":null}} -->

## Concrete failure class

The repository already had one proven instance of this bug family: a machine authority field accepted prose mixed with paths, while downstream code treated it as one repository identity.

The adjacent audit therefore asked a narrower question than “which fields contain Ref/Path in their name?”:

> Which fields are later dereferenced, joined, indexed or treated as durable scientific provenance, yet validate only as arbitrary strings or prefix-shaped text?

## Existing strong boundary

`solver-research-data-assets-lib.mjs` is already a strong implementation:

- tracked locations must stay inside the repository;
- tracked files/directories must exist with the declared kind;
- authorities must resolve inside tracked repository state;
- the catalog document must exist;
- off-main assets have an explicit exceptional path.

This did not need another framework.

## Repaired boundaries

### Research question `answeredBy`

Previously, an entry passed when it merely started with `docs/`, `reports/`, `scripts/`, `data/` or `logs/`.

Thus text shaped like:

`reports/result.md plus commentary`

was syntactically a “repository path” despite not being one.

The question validator now uses the shared exact-ref rule. When called by the integration audit it additionally requires the referenced tracked file to exist.

### Path-valued `constrainedBy`

`constrainedBy` intentionally accepts either another question ID or a repository path. The path branch now receives the same exact-path and tracked-existence checks while question-ID semantics remain unchanged.

### Promotion decision-evidence refs

The promoted/default-ON ledger's structured `decisionEvidenceRef` now must resolve to a tracked file before entering the research status index. A malformed historical citation can no longer become machine promotion provenance merely because the Markdown table parser extracted a string.

### Structured closeout `sourceArtifacts`

The closeout constructor/parser now requires every source artifact to be a single exact repository-relative reference with an allowed repository root. This is syntax-only at the generic metadata layer because closeout construction may happen before an artifact is materialized; consumers that require current existence can impose that stronger condition.

## Shared primitive

`scripts/research-repository-ref-lib.mjs` owns only exact repository-reference mechanics:

- non-empty string;
- no surrounding/interior prose whitespace or Markdown backticks;
- repository-relative;
- no empty, dot or parent traversal segments;
- allowed top-level roots;
- no URL query/fragment syntax;
- optional tracked existence / file-kind check.

It does not own:

- which roots are legal for every domain;
- whether a reference may point off-main;
- glob/pattern semantics;
- semantic identity of the referenced object;
- relation type;
- whether a missing future output is permissible.

Those remain consumer decisions.

## Current-data check

The branch's current question registry contains 84 path-valued `answeredBy` / `constrainedBy` references. A direct comparison against the current Git tree found **0 missing targets**.

This is important because the new check is hardening a real weak contract rather than papering over already-broken current data.

Promotion-history refs with explicit tracked paths are likewise now checked by the status-index producer itself rather than by a one-off audit.

## Why this is an earned abstraction

Three independent machine boundaries now need exactly the same syntactic guarantee:

1. question evidence/constraint repository refs;
2. promotion decision-evidence refs;
3. structured report source-artifact refs.

The asset registry already independently implements the stronger repository containment/existence version of the same idea.

This clears the session's promotion rule for a small noun owner. It does **not** justify a universal URI/path/reference type.

## Adjacent non-findings

- Human Markdown hyperlinks remain discovery links, not scientific authority; making every link pass the machine-ref contract would confuse prose navigation with durable relations.
- Pattern/glob asset locations remain specialist asset-registry semantics.
- Question IDs, premise refs, measurement-opportunity IDs and claim IDs remain typed logical identifiers, not repository refs.
- A filename/path is still not a semantic content identity. Content hashes and research identities remain separate.

## Files changed

- `scripts/research-repository-ref-lib.mjs`
- `scripts/research-repository-ref-lib-node-test.mjs`
- `scripts/research-question-relations-lib.mjs`
- `scripts/research-integration-audit-lib.mjs`
- `scripts/research-status-index-lib.mjs`
- `scripts/investigation-report-metadata.mjs`
- `scripts/investigation-report-metadata-node-test.mjs`
- `package.json`

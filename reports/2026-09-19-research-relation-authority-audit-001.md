# Research relation-authority audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-19 — Current research relations, dossiers, durable evidence bundles, question registry edges, acquisition routing, asset graph, and integration checks were audited for relationships inferred from prose, path adjacency, naming, or unchecked references.
> **Decision:** prefer authored IDs/edges over lexical or positional inference whenever a relationship can affect scientific interpretation or research planning; label unavoidable inference as discovery/fallback and validate authored edges for existence and agreement.
> **Remaining gate:** reopen when another live consumer derives a research relationship from co-location, filename convention, lexical similarity, or an unchecked foreign key.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-19","decision":"prefer authored research edges over lexical/path inference and validate authored edges end to end","remainingGate":"reopen on another live inferred or unchecked research relationship","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"targeted current research-relation authority audit","inferenceScope":"research-system relationship ownership and referential integrity; not solver-efficacy evidence"},"claimRefs":[],"sourceArtifacts":["scripts/research-question-dossier-lib.mjs","scripts/research-relations-lib.mjs","scripts/research-integration-audit-lib.mjs","scripts/research-acquisition-preflight-lib.mjs","docs/solver-research-question-relations.json","docs/solver-research-data-assets.json","scripts/persist-decision-bearing-experiment-evidence.mjs"],"prospective":{"expectation":null,"surprise":null,"anomaly":null}} -->

## Lens

A research relationship can be weak even when both endpoints are perfectly structured.

The relevant failure modes are:

1. **lexical inference:** two records are treated as related because their text shares vocabulary;
2. **path adjacency:** two artifacts are treated as related because they share a directory or filename convention;
3. **unchecked foreign key:** an authored ID/path can silently dangle;
4. **one-way duplication:** two endpoints both describe the relation but disagreement is never checked;
5. **derived planning edge:** software chooses an evidence/acquisition route from prose rather than an authored relation.

The goal is not to eliminate discovery heuristics. It is to stop them from masquerading as authority.

## Findings and repairs

### 1. Queue/evidence -> question: authored edges beat lexical similarity

The question dossier previously used lexical `authorityMatch` behavior for queue rows, and lexical fallback for evidence, even though stronger relations already existed.

Now:

- queue-to-question joins use exact `questionRef`;
- authoritative evidence is the union of reports carrying exact structured `researchQuestion` IDs and reports named by the question's authored `answeredBy` paths;
- lexical evidence matches live in a separate `evidenceDiscoveryHints` collection;
- the dossier reports the authoritative evidence join mode (`stable-question-id`, `answeredBy-path`, or both);
- lexical queue/evidence similarity no longer competes with authored edges.

Experiment matches remain `lexical-discovery-only` because most retained opt-ins do not yet carry an authored research-question relation. No IDs were fabricated from historical prose.

### 2. Durable evidence bundle -> manifest: explicit edge beats sibling convention

`buildDurableEvidenceRelations` previously assumed every `bundle.json` belonged to a sibling file literally named `manifest.json`.

The durable bundle already retained a file record for that manifest, so co-location was unnecessary hidden authority.

Now:

- newly persisted bundles record `manifestStoredPath`;
- the current retained bundle has been migrated to carry that field;
- compatibility reading can recover the edge from the legacy bundle `files[]` manifest record;
- relation construction resolves the manifest through that authored stored path;
- path escape and missing-target conditions fail;
- there is no final "assume sibling manifest.json" fallback.

Directory layout remains storage. It no longer defines membership.

### 3. Question -> repository evidence/constraint paths: authored edges must resolve

The question registry currently contains dozens of path-valued `answeredBy` and `constrainedBy` edges.

The question contract now requires `answeredBy` to be a duplicate-free array of repository paths. The integration audit verifies that path-valued edges under `docs/`, `reports/`, `scripts/`, `data/`, or `logs/` actually exist.

A stale rename, typo, duplicate edge, or deleted report can no longer leave the scientific graph silently dangling.

### 4. Question `answeredBy` <-> structured report question: conditional bidirectional agreement

Legacy reports often do not carry a stable question tag, so one-way `answeredBy` edges remain valid.

But when both sides are structured:

- question A says report R answered it;
- report R carries `researchQuestion = B`;

then A and B must agree.

The integration audit now enforces that conditional bidirectional invariant.

This preserves legacy evidence without allowing two modern authorities to disagree silently.

### 5. Question -> acquisition need: authored for the deferred frontier

Acquisition preflight previously inferred the relation

`research question -> required acquisition mode`

by regexing `reopensOn`, `result`, and `constrains` prose.

That inference can choose among:

- reuse existing evidence;
- fresh independent parents;
- cross-source transfer;
- controlled-family acquisition;
- human/editor-origin material;
- telemetry/economics work;
- representation/candidate work.

Because that recommendation can steer which research machinery an agent uses, lexical inference is too weak for the live deferred frontier.

Every current `deferred-reopen` question now carries an explicit `acquisitionNeed`.

Question validation requires the field for deferred questions and validates the vocabulary.

Acquisition preflight now reports the basis of its decision:

- `eligible-existing-block`;
- `caller-request`;
- `structured-question-field`;
- `lexical-question-text`.

Lexical inference remains available for closed/legacy questions as discovery support. It is no longer the implicit owner for deferred questions.

### 6. Asset graph: explicit IDs now get foreign-key integrity

The data-asset registry already has explicit `relatedAssets` IDs and authored multi-asset relationships.

The integration audit now checks:

- asset IDs are unique;
- every `relatedAssets` target exists;
- relationship asset IDs continue to resolve;
- resource-contract audit asset IDs continue to resolve.

The graph is allowed to be descriptive. It is no longer allowed to dangle silently.

### 7. Report -> linked current docs: hyperlink is discovery, not authority

The research status index previously called every current `docs/` hyperlink found in a report an `authority`.

A hyperlink does not establish ownership. Reports routinely link current docs for context, constraints, or navigation.

The index now exposes:

- `linkedCurrentDocs`;
- `authorityRelation: hyperlink-discovery-only`.

The legacy `authorities` field remains for compatibility, but new consumers have an explicit warning that the relation is navigational/discovery-only rather than scientific or execution authority.

### 8. Promotion decision -> runtime default: minimal provenance edge earned

The earlier authority audit deliberately deferred a generic production-realization object, but this relation recurred across many promoted mechanisms.

The promoted/default-ON ledger now carries a primary `Decision evidence ref` column.

The status index/research-relations model exposes each listed promotion as:

- `promotionId`;
- one or more runtime mechanism IDs;
- optional primary decision-evidence report;
- promoted disposition.

Validation checks that:

- each listed mechanism is a live feature key;
- it is not still in `OPT_IN_FEATURES`;
- any claimed decision-evidence report exists.

Rows whose historical prose does not identify a defensible primary licensing report remain `—`. No report is inferred merely to make the graph complete.

This is the smallest useful decision-to-realization provenance link. Runtime polarity and behavior remain owned by code/tests.

### 9. Report -> artifact: authored provenance separated from discovered references

The status index previously collapsed:

- structured closeout `sourceArtifacts`;
- linked `data/`, `logs/`, or `reports/` paths;
- inline backticked artifact-looking paths

into one undifferentiated `artifacts` list.

That erased the difference between authored provenance and incidental navigation.

The index now exposes:

- `sourceArtifacts` for structured closeout provenance;
- `linkedArtifacts` for hyperlink/inline discovery;
- `artifactRelation` describing the relation basis;
- legacy `artifacts` only as a compatibility union.

If the same path appears both as an authored source and in prose, the stronger authored edge wins and it is not duplicated as a weaker discovery link.

### 10. Research-block consumption lineage: structured does not mean referentially valid

Research-block consumption events already carry structured:

- `questionId`;
- `decisionRef`;
- scope kind/id;
- evidence role;
- conditioning and opened outcome kinds.

The local block validator checked shape but could not resolve repository/global foreign keys.

The integration audit now additionally verifies:

- consumed question IDs exist;
- repository-shaped decision refs exist;
- block-scoped events name the block that contains them;
- parent-scoped events name a parent in that block.

Logical/non-repository decision refs remain allowed, and family-scope IDs are not guessed against a registry that does not exist.

### 11. Question dossier answer versus constraint edges: preserve relation type

The dossier previously exposed one `evidenceRefs` union containing both:

- reports/docs that answered the question;
- paths that merely constrain the question.

That erased relation semantics.

The dossier now exposes:

- `answerRefs`;
- `constraintRefs`;
- legacy `evidenceRefs` only as a compatibility union, explicitly labelled as such.

### 12. Calibration edges: reciprocal relation, enforced both ways

The registry uses `calibratedBy` and `calibrates` as reciprocal views of one relation.

A hostile graph check found one missing inverse edge:

`WS2-HOMOTOPY-COMPLETION-CLASSES calibratedBy WS2-OPEN-PATH-TOPOLOGY-SIGNATURE`

without the corresponding `calibrates` edge.

The inverse has been restored and registry validation now requires reciprocity.

By contrast, `triggeredBy` and `implies` are **not** strict inverses in the live graph and remain deliberately asymmetric.

### 13. Resource-contract audits: validate only real foreign keys

The resource-contract audit registry crosses into:

- research asset IDs;
- required audited-resource IDs;
- audit-authority reports;
- historical-claim blast-radius reports;
- some repository-shaped producer-authority paths.

The integration audit now validates those actual foreign keys and repository paths.

Descriptive producer-authority strings remain prose. They are not coerced into fake path relations.

### 14. Asset validation ownership: reuse the real owner

During this pass the integration audit briefly duplicated some asset-registry checks.

That was corrected.

`solver-research-data-assets-lib.mjs` remains the owning validator for asset IDs, related assets, relationship targets, tracked locations and authority paths. The integration audit consumes that validator and adds only genuinely cross-registry checks.

This is the same architectural rule at the validator level: do not build connective-tissue copies of an existing bone.

## Relationships deliberately left inferred or descriptive

### Experiment -> question

Most retained default-OFF experiments do not currently carry an authored stable question relation.

The dossier therefore labels experiment matches `lexical-discovery-only`.

Do not backfill question IDs from prose archaeology solely to eliminate that label. Add the edge prospectively when a real experiment is opened for a tracked question, or when another consumer needs the relationship.

### Legacy evidence report -> question

When no structured question tag exists in the report, the question registry's explicit `answeredBy` path remains the authority.

Do not rewrite old reports merely for symmetry.

### Artifact discovery by filename

Research artifact discovery scans candidate locations/files such as manifests, then accepts an artifact only when its embedded research-block contract supplies the actual relationship semantics.

Filename/path is discovery, not membership authority. This remains appropriate.

### Documentation links

Hyperlinks and lexical report links are useful navigation/discovery surfaces. They should not become scientific edges merely because they occur near relevant prose.

## Relation-quality ladder

Use the strongest available form:

1. **authored stable ID/edge, validated at both ends**;
2. **authored one-way ID/path edge with referential integrity**;
3. **embedded contract identity discovered from candidate files**;
4. **explicitly labeled lexical/discovery fallback**;
5. **unlabeled lexical/path/naming inference** — fix this when it affects interpretation or planning.

Do not promote level 4 to level 1 by guessing the missing relation. The absence of an authored edge is itself useful information.

## Standing rule

When a tool needs to decide that A is related to B:

- first ask whether either endpoint already carries a stable relation;
- if yes, use it and validate it;
- if both carry the relation, check agreement;
- if no stable relation exists, label lexical/path inference as discovery;
- author a new relation prospectively only when a real consumer needs it;
- do not infer historical graph edges merely to make the graph look complete.

This is the relationship analogue of the prose-authority rule: **discovery heuristics may find candidates; they do not own truth.**

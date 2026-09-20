# Compound identity and delimiter audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — followed the session's comma-bearing C0 population failure into population combiners, mixed-corpus sweep aggregation, exact-reference case identity and persisted id-list boundaries.
> **Decision:** delimiter-safe identity transport is now centralized enough for current research population paths; one additional mixed-corpus ambiguity was found and repaired by using the shared JSON-tuple scoped identity codec consistently for deduplication, completeness and hashing.
> **Remaining gate:** keep display/CLI delimiters out of semantic identity domains prospectively; revisit only when another persisted boundary parses meaning back out of a display id or delimited list.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-20","decision":"repair the remaining mixed-corpus flattening seam and centralize scoped identity encoding under the population-identity owner","remainingGate":"apply prospectively when a persisted/scientific identity crosses a text boundary; ordinary CLI/display delimiters are not in scope","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"research population/case identity and sweep-combination boundaries implicated by prior delimiter corruption","inferenceScope":"identity transport correctness only"},"claimRefs":[],"sourceArtifacts":["reports/2026-09-20-session-change-taxonomy-and-adjacent-opportunities-001.md","reports/2026-09-19-lane-a-c0-signature-collision-result-001.md","scripts/research-population-identity-lib.mjs","scripts/combine-population-integrity.mjs","scripts/combine-solver-sweep-reports.mjs","scripts/cpsat-prefix-reference-integrity.mjs"],"prospective":{"expectation":"most remaining split/join calls will be CLI/display formatting rather than semantic identity","surprise":"mixed-corpus sweep combination still flattened corpus+level identity with a colon even after the generic multi-population combiner had moved its canonical identity to JSON tuples","anomaly":null}} -->

## Starting failure

Lane A C0 exposed a concrete corruption mode:

- a dispatched scientific case id legitimately embedded commas in its cut-cell component;
- the expected-id reader split on commas as well as newlines;
- one identity became several fragments;
- fragments collided;
- the combine step reported false duplicate population identities.

That was already fixed by moving persisted id-list parsing to one-identity-per-line semantics.

The adjacent question was whether the same design error survived elsewhere under a different delimiter.

## Mixed-corpus sweep seam

`combine-solver-sweep-reports.mjs` still formed mixed-corpus keys as:

`<corpus>:<level-id>`

for duplicate detection, while population hashing/completeness used unscoped or differently scoped values.

This has the classic ambiguity:

- scope = `scope:a`, id = `b`
- scope = `scope`, id = `a:b`

Both flatten to `scope:a:b`.

The defect was latent because current ordinary corpus names/level IDs rarely inhabit adversarial shapes, but the identity contract itself was unsound.

## Repair

The canonical scoped encoder now lives in `research-population-identity-lib.mjs`:

`encodeResearchScopedIdentity(scope, subjectId) -> JSON.stringify([scope, subjectId])`

The existing multi-population combiner re-exports that owner for compatibility instead of carrying a second implementation.

Mixed-corpus sweep combination now uses the same tuple identity for:

- duplicate level-id detection;
- duplicate position detection;
- observed population identities;
- expected population identities sourced from per-report metadata;
- population integrity;
- population hashing.

The population descriptor records `identityCodec: json-tuple-v1`.

When an external `--expected-ids` file is supplied together with `--allow-mixed-corpora`, each line must itself be one valid two-string JSON tuple. The combiner refuses to guess corpus scope from a flattened legacy string.

## Regression coverage

The mixed-corpus test now includes the adversarial pair:

- `["scope:a","b"]`
- `["scope","a:b"]`

and requires both to remain distinct, complete population members.

A legacy expected-id file containing only `scope:a:b` is rejected in mixed-corpus mode.

The shared population-identity tests also cover comma and colon placement inside both tuple components.

## Existing multi-population compatibility fields

`combine-population-integrity.mjs` retains legacy human-readable fields such as:

- `expectedIds: ["c1:a", ...]`;
- `missingIds`;
- `unexpectedIds`.

Those are compatibility/display projections only.

The scientific identity is explicitly:

- `canonicalExpectedIds`;
- `canonicalDuplicateIds`;
- `canonicalUnexpectedIds`;
- `canonicalMissingIds`;
- `identityCodec = json-tuple-v1`;
- `populationIdentityHash` computed only from canonical tuple identities.

The output now carries an `identityFields` note making that split machine-visible rather than relying on readers to infer it.

## What was *not* changed

Many `.split()` / `.join()` calls are harmless:

- CLI `--key=value` parsing that rejoins the value;
- comma-separated lists of filenames explicitly defined as CLI syntax;
- Markdown summaries;
- display lists of missing/duplicate IDs;
- shell argument assembly.

The rule is not “never use delimiters.”

The rule is:

> if downstream code needs to recover semantic components or establish scientific identity/equality, use structure or an owned codec rather than delimiter placement.

## Current boundary

Current research population transport now has three deliberate forms:

1. **one identity per line** for already-atomic opaque identities;
2. **JSON tuple codec** for scoped/compound population identities;
3. **structured object fields** when individual semantic components remain decision-bearing.

Display IDs may still contain separators, but downstream scientific code must not parse those separators back into meaning unless it is an explicitly quarantined legacy reader.

## Further trigger

Reopen this audit only if one of these appears:

- a persisted id list splits on comma/colon/pipe;
- a workflow flattens multiple semantic identity fields into one string and later recovers them;
- a display filename/case id becomes the sole scientific join key;
- two modules invent separate encodings for the same compound identity domain.

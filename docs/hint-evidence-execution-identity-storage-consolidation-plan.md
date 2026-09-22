# Hint evidence, execution identity, and storage consolidation plan

> **Status:** planned
>
> **Date:** 2026-09-22
>
> **Motivation:** the hint-provenance repeat-run determinism audit in
> [`reports/2026-09-22-hint-provenance-repeat-run-determinism-audit.md`](../reports/2026-09-22-hint-provenance-repeat-run-determinism-audit.md)
> found zero demonstrated same-effective-input/different-solution cases in the reconstructable
> population, but exposed a real evidence-model gap: persisted hint provenance does not retain enough
> run-level effective configuration to distinguish some control/treatment discoveries mechanically.
> The same review also found substantial storage redundancy in the canonical hint corpus and several
> parallel persistence/configuration paths that should be consolidated rather than permanently
> worked around.
>
> **Pre-implementation empirical audit:** [`reports/2026-09-22-hint-evidence-consolidation-preimplementation-audit-001.md`](../reports/2026-09-22-hint-evidence-consolidation-preimplementation-audit-001.md) verifies request/backend semantics, provenance missingness, source-run reconstructability, producer observation sufficiency, stale writers, and Firestore retention behavior.
>
> **Structured implementation inventories:** [`docs/hint-evidence-consolidation-inventory.json`](hint-evidence-consolidation-inventory.json) and [`docs/solver-request-semantics-inventory.json`](solver-request-semantics-inventory.json).
>
> **Primary goal:** make solver evidence smaller, more queryable, more replay-/audit-friendly, and
> harder to record incompletely, without losing semantic information, breaking historical data,
> weakening level-blindness, or coupling offline evidence to production routing.

## 1. Outcomes

A complete implementation should leave the repository with:

1. one canonical, versioned definition of behavior-affecting solver configuration;
2. explicit and separate identities for solver input, execution protocol, source run, provenance
   event, path, population, and scheduler action;
3. one canonical GitHub Actions evidence-ingestion lane for solver discoveries;
4. one canonical hint-store API/codec shared by Node tooling and the browser;
5. lossless, backwards-readable hint artifact schema v4 with sparse and optionally interned storage;
6. stronger provenance that binds a solver discovery to its effective execution context without
   copying full experiment telemetry into every hint;
7. research/query surfaces that expose whether an event is fully effective-input-reconstructable;
8. maintained workflows that no longer use modified canonical hint files as their primary
   cross-job/run transport format;
9. migration tooling and tests proving old and new artifacts are semantically equivalent;
10. a smaller, agent-friendlier canonical hint corpus and lightweight indexes that avoid opening
    multi-megabyte files for routine questions.

This plan does **not** authorize new solver behavior, level-specific production steering, broad rich
telemetry retention, or rewriting uncertain historical evidence as known.

## 2. Current architecture and why it should change

### 2.1 Canonical hint semantics are already centralized reasonably well

The semantic in-memory boundary is currently:

- `Hint = { path, provenance }`;
- `HintProvenanceEntry = { solver, search, context, foundAt }`;
- normalization and legacy upgrading in `modules/domain/hint-runtime.mjs`;
- typed wrappers in `modules/domain/hint-types.ts`;
- shared file/corpus I/O in `scripts/level-data-io.mjs`;
- semantic merge/deduplication through `mergeHints()` and
  `provenanceEventIdentity()`.

That shape should be preserved. New compact storage must expand back into the same semantic model
before ordinary solver/research/application consumers see it.

### 2.2 Effective configuration is currently producer-local

At least two major sweep families independently construct an `effectiveConfig` and
`effectiveConfigDigest`:

- `scripts/level-blind-capability-sweep.mjs`;
- `scripts/portfolio-solve-sweep.mjs`.

Those payloads are useful but do not have one shared semantic contract. They can mix:

- behavior-affecting solver options;
- scheduler/work-budget semantics;
- level-blind/history-aware execution mode;
- corpus/population identity;
- experiment context;
- output/diagnostic configuration.

That makes them suitable for some run-level comparisons but too coarse or differently scoped for a
universal “same effective solver inputs?” test.

The 2026-09-22 determinism audit demonstrated the consequence: provenance groups that looked
identical at the stored attempt level were actually different A/B arms because the run-level
ablation dimension was absent from the hint event.

### 2.3 There are two primary GHA hint-persistence routes

#### Direct canonical-file transport

Several workflows run solver tools with `--save-hints`, modify
`data/**/hints*/<id>.json` inside shard checkouts, stage those changed files, upload them as
artifacts, and later copy/merge them into the canonical store.

Examples include stress refresh, production replay, high-budget sweeps, technique census, CP-SAT
harvest, and diagnostics.

#### Report reconstruction

Other workflows are deliberately artifact-only. They upload solver result/report artifacts and the
central `Harvest solver hint evidence` workflow later reconstructs canonical hint provenance via:

- `scripts/harvest-level-blind-report-hints.mjs`;
- `scripts/harvest-isolated-report-hints.mjs`.

The central harvester also consumes direct hint files via
`scripts/merge-hint-artifacts.mjs`.

These routes do not carry identical information at the point provenance is constructed.
`merge-hint-artifacts.mjs` receives source-run metadata but, for successfully parsed incoming hint
files, generally trusts the provenance already embedded by the shard. Report harvesters reconstruct
provenance later but currently do not receive one canonical effective-execution envelope either.

This is an architectural inconsistency. The long-term target is one evidence-ingestion lane rather
than preserving both as equal first-class paths.

### 2.4 Hint storage is much larger than level storage

The principal tracked hint stores are roughly hundreds of megabytes in aggregate, with provenance
objects dominating many large files. A representative large artifact can contain many repeated
solver/config and context objects, while paths themselves are already compact packed-key arrays.

By contrast, `data/levels.json` is small. Its repeated level-provenance histories are a genuine
redundancy but not the first-order storage problem.

Therefore this program should optimize hint evidence first and avoid risky level-format surgery
until hint architecture is stable.

### 2.5 Browser and Node readers currently differ

Node tools normally load hints through `scripts/level-data-io.mjs`.

The browser loads `data/hints/<id>.json` directly through
`modules/data-asset-loaders.ts`, currently extracting `parsed.hints` and passing them through
`upgradeLegacyHints()`.

Therefore an interned/normalized v4 cannot live only inside `level-data-io.mjs`. A compact storage
schema must have a browser-safe shared decoder, or the shipped game will fail to read the new
artifacts.

## 3. Target identity model

Do not create one giant identity hash. Different identities answer different research questions and
must remain separate.

### 3.1 Existing identities to preserve

- **path identity:** `hintPathSignature(path)`;
- **provenance event identity:** `provenanceEventIdentity(entry)`, used for persistence/merge
  deduplication;
- **attempt configuration identity:** canonical grammar in
  `modules/solver/attempt-identity.mjs`;
- **scheduler/action identity:** canonical stage + attempt config + relevant seed salt;
- **level revision identity:** structural fingerprint from `modules/domain/level-fingerprint.ts`;
- **population identities:** existing corpus/selection/resource-specific owners.

Do not silently redefine `provenanceEventIdentity()` to mean deterministic replay identity. Its
persistence semantics and historical dedupe behavior are distinct.

### 3.2 New canonical effective solver configuration

Add a shared owner for a versioned `EffectiveSolverConfig` projection.

It should contain every behavior-affecting solver option that can change the search trajectory or
allocation, normalized through existing semantic owners wherever possible, including:

- canonical normalized ablation configuration;
- scheduler mode;
- static-portfolio configuration when applicable;
- strict-total-work behavior;
- canonical base work/node allocations and relevant override semantics;
- behavior-affecting retry/reserve/repair/search overrides;
- other solver options demonstrated to affect candidate ordering, attempt availability, budgets, or
  traversal.

It should exclude:

- corpus hash/population identity;
- workflow/run ID;
- output filenames;
- diagnostic-only observer configuration that is proven search-inert;
- artifact transport details;
- host/concurrency details already covered by stronger determinism contracts unless they become
  semantically relevant.

Create a versioned semantic digest from this canonical projection. Reuse shared stable/canonical
serialization instead of producer-local `stableStringify()` implementations.

### 3.3 Execution protocol

Define a second canonical projection for the execution protocol:

- effective solver configuration identity;
- solver mode such as level-blind/history-aware;
- scheduler/work semantics not already represented in effective solver config;
- named experimental treatment/arm where needed;
- other meaning-changing execution rules.

This identity answers “are these observations protocol-comparable?” rather than “are the solver
inputs byte-for-byte equivalent?”.

### 3.4 Run envelope

Define a bounded source/run envelope:

- immutable solver commit/ref;
- source workflow/tool family;
- source run ID and run attempt when available;
- execution protocol identity;
- effective solver config identity;
- population/corpus identity or hash;
- experiment/cohort/arm identity when applicable;
- source-run lineage for recombined runs.

The run envelope is identity glue, not a telemetry dump. Do not copy full pre-win attempt sequences,
rich traces, or entire experiment manifests into every hint event.

### 3.5 Effective solver input identity

Add a shared derived helper for determinism/replay analysis, conceptually:

`effectiveSolverInputIdentity(entry)`

Its structured input should include only dimensions that can make two solver discoveries different
effective attempts, such as:

- level structural revision;
- solver version;
- canonical action/config identity;
- forcing/gate dimensions;
- relevant work/node allocation;
- seed/salt when meaningful;
- effective solver configuration identity.

Prefer returning structured availability information rather than a naked hash, for example:

- `reconstructable: true|false`;
- `identity` when complete;
- `missingDimensions` when incomplete.

Historical unknowns remain unknown.

## 4. Target hint provenance model

Extend the semantic provenance model additively with a bounded execution/run binding.

The exact final field names should be chosen during implementation, but the semantic shape should
support:

- effective solver configuration identity;
- execution protocol identity;
- source run identity;
- optional experiment arm/cohort identity;
- source-run lineage when an observation comes from a recombined artifact.

Non-solver producers are not required to invent solver-run semantics. Human paths, construction
witnesses, transformed family witnesses, and external solvers may legitimately leave Pathfinder
effective-config fields unavailable while retaining their own producer identity.

`makeProvenanceEntry()`, current-solve provenance construction, historical-result upgrading, and
query/replay helpers should all share this model.

## 5. Canonical GHA evidence-ingestion lane

### 5.1 Long-term target

Maintained solver workflows should transport **solved observations plus execution envelopes**, not
modified canonical hint files.

Target flow:

```
solver execution
  -> solved observation + canonical execution/run envelope
  -> shard artifact uploaded even on partial failure where useful
  -> Harvest solver hint evidence
  -> source/run compatibility checks
  -> referee validation
  -> canonical provenance construction
  -> semantic merge/dedupe
  -> canonical HintStore writer
  -> data/**/hints*/<id>.json
```

The central harvester becomes the single GitHub Actions authority allowed to turn solver-run
observations into canonical tracked hint evidence.

### 5.2 Preserve partial-failure evidence

Current workflows intentionally retain useful discoveries from timed-out/failed/cancelled shard
runs. Consolidation must preserve this.

The standardized observation artifact therefore needs to be emitted incrementally or at least
uploaded through failure-tolerant steps. Do not make evidence durability depend on the final combined
job succeeding.

### 5.3 Transitional dual path

Do not delete direct hint-file transport immediately.

Migration stages:

1. make direct and report-derived routes emit/retain the same execution envelope;
2. teach the central harvester to reconstruct canonical hints solely from standardized observations;
3. in representative workflows, compare report-derived canonical additions against the direct-file
   route and fail on semantic disagreement;
4. once parity is demonstrated, remove shard-level canonical hint mutation from that workflow;
5. repeat by workflow family;
6. retain `merge-hint-artifacts.mjs` as a historical/mixed-era compatibility importer.

### 5.4 Workflow families to audit/migrate

At minimum inspect and explicitly classify:

- solver stress-corpus refresh;
- history-aware production replay baseline;
- high-budget unsolved sweep;
- level-blind targeted sweep;
- routing/sample A/B workflows;
- residual/broad/static-portfolio confirmation;
- method probe;
- technique census;
- CP-SAT hint harvest;
- diagnostics/hint capture;
- combined/reconciled sweep runs;
- any workflow listed by `harvest-solver-evidence.yml`;
- future workflows registered in the solver workflow lifecycle ledger.

Each maintained harvestable workflow should either:

- emit the canonical observation + envelope contract; or
- explicitly declare that it cannot yield canonical solver hint evidence.

Enforce this mechanically through workflow/contract checks rather than prose convention alone.

## 6. Shared hint artifact codec and HintStore boundary

### 6.1 Shared codec

Create a browser-safe and Node-safe artifact codec in a neutral module location, conceptually:

- `decodeHintArtifact(parsed) -> Hint[]`;
- `encodeHintArtifact(records, options?) -> persisted artifact object`.

It must read:

- historical bare path arrays;
- legacy/transitional hint metadata forms;
- schema v2;
- schema v3;
- schema v4.

Update both:

- `scripts/level-data-io.mjs`;
- `modules/data-asset-loaders.ts`;

to use the shared decoder.

No ordinary research/application consumer should directly reason about v4 table references.

### 6.2 Canonical writer surface

Node-side HintStore/file I/O remains responsible for filesystem concerns:

- hint directory resolution;
- per-level file naming;
- changed-file write sets;
- canonical formatting;
- atomic/idempotent writes where needed.

The codec owns storage semantics, not paths.

### 6.3 Storage schema v4

Keep JSON and the existing one-record-per-line diff-friendly outer formatting.

Do not adopt YAML, CBOR, MessagePack, SQLite, Parquet, or checked-in compressed binary artifacts as
the canonical source format in this program.

Schema v4 should support two lossless physical forms behind the same decoder:

#### Sparse inline

Omit values whose schema-defined semantic default is known, such as selected explicit
`null`/`false` fields, and reconstruct them during decode.

Do not omit values whose absence is semantically “unknown” rather than the canonical default.

#### Interned tables

For files where it reduces bytes, allow repeated structures to be stored once and referenced from
events. Strong candidates are:

- solver configurations;
- contexts;
- run/execution envelopes.

Search observations are likely higher-cardinality and should remain inline unless corpus
measurement proves interning useful.

The encoder may deterministically serialize candidate representations and choose the smaller
canonical form. Avoid arbitrary file-size thresholds when direct byte comparison is cheap.

Keep human-readable semantic field names. Do not trade maintainability for tiny key-name savings.

### 6.4 Paths

Hint paths are already compact packed-key integer arrays and should remain that way initially.

Do not add directional/delta/path compression until provenance compaction is implemented and
measured. Portal transitions and self-crossing semantics make clever path encodings higher-risk and
the likely savings are much smaller.

## 7. Producer inventory and remediation

All producers must be reviewed for one of three statuses:

1. produces canonical `Hint` semantics through approved owners;
2. produces a standardized observation to be harvested later;
3. noncanonical/legacy producer requiring migration or quarantine.

Important producers include:

- `scripts/hint-capture-lib.mjs`;
- level-blind capability sweep;
- portfolio solve sweep;
- report harvesters;
- isolated/census harvesters;
- hint workbench;
- hint corpus expansion;
- complete enumeration;
- hint diversification/candidate tools;
- CP-SAT/external reference harvesting;
- family parent replay;
- family generation/witness propagation;
- published-level import;
- browser variety search;
- human submission/review flows;
- Firestore local-level hint persistence.

Audit any tool that mutates `.hints` directly before a persistent write. `hintRecords` is the
canonical persisted semantic state and `.hints` is a derived compatibility projection.

Current regressions already confirmed by the pre-implementation audit include:

- `scripts/hint-candidate-search.mjs --write-levels`, which imports removed corpus I/O helpers and mutates bare `.hints`;
- `scripts/stress/cpsat-hint-harvest.mjs` / its sweep path, which also imports the removed corpus I/O facade and manually synchronizes `hintRecords` with derived `.hints`.

Re-run the maintained-writer census rather than assuming these are the only residues.

Add a guard/test that prevents new persistent writers from mutating only the bare-path projection.

## 8. Consumer inventory and compatibility

### 8.1 Browser/application

Must continue to work without knowing v4 internals:

- initial level loading;
- lazy per-level hint loading;
- Developer-mode corpus switching;
- hint display/selection/heatmaps;
- submission and review flows;
- Firestore supplemental hints.

### 8.2 Node validation and generation

Review at least:

- level/hint validity checks;
- hint path referee validation;
- heatmap generation;
- family generators/replayers;
- stress witness validation;
- import tooling;
- corpus/level utilities.

### 8.3 Research consumers

Maintain semantic behavior for:

- hint query;
- provenance source taxonomy;
- provenance applicability/classes;
- hint discovery replayability;
- termination semantics;
- hint cost drift;
- provenance evidence reports;
- solution profile generation;
- hint discovery process;
- hint/failure process joins;
- capability/research queries that consume hint provenance.

These should consume expanded semantic events, never v4 storage tables.

## 9. Research-system integration

### 9.1 Determinism audit from PR #1996

The reusable audit from PR #1996 becomes a regression oracle for this program.

After canonical effective-input identity exists:

- replace bespoke recorded-input grouping with the shared identity helper;
- retain conservative “recorded-input collision” language for incomplete historical events;
- require the fifteen known 2026-09-09 control/treatment collisions to separate automatically if
  their run envelopes are mechanically backfilled;
- otherwise require them to remain explicitly incomplete, not falsely equal;
- preserve the finding that the reconstructable current population contains zero demonstrated
  same-effective-input/different-path cases unless new evidence changes it.

### 9.2 Replayability semantics

Do not silently redefine existing historical replayability categories.

Add a stronger derived dimension such as effective-input reconstructability if needed. Historical
events may remain configuration-reconstructable under the older contract while being incomplete for
whole effective-input equality.

### 9.3 Asset registry and queryability

Update the structured research asset registry and derived prose so hint provenance advertises:

- effective solver config identity;
- execution protocol/run binding;
- effective-input reconstructability;
- distinct event-vs-input identity;
- source-run lineage where available.

The registry remains the structured authority.

### 9.4 Lightweight hint-store index

Generate a compact per-level/store index so routine agent queries do not need to open multi-megabyte
hint files.

Candidate fields:

- level ID;
- artifact bytes/schema version;
- hint count;
- provenance event count;
- solver IDs;
- solver version count/range;
- techniques/retry tiers;
- source/origin classes;
- replay/effective-input reconstructability counts;
- run-envelope coverage;
- level-revision coverage;
- work/node summary statistics.

This index is derived and rebuildable. It must not become a competing provenance authority.

## 10. Historical migration and backfill

### 10.1 Read old, write new

All historical v1/v2/v3 hint artifacts remain readable indefinitely through compatibility adapters.

Once v4 is adopted, normal canonical writers should emit v4 only.

### 10.2 Do not fabricate history

Missing effective configuration, run identity, legacy booleans, or execution semantics remain
unknown unless a durable source can prove them.

Do not infer a treatment from filenames, timestamps, or present-day defaults and persist it as fact.

### 10.3 September 9 determinism collisions

The fifteen #1996 collisions are candidates for targeted backfill only if the event-to-source-run
mapping is mechanically provable from retained source artifacts/manifests/harvest lineage.

A legitimate backfill should record enough provenance to distinguish that the information was
recovered after the original discovery rather than falsely implying it was recorded at discovery
time, if the model needs that distinction.

If proof is insufficient, leave the events incomplete and keep the audit reconciliation report as
the forensic explanation.

## 11. Levels: bounded follow-up, not the first migration

### 11.1 Safe near-term cleanup

After hint architecture stabilizes, measure sparse omission of level fields whose existing codec
already normalizes absence safely, especially empty optional arrays/default metadata.

Keep:

- human-readable `{x,y}` coordinates;
- explicit challenge values where zero is meaningful;
- stable persistent IDs.

### 11.2 Defer level-provenance interning/sidecars

Level provenance is redundant but the absolute storage saving is small and many corpus consumers
still parse raw level JSON directly.

Do not introduce corpus-level provenance tables or sidecars until a shared level-corpus codec owns
all physical representations.

If that later work is justified, first migrate raw consumers such as corpus query/planning/probe
loaders through the codec, then change the physical representation.

## 12. Tests and acceptance gates

Before migrating tracked data, establish fixtures for representative:

- bare legacy hints;
- v2 artifacts;
- v3 artifacts;
- small family/witness artifacts;
- large multi-provenance artifacts;
- current Pathfinder solver events;
- isolated/census events;
- external solver events;
- human/witness events;
- combined-source-run events;
- incomplete historical provenance.

Required invariants:

1. v1/v2/v3/v4 decode to the canonical semantic `Hint[]` expected for that source;
2. v4 encode/decode preserves every path exactly;
3. v4 encode/decode preserves every provenance semantic field exactly;
4. sparse omitted defaults re-expand correctly;
5. interned and sparse-inline encodings decode identically;
6. encoding is deterministic and byte-stable;
7. migration is idempotent;
8. `provenanceEventIdentity()` is unchanged by storage round-trip;
9. effective-input identity is unchanged by storage round-trip;
10. source taxonomy/applicability/replay classifications are unchanged unless deliberately extended;
11. referee validation results are unchanged;
12. browser and Node decoders agree;
13. mixed v3/v4 incoming artifacts merge correctly;
14. direct and observation-harvest paths produce the same semantic additions during transition;
15. workflow partial-failure evidence remains recoverable;
16. #1996 determinism audit classifications improve mechanically and do not create false
    nondeterminism;
17. level-blindness tests remain green;
18. no storage-derived history becomes a production solver input.

## 13. Repository hardening

Add a storage-boundary/ownership check that flags new code which:

- directly parses canonical hint artifacts instead of using the shared decoder;
- writes under canonical hint directories outside approved store/migration owners;
- persists bare `.hints` mutations without canonical `hintRecords`;
- creates a new effective-config/protocol hash instead of using the shared identity owner.

Allow explicit compatibility/migration exemptions with comments where necessary.

This turns the architecture into an enforceable repository invariant instead of relying on future
agents remembering this plan.

## 13.1 Parallel-dialect audit findings to absorb before implementation

A follow-up audit against the repository's existing protocol/schema-contraction authority found
additional seams directly relevant to this program. These are not merely compatibility trivia.
Where they represent current divergence, this plan should close them or deliberately classify them
as permanent external/archive adapters.

### A. Hint mutable authority has regressed in one maintained tool

`docs/solver-protocol-schema-contraction.json` marks the `.hints` versus `.hintRecords` seam
closed, with `setLevelHintRecords()` as the sole current mutation boundary.

However `scripts/hint-candidate-search.mjs` still:

- imports removed `readLevelsWithHints` / `writeLevelsWithHints` APIs from
  `scripts/level-data-io.mjs`;
- mutates `raw.hints` directly under `--write-levels`;
- never constructs provenance-rich canonical records for those accepted candidates.

This means the supported targeted-candidate tool is both stale against the current I/O contract and
a violation of the claimed single mutable authority.

Treat this as a current regression, not historical compatibility. Repair it early and add the
storage-boundary check proposed above so the seam cannot silently reopen again.

### B. Canonical provenance normalization currently has contradictory missingness semantics

The evidence doctrine says missing legacy context remains unknown, especially absent capability
booleans such as `isolatedTechnique`.

Current `upgradeProvenanceEntry()` for nested records nevertheless fills absent:

- `usedExistingHints`;
- `hintGuided`;
- `isolatedTechnique`;

with `false`.

At the same time it does not fully fill all missing solver/search fields to the explicit-null shape
produced by `makeProvenanceEntry()`.

Therefore two records may both be described as canonical expanded provenance while using different
rules for omission, null, false, and historical unknown. This also conflicts with the September 11
provenance audit's stated fix for absent-as-false interpretation.

Before v4 sparse storage is designed, define one canonical semantic-normalization contract that
distinguishes:

- canonical default false/null;
- historically absent/unknown;
- truly not-applicable fields.

A compact codec cannot safely omit defaults until those semantics are executable and tested.

### C. Hint artifact `schemaVersion` is currently advisory rather than authoritative

Node and browser readers primarily detect shapes by field presence:

- bare array;
- object with `hints`;
- transitional `hintMetadata`.

They do not dispatch on `schemaVersion`, and an unknown future wrapper containing an array named
`hints` can be accepted as though it were understood.

This conflicts with the repository's own protocol/schema-contraction rule that versioned artifacts
should use explicit versioned adapters rather than field-presence guessing.

The shared v4 codec should therefore be introduced as a **version authority**, not merely a new
serializer:

- explicit known-version readers;
- explicitly named unversioned/legacy adapters;
- fail closed on unsupported future schema versions;
- one current write version;
- fixtures for every retained historical generation.

### D. Hint file writing, listing, and corpus-to-hints layout have different authorities

`hintFileName()` accepts any string persistent ID verbatim, while `listHintFiles()` discovers only
filenames matching `[A-Za-z]?\d{3,}.json`. A valid future/string ID can therefore be writable but
invisible to formatting/validation/migration callers that enumerate through `listHintFiles()`.

Likewise the Node side derives hint directories from the levels filename
(`stress-levels-<suffix>.json -> hints-<suffix>/`), while the browser side is configured separately
with `basePath` / `hintsDirName`.

These should become one documented artifact-layout contract with environment-specific path
adapters. A file that the canonical writer can create must be discoverable by canonical validators,
migrators, and indexes.

### E. Execution/protocol identity already has several overlapping field dialects

Current research/execution artifacts use overlapping concepts under names such as:

- `effectiveConfigDigest`;
- `experiment.configurationHash`;
- `configurationHash`;
- `protocolHash`;
- `sourceProtocolHash`;
- `solverRef`, `sha`, `commit`, `commitSha`, and hint `solver.version`.

In at least one current helper, hint-discovery-process evidence writes
`protocolHash` and `configurationHash` to the same value.

Do not simply add another `effectiveSolverConfigDigest` field beside these. Phase 1 must inventory
the meaning of every current identity field, assign each to the target hierarchy
(EffectiveSolverConfig / ExecutionProtocol / RunEnvelope / immutable solver ref), and either:

- migrate current writers to the canonical field;
- retain a clearly scoped specialist field because its semantics genuinely differ; or
- move old spellings behind historical ingress adapters.

### F. Standard source-run provenance is duplicated in multiple envelope shapes

`publish-solver-sweep-result.mjs` writes a standard `manifest.json` and can also write a
`pathfinder-gha-source-run` provenance sidecar containing an overlapping projection of workflow,
run, SHA/ref, dispatch inputs, artifact coverage, and research outcome.

Other evidence families carry run/protocol identity again in failure-response documents,
hint-discovery-process envelopes, harvest-selection manifests, and pending quarantine files.

The target RunEnvelope should not require every specialist artifact to become physically identical,
but there should be one canonical semantic source-run projection and one extractor. Current
specialist artifacts may reference or embed that projection rather than independently deciding its
field vocabulary.

### G. Hint-harvest selection accounting is asymmetric across ingestion paths

The level-blind report harvester has a durable selection manifest describing solved candidates,
referee acceptance, already-represented evidence, and quarantines.

The direct hint-artifact merger and isolated-report harvester have separate semantics and do not
currently expose the same standardized retention funnel. The asset registry explicitly documents
this asymmetry.

As GHA persistence is centralized, standardize a common minimal ingestion accounting model while
allowing producer-specific details. This is necessary to distinguish:

- producer novelty;
- referee rejection;
- compatibility rejection;
- semantic deduplication;
- already-represented evidence;
- quarantine;
- actual persistence failure.

### H. Firestore hint persistence has multiple physical schemas and materially different limits

Git-backed hints, Firestore `published_levels`, and `local_level_hints` legitimately need different
physical storage, but their semantic adapters and capacity expectations are inconsistent:

- submitted/published level hints are JSON-stringified individually inside `levelData.hints`;
- local published-corpus additions store one path/provenance entry per Firestore document;
- local-level hint storage soft-caps at 5,000;
- Firestore `approveHintAddition()` currently truncates the merged hint set to **5**;
- submission/search surfaces can handle far more hints.

Do not blindly make all backends use the git v4 wire format. The pre-implementation audit traced the Firestore `slice(0, 5)` cap back to the pre-provenance era. It now conflicts with the submission path's explicit 1,000-hint Firestore safety margin, the local supplemental store's 5,000 soft cap, and player-facing display curation's independent default cap of 15. Treat the five-hint persistence cap as a current evidence-loss defect: remove it or replace it with an explicit provenance-aware backend capacity policy. Player display limits belong in `selectDisplayHints()`, not storage.

### I. Existing schema-contraction registry is part of this program's control plane

Do not maintain this plan as a parallel cleanup universe.

The follow-up audit reopens at least:

- PSC-001, hint mutable representation;
- PSC-015, hint provenance schema generations.

Add newly discovered seams for version dispatch, artifact layout/discovery, execution identity,
GHA persistence lanes, ingestion accounting, and external hint persistence where appropriate.

A seam marked complete may be reopened when exercised current code disproves its retirement gate;
the contraction plan explicitly permits that behavior.


## 13.2 Research-system hardening pass: revisions to the target design

Comparing this plan against the current research operating model, Resource Contract, information-
retention work, queryability rules, failure-response architecture, and the raced execution backend
changes several design details.

### J. Canonical request projection should be complete-by-default, not a hand-maintained allowlist

A manually curated `EffectiveSolverConfig` list would recreate the exact drift class this plan is
trying to remove. `SolveOpts` is large, evolves frequently, and has repeatedly acquired
behavior-affecting overrides outside ablation configuration.

Prefer a versioned **canonical solver-request capsule** derived at the actual invocation boundary.

Every canonical SolveOpts field must be classified by one owner as one of:

- solver-semantic: can affect search policy, ordering, eligibility, allocation, randomness or result;
- observation-semantic: can alter emitted evidence but is contractually search-inert;
- transport/execution: backend/concurrency/runtime dispatch semantics;
- level-specific/history-derived: such as a prime attempt or adaptive per-level budget;
- non-semantic output/control plumbing.

The identity builder should include every solver-semantic field by default and fail tests/CI when a
new SolveOpts field has no classification. Exclusions therefore require an explicit classification
rather than silent omission.

Reuse the direct/worker/race request-contract work already in the repository. Do not maintain a
second independent list of what the solver can receive.

The effective-input identity for one discovery can then be a projection of:

- canonical request capsule;
- level revision;
- immutable solver implementation ref;
- per-attempt action/forcing/seed dimensions not already represented in the request.

### K. Reproducibility class is part of execution identity

Not every Pathfinder execution backend promises one deterministic winning path.

The raced backend explicitly uses first-success-wins concurrency and documents that repeated runs
can report different winning attempts because worker scheduling changes which valid success arrives
first. Historical wall-clock-budgeted solver eras have another reproducibility contract. Seeded
randomized search has another.

Reuse and extend the repository's existing experiment execution contract rather than creating a hint-only namespace. It already carries `execution.reproducibilityExpected`; evolve that contract/shared value object with a small explicit reproducibility/execution mode, for example conceptually:

- deterministic-work;
- seeded-deterministic;
- first-success-race;
- historical-wall-clock-sensitive;
- externally-determined;
- unknown.

Exact vocabulary should be derived from actual maintained execution families. Historical contracts with only the boolean `reproducibilityExpected` remain readable; the richer mode is prospective and versioned independently.

This class belongs in the execution/run semantic capsule and in determinism auditing. A
different-path repeat is suspicious only when the compared execution class promises path-stable
determinism under the compared input identity. For a first-success race, the appropriate invariant
may instead be validity plus membership in the reachable success set, not winner identity.

The #1996 audit should therefore evolve from “same recorded inputs -> same path?” into a
reproducibility-contract audit.

### L. Durable hint evidence needs a self-contained semantic capsule, not only an external run ref

The Resource Contract requires decision-relevant evidence to remain reconstructable after ephemeral
workflow artifacts expire.

A hint event that stores only:

- source run ID; or
- an opaque effective-config digest

can establish a weak equality/join but cannot later explain or replay what configuration the digest
represented if the source manifest disappears.

For modern Pathfinder solver provenance, persist the **minimal reconstructable execution capsule**
needed by the hint evidence itself, preferably interned once per hint artifact when repeated:

- identity schema/version;
- immutable solver ref;
- canonical solver-request/config projection or its replay-relevant subset;
- execution backend/reproducibility class;
- execution-protocol identity and enough canonical payload to interpret it;
- source-run locator/lineage as provenance, not as the sole semantic source.

A digest remains useful for equality and cross-file joins, but the payload needed to interpret the
digest must be durably reconstructable somewhere with an explicit retention guarantee.

Do not make canonical hint evidence depend on dereferencing an expiring GHA artifact.

### M. Keep success evidence separate from attempted-population evidence

A hint store is intrinsically **success-selected**. Even perfect run provenance on every discovered
path does not establish:

- how many levels/attempts were tried;
- how many failed;
- treatment participation;
- solve rate;
- unconditional performance;
- censoring/coverage.

Those belong to run manifests, population integrity, failure response, lifecycle/process evidence,
and decision-bearing experiment bundles.

The consolidated ingestion path must therefore never imply that a richer hint event makes the hint
store a performance dataset.

The common semantic kernel should let a hint join mechanically back to its run/process evidence
when that evidence survives, while preserving the Resource Contract warning that a path-only
success corpus cannot supply its own denominator.

### N. Centralize semantics, not every specialist artifact

The research-system consolidation work explicitly warns against fake universal schemas.

The target should therefore be:

- one canonical solver-request/execution/run semantic kernel;
- one canonical hint semantic model and HintStore boundary;
- one canonical ingestion vocabulary for persistence outcomes;
- specialist evidence schemas for hint discoveries, failures, exact/reference probes, family runs,
  search-loss, etc.

A maintained producer need not serialize one universal “solved observation” document. It must
instead be able to project its successful hint-discovery observation plus the common execution
capsule into the canonical hint-ingestion interface.

This keeps independent evidence implementations useful while eliminating duplicated meanings.

### O. Identity schema evolution and artifact schema evolution must be independent

A hint artifact schema version answers “how are these bytes encoded?”.

An execution/request identity version answers “which semantic fields define equality?”.

A provenance semantic version may answer “which meaning/missingness contract does this event use?”.

Do not make these one version number.

For example, a future request-identity v2 should not require rewriting the physical hint codec from
v4 to v5 merely because equality semantics gained a newly classified SolveOpts field.

Persist identity algorithm/version alongside digests/capsules so historical equalities remain
interpretable.

### P. V4 must remain self-contained per file

Interning should be local to one hint artifact unless a later measured need earns a broader store.

Do not create a global dictionary whose loss, skew, or partial checkout makes otherwise valid hint
files undecodable.

Local tables should:

- be deterministically ordered;
- preserve original hint order;
- preserve provenance-event order;
- preserve `foundAt` and all semantic payload exactly;
- decode without another corpus file;
- re-encode byte-stably after decode/merge.

Cross-file identity should use versioned semantic digests, not physical table indexes.

### Q. Bulk migration needs a reversible evidence transaction

The tracked hint corpus is itself research evidence. A successful decoder test is necessary but not
sufficient justification for rewriting hundreds of megabytes.

The migration should generate a machine-readable migration manifest containing at least:

- source commit;
- source artifact path;
- old schema/version and byte/content hash;
- new schema/version and byte/content hash;
- hint count and provenance count before/after;
- semantic digest before/after over expanded canonical Hint[];
- referee-validation disposition;
- migration tool/version.

Keep the migration deterministic and rerunnable from the pre-migration commit.

This manifest is an audit/rollback aid, not a new evidence authority.

### R. The generated hint index needs freshness binding and query benchmarks

A compact hint-store index is useful only if agents can tell whether it matches the underlying
evidence.

Bind each index row/store to a deterministic content/semantic hash of its source artifact or decoded
semantic input. The query surface should fail or flag stale indexes rather than silently answer from
them.

Before expanding the index, add concrete repeated questions to the existing research-queryability
benchmark discipline. Persist only summary fields that answer demonstrated recurring questions;
derive rarer questions from the canonical store on demand.

### S. Partial failure and recovery should be tested as first-class ingestion transactions

The broader research system treats recoverability as a capability. Hint ingestion should do the
same.

End-to-end fixtures should cover:

- shard produces discoveries, then fails before normal closeout;
- some shards succeed and combine/publish fails;
- harvester is rerun;
- the same source run is harvested twice;
- mixed old direct-file and new observation artifacts arrive together;
- one source artifact is corrupt or missing;
- persistence fails after some levels are written;
- source-run metadata conflicts between artifacts.

Required behavior:

- no silent evidence loss;
- no duplicate semantic events;
- no invented source identity;
- clear quarantine for unmergeable rows;
- deterministic replay of the import;
- safe retry after partial persistence.

### T. “Unknown”, “default”, “not applicable”, and “not observed” need an explicit semantic table

The missingness problem is broader than three context booleans.

Before sparse v4 encoding, inventory every provenance field and declare which states are possible:

- known value;
- canonical default;
- not applicable to this producer/technique;
- not observed/not retained by this producer;
- historically unknown.

Only canonical defaults may be omitted and reconstructed unconditionally.

If null currently carries more than one of these meanings, either retain that limitation explicitly
for historical events or introduce a small tagged representation where a real recurring consumer
needs the distinction. Do not bulk-enrich history merely to make the model visually uniform.


### U. Legacy migration timestamps must not masquerade as discovery chronology

A historical before/after check found that the July 11 provenance migration converted flat
schema-v1 `hintMetadata` lacking discovery time into schema-v3 provenance with a newly generated
`foundAt` equal to migration/normalization time. Plain bare-path legacy hints correctly became
unattributed `provenance: []`; the chronology defect is specific to flat metadata upgraded through
`makeProvenanceEntry()`.

This is materially relevant because solution-profile chronology and longitudinal applicability treat
parseable `foundAt` as dated evidence.

Prospective rules:

- historical absence of discovery time remains unknown;
- compatibility adapters must never stamp read/upgrade time as event time;
- migration-derived timestamps that can be proven from repository history must be marked/excluded
  from chronology completeness rather than guessed backwards;
- preserve the underlying event and its real solver/technique metadata;
- add the chronology limitation to the hint-provenance Resource Contract and solution-profile
  missingness semantics.

### V. Execution identity must include backend-specific request semantics and observer reactivity

The canonical request owner starts from `SolveOpts`, but that is not the entire execution request
universe. The raced backend also accepts backend-specific `overallBudgetMs` and `poolSize`, and
its stage set / first-success concurrency differ materially from sequential execution.

The execution capsule should therefore compose:

- canonical common solver request;
- backend identifier and backend-specific request projection;
- reproducibility mode;
- observer/telemetry configuration when its cost can affect a binding wall deadline;
- immutable solver implementation identity.

Read-only observers are policy-inert, not automatically outcome-inert. The research operating model
already requires OFF/ON parity or non-binding deterministic execution before treating observer
overhead as irrelevant. Identity/comparability helpers should reuse that doctrine.

## 14. Implementation sequence

### Phase -1 — repair confirmed semantic/storage-boundary regressions

- fix maintained writers still using removed hint/corpus persistence facades;
- restore one canonical hint mutation/write authority across candidate-search and CP-SAT paths;
- define and repair provenance missingness so historical absence is not promoted into factual modern false;
- remove or replace the legacy Firestore five-hint persistence truncation with an explicit capacity policy;
- add regression/static guards before relying on these boundaries for the migration.

**Exit:** current producers obey the semantic/storage contracts the later phases assume.

### Phase 0 — land and adopt the determinism audit

- reconcile/merge PR #1996 safely;
- retain its report, reusable library, CLI, and semantic tests;
- register its findings as the baseline regression oracle;
- make no historical provenance rewrite yet.

**Exit:** current determinism evidence is durable on main and runnable locally.

### Phase 1 — identity consolidation

- inventory every canonical `SolveOpts` field, execution backend and existing identity owner;
- define a complete-by-default, versioned solver-request field-classification contract;
- define the canonical solver-request capsule and its purpose-specific identity projections;
- define execution protocol, reproducibility class and run-envelope projections;
- add canonical semantic hashing;
- add effective solver input identity/reconstructability helper;
- replace duplicate producer-local stable-hash logic where semantics match;
- add tests proving population/run metadata does not contaminate solver-input equality.

**Exit:** sweep families can describe the same solver semantics through one owner.

### Phase 2 — provenance envelope plumbing

- extend hint provenance semantics with bounded execution/run binding;
- update `makeProvenanceEntry()`, typed interfaces, and legacy upgrade paths;
- update shared hint capture;
- update current-solve and historical-solve provenance builders;
- preserve explicit unknowns for older evidence.

**Exit:** every modern Pathfinder solver discovery can carry complete effective-input binding.

### Phase 3 — standardized hint-ingestion projection

- define a small canonical hint-discovery ingestion interface over specialist producer artifacts, not a universal research artifact schema;
- require complete solution path, level identity/revision, winning attempt/action data, the common execution capsule, source-run lineage, and enough search observation to construct canonical provenance;
- make representative direct-save and artifact-only producers emit it;
- extend solver-sweep result/manifests to preserve it and constituent source lineage;
- harden workflow contract checks.

**Exit:** the central harvester can persist new evidence without consuming modified canonical hint
files.

### Phase 4 — centralize GHA persistence

Migrate maintained workflow families incrementally:

- run dual path;
- compare semantic persistence outputs;
- remove shard canonical-file mutation after parity;
- preserve partial-failure upload semantics;
- retain direct-file importer for historical artifacts.

**Exit:** modern GHA solver evidence has one canonical persistence authority.

### Phase 5 — shared artifact codec

- add shared browser/Node decoder;
- route `level-data-io.mjs` and browser data asset loading through it;
- implement deterministic v4 sparse writer;
- implement optional interning;
- update formatting and compatibility tests.

**Exit:** v4 can be read everywhere before any tracked store is migrated.

### Phase 6 — research/query integration

- extend hint query and provenance reports;
- add effective-input reconstruction coverage;
- integrate #1996 audit with the canonical identity helper;
- update structured asset registry/queryability/resource-contract docs;
- add the derived hint-store index.

**Exit:** agents and research scripts can exploit the richer provenance without inspecting raw v4.

### Phase 7 — benchmark and migrate hint stores

Measure on the real principal stores:

- v3 bytes;
- sparse-only v4;
- sparse + selected table interning;
- encode/decode runtime;
- query/startup effects;
- diff behavior.

Choose the smallest representation that preserves maintainability and deterministic formatting.

Then migrate canonical stores in a data-focused change and run the full semantic acceptance suite.

**Exit:** tracked hint storage is v4, materially smaller, and all historical readers remain green.

### Phase 8 — historical backfill

- mechanically recover source envelopes where authoritative evidence survives;
- prioritize the #1996 September 9 collision set and other high-value ambiguous events;
- retain explicit missingness everywhere else;
- rerun determinism/provenance coverage reports.

**Exit:** recoverable ambiguity is removed without manufacturing certainty.

### Phase 9 — bounded level cleanup

- benchmark sparse level serialization;
- implement only already-safe omission rules;
- leave provenance tables/sidecars deferred unless a later level-corpus-codec project earns them.

## 15. Review and stopping points

This program should be interruptible after each phase.

Do not combine all of the following into one giant PR:

- semantic identity changes;
- provenance schema changes;
- workflow persistence changes;
- physical v4 codec;
- bulk data migration.

Prefer small prerequisite PRs with strong compatibility tests, followed by a dedicated data migration.

Before removing the old GHA direct-file route, require real parity evidence from representative
workflow families rather than reasoning alone.

Before choosing an interning layout, benchmark actual corpus bytes rather than optimizing from one
sample.

Before historical backfill, require authoritative source-run linkage.

## 16. Explicit non-goals

This plan does not:

- change solver search policy or budgets;
- use historical hint identity for production routing;
- retain every failed attempt inside every hint;
- create a monolithic research database;
- replace existing failure-response/search-loss evidence;
- rewrite frozen historical artifacts without proof;
- require all non-Pathfinder producers to pretend to have Pathfinder run envelopes;
- compress level coordinates into opaque packed storage;
- remove legacy readers after migration.

## 17. Definition of done

The program is complete when:

- current solver discoveries persist the effective execution dimensions necessary to distinguish
  control/treatment and replay/determinism inputs;
- #1996's known collisions no longer require timestamp/source-commit archaeology where authoritative
  source envelopes survive;
- maintained GitHub Actions solver workflows share one canonical evidence-ingestion path;
- no maintained workflow needs to understand the physical hint-store schema;
- browser and Node consumers use one artifact decoder;
- canonical hint storage is materially smaller without semantic loss;
- historical v1-v3 evidence remains readable and honestly incomplete where appropriate;
- query/research infrastructure exposes the new identities and missingness;
- repo checks make new parallel persistence/identity dialects difficult to introduce accidentally;
- all referee, level-blindness, semantic identity, research applicability, and determinism
  regressions remain green.

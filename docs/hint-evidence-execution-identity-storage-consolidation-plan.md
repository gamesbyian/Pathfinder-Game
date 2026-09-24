# Hint evidence, execution identity, and storage consolidation plan

> **Status:** implementation substantially landed; prior completion claim disproven; hostile closeout and exact-head validation remain blocking on PR #2072
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
> **Post-implementation hostile audit:** [`reports/2026-09-24-hint-evidence-hostile-completion-audit-001.md`](../reports/2026-09-24-hint-evidence-hostile-completion-audit-001.md) is the current closeout authority. It supersedes earlier completion claims and records corrections found after the schema-v4 migration.
>
> **Pre-implementation empirical audit:** [`reports/2026-09-22-hint-evidence-consolidation-preimplementation-audit-001.md`](../reports/2026-09-22-hint-evidence-consolidation-preimplementation-audit-001.md) verifies request/backend semantics, provenance missingness, source-run reconstructability, producer observation sufficiency, stale writers, and Firestore retention behavior.
>
> **Structured implementation inventories:** [`docs/hint-evidence-consolidation-inventory.json`](hint-evidence-consolidation-inventory.json) and [`docs/solver-request-semantics-inventory.json`](solver-request-semantics-inventory.json).
>
> **Primary goal:** make solver evidence smaller, more queryable, more replay-/audit-friendly, and
> harder to record incompletely, without losing semantic information, breaking historical data,
> weakening level-blindness, or coupling offline evidence to production routing.

## 0. Completion-contract correction from implementation experience

This section is a **retrospective correction to the original execution contract**. The hostile
post-implementation audit demonstrated that several requirements below were semantically sound but
not operationally exhaustive enough. Future execution of this plan, and any claim that it is
complete, must use the stronger rules here.

1. **Words such as all, every, maintained, canonical, tracked, and full corpus require a mechanical
   population owner.** A hand-written list may document the population but may not define it. The
   repository must derive the relevant producers, consumers, workflows, stores, or artifacts from
   current repository authorities and fail on unclassified additions.
2. **Every Definition-of-Done statement maps to an executable proof.** A phase report or PR
   description may summarize evidence, but cannot itself satisfy a closure condition. The closeout
   record must name the exact test, guard, census, emulator run, migration manifest, or query that
   proves each item.
3. **Architectural guards require adversarial self-tests and CI invalidation ownership.** A guard is
   incomplete until representative equivalent/refactored bypasses are tested and the scoped-CI
   contract declares every source, workflow, ledger, and authority whose change must select the
   guard.
4. **Persistence semantics are closed by state-transition coverage, not one happy-path example.**
   Where persistence/deduplication is touched, acceptance must distinguish at least: exact retry of
   one occurrence; same semantic event with a new acquisition occurrence; new semantic event on an
   existing path; new path; partial persistence; capacity refusal; retry after refusal; and semantic
   reconstruction after read/merge.
5. **Execution-topology-specific behavior must run in that topology before the phase closes.**
   Firestore behavior requires the real emulator boundary; GHA transport requires the real workflow
   path; browser/bundle behavior requires the supported browser/Vite path; sparse/full-checkout
   checks must run in the topology that owns them. Static or local substitute evidence may keep work
   moving but cannot close the affected phase.
6. **Bulk migrations must mechanically discover their complete input universe and record that
   population in the migration evidence.** The manifest/proof must include the discovered stores and
   artifact counts, semantic/join equivalence, idempotency, and the required referee/path-validity
   disposition. A successful migration over a hand-enumerated subset is not a full-corpus migration.
7. **Final closeout is an independent reconstruction from current repository truth.** It must rebuild
   producer, consumer, persistence, workflow, store, historical-compatibility, and current-document
   inventories from the repository rather than using implementation diffs or implementation reports
   as the checklist. Prefer fresh context.
8. **Pending or red closing evidence means not complete.** No phase/program completion label may be
   based on an older green SHA, a queued check, a locally substituted topology, or a report that says
   a later check is merely follow-up.

The hostile completion audit on PR #2072 is the first application of this strengthened closeout
contract. Its corrections are part of the implementation, not optional post-plan cleanup.

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

### 3.2 Canonical solver request capsule

Do **not** introduce a surfaced `EffectiveSolverConfig` aggregate. That name would collapse several
dimensions that the repository's canonical solver vocabulary deliberately keeps distinct: attempt
configuration, routing regime, solver stage, resource envelope, seed, backend execution semantics
and experiment treatment are not one generic “config”.

Instead add one versioned **solver request capsule** whose job is transport/replay completeness, not
new conceptual taxonomy. It should compose the existing canonical owners for behavior-affecting
request dimensions, including as applicable:

- canonical attempt/action identity and normalized ablation configuration;
- scheduler mode / solver stage semantics;
- routing/static-portfolio request semantics;
- resource-envelope fields such as base/strict-total work and relevant node/work overrides;
- behavior-affecting retry/reserve/repair/search request fields;
- deterministic seed/salt dimensions;
- backend-specific request fields demonstrated to affect execution;
- observer configuration only when the operating-model reactivity rules make it outcome-relevant.

It should exclude:

- corpus hash/population identity;
- workflow/run ID;
- output filenames;
- diagnostic-only observer configuration proven outcome-inert for the applicable execution;
- artifact transport details;
- unrelated host metadata.

The capsule must preserve the canonical names of its component dimensions rather than rebranding them
as subfields of a generic configuration concept. Create a versioned semantic digest from the
canonical request projection and reuse shared stable/canonical serialization instead of
producer-local `stableStringify()` implementations.

### 3.3 Execution protocol

Define a separate canonical projection for execution protocol:

- solver-request identity;
- level-blind/history-aware execution mode where applicable;
- backend/reproducibility semantics not already intrinsic to the request capsule;
- named experimental treatment/arm where comparison semantics require it;
- other meaning-changing execution rules.

This identity answers “are these observations protocol-comparable?” rather than “are these solver
requests equal?”.

### 3.4 Source-run binding

Define a bounded source-run binding:

- immutable solver commit/ref;
- source workflow/tool family;
- source run ID and run attempt when available;
- execution protocol identity;
- solver-request identity;
- population/corpus identity or hash;
- experiment/cohort/arm identity when applicable;
- source-run lineage for recombined runs.

This binding is identity glue, not a telemetry dump. Reuse the repository's established
`gha-source-run` / source-run vocabulary where the GHA provenance contract applies rather than
minting an overlapping generic “run envelope” identity. Do not copy full pre-win attempt sequences,
rich traces, or entire experiment manifests into every hint event.

### 3.5 Effective solver input identity

Add a shared derived helper for determinism/replay analysis, conceptually:

`effectiveSolverInputIdentity(entry)`

Its structured input should include only dimensions that can make two solver discoveries different
effective attempts, such as:

- level structural revision;
- solver version;
- canonical action/attempt identity;
- forcing/gate dimensions;
- relevant resource envelope;
- seed/salt when meaningful;
- canonical solver-request identity.

Prefer returning structured availability information rather than a naked hash, for example:

- `reconstructable: true|false`;
- `identity` when complete;
- `missingDimensions` when incomplete.

Historical unknowns remain unknown.

## 4. Target hint provenance model

Extend the semantic provenance model additively with a bounded execution/run binding.

The exact final field names should be chosen during implementation, but the semantic shape should
support:

- solver-request identity;
- execution protocol identity;
- source run identity;
- optional experiment arm/cohort identity;
- source-run lineage when an observation comes from a recombined artifact.

Non-solver producers are not required to invent solver-run semantics. Human paths, construction
witnesses, transformed family witnesses, and external solvers may legitimately leave Pathfinder
Pathfinder solver-request fields unavailable while retaining their own producer identity.

`makeProvenanceEntry()`, current-solve provenance construction, historical-result upgrading, and
query/replay helpers should all share this model.

## 5. Canonical GHA evidence-ingestion lane

### 5.1 Long-term target

Maintained solver workflows should transport **solved observations plus execution envelopes**, not
modified canonical hint files.

Target flow:

```
solver execution
  -> solved observation + canonical execution/source-run binding
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
  their source-run bindings are mechanically backfilled;
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

- solver-request identity;
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

Do not simply add another `effectiveSolverConfigDigest` field beside these. Phase 2 must inventory
the meaning of every current identity field, assign each to the target hierarchy
(solver-request identity / execution protocol / source-run binding / immutable solver ref), and either:

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
- an opaque solver-request/configuration digest

can establish a weak equality/join but cannot later explain or replay what configuration the digest
represented if the source manifest disappears.

For modern Pathfinder solver provenance, persist the **minimal reconstructable solver-execution binding**
needed by the hint evidence itself, preferably interned once per hint artifact when repeated:

- identity schema/version;
- immutable solver ref;
- canonical solver-request projection or its replay-relevant subset;
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

### W. Separate semantic discovery identity from occurrence/run lineage

Current `provenanceEventIdentity()` deliberately collapses a retried workflow when solver
commit/config/seed/forcing/termination/deterministic search result are the same, ignoring
`foundAt` and host/wall allocation fields. That persistence invariant is useful and should not be
destroyed merely to add run provenance.

Therefore do **not** put physical source-run ID directly into semantic discovery identity.

Model two layers:

1. **semantic discovery event** — path-independent evidence about what effective solver input/search
   trajectory produced a success. Its identity includes the canonical execution/request semantics
   needed to distinguish materially different runs/arms;
2. **occurrence lineage** — one or more observations of that same semantic event, carrying source-run
   locator, observed timestamp when genuinely known, and other physical provenance that should not
   make a new semantic event.

Merging the same semantic event from another run should merge occurrence lineage rather than append
a duplicate full provenance object.

This preserves:

- compact storage;
- the existing semantic-dedupe invariant;
- exact source-run joins for denominator/process evidence;
- repeat-run counts needed by reproducibility audits;
- separation between “same semantic discovery” and “observed in another workflow run”.

The physical v4 representation may intern run/occurrence records separately. Before choosing
whether to retain every run reference versus count/first/last plus selected locators, measure actual
repeat volume and recurring query needs. Decision-bearing run joins require exact locators; do not
replace them with counts where later reconstruction depends on the exact source.

#1996 should explicitly note that the current hint corpus is not a complete rerun ledger:
semantically identical same-path rediscoveries can already have been deduplicated. Future
reproducibility evidence should use occurrence lineage or dedicated run artifacts rather than infer
“only one run happened” from one persisted semantic event.

### X. Canonical research storage and shipped runtime delivery should be separate projections

The production Vite build currently copies the entire canonical hint trees into `dist/`:

- `data/hints`;
- `data/stress/hints`;
- `data/stress/hints-random`.

Those canonical stores are provenance-heavy research evidence, while ordinary browser hint display
projects loaded `Hint[]` immediately to paths. The Dev-mode stress switch likewise needs known
solution paths, not the research provenance envelope itself.

Do not create a second hand-maintained hint authority. Instead, evaluate a **derived build-time
runtime projection**:

- canonical tracked hint artifacts remain the single research/evidence authority;
- Vite/build tooling decodes canonical hints and emits path-only runtime hint artifacts into
  `dist/`;
- runtime files are generated, not tracked;
- source semantic hash / build checks prove every runtime path came from the canonical artifact;
- Firestore supplemental/current-session hints may still carry provenance in memory where authoring
  flows need it;
- dev/test paths may continue to exercise the full shared canonical decoder.

This optimization is independent of v4. Even after provenance compression, shipping provenance
that the player UI does not consume is unnecessary product payload. Benchmark deployed bytes and
build time before/after.

The browser-safe canonical decoder is still required for development, compatibility tests and any
authoring surface that reads canonical artifacts directly; the runtime projection is not a license
to let Node/browser semantic decoding diverge.

## 13.2 Naming-cleanup compatibility guard

This program is not a naming-cleanup phase, but several implementation steps are cross-boundary
identity/schema migrations and therefore inherit the repository's naming-migration safeguards.

Before introducing or surfacing a new durable type, field, schema key, command, workflow/artifact
identity or public helper:

1. reconcile against current `docs/naming-and-vocabulary.md`;
2. search both the proposed canonical term and nearby/legacy terms and classify target-name
   occupancy as same concept, unrelated use, collision or historical compatibility;
3. prefer existing canonical vocabulary and owners over a new synonym;
4. use `docs/change-recipes.md` for any persisted or cross-boundary identity migration, including
   producer/normalizer/transports/writer/historical-reader/grouping-consumer impact mapping;
5. use dual-read / canonical-internal / single-write where historical compatibility is promised;
6. prove alternate direct/worker/raced/workflow transports rather than assuming a definition-site
   change propagated;
7. keep frozen historical names in historical evidence rather than cosmetically rewriting them;
8. close the migration from consumers inward and leave a mechanical residue/parity guard where the
   old/new distinction is detectable.

Planning shorthand is not automatically a durable product/schema name. In particular:

- **join spine** describes the cross-resource identity relationship in this plan; do not create a
  surfaced `JoinSpine` type/field merely because the phrase is useful here;
- **execution capsule** is architectural shorthand unless implementation chooses a canonical,
  role-specific surfaced name after the vocabulary/occupancy check;
- **run envelope** should not compete with established source-run / `gha-source-run` vocabulary;
- **configuration** must remain qualified. Do not recreate a generic aggregate that collapses
  attempt configuration, routing regime, solver stage, resource envelope, seed and protocol;
- **runtime projection**, **hint-ingestion receipt**, **semantic discovery event** and **occurrence
  lineage** must remain role-qualified if they become surfaced schema/API names.

If implementation discovers that a proposed name needs repeated disclaimers to explain what it is
not, treat that as a naming-design failure and choose a more literal role name before the new
surface becomes persistent.

## 14. Implementation methodology and dependency-ordered sequence

The phases below are ordered by **semantic dependency**, not by how visible or easy a change is.

A later phase may start only when the authorities it consumes are stable enough to serve as its test
oracle. Independent leaf work may proceed in parallel only when it cannot pre-decide a later semantic
choice.

### 14.1 Method used in every phase

Every phase that changes a durable authority must use the same migration discipline:

1. **Name the authority and invariant.** State which current owner is authoritative, what semantic
   invariant must survive, and which later phases depend on it.
2. **Freeze a before-state oracle.** Retain representative fixtures plus machine semantic hashes /
   counts needed to prove no accidental reinterpretation.
3. **Add the new owner beside the old path.** Prefer adapters, dual-read, shadow projection or
   dual-write comparison before destructive replacement.
4. **Exercise the real surface.** Test maintained CLIs/workflows/browser paths, not only helper
   functions.
5. **Compare semantics, not incidental bytes.** Referee validity, missingness, identity, occurrence
   lineage, joinability, selection accounting and partial-failure behavior are first-class depending
   on the phase.
6. **Test recovery/idempotency.** Retry, partial persistence, mixed-era input and corrupt/missing
   source cases must have explicit outcomes where the phase touches persistence.
7. **Move consumers before deleting compatibility.** A new authority is not complete while a
   maintained consumer still silently implements the old meaning.
8. **Retire the old path only after demonstrated parity.** Record remaining historical adapters
   explicitly rather than treating them as current alternatives.
9. **Leave a machine-enforced guard.** New fields/producers/layouts must fail closed when they bypass
   the canonical owner.
10. **Record exit evidence.** The phase exit is a test/report/manifest or other reconstructable proof,
    not “implementation appears complete.”

Unknown historical values remain unknown throughout. No phase may gain apparent completeness by
imputing missing history.

### Phase 0 — adopt the audit, freeze the baseline, rescue expiring authority

Do this before semantic implementation.

- reconcile/merge PR #1996 safely;
- retain its determinism report, reusable audit library, CLI and semantic tests;
- freeze baseline corpus semantic hashes/counts and the known collision/reconstruction fixtures;
- **rescue the minimal authoritative evidence bundle for high-value source runs whose GHA artifacts
  can expire**, beginning with the September 9 runs used to reconcile #1996;
- preserve source contracts/manifests, exact solved rows/paths, arm/configuration identity and
  artifact locators sufficient for later semantic backfill;
- do not yet rewrite canonical historical Hint provenance.

This separates urgent evidence preservation from later interpretation. Capturing an authoritative
source bundle now does not commit the final execution-capsule schema.

**Exit:** the baseline and currently recoverable high-value source evidence remain reconstructable
without depending on future GHA retention.

### Phase 1 — repair current boundaries and establish one semantic ingress

Repair current correctness seams before introducing richer identity.

- migrate maintained readers/writers off removed hint/corpus persistence facades;
- restore one canonical mutation/write authority and add the maintained-reachability guard;
- implement source-generation-aware historical missingness adapters so decode/read/write cannot
  launder unknown into modern false/default;
- make the July-11 synthetic-`foundAt` cohort decode as unknown discovery time;
- introduce the shared browser/Node **v1-v3 semantic decoder boundary now**, without v4 encoding;
- consolidate corpus-to-hint layout authority enough that Node/browser readers resolve the same
  corpus/id semantics;
- repair worker side-channel parity (`beamFlowCounters`, `pruneDiagnostics`) or classify the
  fields direct-only;
- contain Firestore evidence loss immediately: no silent `slice()`, no silent provenance discard,
  and capacity/duplicate/failure outcomes must be distinguishable. Do not prematurely choose the
  final occurrence-storage layout.

**Exit:** all maintained current reads/writes pass through honest semantic ingress/mutation
boundaries, and existing storage paths fail explicitly rather than silently destroying evidence.

### Phase 2 — identity and durable join-spine consolidation

Build the semantic identities that later provenance and ingestion must carry.

- adopt the complete 49-field SolveOpts classification and backend-specific request dimensions;
- define canonical normalized solver-request projections and effective defaults;
- define purpose-specific request/effective-input identity, execution protocol and reproducibility
  class;
- define the bounded solver-execution/source-run binding;
- define the durable cross-resource join spine: level revision, exact path signature, semantic
  discovery identity, acquisition run, immutable solver ref, protocol/configuration, arm/population
  and exact artifact locator where applicable;
- reuse canonical research hashing and existing backend/experiment authorities rather than minting
  duplicate registries;
- prove population/run metadata does not contaminate solver-input equality and observer-reactive
  execution is classified correctly.

**Exit:** producers, provenance, determinism tooling and sibling evidence resources can name the same
execution semantics through one versioned owner.

### Phase 3 — provenance semantics and occurrence lineage

Only after identity is stable, extend the Hint semantic model.

- add bounded execution binding to provenance;
- separate semantic discovery-event identity from physical acquisition occurrences;
- update `makeProvenanceEntry()`, types, hint capture and historical/current solve builders;
- preserve explicit unknown / not-observed / not-applicable / default distinctions;
- preserve exact occurrence locators when known without turning run ID into semantic-event identity;
- define the final semantic merge rules and bounded-growth unit needed by Firestore/GHA persistence;
- now choose/implement the Firestore semantic layout consistent with occurrence lineage, using
  byte-aware preflight and explicit overflow behavior.

Acceptance must include:
- legacy unknown round-trip;
- 662 synthetic-`foundAt` events remain semantically undated;
- reharvest of one acquisition occurrence is idempotent;
- independent reacquisition adds occurrence lineage without duplicate semantic provenance;
- cross-resource join keys survive merge and persistence.

**Exit:** the in-memory semantic model is final enough for producer migration and physical encoding.

### Phase 4 — expose the new semantics through research/query surfaces

Make the new model observable **before** changing every producer.

- extend hint query/provenance reports with effective-input reconstructability, occurrence lineage,
  missing dimensions and join locators;
- integrate the #1996 determinism audit with canonical identity helpers;
- expose the retention/join semantics through research asset/resource-contract/queryability surfaces;
- add cross-resource join checks against experiment contracts, hint-discovery-process and compact
  failure-response fixtures;
- define the minimal derived hint index and freshness binding only for demonstrated recurring
  queries.

This phase serves as a consumer-side oracle for the producer/workflow migration that follows.

**Exit:** a fresh agent can inspect the new semantics and detect incomplete/wrong producer output
without opening raw storage internals.

### Phase 5 — standardized ingestion projection and receipt

With semantic identities and query oracles stable, define how producers enter the store.

- define the small canonical hint-discovery ingestion projection over specialist producer artifacts;
- define the shared versioned hint-ingestion receipt with explicit units for candidate, eligible,
  referee-accepted, already-represented, path/event/occurrence additions, quarantine and physical
  changes;
- require complete path, level revision, winning action/attempt semantics, execution/join capsule and
  acquisition lineage where available;
- adapt representative direct-save, level-blind and isolated producers;
- make CP-SAT emit a sufficient exact successful-discovery artifact before retiring its direct path;
- preserve partial-failure upload semantics;
- add producer completeness/static ownership checks.

**Exit:** representative producers can be persisted centrally and their funnel/accounting can be
queried mechanically.

### Phase 6 — centralize GitHub Actions persistence incrementally

Migrate workflow families one at a time.

For each family:

1. keep the old direct-file route;
2. emit the new specialist observation + solver-execution/source-run binding;
3. central-harvest it;
4. compare semantic Hint additions, occurrence lineage and ingestion receipt;
5. exercise partial failure and reharvest;
6. remove shard canonical-file mutation only after parity.

Retain `merge-hint-artifacts.mjs` as a historical/mixed-era compatibility importer, not a peer
modern authority.

**Exit:** modern GHA solver discovery has one canonical persistence authority and no maintained
workflow needs physical hint-store knowledge.

### Phase 7 — authoritative historical enrichment

Now that the semantic model and ingestion path are stable, apply only **proved** historical recovery.

- consume the Phase-0 rescued source bundles and any other still-authoritative durable evidence;
- backfill execution/occurrence envelopes only where exact linkage is proved;
- prioritize the #1996 collision set and high-value ambiguous events;
- leave unrecoverable values explicitly unknown;
- produce a backfill manifest with source authority, semantic before/after hashes and join checks;
- rerun determinism/reconstructability reports.

Doing this before physical v4 benchmarking avoids benchmarking/migrating a corpus that will
immediately be semantically rewritten again.

**Exit:** recoverable historical ambiguity is removed, unrecoverable ambiguity is explicit, and the
semantic corpus has reached the intended pre-v4 state.

### Phase 8 — design, benchmark and migrate physical hint schema v4

Only now optimize bytes.

- extend the already-shared semantic decoder with explicit v4 dispatch;
- implement deterministic sparse encoding and optional local interning;
- benchmark v3, sparse v4 and sparse+interned v4 on the **post-enrichment real corpus**;
- measure raw/gzip bytes, encode/decode runtime, diff behavior, query/startup/build effects;
- require semantic Hint equality **and preservation of cross-resource join identity**;
- produce the reversible migration manifest with before/after hashes, counts and referee results;
- migrate canonical stores in a data-focused change;
- preserve v1-v3 readers.

Choose the representation from measured economics; do not pre-commit to interning where sparse form
is better.

**Exit:** tracked hint storage is materially smaller, deterministically encoded, fully backward
readable and semantically/join equivalent.

### Phase 9 — generated runtime projection

This is a derived-delivery optimization, not evidence migration.

- generate path-only runtime artifacts from canonical decoded Hints;
- bind them to canonical semantic/content hashes;
- verify path equivalence per file;
- fail build on stale/missing generation;
- measure build/deploy/runtime effects;
- keep the projection untracked/rebuildable and keep research/dev consumers on canonical evidence
  when they need provenance.

This phase may be developed in parallel after Phase 1's shared decoder exists, but adoption should
not block or pre-decide semantic phases 2-8.

**Exit:** player delivery no longer carries research-only provenance payload while canonical
evidence remains single-authority.

### Phase 10 — bounded level cleanup

Only after hint semantics/storage have stabilized:

- benchmark sparse level serialization;
- implement only already-safe omission rules;
- leave provenance tables/sidecars deferred unless a separate level-corpus-codec project earns them.

### 14.2 Dependency summary

The critical path is:

`baseline/rescue -> honest semantic ingress -> identity/join spine -> provenance/occurrence semantics
-> query oracle -> ingestion contract -> workflow centralization -> proved historical enrichment ->
physical v4 migration`.

Runtime path projection is a parallel leaf after shared decoding. Bounded level cleanup is a later,
separate optimization.

The ordering rule is simple: **never optimize or migrate a representation before the semantic
authority that will judge the migration exists, and never defer preservation of expiring authority
until after the evidence needed to interpret it may be gone.**

## 14.3 Implementation-history hardening: likely agent failure modes

The repository's earlier long-plan implementations show a repeated pattern: the central owner changes
correctly, local validation goes green, and the real defect survives at a consumer, alternate
transport, remote-CI topology, historical join, workflow argument path, or current authority.

This plan therefore treats the following as **predicted failure modes**, not generic caution.

### A. Do not implement a numbered phase as one PR merely because it is one phase

Phase numbers are dependency milestones, not PR sizing.

Split implementation into the smallest serial batches that have one main compatibility owner and
one coherent validation graph. Typical boundaries should separate:

- semantic reader/normalizer repair;
- direct/worker/raced request identity;
- provenance semantic model;
- Firestore persistence semantics;
- one producer/workflow-family ingestion migration;
- physical codec implementation;
- bulk tracked-data migration.

A batch must merge and be verified on current `main` before the next dependent batch starts. Do
not build a long stacked branch chain. Independent leaf work may proceed separately only when its
inputs are already stable and it cannot pre-decide a dependent semantic choice.

### B. Every implementation batch starts by reconstructing current-main truth

Before editing:

- fetch current `main`, this plan's current authority, open related PRs and plausible sibling branches;
- compare the intended surface against changes merged since the previous batch;
- recover unique relevant work explicitly; branch names and old PR descriptions are evidence, not authority;
- update the batch impact map when new consumers/producers have appeared.

Before merge, repeat the comparison against current `main`. If the intended change is already
present, superseded, or materially altered by intervening architecture, reconcile rather than
blindly applying the old plan.

### C. Leave a durable batch record, not only a PR body or chat history

For every cross-boundary batch, record in a compact checked-in implementation record or dated
report:

- base/reconciliation SHA;
- exact scope and non-scope;
- authority/invariant being changed;
- producer/transport/consumer impact map;
- compatibility owner and retirement rule;
- before-state oracle/fixture;
- actual validation surfaces and runtime topology;
- parity/recovery results;
- unexpected findings and plan amendments;
- final head SHA / merged PR when known.

Keep the PR description current as a human front door, but do not make it the sole durable state.
Commit frequently enough that recovery does not depend on an agent session surviving.

### D. Real execution topology outranks local green

A validation only counts for the boundary it actually exercises.

This program must distinguish at least:

- plain Node under the repository-supported Node version;
- TypeScript/bundled execution;
- browser/Vite execution;
- direct solver execution;
- worker transport;
- raced backend;
- GitHub Actions workflow invocation;
- sparse-checkout CI;
- Firestore/emulator or encoded-size semantics where storage behavior is under test.

Do not infer one from another. In particular, avoid new `.mjs -> .ts` runtime dependencies unless
the supported plain-Node path is proved.

### E. Design all artifact validation for sparse checkout and large-file scale

The hint corpus is hundreds of megabytes, so the Phase-9 naming failure is directly relevant here.

New checks must not assume that every registered artifact is materialized in the working tree.
Where repository identity is sufficient, distinguish tracked-HEAD existence from worktree presence.
Where file content is required, make materialization an explicit job requirement.

Do not shell large hint artifacts through default-buffer `execFileSync` / `git show` paths. Use
streaming/file APIs, bounded per-file processing, or explicit larger-buffer logic with measured
limits. Synthetic CI fixtures should be the smallest representative artifacts, not copies of
multi-megabyte live hint files.

Any new check that touches hint trees must be exercised in the **same sparse/full topology used by
the CI job that will own it** before that batch can close.

### F. Prove value transport, not merely field existence

The naming cleanup repeatedly found canonical fields that existed at the definition but disappeared
or changed meaning in a sibling transport.

For each new solver-request / execution / provenance dimension, use a distinctive sentinel value
and prove it travels through every applicable path:

`CLI/workflow input -> parser -> common request -> direct/worker/raced projection -> solver result ->
producer artifact -> harvester -> semantic provenance -> query consumer`.

A schema/type membership test is necessary but not sufficient.

When a dimension is unsupported by a backend, the test must prove explicit rejection/absence
semantics rather than quiet dropping.

### G. Workflow parity must prove treatment semantics, not only YAML validity

Pathfinder has had green workflows that effectively ran control-vs-control because the treatment
value was unwired.

For every migrated GHA producer family:

- emit the resolved canonical request/protocol identity into the artifact;
- assert the declared arm differs on exactly the intended dimensions when an A/B is expected;
- compare the invocation-boundary resolved value, not only the matrix label;
- require the central harvester receipt/result summary to expose source run, arm, accepted/addition
  counts, quarantine/failure disposition and persistence result.

Structural workflow validation or a successful job is not evidence that the intended treatment
participated.

### H. Prefer construction-time contracts over another layer of post-hoc validators

Where an invalid execution capsule, ingestion receipt, source-run binding or provenance event can be
prevented by a shared constructor/serializer, do that first.

Post-hoc checks remain valuable for cross-boundary parity and historical compatibility, but do not
create a forest of validators compensating for producers that are still free to emit malformed
canonical artifacts.

If two materially different live producers need the same correctness-critical construction rule,
promote that rule to their shared owner.

### I. Historical compatibility is tested at the semantic operation that matters

A decoder accepting v1-v3 does not prove historical compatibility.

Representative historical fixtures must be exercised through the downstream operations that use
them:

- grouping and dedupe;
- missingness classification;
- chronology/longitudinal queries;
- replayability/effective-input reconstruction;
- source taxonomy/applicability;
- joins to process/failure/experiment evidence.

Mixed-era joins must normalize both sides before comparison. Raw historical spellings/booleans may
not silently participate in a current equality/grouping operation.

### J. Current-authority documentation gets a semantic closeout, not only link checking

When a batch changes an authority, field meaning, ingestion route, runtime projection, Firestore
lifecycle or workflow ownership, search all current authorities that teach those semantics.

Do not copy volatile facts into several documents. Prefer the executable/structured owner plus
links/projections. Dated reports remain historical.

Closeout must verify that a fresh agent entering through the normal docs/resource-query front door
will learn the new architecture before encountering a stale one.

### K. New checks must be CI-friendly and failure-localizing

Do not add a checker that turns a small semantic defect into unrelated red jobs or requires agents
to excavate logs.

Every new maintained workflow/check should:

- fail as near as practical to the violated invariant;
- print the exact offending producer/artifact/identity and expected owner;
- distinguish semantic failure, stale derived output, missing materialization, capacity refusal and
  infrastructure error;
- emit a concise completion digest suitable for agent consumption;
- avoid reading unrelated giant resources merely to prove a narrow invariant.

When a new check first turns CI red, diagnose its execution topology and ownership before patching
symptoms in downstream jobs. Repeated red/green pinball is evidence that the invariant belongs
earlier or in a shared constructor.

### L. Bulk migration is a separately reviewable evidence transaction

Do not mix physical v4 corpus rewriting with semantic code changes.

The migration PR should contain, as nearly as practical:

- the frozen migration tool/version;
- machine manifest;
- tracked-data changes;
- semantic/referee/join parity evidence;
- no unrelated semantic refactor.

If the corpus rewrite exposes a semantic disagreement, stop the migration and repair the semantic
owner in a prerequisite PR. Do not teach the migration to normalize away the discrepancy.

### M. Firestore and git are different persistence systems, not two serializers for one assumption

A green git-corpus path does not validate Firestore authorization, document growth, idempotency,
merge semantics or convergence.

Test Firestore duplicate, rediscovery, occurrence append, capacity refusal and approval/import
lifecycle explicitly. Capacity policy must be stated in bytes/semantic units where possible, not
only path counts.

If supplemental Firestore evidence is intentionally non-durable or non-convergent with git, expose
that lifecycle honestly instead of making a reader infer it from implementation.

### N. Stop-and-reconcile triggers

Pause the current batch and amend/reconcile the plan before continuing if implementation reveals:

- a new canonical identity owner or competing schema;
- a field whose semantic layer differs from the current classification;
- a maintained producer that cannot supply the assumed ingestion contract;
- a historical cohort whose missingness cannot be represented honestly;
- a workflow family whose actual artifact/run lineage contradicts the planned source-run model;
- a backend whose execution semantics make the current comparability/reproducibility model false;
- a storage limit that requires lossy behavior;
- a current consumer that depends on v4 physical representation rather than decoded Hint semantics.

Do not “finish the phase” by adding a local exception around a contradicted assumption.

### O. Close from consumers inward, preferably with a fresh context

After implementation tests are green, perform a distinct closeout pass beginning from:

- browser/application consumers;
- query/research consumers;
- workflows and artifact harvesters;
- Firestore/git writers and readers;
- historical compatibility fixtures;
- current documentation/front-door discovery.

Do not use the implementation diff as the checklist. Prefer a fresh agent/session for high-risk
batches. If the same agent performs closeout, record that and deliberately reconstruct the surface
inventory from current `main`.

### P. Remote CI completion is part of merge evidence

A local `ci:fast`, an older green SHA, or a queued/running GitHub check is not evidence for the
current PR head.

Do not merge a high-risk batch until required remote checks for that exact head have completed.
If no useful work remains while CI is running, stop at the committed/PR-described boundary rather
than making speculative edits to occupy the wait.

### Q. Avoid plan-document accretion during execution

This plan is already extensive. Implementation findings should not turn it into an ever-growing
chronological notebook.

- Amend the plan only when sequencing, authority, semantics, scope or a standing guardrail changes.
- Put measurements and batch evidence in dated reports/implementation records.
- Compact concluded implementation detail when it no longer helps future execution.
- Respect the repository's document-size hysteresis policy rather than repeatedly shaving a few
  bytes at every closeout.

The plan should remain the execution contract, not the exhaust from executing it.

### 14.4 Suggested implementation batch topology

The following is a default decomposition, not a new priority authority. Reconcile it against current
`main` before each batch.

1. **Baseline/evidence rescue** — preserve expiring #1996 source authority; no semantic rewrite.
2. **Semantic ingress + missingness** — v1-v3 shared decoder, historical missingness/foundAt repair,
   stale-I/O/current writer migration and guards.
3. **Request identity direct/worker/raced parity** — solver request capsule, backend semantics,
   sentinel transport tests.
4. **Provenance event/occurrence model** — semantic merge identity and source occurrence lineage.
5. **Firestore semantic persistence** — bounded-growth implementation against the stable event model.
6. **Query/research observability** — query surfaces, determinism oracle integration, cross-resource
   joins.
7. **Ingestion projection + receipt constructors** — canonical producer-to-store contract.
8. **Workflow migrations** — one producer/workflow family per PR or small compatibility-owned group;
   dual-path parity and partial-failure/reharvest tests before removing direct mutation.
9. **Historical authoritative enrichment** — backfill from rescued/durable evidence with manifest.
10. **V4 codec implementation** — no bulk data rewrite yet.
11. **V4 data migration** — dedicated evidence-transaction PR.
12. **Runtime path projection** — independent derived-delivery optimization after semantic decoder
    stability.
13. **Bounded level cleanup** — separate follow-up only if still earned.

The implementation agent may combine adjacent batches only when they share the same compatibility
owner, validation graph and rollback boundary. “They are in the same phase” is not sufficient.

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
- require all non-Pathfinder producers to pretend to have Pathfinder source-run bindings;
- compress level coordinates into opaque packed storage;
- remove legacy readers after migration.

## 17. Definition of done

The program is complete only when the requirements below are satisfied **and** their current
executable proofs are green on the same exact head. Population-scoped claims must use the mechanical
owners required by section 0; implementation reports are supporting evidence, not closure authority.

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

## 2026-09-22 continuation hardening findings

These findings were verified against `main` at `0494a0a2c2cc698b8c2a0c40782c88b8983d99ca`, after the isolated-harvester repairs in PRs #1994/#1995.

### Maintained I/O census: current-main corrections

The stale-facade problem is still real and broader than the first spot checks. The planning inventory now records four current writers and three current readers/orchestrators that still depend on removed `readLevelsWithHints`/`writeLevelsWithHints` behavior and/or manually synchronize `.hintRecords` and `.hints`. Several are directly reachable through package commands. Conversely, `scripts/harvest-isolated-report-hints.mjs` is now a current positive example: PRs #1994/#1995 moved it onto the explicit corpus-document API and historical-provenance ingress and added a node smoke boundary. That supports the architecture here: historical semantics should be adapted at ingress, not normalized destructively in storage.

Repository-hosted code search proved incomplete during this audit, so PSC-001 cannot re-close on a grep transcript. Phase 1 must add a repository-local census validator that scans maintained source/package/workflow reachability and fails when a hint persistence seam is unclassified. It should detect removed facade imports, direct canonical hint-file writes, direct `.hintRecords`/`.hints` mutation, manual projection synchronization, and unregistered uses of `setLevelHintRecords`/corpus-document readers/writers.

### Solver request semantics: membership closed, semantics not yet closed

The current `SolveOpts` interface contains 49 fields and `docs/solver-request-semantics-inventory.json` contains exactly those 49: no current field is missing and no retired field remains. This closes the field-membership question but not the identity question. Before canonical request hashing is implemented, every field still needs an explicit canonical effective default and an explicit identity layer classification.

Do not create a second backend-support registry. Direct/worker transport contracts already own their capability boundary; raced execution already owns its narrow boundary in `RACE_LEVEL_OPTS_FIELDS`, `toRaceLevelOpts()`, and `assertRaceLevelOpts()`. Phase 2 should mechanically compare those owners to the semantic inventory and fail when a new common/backend field is unclassified.

Normalization must compare effective values, not input syntax. In particular, omitted ablation flags cannot be expanded with a generic boolean rule: `normalizeAblationConfig()` and `OPT_IN_FEATURES` own the unusual opt-in defaults. Likewise, `primeAttempt` and adaptive per-level allocation are derived effective-input dimensions, not necessarily run-wide request dimensions. Policy-inert observers remain execution-comparability dimensions when a binding wall deadline makes their overhead outcome-reactive.

### Workflow ingestion / lineage

The central harvester already has a useful semantic split:
- discovery-bearing sources may feed the three current importers;
- broad confirmation, residual confirmation, static-portfolio confirmation, and recombination are explicitly experiment-only;
- partial-failure source artifacts are intentionally harvested with `always()` paths;
- recombination already materializes typed constituent source-run provenance.

Future occurrence lineage should therefore preserve the acquisition/source runs already named by recombination provenance. A combine run is a reconstruction occurrence, not a substitute acquisition identity.

The harvester also contains two stale `workflow_run` trigger names for workflows that no longer exist in the maintained workflow tree: “Solver repair-fallback node-reserve sample A/B” and “Solver elite-prefix-dfs-retry local validation”. Phase 5 should make harvester source ownership mechanically agree with `docs/solver-workflow-lifecycle.json` and the actual workflow tree, rather than allowing historical trigger residue to masquerade as a maintained producer.

### Semantic event versus physical occurrence: concrete target

Keep `provenanceEventIdentity()` as the semantic-dedupe concept, but version/extend its semantic projection once effective execution identity exists. A semantic discovery event should identify the same meaningful observation: same level revision/effective solver input, same path result, and same search semantics required to interpret the find. Wall-host fields and physical run IDs do not distinguish semantic events.

Attach a compact occurrence set to the semantic event when physical lineage is known. The minimum useful occurrence record is:
- source/acquisition run identity;
- producer/workflow/experiment arm identity needed to recover the source-run binding;
- artifact/reconstruction lineage when the event was harvested later;
- observed time only when genuinely observed, not migration-synthesized.

Retry/reharvest of the same acquisition occurrence must dedupe. A later independent run may add an occurrence without adding a second full semantic provenance object. Support/dependency analysis counts semantic evidence according to its scientific independence contract, not raw occurrence count. Determinism auditing can expand occurrences to recover repeat-run observations while keeping rediscovery count separate from independent evidentiary support.

Historical semantic events whose physical occurrence cannot be reconstructed remain valid semantic events with occurrence lineage explicitly unavailable. Do not fabricate a source run.

### Firestore: semantic divergence is structural

PSC-029 is now stronger than “remove the five-hint cap.” Two different evidence-loss mechanisms exist:
1. `published_levels` still performs `mergeHints(...).slice(0, 5)`, silently truncating semantic Hints after a provenance-preserving merge.
2. `local_level_hints` is physically one path / one provenance event. Approval keeps only the submitted Hint’s final provenance entry, the deterministic path-hash document is create-only, and `saveLocalLevelHintIfNovel()` rejects already-known signatures. Therefore later rediscovery provenance for an existing supplemental path cannot be represented at all.

There is also no `local_level_hints` ingestion in `scripts/import-published-levels.mjs`; that script only converges `published_levels` into the git corpus. The supplemental backend therefore has a distinct durability/convergence lifecycle that must be made explicit.

Representative canonical `JSON.stringify(Hint)` samples from five provenance-heavy real files ranged up to 168,521 bytes for one Hint and 215 provenance events, with per-file medians ranging from 361 to 7,526 bytes. That variability makes any fixed path-count cap a poor storage policy; the remaining Firestore measurement must include actual encoded document/field overhead.

The replacement should preserve semantic `Hint` merge behavior first, then choose a physical Firestore layout. A path-keyed semantic-Hint document is the simplest candidate if update authorization/idempotency can be made safe; event-child documents are another option if per-event append semantics prove materially better. Do not choose between them until representative Firestore serialized sizes are measured. Capacity rejection must be distinguishable from duplicate/no-op and surfaced, never represented by silent `false` or `slice()`.

### Runtime delivery: projection is now strongly motivated

At current main, Vite copies:
- published hints: 160 files / 171,566,523 raw bytes;
- stress corpus 1 hints: 102 files / 83,920,958 raw bytes;
- stress corpus 2 hints: 1,700 files / 485,744,016 raw bytes.

That is 741,231,497 raw bytes of provenance-rich hint JSON copied into every `dist`. Published hints are fetched lazily per level. Stress levels/hints are browser-accessed only after the signed-in admin Dev-Mode corpus switcher selects a stress corpus, yet both stress hint trees are shipped in every build.

This makes a generated runtime projection worth pursuing, but adoption remains gated on an exact full-corpus path-only and gzip benchmark. The projection must be generated from canonical decoded Hints, carry/bind a source semantic hash, verify path equivalence, fail the build on stale/missing generation, and remain derived/untracked. Dev/research code that requires provenance continues to use the canonical decoder/source data; player runtime fetches may consume the projection.

### Historical `foundAt` boundary

Commit `7a651d391b49986626ceffbc4612352ddefb9bd4` on 2026-07-11 introduced provenance storage and migrated the then-existing 606 published/stress hint files. Historical samples already establish that previously undated flat metadata later received a narrow migration-time `foundAt` cluster. Treat migration membership/source generation as the primary compatibility signal; timestamp range alone is insufficient as a truth criterion.

Before any v4 sparsification, run a full current-corpus census that reports each provenance field as absent / explicit null / false / true / concrete value and separately identifies migration-synthetic `foundAt` candidates. The adapter/migration decision must be based on exact counts and false-positive analysis. Original discovery time must never be inferred.

### Pre-implementation empirical entry gate (satisfied)

These were the empirical gates required before semantic implementation could begin. They are now closed by the investigation results below; they remain regression constraints for Phases 1-3:

1. full current-corpus missingness census, including exact July-11 synthetic-`foundAt` population;
2. exhaustive per-field effective-default/identity classification for the 49 `SolveOpts` fields plus backend-specific request dimensions;
3. repository-local maintained hint-I/O census guard;
4. complete workflow ingestion matrix cross-checked against lifecycle + harvester trigger/source ownership;
5. representative Firestore serialized-size/capacity measurement;
6. exact canonical-vs-path-only raw and gzip runtime benchmark.

These are measurement/authority tasks, not v4 storage changes. Once they are green, the semantic architecture described above is sufficiently constrained to implement execution capsules, occurrence lineage, single-ingestion boundaries, and only then the physical v4 codec/migration.

## Investigation closure: answers required before implementation

The continuation audit has now answered the major semantic questions that were intentionally left open when this plan was first written. These answers are implementation constraints, not suggestions.

### Provenance missingness and historical truth

The full current committed store contains **775,469 provenance events**. Its physical field states prove that current key presence cannot be treated as observation truth for legacy capability context.

The September 11 audit measured **505,993** provenance events with `isolatedTechnique` absent. The current store has only **32,254** events where that field remains absent, alongside **507,334 explicit `false`** values. `usedExistingHints` and `hintGuided` now have zero physical absences. The mechanism is concrete: canonical corpus reads pass historical events through `upgradeProvenanceEntry()`, which fills absent capability booleans with `false`; a later touched-file write can serialize that expanded object. A read-time compatibility convenience has therefore become a mutable historical authority.

Phase 1 must split these concepts:
- **physical storage value**: what the current JSON happens to contain;
- **observed semantic value**: what the producer/source generation actually retained;
- **canonical modern default**: what a current producer means by omission/default.

For affected legacy generations, physical `false` is not evidence that false was observed. The semantic adapter must recover **historically unknown** from producer/source-generation semantics. Do not bulk-infer the missing original values.

The July 11 synthetic `foundAt` question is also closed. The migration-time window contains exactly **662 events in 102 stress-corpus-1 files**, and the same 662/102 cohort is present in a reconstruction of the September 11 store. No published or stress-corpus-2 event belongs to that cluster. The compatibility predicate should use the proven legacy migration/source cohort plus the timestamp window, not the timestamp alone. Those events' semantic discovery time is **unknown**. Their original timestamps must not be invented.

### Request and execution identity

The canonical `SolveOpts` surface has **49 fields**, and all 49 are now classified in `docs/solver-request-semantics-inventory.json` by:
- source-owned effective default semantics;
- identity layer;
- direct execution support;
- Web Worker support;
- raced-backend support.

`scripts/solver-request-semantics-inventory-node-test.mjs` now fails when `SolveOpts` membership or `RACE_LEVEL_OPTS_FIELDS` changes without a matching semantic classification.

Canonical request identity must hash **normalized effective values**, not raw request syntax. In particular:
- omitted `timeBudgetMs` means 30,000 ms;
- omitted `nodeBudget` means infinity;
- omitted `baseWorkBudget` derives effective work from `timeBudgetMs`;
- ablation defaults come from `normalizeAblationConfig()` / the opt-in registry;
- override defaults come from the canonical budget-policy constants/cascade;
- level-derived `primeAttempt`, forcing, and adaptive allocation belong in effective level/attempt identity rather than a run-wide request hash.

The raced backend's effective identity includes its narrow supported request projection, effective `overallBudgetMs`, effective worker pool size, supported stage subset, and first-success scheduling semantics. Stable winner/path identity is not promised.

A newly discovered worker seam must be fixed in Phase 1: `beamFlowCounters` and `pruneDiagnostics` are mutable plain objects, so the worker accepts and structured-clones them, the worker mutates only its private clone, and no updated object is returned. They are therefore not semantically equivalent to direct execution. Either reject them as direct-only or return an explicit telemetry projection.

### Semantic discovery event versus occurrence lineage

One semantic discovery event means one interpretation-equivalent solver discovery of a path under the same effective level/search semantics. Its identity includes the dimensions required to interpret the search outcome, including effective execution semantics when those alter search behavior. It deliberately excludes:
- source run ID;
- harvester/reconstruction run ID;
- host identity;
- `foundAt`;
- wall-only timing noise already excluded by the current dedupe rule.

A semantic event may carry a compact set of **physical occurrences**. A modern occurrence should retain, where known:
- acquisition/source run identity;
- workflow/producer and experiment arm needed to recover the source-run binding;
- artifact/shard/row locator sufficient for an exact join;
- genuine observation time when the producer actually observed it;
- reconstruction/harvest lineage separately when persistence occurred later.

Reharvesting the same acquisition occurrence dedupes. A later independent acquisition may add an occurrence to the same semantic event without duplicating the full semantic provenance object.

Occurrence count is not support count. Existing research independence/dependency semantics remain authoritative for evidentiary support. Determinism/replay tooling may expand distinct acquisition occurrences to identify repeat runs, but must not equate those occurrences with independent corroboration.

Historical events whose acquisition occurrence cannot be recovered remain valid semantic events with **occurrence lineage unknown**. The representation must distinguish unknown occurrence history from a known empty occurrence set.

Combined/reconciliation workflows already retain constituent source runs. A combine run must never replace those acquisition identities.

### Workflow ingestion

The maintained harvester-relevant workflow matrix is now explicit in `docs/hint-evidence-consolidation-inventory.json`. The desired endpoint is semantic centralization, not one universal artifact schema.

- Stress refresh, production replay, high-budget sweep, targeted level-blind sweep, routing A/B, method probe, and technique census can converge on central semantic ingestion once their common execution/occurrence capsule is projected consistently.
- CP-SAT remains an approved specialist direct producer until its specialist artifact carries an exact successful path plus enough execution/config lineage to reconstruct the same semantic Hint centrally.
- Solver diagnostics remains an approved direct producer until artifact parity is demonstrated.
- Broad confirmation, residual confirmation, static-portfolio confirmation, and cross-run recombination remain experiment/reconciliation evidence only and are deliberately excluded from canonical hint ingestion.

Partial-failure artifact upload remains a hard requirement. The harvester's source vocabulary must also be checked against the workflow lifecycle/tree; two current trigger names are stale historical residue and should not masquerade as maintained producers.

### Firestore retention and capacity

The Firestore question is no longer “what should the five-hint cap become?”

Current JSON-size proxies show:
- one semantic Hint: median **1,437 B**, p99 **27,784 B**, maximum **574,971 B**;
- one local path + single provenance-event document: median **1,892 B**, maximum **3,440 B**;
- one published-level encoded Hint array: median **1,149,023 B**, p99 **2,044,991 B**, maximum **5,269,927 B**, before the rest of `levelData` and Firestore encoding/index overhead.

This disproves fixed path-count limits as a capacity contract. The current five-hint cap silently destroys semantic evidence, while 1,000 submitted paths and 5,000 local supplemental paths do not guarantee document safety.

The supplemental backend is also semantically incomplete: it is create-only and path-keyed, stores one provenance event, rejects a rediscovered path, and has no canonical-git convergence path equivalent to `published_levels`.

Phase 3 should specify a **bounded-growth persistence unit** and byte-aware preflight. Event/occurrence child documents are favored by the measured size distribution because their growth is naturally bounded; a full semantic-Hint-per-path document risks eventually crossing document limits as provenance accumulates. The exact Firestore SDK/emulator encoded-size check belongs in implementation validation, but no further empirical evidence is needed to reject silent truncation/count caps as the semantic policy.

Any overflow must be explicit and durable:
- duplicate/no-op;
- capacity rejected;
- transient write failure;
- successfully persisted

must be distinguishable outcomes.

### Runtime delivery

A generated runtime path projection is earned by measurement.

Across all three deployed hint trees:
- canonical raw JSON: **741,231,497 B**;
- minified path-only projection: **149,368,243 B**, **79.85% smaller**;
- pretty path-only projection: **308,947,047 B**, **58.32% smaller**;
- summed per-file canonical gzip: **21,176,345 B**;
- summed per-file path-only gzip: **4,924,828 B**, **76.74% smaller**.

The runtime projection should therefore be implemented after the semantic decoder/authority work, with these invariants:
1. generated only from canonical decoded Hints;
2. untracked/rebuildable;
3. bound to canonical source/content hashes;
4. path-equivalence checked for every source file;
5. build fails closed when generation or validation is stale;
6. ordinary player/runtime consumers may use the projection, while research/dev consumers that need provenance use canonical evidence.

This is a delivery optimization, never a second evidence authority.

### Maintained reader/writer census

The exhaustive source census exposed **56 source/workflow files** still mentioning the removed `readLevelsWithHints`/`writeLevelsWithHints` facade names. Package/workflow-seeded relative-import analysis classifies **24 as maintained-entrypoint reachable** and **32 as dormant/unreachable** today. Nineteen of the live files are referenced directly from `package.json`, four directly from workflows, and one is a reachable library. This is materially broader than the original seven-file spot census.

The live 24-file set is the Phase 1 migration target. Dormant writers remain historical/maintenance debt and must not become reachable again without migration. Phase 1 should turn the reachability classification into a permanent guard and migrate every maintained reachable stale seam before PSC-001 closes.

### Implementation readiness decision

The architecture is now specified enough to begin the dependency-ordered implementation sequence in Section 14.

The now-closed investigation authorizes the following work, ordered across Phases 1-9 as specified in Section 14:
- source-generation-aware provenance compatibility semantics;
- request/execution identity value objects and drift tests;
- semantic-event + occurrence-lineage representation;
- maintained hint-I/O census enforcement and stale-current seam migration;
- common solver-execution/source-run bindings and central-ingestion adapters;
- Firestore bounded-growth/explicit-capacity semantics;
- generated runtime path projection with equivalence checks.

Physical hint schema v4 bulk migration is **still later**. It remains gated on the preceding semantic/authority phases proving that:
- historical unknown survives canonical decode/encode without becoming false/null/default;
- the 662 synthetic-`foundAt` events decode as unknown discovery time;
- current producers emit complete execution/occurrence capsules;
- old/new semantic round trips are referee-equivalent;
- Firestore and GHA adapters preserve the same semantic Hint;
- the runtime projection is demonstrably derived only.

The remaining questions are implementation-validation questions, not architecture-discovery blockers: exact Firestore wire/emulator byte overhead, the final maintained-reachability list produced by the new census guard, and migration/referee dry-run hashes once the shared semantic decoder and provenance model exist.


### Artifact layout/discovery authority

PSC-025 is now architecturally closed even though implementation remains pending.

The current split is concrete:

- Node derives a hint directory from the corpus filename in `hintsDirFor()`;
- the browser independently supplies `basePath` + `hintsDirName` through `DEV_CORPORA`;
- `hintFileName()` accepts any non-empty string level id verbatim;
- `listHintFiles()` discovers only names matching `^[A-Za-z]?\d{3,}\.json$`.

That means writable identity and discoverable identity are different contracts, and corpus-to-hint layout is encoded twice.

Phase 1 should replace directory-regex discovery with an explicit corpus layout authority:

1. one neutral corpus-layout descriptor maps each maintained corpus to its level artifact and hint artifact location;
2. Node and browser adapters consume that descriptor instead of re-encoding the mapping independently;
3. expected canonical hint filenames are derived from corpus level identity via `hintKeyForLevel()` / the shared level-id contract, not guessed from directory contents;
4. validators/indexers compare the expected set to actual files and classify extras/orphans explicitly;
5. legacy numeric fallback remains a named compatibility path for corpora without permanent ids;
6. writers reject ids that cannot round-trip through the same layout/identity contract.

No new empirical corpus measurement is needed before implementing this. The defect is an authority mismatch, not uncertainty about the present filename population.

### Ingestion accounting authority

PSC-028 is also specified enough for implementation.

Today only the level-blind report importer emits a structured hint-harvest selection manifest, and that schema hard-codes `source.harvester = harvest-level-blind-report-hints`. The isolated importer and direct hint-artifact merger expose different funnels through console counters plus pending/quarantine files. The underlying semantic stages overlap but the names and units do not.

Phase 5 should add one small, versioned **hint-ingestion receipt** emitted by every canonical ingestion lane. It is an accounting envelope, not a universal producer artifact. The common vocabulary should distinguish at least:

- source candidate observations seen;
- candidate observations structurally/semantically eligible for this importer;
- referee-accepted observations;
- accepted observations already represented semantically;
- new semantic path additions;
- new semantic provenance-event additions;
- new physical occurrence-lineage additions once PSC-031 lands;
- quarantined/rejected observations with reason counts;
- persisted artifact/file changes as an operational consequence, not a semantic evidence count.

Producer-specific fields may extend the receipt, but the common counters must preserve units explicitly. In particular, `filesChanged` is never a substitute for persisted semantic evidence, and a report-level quarantine containing many solved rows must record row weight rather than only object count.

The existing level-blind selection manifest should migrate into this shared receipt or become a producer-specific extension of it. Isolated harvesting and direct-artifact compatibility import should emit the same core receipt. Attempted-population/failure denominators remain separate research evidence and must not be inferred from these success-selected ingestion receipts.

With PSC-025 and PSC-028 reduced to these contracts, there are no remaining architecture-discovery blockers before implementation. Their implementation and regression checks belong in the dependency-ordered phases above rather than another exploratory pass.


## Inversion pressure test: preserve richer evidence without bloating Hint

The storage-consolidation program was pressure-tested with the opposite question: if Pathfinder wanted to
retain **more** solver-discovery information rather than less, where should that information live?

The repository already contains the answer. Do not turn `Hint` into a universal research record.

Current evidence topology already separates materially different grains:

- **hint provenance** — accepted path × semantic discovery event;
- **hint discovery process** — run × level × exact stored path × attempt sequence through the winner;
- **compact failure response** — run × level × failed/solved attempt or stage response;
- **search-loss evidence** — run × level × attempt/stage × selected rich search event;
- **experiment manifests/contracts** — protocol, population, execution and treatment authority.

That decomposition is desirable. The richer hypothetical therefore strengthens the consolidation plan rather
than arguing for a larger Hint schema.

### Optimize duplication, not epistemic richness

Physical storage work should remove repeated representation while preserving the ability to add richer
research evidence later.

A small canonical Hint should retain the information that is intrinsically part of the accepted path
observation. Rich process, failure and search-state evidence should remain sibling resources at their natural
grain.

Schema v4 is therefore a **physical codec**, not a ceiling on future semantic evidence.

### Durable join spine

Modern solver discoveries should preserve enough identity to join a Hint occurrence exactly to richer evidence
when that evidence exists. The durable join spine should include, directly or through the bounded execution /
occurrence capsule:

- level identity and structural revision;
- exact complete path signature;
- semantic discovery-event identity;
- acquisition/source run identity;
- immutable solver ref;
- canonical execution/protocol/configuration identities;
- experiment arm where applicable;
- population identity where applicable;
- artifact/shard/row locator when a durable source resource exposes one.

The join must remain exact and fail closed. Do not reconstruct scientific identity later from timestamps,
filenames, directory order or approximate configuration similarity.

The existing `hint-discovery-process` contract is the precedent: it binds by exact path equality and preserves
only a bounded run-envelope projection while leaving the experiment contract authoritative.

### Retention classes

Before adding a new provenance/execution field, classify it by retention need:

1. **embedded semantic core** — required to interpret or deduplicate the Hint itself and therefore survives in
   canonical hint evidence;
2. **durably joinable evidence** — useful recurring research evidence at another natural grain; preserve an
   exact join key and retain the sibling resource when its decision/reuse horizon warrants it;
3. **reconstructable authority** — need not be copied when a durable authoritative contract/resource can
   reconstruct it exactly from a stable identity;
4. **ephemeral diagnostic** — may expire when no declared research consumer/reuse horizon earns durable
   retention.

Historical absence remains honest missingness. A retention class never licenses synthetic reconstruction.

### Existing rich-evidence resources remain separate

Do **not** copy attempt sequences into every Hint. `hint-discovery-process` already owns the successful
attempt-sequence-through-winner grain.

Do **not** append failed attempts to successful Hint provenance. `compact-failure-response` owns compact
participation/dose/censoring/termination evidence and provides the attempted/negative context that
success-selected hints cannot.

Do **not** embed selected frontier/search-state capsules into Hint. `search-loss-evidence` owns that richer,
bounded forensic grain.

Instead, Phases 2-3 execution/occurrence identity should make joins among these resources cheaper and more
reliable.

### Evidence richness is consumer-earned

The inversion does not authorize blanket telemetry retention. The operating model's existing rule still applies:
a new durable store, observer or broad evidence surface needs a real consumer and stop rule.

When a future research question wants richer discovery evidence:

1. ask whether an existing sibling resource already owns the grain;
2. extend its producer prospectively if the missing field recurs;
3. preserve only the smallest decision-bearing/reconstructable bundle;
4. add a new durable resource only when materially different recurring consumers justify a new grain.

This prevents both failure modes: an anemic Hint that destroys future joins, and a provenance blob that becomes
a second unstructured research warehouse.

### Consequences for this plan

Phases 2-3 should treat the solver-execution/source-run binding and occurrence lineage as a **join contract** as well as provenance.
Acceptance tests should prove that a modern Hint occurrence can be joined, when corresponding resources are
present, to:

- its owning experiment/run contract;
- hint-discovery-process evidence by exact path;
- compact failure-response evidence by run/protocol/level identity;
- later richer resources without changing physical Hint schema.

The shared ingestion receipt from PSC-028 should expose identifiers needed to follow this lineage but should not
duplicate the sibling evidence payloads.

The v4 benchmark/migration must compare not only decoded Hint semantic equality but preservation of these join
identities. Compression that keeps paths/provenance readable while breaking durable cross-resource joins is a
semantic regression.

### Design principle

> **Preserve epistemic optionality; compress representation.**
>
> Put universally required meaning in the Hint, keep richer evidence at its natural grain, and make the joins
> exact enough that future research can become more sophisticated without making the canonical Hint store a
> warehouse.
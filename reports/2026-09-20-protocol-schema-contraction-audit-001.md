# Protocol/schema contraction audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — structural audit identified thirteen live protocol/schema contraction seams and classified their ownership.
> **Decision:** the repeated "same concept, several shapes" seams justify a focused contraction program. Historical evidence remains readable while current machinery moves toward canonical-only protocols.
> **Remaining gate:** execute and close the work in `docs/solver-protocol-schema-contraction-plan.md`.

> **Scope:** solver + solver-research machinery, emphasizing current live polymorphism rather than naming residue.

## Question

Where does Pathfinder still maintain overlapping representations, protocols, identity schemes, parser conventions, or authority locations that could instead be fundamentally unified without losing critical capability?

This pass deliberately looked beyond explicit compatibility vocabulary. It treated these as suspect:

- synonym/fallback field chains;
- multiple parser branches for one semantic type;
- readers accepting several container shapes;
- writers reconciling sibling representations;
- APIs with nominally equivalent names but incompatible contracts;
- live tools synthesizing/re-wrapping older shapes;
- multiple identity schemes for one conceptual object;
- copied aggregates plus sidecar/event representations;
- current configuration surfaces accepting retired vocabulary;
- historical decoding performed inside general semantic/query layers.

## Findings

### 1. Hint state has two mutable in-memory authorities

`scripts/level-data-io.mjs` attaches both `level.hints` (bare paths) and `level.hintRecords` (canonical `{path, provenance}` records). `writeLevelsWithHints()` later reconciles both through `reconcileHints()`.

This is not merely legacy input support. It is current dual-write state. The code needs `UNTOUCHED_HINTS_STATE` to remember array identities so concurrent processes do not overwrite one another from stale snapshots. That is a strong signal that the overlapping representation itself has become operationally significant.

**Direction:** make provenance-rich Hint records the only mutable representation. Bare path arrays become projections at use sites.

### 2. Corpus I/O hides two document schemas behind one array return value

`readLevelsWithHints()` accepts either a bare array or an object containing `.levels`, then stores the wrapper in `LEVEL_WRAPPERS` so `writeLevelsWithHints()` can reconstruct whichever outer format originally appeared.

The returned array therefore carries hidden serialization semantics keyed by object identity.

**Direction:** expose an explicit canonical corpus-document type. Keep historical/bare-array import support at an ingress adapter only.

### 3. Path validation accepts three semantic encodings

`validateCandidatePath()` accepts packed numeric keys, 1-indexed `[x,y]` tuples, and 0-indexed `{x,y}` objects.

The code already documents why representation-based indexing replaced a failed heuristic. That is safer than inference, but a correctness-critical validator still acts as a wire-format decoder.

**Direction:** split `decodeCandidatePath(raw)` from `validateCanonicalPath(level, CellKey[])`. The validator should become monolingual.

### 4. Level identity remains plural after durable IDs landed

The repo still uses durable level IDs, array positions, full textual IDs, numeric suffixes, and structural fingerprints for different purposes. `parseLevelSelector()` and `parseLevelPositions()` intentionally implement separate address spaces.

The July 2026 level-ID plan's governing invariant was that durable artifacts should not be keyed by array position. Much of that migration landed, but current research CLI semantics still preserve position as a peer addressing protocol.

**Direction:** durable research/tool identity should be level ID. Position should survive only as explicit UI/debug addressing and should be converted immediately at the boundary.

### 5. Direct, worker, and raced solving are overlapping execution protocols

`solver-worker-client.ts` documents that worker `solve()` consumes raw wire levels while direct `solve()` consumes normalized levels; false-goal worker search uses normalized levels. The raced engine separately implements only a subset of the production ladder.

This family has already caused concrete defects:
- worker transport dropped SolveOpts/result fields;
- raced transports silently dropped unsupported SolveOpts;
- reports could describe budgets/options not actually enforced.

`toRaceLevelOpts()` is a good fail-loud repair, but it protects a split execution model rather than eliminating it.

**Direction:** define one canonical solve request/result envelope. Direct and worker execution should consume it. A partial/raced backend should advertise a distinct capability contract instead of partially impersonating full solve.

### 6. Current report combination accepts raw shards and its own flattened output

`combine-solver-sweep-reports.mjs` accepts both `{summary, levels}` shard reports and already-flattened outputs. It mutates flattened input by synthesizing a `summary` wrapper so the rest of the combiner can proceed uniformly.

This was added to support legitimate cross-run reconciliation, but it is live input polymorphism.

**Direction:** create one explicit `readSweepReportInput()` boundary returning a canonical internal report. New producers should emit one canonical envelope; recombination should not require a second current schema.

### 7. Research block/population semantics live in several locations

`research-relations-lib.mjs` currently resolves:
- block from `document.researchBlock ?? document.population.researchBlock`;
- population identity from `document.populationIdentity ?? document.population.corpusIdentity ?? document.population.populationIdentity`.

`research-consumption-link.mjs` contains sibling fallback logic.

This is particularly important because the seam is new, not historical. The research system is still creating current multi-location semantics.

**Direction:** define one shared research envelope and one shared extractor/validator. New producers write exactly one location; old forms are ingress-only.

### 8. Research relation construction still performs archaeology inline

Examples include:
- `premiseId ?? id ?? propositionId`;
- status-like reads across `status ?? state ?? reliability`;
- durable evidence manifest location via explicit `manifestStoredPath` or legacy `files[].source === 'manifest.json'`;
- structured Lane-A cut identity with fallback delimiter parsing from `caseId`.

Several of these are correct historical readers. The issue is ownership: they live inside general relation/query paths.

**Direction:** historical normalization should happen before relation construction. General research relations should receive canonical rows.

### 9. Family indexing performs live mixed-era reconciliation

`family-index-lib.mjs` reads historical `wide-trove` and canonical `variant-family-dataset` attempt artifacts, then reconciles logical rows:
- canonical duplicates replace historical copies;
- historical-only rows survive;
- conflicts survive as separate evidence;
- mixed-era statistics are emitted.

This is scientifically conservative, but it is stronger than "read an old schema": it is a live cross-era merge protocol.

**Direction:** determine whether historical attempt material can be imported once into a provenance-preserving canonical archive. If yes, remove live mixed-era merging. If not, isolate it behind an explicit archival evidence adapter.

### 10. Hint/provenance upgrade logic is correctly boundary-shaped, but must become exclusive

`upgradeProvenanceEntry()` and `upgradeLegacyHints()` already model the desired architecture: accept old shapes once and emit canonical records.

The remaining audit question is whether downstream code still dual-reads old provenance fields after this boundary.

**Direction:** enforce a "no legacy field reads downstream of upgrader" invariant.

### 11. Current ablation/config input still accepts retired feature vocabulary

`LEGACY_FEATURE_ALIASES` and `canonicalAblationFeatureName()` make old feature names executable input today.

Historical manifests need this. Fresh CLI/workflow/config input does not.

**Direction:** split historical feature decoding from current configuration parsing. Current input rejects retired feature names.

### 12. Explicit-versus-derived authority is another compatibility protocol

Several systems accept either:
- a modern explicit semantic declaration, or
- enough older fields to infer/reconstruct it.

Examples include decision-valid population integrity and report-state fallback.

Inference can be appropriate at import time, but letting both protocols remain live indefinitely means absence never becomes meaningful.

**Direction:** normalize inferred historical values at ingress; current producers must write explicit authority fields.

### 13. Research sidecars expose an event-versus-copied-aggregate choice

Research consumption sidecars currently copy the full `researchBlock` plus append consumption events. `research:relations` merges copies with the same block ID, checks the non-consumption definition for equality, and unions events.

This is currently controlled and tested, not a bug. But it is early enough to decide whether consumption lineage should be:
- copied block aggregates that must be reconciled, or
- append-only events referencing one immutable block definition.

**Direction:** investigate before the copied-aggregate form spreads.

## Classification

The important classification is not "legacy vs current". It is:

1. **Current dual authority** — remove one representation.
2. **Current polymorphic input** — canonicalize the public/current protocol.
3. **Execution capability mismatch** — split or unify the interface honestly.
4. **Historical import** — keep, but isolate at ingress.
5. **Archive reconciliation** — decide whether to migrate once or preserve a dedicated archival adapter.
6. **Derived fallback authority** — materialize canonical semantics and stop inferring in ordinary current paths.

## Architectural invariant

The proposed governing rule is:

> Every important solver/research concept should have one canonical internal representation, one canonical durable identity, one canonical current input protocol, one canonical persistence shape, and one current authority location. Historical or foreign forms may survive only in explicit boundary adapters that immediately emit the canonical form.

Corollaries:

- new producers are canonical-only;
- current APIs are canonical-only;
- historical normalization is centralized;
- frozen evidence is never rewritten merely for neatness;
- no semantic layer should need to know which historical spelling/container/layout supplied a canonical object;
- compatibility readers must not double as current input languages.

## Priority order

Highest-value contraction targets:

1. hint `hints` / `hintRecords` dual mutable state;
2. direct/worker/raced solve request semantics;
3. research envelope location and extraction;
4. corpus document/wrapper hidden state;
5. current-vs-historical config vocabulary;
6. sweep-report input schemas;
7. path wire decoding versus canonical validation;
8. durable research level addressing;
9. archival family-attempt reconciliation;
10. event-sidecar versus copied-block lineage.

The first six have already generated bugs, hidden state, repeated fallback logic, or self-misdescribing evidence. They deserve priority over cosmetically removing old aliases that no longer have live callers.

# Solver protocol/schema contraction plan

> **Status:** active implementation plan
> **Opened:** 2026-09-20
> **Audit basis:** [protocol/schema contraction audit 001](../reports/2026-09-20-protocol-schema-contraction-audit-001.md)
> **Purpose:** reduce live solver/research polymorphism without rewriting historical evidence or losing durable compatibility.
> **Progress (2026-09-20, PR #1937):** current APIs/producers are increasingly canonical-only while historical compatibility is being pushed behind named ingress readers. Eleven registry seams are now closed. This session closed the hint mutable-representation seam (canonical Hint records are the sole write authority; bare paths are derived), the corpus-document seam (explicit {levels, metadata, storageShape} end to end; LEVEL_WRAPPERS and array facades removed), and the SolveOpts work-budget seam (baseWorkBudget only on current input). It also removed residual stage-budget option aliases that contradicted PSC-022's earlier closeout and repaired the resulting stale CI fixtures/types without restoring retired compatibility. Remaining work is concentrated in candidate-path caller cleanup, sweep/research envelope finalization, historical-reader censuses, population-integrity output contraction, durable level addressing, family-attempt archival strategy, hint-provenance old-field audit, explicit corpus write-set semantics, and the research-consumption sidecar model.

## Goal

Make current Pathfinder solver and research machinery **canonical-only internally and at current write/input surfaces**, while retaining explicit historical readers where evidence or persisted user data genuinely requires them.

This is not another naming cleanup. The target is deeper:

- two mutable representations of one concept;
- several current input encodings of one semantic type;
- different execution backends pretending to share one interface while honoring different contracts;
- one semantic datum stored in several locations;
- current tools that re-wrap, infer, reconcile, or synthesize alternate schemas;
- historical normalization embedded inside general semantic/query layers;
- multiple durable identities for the same research object.

The finish line is:

> **New producers canonical-only. Current APIs canonical-only. Historical normalization centralized. Frozen evidence unchanged.**

## Non-goals

- Do not rewrite dated/frozen reports merely to modernize vocabulary.
- Do not drop persisted external/user data that has no safe migration path.
- Do not replace clear specialist contracts with a giant universal schema.
- Do not force conceptually different identities to collapse merely because their field names resemble one another.
- Do not redesign solver behavior or scientific methodology unless a protocol seam currently changes or misdescribes behavior.
- Do not convert archive readers into live input aliases.

## Governing rules

### Rule 1: Canonicalize once

A historical/foreign shape may be accepted at a named ingress boundary. After that boundary, downstream code should not inspect the old spelling, layout, identity grammar, or container shape again.

### Rule 2: Read-many is not write-many

Historical readers may support several versions. Current writers emit exactly one version.

### Rule 3: Current input is not historical input

A frozen manifest may decode a retired feature/stage/config name. A fresh CLI invocation or workflow input should reject it.

### Rule 4: One mutable authority

Derived projections may coexist with canonical state, but there should not be two independently mutable sibling fields that later require reconciliation.

### Rule 5: Capability mismatch must be explicit

If a backend cannot honor the full canonical request contract, it should expose a narrower capability contract rather than silently dropping fields or partially impersonating the full operation.

### Rule 6: Identity conversions happen at boundaries

Array position, display labels, fingerprint/content identity, persistent level ID, run ID, block ID, and population identity may all legitimately exist. Their roles must be distinct. Durable research references should not use presentation/order identity.

### Rule 7: Archive reconciliation is a special service

Mixed-era evidence reconciliation belongs in an explicit archival adapter or one-time canonical import, not invisibly inside ordinary current query paths.

## Work packages

The plan is intentionally organized by architectural contraction rather than old cleanup phase numbers. Several packages can proceed in parallel after the initial inventory.

---

## A. Establish contraction ownership and executable inventory

**Objective:** make the target surface measurable before deleting compatibility.

### A1. Add a machine-readable seam registry

Create a compact registry, preferably `docs/solver-protocol-schema-contraction.json`, with one row per identified seam:

- seam ID;
- concept;
- current owner(s);
- old/current shapes;
- whether current writers emit more than one form;
- whether current inputs accept more than one form;
- historical evidence requirement;
- persisted external/user-data requirement;
- treatment:
  - `remove-current-alias`
  - `single-mutable-authority`
  - `canonical-ingress-adapter`
  - `execution-contract-split`
  - `one-time-migrate-active-state`
  - `permanent-archive-reader`
  - `investigate`;
- proof/consumer check;
- status;
- retirement gate.

Seed it from the audit, not from the 96 historical naming-ledger `dual-read` rows. The naming ledger is evidence, not the active backlog.

### A2. Add structural residue checks

Prefer small semantic checks over broad regex bans.

High-value checks:

- legacy feature names cannot appear in current workflow/CLI config producers;
- current research artifacts cannot introduce a second location for `researchBlock` / population identity;
- current hint writers cannot mutate both `.hints` and `.hintRecords`;
- current report producers cannot emit both shard and flattened current schemas;
- direct/worker request serializers must cover the canonical request contract or declare unsupported capability;
- downstream code after provenance/hint upgrade cannot read retired provenance fields.

### A3. Record archive-reader allowlist

Explicitly enumerate intentional permanent historical readers, including:

- family-run manifest v1;
- known-prefix schema v1;
- historical family attempt path conventions;
- persisted hint provenance generations;
- level-rating/fingerprint migration readers where still needed.

Anything not on the allowlist must justify continued dual-read behavior.

**Acceptance:** registry exists, each high-priority seam has owner/treatment/retirement gate, and checks distinguish archive compatibility from current compatibility.

---

## B. Collapse current dual mutable state and container ambiguity

This package removes the most dangerous shape overlap without touching solver search behavior.

### B1. Hint state: make Hint records authoritative

Current problem:
`readLevelsWithHints()` exposes mutable `.hints` and `.hintRecords`; writes reconcile them.

Target:

- canonical mutable field is provenance-rich Hint records;
- bare paths are derived through a helper/view;
- callers that only need paths request/project them;
- write APIs consume canonical records;
- `reconcileHints()` remains only as a migration/import helper if historical fixtures require it.

Migration strategy:

1. census current writers that assign `.hints`;
2. convert them to mutate canonical records;
3. provide transitional read-only projection helper;
4. delete write-time two-authority reconciliation;
5. simplify/remove `UNTOUCHED_HINTS_STATE` if no longer needed for write ownership;
6. retain concurrency safety via explicit touched-level/write-set semantics rather than array-reference inference.

Do **not** weaken the existing sharded-write safety.

### B2. Corpus document: remove hidden wrapper state

Current problem:
bare-array and wrapped corpus documents are returned as arrays plus hidden `LEVEL_WRAPPERS` metadata.

Target:

```
readCorpusDocument(path) -> CanonicalCorpusDocument
levelsOf(document) -> Level[]
writeCorpusDocument(path, document)
```

Historical bare-array files may normalize at read time. No hidden WeakMap should determine output schema.

### B3. Make write intent explicit

Where current APIs accept a full corpus snapshot but only mutate a subset, add explicit changed IDs/write-set semantics. Avoid inferring mutation from object/array reference identity.

**Acceptance:** one mutable hint authority; corpus serialization shape is explicit; no hidden wrapper metadata; concurrent shard writes remain safe.

---

## C. Unify semantic decoding boundaries

This package moves format interpretation out of correctness and semantic layers.

### C1. Candidate path decoder

Split:

- `decodeCandidatePath(rawPath)`
- `validateCanonicalPath(level, packedKeys)`

Retain support for historical/external path encodings only in the decoder.

New internal producers should emit one packed/canonical representation.

### C2. Research artifact envelope

Define one shared extractor/validator for common research metadata:

- `researchBlock`
- `populationIdentity`
- optional question/run/selection lineage where genuinely shared.

Choose one canonical current location and migrate current producers.

Historical alternatives:
- top-level `populationIdentity`;
- `population.corpusIdentity`;
- `population.populationIdentity`;
- top-level versus nested `researchBlock`;

should normalize only through the shared ingress adapter.

Remove duplicated fallback chains from `research-relations-lib.mjs`, `research-consumption-link.mjs`, and later consumers.

### C3. Relation-layer historical decoders

Move these out of general relation construction where practical:

- premise `id/propositionId -> premiseId`;
- `status/state/reliability` compatibility;
- legacy durable-bundle manifest discovery;
- Lane-A case-ID delimiter recovery.

The relation layer should operate on canonical rows.

### C4. Provenance canonicality enforcement

Keep `upgradeProvenanceEntry()` / `upgradeLegacyHints()`, but add a test/invariant that no downstream canonical consumer reads retired fields such as `profile`, `template`, `diverseBeam`, flat `solverTechnique`, etc.

**Acceptance:** correctness/query layers no longer contain wire-format archaeology; decoders are named boundaries with canonical outputs.

---

## D. Contract the execution protocols

This package addresses the seam with the highest history of self-misdescribing evidence.

### D1. Define a canonical solve request/result contract

Create a typed canonical request containing at least:

- normalized/canonical level representation;
- canonical SolveOpts;
- execution capability/mode if needed;
- cancellation/yield semantics expressed separately from serializable data.

Create one canonical result shape for direct and worker full-solver execution.

### D2. Make raw normalization an explicit caller boundary

Worker and direct full solver should not disagree on whether `solve()` consumes raw or normalized levels.

Preferred direction:

- canonical `solveCanonical(request)` consumes normalized level;
- optional convenience `solveRaw(raw, opts)` normalizes then delegates;
- worker messages carry the canonical serializable request.

### D3. Stop partial engines impersonating full solve

The raced engine currently supports only a subset of stages/options.

Choose one:

1. make it execute the actual canonical orchestration under parallel scheduling, **or**
2. expose it as a narrower `RaceSolveRequest` / `RaceSolveResult` capability with explicit supported semantics.

Do not preserve an API where arbitrary SolveOpts are accepted and then projected to a subset.

`toRaceLevelOpts()` can become the seed of the narrower contract rather than a permanent compatibility firewall.

### D4. Transport parity becomes type/contract parity

Replace hand-maintained "did we remember every field?" checks with:

- serializers generated/typed from the request contract where possible;
- exhaustive tests for serializable fields;
- fail-loud rejection of non-serializable callback/test hooks.

**Acceptance:** direct and worker full solve share one request/result meaning; partial/raced execution has an honest separate contract or uses full orchestration; no report can record unenforced options as effective configuration.

---

## E. Contract current CLI/configuration and identity languages

### E1. Retired feature/stage/config names

Split current configuration parsing from historical decoding.

- current CLI/workflows/API: canonical feature names only;
- historical manifests/results: `normalizeHistoricalFeatureName()` or equivalent;
- remove old aliases from ordinary feature-validity predicates.

Apply the same principle to stage IDs, scheduler names, and attempt-identity grammars where old input is still accepted live.

### E2. Durable level addressing

Set a clear rule:

- persistent level ID is the durable solver-research address;
- array position is presentation/debug order only.

Current tools that need position may accept `pos:` explicitly, but persisted artifacts should record canonical ID and preferably reject position-only identity where a corpus ID exists.

Review `parseLevelSelector()` and `parseLevelPositions()` callers and shrink the latter to genuinely positional tools.

### E3. Package/command aliases

Re-audit naming-ledger package aliases against current `package.json` and workflows.

Delete already-dead ledger assumptions from the active registry. Retire any surviving source-interface aliases that have no current caller.

**Acceptance:** current invocation/config languages are canonical-only; historical spelling support is no longer executable fresh input.

---

## F. Normalize report and artifact schemas at ingress

### F1. Solver sweep reports

Define one current report envelope.

`combine-solver-sweep-reports.mjs` may continue to read:
- raw historical shard reports;
- historical flattened reports;

but through `readSweepReportInput()` that emits one canonical internal shape.

New producers should not create two peer schemas.

If re-combination of current reports is a required operation, the canonical output must itself be valid canonical input without synthetic mutation.

### F2. Explicit versus inferred integrity/state

For current outputs, require explicit fields such as:
- decision-valid completeness;
- artifact coverage;
- structured report state/closeout metadata.

Historical inference remains inside versioned readers.

### F3. Schema-version discipline

Where current artifacts already carry `schemaVersion`, stop using field-presence guessing as the primary version detector. Versioned adapters should own migrations.

**Acceptance:** one current write schema per artifact family; old shapes enter through versioned readers, not ad hoc field probes.

---

## G. Decide archival reconciliation strategy

This package is intentionally after the current-system contractions.

### G1. Family attempt evidence

Evaluate the live `wide-trove` + `variant-family-dataset` reconciliation.

Question:

Can all historically relevant rows be represented in a canonical immutable archive artifact with source-era provenance and conflict preservation?

If yes:
- build one migration/import;
- verify logical-row parity;
- freeze source artifacts unchanged;
- switch family indexing to canonical archive + current artifacts.

If no:
- keep the mixed-era reader;
- move it behind an explicit `readHistoricalFamilyAttemptEvidence()` boundary;
- prevent current producers from ever writing the old convention.

### G2. Archive-reader contract tests

For every permanent reader, prove both:
- authentic old fixture still normalizes correctly;
- current producer cannot emit the old form.

### G3. Retire accidental archaeology

Any compatibility path with no authentic retained fixture/evidence dependency should be deleted, not immortalized.

**Acceptance:** archival readers are few, named, fixture-backed, and cannot become current writers/input aliases.

---

## H. Resolve research-block sidecar model before it spreads

This is an investigation package, not a presumed rewrite.

Current shape:
- base artifacts carry `researchBlock`;
- consumption sidecars carry another full `researchBlock` with appended events;
- relation building checks block-definition equality and merges event lists.

Compare two models:

### Model A: copied aggregate

Keep current behavior, but formalize:
- immutable block-definition hash;
- append-only event merge semantics;
- explicit authoritative source for block definition.

### Model B: immutable block + event refs

- one block definition;
- sidecars carry only `blockId`, population identity/seal, and events;
- relation layer joins events to the block.

Choose using:
- ease of portable evidence bundles;
- offline readability;
- conflict detection;
- duplication cost;
- risk of divergent block copies;
- current artifact independence requirements.

Do not migrate until one model clearly reduces complexity.

**Acceptance:** one documented model becomes canonical; no third variant appears.

---

## Execution order

The order is chosen to remove bug-producing ambiguity before low-value cosmetic residue.

### Wave 1: boundaries and inventory
A, then C2/C4. These create the rules and prevent fresh seams while work continues.

### Wave 2: highest-risk live duality
B1 hint authority and D execution contracts in parallel. They touch different domains but both have a history of real correctness/data-loss defects.

### Wave 3: current languages and report envelopes
E + F. Once canonical boundaries exist, retire fresh-input aliases and polymorphic report production.

### Wave 4: remaining structural cleanup
B2/B3, C1/C3, durable level-addressing cleanup.

### Wave 5: archive contraction
G. Historical reconciliation comes last so current architecture is not designed around old data.

### Wave 6: sidecar decision
H, informed by the now-cleaner research-envelope model.

## Safety strategy

Every contraction needs one of these proofs before deletion:

1. **No-current-consumer proof:** repo workflows/scripts/tests no longer call the alias/form.
2. **Migration proof:** active mutable state was converted and re-read canonically.
3. **Boundary-normalization proof:** authentic historical fixtures normalize to identical canonical semantics.
4. **Parity proof:** old and new execution paths produce the same canonical request/effective configuration/results where equivalence is claimed.
5. **Archive preservation proof:** frozen artifacts remain byte-unchanged and queryable through the retained adapter.

For scientific evidence, semantic parity matters more than byte parity. Preserve:
- population identity;
- configuration/effective protocol;
- independent unit;
- outcome classification;
- work/budget meaning;
- provenance ancestry.

## Tests to add early

- canonical hint-state mutation round trip;
- no dual mutable hint fields in current writers;
- canonical corpus-document round trip for published/stress fixtures;
- candidate-path decoder fixtures for all retained historical encodings;
- direct vs worker canonical request/result parity;
- raced capability rejection/contract tests;
- research envelope extraction across authentic historical forms plus one canonical current form;
- "new producer emits canonical form only" tests;
- retired current config spellings reject;
- current sweep output is valid canonical sweep input without schema synthesis;
- permanent archive reader fixture suite.

## Documentation integration

- This file owns the contraction program.
- `reports/2026-09-20-protocol-schema-contraction-audit-001.md` owns the founding audit/evidence.
- `docs/naming-cleanup-ledger.json` remains historical migration evidence, not the backlog.
- `docs/architecture-unification-debt.md` should receive only surviving architectural debt after concrete packages close, not duplicate live task state.
- `docs/solver-future-work.md` should carry only deferred/reopen descendants that survive this program.
- Solver research priority remains owned by `solver-optimization-workstreams.md`; this plan is infrastructure/correctness work and must not masquerade as a solver capability experiment.


## 2026-09-20 implementation checkpoint

The live finish-line interpretation is now concrete:

- **Closed current hint duality:** setLevelHintRecords() is the mutation boundary for batch, import, editor, async-load, and review paths. writeLevelCorpusDocumentWithHints() persists hintRecords directly and never reconciles a sibling .hints write back into canonical state. Historical bare paths are upgraded only on ingress.
- **Closed hidden corpus container state:** production callers carry the explicit corpus document. The LEVEL_WRAPPERS WeakMap plus readLevelsWithHints() / writeLevelsWithHints() compatibility facade are gone; array/object on-disk shapes remain explicit storage metadata.
- **Closed current work-budget alias:** SolveOpts.workBudget and solve-time dual-read logic are gone. baseWorkBudget is the sole current solver input; report/result workBudget remains valid descriptive data.
- **Corrected PSC-022 residue:** retired dedupNearTie*, attractionDiversity*, and mainLoopLateReserve* SolveOpts aliases are no longer read in stage-budget planning, and tests no longer preserve them.
- **Still open inside package B:** concurrency safety still uses read-time hintRecords reference identity to skip untouched hint files. B3 should replace that implicit touched-state heuristic with an explicit write-set/changed-ID contract before the overall package is considered maximally contracted.

## Completion criteria

The plan is complete when all of the following are true:

- no current solver/research producer writes a retired schema/name/layout;
- no current CLI/API silently accepts historical vocabulary unless explicitly designated import/replay;
- canonical hint state has one mutable authority;
- corpus document shape is explicit, not WeakMap-reconstructed;
- direct and worker full-solver execution share one request/result contract;
- partial/raced execution no longer claims full SolveOpts semantics it cannot honor;
- research block/population identity have one canonical current location;
- relation/query layers no longer contain scattered historical field archaeology;
- current sweep/report producers emit one schema per artifact family;
- durable research level references use persistent IDs, not array position;
- permanent historical readers are explicit, fixture-backed, and isolated;
- frozen evidence remains unchanged;
- the contraction registry contains no unresolved live seam except deliberately deferred items with precise reopen conditions.

## Immediate first implementation slice

After the registry lands, start with the two seams that have already produced concrete failures:

1. **hint canonical authority**
   - inventory writers;
   - introduce canonical mutation helpers;
   - migrate one contained writer family;
   - prove sharded-write safety.

2. **research envelope**
   - create one shared extractor/validator;
   - move `research-relations-lib.mjs` and `research-consumption-link.mjs` onto it;
   - declare one canonical current layout;
   - add rejection test preventing a new producer from using alternate locations.

These are deliberately smaller than the full execution-contract rewrite, and they create reusable patterns for the remaining work.

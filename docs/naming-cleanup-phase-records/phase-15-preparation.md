# Phase 15 preparation: compatibility boundaries and solver-research handoff

> **Status:** preparation/audit only. No Phase-15 canonical rename is implemented by this document.
>
> **Audit base:** current `main` after Phase 14 closure.
>
> **Rows:** NC-P15-001 through NC-P15-007.

## 1. Why this preparation exists

The post-Phase-8-14 solver-resumption audit found that the live solver workstream survived the naming migration in current vocabulary, while many evidence reports correctly remain frozen in historical vocabulary. Safe resumption therefore depends on the claimed compatibility readers actually existing and on current authorities remaining unambiguous.

Phase 15 must close that semantic bridge before the naming plan archives. A green lexical residue check is not sufficient evidence that a historical reader exists: earlier audits found a Phase-8 checker could count a legacy token in a comment as a retained compatibility read. For Phase 15, historical-read evidence must execute a representative fixture through the owning reader to a canonical internal form.

## 2. Current boundary audit

### NC-P15-001: family root CLI/API

Current owner remains `scripts/family-paths.mjs`:

- `troveRootArg()` accepts only `--trove-root=...`;
- `familyArtifactRoots()` receives the resolved root;
- current family/index/replay consumers import this shared owner.

This is a real external/developer CLI transition. Phase 15 should add canonical-first dual-read at this one owner, reject conflicting old/new arguments, migrate current docs/callers to canonical syntax, and avoid copying alias knowledge into individual family tools.

### NC-P15-002: family evaluation run-manifest schema

This is a real generated-data reader/writer boundary:

- `buildFamilyEvaluationRunManifest()` currently writes schema version 1 with required field `trove`;
- `validateFamilyEvaluationRunManifest()` requires it;
- `family-index-lib.mjs` validates run manifests and includes `trove` in the cross-shard invariant;
- producer tests exercise writer -> validator -> family-index ingestion.

Phase 15 needs a canonical field plus an explicit legacy-normalizing reader, a representative v1 historical fixture, canonical single-write proof, and cross-shard invariant parity.

### NC-P15-003: dated wide-trove discovery

`family-index-lib.mjs` still discovers `wide-trove-attempts-*.json` and current family tooling/workflow provenance still contains dated/wide-trove conventions. Historical paths are genuine evidence identities and must stay discoverable. New-run paths should switch only after the index can ingest both conventions into one logical evidence model.

### NC-P15-004: application/Firestore fingerprint cluster

The current graph is deliberately mixed and must not be mass-renamed:

- submission documents already persist `levelFingerprint` plus `fingerprintVersion`;
- level-rating and local-level-hint repositories use the fingerprint value as a Firestore document/path identity;
- application duplicate-check helpers and state/ports still contain generic `fingerprint` locals/fields.

Phase 15 must partition **application vocabulary** from **stored identity** before editing. Stored document IDs, version semantics, and old document readability are behavior, not naming debris. Representative existing Firestore-shaped fixtures are mandatory.

### NC-P15-005: CP-SAT explicit-prefix result/job identities

The surfaced tool/workflow is already reference-named, but the current generated/workflow contract still includes historical oracle terminology:

- result rows write `oracleLabel` and `oracleReason`;
- the workflow combine step groups by `oracleLabel`;
- workflow job id `oracle-shards` is referenced by `needs`;
- input format/value `atlas-abstain` and reasons such as `oracle-unknown` remain live compatibility identities.

This is an atomic writer/combiner/workflow migration. Phase 15 must distinguish persisted data compatibility from workflow-local job IDs and historical enum values rather than treating every `oracle` token alike.

### NC-P15-006: shared CP-SAT branch-label eligibility library

The shared file `scripts/stress/lib/atlas-eligibility.mjs` is consumed by both:

- `collect-prune-gap-labels.mjs` via `selectEligibleAtlasLevels`;
- `cpsat-hint-harvest-sweep.mjs` via `selectUnharvestedCpsatLevels`, which delegates to the same eligibility function.

The corresponding workflow also names the old source file in current comments. The private file/symbol rename has no persistence need: migrate the shared library and every import/current reference together, with the eligibility population held invariant.

### NC-P15-007: atlas-directory CLI/report boundary

Both `mc-crossing-slack-analysis.mjs` and `offline-replay-harness.mjs` currently accept `--atlas-dir` and write atlas-named result metadata. `docs/solver-offline-replay-harness.md` teaches the old CLI.

This row requires one more implementation-time reader census before choosing compatibility semantics. If no maintained consumer actually parses historical `atlasDir`/`atlasFiles` result fields, Phase 15 must not invent a dead normalizer merely to satisfy the ledger's current `dual-read` label. Amend the compatibility contract to the evidence actually found, while preserving frozen report interpretability.

## 3. Solver-research handoff gate

Phase 15 is not complete merely when NC-P15-001 through NC-P15-007 are lexically migrated. Before final plan/ledger archival:

1. finalize `docs/solver-research-post-naming-resumption.md`;
2. keep the existing attempt/stage/routing historical normalizers as the only maps for those identities;
3. extend `test:solver-research-resumption` with representative Phase-15 historical fixtures or named stronger tests;
4. prove legacy read -> canonical internal form -> canonical single-write separately for every real persisted/data boundary;
5. prove current solver authorities contain current vocabulary while frozen reports remain untouched;
6. capture a small post-Phase-15 solver-research baseline before decision-bearing solver work resumes.

A compatibility row with no real current/historical reader must be amended honestly instead of manufacturing unused compatibility code.

## 4. Change envelope

This preparation may add documentation, fixtures, and checks required to make Phase-15/handoff verification executable. It must not rename the seven deferred Phase-15 boundaries, change solver policy, alter artifact schemas, modify Firestore identity, change CP-SAT eligibility, or rewrite historical evidence.

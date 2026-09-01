# Phase 15 execution and closeout record

Status: **15A contract-decomposition gate active; no Phase-15 implementation rename has begun**

Execution branch: `chatgpt/phase15a-contract-decomposition-2026-08-31`  
Execution PR: **#1638**  
Entry base: `fad988569c70802db7d69b85f4443a4daf0486a6` (current `main` at Phase-15 entry)  
Preparation authority: [phase-15-preparation.md](phase-15-preparation.md)  
Independent pre-entry repair record: [pre-phase-15-audit-repairs.md](pre-phase-15-audit-repairs.md)  
Plan authority: [../naming-cleanup-plan.md](../naming-cleanup-plan.md)

This file is the live Phase-15 execution/closeout authority required by the hardened plan. The
preparation record remains a frozen snapshot. Implementation-time reconciliation in this file wins
when it records a newer observation from the Phase-15 entry base.

## 15A change envelope

15A is specification/control-plane work only. It may:

- reconcile and split ledger rows;
- classify compatibility ownership and schema versions;
- register the Phase-15 serial batch order and merge barriers;
- harden the ledger checker/status view for rowless lifecycle gates;
- update current routing docs so they point at this execution record;
- add tests that prove the 15A inventory/control-plane contract.

15A must **not** rename any NC-P15 implementation surface. In particular, this batch leaves
`--trove-root`, `troveRootArg`, family-run manifest `trove`, dated `wide-trove` output paths,
application `fingerprint` locals/state, CP-SAT `oracle*` result identities,
`atlas-eligibility.mjs`, `--atlas-dir`, and `atlasDir`/`atlasFiles` untouched in executable
production/research code.

Invariant observables for this gate are therefore the pre-15B source spellings themselves plus
unchanged solver/application behavior.

## Entry-state evidence

### Current-main control-plane baseline

The final head of PR #1637 was
`b67c89ce03f75a838d9ca7a1528e7f3b2d7c2ac6`. GitHub reports that branch as zero commits/files
ahead of current `main`; current `main` is the merge commit
`fad988569c70802db7d69b85f4443a4daf0486a6` with the same tree.

CI run **33450978049** completed successfully on that exact tree. Its Node-test job
**99680632491** ran `npm run test:node`; the log records:

- `test:naming-cleanup-ledger` exit 0, whose self-test executes the ledger checker and
  `naming-cleanup-status.mjs --json`;
- `test:naming-cleanup-surface-inventory` exit 0, including a repository reconciliation census for
  Phases 8-15.

The 15A implementation-time census below then re-read the concrete owners from current `main`
rather than treating the earlier preparation snapshot as sufficient.

### Overlap / branch recovery check

At entry there were **no open pull requests matching Phase 15**. The three Phase-15-named branches
from preparation/hardening were compared against `main`:

- `chatgpt/harden-phase15-plan-2026-08-31`: ahead 0, behind 1;
- `chatgpt/phase15-solver-resumption-prep-2026-08-31`: ahead 0, behind 40;
- `chatgpt/pre-phase15-audit-repairs-2026-08-31`: ahead 0, behind 11.

None contains unique work to recover. They are merged/superseded historical branches, not parallel
Phase-15 implementation authorities.

## 15A row-homogeneity result

The seven inherited rows are not all homogeneous. Stable IDs are preserved by narrowing their
meaning; split contracts receive new immutable IDs. The resolved serial ownership is:

| Batch | Stable row(s) | Resolved contract |
|---|---|---|
| 15B | NC-P15-006 | shared CP-SAT branch-label eligibility file/export/import graph |
| 15C | NC-P15-001, NC-P15-008 | external dataset-root CLI compatibility; private root helper/local vocabulary |
| 15D | NC-P15-002 | family-run manifest persisted schema |
| 15E | NC-P15-003, NC-P15-009 | historical/canonical attempt discovery; current dataset output path convention |
| 15F | NC-P15-004 | application-local level-fingerprint vocabulary, with stored identities held invariant |
| 15G | NC-P15-005, NC-P15-010, NC-P15-011, NC-P15-012 | explicit-prefix result schema; workflow-local job ID; external case-format token; known-prefix branch source schema |
| 15H | NC-P15-007, NC-P15-013 | prune-gap CLI/local vocabulary; generated report fields |
| 15I | rowless | independent merged-tree hostile closeout + solver-research resumption |
| 15J | rowless | archival/finalization and immutable completion evidence |

15A itself is a rowless specification gate. `phaseBatches["15"]`,
`phaseBatchKinds["15"]`, and the flat batch-completion registry are the machine authority for this
sequence. A later batch cannot become active until every predecessor is recorded merged.

## Contract census and decisions

### NC-P15-006 — CP-SAT branch-label eligibility library — batch 15B

**Current owner/writer:** no persisted writer. Source authority is
`scripts/stress/lib/atlas-eligibility.mjs`.

**Current readers/consumers:**

- `scripts/stress/collect-prune-gap-labels.mjs` imports `selectEligibleAtlasLevels`;
- `scripts/stress/cpsat-hint-harvest-sweep.mjs` imports
  `selectUnharvestedCpsatLevels`, which delegates through the same eligibility predicate.

**Historical reader / persisted identity:** none.

**Canonical target occupancy:** no current
`scripts/stress/lib/cpsat-branch-label-eligibility.mjs` owner was found. The target is free for this
concept.

**Resolved contract:** direct atomic source rename:
`atlas-eligibility.mjs` -> `cpsat-branch-label-eligibility.mjs`,
`selectEligibleAtlasLevels` -> `selectEligibleCpsatBranchLevels`, and
`isEligibleForCpsatAtlas` -> `isEligibleForCpsatBranchLabeling`. No compatibility
filename/export alias.

**Parity proof required in 15B:** pin the selected eligible/unharvested population on representative
real data before/after, plus import-health/current-consumer tests.

### NC-P15-001 — external variant-family dataset-root CLI — batch 15C

The inherited row mixed an external CLI with a private helper name. It is narrowed to the CLI only.

**Current writer/parser:** `scripts/family-paths.mjs` parses only `--trove-root=PATH`.

**Current readers/callers:** family index/current family tooling consumes the shared parsed root;
`scripts/family-index.mjs` documents the old flag. The root is a real operator-facing boundary
because the large variant-family dataset is mounted separately from current `main`.

**Persisted identity/schema:** none.

**Resolved contract:** canonical `--variant-family-dataset-root=PATH`, with
`--trove-root=PATH` retained as one explicitly owned external-config transition alias in the
shared parser. Supplying both with conflicting values must fail; same-value dual spelling may be
accepted. Canonical docs/current commands single-write the new spelling.

**Retirement:** Phase-15 review may remove the alias only if the external/operator surface is shown
to have no remaining supported caller.

### NC-P15-008 — private family dataset-root helper/local vocabulary — batch 15C

Split from NC-P15-001 because private source names do not share the CLI alias lifetime.

**Current owner:** `scripts/family-paths.mjs` exports `troveRootArg`; family-index and related
current family tooling import/use it. Parameters/locals named `troveRoot` refer to the same mounted
variant-family dataset root.

**Historical/external contract:** none. JavaScript source imports are migrated atomically.

**Resolved target:** `variantFamilyDatasetRootArg` and
`variantFamilyDatasetRoot` where the value specifically means that root. No private compatibility
alias.

### NC-P15-002 — family-run manifest schema — batch 15D

**Current writer:** `buildFamilyEvaluationRunManifest` in
`scripts/experiment-manifest-lib.mjs`.

**Current schema:** schemaVersion **1** requires `trove` through `FAMILY_RUN_REQUIRED`.

**Current readers:** `validateFamilyEvaluationRunManifest` and
`scripts/family-index-lib.mjs`; the index treats `trove` as a cross-shard invariant and joins run
evidence from it.

**Historical reader:** the same validator/index path is the owning reader for already-generated
schema-v1 family-run manifests.

**Resolved target and version decision:** new writers emit schemaVersion **2** with
`variantFamilyDataset`. The owner must normalize authentic v1 `trove` fixtures to the same
canonical in-memory model, reject conflicting dual-field input, and never emit fresh `trove`.
Historical v1 read support is permanent while these manifests remain supported evidence.

### NC-P15-003 — family attempt-artifact discovery — batch 15E

The inherited row mixed reader discovery with writer filenames. It is narrowed to discovery.

**Current reader:** `scripts/family-index-lib.mjs` discovers historical/current attempt evidence
through `wide-trove-attempts-*.json` matching and derives corpus metadata from that filename.

**Historical evidence:** committed/frozen `2026-08-07-wide-trove-*` artifacts are genuine
historical paths and must not be rewritten.

**Resolved contract:** the index becomes the single discovery owner for both historical
`wide-trove-attempts-*` and new `variant-family-dataset-attempts-*` filenames, normalizing both
to one canonical evidence model. Historical discovery support is permanent.

### NC-P15-009 — current variant-family dataset output paths — batch 15E

Split from NC-P15-003 because new-run writer naming and historical-reader discovery have different
lifetimes.

**Current writers/consumers:** `scripts/merge-variant-family-dataset-shards.mjs` and
`.github/workflows/collect-variant-family-dataset.yml` still create, print, upload, publish, and
`git add` dated `2026-08-07-wide-trove-*` paths.

**Resolved target:** current new runs use stable
`reports/families/variant-family-dataset-summary.md`,
`reports/families/variant-family-dataset-attempts-<corpus>-part<NN>.json`, and a matching
`variant-family-dataset-source-run.json` provenance path. Existing dated files remain frozen.
Current workflow/artifact wiring migrates atomically.

**Canonical target occupancy:** the stable report filenames are not currently occupied by a
different concept.

### NC-P15-004 — application-local level-fingerprint vocabulary — batch 15F

The inherited row's `dual-read` classification was incorrect after implementation-time census.

**Current persisted identities already canonical/invariant:**

- submissions store `levelFingerprint` and `fingerprintVersion`;
- duplicate detection queries the persisted `levelFingerprint` field;
- rating documents use the computed fingerprint value as the Firestore document ID;
- local-level-hint documents use the same fingerprint value as a Firestore path key;
- the fingerprint algorithm/version and legacy-fingerprint migration path already have their own
  compatibility semantics.

**Remaining legacy surface:** application state, helper result objects, locals, and repository
parameter names such as `rating.fingerprint`, `LocalCorpusMatch.fingerprint`,
`DuplicateCheckPresentation.fingerprint`, `loadLevelRating(fingerprint)`, and
`getLocalLevelHints(fingerprint)`.

**Historical reader:** there is no persisted field named generic `fingerprint` in this cluster that
needs a new dual-read adapter.

**Resolved contract:** direct internal application rename to `levelFingerprint`; keep computed
fingerprint values, Firestore document/path IDs, persisted `levelFingerprint` fields,
`fingerprintVersion`, duplicate semantics, old-document lookup/migration, ratings, hints, and
submission behavior byte/identity-equivalent. No fake compatibility object is created.

### NC-P15-005 — CP-SAT explicit-prefix result schema — batch 15G

The inherited row mixed result schema with workflow-local IDs and external input tokens. It is
narrowed to the result schema.

**Current writer:** `scripts/stress/cpsat-explicit-prefix-reference.mjs` writes schemaVersion 1
rows with `oracleLabel` and `oracleReason`; UNKNOWN writes `oracle-unknown`.

**Current reader/combiner:** `.github/workflows/cpsat-explicit-prefix-reference.yml` combines only
the shards produced by that same workflow run. Every shard checks out `${{ github.sha }}`, so the
normal execution graph is schema-homogeneous by construction.

**Historical-reader finding:** no maintained repository tool was found that reopens historical
explicit-prefix result artifacts and consumes `oracleLabel`/`oracleReason`. No committed
explicit-prefix result fixture is a current input authority. A hypothetical mixed v1/v2 shard set
would therefore be a synthetic compatibility surface, not evidence of a supported reader.

**Resolved target/version:** new result schemaVersion **2** writes `referenceLabel`,
`referenceReason`, and `reference-unknown`; the current writer and same-run combiner cut over
atomically. Historical schema-v1 result artifacts remain frozen. Do **not** add a dead v1 result
normalizer unless a maintained historical consumer is actually introduced or discovered.

### NC-P15-010 — explicit-prefix workflow-local shard job ID — batch 15G

Split from NC-P15-005.

**Current identity:** job ID `oracle-shards`, referenced by
`needs: [plan, oracle-shards]`.

**Persistence/external reader:** none. GitHub workflow-local dependency identity only.

**Resolved target:** `reference-shards`, migrated atomically with every `needs`/expression
reference. No compatibility alias or historical normalizer.

### NC-P15-011 — explicit-prefix external case-format token — batch 15G

Split from NC-P15-005.

**Current external surface:** workflow input `case_format` defaults to `atlas-abstain`; the script
passes it as `--format`; `extractExplicitPrefixCases` dispatches on that literal.

**Resolved target:** `reference-abstain` as the canonical current input spelling, with
`atlas-abstain` retained by the one input parser as an external-config transition alias. Conflicting
or ambiguous future forms must not fork parser behavior. Current workflow/docs use only the
canonical spelling after migration.

### NC-P15-012 — known-solution-prefix branch source schema — batch 15G

Newly exposed by the 15A census. This is not frozen-only vocabulary.

**Current writer:** `scripts/stress/collect-known-solution-prefix-branches.mjs`, using
`enumerateKnownPrefixBranches` from `research-analysis-lib.mjs`, writes schemaVersion 1 with:

- top-level `oracle` metadata;
- `unknownSiblingLabel: "oracle-abstain"`;
- branch `label: "oracle-abstain"`;
- `summary.oracleAbstentions`.

**Current/historical reader:** `extractExplicitPrefixCases(..., {format: ...})` consumes the
committed `winning-prefix-atlas-pilot-2026-08-11.json` shape by selecting
`row.label === "oracle-abstain"`.

**Resolved target/version:** new source artifacts become schemaVersion **2** and use reference/branch
label vocabulary (`reference`, `reference-abstain`, and a canonically named summary field). The
extractor is the historical normalization owner for v1 and v2, and must preserve the frozen
2026-08-11 fixture. New writes are v2-only. This compatibility is permanent while old prefix-branch
artifacts remain admissible evidence.

### NC-P15-007 — prune-gap directory CLI/local vocabulary — batch 15H

The inherited row incorrectly treated `ATLAS_DIR` as an environment variable and bundled generated
report fields with CLI parsing.

**Current surfaces:**

- `scripts/stress/offline-replay-harness.mjs` accepts `--atlas-dir` and stores it in local
  `ATLAS_DIR`;
- `scripts/stress/mc-crossing-slack-analysis.mjs` does the same;
- `docs/solver-offline-replay-harness.md` teaches the old CLI.

No current workflow/package caller or environment-variable read for `ATLAS_DIR` was found.

**Resolved contract:** direct current-surface rename to `--prune-gap-dir` and local
`PRUNE_GAP_DIR`. Because the repository has no demonstrated current machine/external caller for
the old flag beyond the current documentation that will migrate in the same batch, 15A removes the
invented dual-read requirement. A legacy CLI alias may be reintroduced only if 15H finds an actual
supported external caller.

### NC-P15-013 — prune-gap generated-report fields — batch 15H

Split from NC-P15-007.

**Current writers:**

- `mc-crossing-slack-analysis.mjs` emits `atlasDir` and `atlasFiles`;
- `offline-replay-harness.mjs` emits `atlasDir`.

**Current/historical readers:** no maintained repository reader of those metadata fields was found;
the tools consume `prune-gap-*.json` files, not each other's summary metadata.

**Resolved contract:** new reports write `pruneGapDir` / `pruneGapFiles`; old generated reports
remain frozen. No dead report normalizer or dual-read layer is created.

## Deferred derived vocabulary: repairLateProbe / REPAIR_LATE_PROBE

15A classifies this family as **separately deferred vocabulary debt**, not a Phase-15 mapping.

Current source proves the spellings span materially different contracts:

- `repairLateProbe?: boolean` is a compatibility-only fallback for persisted/historical attempt
  telemetry that predates canonical `stageId`;
- `STRATEGY_REPAIR_LATE_PROBE` is an active ablation/config identity;
- `REPAIR_LATE_PROBE_NODE_BUDGET` and multi-seed constants participate in budget policy;
- `repairLateProbeNodeBudgetOverride` is a batch/research solve option;
- tests and workflow/research surfaces depend on those exact identities;
- the canonical stage identity is already `late-repair-search`.

There is no one behavior-preserving mass-rename contract with a settled compatibility owner and
replacement vocabulary. Pulling this family into the final naming phase would enlarge solver-policy,
historical-telemetry, and external-config risk without a demonstrated current defect. It therefore
remains explicit deferred debt. Any future rename requires its own specification and migration
review; Phase 15 must not opportunistically change it.

## Current-authority semantic inventory

15A inspected the current routing/authority layer rather than relying on a fixed lexical allowlist:

- `AGENTS.md` naming-cleanup routing and variant-family dataset boundary;
- `docs/README.md` naming/current-reference index and post-Phase-15 solver route;
- `docs/change-recipes.md` contract-migration and batch-authority procedure;
- `docs/architecture.md` and `docs/solver-architecture.md`;
- `docs/typing.md`;
- `docs/tooling-catalog.md` naming status/tool discovery;
- `scripts/README.md` and `.github/workflows/README.md`;
- `docs/solver-research-post-naming-resumption.md`;
- `docs/solver-optimization-workstreams.md`;
- package-script and workflow-dispatch surfaces relevant to the rows above.

15A updates only the routing statements that become stale by starting this execution record. Semantic
content belonging to 15B-15H remains unchanged until its owning migration batch.

## Executable legacy-reader proof matrix

15A keeps a dual-read claim only where a current owner actually exercises the legacy form:

- **NC-P15-001:** `scripts/family-paths.mjs::troveRootArg` is the live shared parser for
  `--trove-root`; `test:naming-cleanup-phase15-entry` executes that parser with the legacy CLI.
- **NC-P15-002:** `test:family-run-manifest-producer` and `test:family-index` execute schema-v1
  family-run manifests carrying `trove` through the current validator/index path.
- **NC-P15-003:** `test:family-index` constructs the historical
  `wide-trove-attempts-*` path convention and exercises current family-index discovery.
- **NC-P15-011 / NC-P15-012:** `test:research-analysis-lib` exercises the current
  `extractExplicitPrefixCases` owner with the legacy `atlas-abstain` format and
  `oracle-abstain` branch label; `test:naming-cleanup-phase15-entry` additionally reads the sparse-safe minimized fixture
  `docs/naming-cleanup-phase-records/fixtures/phase15-winning-prefix-v1.json` through that same owner. The
  fixture records source path `reports/stress/winning-prefix-atlas-pilot-2026-08-11.json` and source
  blob SHA `3de81cc8f95862c7f7142511e06f7bdb72710d52`.
- **NC-P15-005 is deliberately absent:** no maintained historical result reader was found, so 15A
  removed the inherited dual-read claim rather than manufacturing one.

## 15A validation contract

The branch adds `test:naming-cleanup-phase15-entry` and includes it in `test:node`. It must prove:

1. the Phase-15 execution record/batch order/kinds are registered;
2. `naming:status --json` identifies Phase 15 / 15A and the rowless active-gate state;
3. the ledger checker accepts a rowless declared gate but rejects starting 15B before 15A is
   recorded merged;
4. the pre-implementation source spellings above are still present and canonical implementation
   targets have not been prematurely introduced;
5. the row split/schema-version/deferred-vocabulary decisions remain represented in the ledger.

Before this PR can be merged, exact-head CI must be green. 15B must then start from the merged 15A
tree, record the actual 15A PR/merge commit in `batchCompletions["15A"]`, and only then claim 15B
active.

## 15I / 15J reserved closeout sections

15I is intentionally empty until every implementation batch 15B-15H is merged. Its first action is a
read-only hostile audit of merged `main`, followed by the solver-research resumption evidence
required by the plan. Findings precede repairs.

15J is intentionally empty until 15I is merged and green. It owns immutable implementation/CI/merge
evidence, retirement decisions, and the archival handoff. Its handoff PR remains an active rowless
`finalization` batch with `batchCompletions["15J"]` pending until that PR actually merges.

After the 15J handoff merge, one narrow completion-seal PR/commit records that now-known PR/merge SHA
under `batchCompletions["15J"]`, moves `activeExecution` to idle, performs any terminal archive
routing that requires completed state, and is the only authorized transition to
`lastCompletedPhase: 15` / naming-cleanup `status: complete`. This seal is not a 15K migration
batch and may not contain new rename work. Its own exact-head CI plus Git history prove the seal;
requiring the completed ledger to contain the SHA of the commit that contains itself would be
self-referential and is deliberately not part of the contract.


## 15A merge evidence

Phase 15A completed as specification/control-plane PR **#1638**.

- final head: `af882b27c6c8442022286586814943f33384bfec`;
- exact-head CI: run **33454401488**, all six CI jobs successful;
- exact-head browser characterization: run **33454401532**, successful;
- merge commit: `4b61b59dfba6dada48f316edcdb6e9b4daa6683e`;
- 15B base-main SHA: the same merge commit;
- ledger `batchCompletions["15A"]` is now the machine-readable merge barrier evidence.

## 15B — NC-P15-006 shared CP-SAT branch-label eligibility library

Status: **implementation complete; awaiting final exact-head CI and merge**

Branch: `chatgpt/phase15b-cpsat-branch-label-eligibility-2026-08-31`  
PR: **#1639**  
Base main: `4b61b59dfba6dada48f316edcdb6e9b4daa6683e`

### Pre-edit impact map

Owner:

- `scripts/stress/lib/atlas-eligibility.mjs`.

Current exports:

- `isEligibleForCpsatAtlas`;
- `selectEligibleAtlasLevels`;
- `selectShardByRoundRobin`;
- `isHarvestedByCpsat`;
- `selectUnharvestedCpsatLevels`.

Maintained import consumers found at batch entry:

- `scripts/stress/collect-prune-gap-labels.mjs` imports
  `selectEligibleAtlasLevels` and `selectShardByRoundRobin`;
- `scripts/stress/cpsat-hint-harvest-sweep.mjs` imports
  `selectUnharvestedCpsatLevels` and `selectShardByRoundRobin`.

No persisted schema, CLI spelling, workflow identity, or historical import compatibility owner exists
for this library. 15A therefore requires an atomic direct rename, with no forwarding file or legacy
export alias.

Exact canonical targets locked by 15A:

- file: `scripts/stress/lib/cpsat-branch-label-eligibility.mjs`;
- predicate: `isEligibleForCpsatBranchLabeling`;
- selector: `selectEligibleCpsatBranchLevels`.

The already-specific `selectShardByRoundRobin`, `isHarvestedByCpsat`, and
`selectUnharvestedCpsatLevels` names remain unchanged unless implementation evidence proves a
semantic conflict.

### Behavior/change envelope

The batch may change only naming/import/comment/test surfaces required by NC-P15-006. It must not
change the eligibility predicate:

1. a level is eligible iff it has at least one stored hint path;
2. levels with `filters` are excluded;
3. levels with `flippingFilters` are excluded;
4. portals remain eligible;
5. round-robin sharding is unchanged;
6. harvested detection remains the presence of provenance technique
   `cpsat-reference-probe`;
7. unharvested selection remains eligibility followed by harvested exclusion.

One current consumer comment incorrectly says portals are filtered out. 15B may correct that prose
because it directly describes this owner, but the executable portal behavior is an invariant.

### Validation topology

Before completion, 15B must provide:

- direct unit parity over hint/no-hint, filter, flipping-filter, portal, harvested, and unharvested
  cases;
- before/after identity for eligible and unharvested IDs on a representative authentic fixture or
  current corpus slice;
- import-health proof for both maintained consumers;
- old-name residue proof over maintained source/current docs for this row;
- canonical target occupancy proof showing the new filename/export names identify this one concept;
- full relevant Node/check/lint/build CI and exact-head PR CI.

The remaining 15C-15H source-freeze assertions stay active; only the NC-P15-006 part of the 15A
freeze may transition to canonical in this batch.


### 15B implementation and validation evidence

Implemented in PR **#1639** from base
`4b61b59dfba6dada48f316edcdb6e9b4daa6683e`.

The executable change is an atomic direct current-source migration:

- physical library owner is now
  `scripts/stress/lib/cpsat-branch-label-eligibility.mjs`;
- predicate is now `isEligibleForCpsatBranchLabeling`;
- selector is now `selectEligibleCpsatBranchLevels`;
- `selectShardByRoundRobin`, `isHarvestedByCpsat`, and
  `selectUnharvestedCpsatLevels` retain their already-specific identities;
- the two maintained tool consumers import only the canonical library;
- the old file was deleted with no forwarding shim or old-export alias.

Behavioral parity is executable, not inferred from the textual diff.
`test:cpsat-branch-label-eligibility` passed in CI run **33455234408** and proves:

- no hint path remains ineligible;
- static filters and flipping filters remain ineligible;
- portals remain eligible;
- CP-SAT harvest provenance detection is unchanged;
- unharvested selection remains eligibility minus harvest provenance;
- round-robin sharding is unchanged;
- the authentic minimized current-data fixture preserves its pre-edit eligible and unharvested ID
  population exactly as `["R00001", "R00059"]`; portal-bearing R00059 remains selected and
  flipping-filter R00039 remains excluded.

Authentic fixture provenance is recorded in
`fixtures/phase15b-cpsat-branch-label-eligibility.json` against:

- random stress corpus blob `860e00da91b76dfca8cdefa7b15994782175e44c`;
- R00001 hint blob `2e5b54e4a5e0931f812fe6385049f1e527e2500d`;
- R00059 hint blob `6854788645f62565953a1c31c00cb3512c0ed3e8`;
- R00039 hint blob `d286b7bfbd74f3981c251ce915de0d36ebd9cb41`.

Consumer-inward closeout is owned by
`check:naming-cleanup-phase15b-closeout`. In the same green CI run it scanned maintained text
surfaces, found zero retired NC-P15-006 path/export identities outside naming authorities/guards,
and proved canonical import ownership is exactly the two maintained consumers plus the parity test.

15B also fulfilled the pre-existing Phase-8 deferred-retention contract
`NC-RET-P08-009` ("retain until all shared consumers migrate"). That retained-surface registry
entry and its Phase-8 closeout references were removed after every registered consumer migrated.
This was required to keep the old Phase-8 ledger contract truthful after the physical source file
was deleted.

CI usefully caught and forced repair of three control-plane assumptions during implementation:

1. the Phase-15 progression guard initially still asserted the 15A old-file state;
2. Phase-8 retained-surface evidence still pointed at the deleted deferred library;
3. the 15A merge-barrier negative fixture implicitly relied on 15A still being pending.

All three were repaired without relaxing their underlying invariants. The merge-barrier fixture now
constructs the forbidden pre-merge state explicitly and remains a permanent negative test.

Implementation-head CI run **33455234408** is green across build, checks, lint, node tests, deep
proofs, and coverage. The row is now `done` and `activeExecution` is idle, but
`batchCompletions["15B"]` deliberately remains pending until PR #1639 actually merges. A fresh
exact-head CI run after this bookkeeping closeout is required before merge.


## 15B merge evidence

Phase 15B completed as implementation PR **#1639**.

- final head: `1aa440697e083ce243f3c61237073fcec4a66a17`;
- implementation-head green CI: run **33455234408**;
- final done/idle exact-head CI: run **33455520229**, all six CI jobs successful;
- final exact-head browser characterization: run **33455520341**, successful;
- merge commit: `56a69e483e267a6da4aaa92acc172e994e2c541e`;
- 15C base-main SHA: the same merge commit;
- ledger `batchCompletions["15B"]` is now the machine merge-barrier evidence.

## 15C — NC-P15-001 / NC-P15-008 variant-family dataset-root vocabulary

Status: **active**

Branch: `chatgpt/phase15c-variant-family-dataset-root-2026-08-31`  
PR: **#1640**  
Base main: `56a69e483e267a6da4aaa92acc172e994e2c541e`

15C owns two deliberately separated lifetimes:

- **NC-P15-001**: external CLI transition from `--trove-root` to
  `--variant-family-dataset-root`, with one shared parser owning the temporary legacy alias;
- **NC-P15-008**: private source/API vocabulary `troveRootArg` / `troveRoot` for that mounted
  dataset root, migrated directly with no private compatibility alias.

The batch must prove canonical-only current docs/callers, same-value dual-argument acceptance,
conflicting dual-argument rejection, default-current-working-directory behavior, and atomic private
import migration. It must not change family artifact path semantics or dataset content.


### 15C implementation and validation evidence

Implemented in PR **#1640** from base
`56a69e483e267a6da4aaa92acc172e994e2c541e`.

The current-source migration is deliberately split by lifetime:

- the shared external parser now accepts canonical
  `--variant-family-dataset-root=PATH`;
- `--trove-root=PATH` remains readable only at that parser as the one temporary external alias;
- canonical + legacy spellings that resolve to the same absolute path are accepted;
- conflicting resolved paths are rejected before a family tool can select data;
- no-argument behavior remains `process.cwd()`;
- private `troveRootArg` / `troveRoot` source vocabulary is removed rather than aliased;
- family index and parent-hint-replay consumers import/use only
  `variantFamilyDatasetRootArg` / canonical root vocabulary;
- current family research/tooling docs teach the canonical CLI;
- Phase-15D manifest field `trove` and Phase-15E historical
  `wide-trove-attempts-*` discovery remain untouched.

`test:variant-family-dataset-root` is an executable compatibility proof. It covers direct parser
behavior plus the real `family:index` entrypoint under canonical-only, legacy-only, same-value
dual, and conflicting-dual invocations. It also pins `familyArtifactRoots` path semantics.

`check:naming-cleanup-phase15c-closeout` scans maintained scripts/docs/workflows and proves:

- no retired private `troveRootArg` / `troveRoot` vocabulary remains;
- the temporary `--trove-root` CLI exists on maintained current surfaces only in
  `scripts/family-paths.mjs`;
- canonical parser ownership is exactly the shared parser plus
  `family-index.mjs` and `family-parent-hint-replay-batch.mjs`;
- current front-door family docs/tooling expose the canonical CLI.

CI usefully caught three closeout/control-plane assumptions before completion:

1. the first closeout assertion required the canonical CLI text to include a literal trailing
   `=`, which was too presentation-specific for prose docs and was relaxed to the actual CLI token;
2. the compatibility test initially lived at a general script path, causing the Phase-8 retained
   `trove` scanner to correctly classify its legacy-alias fixture text as live residue; the test
   moved under the naming-cleanup guard namespace instead of expanding the old retained-surface
   allowlist;
3. the generic Phase-9 closure self-test reset later row status but not later serial-batch merge
   records; it now resets both so historical closure fixtures are lifecycle-independent.

Implementation-head exact CI run **33459622550** is green across build, checks, lint, node tests,
deep proofs, and coverage. Exact-head browser characterization run **33459622623** is also green.
NC-P15-001 and NC-P15-008 are now `done` and `activeExecution` is idle, while
`batchCompletions["15C"]` deliberately remains pending until PR #1640 actually merges. A final
exact-head CI run on this done/idle bookkeeping state is required before merge.


## 15C merge evidence

Phase 15C completed as implementation PR **#1640**.

- final head: `f4a73fcd451fba1bbd440f6d75252075b4cf5bc9`;
- implementation-head green CI: run **33459622550**;
- final done/idle exact-head CI: run **33460063214**, all six CI jobs successful;
- final exact-head browser characterization: run **33460063149**, successful;
- merge commit: `300d26bd35886f01b8fccebac0453d6d7bdc226a`;
- 15D base-main SHA: the same merge commit;
- ledger `batchCompletions["15C"]` is now the machine merge-barrier evidence.

## 15D — NC-P15-002 family-run manifest schema v2

Status: **implementation complete; awaiting final exact-head CI and merge**

Branch: `chatgpt/phase15d-family-run-manifest-v2-2026-08-31`  
PR: **#1641**  
Base main: `300d26bd35886f01b8fccebac0453d6d7bdc226a`

15D owns only the persisted/generated family evaluation run-manifest contract:

- current schema v1 field `trove`;
- canonical schema v2 field `variantFamilyDataset`;
- new writes must be schemaVersion 2 and single-write only the canonical field;
- the one validator/normalizer permanently reads authentic schema-v1 `trove` manifests;
- all-legacy, all-canonical, and mixed-era shard groups must normalize to one invariant model;
- conflict behavior must be explicit if malformed input carries both spellings;
- no unrelated Phase-15E artifact-path discovery/output rename is permitted in this batch.

Pre-edit work begins with a current writer/reader/fixture census before code changes.


### 15D pre-edit census and resolved implementation seam

The current-tree census found one canonical producer/normalizer seam and one consumer join seam:

- `scripts/experiment-manifest-lib.mjs::buildFamilyEvaluationRunManifest` was the only shared
  current writer helper and emitted schemaVersion 1 with `trove`;
- `scripts/collect-variant-family-dataset-shard.mjs` is the maintained bulk-family shard producer
  using that helper;
- `scripts/experiment-manifest-lib.mjs::validateFamilyEvaluationRunManifest` is the one current
  run-manifest validator used by family indexing;
- `scripts/family-index-lib.mjs` normalizes each discovered run manifest through that validator
  before grouping shards, then formerly compared/exposed `trove` as an invariant;
- no committed historical family-run `manifest.json` artifact exists on `main`, so
  `docs/naming-cleanup-phase-records/fixtures/phase15d-family-run-manifest-v1.json` freezes the
  exact pre-15D v1 contract from base `300d26bd35886f01b8fccebac0453d6d7bdc226a` for permanent
  reader coverage;
- adjacent `wide-trove-attempts-*` discovery in `family-index-lib.mjs` belongs to NC-P15-003/009
  (15E) and is deliberately untouched.

### 15D implementation contract now encoded in source/tests

- new `buildFamilyEvaluationRunManifest` output is schemaVersion **2** and contains only
  `variantFamilyDataset`;
- `validateFamilyEvaluationRunManifest` permanently upgrades schema-v1 `trove` input to an
  in-memory schema-v2 `variantFamilyDataset` model;
- schema-v2 input must contain the canonical field;
- an object carrying both spellings is rejected rather than precedence-resolved;
- unsupported schema versions remain rejected;
- `family-index-lib.mjs` groups only the normalized canonical field, which makes v1/v1, v2/v2,
  and v1/v2 shard sets comparable without raw-era drift;
- new producer output never writes `trove`;
- all-v1, all-v2, mixed-era, conflict, and authentic-v1 normalization proofs are executable;
- `check:naming-cleanup-phase15d-closeout` permanently pins the one legacy reader, canonical
  writer/consumer ownership, and the deliberate 15E `wide-trove-attempts-*` non-change.


### 15D cross-shard invariant correction discovered during implementation

The workflow wiring exposed a pre-existing contradiction in the v1 contract. Each Actions shard
creates and passes a different source slice:

- `wide-shard-01-slice.json`;
- `wide-shard-02-slice.json`;
- and so on.

The v1 writer stored that per-shard `shardFile` inside `trove`, while
`family-index-lib.mjs` compared the entire `trove` object as a run-level invariant. A real
multi-shard run could therefore be diagnosed as internally inconsistent solely because each shard
correctly named its own input slice. Existing tests hid this by giving both shards the same
`shardFile`.

15D resolves the contradiction without deleting provenance:

- each v1/v2 shard manifest still retains its own `shardFile`;
- the family index derives run-level `variantFamilyDataset` identity by excluding only the
  shard-local `shardFile`;
- it aggregates those local paths separately as sorted/deduplicated
  `variantFamilyDatasetShardFiles`;
- all other dataset metadata remains part of the cross-shard invariant;
- the era-matrix test now deliberately gives shard 1 and shard 2 different slice paths, so this
  failure mode cannot be reintroduced accidentally.

This correction is inside NC-P15-002's required cross-shard invariant proof. It does not alter
15E's artifact discovery/output-path contract.

### 15D mixed-era structural-equality hardening

A skeptical closeout read found one additional mixed-era hazard after the first green implementation
head: run invariants were still compared with raw `JSON.stringify`. JSON object key insertion order
is not semantic schema content, so an authentic v1 artifact and a v2 artifact carrying equivalent
metadata in different key order could be falsely diagnosed as an inconsistent run.

15D now compares invariant JSON values structurally by recursively sorting object keys while
preserving array order. A regression test deliberately reorders the v1 shard's `solverPolicy` and
dataset metadata relative to its v2 peer and proves they still normalize to one complete canonical
run. This changes only false-negative equality behavior; genuinely different values and array order
remain conflict-producing.


### 15D implementation and validation evidence

Implementation is complete on the hardened head descended from
`300d26bd35886f01b8fccebac0453d6d7bdc226a`.

The final implementation contract is:

- new family-evaluation run manifests write schemaVersion **2** and
  `variantFamilyDataset` only;
- authentic schema-v1 `trove` manifests normalize permanently through
  `validateFamilyEvaluationRunManifest` to the same canonical in-memory v2 model;
- malformed dual-field input is rejected rather than precedence-resolved;
- the maintained bulk-family producer uses only the canonical writer field;
- family-index grouping consumes only the normalized canonical dataset identity;
- shard-local `shardFile` provenance is retained per shard but excluded from run-level identity,
  then aggregated as `variantFamilyDatasetShardFiles`;
- all-v1, all-v2, mixed-v1/v2, conflicting dual-field, cross-shard provenance, output-artifact
  joining, and authentic-v1 normalization are executable tests;
- mixed-era invariant comparison is structural and key-order-insensitive for objects while retaining
  array order and value differences;
- Phase-15E historical `wide-trove-attempts-*` discovery remains untouched.

Implementation-head exact CI run **33461568649** passed all six jobs after the structural-equality
hardening. Exact-head browser characterization run **33461568646** also passed.

NC-P15-002 is now `done` and `activeExecution` is idle. As with 15B/15C,
`batchCompletions["15D"]` remains pending until the implementation PR actually merges. A fresh
exact-head CI/browser run on the done/idle bookkeeping head is required before merge.


## 15D merge evidence

Phase 15D completed as implementation PR **#1641**.

- final head: `62c1a6283b1bfd0917aa0ef513ceecfee74a1267`;
- hardened implementation-head CI: run **33461568649**, all six jobs successful;
- hardened implementation-head browser characterization: run **33461568646**, successful;
- final done/idle exact-head CI: run **33461871053**, all six jobs successful;
- final done/idle browser characterization: run **33461870878**, successful;
- merge commit: `b00c68f3495ec6591f3846ac0bf2e519f2613a1e`;
- 15E base-main SHA: the same merge commit;
- ledger `batchCompletions["15D"]` is now the machine merge-barrier evidence.

## 15E — NC-P15-003 / NC-P15-009 variant-family artifact paths

Status: **active**

Branch: `chatgpt/phase15e-variant-family-artifact-paths-2026-08-31`  
PR: **#1642**  
Base main: `b00c68f3495ec6591f3846ac0bf2e519f2613a1e`

15E separates two lifetimes that previously shared the `wide-trove` vocabulary:

- **NC-P15-003** owns permanent discovery/readability of genuine historical
  `wide-trove-attempts-*` evidence alongside canonical
  `variant-family-dataset-attempts-*` paths;
- **NC-P15-009** owns current producer/workflow output paths for new runs and must single-write
  stable `variant-family-dataset` names.

Frozen dated historical artifacts are not renamed, moved, or rewritten. Discovery must normalize
old and new path conventions through one owner before current writers cut over.


### 15E implementation-time census and resolved precedence

The current owner graph is narrow but cross-boundary:

- `scripts/family-index-lib.mjs` was the maintained discovery reader for
  `wide-trove-attempts-<corpus>-partNN.json`;
- `scripts/merge-variant-family-dataset-shards.mjs` still defaulted new coverage output to
  `reports/families/2026-08-07-wide-trove-summary.md` and wrote all new consolidated attempt
  chunks under dated `wide-trove` names;
- `.github/workflows/collect-variant-family-dataset.yml` printed, uploaded, published, and staged
  those dated summary/attempt paths and wrote the standard sweep provenance to the dated
  `2026-08-07-wide-trove-source-run.json` path;
- no canonical stable summary/attempt/source-run path was occupied by another concept;
- the actual historical bulk artifacts live off current `main` with the variant-family dataset,
  so 15E must preserve their readability without trying to move them in this code PR.

Reader precedence is explicit rather than row-level guesswork. For each corpus:

1. if any canonical `variant-family-dataset-attempts-*` chunks exist, that canonical aggregate set
   is the current discovery source for that corpus;
2. otherwise historical `wide-trove-attempts-*` chunks remain permanently discoverable;
3. old and new aggregate conventions are never ingested together for one corpus, preventing the
   same consolidated evidence from being double-counted merely because frozen history remains.

This matches the writer contract: a canonical aggregate is a current replacement view of that
corpus's consolidated solve files, not an additional independent experiment.

### 15E writer cutover and stable-filename lifecycle

New writes now use:

- `reports/families/variant-family-dataset-summary.md`;
- `reports/families/variant-family-dataset-attempts-<corpus>-partNN.json`;
- `reports/families/variant-family-dataset-source-run.json`.

Stable filenames create one lifecycle requirement that dated one-off names could obscure: a later
run may produce fewer attempt chunks than an earlier run. The merger therefore deletes **only**
previous canonical `variant-family-dataset-attempts-*` chunks before writing the new set. It never
deletes historical `wide-trove` artifacts. The workflow stages the canonical wildcard through a
quoted `git add -A` pathspec so deleted stale higher-numbered chunks are committed as deletions
rather than surviving on the research branch.

### 15E executable proof surface

- `test:family-index` now proves historical-only fallback and canonical-per-corpus precedence when
  both conventions coexist;
- `test:merge-variant-family-dataset-shards` runs the real merger in a temporary working tree and
  proves canonical summary/attempt output, stale canonical chunk deletion, and frozen historical
  file survival;
- `check:naming-cleanup-phase15e-closeout` pins the dual-era reader owner, all three canonical
  current workflow paths, canonical-only current writer behavior, and deletion-staging pathspec;
- Phase-15 progression/source-freeze checks now permit the 15E cutover while keeping 15F-15H
  implementation rows pending.


### 15E implementation and validation evidence

Implementation is complete on PR **#1642** from base
`b00c68f3495ec6591f3846ac0bf2e519f2613a1e`.

The final 15E contract is:

- historical dated and undated `wide-trove-attempts-*` artifacts remain permanently discoverable;
- canonical `variant-family-dataset-attempts-*` files take precedence per corpus when present,
  preventing old/new aggregate double-counting;
- current merger output single-writes stable
  `variant-family-dataset-summary.md` and
  `variant-family-dataset-attempts-<corpus>-partNN.json`;
- current workflow publication/provenance single-writes
  `variant-family-dataset-source-run.json`;
- reruns delete only stale canonical attempt chunks before writing replacements;
- workflow staging uses `git add -A` for the canonical attempt wildcard so stale higher-numbered
  parts are committed as deletions;
- frozen historical `wide-trove` artifacts are never deleted or rewritten.

Executable proof is carried by:

- `test:family-index`, including authentic dated historical fallback and canonical-per-corpus
  precedence;
- `test:merge-variant-family-dataset-shards`, exercising the real merger in a temporary tree and
  proving stable output, stale canonical cleanup, and historical-file survival;
- `check:naming-cleanup-phase15e-closeout`, pinning the one dual-era reader owner plus canonical
  merger/workflow paths and deletion staging;
- the Phase-15 progression/source guard, which keeps 15F-15H pending.

Implementation-head commit `aeadeeb670b41650cbbb9c3225b7f730382721bb` passed exact-head CI
run **33462905089** across all six jobs and exact-head browser characterization run
**33462905117**.

NC-P15-003 and NC-P15-009 are now `done` and `activeExecution` is idle.
`batchCompletions["15E"]` deliberately remains pending until PR #1642 actually merges. A fresh
exact-head CI/browser run on this done/idle bookkeeping head is required before merge.


## 15E merge evidence

Phase 15E completed as implementation PR **#1642**.

- final head: `c226d12e027df23006c79d537ea7e180a0489901`;
- implementation-head green CI: run **33462905089**, all six CI jobs successful;
- implementation-head browser characterization: run **33462905117**, successful;
- final done/idle exact-head CI: run **33463342137**, all six CI jobs successful;
- final done/idle browser characterization: run **33463342135**, successful;
- merge commit: `502dd2c610cd36b5ecea656b655ae570e068cbb9`;
- 15F base-main SHA: the same merge commit;
- ledger `batchCompletions["15E"]` is now the machine merge-barrier evidence.

## 15F — NC-P15-004 application-local level-fingerprint vocabulary

Status: **implementation complete; awaiting final exact-head CI and merge**

Branch: `chatgpt/phase15f-level-fingerprint-vocabulary-2026-08-31`  
PR: **#1643**  
Base main: `502dd2c610cd36b5ecea656b655ae570e068cbb9`

15F is a direct internal vocabulary migration. It changes generic application-local
`fingerprint` names that specifically mean the level fingerprint to `levelFingerprint`.

The persistence/identity boundary is deliberately invariant:

- Firestore submission documents already persist `levelFingerprint` and `fingerprintVersion`;
- rating documents remain keyed by the computed fingerprint value as the document ID;
- local-level-hint paths remain keyed by the same computed fingerprint value;
- `LEVEL_FINGERPRINT_VERSION`, `getLevelFingerprint`, and
  `getLegacyLevelFingerprints` keep their identities and behavior;
- the fingerprint bytes/value for a level must not change;
- legacy-version rating lookup/migration must remain behaviorally identical;
- duplicate detection, local-corpus matching, hint contribution, rating load/save, and
  submission behavior must remain equivalent.

### Pre-edit owner/consumer map

Application/state surfaces identified at batch entry include:

- `modules/engine/level-rating-manager.ts`: level-rating state/context locals and
  persistence calls;
- `modules/state/actions/rating-actions.ts`: level-rating context field assignment;
- `modules/input/submission-controller.ts`: cached local-corpus fingerprint rows and
  duplicate-check presentation consumption;
- `modules/input/submission-core.ts`: `LocalCorpusMatch`,
  `DuplicateCheckPresentation`, and pure local-match/duplicate-presentation helpers;
- `modules/persistence/level-rating-repository.ts`: private repository parameters;
- `modules/persistence/local-level-hints-repository.ts`: private repository parameters/path helper;
- `modules/persistence/level-submission-repository.ts`: private duplicate-check locals/parameters
  and returned presentation field where generic `fingerprint` means the level fingerprint.

Persisted document field names already canonical under `levelFingerprint` are not rename targets.

### Required proof

15F must add executable tests that prove:

1. computed level fingerprint values are identical before/after for representative real/raw levels;
2. rating load/save receives the exact same document-key value;
3. legacy rating lookup/migration uses the exact same old/current fingerprint values and order;
4. submission duplicate checks still query persisted `levelFingerprint` and return the same
   duplicate/hint-addition semantics;
5. local-level-hint Firestore path identity is unchanged;
6. generic application-local `fingerprint` residue for this contract is gone without renaming
   unrelated fingerprint concepts or `fingerprintVersion`;
7. 15G/15H source-freeze surfaces remain untouched.




### 15F red-CI audit finding and repair

PR #1643 exact-head CI run **33463929847** was red only in the Node-test job. The failure came from
the older Phase-8 closeout guard, and it exposed two different classes of issue:

1. **real missed NC-P15-004 owners:** `modules/data.ts`, `modules/dev-corpus.ts`,
   `modules/persistence/review-repository.ts`, and `modules/ports.ts` still used generic
   `fingerprint` parameter/local names that specifically meant the level fingerprint;
2. **stale Phase-8 assumptions:** NC-P08-008 still classified the broad application fingerprint
   cluster as a retained boundary and still pinned `fingerprint` in `modules/state-slices.ts`
   and `level-rating-repository.ts` as the expected API shape.

The four missed live identifiers were migrated to `levelFingerprint` without changing values,
Firestore fields, document IDs, path keys, algorithm/version, or call ordering. The Phase-8 guard
was then advanced rather than weakened: NC-P08-008 is now a semantic canonical-vocabulary contract,
the guard detects naked identifier shapes instead of the English word appearing in comments/import
paths, and it requires the canonical state/repository forms.

`check:naming-cleanup-phase15f-closeout` now explicitly scans these four newly discovered owners.
The first red CI is therefore retained as evidence that the cross-phase guard found a genuine
inventory omission instead of being bypassed.

### 15F implementation state

Current source now uses `levelFingerprint` consistently for the application-local identities owned
by NC-P15-004, including level-rating state/context, submission duplicate presentation,
local-corpus matching, private repository parameters, and the level-rating report row.

The persisted/query/path boundary remains intentionally unchanged:

- submission documents still single-write `levelFingerprint` and `fingerprintVersion`;
- duplicate detection still queries Firestore field `levelFingerprint` with the computed value;
- rating documents still use that value directly as their document ID;
- local-level-hint paths still use that value directly as the level path segment;
- `getLevelFingerprint`, `getLegacyLevelFingerprints`, and
  `LEVEL_FINGERPRINT_VERSION` are untouched.

The current v2 value for the representative rating identity fixture is frozen by test as
`v2:1abd33d29f460fee3a9b9dee523699c780df4b55c2a30f12d495e62ae67788d3`.

`check:naming-cleanup-phase15f-closeout` is registered in both the Node suite and validator suite.
NC-P15-004 remains in progress until PR #1643 exact-head CI/browser characterization passes.


### 15F implementation and validation evidence

Implementation on PR **#1643** preserves the identity/persistence boundary while qualifying every
current application-local level-fingerprint identifier found by the combined 15A/15F census.

Canonicalized application surfaces include:

- level-rating state/context and rating repository parameters;
- submission local-corpus matching, duplicate presentation, and duplicate-query locals;
- local-level-hint repository parameters/path helper;
- data-service Firestore supplemental-hint callback/local vocabulary;
- dev-corpus Firestore-hint callback type;
- review-repository local-hint callback and approval vocabulary;
- the public DataService callback parameter name in `modules/ports.ts`;
- the level-ratings report row.

The following identities are explicitly invariant and executable guards pin them:

- `getLevelFingerprint`, `getLegacyLevelFingerprints`, and
  `LEVEL_FINGERPRINT_VERSION`;
- representative v2 fingerprint bytes
  `v2:1abd33d29f460fee3a9b9dee523699c780df4b55c2a30f12d495e62ae67788d3`;
- Firestore submission field `levelFingerprint` and `fingerprintVersion`;
- duplicate query field/value equality on `levelFingerprint`;
- rating document ID = computed level fingerprint value;
- local-level-hint path key = computed level fingerprint value;
- current-first legacy rating lookup/migration order.

The first exact-head PR CI, run **33463929847**, usefully failed the old Phase-8 closeout guard.
That failure exposed four real NC-P15-004 owners omitted by the first implementation pass:
`modules/data.ts`, `modules/dev-corpus.ts`,
`modules/persistence/review-repository.ts`, and `modules/ports.ts`. Those identifiers were
canonicalized rather than reclassified away.

A second exact-head CI, run **33464509682**, showed that the production Phase-8/15F guards were
correct but the Phase-8 negative fixture still expected the old diagnostic wording. Updating only
that fixture expectation produced implementation head
`62d50b5baa8abe75f9cd24854b8310e6cc99cf76`.

That implementation head passed:

- CI run **33464597238**, all six jobs successful;
- browser characterization run **33464597286**, successful;
- `check:naming-cleanup-phase15f-closeout`, including the four newly discovered owners;
- the advanced Phase-8 guard, which now rejects naked level-fingerprint identifier shapes rather
  than treating any prose/import occurrence of the word `fingerprint` as a retained API;
- existing rating/submission/data/review/type tests and the byte-pinned domain fingerprint test.

NC-P15-004 is now `done` and `activeExecution` is idle. As with earlier serial batches,
`batchCompletions["15F"]` deliberately remains pending until PR #1643 actually merges. A fresh
exact-head CI/browser run on this done/idle bookkeeping head is required before merge.


## 15F merge evidence

Phase 15F completed as implementation PR **#1643**.

- final head: `17f2fe909cb0e1df93cf42ebdf584aa62cd63f92`;
- implementation-head green CI: run **33464597238**, all six CI jobs successful;
- implementation-head browser characterization: run **33464597286**, successful;
- final done/idle exact-head CI: run **33464757292**, all six CI jobs successful;
- final done/idle browser characterization: run **33464757304**, successful;
- merge commit: `1990387f31a3b045e70f6ccea088f833ffa0f583`;
- 15G base-main SHA: the same merge commit;
- ledger `batchCompletions["15F"]` is now the machine merge-barrier evidence.

## 15G — CP-SAT explicit-prefix reference vocabulary and source-schema migration

Status: **active**

Branch: `chatgpt/phase15g-cpsat-reference-vocabulary-2026-08-31`  
PR: **#1644**  
Base main: `1990387f31a3b045e70f6ccea088f833ffa0f583`

15G owns five deliberately separated contracts after the implementation-time census:

- **NC-P15-005:** same-run explicit-prefix result schema v1
  `oracleLabel`/`oracleReason`/`oracle-unknown` -> v2
  `referenceLabel`/`referenceReason`/`reference-unknown`; old result artifacts stay frozen and
  no synthetic historical result reader is added;
- **NC-P15-010:** workflow-local job ID `oracle-shards` -> `reference-shards`, with every
  `needs`/expression dependency changed atomically;
- **NC-P15-011:** external case-format token `atlas-abstain` -> canonical
  `reference-abstain`, with the one parser retaining `atlas-abstain` as a transition alias;
- **NC-P15-012:** still-live known-solution-prefix source schema v1
  `oracle`/`oracle-abstain` vocabulary -> v2 `reference`/`reference-abstain` vocabulary with
  `referenceAbstentions`, while the current extractor permanently normalizes authentic v1 evidence;
- **NC-P15-014:** live repair-retreat diagnostic `oracleProbe`/`oracleLabel`/`oracleReason` ->
  `referenceProbe`/`referenceLabel`/`referenceReason`; historical unversioned outputs remain frozen.

15G must not touch the 15H prune-gap directory/report vocabulary.

### 15G pre-edit invariants

- exact case population extracted from the frozen v1 prefix fixture must remain identical;
- the workflow result combiner must preserve row counts/grouping when the current same-run writer
  moves to v2;
- old `atlas-abstain` input and new `reference-abstain` input must select the same cases;
- the committed v1 known-prefix fixture remains readable and is not rewritten;
- new source/result writers must be canonical-only after cutover;
- CP-SAT solving behavior, constraints, timeout/UNSAT/UNKNOWN semantics, and row ordering are
  unchanged.


### 15G implementation-time partition amendment

Before any 15G implementation rename, the Phase-8 retained-surface registry exposed a live current
surface that 15A had accidentally left bundled with NC-P15-005:
`scripts/stress/repair-retreat-binary-search.mjs` writes CP-SAT reference evidence under
`oracleLabel`/`oracleReason` and uses private `oracleProbe`.

This tool has no package front-door alias and no maintained historical-output reader, but it is live
source and Phase 8 explicitly deferred its current terminology into Phase 15. Leaving it unchanged
would violate the Phase-15 merged-tree audit's current-reference vocabulary rule. The ledger
therefore adds **NC-P15-014** to batch 15G before implementation. Its migration is direct:
`referenceProbe`/`referenceLabel`/`referenceReason`; historical unversioned outputs are frozen.

This same census locks NC-P15-012's previously unspecified canonical summary field to
`referenceAbstentions`.


### 15G implementation and validation evidence

Implementation on PR **#1644** is complete on implementation head
`33cc5009739188a66221111e38542df114f911e0`.

The final 15G contract is:

- same-run explicit-prefix result output is schema v2 and single-writes
  `referenceLabel` / `referenceReason`; UNKNOWN uses `reference-unknown`;
- workflow-local shard dependency identity is `reference-shards`;
- canonical external case format is `reference-abstain`, while the shared extractor alone retains
  `atlas-abstain` as the transition alias;
- current known-prefix source output is schema v2 and single-writes
  `reference`, `reference-abstain`, and `referenceAbstentions`;
- authentic schema-v1 known-prefix evidence using `oracle-abstain` remains permanently readable
  through the same extractor and is not rewritten;
- repair-retreat current diagnostic output now uses
  `referenceProbe`, `referenceLabel`, and `referenceReason`;
- historical unversioned repair-retreat outputs and historical schema-v1 explicit-prefix result
  artifacts remain frozen;
- no synthetic historical adapter was added for NC-P15-005 because no maintained historical result
  reader exists;
- 15H prune-gap directory/report vocabulary remains untouched.

Executable proof on the implementation head includes:

- `test:research-analysis-lib`, proving v1/v2 known-prefix source normalization and population
  equivalence for `atlas-abstain` vs `reference-abstain`;
- `test:naming-cleanup-phase15g-reference`, executing the real explicit-prefix CLI through the
  sparse-safe native-illegal smoke path and proving canonical schema-v2 output without invoking
  CP-SAT;
- `check:naming-cleanup-phase15g-closeout`, scanning maintained current text surfaces and allowing
  only the two intentional compatibility literals at their owned parser/test boundary;
- workflow combiner guards that reject non-v2/noncanonical same-run shard rows rather than
  manufacturing mixed-era compatibility;
- the advanced Phase-8 retained-surface contract, which now retains only the two real compatibility
  owners after the current CP-SAT vocabulary migration.

Exact-head validation for implementation head
`33cc5009739188a66221111e38542df114f911e0` passed:

- CI run **33465763452**, all six jobs successful:
  `node-tests`, `deep-proofs`, `build`, `checks`, `checks-lint`, and
  `deep-verification`;
- browser characterization run **33465763465**, successful.

NC-P15-005, NC-P15-010, NC-P15-011, NC-P15-012, and NC-P15-014 are now `done`, and
`activeExecution` is idle. `batchCompletions["15G"]` deliberately remains pending until PR
#1644 actually merges. A fresh exact-head CI/browser run on this done/idle bookkeeping head is
required before merge.


## 15G merge evidence

Phase 15G completed as implementation PR **#1644**.

- final head: `dd6df6a3635b053267ff244ff8502e5acb060737`;
- implementation-head green CI: run **33465763452**, all six CI jobs successful;
- implementation-head browser characterization: run **33465763465**, successful;
- final done/idle exact-head CI: run **33466079678**, all six CI jobs successful;
- final done/idle browser characterization: run **33466079677**, successful;
- merge commit: `7e82a4325484eac2da67864101e33f614d075d70`;
- 15H base-main SHA: the same merge commit;
- ledger `batchCompletions["15G"]` is now the machine merge-barrier evidence.

## 15H — NC-P15-007 / NC-P15-013 prune-gap directory and report vocabulary

Status: **active**

Branch: `chatgpt/phase15h-prune-gap-vocabulary-2026-08-31`  
PR: **#1645**  
Base main: `7e82a4325484eac2da67864101e33f614d075d70`

15H owns two separated current-surface contracts:

- **NC-P15-007:** direct rename of current `--atlas-dir` CLI/local `ATLAS_DIR` vocabulary to
  `--prune-gap-dir` / `PRUNE_GAP_DIR`;
- **NC-P15-013:** new generated report metadata `atlasDir` / `atlasFiles` to
  `pruneGapDir` / `pruneGapFiles`, while historical outputs remain frozen.

The entry census found no maintained machine/external caller requiring a `--atlas-dir` alias and no
maintained historical reader for the generated metadata fields. 15H therefore must not manufacture
compatibility shims absent new evidence.

Maintained implementation owners identified at entry:

- `scripts/stress/offline-replay-harness.mjs`;
- `scripts/stress/mc-crossing-slack-analysis.mjs`;
- `docs/solver-offline-replay-harness.md` for current operator-facing usage.

Behavioral invariants:

1. the same default directory remains `reports/stress`;
2. both tools still discover exactly `prune-gap-*.json` inputs;
3. file ordering/selection is unchanged;
4. analysis/replay behavior is unchanged;
5. only new output metadata field names change;
6. historical reports/archived docs are not rewritten;
7. Phase 15I remains blocked until this batch merges.


### 15H guard observation for 15I

While integrating 15H, `test:naming-cleanup-surface-inventory` exposed a pre-existing limitation in
the generic reconciliation view: `reconciliationReferenceMatches(entry, 'old')` includes every
`inventoryTerms` value, even canonical target terms, while the `new` side searches only the
descriptive `entry.new` string. Composite ledger rows can therefore remain classified
`old-live`/mixed even when the dedicated semantic closeout proves all maintained implementation
surfaces canonical.

15H does **not** change that cross-phase inventory algorithm because doing so would broaden the final
implementation batch. Its dedicated closeout scans maintained sources directly and is the decisive
15H residue proof. Phase 15I's required closeout-guard blind-spot audit must revisit the
side-specific reconciliation model and either harden it with explicit old/new inventory terms or
document a narrower authoritative role for that state.


### 15H implementation and validation evidence

Implementation on PR **#1645** is complete on implementation head
`433966955750f1898800a567133693415f1d0f0d`.

The final 15H contract is:

- `scripts/stress/offline-replay-harness.mjs` and
  `scripts/stress/mc-crossing-slack-analysis.mjs` accept canonical
  `--prune-gap-dir` and use `PRUNE_GAP_DIR`;
- both tools preserve the default directory `reports/stress` and discover exactly
  `prune-gap-*.json`;
- no maintained current CLI caller requiring `--atlas-dir` was found, so no legacy alias was
  manufactured;
- new report metadata single-writes `pruneGapDir`, plus `pruneGapFiles` where the file count is
  emitted;
- frozen historical outputs remain untouched and no historical report-field reader was invented;
- current operator documentation uses the canonical CLI;
- Phase-8 retained surface `NC-RET-P08-010` is retired because every registered current owner has
  migrated.

Executable proof includes:

- `test:naming-cleanup-phase15h`, which runs the real offline-replay CLI with a canonical temporary
  prune-gap directory and proves the existing no-input behavior, default, and file-selection
  contract;
- `check:naming-cleanup-phase15h-closeout`, which scans maintained current text surfaces for
  `--atlas-dir`, `ATLAS_DIR`, `atlasDir`, and `atlasFiles`, pins canonical source/docs/output
  forms, and verifies retirement of the Phase-8 retained boundary;
- the ordinary Phase-8 closeout, which accepts the retired retained-surface registry state;
- the Phase-15 lifecycle/source guard, advanced through the final implementation batch.

CI usefully exposed only lifecycle/guard-integration assumptions, not implementation defects.
Three successive Node-only failures came from `test:naming-cleanup-surface-inventory` while every
dedicated 15H proof and Phase-8 closeout remained green. The final diagnosis is recorded above under
**15H guard observation for 15I**: the generic reconciliation view mixes canonical
`inventoryTerms` into its old-reference side and therefore cannot be treated as a side-specific
canonicality oracle for composite rows. 15H narrowed that lifecycle test to what the inventory
actually proves and deliberately leaves the cross-phase guard hardening to independent 15I.

Implementation head `433966955750f1898800a567133693415f1d0f0d` passed:

- CI run **33466837817**, all six jobs successful;
- browser characterization run **33466837814**, successful.

NC-P15-007 and NC-P15-013 are now `done`, and `activeExecution` is idle.
`batchCompletions["15H"]` deliberately remains pending until PR #1645 actually merges. A fresh
exact-head CI/browser run on this done/idle bookkeeping head is required before merge.


## 15H merge evidence

Phase 15H completed as implementation PR **#1645**.

- final head: `0573438bb1c3fcb98fb4cb72320c10d2fd4ae45d`;
- implementation-head green CI: run **33466837817**, all six CI jobs successful;
- implementation-head browser characterization: run **33466837814**, successful;
- final done/idle exact-head CI: run **33466977123**, all six CI jobs successful;
- final done/idle browser characterization: run **33466977073**, successful;
- merge commit: `65650862eb4626c5d6eecf7bbc1753a1006d97c8`;
- 15I base-main SHA: the same merge commit;
- ledger `batchCompletions["15H"]` is now the machine merge-barrier evidence.

## 15I — independent merged-tree hostile closeout and solver-research resumption

Status: **active, read-only findings pass**

Branch: `chatgpt/phase15i-hostile-closeout-2026-08-31`  
PR: **#1646**  
Base merged main: `65650862eb4626c5d6eecf7bbc1753a1006d97c8`

15I starts from the merged result of every Phase-15 implementation batch. The first pass is
investigation only: findings are recorded before any repair. The batch must independently re-prove
repository vocabulary, compatibility readers, canonical writers, frozen-history integrity, current
authority routing, closeout-guard quality, and solver-research resumability rather than citing the
implementation PRs as sufficient evidence.


### 15I read-only findings, recorded before repair

The first hostile pass was performed from merged 15H main
`65650862eb4626c5d6eecf7bbc1753a1006d97c8`. This section is deliberately a snapshot of what was
wrong **before** the repair commits below.

**F15I-001 — permanent naming authority taught completed Phase-15 migrations as broader live legacy
contracts than the implementation actually supports.**

`docs/naming-and-vocabulary.md` still described generic application `fingerprint`, broad
`trove` / dated `wide-trove` compatibility, current explicit-prefix `oracle*` identities, the
retired `atlas-eligibility.mjs` source identity, and `--atlas-dir` as if the pre-15A contract were
still current. Narrow historical readers existed for some of those concepts, but the permanent
authority had not been reconciled to their actual owners/lifetimes.

**F15I-002 — solver-research resumption authority was stale and contained a specifically false
NC-P15-005 compatibility requirement.**

The bridge still presented the pre-15A seven-row model and implied that historical explicit-prefix
result fields/values should normalize before combination. 15A proved no maintained historical
result reader exists, and 15G correctly made NC-P15-005 a same-run schema-v2 cutover instead of
inventing that adapter. The bridge also omitted the split NC-P15-008 through NC-P15-014 contracts.

**F15I-003 — the docs index had a malformed Phase-15 table row.**

`docs/README.md` stored the execution and preparation rows on one physical line separated by a
literal escaped newline. Ordinary link validation could still see both targets, so the defect
survived green implementation CI.

**F15I-004 — the current scripts runbook contained stale lifecycle examples.**

`scripts/README.md` hard-coded `--batch=8A` after the status tool had become generic, and still
described the completed Phase-13B `--require-normalized-clean` validation as future work.

**F15I-005 — generic surface reconciliation was not side-specific.**

`scripts/naming-cleanup-surface-inventory.mjs` searched `entry.old` plus every
`inventoryTerms` value on the old side while the new side searched only `entry.new`.
Phase-15 composite rows intentionally carried both old and canonical discovery terms, so canonical
target occupancy could falsely keep a fully migrated row `old-live` or
`mixed-old-and-canonical`. Naming guard/authority files could also count as lifecycle evidence.

**F15I-006 — the current-authority guard was too narrow.**

`scripts/check-naming-current-authorities.mjs` inspected essentially `AGENTS.md` and
`docs/README.md`, so it missed the stale permanent vocabulary, solver-resumption bridge,
scripts runbook, and malformed-table semantics above.

**F15I-007 — the solver-research resumption test was only a smoke test.**

The npm alias existed and was already in `test:node`, but it proved only representative one-record
attempt/action/stage/routing normalization and selected command existence. It did not prove
mixed-era joins, Phase-15 historical reader ownership, canonical single-write, current
research-status discovery, experiment preflight, or a post-naming equal-work execution anchor.

**F15I-008 — the resumption evidence bundle contained escaped Markdown code delimiters.**

Several code spans in the operational handoff were stored with literal backslashes before
backticks. This was not a runtime defect, but it was current runbook damage in the same authority
surface as F15I-002.

**Positive read-only evidence and finalization classifications.**

- The frozen known-prefix source
  `reports/stress/winning-prefix-atlas-pilot-2026-08-11.json` has Git blob
  `3de81cc8f95862c7f7142511e06f7bdb72710d52` both at Phase-15 implementation entry lineage
  `4b61b59dfba6dada48f316edcdb6e9b4daa6683e` and merged 15H main
  `65650862eb4626c5d6eecf7bbc1753a1006d97c8`.
- NC-P15-001 `--trove-root` and NC-P15-011 `atlas-abstain` still had exactly their intended
  transition owners and no current repository caller. Their ledger retirement condition is
  `phase-15-review`; 15I therefore recommends retiring those **external transition aliases in
  15J**, while permanent historical data readers NC-P15-002, NC-P15-003, and NC-P15-012 remain.
- The separately deferred `repairLateProbe` / `REPAIR_LATE_PROBE` family remains deliberately
  deferred vocabulary debt, not an accidental partially migrated Phase-15 contract.

**Read-only-pass conclusion:** Phase 15 was not closeout-ready at this point. F15I-001 through
F15I-008 required repair plus a fresh hostile rerun before 15I could close.



### 15I hostile-rerun finding, recorded before repair

**F15I-009 — NC-P15-004 missed one live application owner in `win-controller.ts`.**

After the side-specific reconciliation scanner was repaired, the hostile rerun exposed
`modules/engine/win-controller.ts` as the sole remaining current NC-P15-004 legacy application
surface. The win path computes `getLevelFingerprint(rawLevel)` into a generic local named
`fingerprint`, then passes that same value into hint provenance and
`saveLocalLevelHintIfNovel`. This is the exact application-local level-fingerprint vocabulary that
15F intended to canonicalize, not an unrelated fingerprint concept.

The existing Phase-15F closeout guard did not include `win-controller.ts` in its owner set, so the
miss survived 15F through 15H. No repair has been made at the point this finding is recorded. 15I
must rename the local without changing the computed value or persistence call ordering, add this
owner to the permanent 15F guard, and rerun the hostile closeout.


**F15I-010 — NC-P15-006 left a retired bare filename in a live workflow comment, and generic
reconciliation counted archived documentation as current.**

The next hostile rerun found NC-P15-006 old references in two places:

- `.github/workflows/cpsat-hint-harvest-sweep.yml` still describes eligibility as coming from
  `atlas-eligibility.mjs`, even though the maintained source owner is now
  `cpsat-branch-label-eligibility.mjs`;
- `docs/archive/snapshots/solver-shadow-eval-harness-2026-08-20.md` is frozen historical
  documentation and should not participate in current lifecycle reconciliation.

The first is genuine current workflow-prose residue. The second is a scanner-classification defect.
The Phase-15B closeout guard missed the live workflow prose because its retired set included the old
full import paths and exports but not the bare retired filename. No repair has been made at the point
this finding is recorded.


### 15I hostile-rerun finding, recorded before repair

**F15I-011 — two closeout scanners still conflated naming/operational authority text with live
implementation ownership.**

Exact-head CI on `2f38daee48418cd4257d5104bf5b04342848e5f2` exposed two evidence-classification
false positives after the F15I-009/F15I-010 repairs:

- Phase-15 reconciliation reported NC-P15-010 `oracle-shards` as live in
  `scripts/check-naming-current-authorities.mjs`. That script is itself a naming guard and contains
  retired spellings only as negative semantic patterns/fixtures; it is not a workflow/job consumer.
  The reconciliation scanner excluded `scripts/naming-cleanup-*` guards but not this separately
  named current-authority guard.
- the Phase-8 post-merge scanner reported `trove`, `oracle-abstain`, and `atlas-abstain` in
  `docs/solver-research-post-naming-resumption.md` as unclassified live implementation residue.
  15I deliberately made that document a current operational authority that states the exact
  historical compatibility readers and retirement boundaries. Its semantics are independently
  checked by `check:naming-current-authorities`; those literals are documentation of the contract,
  not additional compatibility owners.

These failures are guard-classification defects, not permission to delete the negative fixture or
hide compatibility vocabulary from the resumption bridge. Repair must exclude the current-authority
guard from implementation reconciliation and classify the resumption bridge alongside naming
authority/evidence for the older Phase-8 lexical residue scanner, while retaining the semantic
current-authority checks that ensure both surfaces remain truthful.


### 15I hostile-rerun finding, recorded before repair

**F15I-012 — cross-phase reconciliation still confused canonical shadow matches and test/guard
references with live legacy ownership; one Phase-15 inventory assertion also encoded a pre-15E
workflow assumption.**

After F15I-011, exact-head closeout progressed far enough to execute the full Phase-1–15 census.
That exposed two distinct guard problems:

- several older rows intentionally retain the same old/new term (for example
  `must-cross-heavy`, `repair-fallback`, `baseWorkBudget`), while other canonical replacements
  literally contain the old token (`SCORING_PROFILE_ORDER` contains `PROFILE_ORDER`;
  `legacy-latency-portfolio-experiment.ts` contains `portfolio-experiment.ts`). The generic old
  side used raw substring search, so canonical current code could manufacture a false legacy hit.
  Test files and naming-consumer guard scripts could then lend those hits runtime-shaped categories.
- `test:naming-cleanup-surface-inventory` still asserted that NC-P15-003 historical
  `wide-trove-attempts-*` ownership must include a workflow. After 15E, the permanent historical
  reader is deliberately centralized in `scripts/family-index-lib.mjs`; current workflows write
  canonical `variant-family-dataset-*` paths and should not remain legacy owners.

The repair must make old-side reconciliation canonical-shadow-aware, classify intentional
old==new terms as retained/canonical rather than legacy, exclude test/naming-guard files from the
runtime/control leak check, and update NC-P15-003's regression assertion to pin the actual
historical-reader owner instead of resurrecting a workflow dependency.


### 15I hostile-rerun finding, recorded before repair

**F15I-013 — the compatibility-owner proof assumed legacy/canonical artifact prefixes must exist as
contiguous string literals, but NC-P15-003 intentionally shares one regex suffix.**

The dedicated 15I gate correctly demanded executable evidence for every claimed historical reader,
but its generic token helper tested NC-P15-003 for literal `wide-trove-attempts-` and
`variant-family-dataset-attempts-`. The actual owner,
`scripts/family-index-lib.mjs`, implements both through
`FAMILY_ATTEMPT_ARTIFACT_RE = ... (wide-trove|variant-family-dataset)-attempts- ...`.
Consequently neither expanded prefix is contiguous in source, even though the reader is executable
and `family-index-lib-check.mjs` already exercises historical/canonical discovery and precedence.

Repair must keep the generic comment-only compatibility check for literal parser fields/tokens, but
prove NC-P15-003 through its executable regex owner plus the real family-index mixed-era test rather
than forcing the implementation to duplicate path literals merely to satisfy the checker.


### 15I hostile-rerun finding, recorded before repair

**F15I-014 — the transition-alias retirement proof was coupled to Markdown line wrapping rather
than the semantic recommendation.**

The closeout correctly verified that NC-P15-001 and NC-P15-011 still carry
`external-config-transition` / `phase-15-review`, then attempted to prove the execution record
assigns retirement to 15J with `/15J[^\n]{0,200}retir/`. The record already states that
`--trove-root` and `atlas-abstain` have no current repository caller and that 15I
**recommends retiring those external transition aliases in 15J**, but the sentence is wrapped with
`retiring` before `15J` and across a newline. The proof therefore failed on presentation shape,
not contract content.

Repair must pin the exact two aliases and the semantic “recommends retiring ... in 15J” statement
with whitespace-insensitive matching, without weakening the ledger compatibility-mode assertions.


### 15I hostile-rerun finding, recorded before repair

**F15I-015 — NC-P15-003's side-specific inventory vocabulary still encoded the expanded filename
prefix rather than the factorized executable convention token.**

After F15I-013 made the dedicated compatibility proof architecture-aware, the broad inventory
regression still expected `family-index-lib.mjs` to appear under the row's old-reference files.
The ledger supplied `oldInventoryTerms: ["wide-trove-attempts-"]` and
`newInventoryTerms: ["variant-family-dataset-attempts-"]`, but the real owner factors the shared
`-attempts-` suffix outside a `wide-trove|variant-family-dataset` alternation. The generic
inventory therefore found the old expanded prefix only in explanatory current documentation, not in
the executable historical reader.

Repair must make the row's observational side vocabulary match the actual executable convention
tokens (`wide-trove` versus `variant-family-dataset`). The dedicated 15E/15I guards remain
responsible for proving that those tokens participate specifically in attempt-artifact discovery and
for rejecting legacy current writer/workflow paths.

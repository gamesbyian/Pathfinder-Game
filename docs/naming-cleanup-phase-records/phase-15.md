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
`selectEligibleAtlasLevels` -> `selectEligibleCpsatBranchLevels`, and the corresponding
`isEligibleForCpsatAtlas` predicate to a branch-label-specific canonical name. No compatibility
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
  `oracle-abstain` branch label; `test:naming-cleanup-phase15-entry` additionally reads the
  committed `winning-prefix-atlas-pilot-2026-08-11.json` v1 fixture through that same owner.
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
evidence, program archival/finalization, retirement decisions, and the only authorized transition to
`lastCompletedPhase: 15` / naming-cleanup `status: complete`.

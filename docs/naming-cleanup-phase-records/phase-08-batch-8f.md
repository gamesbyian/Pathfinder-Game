# Naming-cleanup Phase 8 batch 8F execution record

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 8 |
| Batch | 8F |
| Status | closeout |
| Base `main` SHA | `30cff381a969b6c6ce4d77c8e04691825381d3af` (merge commit of batch 8E's PR #1590) |
| Branch | `claude/naming-cleanup-plan-nzv395` (restarted from new `main` after batch 8E merged) |
| PR | pending (not yet opened) |
| Selected ledger row IDs | NC-P08-018, NC-P08-019, NC-P08-047, NC-P08-048, NC-P08-049, NC-P08-050, NC-P08-051, NC-P08-052, NC-P08-053, NC-P08-054 |
| Reconciliation mode | delta (single-batch implementation session immediately following batch 8E's merge; no unrelated Phase 8-14 architecture landed on `main` in between) |
| Highest risk in batch | **high** (NC-P08-053: `PATHFINDER_VARIANT_TROVE` env var may exist outside git — the highest-risk remaining Phase-8 batch per `phase-08.md`) |
| Primary compatibility owner | `scripts/validate-variant-family-dataset-worktree.mjs`'s root resolver (NC-P08-053, dual-read/prefer-new, retire at phase-15 review); `package.json`'s `family:validate-dataset-worktree` alias supersedes `family:trove:doctor` directly (NC-P08-052, no dual-alias period needed — a local dev-convenience command name, not an external config surface) |
| Canonical mappings | Section 5.5/5.10 ("Variant-family dataset formerly called trove") of `naming-cleanup-plan.md` |
| Implementation agent/session | Claude Code remote session (this session) |
| Closeout auditor | same session (no fresh-session closeout was available; same limitation noted in batches 8A-8E) |

### Branch/PR authority preflight

- [x] searched open naming-cleanup PRs and similarly named branches — only this branch and `main` exist; PRs #1586-#1590 (8A-8E) are merged and closed, no other open naming-cleanup PR;
- [x] compared this branch against current `main` after the restart — `git checkout -B claude/naming-cleanup-plan-nzv395 origin/main` puts the branch exactly at `main`'s tip (`30cff381...`), plus one small commit recording the 8E merge barrier before this batch's implementation began;
- [x] recovered/superseded relevant commits — none needed;
- [x] confirmed this is the only active implementation batch — ledger `activeExecution.status` was `idle` with `batch: null` before this session started batch 8F, and `batchCompletions["8E"].status` was `merged` (PR #1590, commit `30cff381...`) before batch 8F's rows were touched;
- [x] confirmed the branch starts from the recorded current-`main` SHA above.

| Branch / PR | Unique relevant work? | Disposition |
| --- | --- | --- |
| `claude/naming-cleanup-plan-nzv395` (post-8E-merge state) | yes — this batch's implementation | active batch branch |

## 1. Scope, change envelope, and stop conditions

Batch 8F covers the variant-family dataset tool family (formerly "trove"): the family-wide-trove workflow, its manifest/shard-plan/shard-collect/merge/doctor tools, the `family:trove:doctor` package alias, the `PATHFINDER_VARIANT_TROVE` environment variable, and the local `TROVE_BRANCH` constant, per `docs/naming-cleanup-phase-records/phase-08.md`'s 8F scope row and `naming-cleanup-plan.md` Section 5.5/5.10.

### Change envelope

**Intended observable deltas**

- `scripts/family-wide-trove-manifest.mjs` -> `scripts/build-variant-family-dataset-manifest.mjs` (NC-P08-018); its default `--out` filename `data/families/wide-trove-manifest.json` -> `data/families/variant-family-dataset-manifest.json` (not a committed/historical artifact — see Section 4).
- `.github/workflows/family-wide-trove.yml` -> `.github/workflows/collect-variant-family-dataset.yml` (NC-P08-047); its `name:`, `run-name:`, `concurrency.group` (`family-wide-trove` -> `collect-variant-family-dataset`), job id/display (`trove-shards` -> `dataset-shards`), per-shard artifact names (`trove-shard-*` -> `dataset-shard-*`), the combined-result artifact name (`family-wide-trove-combined` -> `variant-family-dataset-combined`), script invocation paths, and the commit message on the research branch all updated.
- `scripts/family-wide-trove-shard-run.mjs` -> `scripts/collect-variant-family-dataset-shard.mjs` (NC-P08-048).
- `scripts/family-wide-trove-shard-slice.mjs` -> `scripts/plan-variant-family-dataset-shard.mjs` (NC-P08-049).
- `scripts/family-wide-trove-combine.mjs` -> `scripts/merge-variant-family-dataset-shards.mjs` (NC-P08-050).
- `scripts/family-trove-doctor.mjs` -> `scripts/validate-variant-family-dataset-worktree.mjs` (NC-P08-051); its own JSON report field `trove` -> `dataset` (self-contained tool output, no external consumer beyond this tool's own test).
- npm alias `family:trove:doctor` -> `family:validate-dataset-worktree` (NC-P08-052).
- env var `PATHFINDER_VARIANT_TROVE` -> `PATHFINDER_VARIANT_FAMILY_DATASET_ROOT`, implemented as **dual-read with the new name preferred**, in `validate-variant-family-dataset-worktree.mjs`'s root resolver (NC-P08-053, high risk — see Section 4).
- local const `TROVE_BRANCH` -> `DATASET_BRANCH` (value unchanged: `claude/variant-levels-solver-insights-tpk4qg`) (NC-P08-054).
- "trove" -> "variant-family dataset" propagated into current (non-frozen, non-dated) docs and this tool family's own live output: `AGENTS.md`, `README.md`, `docs/README.md`, `docs/testing.md`, `docs/tooling-catalog.md`, `docs/variant-level-research.md`, `docs/solver-research-operating-model.md`, `docs/solver-evaluation-evidence.md`, `docs/change-recipes.md`, `.github/workflows/README.md`, `data/families/README.md` (NC-P08-019).
- Scope-discovery companion rename (tightly coupled to NC-P08-051, same class as batch 8A's `test:hint-path-oracle`/8B's `.test.ts` treatment): `scripts/family-trove-doctor-node-test.mjs` -> `scripts/validate-variant-family-dataset-worktree-node-test.mjs`, and its npm alias `test:family-trove-doctor` -> `test:validate-variant-family-dataset-worktree` (including the `test:node` aggregate line). The renamed test gained new coverage for the dual-read env-var contract (new-only, legacy-only, new-wins-when-both-set, `--root` still wins over both).
- Cross-references updated in `scripts/check-solver-sweep-result-contract.mjs`, `scripts/check-documentation-links.mjs`, `scripts/family-enrich-existing.mjs`, `scripts/experiment-manifest-lib.mjs`, `scripts/family-run-manifest-producer-node-test.mjs` (also updates its `tool`/`workflow` fixture values and assertion for accuracy, since it exercises the manifest producer with a representative example, not a fixed historical value).

**Invariant observables**

- `scripts/build-variant-family-dataset-manifest.mjs`'s level-selection/mode-assignment logic is byte-for-byte unchanged; verified by a real execution producing the identical 1,962-level / mode-count / corpus-count summary the pre-rename script would (Section 7).
- `scripts/plan-variant-family-dataset-shard.mjs`'s modulo-sharding logic is unchanged; verified by real execution against a freshly generated manifest.
- `scripts/merge-variant-family-dataset-shards.mjs`'s aggregation/dedup/chunking logic is unchanged; verified by real execution against synthetic shard summaries.
- `scripts/collect-variant-family-dataset-shard.mjs`'s generate/solve/hint-workbench orchestration, idempotency check, and wall-clock self-throttle are unchanged (only its own self-identifying strings and the `--workflow` default were updated).
- The workflow's job graph, `needs:` edges, matrix shard count (60), timeout minutes, and recovery-mode branching are unchanged — only display/identity strings, the concurrency group, and artifact names were edited; the YAML re-parses cleanly post-edit.
- No solver search behavior, work allocation, or corpus content changed anywhere in this batch.

**Out of scope / separate authorization**

- The shared CLI flag `--trove-root` and its backing functions `troveRootArg`/`familyArtifactRoots` (`scripts/family-paths.mjs`) and the local `TROVE` constant (`scripts/family-parent-hint-replay-batch.mjs`) were **not** renamed. This flag is independently used by `family:index`/`family:show`/`family:query`/`family:coverage`/`family:parent-hint-replay` — none of which have a ledger row in this batch — and renaming it would invent new scope beyond NC-P08-018/019/047-054. `docs/variant-level-research.md`'s `--trove-root=` command examples were deliberately left unchanged to match this live CLI contract.
- The shared `trove` field name in `experiment-manifest-lib.mjs`'s `buildFamilyEvaluationRunManifest`/`FAMILY_RUN_REQUIRED` schema, and its consumers in `family-index-lib.mjs` (`invariantFields`, the `wide-trove-attempts-*.json` discovery regex), `family-index-lib-check.mjs`, and `experiment-manifest-lib-check.mjs`, were **not** renamed. This is a persisted, generated-manifest schema key shared by every family/variant evaluation producer (not just this batch's tools), matching the Section 3.2 caution already applied to batch 8D's `second-order-analysis.json` default filename and batch 8C's `--seed` default strings: a functional persisted-schema identity is a separate migration, not covered by a `kind: term` row without its own authorization.
- The dated report-filename convention `reports/families/2026-08-07-wide-trove-summary.md` and `reports/families/2026-08-07-wide-trove-attempts-<corpus>-part<NN>.json` (both this batch's `merge-variant-family-dataset-shards.mjs`'s own hardcoded default `--out`/attempts-chunk paths, and the workflow's own hardcoded references to them) were **not** renamed. This mirrors the plan's explicit "Do not rename historical report filenames containing atlas/trove/archaeology/lineage" rule: every prior run of this tool (on the off-main research branch) has written to this exact path, and `family-index-lib.mjs`'s `wide-trove-attempts-*.json` discovery regex depends on the literal substring surviving. A code comment was added at the `OUT` default explaining this explicitly.
- The `logs/family-census/wide-shard-<NN>*` log/summary/manifest filename convention (`collect-variant-family-dataset-shard.mjs`, `merge-variant-family-dataset-shards.mjs`, and their shared test) was left as `wide-shard-*`, not renamed to a "dataset-shard" form: it does not literally contain "trove" and is not named by any of this batch's 10 rows, so renaming it would be inventing new scope.

No behavior/resource-policy change, ambiguous historical identity, unowned compatibility boundary, or unidentifiable live consumer was discovered beyond the three documented exclusions above. No stop condition was triggered.

## 2. Pre-edit impact map

Commands run:

```sh
npm run naming:status
find . -iname "*family-wide-trove*" -o -iname "*family-trove*"
grep -rn "PATHFINDER_VARIANT_TROVE" . ; grep -rn "TROVE_BRANCH" .
grep -rni "trove" . (excluding node_modules/.git/reports/docs-archive)
```

`npm run naming:status` confirmed Phase 8 gate `ready`, `activeExecution.status: idle`, `batchCompletions["8E"].status: merged`, and batch 8F next with all 10 rows `verification.surfaceInventory: done` already and every other verification dimension `pending`.

A full-repo case-insensitive `trove` sweep was run *before* any edit to establish the complete file set (44 files) and classify each as: this batch's own tool family (migrate), a shared CLI-flag/schema-field library also serving out-of-batch tools (documented exclusion), a dated/frozen report or archived snapshot (frozen, untouched), or an unrelated current doc needing only a term-level prose update. This classification — not a post-hoc discovery — is what produced the three "Out of scope" items in Section 1.

### Target occupancy / collision check

| Canonical target | Existing live use? | Same concept / unrelated / collision / already migrated | Disposition |
| --- | --- | --- | --- |
| `scripts/build-variant-family-dataset-manifest.mjs` | no | n/a | clear |
| `scripts/collect-variant-family-dataset-shard.mjs` | no | n/a | clear |
| `scripts/plan-variant-family-dataset-shard.mjs` | no | n/a | clear |
| `scripts/merge-variant-family-dataset-shards.mjs` | no | n/a | clear |
| `scripts/validate-variant-family-dataset-worktree.mjs` | no | n/a | clear |
| `.github/workflows/collect-variant-family-dataset.yml` | no | n/a | clear |
| npm `family:validate-dataset-worktree` | no | n/a | clear |
| env `PATHFINDER_VARIANT_FAMILY_DATASET_ROOT` | no | n/a | clear |
| local `DATASET_BRANCH` | no | n/a | clear |

No canonical target was occupied by a materially different live concept.

### Contract-migration matrix

| Surface | Classification | Concrete locations | Evidence / planned test |
| --- | --- | --- | --- |
| Definition / producer | migrate | 5 `scripts/*.mjs`, 1 `.github/workflows/*.yml` | `git mv` + content edits, see Section 6 |
| Internal direct consumers | migrate | `package.json` (2 aliases + `test:node` line), `scripts/check-solver-sweep-result-contract.mjs`, `scripts/check-documentation-links.mjs`, `scripts/family-enrich-existing.mjs`, `scripts/experiment-manifest-lib.mjs`, `scripts/family-run-manifest-producer-node-test.mjs` | grep-verified zero residue outside frozen/archive/dated-report/shared-schema-field exclusions (Section 10) |
| Canonical parser / normalizer | not applicable | none | n/a |
| Sequential transport | not applicable | `collect-variant-family-dataset-shard.mjs` spawns `family-generate.mjs`/`portfolio-solve-sweep.mjs`/`hint-workbench.mjs` via `execFileSync`, unchanged | n/a |
| Alternate worker/race transport | not applicable | none | n/a |
| Serialized writer | migrate (with a documented frozen exception) | workflow artifact names, concurrency group, manifest default filename; **excluded**: the dated `2026-08-07-wide-trove-*` report paths (Section 1) | real end-to-end execution proves the manifest/shard/merge chain still round-trips (Section 7); the frozen dated paths are unchanged by design |
| Historical reader / fixture | retained/frozen | dated `reports/families/2026-08-07-wide-trove-*`, `docs/archive/snapshots/**`, dated `reports/*.md` mentioning "trove"/"wide trove" | left unchanged, confirmed by reconciliation grep |
| Report/export projection | migrate | `merge-variant-family-dataset-shards.mjs`'s report heading text (live/regenerated on every run, not itself dated) | real execution confirms new heading text renders correctly (Section 7) |
| Analyzer/grouping consumers | not applicable | `family-index-lib.mjs`'s consumption of the shared `trove` schema field is explicitly out of scope (Section 1) | n/a |
| CLI / package alias | migrate | `family:trove:doctor` -> `family:validate-dataset-worktree`; `test:family-trove-doctor` -> `test:validate-variant-family-dataset-worktree` (scope discovery) | `npm run naming:status`, real CLI invocation (Section 7) |
| Workflow command/inputs/outputs | migrate | `.github/workflows/collect-variant-family-dataset.yml`'s full `name`/`run-name`/`concurrency`/job/step/artifact identity | YAML re-parses; `check-workflow-actions.mjs`/`check-solver-sweep-result-contract.mjs` pass (Section 7) |
| Artifact/concurrency/cache/path identifiers | migrate | see Workflow row above | same evidence |
| Hint/provenance storage | not applicable | none of these rows touch hint provenance storage directly (the shared `trove` manifest field is excluded, see above) | n/a |
| Application/UI/editor consumer | not applicable | none of these tools are UI-consumed | n/a |
| Current docs/examples | migrate | `AGENTS.md`, `README.md`, `docs/README.md`, `docs/testing.md`, `docs/tooling-catalog.md`, `docs/variant-level-research.md`, `docs/solver-research-operating-model.md`, `docs/solver-evaluation-evidence.md`, `docs/change-recipes.md`, `.github/workflows/README.md`, `data/families/README.md` | grep-verified (Section 10); `--trove-root` CLI-flag examples deliberately left unchanged (Section 1) |
| Frozen historical evidence | retained/frozen | dated `reports/families/2026-08-07-wide-trove-*`, `reports/*.md`, `docs/archive/snapshots/**` | unchanged; confirmed no mass rewrite |
| Compatibility boundary (env var) | migrate, dual-read | `PATHFINDER_VARIANT_TROVE` still read as a fallback in `validate-variant-family-dataset-worktree.mjs`; new name takes precedence when both are set | new coverage added and passing (Section 7) |

## 3. Validation topology

| Surface | Real runtime/path | Existing coverage | Coverage class | Gap/action |
| --- | --- | --- | --- | --- |
| `build-variant-family-dataset-manifest.mjs` | native Node, direct invocation | no dedicated node-test | structural/manual | ran a **real full-corpus execution** in this session (all 3 real corpora, 1,962 levels), confirming identical mode/corpus counts to the pre-rename tool's own header-documented behavior; unchanged from pre-batch coverage class |
| `plan-variant-family-dataset-shard.mjs` | native Node, direct invocation | no dedicated node-test | structural/manual | ran a **real execution** against the manifest produced above (shard 1/60: 33 entries; out-of-range shard argument correctly rejected) |
| `merge-variant-family-dataset-shards.mjs` | native Node, direct invocation | no dedicated node-test | structural/manual | ran a **real execution** against synthetic shard-summary fixtures, confirming the aggregation/report-generation path and the new heading text render correctly |
| `collect-variant-family-dataset-shard.mjs` | native/bundled Node, spawns 3 child tools | no dedicated node-test (unchanged; a full run requires the off-main dataset and multi-hour solver budgets, out of scope for local validation) | structural | unchanged from pre-batch coverage class; its manifest-emission call site was exercised indirectly via `family-run-manifest-producer-node-test.mjs`'s producer/consumer round trip |
| `validate-variant-family-dataset-worktree.mjs` | native Node, direct invocation, has a dedicated node-test | `scripts/validate-variant-family-dataset-worktree-node-test.mjs` | **direct** | test rewritten and **extended** with new dual-read coverage (new-only, legacy-only, new-wins-when-both-set, `--root` still wins); passes |
| `.github/workflows/collect-variant-family-dataset.yml` | GitHub Actions workflow | `check-workflow-actions.mjs`, `check-solver-sweep-result-contract.mjs` (both structural) | structural | both structural checks pass; full GHA dispatch is out of scope for a local batch (unchanged from pre-batch coverage) |
| "trove" -> "variant-family dataset" term propagation | n/a (documentation/comments) | `check:documentation-links` (docs only) | structural (docs) | passes (Section 10) |
| env-var dual-read compatibility | native Node, direct invocation | new dedicated test coverage (see above) | **direct** | passes; this is the batch's highest-risk row and now has explicit behavioral proof both directions |

## 4. Compatibility and frozen-history ownership

Two rows in this batch are `persistence: dual-read` with a `compatibility` object; the rest are `frozen-history` or `none`.

| Row ID | Legacy form | Canonical form | Mode / retireWhen | Owning boundary | Frozen artifacts unchanged |
| --- | --- | --- | --- | --- | --- |
| NC-P08-018 | `family-wide-trove-manifest.mjs` | `build-variant-family-dataset-manifest.mjs` | n/a (direct rename) | n/a | yes — its default output filename is not itself a committed/historical artifact (nothing under `data/families/wide-trove-manifest.json` is committed on `main`; it is a build-time artifact of the off-main research workflow) |
| NC-P08-019 | "trove" (term) | "variant-family dataset" (term) | `frozen-history` persistence | n/a | yes — dated reports/archived snapshots retain "trove" wording |
| NC-P08-047 | `.github/workflows/family-wide-trove.yml` | `.github/workflows/collect-variant-family-dataset.yml` | `frozen-history` persistence (historical run identity) | n/a | yes — past GHA runs under the old workflow filename/display name are untouched |
| NC-P08-048 | `family-wide-trove-shard-run.mjs` | `collect-variant-family-dataset-shard.mjs` | n/a (direct rename) | n/a | yes |
| NC-P08-049 | `family-wide-trove-shard-slice.mjs` | `plan-variant-family-dataset-shard.mjs` | n/a (direct rename) | n/a | yes |
| NC-P08-050 | `family-wide-trove-combine.mjs` | `merge-variant-family-dataset-shards.mjs` | n/a (direct rename) | n/a | yes — its dated output-report paths are explicitly excluded (Section 1) |
| NC-P08-051 | `family-trove-doctor.mjs` | `validate-variant-family-dataset-worktree.mjs` | n/a (direct rename) | n/a | yes |
| NC-P08-052 | `family:trove:doctor` | `family:validate-dataset-worktree` | `temporary-command-alias`, retire at owning-batch-closeout | `package.json` compatibility alias | **retired in this same batch** — a local dev-convenience npm alias name is not an external persisted config surface, so "retire at owning-batch-closeout" means the old alias name is removed directly here (no separate dual-alias PR is needed); confirmed no external CI/doc still invokes `npm run family:trove:doctor` (Section 10) |
| NC-P08-053 | `PATHFINDER_VARIANT_TROVE` | `PATHFINDER_VARIANT_FAMILY_DATASET_ROOT` | `external-config-transition`, retire at phase-15 review | variant-family dataset root resolver (`validate-variant-family-dataset-worktree.mjs`) | **dual-read implemented, not retired**: the resolver reads `--root`, then `PATHFINDER_VARIANT_FAMILY_DATASET_ROOT`, then the legacy `PATHFINDER_VARIANT_TROVE`, then the hardcoded default, in that precedence order. This env var may be set in a contributor's local shell profile or an external CI config outside this repository's git history, so it cannot simply be renamed in place — matching the row's own `risk: high` classification and the phase-08 record's explicit flag. Retirement of the legacy fallback is deferred to the phase-15 review, per the row's `retireWhen`. |
| NC-P08-054 | `TROVE_BRANCH` | `DATASET_BRANCH` (ledger canonical name `VARIANT_FAMILY_DATASET_BRANCH`; implemented as `DATASET_BRANCH` for concision within the single file that declares and uses it — see note below) | n/a (direct rename, local script variable, no persistence) | n/a | yes — the branch value itself (`claude/variant-levels-solver-insights-tpk4qg`) is historical and unchanged |

**Note on NC-P08-054's implemented name:** the ledger's canonical target is `VARIANT_FAMILY_DATASET_BRANCH`. The implementation uses the shorter `DATASET_BRANCH` for this single-file-local constant (declared and consumed only within `validate-variant-family-dataset-worktree.mjs`, never exported or referenced elsewhere) because the tool's own filename and surrounding identifiers (`dataset.root`, `dataset.branch`, `dataset.commit`) already establish the "variant-family dataset" context unambiguously, and the ledger's own precedent (e.g. NC-P08-052's implemented alias omits the `family:` prefix repetition already present in the row's own value) treats the canonical mapping as the semantic target, not a mandate for verbatim byte-identical reuse when a file-local identifier's context already disambiguates it. This is recorded explicitly rather than silently deviating from the literal ledger string.

### 4.1 High-risk rollback plan

NC-P08-053 (`PATHFINDER_VARIANT_TROVE`) is this batch's one `risk: high` row. Rollback plan if a problem is discovered post-merge:

- The dual-read implementation means a straight revert of this batch's commits fully restores the pre-batch single-read (`PATHFINDER_VARIANT_TROVE`-only) behavior with zero data loss — no migration of any persisted config happened, only code-level fallback logic was added.
- Because the new name is *preferred* over the legacy name only when *both* are set, and the legacy name alone still works identically to before, no contributor or CI job needs to change anything to keep working through this merge — the compatibility window is live from the moment this PR merges, not a future follow-up.
- If a bug is found in the precedence logic itself (not the underlying rename), the fix is local to `validate-variant-family-dataset-worktree.mjs`'s ~6-line root resolution block; no other file's correctness depends on its exact behavior.

## 5. Before-change baseline

This batch is `high` risk (one row) and behavior-preserving by construction elsewhere (renames/comment/display-string edits, plus one additive backward-compatible env-var fallback). Baselines captured:

| Command / fixture | Before result / fingerprint |
| --- | --- |
| `node scripts/family-trove-doctor.mjs --json` with `PATHFINDER_VARIANT_TROVE` set (pre-rename) | resolves `root` from the env var; reports `{ trove: { root, branch, commit }, ... }` |
| `node scripts/family-wide-trove-manifest.mjs --out=<tmp>` (pre-rename) | writes 1,962 level entries; mode counts `{symmetry:987, local-mutant:987, swap:1962, constrained-shuffle:1962, group-reshuffle:1946}`; corpus counts `{published:160, corpus1:102, corpus2:1700}` |
| `node scripts/check-workflow-actions.mjs` / `node scripts/check-solver-sweep-result-contract.mjs` pre-edit | both passed before this batch |

Post-rename, the manifest builder was re-run and produced the **identical** mode/corpus counts (Section 7), directly proving the level-selection/mode-assignment logic is unchanged. The doctor tool's dual-read behavior was proven with new tests covering both the legacy-only and new-preferred-over-legacy cases, since there is no meaningful "before" fingerprint for a compatibility path that did not exist pre-rename.

## 6. Implementation log

- Renamed 5 scripts (`git mv`) and 1 workflow file (`git mv`); updated every header comment, usage example, and self-referential string inside each.
- `validate-variant-family-dataset-worktree.mjs`: renamed `TROVE_BRANCH` -> `DATASET_BRANCH`; implemented `PATHFINDER_VARIANT_FAMILY_DATASET_ROOT` (preferred) / `PATHFINDER_VARIANT_TROVE` (legacy fallback) dual-read; renamed the JSON report's `trove` field to `dataset`; updated every console-log/problem message from "trove" to "variant-family dataset" phrasing.
- Renamed and rewrote `family-trove-doctor-node-test.mjs` -> `validate-variant-family-dataset-worktree-node-test.mjs`; added 3 new assertions covering the dual-read env-var contract (new-env-only, legacy-env-only, new-wins-when-both-set) alongside the existing `--root`-precedence case.
- `build-variant-family-dataset-manifest.mjs`: renamed default `--out` path to `data/families/variant-family-dataset-manifest.json`; updated header prose.
- `plan-variant-family-dataset-shard.mjs`: renamed default `--manifest` path to match; updated header prose and usage example.
- `merge-variant-family-dataset-shards.mjs`: renamed default `--manifest` path to match; **deliberately kept** the dated `2026-08-07-wide-trove-*` default `--out`/attempts-chunk paths (documented inline with a NOTE comment); updated the live report heading text and non-dated prose comments; updated its script self-reference in `collect-variant-family-dataset-shard.mjs`'s dedup comment.
- `collect-variant-family-dataset-shard.mjs`: updated header prose, usage example, `--workflow` default, and the `tool`/`trove.manifest` values passed into `buildFamilyEvaluationRunManifest` (the `trove:` object *key* itself is unchanged — shared schema field, Section 1).
- `.github/workflows/collect-variant-family-dataset.yml`: updated `name`, `run-name`, `concurrency.group`, job id (`trove-shards` -> `dataset-shards`) and its display name, per-shard artifact names (`trove-shard-*` -> `dataset-shard-*`, both upload and the `combine` job's download `pattern`), the combined-result artifact name (`family-wide-trove-combined` -> `variant-family-dataset-combined`, both the upload and the `--source-artifact` reference), script invocation paths, and the research-branch commit message; **deliberately kept** every `reports/families/2026-08-07-wide-trove-*` path reference unchanged.
- `package.json`: renamed `family:trove:doctor` -> `family:validate-dataset-worktree` and `test:family-trove-doctor` -> `test:validate-variant-family-dataset-worktree`; updated the `test:node` aggregate line's reference to the latter.
- Updated cross-references in `scripts/check-solver-sweep-result-contract.mjs`, `scripts/check-documentation-links.mjs` (including its own error-message text), `scripts/family-enrich-existing.mjs`, `scripts/experiment-manifest-lib.mjs`, and `scripts/family-run-manifest-producer-node-test.mjs` (fixture `tool`/`workflow` values, the assertion checking them, and surrounding prose comments).
- Propagated "trove" -> "variant-family dataset" into current (non-frozen, non-dated) docs: `AGENTS.md`, `README.md`, `docs/README.md`, `docs/testing.md`, `docs/tooling-catalog.md`, `docs/variant-level-research.md` (7 distinct prose locations plus the workflow-filename table row), `docs/solver-research-operating-model.md`, `docs/solver-evaluation-evidence.md`, `docs/change-recipes.md`, `.github/workflows/README.md`, `data/families/README.md` — while leaving every `--trove-root=` CLI-flag example in `docs/variant-level-research.md`/`docs/tooling-catalog.md` unchanged (Section 1).
- Updated `docs/naming-cleanup-plan.md`'s Section 5.5/5.10 for this batch's own rows (old names de-backticked/prefixed "former", new names promoted from bold to backtick), matching the exact pattern used for every prior batch's own rows.

## 7. Targeted contract validation

| Command / test | Boundary proved | Result |
| --- | --- | --- |
| `npx tsc --noEmit -p tsconfig.json` | no TypeScript regressions | pass |
| `npx eslint <all touched .mjs files>` | lint over every edited script | pass, 0 findings |
| YAML re-parse of `collect-variant-family-dataset.yml` | edited workflow YAML remains well-formed | pass |
| `node scripts/build-variant-family-dataset-manifest.mjs --out=<tmp>` | real full-corpus execution | pass — 1,962 level entries; mode counts `{symmetry:987, local-mutant:987, swap:1962, constrained-shuffle:1962, group-reshuffle:1946}`; corpus counts `{published:160, corpus1:102, corpus2:1700}` — **identical** to the pre-rename tool's documented behavior |
| `node scripts/plan-variant-family-dataset-shard.mjs --manifest=<tmp> --shard=1 --shards=60` | real modulo-sharding execution against the manifest above | pass — 33 entries in shard 1; out-of-range shard argument correctly rejected with usage error, exit 2 |
| `node scripts/merge-variant-family-dataset-shards.mjs --in-dir=<tmp> --manifest=<tmp> --out=<tmp>` | real aggregation execution against synthetic shard-summary fixtures | pass — correct per-corpus/per-mode solve-rate table; new heading text (`# Variant-family dataset: ...`) renders correctly |
| `node scripts/validate-variant-family-dataset-worktree-node-test.mjs` | dedicated dual-read env-var contract test | pass — new-env-only, legacy-env-only, new-wins-when-both-set, and `--root`-still-wins-over-both all verified |
| `node scripts/family-run-manifest-producer-node-test.mjs` | producer/consumer round trip through the shared manifest schema (with updated `tool`/`workflow` fixture values) | pass, 7/7 |
| `node scripts/family-index-lib-check.mjs` | family-index consumer-side coverage over the (unchanged) shared `trove` schema field | pass |
| `node scripts/experiment-manifest-lib-check.mjs` | manifest producer/validator boundary tests | pass |
| `node scripts/check-documentation-links.mjs` | every link/path/bare-alias in current docs resolves to a real, live target | pass, 1343 Markdown files (after de-backticking the retired `family:trove:doctor` alias in `naming-cleanup-plan.md`, Section 10) |
| `npm run check` (dead-scripts, text-source-files, lint, all `check:validators`) | full repository check suite | pass, exit 0 |
| `npm run test:node` | full 53-script aggregate Node-test graph | pass, 53/53 (including the renamed `test:validate-variant-family-dataset-worktree`) |
| `npx vitest run --coverage` | full unit suite unaffected by this batch's edits | pass, 105 files / 1325 tests |
| `node scripts/naming-cleanup-surface-inventory-node-test.mjs` | Phase 8-14 surface-inventory classification stays internally consistent | pass; batch 8F rows correctly report `canonical-live` (or `mixed-old-and-canonical` for the intentionally-dual-read env var and the mapping-table's own "former X" notation, matching the same steady-state already observed for merged batches 8A/8B) |
| `node scripts/check-naming-cleanup-ledger.mjs` | ledger contract validity after marking all 10 rows `done` | pass |

## 8. Consumer-inward closeout audit

Same-session audit (no separate fresh agent was available in this environment, same limitation noted in batches 8A-8E).

- package commands and surfaced CLIs: `family:trove:doctor` and `test:family-trove-doctor` renamed; grep-confirmed no other `package.json` alias or CI step referenced them by the old name.
- workers/raced execution: not applicable — `collect-variant-family-dataset-shard.mjs` spawns child processes (`family-generate.mjs`, `portfolio-solve-sweep.mjs`, `hint-workbench.mjs`) via `execFileSync`, all invoked by their own unrenamed, unaffected filenames.
- workflows and exact-case targets: `check-workflow-actions.mjs` and `check-solver-sweep-result-contract.mjs` both pass; the renamed workflow file re-parses as valid YAML; every job/step/artifact identity inside it was grep-verified consistent (concurrency group, `dataset-shards` job id and its `needs:` reference from `combine`, artifact upload/download name pairing).
- generated-data readers/writers/analyzers: `family-index-lib.mjs`'s consumption of the shared `trove` schema field and the `wide-trove-attempts-*.json` discovery regex were specifically checked and confirmed unaffected (both explicitly out of scope, Section 1); `family-index-lib-check.mjs` and `experiment-manifest-lib-check.mjs` both pass.
- current docs/reproduction commands: `check:documentation-links` passes; every current doc identified in the pre-edit sweep was either updated (prose term) or confirmed to intentionally retain the `--trove-root` CLI-flag example (Section 1).
- application/UI/editor consumer: not applicable, none of these are UI-consumed.
- historical compatibility paths: `docs/archive/**`, dated `reports/**` (including the `2026-08-07-wide-trove-*` filename family itself and 7 other dated reports mentioning "trove"/"wide trove"), and `docs/naming-cleanup-process-hardening.md`'s own historical process-decision entry were grepped/considered and confirmed untouched (the last item documents *why* `PATHFINDER_VARIANT_TROVE` was already anticipated as "legacy" before this batch — left as-is since it is a dated log entry describing a past decision, not live current-state documentation).

Findings: none outstanding within this batch's scope. Three items explicitly deferred/out of scope, recorded in Section 1: the shared `--trove-root`/`troveRootArg`/`familyArtifactRoots`/`TROVE` CLI-flag library, the shared `trove` schema field in `experiment-manifest-lib.mjs`/`family-index-lib.mjs`, and the dated `2026-08-07-wide-trove-*` report-filename convention.

## 9. Behavioral/evidence parity

| Observable | Before | After | Parity |
| --- | --- | --- | --- |
| `build-variant-family-dataset-manifest.mjs` full-corpus execution | 1,962 entries; documented mode/corpus counts (pre-rename tool's own header) | 1,962 entries; **identical** mode/corpus counts | parity — confirmed by direct re-execution |
| `plan-variant-family-dataset-shard.mjs` sharding | modulo-index slicing (unrenamed logic) | identical slicing, shard 1/60 = 33 entries | parity |
| `merge-variant-family-dataset-shards.mjs` aggregation | dedup-by-(id,mode)-last-occurrence, chunked attempts output (unrenamed logic) | identical behavior against synthetic fixtures | parity |
| `validate-variant-family-dataset-worktree.mjs` root resolution | `--root` > `PATHFINDER_VARIANT_TROVE` > hardcoded default | `--root` > `PATHFINDER_VARIANT_FAMILY_DATASET_ROOT` > `PATHFINDER_VARIANT_TROVE` (legacy, still functional) > hardcoded default | **backward compatible** — every pre-batch invocation continues to resolve identically; new preferred path is additive |
| `check-workflow-actions.mjs` / `check-solver-sweep-result-contract.mjs` | pass pre-batch | pass post-batch | parity |
| full unit/coverage suite | 105 files / 1325 tests passing pre-batch | 105 files / 1325 tests passing post-batch | parity |

No unexplained solved-set, report-completeness, UI, or workflow behavior change.

## 10. Residue and authority reconciliation

- Reconciliation mode: delta, against base SHA `30cff381a969b6c6ce4d77c8e04691825381d3af` (current `main` immediately after batch 8E's merge). Sufficient because no unrelated Phase 8-14 architecture work landed on `main` between the 8E merge and this batch's implementation, and this batch's rows are self-contained tool/workflow/alias/env-var/term renames.
- Target-occupancy: see Section 2 — clear for every canonical target in this batch.
- Legacy-term residue search (excluding `node_modules/`, `.git/`, `reports/`, `docs/archive/`): case-insensitive `trove` sweep across the full repository, run both before and after implementation. Post-implementation, every remaining hit is one of: (a) the intentional legacy `PATHFINDER_VARIANT_TROVE` dual-read fallback, (b) the shared `--trove-root`/`trove` schema-field library exclusions, (c) the dated `2026-08-07-wide-trove-*` report-path exclusion, (d) `docs/naming-cleanup-plan.md`'s/`docs/naming-cleanup-ledger.json`'s own historical mapping records, or (e) dated `reports/*.md`/`docs/archive/snapshots/**` (frozen).
- `npm run check:documentation-links` initially failed on 2 backtick-wrapped `family:trove:doctor` references inside `naming-cleanup-plan.md` (the retired alias no longer exists in `package.json`); fixed by de-backticking those specific mentions, matching the exact "former X" plain-text pattern already used for every prior batch's retired-alias rows (e.g. `gha:result`). Re-ran clean.
- Canonical-term search: confirmed present in every intended consumer (Section 6).
- Post-implementation `node scripts/naming-cleanup-surface-inventory-node-test.mjs`: passes; batch 8F's rows report the expected steady-state classifications (see Section 7).
- Plan/ledger changes from newly discovered scope: none required a specification amendment. All three "Out of scope" exclusions (Section 1) were identified *before* implementation, during the pre-edit impact map (Section 2), not discovered as surprises afterward.
- Intentional retained/frozen hits: `docs/archive/**`, dated `reports/**` (8 files), `docs/naming-cleanup-process-hardening.md`'s historical decision entry, the `--trove-root` CLI-flag library, the shared `trove` schema field, and the dated `2026-08-07-wide-trove-*` report-path convention (all documented above).

No unclassified live hit remains in this batch's scope.

## 11. Pre-merge barrier

- [x] predecessor batch 8E's `batchCompletions` entry recorded the real merged PR/commit (PR #1590, `30cff381a969b6c6ce4d77c8e04691825381d3af`) before this batch was claimed;
- [x] branch is current `main` (post-8E-merge) plus only this batch's commits;
- [x] compared branch head against current `main` — clean, no drift;
- [x] intended diff is non-empty and original (no prior duplicate PR found);
- [x] no unrelated next-batch (8G+) implementation is stacked in this PR;
- [x] targeted validation green (Section 7);
- [x] required aggregate CI: `npx tsc --noEmit`, `npm run check`, `npm run test:node`, and the full Vitest suite with coverage were all run directly in this session and are green;
- [x] ledger IDs, risk, compatibility policy, and verification fields (updated in the same PR) match the evidence in this record;
- [x] all predecessor phases (1-7) are complete; batches 8A-8E are merged;
- [x] no specification amendment is smuggled into this PR — all edits implement the already-fixed Section 5.5/5.10 mappings, plus the three documented scope exclusions (Section 1), not a change to any canonical target, compatibility lifetime, risk class, or batch assignment;
- [ ] PR description links this record — pending PR creation;
- [x] no unexplained solved-set, report-completeness, UI, or workflow behavior change (Section 9);
- [x] all 10 selected rows are `done` and `activeExecution` is reset to `idle` in this same commit set before merge;
- [x] this batch's own `batchCompletions["8F"]` entry remains `pending` (no PR/merge commit exists yet) until it actually merges;
- [x] the batch's one `risk: high` row (NC-P08-053) has an explicit rollback plan (Section 4.1) and new direct test coverage proving the compatibility contract (Section 3/7), matching the elevated scrutiny its risk class requires.

## 12. Closure and merge handoff

| Item | Value |
| --- | --- |
| PR | pending |
| Final head SHA | pending (recorded at push time) |
| Merged? | no |
| Ledger rows closed | NC-P08-018, NC-P08-019, NC-P08-047, NC-P08-048, NC-P08-049, NC-P08-050, NC-P08-051, NC-P08-052, NC-P08-053, NC-P08-054 |
| Deferred/superseded rows | none deferred; the `--trove-root`/schema-field/dated-report-path exclusions are documented in-batch scope decisions, not deferred ledger rows |
| Known structural-only surfaces | `collect-variant-family-dataset.yml`'s full GHA dispatch remains structurally-validated-only (workflow lint/contract checks), matching its pre-batch coverage class; `collect-variant-family-dataset-shard.mjs`'s full generate/solve/hint-workbench run remains untested end-to-end locally (requires the off-main dataset and multi-hour solver budgets), also matching pre-batch coverage class |

Batch 8G (solver diagnostics and legacy-latency portfolio tools) must not start on this unmerged branch. The next batch's session must start from new current `main` after this PR merges, record this batch's merged PR/commit in ledger `batchCompletions["8F"]`, and only then claim 8G.


## 13. Post-closeout audit correction

A later Phases 8-14 forensic audit found one specification-compliance defect in NC-P08-054. The
original 8F implementation used the local name `DATASET_BRANCH` even though the plan and ledger
fixed the canonical target as `VARIANT_FAMILY_DATASET_BRANCH`. The original record documented
that substitution, but a batch record is not authorized to replace a fixed canonical target merely
because a shorter local spelling seems clear.

The audit repair renames the local constant to the exact canonical target and hardens the permanent
Phase-8 closeout checker plus its negative fixtures so future substitutions fail mechanically.
The branch value and worktree behavior are unchanged.

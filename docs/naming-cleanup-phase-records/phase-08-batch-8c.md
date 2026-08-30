# Naming-cleanup Phase 8 batch 8C execution record

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 8 |
| Batch | 8C |
| Status | closeout |
| Base `main` SHA | `4a79b6950ee0747562326ca02d93862598ece056` (merge commit of batch 8B's PR #1587) |
| Branch | `claude/naming-cleanup-plan-nzv395` (restarted from new `main` after batch 8B merged) |
| PR | pending (not yet opened) |
| Selected ledger row IDs | NC-P08-027, NC-P08-028, NC-P08-033, NC-P08-034, NC-P08-035, NC-P08-036, NC-P08-037, NC-P08-038, NC-P08-039, NC-P08-040, NC-P08-041, NC-P08-057 |
| Reconciliation mode | delta (single-batch implementation session immediately following batch 8B's merge; no unrelated Phase 8-14 architecture landed on `main` in between) |
| Highest risk in batch | medium (all 12 rows; NC-P08-034/036/038/040 are `dual-read`/`temporary-command-alias` package aliases) |
| Primary compatibility owner | `package.json` compatibility alias (all four dual-read rows share this owner) |
| Canonical mappings | see Section 5.8 (`repair-direct-probe` family) and 5.9 (surfaced pilot -> behavior-named commands) of `naming-cleanup-plan.md` |
| Implementation agent/session | Claude Code remote session (this session) |
| Closeout auditor | same session (no fresh-session closeout was available; same limitation noted in batches 8A/8B) |

### Branch/PR authority preflight

- [x] searched open naming-cleanup PRs and similarly named branches — only this branch and `main` exist; PRs #1586 (8A) and #1587 (8B) are merged and closed, no other open naming-cleanup PR;
- [x] compared this branch against current `main` after the restart — `git checkout -B claude/naming-cleanup-plan-nzv395 origin/main` puts the branch exactly at `main`'s tip (`4a79b695...`), plus one small commit recording the 8B merge barrier before this batch's implementation began;
- [x] recovered/superseded relevant commits — none needed;
- [x] confirmed this is the only active implementation batch — ledger `activeExecution.status` was `idle` with `batch: null` before this session started batch 8C, and `batchCompletions["8B"].status` was `merged` (PR #1587, commit `4a79b695...`) before batch 8C's rows were touched;
- [x] confirmed the branch starts from the recorded current-`main` SHA above.

| Branch / PR | Unique relevant work? | Disposition |
| --- | --- | --- |
| `claude/naming-cleanup-plan-nzv395` (post-8B-merge state) | yes — this batch's implementation | active batch branch |

## 1. Scope, change envelope, and stop conditions

Batch 8C covers durable research command lifecycle names: `repair-direct-probe`'s renamed-to-`run-repair-search` pair (Section 5.8), and five surfaced `*-pilot.mjs` collectors renamed to behavior-descriptive names (Section 5.9), per `docs/naming-cleanup-phase-records/phase-08.md`'s 8C scope row.

### Change envelope

**Intended observable deltas**

- `scripts/repair-direct-probe.mjs` -> `scripts/run-repair-search.mjs`; `scripts/repair-direct-probe-worker.mjs` -> `scripts/run-repair-search-worker.mjs`; internal self-referential log/comment/usage strings and cross-references in `modules/solver/orchestration.ts` and `docs/solver-architecture.md` updated to match (NC-P08-027, NC-P08-028).
- `scripts/stress/producer-population-pilot.mjs` -> `scripts/stress/compare-search-producer-populations.mjs`; `solver:producer-population-pilot` -> `solver:compare-search-producer-populations`; header comment and default output path updated; the deterministic stratified-sample seed string default (`--seed`'s default value) deliberately **not** renamed (see Out of scope) (NC-P08-033, NC-P08-034).
- `scripts/stress/residual-interface-mining-pilot.mjs` -> `scripts/stress/analyze-residual-interfaces.mjs`; `solver:residual-interface-pilot` -> `solver:analyze-residual-interfaces`; default output path updated (NC-P08-035, NC-P08-036).
- `scripts/stress/repair-rollback-census-pilot.mjs` -> `scripts/stress/census-repair-rollback-windows.mjs`; `solver:repair-rollback-pilot` -> `solver:census-repair-rollback-windows`; default output path and a cross-reference comment in `scripts/stress/repair-elite-path-dump.mjs` updated; the deterministic sample seed string default likewise **not** renamed (NC-P08-037, NC-P08-038).
- `scripts/stress/symmetry-repair-seed-pilot.mjs` -> `scripts/stress/compare-symmetry-repair-seed.mjs`; `solver:symmetry-repair-seed-pilot` -> `solver:compare-symmetry-repair-seed`; default output path updated (NC-P08-039, NC-P08-040).
- `scripts/stress/restart-continuation-population-pilot.mjs` -> `scripts/stress/compare-repair-restart-continuation-population.mjs` (+ its CLI node-test); extensive self-referential "pilot"/"PILOT" prose (header, inline comments, console log/error labels, default tmp output path) migrated to "tool"/"run"/"comparison" language, while every reference to a frozen dated report filename containing "pilot" (e.g. `reports/2026-08-26-restart-vs-continuation-near-miss-development-pilot.md`) was left untouched (no package alias exists for this tool per the plan's own Section 5.9 note) (NC-P08-041).
- `scripts/stress/confirm-residual-001-archetype-audit.mjs` -> `scripts/stress/audit-candidate-eligibility-and-participation.mjs`; its one internal usage-line self-reference and the `.github/workflows/README.md` prose describing the retained script updated; the deleted historical workflow filenames (`confirm-residual-001-archetype-audit-one-shot.yml`, `confirm-residual-002-archetype-audit-one-shot.yml`) left untouched as historical record (NC-P08-057).
- All consumer test/smoke files updated: `scripts/naming-cleanup-phase8-cli-smoke-node-test.mjs`, `scripts/naming-cleanup-surface-inventory-node-test.mjs`, `package.json` (aliases plus the `test:node` aggregate string), `.github/workflows/README.md`.
- `docs/naming-cleanup-plan.md`'s own notation updated for every row: retired package aliases de-backticked (bare-alias-existence checker rule) and implemented bold/future canonical names converted to backtick/current form (Section 5.8, 5.9).

**Invariant observables**

- `repairSearchFromGate`'s single-run and `--races` (worker-pool) code paths are unchanged — proven by real solve executions against a real published level (see Section 7);
- `compareProducerPopulations`, `rollbackCensus`, `mineResidualInterfaces` (imported from `research-analysis-lib.mjs`, not renamed by this batch) and every renamed tool's own math/selection logic are unchanged — comment/path/identifier-only edits;
- the deterministic stratified-sample draw in `compare-search-producer-populations.mjs` and `census-repair-rollback-windows.mjs` is **byte-for-byte unchanged** because their `--seed` default string literals were deliberately left as the old filenames (see Out of scope) — this is an explicit invariant, not an oversight;
- `runRepairRestartVsContinuation`'s restart/continuation comparison logic in `compare-repair-restart-continuation-population.mjs` is unchanged — proven by the real CLI test;
- `getConfiguredAttemptConfigs`/`extractFeatures`/`isMustCrossFlipperHeavy` calls in `audit-candidate-eligibility-and-participation.mjs` are unchanged (comment/usage-line-only edit);
- no solver search behavior, work allocation, or corpus content changed anywhere in this batch.

**Out of scope / separate authorization**

- the default `--seed` string literals in `compare-search-producer-populations.mjs` (`'producer-population-pilot'`) and `census-repair-rollback-windows.mjs` (`'repair-rollback-census-pilot'`) were deliberately **not** renamed: these strings are fed through an FNV-1a hash to seed the deterministic stratified level draw used when a caller omits `--seed`. Renaming them would silently change which levels get sampled by default — a real behavior change disguised as a cosmetic rename, and explicitly the kind of thing Section 1's "behavior-preserving" contract forbids without separate authorization. Both are documented in this record and in an inline comment at their definition.
- historical/changelog-style comments describing what "the original pilot" (i.e., an earlier version of the same tool, before a later feature was added) used to do were left as-is in `compare-search-producer-populations.mjs` and `census-repair-rollback-windows.mjs` — these are dated changelog notes about the tool's own history, analogous to frozen-history text, not a live "pilot" identity claim.
- `scripts/stress/repair-elite-path-dump.mjs`'s pre-existing `modules/Solver.ts` (capitalized) import was left untouched — a pre-existing, unrelated case-sensitivity issue discovered incidentally while updating this file's cross-reference comment; it is not part of any Batch 8C row and predates this session (confirmed via `git log`/`git show` against an older commit).

No behavior/resource-policy change, ambiguous historical identity, unowned compatibility boundary, unidentifiable live consumer, or superseding architecture was discovered. No stop condition was triggered.

## 2. Pre-edit impact map

Commands run:

```sh
npm run naming:status
find . -iname "<old-name>*" (per tool, excluding node_modules/.git/.solver-tools/.cache/coverage)
grep -rln <old-term> . (excluding node_modules/.git/reports/docs-archive/data/.solver-tools/.cache/coverage, per term)
```

`npm run naming:status` confirmed Phase 8 gate `ready`, `activeExecution.status: idle`, `batchCompletions["8B"].status: merged`, and batch 8C next with all 12 rows `verification.surfaceInventory: done` already and every other verification dimension `pending`.

Before renaming the `--seed` default strings, re-read both tools' own inline comments (`compare-search-producer-populations.mjs` lines 18-24, `census-repair-rollback-windows.mjs` lines 17-21) documenting that `--sample=N --seed=X always reproduces the same draw`; this made the deterministic-seed risk explicit before any edit was made, not discovered after.

### Target occupancy / collision check

| Canonical target | Existing live use? | Same concept / unrelated / collision / already migrated | Disposition |
| --- | --- | --- | --- |
| `scripts/run-repair-search.mjs` / `-worker.mjs` | no | n/a | clear |
| `scripts/stress/compare-search-producer-populations.mjs` / `solver:compare-search-producer-populations` | no | n/a | clear |
| `scripts/stress/analyze-residual-interfaces.mjs` / `solver:analyze-residual-interfaces` | no | n/a | clear |
| `scripts/stress/census-repair-rollback-windows.mjs` / `solver:census-repair-rollback-windows` | no | n/a | clear |
| `scripts/stress/compare-symmetry-repair-seed.mjs` / `solver:compare-symmetry-repair-seed` | no | n/a | clear |
| `scripts/stress/compare-repair-restart-continuation-population.mjs` (+ `-cli-node-test.mjs`) | no | n/a | clear |
| `scripts/stress/audit-candidate-eligibility-and-participation.mjs` | no | n/a | clear |

No canonical target was occupied by a materially different live concept.

### Contract-migration matrix

| Surface | Classification | Concrete locations | Evidence / planned test |
| --- | --- | --- | --- |
| Definition / producer | migrate | all 6 renamed tool files + worker + CLI test | `git mv` + content edits, see Section 6 |
| Internal direct consumers | migrate | `modules/solver/orchestration.ts`, `modules/solver/repair-search.ts`, `docs/solver-architecture.md`, `scripts/stress/repair-elite-path-dump.mjs`, `.github/workflows/README.md` | grep-verified zero residue outside frozen/archive/authority-docs/deliberately-retained-seed-strings (Section 10) |
| Canonical parser / normalizer | not applicable | none of these rows touch a persisted-identity parser | n/a |
| Sequential transport | migrate | `run-repair-search.mjs` -> `run-repair-search-worker.mjs` via `scripts/solver-worker-pool.mjs`'s `runWorkerPool`/`runWorkerMain` | real `--races=2` execution proves the worker path (Section 7) |
| Alternate worker/race transport | not applicable | covered above, this IS the race transport | n/a |
| Serialized writer | migrate (self-contained) | each tool's own default output filename; no cross-tool generated-schema field renamed | real executions confirm each tool still writes valid, self-consistent JSON (Section 7) |
| Historical reader / fixture | retained/frozen | `reports/stress/producer-population-pilot-2026-08-11.json`, `reports/stress/residual-interface-mining-pilot-2026-08-11.json`, `reports/stress/repair-rollback-census-pilot-2026-08-11.json`, `reports/stress/symmetry-repair-seed-pilot-R02248-02.json`, dated `reports/*.md` mentioning old names, deleted-workflow historical filenames in `.github/workflows/README.md` | left unchanged, confirmed by reconciliation grep |
| Report/export projection | not applicable | none of these tools feed a maintained generated-report schema this batch touches | n/a |
| Analyzer/grouping consumers | not applicable | none | n/a |
| CLI / package alias | migrate | `package.json`'s 4 `solver:*-pilot` aliases, `test:restart-continuation-population-pilot-cli`, plus the `test:node` aggregate string | renamed, old aliases removed same-batch (owning-batch-closeout retirement) |
| Workflow command/inputs/outputs | not applicable | no workflow YAML directly invokes any of this batch's renamed scripts | n/a |
| Artifact/concurrency/cache/path identifiers | not applicable | none of this batch's tools have their own workflow-level artifact/concurrency identity | n/a |
| Hint/provenance storage | not applicable | none of these rows touch hint provenance storage | n/a |
| Application/UI/editor consumer | not applicable | none of these tools are UI-consumed | n/a |
| Current docs/examples | migrate | `docs/solver-architecture.md`, `.github/workflows/README.md` | grep-verified (Section 10) |
| Frozen historical evidence | retained/frozen | all `reports/*.md`, `reports/**/*.json`, `docs/archive/**`, deleted-workflow narrative in `.github/workflows/README.md` | unchanged; confirmed no mass rewrite |

## 3. Validation topology

| Surface | Real runtime/path | Existing coverage | Coverage class | Gap/action |
| --- | --- | --- | --- | --- |
| `run-repair-search.mjs` (single-run mode) | native/bundled Node via `run-bundled.mjs` | `naming-cleanup-phase8-cli-smoke-node-test.mjs` (fast-fail argument check only) | ci-test-reference (fast-fail) | ran a **real solve** against published level 44 in this session to close the gap beyond the fast-fail check (Section 7) |
| `run-repair-search.mjs` (`--races` mode) / `run-repair-search-worker.mjs` | bundled Node worker pool | `uncovered-by-known-ci` (per surface inventory) | none | ran a **real `--races=2` execution** in this session, exercising the actual worker spawn/pool/stop-after-first-success path; unchanged from pre-batch coverage class going forward (this remains outside CI) |
| `compare-search-producer-populations.mjs` | native/bundled Node via `run-bundled.mjs` | `naming-cleanup-phase8-cli-smoke-node-test.mjs` (zero-row, real solver/bundler seam) | ci-test-reference | ran directly in this session (Section 7) |
| `analyze-residual-interfaces.mjs` | native/bundled Node via `run-bundled.mjs` | `naming-cleanup-phase8-cli-smoke-node-test.mjs` | ci-test-reference | ran directly in this session (Section 7) |
| `census-repair-rollback-windows.mjs` | native/bundled Node via `run-bundled.mjs` | `naming-cleanup-phase8-cli-smoke-node-test.mjs` | ci-test-reference | ran directly in this session (Section 7) |
| `compare-symmetry-repair-seed.mjs` | native/bundled Node via `run-bundled.mjs` | `uncovered-by-known-ci` (per surface inventory) | none | ran a **real full execution** against its own default fixture files (`data/families/phaseB/R02248-symmetry*.json`, `reports/families/2026-07-15-R02248-symmetry-family-solve.json`, all present in the repo) in this session, producing a real symmetry-comparison document; unchanged from pre-batch coverage class going forward |
| `compare-repair-restart-continuation-population.mjs` | native/bundled Node via `run-bundled.mjs` | `compare-repair-restart-continuation-population-cli-node-test.mjs` (real `--count-only` execution against a synthetic fixture) | direct | ran directly in this session (Section 7) |
| `audit-candidate-eligibility-and-participation.mjs` | native/bundled Node via `run-bundled.mjs` | `naming-cleanup-phase8-cli-smoke-node-test.mjs` (fast-fail argument check only — the tool's real inputs are sealed pool/report files not present as lightweight fixtures) | ci-test-reference (fast-fail) | ran the fast-fail check directly (Section 7); unchanged from pre-batch coverage class, consistent with its documented "durable general diagnostic" role that expects real sealed research artifacts as input |

## 4. Compatibility and frozen-history ownership

| Row ID | Legacy form | Canonical form | Mode / retireWhen | Owning boundary | Legacy read test | Canonical write/runtime rule | Frozen artifacts unchanged |
| --- | --- | --- | --- | --- | --- | --- | --- |
| NC-P08-034 | `solver:producer-population-pilot` | `solver:compare-search-producer-populations` | `temporary-command-alias` / `owning-batch-closeout` | `package.json` compatibility alias | n/a — no legacy runtime read needed for a command-name alias; retired within this same batch | `package.json` now defines only `solver:compare-search-producer-populations` | yes |
| NC-P08-036 | `solver:residual-interface-pilot` | `solver:analyze-residual-interfaces` | `temporary-command-alias` / `owning-batch-closeout` | `package.json` compatibility alias | n/a, same reasoning | `package.json` now defines only `solver:analyze-residual-interfaces` | yes |
| NC-P08-038 | `solver:repair-rollback-pilot` | `solver:census-repair-rollback-windows` | `temporary-command-alias` / `owning-batch-closeout` | `package.json` compatibility alias | n/a, same reasoning | `package.json` now defines only `solver:census-repair-rollback-windows` | yes |
| NC-P08-040 | `solver:symmetry-repair-seed-pilot` | `solver:compare-symmetry-repair-seed` | `temporary-command-alias` / `owning-batch-closeout` | `package.json` compatibility alias | n/a, same reasoning | `package.json` now defines only `solver:compare-symmetry-repair-seed` | yes |

All four `owning-batch-closeout` aliases are retired as of this record: none of the old `solver:*-pilot` alias spellings remain in `package.json`, any live script, or any current (non-authority, non-archive) doc.

### 4.1 High-risk rollback plan

No row in this batch is `risk: high`. The four `medium`-risk dual-read rows roll back trivially: revert the batch commit(s), which restores both the old filenames and the old aliases atomically. The two deliberately-preserved `--seed` default strings mean a revert (or, symmetrically, this batch's forward implementation) never changes any deterministic sample-draw output — there is no data-dependent rollback risk for those two tools.

## 5. Before-change baseline

This batch is `medium` risk at most and behavior-preserving by construction (renames/comment edits only, no logic touched, and the two deterministic-seed strings explicitly frozen). Baselines captured:

| Command / fixture | Before result / fingerprint |
| --- | --- |
| `run-repair-search.mjs --corpus=data/levels.json --level=44 --gate-index=0 --budget-ms=10000 --node-budget=200000` (pre-rename equivalent, verified post-rename instead since the tool has no behavior-affecting change) | N/A — parity established by running the renamed tool post-edit: `SOLVED in 6ms, 79 nodes`, a real 27-move path printed, matching the expected shape for this level/gate/profile |
| `run-repair-search.mjs ... --races=2` | N/A — parity established post-rename: `[seedSalt=1] SOLVED in 9ms, 198 nodes`, real worker-pool race semantics (first success wins) observed |
| `compare-symmetry-repair-seed.mjs` (default fixture args) | N/A — parity established post-rename: real symmetry-transform comparison document written (`schemaVersion, familyId, parentId, variantId, transform, ... firstDrawDivergence, firstSurvivorOrderDivergence`), matching the tool's documented output shape |
| `compare-repair-restart-continuation-population-cli-node-test.mjs` | Same assertion (`legacy repair-probe stageId row must count toward the selectable population`) before and after, since only identifiers/comments changed |

Behavioral parity for the pure comment/path-only edits in `compare-search-producer-populations.mjs`, `analyze-residual-interfaces.mjs`, `census-repair-rollback-windows.mjs`, and `audit-candidate-eligibility-and-participation.mjs` is established by the real zero-row smoke executions in Section 7, which would fail loudly if the rename had broken any import/seam.

## 6. Implementation log

- Renamed `scripts/repair-direct-probe.mjs` -> `scripts/run-repair-search.mjs` and `scripts/repair-direct-probe-worker.mjs` -> `scripts/run-repair-search-worker.mjs`; updated internal usage-line/log-label/cross-reference strings in both files, `modules/solver/orchestration.ts` (2 doc-comment references), and `docs/solver-architecture.md` (table row + prose); updated `scripts/naming-cleanup-phase8-cli-smoke-node-test.mjs`'s fast-fail check target.
- Renamed `scripts/stress/producer-population-pilot.mjs` -> `scripts/stress/compare-search-producer-populations.mjs`; updated header comment and default output path; deliberately left the `--seed` default string (`'producer-population-pilot'`) unchanged (Section 1); updated the one live cross-reference in `modules/solver/repair-search.ts` (a frozen dated-report-filename mention in the same file was left alone); updated `package.json`'s `solver:producer-population-pilot` -> `solver:compare-search-producer-populations` and the phase8-smoke test's tool list.
- Renamed `scripts/stress/residual-interface-mining-pilot.mjs` -> `scripts/stress/analyze-residual-interfaces.mjs`; updated default output path (header comment already accurately described the tool's behavior, no change needed); updated `package.json`'s `solver:residual-interface-pilot` -> `solver:analyze-residual-interfaces` and the phase8-smoke test's tool list.
- Renamed `scripts/stress/repair-rollback-census-pilot.mjs` -> `scripts/stress/census-repair-rollback-windows.mjs`; updated default output path and the cross-reference comment (`compare-search-producer-populations.mjs's` own `--sample=N --seed=X` convention); deliberately left its own `--seed` default string (`'repair-rollback-census-pilot'`) unchanged (Section 1); updated the live cross-reference in `scripts/stress/repair-elite-path-dump.mjs` (two comment mentions); updated `package.json`'s `solver:repair-rollback-pilot` -> `solver:census-repair-rollback-windows` and the phase8-smoke test's tool list.
- Renamed `scripts/stress/symmetry-repair-seed-pilot.mjs` -> `scripts/stress/compare-symmetry-repair-seed.mjs`; updated default output path (header comment already accurate); updated `package.json`'s `solver:symmetry-repair-seed-pilot` -> `solver:compare-symmetry-repair-seed`.
- Renamed `scripts/stress/restart-continuation-population-pilot.mjs` -> `scripts/stress/compare-repair-restart-continuation-population.mjs` and its CLI node-test; migrated every self-referential "pilot"/"PILOT" occurrence (header comment, 4 inline comments, console log label, `INVALID EQUAL-WORK PILOT` error string, default tmp output path) to "tool"/"run"/"comparison" language, while leaving the two frozen dated-report-filename mentions (`.../restart-vs-continuation-near-miss-development-pilot.md`, `.../restart-continuation-larger-w-pilot.md`) untouched; updated `package.json`'s `test:restart-continuation-population-pilot-cli` -> `test:compare-repair-restart-continuation-population-cli` (including the `test:node` aggregate string), `scripts/naming-cleanup-surface-inventory-node-test.mjs`'s assertions, and `.github/workflows/README.md`'s one live-script cross-reference (the deleted-workflow historical filenames in the same paragraph were left alone).
- Renamed `scripts/stress/confirm-residual-001-archetype-audit.mjs` -> `scripts/stress/audit-candidate-eligibility-and-participation.mjs`; updated its own usage-line self-reference, `scripts/naming-cleanup-phase8-cli-smoke-node-test.mjs`'s fast-fail check target, and `.github/workflows/README.md`'s live-script cross-reference (the two deleted historical workflow filenames in the same paragraph were left alone).
- Updated `docs/naming-cleanup-plan.md` notation for every row: de-backticked retired `solver:*-pilot` aliases and old file paths so the documentation-link checker's bare-npm-alias-existence rule stops treating them as live; converted implemented canonical names to backtick/current form; rewrote Section 5.8's `repair-direct-probe` paragraph to past tense.

## 7. Targeted contract validation

| Command / test | Boundary proved | Result |
| --- | --- | --- |
| `npx tsc --noEmit -p tsconfig.json` and `-p tsconfig.test.json` | full TypeScript compile, including every edited `.ts` file | pass (0 errors) |
| `npx eslint <all touched .mjs/.ts files>` | lint over every edited script/module | pass, 0 findings |
| `node scripts/run-bundled.mjs scripts/run-repair-search.mjs -- --corpus=data/levels.json --level=44 --gate-index=0 --budget-ms=10000 --node-budget=200000` | real single-run `repairSearchFromGate` call against a real published level | pass — `SOLVED in 6ms, 79 nodes`, valid 27-move path |
| same command + `--races=2` | real worker-pool race path (`run-repair-search-worker.mjs`, `scripts/solver-worker-pool.mjs`) | pass — `[seedSalt=1] SOLVED in 9ms, 198 nodes`, correct first-success-wins semantics |
| `node scripts/run-bundled.mjs scripts/stress/compare-symmetry-repair-seed.mjs -- --out=<tmp>` | real symmetry-transform repair-seed comparison against the tool's own default fixture files | pass — valid comparison document with `firstDrawDivergence`/`firstSurvivorOrderDivergence` fields populated |
| `node scripts/stress/compare-repair-restart-continuation-population-cli-node-test.mjs` | real `--count-only` population-filter execution, including the legacy `repair-probe` stageId dual-read | pass |
| `node scripts/naming-cleanup-phase8-cli-smoke-node-test.mjs` | real (zero-row/fast-fail) execution of `run-repair-search.mjs`, `compare-search-producer-populations.mjs`, `census-repair-rollback-windows.mjs`, `analyze-residual-interfaces.mjs`, and `audit-candidate-eligibility-and-participation.mjs` through their actual bundling/solver seams | pass |
| `node scripts/naming-cleanup-surface-inventory-node-test.mjs` | Phase-8 surface-inventory classification stays internally consistent after the rename | pass |
| `node scripts/naming-cleanup-ledger-node-test.mjs` | ledger checker self-test, including the generalized `naming:status` assertion from batch 8B | pass |
| `npm run check:documentation-links` | every backticked path/alias in current docs resolves to a real, live target | pass |
| `npm run check` (dead-scripts, text-source-files, lint, all `check:validators`) | full repository check suite | pass |
| `npm run test:node` | full 53-script aggregate Node-test graph | pass, 53/53 |
| `npx vitest run --coverage` | full unit suite unaffected by this batch's comment/rename-only edits | pass, 105 files / 1325 tests |

## 8. Consumer-inward closeout audit

Same-session audit (no separate fresh agent was available in this environment, same limitation noted in batches 8A/8B).

- package commands and surfaced CLIs: `package.json` scans clean — no remaining `*-pilot` entries for any of this batch's tools; `npm run naming:status` reports the expected batch-8C-complete state before this closeout.
- workers/raced execution: `run-repair-search.mjs`'s `--races` path was exercised for real (Section 7), the one worker/race transport in this batch's scope.
- workflows and exact-case targets: `check-workflow-actions.mjs` passes (run as part of `check:validators`); no workflow YAML directly invokes any of this batch's renamed scripts, so no workflow file needed a content edit beyond the two `.github/workflows/README.md` prose cross-references.
- generated-data readers/writers/analyzers: each tool's own default output path was renamed; no cross-tool generated-schema field was touched; the two deliberately-preserved seed strings mean no generated *data* changed.
- current docs/reproduction commands: `check:documentation-links` passes; every reproduction command/cross-reference mentioning a renamed tool/alias was grep-verified updated, including `docs/solver-architecture.md` and `.github/workflows/README.md`'s two live-script mentions embedded in otherwise-historical paragraphs.
- application/UI/editor consumer: not applicable, none of these are UI-consumed.
- historical compatibility paths: `docs/archive/**`, `reports/**`, the deleted-workflow historical filenames, and the two deliberately-preserved seed strings were grepped and confirmed untouched/unchanged.

Findings: none outstanding within this batch's scope. One pre-existing, unrelated issue noted for awareness but explicitly out of scope: `scripts/stress/repair-elite-path-dump.mjs`'s `modules/Solver.ts` (capitalized) import predates this session and is not part of any Batch 8C row.

## 9. Behavioral/evidence parity

| Observable | Before | After | Parity |
| --- | --- | --- | --- |
| `run-repair-search.mjs` single-run solve (level 44, gate 0, budget-ms=10000, node-budget=200000) | (tool unrenamed; logic identical) | `SOLVED in 6ms, 79 nodes`, valid path | parity — no logic changed, confirmed by direct execution |
| `run-repair-search.mjs --races=2` | (tool unrenamed; logic identical) | `[seedSalt=1] SOLVED in 9ms, 198 nodes` | parity |
| `compare-symmetry-repair-seed.mjs` default-fixture run | (tool unrenamed; logic identical) | valid comparison document, real divergence fields | parity |
| `compare-repair-restart-continuation-population-cli-node-test.mjs` | same assertion pre/post-rename | pass | parity |
| `naming-cleanup-phase8-cli-smoke-node-test.mjs` | non-empty zero-row output / correct fast-fail messages from all this batch's tools | same, post-rename | parity |
| full unit/coverage suite | 105 files / 1325 tests passing pre-batch (unchanged file logic) | 105 files / 1325 tests passing post-batch | parity |

No unexplained solved-set, report-completeness, UI, or workflow behavior change.

## 10. Residue and authority reconciliation

- Reconciliation mode: delta, against base SHA `4a79b6950ee0747562326ca02d93862598ece056` (current `main` immediately after batch 8B's merge). Sufficient because no unrelated Phase 8-14 architecture work landed on `main` between the 8B merge and this batch's implementation, and this batch's rows are self-contained tool/alias renames.
- Target-occupancy: see Section 2 — clear for every canonical target in this batch.
- Legacy-term residue search (excluding `node_modules/`, `.git/`, `reports/`, `docs/archive/`, `data/`, `.solver-tools/`, `.cache/`, `coverage/`): `repair-direct-probe`, `producer-population-pilot`, `residual-interface-mining-pilot`, `repair-rollback-census-pilot`, `symmetry-repair-seed-pilot`, `restart-continuation-population-pilot`, `confirm-residual-001-archetype-audit`, and a case-insensitive `\bpilot\b` sweep of every touched file — all clean except: the authority docs (intentional historical mapping record), the two deliberately-preserved `--seed` default strings (documented invariant, Section 1), historical changelog comments about "the original pilot" (a prior version of the same tool, Section 1), frozen dated-report filenames, and the deleted-workflow historical narrative in `.github/workflows/README.md`.
- Canonical-term search: confirmed present in every intended consumer (Section 6).
- Post-implementation `node scripts/naming-cleanup-surface-inventory-node-test.mjs`: passes.
- `npm run check:documentation-links`: passes.
- Plan/ledger changes from newly discovered scope: none required a specification amendment. The two deliberately-preserved seed strings are a scope *exclusion* discovered during implementation, not a new canonical target; recorded here and in Section 1 rather than silently renamed or silently skipped.
- Intentional retained/frozen hits: `docs/archive/**`, `reports/**`, deleted-workflow historical filenames, the two `--seed` default strings, historical "original pilot" changelog prose, and the pre-existing unrelated `modules/Solver.ts` capitalization issue in `repair-elite-path-dump.mjs` (all documented above).

No unclassified live hit remains in this batch's scope.

## 11. Pre-merge barrier

- [x] predecessor batch 8B's `batchCompletions` entry recorded the real merged PR/commit (PR #1587, `4a79b6950ee0747562326ca02d93862598ece056`) before this batch was claimed;
- [x] branch is current `main` (post-8B-merge) plus only this batch's commits;
- [x] compared branch head against current `main` — clean, no drift;
- [x] intended diff is non-empty and original (no prior duplicate PR found);
- [x] no unrelated next-batch (8D+) implementation is stacked in this PR;
- [x] targeted validation green (Section 7);
- [x] required aggregate CI: `npm run check`, `npm run test:node`, and the full Vitest suite with coverage were all run directly in this session and are green;
- [x] ledger IDs, risk, compatibility policy, and verification fields (updated in the same PR) match the evidence in this record;
- [x] all predecessor phases (1-7) are complete; batches 8A and 8B are merged;
- [x] no specification amendment is smuggled into this PR — all edits implement the already-fixed Section 5.8/5.9 mappings, plus one explicit, documented scope exclusion (the deterministic seed strings), not a change to any canonical target, compatibility lifetime, risk class, or batch assignment;
- [ ] PR description links this record — pending PR creation;
- [x] no unexplained solved-set, report-completeness, UI, or workflow behavior change (Section 9);
- [x] all 12 selected rows are `done` and `activeExecution` is reset to `idle` in this same commit set before merge;
- [x] this batch's own `batchCompletions["8C"]` entry remains `pending` (no PR/merge commit exists yet) until it actually merges.

## 12. Closure and merge handoff

| Item | Value |
| --- | --- |
| PR | pending |
| Final head SHA | pending (recorded at push time) |
| Merged? | no |
| Ledger rows closed | NC-P08-027, NC-P08-028, NC-P08-033, NC-P08-034, NC-P08-035, NC-P08-036, NC-P08-037, NC-P08-038, NC-P08-039, NC-P08-040, NC-P08-041, NC-P08-057 |
| Deferred/superseded rows | none deferred; the two `--seed` default-string exclusions are a documented in-batch scope decision, not a deferred row |
| Known structural-only surfaces | `run-repair-search-worker.mjs` and `compare-symmetry-repair-seed.mjs` remain outside normal CI (`uncovered-by-known-ci`) going forward, matching their pre-batch coverage class; both were exercised with real executions in this session as targeted validation, not as a permanent CI addition |

Batch 8D (technique-census analysis) must not start on this unmerged branch. The next batch's session must start from new current `main` after this PR merges, record this batch's merged PR/commit in ledger `batchCompletions["8C"]`, and only then claim 8D.

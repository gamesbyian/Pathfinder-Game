# Naming-cleanup Phase 8 batch 8G execution record

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 8 |
| Batch | 8G |
| Status | closeout |
| Base `main` SHA | `031defe35abf90e3929632b939c5cce10d8ae913` (merge commit of batch 8F's PR #1593) |
| Branch | `claude/naming-cleanup-plan-nzv395` (restarted from new `main` after batch 8F merged) |
| PR | pending (not yet opened) |
| Selected ledger row IDs | NC-P08-023, NC-P08-024, NC-P08-025, NC-P08-026, NC-P08-055, NC-P08-056, NC-P08-058, NC-P08-059, NC-P08-060, NC-P08-061 |
| Reconciliation mode | delta, with an out-of-band base note: unrelated Phase 9-14 preparation work (PRs #1591/#1592, "codex" sessions) landed on `main` between batch 8F's merge and this batch's start, adding `docs/naming-cleanup-future-phase-preparation.md`, `docs/naming-cleanup-level-metric-boundaries.json`, and a new `check:level-metric-boundaries` validator wired into `npm run check`. Neither prep doc claims a Phase-8 row or authorizes implementation ahead of the serialized stream, so this batch's own scope is unaffected — but the new validator IS a real CI gate this batch's renames had to satisfy (Section 7). |
| Highest risk in batch | medium (no `risk: high` row in this batch; NC-P08-024/025 are the most structurally interesting for their permanent dual-read/single-write contract) |
| Primary compatibility owner | `scripts/analyze-solver-diagnostics.mjs`'s generated-report field writer (NC-P08-024/025, permanent-historical-read, retire never); `package.json`'s `solver:analyze-diagnostics`/`solver:legacy-latency-portfolio-report`/`solver:legacy-latency-portfolio-replay` aliases supersede their predecessors directly (NC-P08-026/059/061, temporary-command-alias, retire at this batch's own closeout — same treatment as batch 8F's `family:trove:doctor`) |
| Canonical mappings | Section 5.7/5.10 ("Audit export" -> "Solver diagnostics"; legacy-latency portfolio report/replay) of `naming-cleanup-plan.md` |
| Implementation agent/session | Claude Code remote session (this session) |
| Closeout auditor | same session (no fresh-session closeout was available; same limitation noted in batches 8A-8F) |

### Branch/PR authority preflight

- [x] searched open naming-cleanup PRs and similarly named branches — only this branch and `main` exist; PRs #1586-#1593 (8A-8F) are merged and closed, no other open naming-cleanup PR;
- [x] compared this branch against current `main` after the restart — `git checkout -B claude/naming-cleanup-plan-nzv395 origin/main` puts the branch exactly at `main`'s tip (`031defe3...`), plus one small commit recording the 8F merge barrier before this batch's implementation began;
- [x] recovered/superseded relevant commits — none needed;
- [x] confirmed this is the only active implementation batch — ledger `activeExecution.status` was `idle` with `batch: null` before this session started batch 8G, and `batchCompletions["8F"].status` was `merged` (PR #1593, commit `031defe3...`) before batch 8G's rows were touched;
- [x] confirmed the branch starts from the recorded current-`main` SHA above;
- [x] noted (see Reconciliation mode above) that unrelated Phase 9-14 preparation commits also landed since batch 8F's merge — reviewed both new docs and confirmed neither claims a Phase-8 row or conflicts with this batch's own row set; the new `check:level-metric-boundaries` validator required a mechanical file-rename update (Section 7), not a Phase-13 scope decision.

| Branch / PR | Unique relevant work? | Disposition |
| --- | --- | --- |
| `claude/naming-cleanup-plan-nzv395` (post-8F-merge state) | yes — this batch's implementation | active batch branch |

## 1. Scope, change envelope, and stop conditions

Batch 8G covers two independent tool families that happen to share a batch: (1) the former "audit export" tool/workflow/package-alias/generated-field identity, renamed to "solver diagnostics"; and (2) the legacy-latency portfolio comparison/replay tools and their package aliases, catching their filenames up to the `LEGACY_LATENCY_PORTFOLIO_EXPERIMENT` terminology the underlying module already uses.

### Change envelope

**Intended observable deltas**

- `scripts/run-audit-export.mjs` -> `scripts/analyze-solver-diagnostics.mjs` (NC-P08-023); every self-referential comment, console-log label, and internal scratch-file path (`logs/local-direct/.audit-export-tmp.json` -> `.solver-diagnostics-tmp.json`, not itself committed/historical) updated.
- `.github/workflows/audit-export.yml` -> `.github/workflows/solver-diagnostics.yml` (NC-P08-055); its `name:` (NC-P08-056), step names, and artifact name (`fullaudit-${{ github.sha }}` -> `solver-diagnostics-${{ github.sha }}`) updated. Verified (per `naming-cleanup-plan.md`'s own standing case-sensitivity-audit rule) that this workflow's `paths:` trigger already uses the correct lowercase `modules/solver.ts`/`modules/solver/**` — the plan's documented historical stale-case hazard example for this exact workflow is already resolved, not something this batch needed to fix.
- Generated fields `knownHardCluster` -> `hardClusterHeuristicMatch` and `recommendedGating` -> `derivedGatingCandidate` (NC-P08-024/025), renamed at their single point of definition (`deriveLevelFailureSignature`) and every downstream reference within the same file. **Consumer-audit finding, not assumed:** the function that derives and would write these fields, `_summarizeMetrics`, is dead code — underscore-prefixed and never called by this script's actual `run()` entry point, confirmed both by static reading and by `git log -p --follow` showing it has been underscore-prefixed (unused) since it was first introduced. A full-repo search (Section 2) confirms **zero** of the 200 committed `logs/solver-workflow/*.json` reports contain either the legacy or canonical field name — this specific compatibility boundary has no live historical data to protect today. The rename was still made exactly as authorized (dead code is still source code the naming-cleanup plan covers), and the dual-read framing is preserved as a documented defensive policy for if/when this code path is ever wired in, matching the row's own `retireWhen: never`.
- npm alias `audit:newhint:full` -> `solver:analyze-diagnostics` (NC-P08-026).
- `scripts/portfolio-scheduler-report.mjs` -> `scripts/legacy-latency-portfolio-report.mjs` (NC-P08-058); npm alias `solver:portfolio-report` -> `solver:legacy-latency-portfolio-report` (NC-P08-059).
- `scripts/portfolio-historical-replay.mjs` -> `scripts/legacy-latency-portfolio-replay.mjs` (NC-P08-060); npm alias `solver:portfolio-replay` -> `solver:legacy-latency-portfolio-replay` (NC-P08-061).
- Scope-discovery companion rename (same class as batch 8F's `family-trove-doctor-node-test.mjs` treatment): `scripts/portfolio-scheduler-report-cli-node-test.mjs` -> `scripts/legacy-latency-portfolio-report-cli-node-test.mjs`, and its npm alias `test:portfolio-scheduler-report-cli` -> `test:legacy-latency-portfolio-report-cli` (including the `test:node` aggregate line).
- Cross-references updated in `scripts/check-audit-artifacts.mjs`, `scripts/run-solverv2-direct.mjs`, `scripts/naming-cleanup-phase8-cli-smoke-node-test.mjs`, `.github/workflows/README.md`, `docs/tooling-catalog.md`, `docs/solver-architecture.md`, and `logs/artifact-metadata.json` (its live `current-pointer` entry for `logs/solver-workflow/latest.json`; its `historical-snapshot` entry deliberately left pointing at the old tool name, see Section 4).
- Mechanical update to `docs/naming-cleanup-level-metric-boundaries.json` (a Phase-13 prep baseline, unrelated to this batch's own scope, that landed on `main` between batch 8F and this batch): removed the two stale `portfolio-scheduler-report*` entries and added the two renamed files at the same classification, keeping the now-live `check:level-metric-boundaries` gate passing without making any Phase-13 semantic decision.

**Invariant observables**

- `analyze-solver-diagnostics.mjs`'s active code path (`run()`, `normalizeAuditPayload`, `convertDirectToRawPayload`, `mapDirectLevelToAuditLevel`) is completely unchanged; verified by a real full 160-published-level execution producing the identical `160 solved, 0 failed, 0 errors` result and a correctly-shaped `logs/solver-workflow/latest.json`.
- `legacy-latency-portfolio-report.mjs`'s pass/fallback/runtime-breakdown logic is unchanged; verified by real execution against 3 published levels (identical pass1 solves as the pre-rename tool's own contract).
- `legacy-latency-portfolio-replay.mjs`'s tiered-recovery replay logic is unchanged; verified by real execution.
- The workflow's job structure, triggers, and permissions are unchanged — only display/artifact identity strings were edited; the YAML re-parses cleanly post-edit.
- No solver search behavior, work allocation, or corpus content changed anywhere in this batch.

**Out of scope / separate authorization**

- `docs/naming-cleanup-future-phase-preparation.md` (Phase 9-14 research-handoff audit) and `docs/naming-cleanup-level-metric-boundaries.json`'s own Phase-13 classification decisions were **not** edited beyond the mechanical file-rename sync described above. Both documents explicitly scope themselves as point-in-time snapshots ("Audit base: `30cff381`... re-run delta reconciliation when each batch starts") for phases this stream has not yet reached; keeping their prose/classification narrative current is that future phase's own job, not this batch's.
- `docs/naming-cleanup-process-hardening.md`'s own historical process-decision entries describing this exact compatibility boundary's intended design were **not** edited — same treatment as every prior batch (8A-8F): a dated process-authority record documenting intent, not live documentation.
- `reports/portfolio/README.md` and every dated report referencing `solver:portfolio-report`/`portfolio-scheduler-report.mjs`/`portfolio-historical-replay.mjs` (`reports/portfolio/2026-07-16-portfolio-scheduler-reverification.md`, `reports/2026-08-24-scheduler-evidence-contract-audit.md`, `reports/2026-08-06-workbudget-starvation-audit.md`) were **not** edited: these narrate exact historical commands/results as they were actually run, and rewriting them would misrepresent what was literally typed at the time — same "do not rename historical report filenames/commands" treatment applied throughout this naming-cleanup effort.
- `.solver-tools/*.bundle.mjs` (gitignored build cache) was not touched; it regenerates automatically.
- `logs/local-direct/.audit-export-tmp.json` (a pre-existing, already-committed scratch/checkpoint file, unrelated to any row and not produced by the actual `solver-diagnostics.yml` workflow's own `git add` pattern) was left in place rather than renamed or deleted: cleaning up orphaned debris is outside a naming-cleanup batch's behavior-preserving-rename mandate. The tool's own scratch-file *write path* was updated going forward (Section 6).

No behavior/resource-policy change, ambiguous historical identity, unowned compatibility boundary, or unidentifiable live consumer was discovered beyond the documented items above. No stop condition was triggered.

## 2. Pre-edit impact map

Commands run:

```sh
npm run naming:status
find . -iname "*audit-export*" -o -iname "*run-audit-export*" -o -iname "*portfolio-scheduler-report*" -o -iname "*portfolio-historical-replay*"
grep -rln "knownHardCluster" . ; grep -rln "recommendedGating" .
grep -n "audit:newhint:full" package.json ; grep -n "solver:portfolio-report\|solver:portfolio-replay" package.json
grep -l "knownHardCluster\|hardClusterHeuristicMatch" logs/solver-workflow/*.json   # 0 of 200 files
```

`npm run naming:status` confirmed Phase 8 gate `ready`, `activeExecution.status: idle`, `batchCompletions["8F"].status: merged`, and batch 8G next with all 10 rows `verification.surfaceInventory: done` already and every other verification dimension `pending`.

Before renaming the generated-field pair, traced `deriveLevelFailureSignature`'s only caller (`_summarizeMetrics`) and confirmed via `git log -p --follow -- scripts/run-audit-export.mjs` that it has been underscore-prefixed (dead code, never called by `run()`) since its introduction — this is what drove the "consumer-audit finding, not assumed" note in Section 1, made *before* deciding the dual-read implementation shape.

### Target occupancy / collision check

| Canonical target | Existing live use? | Same concept / unrelated / collision / already migrated | Disposition |
| --- | --- | --- | --- |
| `scripts/analyze-solver-diagnostics.mjs` | no | n/a | clear |
| `.github/workflows/solver-diagnostics.yml` | no | n/a | clear |
| npm `solver:analyze-diagnostics` | no | n/a | clear |
| `scripts/legacy-latency-portfolio-report.mjs` | no | n/a | clear |
| npm `solver:legacy-latency-portfolio-report` | no | n/a | clear |
| `scripts/legacy-latency-portfolio-replay.mjs` | no | n/a | clear |
| npm `solver:legacy-latency-portfolio-replay` | no | n/a | clear |
| `hardClusterHeuristicMatch` / `derivedGatingCandidate` (generated fields) | no | n/a | clear |

No canonical target was occupied by a materially different live concept.

### Contract-migration matrix

| Surface | Classification | Concrete locations | Evidence / planned test |
| --- | --- | --- | --- |
| Definition / producer | migrate | `run-audit-export.mjs`, `audit-export.yml`, `portfolio-scheduler-report.mjs`, `portfolio-historical-replay.mjs` | `git mv` + content edits, see Section 6 |
| Internal direct consumers | migrate | `package.json` (3 aliases + `test:node` line), `scripts/check-audit-artifacts.mjs`, `scripts/run-solverv2-direct.mjs`, `scripts/naming-cleanup-phase8-cli-smoke-node-test.mjs`, `logs/artifact-metadata.json`, `docs/naming-cleanup-level-metric-boundaries.json` | grep-verified zero residue outside frozen/dated-report/historical-snapshot exclusions (Section 10) |
| Canonical parser / normalizer | not applicable | none | n/a |
| Sequential transport | not applicable | `analyze-solver-diagnostics.mjs` spawns `run-solverv2-direct.mjs` via `execFileSync`, unchanged | n/a |
| Alternate worker/race transport | not applicable | none | n/a |
| Serialized writer | migrate (generated fields), with a documented dead-code caveat | `deriveLevelFailureSignature`'s two field names; `_summarizeMetrics` (the only caller) is unreachable from `run()` | real full-corpus execution confirms the reachable code path (`normalizeAuditPayload`/`convertDirectToRawPayload`) is unaffected; the renamed dead code was inspected, not executed (nothing invokes it) |
| Historical reader / fixture | retained/frozen | 200 committed `logs/solver-workflow/*.json` files (confirmed to contain neither field name); `logs/artifact-metadata.json`'s `historical-snapshot` entry (generator left as the old tool name) | left unchanged, confirmed by reconciliation grep |
| Report/export projection | not applicable | `_summarizeMetrics`'s output shape is unreachable; the reachable `run()` path emits the raw per-level payload only | n/a |
| Analyzer/grouping consumers | not applicable | none consume `knownHardCluster`/`recommendedGating` (Section 2's grep) | n/a |
| CLI / package alias | migrate | `audit:newhint:full` -> `solver:analyze-diagnostics`; `solver:portfolio-report` -> `solver:legacy-latency-portfolio-report`; `solver:portfolio-replay` -> `solver:legacy-latency-portfolio-replay`; `test:portfolio-scheduler-report-cli` -> `test:legacy-latency-portfolio-report-cli` (scope discovery) | `npm run naming:status`, real CLI invocations (Section 7) |
| Workflow command/inputs/outputs | migrate | `.github/workflows/solver-diagnostics.yml`'s `name`/step names/artifact name | YAML re-parses; `check-workflow-actions.mjs` passes (Section 7) |
| Artifact/concurrency/cache/path identifiers | migrate | artifact name `fullaudit-*` -> `solver-diagnostics-*` (no concurrency group in this workflow) | same evidence |
| Hint/provenance storage | not applicable | none of these rows touch hint provenance storage | n/a |
| Application/UI/editor consumer | not applicable | none of these tools are UI-consumed | n/a |
| Current docs/examples | migrate | `.github/workflows/README.md`, `docs/tooling-catalog.md`, `docs/solver-architecture.md` | grep-verified (Section 10); dated `reports/portfolio/**` and `reports/2026-*` deliberately left unchanged (Section 1) |
| Frozen historical evidence | retained/frozen | dated `reports/portfolio/**`, dated `reports/2026-*`, `docs/naming-cleanup-process-hardening.md`, `logs/solver-workflow/*.json` | unchanged; confirmed no mass rewrite |
| Out-of-batch validator sync | mechanical update only | `docs/naming-cleanup-level-metric-boundaries.json` (Phase-13 prep, unrelated scope) | `check:level-metric-boundaries` passes after a pure file-rename sync, no classification judgment made |

## 3. Validation topology

| Surface | Real runtime/path | Existing coverage | Coverage class | Gap/action |
| --- | --- | --- | --- | --- |
| `analyze-solver-diagnostics.mjs` | native Node, spawns the real solver via `run-solverv2-direct.mjs` | no dedicated node-test (unchanged; a full run needs all 160 published levels) | structural/manual | ran a **real full 160-level execution** in this session: `160 solved, 0 failed, 0 errors`, correctly-shaped `logs/solver-workflow/latest.json` and timestamped snapshot; test-run outputs reverted/deleted before commit (Section 6) |
| generated field rename (`hardClusterHeuristicMatch`/`derivedGatingCandidate`) | dead code, unreachable from `run()` | none (unreachable) | n/a (dead code) | inspected via static read + git history; documented explicitly rather than silently assumed live (Section 1/2) |
| `.github/workflows/solver-diagnostics.yml` | GitHub Actions workflow | `check-workflow-actions.mjs` (structural) | structural | passes; full GHA dispatch out of scope for local validation (unchanged from pre-batch coverage) |
| `legacy-latency-portfolio-report.mjs` | native/bundled Node, has a dedicated node-test | `legacy-latency-portfolio-report-cli-node-test.mjs` | **direct** | test passes post-rename; additionally ran a **real execution** against 3 published levels (pos:1-3), confirming pass/fallback classification and runtime breakdown |
| `legacy-latency-portfolio-replay.mjs` | native/bundled Node, exercised indirectly | `naming-cleanup-phase8-cli-smoke-node-test.mjs` (empty-corpus smoke) | structural | smoke test passes post-rename; additionally ran a **real execution** replaying the 3-level report above |
| `check:level-metric-boundaries` (unrelated Phase-13 gate, newly live) | native Node | `scripts/audit-level-metric-boundaries.mjs` | structural | initially failed (stale/unclassified entries after the rename); fixed with a pure file-rename sync, re-verified passing |

## 4. Compatibility and frozen-history ownership

Four rows in this batch are `persistence: dual-read` with a `compatibility` object.

| Row ID | Legacy form | Canonical form | Mode / retireWhen | Owning boundary | Frozen artifacts unchanged |
| --- | --- | --- | --- | --- | --- |
| NC-P08-023 | `run-audit-export.mjs` | `analyze-solver-diagnostics.mjs` | n/a (direct rename) | n/a | yes |
| NC-P08-024 | `knownHardCluster` | `hardClusterHeuristicMatch` | `permanent-historical-read`, retire never | solver-diagnostics generated-report normalizer | yes, vacuously — **no committed report ever contained either name** (Section 1/2 finding); the permanent-dual-read policy is preserved as documented defensive intent for this dead code path, not because live data depends on it today |
| NC-P08-025 | `recommendedGating` | `derivedGatingCandidate` | `permanent-historical-read`, retire never | same boundary | same as above |
| NC-P08-026 | `audit:newhint:full` | `solver:analyze-diagnostics` | `temporary-command-alias`, retire at owning-batch-closeout | `package.json` compatibility alias | **retired in this same batch** — same treatment as batch 8F's `family:trove:doctor`: a local npm alias name is not an external persisted config surface, so the old alias is removed directly here |
| NC-P08-055 | `.github/workflows/audit-export.yml` | `.github/workflows/solver-diagnostics.yml` | `frozen-history` persistence | n/a | yes — past GHA runs under the old filename/display name are untouched |
| NC-P08-056 | workflow display "Audit Export" | "Solver diagnostics and hint capture" | `frozen-history` persistence | n/a | yes |
| NC-P08-058 | `portfolio-scheduler-report.mjs` | `legacy-latency-portfolio-report.mjs` | n/a (direct rename) | n/a | yes — its non-committed default `--out` path was renamed alongside it (Section 6) |
| NC-P08-059 | `solver:portfolio-report` | `solver:legacy-latency-portfolio-report` | `temporary-command-alias`, retire at owning-batch-closeout | `package.json` compatibility alias | **retired in this same batch**, same reasoning as NC-P08-026 |
| NC-P08-060 | `portfolio-historical-replay.mjs` | `legacy-latency-portfolio-replay.mjs` | n/a (direct rename) | n/a | yes |
| NC-P08-061 | `solver:portfolio-replay` | `solver:legacy-latency-portfolio-replay` | `temporary-command-alias`, retire at owning-batch-closeout | `package.json` compatibility alias | **retired in this same batch**, same reasoning as NC-P08-026 |

### 4.1 High-risk rollback plan

No row in this batch is `risk: high`. The generated-field rename (NC-P08-024/025) is the most structurally sensitive: because the only writer of these fields is unreachable dead code, a straight revert of this batch's commits is trivially safe (nothing in production ever depended on either spelling). If the dead code is ever wired into `run()` in the future, the permanent dual-read policy documented here (and in `naming-cleanup-plan.md`) still applies to whoever does that work. The three retired temporary aliases (NC-P08-026/059/061) can be restored by reverting the `package.json` hunk alone if a contributor is found to depend on the old alias name post-merge; no persisted data or generated artifact depends on the alias name itself.

## 5. Before-change baseline

This batch is `medium` risk at most and behavior-preserving by construction (renames/comment/display-string edits, plus one field rename confirmed to be dead code). Baselines captured:

| Command / fixture | Before result / fingerprint |
| --- | --- |
| `node scripts/run-audit-export.mjs` (pre-rename, full 160-level run) | `160 solved, 0 failed, 0 errors / 160 total`; writes `logs/solver-workflow/latest.json` + a timestamped snapshot |
| `node scripts/run-bundled.mjs scripts/portfolio-scheduler-report.mjs -- --corpus=data/levels.json --levels=pos:1-3 --budget-ms=10000` (pre-rename) | legacy=3/3, portfolio-before-fallback=3, all pass1 |
| `node scripts/legacy-latency-portfolio-report-cli-node-test.mjs` (formerly `portfolio-scheduler-report-cli-node-test.mjs`) pre-edit | passed before this batch |
| `node scripts/audit-level-metric-boundaries.mjs` pre-edit | passed before this batch (baseline still referenced the old portfolio-scheduler-report filenames) |

Post-rename, the diagnostics tool was re-run for real and produced the **identical** `160 solved, 0 failed, 0 errors` result; the portfolio report tool was re-run for real and produced the **identical** 3/3 pass1 result — directly proving the reachable logic is unchanged. Test-run outputs (`logs/solver-workflow/latest.json`, a new timestamped snapshot, `.solver-diagnostics-tmp.json`) were reverted/deleted before committing, since a naming-cleanup batch should not incidentally commit a fresh audit run.

## 6. Implementation log

- Renamed 2 scripts + 1 workflow for the diagnostics tool family, and 2 scripts + 1 companion node-test for the portfolio tool family (`git mv`); updated every header comment, usage example, and self-referential string inside each.
- `analyze-solver-diagnostics.mjs`: renamed `signature.knownHardCluster`/`signature.recommendedGating` -> `signature.hardClusterHeuristicMatch`/`signature.derivedGatingCandidate` and every downstream reference in `_summarizeMetrics` (dead code, see Section 1); added a comment documenting the permanent dual-read/single-write contract for any future reader; renamed the scratch-file write path and every console-log/self-reference from "audit-export"/"Audit export" to "solver-diagnostics"/"Solver diagnostics".
- `.github/workflows/solver-diagnostics.yml`: renamed `name`, step names ("Run full SolverV2 audit export" -> "...diagnostics analysis", "Upload full audit artifact" -> "...diagnostics artifact"), the `npm run` invocation, and the artifact name; verified the `paths:` trigger case-sensitivity hazard the plan flagged for this exact workflow is already resolved (lowercase `modules/solver.ts`).
- `legacy-latency-portfolio-report.mjs` / `legacy-latency-portfolio-replay.mjs`: renamed default `--out` paths, usage examples, and self-referential console-log/error strings; both already imported `LEGACY_LATENCY_PORTFOLIO_EXPERIMENT` internally, so this rename mostly catches the filename/alias up to already-canonical internal terminology.
- Renamed and updated `legacy-latency-portfolio-report-cli-node-test.mjs` (formerly `portfolio-scheduler-report-cli-node-test.mjs`): script-path reference, temp-dir prefix, and console-log self-reference.
- `package.json`: renamed 3 npm aliases (`audit:newhint:full`, `solver:portfolio-report`, `solver:portfolio-replay`) and 1 companion test alias; updated the `test:node` aggregate line's reference.
- Updated cross-references in `scripts/check-audit-artifacts.mjs` (comment), `scripts/run-solverv2-direct.mjs` (comment), `scripts/naming-cleanup-phase8-cli-smoke-node-test.mjs` (2 script-path invocations), `.github/workflows/README.md`, `docs/tooling-catalog.md`, `docs/solver-architecture.md` (2 locations), and `logs/artifact-metadata.json` (the live `current-pointer` entry's `generator`/`regenerationCommand`; the `historical-snapshot` entry deliberately left at the old tool name, Section 4).
- Mechanically updated `docs/naming-cleanup-level-metric-boundaries.json`: removed 2 stale entries, added 2 renamed entries at the same classification and alphabetical position, to keep the (unrelated, newly-landed) `check:level-metric-boundaries` gate passing.
- Updated `docs/naming-cleanup-plan.md`'s Section 5.7/5.10/Section-3-invariants for this batch's own rows (old names de-backticked/prefixed "former", new names promoted from bold to backtick; the case-sensitivity-hazard example paragraph updated to record its resolution and de-backticked the illustrative stale-case path so `check:documentation-links`'s source-path existence check does not misread it as a live doc claim).

## 7. Targeted contract validation

| Command / test | Boundary proved | Result |
| --- | --- | --- |
| `npx tsc --noEmit` (main + test configs) | no TypeScript regressions | pass |
| `npx eslint <all touched .mjs files>` | lint over every edited script | pass, 0 findings |
| YAML re-parse of `solver-diagnostics.yml` | edited workflow YAML remains well-formed | pass |
| `node scripts/legacy-latency-portfolio-report-cli-node-test.mjs` | dedicated regression test for the portfolio-winner projection | pass |
| `node scripts/analyze-solver-diagnostics.mjs` (real, full 160-level run) | real execution: identical `160 solved, 0 failed, 0 errors`; correctly-shaped `logs/solver-workflow/latest.json` | pass; test-run outputs reverted before commit |
| `node scripts/run-bundled.mjs scripts/legacy-latency-portfolio-report.mjs -- --corpus=data/levels.json --levels=pos:1-3 --budget-ms=10000` | real execution: 3/3 legacy and portfolio pass1 solves | pass |
| `node scripts/run-bundled.mjs scripts/legacy-latency-portfolio-replay.mjs -- --inputs=<the report above>` | real execution: replay against real report data | pass |
| `node scripts/check-audit-artifacts.mjs` | artifact-metadata + audit-artifact policy checks | pass |
| `node scripts/check-workflow-actions.mjs` | workflow action pins, literal path filters, and local entrypoints (including the renamed workflow file) are still valid | pass |
| `node scripts/check-documentation-links.mjs` | every link/path/bare-alias/source-path in current docs resolves to a real, live target | pass, 1345 Markdown files (after de-backticking the retired `audit:newhint:full` alias and the illustrative stale-case `modules/Solver.ts` example in `naming-cleanup-plan.md`, Section 10) |
| `node scripts/audit-level-metric-boundaries.mjs` | the unrelated, newly-landed Phase-13 prep gate stays in sync with actual file names | initially failed (2 stale + 2 unclassified entries); fixed with a pure rename sync; re-verified passing |
| `node scripts/naming-cleanup-surface-inventory-node-test.mjs` | Phase 8-14 surface-inventory classification stays internally consistent | pass; batch 8G rows report the expected steady-state classifications (`canonical-live` for the portfolio tools/aliases and the "Audit Export" term; `mixed-old-and-canonical` for the workflow filename and the two generated fields, matching the plan's own "former X" mapping-table notation and the field pair's documented permanent-dual-read policy) |
| `npm run check` (dead-scripts, text-source-files, lint, all `check:validators`) | full repository check suite | pass, exit 0 |
| `npm run test:node` | full 53-script aggregate Node-test graph | pass, 53/53 (including the renamed `test:legacy-latency-portfolio-report-cli`) |
| `npx vitest run --coverage` | full unit suite unaffected by this batch's edits | pass, 108 files / 1336 tests (file/test counts higher than batch 8F's baseline due to the unrelated Phase 9-14 prep commits that landed in between) |

## 8. Consumer-inward closeout audit

Same-session audit (no separate fresh agent was available in this environment, same limitation noted in batches 8A-8F).

- package commands and surfaced CLIs: all 4 renamed/retired aliases grep-confirmed to have no other `package.json` entry or CI step still referencing the old names.
- workers/raced execution: not applicable — `analyze-solver-diagnostics.mjs` spawns `run-solverv2-direct.mjs` via `execFileSync`, exercised for real in Section 7; the portfolio tools call the solver directly in-process, also exercised for real.
- workflows and exact-case targets: `check-workflow-actions.mjs` passes; the renamed workflow file re-parses as valid YAML; its `paths:` trigger case-sensitivity was specifically re-verified against the plan's own documented historical hazard for this exact file (already correct).
- generated-data readers/writers/analyzers: a full-repo search confirmed zero committed `logs/solver-workflow/*.json` report contains either the legacy or canonical generated-field name (Section 1/2) — the compatibility boundary is defensive/forward-looking, not protecting live data; `logs/artifact-metadata.json`'s live pointer entry updated, its historical-snapshot entry deliberately left alone.
- current docs/reproduction commands: `check:documentation-links` passes; `.github/workflows/README.md`, `docs/tooling-catalog.md`, and `docs/solver-architecture.md` cross-references grep-verified updated; dated reports under `reports/portfolio/**` and `reports/2026-*` deliberately left narrating their original historical commands.
- application/UI/editor consumer: not applicable, none of these are UI-consumed.
- historical compatibility paths: `docs/naming-cleanup-process-hardening.md`'s historical decision entries, `docs/naming-cleanup-future-phase-preparation.md`'s Phase 9-14 handoff audit, and 200 committed `logs/solver-workflow/*.json` files were grepped/considered and confirmed untouched. The unrelated, newly-landed `docs/naming-cleanup-level-metric-boundaries.json` (Phase-13 prep) received a mechanical rename-sync only, not a scope-expanding edit.

Findings: none outstanding within this batch's scope. Two items explicitly deferred/out of scope, recorded in Section 1: the orphaned pre-existing `.audit-export-tmp.json` scratch file, and any narrative/classification updates to the two unrelated Phase 9-14 preparation documents beyond the mechanical file-rename sync one of them required.

## 9. Behavioral/evidence parity

| Observable | Before | After | Parity |
| --- | --- | --- | --- |
| `analyze-solver-diagnostics.mjs` full 160-level execution | `160 solved, 0 failed, 0 errors` (pre-rename tool) | **identical** `160 solved, 0 failed, 0 errors` | parity — confirmed by direct re-execution |
| `legacy-latency-portfolio-report.mjs` 3-level execution | legacy=3/3, portfolio-before-fallback=3, all pass1 (pre-rename tool's own contract) | **identical** result | parity |
| generated field rename | dead code, never executed | still dead code, never executed; renamed identifiers only | parity — no reachable behavior exists to regress |
| `check-workflow-actions.mjs` / `check-audit-artifacts.mjs` | pass pre-batch | pass post-batch | parity |
| full unit/coverage suite | 105 files / 1325 tests passing at batch 8F's baseline | 108 files / 1336 tests passing post-batch (delta from unrelated Phase 9-14 prep commits, not this batch) | parity for this batch's own scope |

No unexplained solved-set, report-completeness, UI, or workflow behavior change.

## 10. Residue and authority reconciliation

- Reconciliation mode: delta, against base SHA `031defe35abf90e3929632b939c5cce10d8ae913` (current `main` immediately after batch 8F's merge), with the unrelated Phase 9-14 prep commits noted and reviewed (Section 0/1) rather than silently ignored.
- Target-occupancy: see Section 2 — clear for every canonical target in this batch.
- Legacy-term residue search (excluding `node_modules/`, `.git/`, `reports/`, `docs/archive/`, `.solver-tools/`): case-insensitive sweep for `audit-export`, `Audit Export`, `run-audit-export`, `audit:newhint`, `portfolio-scheduler-report`, `portfolio-historical-replay`, `solver:portfolio-report`, `solver:portfolio-replay`, `knownHardCluster`, `recommendedGating` — run both before and after implementation. Every remaining post-implementation hit is one of: (a) `docs/naming-cleanup-plan.md`'s own historical mapping-table records, (b) `logs/artifact-metadata.json`'s deliberately-retained `historical-snapshot` entry, or (c) dated `reports/**` narrating exact historical commands (frozen).
- `npm run check:documentation-links` initially failed on 2 issues: the retired `audit:newhint:full` alias still backtick-wrapped in `naming-cleanup-plan.md` (de-backticked, same "former X" pattern as every prior batch's retired aliases), and an illustrative stale-case `modules/Solver.ts` path example (added while updating the case-sensitivity-hazard paragraph) that the checker's source-path-existence rule misread as a live documented source path (de-backticked, since it is a historical illustration, not a current doc claim). Re-ran clean.
- `node scripts/audit-level-metric-boundaries.mjs` (the unrelated, newly-landed Phase-13 prep gate) initially failed on the renamed portfolio-report files; fixed with a pure rename-sync (Section 6), not a classification decision — re-verified passing.
- Canonical-term search: confirmed present in every intended consumer (Section 6).
- Post-implementation `node scripts/naming-cleanup-surface-inventory-node-test.mjs`: passes; batch 8G's rows report the expected steady-state classifications (Section 7).
- Plan/ledger changes from newly discovered scope: none required a specification amendment. The dead-code finding for the generated-field pair (Section 1/2) sharpens the *evidence* behind the existing `permanent-historical-read`/`retire: never` policy without changing it; no canonical target, compatibility lifetime, risk class, or batch assignment changed.
- Intentional retained/frozen hits: `docs/naming-cleanup-process-hardening.md`, dated `reports/portfolio/**` and `reports/2026-*`, 200 committed `logs/solver-workflow/*.json` files, `logs/artifact-metadata.json`'s historical-snapshot entry, the orphaned `.audit-export-tmp.json` scratch file, and the two unrelated Phase 9-14 prep documents (all documented above).

No unclassified live hit remains in this batch's scope.

## 11. Pre-merge barrier

- [x] predecessor batch 8F's `batchCompletions` entry recorded the real merged PR/commit (PR #1593, `031defe35abf90e3929632b939c5cce10d8ae913`) before this batch was claimed;
- [x] branch is current `main` (post-8F-merge, including the unrelated Phase 9-14 prep commits) plus only this batch's commits;
- [x] compared branch head against current `main` — clean, no drift;
- [x] intended diff is non-empty and original (no prior duplicate PR found);
- [x] no unrelated next-batch (8H+) implementation is stacked in this PR, and no Phase 9-14 implementation was smuggled in either — only a mechanical rename-sync to keep an unrelated, already-landed validator passing;
- [x] targeted validation green (Section 7);
- [x] required aggregate CI: `npx tsc --noEmit`, `npm run check`, `npm run test:node`, and the full Vitest suite with coverage were all run directly in this session and are green;
- [x] ledger IDs, risk, compatibility policy, and verification fields (updated in the same PR) match the evidence in this record;
- [x] all predecessor phases (1-7) are complete; batches 8A-8F are merged;
- [x] no specification amendment is smuggled into this PR — all edits implement the already-fixed Section 5.7/5.10 mappings, plus the documented scope exclusions (Section 1) and the unrelated-validator mechanical sync, not a change to any canonical target, compatibility lifetime, risk class, or batch assignment;
- [ ] PR description links this record — pending PR creation;
- [x] no unexplained solved-set, report-completeness, UI, or workflow behavior change (Section 9);
- [x] all 10 selected rows are `done` and `activeExecution` is reset to `idle` in this same commit set before merge;
- [x] this batch's own `batchCompletions["8G"]` entry remains `pending` (no PR/merge commit exists yet) until it actually merges.

## 12. Closure and merge handoff

| Item | Value |
| --- | --- |
| PR | pending |
| Final head SHA | pending (recorded at push time) |
| Merged? | no |
| Ledger rows closed | NC-P08-023, NC-P08-024, NC-P08-025, NC-P08-026, NC-P08-055, NC-P08-056, NC-P08-058, NC-P08-059, NC-P08-060, NC-P08-061 |
| Deferred/superseded rows | none deferred; the orphaned scratch-file and unrelated Phase 9-14 prep-doc exclusions are documented in-batch scope decisions, not deferred ledger rows |
| Known structural-only surfaces | `solver-diagnostics.yml`'s full GHA dispatch remains structurally-validated-only (workflow lint/contract checks), matching its pre-batch coverage class; the generated-field rename remains untested-by-execution because its only caller is dead code (documented, not silently assumed safe) |

Batch 8H (remaining low-risk semantic qualification sweep and Phase-8-wide closeout) must not start on this unmerged branch. The next batch's session must start from new current `main` after this PR merges, record this batch's merged PR/commit in ledger `batchCompletions["8G"]`, and only then claim 8H.


## Post-closeout compatibility-accounting correction

A later Phases 8-14 forensic audit found that this record's NC-P08-024/025
"permanent dual-read" conclusion over-interpreted its own evidence. Sections above already establish
that the generating path is dead, no consumer reads either field, and **zero** committed
`logs/solver-workflow/*.json` artifacts ever contained either the retired or canonical spelling.
That means there is no historical representation to read and no compatibility boundary to own.

The authoritative plan/ledger are therefore corrected to classify NC-P08-024/025 as direct
current-source renames with `persistence: none`. The Phase-8 closeout coverage changes from a
compatibility exemption to literal retired-field rejection, and the explanatory source comment no
longer embeds the retired spellings. This does not rewrite the original execution narrative above;
it records why its "vacuous permanent reader" interpretation is superseded.

The correction also fixes an evidence-model defect: the old closeout scanner counted raw source
lines and could report an allowlisted explanatory comment as a "retained compatibility read."
Compatibility claims must be proven by an executable reader/fixture, not by lexical presence.

The correction was implemented in PR #1633 on final head
`208dc417597dc9a94f043caf5c8a0412a52418bc`. Ordinary CI run `33446596466` and the
Phase-11 orientation/Chromium gate `33446596279` both completed successfully before merge.
The PR merged as `bae742f3b2e5affc98328fa1e622b6f7698f399d`.

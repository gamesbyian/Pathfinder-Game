# Naming-cleanup Phase 8 batch 8B execution record

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 8 |
| Batch | 8B |
| Status | closeout |
| Base `main` SHA | `417da078cd80be52ed0f152bdeb8fe707e1e9c35` (merge commit of batch 8A's PR #1586) |
| Branch | `claude/naming-cleanup-plan-nzv395` (restarted from new `main` after batch 8A merged) |
| PR | pending (not yet opened) |
| Selected ledger row IDs | NC-P08-001, NC-P08-002, NC-P08-003, NC-P08-004, NC-P08-005, NC-P08-006, NC-P08-010, NC-P08-029, NC-P08-030, NC-P08-031, NC-P08-032 |
| Reconciliation mode | delta (single-batch implementation session immediately following batch 8A's merge; no unrelated Phase 8-14 architecture landed on `main` in between) |
| Highest risk in batch | medium (all 11 rows; NC-P08-030/032 are `dual-read`/`temporary-command-alias` package aliases) |
| Primary compatibility owner | `package.json` compatibility alias (both dual-read rows share this owner) |
| Canonical mappings | see Section 4.11 (known-solution-prefix survival family), 5.5/5.9 (surfaced pilot -> collector renames) of `naming-cleanup-plan.md` |
| Implementation agent/session | Claude Code remote session (this session) |
| Closeout auditor | same session (no fresh-session closeout was available; see Section 8 note, same limitation as batch 8A) |

### Branch/PR authority preflight

- [x] searched open naming-cleanup PRs and similarly named branches — only this branch and `main` exist; PR #1586 (batch 8A) is merged and closed, no other open naming-cleanup PR;
- [x] compared this branch against current `main` after the restart — `git checkout -B claude/naming-cleanup-plan-nzv395 origin/main` puts the branch exactly at `main`'s tip (`417da078...`), plus one small commit recording the 8A merge barrier before this batch's implementation began;
- [x] recovered/superseded relevant commits — none needed;
- [x] confirmed this is the only active implementation batch — ledger `activeExecution.status` was `idle` with `batch: null` before this session started batch 8B, and `batchCompletions["8A"].status` was `merged` (PR #1586, commit `417da078...`) before batch 8B's rows were touched, satisfying the Section 0.3 rule 8/11 merge barrier;
- [x] confirmed the branch starts from the recorded current-`main` SHA above.

| Branch / PR | Unique relevant work? | Disposition |
| --- | --- | --- |
| `claude/naming-cleanup-plan-nzv395` (post-8A-merge state) | yes — this batch's implementation | active batch branch |

## 1. Scope, change envelope, and stop conditions

Batch 8B covers the known-solution-prefix survival family: the current lineage-observation doc/module/types/analyzer, and the former winning-lineage/winning-prefix-atlas surfaced collectors and their package aliases, per `docs/naming-cleanup-phase-records/phase-08.md`'s 8B scope row.

### Change envelope

**Intended observable deltas**

- `docs/solver-winning-lineage-survival-analysis.md` -> `docs/solver-known-solution-prefix-survival.md`; the renamed doc's own title/self-description text moves from "winning-lineage" to "known-solution-prefix survival" language, and its one residual `receptor`->`consumer` occurrence (missed by batch 8A's case-sensitive grep — see Section 10) is fixed in the same edit (NC-P08-001, NC-P08-010).
- `scripts/analyze-lineage-mechanics.mjs` -> `scripts/analyze-known-solution-prefix-survival.mjs`; its `--lineage` CLI flag and internal `lineage*` variable/field names move to `--survival`/`survival*` (same-file scope discovery of the row's own concept, no new canonical target); its CLI node-test is renamed and updated to match (NC-P08-002).
- `modules/solver/research-lineage.ts` -> `modules/solver/known-solution-prefix-survival.ts` (+ its `.test.ts`); `WinningPrefixIndex` -> `KnownSolutionPrefixIndex`; `WinningLineageObserver` -> `KnownSolutionPrefixSurvivalObserver`; `LineageStageSummary` -> `KnownSolutionPrefixStageSummary`; `modules/solver/testing-api.ts`'s import and its `SOLVER_TESTING_API` object's shorthand properties (a genuinely consumed external-tooling surface, per that file's own doc comment) migrate together in the same commit (NC-P08-003, NC-P08-004, NC-P08-005, NC-P08-006).
- `scripts/stress/winning-lineage-pilot.mjs` -> `scripts/stress/collect-known-solution-prefix-survival.mjs`; its default output path, default run-id prefix, header comment, `technique` description string, and internal `lineage`/`row.lineage` field (produced and consumed only within this same script — confirmed no other reader, see Section 2) move to `survival`/`row.survival`; its CLI node-test is renamed and updated to match; npm alias `solver:winning-lineage-pilot` -> `solver:collect-known-solution-prefix-survival` (NC-P08-029, NC-P08-030).
- `scripts/stress/winning-prefix-atlas-pilot.mjs` -> `scripts/stress/collect-known-solution-prefix-branches.mjs`; its header comment and default output path move to match; npm alias `solver:winning-prefix-atlas-pilot` -> `solver:collect-known-solution-prefix-branches` (NC-P08-031, NC-P08-032).
- Term-level propagation of the fixed `winning lineage` -> `known-solution-prefix survival` mapping into every other current (non-frozen, non-authority-doc) surface discovered during the residue sweep: `scripts/tooling-lifecycle.json`'s note for `winning-path-archaeology.mjs`, `scripts/stress/winning-path-archaeology.mjs`'s own two doc-path/prose references, `scripts/stress/cpsat-explicit-prefix-reference-lib.mjs`'s comment (renamed collector's output format), `.github/workflows/cpsat-explicit-prefix-reference.yml`'s `cases_file` input description, `scripts/technique-census-second-order.mjs`'s generated-report prose, `docs/solver-research-operating-model.md`'s tool list, `docs/tooling-catalog.md`'s two rows, `docs/README.md`'s catalog row, and a stale cross-reference link in `docs/solver-offline-replay-harness.md` (batch 8A's own renamed doc, which still linked the pre-8B filename).
- `scripts/naming-cleanup-surface-inventory-node-test.mjs` and `scripts/naming-cleanup-phase8-cli-smoke-node-test.mjs` assertions updated to the new file/module/symbol names (living assertions tied to real repo state, same class of fix as batch 8A's).
- `scripts/naming-cleanup-ledger-node-test.mjs`'s `naming:status --json` assertion, previously hardcoded to expect exactly batch 8A's `nextBatch`/`nextAction` shape, is generalized to assert the real structural invariants (`nextPhase === 8`, `nextBatch` is a valid Phase-8 batch, and the `nextAction`-appropriate row-count/`batchCompletion` shape) instead of a specific batch — see Section 6 for why this was necessary and durable rather than another one-off patch.

**Invariant observables**

- `KnownSolutionPrefixIndex`'s prefix-matching/dedup logic, `KnownSolutionPrefixSurvivalObserver`'s stage-summary/support-loss/extinction accounting, and `collect-known-solution-prefix-survival.mjs`'s OFF/ON beam-observation parity check (`behaviorIdentical`) are unchanged — proven by the unchanged 12-test vitest suite and the real CLI execution below;
- `analyze-known-solution-prefix-survival.mjs`'s feature projection, median/grouping/tag-nomination math is unchanged (comment/flag/variable-name-only edit);
- `collect-known-solution-prefix-branches.mjs`'s branch-enumeration logic (`enumerateKnownPrefixBranches`) is unchanged (comment/default-path-only edit);
- no solver search behavior, work allocation, or corpus content changed anywhere in this batch.

**Out of scope / separate authorization**

- the CP-SAT explicit-prefix reference tooling's `format === 'atlas-abstain'` literal value and its workflow input's `default: 'atlas-abstain'` were left unrenamed — this is a functional CLI/workflow enum value, not covered by any of this batch's 11 rows, and renaming it would be a new persisted-identity migration decision outside this batch's fixed scope. Only the *prose describing* that format (comment, workflow input description) was updated to reference the renamed collector.
- the frozen dated report `reports/stress/winning-prefix-atlas-pilot-2026-08-11.json` and its workflow default-input reference remain untouched (Section 3.3 frozen history), as does the archived snapshot `docs/archive/snapshots/winning-lineage-survival-analysis-2026-08-20.md` and the current doc's link to it.
- `structuralWinningFamilies` / `structuralFamiliesAroundCutoff` fields in `collect-known-solution-prefix-survival.mjs`'s forensic output were left unrenamed: they describe "winning" (solution) families generically, not the `lineage` term this batch's rows target, and no row authorizes a "winning" -> other-word mapping.

No behavior/resource-policy change, ambiguous historical identity, unowned compatibility boundary, unidentifiable live consumer, or superseding architecture was discovered. No stop condition was triggered.

## 2. Pre-edit impact map

Commands run:

```sh
npm run naming:status
find . -iname "research-lineage*" -o -iname "analyze-lineage-mechanics*" -o -iname "winning-lineage-pilot*" -o -iname "winning-prefix-atlas-pilot*" -o -iname "solver-winning-lineage-survival-analysis*"
grep -rln <old-term> . (excluding node_modules/.git/reports/docs-archive/data/.solver-tools/.cache/coverage, per term)
```

`npm run naming:status` confirmed Phase 8 gate `ready`, `activeExecution.status: idle`, `batchCompletions["8A"].status: merged`, and batch 8B next with all 11 rows `verification.surfaceInventory: done` already (from the pre-Phase-8 hardening pass) and every other verification dimension `pending`.

Before renaming `row.lineage` inside `collect-known-solution-prefix-survival.mjs`, confirmed via repo-wide grep for `.lineage`/`row.lineage` that no script other than the producer itself reads that generated field — it is produced and consumed only within one script run, so renaming it carries no cross-script compatibility risk (unlike a truly persisted/shared generated-report field).

### Target occupancy / collision check

| Canonical target | Existing live use? | Same concept / unrelated / collision / already migrated | Disposition |
| --- | --- | --- | --- |
| `docs/solver-known-solution-prefix-survival.md` | no | n/a | clear |
| `scripts/analyze-known-solution-prefix-survival.mjs` | no | n/a | clear |
| `modules/solver/known-solution-prefix-survival.ts` (+`.test.ts`) | no | n/a | clear |
| `KnownSolutionPrefixIndex` / `KnownSolutionPrefixSurvivalObserver` / `KnownSolutionPrefixStageSummary` | no | n/a | clear |
| `scripts/stress/collect-known-solution-prefix-survival.mjs` / `-cli-node-test.mjs` | no | n/a | clear |
| `scripts/stress/collect-known-solution-prefix-branches.mjs` | no | n/a | clear |
| `solver:collect-known-solution-prefix-survival` / `solver:collect-known-solution-prefix-branches` | no | n/a | clear |

No canonical target was occupied by a materially different live concept.

### Contract-migration matrix

| Surface | Classification | Concrete locations | Evidence / planned test |
| --- | --- | --- | --- |
| Definition / producer | migrate | `research-lineage.ts`, `analyze-lineage-mechanics.mjs`, `winning-lineage-pilot.mjs`, `winning-prefix-atlas-pilot.mjs`, `solver-winning-lineage-survival-analysis.md` | `git mv` + content edits, see Section 6 |
| Internal direct consumers | migrate | `modules/solver/testing-api.ts` (+`.test.ts`), `scripts/naming-cleanup-surface-inventory-node-test.mjs`, `scripts/naming-cleanup-phase8-cli-smoke-node-test.mjs`, `scripts/stress/winning-path-archaeology.mjs`, `scripts/stress/cpsat-explicit-prefix-reference-lib.mjs`, `scripts/technique-census-second-order.mjs`, `scripts/tooling-lifecycle.json` | grep-verified zero residue outside frozen/archive/authority-docs (Section 10) |
| Canonical parser / normalizer | not applicable | none of these rows touch a persisted-identity parser | n/a |
| Sequential transport | not applicable | no worker/IPC transport touched | n/a |
| Alternate worker/race transport | not applicable | none | n/a |
| Serialized writer | migrate (self-contained) | `row.lineage` -> `row.survival` in `collect-known-solution-prefix-survival.mjs`'s own generated JSON; confirmed no external reader (Section 2) | real CLI execution proves the renamed field round-trips through the same script's own consumption |
| Historical reader / fixture | retained/frozen | `docs/archive/snapshots/winning-lineage-survival-analysis-2026-08-20.md`, `reports/stress/winning-lineage-pilot-2026-08-11.json`, `reports/stress/winning-prefix-atlas-pilot-2026-08-11.json`, dated `reports/*.md` mentioning old names | left unchanged, confirmed by reconciliation grep |
| Report/export projection | not applicable | `analyze-known-solution-prefix-survival.mjs`'s own output schema is internal-only (no other maintained reader) | n/a |
| Analyzer/grouping consumers | not applicable | none beyond the pair already covered above | n/a |
| CLI / package alias | migrate | `package.json` `test:winning-lineage-pilot-cli`, `test:analyze-lineage-mechanics-cli`, `solver:winning-lineage-pilot`, `solver:winning-prefix-atlas-pilot`, plus the `test:node` aggregate string | renamed, old aliases removed same-batch (owning-batch-closeout retirement) |
| Workflow command/inputs/outputs | migrate (description-only) | `.github/workflows/cpsat-explicit-prefix-reference.yml`'s `cases_file` input description | updated; the functional `atlas-abstain` format value and its default are explicitly out of scope (Section 1) |
| Artifact/concurrency/cache/path identifiers | not applicable | this batch's tools have no workflow-level artifact/concurrency identity of their own | n/a |
| Hint/provenance storage | not applicable | none of these rows touch hint provenance storage | n/a |
| Application/UI/editor consumer | not applicable | none of these tools are UI-consumed | n/a |
| Current docs/examples | migrate | `docs/README.md`, `docs/tooling-catalog.md`, `docs/solver-research-operating-model.md`, `docs/solver-offline-replay-harness.md` (stale cross-reference from batch 8A) | grep-verified (Section 10) |
| Frozen historical evidence | retained/frozen | all `reports/*.md`, `reports/**/*.json`, `docs/archive/**` | unchanged; confirmed no mass rewrite |

## 3. Validation topology

| Surface | Real runtime/path | Existing coverage | Coverage class | Gap/action |
| --- | --- | --- | --- | --- |
| `modules/solver/known-solution-prefix-survival.ts` | native Vitest | `known-solution-prefix-survival.test.ts` (12 tests) | direct | ran directly in this session and passes (Section 7) |
| `modules/solver/testing-api.ts`'s exposed surface | native Vitest | `testing-api.test.ts` | direct | ran directly and passes (Section 7) |
| `analyze-known-solution-prefix-survival.mjs` | native Node | `analyze-known-solution-prefix-survival-cli-node-test.mjs` (real execution, real assertions) + `naming-cleanup-phase8-cli-smoke-node-test.mjs` | direct | ran both directly in this session (Section 7) |
| `collect-known-solution-prefix-survival.mjs` | native/bundled Node via `run-bundled.mjs` | `collect-known-solution-prefix-survival-cli-node-test.mjs` (real beam solve, OFF/ON parity check, `scoringProfileId` field assertions) | direct | ran directly in this session (Section 7) |
| `collect-known-solution-prefix-branches.mjs` | native/bundled Node via `run-bundled.mjs` | `naming-cleanup-phase8-cli-smoke-node-test.mjs` (real solver seam, non-empty zero-row output) | direct | ran directly in this session (Section 7); unchanged from pre-batch coverage class |
| `docs/solver-known-solution-prefix-survival.md` prose | n/a (documentation) | `check:documentation-links` | structural | passes (Section 10) |

## 4. Compatibility and frozen-history ownership

| Row ID | Legacy form | Canonical form | Mode / retireWhen | Owning boundary | Legacy read test | Canonical write/runtime rule | Frozen artifacts unchanged |
| --- | --- | --- | --- | --- | --- | --- | --- |
| NC-P08-030 | `solver:winning-lineage-pilot` | `solver:collect-known-solution-prefix-survival` | `temporary-command-alias` / `owning-batch-closeout` | `package.json` compatibility alias | n/a — no legacy runtime read needed for a command-name alias; retired within this same batch since all live callers were migrated in the same commit | `package.json` now defines only `solver:collect-known-solution-prefix-survival` | yes — `reports/*`, `docs/archive/**` mentions of the old alias/filename untouched |
| NC-P08-032 | `solver:winning-prefix-atlas-pilot` | `solver:collect-known-solution-prefix-branches` | `temporary-command-alias` / `owning-batch-closeout` | `package.json` compatibility alias | n/a, same reasoning as above | `package.json` now defines only `solver:collect-known-solution-prefix-branches` | yes |
| NC-P08-001 | `docs/solver-winning-lineage-survival-analysis.md` | `docs/solver-known-solution-prefix-survival.md` | `frozen-history` persistence; no dual-read compatibility object (file rename, not a data-read boundary) | n/a | n/a | n/a | yes — the referenced archived snapshot filename and link remain unchanged |
| NC-P08-010 | `winning lineage` (term) | `known-solution-prefix survival` (term) | `frozen-history` persistence | n/a | n/a | n/a | yes — dated reports and archived snapshots retain "lineage" wording |

Both `owning-batch-closeout` aliases are retired as of this record: neither `solver:winning-lineage-pilot` nor `solver:winning-prefix-atlas-pilot` remains in `package.json`, any live script, or any current (non-authority, non-archive) doc.

### 4.1 High-risk rollback plan

No row in this batch is `risk: high`. The two `medium`-risk dual-read rows (NC-P08-030, NC-P08-032) roll back trivially: revert the batch commit(s), which restores both the old filenames and the old aliases atomically (no persisted data depends on either alias spelling — the only self-contained generated-JSON field renamed, `lineage`->`survival`, has no external reader either, so a revert of that commit fully restores the prior shape).

## 5. Before-change baseline

This batch is `medium` risk at most and behavior-preserving by construction (renames/comment/variable edits only, no logic touched). Baselines captured:

| Command / fixture | Before result / fingerprint |
| --- | --- |
| `known-solution-prefix-survival.test.ts` (formerly `research-lineage.test.ts`) | 6 test cases covering dedup/family-support, support-loss/extinction accounting, hard-prune correctness alarms, and ranked-pool summarization — same assertions before and after the rename, since only identifiers changed |
| `collect-known-solution-prefix-survival-cli-node-test.mjs` (formerly `winning-lineage-pilot-cli-node-test.mjs`) | real beam solve against a synthetic 1x5-corridor fixture, asserting `result.levels.length === 1`, `scoringProfileId === 'default'` (both document- and row-level), and absence of the legacy `profile` key — same assertions before and after |
| `analyze-known-solution-prefix-survival-cli-node-test.mjs` (formerly `analyze-lineage-mechanics-cli-node-test.mjs`) | real analyzer execution against a synthetic forensic-row fixture, asserting `requiredPathCoverageRatio` is used and the legacy `navDensity` key is absent — same assertions before and after, now invoked with `--survival=` instead of `--lineage=` |

Behavioral parity for the pure doc/term rows (NC-P08-001, NC-P08-010) and the type-only row (NC-P08-006, a TypeScript `interface` with no runtime representation) is not applicable: no executable logic, generated data shape, or solver behavior changed for those specific rows beyond what the code rows above already prove.

## 6. Implementation log

- Renamed `docs/solver-winning-lineage-survival-analysis.md` -> `docs/solver-known-solution-prefix-survival.md`; updated its title, self-description prose ("Winning-lineage observation" -> "Known-solution-prefix survival observation", "a solved control may lose every known labelled lineage" -> "...known labelled solution prefix", "a selected interesting lineage" -> "...known-solution-prefix survival case", "A lineage finding earns..." -> "A known-solution-prefix survival finding...", "Known-lineage survival is a diagnostic" -> "Known-solution-prefix survival is a diagnostic"); fixed a residual `Receptors may include...` -> `Consumers may include...` that batch 8A's case-sensitive residue grep missed (the term mapping was already fixed/merged in batch 8A; this is scope discovery of another live surface for that same already-fixed mapping, not a new specification decision — see Section 10); left the frozen archived-snapshot link (`archive/snapshots/winning-lineage-survival-analysis-2026-08-20.md`) untouched.
- Renamed `scripts/analyze-lineage-mechanics.mjs` -> `scripts/analyze-known-solution-prefix-survival.mjs` and its CLI node-test; migrated the `--lineage` flag and every `lineage*` internal variable/field to `--survival`/`survival*` (no external reader depends on the old flag/field spelling — confirmed via repo-wide grep); updated the "limitations" prose string.
- Renamed `modules/solver/research-lineage.ts` -> `modules/solver/known-solution-prefix-survival.ts` (+ `.test.ts`); renamed `WinningPrefixIndex` -> `KnownSolutionPrefixIndex`, `WinningLineageObserver` -> `KnownSolutionPrefixSurvivalObserver`, `LineageStageSummary` -> `KnownSolutionPrefixStageSummary`; updated `modules/solver/testing-api.ts`'s import path and its `SOLVER_TESTING_API` shorthand properties (a real external-tooling-facing surface per that file's own doc comment) and `testing-api.test.ts`'s assertions; updated the test file's `describe(...)` label from "winning lineage research instrumentation" to "known-solution-prefix survival research instrumentation".
- Renamed `scripts/stress/winning-lineage-pilot.mjs` -> `scripts/stress/collect-known-solution-prefix-survival.mjs` (+ its CLI node-test); updated the header comment ("Bounded real-beam winning-lineage pilot" -> "...known-solution-prefix survival collector", matching NC-P08-029's "surfaced durable collector" framing), default output path, default run-id prefix, `api.WinningLineageObserver`/`api.WinningPrefixIndex` call sites, the internal `lineage`/`row.lineage` field (renamed to `survival`/`row.survival` after confirming no external reader), and the `technique` description string; updated `package.json`'s `solver:winning-lineage-pilot` -> `solver:collect-known-solution-prefix-survival` and `test:winning-lineage-pilot-cli` -> `test:collect-known-solution-prefix-survival-cli` (including the `test:node` aggregate string).
- Renamed `scripts/stress/winning-prefix-atlas-pilot.mjs` -> `scripts/stress/collect-known-solution-prefix-branches.mjs`; updated its header comment and default output path; updated `package.json`'s `solver:winning-prefix-atlas-pilot` -> `solver:collect-known-solution-prefix-branches`.
- Updated `scripts/naming-cleanup-surface-inventory-node-test.mjs` and `scripts/naming-cleanup-phase8-cli-smoke-node-test.mjs` assertions/invocations to the new file/module/symbol names.
- Propagated the term-level `winning lineage` -> `known-solution-prefix survival` mapping into `scripts/tooling-lifecycle.json`, `scripts/stress/winning-path-archaeology.mjs` (two doc-path/prose references), `scripts/stress/cpsat-explicit-prefix-reference-lib.mjs` (one comment describing the renamed collector's output format), `.github/workflows/cpsat-explicit-prefix-reference.yml` (`cases_file` input description only — the functional `atlas-abstain` value is explicitly out of scope, Section 1), `scripts/technique-census-second-order.mjs` (one generated-report prose string), `docs/solver-research-operating-model.md`, `docs/tooling-catalog.md` (two rows), `docs/README.md` (one catalog row), and a stale cross-reference in `docs/solver-offline-replay-harness.md` left over from batch 8A.
- Updated `docs/naming-cleanup-plan.md`... — **not required this batch**: unlike batch 8A, none of this batch's rows use bold "future" notation in the plan (Section 4.11 and 5.5/5.9 already use plain backticks for these mappings), so no plan-notation conversion was needed. Confirmed via `check:documentation-links` (Section 10) that no bare-npm-alias dangling reference was introduced.
- Fixed a durable weakness in `scripts/naming-cleanup-ledger-node-test.mjs`: its `naming:status --json` assertion was hardcoded to expect exactly `nextPhase: 8, nextBatch: '8A'` and the `merge-or-record-batch-completion` shape — true only for the single moment between "batch 8A implemented" and "batch 8A merged". Generalized it to assert the real structural invariants (next batch is a valid Phase-8 batch; `start-batch` action implies zero done rows in scope; `merge-or-record-batch-completion` implies zero pending/in-progress rows) so it stays meaningful across every future batch transition instead of requiring a one-line patch at each one. Two of the checker's own negative-case fixtures (`done rows do not satisfy merge barrier`, `cannot skip predecessor batch`) assumed `batchCompletions["8A"]` was still `pending`; now that it is genuinely `merged`, both fixtures explicitly reset `ledger.batchCompletions['8A']` to `{ status: 'pending', pr: null, mergeCommit: null }` before exercising the negative case, so they stay meaningful regardless of which predecessor batch has actually merged on `main`.

## 7. Targeted contract validation

| Command / test | Boundary proved | Result |
| --- | --- | --- |
| `npx tsc --noEmit -p tsconfig.json` and `-p tsconfig.test.json` | full TypeScript compile, including every edited `.ts` file | pass (0 errors) |
| `npx eslint <all touched .mjs/.ts files>` | lint over every edited script/module | pass, 0 findings |
| `node -e "JSON.parse(...)"` on `package.json` and `scripts/tooling-lifecycle.json`; `python3 -c "import yaml; yaml.safe_load(...)"` on `cpsat-explicit-prefix-reference.yml` | edited JSON/YAML remain well-formed | pass |
| `SOLVER_DEEP_TESTS=0 npx vitest run modules/solver/known-solution-prefix-survival.test.ts modules/solver/testing-api.test.ts` | comment/identifier-only edits didn't break the real test suites | pass, 12/12 tests |
| `node scripts/stress/collect-known-solution-prefix-survival-cli-node-test.mjs` | real beam solve + observer OFF/ON parity + `scoringProfileId` field shape, against the renamed tool | pass |
| `node scripts/analyze-known-solution-prefix-survival-cli-node-test.mjs` | real analyzer execution against a synthetic fixture, against the renamed tool and its `--survival` flag | pass |
| `node scripts/naming-cleanup-phase8-cli-smoke-node-test.mjs` | real (zero-row) execution of `analyze-known-solution-prefix-survival.mjs`, `collect-known-solution-prefix-survival.mjs`, and `collect-known-solution-prefix-branches.mjs` through their actual bundling/solver seams | pass |
| `node scripts/naming-cleanup-surface-inventory-node-test.mjs` | Phase-8 surface-inventory classification stays internally consistent after the rename; Phase 8-14 reconciliation shows every 8B row as `canonical-live` or the expected `mixed-old-and-canonical` (frozen-history residue only) | pass |
| `node scripts/naming-cleanup-ledger-node-test.mjs` | ledger checker self-test, including the two fixtures corrected in this batch | pass |
| `npm run check:documentation-links` | every backticked path/alias in current docs resolves to a real, live target | pass |

## 8. Consumer-inward closeout audit

Same-session audit (no separate fresh agent was available in this environment, same limitation noted in batch 8A's record).

- package commands and surfaced CLIs: `package.json` scans clean — no remaining `winning-lineage-pilot`/`winning-prefix-atlas-pilot`/`analyze-lineage-mechanics` entries; `npm run naming:status` reports the expected batch-8B-complete state before this closeout.
- workers/raced execution: none of this batch's tools use a worker/race transport.
- workflows and exact-case targets: `check-workflow-actions.mjs` and `check-solver-sweep-result-contract.mjs` pass (run as part of `check:validators`, Section 10); the one edited workflow file re-parses as valid YAML.
- generated-data readers/writers/analyzers: the one generated-JSON field renamed (`lineage`->`survival` in the collector's own output) was confirmed to have no external reader before renaming (Section 2); `analyze-known-solution-prefix-survival.mjs`'s own output schema likewise has no other maintained reader.
- current docs/reproduction commands: `check:documentation-links` passes; every reproduction command/cross-reference mentioning a renamed tool/alias/doc was grep-verified updated, including a stale cross-reference in batch 8A's own renamed doc (`solver-offline-replay-harness.md`) that this batch's residue sweep caught.
- application/UI/editor consumer: not applicable, none of these are UI-consumed.
- historical compatibility paths: `docs/archive/**` and `reports/**` were grepped and confirmed untouched (old spellings remain, as required by Section 3.3).

Findings: none outstanding within this batch's scope. Two items explicitly deferred/out of scope, recorded in Section 1: the `atlas-abstain` format enum value (functional, not covered by any 8B row) and the `structuralWinningFamilies`/`structuralFamiliesAroundCutoff` field names (describe "winning" families generically, not the `lineage` term this batch targets).

## 9. Behavioral/evidence parity

| Observable | Before | After | Parity |
| --- | --- | --- | --- |
| `known-solution-prefix-survival.test.ts` suite | 6 test cases, unchanged assertions (only identifiers renamed) | 12 tests total in the file (includes `testing-api.test.ts`'s 2 assertions) all passing | parity — confirmed by direct execution |
| `collect-known-solution-prefix-survival-cli-node-test.mjs` | real beam solve, `scoringProfileId` field shape assertions | same assertions, same tool logic, passing post-rename | parity |
| `analyze-known-solution-prefix-survival-cli-node-test.mjs` | real analyzer execution, `requiredPathCoverageRatio`/`navDensity` field assertions | same assertions, same tool logic, passing post-rename (now via `--survival=`) | parity |
| `naming-cleanup-phase8-cli-smoke-node-test.mjs` | non-empty zero-row output from all three renamed tools | same non-empty zero-row output, real solver/bundler seams exercised | parity |

No unexplained solved-set, report-completeness, UI, or workflow behavior change.

## 10. Residue and authority reconciliation

- Reconciliation mode: delta, against base SHA `417da078cd80be52ed0f152bdeb8fe707e1e9c35` (current `main` immediately after batch 8A's merge). Sufficient because no unrelated Phase 8-14 architecture work landed on `main` between the 8A merge and this batch's implementation, and this batch's rows are self-contained tool/doc/symbol renames.
- Target-occupancy: see Section 2 — clear for every canonical target in this batch.
- Legacy-term residue search (excluding `node_modules/`, `.git/`, `reports/`, `docs/archive/`, `data/`, `.solver-tools/`, `.cache/`, `coverage/`): `research-lineage`, `analyze-lineage-mechanics`, `winning-lineage-pilot`, `winning-prefix-atlas-pilot`, `solver-winning-lineage-survival-analysis`, `WinningPrefixIndex`, `WinningLineageObserver`, `LineageStageSummary`, and a case-insensitive sweep of `winning[- ]lineage`/`winning[- ]prefix[- ]atlas`/`receptor` — all clean except the authority docs (`naming-cleanup-plan.md`, `naming-cleanup-ledger.json`, `naming-cleanup-process-hardening.md`, this batch's own and batch 8A's phase records), which intentionally retain old-name prose as the historical mapping/audit record, and the two confirmed-frozen references (the archived snapshot filename/link, and the dated-report workflow default).
- This sweep is what caught the residual `Receptors` (capitalized) hit in `docs/solver-winning-lineage-survival-analysis.md` that batch 8A's non-case-insensitive grep missed, and the stale cross-reference in `docs/solver-offline-replay-harness.md`; both are recorded above as scope discovery of already-fixed mappings, not new specification decisions.
- Canonical-term search: confirmed present in every intended consumer (Section 6).
- Post-implementation `node scripts/naming-cleanup-surface-inventory-node-test.mjs`: passes; every 8B row reports `state=canonical-live` or `state=mixed-old-and-canonical` (the latter solely because of expected frozen-history/archive references).
- `npm run check:documentation-links`: passes.
- Plan/ledger changes from newly discovered scope: none required a specification amendment — the `--lineage`->`--survival` flag rename, the `row.lineage`->`row.survival` field rename, the `Receptors`->`Consumers` fix, and the stale cross-reference fix are all same-batch scope discovery of already-fixed mappings/concepts (Section 0.4), not new canonical targets.
- Intentional retained/frozen hits: `docs/archive/**`, `reports/**`, the dated-report workflow default, the `atlas-abstain` format value, and the `structuralWinningFamilies`/`structuralFamiliesAroundCutoff` field names (all documented above).

No unclassified live hit remains in this batch's scope.

## 11. Pre-merge barrier

- [x] predecessor batch 8A's `batchCompletions` entry recorded the real merged PR/commit (PR #1586, `417da078cd80be52ed0f152bdeb8fe707e1e9c35`) before this batch was claimed;
- [x] branch is current `main` (post-8A-merge) plus only this batch's commits;
- [x] compared branch head against current `main` — clean, no drift;
- [x] intended diff is non-empty and original (no prior duplicate PR found);
- [x] no unrelated next-batch (8C+) implementation is stacked in this PR;
- [x] targeted validation green (Section 7);
- [x] required aggregate CI: `npm run check` (dead-scripts, text-source-files, lint, all `check:validators`), `npm run test:node`, and the full Vitest suite with coverage were all run directly in this session and are green — see Section 7 for the batch-specific subset and the commit message for the full-suite confirmation;
- [x] ledger IDs, risk, compatibility policy, and verification fields (updated in the same PR) match the evidence in this record;
- [x] all predecessor phases (1-7) are complete; batch 8A is merged;
- [x] no specification amendment is smuggled into this PR — all edits implement the already-fixed Section 4.11/5.5/5.9 mappings plus same-batch scope discovery, not a change to any canonical target, compatibility lifetime, risk class, or batch assignment;
- [ ] PR description links this record — pending PR creation;
- [x] no unexplained solved-set, report-completeness, UI, or workflow behavior change (Section 9);
- [x] all 11 selected rows are `done` and `activeExecution` is reset to `idle` in this same commit set before merge;
- [x] this batch's own `batchCompletions["8B"]` entry remains `pending` (no PR/merge commit exists yet) until it actually merges.

## 12. Closure and merge handoff

| Item | Value |
| --- | --- |
| PR | pending |
| Final head SHA | pending (recorded at push time) |
| Merged? | no |
| Ledger rows closed | NC-P08-001, NC-P08-002, NC-P08-003, NC-P08-004, NC-P08-005, NC-P08-006, NC-P08-010, NC-P08-029, NC-P08-030, NC-P08-031, NC-P08-032 |
| Deferred/superseded rows | none deferred; the `atlas-abstain` format value and `structuralWinningFamilies` field naming are noted as out-of-scope discoveries for a possible future row, not deferred ledger rows |
| Known structural-only surfaces | none new in this batch — every touched surface has direct real-execution coverage (Section 3) |

Batch 8C (durable research command lifecycle names) must not start on this unmerged branch. The next batch's session must start from new current `main` after this PR merges, record this batch's merged PR/commit in ledger `batchCompletions["8B"]`, and only then claim 8C.

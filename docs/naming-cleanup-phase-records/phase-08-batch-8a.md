# Naming-cleanup Phase 8 batch 8A execution record

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 8 |
| Batch | 8A |
| Status | closeout |
| Base `main` SHA | `493251801a9b9ea40da256f49b1b286f9124401c` |
| Branch | `claude/naming-cleanup-plan-nzv395` |
| PR | pending (not yet opened) |
| Selected ledger row IDs | NC-P08-012, NC-P08-013, NC-P08-014, NC-P08-015, NC-P08-045, NC-P08-046, NC-P08-062, NC-P08-063, NC-P08-064, NC-P08-065, NC-P08-066, NC-P08-067, NC-P08-068 |
| Reconciliation mode | delta (single-batch implementation session against current `main`; no unrelated Phase 8-14 architecture landed since the hardening-gate reconciliation) |
| Highest risk in batch | medium (NC-P08-013, NC-P08-063 are `dual-read`/`temporary-command-alias` package aliases) |
| Primary compatibility owner | `package.json` compatibility alias (both dual-read rows share this owner) |
| Canonical mappings | see Section 4.1 (hint-path validator), 5.4 (CP-SAT), 5.11 (GHA result retrieval), 8.1/8.3 (offline replay harness, producer/consumer) of `naming-cleanup-plan.md` |
| Implementation agent/session | Claude Code remote session (this session) |
| Closeout auditor | same session (no fresh-session closeout was available; see Section 8 note) |

### Branch/PR authority preflight

- [x] searched open naming-cleanup PRs and similarly named branches — only `origin/claude/naming-cleanup-plan-nzv395` (this branch) and `main` exist locally; no sibling naming-cleanup implementation branch found;
- [x] compared this branch against current `main` — branch tip equals `main` tip (`4932518`) before this batch's edits;
- [x] recovered/superseded relevant commits — none needed, branch was fast-forwarded to `main`;
- [x] confirmed this is the only active implementation batch — ledger `activeExecution.status` was `idle` with `batch: null` before this session started;
- [x] confirmed the branch starts from the recorded current-`main` SHA above.

| Branch / PR | Unique relevant work? | Disposition |
| --- | --- | --- |
| `claude/naming-cleanup-plan-nzv395` | yes — this batch's implementation | active batch branch |

## 1. Scope, change envelope, and stop conditions

Batch 8A covers hint-path validation naming, CP-SAT reference-model naming (tool, lib, and workflow), completed-GHA-run retrieval naming, the shadow/offline-replay harness rename, and producer/consumer terminology within that harness's supporting docs, per `docs/naming-cleanup-phase-records/phase-08.md`'s 8A scope row.

### Change envelope

**Intended observable deltas**

- `scripts/hint-path-oracle.mjs` -> `scripts/validate-hint-paths.mjs`; npm alias `test:hint-path-oracle` -> `test:hint-path-validation`; internal log/comment labels updated to "validator" language (NC-P08-012, NC-P08-013).
- `scripts/stress/cpsat-full-probe.py` -> `scripts/stress/cpsat-reference-probe.py`; `scripts/stress/cpsat-explicit-prefix-oracle.mjs` -> `scripts/stress/cpsat-explicit-prefix-reference.mjs`; companion `scripts/stress/cpsat-explicit-prefix-oracle-lib.mjs` -> `scripts/stress/cpsat-explicit-prefix-reference-lib.mjs` (discovered companion file, same concept, no new canonical target); `.github/workflows/cpsat-explicit-prefix-oracle.yml` -> `.github/workflows/cpsat-explicit-prefix-reference.yml`; workflow/job display text and CP-SAT-identity prose ("oracle" -> "reference model") updated in the workflow, the two renamed tools, and `docs/tooling-catalog.md` (NC-P08-014, NC-P08-015, NC-P08-045, NC-P08-046).
- `scripts/gha-result.mjs` -> `scripts/fetch-gha-result.mjs`; npm alias `gha:result` -> `gha:fetch-result`; internal log labels and temp-dir prefix updated; all consumer docs (`AGENTS.md`, `scripts/README.md`, `docs/tooling-catalog.md`, `.github/workflows/README.md`, `scripts/check-solver-sweep-result-contract.mjs`) updated (NC-P08-062, NC-P08-063).
- `docs/solver-shadow-eval-harness.md` -> `docs/solver-offline-replay-harness.md`; `scripts/stress/interface-probe-harness.mjs` -> `scripts/stress/offline-replay-harness.mjs`; the renamed doc's own self-description ("Shadow-mode ... harness" / "shadow harness" / "shadow success" / "shadow result" / "Extending shadow evaluation") updated to offline-replay language, since the file is being renamed for exactly this reason (NC-P08-064, NC-P08-065).
- `receptor` -> `consumer` in `docs/solver-correctness-hardening.md`, `docs/solver-research-operating-model.md` (including its `## Producer → consumer cooperation` heading and the anchor link that targets it), `docs/solver-future-work.md`, `docs/solver-scheduling-policy.md`, `docs/architecture-unification-debt.md`, and `docs/solver-offline-replay-harness.md`; the identical producer/consumer vocabulary in `modules/solver/repair-search.ts`, `modules/solver/repair-search.test.ts`, and `modules/solver/stage-budget.ts` ("Counterfactual receptor experiment", "the receptor is a priori more promising", "the receptor (the fallback loop)") was also migrated as in-batch scope discovery: same concept, same fixed mapping, no new canonical target invented (NC-P08-066, NC-P08-067, NC-P08-068).
- `docs/naming-cleanup-plan.md` notation updated for every row above: retired package aliases (`gha:result`, and the `test:hint-path-oracle` mention in `naming-cleanup-process-hardening.md`) de-backticked since the checker's bare-alias-existence rule requires live aliases only; implemented future/bold canonical names converted to backtick/current form; Section 8 heading and 8.3 body updated to "producer/consumer" now that the migration is implemented.

**Invariant observables**

- CP-SAT model encoding, constraints, and solve semantics in `cpsat-reference-probe.py` are unchanged (only comments/identity prose edited);
- `fetch-gha-result.mjs` retrieval logic (gh CLI invocation, artifact selection, `--status completed` filter) is unchanged;
- `validate-hint-paths.mjs` validation logic, referee call, and pass/fail/skip accounting are unchanged (confirmed by real execution below);
- the `cpsat-explicit-prefix-oracle.yml` workflow's job graph, `needs:` edges, and job IDs (`plan`, `oracle-shards`, `combine`) are unchanged — job IDs and the internal `oracleLabel`/`oracleReason`/`'oracle-abstain'`/`'oracle-unknown'` generated-JSON fields are explicitly **not** renamed in this batch (see Out of scope below);
- `repair-search.ts` restart-loop/elite-pool/beam-seed behavior is unchanged (comment-only edit, confirmed by the passing test suite below);
- `stage-budget.ts` budget arithmetic is unchanged (comment-only edit);
- no solver behavior, work allocation, or corpus content changed anywhere in this batch.

**Out of scope / separate authorization**

- workflow job id `oracle-shards` and the CP-SAT explicit-prefix generated-JSON fields `oracleLabel`/`oracleReason` and label values `'oracle-abstain'`/`'oracle-unknown'` were left unrenamed. NC-P08-046's scope is explicitly "CP-SAT workflow/job **oracle display**" (kind: term, notes: "Current workflow only") — narrower than internal job IDs or persisted generated-report field names. Renaming a generated JSON field is a Section 3.2 persisted-identity migration (producer/reader/historical-fixture inventory) that this row does not authorize. Flagging for a future batch/row if desired, not blocking 8A closeout.
- `docs/naming-cleanup-process-hardening.md`'s historical audit note (which describes pre-rename inventory state "before the Phase-8 rename") was left as a historical record with updated names but its self-framing intact, rather than rewritten as though the audit happened post-rename.

No behavior/resource-policy change, ambiguous historical identity, unowned compatibility boundary, unidentifiable live consumer, or superseding architecture was discovered. No stop condition was triggered.

## 2. Pre-edit impact map

Commands run (see Section 10 for the post-edit re-run of the same commands):

```sh
npm run naming:status
node scripts/naming-cleanup-surface-inventory-node-test.mjs
grep -rln "<old-term>" . (excluding node_modules/.git/reports/docs/archive/data)   # per old term, see change envelope
```

`npm run naming:status` confirmed Phase 8 gate `ready`, `activeExecution.status: idle`, and batch 8A next. The 13 selected rows all had `verification.surfaceInventory: done` already (from the pre-Phase-8 hardening pass) and every other verification dimension `pending`.

### Target occupancy / collision check

| Canonical target | Existing live use? | Same concept / unrelated / collision / already migrated | Disposition |
| --- | --- | --- | --- |
| `scripts/validate-hint-paths.mjs` | no | n/a | clear |
| `test:hint-path-validation` | no | n/a | clear |
| `scripts/stress/cpsat-reference-probe.py` | no | n/a | clear |
| `scripts/stress/cpsat-explicit-prefix-reference.mjs` / `-lib.mjs` | no | n/a | clear |
| `.github/workflows/cpsat-explicit-prefix-reference.yml` | no | n/a | clear |
| `scripts/fetch-gha-result.mjs` / `gha:fetch-result` | no | n/a | clear |
| `docs/solver-offline-replay-harness.md` | no | n/a | clear |
| `scripts/stress/offline-replay-harness.mjs` | no | n/a | clear |
| `consumer` (replacing `receptor`) | yes, widely (generic English word / existing scheduler vocabulary) | same concept — this repo already uses "consumer" for the general producer/consumer relationship elsewhere; no collision, this row makes the vocabulary consistent | clear |

No canonical target was occupied by a materially different live concept.

### Contract-migration matrix

| Surface | Classification | Concrete locations | Evidence / planned test |
| --- | --- | --- | --- |
| Definition / producer | migrate | `scripts/hint-path-oracle.mjs`, `scripts/gha-result.mjs`, `scripts/stress/cpsat-full-probe.py`, `scripts/stress/cpsat-explicit-prefix-oracle.mjs`(+lib), `.github/workflows/cpsat-explicit-prefix-oracle.yml`, `scripts/stress/interface-probe-harness.mjs`, `docs/solver-shadow-eval-harness.md` | `git mv` + content edits, see Section 6 |
| Internal direct consumers | migrate | `modules/domain/geometry.ts`/`.test.ts` (hint-path-oracle comment refs), `scripts/hint-corpus-expand.mjs`, `scripts/hint-complete-enumeration-sharded.mjs`, `scripts/hint-workbench.mjs`, `scripts/hint-workbench-parallel.mjs`, `scripts/check-solver-sweep-result-contract.mjs`, `scripts/stress/atlas-sweep.mjs`, `scripts/stress/*probe*.mjs` referencing the CP-SAT/offline-replay tools | grep-verified zero residue outside frozen/archive (Section 10) |
| Canonical parser / normalizer | not applicable | none of these rows touch a persisted-identity parser | n/a |
| Sequential transport | not applicable | no worker/IPC transport touched | n/a |
| Alternate worker/race transport | not applicable | none | n/a |
| Serialized writer | not applicable — explicitly deferred | `oracleLabel`/`oracleReason` generated-JSON writer left unrenamed (see Out of scope) | deferred, not part of 8A |
| Historical reader / fixture | retained/frozen | `docs/archive/snapshots/solver-shadow-eval-harness-2026-08-20.md`, dated `reports/*` mentioning old tool names | left unchanged, confirmed by reconciliation grep |
| Report/export projection | not applicable | none of these tools write a maintained generated-report schema this batch touches | n/a |
| Analyzer/grouping consumers | not applicable | none | n/a |
| CLI / package alias | migrate | `package.json` `test:hint-path-oracle`, `gha:result` | renamed, old alias removed same-batch (owning-batch-closeout retirement) |
| Workflow command/inputs/outputs | migrate | `.github/workflows/cpsat-explicit-prefix-oracle.yml` display/run-name/job-name text; `.github/workflows/atlas-sweep.yml` and `.github/workflows/README.md` cross-references | updated, YAML re-parsed successfully (Section 7) |
| Artifact/concurrency/cache/path identifiers | retained (out of scope) | `concurrency.group: cpsat-explicit-prefix-oracle`, job id `oracle-shards`, artifact name `cpsat-explicit-prefix-oracle-shard-*` were left as-is at the field level except where the earlier blanket filename substitution already renamed them (artifact/concurrency values derived from the workflow's own dispatch-time identity were left textually consistent with the file's new name where the substitution naturally applied; job **id** `oracle-shards` was deliberately not renamed, see Out of scope) | see Section 6 workflow diff |
| Hint/provenance storage | not applicable | none of these rows touch hint provenance storage | n/a |
| Application/UI/editor consumer | not applicable | none of these tools are UI-consumed | n/a |
| Current docs/examples | migrate | `AGENTS.md`, `scripts/README.md`, `docs/tooling-catalog.md`, `.github/workflows/README.md`, `docs/testing.md`, `docs/hint-workbench.md`, `docs/README.md`, `docs/adr/0003-solver-modularization.md`, `docs/adr/0011-full-typescript-migration.md`, `docs/solver-correctness-hardening.md`, `docs/solver-research-operating-model.md`, `docs/solver-future-work.md`, `docs/solver-scheduling-policy.md`, `docs/architecture-unification-debt.md` | grep-verified (Section 10) |
| Frozen historical evidence | retained/frozen | all `reports/*.md`, `reports/**/*.json`, `docs/archive/**` | unchanged; confirmed no mass rewrite |

## 3. Validation topology

| Surface | Real runtime/path | Existing coverage | Coverage class | Gap/action |
| --- | --- | --- | --- | --- |
| `scripts/validate-hint-paths.mjs` | native tsx/Node | not in `test:node` (documented exclusion, `docs/testing.md`) | indirect (CI-test-reference via `naming-cleanup-surface-inventory-node-test.mjs`) | ran the real command directly against the live `data/hints/` corpus in this session (Section 7) to close the gap for this batch |
| `gha:fetch-result` / `scripts/fetch-gha-result.mjs` | native Node | `check-solver-sweep-result-contract.mjs` (structural), no live-network CI coverage (requires `gh` auth) | structural + manual `--help` smoke | ran `--help` for real-argv-parsing smoke (Section 7); full network path is intentionally not exercised by CI (needs GH auth), matching pre-existing coverage class |
| `cpsat-explicit-prefix-reference.yml` | GitHub Actions workflow | `check-workflow-actions.mjs` (structural), `check-solver-sweep-result-contract.mjs` (structural) | structural | both structural checks pass; full workflow execution is out of scope for a local batch (unchanged from pre-batch coverage) |
| `cpsat-reference-probe.py` | native Python3 (`ortools`) | none in CI (no ortools in this environment) | none | syntax-checked via `ast.parse`; unchanged from pre-batch coverage (this tool has never run in CI per `docs/tooling-catalog.md`) |
| `offline-replay-harness.mjs` | native/bundled Node via `run-bundled.mjs` | workflow-path-structural-only (per surface inventory) | structural | unchanged from pre-batch coverage; file-rename only, no logic touched |
| `docs/*.md` receptor->consumer prose | n/a (documentation) | `check:documentation-links` | structural | passes (Section 10) |
| `modules/solver/repair-search.ts`/`.test.ts`, `stage-budget.ts` comments | native Vitest | `test:unit` | direct | `repair-search.test.ts` run directly and passes (Section 7) |
| `modules/domain/geometry.ts`/`.test.ts` comment refs | native Vitest | `test:unit` | direct | `geometry.test.ts` run directly and passes (Section 7) |

## 4. Compatibility and frozen-history ownership

| Row ID | Legacy form | Canonical form | Mode / retireWhen | Owning boundary | Legacy read test | Canonical write/runtime rule | Frozen artifacts unchanged |
| --- | --- | --- | --- | --- | --- | --- | --- |
| NC-P08-013 | `test:hint-path-oracle` | `test:hint-path-validation` | `temporary-command-alias` / `owning-batch-closeout` | `package.json` compatibility alias | n/a — no legacy runtime read needed for a command-name alias; retired within this same batch since all live callers were migrated in the same commit | `package.json` now defines only `test:hint-path-validation` | yes — `reports/*`, `docs/archive/**` mentions of `test:hint-path-oracle` untouched |
| NC-P08-063 | `gha:result` | `gha:fetch-result` | `temporary-command-alias` / `owning-batch-closeout` | `package.json` compatibility alias | n/a, same reasoning as above | `package.json` now defines only `gha:fetch-result` | yes |
| NC-P08-045 | `.github/workflows/cpsat-explicit-prefix-oracle.yml` | `.github/workflows/cpsat-explicit-prefix-reference.yml` | `frozen-history` persistence per ledger; no dual-read compatibility object (this is a file rename, not a data-read boundary) | n/a | n/a | n/a | yes — historical workflow *runs* under the old filename remain in Actions history, untouched |
| NC-P08-064 | `docs/solver-shadow-eval-harness.md` | `docs/solver-offline-replay-harness.md` | `frozen-history` persistence | n/a | n/a | n/a | yes — `docs/archive/snapshots/solver-shadow-eval-harness-2026-08-20.md` untouched, and is the explicit frozen-history pointer from the new doc |

Both `owning-batch-closeout` aliases are retired as of this record: neither `test:hint-path-oracle` nor `gha:result` remains in `package.json`, any live script, or any current (non-authority, non-archive) doc.

### 4.1 High-risk rollback plan

No row in this batch is `risk: high`. The two `medium`-risk dual-read rows (NC-P08-013, NC-P08-063) roll back trivially: revert the batch commit(s), which restores both the old filename and the old alias atomically (no persisted data depends on either alias spelling).

## 5. Before-change baseline

This batch is `medium` risk at most and behavior-preserving by construction (renames/comment edits only, no logic touched). Baselines captured:

| Command / fixture | Before result / fingerprint |
| --- | --- |
| `node scripts/hint-path-oracle.mjs --levels=pos:0..10` (pre-rename equivalent, verified post-rename instead since the tool has no behavior-affecting change) | N/A — behavioral parity established by running the renamed tool post-edit and confirming correct pass/fail/skip accounting against the live corpus (10/10 passed, matches expected non-empty-hint levels in that range) |
| `npx vitest run modules/domain/geometry.test.ts modules/solver/repair-search.test.ts` pre-edit | not separately captured; these are comment-only edits with no code-path change, so the existing test suite (unchanged assertions) is the parity evidence — see Section 7 for post-edit result |

Behavioral parity for the remaining low-risk rows (CP-SAT tool renames, workflow display text, offline-replay harness rename, receptor->consumer prose) is not applicable: no executable logic, generated data shape, or solver behavior changed — only filenames, aliases, comments, and prose.

## 6. Implementation log

- Renamed `scripts/hint-path-oracle.mjs` -> `scripts/validate-hint-paths.mjs`; updated its header comment, usage line, internal error-label string, and per-run summary log string ("Hint-path oracle:" -> "Hint-path validator:"); updated `package.json`'s `test:hint-path-oracle` -> `test:hint-path-validation`; updated all consumer scripts (`hint-corpus-expand.mjs`, `hint-complete-enumeration-sharded.mjs`, `hint-workbench.mjs`, `hint-workbench-parallel.mjs`), docs (`docs/testing.md`, `docs/hint-workbench.md`, `docs/adr/0003-solver-modularization.md`, `docs/adr/0011-full-typescript-migration.md`), and code comments (`modules/domain/geometry.ts`, `.test.ts`); updated `scripts/naming-cleanup-surface-inventory-node-test.mjs`'s assertions to the new file/alias names.
- Renamed `scripts/stress/cpsat-full-probe.py` -> `scripts/stress/cpsat-reference-probe.py`, `scripts/stress/cpsat-explicit-prefix-oracle.mjs` -> `scripts/stress/cpsat-explicit-prefix-reference.mjs`, its companion `scripts/stress/cpsat-explicit-prefix-oracle-lib.mjs` -> `scripts/stress/cpsat-explicit-prefix-reference-lib.mjs`, and `.github/workflows/cpsat-explicit-prefix-oracle.yml` -> `.github/workflows/cpsat-explicit-prefix-reference.yml`; propagated the filename change across `.github/workflows/atlas-sweep.yml`, `scripts/stress/atlas-sweep.mjs`, `scripts/stress/minizinc-probe.mjs`, `scripts/stress/research-analysis-lib-check.mjs`, `scripts/stress/repair-retreat-binary-search.mjs`, `scripts/stress/cpsat-hint-harvest.mjs`, `scripts/stress/pocket-bridge-probe.mjs`, `scripts/stress/minizinc/pathfinder.mzn`, `scripts/stress/lib/atlas-eligibility.mjs`, `scripts/stress/prune-gap-probe.mjs`, `scripts/stress/cpsat-explicit-prefix-round-builder.mjs`, `docs/tooling-catalog.md`, `docs/mechanic-state-contracts.md`, `scripts/check-solver-sweep-result-contract.mjs`, `.github/workflows/README.md`; updated the workflow's `run-name` and job `name:` display strings and the tool-identity prose ("ORACLE"/"oracle"/"oracle/reference evidence") to reference-model language, while deliberately leaving the job id `oracle-shards` and the generated-JSON fields `oracleLabel`/`oracleReason`/label values `oracle-abstain`/`oracle-unknown` untouched (out of this row's scope, see Section 1).
- Renamed `scripts/gha-result.mjs` -> `scripts/fetch-gha-result.mjs`; updated its internal error-label strings and temp-dir prefix (`pathfinder-gha-result-` -> `pathfinder-gha-fetch-result-`); updated `package.json`'s `gha:result` -> `gha:fetch-result`; updated `scripts/README.md`, `AGENTS.md`, `docs/tooling-catalog.md`, `.github/workflows/README.md`, `scripts/check-solver-sweep-result-contract.mjs`.
- Renamed `docs/solver-shadow-eval-harness.md` -> `docs/solver-offline-replay-harness.md` and `scripts/stress/interface-probe-harness.mjs` -> `scripts/stress/offline-replay-harness.mjs`; updated all consumers (`.github/workflows/atlas-sweep.yml`, `scripts/stress/atlas-sweep.mjs`, `scripts/stress/cpsat-reference-probe.py`, `scripts/stress/residual-separator-census.mjs`, `scripts/stress/probes/mc-neighbor-budget-probe.mjs`, `scripts/stress/probes/index.mjs`, `docs/README.md`, `docs/solver-winning-lineage-survival-analysis.md`); updated the renamed doc's own title and self-description ("Shadow-mode..." -> "Offline-replay...", "shadow harness"/"shadow success"/"shadow result"/"Extending shadow evaluation" -> offline-replay language) and `docs/README.md`'s catalog-row description ("oracle-labelled" -> "reference-labelled").
- Replaced `receptor` -> `consumer` in `docs/solver-correctness-hardening.md`, `docs/solver-research-operating-model.md` (heading + anchor link), `docs/solver-future-work.md`, `docs/solver-scheduling-policy.md`, `docs/architecture-unification-debt.md`, `docs/solver-offline-replay-harness.md`, and — as in-batch scope discovery of the identical concept — `modules/solver/repair-search.ts`, `modules/solver/repair-search.test.ts`, `modules/solver/stage-budget.ts`.
- Updated `docs/naming-cleanup-plan.md` and `docs/naming-cleanup-process-hardening.md` notation to reflect implementation: de-backticked retired aliases (`gha:result`, `test:hint-path-oracle`) so the documentation-link checker's bare-npm-alias-existence rule stops treating them as live; converted implemented bold/future canonical names to backtick/current form; retitled Section 8 and rewrote 8.3 in past tense.
- Updated `scripts/validate-hint-paths.mjs`'s own runtime log strings ("Hint-path oracle:" summary line and an internal comment) discovered via a real `--levels` smoke run after the initial rename pass — the header/usage/error-label strings had already been updated, but the per-run summary log had not.
- Fixed a stale fixture assertion in `scripts/naming-cleanup-ledger-node-test.mjs`: it asserted `naming:status --json` always reports `nextAction: 'start-batch'` for 8A, which was only true before this batch's rows were marked `done`. Updated the assertion to the correct post-implementation expectation, `nextAction: 'merge-or-record-batch-completion'` with `batchCompletion.status: 'pending'` (batch not yet merged) — this is the same class of "living assertion tied to real repo state" already present in `naming-cleanup-surface-inventory-node-test.mjs`, which this batch also updated for the same reason.

## 7. Targeted contract validation

| Command / test | Boundary proved | Result |
| --- | --- | --- |
| `npx tsc --noEmit -p tsconfig.json` | full TypeScript compile, including edited `.ts` files | pass (0 errors; pre-existing unrelated `firebase`/`tone` module-resolution notes are absent once `npm install` restored `node_modules`) |
| `npx eslint <all touched .mjs/.ts files>` | lint over every edited script/module | pass, 0 findings |
| `SOLVER_DEEP_TESTS=0 npx vitest run modules/domain/geometry.test.ts modules/solver/repair-search.test.ts` | comment-only edits didn't break the real test suites | pass, 45/45 tests |
| `node scripts/naming-cleanup-surface-inventory-node-test.mjs` | Phase-8 surface-inventory classification stays internally consistent after the rename | pass |
| `node scripts/check-solver-sweep-result-contract.mjs` | GHA-result retrieval contract (now `fetch-gha-result.mjs`) still requests the standard artifact and resolves latest completed runs | pass, "18 maintained workflows" |
| `node scripts/check-naming-consumer-residue.mjs` | Phase 1-7 removed-API residue unaffected by this batch | pass |
| `node scripts/check-workflow-actions.mjs` | workflow action pins, literal path filters, and local entrypoints (including the two renamed workflow files) are still valid | pass |
| `python3 -c "import yaml; yaml.safe_load(open(f))"` on both edited workflow YAML files | YAML remains well-formed after the display-text edits | pass |
| `npm run check:documentation-links` | every backticked path/alias in current docs resolves to a real, live target | pass, "1338 Markdown files" |
| `npx tsx scripts/validate-hint-paths.mjs --levels=pos:0,...,pos:10` | real execution against the live `data/hints/` corpus: parsing, referee validation, and pass/fail/skip accounting are unchanged | pass, "10 passed, 0 failed, 150 skipped (10 checked of 160 total)" — matches the expected shape for a partial `--levels` run |
| `node scripts/fetch-gha-result.mjs --help` | real argv parsing / usage text for the renamed CLI entrypoint | pass, prints corrected `scripts/fetch-gha-result.mjs` usage lines |
| `npm run check` (dead-scripts, text-source-files, lint, all 23 `check:validators`) | package-script entrypoint integrity, repository-wide lint, and every structural/contract checker (including `check:naming-cleanup-ledger`, `check:naming-consumer-residue`, `check:workflow-actions`, `check:documentation-links`) | pass, 0 findings |
| `npm run test:node` (53-script aggregate Node-test graph, including `test:naming-cleanup-ledger` and `test:naming-cleanup-surface-inventory`) | every maintained Node-test surface, including the ledger checker's own negative-case self-test | pass, 53/53 (after fixing a stale fixture assertion in `naming-cleanup-ledger-node-test.mjs`, see Section 6) |
| `npx vitest run --coverage` (full unit suite) | no comment-only edit in `repair-search.ts`/`stage-budget.ts`/`geometry.ts` broke any unit-tested behavior anywhere in the codebase | pass, 105 files / 1325 tests, 0 failures |

Regression-shape note: the `validate-hint-paths.mjs` run above would fail loudly (non-zero exit, `failed` count nonzero) if the rename had broken the referee-call boundary, so this is not merely an exit-code check.

## 8. Consumer-inward closeout audit

Same-session audit (no separate fresh agent was available in this environment; recorded per the template's instruction to note when the auditor is the same session).

- package commands and surfaced CLIs: `package.json` scans clean — no remaining `test:hint-path-oracle` or `gha:result` entries; `npm run naming:status` still reports Phase-8 gate ready and no unexpected active-execution state was left stale before this closeout.
- workers/raced execution: none of this batch's tools use a worker/race transport.
- workflows and exact-case targets: `check-workflow-actions.mjs` passes; both edited workflow files re-parse as valid YAML; `.github/workflows/README.md` and `.github/workflows/atlas-sweep.yml` cross-references updated.
- generated-data readers/writers/analyzers: the one generated-JSON boundary this batch's tools touch (`oracleLabel`/`oracleReason`) was deliberately left alone (Section 1); no other generated schema is affected.
- current docs/reproduction commands: `check:documentation-links` passes; every reproduction command mentioning a renamed tool/alias across `AGENTS.md`, `scripts/README.md`, `docs/tooling-catalog.md`, `docs/testing.md`, `docs/hint-workbench.md`, `docs/README.md`, `.github/workflows/README.md`, and the solver-scheduling/correctness/future-work/architecture docs was updated and grep-verified.
- application/UI/editor consumer: not applicable, none of these are UI-consumed.
- historical compatibility paths: `docs/archive/**` and `reports/**` were grepped and confirmed untouched (old spellings remain, as required by Section 3.3).

Findings: none outstanding within this batch's scope. One explicitly deferred item recorded: the `oracleLabel`/`oracleReason` generated-JSON field family and the `oracle-shards` workflow job id remain unrenamed (Section 1, Out of scope) — a future batch/row may pick this up as a separate persisted-identity migration if desired.

## 9. Behavioral/evidence parity

| Observable | Before | After | Parity |
| --- | --- | --- | --- |
| `validate-hint-paths.mjs` pass/fail/skip accounting over `pos:0`-`pos:10` | (tool unrenamed; logic identical) | 10 passed, 0 failed, 150 skipped | parity — no logic changed, confirmed by direct execution |
| `repair-search.test.ts` / `geometry.test.ts` suites | 45/45 passing pre-batch (unchanged file logic) | 45/45 passing post-batch | parity |
| `check-solver-sweep-result-contract.mjs` | 18 maintained workflows OK pre-batch | 18 maintained workflows OK post-batch | parity |
| `check-workflow-actions.mjs` | pass pre-batch | pass post-batch | parity |

No unexplained solved-set, report-completeness, UI, or workflow behavior change.

## 10. Residue and authority reconciliation

- Reconciliation mode: delta, against base SHA `493251801a9b9ea40da256f49b1b286f9124401c` (current `main` at batch start). Sufficient because no unrelated Phase 8-14 architecture work landed on `main` since the hardening-gate reconciliation, and this batch's rows are self-contained tool/doc renames.
- Target-occupancy: see Section 2 — clear for every canonical target in this batch.
- Legacy-term residue search (excluding `node_modules/`, `.git/`, `reports/`, `docs/archive/`, `data/`): `hint-path-oracle`, `cpsat-full-probe`, `cpsat-explicit-prefix-oracle`, `gha-result`/`gha:result`, `solver-shadow-eval-harness`, `interface-probe-harness`, `receptor` — all clean except the two authority docs (`naming-cleanup-plan.md`, `naming-cleanup-process-hardening.md`), which intentionally retain old-name prose as the historical mapping record (excluded from the surface-inventory tool's own reconciliation-authority-file set).
- Canonical-term search: confirmed present in every intended consumer (Section 6).
- Post-implementation `node scripts/naming-cleanup-surface-inventory-node-test.mjs`: passes; all 8A rows report `state=canonical-live` or `state=mixed-old-and-canonical` (the latter solely because of expected frozen-history/archive references, which the tool's own `reconciliationState()` logic treats as expected, not a defect).
- `npm run check:documentation-links`: passes (1338 files).
- Plan/ledger changes from newly discovered scope: the `cpsat-explicit-prefix-oracle-lib.mjs` companion file and the `repair-search.ts`/`repair-search.test.ts`/`stage-budget.ts` `receptor` comments were migrated as same-batch scope discovery (Section 1) — no new canonical target was invented, so this is recorded here rather than as a specification amendment.
- Intentional retained/frozen hits: `docs/archive/**`, `reports/**`, the `oracleLabel`/`oracleReason` JSON field family, and the `oracle-shards` workflow job id (all documented above).

No unclassified live hit remains in this batch's scope.

## 11. Pre-merge barrier

- [x] no predecessor batch exists for 8A (it is the first Phase-8 batch);
- [x] branch is current `main` plus only this batch's commits;
- [x] compared branch head against current `main` — clean fast-forward base;
- [x] intended diff is non-empty and original (no prior duplicate PR found);
- [x] no unrelated next-batch (8B+) implementation is stacked in this PR;
- [x] targeted validation green (Section 7);
- [x] required aggregate CI: `npm run check` (dead-scripts, text-source-files, lint, all `check:validators`), `npm run test:node` (53/53 scripts), and the full Vitest suite with coverage (`vitest run --coverage`, 105 files / 1325 tests, 0 failures) were all run directly in this session and are green — i.e. the full `npm run ci` composition (`check && test:coverage && test:node`) passes;
- [x] ledger IDs, risk, compatibility policy, and verification fields (updated in the same PR, see the ledger diff) match the evidence in this record;
- [x] all predecessor phases (1-7) are complete; the pre-Phase-8 hardening gate is `ready`;
- [x] no specification amendment is smuggled into this PR — the plan/ledger edits are notation-only (bold->backtick, retired-alias de-backtick) reflecting this batch's own implementation, not a change to any canonical target, compatibility lifetime, risk class, or batch assignment;
- [ ] PR description links this record — pending PR creation;
- [x] no unexplained solved-set, report-completeness, UI, or workflow behavior change (Section 9);
- [x] all 13 selected rows are `done` and `activeExecution` is reset to `idle` in this same commit set before merge;
- [x] this batch's own `batchCompletions["8A"]` entry remains `pending` (no PR/merge commit exists yet) until it actually merges.

## 12. Closure and merge handoff

| Item | Value |
| --- | --- |
| PR | pending |
| Final head SHA | pending (recorded at push time) |
| Merged? | no |
| Ledger rows closed | NC-P08-012, NC-P08-013, NC-P08-014, NC-P08-015, NC-P08-045, NC-P08-046, NC-P08-062, NC-P08-063, NC-P08-064, NC-P08-065, NC-P08-066, NC-P08-067, NC-P08-068 |
| Deferred/superseded rows | none deferred; `oracleLabel`/`oracleReason`/`oracle-shards` generated-identity residue noted as an out-of-scope discovery for a future row, not a deferred ledger row |
| Known structural-only surfaces | `.github/workflows/cpsat-explicit-prefix-reference.yml` (structural checks only, no live workflow run exercised this session); `scripts/stress/cpsat-reference-probe.py` (no `ortools` in this environment, syntax-checked only, matching its pre-existing CI coverage class) |

Batch 8B (known-solution-prefix survival family) must not start on this unmerged branch. The next batch's session must start from new current `main` after this PR merges, record this batch's merged PR/commit in ledger `batchCompletions["8A"]`, and only then claim 8B.

# Naming-cleanup Phase 8 batch 8E execution record

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 8 |
| Batch | 8E |
| Status | closeout |
| Base `main` SHA | `00640674ad1013c871456e5c94991045a8baef2f` (merge commit of batch 8D's PR #1589) |
| Branch | `claude/naming-cleanup-plan-nzv395` (restarted from new `main` after batch 8D merged) |
| PR | pending (not yet opened) |
| Selected ledger row IDs | NC-P08-016, NC-P08-017, NC-P08-043, NC-P08-044 |
| Reconciliation mode | delta (single-batch implementation session immediately following batch 8D's merge; no unrelated Phase 8-14 architecture landed on `main` in between) |
| Highest risk in batch | medium (NC-P08-016, NC-P08-043, NC-P08-044) |
| Primary compatibility owner | none (no dual-read row; workflow/file renames with `frozen-history` persistence on historical run identity, not a data-read boundary) |
| Canonical mappings | see Section 5.5/5.10 (atlas sweep tool/workflow -> collect-prune-gap-labels) of `naming-cleanup-plan.md` |
| Implementation agent/session | Claude Code remote session (this session) |
| Closeout auditor | same session (no fresh-session closeout was available; same limitation noted in batches 8A-8D) |

### Branch/PR authority preflight

- [x] searched open naming-cleanup PRs and similarly named branches — only this branch and `main` exist; PRs #1586-#1589 (8A-8D) are merged and closed, no other open naming-cleanup PR;
- [x] compared this branch against current `main` after the restart — `git checkout -B claude/naming-cleanup-plan-nzv395 origin/main` puts the branch exactly at `main`'s tip (`00640674...`), plus one small commit recording the 8D merge barrier before this batch's implementation began;
- [x] recovered/superseded relevant commits — none needed;
- [x] confirmed this is the only active implementation batch — ledger `activeExecution.status` was `idle` with `batch: null` before this session started batch 8E, and `batchCompletions["8D"].status` was `merged` (PR #1589, commit `00640674...`) before batch 8E's rows were touched;
- [x] confirmed the branch starts from the recorded current-`main` SHA above.

| Branch / PR | Unique relevant work? | Disposition |
| --- | --- | --- |
| `claude/naming-cleanup-plan-nzv395` (post-8D-merge state) | yes — this batch's implementation | active batch branch |

## 1. Scope, change envelope, and stop conditions

Batch 8E covers prune-gap labelled-branch collection: the atlas-sweep tool/workflow pair and the "branch atlas" -> "labelled branch set" term, per `docs/naming-cleanup-phase-records/phase-08.md`'s 8E scope row.

### Change envelope

**Intended observable deltas**

- `scripts/stress/atlas-sweep.mjs` -> `scripts/stress/collect-prune-gap-labels.mjs`; every self-referential comment, usage example, and console-log/summary-title label updated to the new identity (NC-P08-016).
- `.github/workflows/atlas-sweep.yml` -> `.github/workflows/collect-prune-gap-labels.yml`; its `name:`, `run-name:`, `concurrency.group`, job names, step names, artifact names (`atlas-sweep-shard-*` -> `collect-prune-gap-labels-shard-*`, `atlas-sweep-combined` -> `collect-prune-gap-labels-combined`), log directory path (`logs/atlas-sweep` -> `logs/collect-prune-gap-labels`), commit-message prefixes, and its own `--provenance-out` filename convention (`atlas-source-run-*` -> `collect-prune-gap-labels-source-run-*`) all updated (NC-P08-043, NC-P08-044).
- The term "branch atlas" -> "labelled branch set" propagated into every other live (non-frozen) surface discovered during the residue sweep: `scripts/stress/mc-neighbor-budget-soundness-check.mjs`, `scripts/stress/offline-replay-harness.mjs` (one prose mention; its `--atlas-dir` flag/variables are explicitly out of scope, see below), and `docs/solver-offline-replay-harness.md` (NC-P08-017).
- Cross-references updated in `.github/workflows/mitm-frontier-sweep.yml`, `.github/workflows/cpsat-hint-harvest-sweep.yml`, `scripts/stress/cpsat-hint-harvest-sweep.mjs`, `.github/workflows/README.md`, `scripts/check-solver-sweep-result-contract.mjs`, and `scripts/naming-cleanup-surface-inventory-node-test.mjs`.
- Two residual misses from batch 8A's "shadow-eval-harness" -> "offline-replay-harness" rename, discovered during this batch's broader residue sweep, fixed as in-batch scope discovery of that already-fixed mapping (not a new specification decision): `scripts/stress/cpsat-hint-harvest-sweep.mjs`'s "CLAUDE.md's shadow-eval-harness work" prose reference.

**Invariant observables**

- `prune-gap-probe.mjs` (the tool `collect-prune-gap-labels.mjs` spawns per level) is completely untouched, as its own header comment insists ("DELIBERATELY A THIN WRAPPER, NOT A REFACTOR") — confirmed by a real multi-level execution producing correctly-shaped output;
- the round-robin shard-selection logic (`selectEligibleAtlasLevels`, `selectShardByRoundRobin` from the untouched `lib/atlas-eligibility.mjs`) is unchanged;
- the workflow's job graph, `needs:` edges, matrix shard count (60), and concurrency semantics (`cancel-in-progress: false`) are unchanged — only display/identity strings were edited;
- no solver search behavior, work allocation, or corpus content changed anywhere in this batch.

**Out of scope / separate authorization**

- `scripts/stress/lib/atlas-eligibility.mjs` (filename, and its exported `selectEligibleAtlasLevels`/`selectShardByRoundRobin`/`selectUnharvestedCpsatLevels` function names) was **not** renamed. No ledger row targets this file; it is a shared dependency of both `collect-prune-gap-labels.mjs` and the unrelated `cpsat-hint-harvest-sweep.mjs`, and renaming it would be inventing new scope beyond NC-P08-016/017/043/044.
- `offline-replay-harness.mjs`'s `--atlas-dir` CLI flag, its `ATLAS_DIR`/`atlasFiles`/`atlas` internal variable names, and the generated `results.atlasDir` JSON field were **not** renamed: `--atlas-dir` is also independently implemented/documented by `scripts/stress/mc-crossing-slack-analysis.mjs`, and is demonstrated in the (frozen) `docs/archive/snapshots/solver-shadow-eval-harness-2026-08-20.md` and a dated report. NC-P08-017's own scope note says "Current docs/tool output" — read narrowly as prose/display text, not a mandate to rename a real, multi-tool, generated-field-carrying CLI interface. This mirrors the `atlas-abstain` format-value exclusion recorded in batch 8B's record and the `--seed` string exclusion in batch 8C's record: a functional persisted interface is a separate Section 3.2 migration, not covered by a `kind: term` row.
- the backfill job's artifact-download `pattern: collect-prune-gap-labels-shard-*` (updated to match all *future* runs) means backfilling from a run dispatched *before* this PR merges (which would have produced `atlas-sweep-shard-*`-named artifacts) would need a manual pattern override. This is a rare, manually-triggered admin path not exercised by CI; recorded here for visibility rather than solved with a compatibility read, consistent with the plan's own "old workflow runs/artifacts remain historical" instruction for this batch.

No behavior/resource-policy change, ambiguous historical identity, unowned compatibility boundary, unidentifiable live consumer, or superseding architecture was discovered. No stop condition was triggered.

## 2. Pre-edit impact map

Commands run:

```sh
npm run naming:status
grep -rln <old-term> . (excluding node_modules/.git/reports/docs-archive/data/.solver-tools/.cache/coverage, per term: "atlas-sweep", "branch atlas")
```

`npm run naming:status` confirmed Phase 8 gate `ready`, `activeExecution.status: idle`, `batchCompletions["8D"].status: merged`, and batch 8E next with all 4 rows `verification.surfaceInventory: done` already and every other verification dimension `pending`.

Before touching `offline-replay-harness.mjs`'s "branch atlas" mention, grepped for every other user of `--atlas-dir` and found `mc-crossing-slack-analysis.mjs` as an independent implementor of the same flag name — this is what drove the Out-of-scope decision above, made *before* editing.

### Target occupancy / collision check

| Canonical target | Existing live use? | Same concept / unrelated / collision / already migrated | Disposition |
| --- | --- | --- | --- |
| `scripts/stress/collect-prune-gap-labels.mjs` | no | n/a | clear |
| `.github/workflows/collect-prune-gap-labels.yml` | no | n/a | clear |
| workflow display/concurrency/artifact identity `collect-prune-gap-labels*` | no | n/a | clear |

No canonical target was occupied by a materially different live concept.

### Contract-migration matrix

| Surface | Classification | Concrete locations | Evidence / planned test |
| --- | --- | --- | --- |
| Definition / producer | migrate | `atlas-sweep.mjs`, `atlas-sweep.yml` | `git mv` + content edits, see Section 6 |
| Internal direct consumers | migrate | `mitm-frontier-sweep.yml`, `cpsat-hint-harvest-sweep.yml`, `cpsat-hint-harvest-sweep.mjs`, `mc-neighbor-budget-soundness-check.mjs`, `offline-replay-harness.mjs`, `solver-offline-replay-harness.md`, `.github/workflows/README.md`, `check-solver-sweep-result-contract.mjs`, `naming-cleanup-surface-inventory-node-test.mjs` | grep-verified zero residue outside frozen/archive/authority-docs/deliberately-retained `--atlas-dir` interface (Section 10) |
| Canonical parser / normalizer | not applicable | none | n/a |
| Sequential transport | not applicable | the tool spawns `prune-gap-probe.mjs` via `child_process`, unchanged | n/a |
| Alternate worker/race transport | not applicable | none | n/a |
| Serialized writer | migrate | workflow artifact names, log directory path, `--provenance-out` filename convention | real workflow-structural checks pass (Section 7); actual GHA dispatch not exercised (out of scope for local validation, matches pre-batch coverage class) |
| Historical reader / fixture | retained/frozen | `reports/stress/prune-gap-*.json` (unchanged filename convention, still written by the untouched `prune-gap-probe.mjs`), dated `reports/*.md`, `docs/archive/snapshots/solver-shadow-eval-harness-2026-08-20.md`'s `--atlas-dir` example, past GHA run artifacts named `atlas-sweep-shard-*`/`atlas-sweep-combined` | left unchanged, confirmed by reconciliation grep |
| Report/export projection | not applicable | none | n/a |
| Analyzer/grouping consumers | not applicable | none | n/a |
| CLI / package alias | not applicable | neither `atlas-sweep.mjs` nor the workflow ever had a package.json alias | n/a |
| Workflow command/inputs/outputs | migrate | `.github/workflows/collect-prune-gap-labels.yml`'s `name`/`run-name`/`concurrency`/job-names/step-names/artifact-names/log-paths/commit-messages | `check-workflow-actions.mjs` and `check-solver-sweep-result-contract.mjs` pass; YAML re-parses (Section 7) |
| Artifact/concurrency/cache/path identifiers | migrate | see Workflow row above | same evidence |
| Hint/provenance storage | not applicable | none of these rows touch hint provenance storage | n/a |
| Application/UI/editor consumer | not applicable | none of these tools are UI-consumed | n/a |
| Current docs/examples | migrate | `.github/workflows/README.md`, `docs/solver-offline-replay-harness.md` | grep-verified (Section 10) |
| Frozen historical evidence | retained/frozen | `reports/stress/prune-gap-*.json`, `docs/archive/**`, dated `reports/*.md`, past GHA run artifacts under the old naming | unchanged; confirmed no mass rewrite |

## 3. Validation topology

| Surface | Real runtime/path | Existing coverage | Coverage class | Gap/action |
| --- | --- | --- | --- | --- |
| `collect-prune-gap-labels.mjs` | native/bundled Node via `run-bundled.mjs`, spawning `prune-gap-probe.mjs` per level | no dedicated node-test; workflow-path-structural-only per surface inventory | structural | ran a **real 3-level execution** in this session (`--levels=pos:1-3`), exercising the actual spawn/orchestration/output-write path; unchanged from pre-batch coverage class going forward |
| `.github/workflows/collect-prune-gap-labels.yml` | GitHub Actions workflow | `check-workflow-actions.mjs`, `check-solver-sweep-result-contract.mjs` (both structural) | structural | both structural checks pass; full GHA dispatch is out of scope for a local batch (unchanged from pre-batch coverage) |
| "branch atlas" term propagation | n/a (documentation/comments) | `check:documentation-links` (docs only) | structural (docs); direct (real execution proves the code comments' surrounding logic is unaffected) | passes (Section 10) |

## 4. Compatibility and frozen-history ownership

No row in this batch is `persistence: dual-read`. NC-P08-017, NC-P08-043, and NC-P08-044 are `persistence: frozen-history` (the term/workflow renames themselves, not a data-read boundary) with no `compatibility` object required per the ledger schema — historical GHA run identities and their artifacts remain under their original `atlas-sweep*` names, untouched.

| Row ID | Legacy form | Canonical form | Mode / retireWhen | Owning boundary | Frozen artifacts unchanged |
| --- | --- | --- | --- | --- | --- |
| NC-P08-016 | `atlas-sweep.mjs` | `collect-prune-gap-labels.mjs` | n/a (direct rename, no persisted-data boundary) | n/a | yes |
| NC-P08-017 | "branch atlas" (term) | "labelled branch set" (term) | `frozen-history` persistence | n/a | yes — dated reports/archived snapshots retain "atlas" wording |
| NC-P08-043 | `.github/workflows/atlas-sweep.yml` | `.github/workflows/collect-prune-gap-labels.yml` | `frozen-history` persistence (historical run identity) | n/a | yes — past GHA runs under the old workflow filename/display name are untouched |
| NC-P08-044 | workflow atlas-sweep display/concurrency | collect-prune-gap-labels | `frozen-history` persistence | n/a | yes — historical run identities remain, per the row's own note |

### 4.1 High-risk rollback plan

No row in this batch is `risk: high`, and none are dual-read. Rollback is a trivial revert of the batch commit(s); no persisted data or compatibility alias depends on either spelling. The one operational nuance (Section 1's backfill-pattern note) does not affect rollback — reverting simply restores the old artifact-pattern match for both directions symmetrically.

## 5. Before-change baseline

This batch is `medium` risk at most and behavior-preserving by construction (renames/comment/display-string edits only; the spawned `prune-gap-probe.mjs` and shard-selection library are completely untouched). Baselines captured:

| Command / fixture | Before result / fingerprint |
| --- | --- |
| `node scripts/run-bundled.mjs scripts/stress/atlas-sweep.mjs -- --levels=pos:1-3 --out-dir=<tmp>` (pre-rename equivalent, verified post-rename instead since the tool has no behavior-affecting change) | N/A — parity established by running the renamed tool post-edit and confirming correct per-level `prune-gap-*.json` output (Section 7) |
| `node scripts/check-workflow-actions.mjs` / `node scripts/check-solver-sweep-result-contract.mjs` pre-edit | both passed before this batch (unrelated to this batch's specific workflow, but establish the general structural-validation baseline that must keep passing) |

Behavioral parity for the term-only rows (NC-P08-017) and the workflow-display-only rows (NC-P08-043/044, beyond the structural checks) is established by the real tool execution and structural checks above: no `prune-gap-*.json` output shape, job graph, or dispatch semantics changed.

## 6. Implementation log

- Renamed `scripts/stress/atlas-sweep.mjs` -> `scripts/stress/collect-prune-gap-labels.mjs`; updated its header comment (including "branch atlas" -> "labelled branch set" and every workflow filename cross-reference), usage example, and every console-log/summary-title self-reference (`atlas-sweep:` -> `collect-prune-gap-labels:`, `# atlas-sweep shard summary` -> `# collect-prune-gap-labels shard summary`, `atlas-sweep done:` -> `collect-prune-gap-labels done:`, "produced an atlas file" -> "produced a labelled branch file").
- Renamed `.github/workflows/atlas-sweep.yml` -> `.github/workflows/collect-prune-gap-labels.yml`; updated `name:`, `run-name:`, `concurrency.group`, every job/step name, the script invocation path, the log directory (`logs/atlas-sweep` -> `logs/collect-prune-gap-labels`), every artifact name (`atlas-sweep-shard-*` -> `collect-prune-gap-labels-shard-*`, `atlas-sweep-combined` -> `collect-prune-gap-labels-combined`), the `--provenance-out` filename convention, and both commit-message prefixes (sweep and backfill jobs).
- Updated cross-references in `.github/workflows/mitm-frontier-sweep.yml`, `.github/workflows/cpsat-hint-harvest-sweep.yml` (4 mentions), `scripts/stress/cpsat-hint-harvest-sweep.mjs` (2 mentions plus the incidental "shadow-eval-harness" residual fix), `.github/workflows/README.md`, `scripts/check-solver-sweep-result-contract.mjs`, and `scripts/naming-cleanup-surface-inventory-node-test.mjs`.
- Propagated the "branch atlas" -> "labelled branch set" term into `scripts/stress/mc-neighbor-budget-soundness-check.mjs`, `scripts/stress/offline-replay-harness.mjs` (one prose mention only — its `--atlas-dir` CLI interface is explicitly out of scope, Section 1), and `docs/solver-offline-replay-harness.md`.
- Fixed a residual "shadow-eval-harness" (pre-rename term) mention in `scripts/stress/cpsat-hint-harvest-sweep.mjs`, discovered by a broader case-insensitive sweep for that already-fixed batch-8A mapping while investigating this batch's own scope — same class of scope discovery as batch 8B's "Receptors" fix.
- Updated `docs/naming-cleanup-plan.md` notation for this batch's own rows, and additionally fixed two already-implemented rows from batch 8A (the `cpsat-explicit-prefix-oracle.yml` / "oracle" display mapping in the Section 5.10 table) that had been left in stale "current" notation since that batch — a small consistency cleanup discovered while editing the same table for this batch's own rows.

## 7. Targeted contract validation

| Command / test | Boundary proved | Result |
| --- | --- | --- |
| `node -c scripts/stress/collect-prune-gap-labels.mjs` | script parses | pass |
| `python3 -c "import yaml; yaml.safe_load(...)"` on all 3 edited workflow YAML files | edited YAML remains well-formed | pass |
| `npx eslint <all touched .mjs files>` | lint over every edited script | pass, 0 findings |
| `node scripts/check-workflow-actions.mjs` | workflow action pins, literal path filters, and local entrypoints (including the renamed workflow file) are still valid | pass |
| `node scripts/check-solver-sweep-result-contract.mjs` | the renamed workflow still requests the standard `solver-sweep-result` artifact contract | pass, "18 maintained workflows" |
| `node scripts/run-bundled.mjs scripts/stress/collect-prune-gap-labels.mjs -- --levels=pos:1-3 --out-dir=<tmp>` | real 3-level execution: spawns `prune-gap-probe.mjs` per level (unchanged), writes `prune-gap-<id>.json`, prints the renamed self-referential summary label | pass — 3/3 levels produced a correctly-shaped labelled-branch file (`ModuleNotFoundError: No module named 'ortools'` inside the spawned CP-SAT sub-probe is a pre-existing environment limitation — no `ortools` installed in this session — identical for the pre-rename script, not a regression) |
| `node scripts/naming-cleanup-surface-inventory-node-test.mjs` | Phase-8 surface-inventory classification stays internally consistent after the rename | pass |
| `npm run check:documentation-links` | every link/path in current docs resolves to a real, live target | pass, 1342 Markdown files |
| `npm run check` (dead-scripts, text-source-files, lint, all `check:validators`) | full repository check suite | pass |
| `npm run test:node` | full 53-script aggregate Node-test graph | pass, 53/53 |
| `npx vitest run --coverage` | full unit suite unaffected by this batch's comment/rename-only edits | pass, 105 files / 1325 tests |

## 8. Consumer-inward closeout audit

Same-session audit (no separate fresh agent was available in this environment, same limitation noted in batches 8A-8D).

- package commands and surfaced CLIs: neither `atlas-sweep.mjs` nor its workflow ever had a `package.json` alias; nothing to update there.
- workers/raced execution: not applicable — this tool spawns a child process (`prune-gap-probe.mjs`) via `execFileSync`, exercised for real in Section 7.
- workflows and exact-case targets: `check-workflow-actions.mjs` passes; the renamed workflow file re-parses as valid YAML; every job/step/artifact identity inside it was grep-verified consistent.
- generated-data readers/writers/analyzers: `reports/stress/prune-gap-*.json`'s own filename convention (produced by the untouched `prune-gap-probe.mjs`) is unaffected; `offline-replay-harness.mjs`'s real consumption of that data (via its own untouched `--atlas-dir`/`ATLAS_DIR` mechanism) was specifically checked and confirmed unaffected.
- current docs/reproduction commands: `check:documentation-links` passes; `.github/workflows/README.md` and `docs/solver-offline-replay-harness.md` cross-references grep-verified updated.
- application/UI/editor consumer: not applicable, none of these are UI-consumed.
- historical compatibility paths: `docs/archive/**`, `reports/**`, and past GHA run artifacts under the old `atlas-sweep*` naming were grepped/considered and confirmed untouched.

Findings: none outstanding within this batch's scope. Two items explicitly deferred/out of scope, recorded in Section 1: `lib/atlas-eligibility.mjs`'s own naming (no row authorizes it) and `offline-replay-harness.mjs`'s `--atlas-dir` CLI/generated-field interface (a separate, multi-tool persisted interface).

## 9. Behavioral/evidence parity

| Observable | Before | After | Parity |
| --- | --- | --- | --- |
| `collect-prune-gap-labels.mjs` 3-level real execution | (tool unrenamed; logic identical) | 3/3 levels produced correctly-shaped `prune-gap-<id>.json` output; spawn/orchestration path exercised | parity — no logic changed, confirmed by direct execution |
| `check-workflow-actions.mjs` | pass pre-batch | pass post-batch | parity |
| `check-solver-sweep-result-contract.mjs` | "18 maintained workflows" pre-batch | "18 maintained workflows" post-batch | parity |
| full unit/coverage suite | 105 files / 1325 tests passing pre-batch | 105 files / 1325 tests passing post-batch | parity |

No unexplained solved-set, report-completeness, UI, or workflow behavior change.

## 10. Residue and authority reconciliation

- Reconciliation mode: delta, against base SHA `00640674ad1013c871456e5c94991045a8baef2f` (current `main` immediately after batch 8D's merge). Sufficient because no unrelated Phase 8-14 architecture work landed on `main` between the 8D merge and this batch's implementation, and this batch's rows are self-contained tool/workflow/term renames.
- Target-occupancy: see Section 2 — clear for every canonical target in this batch.
- Legacy-term residue search (excluding `node_modules/`, `.git/`, `reports/`, `docs/archive/`, `data/`, `.solver-tools/`, `.cache/`, `coverage/`): `atlas-sweep`, and a case-insensitive `branch atlas` sweep — both fully clean outside the authority docs (intentional historical mapping record).
- This same broader sweep also caught (and this batch fixed) the residual "shadow-eval-harness" mention in `cpsat-hint-harvest-sweep.mjs` left over from batch 8A, and two stale "current"-notation table rows in `naming-cleanup-plan.md` left over from batch 8A — both recorded above as scope discovery of already-fixed mappings, not new specification decisions.
- Canonical-term search: confirmed present in every intended consumer (Section 6).
- Post-implementation `node scripts/naming-cleanup-surface-inventory-node-test.mjs`: passes.
- `npm run check:documentation-links`: passes.
- Plan/ledger changes from newly discovered scope: none required a specification amendment. The `--atlas-dir` interface exclusion and the `atlas-eligibility.mjs` exclusion are documented scope decisions made *before* implementation (Section 2), not surprises found afterward.
- Intentional retained/frozen hits: `docs/archive/**`, `reports/**`, past GHA run artifacts under the old naming, the `--atlas-dir` CLI/generated-field interface, and `lib/atlas-eligibility.mjs`'s own naming (all documented above).

No unclassified live hit remains in this batch's scope.

## 11. Pre-merge barrier

- [x] predecessor batch 8D's `batchCompletions` entry recorded the real merged PR/commit (PR #1589, `00640674ad1013c871456e5c94991045a8baef2f`) before this batch was claimed;
- [x] branch is current `main` (post-8D-merge) plus only this batch's commits;
- [x] compared branch head against current `main` — clean, no drift;
- [x] intended diff is non-empty and original (no prior duplicate PR found);
- [x] no unrelated next-batch (8F+) implementation is stacked in this PR;
- [x] targeted validation green (Section 7);
- [x] required aggregate CI: `npm run check`, `npm run test:node`, and the full Vitest suite with coverage were all run directly in this session and are green;
- [x] ledger IDs, risk, compatibility policy, and verification fields (updated in the same PR) match the evidence in this record;
- [x] all predecessor phases (1-7) are complete; batches 8A-8D are merged;
- [x] no specification amendment is smuggled into this PR — all edits implement the already-fixed Section 5.5/5.10 mappings, plus documented scope exclusions (`--atlas-dir` interface, `atlas-eligibility.mjs`) and in-batch scope discovery of already-fixed mappings, not a change to any canonical target, compatibility lifetime, risk class, or batch assignment;
- [ ] PR description links this record — pending PR creation;
- [x] no unexplained solved-set, report-completeness, UI, or workflow behavior change (Section 9);
- [x] all 4 selected rows are `done` and `activeExecution` is reset to `idle` in this same commit set before merge;
- [x] this batch's own `batchCompletions["8E"]` entry remains `pending` (no PR/merge commit exists yet) until it actually merges.

## 12. Closure and merge handoff

| Item | Value |
| --- | --- |
| PR | pending |
| Final head SHA | pending (recorded at push time) |
| Merged? | no |
| Ledger rows closed | NC-P08-016, NC-P08-017, NC-P08-043, NC-P08-044 |
| Deferred/superseded rows | none deferred; the `--atlas-dir` interface and `atlas-eligibility.mjs` exclusions are documented in-batch scope decisions, not deferred ledger rows |
| Known structural-only surfaces | `collect-prune-gap-labels.yml`'s full GHA dispatch remains structurally-validated-only (workflow lint/contract checks), matching its pre-batch coverage class; the tool script itself gained real multi-level execution evidence in this batch |

Batch 8F (variant-family dataset, the highest-risk remaining Phase-8 batch due to external env-var compatibility) must not start on this unmerged branch. The next batch's session must start from new current `main` after this PR merges, record this batch's merged PR/commit in ledger `batchCompletions["8E"]`, and only then claim 8F.

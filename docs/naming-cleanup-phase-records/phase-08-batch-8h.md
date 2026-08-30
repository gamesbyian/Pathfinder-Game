# Naming-cleanup Phase 8 batch 8H execution record

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 8 |
| Batch | 8H (final Phase-8 batch) |
| Status | closeout |
| Base `main` SHA | `becf26b75418c42c9ee34499662c9d9c4ed9e2f4` (merge commit of batch 8G's PR #1594) |
| Branch | `claude/naming-cleanup-plan-nzv395` (restarted from new `main` after batch 8G merged) |
| PR | pending (not yet opened) |
| Selected ledger row IDs | NC-P08-007, NC-P08-008, NC-P08-009, NC-P08-011, NC-P08-020 |
| Reconciliation mode | delta (single-batch implementation session immediately following batch 8G's merge; no unrelated architecture landed on `main` in between) |
| Highest risk in batch | low (all 5 rows `risk: low`); the batch's real work was scoping discipline, not mechanical risk |
| Primary compatibility owner | none — every row is `persistence: frozen-history` with no `compatibility` object; these are exported-API/current-doc renames with no dual-read boundary |
| Canonical mappings | Section 4.11 ("Profile, fingerprint, family, lineage, residual") and Section 5.5 ("winning-path archaeology" -> "winning-path analysis") of `naming-cleanup-plan.md` |
| Implementation agent/session | Claude Code remote session (this session), assisted by a dedicated Explore sub-agent for the exported-API sweep (Section 2) |
| Closeout auditor | same session (no fresh-session closeout was available; same limitation noted in batches 8A-8G) |

### Branch/PR authority preflight

- [x] searched open naming-cleanup PRs and similarly named branches — only this branch and `main` exist; PRs #1586-#1594 (8A-8G) are merged and closed, no other open naming-cleanup PR;
- [x] compared this branch against current `main` after the restart — `git checkout -B claude/naming-cleanup-plan-nzv395 origin/main` puts the branch exactly at `main`'s tip (`becf26b7...`), plus one small commit recording the 8G merge barrier before this batch's implementation began;
- [x] recovered/superseded relevant commits — none needed;
- [x] confirmed this is the only active implementation batch — ledger `activeExecution.status` was `idle` with `batch: null` before this session started batch 8H, and `batchCompletions["8G"].status` was `merged` (PR #1594, commit `becf26b7...`) before batch 8H's rows were touched;
- [x] confirmed the branch starts from the recorded current-`main` SHA above.

| Branch / PR | Unique relevant work? | Disposition |
| --- | --- | --- |
| `claude/naming-cleanup-plan-nzv395` (post-8G-merge state) | yes — this batch's implementation | active batch branch |

## 1. Scope, change envelope, and stop conditions

Batch 8H is the "remaining low-risk semantic qualification sweep" described in `phase-08.md`: qualifying "naked" (unqualified, ambiguous) uses of `profile`/`fingerprint`/`family`/`residual` in current exported APIs, plus the "winning-path archaeology" -> "winning-path analysis" term. Unlike every prior Phase-8 batch, these five rows are **abstract term categories**, not single old->new string pairs — the actual work was finding every genuine live instance across the whole current (non-frozen) codebase, then exercising careful judgment about which instances are truly ambiguous exported API surface (in scope) versus type-disambiguated internals, persisted production state, or a distinct concept that doesn't cleanly fit the row's own stated canonical forms (out of scope, documented rather than guessed at).

### Change envelope

**Intended observable deltas**

- `scripts/stress/winning-path-archaeology.mjs` -> `scripts/stress/winning-path-analysis.mjs` (NC-P08-020): the term row's own self-identity is this exact tool's filename, header title, and every self-referential console-log string — renamed directly as the term row's own live surface (same treatment as batch 8A's `hint-path-oracle.mjs` and batch 8E's `atlas-sweep.mjs`, not new scope). `scripts/tooling-lifecycle.json`'s key for this file updated to match (a live lifecycle registry consumed by `check:dead-scripts`, not frozen history).
- `modules/solver/operational-research-types.d.ts`'s `OrderingResearchPolicy.profile` -> `scoringProfile` and `OrderingResearchRecord.family` -> `searchFamily` (NC-P08-007/009): a self-contained research-instrumentation `.d.ts` module augmentation with exactly 6 consumers, all updated in this same PR (`modules/solver/scoring.ts`, `modules/solver/scoring.test.ts`, `modules/solver/admissible-order-search.ts`, `modules/solver/admissible-order-search.test.ts`, `scripts/paired-deterministic-trace.mjs`, `scripts/method-probe.mjs`). `searchFamily` matches an established local convention already used verbatim in `scripts/technique-operational-similarity.mjs` for the identical "DFS/beam/repair mechanism family" concept.
- `scripts/import-published-levels.mjs`'s naked `export function fingerprint(level)` -> `levelFingerprint` (NC-P08-008): a standalone dev/import-tool function, one consumer (`scripts/import-published-levels-unit-tests.mjs`, updated in the same PR).
- `scripts/stress/elite-prefix-dfs-ab.mjs`'s generated `buildFlipRecord` output field `profile` -> `scoringProfile` (NC-P08-007, scope-discovery — same "naked profile" concept, found by the Explore agent's sweep): a SCRATCH TOOL (its own header says so) with no persisted default output path; its one test (`elite-prefix-dfs-ab-node-test.mjs`) updated in the same PR, including its explanatory header comment.
- `scripts/stress/solution-profile-lib.mjs`'s `nearestProfiles(candidate, pool, topK)` pool-entry contract `{ id, profile }` -> `{ id, solutionProfile }` (NC-P08-007, scope-discovery): matches the file's own established `buildLevelSolutionProfile`/`buildSinglePathProfile`/`buildBucketProfile` naming convention. Both call sites updated: `scripts/stress/solution-profile-compare.mjs` (the `loadPool`/`buildTargetProfile`/`main` chain) and the library's own unit test.
- Current-doc closeout in `docs/naming-cleanup-plan.md`: Section 4.11 gained a paragraph recording exactly what was qualified and what was explicitly left out of scope (with rationale); Section 5.5's "winning-path archaeology" row got the standard "former X -> Y (implemented by batch 8H)" treatment; Section 3's standing case-sensitivity-audit example paragraph (about the now-renamed former `audit-export.yml`, itself already resolved by batch 8G) was left as batch 8G recorded it — not touched again here.

**Invariant observables**

- `winning-path-analysis.mjs`'s actual measurement logic (candidate scoring, cold-solve bucketing, rank/scoreGap computation) is completely unchanged; verified by a real execution against 2 corpus-2 levels producing correctly-shaped, sensible output.
- `scoring.ts`/`admissible-order-search.ts`'s actual scoring/ranking/ordering logic is completely unchanged — only the `OrderingResearchPolicy`/`OrderingResearchRecord` instrumentation-observer field names changed, and this observer is research-only, absent in production (see the type's own `PrepLevel._orderingResearchObserver?` doc comment: "Absent in production; receives copied scalar rankings only and cannot alter candidate arrays or search decisions"). Verified by the full `scoring.test.ts`/`admissible-order-search.test.ts` suites passing unchanged (26/26) and a full `tsc --noEmit` pass.
- `import-published-levels.mjs`'s fingerprint computation itself (`getLevelFingerprintSource`) is untouched — only the wrapping function's name changed. Verified by its full unit-test suite passing (19/19).
- `elite-prefix-dfs-ab.mjs`'s A/B methodology (on/off repair comparison) is untouched — only the returned record's field name changed. Verified by its dedicated regression test passing.
- `solution-profile-compare.mjs`'s nearest-neighbor distance computation is untouched — only the pool-entry field name changed. Verified by a **real execution** against the committed `reports/stress/solution-profile-published.json` library, producing a correctly-ranked, correctly-shaped result identical in kind to the tool's own documented contract.

**Out of scope / separate authorization**

Three categories of genuinely naked identifiers were found and deliberately NOT touched, each with a documented reason (all discovered *before* implementation, via a dedicated Explore sub-agent's exhaustive sweep — not surprises found afterward):

- **The ~10 core solver functions' `profile: ScoringProfile` positional parameter names** (`scoreMove`, `scoreAndSort`, `dfsFromGateLDS`, `beamSearchFromGate`, `elitePrefixDfsRepair`, `repairSearchFromGate`, `runAttemptSearch`, `runRepairRestartVsContinuation`, `buildCurUrgencyContext`, `__buildFreshCurUrgencyContextForTests` — spanning `modules/solver/scoring.ts`, `search.ts`, `repair-search.ts`, `attempt-dispatch.ts`, `restart-continuation-harness.ts`). These are positional parameters (renaming them changes no caller since JS/TS positional calls don't reference parameter names), already disambiguated by their `ScoringProfile` type annotation at every declaration, and collectively touch the hottest path in the entire solver across dozens of call sites. A "low risk" batch qualifying ambiguous naked identifiers should not rewrite parameter names throughout production-critical hot-path code for a purely cosmetic gain the type annotation already provides. The row's own note ("Use scoringProfile/solutionProfile **as appropriate**") is read as licensing this restraint.
- **The application/Firestore-persistence `fingerprint` cluster** — `modules/input/submission-core.ts`, `modules/state-slices.ts` (`LevelRatingState.fingerprint`), `modules/state/actions/rating-actions.ts`, `modules/ports.ts`, `modules/data.ts`, `modules/dev-corpus.ts`, and `modules/persistence/{local-level-hints-repository,level-rating-repository,review-repository,level-submission-repository}.ts` — roughly 25 files. This is real production application state, not research/solver tooling: `level-rating-repository.ts` uses the fingerprint value as a literal Firestore **document ID** (`doc(ratings(), fingerprint)`), and `level-submission-repository.ts` already separately uses `levelFingerprint` as an actual Firestore **query field name** distinct from the local bare-named variables. Migrating this cluster is a genuine Section 3.2 persisted-identity concern (real Firestore documents, not in-memory research data) requiring its own dedicated, separately-authorized migration record — not a fit for a "low risk" sweep batch.
- **`KnownSolutionLabel`/`PrefixSupport`/`PrefixMatch`'s `family`/`families`/`familyIds` fields** on `modules/solver/known-solution-prefix-survival.ts`'s `KnownSolutionPrefixIndex` (consumed by 4 files including the testing API). This describes a **structurally-similar-solution-path grouping** concept (from `structuralSolutionFamilySignature`) — distinct from levels, attempts, and DFS/beam/repair/admissible-order search mechanisms, so none of the three canonical forms the row's own notes list (`levelFamily`/`attemptFamily`/`searchFamily`) is a clean fit. Per Section 0.4's "scope discovery vs. specification amendment" rule, inventing a new canonical form (e.g. `solutionFamily`) not present in the plan is a specification amendment, not something this batch may freelance.

No behavior/resource-policy change, ambiguous historical identity, unowned compatibility boundary, or unidentifiable live consumer was discovered beyond the three documented exclusions above. No stop condition was triggered.

## 2. Pre-edit impact map

Commands run directly:

```sh
npm run naming:status
grep -rnE '\bprofile\b' modules scripts --include="*.ts" --include="*.mjs" -i   # 274 raw hits, confirming a targeted rather than blanket sweep was needed
grep -rnE '\b(export\s+(const|function|type|interface|class)\s+)(profile|fingerprint|family|residual)\b' modules scripts -i
grep -rlE '\bresidual\b' modules scripts --include="*.ts" --include="*.mjs" -i   # no naked exported field found
grep -rn "searchFamily" modules scripts   # confirmed the existing local convention in technique-operational-similarity.mjs
grep -rln "winning-path archaeology" .   # located the tool + dated reports
```

Given the scale of a plain word-boundary search for common English words across the whole codebase, a dedicated Explore sub-agent was launched to do the exhaustive, careful search for genuinely naked *exported/public* API surface only (not prose, not internal-only locals) across `modules/` and `scripts/`, per an explicit scope brief matching this row's own canonical-forms list. Its full findings are summarized in Section 1's "Out of scope" list and this section's contract-migration matrix; its report also independently re-confirmed the `OrderingResearchPolicy`/`OrderingResearchRecord` fix already in progress on disk at the time it ran (no residue), and confirmed zero naked `residual` in any exported declaration.

### Target occupancy / collision check

| Canonical target | Existing live use? | Same concept / unrelated / collision / already migrated | Disposition |
| --- | --- | --- | --- |
| `scripts/stress/winning-path-analysis.mjs` | no | n/a | clear |
| `OrderingResearchPolicy.scoringProfile` | no | n/a | clear |
| `OrderingResearchRecord.searchFamily` | yes — same string already used identically in `scripts/technique-operational-similarity.mjs` for the same DFS/beam/repair mechanism-family concept | same concept, independent declaration (not a shared type) | clear, and reinforces this is the right canonical name |
| `scripts/import-published-levels.mjs`'s `levelFingerprint` | no | n/a | clear |
| `elite-prefix-dfs-ab.mjs`'s `scoringProfile` field | no | n/a | clear |
| `solution-profile-lib.mjs`'s `{ id, solutionProfile }` contract | yes — `solutionProfile` already used as a field name throughout `scripts/family-boundary-lib.mjs` for an unrelated (family-boundary) but conceptually identical "solution profile" idea | same concept, independent contract | clear |

No canonical target was occupied by a materially different live concept.

### Contract-migration matrix

| Surface | Classification | Concrete locations | Evidence / planned test |
| --- | --- | --- | --- |
| Definition / producer | migrate | `winning-path-archaeology.mjs` (rename), `operational-research-types.d.ts` (2 field renames), `import-published-levels.mjs` (function rename), `elite-prefix-dfs-ab.mjs` (field rename), `solution-profile-lib.mjs` (contract rename) | `git mv` + content edits, see Section 6 |
| Internal direct consumers | migrate | 6 files for the `OrderingResearch*` fields; 1 file for `levelFingerprint`; 1 file for `elite-prefix-dfs-ab`'s field; 2 files for `solutionProfile`; `scripts/tooling-lifecycle.json` | grep-verified zero residue outside frozen/dated-report/documented-exclusion zones (Section 10) |
| Canonical parser / normalizer | not applicable | none | n/a |
| Sequential transport | not applicable | none of these rows touch transport | n/a |
| Alternate worker/race transport | not applicable | none | n/a |
| Serialized writer | migrate, with a caution documented | `solution-profile-compare.mjs`'s `ensureFreshLibrary`/`regenerateCorpusProfile` auto-refresh path was triggered incidentally by this batch's own real-execution validation (Section 5) — the resulting regenerated `reports/stress/solution-profile-published{,-summary}.{json,md}` were reverted before commit; this batch's actual code change does not itself write any new persisted shape | real execution confirmed the renamed contract still round-trips correctly end-to-end before the incidental regeneration was reverted |
| Historical reader / fixture | retained/frozen | dated `reports/2026-08-06-winning-path-archaeology.md` and 3 other dated reports mentioning it; `docs/naming-cleanup-phase-records/phase-08-batch-8b.md`'s own historical execution-log mention of the pre-rename filename | left unchanged, confirmed by reconciliation grep |
| Report/export projection | not applicable | none of these rows generate a new committed report shape | n/a |
| Analyzer/grouping consumers | not applicable | `KnownSolutionLabel.family`/`families` consumer (`known-solution-prefix-survival.ts` and its 4 consumers) explicitly out of scope (Section 1) | n/a |
| CLI / package alias | not applicable | none of these 5 rows have a package.json alias of their own (the tools they touch either have no alias at all, or their alias/filename pairing was already handled by an earlier batch) | n/a |
| Workflow command/inputs/outputs | not applicable | none of these rows touch a workflow file | n/a |
| Artifact/concurrency/cache/path identifiers | not applicable | none | n/a |
| Hint/provenance storage | not applicable | none of these rows touch hint provenance storage | n/a |
| Application/UI/editor consumer | explicitly out of scope | the application/Firestore `fingerprint` cluster (Section 1) | documented exclusion, not touched |
| Current docs/examples | migrate | `docs/naming-cleanup-plan.md` Section 4.11 and Section 5.5 | grep-verified (Section 10); no other current doc referenced "naked profile"/"naked fingerprint"/etc. by that phrasing |
| Frozen historical evidence | retained/frozen | dated `reports/**`, `docs/archive/**` | unchanged; confirmed no mass rewrite |
| Out-of-batch validator sync | mechanical update only | `docs/naming-cleanup-level-metric-boundaries.json` (Phase-13 prep, unrelated scope, same recurring mechanical-sync need as batches 8F/8G) | `check:level-metric-boundaries` passes after a pure file-rename sync, no classification judgment made |

## 3. Validation topology

| Surface | Real runtime/path | Existing coverage | Coverage class | Gap/action |
| --- | --- | --- | --- | --- |
| `winning-path-analysis.mjs` | native/bundled Node, real solver calls | no dedicated node-test | structural/manual | ran a **real execution** against 2 corpus-2 levels; correctly-shaped output, sensible rank/scoreGap values; unchanged from pre-batch coverage class |
| `OrderingResearchPolicy`/`OrderingResearchRecord` fields | native TS, has dedicated tests | `scoring.test.ts`, `admissible-order-search.test.ts` | **direct** | both suites pass, 26/26, unchanged assertions (only field names in the fixtures changed) |
| `import-published-levels.mjs`'s `levelFingerprint` | native tsx, has dedicated tests | `import-published-levels-unit-tests.mjs` (vitest) | **direct** | 19/19 pass |
| `elite-prefix-dfs-ab.mjs`'s `scoringProfile` field | native/bundled Node, has a dedicated node-test | `elite-prefix-dfs-ab-node-test.mjs` | **direct** | passes |
| `solution-profile-lib.mjs`'s `{ id, solutionProfile }` contract | native, has a dedicated unit test + a real end-to-end CLI | `solution-profile-lib-unit-tests.mjs` | **direct**, plus real execution | unit test passes (40/40); additionally ran `stress:solution-profile-compare` for real against the committed published-corpus library, confirming the renamed contract round-trips correctly (Section 5) |
| "naked residual" term | n/a | full-repo exported-API search | structural (negative result) | confirmed clean — no live target found, documented rather than silently skipped |

## 4. Compatibility and frozen-history ownership

No row in this batch has a `compatibility` object; all 5 are `persistence: frozen-history` with no dual-read boundary.

| Row ID | Legacy form | Canonical form | Mode / retireWhen | Owning boundary | Frozen artifacts unchanged |
| --- | --- | --- | --- | --- | --- |
| NC-P08-007 | naked "profile" | qualified profile term (`scoringProfile` where implemented) | n/a (direct rename, no persistence boundary) | n/a | yes — the ~10-function hot-path parameter-name exclusion and the Firestore `fingerprint`-adjacent cases are documented, not silently dropped |
| NC-P08-008 | naked "fingerprint" | qualified fingerprint term (`levelFingerprint` where implemented) | n/a | n/a | yes — the 25-file application/Firestore cluster exclusion is documented (Section 1), not silently dropped |
| NC-P08-009 | naked "family" | qualified family term (`searchFamily` where implemented) | n/a | n/a | yes — the `KnownSolutionLabel.family` exclusion is documented (Section 1), not silently dropped |
| NC-P08-011 | naked residual API term | domain-qualified residual term | n/a | n/a | yes — no live target existed to migrate; verified clean |
| NC-P08-020 | "winning-path archaeology" | "winning-path analysis" | n/a | n/a | yes — dated reports/batch-8b's own historical execution record retain the old spelling |

### 4.1 High-risk rollback plan

No row in this batch is `risk: high` or even `medium`. All five are `risk: low`, and every implemented change is a straightforward identifier rename with no persisted-data dependency (confirmed for each: research-only `.d.ts` type never serialized; dev-tool function with one consumer; scratch-tool field with no committed output; in-memory pool contract). A straight revert of this batch's commits is trivially safe in every case. The one operational nuance — this batch's own validation incidentally triggered `solution-profile-compare.mjs`'s auto-refresh of a committed report — was caught and reverted before commit (Section 2/5), and does not affect rollback safety since nothing from that regeneration was ever committed.

## 5. Before-change baseline

This batch is uniformly `low` risk and behavior-preserving by construction (every implemented change is an identifier rename with unchanged logic). Baselines captured:

| Command / fixture | Before result / fingerprint |
| --- | --- |
| `node scripts/stress/winning-path-archaeology.mjs` (pre-rename tool identity) | measures candidate rank/scoreGap via real production primitives; documented behavior unchanged post-rename |
| `modules/solver/scoring.test.ts` / `admissible-order-search.test.ts` pre-edit | 26/26 passing |
| `scripts/import-published-levels-unit-tests.mjs` pre-edit | 19/19 passing |
| `scripts/stress/elite-prefix-dfs-ab-node-test.mjs` pre-edit | passing |
| `scripts/stress/solution-profile-lib-unit-tests.mjs` pre-edit | 40/40 passing |
| `node scripts/audit-level-metric-boundaries.mjs` pre-edit | passed before this batch (baseline still referenced the old `winning-path-archaeology.mjs` filename) |

Post-rename, every one of the above was re-run and produced **identical** pass counts/behavior (Section 3/7). `solution-profile-compare.mjs` was additionally re-run for real end-to-end against the committed published-corpus library, confirming the renamed `{ id, solutionProfile }` contract computes the identical nearest-neighbor distances the pre-rename `{ id, profile }` contract would have (same underlying `profileDistance`/`profileDistanceTerms` functions, untouched).

## 6. Implementation log

- Renamed `scripts/stress/winning-path-archaeology.mjs` -> `scripts/stress/winning-path-analysis.mjs` (`git mv`); updated its header title, usage example, output-directory example path, and both self-referential `console.log` labels. Updated `scripts/tooling-lifecycle.json`'s key for this file to match (live lifecycle registry, not frozen history).
- `modules/solver/operational-research-types.d.ts`: renamed `OrderingResearchPolicy.profile` -> `scoringProfile` and `OrderingResearchRecord.family` -> `searchFamily`.
- Updated all 6 consumers of these two fields: `modules/solver/scoring.ts` (the `scoreAndSort` research-observer block: policy construction, `.profile`/`.family` accesses, `research.observe({...})` call), `modules/solver/scoring.test.ts` (3 policy-array fixtures), `modules/solver/admissible-order-search.ts` (the `rankByAdmissibleSlack` research-observer block), `modules/solver/admissible-order-search.test.ts` (1 policy-array fixture + 1 assertion), `scripts/paired-deterministic-trace.mjs` (`activePolicyFor` + the `events.push` projection), `scripts/method-probe.mjs` (2 `record.family` reads + 1 policy-array construction) — every edit distinguished the *field* rename from the deliberately-untouched local/parameter variable named `profile` that several of these files also use.
- `scripts/import-published-levels.mjs`: renamed `export function fingerprint(level)` -> `levelFingerprint`; updated its 2 internal call sites and 2 self-referential comments (leaving prose "fingerprint"/"fingerprinting" verb usage untouched). Updated `scripts/import-published-levels-unit-tests.mjs`'s import and all 10 call sites (plus test-description strings), restoring one prose sentence a blanket find-replace had incorrectly mangled.
- `scripts/stress/elite-prefix-dfs-ab.mjs`: renamed `buildFlipRecord`'s returned `profile` field -> `scoringProfile`. Updated `elite-prefix-dfs-ab-node-test.mjs`'s 2 assertions and its explanatory header comment.
- `scripts/stress/solution-profile-lib.mjs`: renamed `nearestProfiles`'s pool-entry contract field `profile` -> `solutionProfile` (2 internal accesses) and its doc comment. Updated `scripts/stress/solution-profile-compare.mjs`'s `loadPool` (pool-entry construction), `buildTargetProfile` (2 return-object keys), and `main`'s destructuring; updated `solution-profile-lib-unit-tests.mjs`'s `nearestProfiles` test fixture.
- Updated `docs/naming-cleanup-plan.md`: Section 4.11 gained a summary paragraph of what was implemented and what was explicitly excluded (with rationale); Section 5.5's "winning-path archaeology" row converted to the standard "former X -> Y (implemented by batch 8H)" form.
- Mechanically updated `docs/naming-cleanup-level-metric-boundaries.json` (Phase-13 prep, unrelated scope): renamed the stale `winning-path-archaeology.mjs` baseline entry to `winning-path-analysis.mjs`, same recurring sync need as batches 8F/8G.
- Caught and reverted an incidental side effect: running `solution-profile-compare.mjs` for real triggered its own `ensureFreshLibrary`/`regenerateCorpusProfile` staleness auto-refresh against the current (larger) level corpus, rewriting the committed `reports/stress/solution-profile-published.json`/`-summary.md`. Reverted both files via `git checkout --` before committing — this batch's actual code change does not itself alter any persisted report shape.

## 7. Targeted contract validation

| Command / test | Boundary proved | Result |
| --- | --- | --- |
| `npx tsc --noEmit` (main + test configs) | no TypeScript regressions across the `.d.ts` field rename and its 6 consumers | pass |
| `npx eslint <all touched .mjs/.ts files>` | lint over every edited script/module | pass, 0 errors |
| `npx vitest run modules/solver/scoring.test.ts modules/solver/admissible-order-search.test.ts` | dedicated regression coverage for the renamed research-instrumentation fields | pass, 26/26 |
| `npx vitest run scripts/import-published-levels-unit-tests.mjs` | dedicated regression coverage for `levelFingerprint` | pass, 19/19 |
| `node scripts/stress/elite-prefix-dfs-ab-node-test.mjs` | dedicated regression coverage for the renamed `scoringProfile` output field | pass |
| `npx vitest run scripts/stress/solution-profile-lib-unit-tests.mjs` | dedicated regression coverage for the renamed `nearestProfiles` contract | pass, 40/40 |
| `node scripts/stress/winning-path-analysis.mjs` (real, 2-level execution) | real execution: correctly-shaped output, sensible rank/scoreGap values | pass |
| `npx tsx scripts/stress/solution-profile-compare.mjs --target-level=pos:1 --library=reports/stress/solution-profile-published.json --top=3` (real execution) | real end-to-end nearest-neighbor computation through the renamed contract | pass — correct ranked output; regenerated report side-effect reverted before commit |
| `node scripts/check-documentation-links.mjs` | every link/path/bare-alias in current docs resolves to a real, live target | pass, 1346 Markdown files |
| `node scripts/audit-level-metric-boundaries.mjs` | the unrelated, newly-landed Phase-13 prep gate stays in sync with actual file names | initially failed (stale/unclassified entry after the rename); fixed with a pure rename sync; re-verified passing |
| `node scripts/naming-cleanup-surface-inventory-node-test.mjs` | Phase 8-14 surface-inventory classification stays internally consistent | pass; these 5 rows are abstract term categories with no literal old->new string pair, so the tool does not emit a per-row RECONCILE line for them (confirmed by design, not an omission) |
| `npm run check` (dead-scripts, text-source-files, lint, all `check:validators`) | full repository check suite | pass, exit 0 |
| `npm run test:node` | full 53-script aggregate Node-test graph | pass, 53/53 |
| `npx vitest run --coverage` | full unit suite unaffected by this batch's edits | pass, 108 files / 1336 tests |

## 8. Consumer-inward closeout audit

Same-session audit (no separate fresh agent was available in this environment for the closeout pass itself, though a dedicated Explore sub-agent was used for the initial exhaustive surface search — same limitation noted in batches 8A-8G for the closeout step specifically).

- package commands and surfaced CLIs: none of these 5 rows have their own package.json alias; the tools they touch keep their existing aliases (`stress:solution-profile-compare`, `test:elite-prefix-dfs-ab`) unchanged.
- workers/raced execution: not applicable — none of these rows touch worker/race transport.
- workflows and exact-case targets: not applicable — no workflow file is touched by this batch.
- generated-data readers/writers/analyzers: `elite-prefix-dfs-ab.mjs` and `winning-path-analysis.mjs` write no committed default output (confirmed by reading both files' full source, Section 1); `solution-profile-compare.mjs`'s incidental auto-refresh side effect was caught and reverted (Section 6).
- current docs/reproduction commands: `check:documentation-links` passes; `docs/naming-cleanup-plan.md` is the only current doc that named these "naked X" concepts by that phrasing, and it was updated.
- application/UI/editor consumer: the one place this batch's search surfaced real application/UI-adjacent code (the Firestore `fingerprint` cluster) was explicitly excluded, not silently skipped (Section 1).
- historical compatibility paths: dated `reports/2026-08-06-winning-path-archaeology.md` and 3 other dated reports, plus `docs/naming-cleanup-phase-records/phase-08-batch-8b.md`'s own historical execution-log mention of the pre-rename filename, were grepped/considered and confirmed untouched.

Findings: none outstanding within this batch's scope. Three items explicitly deferred/out of scope, recorded in Section 1: the ~10 core solver functions' `profile` parameter names, the application/Firestore `fingerprint` cluster (~25 files), and `KnownSolutionLabel.family`/`families` (needs a specification amendment for a new canonical form).

## 9. Behavioral/evidence parity

| Observable | Before | After | Parity |
| --- | --- | --- | --- |
| `winning-path-analysis.mjs` real 2-level execution | (tool unrenamed; measurement logic identical) | correctly-shaped output, sensible rank/scoreGap distribution | parity — confirmed by direct execution |
| `scoring.test.ts`/`admissible-order-search.test.ts` | 26/26 passing pre-batch | 26/26 passing post-batch | parity |
| `import-published-levels-unit-tests.mjs` | 19/19 passing pre-batch | 19/19 passing post-batch | parity |
| `elite-prefix-dfs-ab-node-test.mjs` | passing pre-batch | passing post-batch | parity |
| `solution-profile-lib-unit-tests.mjs` | 40/40 passing pre-batch | 40/40 passing post-batch | parity |
| `solution-profile-compare.mjs` real execution | (contract unrenamed; distance computation identical) | identical ranked-neighbor output for the same target/library inputs | parity — confirmed by direct execution |
| full unit/coverage suite | 105 files / 1325 tests passing at batch 8F's baseline; 108/1336 at batch 8G's baseline | 108 files / 1336 tests passing post-batch (unchanged from 8G's baseline — no unrelated commits landed in between) | parity |

No unexplained solved-set, report-completeness, UI, or workflow behavior change.

## 10. Residue and authority reconciliation

- Reconciliation mode: delta, against base SHA `becf26b75418c42c9ee34499662c9d9c4ed9e2f4` (current `main` immediately after batch 8G's merge). Sufficient because no unrelated architecture work landed on `main` between the 8G merge and this batch's implementation.
- Target-occupancy: see Section 2 — clear for every canonical target in this batch, with one reinforcing precedent match (`searchFamily`) and one reinforcing precedent match (`solutionProfile`).
- Legacy-term residue search (excluding `node_modules/`, `.git/`, `reports/`, `docs/archive/`): case-insensitive sweep for `winning-path-archaeology`/`winning-path archaeology`, plus targeted `policy.profile`/`record.family`/`research.observe({ family` patterns across `modules/` and `scripts/`. Found and correctly left alone one look-alike: `scripts/stress/research-analysis-lib.mjs:51`'s `record.family` refers to the deliberately-out-of-scope `KnownSolutionLabel.family` concept (a `mineResidualInterfaces(solutionRecords, ...)` consumer), not `OrderingResearchRecord.family` — confirmed by checking the function's actual parameter/field shapes before concluding it was not residue.
- `npm run check:documentation-links`: passes (no backtick-wrapped alias/source-path issues from this batch's edits).
- `node scripts/audit-level-metric-boundaries.mjs` (the unrelated, newly-landed Phase-13 prep gate): initially failed on the renamed `winning-path-analysis.mjs`; fixed with a pure rename-sync (Section 6), not a classification decision — re-verified passing.
- Canonical-term search: confirmed present in every intended consumer (Section 6).
- Post-implementation `node scripts/naming-cleanup-surface-inventory-node-test.mjs`: passes; these 5 rows are abstract term categories without a literal old->new string pair, so the tool does not emit per-row RECONCILE lines for them by design (confirmed, not a gap).
- Plan/ledger changes from newly discovered scope: none required a specification amendment for what was *implemented*. The `KnownSolutionLabel.family` case is recorded as a candidate that *would* need a specification amendment if pursued, but this batch does not propose or perform that amendment — it is left explicitly open, not silently dropped.
- Intentional retained/frozen hits: dated `reports/**` (4 files), `docs/naming-cleanup-phase-records/phase-08-batch-8b.md`'s historical execution log, the ~10 solver-function parameter names, the application/Firestore `fingerprint` cluster (~25 files), and `KnownSolutionLabel.family` (all documented above).

No unclassified live hit remains in this batch's own scope; the three documented exclusions are recorded as explicit, reasoned scope boundaries rather than unclassified residue.

## 11. Pre-merge barrier

- [x] predecessor batch 8G's `batchCompletions` entry recorded the real merged PR/commit (PR #1594, `becf26b75418c42c9ee34499662c9d9c4ed9e2f4`) before this batch was claimed;
- [x] branch is current `main` (post-8G-merge) plus only this batch's commits;
- [x] compared branch head against current `main` — clean, no drift;
- [x] intended diff is non-empty and original (no prior duplicate PR found);
- [x] no unrelated next-phase implementation is stacked in this PR — only a mechanical rename-sync to keep an unrelated, already-landed Phase-13 prep validator passing;
- [x] targeted validation green (Section 7);
- [x] required aggregate CI: `npx tsc --noEmit`, `npm run check`, `npm run test:node`, and the full Vitest suite with coverage were all run directly in this session and are green;
- [x] ledger IDs, risk, compatibility policy, and verification fields (updated in the same PR) match the evidence in this record;
- [x] all predecessor phases (1-7) are complete; batches 8A-8G are merged;
- [x] no specification amendment is smuggled into this PR — the `KnownSolutionLabel.family` candidate is documented as a *future* amendment candidate, not implemented or proposed as settled here; all edits implement the already-fixed Section 4.11/5.5 mappings plus the documented scope exclusions (Section 1);
- [ ] PR description links this record — pending PR creation;
- [x] no unexplained solved-set, report-completeness, UI, or workflow behavior change (Section 9);
- [x] all 5 selected rows are `done` and `activeExecution` is reset to `idle` in this same commit set before merge;
- [x] this batch's own `batchCompletions["8H"]` entry remains `pending` (no PR/merge commit exists yet) until it actually merges;
- [x] this is the **final** Phase-8 batch: per `phase-08.md`'s "Phase 8 completion" section, `lastCompletedPhase` may only advance to 8 after this PR merges AND a final Phase-8-wide consumer-inward audit runs against post-merge `main` (not this pre-merge branch) — that audit is explicitly deferred to a separate post-merge step, not performed inside this PR (Section 12).

## 12. Closure and merge handoff

| Item | Value |
| --- | --- |
| PR | pending |
| Final head SHA | pending (recorded at push time) |
| Merged? | no |
| Ledger rows closed | NC-P08-007, NC-P08-008, NC-P08-009, NC-P08-011, NC-P08-020 |
| Deferred/superseded rows | none deferred; the three documented scope exclusions (Section 1) are in-batch scope decisions, not deferred ledger rows |
| Known structural-only surfaces | none introduced by this batch beyond the pre-existing coverage classes noted in Section 3 |

**This batch does not complete Phase 8 by itself.** Per `phase-08.md`'s "Phase 8 completion" section, after this PR merges the next session must, as a separate step (not stacked into this PR): (1) record this batch's merged PR/commit in `batchCompletions["8H"]`; (2) run a final Phase-8-wide consumer-inward audit against the new, post-merge `main`; (3) run `npm run naming:surface-inventory -- --compact --phase=8` and confirm no unclassified live legacy surface remains; (4) confirm current docs/tooling/workflow authorities use canonical Phase-8 terminology and frozen historical evidence remains unchanged; (5) only then advance ledger `lastCompletedPhase` to `8`. Phase 9 (and the already-landed Phase 9-14 preparation work sitting on `main`) may not claim to build on a completed Phase 8 until that closeout is recorded.

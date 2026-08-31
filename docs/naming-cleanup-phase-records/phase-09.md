# Phase 9 execution record: regression/performance CLI vocabulary

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 9 |
| Batch | single phase implementation PR |
| Status | implementation and validation complete; PR handoff pending |
| Base `main` SHA | `a58a7d861c427c0dfee784f36069d865bc93b315` |
| Branch | `work` |
| PR | pending external creation; local environment has no authenticated PR-creation surface |
| Selected ledger row IDs | `NC-P09-001` through `NC-P09-008` |
| Reconciliation mode | full (phase entry and phase closeout) |
| Highest risk in batch | medium |
| Primary compatibility owner | `package.json` command surface; temporary aliases retired in this phase |
| Canonical mappings | `solver:regression`, `solver:measure-speed`, `stress:measure-solver`, `run-solver-direct.mjs`, `combine-solver-sweep-reports.mjs`, `solver:combine-sweep-reports`, and corpus-number live report paths |
| Implementation agent/session | primary Phase-9 session |
| Closeout auditor | same session; consumer-inward pass recorded below |

### Branch/PR authority preflight

- [ ] could not query open naming-cleanup PRs: `gh` is unauthenticated in this environment; this limitation must be resolved by the PR creator;
- [x] searched local/remote similarly named branches with `git branch --all --list '*naming*'` (none returned);
- [x] no plausible predecessor/sibling branch needed comparison or recovery;
- [x] `npm run naming:status` reported Phase 9 next, Phase-8 gate ready, and active execution idle;
- [x] recorded the current branch base SHA before editing.

## 1. Scope, change envelope, and stop conditions

**Intended observable deltas**

- Close `NC-P09-001` through `NC-P09-008`: replace surfaced package commands, the direct-driver and report-combiner filenames, live workflow/tool consumers, current documentation, and the two maintained report paths with the plan-authorized names.
- Retire the three temporary package-command aliases at owning-phase closeout, after all repository callers are migrated.
- Keep the implementation filenames `scripts/solver-bench.mjs`, `scripts/solver-speed-probe.mjs`, and `scripts/stress/benchmark.mjs`; their ledger rows rename surfaced commands, not these internal files.

**Invariant observables**

- Command targets and options, solver behavior, report JSON bytes/schema, corpus membership, work accounting, workflow resource policy, and frozen historical evidence remain unchanged.
- The raced stress measurement remains a separate command/engine surface.

**Out of scope / stop conditions**

- No solver algorithm, budget, workflow scheduling, report schema, corpus identity, or historical artifact content change.
- A target collision, unowned external alias, behavior change, or different canonical target would require a specification amendment; none was found.

## 2. Pre-edit impact map

Entry inventory used `npm run naming:status`, six legacy/canonical `tooling-census.mjs --compact --query=...` queries, repository-wide `rg` searches for all eight old/canonical pairs, package scripts, workflows, current docs, scripts, modules, report paths, and frozen history. Canonical command targets were unoccupied. `run-solver-direct.mjs` appeared only as stale prose in the old driver's header and was the same concept, not a collision. The canonical combiner and report paths were unoccupied.

| Surface | Classification | Concrete locations | Evidence / planned test |
| --- | --- | --- | --- |
| Definition / producer | migrate | `package.json`; three renamed script/test paths; stress output default | Phase-9 command smoke; combiner test; direct CLI smoke |
| Internal direct consumers | migrate | scripts importing/spawning/referencing the direct driver, combiner, commands, and report paths | residue search and targeted tests |
| Canonical parser / normalizer | not applicable | command/path-only migration; JSON schema unchanged | byte comparison of renamed reports |
| Sequential transport | migrate | surfaced sequential command targets | command smoke executes zero-work speed measurement |
| Alternate worker/race transport | migrate | raced package spelling and comments only; implementation unchanged | package target assertion and aggregate tests |
| Serialized writer | migrate | stress parallel default and refresh workflow output paths | workflow structural checks; report byte parity |
| Historical reader / fixture | retained/frozen | archived docs/reports/logs and naming authority retain legacy evidence | excluded from current-surface rewrite |
| Report/export projection | migrate | live corpus report paths only | JSON parse/count and byte parity |
| Analyzer/grouping consumers | migrate | stress analysis defaults/examples and workflow readers | repository residue census; node tests |
| CLI / package alias | migrate | `package.json` | command smoke; removed-key assertions |
| Workflow command/inputs/outputs | migrate | solver workflow YAML callers | workflow checks in `ci:fast` |
| Artifact/concurrency/cache/path identifiers | migrate where live | refresh workflow and live corpus paths | exact-path search |
| Hint/provenance storage | not applicable | no stored identity changes | impact-map trace |
| Application/UI/editor consumer | not applicable | developer tooling only | architecture trace |
| Current docs/examples | migrate | `AGENTS.md`, testing/solver/tooling docs, stress README | documentation link check and residue search |
| Frozen historical evidence | retained/frozen | `docs/archive`, `docs/history`, dated reports/logs | intentionally untouched |

## 3. Validation topology

| Surface | Real runtime/path | Coverage | Class |
| --- | --- | --- | --- |
| package command identities | native Node plus bundled TypeScript | `test:naming-cleanup-phase9-command-smoke` | direct |
| report combiner | native Node | `test:combine-solver-sweep-reports` | direct |
| direct solver driver | bundled TypeScript | `npm run solver:direct -- --levels=pos:1 --budget-ms=1 --work-budget=1` | direct smoke |
| live report files | JSON readers | parse/count/hash comparison | direct |
| workflow consumers | GitHub Actions YAML | repository workflow validation in `ci:fast` | structural |
| current documentation | Markdown | `check:documentation-links` plus semantic residue review | structural/manual |

## 4. Compatibility and frozen-history ownership

| Row ID | Legacy | Canonical | Policy | Owner / disposition |
| --- | --- | --- | --- | --- |
| NC-P09-001 | `solver:bench` | `solver:regression` | temporary alias, owning-phase closeout | all live callers migrated; old key removed from `package.json` |
| NC-P09-003 | `stress:benchmark` | `stress:measure-solver` | temporary alias, owning-phase closeout | all live callers migrated; old key removed |
| NC-P09-006 | `solver:combine-corpus2-batches` | `solver:combine-sweep-reports` | temporary alias, owning-phase closeout | all live callers migrated; old key removed |
| NC-P09-007/008 | former report paths | corpus-number paths | frozen history | live files/readers moved; dated/archive evidence retains historical spellings |

## 5. Before-change baseline

| Observable | Before result |
| --- | --- |
| package targets | old aliases targeted `solver-bench.mjs`, `solver-speed-probe.mjs`, `stress/benchmark.mjs`, and the old combiner path |
| speed command zero-work fixture | existing Phase-9 smoke asserted `corpus: published`, `count: 0`, `rows: []` |
| report artifacts | Corpus 1: 393,960 bytes; Corpus 2: 29,004,638 bytes before path-only moves |
| implementation base | `a58a7d861c427c0dfee784f36069d865bc93b315` |

## 6. Implementation log

Renamed the two executable tools and the combiner test, migrated package and workflow callers, moved the two maintained reports without content edits, migrated current documentation and source commentary, strengthened the Phase-9 smoke around canonical and removed aliases, and closed the eight ledger rows against this record.

## 7. Targeted contract validation

Results are finalized in the commit containing this record:

| Command | Boundary proved | Result |
| --- | --- | --- |
| `npm run test:naming-cleanup-phase9-command-smoke` | canonical package targets, retired aliases, and real zero-work speed invocation | passed |
| `npm run test:combine-solver-sweep-reports` | renamed native-Node combiner and report contract | passed |
| `npm run test:naming-cleanup-ledger` | completion-contract-v4 ledger state | passed |
| `npm run naming:surface-inventory -- --compact --phase=9 --uncovered` | phase-aware surface coverage; package commands are directly exercised by the Phase-9 smoke despite conservative census classification | passed |
| `npm run check:documentation-links` | current-doc paths | passed |
| `npm run check:naming-cleanup-phase9-closeout` | consumer-inward legacy-residue scan plus canonical command/path contracts | passed |
| `npm run test:naming-cleanup-phase9-closeout` | negative fixtures prove legacy spellings and command-target drift fail closeout | passed |
| `npm run ci:fast` | aggregate code/workflow/current-doc validation | passed: 104 fast unit files plus the complete Node/check task set |

## 8. Consumer-inward closeout audit

The implementation session performed a separate consumer-inward pass beginning with package commands, spawned direct-driver paths, all workflow combiner invocations, live report readers/writers, current docs, and finally frozen history. That audit is now durable in `scripts/naming-cleanup-phase9-closeout.mjs`, with negative fixtures in `scripts/naming-cleanup-phase9-closeout-node-test.mjs`, and both run in `test:node`. No browser/application or persistence boundary exists. The only retained old spellings are the plan/ledger/execution record, frozen historical evidence, and the internal implementation filenames explicitly outside the relevant ledger rows.

## 9. Behavioral/evidence parity

| Observable | Before | After | Parity |
| --- | --- | --- | --- |
| zero-work speed report | `published`, 0, empty rows | same | exact |
| combiner fixtures | valid combination plus mismatch/duplicate rejection | same | exact |
| report contents | original bytes | path-only Git renames | exact: Corpus 1 `dadc68ea…`; Corpus 2 `76e1c0a7…` before and after |
| solver/workflow policy | existing targets/arguments | names only | unchanged by inspection |

## 10. Residue and authority reconciliation

Full phase reconciliation was chosen because this is the sole Phase-9 implementation and closeout. Current surfaces were searched for every legacy and canonical spelling across package scripts, source, workflows, current docs, and live report paths. Frozen reports, logs, archive/history, the naming plan/ledger, and this record are intentional legacy hits. Canonical target occupancy is same-concept only.

## 11. Pre-merge barrier

- [x] branch started from recorded current head and the Phase-8 predecessor is merged in the ledger;
- [x] intended diff is unique/non-empty and contains only Phase-9/adjacent validation work;
- [x] no Phase-10 implementation is stacked;
- [x] targeted and aggregate validation green;
- [x] rows point to this record and temporary aliases are retired;
- [x] `activeExecution` is idle and Phase 9 is closed in the same atomic PR;
- [x] no behavior/evidence change was identified;
- [ ] PR creation remains an external handoff because this environment has neither an authenticated `gh` session nor a `make_pr` tool; commits are recorded in Git metadata.

## 12. Closure and merge handoff

Phase 10 must start from the merged Phase-9 commit. If validation or post-merge auditing finds a missed consumer, reopen the affected Phase-9 verification state rather than relying on this closeout.

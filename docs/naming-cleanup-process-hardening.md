# Naming-cleanup process hardening

Status: **completed pre-Phase-8 technical prerequisite; merged via PR #1580, then strengthened by a second implementation-history review before Phase 8 began. The controls in this document remain mandatory for Phase 8 and later.**

This document records the process failures exposed while implementing and repeatedly auditing Phases 1-7 of [`naming-cleanup-plan.md`](naming-cleanup-plan.md), and defines the table-setting and execution controls for the remaining phases. The implementation chronology and rationale behind these controls live in [`naming-cleanup-history-and-lessons.md`](naming-cleanup-history-and-lessons.md). Canonical vocabulary remains owned by [`naming-and-vocabulary.md`](naming-and-vocabulary.md); exact rename mappings and phase sequence remain owned by the naming-cleanup plan; machine-readable entry state remains in [`naming-cleanup-ledger.json`](naming-cleanup-ledger.json); durable batch evidence uses [`naming-cleanup-phase-record-template.md`](naming-cleanup-phase-record-template.md).

The central lesson is that this cleanup is not safely modeled as a collection of textual renames. Most consequential rows are **contract migrations** crossing definitions, transports, persisted representations, tools, workflows, reports, application state, and historical readers. A phase is not complete merely because the planned definition changed and the normal CI floor is green.

## 1. Why this hardening gate exists

Phases 1-7 were implemented and then subjected to multiple independent audits. Those audits repeatedly found real defects after the relevant ledger rows and phases had been marked done. The important finding is not that individual agents made isolated mistakes. The same classes of mistake recurred because repository-wide propagation was insufficiently machine-enforced.

Representative repair PRs include:

- **#1568**: forensic Phase-7 follow-up found additional live editor/protocol vocabulary and internal false-goal names outside the original inventory.
- **#1570**: Phase-5 beam-retention telemetry still emitted/consumed stale terminology, including a stale producer/consumer stage label mismatch.
- **#1571**: Phase-6 stage migration had not actually achieved single-write canonical stage identity; current writers still emitted legacy boolean tags.
- **#1572**: the ablation toolchain had broken consumers of removed solver APIs and renamed scoring/ordering metadata even though the core migration had passed CI.
- **#1576**: added guards only after audits demonstrated that live workflow/script consumers could be broken while the maintained validation floor remained green.
- **#1577**: Phase-7 renames caused live editor overlays to disappear, defeated the intended submission-time false-goal search cap, and prevented an untriggerable-cell warning because callers/consumers used pre-migration field/status names.
- **#1578**: three independent audits found solver-option transport loss, incorrect scheduler provenance, a removed AttemptConfig field still read by tooling, plain-Node-20-incompatible TypeScript imports, raw historical stage comparisons that silently dropped rows, and a canonical routing value written under a legacy field name.

These findings invalidate a weak definition of completion based on “planned symbol changed + lexical residue search + existing CI.” Future phases must prove the migrated contract across its live execution surface.

## 2. Failure classes and required controls

### 2.1 Definition changed, consumers did not

Observed shape: the canonical API or field is correct at its owning definition, while scripts, workers, reports, or UI code still call/read the removed surface. Examples include stale `Solver.solve()` callers, old ablation fields, and Phase-7 editor state consumers.

Required control:

- inventory consumers before editing, not after;
- treat scripts, workflows, generated-data consumers, and UI/controller code as first-class live surfaces;
- add a smoke/regression test for any surfaced consumer that previously had no execution coverage;
- when a removed name is mechanically detectable, add it to a permanent residue guard rather than relying on a one-time search.

### 2.2 Green CI did not mean maintained tooling worked

Observed shape: `check:types`, lint, unit tests, and existing Node tests passed while live CLI/research tools or workflows were broken because those surfaces were not executed.

Required control:

- inventory every maintained package command, surfaced script, worker entry point, and workflow command touched by a phase;
- classify each as **already exercised**, **cheap smoke required**, **expensive but structurally checkable**, or **historical/frozen**;
- add cheap command/module/CLI smoke coverage for maintained surfaces where practical;
- verify workflow run targets and exact-case local paths mechanically;
- do not count a green aggregate suite as evidence for a surface that aggregate does not execute.

### 2.3 Dual-read/single-write leaked into internal code

Observed shape: legacy and canonical representations remained mixed beyond the compatibility boundary; current writers sometimes continued to emit old tags, and downstream analyzers compared historical raw values directly.

Required control:

- normalize legacy input once at the owning boundary;
- use canonical values internally;
- emit canonical values only;
- make historical projections explicit adapters rather than ambient aliases;
- test all three properties separately: legacy read, canonical internal normalization, canonical single-write.

A compatibility reader is not proof that all consumers route through it. Consumers that classify/group persisted identities must be tested against representative legacy rows.

### 2.4 Alternate transports drifted

Observed shape: one execution path forwarded a canonical option correctly while a sibling worker/race path dropped it. The Phase-1-7 audit found `portfolio-solve-sweep-worker.mjs` forwarding only a legacy override while the raced solver correctly supported the canonical field.

Required control:

- identify every transport/projection for a migrated option or result field;
- replace duplicated hand-maintained whitelists with shared projections where practical;
- otherwise add transport-parity checks or sentinel tests that exercise all supported fields across sibling paths;
- treat a dropped research/configuration field as a behavioral or evidence-integrity defect, not cosmetic telemetry drift.

### 2.5 Type/runtime boundaries hid errors

Observed shape: weakly typed ports allowed wrong option names to compile; plain `.mjs` tools imported `.ts` files and only failed under the repository's supported Node 20 runtime.

Required control:

- tighten public/internal port option types before or during high-risk renames;
- audit `.mjs` -> `.ts` runtime imports for every touched tool family;
- smoke plain-Node tools under the minimum supported Node version when the migration crosses that boundary;
- prefer shared plain-JS normalization modules when both TypeScript runtime code and plain-Node tooling need the same compatibility logic.

### 2.6 Canonical vocabulary could still be wired incorrectly

Observed shape: lexical searches were clean because the new name existed, but semantics were wrong: `timeLimit` was passed where `timeLimitMs` was required; a canonical routing-regime value was emitted under `archetype`; a canonical option disappeared in a transport object.

Required control:

- lexical old-name searches are necessary but never sufficient;
- add structural or behavioral assertions for object shapes, option forwarding, status handling, and report schemas;
- when a phase changes a field name, test a value travelling from a representative producer through the real transport to a representative consumer;
- prefer exact object/schema assertions over tests that only check the final command exits successfully.

### 2.7 Ledger “done” was mistaken for proof of completion

Observed shape: rows were marked done after the planned definition and expected consumers moved, but later audits found omitted consumers and even functional regressions.

Required control:

For Phase 8 onward, `status: "done"` means the migration has passed all applicable verification dimensions recorded in the ledger:

1. surface inventory complete;
2. implementation complete;
3. targeted/smoke validation complete;
4. adversarial consumer audit complete;
5. behavioral/evidence parity complete or explicitly not applicable;
6. closeout review complete.

The primary `status` must not advance to `done` while any applicable verification dimension remains pending.

### 2.8 Branch ambiguity increased verification cost

Observed shape: stalled agents, stacked branches, partial merges, and orphan branches forced later agents to determine where the authoritative implementation lived before they could audit correctness.

Required control:

- use one current naming-cleanup integration branch at a time;
- keep phase PRs small enough to audit independently;
- after a PR merges, rebase/start the next phase from current `main`;
- exploratory branches must be either merged/reapplied promptly or explicitly recorded as superseded with no unique commits;
- do not use a long-lived branch as an informal queue of partially merged work.

### 2.9 Phase scope was larger than one audit context could safely hold

Observed shape: a single numbered phase could contain unrelated tool families, workflow identities, compatibility boundaries, generated schemas, module/type renames, and documentation changes. Even when every mapping belonged under one semantic milestone, one implementation PR created too many independent propagation graphs to audit reliably.

Required control:

- treat a phase as a milestone, not an instruction to create one giant PR;
- split remaining high-surface phases into serial batches grouped by compatibility owner and execution domain;
- merge each batch to `main` before branching the next one;
- prohibit stacked implementation batches by default;
- run a final phase-wide closeout on the merged tree after all batches are complete.

Phase 8 is explicitly serialized as 8A-8H in [`naming-cleanup-phase-records/phase-08.md`](naming-cleanup-phase-records/phase-08.md).

### 2.10 Verification state lacked durable evidence

Observed shape: the ledger could say a dimension was complete, but later agents still had to reconstruct what had actually been searched, which runtime was exercised, what compatibility fixture was used, and whether behavior was compared before/after. PR bodies and chat context were inconsistent historical records; some substantial implementation PRs had empty bodies.

Required control:

- every Phase-8+ implementation batch creates a checked-in execution record before editing;
- ledger verification fields summarize evidence in that record rather than replacing it;
- medium/high-risk behavior-preserving batches capture a before-change observable and compare the same observable after implementation;
- record exact commands, fixtures, runtime boundaries, consumer-audit findings, and pre-merge comparison;
- a row cannot move to `in-progress` or `done` without a valid `verificationRecord` path once the stronger ledger contract applies.

### 2.11 Duplicate/no-op merges exposed missing PR authority checks

Observed shape: PRs #1581 and #1582 carried the same Phase-8-readiness closeout patch and both merged. At the time of the second history review, GitHub still contained 37 branches whose names included `naming-cleanup`. A branch name or recently opened PR therefore cannot be trusted as proof of unique work.

Required control:

- before starting a batch, search open PRs and similarly named branches and compare plausible predecessors to current `main`;
- recover unique relevant commits explicitly and record the disposition; otherwise treat historical branches as evidence, not authority;
- before merge, compare the PR head against current `main` and verify the intended diff is non-empty and not already applied;
- close/supersede a duplicate or empty PR instead of merging it merely because CI is green;
- record the active batch branch and checked-in record in the ledger's `activeExecution` object while work is in progress.

## 3. Mandatory table-setting gate before Phase 8

No Phase-8 implementation rename may begin until a dedicated hardening pass completes the following work on current `main`.

### 3.1 Build a live execution-surface inventory

Inventory maintained:

- package commands;
- surfaced scripts and CLI entry points;
- worker entry points;
- workflow local command targets;
- current generated-report producers/consumers;
- public solver/application ports touched by remaining phases.

For each, record whether normal CI executes it and by what test/check. Identify unexercised surfaces relevant to Phases 8-14.

Deliverable: a compact machine-readable or mechanically generated inventory if practical; otherwise a checked-in deterministic report/check with enough structure to prevent another free-form census.

### 3.2 Expand cheap smoke coverage

For maintained surfaces touched by remaining phases, add the cheapest useful contract test:

- module loads under its real runtime;
- CLI parses representative canonical and legacy-compatible arguments;
- referenced files exist;
- worker starts and receives a representative message;
- serializer/parser round-trips a representative row;
- command can perform a no-op/count/help/dry-run path without expensive compute.

Do not run expensive research campaigns in CI merely to prove wiring.

### 3.3 Audit shared transports and duplicated mappings

Inventory option/result/config transports across:

- sequential solver execution;
- raced/parallel workers;
- batch/sweep workers;
- report/export projection;
- hint/provenance projection;
- application/public ports.

Replace duplicated mapping knowledge with a shared projection where reasonable. Where duplication must remain, add a parity/sentinel check.

### 3.4 Quarantine compatibility normalization

Inventory remaining legacy/canonical normalizers relevant to Phases 8-14. Verify:

- one owning normalizer per persisted identity/value family;
- legacy values are accepted only at explicit boundaries;
- internal classification/grouping uses canonical values;
- current writers do not emit historical aliases;
- representative historical fixtures reach real downstream consumers.

### 3.5 Audit runtime/type seams

Specifically inspect:

- plain `.mjs` imports into TypeScript source;
- `any` or overly broad option/result ports around planned rename surfaces;
- runtime paths whose supported-Node behavior differs from bundler/`tsx` behavior;
- exact-case physical paths embedded in workflows/spawns.

Add typing or runtime checks where a simple mechanical guard can eliminate a known failure class.

### 3.6 Upgrade rename-impact/census tooling

The table-setting agent should strengthen existing tooling rather than create a competing manual checklist. At minimum, a per-concept/phase audit must be able to distinguish:

- live old-name residue;
- intentional compatibility reads;
- frozen history;
- canonical writers;
- surfaced commands/workflows that mention the concept;
- known unexercised consumers.

The tool need not infer semantics perfectly. Its purpose is to make omissions visible and auditable.

### 3.7 Reconcile Phases 8-14 against current main

Only after the infrastructure work above:

- repeat Section 0 of the naming-cleanup plan;
- re-census every remaining planned mapping;
- identify new consumers introduced since the original plan;
- mark obsolete mappings as superseded rather than recreating dead architecture;
- add newly discovered mappings/retained terms to plan and ledger;
- classify each remaining ledger row by migration class and required verification dimensions.

### 3.8 Produce the Phase-8 readiness record

Before unblocking Phase 8, the hardening PR must record:

- what new checks/tests were added;
- what remaining live surfaces still cannot be cheaply exercised and how they will be audited;
- what duplicated transports/mappings remain and why;
- which remaining phases are high-risk contract migrations;
- the exact `main` commit against which the refreshed census was performed.

Only then may the ledger's Phase-8 gate become `ready`.

## 4. Execution model for Phase 8 onward

Each implementation **batch** has explicit entry, implementation, validation, closeout, parity, and merge barriers. A multi-batch phase advances only after a final merged-tree phase closeout.

### Stage 0: execution authority / batch claim

Before any canonical edit:

1. start from current `main` and record the full SHA;
2. search open naming-cleanup PRs and similarly named branches;
3. compare plausible predecessor/sibling branches against current `main`, recovering unique relevant work or recording them as superseded;
4. create the checked-in batch record from [`naming-cleanup-phase-record-template.md`](naming-cleanup-phase-record-template.md);
5. set the ledger's `activeExecution` object to the one active phase/batch/branch/record;
6. do not begin a second implementation batch while the first is unmerged.

### Stage A: entry / impact map

Before editing:

1. update from current `main`;
2. select only the batch's ledger rows;
3. fill the contract-migration matrix in the checked-in execution record using [`change-recipes.md`](change-recipes.md);
4. identify which normal CI checks actually exercise each live consumer and record the real runtime/path;
5. capture a before-change observable baseline for every applicable medium/high-risk migration;
6. add missing tests/checks before or with the implementation when practical.

### Stage B: implementation

Perform only the canonical mappings fixed by the plan. Preserve behavior and historical evidence. Prefer centralization over duplicated compatibility glue.

### Stage C: targeted contract validation

Run tests that exercise the migrated boundaries, not merely nearby implementation units. For high-risk rows this includes representative legacy input, canonical output, alternate transport, and downstream consumer assertions.

### Stage D: adversarial closeout audit

A separate pass must approach the phase from consumers inward. It must inspect/execute:

- package commands;
- CLI tools;
- workers;
- workflows;
- generated-data readers/writers;
- current docs/examples;
- application/UI consumers where applicable;
- historical compatibility paths.

The closeout audit must not simply reread the implementation diff or trust the ledger's current state. Prefer a fresh agent/session for this pass when available. If the implementation agent performs the closeout, record that fact and still begin from the consumer/surface inventory rather than the implementation diff.

### Stage E: behavioral/evidence parity and phase closure

For solver/application behavior-preserving migrations, compare the relevant before/after observable behavior. Depending on the phase this may include:

- attempt/stage order;
- work/node accounting;
- solved outcomes;
- report row inclusion/grouping;
- UI state/render behavior;
- round-trip bytes/fingerprints;
- workflow command/path resolution.

Only after Stages 0 and A-E are complete may a batch close its rows.

### Stage F: pre-merge barrier

Before merge:

1. reconcile/update against current `main` when required by the plan;
2. compare the PR head to current `main` and verify the intended diff is non-empty and not already present;
3. verify no next-batch implementation is stacked in the PR;
4. verify targeted validation, required aggregate CI, ledger state, and the checked-in execution record agree;
5. record the current-main SHA, head SHA, and comparison result in the batch record.

If the diff is empty or already applied, close/supersede rather than merge a duplicate/no-op PR.

### Phase-wide merged-tree closeout

After the last batch of a multi-batch phase merges, run the phase census and consumer-inward audit again on current `main`. Only that merged-tree closeout may advance `lastCompletedPhase`.

## 5. Contract-migration matrix

Every cross-boundary row in Phase 8 onward must explicitly classify these surfaces as **migrate**, **compatibility read**, **retained/frozen**, or **not applicable**:

| Surface | Classification | Evidence / test |
| --- | --- | --- |
| Definition / producer |  |  |
| Internal direct consumers |  |  |
| Canonical parser / normalizer |  |  |
| Sequential transport |  |  |
| Alternate worker/race transport |  |  |
| Serialized writer |  |  |
| Historical reader / fixture |  |  |
| Report/export projection |  |  |
| Analyzer/grouping consumers |  |  |
| CLI / package alias |  |  |
| Workflow command/inputs/outputs |  |  |
| Artifact/concurrency/cache/path identifiers |  |  |
| Hint/provenance storage |  |  |
| Application/UI/editor consumer |  |  |
| Current docs/examples |  |  |
| Frozen historical evidence |  |  |

“Not found” is not the same as “not applicable.” If a surface category is relevant to the concept, show how it was searched or tested.

## 6. Verification priorities

When hardening effort must be prioritized, prefer controls in this order:

1. **single source of truth / eliminate duplicated mapping knowledge**;
2. **type/schema constraint that makes the bad state unrepresentable**;
3. **sentinel/parity test across real boundaries**;
4. **cheap maintained-tool smoke execution**;
5. **mechanical residue/path/reference guard**;
6. **manual closeout audit**.

Manual search remains necessary for semantic drift, but it should be the last line of defense rather than the primary proof.

## 7. Ledger completion model for future phases

The ledger remains the machine-readable checklist of record, but it is no longer sufficient for a future row to carry only `status`, and the ledger is not itself the evidence record.

For Phase 8 onward each entry has a `verification` object with these fields:

- `surfaceInventory`;
- `implementation`;
- `targetedValidation`;
- `consumerAudit`;
- `behavioralParity`;
- `closeoutAudit`.

Values are `pending`, `done`, or `not-applicable`. A row may use `not-applicable` only with a short explanation in `notes` or the phase PR.

A future row can become `status: "done"` only when every verification field is `done` or `not-applicable`. Under completion contract v3, every Phase-8+ row that is `in-progress` or `done` must also point at a checked-in `verificationRecord`; Phase-8 rows must identify their assigned serial `batch`. The top-level `activeExecution` object identifies the one implementation batch currently allowed to be in progress.

The ledger also carries a Phase-8 hardening gate. Until that gate is marked ready, agents must not begin PR 8 implementation.

This richer model applies prospectively. Phases 1-7 retain their existing historical `done` rows and the detailed closeout notes recording the later audits; do not manufacture retroactive verification claims for checks that were not actually run at the time.

## 8. Scope discipline

The table-setting pass may add tests, checks, shared normalization/projection helpers, typing, and documentation needed to make future migrations safe. It must not opportunistically perform Phase-8 canonical renames.

If hardening exposes an already-live Phase-1-7 regression, fix it and record it before unblocking Phase 8. If it exposes unrelated solver policy or research questions, record/split them rather than changing behavior under the naming-cleanup umbrella.

## 9. Handoff for the next agent

The table-setting prerequisite is complete and merged via PR #1580 (merge commit `02abde6c651a7070e7be10775f75c177b1bdb23b`). The next naming-cleanup agent may begin **Phase 8A only**, using the serial execution model in Sections 4-7 and the Phase-8 batch authority in [`naming-cleanup-phase-records/phase-08.md`](naming-cleanup-phase-records/phase-08.md):

1. start from current `main` and repeat the plan's Section 0 reconciliation if newer unrelated work has merged;
2. claim only the 8A ledger rows, create the 8A checked-in execution record, and set `activeExecution` before editing;
3. use the checked-in surface inventory and CI/smoke coverage to identify every live consumer and any remaining structurally-only or manually audited surface;
4. preserve legacy-read/canonical-write boundaries and frozen evidence exactly as classified;
5. run targeted contract validation, before/after parity where applicable, and a consumer-inward closeout audit before marking any row done;
6. merge 8A, verify current `main`, clear the active batch, then branch 8B from that new `main`; do not stack 8B;
7. leave Phase 9 untouched until the merged-tree Phase-8 closeout is complete and every Phase-8 verification dimension is resolved.

The repository now contains substantially more machine-enforced proof than the Phase-1-7 cycle did; the next agent should use those checks as an entry map, not as a substitute for the required adversarial audit.


## 10. Table-setting progress

### 2026-08-29: execution-surface inventory and first smoke coverage

This pass advances the hardening gate against `main` at `5db2769282d690ce7c12bdcd6aebf064ca467476`. The Phase-8 gate remains **blocked**.

Completed infrastructure:

- added `scripts/naming-cleanup-surface-inventory.mjs` / `npm run naming:surface-inventory`;
- extended that inventory beyond script/package/workflow roots to mechanically map remaining-phase module files, exported symbol owners, cross-file references, and concrete `reports/...` path relationships, so public/research module and generated-report surfaces are no longer absent from the census;
- the inventory derives the actual PR-CI package roots from `.github/workflows/ci.yml`, follows package-script dependencies, maps local script targets and workflow targets, and can filter exact planned surfaces by naming-cleanup phase;
- surfaced script coverage is deliberately classified as **direct CI execution**, **CI test reference**, **workflow-path structural only**, or **uncovered by known CI** rather than collapsed into a single boolean;
- added a regression test for the inventory's Phase-8 classification so changes to CI/package wiring cannot silently change what the hardening process thinks is covered;
- added `scripts/check-naming-cleanup-ledger.mjs` to the normal validation graph, enforcing the prospective Phase-8+ verification object, forbidding `done` rows with pending verification, and preventing Phase-8+ implementation state while the gate is blocked;
- added a plain-Node synthetic smoke for `family-trove-doctor.mjs`, exercising its `--json`, `--root`, and legacy `PATHFINDER_VARIANT_TROVE` root-selection contract without requiring the historical multi-gigabyte dataset;
- added `check:plain-node-import-boundaries`, which derives native-`node` script roots from package/workflow surfaces, follows their literal local script imports, and rejects direct TypeScript runtime imports or `.js`/`.mjs` specifiers whose only repository target is TypeScript source. This permanently guards the Node-20 failure class found in #1578 without applying the restriction to deliberate `tsx`/bundled tools.
- the new runtime guard immediately found three genuine pre-existing seams: the lifecycle failure-map workflow imported the TypeScript stage policy from native Node; historical portfolio replay was surfaced as native Node while importing a TypeScript-only experiment definition; and shared `level-data-io.mjs` directly imported TypeScript hint persistence code. This pass corrected them by routing lifecycle normalization through the existing plain-JS stage normalizer, running portfolio replay through the established bundling boundary, and extracting canonical hint persistence/normalization runtime logic into `modules/domain/hint-runtime.mjs` with typed wrappers retained in `hint-types.ts`.
- the guard also exposed one conditional-import false positive: `elite-prefix-dfs-ab.mjs` is imported natively only for a pure helper test while its TypeScript solver import sits behind the separately bundled CLI path. The guard now follows dynamic imports for native roots but static imports only for nested helpers, matching the actual runtime boundary instead of treating dormant bundled-only code as native execution.

Representative findings encoded by the new inventory:

- `test:hint-path-oracle` is a surfaced Phase-8 package command that is **not directly reachable from the PR-CI package-command graph**, while the underlying `hint-path-oracle.mjs` has at least one CI-reachable test reference. The inventory therefore records it as **CI test reference**, not direct execution. Before the Phase-8 rename, the table-setting audit still needs to determine whether that indirect reference substantively exercises the command/runtime contract; its full command reads the split `data/hints/` artifact, which the Node-test sparse checkout intentionally does not materialize.
- `stress/restart-continuation-population-pilot.mjs` is not directly run by CI, but its current CLI contract is referenced by the CI-reachable `restart-continuation-population-pilot-cli-node-test.mjs`. The inventory records this as **CI test reference**, not direct execution.
- workflow-local script targets receive **structural** existence validation through the CI-reachable `check:workflow-actions`; this does not prove workflow input/output or behavioral semantics. The pre-existing `audit-export.yml` mixed-case stale solver path filter was corrected from `the historical mixed-case solver facade path` to `modules/solver.ts`, and `check:workflow-actions` now rejects literal workflow `paths:` entries that point at missing or wrong-case repository files, permanently covering that trigger-loss class.
- `family-trove-doctor.mjs` previously had a surfaced package alias but no PR-CI execution. Its new synthetic smoke closes that specific runtime/CLI blind spot and establishes a pre-migration test for the legacy dataset-root environment variable.

Gate status by subsection:

- **3.1 live execution-surface inventory: COMPLETE FOR PHASE ENTRY.** Package commands, script entrypoints, workflow targets, current-doc references, CI reachability, remaining-phase module files/exported symbol owners, public/application transport categories, and concrete generated-report paths are mechanically inspectable. Report references are classified as likely producer, consumer, publisher, or neutral reference; future row references are categorized as public-port, worker-transport, solver-internal, application, workflow, package-command, tool/report, or documentation.
- **3.2 cheap smoke coverage: COMPLETE FOR PHASE ENTRY.** The variant-family dataset boundary doctor has real Node-20 CLI/root-selection coverage. A consolidated synthetic/no-work smoke now exercises eleven previously uncovered Phase-8 analyzers/collectors/CLIs through their real Node or bundling boundary: lineage mechanics, portfolio replay/report, producer-population, rollback census, residual-interface analysis, winning-lineage/prefix collectors, repair-direct CLI validation, residual-cohort audit validation, and equal-work analysis validation. The repair-direct child worker is structurally covered with its parent runtime-smoked; the symmetry repair seed diagnostic remains structural-only because its contract requires a matched historical parent/variant/manifest/result quartet. Workflow-only CP-SAT/atlas/dataset surfaces remain structural in PR CI by design and require targeted workflow/command validation in their rename phase.
- **3.3 shared transports/duplicated mappings: COMPLETE FOR PHASE ENTRY.** Future-row references are categorized by transport surface, the public `SolverApi.solveLevel` boundary consumes the owning `SolveOpts` type rather than `any`, and `check:solveopts-transport-parity` permanently covers the previously observed canonical-option drop class. Phase 8 itself has no solver-option transport rename; its real cross-boundary data families are the diagnostics schema and dataset-root environment variable, whose owners are fixed below. Later phases must add row-specific parity tests when their mapped field crosses more than one transport category.
- **3.4 compatibility-normalization quarantine: COMPLETE FOR ENTRY READINESS.** The remaining 22 Phase-8-14 `dual-read` ledger rows have been separated into command aliases versus real data/value boundaries. Package aliases are owned only by `package.json` compatibility entries and must not create internal dual-name knowledge. The real boundary families and their owners are recorded below; implementation remains in the relevant future phase, but the ownership/normalization location is fixed before renaming.
- **3.5 runtime/type seams: COMPLETE FOR PHASE ENTRY.** The doctor and consolidated Phase-8 CLI smoke exercise real native-Node and bundler boundaries. `check:plain-node-import-boundaries` prevents the known plain-Node-to-TypeScript import failure class; literal workflow paths are exact-case/existence checked. The public `SolverApi.solveLevel` option boundary consumes the owning `SolveOpts` type, and false-goal search/classification ports use owning result types instead of `any`. Broader legacy dynamic bags remain technical debt, but no remaining-phase high-risk solver option/result boundary is allowed to rely on the formerly untyped public port.
- **3.6 rename-impact/census tooling: COMPLETE FOR PHASE ENTRY.** Exact tool/package/workflow/doc/module/symbol matching, CI exposure, transport categories, report producer/consumer roles, and phase-range reconciliation are available. Reconciliation excludes the naming authority documents themselves so canonical names written in the plan cannot masquerade as live implementation. Old-name and canonical-name references are reported separately per ledger row; compatibility semantics are then interpreted against the explicit ownership table below rather than inferred from text alone.
- **3.7 current-main reconciliation of Phases 8-14: COMPLETE.** All 107 remaining ledger rows were re-censused against current `main` at `5db2769282d690ce7c12bdcd6aebf064ca467476` using the phase-range inventory, then the 16 non-straightforward machine classifications were manually inspected. The reconciliation is recorded below.
- **3.8 Phase-8 readiness record: READY.** The readiness record below fixes the remaining structural-only surfaces, compatibility owners, higher-risk phases, and exact census commit. Phase 8 may begin only after this hardening work is accepted/merged; this pass itself performs no Phase-8 canonical rename.

Useful commands for the next pass:

```sh
npm run naming:surface-inventory -- --compact --phase=8
npm run naming:surface-inventory -- --compact --phase=8 --uncovered
npm run naming:surface-inventory -- --json --phase=8
npm run check:naming-cleanup-ledger
npm run check:plain-node-import-boundaries
```

Do not infer from this progress record that the Phase-8 gate can be opened. Its purpose is to replace one part of the previous manual census with durable machinery and to give the next table-setting pass a concrete list of uncovered surfaces to work down.


### Compatibility-boundary ownership for remaining phases

The future ledger contains 22 intentional `dual-read` rows. Twelve are npm/package aliases in Phase 8, three are package aliases in Phase 9, and seven are real value/data boundaries. Command aliases are compatibility at the command-dispatch surface only: the old alias may invoke the canonical command for one migration window, but scripts/modules must use one canonical internal name.

The real value/data boundaries are:

| Phase | Legacy -> canonical | Owning compatibility boundary | Single-write rule |
| --- | --- | --- | --- |
| 8 | `knownHardCluster` -> `hardClusterHeuristicMatch` | solver-diagnostics generated-report normalization/reader boundary around the current audit-export tool family | current diagnostics writer emits only canonical after Phase 8; historical report readers accept legacy |
| 8 | `recommendedGating` -> `derivedGatingCandidate` | same solver-diagnostics generated-report boundary | same |
| 8 | `PATHFINDER_VARIANT_TROVE` -> `PATHFINDER_VARIANT_FAMILY_DATASET_ROOT` | variant-family dataset root resolver used by the dataset doctor/workflow family | prefer canonical env input, accept legacy for one compatibility window, never copy both names deeper into tool logic |
| 10 | stage budget policy `additive-fraction` -> `additive-wall-multiplier` | stage-policy/report compatibility boundary | **definition is already canonical on current main**; Phase 10 must audit historical readers only and must not recreate the old definition |
| 11 | runtime `variant` -> `orientation` | engine-state + level-transform boundary | runtime/application state becomes canonical orientation; research level-variant vocabulary remains separate and unchanged |
| 13 | normalized `reqLen` -> `requiredLength` | raw-to-normalized level parser | raw wire input remains `reqLen`; normalized/runtime objects expose only `requiredLength` after migration |
| 13 | normalized `reqInt` -> `requiredIntersections` | raw-to-normalized level parser | raw wire input remains `reqInt`; normalized/runtime objects expose only `requiredIntersections` after migration |

Current compatibility infrastructure relevant to these migrations is deliberately centralized: solver stage IDs use `stage-id-normalization.mjs`, scheduler modes use `scheduler-mode-normalization.mjs`, routing regimes use `routing-regime-normalization.mjs`, and hint/provenance persistence uses `hint-runtime.mjs`. Future phases must extend the owning boundary above rather than introducing a second legacy-to-canonical map in workers, reports, or UI code.

This audit also changes the interpretation of the Phase-10 budget-policy ledger row: its canonical definition has already landed before Phase 10, while historical compatibility remains unproven. Treat it as a partially superseded contract migration, not a fresh definition rename.


## 11. Phase 8-14 current-main reconciliation

Refreshed against `main` commit `5db2769282d690ce7c12bdcd6aebf064ca467476`.

The mechanically generated phase-range census contains 107 Phase-8-14 ledger rows. After excluding the naming authority documents themselves from implementation-state evidence, the initial classification was:

- 82 **old-live** rows: the planned old/current surface is still live and the future rename remains required;
- 9 **frozen-history-only/no-current-reference** rows: no current implementation surface needs recreation; the ledger's frozen-history preservation rule remains the migration constraint;
- 7 **canonical-live** textual matches;
- 3 **mixed old/canonical** textual matches;
- 6 **no-current-live-reference-review** rows.

The last 16 rows were manually reconciled because their ledger spelling is conceptual, generic, architectural, or intentionally retained rather than a literal source token. Results:

| Phase | Row / machine state | Current-main reconciliation |
| --- | --- | --- |
| 8 | CP-SAT workflow/job oracle display -> reference / canonical-live | **Still live for Phase 8.** Generic uses of “reference” caused the canonical hit; the named CP-SAT workflow remains the old oracle-named workflow and is separately inventoried as old-live. |
| 9 | `run-solverv2-direct.mjs` -> `run-solver-direct.mjs` / mixed | **Still live for Phase 9.** The physical old file exists; the canonical file does not. Canonical text elsewhere is not implementation. |
| 10 | `additive-fraction` -> `additive-wall-multiplier` / canonical-live | **Partially superseded.** `StageBudgetPolicyId` is already canonical on current main. Phase 10 must not recreate/rename that definition; it retains only the historical-reader/compatibility audit implied by the dual-read ledger row. |
| 11 | runtime variant -> orientation / canonical-live | **Still live for Phase 11.** The row is conceptual. Runtime state still exposes `EngineState.variant`; the concrete `eng.variant` and `setVariant` rows are old-live. Generic “orientation” usage is not migration completion. |
| 11 | geometry argument variant -> orientation / canonical-live | **Still live for Phase 11.** Geometry/LevelUtils APIs still carry `variant` arguments. |
| 12 | ActionType command members -> GameCommandType / no-reference | **Still live for Phase 12.** `modules/runtime/actions.ts` still has one mixed `ActionType` object containing command members `MOVE/UNDO/RESET/LEVEL_*`. The ledger phrase is descriptive rather than literal. |
| 12 | ActionType event members -> GameEventType / no-reference | **Still live for Phase 12.** The same `ActionType` object still contains outcome/event members `BACKTRACK/PORTAL_TRAVERSE/GOOSE_TRIGGERED/FALSE_GOAL_DETONATED/WIN/LOGIC_STATE_CHANGE`. |
| 12 | event variable carrying command -> command / canonical-live | **Still live for Phase 12 where applicable.** “command” is generic current vocabulary and cannot prove the variable audit complete; the phase must follow the ActionType consumer graph. |
| 12 | command variable carrying event -> event / canonical-live | **Still live for Phase 12 where applicable.** Same generic-word limitation as above. |
| 13 | normalized reqLen -> requiredLength / no-reference | **Still live for Phase 13.** `NormalizedLevel.reqLen` is literal current code; the ledger prefix “normalized” is explanatory. Raw wire `reqLen` remains intentionally retained. |
| 13 | normalized reqInt -> requiredIntersections / no-reference | **Still live for Phase 13.** `NormalizedLevel.reqInt` is literal current code; raw wire `reqInt` remains intentionally retained. |
| 14 | `modules/core.ts` -> specific dependencies / mixed | **Still live for Phase 14.** `modules/core.ts`, `createCore`, and `SOUND_BUS` remain live. Individual specific dependencies existing elsewhere do not mean facade extraction is complete. |
| 14 | `modules/level-utils.ts` -> direct domain imports / no-reference | **Still live for Phase 14.** The physical facade exists and `createLevelUtils` remains live; the target is an architectural action, not a literal destination filename. |
| 14 | mutable `ENGINE` property -> `engineState` / canonical-live | **Still live for Phase 14.** `ENGINE` remains the live mutable state property. Generic local variables named `engineState` are not proof of the facade/state-property migration. |
| 14 | qualified `*-core.ts` retained term / no-reference | **Retained no-op.** This ledger row exists to protect ADR-0006-qualified core modules from blind deletion/renaming. No implementation rename is required. |
| 14 | `state/actions/core-actions.ts` -> same / mixed | **Retained no-op.** The qualified file is intentionally retained; its same-name row is a guardrail, not a migration. |

No new Phase-8-14 canonical rename mapping was discovered that is absent from the plan/ledger. The one already-absorbed definition change is the Phase-10 stage-budget policy spelling above. The previously planned Phase-8 diagnostics-workflow case fix was completed by this hardening PR and is explicitly marked superseded in the plan rather than left as duplicate future work.

The ledger's `surfaceInventory` verification dimension is therefore complete for every Phase-8-14 row. This does **not** mark any implementation, targeted validation, consumer audit, behavioral parity, or closeout audit complete.

## 12. Phase-8 readiness record

### New durable controls added before Phase 8

- prospective Phase-8+ ledger completion contract, including enforced migration classes and six verification dimensions;
- phase/range-aware execution-surface inventory covering package commands, scripts, workflows, modules, exported symbols, current docs, report paths, CI reachability, transport categories, and old-vs-canonical references;
- report-path role classification distinguishing likely producers, consumers, publishers, and neutral references;
- Phase-8 inventory regression coverage plus a consolidated cheap CLI/runtime smoke suite;
- plain-Node import-boundary guard preventing native-Node roots from importing TypeScript-only runtime targets;
- literal workflow path-filter existence/exact-case validation;
- typed public solver option/result boundaries using the owning `SolveOpts` and false-goal result contracts;
- existing SolveOpts dual-read transport-parity guard retained as a permanent check;
- shared plain-JS hint/provenance runtime for native-Node and TypeScript consumers.

### Phase-8 surfaces not behaviorally executed in ordinary PR CI

These are intentionally recorded rather than silently treated as covered:

- `scripts/repair-direct-probe-worker.mjs`: child-process worker. The parent CLI is runtime-smoked; worker path/import integrity is structurally checked. Phase 8 must preserve the parent/worker protocol when renaming both files.
- `scripts/stress/symmetry-repair-seed-pilot.mjs`: requires a matched historical parent level, generated variant, manifest, and recorded result. CI performs structural coverage; Phase 8 should use a targeted historical fixture/run if the rename touches command wiring beyond the filename.
- workflow-heavy CP-SAT, atlas/prune-gap, variant-family dataset, diagnostics-export, and offline-replay surfaces: workflow-local paths are structurally checked in PR CI. Their Phase-8 implementation must validate workflow inputs/outputs, job/display/concurrency/artifact identities, and representative command invocation without launching expensive research campaigns.

### Compatibility and duplicated mapping status

- Remaining package-command aliases are compatibility at `package.json` only. Internal scripts/modules must not carry dual command-name knowledge.
- The real Phase-8 compatibility boundaries are the diagnostics generated schema (`knownHardCluster` / `recommendedGating`) and the external dataset-root environment variable. Their owning boundaries are fixed in Section 10.
- Solver option transport duplication has a parity guard and the public solver port now uses `SolveOpts`; no Phase-8 solver-option rename is planned.
- Existing stage, scheduler, routing-regime, and hint/provenance compatibility maps remain centralized and must not be copied into Phase-8 tools.

### Higher-risk remaining phases

- **Phase 8:** high-risk external env-var compatibility plus medium-risk generated-report fields, tool/workflow identities, and the live research-lineage module/type family.
- **Phase 11:** high-risk application-wide runtime orientation migration crossing engine state, transforms, rendering, pointer inverse transforms, editor operations, and tests.
- **Phase 13:** high-risk normalized-level field expansion. Raw wire `reqLen`/`reqInt` remain compatibility spellings while normalized/runtime consumers migrate atomically.
- **Phase 10:** medium-risk budget vocabulary because part of the concept is already canonical while the live repair option/local names remain old; implementation must reconcile rather than mechanically rename the whole original row set.

### Readiness result

**READY FOR PHASE 8 AFTER THIS HARDENING PR IS ACCEPTED.**

The refreshed census commit is `5db2769282d690ce7c12bdcd6aebf064ca467476`. Every remaining ledger row has a migration class and completed pre-implementation surface inventory. Phase 8 implementation, targeted validation, adversarial consumer audit, behavioral/evidence parity, and closeout audit all remain pending. This hardening pass stops at the gate and does not perform any Phase-8 canonical rename.

## 13. Second hardening review before Phase 8

A second history review was performed after the technical gate had been marked ready and before any Phase-8 canonical rename began. This did not reopen or invalidate the technical work from #1580. It addressed process liabilities that the first hardening pass had documented but had not yet made sufficiently durable:

- preserved the PR-by-PR failure history and derived rules in [`naming-cleanup-history-and-lessons.md`](naming-cleanup-history-and-lessons.md);
- converted Phase 8 from one 68-row implementation PR into eight serial batches grouped by compatibility owner/execution domain;
- added [`naming-cleanup-phase-record-template.md`](naming-cleanup-phase-record-template.md) so impact maps, validation topology, before/after parity, consumer audits, and pre-merge comparisons survive the agent/session that performed them;
- strengthened the ledger contract with per-row batch/evidence pointers and one top-level active-execution claim;
- added explicit no-stacking and duplicate/no-op pre-merge rules;
- split later broad/high-risk phases into prep/atomic-switch/merged-tree-closeout or smaller domain batches in the plan.

No Phase-8 canonical rename is part of this second hardening review. Its purpose is to make the already-ready technical substrate much harder to use in the same failure-prone way as Phases 1-7.

# Naming-cleanup process hardening

Status: **active prerequisite for naming-cleanup PR 8 and later**.

This document records the process failures exposed while implementing and repeatedly auditing Phases 1-7 of [`naming-cleanup-plan.md`](naming-cleanup-plan.md), and defines the table-setting work that must be completed before Phase 8 begins. It is explanatory and procedural. Canonical vocabulary remains owned by [`naming-and-vocabulary.md`](naming-and-vocabulary.md); exact rename mappings and phase sequence remain owned by the naming-cleanup plan; machine-readable entry state remains in [`naming-cleanup-ledger.json`](naming-cleanup-ledger.json).

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

Each phase now has five explicit stages.

### Stage A: entry / impact map

Before editing:

1. update from current `main`;
2. select the phase's ledger rows;
3. fill the contract-migration matrix from [`change-recipes.md`](change-recipes.md);
4. identify which normal CI checks actually exercise each live consumer;
5. add missing tests/checks before or with the implementation when practical.

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

The closeout audit must not simply reread the implementation diff or trust the ledger's current state.

### Stage E: behavioral/evidence parity and phase closure

For solver/application behavior-preserving migrations, compare the relevant before/after observable behavior. Depending on the phase this may include:

- attempt/stage order;
- work/node accounting;
- solved outcomes;
- report row inclusion/grouping;
- UI state/render behavior;
- round-trip bytes/fingerprints;
- workflow command/path resolution.

Only after Stages A-E may the phase advance `lastCompletedPhase`.

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

The ledger remains the checklist of record, but it is no longer sufficient for a future row to carry only `status`.

For Phase 8 onward each entry has a `verification` object with these fields:

- `surfaceInventory`;
- `implementation`;
- `targetedValidation`;
- `consumerAudit`;
- `behavioralParity`;
- `closeoutAudit`.

Values are `pending`, `done`, or `not-applicable`. A row may use `not-applicable` only with a short explanation in `notes` or the phase PR.

A future row can become `status: "done"` only when every verification field is `done` or `not-applicable`.

The ledger also carries a Phase-8 hardening gate. Until that gate is marked ready, agents must not begin PR 8 implementation.

This richer model applies prospectively. Phases 1-7 retain their existing historical `done` rows and the detailed closeout notes recording the later audits; do not manufacture retroactive verification claims for checks that were not actually run at the time.

## 8. Scope discipline

The table-setting pass may add tests, checks, shared normalization/projection helpers, typing, and documentation needed to make future migrations safe. It must not opportunistically perform Phase-8 canonical renames.

If hardening exposes an already-live Phase-1-7 regression, fix it and record it before unblocking Phase 8. If it exposes unrelated solver policy or research questions, record/split them rather than changing behavior under the naming-cleanup umbrella.

## 9. Handoff for the next agent

The next naming-cleanup agent's task is **table-setting, not Phase 8 implementation**:

1. read this document, the naming-cleanup plan, ledger, and rename recipe;
2. inspect current `main` and recent Phase-1-7 repair PRs;
3. implement Sections 3.1-3.8 above;
4. strengthen repository checks/tests where known failure classes can be mechanically prevented;
5. reconcile Phases 8-14 against that stronger execution model;
6. update the plan/ledger with any resulting scope changes;
7. leave Phase 8 blocked unless every readiness requirement is actually satisfied.

The following agent should then be able to execute Phase 8 from a current, consumer-aware impact map with substantially less dependence on private agent memory and substantially more repository-enforced proof.


## 10. Table-setting progress

### 2026-08-29: execution-surface inventory and first smoke coverage

This pass advances the hardening gate against `main` at `5db2769282d690ce7c12bdcd6aebf064ca467476`. The Phase-8 gate remains **blocked**.

Completed infrastructure:

- added `scripts/naming-cleanup-surface-inventory.mjs` / `npm run naming:surface-inventory`;
- the inventory derives the actual PR-CI package roots from `.github/workflows/ci.yml`, follows package-script dependencies, maps local script targets and workflow targets, and can filter exact planned surfaces by naming-cleanup phase;
- surfaced script coverage is deliberately classified as **direct CI execution**, **CI test reference**, **workflow-path structural only**, or **uncovered by known CI** rather than collapsed into a single boolean;
- added a regression test for the inventory's Phase-8 classification so changes to CI/package wiring cannot silently change what the hardening process thinks is covered;
- added `scripts/check-naming-cleanup-ledger.mjs` to the normal validation graph, enforcing the prospective Phase-8+ verification object, forbidding `done` rows with pending verification, and preventing Phase-8+ implementation state while the gate is blocked;
- added a plain-Node synthetic smoke for `family-trove-doctor.mjs`, exercising its `--json`, `--root`, and legacy `PATHFINDER_VARIANT_TROVE` root-selection contract without requiring the historical multi-gigabyte dataset.

Representative findings encoded by the new inventory:

- `test:hint-path-oracle` is a surfaced Phase-8 package command that is **not directly reachable from the PR-CI package-command graph**, while the underlying `hint-path-oracle.mjs` has at least one CI-reachable test reference. The inventory therefore records it as **CI test reference**, not direct execution. Before the Phase-8 rename, the table-setting audit still needs to determine whether that indirect reference substantively exercises the command/runtime contract; its full command reads the split `data/hints/` artifact, which the Node-test sparse checkout intentionally does not materialize.
- `stress/restart-continuation-population-pilot.mjs` is not directly run by CI, but its current CLI contract is referenced by the CI-reachable `restart-continuation-population-pilot-cli-node-test.mjs`. The inventory records this as **CI test reference**, not direct execution.
- workflow-local script targets receive **structural** existence validation through the CI-reachable `check:workflow-actions`; this does not prove workflow input/output or behavioral semantics. The known `audit-export.yml` exact-case `modules/Solver.ts` path-filter defect remains a planned Phase-8 correction and is not silently treated as covered by the structural check.
- `family-trove-doctor.mjs` previously had a surfaced package alias but no PR-CI execution. Its new synthetic smoke closes that specific runtime/CLI blind spot and establishes a pre-migration test for the legacy dataset-root environment variable.

Gate status by subsection:

- **3.1 live execution-surface inventory: PARTIAL.** Package commands, script entrypoints, workflow targets, current-doc references for exact tool rows, and CI command reachability are now mechanically inspectable. Public module/port surfaces and generated-report producer/consumer relationships still need inventory.
- **3.2 cheap smoke coverage: PARTIAL.** The variant-family dataset boundary doctor now has real Node-20 CI smoke coverage. Other Phase-8 uncovered commands identified by the inventory still need case-by-case treatment.
- **3.3 shared transports/duplicated mappings: NOT YET COMPLETED by this pass.**
- **3.4 compatibility-normalization quarantine: NOT YET COMPLETED by this pass.**
- **3.5 runtime/type seams: PARTIAL.** The new doctor smoke exercises a real plain-Node Phase-8 boundary and the inventory exposes workflow structural coverage separately; the broader `.mjs`/`.ts`, weak-port-type, and exact-case path audit remains.
- **3.6 rename-impact/census tooling: PARTIAL.** Exact Phase tool/package/workflow/doc surface matching and CI exposure are now available. The broader per-concept classification of old-name residue, compatibility reads, canonical writers, and unexercised non-tool consumers remains to be built or reconciled with existing checks.
- **3.7 current-main reconciliation of Phases 8-14: NOT YET COMPLETED by this pass.**
- **3.8 Phase-8 readiness record: NOT READY.**

Useful commands for the next pass:

```sh
npm run naming:surface-inventory -- --compact --phase=8
npm run naming:surface-inventory -- --compact --phase=8 --uncovered
npm run naming:surface-inventory -- --json --phase=8
npm run check:naming-cleanup-ledger
```

Do not infer from this progress record that the Phase-8 gate can be opened. Its purpose is to replace one part of the previous manual census with durable machinery and to give the next table-setting pass a concrete list of uncovered surfaces to work down.

# Naming-cleanup implementation history and lessons

Status: **current retrospective for the active naming-cleanup program**.

This document records the implementation history that motivated the stronger execution model for the remaining work in [`naming-cleanup-plan.md`](naming-cleanup-plan.md). It is not the vocabulary authority and it does not replace the plan, ledger, or change recipe. Its job is to preserve the failure history so future agents understand why the remaining work is deliberately more serialized, evidence-heavy, and consumer-oriented.

## 1. Scope of this retrospective

The original decision-complete plan landed in PR #1544. The retrospective began with the implementation and repair chain through PR #1582 on 2026-08-29 and is amended when later phases expose genuinely new failure classes. Phase 9 added such an amendment after PR #1599 on 2026-08-30.

The important pattern is not that one implementation was unusually bad. The repository repeatedly produced plausible, green, locally correct migrations that were incomplete at a different boundary. The same classes of omission reappeared across solver APIs, research tooling, generated data, workers, workflows, application state, and documentation authority.

Snapshot at the start of this review on 2026-08-29, before this hardening PR was opened:

- Phases 1-7 were implemented and had been subjected to repeated follow-up audits;
- the pre-Phase-8 hardening infrastructure from PR #1580 was on `main`;
- Phase 8 had not started;
- there were no open pull requests matching the naming-cleanup work;
- GitHub contained **37 branches whose names included `naming-cleanup`**, most of them historical implementation/audit branches that must not be treated as current authority without an explicit comparison against `main`.

These counts are historical evidence for the branch-authority problem, not volatile facts that later agents should keep manually synchronized.

## 2. Timeline

### Plan and authority setup

- **#1544** created the decision-complete naming-cleanup plan and latest-main reconciliation.
- **#1547** created the permanent vocabulary authority, machine-readable ledger, and initial rename recipe.
- **#1548** implemented the workstream/roadmap vocabulary phase.

### Rapid implementation of Phases 3-7

- **#1549** migrated routing-regime terminology.
- **#1550** migrated canonical attempt identities and removed redundant solver API aliases.
- **#1551** implemented Phase 5, but its PR body was empty.
- **#1552** was an unmerged Phase-6 PR superseded by **#1553**, which merged the stage/scheduler migration.
- **#1554** implemented the false-goal triggerability migration.

This period established an important failure mode: a phase could look complete at the owning definitions and still leave consumers, generated-data paths, or application code behind.

### First forensic repair wave

PRs **#1555-#1568** repaired omissions discovered after phases had already been treated as complete. The fixes included:

- stale solver/profile/ordering vocabulary;
- hint provenance still writing or consuming historical field names;
- editor false-goal scan code speaking the old request/progress/result contract to canonical APIs;
- mechanical CI fallout from partially propagated Phase-5 changes;
- a legacy ablation alias that normalized correctly but was still read incorrectly at runtime;
- a duplicate legacy false-goal search implementation and stale physical file names;
- inaccuracies in the Phase-7 plan/ledger mappings themselves;
- generated hint metadata that still used removed field names;
- a leftover false-goal budget alias;
- incomplete near-tie/coarse-state terminology;
- additional internal Phase-7 names that were absent from the original inventory.

Several of these were functional regressions, not cosmetic naming residue.

### Second consumer-oriented repair wave

PRs **#1569-#1578** found and repaired another layer of failures:

- current workflow/documentation references still pointed at removed names;
- beam-retention telemetry producer/consumer labels disagreed;
- Phase-6 stage migration was not truly single-write canonical;
- the ablation toolchain still called removed solver APIs and consumed removed metadata;
- scripts and workflows could be broken while the maintained validation floor remained green;
- editor overlays disappeared because render consumers still read pre-migration state fields;
- submission-time false-goal budget enforcement silently failed because a caller passed `timeLimit` instead of `timeLimitMs`;
- a canonical option was forwarded in one solver path but dropped in a sibling worker transport;
- scheduler provenance was written with a removed value;
- tooling read a removed AttemptConfig field;
- plain-Node scripts imported TypeScript-only runtime modules and failed under the repository's supported Node 20;
- raw historical stage comparisons silently excluded valid rows;
- a canonical routing-regime value was written under a legacy field name.

PR **#1576** added a narrow consumer-residue guard only after those failures demonstrated that ordinary CI did not exercise enough of the renamed surface.

PR **#1578** consolidated three independent audits and added transport/runtime guards, typed ports, and regression tests for concrete failure shapes.

### Process hardening

- **#1579** converted the audit lessons into a blocking pre-Phase-8 process model.
- **#1580** implemented the table-setting infrastructure: surface inventory, CI-exposure mapping, runtime-boundary checks, workflow path checks, typed ports, cheap Phase-8 CLI smokes, migration classes, and current-main reconciliation.
- **#1581** updated the docs/ledger to record that #1580 had merged.
- **#1582** carried the **same closeout patch as #1581 and also merged**. That no-op/duplicate merge is useful evidence in its own right: branch and PR authority were still not mechanically or procedurally explicit enough even after the technical hardening work.

### Phase 9: a green-local / red-remote closure failure

PR **#1599** implemented the Phase-9 command/tool/live-report renames and merged only seconds after it
opened, before GitHub CI finished. The eventual CI run was red even though the checked-in Phase-9
record claimed aggregate validation and closeout were green.

The failures exposed three new classes:

- **CI topology is part of the contract.** The new closeout checker required renamed report files to
  exist physically, but the Node-test job intentionally sparse-checks out `reports/`. Its synthetic
  test also copied the same large files, so both failed under the real CI topology despite passing in
  a full checkout.
- **Repository-object readers need repository-scale I/O assumptions.** Incremental text validation
  tried to `git show` the roughly 29 MB renamed Corpus-2 report through Node's default
  `execFileSync` buffer and failed with `ENOBUFS`.
- **A rename can strengthen semantics.** Replacing the generic parallel-report default with
  `solver-corpus1-latest.json` was unsafe because the producer still accepted Corpus 2 and custom
  corpora. Literal substitution created a path that could silently mislabel and overwrite another
  input domain.

The same audit also confirmed a specification-accounting failure the preparation work had explicitly
warned about: `stress:benchmark:raced` was a distinct surfaced package identity, but #1599 renamed it
without first assigning a ledger row. The repair added NC-P09-009 rather than retroactively pretending
the parent row had authorized the sibling identity.

Phase 9 was reopened instead of letting its stale completion claim stand. The repair record is
[`naming-cleanup-phase-records/phase-09-repair.md`](naming-cleanup-phase-records/phase-09-repair.md).

## 3. What actually went wrong

### 3.1 Completion was definition-centric

The first implementation model implicitly treated the owning definition as the center of the migration. Later audits repeatedly found that the real contract extended through workers, reports, historical readers, workflow inputs, UI/controller state, and CLI tools.

A rename is complete only when every live producer/transport/consumer boundary has a disposition and evidence.

### 3.2 The validation graph did not match the execution graph

The normal check/type/lint/unit-test floor was genuinely green while many maintained scripts and workflow targets were broken. Some tests also exercised tools through a bundler or newer runtime that masked failures in their real plain-Node execution mode.

A test counts only if it exercises the relevant surface through the runtime/path that users or workflows actually use, or if the record explicitly says the validation is structural only.

### 3.3 Compatibility was treated as a spelling concern

Dual-read/single-write migrations failed when aliases leaked beyond their owning normalizer. Correct values were sometimes written under legacy field names, raw historical strings were compared without normalization, and one path forwarded only the old option while another understood both.

Compatibility needs an owner, canonical internal representation, single-write assertion, and representative historical downstream fixture.

### 3.4 The ledger described state better than it proved state

A row marked `done` or even a set of verification booleans can still be updated without leaving durable evidence of what was searched, which runtime was exercised, which consumers were audited, or what before/after behavior was compared.

The remaining phases therefore require checked-in phase/batch records that contain the impact map and evidence supporting ledger transitions.

### 3.5 Phase and PR boundaries were too large or too fluid

Large phases encouraged several failure patterns at once:

- implementation and audit scope became difficult to hold in one context;
- unrelated migration families shared one completion decision;
- stacked repair branches made it hard to know which branch contained the authoritative fix;
- follow-up agents had to reconstruct whether an abandoned branch contained unique work;
- an empty or weak PR description could carry a substantial migration without a durable handoff.

The remaining work is organized as serial batches. A phase is a milestone; it does not imply one giant PR.

### 3.6 Branch authority was ambiguous

The history contains superseded PRs, stacked branches, orphaned work, and duplicate closeout PRs. The current repository still has dozens of historical naming-cleanup branches.

Before editing, an agent must establish one authoritative active batch branch and prove whether any similarly named branch has unique commits worth recovering. Before merge, it must prove the PR has a non-empty, intended diff against current `main`.

### 3.7 Independent re-audits were valuable because the implementation context was biased

The later audits found issues that repeated implementation passes did not. A consumer-inward closeout should therefore be a genuinely distinct pass. Prefer a fresh agent/session when available. If the same agent performs it, the phase record must say so and the audit must start from current consumers/surfaces rather than the implementation diff.

## 4. Rules derived from the history

The plan, hardening document, and change recipe now encode these rules:

1. **One active naming-cleanup batch at a time.** Do not stack the next implementation batch on an unmerged predecessor.
2. **Every batch starts from current `main`.** Record the exact SHA.
3. **Every batch has a checked-in execution record.** The record contains scope, impact map, compatibility ownership, validation topology, before-change baseline, implementation notes, consumer audit, parity evidence, and closeout.
4. **Ledger verification requires evidence.** A verification field may become `done` only when the corresponding record section identifies the concrete evidence.
5. **Use the real execution boundary.** Native Node, bundled execution, worker transport, browser/UI, workflow structure, and generated-data paths are different validation surfaces.
6. **No stacked PR chains by default.** Merge and verify one batch on `main` before creating the next implementation branch.
7. **Pre-merge no-op/duplicate check is mandatory.** Compare the branch head to current `main`; if the intended changes are already present or the diff is empty, close/supersede rather than merge a duplicate.
8. **Close out from consumers inward.** Do not use the implementation diff as the audit checklist.
9. **High-risk migrations capture before/after parity.** Behavior-preserving means observable parity is demonstrated, not assumed from naming intent.
10. **A newly discovered surface expands the impact map before the code patch expands.** Update the plan/ledger/record first when the new surface changes scope or compatibility requirements.
11. **Historical branches are evidence, not authority.** Recover unique commits explicitly; otherwise ignore them.
12. **The next phase does not begin merely because CI is green.** It begins after the prior batch is merged, its phase record is closed, and the ledger state is consistent with that record.
13. **Required GitHub PR CI must finish before merge.** A local aggregate, an older PR revision, or a queued/running workflow is not current merge evidence.
14. **Sparse checkout is a real execution environment.** Repository-existence/content checks must distinguish tracked HEAD state from working-tree materialization, and synthetic tests should not depend on large live artifacts.
15. **Specific names require specific producers.** When a generic artifact/default becomes corpus-, mode-, or engine-specific, prove the producer is constrained accordingly or derive the name from actual input with a generic fallback.
16. **Sibling surfaced identities require explicit ownership.** Suffixed aliases, alternate-engine commands, companion workflows, and sibling artifacts do not inherit authorization from a nearby ledger row.

## 5. How to use this document

A naming-cleanup agent should read this retrospective once at entry, then operate from:

1. [`naming-cleanup-plan.md`](naming-cleanup-plan.md) for fixed mappings and sequence;
2. [`naming-cleanup-ledger.json`](naming-cleanup-ledger.json) for machine-readable state;
3. [`naming-cleanup-process-hardening.md`](naming-cleanup-process-hardening.md) for the verification model;
4. [`naming-cleanup-phase-record-template.md`](naming-cleanup-phase-record-template.md) and the active phase record for durable evidence;
5. [`change-recipes.md`](change-recipes.md) for the contract-migration mechanics.

The purpose of retaining the history is to keep the repository from gradually relaxing the safeguards once the immediate pain of Phases 1-7 is less salient.

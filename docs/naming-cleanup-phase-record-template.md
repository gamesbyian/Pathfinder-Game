# Naming-cleanup phase/batch execution record template

Copy this file to a stable path such as `docs/naming-cleanup-phase-records/phase-08-batch-8a.md` before implementation begins. The checked-in record is the evidence backing the ledger's Phase-8+ verification fields. It must be updated as the batch progresses.

Do not use a chat transcript, private scratchpad, or PR body as the only copy of this information.

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | |
| Batch | |
| Status | not-started / entry-mapped / implementing / validating / closeout / complete |
| Base `main` SHA | |
| Branch | |
| PR | |
| Selected ledger row IDs | |
| Reconciliation mode | delta / full |
| Highest risk in batch | low / medium / high |
| Primary compatibility owner | none / boundary name |
| Canonical mappings | |
| Implementation agent/session | |
| Closeout auditor | fresh agent/session preferred; record if same |

### Branch/PR authority preflight

- [ ] searched open naming-cleanup PRs;
- [ ] searched similarly named naming-cleanup branches;
- [ ] compared any plausible predecessor/sibling branch against current `main`;
- [ ] recovered or explicitly superseded any unique commits relevant to this batch;
- [ ] confirmed this is the only active implementation batch;
- [ ] confirmed the branch starts from the recorded current-`main` SHA.

Record relevant branches/PRs and disposition here:

| Branch / PR | Unique relevant work? | Disposition |
| --- | --- | --- |
| | | |

## 1. Scope, change envelope, and stop conditions

State what this batch changes and what it deliberately does not change.

List selected rows by immutable ledger ID, not only by old/new prose. Confirm the ledger risk class using the plan's rubric; raise it before implementation if the impact map exposes a stronger boundary.

### Change envelope

**Intended observable deltas**

- names/paths/labels/schema keys/deprecation text explicitly authorized for this batch:
-

**Invariant observables**

- behavior/data/resource/workflow/UI properties that must not change:
-

**Out of scope / separate authorization**

- findings that would require behavior/schema/resource-policy or specification changes:
-

If a newly discovered surface is merely another consumer of an existing fixed mapping, extend this record/impact map. If it changes the canonical target, compatibility owner/lifetime, risk, batch assignment, or allowed change envelope, stop and follow the specification-amendment protocol before implementation continues.

Explicit stop conditions for this batch:

- behavior/resource-policy change discovered;
- ambiguous historical identity;
- unowned compatibility boundary;
- live consumer cannot be identified or credibly validated;
- current `main` has superseded the planned architecture;
- required work belongs to another batch/phase.

## 2. Pre-edit impact map

Run the phase-aware inventory and relevant tooling census before editing. Record commands and the meaningful findings, not just “ran successfully.”

Suggested entry commands:

```sh
npm run naming:status -- --batch=<batch>
npm run naming:surface-inventory -- --compact --phase=<phase>
npm run naming:surface-inventory -- --compact --phase=<phase> --uncovered
node scripts/tooling-census.mjs --compact --query=<legacy-term>
node scripts/tooling-census.mjs --compact --query=<canonical-term>
```

### Target occupancy / collision check

| Canonical target | Existing live use? | Same concept / unrelated / collision / already migrated | Disposition |
| --- | --- | --- | --- |
| | | | |

A materially different existing use of the target name is a specification blocker.

### Contract-migration matrix

Every plausible category must be classified as **migrate**, **compatibility read**, **retained/frozen**, or **not applicable**. “No search hit” is not evidence by itself.

| Surface | Classification | Concrete locations | Evidence / planned test |
| --- | --- | --- | --- |
| Definition / producer | | | |
| Internal direct consumers | | | |
| Canonical parser / normalizer | | | |
| Sequential transport | | | |
| Alternate worker/race transport | | | |
| Serialized writer | | | |
| Historical reader / fixture | | | |
| Report/export projection | | | |
| Analyzer/grouping consumers | | | |
| CLI / package alias | | | |
| Workflow command/inputs/outputs | | | |
| Artifact/concurrency/cache/path identifiers | | | |
| Hint/provenance storage | | | |
| Application/UI/editor consumer | | | |
| Current docs/examples | | | |
| Frozen historical evidence | | | |

## 3. Validation topology

Map live surfaces to the check that really exercises them.

| Surface | Real runtime/path | Existing coverage | Coverage class | Gap/action |
| --- | --- | --- | --- | --- |
| | native Node / bundled / worker / browser / workflow / parser | | direct / indirect / structural / none | |

A test that reaches a native-Node tool only through a bundler does not prove the native-Node contract. A workflow path-existence check does not prove workflow input/output semantics.

## 4. Compatibility and frozen-history ownership

For each dual-read row, copy its ledger compatibility policy into the record and verify that implementation keeps legacy knowledge at that owner only. For frozen-history-only rows, identify what remains intentionally untouched.

| Row ID | Legacy form | Canonical form | Mode / retireWhen | Owning boundary | Legacy read test | Canonical write/runtime rule | Frozen artifacts unchanged |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

Do not duplicate legacy maps in sibling consumers.

For `temporary-command-alias`, the old alias must be gone by owning phase closeout. `phase-15-review` is a decision gate, not automatic deletion. `wire-format-retained` means the raw writer intentionally keeps the historical wire spelling while normalized/runtime code uses canonical names.

### 4.1 High-risk rollback plan

For a high-risk batch, state the rollback unit before implementation. Prefer reverting the whole atomic batch over partial restoration of old/new names. Identify any compatibility reader or raw-wire invariant that must survive a revert.


## 5. Before-change baseline

For medium/high-risk behavior-preserving work, capture the smallest useful pre-change observable baseline before editing. The baseline must exercise an invariant from the Section 1 change envelope, not merely preserve the old spelling.

Examples:

- exact CLI help/parse shape;
- representative worker message/result;
- serializer/parser round trip;
- report row inclusion/grouping;
- workflow command/path resolution;
- UI state/render behavior;
- solver attempt/stage order, `workSpent`, nodes, and solved outcome where solver behavior is in scope.

| Command / fixture | Before result / fingerprint |
| --- | --- |
| | |

If behavioral parity is genuinely not applicable, explain why.

## 6. Implementation log

Record the canonical changes actually made. Keep this concise and consumer-oriented.

If implementation reveals unplanned behavior change or architecture replacement, stop and move the issue back to Section 1 rather than silently absorbing it.

## 7. Targeted contract validation

Record exact commands and outcomes. For each migrated boundary, identify what the test proves.

| Command / test | Boundary proved | Result |
| --- | --- | --- |
| | | |

Where practical, the regression test should be capable of failing for the historical bug shape rather than merely asserting that the final command exits zero.

## 8. Consumer-inward closeout audit

This is a distinct pass after implementation. Prefer a fresh agent/session. Start from consumers, not from the diff.

Audit:

- package commands and surfaced CLIs;
- workers/raced execution;
- workflows and exact-case targets;
- generated-data readers/writers/analyzers;
- current docs/reproduction commands;
- application/UI/editor consumers where relevant;
- historical compatibility paths.

Record findings, including “none,” and the auditor identity/session.

## 9. Behavioral/evidence parity

Compare against Section 5.

| Observable | Before | After | Parity |
| --- | --- | --- | --- |
| | | | |

Any unexplained behavior/evidence change blocks completion.

## 10. Residue and authority reconciliation

Record:

- reconciliation mode used (delta/full), base/reconciliation SHA, and why that level was sufficient;
- target-occupancy result for every canonical target;
- legacy-term/residue searches;
- canonical-term searches;
- phase-aware surface inventory after implementation;
- documentation-link check;
- plan/ledger changes caused by newly discovered scope;
- intentional retained/frozen hits.

No unclassified live hit may remain in the batch scope.

## 11. Pre-merge barrier

- [ ] branch rebased/updated against current `main` as required;
- [ ] compare branch head against current `main`;
- [ ] intended diff is non-empty and contains no already-merged duplicate work;
- [ ] no unrelated next-batch implementation is stacked in this PR;
- [ ] targeted validation green;
- [ ] required aggregate CI green;
- [ ] ledger IDs, risk, compatibility policy, and verification fields match the evidence in this record;
- [ ] all predecessor phases/batches required by the ledger are complete;
- [ ] no specification amendment is being smuggled inside this implementation PR;
- [ ] PR description links this record and summarizes its unresolved risks;
- [ ] no unexplained solved-set, report-completeness, UI, or workflow behavior change.

Record current `main`, head SHA, and comparison result.

## 12. Closure and merge handoff

A batch is complete only after its applicable ledger verification dimensions are supported by this record.

After merge:

- next implementation batch starts from the new current `main`, not from this branch;
- do not keep working on the merged branch as an informal queue;
- if the next batch finds a regression from this batch, reopen/correct the affected verification state rather than pretending the prior closeout still proves correctness.

Final status:

| Item | Value |
| --- | --- |
| PR | |
| Final head SHA | |
| Merged? | |
| Ledger rows closed | |
| Deferred/superseded rows | |
| Known structural-only surfaces | |

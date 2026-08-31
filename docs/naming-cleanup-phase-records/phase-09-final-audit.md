# Phase 9 final-audit repair record

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 9 final adversarial audit / reopened closeout |
| Status | final closure state; merge only after #1606 exact-head CI is green |
| Base `main` SHA | `aa6370dedbaffcc361ba6982aafa86808275da6b` (post-#1603 main) |
| Branch | `chatgpt/phase9-final-audit-closeout-repair-2026-08-30` |
| PR | #1605 |
| Prior implementation PR | #1599 |
| Prior repair PR | #1600 |
| Prior merged-tree closeout PR | #1601 |
| Partial final-audit repair PR | #1603, head `a548e05dbe7286e6170c827de7b3e1c5e6d27f7f`, exact-head CI run `33348457544`: **failure**, merged as `aa6370dedbaffcc361ba6982aafa86808275da6b` |
| Final repair PR | #1605, head `357af018cfbb9a6373583bef87f0ce8302978feb`, exact-head CI run `33349362190`: **success**, merged as `235b82c8063c153a78da589e17e0d17f4dcbd79f` |
| Merged-tree final closeout base | `235b82c8063c153a78da589e17e0d17f4dcbd79f` |
| Merged-tree final closeout branch | `chatgpt/phase9-merged-tree-final-closeout-2026-08-30` |
| Merged-tree final closeout PR | #1606 |
| External merge-enforcement follow-up | #1604 |
| Prior closeout merge | `a3bcf28b7b38178e052a6a5765c82bcd8e90dc57` |
| Reopened rows | NC-P09-001 through NC-P09-009 |
| Closure authority | this record once the repair and a merged-tree closeout have completed green |

## 1. Why Phase 9 was reopened again

A fresh adversarial audit after PRs #1600/#1601 found that the implementation logic was largely
sound but the completion claim still exceeded the evidence. PR #1603 then repaired part of the
artifact-provenance scope, but its exact-head CI run `33348457544` failed because the temporary
repair workflow itself violated the Phase-9 closeout and workflow-documentation checks. It was
nevertheless merged as `aa6370dedbaffcc361ba6982aafa86808275da6b`, so this final repair starts
from that merged tree and treats #1603 as partial evidence rather than a closure event.

Confirmed gaps:

1. The maintained live baselines `logs/stress-corpus1-baseline.json` and
   `logs/stress-corpus2-baseline.json` still carried retired Phase-9 provenance:
   the old live report paths and the old stress measurement package command.
2. The canonical current reports `reports/stress/solver-corpus{1,2}-latest.json` were moved
   byte-for-byte and therefore still carried the retired `stress:benchmark` spelling inside their
   `witnessAccess` provenance. Their current producer already emits the canonical implementation
   path, so the checked-in latest artifacts had drifted behind their producer.
3. `scripts/naming-cleanup-phase9-closeout.mjs` blanket-excluded `logs/` and `reports/` and did
   not scan `tests/` or `CLAUDE.md`. The blanket exclusion contradicted Phase-9 preparation, which
   explicitly classified the two stress baseline files as current reader inputs rather than frozen
   history, and is why the stale live provenance escaped.
4. The durable Phase-9 command smoke executed only `solver:measure-speed`; the other renamed
   surfaced entrypoints were only target-string assertions. That did not meet the plan's medium-risk
   requirement for representative runtime execution.
5. `phase-09-repair.md` still said merged-tree closeout was in progress after #1601 had completed
   green and merged, while the ledger already said Phase 9 was complete.
6. The ledger checker validated row completion but did not require machine-readable completed-phase
   closure evidence for Phase 9+, allowing a stale/incomplete Markdown record to coexist with
   `lastCompletedPhase: 9`.
7. `naming-cleanup-future-phase-preparation.md` still described Phase 9 as future/mechanically
   prepared work after implementation and repair had finished.
8. GitHub `main` remains unprotected with no repository ruleset/required checks. The repository
   tooling available to this session can read but cannot change that administrative setting, so a
   tracking issue #1604 owns that external repository-setting prerequisite; the durable process
   docs distinguish it from the in-repository textual/manual barrier.

## 2. Repair change envelope

This repair may change only Phase-9 naming/provenance, closeout validation, execution evidence, and
process documentation.

Allowed implementation changes:

- canonicalize stale Phase-9 provenance strings in the four maintained live stress artifacts without
  changing solver rows, corpus membership, budgets, solutions, or schema;
- register current artifacts explicitly in ledger closeout coverage so sparse CI scans them even
  though the surrounding `logs/` and `reports/` trees contain frozen history;
- extend the Phase-9 closeout scan to browser tests and explicit top-level authorities;
- exercise every Phase-9 surfaced command through its real npm/native/bundled entrypoint using
  zero-target synthetic fixtures;
- make Phase-9+ phase closure evidence machine-checkable in the ledger;
- reconcile stale Phase-9 records/preparation prose.

Out of scope:

- solver policy, attempt order, scoring, pruning, budget allocation, corpus contents, report level
  rows, workflow scheduling, historical archives, Phase 10 implementation.

## 3. Validation topology

| Surface | Required evidence |
| --- | --- |
| live artifact provenance | Phase-9 closeout scans all ledger-registered current artifacts under sparse checkout |
| current tests/top-level authority | Phase-9 closeout includes `tests/`, `CLAUDE.md`, and existing maintained roots |
| package entrypoints | `test:naming-cleanup-phase9-command-smoke` executes all canonical Phase-9 npm identities with zero-target fixtures |
| combiner package alias | same smoke invokes `solver:combine-sweep-reports` on synthetic empty shard reports |
| closeout negative behavior | `test:naming-cleanup-phase9-closeout` injects residue into ordinary tests and registered live artifacts |
| ledger completion evidence | `test:naming-cleanup-ledger` rejects completed Phase-9+ phases without a closed structured phase-closure record |
| aggregate behavior | required GitHub PR CI on the exact final head/base pair |
| merged-tree closure | separate evidence-only closure from the merged repair tree, itself green before merge |

## 4. Artifact parity rule

Across partial repair #1603 and final repair #1605, the four maintained artifact corrections are provenance-only string substitutions. No level row, solution,
attempt, budget, corpus identity, count, timestamp, commit SHA, or schema field may otherwise change.

Canonical substitutions:

- `reports/stress/benchmark-parallel.json` ->
  `reports/stress/solver-corpus1-latest.json` in the current Corpus-1 baseline source metadata;
- `reports/stress/benchmark-latest-random.json` ->
  `reports/stress/solver-corpus2-latest.json` in the current Corpus-2 baseline source metadata;
- retired package command spelling `stress:benchmark --parallel` ->
  `stress:measure-solver --parallel` in current baseline provenance;
- stale pseudo-file spelling `stress:benchmark.mjs` ->
  `scripts/stress/benchmark.mjs` in the two current latest reports.

## 5. Closure rule

Phase 9 remained reopened throughout implementation PR #1605. That PR's final head
`357af018cfbb9a6373583bef87f0ce8302978feb` completed GitHub CI run `33349362190` successfully and
merged as `235b82c8063c153a78da589e17e0d17f4dcbd79f`. The present branch is the required narrow
merged-tree closeout from that exact merge. It may change only closure/evidence state and small
record hygiene. Its own exact final head must complete GitHub CI green before merge.

The prior records remain historical evidence:

- `phase-09.md`: original #1599 implementation and failed remote CI;
- `phase-09-repair.md`: #1600/#1601 first repair and closeout;
- this file: final adversarial audit and closure authority.

## 6. Final closure state

Repair PR #1605 is the final implementation-bearing Phase-9 repair. Its exact final head
`357af018cfbb9a6373583bef87f0ce8302978feb` completed GitHub CI run `33349362190` successfully
and merged as `235b82c8063c153a78da589e17e0d17f4dcbd79f`.

Merged-tree closeout PR #1606 is based directly on that merge and contains no implementation
changes. It closes NC-P09-001 through NC-P09-009 only after the repaired merged tree again passes
the Phase-9 live-artifact census, all surfaced npm-entrypoint smokes, ledger negative fixtures, and
aggregate repository CI. The ledger records this as a structured Phase-9 closure and returns
`activeExecution` to idle with Phase 10 next.

External GitHub enforcement remains separate: issue #1604 tracks required PR/status-check protection
for `main`. Until that setting is enabled, the exact-head-green-before-merge rule remains a manual
operator barrier even though the repository now records the required evidence mechanically.

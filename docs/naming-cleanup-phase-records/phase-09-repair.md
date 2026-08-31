# Phase 9 repair record: post-merge closure correction

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 9 repair / reopened closeout |
| Status | repair merged and validated; post-merge closure recorded in follow-up PR |
| Base `main` SHA | `3f980ec54147441e3922c990e272fdfe413170fb` |
| Branch | `chatgpt/phase9-repair-and-plan-hardening-2026-08-30` |
| Original implementation PR | #1599 |
| Original merge commit | `15cbf90a4b1f2bda5037ab4f6ef6584f45dc8154` |
| Original failing CI run | `33345175850` |
| Repair PR | #1600 |
| Reopened rows | NC-P09-007, NC-P09-008, and new accounting row NC-P09-009 |
| PR head at PR creation | `c5cb19a10d89aaf8e9e051d6cc22011ad8637310` |
| Intermediate failed repair CI | run `33345965965` on `31be14e3d962b7e18e1f8ba025247f0b665373f0` |
| Final repair PR head | `d545bcd0e81cddf16af8ba168f525d63200044d4` |
| Final repair CI | run `33346142339`: **success** |
| Repair merge commit | `2bf6b040ea2128bc3e4ec2a6039733238433d4fa` |
| Closure authority | this repair record plus the amended Phase-9 record |

## 1. Why Phase 9 was reopened

PR #1599 merged while GitHub CI for its current head/base pair was still running. That run completed
red after merge. The checked-in Phase-9 record nevertheless stated that aggregate validation and the
Phase-9 closeout checks had passed and advanced `lastCompletedPhase` to 9.

The post-merge audit found four concrete problems:

1. `check:naming-cleanup-phase9-closeout` required the two canonical report files to be physically
   materialized even though the `node-tests` CI job deliberately sparse-checks out `reports/`.
2. `test:naming-cleanup-phase9-closeout` copied those large report files into its synthetic fixture,
   creating the same sparse-checkout dependency.
3. `readRepositoryText()` used Node's default `execFileSync` output buffer for `git show`.
   Incremental text checking of the roughly 29 MB Corpus-2 report therefore failed with
   `spawnSync git ENOBUFS`.
4. The Phase-9 substitution changed the generic parallel stress-measurement default output to
   `solver-corpus1-latest.json` regardless of `--corpus`. A parallel Corpus-2 or custom-corpus run
   without `--out` could therefore overwrite a path whose filename asserts Corpus 1.

A specification-accounting gap was also confirmed. Preparation explicitly said that the live
`stress:benchmark:raced` package identity was distinct and required explicit classification. PR
#1599 renamed it to `stress:measure-solver:raced` without a ledger row or Phase-9 mapping.

## 2. Repair change envelope

The repair is intentionally narrow:

- make Phase-9 canonical-path existence checks repository-aware under sparse checkout;
- keep closeout negative fixtures synthetic rather than copying maintained report blobs;
- size Git-object reads from blob metadata so large unmaterialized tracked text files are safe;
- choose parallel stress-measurement default output by canonical corpus identity, with a generic
  fallback for custom corpora;
- add direct regression tests for the sparse large-blob reader and output-path decision;
- add NC-P09-009 and amend Phase-9 authority for the raced package identity;
- correct the original Phase-9 record and strengthen plan/process/template rules around exact PR CI,
  sparse checkouts, semantic output names, and unowned sibling identities.

No solver algorithm, attempt order, budget, scoring, corpus contents, report schema, or historical
artifact bytes are changed.

## 3. Validation topology

| Surface | Required evidence |
| --- | --- |
| large unmaterialized Git blob | `test:repository-file-view` |
| Phase-9 closeout under sparse CI | `check:naming-cleanup-phase9-closeout` in the real `node-tests` job |
| closeout negative fixtures | `test:naming-cleanup-phase9-closeout` |
| stress output identity | `test:stress-measurement-output-path` |
| package/command identities | `test:naming-cleanup-phase9-command-smoke` |
| renamed combiner | `test:combine-solver-sweep-reports` |
| ledger/accounting | `check:naming-cleanup-ledger` and Phase-9 closeout |
| aggregate repository behavior | complete PR CI for the final head/base pair |

## 4. Validation and closure evidence

The first repair revision audited in GitHub, `31be14e3d962b7e18e1f8ba025247f0b665373f0`,
failed CI run `33345965965`. Importantly, the original Phase-9 defects were already repaired there:
`check:naming-cleanup-phase9-closeout`, `test:naming-cleanup-phase9-closeout`,
`test:repository-file-view`, and `test:stress-measurement-output-path` all passed in the real
sparse Node-test topology. The remaining failures were closure/accounting fallout:

- the status fixture rejected the ad-hoc non-Phase-8 `batch: "repair"` label;
- the surface-inventory fixture hard-coded 114 future rows and failed after NC-P09-009 made 115;
- documentation validation treated a backticked retired package alias in the retrospective as a
  currently runnable bare npm command.

Those were corrected without runtime/solver changes. The final PR #1600 head
`d545bcd0e81cddf16af8ba168f525d63200044d4` then passed the complete GitHub CI workflow in run
`33346142339`, including checks, lint, node-tests, build, deep proofs, and deep verification. PR
#1600 merged as `2bf6b040ea2128bc3e4ec2a6039733238433d4fa`.

The post-merge tree therefore contains the validated repair. This follow-up closure changes only
evidence/ledger state: NC-P09-007, NC-P09-008, and NC-P09-009 may return to `done`,
`lastCompletedPhase` may return to 9, and `activeExecution` may return to idle once the closure
PR's own current-head CI is green.

The original Phase-9 record remains useful implementation history, but its original pre-merge
validation claims are superseded by this repair record where they conflict with GitHub CI evidence.

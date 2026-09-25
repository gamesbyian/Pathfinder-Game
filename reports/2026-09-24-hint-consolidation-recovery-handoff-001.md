# Hint consolidation recovery handoff — 001

> **Status:** superseded
> **Last evidence:** 2026-09-24 — The recovered continuation became PR #2072, whose final exact head `3ac9c52d4573` passed the complete remote closure set and merged as `3d4080ee3244`.
> **Decision:** This document remains historical branch-recovery provenance only. New work must start from current `main`; PR #2072 and its branch are no longer continuation authorities.
> **Remaining gate:** None. The consolidation program's current closeout authority is `reports/2026-09-24-hint-evidence-hostile-completion-audit-001.md`.

## Why this handoff exists

Several agents worked this program in parallel on September 23–24, and the repository accumulated multiple branches whose names plausibly look current. This handoff records the recovery pass so another agent can begin implementation without replaying branch archaeology.

## Historical continuation surface

The recovered continuation was:

- PR #2072: **Hostile audit of completed hint/provenance consolidation**
- branch: `chatgpt/hint-consolidation-hostile-audit-2026-09-24`
- recovered pre-handoff head: `b035122973da2f26fed4faa57d4da62590028649`

PR #2089 merged the then-current `main` into this branch at merge commit
`28ac54a09d93e12b51d07f871e66cef35d4f3718`. Comparing that merge commit to the recovered head shows
32 later commits. The relevant recovered changes are concentrated in the canonical plan, audit reports,
whole-store Hint tooling and the hostile completion implementation.

The most important current documents are:

- `docs/hint-evidence-execution-identity-storage-consolidation-plan.md`
- `reports/2026-09-24-hint-evidence-hostile-completion-audit-001.md`
- `reports/2026-09-22-hint-evidence-consolidation-preimplementation-audit-001.md`
- `reports/2026-09-23-hint-evidence-remaining-mechanical-migration-audit-001.md`
- Phase 3 / Phase 6 / Phase 8 closeout and repair reports referenced by the hostile audit.

The plan now contains the strengthened completion contract that the implementation history proved was
missing: mechanically derived populations, executable phase-exit proofs, persistence
event/occurrence/retry/capacity transition coverage, adversarial guard self-tests with scoped-CI input
ownership, topology-real validation, and one-exact-head Definition-of-Done evidence.

## Branches checked during recovery

The recent Hint/provenance branch set was reconstructed rather than inferred from old session state.

- `chatgpt/hint-consolidation-final-push-2026-09-24`: fully behind current `main`; no unique commits to recover.
- `chatgpt/continue-hint-evidence-consolidation-2026-09-23`: fully behind current `main`; no unique commits to recover.
- `claude/pathfinder-hint-evidence-consolidation-saeiuo`: fully behind current `main`; its Phase 6/8/10 work has already landed.
- `chatgpt/hint-determinism-provenance-audit-2026-09-22`: fully behind current `main`.
- `codex/continue-hint-evidence-consolidation-work`: one old unique mechanical-continuation commit remains on a branch hundreds of commits behind `main`; it is not a newer recovery authority and should be consulted only if a future agent specifically needs its September-23 report/test experiment.
- `chatgpt/hint-consolidation-hostile-audit-2026-09-24`: the only recovered Hint-consolidation branch carrying the post-sync plan/audit corrections and current implementation findings.

Recent PRs after #2089 were overwhelmingly the independent CI ≤35-second program. They change the base
that PR #2072 will eventually need to absorb, but they do not supersede the Hint-consolidation plan or
hostile-audit authority.

## What the recovered hostile audit currently says

Do **not** inherit the earlier "all phases complete" claim. The hostile audit falsified it and records
the corrections.

Among the material findings already recovered and committed are:

- remaining direct canonical Hint writers in CP-SAT, diagnostics and technique census;
- v4-blind semantic consumers and tests;
- Firestore loss of same-semantic-event/new-occurrence evidence;
- local review and published-import provenance loss;
- fail-open physical reader/writer and bare-mutation ownership gaps;
- scoped-CI ownership gaps for those guards;
- omission of three canonical Hint stores from the original Phase-8 "full corpus" migration;
- lack of a whole-store referee proof in the original migration manifest;
- a validator-domain mismatch for research-family levels larger than the player/editor 15x15 ceiling;
- historical completion reports whose broad claims needed explicit reconciliation rather than silent
  rewriting.

The hostile report is the current narrative authority for those findings. The plan is the current
normative authority for what counts as done.

## Future-agent start procedure

1. Fetch current `main`, PR #2072 and its head before changing anything.
2. Read the plan's strengthened completion contract and the hostile-completion report before reading
   older implementation reports.
3. Treat older phase reports as evidence for their bounded claims only where the hostile report has not
   superseded them.
4. If `main` moved, merge/rebase carefully. Any Hint JSON conflicts must be reconciled through the
   repository's semantic Hint merge authority, not by choosing one side's physical JSON.
5. Continue remaining **plan implementation / closeout** work. Do not restart broad audits unless new
   implementation evidence actually falsifies another premise.
6. Keep the plan, hostile report and PR #2072 description synchronized with every material correction.
7. Do not declare completion until one exact remote head is green for the gates named in PR #2072 and
   the hostile report, including CI, hostile audit, consolidation closeout, solver-evidence integrity,
   CI topology, all-store referee validation and the Firestore emulator boundary.

## Recovery conclusion

No newer Hint-consolidation branch was found that supersedes PR #2072. The important plan and audit
updates from the latest work are already committed on its hostile-audit branch. This handoff records
that recovery explicitly so the next agent can proceed directly from current repository truth.

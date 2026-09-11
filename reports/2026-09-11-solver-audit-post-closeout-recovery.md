# Solver audit post-closeout recovery — 2026-09-11

> **Status:** active; one mechanical cleanup remains
> **Parent ledger:** `reports/2026-09-10-solver-system-audit.md`
> **Recovered branch:** `chatgpt/solver-audit-campaign-2026-09-10`
> **Decision:** five of six post-closeout hardening items are now substantively closed or handed off to their current owning research authority. Audit 8's redundant `orchestration.ts` pre-executor fresh-work calculation/comment is the only branch-local checklist item still requiring a code edit.

This note exists because the stalled session left the parent ledger's checkboxes behind the actual branch state. It does not replace that ledger and does not reopen the 23-area source audit.

## Recovered checklist state

| Item | Recovered state | Evidence / disposition |
|---|---|---|
| Audit 8 cleanup | **open** | Runtime semantics are already correct at `runWholeLadderRetryTier`, but the old goal-attraction call-site still computes/comments on fresh-vs-shared work before the executor. Remove that redundant block only; do not alter the promoted default or retry allocation semantics. |
| Audit 18 impact check | **closed** | `reports/2026-09-11-technique-census-tristate-impact-check.md`. The retained canonical census has a real 1,074 solved / 888 unsolved frozen-baseline split, so it was not generated through the broken no-baseline fallback. No retained decision-bearing rebuild is justified. |
| Audit 17 migration check | **closed** | `reports/2026-09-11-fingerprint-v2-migration-check.md`. Active writer/comparator behavior is schema-aware; no committed live fingerprint baseline or workflow consumer requires a v1 migration. |
| Audits 4/9/13 executable semantics hardening | **closed, implementation awaiting ordinary CI evidence** | `modules/solver/executable-semantics-reference.test.ts` plus `reports/2026-09-11-executable-semantics-reference-harness.md`. Tiny independent simple-path oracle cross-checks production successors, hard-prune survival for every oracle winner, and solve-vs-genuine-exhaustion behavior. |
| Audit 6 research handoff | **closed as handoff; experiment remains live Workstream 1 work** | `reports/2026-09-11-audit6-action-selection-handoff-reconciliation.md`. The branch ledger's old 8/9 four-beam target is stale relative to the merged post-1,029 class-1 report. Use the current 26-level / 50-missed-winner evidence and its nominated compact menu after active orchestration work reconciles. Do not launch the stale experiment merely to satisfy this branch checklist. |
| Audit 20 research handoff | **closed as handoff; frontier program remains live** | `reports/2026-09-11-audit20-frontier-handoff-check.md`. Current Workstream authority already preserves class-4 near-controls, `unknown`, all-known-basin first-loss classification, and cross-action recurrence before a shared-capability claim. No duplicate audit-branch frontier mechanism is warranted. |

## Recovery chronology

The recovered branch already contained the complete 23-area campaign, the Audit 17 fingerprint-v2 migration inventory, and the Audit 18 tri-state census code fix. Recovery then added:

1. Audit 18 retained-artifact impact determination, closing without a rebuild.
2. Audit 6 handoff reconciliation against newer merged class-1 evidence.
3. Audit 20 handoff integrity check against the current frontier authority.
4. The independent Audits 4/9/13 executable-semantics micro-oracle and its scope note.

CI is not a sequencing gate for this recovery. Completed CI/review evidence may still reopen the corresponding item under the parent ledger's existing follow-up rule.

## Sole remaining branch-local action

Audit 8 is cleanup debt, not an unresolved runtime defect. The canonical executor already owns the promoted default-ON fresh-work-start decision for `goal-attraction-disabled-retry`; the old caller still contains the pre-promotion `freshWorkPoolEnabled` calculation and a long stale default-OFF explanation. Remove that duplicated decision/comment while preserving the explicit-false control behavior and the tier's intended work-budget sizing. Then the post-closeout branch checklist can be considered fully implemented, subject to ordinary review/CI evidence.

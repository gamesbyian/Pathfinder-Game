# Solver system audit — 2026-09-10

This is the compact ledger for the cross-cutting solver audit requested on 2026-09-10. Canonical design, correctness, and priority changes still belong in their owning docs; this report records what was actually inspected, concrete fixes, and only the follow-up that remains.

## Audit status

| # | Area | Status | Finding / action |
|---|---|---|---|
| 1 | Solver contract and end-to-end correctness | in progress | Worker SOLVE transport had drifted from direct `SolveResult`: it dropped `staticPortfolioWinningConfigKey` and the new `resumableResidualPass` telemetry. Replaced the aggregate whitelist with forwarding of the solver result's plain enumerable fields, preserving only the intentional `totalMs` → `elapsedMs` transport rename and historical alias normalization. Added a regression test with a future-field sentinel so the seam cannot silently drift again. Aggregate `failed` (production) vs `exhausted` (static portfolio) is intentional pending contrary caller evidence: `failed` means the production policy ended unsolved without an outer cap, while `exhausted` means the explicitly bounded static portfolio ended with its techniques naturally exhausted and budget remaining. |
| 2 | State representation / search-space model | pending | |
| 3 | State identity / equivalence / canonicalization | pending | |
| 4 | Successor generation / search actions | pending | |
| 5 | Technique implementation and capability | pending | |
| 6 | Technique / action selection | pending | |
| 7 | Scheduler and stage participation | pending | |
| 8 | Budget and work accounting | pending | |
| 9 | Pruning / rejection | pending | |
| 10 | Caching / dedup / state reuse | pending | |
| 11 | Profiles / configuration / defaults | pending | |
| 12 | Retry / rescue / escalation | pending | |
| 13 | Termination / exhaustion | pending | |
| 14 | Resumability / cross-technique continuation | pending | |
| 15 | Variant / cross-configuration consistency | pending | |
| 16 | Observability / research evidence | pending | |
| 17 | Fingerprint / capability classification | pending | |
| 18 | Technique census methodology | pending | |
| 19 | Benchmark / corpus / metric | pending | |
| 20 | Algorithmic frontier | pending | |
| 21 | Solver integration / experimental harness | pending | Worker-contract finding above also belongs here; revisit after core audits. |
| 22 | Parallel / batch execution | pending | |
| 23 | Research-data utilization | pending | |

## Follow-up rule

Later audits may reopen earlier rows when they reveal a violated assumption. A reopened audit should record the new evidence here and put any durable rule in the existing canonical document rather than growing this report into a second solver plan.

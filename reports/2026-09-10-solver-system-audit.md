# Solver system audit — 2026-09-10

This is the compact ledger for the cross-cutting solver audit requested on 2026-09-10. Canonical design, correctness, and priority changes still belong in their owning docs; this report records what was actually inspected, concrete fixes, and only the follow-up that remains.

## Audit status

| # | Area | Status | Finding / action |
|---|---|---|---|
| 1 | Solver contract and end-to-end correctness | done | Worker SOLVE transport had drifted from direct `SolveResult`: it dropped `staticPortfolioWinningConfigKey` and the new `resumableResidualPass` telemetry. Replaced the aggregate whitelist with forwarding of the solver result's plain enumerable fields, preserving only the intentional `totalMs` → `elapsedMs` transport rename and historical alias normalization. Added a future-field regression sentinel. Aggregate `failed` (production) vs `exhausted` (static portfolio) remains intentional: production policy termination is not a proof of search-space exhaustion; the explicitly bounded static portfolio can report natural technique exhaustion with budget remaining. |
| 2 | State representation / search-space model | done | Reconciled mutable solver state against `docs/mechanic-state-contracts.md` and the schema cardinality guards. The core state carries the dynamic legality/win state expected for edge use, visits/intersections, must-pass/cross, portals, flippers, and landmarks. Found a boundary hole instead: both public raw-level ingress paths could normalize representation-unsafe raw data without the cardinality/bounds/occupancy checks that protect bitmasks and typed arrays. Added solver-safety raw validation to `createSolver().prepareLevelForSolver()` and worker `SOLVE`, while deliberately preserving rectangular synthetic solver fixtures: square-grid enforcement is a publishing/content invariant, not a solver representation invariant. Internal `normalizeRawLevel` remains permissive for synthetic research/test fixtures. Regression tests cover both public seams. |
| 3 | State identity / equivalence / canonicalization | done | Repair's experience-cache `stateSignature` omitted `path.length` and the immediately previous cell even though future feasibility/scoring depends on remaining length and incoming/chirality context. Two non-equivalent repair states could therefore inherit the same prior-failure experience and suppress useful randomized exploration. Added counted path length plus previous-cell identity to the signature and regression tests for both distinctions. This cache is advisory rather than a soundness prune, so the defect was capability loss rather than false UNSAT. |
| 4 | Successor generation / search actions | done | Audited DFS/LDS, beam, repair, admissible-order, prep-time static adjacency, and the independent PLAY referee. Production search families share the same `getNeighbors`/`applyMove` transition substrate and first-step must-cross forcing; portal, gate-reentry, edge-axis, must-cross-turn, filter, flipper, length/intersection, and landmark rules are independently rechecked by the referee. Apparent solver-vs-PLAY differences for geese/false-goal traversal are intentional dead-end elision/analysis behavior, not a reachable-solution omission. This audit reopened Audit 2 and caught the over-broad square-grid validation before closeout; that was narrowed to representation-safety validation. |
| 5 | Technique implementation and capability | done | The shared AttemptConfig dispatcher correctly routes DFS/LDS, beam, repair, and admissible-order families, and the parallel worker is structurally guarded against re-forking dispatch logic. Found one technique-identity/capability mismatch: a programmatic repair config could set both `repairMustTurnBiased` and `repairTurnBiased`, execute a hybrid with both mechanisms active, but canonicalize as only `must-turn-biased`. That let behaviorally distinct search contaminate provenance/census evidence under an existing identity. Canonical identity formatting and dispatch now reject the unrepresentable hybrid, with regression coverage. |
| 6 | Technique / action selection | pending | |
| 7 | Scheduler and stage participation | pending | |
| 8 | Budget and work accounting | pending | |
| 9 | Pruning / rejection | pending | |
| 10 | Caching / dedup / state reuse | pending | Audit 3 already found one advisory-cache identity defect; revisit all correctness-sensitive and capability-sensitive reuse sites here. |
| 11 | Profiles / configuration / defaults | pending | |
| 12 | Retry / rescue / escalation | pending | |
| 13 | Termination / exhaustion | pending | Audit 1 confirmed that production `failed` must not be interpreted as proven exhaustion. |
| 14 | Resumability / cross-technique continuation | pending | |
| 15 | Variant / cross-configuration consistency | pending | |
| 16 | Observability / research evidence | pending | |
| 17 | Fingerprint / capability classification | pending | |
| 18 | Technique census methodology | pending | |
| 19 | Benchmark / corpus / metric | pending | |
| 20 | Algorithmic frontier | pending | |
| 21 | Solver integration / experimental harness | pending | Audits 1–2 fixed two worker/public-boundary drifts; revisit after core audits. |
| 22 | Parallel / batch execution | pending | |
| 23 | Research-data utilization | pending | |

## Follow-up rule

Later audits may reopen earlier rows when they reveal a violated assumption. A reopened audit should record the new evidence here and put any durable rule in the existing canonical document rather than growing this report into a second solver plan.

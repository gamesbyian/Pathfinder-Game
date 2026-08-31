# Solver code map

Terse implementation map for `modules/solver/`. Read [`../../docs/solver-architecture.md`](../../docs/solver-architecture.md) for durable architecture, [`../../docs/solver-technique-operational-taxonomy.md`](../../docs/solver-technique-operational-taxonomy.md) before treating named configs as independent techniques, [`../../docs/solver-level-blindness.md`](../../docs/solver-level-blindness.md) for production-policy constraints, and [`../../docs/solver-optimization-workstreams.md`](../../docs/solver-optimization-workstreams.md) for research rank.

## Start by change type

| Change | Start here |
|---|---|
| Stable stage IDs, telemetry labels, budget vocabulary | `stage-policy.ts` |
| Stage eligibility / ordered execution | `stage-plan.ts` |
| Stage budget constants, reserves, budget-plan cascade | `stage-budget.ts` |
| Shared stage execution | `stage-executors.ts` |
| Attempt ladder, gates, retries, result assembly | `orchestration.ts`, then `attempts.ts` / `attempt-dispatch.ts` |
| Defaults, ablation flags, portfolio experiment tiers | `ablation-config.ts`, `legacy-latency-portfolio-experiment.ts` |
| Profiles/templates/search-family behavior | technique taxonomy, then `policy.ts`, `scoring.ts`, `search.ts`, `admissible-order-search.ts`, `repair-search.ts` |
| Beam/DFS traversal or candidate expansion | `search.ts`, `search-state.ts`, `prep.ts` |
| Candidate ranking / badness / ordering | `scoring.ts`, `diversification.ts` |
| Lower bounds / hard feasibility / prune logic | `lower-bounds.ts`, `hard-prune-pipeline.ts`, tests |
| Repair | `repair-search.ts`, tests |
| Admissible-order search | `admissible-order-search.ts` |
| Geometry/topology/distance | `topology.ts`, `distance.ts` |
| Shared contracts | `types.ts` |
| Worker integration | `worker.js`, `solver-worker-client.ts` |
| Public facade | `../solver.ts`; keep thin |

## Authority and large files

`stage-policy.ts`, `stage-plan.ts`, `stage-budget.ts`, and `stage-executors.ts` own reusable stage policy/plan/budget/execution; `orchestration.ts` coordinates them. Do not duplicate stage eligibility or budget arithmetic merely because orchestration dispatches it. See [`../../docs/architecture-unification-debt.md`](../../docs/architecture-unification-debt.md).

`orchestration.ts`, `repair-search.ts`, and `search.ts` are large. Prefer symbol-targeted reads. When changing orchestration, audit every projection of attempt/stage identity, budgets, telemetry/provenance, sequential execution, and raced execution; [`../../docs/change-recipes.md`](../../docs/change-recipes.md) gives the cross-boundary checklist.

## Research versus production

Research flags/observers beside production code are not automatically active or recommended. Check the queue, [`../../docs/solver-opt-in-experiment-ledger.md`](../../docs/solver-opt-in-experiment-ledger.md), and relevant instrument docs before reviving them. Exact level IDs, stored hints, prior winners, historical solve status, and variant provenance cannot steer cold production solving.

## Verification

Use the narrowest relevant test while iterating, then follow [`../../docs/testing.md`](../../docs/testing.md) for solved-set, cost, soundness, referee, and finish-line gates. `solver:regression --check` checks solves, not performance.
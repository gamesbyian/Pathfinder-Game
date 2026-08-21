# Solver code map

Terse implementation map for work inside `modules/solver/`. Read [`../../docs/solver-architecture.md`](../../docs/solver-architecture.md) for the durable architecture contract, [`../../docs/solver-level-blindness.md`](../../docs/solver-level-blindness.md) for production-policy constraints, and [`../../docs/solver-optimization-current-queue.md`](../../docs/solver-optimization-current-queue.md) before choosing research work.

## Start by change type

| Change | Start here |
|---|---|
| Attempt ladder, stage eligibility, budgets, retries, result assembly | `orchestration.ts`, then `attempts.ts` / `attempt-dispatch.ts` |
| Production defaults, ablation flags, portfolio experiment tiers | `ablation-config.ts`, `portfolio-experiment.ts` |
| Core beam/DFS traversal or candidate expansion | `search.ts`, `search-state.ts`, `prep.ts` |
| Candidate ranking / badness / ordering | `scoring.ts`, `diversification.ts` |
| Lower bounds, hard feasibility, prune logic | `lower-bounds.ts` and its tests |
| Repair search | `repair-search.ts` and `repair-search.test.ts` |
| Admissible-order search | `admissible-order-search.ts` |
| Geometry/topology/distance helpers | `topology.ts`, `distance.ts` |
| Shared solver contracts | `types.ts` |
| Worker integration | `worker.js`, `solver-worker-client.ts`; browser boundary only |
| Public runtime facade | `../Solver.ts`; keep it thin |

## Large files

`orchestration.ts` is intentionally the first place to inspect for policy flow, but it is large. Do not read it wholesale by default. Search for the stage/flag/result field named by the task, then follow the local helper calls. `repair-search.ts`, `search.ts`, and their tests are also large enough that targeted symbol reads are preferable.

When changing orchestration, check every representation of the same fact. Attempt/stage identity, budgets, telemetry, provenance, reporter projection, sequential execution, and raced execution have historically drifted when updated independently. [`../../docs/architecture-unification-audit.md`](../../docs/architecture-unification-audit.md) tracks the structural consolidation direction.

## Research versus production

Research flags and diagnostics may live beside production search code. Their presence does not mean they are active, recommended, or level-blind. Check the current queue and the opt-in ledger before reviving or promoting them.

Do not use exact level IDs, stored hints, prior winners, historical solve status, or variant provenance to steer cold production solving.

## Verification

Use the narrowest relevant unit test while iterating. Before claiming a solver change is safe, follow the solved-set, cost, soundness, and referee requirements in [`../../docs/testing.md`](../../docs/testing.md). `solver:bench --check` is a solve-regression check, not a performance measurement.

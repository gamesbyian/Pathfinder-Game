# ADR 0003: Modular solver with a separate testing API

**Status:** Accepted.

## Context
The solver was historically one large `SolverV2.js`. Its size made the search/scoring/pruning
internals hard to test in isolation, and test-only hooks (`_normalizeRawLevel`, `_prepLevel`,
…) lived on the runtime solver instance, leaking internals into the public shape.

## Decision
`modules/SolverV2.js` is a thin facade over `modules/solver/` (normalization, prep, search,
scoring, attempts, archetype, lower-bounds, topology, orchestration, solution, trap-search,
worker, …). The analysis/test surface is a single named export, `SOLVER_TESTING_API` (also at
`modules/solver/testing-api.js`); the deprecated underscore aliases on the solver instance were
removed and all consumers (CLI scripts + unit tests) import the canonical surface.

## Consequences
- Each solver concern has a focused unit suite (`scripts/solver-*-unit-tests.mjs`).
- The runtime solver's public shape is `solve`/`solveLevel`/`findTrapSpots`/… only.
- The solver can run off-thread (`modules/solver/worker.js` + `solver-worker-client.js`).
- Performance/behavior is guarded by `test:hint-path-oracle`, `test:bundled-levels`, and the
  ablation lab; tuning happens in `modules/solver/attempts.js`/`policy.js`, not the facade.

# Pathfinder Testing Guide

Current test tiers and finish-line requirements.

## Core commands

```bash
npm run ci:fast     # DEFAULT local gate: checks + fast unit/node suites (~1 min)
npm run ci          # full local gate: coverage + deep solver tests + slow harnesses (~4 min)
npm run test:unit   # Vitest unit/integration suites
npm run ci:full     # ci + Playwright browser e2e
npm run test:e2e    # Playwright functional browser tests
npm run test:visual # opt-in environment-sensitive visual baselines
```

Use `npm run ci:fast` by default. It skips only tests tagged `deepTest` and coverage instrumentation. Use full `npm run ci` when:

- changing `modules/solver/orchestration.ts`, `search.ts`, `repair-search.ts`, `lower-bounds.ts`, `prune-gauntlet.ts`, `scoring.ts`, `diversification.ts`, `hint-ablation-generator.ts`, or their `scripts/hint-workbench.mjs` / `scripts/hint-diversification.mjs` wrappers;
- changing solver budget/allocation, node caps, deadlock soundness, or a real-corpus regression rescue;
- the change may affect coverage thresholds in `vitest.config.mjs` (`modules/domain`, `runtime`, `solver`, `state`, `state-slices.ts`, `input/*-core.ts`); or
- making a high-stakes completeness claim on a broad change.

`npm run ci` is browser-free; `ci:full` adds browser tests. Visual baselines remain separate because font/anti-aliasing varies by environment. GitHub Actions is execution convenience, not a substitute for reporting what validation actually ran.

## Tier map

| Tier | Command | Purpose |
|---|---|---|
| Static | `npm run check` | lint/architecture, types, security, CSP, data/document invariants |
| Unit/integration | `npm run test:unit` / `test:coverage` | Vitest logic/controller tests; coverage applies in `test:coverage` |
| Node validators/harnesses | `npm run test:node` / `test:node:fast` | boot/data/oracle/loader/Firestore/bundled-level and CLI harnesses |
| Browser e2e | `npm run test:e2e` | production Vite bundle through Playwright Chromium |
| Visual | `npm run test:visual` | modal/overlay screenshot regression |
| Solver/data research | solver, stress, ablation, hint, level tools | on demand; outside ordinary `ci` |

`test:node:fast` currently includes every Node validator; it exists so a future genuinely slow validator can be excluded like deep Vitest tests. The former dominant hint-workbench/diversification validators now use cheap fixtures while exercising the same plumbing.

`npm run ci` runs `check`, `test:coverage`, and `test:node` sequentially. Each already uses internal concurrency, so running all three concurrently can oversubscribe a typical 4-core runner and has caused contention failures. `package.json` is authoritative for the full command graph.

## Fast and deep gates

`deepTest` is for tests whose expense is intrinsic to what they prove: exhaustive soundness, real regression rescue, or real cross-tier budget behavior. `SOLVER_DEEP_TESTS=0` skips them; `test:unit:fast` and `ci:fast` set that mode.

Every deep test still runs on each PR in the parallel `deep-verification` GitHub Actions job. The PR fast gate runs `checks`, `unit-tests-fast`, `node-tests-fast`, and `build` independently.

Do not tag a test deep merely because it is slow. If its assertions only need scheduling/routing/budget behavior, stub search instead. `modules/solver/orchestration.test.ts` uses `solveLevel`'s `attemptSearchForTesting` / `exhaustingDispatch` pattern for this.

## Timing instrumentation

Use measured timing before guessing about CI slowness:

- `test:coverage` writes `tmp/vitest-timings.json` and prints slowest files/tests via `scripts/vitest-slow-test-report.mjs`.
- `check` and `test:node` use `scripts/run-scripts-parallel.mjs`, which reports each subcommand's elapsed time.
- GitHub Actions separates `checks`, `unit-tests-fast`, `node-tests-fast`, `build`, and `deep-verification`, so job time maps directly to a phase.

## Static checks

`npm run check` includes:

- ESLint architecture rules for browser/domain boundaries, ENGINE mutation, event constants, and raw HTML injection;
- secret, dependency, CSP, modal-accessibility, CSS-coverage, and canvas-theme checks;
- `check:no-solver-level-numbers`;
- hint validity, level provenance, and corpus formatting;
- source/test TypeScript checks;
- documentation links/index/workflow discovery.

A PLAY-valid stored hint proves a valid solution, not cold solver capability. Use shared provenance classification for capability claims.

## Unit, harness, and coverage topology

Vitest discovers colocated `modules/**/*.test.ts` plus script suites listed by `vitest.config.mjs`. Standalone Node/CLI harnesses use `*-node-test.mjs` through `npm run test:node`; `*-unit-tests.mjs` files are Vitest suites. `package.json` and `vitest.config.mjs` are authoritative.

Use targeted filtering while editing:

```bash
npm run test:unit:watch
npx vitest run solver
npx vitest run -t "portal"
```

Coverage uses `@vitest/coverage-v8`; thresholds live only in `vitest.config.mjs`. Prefer `scripts/test-lib/fixtures.mjs` (`makeRawLevel`, `createFakeScheduler`) before adding generic fakes.

## Browser and visual tests

Playwright e2e runs against `npm run build && vite preview`, testing the production bundle.

```bash
npm run test:e2e
npm run test:e2e:smoke
npm run test:e2e:a11y
npm run test:e2e:editor
npm run test:e2e:security
npm run test:e2e:theme
```

Functional e2e blocks third-party requests through the shared fixture. Visual tests use their own environment for real font rendering. For repeated local e2e, keep `npm run build && npm run preview` running; Playwright reuses the server outside CI.

## What to run when

- **While editing:** targeted Vitest/e2e or a small solver sample.
- **Normal completion:** `npm run ci:fast` when feasible; otherwise report narrower checks and why.
- **UI/controller:** focused e2e; `ci:full` for broad browser confidence.
- **Modal/markup:** `npm run test:visual`; update baselines only intentionally.
- **Level/hint:** `npm run test:hint-path-oracle` plus relevant validators.
- **Solver hot path:** full `npm run ci`, then the solver gates below.

## Solver iteration and promotion

Use the smallest representative sample that can falsify an idea during exploration; pay full-corpus costs for validated results or promotion.

- **Soft mechanisms:** scoring, ordering, bias, default-off attempts. They can lose solves or cost work, but returned solutions still pass the referee.
- **Hard mechanisms:** pruning, bounds, caches, state equivalence. They can remove valid states; require proof-oriented and differential/counterexample tests during development. See [`solver-correctness-archaeology.md`](solver-correctness-archaeology.md).

A reverted experiment may still discover a genuinely new valid solution. Before discarding it, check whether new solves are already stored; persist novel finds through shared hint/provenance machinery.

## Solver finish-line gates

| Change | Minimum evidence |
|---|---|
| Mechanic-local scoring/pruning | targeted unit/differential tests + stress smoke/mechanic sample |
| Attempt-policy ordering/thresholds | smoke + pinned regression + `solver:bench --check` |
| Shared `orchestration.ts`, `search.ts`, `repair-search.ts`, `scoring.ts`, `prune-gauntlet.ts` behavior | full `solver:bench --check` + relevant stress population |
| Budget/allocation semantics | full published regression + matched deterministic/work-budget evidence |
| Hard prune/cache/bound | soundness proof/tests + stored-witness differential checks + regression gates |

Stress definitions: [`../data/stress/README.md`](../data/stress/README.md). Tool selection: [`tooling-catalog.md`](tooling-catalog.md).

### Stress tiers

| Tier | Entry point | Use |
|---|---|---|
| Smoke | `npm run stress:smoke` | fast mechanic/historical canaries |
| Pinned regression | `npm run stress:regression` | solved canaries + known-hard targets |
| Published | `npm run solver:bench -- --check` | player-corpus solved/failed regression |
| Corpus 1 | `npm run stress:benchmark` on `stress-levels.json` | hypothesis-driven frontier |
| Corpus 2 | `stress:benchmark` / `solver-stress-refresh.yml` | large solver-blind capability population |
| Sample/curated | `stress:benchmark -- --sample=...` or dev benchmark | cheaper iteration |

A budget-edge or deadline-truncated result is not a clean negative. Recheck unstable cases alone and follow [`solver-budget-determinism.md`](solver-budget-determinism.md).

## Solvability and speed are separate

`solver:bench --check` mainly protects the solved/failed set; equal solves can still cost more.

For hot-path changes, follow [`solver-budget-determinism.md`](solver-budget-determinism.md): pin `workBudget`, make wall deadline non-binding, compare `workSpent`, and use interleaved wall-clock measurements when implementation cost per metered operation changes.

Do not compare wall-clock-bounded arms as equivalent search; a faster arm simply searches farther before the deadline.

## Capability experiments

Headline capability experiments must obey [`solver-level-blindness.md`](solver-level-blindness.md). Exact-level hints, winner replay, historical solved status, IDs, caches, or per-level budgets cannot control a cold capability solve.

For decision-bearing remote A/Bs use the deterministic mode in [`../.github/workflows/README-solver-stress-refresh.md`](../.github/workflows/README-solver-stress-refresh.md). Require complete current-run population coverage and preserve gained/lost rows, not only net count.

## Firestore rules

Current Firestore tests are source-level/harness checks. Emulator-backed rule tests remain deferred until a rules change justifies the infrastructure.

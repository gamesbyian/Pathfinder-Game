# Pathfinder Testing Guide

Current test tiers and finish-line requirements.

## Core commands

```bash
npm run ci          # local full code gate: static checks + coverage/unit suites + node validators
npm run test:unit   # Vitest unit/integration suites
npm run ci:full     # ci + Playwright browser e2e
npm run test:e2e    # Playwright functional browser tests
npm run test:visual # opt-in environment-sensitive visual baselines
```

`npm run ci` is browser-free. `ci:full` adds browser confidence. Visual baselines stay separate because font/anti-aliasing differences make cross-environment comparison unreliable. GitHub Actions is a remote execution convenience; pushing or merging does not wait on it. Agents that need validation should run the relevant commands locally and report exactly what ran.

## Tier map

| Tier | Command | Purpose |
|---|---|---|
| Static | `npm run check` | lint/architecture, types, security, CSP, data/document invariants |
| Unit/integration | `npm run test:unit` / `test:coverage` | Vitest logic and controller tests; coverage thresholds apply in `test:coverage` |
| Node validators/harnesses | `npm run test:node` | boot/data/oracle/loader/Firestore/bundled-level and CLI-driving harnesses |
| Browser e2e | `npm run test:e2e` | production Vite bundle through Playwright Chromium |
| Visual | `npm run test:visual` | modal/overlay screenshot regression |
| Solver/data research | solver, stress, ablation, hint, level tools | on demand; not part of ordinary `ci` |

`npm run ci` runs `check`, `test:coverage`, and `test:node` in parallel. See `package.json` for the exhaustive command list.

## Static checks

`npm run check` includes the important repository contracts:

- ESLint, including AST architecture rules for browser/domain boundaries, ENGINE mutation, event constants, and raw HTML injection;
- secret, third-party, CSP, modal-accessibility, CSS coverage, and canvas-theme checks;
- `check:no-solver-level-numbers` for feature-based rather than level-identity solver policy;
- `check:hint-validity`, `check:level-provenance`, and corpus formatting;
- source and test TypeScript checks;
- documentation links/index/workflow discovery.

A PLAY-valid stored hint proves a valid solution, not cold solver capability. Use shared provenance classification when making capability claims.

## Unit, harness, and coverage topology

Vitest discovers colocated `modules/**/*.test.ts` plus script suites explicitly included by `vitest.config.mjs`. Some historical files named `*-unit-tests.mjs` are actually standalone Node/CLI-driving harnesses and run through `npm run test:node`; filename alone is not runner authority. `package.json` and `vitest.config.mjs` define the current execution topology.

Use targeted filtering while editing:

```bash
npm run test:unit:watch
npx vitest run solver
npx vitest run -t "portal"
```

Coverage uses `@vitest/coverage-v8` over the pure logic surface. Thresholds live in `vitest.config.mjs`; treat the config as authoritative rather than copying percentages into docs.

For fixtures, prefer `scripts/test-lib/fixtures.mjs` (`makeRawLevel`, `createFakeScheduler`) before creating new generic fakes.

## Browser and visual tests

Playwright e2e runs against `npm run build && vite preview`, so it tests the production bundle rather than raw source. Focused aliases include smoke/gameplay, accessibility, editor, security, and theme coverage.

```bash
npm run test:e2e
npm run test:e2e:smoke
npm run test:e2e:a11y
npm run test:e2e:editor
npm run test:e2e:security
npm run test:e2e:theme
```

Functional e2e blocks third-party requests through the shared fixture so external services do not control test reliability. Visual tests deliberately use their own environment because they need real font rendering.

For repeated local e2e runs, keep `npm run build && npm run preview` running; Playwright reuses the server outside CI.

## What to run when

- **While editing:** targeted Vitest/e2e or a small solver sample.
- **Before claiming a normal code change complete:** local `npm run ci` when feasible; otherwise state which narrower checks ran and why.
- **UI/controller changes:** add focused e2e; use `ci:full` for broad browser confidence when warranted.
- **Modal/markup changes:** `npm run test:visual`; update baselines only for intentional changes.
- **Level/hint changes:** `npm run test:hint-path-oracle` and relevant validators.
- **Solver hot-path changes:** use the solver gates below.

## Solver iteration versus promotion

Do not pay full-corpus costs on every edit. During exploration, use the smallest representative sample that can falsify the idea. Full gates apply when reporting a result as validated or promoting a default.

Hard mechanisms need more care during exploration than soft ones:

- **Soft:** scoring, ordering, bias, default-off attempts. They can miss solves or cost more work, but returned solutions still pass the referee.
- **Hard:** pruning, bounds, caches, state equivalence. They can silently remove valid search states. Require proof-oriented tests and differential/counterexample validation while developing, not only at the finish line. See [`solver-correctness-archaeology.md`](solver-correctness-archaeology.md).

Any experiment that finds a genuinely new valid solve has produced useful data even if the mechanism is later reverted. Before discarding solver experiment code, check whether its newly solved levels already have stored hints. Persist novel finds through the shared hint/provenance machinery rather than hand-writing them.

## Solver finish-line gates

| Change | Minimum finish-line evidence |
|---|---|
| Mechanic-local scoring/pruning | targeted unit/differential tests + stress smoke/mechanic sample |
| Attempt-policy ordering/thresholds | smoke + pinned regression + `solver:bench --check` |
| Shared `orchestration.ts`, `search.ts`, `repair-search.ts`, `scoring.ts`, `prune-gauntlet.ts` behavior | full `solver:bench --check` plus relevant stress population |
| Budget/allocation semantics | full published regression plus matched deterministic/work-budget evidence |
| Hard prune/cache/bound | soundness proof/tests + stored-witness differential checks + regression gates |

Stress tools and corpus definitions: [`../data/stress/README.md`](../data/stress/README.md). Tool selection: [`tooling-catalog.md`](tooling-catalog.md).

### Stress tiers

Use the cheapest tier that answers the promotion question:

| Tier | Entry point | Use |
|---|---|---|
| Smoke | `npm run stress:smoke` | fast mechanic/historical canaries |
| Pinned regression | `npm run stress:regression` | solved canaries + known-hard targets |
| Published | `npm run solver:bench -- --check` | solved/failed regression on player corpus |
| Corpus 1 | `npm run stress:benchmark` on `stress-levels.json` | hypothesis-driven frontier |
| Corpus 2 | `stress:benchmark` / `solver-stress-refresh.yml` | large solver-blind capability population |
| Sample/curated | `stress:benchmark -- --sample=...` or dev benchmark | cheaper repeated iteration |

A budget-edge or deadline-truncated result is not a clean negative. Recheck unstable cases in isolation and follow [`solver-budget-determinism.md`](solver-budget-determinism.md).

## Solvability and speed are separate

`solver:bench --check` primarily protects the solved/failed set. A change can preserve every solve while making the solver more expensive.

For hot-path changes, also compare cost under the deterministic protocol in [`solver-budget-determinism.md`](solver-budget-determinism.md): pin `workBudget`, make the wall deadline non-binding, compare `workSpent`, and use interleaved wall-clock measurements only when the change alters the cost of a metered operation rather than its count.

Do not compare wall-clock-bounded arms as if they performed the same search: a faster implementation simply gets farther before the same deadline.

## Capability experiments

Headline capability experiments must obey [`solver-level-blindness.md`](solver-level-blindness.md). Exact-level hints, winner replay, historical solved status, IDs, caches, or per-level budgets cannot control a cold capability solve.

For decision-bearing remote A/Bs use the deterministic mode documented by [`../.github/workflows/README-solver-stress-refresh.md`](../.github/workflows/README-solver-stress-refresh.md). Require complete current-run population coverage and preserve gained/lost rows, not only the net count.

## Firestore rules

Current Firestore tests are source-level/harness checks. Emulator-backed rule testing remains deferred until a rules change justifies the infrastructure.

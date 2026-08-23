# Pathfinder Testing Guide

Current test tiers and finish-line rules.

## Core commands

```bash
npm run ci:fast     # default local gate: checks + fast unit/node suites
npm run ci          # full local gate: coverage + deep solver/slow harnesses
npm run test:unit   # Vitest unit/integration
npm run ci:full     # ci + Playwright e2e
npm run test:e2e    # Playwright functional browser tests
npm run test:visual # environment-sensitive visual baselines
```

Use `ci:fast` by default. It skips only `deepTest` tests and coverage instrumentation. Use full `ci` when:

- changing solver orchestration/search/repair/lower-bounds/pruning/scoring/diversification/hint-ablation code or its workbench/diversification wrappers;
- changing solver budgets/node caps, deadlock soundness, or a real-corpus regression rescue;
- coverage thresholds in `vitest.config.mjs` may move; or
- making a high-stakes completeness claim on a broad change.

`ci` is browser-free; `ci:full` adds browser tests. Visual tests stay separate because rendering varies by environment. GitHub Actions is execution convenience, not evidence unless you report what ran.

Test-wall-time figures are measurements, not contracts: fixture changes, runner load, hardware, and suite composition can move them sharply. Measure current timings from the command/workflow when runtime itself matters rather than copying a historical minute estimate into another authority.

## Tier map

| Tier | Command | Purpose |
|---|---|---|
| Static | `npm run check` | lint/architecture, types, security/CSP, data/docs invariants |
| Unit/integration | `test:unit` / `test:coverage` | Vitest logic/controller tests; coverage in `test:coverage` |
| Node harnesses | `test:node` / `test:node:fast` | boot/data/oracle/loader/Firestore/bundled-level/CLI harnesses |
| Browser e2e | `test:e2e` | production Vite bundle in Chromium |
| Visual | `test:visual` | modal/overlay screenshots |
| Solver/data research | solver/stress/ablation/hint/level tools | on demand; outside ordinary `ci` |

`test:node:fast` currently includes every Node validator; it leaves room to exclude future genuinely slow validators. Former slow hint-workbench/diversification validators now use cheap fixtures with the same plumbing.

`ci` runs `check`, `test:coverage`, then `test:node`. Each has internal concurrency; running them concurrently can oversubscribe 4-core runners. `package.json` is authoritative for the graph.

## Fast vs deep

`deepTest` is for expense intrinsic to the proof: exhaustive soundness, real regression rescue, or real cross-tier budget behavior. `SOLVER_DEEP_TESTS=0` skips them; `test:unit:fast`/`ci:fast` set it. Every PR still runs deep tests in the separate `deep-verification` Actions job.

Do not mark a test deep merely because it is slow. Stub search when assertions only need scheduling/routing/budget behavior; `orchestration.test.ts` uses `attemptSearchForTesting` / `exhaustingDispatch` for this.

## Timing instrumentation

Measure before guessing:

- `test:coverage` writes `tmp/vitest-timings.json` and reports slow files/tests via `vitest-slow-test-report.mjs`.
- `check`/`test:node` use `run-scripts-parallel.mjs`, which reports subcommand time.
- Actions separates `checks`, `unit-tests-fast`, `node-tests-fast`, `build`, `deep-verification`.

## Static checks

`npm run check` covers architecture lint, types, security/secrets/dependencies/CSP, modal accessibility, CSS/canvas-theme checks, `check:no-solver-level-numbers`, hint validity, level provenance/corpus formatting, and documentation/workflow discovery.

A PLAY-valid stored hint proves a solution, not cold solver capability; use shared provenance classification for capability claims.

## Unit, harness, coverage

Vitest discovers colocated `modules/**/*.test.ts` plus script suites listed in `vitest.config.mjs`. Standalone Node/CLI harnesses use `*-node-test.mjs` through `test:node`; `*-unit-tests.mjs` are Vitest. `package.json`/`vitest.config.mjs` are authoritative.

Target while editing:

```bash
npm run test:unit:watch
npx vitest run solver
npx vitest run -t "portal"
```

Coverage uses `@vitest/coverage-v8`; thresholds live only in `vitest.config.mjs`. Prefer `scripts/test-lib/fixtures.mjs` (`makeRawLevel`, `createFakeScheduler`) before new generic fakes.

## Browser and visual

Playwright runs against `npm run build && vite preview`.

```bash
npm run test:e2e
npm run test:e2e:smoke
```

Run e2e for user-visible controller/state/persistence changes. Run visual only when rendering/layout itself changes.

## Solver changes

For search behavior, separate correctness, solved-set, performance, and stability questions:

- `npm run solver:bench -- --check` checks the published solved set; it is not a speed benchmark.
- For implementation speed, use the deterministic work/node protocol in [`solver-architecture.md`](solver-architecture.md#speed-only-optimization).
- `node scripts/stress/hint-cost-drift.mjs` is a cheap retrospective signal for search-cost changes when hint provenance contains same-config/same-budget rediscoveries at multiple commits. It prefers `workSpent`, but coverage is opportunistic and drift is an attribution lead, not a regression verdict.
- `node scripts/stress/classify-stability.mjs --in=<benchmark>` distinguishes comfortable solves from budget-edge solves; add `--compare=<second-run>` to flag outcome/status flakiness. This helps decide how much confidence to place in a nominally preserved solve.
- Neither retrospective signal replaces a controlled deterministic before/after benchmark when making a promotion or performance claim.
- For heuristic/routing/policy changes, use level-blind matched-work evidence on an explicit affected population plus controls; follow [`solver-research-operating-model.md`](solver-research-operating-model.md).
- Referee-validate returned paths; do not infer correctness from solve count.
- A binding wall deadline makes an unsolved result indeterminate for reproducible capability evidence; classify `deadlineTruncated` separately.
- For connectivity/topology hard-prune changes, replay known-valid solution prefixes with `node scripts/run-bundled.mjs scripts/stress/connectivity-soundness-check.mjs`; a hard prune must never reject a state with a stored valid completion.
- For must-cross rejection changes, use `scripts/stress/mc-prune-soundness-check.mjs`; for `mustCrossNeighborBudgetDeadlocked`, use the narrower `scripts/stress/mc-neighbor-budget-soundness-check.mjs`. These are proof-oriented on-demand gates, not ordinary CI.

Use the narrowest population that decides the question while iterating, then the relevant population-scale gate before promotion. Do not spend full-corpus compute merely to reconfirm a locally falsified premise.

## Documentation changes

Run `npm run check:documentation-links` (included in `check`) after renames, current-authority edits, command/path changes, or navigation changes. A passing link check proves structural discoverability, not semantic freshness; [`change-recipes.md`](change-recipes.md) covers drift-prone cross-authority changes.

# Pathfinder Testing Guide

Current test tiers and finish-line rules.

> **Important distinction:** software tests answer “is this implementation behaving according to its contracts?” They do **not** by themselves answer “did this solver idea improve capability, generalize, or win fairly at equal work?” A green CI run is necessary validation for many changes, but research claims additionally require the experiment/evidence rules in [`solver-research-operating-model.md`](solver-research-operating-model.md).

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
- making a high-stakes implementation-completeness claim on a broad change.

`ci` is browser-free; `ci:full` adds browser tests. Visual tests stay separate because rendering varies by environment. GitHub Actions is execution infrastructure, not research evidence unless the exact run/protocol/population is reported.

Test-wall-time figures are measurements, not contracts: fixture changes, runner load, hardware, and suite composition can move them sharply. Measure current timings from the command/workflow when runtime itself matters rather than copying a historical minute estimate into another authority.

## Tier map

| Tier | Command | Purpose |
|---|---|---|
| Static | `npm run check` | lint/architecture, types, security/CSP, data/docs invariants |
| Unit/integration | `test:unit` / `test:coverage` | Vitest logic/controller tests; coverage in `test:coverage` |
| Node harnesses | `test:node` / `test:node:fast` | boot/data/oracle/loader/Firestore/bundled-level/CLI harnesses |
| Browser e2e | `test:e2e` | production Vite bundle in Chromium |
| Visual | `test:visual` | modal/overlay screenshots |
| Solver/data research | solver/stress/ablation/hint/level tools | experimental evidence on demand; outside ordinary `ci` |

`test:node:fast` currently includes every Node validator; it leaves room to exclude future genuinely slow validators. Former slow hint-workbench/diversification validators now use cheap fixtures with the same plumbing.

Local `ci` runs `check`, `test:coverage`, then `test:node`. Each has internal concurrency; running them concurrently on one 4-core machine can oversubscribe it. In GitHub Actions those legs use separate runners. Vitest/proof jobs omit archived `logs/`, dated `reports/`, and standing `data/stress/` corpora they do not consume; build keeps runtime stress assets but omits logs/reports; Node harnesses keep their exact committed stress/report evidence fixtures while omitting unrelated archival material. Repository-wide static hygiene keeps a full checkout because it intentionally scans tracked artifacts. `package.json` is authoritative for the local graph.

## Fast vs deep

`deepTest` is for expense intrinsic to an implementation proof: exhaustive soundness, real regression rescue, or real cross-tier budget behavior. `SOLVER_DEEP_TESTS=0` skips them; `test:unit:fast`/`ci:fast` set it. Every PR still runs every deep proof. `deep-verification` owns coverage plus the ordinary deep tests; the exhaustive must-cross deadlock-soundness property is the one exception to single-runner execution because its fixed 5x5 search tree has exactly two root moves. Actions runs those two disjoint root subtrees in separate `deadlock-soundness-0` / `deadlock-soundness-1` jobs while the coverage job skips only that duplicate execution. With `SOLVER_DEADLOCK_PROOF_ROOT` unset, local `npm run ci` still runs the original whole tree serially. The split is execution plumbing only; it does not narrow the proof population.

Do not mark a test deep merely because it is slow. Stub search when assertions only need scheduling/routing/budget behavior; `orchestration.test.ts` uses `attemptSearchForTesting` / `exhaustingDispatch` for this.

A deep test can prove a specific invariant over its fixtures. It does not make a selected heuristic treatment statistically independent or generally effective.

## Timing instrumentation

Measure before guessing:

- `test:coverage` writes `tmp/vitest-timings.json` and reports slow files/tests via `vitest-slow-test-report.mjs`.
- `check`/`test:node` use `run-scripts-parallel.mjs`, which reports subcommand time.
- Actions separates `checks`, `unit-tests-fast`, `node-tests-fast`, `build`, `deep-verification`, and the two `deadlock-soundness-*` root partitions.

When optimizing test runtime, profile the actual suite/subcommand before deleting coverage or weakening a proof. Prefer cheaper fixtures, targeted stubs, concurrency fixes, and tiering over making important validation disappear.

## Static checks

`npm run check` covers architecture lint, types, security/secrets/dependencies/CSP, modal accessibility, CSS/canvas-theme checks, `check:no-solver-level-numbers`, hint validity, level provenance/corpus formatting, and documentation/workflow discovery.

A PLAY-valid stored hint proves a solution, not cold solver capability; use shared provenance classification for capability claims.

A static check preventing exact level IDs or stale docs is a useful guardrail, but passing it does not establish that a generic policy is not overfit to Corpus 2 or a family trove.

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

## Solver changes: four separate questions

For solver work, do not collapse these into one “tests passed” verdict.

### 1. Correctness / soundness

Does the solver accept only valid paths and avoid rejecting valid states where a rule claims soundness?

- referee-validate returned paths;
- use independent/reference/differential controls where appropriate;
- hard-prune/state-identity changes require proof-oriented fixtures/counterexamples, not solve-count evidence.

For connectivity/topology hard-prune changes, replay known-valid solution prefixes with `node scripts/run-bundled.mjs scripts/stress/connectivity-soundness-check.mjs`; a hard prune must never reject a state with a stored valid completion.

For must-cross rejection changes, use `scripts/stress/mc-prune-soundness-check.mjs`; for `mustCrossNeighborBudgetDeadlocked`, use the narrower `scripts/stress/mc-neighbor-budget-soundness-check.mjs`.

### 2. Implementation regression

Did a refactor preserve the behavior it claims to preserve?

- `npm run solver:bench -- --check` checks the published solved set; it is not a speed benchmark and not a generalization test;
- pure-speed/order-preserving changes should preserve deterministic work/outcomes and, where claimed, decisions;
- stage/cache lifetime changes should include fresh-vs-preceded characterization if they can affect search history.

### 3. Performance / cost

Did the implementation make the same useful work cheaper, or did a policy use less/more work?

- For implementation speed, use the deterministic work protocol in [`solver-architecture.md`](solver-architecture.md#speed-only-optimization) and representative interleaved wall measurements.
- `node scripts/stress/hint-cost-drift.mjs` is a cheap retrospective signal for search-cost changes when hint provenance contains same-config/same-budget rediscoveries at multiple commits. It prefers `workSpent`, but coverage is opportunistic and drift is an attribution lead, not a regression verdict.
- `node scripts/stress/classify-stability.mjs --in=<benchmark>` distinguishes comfortable solves from budget-edge solves; add `--compare=<second-run>` to flag outcome/status flakiness. This helps decide how much confidence to place in a nominally preserved solve.
- Neither retrospective signal replaces a controlled deterministic before/after benchmark when making a promotion or performance claim.
- `workSpent` is the cross-technique allocation currency; raw nodes are not.
- A policy that solves more by spending more total work is not a speedup.
- A binding wall deadline makes unsolved capability indeterminate for reproducible search evidence; classify `deadlineTruncated` separately.

### 4. Research efficacy / generalization

Did the *idea* improve the intended population fairly, and does the claim extend beyond the data used to invent it?

- follow [`solver-research-operating-model.md`](solver-research-operating-model.md) and [`investigation-report-conventions.md`](investigation-report-conventions.md);
- state whether evidence is discovery, tuning, confirmation, transfer, or forensic;
- disclose candidate/threshold/seed/profile selection;
- use an explicit total-work envelope for allocation changes;
- report gains, losses, reach/participation, work, errors/truncation, and independent unit;
- selected/tuned positives need untouched/grouped confirmation for robust promotion claims;
- level-blind execution does not make repeatedly mined Corpus-2 data an independent holdout.

Use the narrowest population that decides the iteration question, then the relevant confirmation/transfer gate for the claim. Do not spend full-corpus compute merely to reconfirm a locally falsified premise, and do not use full CI as a substitute for an experiment.

## Solver research finish-line examples

| Claim | Minimum evidence shape |
|---|---|
| “This refactor is pure speed” | identical intended search work/outcomes + representative interleaved wall improvement |
| “This prune is sound” | proof/reasoning + counterexample-oriented/reference validation; zero observed losses alone is insufficient |
| “This routing change helps Corpus 2” | current-code level-blind matched-work affected population + controls + gains/losses/work |
| “This selected profile/threshold is robust” | above plus independent confirmation not used to select it |
| “This generalizes to unseen Pathfinder levels” | locked/fresh transfer evidence appropriate to that broad claim |
| “This retry is free because it is dead-last” | invalid claim; report the extra residual work and compare within a shared envelope |

## Documentation changes

Run `npm run check:documentation-links` (included in `check`) after renames, current-authority edits, command/path changes, or navigation changes. A passing link check proves structural discoverability, not semantic freshness or scientific validity; [`change-recipes.md`](change-recipes.md) covers drift-prone cross-authority changes.
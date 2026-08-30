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

### Clock discipline in tests

A correctness test must not depend on how many real milliseconds the host happened to provide. In particular:

- do not assert that solver/search work finishes or times out inside a small real-time window;
- when testing a wall-deadline code path, mock the clock and make the deadline transition deterministic;
- when testing search extent, scheduling, or budget accounting, use work/node ceilings and a deliberately non-binding wall deadline;
- treat Vitest/Actions timeouts as hang-safety infrastructure, not solver evidence. If a deterministic proof approaches the runner timeout under contention, isolate or partition the proof rather than interpreting the timeout as a search result;
- keep real elapsed-time assertions in explicit performance/benchmark tooling, where host/load are part of the measurement and are reported as such.

A solver `deadlineTruncated` result, a mocked deadline-path unit test, and a test-runner timeout are three different things and must remain labeled separately.

## Tier map

| Tier | Command | Purpose |
|---|---|---|
| Static | `npm run check` | lint/architecture, types, security/CSP, data/docs invariants |
| Unit/integration | `test:unit` / `test:coverage` | Vitest logic/controller tests; coverage in `test:coverage` |
| Node harnesses | `test:node` | boot/data/loader/Firestore/bundled-level/CLI/research-tool software contracts |
| Browser e2e | `test:e2e` | production Vite bundle in Chromium |
| Visual | `test:visual` | modal/overlay screenshots |
| Solver/data research | solver/stress/ablation/hint/level tools | experimental evidence on demand; outside ordinary `ci` |

`test:node` is the ordinary Node/CLI software-contract graph. It intentionally excludes `test:hint-path-validation`: `check:level-data-validity` already validates every runtime-shipped level structurally and every associated stored hint against the PLAY referee across published, stress-corpus-1, and stress-corpus-2. The validator remains available on demand when its richer per-level/per-hint diagnostic report is needed. CLI/analyzer harnesses should use synthetic fixtures unless the real repository asset itself is the contract being checked.

Local `ci` runs `check`, `test:coverage`, then `test:node`. The major phases remain serial because each has internal concurrency; running coverage/check/Node concurrently on one 4-core machine can oversubscribe it. Heavy implementation proofs are ordinary deep Vitest files locally: the two deadlock root subtrees and the enabled/disabled R02560 repair-regression halves can therefore use Vitest's existing file worker pool inside the single coverage phase. `npm run test:deep-proofs` is the canonical explicit four-file partition used when those proofs need separate ownership. In GitHub Actions one `deep-proofs` job invokes that shared command while `deep-verification` skips only the delegated copies. Actions runs only one ordinary covered Vitest population; the former duplicate `unit-tests-fast` PR job was removed once covered/deep Vitest became comparably fast. Node/CLI tests use the lean checkout because historical research reports and standing stress corpora are no longer ordinary test fixtures. Repository-wide static hygiene keeps a full checkout because it intentionally scans tracked artifacts. `package.json` is authoritative for the local graph.

## Fast vs deep

`deepTest` is for expense intrinsic to an implementation proof: exhaustive soundness, real regression rescue, or real cross-tier budget behavior. `SOLVER_DEEP_TESTS=0` skips them; `test:unit:fast`/`ci:fast` set it. Every PR still runs every deep proof. The expensive deadlock-soundness proof is represented by two deep Vitest files, one for each root move of the fixed 5x5 must-cross fixture; those subtrees are disjoint and collectively exhaustive, and each file repeats the negligible must-turn fixture so it independently exercises every helper/control. The provisional R02560 close-length-gap integration witness is two deep files sharing the same 900,000-node boundary: production-default enabled must solve, while disabling only that feature must not. It remains only because the earlier synthetic trap failed to isolate this mechanism correctly; replacement by a smaller faithful witness is preferred. Local coverage runs all four through Vitest's normal worker pool. Actions runs those same four files together in one `deep-proofs` job and sets proof-specific skip flags only on the coverage job, so the proof population is unchanged and not duplicated.

Do not mark a test deep merely because it is slow. Stub search when assertions only need scheduling/routing/budget behavior; `orchestration.test.ts` uses `attemptSearchForTesting` / `exhaustingDispatch` for this.

A deep test can prove a specific invariant over its fixtures. It does not make a selected heuristic treatment statistically independent or generally effective.

### Historical level witnesses

A production/stress level may document where a regression was discovered, but ordinary correctness CI should prefer the smallest synthetic or distilled witness that exercises the implementation invariant. Do not make “this historical level still solves” a permanent correctness contract merely because it was once solved in research.

A real corpus level may remain executable in CI only when the relevant mechanism cannot yet be reproduced faithfully by a smaller fixture. Such a dependency must:

- name the implementation invariant it isolates, not merely the solve outcome;
- use deterministic/matched budgets where the budget boundary is part of that invariant;
- be documented as **provisional**, with replacement by a synthetic/distilled witness as the intended end state; and
- never be cited as evidence of general solver effectiveness or promotion quality.

Historical level IDs are encouraged in comments as provenance when the actual test uses a distilled fixture. Solver/corpus effectiveness belongs in research/benchmark gates, not correctness CI.

### Frozen research evidence is not a software compatibility API

Dated reports, campaign directories, run-ID snapshots, and derived research tables record what a particular tool/code/protocol produced at that time. Ordinary CI must not require the **current** analyzer to reproduce those historical bytes forever. That turns legitimate analyzer evolution into a fake software regression and forces every checkout to carry archival evidence.

Current analyzer/parser/math behavior belongs in synthetic software-contract tests. Historical reproducibility belongs to the artifact's recorded source commit/protocol and is checked on demand when auditing or intentionally regenerating that evidence. A derived artifact that is explicitly designated as a current repository authority may have a freshness check, but that status must be documented; age alone does not make a snapshot a CI fixture.

For example, `test:technique-campaign-analysis` and `test:technique-census-second-order` test their analyzers with synthetic inputs. The dated August campaign and census run remain evidence, not permanent backward-compatibility test vectors. `node scripts/technique-census-second-order.mjs --check` remains available for an intentional census re-derivation audit.

## Timing instrumentation

Measure before guessing:

- `test:coverage` writes `tmp/vitest-timings.json` and reports slow files/tests via `vitest-slow-test-report.mjs`; file-level proof partitioning uses Vitest's ordinary worker scheduling rather than another runner layer.
- `check`/`test:node` use `run-scripts-parallel.mjs`, which reports subcommand time.
- Actions has six non-overlapping jobs: full-tree non-lint repository checks (`checks`), lean lint (`checks-lint`), lean Node/CLI contracts (`node-tests`), `build`, `deep-proofs`, and covered `deep-verification`. Local `npm run check` remains serial lint → validator fan-out because racing those CPU-heavy halves on one machine measured slower.
- ESLint's content-addressed per-file cache lives at `.cache/eslint`. Local runs reuse it directly; Actions restores the newest cache from the same config/package-lock generation and saves a per-commit successor, so the same invalidation rules apply in both environments.
- `checks` and `build` initially omit the ~2,000 runtime level/hint files from sparse checkout. Actions restores an exact runtime-data cache keyed from the Git object IDs of every shipped corpus/hint tree; a cache miss materializes those exact paths from Git and seeds the cache. There is no fallback-key reuse, so a changed runtime-data tree cannot receive stale files.

When optimizing test runtime, profile the actual suite/subcommand before deleting coverage or weakening a proof. Prefer cheaper fixtures, targeted stubs, concurrency fixes, and tiering over making important validation disappear.

## Static checks

`npm run check` covers architecture lint, types, security/secrets/dependencies/CSP, modal accessibility, CSS/canvas-theme checks, `check:no-solver-level-numbers`, runtime level/hint validity, level provenance/corpus formatting, documentation/workflow discovery, and the maintained GitHub Action runtime-major policy. `check:validators` is the parallel non-lint validator fan-out; `check:nonlint` adds the two structural prechecks and exists so Actions can run that half independently of `check:lint`. These scripts partition execution only; `check` remains the authoritative local composition.

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
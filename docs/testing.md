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

`test:node` is the conservative full Node/CLI software-contract aggregate. Production PR CI selects semantic subsets of that aggregate; explicit historical/reproducibility audits are not members of the permanent graph. It intentionally excludes `test:hint-path-validation`: `check:level-data-validity` already validates every runtime-shipped level structurally and every associated stored hint against the PLAY referee across published, stress-corpus-1, and stress-corpus-2. The validator remains available on demand when its richer per-level/per-hint diagnostic report is needed. CLI/analyzer harnesses should use synthetic fixtures unless the real repository asset itself is the contract being checked.

Local `ci` runs `check`, `test:coverage`, then `test:node`. The local phases remain serial because each has internal concurrency and a single 4-core workstation can oversubscribe when broad phases race each other. Heavy implementation proofs remain ordinary deep Vitest files locally; `npm run test:deep-proofs` is the canonical explicit two-file hard-prune soundness partition used when those proofs need separate ownership. Historical R02560 effectiveness characterization is separate and on demand.

GitHub Actions now uses semantic impact routing across independent execution lanes. Fast Gate owns static/validator/lint/build work; Node/CLI contracts run in a two-runner `node-contracts` matrix partitioned by registry execution owner, while semantic invalidation selection remains unchanged. The owner partitions are disjoint and reconstruct the full `test:node` authority on fail-safe/full-impact execution. `fast-gate` remains the always-materialized runner so lint/startup costs do not acquire another hosted-runner dependency, but it computes the merge-diff plan locally, runs only the selected validator and Node/CLI groups, and runs the production build only when game/solver impact selects the build capability. If that local router fails, Fast Gate fails safe to the full `check:validators` and `test:node` aggregates. Package/script reachability and textual invariants remain separate deterministic steps. `impact-shadow` computes the same plan independently as an inspectable routing artifact and owns whether `deep-verification` is required. `deep-verification` owns covered ordinary Vitest only. The independent `deep-services` lane owns the two-file hard-prune soundness command and Firestore persistence boundary, running those services concurrently when both are selected. Planner failure remains conservative in both optional lanes: coverage runs on planner failure, and deep services run both proofs and Firestore. The broad `main-push-validation.yml` workflow remains the integration/direct-main backstop.

Coverage excludes the explicitly delegated soundness files and the on-demand R02560 characterization pair, so effectiveness characterization is not silently reintroduced through coverage. Impact routing changes cadence, not the meaning of any selected software contract. `package.json` remains the conservative local full-aggregate authority.

The previous two-lane packing strategy was chosen to reduce hosted-runner lottery and duplicated setup. That decision is now subject to the explicit CI latency objective documented below: a hard full-validation wall-time target can justify additional parallel lanes when measurement shows the critical-path reduction outweighs checkout/setup/install variance. Do not add jobs merely because commands are logically independent; add them when a measured lane design improves full-gate wall time while preserving the validation contract.

## Validation ownership inventory

The CI impact-routing program is tracked in [`ci-impact-routing-plan.md`](ci-impact-routing-plan.md). Semantic ownership is now live infrastructure: `scripts/validation-groups.json` classifies the existing `check:validators` and `test:node` members into `repo`, `game`, `persistence`, `solver`, `research`, `data`, and conservative `shared` groups. Production activation now scopes both deep capabilities and the Fast Gate validator/Node-test populations by semantic surface. Fast Gate itself remains always materialized because lint/build and shared setup are still packed there.

`node scripts/validation-groups.mjs --check` requires the registry to be an exact non-duplicating partition of the current authoritative aggregates. `check:dead-scripts` runs that parity check, so adding/removing an ordinary permanent validator or Node/CLI harness requires an explicit ownership decision rather than silently changing the inventory.

For targeted local diagnosis, semantic group aliases exist for validator and Node-test families, for example `npm run check:validators:repo` and `npm run test:node:repo`. Production Fast Gate invokes the same registry-selected groups; the full aggregates remain conservative local/fail-safe authorities.

Ambiguous ownership belongs in `shared` until inspected. Unknown impact must broaden routing rather than narrow it. Optional `contractDependencies` metadata can describe explicit repository-path inputs, local subprocess entrypoints, and fixture-only filesystem activity, but it is not yet authoritative for production skipping.

PR/main routing publishes a `ci-impact-shadow` JSON artifact so decisions can be compared mechanically across runs rather than reconstructed from logs. On PRs, planner failure is non-fatal to the planner job but **fails safe for execution**: the deep lane runs. On main pushes the same model remains observational while broad main validation stays authoritative.

For end-to-end routing rehearsal, `.github/workflows/ci-scoped-dry-run.yml` remains manual-only. It accepts explicit base/head refs, computes the same semantic plan, runs selected obligations, and enforces the scoped result contract. It is now a rehearsal/oracle for future routing changes rather than a prerequisite for the already-live deep-lane scoping.

Persistence is intentionally separate from generic game ownership. Firestore emulator/rules validation is expensive infrastructure with a narrow contract; UI/render/input changes should not eventually pay Java/Firestore startup merely because both ship in the same application. `modules/persistence/**` carries both game and persistence impact, while Firestore authority/harnesses carry persistence explicitly.

## Fast vs deep

`deepTest` is for expense intrinsic to an implementation correctness proof: exhaustive soundness or real cross-tier budget behavior. Solver-effectiveness rescue preservation belongs to characterization/research tooling rather than PR gating. `SOLVER_DEEP_TESTS=0` skips them; `test:unit:fast`/`ci:fast` set it. PRs whose semantic impact requires deep verification run every deep proof; unrelated PRs may skip the entire deep lane under the fail-safe impact plan. The expensive deadlock-soundness proof is represented by two deep Vitest files, one for each root move of the fixed 5x5 must-cross fixture; those subtrees are disjoint and collectively exhaustive, and each file repeats the negligible must-turn fixture so it independently exercises every helper/control. The historical R02560 partial-path-completion pair is **solver-effectiveness characterization**, not ordinary merge-safety validation. The enabled arm records that production-default behavior historically rescued the case within the published 900,000-node ceiling; the disabled arm records that disabling only that mechanism historically did not. Either statement may legitimately change when search quality/tradeoffs change, so neither is a permanent PR invariant. Both remain available through `npm run test:solver-effectiveness-characterizations` for intentional attribution/research checks. Ordinary PR deep proofs are reserved for correctness/soundness obligations such as exhaustive hard-prune proofs. The existing top-level `solveLevel()` synthetic line test already provides a tiny real-solver smoke without pinning historical level effectiveness.

Do not mark a test deep merely because it is slow. Stub search when assertions only need scheduling/routing/budget behavior; `orchestration.test.ts` uses `attemptSearchForTesting` / `exhaustingDispatch` for this.

A deep test can prove a specific invariant over its fixtures. It does not make a selected heuristic treatment statistically independent or generally effective.

### Historical level witnesses

A production/stress level may document where a regression was discovered, but ordinary correctness CI should prefer the smallest synthetic or distilled witness that exercises the implementation invariant. Do not make “this historical level still solves” a permanent correctness contract merely because it was once solved in research.

A real corpus level may remain executable in CI only when the relevant mechanism cannot yet be reproduced faithfully by a smaller fixture. Such a dependency must:

- name the implementation invariant it isolates, not merely the solve outcome;
- use deterministic/matched budgets where the budget boundary is part of that invariant;
- distinguish a production regression invariant from a research attribution/control. A negative ablation statement such as "this historical level still fails when feature X is disabled" belongs in an on-demand characterization unless blocking its failure would prevent a concrete unsafe merge;
- be documented as **provisional**, with replacement by a synthetic/distilled witness as the intended end state; and
- never be cited as evidence of general solver effectiveness or promotion quality.

Historical level IDs are encouraged in comments as provenance when the actual test uses a distilled fixture. Solver/corpus effectiveness belongs in research/benchmark gates, not correctness CI. Fixed published-level solve outcomes, rescue preservation, solved-count preservation, and matched-budget capability claims belong to the experiment/promotion process even when an individual witness is cheap.

### Frozen research evidence is not a software compatibility API

Dated reports, campaign directories, run-ID snapshots, and derived research tables record what a particular tool/code/protocol produced at that time. Ordinary CI must not require the **current** analyzer to reproduce those historical bytes forever. That turns legitimate analyzer evolution into a fake software regression and forces every checkout to carry archival evidence.

Current analyzer/parser/math behavior belongs in synthetic software-contract tests. Historical reproducibility belongs to the artifact's recorded source commit/protocol and is checked on demand when auditing or intentionally regenerating that evidence. A derived artifact that is explicitly designated as a current repository authority may have a freshness check, but that status must be documented; age alone does not make a snapshot a CI fixture.

For example, `test:technique-campaign-analysis` and `test:analyze-technique-census` test their analyzers with synthetic inputs. The dated August campaign and census run remain evidence, not permanent backward-compatibility test vectors. `node scripts/analyze-technique-census.mjs --check` remains available for an intentional census re-derivation audit.



## CI wall-time objective

The active CI optimization target is **the fullest semantically justified PR merge-safety contract in 35 seconds or less wall-clock** (implementation plan: [`ci-35s-critical-path-plan.md`](ci-35s-critical-path-plan.md)), measured from the first required runner starting to the last required validation lane completing.

The target is not permission to weaken correctness. It is also not a requirement to preserve every historical CI obligation forever. Claim ownership and cadence are decided first: solver/research effectiveness belongs to the experiment/promotion system, frozen evidence belongs to explicit reproducibility audits, and repository-governance checks are scoped to surfaces capable of invalidating them. The full-impact target then applies to every merge-safety obligation selected by a genuinely broad change.

Meeting the target may require restructuring runner/job topology, checkout/materialization, dependency preparation, test sharding, worker reuse, and repository/test seams. Refresh timing priorities after routing/cadence changes rather than optimizing from an obsolete universal population.

Runtime-data materialization is a CI infrastructure contract, not test fixture magic. PR lanes use the shared rolling runtime-data cache action: exact Git-blob identity keys, latest-prior fallback, and manifest-based changed-file overlay. A stale cache is acceptable only if reconciliation proves the working tree matches current HEAD before validation starts. The dedicated `test:ci-runtime-data-cache` contract protects that invariant.

Track both median and tail behavior. A one-off sub-35-second run is not success if comparable full-impact runs routinely exceed the target. The critical-path audit should report at least p50 and p90 wall time once enough comparable runs exist, plus per-lane setup and useful-work spans.

## Timing instrumentation

Measure before guessing:

- `test:coverage` writes `tmp/vitest-timings.json` and reports slow files/tests via `vitest-slow-test-report.mjs`; file-level proof partitioning uses Vitest's ordinary worker scheduling rather than another runner layer.
- `check`/`test:node` use `run-scripts-parallel.mjs`, which reports subcommand time.
  The runner's historical default remains unbounded fan-out for compatibility, but `PATHFINDER_PARALLEL_JOBS=<N>` enables an opt-in bounded worker pool for measurement. The Node graph has grown past 160 child scripts, so compare representative values (for example 4/8/16/unbounded) before changing the default. Measure total wall time, tail command time, memory/process pressure, and failure behavior; do not turn a one-run timing win into a correctness rule. `ci-node-concurrency-benchmark.yml` is the reproducible Actions entrypoint: it keeps all variants on one runner and rotates their order across repeats to reduce runner-lottery and warm-cache/order bias.
- Actions has a universal `fast-gate`, an impact-scoped `deep-verification` lane, and dependency-free `impact-shadow` planning. As of the 35-second critical-path audit, the current full-impact layout is a **baseline to beat, not a protected topology**: broad phases may be split or raced when same-runner/hosted-runner measurements show that parallel execution reduces end-to-end wall time without weakening failure semantics.
- Both Actions lanes use setup-node's npm content cache plus `npm ci --prefer-offline --no-audit --fund=false`. `--prefer-offline` avoids unnecessary registry freshness checks when cached package content is available; missing content can still be fetched. npm's informational audit/funding requests are not CI gates here; explicit repository security checks remain authoritative.
- ESLint's content-addressed per-file cache lives at `.cache/eslint`. Local runs reuse it directly; `fast-gate` restores the newest Actions cache from the same config/package-lock generation and saves a per-commit successor, so the same invalidation rules apply in both environments.
- `fast-gate` initially omits the ~2,000 runtime level/hint files from sparse checkout. Actions restores an exact runtime-data cache keyed from the Git object IDs of every shipped corpus/hint tree; a cache miss materializes those exact paths from Git and seeds the cache once for all fast-lane consumers. There is no fallback-key reuse, so a changed runtime-data tree cannot receive stale files. `build` no longer performs a second independent materialization of the same tree.

When optimizing test runtime, profile the actual suite/subcommand before deleting coverage or weakening a proof. Measure both median and tail behavior: hosted-runner assignment, checkout, setup, cache restore, and dependency installation are part of PR wall time even when they are external to the test implementation. Prefer cheaper fixtures, targeted stubs, concurrency fixes, coarse-grained lane composition, and tiering over making important validation disappear or multiplying runner lotteries.

## Static checks

`npm run check` covers architecture lint, types, security/secrets/dependencies/CSP, modal accessibility, CSS/canvas-theme checks, `check:no-solver-level-numbers`, runtime level/hint validity, level provenance/corpus formatting, documentation/workflow discovery, and the maintained GitHub Action runtime-major policy. `check:dead-scripts` also rejects missing local Node entrypoints and explicit Vitest file arguments in `package.json`, so a renamed proof cannot silently disappear from an otherwise-green multi-file Vitest command. `check:validators` is the parallel non-lint validator fan-out; `check:nonlint` adds the two structural prechecks and exists so Actions can run that half independently of `check:lint`. These scripts partition execution only; `check` remains the authoritative local composition.

A PLAY-valid stored hint proves a solution, not cold solver capability; use shared provenance classification for capability claims.

A static check preventing exact level IDs or stale docs is a useful guardrail, but passing it does not establish that a generic policy is not overfit to Corpus 2 or a variant-family dataset.

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

- `npm run solver:regression -- --check` checks the published solved set; it is not a speed benchmark and not a generalization test;
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

For GitHub-hosted research, distinguish the scientific verdict from execution health using the outcome contract in [`.github/workflows/README.md`](../.github/workflows/README.md#research-outcome-contract). A completed negative hypothesis test is successful execution and should stay green; invariant, harness, and infrastructure failures stay red. Timeouts are reported separately and are only green where the workflow already defines bounded timeout as valid evidence.

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

# CI testability and cost topology audit — initial pass

> **Date:** 2026-09-23  
> **Status:** active audit; structural analyzer added, manual run pending.  
> **Related:** `reports/2026-09-23-ci-historical-value-audit-phase0-001.md`, `docs/ci-impact-routing-plan.md`, `docs/testing.md`.

## Objective

The historical-value audit asks **which checks still justify their current cadence**.

This audit asks a different question:

> **What repository/test structure makes CI broader, slower, or harder to route than the underlying software contract requires?**

The target is not merely faster GitHub Actions YAML. The target is a repository whose contracts are cheap to exercise, easy to select, deterministic, and narrow enough that the impact router can reason about them mechanically.

## Lenses

### 1. Execution selection

Already covered by the historical-value / impact-routing program:

- universal versus impact-scoped cadence;
- PR versus main/nightly/manual cadence;
- unique/earliest/redundant detector value;
- direct-main and periodic full-oracle backstops.

This audit treats those decisions as downstream consumers of better testability.

### 2. Process topology

Questions:

- How many independent OS processes does one logical validation group create?
- How often does `npm run` spawn another Node/tsx/bundled CLI process merely to execute assertions?
- Which tests spawn additional children/workers internally?
- Which tests could run safely inside a long-lived test process?

Current shape:

- `test:node` contains **173** permanent harnesses.
- The historical runner launches **173 npm scripts concurrently** by default.
- Every harness therefore pays at least the npm child-process boundary; many pay an additional `tsx`, bundle, CLI, worker, or subprocess boundary.
- On CI run 35914130423, the whole graph took about **34.3 s wall time**, while many individual commands reported 20–34 s durations under the 173-way contention.

Invocation inventory from the current registry:

| group | Node | tsx | run-bundled | other | total |
|---|---:|---:|---:|---:|---:|
| research tests | 80 | 1 | 5 | 1 | 87 |
| data tests | 24 | 9 | 0 | 0 | 33 |
| shared tests | 24 | 1 | 0 | 0 | 25 |
| solver tests | 13 | 3 | 0 | 0 | 16 |
| repo tests | 9 | 0 | 0 | 0 | 9 |
| game tests | 1 | 1 | 0 | 0 | 2 |
| persistence tests | 1 | 0 | 0 | 0 | 1 |

**Hypothesis:** a meaningful fraction of ordinary Node harness cost is process/bootstrap overhead rather than assertion work.

Do not convert everything to one process blindly. Subprocess isolation is appropriate for CLI contracts, worker behavior, environment mutation, and true executable-boundary tests. The audit should distinguish those from direct-module candidates.

### 3. CLI versus library seams

Representative examples:

- `test:select-routing-regime-sample-cli` invokes the bundled CLI repeatedly to verify normalization/conflict behavior. The canonical/legacy routing-regime comparison is fundamentally a pure argument-normalization contract; most assertions could target an exported parser/normalizer while one small CLI smoke proves wiring.
- `test:stress-topology-generator` bundles and executes the real generator twice, generates 12 levels twice, writes/reads temporary corpora, then validates reproducibility and structural properties. Much of that is valuable, but direct generator/library seams could permit tiny deterministic construction tests plus one end-to-end CLI parity case.
- `test:portfolio-solve-sweep-worker` intentionally exercises the real forked+bundled worker path and therefore belongs in an integration tier. However, it also contains pure transport/field-projection/source-contract assertions that need not repeatedly pay real solver-worker startup.
- `test:hint-query-lib` is predominantly direct pure-library assertion work. Its ~14 s CI command time is therefore a strong candidate for process/contention overhead rather than intrinsic computation.

**Repo-shaping rule:** CLIs should be thin parse → library → format shells. Test library behavior directly; preserve a small explicit CLI-boundary smoke suite.

### 4. Fixture/data footprint

Questions:

- Does the test require the production repository asset, or merely a structurally representative object?
- Does it repeatedly parse/load a large corpus that could be replaced by a tiny canonical fixture?
- Does the contract need filesystem serialization, or can it operate on values in memory?

The testing guide already states the desired rule: CLI/analyzer harnesses should use synthetic fixtures unless the real repository asset itself is the contract.

The historical cost audit shows the highest sampled runtime concentration in the **data** test group:

- data tests: ~31,745 sampled command-seconds;
- solver tests: ~13,967 s;
- shared validators: ~7,351 s;
- shared tests: ~3,316 s;
- repo validators: ~2,998 s.

These totals are observational exposure in representative failed-job logs, not intrinsic benchmark totals. They nevertheless identify where fixture/data locality deserves inspection first.

### 5. Redundancy and correlated contracts

The historical signature pass shows many repository/research checks failing together.

Examples:

- documentation/workflow metadata failures often co-occur;
- research index/inventory/query/integration contracts frequently move together;
- lifecycle and ownership checks often detect the same authoring episode through different surfaces.

The question is not simply whether correlated checks are duplicates. It is:

> Is there one underlying authority/invariant being re-derived independently by several consumers?

Where yes, prefer:

1. one canonical producer/authority validator;
2. narrow consumer-contract tests;
3. a mechanically shared parsed/indexed representation;
4. explicit failure IDs tying consumers back to the authority.

That preserves coverage while avoiding repeated whole-repo reconstruction.

### 6. Shared ownership debt

The current `shared` Node-test bucket contains **25** tests. It is explicitly the conservative unknown/cross-cutting bucket.

In the recoverable historical detector sample, current shared Node tests produced only **3** representative detector appearances across two identities, while sampled executions consumed ~3,316 command-seconds.

This is not evidence to demote `shared` wholesale. It is evidence that **shared is too imprecise to remain a permanent architecture category**.

Every shared contract should be inspected and moved toward one of:

- a precise single owner;
- an explicit multi-surface dependency declaration;
- a genuinely universal invariant with a written reason.

### 7. Coverage/proof concentration

Latest green deep-verification evidence (run 35914130423):

- covered ordinary Vitest: ~30 s wall;
- explicit four-file deep proofs: ~11 s;
- Java + Firestore emulator boundary: ~31 s.

The covered population reported **1,523 tests across 142 files** with **35.1 s summed per-file/test duration**, but cost is highly concentrated:

| file | duration |
|---|---:|
| `orchestration-work-budget.test.ts` | 8.2 s |
| `diversification.test.ts` | 7.2 s |
| `repair-search.test.ts` | 4.2 s |
| `hint-ablation-generator.test.ts` | 2.0 s |
| `solver-parallel-unit-tests.mjs` | 1.7 s |
| `orchestration-early-repair.test.ts` | 1.4 s |

The top three alone account for about **56%** of the reported 35.1 s.

**Implication:** do not broadly optimize the Vitest suite. Audit the handful of slow solver witnesses/proofs:

- Can real search be stubbed where only scheduling/accounting behavior is asserted?
- Can a smaller synthetic witness preserve the mechanism?
- Is one file mixing fast unit contracts with one intrinsically expensive proof?
- Should an expensive proof move to the existing deep-proof partition while preserving coverage of its pure logic through smaller tests?

### 8. Persistence infrastructure tax

The Firestore boundary is narrow but expensive because it brings up Java/emulator infrastructure.

The latest green run spent roughly as much wall time on Java + Firestore (~31 s) as on the entire ordinary covered Vitest population (~30 s).

This reinforces the impact-routing design that models **persistence** separately from generic **game** impact.

Next evidence requirement before scoping:

- inject a representative rules/repository-identity fault;
- prove persistence impact selects the emulator boundary;
- prove unrelated game/UI changes do not;
- keep periodic/full-main persistence validation as an oracle.

### 9. Repository-authority coupling

`package.json` currently serves both as:

- product dependency/build authority; and
- registry for hundreds of research/tool/test commands.

That makes harmless test-tool registration look like a globally important product-authority change.

Long-term shape:

- move permanent validation metadata/entrypoint registration into a dedicated machine-readable registry;
- keep a small number of stable package entrypoints such as group runners;
- derive parity rather than requiring every research harness to mutate global package authority.

The existing `validation-groups.json` is already the seed of this model.

### 10. Whole-repo scan/index reuse

Potential pattern to measure:

- documentation link checks;
- workflow lifecycle/action checks;
- research index/inventory/integration checks;
- file ownership/inventory checks;
- package-script reachability;
- report metadata audits.

If multiple validators independently enumerate and parse the same repository tree, introduce one content-addressed repository snapshot/index consumed by the validators.

The index must not become an opaque cache that can go stale. Its identity should be derived from Git/content inputs, and parity tests must prove consumers get the same logical view.

### 11. Concurrency and resource saturation

The repository already has `ci-node-concurrency-benchmark.yml` and an opt-in `PATHFINDER_PARALLEL_JOBS`.

Current default: unbounded, so all 173 harnesses start.

The next benchmark should use repeated same-runner comparisons, for example:

- 4;
- 8;
- 12;
- 16;
- 24;
- unbounded.

At least 3–4 repeats are preferable. In addition to wall time, a future benchmark revision should consider peak process count / memory if easy to collect.

Do not choose a new default from one run.

### 12. Failure ergonomics

Selective CI is safer when a failure is self-describing.

Permanent contracts should trend toward emitting:

- stable detector/contract ID;
- violated invariant;
- smallest relevant fixture/authority identity;
- semantic owner/surface;
- whether failure is current-authority, historical-evidence, or environment/infrastructure;
- machine-readable summary when practical.

This directly improves future historical-value audits and reduces repair pinball.

### 13. Test lifecycle

Every new permanent test should answer:

- What bug/invariant justified it?
- What semantic surface owns it?
- Is it unit, contract, integration, proof, parity oracle, or infrastructure boundary?
- Why does it need its current fixture scale?
- Why does it need subprocess/filesystem/network/emulator boundaries?
- What would permit demotion, replacement, or retirement?

Tests should not become permanent merely because a historical bug once occurred.

## New mechanical audit surface

This branch adds `scripts/ci-testability-topology-audit.mjs` and manual workflow `ci-testability-topology-audit.yml`.

The analyzer is dependency-free and observational. For each permanent validator and Node/CLI harness it records:

- semantic family/group;
- package command and invocation mode;
- local entrypoint;
- source line/import counts;
- subprocess/bundle usage;
- temporary/filesystem behavior;
- repository data/report/log references;
- environment/network/git dependence;
- source-grep/structural assertions;
- direct TypeScript imports;
- candidate refactor queues such as direct-module batching, CLI seam extraction, fixture narrowing, and shared-ownership disambiguation.

It does **not** produce a delete/keep score.

## Initial workstreams

### T1 — run topology audit and join to historical economics

Join the topology artifact with the full historical signature/cost artifact by command name.

Produce a ranked queue using separate dimensions, not one composite score:

- observed execution cost;
- representative detector history;
- subprocess/bootstrap complexity;
- fixture/repository breadth;
- ownership ambiguity;
- blast radius.

### T2 — bounded Node concurrency experiment

Run the existing benchmark on the current 173-harness graph. Change the default only if repeated evidence is clear.

### T3 — direct-module seam pilot

Choose 3–5 expensive low-hit harnesses representing different patterns:

1. pure library assertion currently paying standalone process startup;
2. CLI argument/normalization test;
3. temporary-file analyzer;
4. bundled worker integration test.

Refactor only enough to split pure logic from the genuine executable-boundary smoke. Measure before/after wall time and failure quality.

### T4 — shared ownership decomposition

Inspect the 25 shared tests. Replace generic `shared` with explicit surfaces/multi-surface edges where possible.

### T5 — slow Vitest witness audit

Start with:

- `orchestration-work-budget.test.ts`;
- `diversification.test.ts`;
- `repair-search.test.ts`.

For each slow test, classify real-search necessity versus stub/synthetic-witness opportunity. Preserve correctness proof strength.

### T6 — fixture/data locality audit

Prioritize the data-family zero/low-hit high-cost commands from the historical pass.

Questions:

- Can the fixture shrink?
- Can data be injected directly?
- Is serialization itself the contract?
- Can parsed/indexed input be reused inside a group process?
- Is a real-corpus parity check better separated from the ordinary contract test?

### T7 — repository snapshot/index experiment

Measure repeated whole-repo traversal/parsing among repo/research validators before implementing shared indexing.

### T8 — validation registration decoupling

Design a dedicated validation contract registry that can eventually carry:

- entrypoint;
- owner surface(s);
- execution class;
- dependency-install requirement;
- isolation requirement;
- fixture/data capabilities;
- parallel-safety;
- cadence class.

Do not migrate package scripts until the authority/parity story is explicit.

## Success criteria

The program should reduce:

- ordinary PR wall time;
- child-process count;
- repeated large-fixture/repository reads;
- irrelevant group execution;
- ambiguous `shared` ownership;
- diagnosis time after failures;

without reducing:

- demonstrated regression catch classes;
- deterministic proof strength;
- production/persistence safety;
- periodic full-oracle coverage.

The desired end state is not “fewer tests” as such. It is **smaller, sharper contracts that make fewer irrelevant executions necessary**.


## Shared-bucket inspection

A direct source pass over the 25 current `shared` Node tests shows that the bucket is largely classification debt rather than a coherent universal surface.

Examples:

- `test:production-search-frontier-sampler` — solver/research;
- `test:sweep-publish` — solver/research, with a subprocess boundary;
- `test:known-prefix-oracle-set-manifest` — data/solver contract;
- `test:method-probe-staging-lib` — research filesystem staging;
- `test:cpsat-branch-label-eligibility` — data/solver eligibility;
- `test:verify-canary-cell` — research canary CLI/integration;
- `test:portfolio-solve-sweep-lib` / `worker` — solver/research, with the worker test intentionally exercising real worker dispatch;
- known-solution-prefix survival collection/analysis — solver/data/research;
- `test:divergence-lib` and `test:operational-similarity-lib` — direct solver-analysis libraries;
- structural holdout/static portfolio/equal-work reach — research/data/solver analyses;
- CPSAT explicit-prefix reference pipeline/lib/integrity — data/solver reference tooling;
- class-3 dose exposure/expectations — solver/research analysis.

Only a minority of the inspected shared tests need a real subprocess boundary; many are direct imports over synthetic values.

The current routing consequence is larger than the label suggests: `shared` selects all shared validators/tests **plus unit coverage**, and `modules/domain/**` conservatively maps to `shared + game + solver + research`.

### Direction

The next registry generation should support **explicit surface arrays per contract**, separating semantic ownership from execution grouping.

For example, a contract could declare:

```json
{
  "name": "test:production-search-frontier-sampler",
  "surfaces": ["solver", "research"],
  "executionClass": "direct-module"
}
```

That is better than inventing ever more composite buckets such as `solver-research`, `research-data`, etc.

The impact planner can select a contract when any declared invalidation surface requires it, while execution packing can still batch contracts into a small number of runner processes.

## Historical-economics join

The topology workflow now accepts an optional `historical_audit_run_id`.

When provided, it downloads the retained `ci-historical-audit-corpus` artifact and runs `scripts/ci-testability-economics-join.mjs`.

The joined artifact preserves separate dimensions for every permanent contract:

- observed execution count/time;
- median/p90 command duration;
- representative detector episodes;
- semantic group;
- invocation/process topology;
- fixture/filesystem/repository coupling;
- refactor-candidate labels.

It intentionally does not collapse these into a single score.

Useful queues include:

- highest observed cost;
- low-hit/high-exposure;
- direct-module batching candidates;
- CLI/subprocess seam candidates;
- bundle-once/direct-library seam candidates;
- filesystem fixture candidates;
- repository-data fixture candidates;
- shared ownership candidates.


## Additional source-level findings

### Pure harnesses are visibly paying scheduler/process tax

On CI run 35914130423, several tiny direct-import research contracts each reported about **5.4 s** inside the 173-way Node fan-out:

- `test:research-semantic-identity` — 25 source lines, direct library assertions;
- `test:research-population-identity` — 82 lines, direct library assertions;
- `test:research-question-contract` — 35 lines, direct library assertions.

There is no plausible intrinsic five-second workload in those files. Their reported duration is dominated by process startup/scheduling/contention around the assertions.

This makes a direct-module/batched test pilot a high-confidence experiment.

### Repository model reuse already exists below the process boundary

The research-system code already demonstrates the desired architectural seam:

- `buildResearchSystemInventory()` builds one `buildResearchRelations()` model;
- it passes that model into `auditResearchIntegration(root, { model })`;
- the audit accepts a supplied model explicitly.

However, separate permanent harness processes such as research system inventory/query/integration/query-graph tests each reconstruct overlapping repository views from disk.

Potential end state:

1. an immutable `ResearchRepositorySnapshot` / relation model built once per test process;
2. consumers accept the snapshot/model explicitly;
3. most contract tests operate on injected in-memory models;
4. one or a few explicit fresh-build tests own filesystem discovery, deterministic rebuild, and Git-ref behavior.

Do not cache across commits or hide freshness behind mutable module globals.

### Slow Vitest files are mixed-tier

The latest covered suite reports:

- `orchestration-work-budget.test.ts`: ~8.2 s;
- `diversification.test.ts`: ~7.2 s;
- `repair-search.test.ts`: ~4.2 s.

`diversification.test.ts` already marks real-solver session tests with the existing `deepTest` convention, but Actions coverage runs them because the coverage step does not set `SOLVER_DEEP_TESTS=0`.

`repair-search.test.ts` mixes cheap pure helper tests with many genuine search integrations, including repeated deterministic/equivalence calls at **500,000–1,000,000 node budgets**.

This suggests a tier-shaping experiment:

- keep pure helper/control-flow coverage in ordinary instrumented Vitest;
- move genuinely real-search proofs to an explicit uninstrumented deep-proof population;
- add/stay with small synthetic/stubbed tests so moving a proof does not create a branch-coverage hole;
- benchmark total deep-lane wall time before changing the partition, because file-level parallelism can make a naive split slower.

The goal is to stop making coverage instrumentation carry expensive search proofs, not to weaken those proofs.

### Firestore is a separate infrastructure optimization target

Run 35914130423 spent roughly:

- ~30 s in covered ordinary Vitest;
- ~11 s in explicit deep proofs;
- ~31 s from Java setup through the Firestore emulator boundary.

Impact scoping is the largest win, but when persistence validation is required, a follow-up should measure:

- Firebase emulator binary/cache reuse;
- npx/firebase-tools resolution overhead;
- whether the emulator can stay within one deliberately persistent job phase when multiple persistence assertions are added.

Do not add `firebase-tools` globally as a devDependency merely to save this step without measuring the added `npm ci` cost paid by every fast/deep runner.


## Setup-amortization finding

Recent green CI runs reinforce the existing two-lane packing rule.

On run 35914130423:

- fast-gate checkout began at 20:10:14Z;
- `npm ci` began at 20:10:29.7Z and validation began at 20:10:35.4Z;
- deep checkout began at 20:10:51Z;
- deep `npm ci` began at 20:11:15.8Z and coverage began at 20:11:22.8Z.

So cached `npm ci` itself was only about **5.8 s** in fast and **7.0 s** in deep, while checkout/setup/cache preparation before install was roughly **16 s** and **25 s** respectively.

Adjacent runs show even larger setup variance: fast checkout-to-setup-node intervals around **55–58 s** were observed on runs 35911152785 and 35909830438.

This strengthens an important architectural distinction:

> **Make selection fine-grained, but keep execution packing coarse-grained.**

Do not express semantic ownership by creating one hosted runner per validation group. The impact planner should select contracts/capabilities precisely, then pack the selected work into a small number of runners so checkout/setup/install costs are amortized.


## Superseded-head admission control

The historical cancellation population suggests another optimization axis: **when expensive runners are admitted**, not merely which validations they execute.

Across the current fast/deep era, retained detailed cancelled jobs already account for at least:

- **20.7 fast-gate runner-hours** across 1,806 observed cancelled fast jobs;
- **19.5 deep-verification runner-hours** across 1,806 observed cancelled deep jobs.

These are lower bounds because historical job detail is incomplete.

Supersession timing across all 3,522 retained cancelled PR-CI runs:

| next same-branch run arrives within | cancelled runs |
|---|---:|
| 5 s | 14.7% |
| 10 s | 34.8% |
| 15 s | 47.7% |
| 20 s | 57.1% |
| 30 s | 71.6% |
| 45 s | 84.0% |
| 60 s | 89.0% |

Do **not** add a sleeping hosted-runner debounce: sleeping still consumes a runner and adds fixed latency to final heads.

Instead, scoped-CI activation provides a natural admission-control point. Once the impact plan is authoritative, expensive fast/deep work must depend on the planner result. A superseded head can therefore be cancelled while only the lightweight dependency-free planner is running, before one or both installed-dependency lanes are admitted.

This has two benefits from the same architectural dependency:

1. the planner selects only relevant obligations;
2. it also suppresses a material fraction of transient-head runner fan-out.

Measure the post-activation cancellation runner-hours explicitly; do not add artificial delay unless the natural planner gate proves insufficient.


## Type-check cache asymmetry

The two universal type validators currently run:

- `check:types` → `tsc --noEmit -p tsconfig.json`;
- `check:types:tests` → `tsc --noEmit -p tsconfig.test.json`.

Both configs already enable TypeScript incremental build info, but store it under `node_modules/.cache/`. The config comments explicitly note that this means GitHub Actions starts cold after every `npm ci`; only local reruns reuse the cache.

On recent CI, the two checks report roughly 8–11 s each under the parallel validator load.

Before attempting project-reference restructuring, benchmark an Actions cache for the two `.tsbuildinfo` files with invalidation based on:

- TypeScript/package-lock generation;
- `tsconfig.json` / `tsconfig.test.json`;
- a per-head save key with compatible-generation restore prefix.

This is analogous to the existing ESLint result-cache strategy.

Correctness gate:

- a warm incremental check must detect a deliberately injected source type error and a test-only type error;
- config/dependency changes must invalidate or force the necessary recheck;
- measure warm and cold Actions timings before deciding whether the extra cache surface is worth maintaining.

Project references / splitting production and test program construction remain a second-stage option only if build-info reuse does not materially reduce the duplicated parse/check cost.


## Intra-group incrementality

Impact routing answers whether the **data** group should run. It does not imply every selected data validator must rescan the entire repository.

`check:corpus-level-formatting` is a strong pilot:

- it checks four corpus files plus every discovered hint artifact;
- its invariant is byte-local: each file must equal canonical serialization of its own parsed contents;
- latest clean CI reports ~11.7 s for the command;
- historical representative logs show 334 observed executions and only one representative detector appearance.

For PR execution, added/modified corpus/hint paths can be checked directly from the Git diff. Untouched files cannot become misformatted because another file changed. Deleted files require no formatting proof.

Keep a full-tree mode for:

- main/nightly/full-oracle validation;
- manual audit;
- router/config changes that deliberately request full validation.

This suggests a broader taxonomy inside each semantic group:

1. **file-local invariants** — safely incremental by changed path;
2. **dependency-local invariants** — incremental using explicit producer/consumer edges;
3. **global invariants** — require whole-authority/repository view.

Do not treat every validator as global merely because its first implementation walked the whole tree.

The existing `PATHFINDER_PR_INCREMENTAL` mechanism used by textual-source checks provides a precedent. The topology/contract registry should eventually record incremental class and, where safe, changed-path selectors.


## Success-log volume

The parallel runner currently buffers every child command's stdout/stderr and prints it in full regardless of outcome.

On clean CI run 35914130423:

- complete fast-gate log: ~196 KB / 2,896 lines;
- `test:node` segment: ~145 KB / 2,147 lines;
- pre-summary child output inside that segment: ~127 KB / 1,910 lines;
- compact summary/tail: ~18 KB / 237 lines.

A safe opt-in runner experiment:

- preserve full buffered output for every failed command;
- for successful commands, emit only the existing summary identity + duration;
- keep a local/default verbose mode if developers value successful command output;
- do not suppress warnings solely because exit code is zero unless warning semantics are explicitly classified.

Primary benefit is diagnosis/readability; any Actions log-I/O wall-time reduction is secondary and should be measured rather than assumed.


## Generic dependency-graph opportunity

The repository already contains overlapping import/dependency tracing implementations:

- `scripts/check-plain-node-import-boundaries.mjs` discovers plain-Node roots from package/workflow commands, parses literal static/dynamic local imports, resolves repository targets, and walks transitive script dependencies;
- `scripts/research-system-inventory-lib.mjs` independently implements `localImports()` and `dependencyClosure()` for research command entrypoints.

This is both duplicated logic and an opportunity for finer test selection.

Extract a small, dependency-free repository import-graph library with explicit runtime modes:

- native Node resolution;
- tsx/TypeScript source resolution;
- bundled entrypoint resolution;
- static versus dynamic literal edges;
- unresolved/dynamic-unknown edge reporting.

Potential consumers:

- plain-Node import boundary;
- dead-script/reachability checks;
- research-system dependency inventory;
- CI impact analysis;
- validation-contract dependency derivation.

For direct-import contracts, a changed source file can then mechanically identify transitive consumer tests. Explicit contract metadata remains necessary for dependencies invisible to imports: filesystem authorities, data/report paths, subprocess targets, generated files, environment variables, persistence/network boundaries, and reflective/dynamic loading.

This should complement, not replace, semantic surface routing:

1. semantic surfaces establish blast-radius policy;
2. the import graph narrows direct code consumers within a selected surface;
3. explicit non-code dependency metadata closes the graph where static imports cannot see.

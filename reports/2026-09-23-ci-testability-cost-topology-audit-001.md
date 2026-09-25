# CI testability and cost topology audit — initial pass

> **Status:** active
> **Last evidence:** 2026-09-23 — topology/economics run 35920722800 and four-repeat Node-concurrency benchmark 35919350094 completed; 4-way fan-out was fastest and structural refactor queues are now measured.
> **Decision:** continue as an active CI testability/cost audit; do not change production CI cadence or remove checks from this report alone.
> **Remaining gate:** land the measured 4-way CI fan-out, then run bounded direct-module/CLI/fixture refactor pilots and continue shared-ownership decomposition before broader CI activation.  
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


## Package-authority correction

The impact-routing backtest already contains an important mitigation: **script-only `package.json` registration does not by itself force full impact** when the changed local entrypoints have known narrow ownership.

Historical backtest examples show full-impact package cases primarily when the permanent validation aggregate/composition itself changed, not merely because a research script alias was added.

Therefore validation-registration decoupling remains desirable for:

- clearer contract metadata;
- eliminating the giant hand-maintained aggregate command;
- direct entrypoint execution without an npm intermediary;
- separating execution metadata from product dependency/build authority;
- easier dependency/surface derivation;

but it should **not** be prioritized on the claim that every script-only package edit currently causes full CI. The current semantic package diff has already removed much of that routing penalty.


## Hidden nested validation and detector ownership

A small but concrete duplication exists in the current static-check graph:

- `check:dead-scripts` executes `scripts/check-package-scripts.mjs`;
- that script synchronously invokes the agent-context budget check, CI gate parity, and validation-group parity;
- `check:validators` separately includes `check:agent-context-budget`.

So the agent-context detector is executed twice in one fast gate, and other always-on contracts are hidden as transitive behavior of a command whose name suggests a narrower responsibility.

This is not a major wall-time item by itself. It matters because hidden nested execution makes:

- timing attribution ambiguous;
- impact routing coarser;
- historical detector identity harder to interpret;
- future direct execution/batching harder to reason about.

Direction:

1. make permanent detector commands single-purpose where practical;
2. represent composition explicitly in the validation registry/execution plan;
3. keep local convenience aliases free to compose those detector commands;
4. avoid one detector being both a top-level member and a hidden child of another permanent detector.

The same audit should search for other `spawnSync(process.execPath, ...)` / `npm run ...` nesting among permanent validators and harnesses.


## Runtime-data cache stampede

The runtime-data cache is highly effective **when warm**, but recent runs expose a cold-cache publication race.

Three adjacent successful CI runs using the same runtime-data key
`runtime-data-a19b9c95b62526c8ac98de9dfe93aa782680d46a3ab88d022ed5e14d9d330dc3`:

| run | cache | fast checkout → setup-node |
|---|---|---:|
| 35909830438 | miss | ~58 s |
| 35911152785 | miss | ~55 s |
| 35914130423 | hit | ~5 s |

The first two runs were close enough that both missed the identical key and independently materialized the runtime-data tree before a completed job had published the cache.

Current `actions/cache@v5` combined restore/save semantics publish a newly-created cache during post-job cleanup. In a repo with frequent superseding commits, that invites a cache stampede.

Experiment:

1. replace the combined runtime-data cache action with explicit restore semantics;
2. after a miss and successful materialization, issue an explicit cache-save step immediately;
3. keep the exact content-addressed key and no fallback reuse;
4. compare cold-key concurrent runs before/after.

Safety properties stay unchanged because the key is already derived from exact Git object IDs. The optimization is publication timing, not weaker cache identity.

This may be one of the highest-return setup fixes because a warm hit collapses tens of seconds of sparse-checkout/materialization work to a few seconds.


## Dependency-free preflight cohort

All **10 current repo validators** are plain-`node` commands:

- secret hygiene;
- audit artifacts;
- documentation links;
- workflow actions;
- CLI option contracts;
- plain-Node import boundaries;
- agent-context budget;
- file-size ratchet;
- CI impact inventory;
- CI validation-plan parity.

A source pass over their entrypoints found no direct external npm-package imports. Several use Git/subprocesses or local helpers, so a final transitive dependency proof should be derived from the generic import graph before activation, but the cohort is a strong candidate for execution before `npm ci`.

Historical context:

- **296** repair episodes yielded parsed detector signatures;
- current repo-validator identities appeared in **211** distinct representative episodes.

Those counts are correlated and do not mean 211 independent regressions. They do show that repo/authority failures are a common early red signal.

### Proposed experiment

Within the existing fast-gate runner:

1. checkout the source/docs authority needed by repo validators;
2. setup Node;
3. run the complete dependency-free repo-preflight cohort and collect **all** failures in that cohort;
4. only on preflight success, restore/materialize runtime data, run `npm ci`, and enter installed-dependency validation.

This is deliberately not generic fail-fast. It preserves multi-error reporting inside the preflight cohort and stops only at a clear dependency boundary.

Tradeoff to measure:

- **benefit:** red authority/docs/CI PRs avoid install, 173 Node harnesses, canary, and build;
- **cost:** downstream independent failures are not reported until preflight is repaired.

Before activation, replay historically long repair episodes to estimate how often a preflight-red head also contained an independent installed-dependency failure. If that overlap is common, retain current collect-all behavior or provide a manual/full diagnostic mode.


## Measured topology + concurrency results

### Topology audit run 35920722800

The first successful topology/economics join completed against historical audit run 35911214948.

Permanent validation population:

- **201** contracts total;
- **28** validators;
- **173** Node/CLI harnesses.

Invocation modes:

- **176** plain Node;
- **17** tsx;
- **5** run-bundled;
- **2** tsc;
- **1** Vitest command.

Static structural traits across local entrypoints:

- **69** use child processes;
- **84** read files;
- **76** write/remove filesystem state;
- **73** use temporary-file patterns;
- **51** reference repository data/report/log assets;
- **17** invoke bundling machinery;
- **13** inspect source text structurally.

Refactor-candidate counts:

- **90** direct-module / batch-runner candidates;
- **69** CLI/subprocess seam candidates;
- **76** filesystem-fixture candidates;
- **51** repository-data fixture candidates;
- **22** bundle-once/direct-library seam candidates;
- **25** shared-ownership disambiguation candidates.

The structural result confirms that process topology is not a marginal issue: nearly half the permanent contract population is statically simple enough to investigate for direct-module/batched execution.

### Historical economics joined to topology

Selected group totals from recoverable representative logs:

| group | observed command-seconds | representative detector appearances | zero-hit observed contracts |
| --- | ---: | ---: | ---: |
| research tests | **87,925.7** | **386** | 54 / 87 |
| data tests | **62,467.7** | **23** | 21 / 33 |
| shared tests | **30,059.6** | **3** | 23 / 25 |
| solver tests | **25,823.1** | **32** | 10 / 16 |
| shared validators / type checks | **7,350.5** | **50** | 0 / 2 |
| data validators | **6,769.3** | **21** | 2 / 5 |
| repo tests | **5,371.9** | **35** | 7 / 9 |
| repo validators | **4,068.4** | **254** | 2 / 10 |

Do not interpret the ratio as a keep/delete score. Exposure is conditioned on retained failing-run logs and detector appearances are correlated. It is a prioritization map.

The strongest structural/economic queues are:

1. **shared tests** — classification ambiguity plus 23/25 zero-hit contracts in this representative history;
2. **data tests** — high observed cost, 24 filesystem-fixture candidates, 20 subprocess seam candidates, 16 repository-data candidates;
3. **solver tests** — narrower population but high per-contract cost and frequent subprocess/filesystem structure;
4. **research tests** — largest absolute cost, but also abundant real catch evidence; optimize through scoping, batching, snapshot reuse, and seam extraction rather than aggressive removal.

### Node concurrency benchmark run 35919350094

Four complete repeats of the identical 173-harness population:

| jobs | median wall s | min | max | speedup vs unbounded |
| --- | ---: | ---: | ---: | ---: |
| **4** | **46.13** | 45.87 | 48.25 | **1.119×** |
| 8 | 47.98 | 47.21 | 48.61 | 1.076× |
| 12 | 50.52 | 50.16 | 50.61 | 1.022× |
| 16 | 51.28 | 51.18 | 51.81 | 1.007× |
| 24 | 51.34 | 51.26 | 52.95 | 1.006× |
| unbounded / 173 | 51.63 | 51.57 | 52.26 | baseline |

All 24 benchmark executions passed.

This is sufficiently consistent to change the hosted-runner default **in CI only** to `PATHFINDER_PARALLEL_JOBS=4`.

The local runner retains its existing default so developer machines with different resources are not forced to inherit the public GitHub runner's 4-vCPU optimum.

Apply the 4-way cap consistently to:

- ordinary PR `test:node`;
- main-push `test:node`;
- selected Node-test groups in the scoped dry-run/activation path.

### Next structural implementation pilots

The concurrency cap is an immediate ~11% Node-harness wall-time win, but it does not address the root process tax.

Prioritize small before/after pilots from different topology classes:

1. **Direct-module batching:** `test:loader`, `test:early-repair-search-badness-report`, and one simple research library harness.
2. **CLI seam extraction:** `test:select-routing-regime-sample-cli` and/or `test:family-boundary-cli`.
3. **Filesystem/data fixture narrowing:** `test:stress-topology-generator`, `test:family-parent-hint-replay`, or `test:experiment-manifest`.
4. **Shared ownership decomposition:** begin with `test:portfolio-solve-sweep-lib` / worker and solver-analysis libraries that already have obvious solver/research/data surfaces.

Measure contract wall time and failure quality before/after; preserve at least one executable-boundary smoke wherever CLI/worker wiring is a genuine contract.


## Contract-surface ownership refinement

The 25-test `shared` Node bucket was source-inspected rather than mechanically reassigned by filename.

Result: every current shared-owner test is genuinely research-facing, while subsets also depend on solver and/or data semantics:

- **25 / 25** declare `research`;
- **19 / 25** also declare `solver`;
- **10 / 25** also declare `data`.

This means the bucket was semantically ambiguous, but not simply irrelevant.

### Registry model

`validation-groups.json` schema v2 preserves the existing exclusive group partition for parity/execution ownership and adds optional per-contract `contractSurfaces`.

The scoped runner now treats requested names as semantic surfaces:

- a normal owned contract defaults to its owner group;
- an explicitly multi-surface contract runs when any declared surface is requested;
- requesting `shared` still runs the entire shared owner bucket as the conservative unknown-ownership fallback.

A non-executing `--list` mode plus `test:validation-groups` regression coverage makes surface selection inspectable without running the tests.

The impact classifier consumes the same metadata for registered validation entrypoints, so changing a former-shared test itself classifies to its semantic surfaces rather than back to generic `shared`.

### Selection sizes after explicit surfaces

Current Node/CLI contract selection counts:

| requested surface | contracts |
| --- | ---: |
| repo | 10 |
| game | 2 |
| persistence | 1 |
| solver | 35 |
| research | 112 |
| data | 43 |
| shared fallback | 25 |

The `modules/domain/**` classifier no longer needs to request `shared` explicitly: game + solver + research plus contract-surface selection already reaches the relevant cross-surface contracts. Unknown modules/data/scripts retain conservative shared escalation.

### Important negative finding

This ownership cleanup is **not itself a speed win for broad research changes**. Because all 25 former-shared tests are legitimately research-facing, a research surface still selects all of them.

That is useful evidence: further slimming must come from:

1. dependency-local invalidation inside broad semantic surfaces;
2. cheaper execution through direct-module batching / model reuse;
3. narrower fixtures and CLI/library seams;
4. cadence changes backed by the historical-value program.

Do not chase more bucket renaming expecting material wall-time savings.


## Implemented speed work transplanted after contract-surface merge

### File-local corpus formatting

PR-CI formatting validation now uses the existing PR merge-ref changed-path mechanism. On PRs, `check:corpus-level-formatting` checks only changed corpus/hint JSON files; local/manual/full-oracle runs still scan all four corpora and all hint artifacts.

This preserves the invariant while removing whole-tree work for unrelated changes. A dedicated `test:corpus-level-formatting` protects path classification and canonical byte detection.

### Runtime-data cache eager publication

The measured same-key cache stampede is addressed by separating restore/save:

1. `actions/cache/restore@v5` restores the exact content-addressed runtime-data tree;
2. a miss materializes the same sparse tree as before;
3. `actions/cache/save@v5` publishes that exact key immediately after materialization.

The content-derived key and no-fallback policy are unchanged. This narrows the window where nearby runs independently materialize the same data before post-job cache publication.

### npm-wrapper/direct-execution benchmark infrastructure

The 173-command Node/CLI population is structurally simple: 172/173 package scripts are single commands. An opt-in direct child mode has been added to the parallel runner for benchmark use only.

The manual benchmark can compare `npm` and `direct` modes at the already-proven four-job concurrency with rotating order. Production remains npm-wrapped until repeated hosted-runner evidence shows a clear gain and all contracts remain green.

## Hard-preflight backtest — negative

A tempting optimization was to run all cheap dependency-free repo validators first and stop before install/tests when that cohort is red.

Historical signature evidence argues against making that a hard gate yet.

Among **211** representative repair episodes containing at least one current repo-validator failure:

- **142 / 211 (67.3%)** had no other currently mapped detector in that representative run;
- **69 / 211 (32.7%)** also contained another current mapped detector.

Co-failing semantic families among those 69 episodes included:

- research tests: **47** episodes;
- research validators: **30**;
- repo tests: **30**;
- solver tests: **16**;
- shared/type validators: **12**;
- data validators: **10**;
- data tests: **4**.

These groups overlap within episodes.

**Decision:** do not introduce generic `repo preflight red => stop downstream` behavior. It would save work on many red heads but hide useful second failures roughly one-third of the time, recreating repair pinball.

A dependency-free cohort can still improve **time to first signal** or act as a prerequisite for impact planning, but ordinary validation should continue collecting independent failures unless a narrower causal prerequisite is proven.

## Flake-management opportunity — low priority

The exhaustive corpus contains **7,905 runs and 7,915 attempts**, only ten attempts beyond the run count.

Known nondeterministic/harness incidents still matter individually, but there is no evidence that generalized rerun/flakiness management is currently a major CI cost center. Do not build a large flake-management system ahead of the measured process, routing, fixture, and cache costs.

## Deep-test taxonomy audit

All 74 `modules/solver/*.test.ts` files were inspected for `deepTest` / `SOLVER_DEEP_TESTS` gating.

Exactly seven files use the convention:

- `diversification.test.ts`;
- `hint-ablation-generator.test.ts`;
- `orchestration-early-repair.test.ts`;
- `lower-bounds-deadlock-0.test.ts`;
- `lower-bounds-deadlock-1.test.ts`;
- `repair-search-partial-path-completion-enabled.test.ts`;
- `repair-search-partial-path-completion-disabled.test.ts`.

The last four are already explicitly removed from ordinary coverage through `SOLVER_DEADLOCK_PROOF_SKIP` / `SOLVER_R02560_PROOF_SKIP` and run by `test:deep-proofs`.

The first three remain mixed-tier under ordinary coverage. Recent file timings put them at roughly:

- diversification: ~7.2 s;
- hint-ablation-generator: ~2.0 s;
- orchestration-early-repair: ~1.4 s.

Potential gross test-time exposure is therefore ~10.6 s before accounting for parallelism and any targeted rerun required after extraction.

**Decision:** this is a legitimate benchmark target, not an immediate refactor. Avoid whole-file duplication. If pursued, extract only the real-search cases into explicit proof files while keeping small direct/stubbed coverage for the control logic.

## TypeScript incremental-cache opportunity

Both universal type checks already use TypeScript incremental build info, but their cache files live under `node_modules/.cache`, so every GitHub `npm ci` removes them.

The production and test configs use separate cache files and cleanly separate test-only source coverage.

Before production caching, run a correctness-and-timing experiment that:

1. measures cold `check:types` and `check:types:tests`;
2. measures warm unchanged runs;
3. restores the build-info files and introduces a fresh production source type error, proving `check:types` still fails;
4. introduces a fresh test-only type error, proving production typing remains unaffected while `check:types:tests` fails;
5. measures the restored-cache benefit on a small valid source change.

Only add an Actions cache if the fault probes remain sound and the hosted-runner timing gain is material.

## Dependency-local routing opportunity

Path/surface routing remains deliberately conservative. The contract-surface audit showed why surface relabeling alone cannot shrink a broad research change: all 25 former-shared tests are legitimately research-facing.

The next routing frontier is **dependency-local invalidation within a selected surface**.

Two separate import-graph implementations already exist:

- `check-plain-node-import-boundaries.mjs` has the stronger native-Node resolver and literal static/dynamic import handling;
- `research-system-inventory-lib.mjs` has a reusable dependency-closure concept but follows a narrower `.mjs` view.

Do not activate dependency-based skipping from either implementation directly.

First extract/measure a generic repository import graph that:

- resolves local JS/MJS/TS/TSX imports explicitly;
- records literal dynamic edges separately;
- reports unresolved/nonliteral dynamic edges instead of pretending they do not exist;
- maps registered test entrypoints back to changed modules;
- treats filesystem/data/subprocess/generated/env dependencies as explicit metadata outside the static import graph.

Use this only in shadow mode until replay against historical/real failures demonstrates that it does not miss consumers.


## Dependency-local routing shadow audit

Surface-level ownership is still intentionally conservative. The contract-surface pass showed that broad research ownership is real, so further narrowing cannot come from renaming groups.

A new shadow-only dependency-local audit now builds literal local-import closures for every registered validator/Node-test entrypoint and reports where static reachability is incomplete evidence.

For each contract it records:

- resolved local JS/MJS/CJS/TS/TSX/MTS/CTS/JSON closure;
- unresolved local import edges;
- nonliteral dynamic-import count;
- whether the closure touches filesystem APIs;
- child-process APIs;
- environment variables;
- network-like behavior;
- reverse registered-consumer counts for repository source files.

A contract is labelled a **static-import-sufficient candidate** only when all of the following hold:

1. every observed local literal edge resolves;
2. there are no nonliteral dynamic imports;
3. the closure does not touch filesystem, child-process, environment, or network seams.

Even that label is only a candidate. It is not permission to skip the contract.

The topology audit now emits `tmp/ci-dependency-local-routing-audit.json` and summarizes coverage by semantic surface. This should answer two questions before any routing change:

- how much of the permanent test population is even amenable to static dependency invalidation;
- whether commonly changed modules have substantially smaller mechanically visible consumer sets than their broad semantic surfaces.

Activation requires a second evidence layer for non-import dependencies (data files, generated artifacts, subprocess contracts, environment/configuration) plus historical/fault-injected replay. Static imports alone remain a lower bound.


## Hidden validation ownership cleanup

The audit found three permanent authority checks hidden inside `check:dead-scripts`:

- agent-context budget;
- local/GitHub Actions gate parity;
- validation-group parity.

The agent-context check was also an explicit repo validator, so it was definitely executed twice. A recent green fast-gate log reported the explicit execution at about **1.3 s** after the hidden copy had already run.

A closer authority audit showed that all three checks can have explicit ownership safely:

- edits to `scripts/validation-groups.json`, workflows, router/planner code, and the parallel runner are already classified as full-impact CI authority;
- edits to `check:validators` / `test:node` package aggregates expose `scripts/run-scripts-parallel.mjs`, which is also classified full impact;
- a regression test now locks that aggregate-edit property.

The resulting model is:

1. `check:dead-scripts` checks package entrypoint/tooling lifecycle and permanent-gate lifecycle only;
2. `check:agent-context-budget` remains an explicit repo validator;
3. `check:ci-gate-parity` is now an explicit repo validator;
4. `check:validation-groups` is now an explicit repo validator;
5. the scoped validation plan no longer lists validation-group parity separately as an always-on package script;
6. the scoped dry-run no longer executes a duplicate standalone validation-group step.

Current universal PR CI and the ordinary local `check` finish line still execute all three authority checks through `check:validators`. Future scoped CI executes them whenever repo/full-impact authority is selected.

This gives each detector one visible execution owner, improves timing/failure attribution, and removes hidden subprocess composition without weakening the authority boundary.


## Success-path output compaction

A recent green fast-gate run (35924899131) showed the Node/CLI contract step emitting:

- about **141,059 characters / 2,102 log lines** total;
- about **128,088 characters / 1,926 lines** before the compact parallel summary;
- therefore roughly **91% of the step's text** was successful-child output preceding a summary that already records every command's status and elapsed time.

A warning/deprecation scan of that successful step found no operational warning output; the only match was a test assertion whose text contained the word “warning”.

The parallel runner now supports `PATHFINDER_PARALLEL_SUCCESS_OUTPUT=summary`:

- passing child stdout/stderr is suppressed;
- failed child output remains fully buffered and printed;
- the final per-command PASS/FAIL/timing summary remains;
- local/default behavior stays `all` (verbose);
- invalid modes fail explicitly;
- the pre-existing spawn-error path is made idempotent so an `error` + `close` sequence cannot resolve/print twice.

CI enables summary mode for validator and Node/CLI parallel populations in PR CI, main-push validation, and scoped dry-run execution.

This is primarily a diagnostic/readability and log-storage improvement. Do not claim a meaningful wall-time speedup without measurement.


## Thin-CLI pilot: research queryability audit

The 4-way Node-contract timing exposed `test:research-queryability-audit` at roughly **13 s** on a recent green run.

Source inspection found two independent forms of duplicate work:

1. the test runs all 13 production queryability benchmarks in-process, then spawns the CLI, which reruns the same full repository audit merely to prove wrapper behavior;
2. within one production audit, `system-findings` and `system-lineage` each independently build the same research-system finding index.

The pilot preserves the full integration contract once and narrows only duplicate wrapper/model work:

- `runResearchQueryabilityAudit()` now lazily builds the query graph only when an executable benchmark needs it;
- the research-system finding index is memoized once per audit invocation;
- callers may supply an explicit validated benchmark registry;
- the CLI accepts `--benchmarks=FILE`;
- the subprocess smoke uses a one-record known-gap registry, proving CLI argument loading, JSON output, exit status, and result shape without rebuilding the full repository model;
- the in-process test still executes all 13 canonical production benchmarks and keeps all current result assertions.

This is the intended testability pattern: **one strong integration proof plus a tiny executable-boundary smoke**, rather than two copies of the same expensive integration proof.

The PR's own CI timing should be compared against the recent ~13 s command time before generalizing the pattern to other CLI tests.


## Thin-CLI/model-reuse continuation on PR #2025

The first queryability pilot produced a real hosted-runner improvement:

- previous `test:research-queryability-audit`: approximately **13 s** under the 4-way Node runner;
- PR #2025 green run 35928172418: **7.0 s**;
- observed reduction: roughly **46%**.

The same run exposed three adjacent repository-model hotspots:

| contract | PR #2025 baseline |
| --- | ---: |
| `test:research-query` | **18.2 s** |
| `test:research-integration-audit` | **10.9 s** |
| `test:research-system-query` | **6.5 s** |

### Research query CLI seam

`research-query-node-test.mjs` previously built one full query graph in-process and then spawned the CLI six times. Each subprocess rebuilt repository state for traversal/view/snapshot/compare modes.

The CLI is now a thin wrapper over `runResearchQueryCommand()`:

- graph and research-system finding index construction are lazy;
- system-only finding queries do not build the query graph;
- callers/tests can supply an already-built graph/index;
- compare-mode snapshot builders are injectable;
- the Node test exercises every dispatcher mode against the already-built current graph/index;
- one real subprocess query remains to prove executable wiring, argv parsing, JSON stdout, and exit status.

This preserves semantic coverage while reducing full repository reconstruction from many copies to the one integration graph plus one executable-boundary smoke.

### Research integration audit ownership

The permanent `check:research-integration` validator already owns the full executable/autonomous-build proof and took about **5.1 s** in run 35928172418.

The separate `test:research-integration-audit` was rebuilding the same relation model, rebuilding it again for supplied-model parity, and spawning the full CLI once more.

The Node test now:

1. builds one relation model;
2. audits that model;
3. exercises all mutation/error cases against derived immutable variants.

The full CLI/autonomous model construction remains covered by the explicit validator. This is a responsibility split, not a removed invariant.

### Research-system finding derivation

`test:research-system-query` intentionally checks stable finding identity, but previously proved determinism by rebuilding the entire research-system inventory twice.

Finding derivation is now separated as `buildResearchSystemFindingIndexFromInventory()`.

The test:

- builds one current inventory;
- derives the index twice from that same immutable input to prove stable identity/fingerprints;
- still reconstructs the `HEAD` finding snapshot through a detached Git worktree as the independent repository integration proof.

This preserves the determinism property while removing one redundant whole-repository inventory build.

### Generalized testability rule

The successful pattern is now clearer:

1. **repository discovery/model construction** gets one explicit integration owner;
2. **pure derivation/query logic** accepts the built model as input;
3. **CLI dispatch/parsing** is callable independently from model construction;
4. **one executable smoke** proves the process boundary where another permanent validator does not already own it;
5. tests that specifically claim rebuild determinism retain a real independent rebuild, but do not rebuild merely to exercise pure derivation twice.

Continue looking for this shape before introducing broader in-process test batching.


## Post-#2025 evidence refresh and benchmark closure

PR #2025 merged at `9d9159b8cb8f09db58d6fe5668876b111be4af59`. Its final green PR-CI run `35929852088` provides a useful post-refactor baseline under the same four-worker harness:

- the full 173-contract `test:node` population completed in about **35.7 s wall**;
- `test:research-query`: **4.9 s**;
- `test:research-queryability-audit`: **4.2 s**;
- `test:research-integration-audit`: **2.1 s**;
- `test:research-system-query`: **4.9 s**;
- `test:experiment-manifest`: **6.4 s**;
- `test:portfolio-solve-sweep-worker`: **6.1 s**.

The validator population on the same run exposed the other universal critical-path candidate clearly:

- `check:types`: **10.5 s**;
- `check:types:tests`: **12.9 s**.

The model-reuse/CLI-seam work therefore moved the research-specific hotspot materially without exhausting the broader CI opportunity. The next evidence should resolve two already-instrumented questions rather than inventing another speculative optimization:

1. whether bypassing per-child `npm run` wrappers produces a repeatable hosted-runner gain at the settled four-worker concurrency;
2. whether restoring TypeScript incremental build info produces a material valid-change speedup while the fault probes continue to detect new production and test-only type errors.

To make those measurements reproducible from an audit PR rather than dependent on an out-of-band manual dispatch:

- the Node concurrency benchmark now supports a narrow `pull_request` trigger when its own runner/script/package authority changes, defaults that PR path to `npm,direct` at four workers/four repeats, and retains a machine-readable result artifact;
- the TypeScript incremental benchmark now supports a narrow `pull_request` trigger when its workflow/script/TypeScript cache authority changes;
- ordinary production CI behavior remains unchanged by these benchmark triggers.

Do not promote direct child execution or Actions-cached TypeScript build info merely because one PR benchmark is favorable. Require repeated green measurements and preserve the existing correctness/failure-quality contracts before activation.


## Hosted-runner benchmark results from PR #2026

PR #2026 supplied the first same-runner repeated measurement for the two remaining universal execution-cost candidates.

### Direct child execution

Run `35930998352` executed the complete Node/CLI contract population four times per mode at the already-selected four-worker concurrency.

| mode | median wall |
| --- | ---: |
| npm child wrappers | **38.01 s** |
| direct child execution | **28.86 s** |

Direct execution was **1.317× faster** than the same four-worker npm-wrapped population, a wall-time reduction of about **24%**. All benchmark executions passed.

This is large enough to justify production activation in GitHub CI, provided:
- local/default execution retains the npm-wrapper path;
- CI retains an explicit escape hatch back to npm mode;
- the parallel-runner regression suite continues covering command parsing, exit propagation, buffering, and failure output.

### TypeScript incremental build-info reuse

Run `35930998349` measured:

| probe | seconds |
| --- | ---: |
| production cold | **4.164** |
| production warm | **1.544** |
| tests cold | **6.305** |
| tests warm | **2.277** |
| production valid change after restored cache | **1.604** |

Observed speedups:
- production unchanged warm: **2.697×**;
- tests unchanged warm: **2.769×**;
- production valid change after restored cache: **2.596×**.

The fault probes also passed:
- restored production build info still detected a newly added production type error;
- production typing correctly ignored a newly added test-only type error;
- restored test build info detected that new test-only type error.

This clears the correctness/timing gate for an exact-key GitHub Actions cache of the two build-info files. Activation should use keys derived from the TypeScript/toolchain generation plus source-tree identity, avoid broad fallback restore keys, and retain the fault-probe benchmark as a manual/PR audit oracle.

### Dependency-local shadow result

Run `35930998378` traced **204 / 206** permanent contracts and found:
- **49** strict static-import-sufficient candidates;
- **1** contract with an unresolved local edge;
- **2** contracts with nonliteral dynamic imports;
- **534** source files with at least one registered consumer.

Filesystem/process/environment dependencies remain common, so static reachability is still only a lower bound. The next routing step is to add explicit non-import dependency metadata for the clean candidate set and near-misses, then replay/fault-inject before any dependency-local skipping is activated.

### Worker-pool reuse follow-up

PR #2027 independently reduced `test:portfolio-solve-sweep-worker` from roughly **6.1 s** on the post-#2025 baseline to **4.0 s** while preserving the real forked-worker + nested-race boundary. It also better matches production's intended long-lived worker/race-pool reuse topology.



## Dependency-authority prototype

PR #2034 tested whether dependency-local routing needs a large bespoke registry or whether sparse declarations can close the important gaps left by static imports.

The prototype adds optional `contractDependencies` metadata beside `contractSurfaces`, with only three concepts:

- `filesystemScope: repo-inputs | fixture-only`;
- `repoPaths`: explicit repo-relative files or globs that invalidate the contract;
- `processEntrypoints`: explicit local subprocess entrypoints.

Six representative contracts were declared across narrow repo files, directory/glob scans, workflow-directory authority, durable research evidence files, and subprocess + fixture-only filesystem behavior. Hosted topology audit run 35954285030 reported:

- strict static-import-sufficient candidates: **49**;
- metadata-sufficient candidates: **55**;
- candidates rescued by the six declarations: **6/6**.

This is a useful architectural result, not an invitation to annotate the whole repository. The unresolved population is dominated by filesystem and process boundaries (152 filesystem flags, 94 child-process flags in the preceding audit), but many of those contracts are low-value routing targets or already adequately covered by coarse semantic surfaces.

Recommended policy:

1. Keep static import closure as the automatic lower bound.
2. Add `contractDependencies` only when a contract is economically worth narrowing or when a new non-import dependency would otherwise be invisible.
3. Treat `fixture-only` as an explicit assertion that filesystem activity is generated test state rather than a repository invalidation input.
4. Require declared subprocess entrypoints to exist and remain mechanically validated.
5. Do not activate dependency-local skipping from metadata alone; historical replay/fault injection remains the promotion gate for any contract whose omission could hide a meaningful defect.

Stopping rule for this audit cycle: do **not** bulk-annotate the ~150 filesystem-bearing contracts. The prototype demonstrates that the authority seam works. Future declarations should be demand-driven by measured CI cost or routing value.


## Methodology correction: optimize only after claim ownership

The later R02560, solver-canary, frozen-retrospective, and semantic Fast Gate audits change how this report should be used.

This audit correctly identified expensive process boundaries, repeated repository discovery, fixture scale, and topology waste. But the initial 35-second phase treated the then-current full validation population as fixed. That was intentionally conservative and prevented arbitrary protection deletion, yet it also meant some engineering effort optimized checks whose correct disposition was later found to be research characterization or explicit historical audit rather than PR merge validation.

Future testability work must therefore consume the cadence/value decision first:

1. identify the concrete bad merge and current contract;
2. identify the repository process that owns the claim;
3. establish that PR CI is the correct authority/cadence;
4. establish semantic invalidation ownership;
5. only then optimize the test/process boundary.

The successful thin-CLI/model-reuse rule remains valid, but apply it to the **selected surviving contracts**, not blindly to the longest command in the old universal aggregate.

Timing priorities must also be refreshed after routing changes. Rank by selected critical-path burden (frequency × wall contribution × tail/setup effects), not historical raw command duration. A previously hot research harness may cease to matter once research-only ownership is activated.

Negative topology experiments remain evidence for the exact workload and runner substrate measured. Reopen them only when a named premise changes enough to create a genuinely different experiment: selected population, longest-child tail, setup topology, or runner capacity.

## Critical-path compression phase: ≤35 seconds full CI

The testability/cost audit is reopened under a hard wall-time target:

> **A full-impact PR must complete all required validation in 35 seconds or less.**

This changes the interpretation of earlier findings. The previous recommendation to avoid multiplying hosted-runner jobs was correct for the then-current objective, which balanced runner-hours, queue/setup variance, and simplicity. It is not a permanent two-lane constraint. With a hard latency ceiling, additional parallelism is justified whenever measured critical-path reduction dominates runner/setup variance.

Initial full-run reference: CI run 35955087367.

Approximate timestamps show:

- first required runner start: 04:19:46Z;
- impact planner complete: ~04:19:53Z;
- fast gate complete: ~04:21:05Z;
- deep verification complete: ~04:21:22Z;
- full wall span: **~96 s**.

### Immediate critical-path hypotheses to investigate

1. **Deep checkout/materialization is anomalously expensive.** The deep runner spent roughly 16 s in checkout before setup-node, versus roughly 2 to 3 s in the fast lane. Audit its sparse-checkout pattern and actual file population before accepting that cost.
2. **The fast lane serializes independent broad phases.** Validators (~5.6 s), lint (~14.4 s), Node/CLI contracts (~26.9 s), solver canary (~10 s), and build (~2.6 s) currently form a long serial chain after setup.
3. **Deep work is also serialized.** Covered Vitest (~30 s), explicit deep proofs (~11.5 s), and Firestore (~11 s after cache work) are independent enough to evaluate concurrent execution/sharding.
4. **Node/CLI already has per-command timing.** Use those measurements to construct balanced shards rather than increasing one runner's child concurrency beyond the already-measured four-worker sweet spot.
5. **Vitest coverage needs file-level cost modeling.** Coverage output already writes timing data; evaluate two- and three-shard partitions plus report/threshold aggregation instead of assuming one monolithic coverage command.
6. **Solver canary should be treated as a parallel batch.** Its nine fixed levels are semantically one canary but need not imply serial execution if result identity and baseline comparison can be preserved.
7. **Repeated setup may need a different substrate.** If multiple lanes are required, benchmark prepared dependencies, artifact handoff, or a CI image/cache strategy rather than paying `npm ci` independently without measurement.
8. **Final-status aggregation cannot consume a runner-sized latency tax.** Prefer native dependency/result semantics or an effectively zero-work aggregator.
9. **Repository/test seams remain in scope.** Thin CLI boundaries, reusable repository models, long-lived workers, fixture-only filesystem declarations, and explicit dependency authority have already produced wins and should be applied to remaining hotspots.

### Planning threshold

Do not finalize an implementation plan until the audit can assign a realistic p50 timing budget to every proposed lane and explain how p90 runner/setup variance will be handled. A paper topology whose sum of command times is under 35 seconds but whose hosted execution routinely exceeds it is not sufficient.


## Critical-path investigation: first measured discriminators

The first follow-up pass after adopting the ≤35 s full-impact target found several costs that are structural enough to guide the benchmark plan.

### 1. Deep checkout is mostly data materialization, not source checkout

Repository tree accounting on current main:

| population | files | bytes |
| --- | ---: | ---: |
| entire tracked blob tree | ~10,400 | ~1.85 GB |
| current deep sparse checkout | ~3,269 | ~206.9 MB |
| deep checkout `data/` payload | ~1,757 | ~190.3 MB |
| non-data/non-log/non-report source | ~1,512 | ~16.6 MB |

Recent hosted full-impact runs consistently put fast checkout around **2–4 s** and deep checkout around **15–17 s**. The deep checkout therefore materializes roughly an order of magnitude more payload than the source itself, dominated by data/hint artifacts.

The fast lane already demonstrates the alternative shape: omit runtime data from Git checkout and restore an exact Git-object-keyed runtime-data cache. Deep validation should be audited for the exact data paths its tests actually read, then either reuse the exact runtime-data cache or materialize only that minimal set.

### 2. The standalone impact planner is now on the latency path

The semantic plan computation itself is effectively instantaneous, but `deep-verification` now waits on the `impact-shadow` job. Recent planner job durations ranged from roughly **9 s to 45 s**, dominated by runner assignment/bootstrap/checkout/setup rather than classification.

For a hard 35 s ceiling, a separate runner cannot remain a prerequisite for starting full-impact deep work.

Candidate architecture to benchmark:

- preserve the current classifier/planner as the single authority;
- start the potential deep lane immediately;
- compute the plan inside that lane before dependency installation;
- exit successfully and cheaply when deep work is not selected;
- retain/publish the plan artifact independently if useful for observability.

This trades a small amount of startup work on PRs that eventually skip deep for removal of a potentially large full-impact dependency edge.

### 3. ESLint cache is scoped too narrowly for first-run PR latency

A cold/new PR repeatedly reports no matching ESLint cache and spends roughly **12–15 s** linting. A warmed revision of the same PR has shown lint near **2 s**.

The current cache is saved from PR scope, so unrelated new PRs cannot reliably inherit it. This repeats the cache-scope issue already found and corrected for Firebase CLI materialization.

Benchmark/default candidate: seed the content-addressed ESLint cache from broad `main` validation and restore it read-only on PRs, with the existing config/package-lock generation in the key. Do not treat the cache as correctness evidence; a miss still runs full lint.

### 4. Node setup downloads a non-preinstalled runtime

The current Ubuntu 24.04 runner image (20260920.314.1) reports preinstalled/cached Node **22.23.2** and **24.21.0**, while current CI asks `setup-node` for floating major `20`. Hosted logs show `setup-node` resolving/downloading Node **20.20.2** on each job, contributing roughly **4 s** before npm-cache restoration.

The repository engine contract is `>=20.19`.

Benchmark candidate: run the full validation contract under exact Node 22.23.2 (or the image's system Node) and compare setup + behavior. Promotion requires all current tests/builds to remain green; this is runtime selection, not permission to relax the engine floor.

### 5. The Node/CLI population is highly shardable

One representative full run reported **176 contracts**, about **107.7 child-seconds** total, completing in **~27 s wall** with the already-settled four-worker pool.

Greedy runtime balancing from that run gives almost perfect child-time partitions:

| shards | child-time per shard | projected four-worker useful time before overhead |
| ---: | ---: | ---: |
| 2 | ~53.8–53.9 s | ~13.5 s |
| 3 | ~35.9 s | ~9.0 s |
| 4 | ~26.9–27.0 s | ~6.8 s |

This is stronger evidence for sharding than equal-count partitioning. The remaining question is setup/runner skew: another hosted job only helps if its bootstrap cost is below the Node wall time it removes from the critical lane.

### 6. Covered Vitest cost is concentrated in two integration fixtures

Representative covered-suite slow files:

- `orchestration-work-budget.test.ts`: **~8.2 s**, with one lifecycle-telemetry bookkeeping regression taking ~8.0 s;
- `diversification.test.ts`: **~7.0 s**, dominated by three deliberately real full-session solver integrations;
- `repair-search.test.ts`: **~4.4 s**;
- all remaining reported files are materially smaller.

The lifecycle regression asserts stage-instantiation telemetry rather than search quality and already lives beside tests using deterministic/exhausting dispatch seams. It is therefore a high-priority testability refactor candidate.

The diversification tests explicitly claim real-solver integration as their contract. Do not stub them merely for speed. Instead evaluate whether those real integrations belong in a separately parallel proof/integration population.

### 7. Explicit deep proofs are already internally parallel but have one long tail

A representative deep-proof run completed in **~11.05 s wall** while executing:

- deadlock root 0: ~9.1 s;
- deadlock root 1: ~6.8 s;
- R02560 enabled: ~0.36 s;
- R02560 disabled: ~10.4 s.

The summed test time was ~26.6 s, confirming Vitest is already overlapping files. Additional file-level sharding can only beat ~11 s by isolating the ~10 s R02560-disabled and ~9 s deadlock-root-0 tails onto separate runners or by making the underlying witnesses cheaper.

### 8. Solver canary cost is one level, not nine

Current nine-level canary timing from run 35955087367:

- eight levels combined: roughly **0.35 s**;
- level position 140 alone: roughly **9.38 s**;
- total canary: ~9.7 s and ~11.9 M nodes.

The canary baseline was introduced as a fixed representative sample, not as nine individually justified mechanism witnesses. Its baseline snapshot recorded the whole set at **2.587 s / 6.51 M nodes**, so current L140 has accumulated substantial cost while preserving the same solved-set result.

Before changing the canary, determine whether L140 now uniquely catches a meaningful semantic class. If not, replace/distill it with a representative level that restores the canary's intended "few seconds total" role. Do not simply drop it because it is slow.



### Hosted bootstrap benchmark: first pass

Topology-audit run **35957860615** directly measured three bootstrap shapes.

| probe | observed step time |
| --- | ---: |
| current deep sparse checkout | **15 s** |
| source-only checkout | **3 s** |
| exact runtime-data cache restore after source-only checkout | **3 s** |
| floating Node 20 setup | **5 s** |
| exact cached Node 22.23.2 setup | **2 s** |
| npm ci under Node 22 | **7 s** |

The runtime-data cache was an exact hit on the current Git-object key. Source-only checkout plus exact runtime restore therefore reached the complete canonical runtime-data shape in roughly **6 s**, versus **15 s** for the current deep Git materialization. This validates the deep-checkout hypothesis with hosted evidence rather than repository-size arithmetic alone.

The first Node 22 toolchain smoke failed, but the failure was **not Node-version behavior**. The intentionally source-only benchmark checkout omitted `data/hints` and `data/themes.json`; `scripts/data-assets-unit-tests.mjs` correctly failed on those missing fixtures. The benchmark has been amended to restore the exact runtime-data cache before rerunning the broader Node 22 smoke.

The runner image's exact Node 22.23.2 toolcache selection is already measurably cheaper than floating Node 20. A second probe now compares that against using the runner's system Node directly with an explicit npm-cache restore, which may remove the remaining setup-node action overhead at the cost of tying CI runtime to the runner-image version.



### Hosted bootstrap benchmark: second pass

Topology-audit run **35958054368** corrected the first pass's missing runtime fixtures and added a system-runtime comparison.

Measured bootstrap:

| probe | observed step time |
| --- | ---: |
| source checkout | 2–3 s |
| exact runtime-data restore | **1 s** on this run |
| floating Node 20 setup | **6 s** |
| exact cached Node 22.23.2 setup | **1 s** |
| npm ci under exact Node 22 | **9 s** |
| system Node version | 22.23.2 |
| hosted runner logical CPUs | **4** |

The exact Node 22 job then passed:

- `check:types`;
- the complete `test:unit:fast` population: **138 files passed, 4 skipped; 1,513 tests passed, 11 skipped**;
- production Vite build.

The fast-unit population completed in **20.12 s** under Node 22.23.2. No Node-version compatibility failure has been observed.

The raw system-Node probe did not establish a worthwhile advantage:

- it avoids `setup-node`, but an explicit `actions/cache/restore` using the visible setup-node cache key did not hit the setup-node-managed cache version;
- `npm ci` still took ~8 s;
- typecheck and the actual Vite compilation succeeded; the later build close hook failed only because the intentionally source-only checkout omitted `data/levels.json`.

Given the small remaining setup-node cost, exact Node 22.23.2 is the cleaner candidate: pinned runtime semantics, setup-node-managed npm caching, and a measured ~5 s improvement over floating Node 20 in this run.

### Canary candidate probe

The same run exercised five published levels chosen for overlap with L140's multi-mechanic shape:

| position | notable overlap | elapsed |
| ---: | --- | ---: |
| 62 | 2 gates, portal, must-pass, 2 geese | 19 ms |
| 71 | 2 gates, 2 portals, goose | 31 ms |
| 85 | 2 gates, portal, 2 geese, reqInt 3 | 38 ms |
| 93 | 2 gates, 2 portals, must-pass, goose | 26 ms |
| 102 | 2 gates, portal, 2 must-pass, 2 geese | 7 ms |

All five solved at the existing 5,000,000 work budget in roughly **0.1 s total / 61,227 nodes**.

This proves the canary can retain broad multi-mechanic representation without paying L140's current ~9.4 s cost. It does **not** yet prove L140 should be removed: a follow-up probe is measuring whether the same exact L140 witness still succeeds at a materially smaller work budget.

### ESLint default-branch authority

`main-push-validation.yml` currently has no ESLint cache restore/save steps. The PR workflow writes `.cache/eslint` only from PR scope, explaining why unrelated new PRs cold-miss while subsequent revisions of the same PR can fall to ~2 s lint.

Recommended activation pattern:

1. main-push restores the newest cache for the current ESLint/package generation;
2. main-push saves a commit-specific successor after successful lint;
3. PRs continue restoring by the generation prefix;
4. cache miss remains fully correct because ESLint still scans every file.

This is a cache-availability change only, not validation narrowing.

### Interim implication

A 35 s target is not reachable by one more micro-optimization. The evidence points to a combined architecture:

1. remove avoidable bootstrap costs (deep data checkout, Node runtime download, cold cross-PR ESLint);
2. remove the standalone planner dependency from full-impact startup;
3. make the remaining expensive test boundaries cheaper where their asserted invariant does not require full search;
4. then partition the genuinely independent expensive populations by measured runtime.

The next benchmark should test these bootstrap assumptions and candidate lane shapes directly on hosted runners before fixing shard count or job topology.


### Final discriminators for the implementation plan

Additional hosted probes closed the remaining planning questions.

#### Original canary population at reduced work

The full original nine-level canary was rerun at **250,000 work**:

- solved: **9/9**;
- wall: **~1.5 s**;
- nodes: **~1.30 M**.

Therefore the canary does not need a fixture-set change. The correct first optimization is simply to regenerate its baseline at 250k deterministic work and preserve all nine published witnesses.

#### Coverage with existing deepTest cases excluded

A full `test:coverage` run with `SOLVER_DEEP_TESTS=0`:

- stayed green at the existing coverage thresholds;
- completed in **26.71 s**;
- compared with ~29.51 s for the current covered population.

The ~2.8 s wall improvement is real but smaller than the nominal per-test costs because Vitest already overlaps files. Creating a separate deep-integration tier solely for this saving is not justified.

Decision: first make the ~8 s lifecycle bookkeeping regression use its existing deterministic dispatch seam and remeasure. If covered wall remains above the plan's **19 s useful-work budget**, split coverage by measured file cost and merge V8 coverage; do not lower thresholds.

#### Exact node_modules restore

Hosted run 35958457759 measured the dependency tree directly:

- `npm ci`: **8 s**;
- cache save: **3 s**;
- exact cache restore after deleting `node_modules`: **3 s**;
- restored-tree `check:types`: green.

This is a material ~5 s bootstrap reduction per lane and changes the standard-runner topology economics. The implementation plan therefore targets an exact default-branch-seeded dependency tree, with a full restored-tree validation rehearsal and a strict miss fallback to `npm ci` before production activation.

#### Resulting standard-runner budget

With measured bootstrap reductions, the first candidate rehearsal is five lanes, each budgeted below 27 s:

- static ≤18 s;
- Node A ≤23 s;
- Node B ≤23 s;
- implementation coverage ≤27 s;
- deep services ≤24 s.

This leaves approximately 8 s of workflow-level headroom under the 35 s target for ordinary runner-start skew. The rehearsal must prove that p90 start skew fits that envelope. If it does not, the plan explicitly escalates to reserved/larger compute rather than deleting validation.

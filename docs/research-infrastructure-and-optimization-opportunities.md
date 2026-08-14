# Research Infrastructure and Optimization Opportunities

> **Status:** Strategic recommendations, not a live implementation queue.
>
> This document records high-leverage tools and infrastructure that may become useful as Pathfinder's solver-research environment grows. It does **not** supersede [`future-work.md`](future-work.md), [`solver-research-operating-model.md`](solver-research-operating-model.md), or the existing experiment ledgers. Before implementing anything here, first verify that the capability has not already been built or functionally achieved elsewhere in the repository.
>
> Primary objective: improve total solver capability, solver speed, or the speed and quality of solver research without regressing generality.

## Context

Pathfinder has moved well beyond the infrastructure profile of a typical small browser game. The repository already contains a substantial experimental environment: multiple solver techniques, large synthetic corpora, an independent oracle, fuzzing, automated reduction, deterministic benchmarking, ablation machinery, profiling, variant generation, provenance, family analysis, GitHub Actions compute workflows, CP-SAT experiments, and extensive structured telemetry.

Because much of the obvious foundational tooling already exists, the strongest remaining opportunities are not generic software-development conveniences. They are primarily about:

1. making the evidence Pathfinder already generates much easier to interrogate;
2. automating the search through large spaces of solver policy choices;
3. reducing repeated one-off infrastructure for experiments;
4. measuring whether solver improvements generalize across controlled families and genuinely new levels.

---

## 1. Build a Queryable Research Data Layer

The largest structural opportunity is a general analytical substrate over Pathfinder's research data.

Current research produces structured information about:

- levels and structural properties;
- solver attempts;
- winning and failing strategies;
- node and canonical-work consumption;
- hints and provenance;
- family and variant relationships;
- ablation experiments;
- CP-SAT classifications;
- divergence traces;
- repair behavior;
- search failures;
- timing;
- known-solution properties.

At present, a new research question often leads to another purpose-built script that reads several JSON sources, performs custom joins and aggregation, and emits another dedicated report. This has worked well, but it scales by continually adding specialized analysis programs.

### Recommendation

Add a derived analytical layer using **DuckDB** as the analytical query engine.

Existing JSON should remain canonical where it already serves the game, solver, or provenance system well. The analytical layer should be rebuildable research infrastructure rather than a new source of truth. Materialize it into a gitignored `research-db/` and commit only the builder and the queries, consistent with section 12's "Git stores the recipe" principle.

A normalized representation might expose entities such as:

- `levels`
- `families`
- `variants`
- `solutions`
- `hints`
- `solver_runs`
- `attempts`
- `experiment_arms`
- `branch_observations`
- `oracle_labels`

The practical goal is that questions such as:

> Among currently unsolved canonical levels whose mirrored siblings solve, compare first-divergence depth, must-cross burden, beam retention, repair participation, winning sibling strategy, and work consumption.

should increasingly become queries rather than new programs.

### The motivation is joins, not bulk — and that determines the design

Measured on `main` (2026-08-12): the live corpus-2 evidence set is 1,700 level rows and 20,546 attempt rows across `logs/solver-corpus2-batches/*.jsonl`, totalling **5.0 MB, fully parsed by plain `JSON.parse` in ~133 ms**. The 249 MB in that directory is 244 MB of `archive/` holding 18 historical refreshes. DuckDB buys nothing here on throughput; it buys expressiveness across runs.

Two consequences:

- **Read the existing JSON/JSONL directly** (`read_ndjson_auto` / `read_json_auto`). At this size a Parquet materialization step adds a build stage, a staleness class, and a second representation for no measured benefit. Parquet becomes genuinely worthwhile only at the scale discussed in sections 6 and 12; see the note there.
- **The DuckDB client is a native binary devDependency** installed by `npm ci` on every CI run, for a tool no CI job uses. Declare it as an optional dependency with a graceful skip, or shell out to the DuckDB CLI.

### Build on the run-identity spine that already exists

`scripts/experiment-manifest-lib.mjs` (schema v2) already requires `experimentId`, `runId`, `solverRef`, `corpus`, `levelIds`, `levelSelectionHash`, `arm`, `solverFlags`, `workflow`, `workflowInputs`, `seeds`, `canonicalWorkBudget`, `wallDeadlineMs`, `profile`, and `instrumentation`. That is already `solver_runs` and `experiment_arms`. The analytical layer should adopt it as the primary key rather than inventing parallel run identity, and should mark any row it cannot attribute to a manifest as unattributed rather than silently pooling it with attributed rows.

> **Largely built already (2026-08-13).** `scripts/analyze-technique-campaign.mjs` implements this spine and most of the comparability contract below, for the campaign artifact format under `reports/experiments/<campaign>/`: level-selection hashing, completeness (`levelsRequested` vs rows), duplicate-id rejection, `deadlineTruncated` and attempt-error counting, work-budget overshoot bounds, level-blind gating, protocol verification (resolvable full commit, persistent ref, permalink, per-artifact SHA-256, evidence class), paired level-set/order equality, and — the core of the contract — rejection of any **undeclared summary difference** between two arms outside the protocol's `treatmentVariables`. It is stricter than what this section originally proposed. Do not build a parallel spine; the remaining gap is the historical archive described next, which has no manifests and no protocols.

### The layer's most valuable output is a comparability contract

The archived refreshes are heterogeneous in ways that will produce confidently wrong answers if ingested naively. Measured across the 18 directories in `logs/solver-corpus2-batches/archive/`:

| archive dir | run timestamp | commit | solved | `budgetMs` | levels |
|---|---|---|---:|---:|---:|
| `2026-07-18-refresh` | 2026-07-17 | `0fb6c752` | 302 | 8,000 | 1700 |
| `2026-07-18T042622Z-refresh` | 2026-07-18 | `4a685cf` | 189 | 8,000 | **935** |
| `2026-07-22T184005Z-refresh` | 2026-07-22 | `2000aac` | 490 | 30,000 | 1700 |
| `2026-07-23T120439Z-refresh` | 2026-07-22 | `2f5dd12` | 503 | 60,000 | **1615** |
| `2026-08-06T211236Z-refresh` | 2026-08-06 | `12b24ac8b3` | 684 | 86,400,000 | 1700 |
| `2026-08-11T211744Z-refresh` | 2026-08-06 | `328fbc56fe` | 725 | 86,400,000 | 1700 |

Four distinct traps appear in that one table:

- `budgetMs` spans 8 s to 24 h, so a naive solved-count-over-time series reads as solver progress when most of the movement is budget change;
- two runs are incomplete (935 and 1,615 of 1,700) and are not comparable to full runs at all; three further directories carry no combined file;
- `commitSha` appears at 7, 10, and 40 hex characters, so any join on it silently misses;
- **directory names are archival timestamps, not run timestamps** — `2026-08-06T053039Z-refresh` contains a run whose own `timestamp` is `2026-07-23`, so ingestion keyed on the folder date mislabels every row it touches.

None of these snapshots record whether deterministic mode was set, which per [`solver-budget-determinism.md`](solver-budget-determinism.md) is exactly what separates a real corpus-2 delta from a ±5 noise band.

Therefore every fact table should carry `budget_ms`, `node_budget`, `deterministic`, `completed`/`total`, and the resolved flag set; a `comparable_runs` view should define when two runs may legitimately be differenced; and aggregation across incomparable runs should be refused rather than silently averaged. This constraint, not the query engine, is what makes the layer trustworthy.

### The layer must not become a level-blindness hole

A conveniently indexed per-level history database is precisely the artifact that makes an accidental violation of [`solver-level-blindness.md`](solver-level-blindness.md) easy. State and enforce the invariant explicitly: the analytical database is offline, read-only, and never importable from `modules/**`. A scoped `no-restricted-imports` rule in the existing AST-rule style (see `eslint.config.mjs`) makes this machine-enforced rather than conventional.

### Known coverage limits of the hint tables

Measured 2026-08-12 across the three real corpora (253,491 hints, 477,925 provenance entries), cross-checked against `classifyProvenanceSource` in `scripts/stress/solution-profile-lib.mjs`:

| corpus | hints | no provenance | hints touched by `prefix-anchored` | hints with ≥1 cold entry |
|---|---:|---:|---:|---:|
| published (`data/hints`) | 58,179 | 6,093 (10.5%) | 1,655 (2.8%) | 87.7% |
| stress corpus 1 | 32,374 | 0 | 9,264 (28.6%) | 76.4% |
| stress corpus 2 | 162,938 | 0 | 12,327 (7.6%) | 94.1% |

Coverage is far better than older summaries suggest — both stress corpora are at 100%, not 0%. Two real caveats remain, and the schema should surface both rather than leave them to be rediscovered per query:

- **The published gap is live, not historical.** It is dominated by imported and player-submitted hints that arrive without solver provenance (`P00158` alone contributes 999 of the 6,093, and its level provenance reads `unknown/imported-without-provenance`), so the gap grows with each import rather than shrinking. A `hints` table needs an explicit coverage flag, and published-corpus provenance queries must report their denominator.
- **Hint-guided share differs by almost an order of magnitude across corpora** (28.6% in corpus 1 versus 2.8% in published). Cross-corpus statements about what the solver finds are therefore not comparable unless bucketed by provenance source. The `context.hintGuided` flag is applied to exactly the 61,770 `prefix-anchored` entries and nothing else, so the bucketing is reliable where provenance exists.

### Acceptance gate before expanding the layer

Port three existing one-off analyses onto the layer and check that they get materially shorter and cheaper: `scripts/stress/hint-cost-drift.mjs`'s cross-commit cost comparisons, the corpus-2 feature-solvability report, and the winning-lineage cohort table in [`../reports/2026-08-11-pr1356-review-follow-up.md`](../reports/2026-08-11-pr1356-review-follow-up.md). If those three do not shrink, the layer is an added abstraction rather than a replacement, and expansion should stop there.

This remains the strongest single infrastructure investment, because Pathfinder now generates more reusable evidence than its current collection of one-off analysis scripts can cheaply cross-examine — but its value is concentrated in run identity, comparability, and provenance bucketing rather than in the query engine itself.

---

## 2. Create a Reusable GitHub Actions Experiment Substrate

GitHub Actions has become a distributed compute platform for Pathfinder research. Several sophisticated workflows independently solve the same general engineering problems:

- checking out the requested ref;
- recording the commit actually measured;
- partitioning work;
- balancing shards;
- installing/building;
- propagating solver parameters;
- managing node/work/time limits;
- preserving partial results;
- checkpointing;
- artifact upload;
- recovery after combine failures;
- validating complete coverage;
- combining outputs.

Several past workflow failures came from these concerns being reimplemented separately: wrong-ref measurements, stale checkpoints, omitted parameters, artifact-download edge cases, shard imbalance, and combine failures after expensive compute had already succeeded.

### Recommendation

Extract a common solver-experiment execution layer using reusable GitHub workflows and/or composite actions.

Individual experiments should specify the experiment-specific pieces, such as:

- corpus;
- level selection;
- solver command;
- budgets;
- flags;
- output schema;
- aggregation logic.

The common substrate should own repetitive execution mechanics.

The value is scientific reliability and reduced engineering duplication, not process ceremony. Pathfinder is a single-owner experimental project, so the infrastructure should preserve fast iteration rather than introducing collaboration-oriented gates that solve no current problem.

---

## 3. Introduce Optuna for Automatic Solver-Policy Optimization

Optuna is an automatic experimental optimizer. An agent defines:

1. which solver settings are allowed to vary;
2. the allowed range or choices for each setting;
3. how a candidate configuration is evaluated;
4. what counts as a better result.

Optuna then repeatedly proposes configurations, observes their results, and uses accumulated evidence to choose more promising future configurations.

A first Pathfinder search space could contain only a few safe controls, for example:

```text
beam width:             100-800
repair allocation:      5-35%
late reserve:           0-20%
position weight:        0.5-2.0
must-cross threshold:   0-6
```

Instead of an agent manually choosing several plausible combinations, Optuna could evaluate hundreds while concentrating future trials in regions that appear promising.

### What Optuna should tune

Initially, restrict it to **soft policy and scheduling decisions**:

- beam widths;
- scoring weights;
- attempt ordering;
- attempt eligibility thresholds;
- budget fractions;
- repair allocation;
- reserve fractions;
- search-width parameters;
- participation thresholds;
- feature-conditioned scheduling decisions.

### What Optuna should not tune

Do not use empirical optimization to decide semantic truth or soundness:

- hard-prune validity;
- lower-bound mathematics;
- game semantics;
- referee behavior;
- whether correctness checks apply.

Equally, an objective function that reads per-level history is a [level-blindness](solver-level-blindness.md) violation dressed as tuning. The optimizer may read aggregate outcomes over a level population; it may not condition a proposed configuration on a specific level's prior solved status, winning config, gate, seed, timing, or node count.

### Toolchain cost, and what to try first

Optuna is a Python tool in a repository with **zero Python** (2 runtime dependencies, 12 dev dependencies, Node 20 in CI). The realistic shape is Optuna in Python orchestrating Node solver subprocesses across Actions — a second toolchain and lockfile that section 4's sketch does not price.

For the five-parameter space above, random or Sobol search over the existing 20-shard matrix captures most of the value at zero new toolchain cost. TPE's advantage over random search appears when the space passes roughly eight dimensions or trial counts pass a few hundred. Start with random search on infrastructure that already exists, and adopt Optuna at that threshold rather than before it.

The useful division of labor is:

> Agents derive mechanisms, representations, invariants, and hypotheses. Optuna searches the large space of reasonable ways to deploy them.

---

## 4. Use GitHub Actions as Optuna's Compute Farm

Pathfinder is unusually well positioned for this because expensive research workloads are already parallelized through GitHub Actions.

The first implementation should use simple **batch optimization** rather than a permanently shared distributed Optuna service.

A round could work as follows:

```text
Optuna proposes 20 configurations
            |
            v
GitHub Actions matrix runs all 20
            |
            v
combine structured results
            |
            v
Optuna records outcomes and proposes the next 20
```

This reuses existing Pathfinder strengths: dynamic matrices, sharding, artifact preservation, result combination, deterministic budgets, and structured reports.

A more sophisticated future system could let separate workers dynamically request trials from one shared Optuna study, but that requires persistent shared storage outside the runners. Do not build that complexity unless batch optimization first proves valuable.

---

## 5. Treat Corpus 2 as Optimization Material, Not a Sacred Test Set

Corpus 2 consists of synthetic research levels. They are not player content and are not intended to be played. Their purpose is to represent difficult levels that humans or generators might create in the future.

That materially changes the normal overfitting discussion.

Repeated optimization against Corpus 2 is legitimate. The real generalization target is:

> difficult, valid Pathfinder levels that do not yet exist.

The important overfitting risk is therefore not memorization of the 1,700 level identities. It is exploitation of **biases in the level-generation distribution** that may not characterize future human-designed or differently generated levels.

### Recommended validation model

Use known synthetic levels aggressively during optimization. Then freeze a candidate policy and test it on freshly generated levels that did not exist during optimization.

Conceptually:

```text
KNOWN SYNTHETIC CORPUS
baseline   725
candidate  781

FRESH SYNTHETIC CORPUS
baseline   843
candidate  917
```

The fresh-corpus transfer result is the stronger evidence.

Pathfinder has an unusual advantage here: the validation population is renewable. New synthetic levels can be generated after a candidate policy has been frozen rather than preserving one small test set indefinitely.

Fresh validation should ideally include multiple generation regimes, seeds, parameter distributions, adversarial generators, and eventually newly accumulated human-authored levels. This tests distributional transfer rather than merely identity transfer.

---

## 6. Exploit the ~96,000 Family/Variant Levels as Structured Experimental Data

> **Prerequisite (measured 2026-08-12):** sections 6, 7, and 8 all depend on trove data that is **not on `main`**. On `main`, `data/families/` holds ~95 family files totalling roughly 800 variants (9.6 MB). The trove lives on the research branch `claude/variant-levels-solver-insights-tpk4qg`, where `data/families/` is **116,847 files and 1.68 GB** (whole tree 139,004 files / 2.69 GB, against `main`'s 7,980 files / 846 MB). `.github/workflows/family-wide-trove.yml` generates it across all 1,962 levels in the three real corpora and, by its own header, targets that research branch and "never main."
>
> Merging the raw trove into `main` is the wrong move — see section 12, which is a **precondition** for this section rather than a Tier 3 afterthought. What should reach `main` is the derived per-variant outcome table, which is megabytes rather than gigabytes, and which is the case where section 1's deferred Parquet recommendation finally earns its place.

These are **not 96,000 independent levels**. They form controlled neighborhoods around roughly 1,700 underlying parent problems. That relationship is a feature, not a statistical inconvenience.

For each parent, Pathfinder may have controlled variants such as:

- rotations;
- reflections;
- local mutants;
- constrained shuffles;
- swaps;
- reshuffles;
- other cousins.

This allows evaluation of whether a policy improves **robustness around a structural problem family**, rather than merely accumulating isolated solves.

### Family-balanced scoring

A naive objective such as:

```text
total variants solved / 96,000
```

can overweight parents that simply happen to have more generated variants.

Prefer family-balanced objectives, for example:

```text
family score = fraction of that family's variants solved

overall score = average family score across parents
```

or a richer family-level objective.

The principle is that each underlying parent problem should have roughly comparable influence unless there is an explicit reason to weight otherwise.

---

## 7. Reward Robustness, Not Merely Raw Variant Count

Family structure permits stronger optimization targets than total solved rows.

Consider one family:

```text
Baseline
parent       fail
rotate 90    solve
rotate 180   fail
rotate 270   solve
mirror       solve
mutant A     fail
mutant B     solve
```

and a candidate:

```text
Candidate
parent       solve
rotate 90    solve
rotate 180   solve
rotate 270   solve
mirror       solve
mutant A     solve
mutant B     solve
```

The second policy appears less brittle throughout a neighborhood of puzzle space. That is more meaningful than merely saying that four additional variant rows were solved.

Potential optimization objectives can therefore include:

- number of parent families improved;
- mean family solve fraction;
- number of families with severe regressions;
- total variants solved;
- canonical-parent solves;
- orientation sensitivity;
- work consumption;
- solve latency;
- technique participation.

This is especially relevant to the current symmetry/orientation research. An optimizer should preferably discover policies that reduce orientation brittleness rather than exploit one fortunate orientation or fixed tie order.

---

## 8. Use Progressive Evaluation Instead of Running All 96,000 Variants for Every Trial

A full 96,000-variant evaluation for every Optuna trial would be wasteful. Most poor configurations can be rejected using much cheaper evidence.

Use progressively larger exams:

```text
Stage 1
small representative family sample
        |
clearly bad? -> terminate
        |
        v
Stage 2
larger family sample / several thousand variants
        |
still competitive? -> continue
        |
        v
Stage 3
all parent families or a broad family-balanced census
        |
exceptional? -> continue
        |
        v
Stage 4
large or complete ~96,000-variant evaluation
```

Existing provenance and structural metadata should make the early samples deliberately representative rather than purely random.

This could reduce compute dramatically while still allowing truly promising configurations to earn expensive population-wide evaluation.

---

## 9. Use Automated Optimization for Bespoke Attempt-Ladder Policy

The most interesting long-term Optuna application may be feature-conditioned solver scheduling rather than tuning one global constant.

Pathfinder already has evidence that different level regimes benefit from different techniques and different portions of the attempt ladder. The family/variant dataset potentially contains enough information to investigate:

> Given the observable properties of this level, where should the next unit of solver work go?

Conceptual policies could resemble:

```text
high must-cross burden + low navigation density
-> more early DFS work

many turn obligations + high path slack
-> more beam participation

repair-eligible structural signature
-> reserve more work for repair

simple low-obligation level
-> skip expensive specialist tiers
```

The non-negotiable constraint remains the existing Pathfinder principle: policy depends on **general level features**, never level identity.

A sensible progression would be:

1. optimize global constants;
2. optimize feature-conditioned thresholds;
3. optimize a small explicit decision tree or rule system;
4. only later consider a lightweight learned scheduler if the evidence justifies it.

Optuna is particularly attractive for stages 1-3 because it can search large threshold/allocation spaces without introducing an opaque model.

---

## 10. Add Property-Based Testing With fast-check

Pathfinder already performs substantial randomized and exhaustive testing. Property-based testing could generalize some of this work.

Instead of writing only individual fixtures, define invariants and generate many legal cases automatically.

Strong Pathfinder properties include:

- four rotations produce the original level;
- mirroring twice produces the original level;
- transform followed by inverse transform preserves mechanics;
- parse -> serialize -> parse preserves semantics;
- apply move -> undo restores exact solver state;
- worker transport preserves all persistent attempt properties;
- equivalent representations fingerprint identically;
- symmetry-respecting mechanics remain equivariant under transformations.

The sharpest single target is transform equivariance, because the repository has a documented bug class there: `TurnDir` chirality must flip under reflection and must not under rotation, and two independent transforms (the editor's Rotate/Mirror rewrite and play-mode's display variant) have to treat that asymmetry correctly. A generator over the 8 variants crossed with turn-bearing landmarks tests that far more thoroughly than fixtures do.

A major benefit of tools such as **fast-check** is shrinking: when a generated case fails, the framework attempts to simplify it into a smaller counterexample.

This does not replace the existing level reducer. Property-test shrinking minimizes a generated failing test case; the Pathfinder reducer minimizes a semantically interesting solver specimen.

---

## 11. Add Mutation Testing With StrykerJS

Coverage answers:

> Did a test execute this code?

Mutation testing asks:

> Would the tests notice if this code were slightly wrong?

A mutation tester deliberately makes tiny changes such as:

```text
>=  -> >
true -> false
+1  -> -1
&&  -> ||
```

and reruns tests. If the suite still passes, the mutation survived and exposed a weakness.

This is unusually relevant to Pathfinder because several historical bug families have had exactly this shape: index offsets, sentinel decoding, omitted state/projection fields, slightly wrong inequalities, or incomplete cache keys. Two documented cases make the argument better than the generic one does — the undersized MST scratch buffer that silently truncated a TypedArray and produced a bound tighter than mathematically valid, and the `mustCrossLowerBound` cache key that is unsound if simplified to `(pos, mask)`. Both are "would the tests notice if this were slightly wrong," and both sit in the pure components listed below.

Do not begin by mutation-testing the entire solver. Start with smaller dangerous and largely pure components:

- lower bounds;
- prune gauntlet;
- level validation;
- geometry transforms;
- fingerprints/codecs;
- win-condition logic;
- representation helpers.

The whole-solver mutation space could be computationally enormous.

---

## 12. Move Very Large Generated Research Outputs Away From Ordinary Git History When Necessary

> **This is a precondition for sections 6-8, not a Tier 3 cleanup.** Those sections cannot proceed without deciding where the trove lives, and the decision has already been made once in the right direction by `family-wide-trove.yml`, which keeps variants on the research branch deliberately.

The family/variant research trove is already large enough that generated research data deserves separate consideration from source code.

### File count is the dominant cost, ahead of bytes

The research branch carries 116,847 files under `data/families/` alone. For coding agents working in the repository, that count — not the 1.68 GB — is what degrades ergonomics: repo-wide globs and greps return enormous result sets that consume context on every unrelated task, truncated tool output invites confidently wrong conclusions, `git status`/`git diff` slow down, and `git add -A` becomes a far more dangerous mistake. A fresh clone of a 2.69 GB tree also competes with the fixed writable-disk allowance in ephemeral agent environments.

If any part of the trove must land on `main`, consolidate it into a few dozen files rather than tens of thousands, using the existing one-line-per-level convention (`stringifyCorpusJson` in `scripts/level-json-format.mjs`) so single-variant diffs stay one line. Prefer shipping the derived outcome table over the raw variant levels.

Git is excellent for:

- source;
- manifests;
- configuration;
- compact canonical datasets;
- important reports;
- experiment definitions.

It is less attractive for multi-gigabyte regenerated analytical outputs.

The eventual model should be:

> Git stores the recipe, provenance, manifest, and identity of a giant experiment. Bulk generated analytical data may live elsewhere.

Parquet may reduce the storage burden substantially for tabular telemetry. If the research data continues to expand, object storage or a lightweight data-versioning approach could hold large artifacts.

Do not introduce a heavyweight data-management system simply because one exists. This becomes worthwhile when ordinary Git storage and branch management begin materially obstructing research.

---

## 13. Consider Dependabot and CodeQL as Cheap Background Hygiene

These are lower-priority opportunities because they are unlikely to produce solver gains directly.

If they are not already enabled through GitHub settings:

- Dependabot can surface dependency/security updates;
- CodeQL can provide an independent static security-analysis layer.

Pathfinder already has substantial custom checking around CSP, secrets, dependencies, typing, architecture, validation, and correctness. These would be additional independent detection systems rather than replacements.

---

## Things Pathfinder Does Not Particularly Need

Common developer advice should not be adopted merely because Pathfinder has become a serious codebase.

There is no obvious current need for:

- Jira;
- GitHub Projects simply for appearances;
- Scrum machinery;
- Docker merely for the sake of Docker;
- Kubernetes;
- a microservice architecture;
- a monorepo framework;
- heavyweight release management;
- collaboration-oriented merge bureaucracy;
- generic graph-search libraries purely because they exist.

The repository's existing docs, research plans, future-work index, experiment ledgers, and reports already provide effective coordination for a single-owner AI-assisted research project.

Likewise, Pathfinder's search problem is specialized enough that generic graph-search packages are unlikely to replace the custom solver core cleanly. External tools are most useful when they provide a genuinely different capability, as OR-Tools already does.

---

## Recommended Priority Order

If the overriding goal remains more solves, faster solving, or faster progress toward either, prioritize approximately as follows.

### Tier 1 - strongest expected payoff

1. ~~**Run-identity and comparability spine**~~ — **done for campaign artifacts** by `analyze-technique-campaign.mjs` (2026-08-13); see the note in section 1. What remains is narrower than this item originally implied: canonical provenance-class predicates (landed as `scripts/stress/provenance-classes.mjs` + `npm run stress:provenance-coverage`) and, if it ever proves necessary, retrofitting the manifest-free historical archive.
2. **Reusable GitHub Actions experiment substrate**
3. **DuckDB analytical views on top of the spine** (no Parquet at this stage)
4. **Optuna tuning harness, and Actions batch optimization for it** — preceded by random search on the existing matrix

These directly increase Pathfinder's ability to exploit existing data and compute.

Item 3 is now the open Tier 1 work on the data side, and it should stay gated behind the acceptance test in section 1: the campaign analyzer already answers cross-arm questions well, so a query layer has to earn its place on the questions that analyzer does *not* cover — principally cross-corpus hint/provenance analysis, where the only shared machinery today is `classifyProvenanceSource` and the provenance-class predicates.

Item 2 is promoted above the query layer deliberately. Section 2's failure list is not hypothetical: wrong-ref measurements, stale checkpoints, omitted parameters, and combine failures after expensive compute had already succeeded. The canonical corpus-2 A/B is roughly 122.4 billion arm-level nodes per the [PR #1356 follow-up](../reports/2026-08-11-pr1356-review-follow-up.md); losing one arm of that to a combine bug costs more than any amount of awkward querying. Easier queries save analyst time, while a reliable substrate saves whole experiments.

### Tier 2 - expand automated optimization into solver policy research

5. **Family-balanced optimization objectives**
6. **Progressive evaluation over the ~96k variant trove**
7. **Feature-conditioned / bespoke attempt-ladder optimization**
8. **Fresh-corpus transfer testing**

This is where automated tuning could begin contributing genuinely better general solver policy rather than merely finding nicer constants.

### Tier 3 - correctness and maintainability multipliers

9. **fast-check property-based testing**
10. **StrykerJS mutation testing**
11. **Large research-data storage cleanup when growth makes it necessary**
12. **Dependabot / CodeQL if absent**

These are useful, but less likely to produce immediate new solves.

---

## Larger Opportunity

Pathfinder's bottleneck has changed.

Earlier, the difficult task was building a solver capable of attacking the puzzles at all.

The project now has:

- thousands of difficult synthetic parent levels;
- roughly 96,000 controlled family/variant cases (on the research branch, not `main` — see section 6);
- a very large corpus of known solutions and hints;
- rich provenance;
- per-attempt telemetry;
- independent correctness machinery;
- distributed compute;
- many search strategies and experimental controls.

The project is increasingly limited by its ability to **extract decisions from all that evidence**.

The next generation of infrastructure should therefore do three things:

1. make arbitrary questions about solver behavior cheap to ask;
2. make large spaces of solver policies cheap to search automatically;
3. make generalization across families and newly generated levels measurable.

The most interesting long-term division of labor is:

> Agents continue discovering new representations, proofs, search techniques, and hypotheses.
>
> Automated experimentation searches the enormous combinatorial space of when and how those techniques should be deployed.

That would move Pathfinder development away from repeatedly asking, "Which of these three plausible configurations should be tried?" and toward systematically searching hundreds or thousands of policies while preserving deeper algorithmic reasoning for the agents.

The ~96,000-level family corpus is especially important. It should not be thought of merely as a very large benchmark. Its strongest value is that it provides controlled neighborhoods around difficult underlying problems, allowing Pathfinder to distinguish a policy that happens to win on particular puzzles from one that genuinely makes the solver more robust across nearby puzzle space.

That combination of structured families, renewable synthetic validation populations, deterministic solver telemetry, and cheap distributed compute makes automatic policy optimization one of the most promising new capabilities currently within reach.

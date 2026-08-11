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

Add a derived analytical layer using:

- **DuckDB** as the analytical query engine;
- **Parquet** as the bulk columnar storage format where appropriate.

Existing JSON should remain canonical where it already serves the game, solver, or provenance system well. The analytical layer should be rebuildable research infrastructure rather than a new source of truth.

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

This is likely the single strongest infrastructure investment because Pathfinder now generates more reusable evidence than its current collection of one-off analysis scripts can cheaply cross-examine.

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

The research branch containing roughly 96,000 family/variant levels changes the optimization opportunity substantially.

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

This is unusually relevant to Pathfinder because several historical bug families have had exactly this shape: index offsets, sentinel decoding, omitted state/projection fields, slightly wrong inequalities, or incomplete cache keys.

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

The family/variant research trove is already large enough that generated research data deserves separate consideration from source code.

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

1. **DuckDB + Parquet analytical research layer**
2. **Optuna tuning harness**
3. **GitHub Actions batch optimization for Optuna**
4. **Reusable GitHub Actions experiment substrate**

These directly increase Pathfinder's ability to exploit existing data and compute.

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
- roughly 96,000 controlled family/variant cases;
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

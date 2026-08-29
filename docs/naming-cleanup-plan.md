# Naming cleanup implementation plan

Status: **approved vocabulary and implementation plan; latest-`main` preflight complete at `e236a51d3af9` (2026-08-28)**. The canonical naming decisions in this document are authoritative for this cleanup, but no implementation PR may outrank newer implementation on `main`. Repeat Section 0 whenever unrelated solver/application work has merged since the previous naming-cleanup PR.

This is a **behavior-preserving naming and vocabulary migration** unless a section explicitly says that an obsolete compatibility surface is removed after its consumers are migrated. Do not change solver policy, attempt order, scoring weights, eligibility, budgets, pruning behavior, random seeds, corpus contents, or evidence disposition as part of this work.

Use `docs/change-recipes.md` for every cross-boundary rename. Historical reports, archived snapshots, frozen logs, immutable workflow artifacts, and committed evidence files remain unchanged unless a parser must be taught to read their legacy identifiers.

## 0. Latest-main reconciliation and scope closure

This gate is mandatory before PR 1 and again at the start of every implementation PR that follows a merge of unrelated solver/application work.

1. update the implementation branch from the current `main`;
2. compare the naming-plan branch point with current `main` and inspect every newer change touching a listed concept;
3. rerun the live-surface naming census over code, package aliases, workflows, current docs, generated-schema readers/writers, telemetry/provenance, environment-variable contracts, and workflow artifact/concurrency identifiers;
4. classify every live confusing-name hit as **rename**, **intentional retained term**, **frozen history**, or **superseded by newer architecture**;
5. add any newly discovered live rename to this document and `docs/naming-cleanup-ledger.json` before changing code;
6. never infer that an omitted surface is safe merely because the original audit predated it.

A current-`main` change that makes a planned mapping obsolete is not a reason to recreate the old concept. Record the superseding commit in the ledger and use the newer architecture's vocabulary.

The cleanup is only comprehensive when the final audit has **zero unclassified live naming hits**. The ledger therefore records both renames and explicit retained-term exemptions for potentially confusing vocabulary that is intentionally correct in context.


### 0.1 Reconciliation completed against current `main` (2026-08-28)

The plan branch was reconciled again against `main` at `e236a51d3af9` and merged with it in `333204ae1e10`. This supersedes the earlier `e6050e2da7b7` preflight record. The implementation branch now carries the current main tree as a parent; this closes the mandatory pre-PR-1 latest-main gate for this snapshot only. Every later implementation PR must repeat Section 0 if unrelated solver/application work has merged.

GitHub code search is not indexed for this repository, so the refreshed live-surface census did **not** treat empty search results as evidence. The reconciliation instead compared `e6050e2da7b7..e236a51d3af9`, selected every changed code/current-doc/workflow surface, and inspected all **27 naming-relevant changed files** for the plan's ambiguous vocabulary families. Every newly introduced live hit is classified below or assigned to an existing migration section. Generated hints, dated reports, and retained evidence files remain frozen history.

| New/current surface | Classification | Disposition |
|---|---|---|
| `SolveOpts.baseWorkBudget` | superseded by newer architecture | Retain as the preferred base-allocation name. Do not recreate an older generic budget name. |
| `SolveOpts.workBudget` | intentional compatibility term | Retain as a legacy read/API alias while current workflows/artifacts still depend on it; current docs must continue to qualify it as a base allocation rather than a whole-solve cap. |
| `LEGACY_MS_TO_WORK_RATE` / `legacyMsToWork` | intentional retained term | Retain. Here `legacy` is behaviorally meaningful: these names identify an explicitly quarantined compatibility conversion and are permitted by Section 2.1. |
| `scaledStageWorkBudget` | intentional retained term | Retain as the canonical helper for deriving an additive stage's work dose from the solve's already-resolved base work allocation. The naming cleanup must not recreate the superseded ms-derived work-sizing path. |
| `dedup-near-tie-retry`, `repair-fallback`, and `admissible-order-non-default-retry` work-dose implementations | newer architecture under existing planned stage names | Their work pools now use `scaledStageWorkBudget()`. Keep the stage-name migrations in Section 4.6 unchanged; PR 6 must preserve the new work-dose semantics exactly. |
| plain `admissible-order` work-cap gap | research/budget issue, not naming work | Retain current naming-plan treatment. Do not add a new allocation while renaming the stage; the naming PR is behavior-preserving. |
| `strictTotalWorkBudget` and workflow `strict_total_work_budget` | intentional retained term | Retain for the current experiment-only whole-solve envelope. This name accurately distinguishes a strict total cap from the legacy base allocation. |
| `solver-sweep-result` / manifest kind `pathfinder-solver-sweep-result` | intentional retained protocol name | Retain. It identifies the standardized solver-sweep result contract precisely. |
| `gha-source-run` / `pathfinder-gha-source-run` | intentional retained provenance name | Retain. It describes GHA source-run provenance rather than an implementation-history label. |
| `publish-solver-sweep-result.mjs` | intentional retained tool | Retain: operation-first and behavior-descriptive. |
| `check-solver-sweep-result-contract.mjs` / `check:solver-sweep-results` | intentional retained tool/alias | Retain: deterministic contract validation with an honest `check` verb. |
| `gha:result` / `scripts/gha-result.mjs` | rename | Rename to **gha:fetch-result** / `scripts/fetch-gha-result.mjs`; it actively resolves/downloads a completed run artifact. |
| new `run-name`/artifact/provenance surfaces across maintained evidence workflows | covered live surface | Treat as propagation targets for any workflow/tool terminology renamed later; do not rewrite historical run artifacts. |
| `solver-archetype-sample-ab.yml`, `select-archetype-sample.mjs`, workflow input/output `archetype*`, and `STRATEGY_ARCHETYPE_ROUTING` | rename | PR 3 migrates these atomically to routing-regime terminology; exact mappings are fixed in Section 4.1. |
| `techniqueLifecycle` result/telemetry field | rename | Its keys are solver stages, not techniques. Rename to `stageLifecycle` in PR 6 with dual-read for retained generated JSON. |
| `scripts/stress/current-missing-exposure-audit.mjs` | rename | Rename to `scripts/stress/analyze-current-missing-attempt-exposure.mjs`; PR 3 migrates routing-regime vocabulary and PR 4 migrates attempt-config identity fields. |
| `scripts/stress/select-attempt-exposure-sample.mjs` | retain file, rename interface fields | The filename accurately describes mechanics-only sampling. PR 4 changes `--technique` to `--attempt-config` and generated `technique` to `attemptConfigIdentity`. |
| `scripts/stress/analyze-equal-work-census-pilot.mjs` | rename | It is now surfaced durable tooling. Rename to `scripts/stress/analyze-equal-work-census.mjs` in PR 8. |
| `technique-census-cell.mjs` and its new equal-work test/helper surfaces | covered existing taxonomy cleanup | Keep live until PR 8; migrate the whole technique-census tool family together so equal-work additions do not preserve split vocabulary. |
| `portfolio-sweep-reports-to-benchmark.mjs` / `solver:combine-corpus2-batches` | rename | The helper now combines generic solver-sweep reports and is used outside Corpus 2. Rename to `combine-solver-sweep-reports.mjs` / **solver:combine-sweep-reports** in PR 9. |
| current generated outputs `reports/stress/benchmark-parallel.json` and `reports/stress/benchmark-latest-random.json` | rename live output paths | New workflow output paths become `reports/stress/solver-corpus1-latest.json` and `reports/stress/solver-corpus2-latest.json`; retained historical files are not rewritten. |
| `STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE` and `STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_RESERVE_PRESERVING_EXPOSURE` | intentional retained experiment IDs | Both tested forms are closed negative in the opt-in ledger. Do not spend compatibility churn renaming dead experiment IDs; retain them only as closed default-off historical controls and ledger exemptions. If removed later, delete rather than rename. |
| `additive-tier-participation-audit.mjs` | intentional retained tool | Retain: it is a bounded systematic audit of additive-tier participation. |
| `connectivity-rejection-audit.mjs` | intentional retained tool | Retain: it systematically audits connectivity rejection behavior. |
| `portfolio-sweep-reports-to-benchmark` output concept "benchmark-shaped report" | intentional data-shape description only | "Benchmark" may remain in comments describing the historical consumer schema; the executable and live output paths are renamed as above. |

The refreshed delta census has **zero unclassified naming-relevant hits introduced since the previous reconciliation**. Older live surfaces remain governed by the explicit mappings and retained-term rules in Sections 4-8 and must be rechecked by PR 1's full ledger population.

No production solver behavior, work allocation, experiment disposition, corpus identity, or frozen evidence content changes in this reconciliation.

## 1. Goals and non-goals

The cleanup has four goals:

1. make names describe observable behavior or architectural role;
2. remove names that imply stronger guarantees than the implementation provides;
3. separate concepts that currently share one overloaded term;
4. preserve the ability to read and interpret all historical evidence.

The cleanup is not an excuse to redesign algorithms. A rename may expose architectural debt, but implementation behavior stays fixed. If a rename cannot be completed without changing solve behavior, stop that PR and split the behavioral change into a separately authorized task.

## 2. Repository naming contract

These rules are normative for all new code and documentation after this plan lands.

### 2.1 Names describe behavior, not experiment history

Permanent names must describe what a component does now. Names such as `probe`, `legacy`, `pilot`, or the date/origin of an experiment do not belong in stable production identities unless the historical distinction is itself the behavior being selected.

### 2.2 Do not overclaim guarantees

Reserve these words for their strict meanings:

- **dedup**: exact duplicate or equivalence removal;
- **oracle**: an independent reference implementation or authority, not a wrapper around the production referee;
- **full**: complete support for the stated domain;
- **known**: established by evidence or proof, not a heuristic score;
- **reachable**: graph/search reachability, not merely "can satisfy all constraints as a terminal";
- **benchmark**: an unqualified executable/run name means performance or cost measurement, not a solved-set regression check. A qualified noun such as **benchmark set** or **benchmark dataset** may describe a fixed evaluation population when that meaning is explicit.

### 2.3 Search mechanism, scoring, ordering bias, retention, routing, and stage are separate concepts

Every solver action should be describable using these dimensions:

- search family;
- scoring profile;
- structural ordering bias;
- beam retention policy, when applicable;
- routing regime;
- solver stage;
- resource envelope;
- deterministic seed, when applicable.

A scoring profile is not a technique by itself. A routing regime is not an intrinsic puzzle taxonomy. A stage name is not a research claim.

### 2.4 Stable IDs and display language are different concerns

Persisted machine identities may require legacy compatibility. Human-readable output must use the new canonical terminology as soon as the compatibility layer exists.

For persisted identities use **dual-read, single-write**:

- read old and new;
- normalize internally to the new canonical form;
- write only the new form;
- never rewrite frozen reports merely to modernize spelling.

### 2.5 Abbreviations

Use full project terms in exported types, public APIs, stage IDs, report fields, and documentation. Short forms such as `mc`, `mp`, `int`, and `arch` are allowed only in small local scopes where the expanded meaning is immediately visible.

### 2.6 Tool verbs

Surfaced research/validation executables must lead with an operation that says what the tool actually does. Prefer this vocabulary when it fits:

- `check`: deterministic invariant/pass-fail validation;
- `validate`: semantic/data validation;
- `analyze`: offline analysis of existing evidence;
- `compare`: comparison of two or more existing/run outputs;
- `measure`: cost/performance measurement;
- `run`: execute a search/treatment when no more specific verb is honest;
- `generate`: generate new data;
- `collect`: build/rebuild evidence from many runs;
- `sweep`: repeat a defined operation across a population or parameter range;
- `probe`: bounded diagnostic measurement only;
- `audit`: broad systematic review;
- `census`: near-exhaustive enumeration over a defined matrix.

This is a semantic vocabulary, not an exhaustive filename grammar. Precise domain verbs such as `build`, `merge`, `plan`, `import`, `migrate`, `replay`, `rank`, `solve`, and `report` may remain when they are more informative than a generic verb.

Lifecycle labels are not operations. `pilot`, dates, experiment origin, and `legacy` must not be permanent surfaced command identities unless the historical distinction is the behavior being selected. A temporary pilot may keep that word only while it is genuinely disposable and unsurfaced; once it is in `package.json`, a live workflow, or the tooling catalog, give it a behavior name or remove the surface.

## 3. Migration rules and mandatory checks

Every rename PR must perform all checks in this section before merge.

### 3.1 Search the complete live surface

Search for both the old symbol/string and any common textual variants across:

- `modules/`;
- `scripts/`;
- `tests/`;
- `.github/workflows/`;
- `package.json`;
- `docs/`;
- local `README.md` files;
- `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md`;
- generated-schema definitions and schema readers;
- current baseline/report generators;
- hint/provenance conversion code;
- telemetry serializers and reducers;
- tool discovery/catalog metadata;
- workflow filenames, displayed `name:`, job IDs/names, `concurrency.group`, artifact names, cache keys, and `paths`/`paths-ignore` filters;
- environment-variable names consumed by live scripts/workflows;
- package-script aliases and their transitive test/CI aggregators;
- case-sensitive physical paths referenced by workflow triggers, imports, spawns, and documentation.

Use `node scripts/tooling-census.mjs --compact --query=<old-term>` and again with the new term whenever the concept is surfaced through tooling. For a physical file rename, separately verify exact-case workflow path filters and spawned/imported paths; link checking does not catch case-only stale workflow triggers.

### 3.2 Inspect persisted identity consumers before changing a string

Before changing any attempt key, stage ID, flag name, corpus identifier, provenance field, or generated JSON key, identify:

1. producer;
2. canonical parser/reader;
3. worker transport;
4. report/export projection;
5. tests and fixtures;
6. historical artifacts containing the old value;
7. scripts that classify or group by the value;
8. workflow inputs/outputs;
9. hint/provenance storage;
10. any comparison code that assumes raw string equality.

Do not rely on search-and-replace for persisted identity migrations.

### 3.3 Frozen evidence stays frozen

Do not rename:

- dated reports;
- archived snapshots;
- historical log filenames;
- immutable benchmark/census outputs retained as evidence;
- old action/workflow artifacts.

Current docs may say, for example, "`ida:default` (legacy; canonical form `admissible-order|tieBreak=baseline|lds=off`)".

### 3.4 Compatibility removal rule

A legacy alias may be removed only when:

- no live code or workflow emits it;
- no current doc instructs users/agents to use it;
- the canonical historical readers accept it without the alias being exposed publicly;
- tests include at least one representative historical fixture proving old data remains readable.

### 3.5 Validation floor

Documentation-only PRs: `npm run check:documentation-links`.

Internal TypeScript symbol renames: targeted tests plus `npm run ci:fast`.

Solver search/orchestration/identity/stage changes: targeted compatibility tests plus full `npm run ci`.

Workflow or package-script aliases: workflow lint/current repository checks plus the relevant command smoke test.

No rename PR may be merged with an unexplained solved-set change.

### 3.6 Mechanical rename invariants

For structured or persisted identifiers, "the tests pass" is not enough. Add the following invariants where applicable:

- `parse(format(x))` round-trips every canonical attempt/stage/config identity;
- every currently constructible live solver action has a unique canonical identity;
- every supported legacy identity parses to exactly one canonical structured identity;
- two behaviorally distinct legacy identities may not collapse to one canonical identity;
- canonical formatting is deterministic and snapshot-tested;
- CLI examples quote canonical identities containing shell metacharacters such as `|`;
- normalize/denormalize round trips preserve existing level wire fields and persistent fingerprints byte-for-byte unless a separately authorized schema migration says otherwise;
- direct symbol/file renames leave no live old-name imports, spawns, workflow filters, or package aliases after their compatibility window closes;
- behavior-preserving solver renames compare representative attempt order, stage order, work/node accounting, and solved outcomes before/after, not merely final solved count.

For workflow/file changes, run a case-sensitive path audit. The current repository already contains at least one naming-era hazard of this class: `.github/workflows/audit-export.yml` watches **modules/Solver.ts** while the live facade is `modules/solver.ts`. Correct stale trigger paths when that workflow is migrated; do not preserve them as historical spelling.

## 4. Canonical rename inventory

> **Notation:** backticked paths/commands in this current authority exist now. Future canonical paths and package aliases are shown in **bold** until the implementation PR creates them; this keeps the documentation contract checker from treating planned names as already-runnable repository surfaces.

The names below are fixed. Do not substitute alternatives.

### 4.1 Solver level metrics and routing

| Current | Canonical | Migration |
|---|---|---|
| `getNavigableArea` | `getNonGateWinningPathCellCount` | direct internal rename |
| `getNavigableDensity` | `getRequiredPathCoverageRatio` | direct internal rename |
| `navDensity` | `requiredPathCoverageRatio` | direct internal rename |
| `NEAR_HAMILTONIAN_DENSITY` | `NEAR_HAMILTONIAN_COVERAGE_THRESHOLD` | direct internal rename |
| `DENSE_LEVEL_NAV_DENSITY` | `DENSE_LEVEL_COVERAGE_THRESHOLD` | direct internal rename |
| `detectArchetype` | `classifyRoutingRegime` | direct internal rename |
| `STRATEGY_ARCHETYPE_ROUTING` | `STRATEGY_ROUTING_REGIME_SELECTION` | dual-read in flag/config parsing while historical experiment metadata remains readable |
| `scripts/stress/select-archetype-sample.mjs` | `scripts/stress/select-routing-regime-sample.mjs` | direct tool rename |
| `.github/workflows/solver-archetype-sample-ab.yml` | `.github/workflows/solver-routing-regime-sample-ab.yml` | workflow rename; historical runs keep old identity |
| workflow/input/output `archetype` / `archetypes` for that sampler | `routingRegime` / `routing_regimes` | live workflow/tool schema rename |
| "archetype" when referring to this classifier | "routing regime" | live docs/telemetry labels |
| former `archetype.ts` / `archetype.test.ts` solver module paths | `modules/solver/routing-regime.ts` / `routing-regime.test.ts` | direct file rename; this module now contains routing-regime classification only |
| `default` routing value | `general` | dual-read if persisted |
| `near-closure` | `sparse-low-intersection` | dual-read if persisted |
| `high-intersection-burden` | `intersection-heavy` | dual-read if persisted |
| `must-cross-heavy` | `must-cross-heavy` | retain value |
| `portal-heavy` | `multi-portal` | dual-read if persisted |

The formula for `getRequiredPathCoverageRatio` remains exactly `requiredLength / getNonGateWinningPathCellCount(level)`. The helper comment must explicitly state that the denominator excludes blocks, geese, false goals, and gates and includes the ordinary goal and other usable mechanic cells. No thresholds change.

For level schema vocabulary:

- serialized/raw corpus fields `reqLen` and `reqInt` remain readable forever;
- normalized/runtime TypeScript fields become `requiredLength` and `requiredIntersections`;
- raw parsers accept the historical fields and populate the expanded normalized names;
- writers continue to emit the existing wire fields until a separately authorized wire-format version exists;
- all solver/application code must stop using naked `reqLen`/`reqInt` once the normalized boundary migration is complete.

This internal expansion is intentionally late in the sequence because it is broad, but the target names are fixed.

#### Current missing-attempt-exposure analyzer

The live residual analyzer introduced on 2026-08-28 spans both routing and attempt identity. Its canonical surface is fixed now so PR 3 and PR 4 do not invent incompatible halves:

| Current | Canonical | Phase |
|---|---|---|
| `scripts/stress/current-missing-exposure-audit.mjs` | `scripts/stress/analyze-current-missing-attempt-exposure.mjs` | PR 3 |
| default output `tmp/current-missing-exposure-audit.json` | `tmp/current-missing-attempt-exposure.json` | PR 3 |
| local/result `archetype` | `routingRegime` | PR 3 |
| `rankedTechniqueArchetypeCandidates` | `rankedAttemptConfigRoutingRegimeCandidates` | PR 4 |
| `rankedBeamTechniqueArchetypeCandidates` | `rankedBeamAttemptConfigRoutingRegimeCandidates` | PR 4 |
| `overallTechniqueCandidates` | `overallAttemptConfigCandidates` | PR 4 |
| row/result `technique` when it contains an exact `attemptConfigKey` | `attemptConfigIdentity` | PR 4 |
| internal `censusByLevelTechnique` | `censusByLevelAttemptConfig` | PR 4 |

Its source census may continue to use historical `techniqueKeys` until the technique-census schema migration in PR 8; PR 4 must parse that legacy field rather than rewrite frozen census artifacts.

### 4.2 Attempt identity and admissible-order search

The current ad-hoc attempt identity grammar is replaced by the following canonical grammar.

#### DFS

`dfs|score=<profileId>|bias=<orderingBiasId-or-none>`

#### Beam

`beam|score=<profileId>|bias=<orderingBiasId-or-none>|width=<integer>|retention=<plain|mechanic-buckets>`

#### Repair search

`repair|score=repair|guidance=<standard|turn-biased|must-turn-biased>`

#### Admissible-order search

`admissible-order|tieBreak=<profileId-or-none>|lds=<on|off>`

The old forms, including `ida:*`, `dfs:*`, `beam:*@beam*`, `(diverse)`, and `:repair`, become legacy input syntax only.

Implementation requirements:

Before switching writers, migrate `scripts/stress/select-attempt-exposure-sample.mjs` from `--technique=<attemptConfigKey>` to `--attempt-config=<attemptConfigIdentity>`, rename its internal `TECHNIQUE` variable accordingly, and write `attemptConfigIdentity` instead of `technique` in new sample JSON. Accept `--technique` as a compatibility alias for one migration window only; if both are supplied with different values, fail loudly.

1. create a single canonical parser/normalizer for legacy and new attempt identities;
2. make all current consumers use the parsed structure rather than string slicing/suffix tests;
3. switch `formatAttemptIdentityKey` to emit the new grammar only after all live readers accept both grammars;
4. add fixture tests for representative old keys, including:
   - `ida:none`;
   - `ida:default(lds)`;
   - `dfs:perimeterSweep/perimeterCW`;
   - `beam:intersectionHarvest@beam5000(diverse)`;
   - `dfs:repair:repair`;
   - biased repair variants;
5. preserve historical raw strings in frozen artifacts;
6. update method-probe help, tooling catalog examples, census tooling, portfolio tooling, lineage tooling, baseline compilers, and scheduler/action-key consumers.

The scheduler/research action identity remains stage plus canonical config plus repair seed, but its formatter must use named components internally rather than concatenating unparsed fragments.

### 4.3 Solver API aliases

Canonical public solver operation: **`solveLevel`**.

Remove:

- `universalSolveLevel`;
- `solve`.

Migrate all repository consumers to `solveLevel` in the same PR, update `SolverApi`, tests, fakes, ports, and documentation, then remove both aliases. Pathfinder does not maintain a separately versioned external solver package API, so keeping three identical names has no compatibility value inside this repository.

### 4.4 Scoring profiles and structural ordering bias

The existing profile IDs remain stable configuration IDs because their weight vectors do not admit honest one-word semantic replacements. The cleanup fixes their category and presentation rather than inventing new misleading labels.

Rename code concepts:

| Current | Canonical |
|---|---|
| `POLICY_PROFILES` | `SCORING_PROFILES` |
| `PROFILE_ORDER` | `SCORING_PROFILE_ORDER` |
| naked `profileName` in solver action/config types | `scoringProfileId` |
| `TEMPLATES` | `STRUCTURAL_ORDERING_BIASES` |
| `StructuralTemplate` | `StructuralOrderingBias` |
| `template` in attempt config | `orderingBias` |
| `templateId` | `orderingBiasId` |
| `TEMPLATE_CONFIG_KEYS` | `ORDERING_BIAS_CONFIG_KEYS` |

The profile IDs such as `objectiveFirst`, `harvestThenFinish`, `knotBuilder`, and `perimeterSweep` remain as historical/stable profile identifiers, but every current doc, CLI, telemetry display, and research table must qualify them as scoring profiles. Do not call them techniques without also naming the search family.

The special `repair` scoring profile remains the ID `repair`, but output must display it as `score=repair`; the search family is separately `repair`. This removes the current ambiguity without fabricating a new weight-vector name.

### 4.5 Beam retention vocabulary

The current "diverse beam" mechanism is specifically mechanic-bucket retention. Canonical terminology:

| Current | Canonical |
|---|---|
| diverse beam | mechanic-bucket retention |
| `diverseBeam` | `mechanicBucketRetention` |
| attempt-key `(diverse)` | `retention=mechanic-buckets` |
| beam "dedup" coarse key | coarse state key |
| beam "dedup" coarse merge | coarse state merge |
| true exact duplicate removal | dedup |

Rename the near-tie mechanism and related feature symbols from `DEDUP_NEAR_TIE_*` to `COARSE_STATE_NEAR_TIE_RETENTION_*`. Legacy feature-flag names remain accepted by ablation/config parsing until all retained scripts and workflows are migrated.

Any documentation that describes the coarse merge must explicitly state that it is width/retention management and not exact future-state equivalence.

### 4.6 Solver stage IDs

Stage IDs are persisted research/telemetry identity and therefore use dual-read, single-write migration.

| Current stage ID | Canonical stage ID |
|---|---|
| `prime` | `explicit-prime` |
| `repair-probe` | `early-repair-search` |
| `main-loop` | `main-search` |
| `repair-fallback` | `repair-fallback` |
| `attraction-diversity` | `goal-attraction-disabled-retry` |
| `repair-probe-shrink-recovery` | `repair-shrink-recovery` |
| `admissible-order` | `admissible-order-fallback` |
| `dedup-near-tie-retry` | `coarse-state-near-tie-retention-disabled-retry` |
| `admissible-order-non-default-retry` | `admissible-order-alternate-tiebreak-retry` |
| `connectivity-axis-exhausted-retry` | `connectivity-axis-prune-disabled-retry` |
| `repair-elite-prefix-dfs-retry` | `repair-elite-prefix-dfs-retry` |
| `mc-neighbor-budget-retry` | `must-cross-neighbor-prune-disabled-retry` |
| `repair-late-probe` | `late-repair-search` |
| `goal-attraction-legacy-distance-retry` | `guidance-goal-distance-retry` |
| `repair-late-probe-multi-seed-retry` | `late-repair-multiseed-retry` |
| `portfolio-pass` | `legacy-latency-portfolio-pass` |
| `portfolio-fallback` | `legacy-latency-portfolio-fallback` |

Also rename:

- `SCORE_GOAL_ATTRACTION_LEGACY_DISTANCE` -> `SCORE_GOAL_ATTRACTION_GUIDANCE_DISTANCE`;
- local variables and telemetry derived from that feature accordingly;
- `portfolio-experiment.ts` -> `legacy-latency-portfolio-experiment.ts`;
- `PORTFOLIO_EXPERIMENT` -> `LEGACY_LATENCY_PORTFOLIO_EXPERIMENT`.

The `guidanceGoalDistArr` implementation is the factual basis for the new goal-distance stage/flag name.

Stage migration must update all of:

- `stage-policy.ts`;
- `techniqueLifecycle` -> `stageLifecycle` in solve results, workflow output, reducers, and analysis tooling; retained generated JSON is dual-read;
- `stage-plan.ts`;
- `stage-budget.ts`;
- `stage-executors.ts`;
- orchestration;
- legacy stage-tag projection;
- attempt/result types;
- worker messages;
- report and JSON projection;
- hint provenance/invocation identity;
- scheduler/action identity;
- ablation ledger and config metadata;
- current docs;
- test fixtures;
- any reducer with a hard-coded stage list.

Add a single `normalizeSolverStageId()` compatibility function and route every historical-data reader through it. Do not duplicate old-to-new maps.

#### Scheduler mode and stage metadata

The current public/research scheduler vocabulary also carries historical names and must be migrated with the stage IDs.

| Current | Canonical | Migration |
|---|---|---|
| scheduler mode `legacy` | `production` | dual-read if persisted |
| scheduler mode `portfolio-experiment` | `legacy-latency-portfolio-experiment` | dual-read if persisted |
| `PortfolioExperimentDefinition` | `LegacyLatencyPortfolioExperimentDefinition` | direct type rename |
| `portfolioExperiment` option | `legacyLatencyPortfolioExperiment` | dual-read only if external/generated configs persist it |
| result field `portfolio` | `legacyLatencyPortfolioExperiment` | dual-read generated JSON, single-write canonical |
| attempt `schedulerPhase: 'portfolio'` | `'legacy-latency-portfolio'` | dual-read if persisted |
| `StageBudgetPolicyId: 'additive-fraction'` | `'additive-wall-multiplier'` | direct/internal unless persisted |

`SolverStageDisposition` must describe current policy, not promotion history. Rename it to `SolverStagePolicyStatus`; canonical current values are `production-default`, `opt-in`, and `experiment-only`. Existing `promoted` rows normalize to `production-default`; the fact that a stage was promoted belongs in the experiment ledger/report history rather than the runtime policy-status enum.

Do not retain a generic `legacy` scheduler mode after migration. "Legacy latency" remains in the historical wall-clock experiment's identity specifically because its historical scheduling semantics are the selected behavior.

### 4.7 False-goal triggerability search

Use **false-goal triggerability** as the internal domain term. "Trap" may remain player-facing copy where the game UI intentionally uses that word.

Canonical API:

| Current | Canonical |
|---|---|
| `findTrapSpots` | `findTriggerableFalseGoalCells` |
| `TrapSearchResult` | `FalseGoalTriggerSearchResult` |
| `TrapProgress` | `FalseGoalTriggerSearchProgress` |
| `TrapOpts` | `FalseGoalTriggerSearchOptions` |
| `spots` | `triggerableCells` |
| `FalseGoalStatus` | `FalseGoalTriggerability` |
| `reachable` | `triggerable` |
| `unreachable` | `untriggerable` |
| `classifyFalseGoals` | `classifyFalseGoalTriggerability` |
| `isParityReachableEndpoint` | `isParityCompatibleEndpoint` |
| `getTrapSpotBudgetMs` | `getFalseGoalTriggerSearchBudgetMs` |
| `timeLimit` | `timeLimitMs` |

Canonical result status values:

- `complete`;
- `partial`;
- `aborted`.

Remove the misleading `ok` field from the canonical result. `partial` covers timeout/incomplete enumeration. Do not keep a separate `timedOut` boolean in the canonical structure; derive incompleteness from `status !== 'complete'`.

For compatibility, the old `findTrapSpots` public adapter may exist only during the migration PR series and must project the canonical result back to the historical shape for any remaining live consumer. Once all repository consumers use the new API, remove the adapter. Historical serialized data readers, if any, retain legacy-field support.

Rename `trap-search.ts` to `false-goal-trigger-search.ts` and update imports, comments, tool names, tests, editor diagnostics, and solver API ports.

The internal boundary migration is also fixed, not left to implementer invention:

| Current | Canonical |
|---|---|
| worker request `TRAP` | `FALSE_GOAL_TRIGGER_SEARCH` |
| worker event `TRAP_PROGRESS` | `FALSE_GOAL_TRIGGER_SEARCH_PROGRESS` |
| worker event `TRAP_RESULT` | `FALSE_GOAL_TRIGGER_SEARCH_RESULT` |
| `trap-scan-controller.ts` | `false-goal-trigger-scan-controller.ts` |
| `trap-scan-core.ts` | `false-goal-trigger-scan-core.ts` |
| `createTrapScanController` | `createFalseGoalTriggerScanController` |
| `runTrapSearch` | `runFalseGoalTriggerSearch` |
| editor `trapScanState` | `falseGoalTriggerScanState` |
| editor `validTrapSpots` | `triggerableFalseGoalCells` |
| editor `trapParityCandidates` | `falseGoalTriggerParityCandidates` |
| corresponding `*TrapSpots` / `*TrapParityCandidates` state actions | `*TriggerableFalseGoalCells` / `*FalseGoalTriggerParityCandidates` |
| `trap-search-audit.mjs` | `audit-false-goal-triggerability.mjs` |
| historical npm alias **solver:trap-audit** | **solver:audit-false-goal-triggerability** |

The canonical worker/result status values are `complete`, `partial`, and `aborted`. Legacy `done` and `timeout` values are read only where historical/generated payloads require them. Update editor completion checks in the same PR so no live caller still tests `status === 'done'`.

Player-facing "Trap" / "Trap Spots" wording may remain where it is intentionally UI language. Internal code, worker protocol, telemetry, and developer tooling use false-goal triggerability terminology.

### 4.8 Repair completion helper and prune pipeline

| Current | Canonical |
|---|---|
| `closeLengthGap` | `searchCompletionFromPartialPath` |
| reports/docs phrase "solved by closeLengthGap" | "solved by partial-path completion search" |
| `prune-gauntlet.ts` | `hard-prune-pipeline.ts` |
| "prune gauntlet" | "hard-prune pipeline" |

The rename must not alter the helper's bound, reconstruction behavior, or pruning order.

### 4.9 Budget names

If `REPAIR_EXTRA_BUDGET_FRACTION` still exists after the current budget-model migration reaches the file, rename it to `REPAIR_ADDITIVE_BUDGET_MULTIPLIER`. Its value and semantics remain unchanged. If the prerequisite budget migration removes the constant entirely, do not recreate it solely to perform the rename.

Also rename the live option/local vocabulary that exposes the same >1 quantity:

| Current | Canonical |
|---|---|
| `repairBudgetFractionOverride` | `repairAdditiveBudgetMultiplierOverride` |
| resolved/local `repairBudgetFraction` | `repairAdditiveBudgetMultiplier` |
| stage budget policy `additive-fraction` | `additive-wall-multiplier` |

The word `fraction` is reserved for quantities constrained to `[0,1]`. A value that may legitimately be `6.0` is a multiplier. Do not mechanically rename genuine reserve/share fractions that are clamped to `[0,1]`.

All time-valued options/fields must carry an `Ms` suffix unless the type itself is an explicitly named duration object.

### 4.10 Application orientation vs research level variants

Reserve **variant** for generated/research level relatives.

Runtime rotation/reflection uses **orientation**.

| Current | Canonical |
|---|---|
| runtime `variant` | `orientation` |
| `setVariant` | `setOrientation` |
| `eng.variant` | `eng.orientation` |
| geometry argument `variant` | `orientation` |
| docs describing the 8 transforms as variants | orientations |

Do not rename "variant" in `variant-level-research.md`, family datasets, variant generators, or related provenance.

All orientation changes must update:

- engine state/types/default initialization;
- level transform/geometry helpers;
- renderer;
- pointer-to-grid inverse transforms;
- editor rotate/flip paths;
- tests and snapshots;
- command glossary;
- any serialization if runtime orientation is persisted.

### 4.11 Profile, fingerprint, family, lineage, residual

These terms remain valid only with qualifiers.

Required canonical forms in new/current text and exported APIs:

- `scoringProfile` / `scoringProfileId`;
- `solutionProfile`;
- `levelFingerprint`;
- `solverFingerprint`;
- `solutionFingerprint`;
- `levelFamily`;
- `attemptFamily` only where it genuinely groups attempts;
- `searchFamily` for DFS/beam/repair/admissible-order mechanism families;
- `knownSolutionPrefixSurvival` for the current beam "winning lineage" concept;
- `residualLevelSet`, `residualSearchState`, or another explicit qualifier instead of naked `residual` in APIs.

Rename current instrument and implementation names:

- `solver-winning-lineage-survival-analysis.md` -> `solver-known-solution-prefix-survival.md`;
- `analyze-lineage-mechanics.mjs` -> `analyze-known-solution-prefix-survival.mjs`;
- `modules/solver/research-lineage.ts` -> **modules/solver/known-solution-prefix-survival.ts**;
- `WinningPrefixIndex` -> `KnownSolutionPrefixIndex`;
- `WinningLineageObserver` -> `KnownSolutionPrefixSurvivalObserver`;
- `LineageStageSummary` -> `KnownSolutionPrefixStageSummary`.

Update the research-observer type references, tests, testing API, beam instrumentation, and current analysis/collector imports in the same PR. The word `lineage` may remain only in historical reports/artifacts and legacy-field readers.

### 4.12 Runtime action vocabulary

The current `ActionType` mixes requested commands and emitted outcomes. Do not preserve that ambiguity.

Split it into:

- `GameCommandType`: `MOVE`, `UNDO`, `RESET`, `LEVEL_LOAD`, `LEVEL_ADVANCE`, `LEVEL_PREV`, `LEVEL_RESTART`;
- `GameEventType`: `BACKTRACK`, `PORTAL_TRAVERSE`, `GOOSE_TRIGGERED`, `FALSE_GOAL_DETONATED`, `WIN`, `LOGIC_STATE_CHANGE`.

Update step-processor/dispatcher types so a variable named "event" carries `GameEventType` and a variable named "command" carries `GameCommandType`. Keep state mutation helpers under `state/actions/` described as **state actions**. Update `docs/command-glossary.md` to distinguish all three meanings.

This is a type/vocabulary split only. Event ordering and dispatch behavior must remain unchanged.

### 4.13 Application compatibility bags

Do not merely rename the current junk-drawer facades.

#### `core.ts`

Perform a behavior-preserving extraction and then delete `core.ts`:

- move audio ownership to **modules/audio-service.ts**;
- `SOUND_BUS` -> `audioService`;
- expose `createAudioService`;
- move stable app constants/status enums to **modules/app-constants.ts**;
- keep DOM lookup helpers local to consumers rather than in a global "core" bag;
- replace injected `core` dependencies with the specific constants/audio dependencies each consumer uses;
- remove `createCore` when no consumer remains.

#### `level-utils.ts`

Treat it as a compatibility facade and delete it after direct imports are complete. New and migrated callers import the owning domain module directly:

- cell keys -> `domain/cell-key`;
- geometry -> `domain/geometry`;
- level parsing/cloning/remapping -> `domain/level-codec`;
- move legality -> `domain/move-rules`;
- portal behavior -> `domain/portal-utils`;
- schema validation -> `domain/level-schema`.

Do not add new exports to `LevelUtils` during the cleanup.

#### State/UI names

- `HinterState` -> `HintDisplayState`;
- top-level mutable `ENGINE` property -> `engineState`;
- `publicDrawPath` local helper -> `drawPathWithCurrentOrientation`;
- `pendingAction` -> `pendingConfirmationAction` if and only if the existing value is the queued confirm action described by the runtime state contract. Current implementation does use it for that purpose, so perform this rename across state/actions and engine methods.

These are late-stage application cleanups because they touch broad surfaces but have low persisted-data risk.

The word `core` is not banned globally. The problem with top-level `modules/core.ts` is its mixed-responsibility bag. Retain narrowly qualified `*-core.ts` modules when "core" has a documented architectural meaning, specifically the pure transition/input cores described by ADR 0006. Likewise, `state/actions/core-actions.ts` may retain its name while it specifically means actions on the top-level/core state slice. The permanent naming authority must record this distinction so future agents do not "clean up" intentional `*-core` architecture.

## 5. Research and tooling rename inventory

The following public/surfaced tool names are canonical.

### 5.1 Solver regression and performance

- npm `solver:bench` -> **solver:regression**;
- underlying solved-set command/file should use "regression" terminology;
- keep `solver:bench` as a deprecated npm alias during one migration PR only, then remove it after workflows/docs are updated;
- performance measurement remains `solver:speed-probe` until the tool-convention PR, where it becomes **solver:measure-speed**;
- `stress:benchmark` -> **stress:measure-solver** because it is actual corpus solver measurement.

Current docs must say explicitly: solved-set regression is not a speed benchmark.

### 5.2 Direct solver

- `run-solverv2-direct.mjs` -> `run-solver-direct.mjs`;
- npm `solver:direct` remains canonical because the public alias is already clear.

### 5.3 Hint validation

- `hint-path-oracle.mjs` -> `validate-hint-paths.mjs`;
- corresponding npm/test alias -> **test:hint-path-validation**;
- documentation must state that it uses the canonical production referee/validator and is not independent.

### 5.4 CP-SAT

- `cpsat-full-probe.py` -> `cpsat-reference-probe.py`;
- keep the documented mechanic support matrix beside the tool;
- `cpsat-explicit-prefix-oracle.mjs` -> `cpsat-explicit-prefix-reference.mjs`;
- use "oracle" only for the genuinely independent `scripts/solver-oracle/` implementation.

### 5.5 Atlas, trove, archaeology, lineage

- `atlas-sweep.mjs` -> `collect-prune-gap-labels.mjs`;
- "branch atlas" -> "labelled branch set";
- `family-wide-trove-manifest.mjs` -> `build-variant-family-dataset-manifest.mjs`;
- "trove" -> "variant-family dataset" in current docs and tool output;
- "winning-path archaeology" -> "winning-path analysis";
- "winning lineage" -> "known-solution-prefix survival" as specified above.

Do not rename historical report filenames containing atlas/trove/archaeology/lineage.

### 5.6 Technique census second-order analysis

- `technique-census-second-order.mjs` -> `analyze-technique-census.mjs`;
- `technique-census-second-order-analysis.md` -> `technique-census-analysis.md`;
- update tooling catalog and docs index;
- current explanatory text names the actual analyses: outcome similarity, phenotype/multiplicity, cover/oracle frontier, substitution, budget tranche/cap economics, censoring, and production joins.

### 5.7 Audit export

Rename `run-audit-export.mjs` to `analyze-solver-diagnostics.mjs`.

Rename generated fields:

- `knownHardCluster` -> `hardClusterHeuristicMatch`;
- `recommendedGating` -> `derivedGatingCandidate`;
- preserve legacy-field reads for existing generated JSON;
- write only the new fields after all current consumers accept both.

Replace the opaque npm alias `audit:newhint:full` with **solver:analyze-diagnostics**. Remove the old alias after current docs/workflows are migrated.

### 5.8 Probe overloading

Rename surfaced tools according to Section 2.6 when touched by this cleanup:

- speed probe -> measure speed;
- reference-model calls -> reference;
- validators -> check/validate;
- isolated technique execution -> run;
- diagnostic bounded samplers may retain `probe`.

In particular, `repair-direct-probe.mjs` is isolated technique execution rather than a diagnostic sampler. Rename it to `run-repair-search.mjs`, and rename `repair-direct-probe-worker.mjs` to `run-repair-search-worker.mjs`. Update current documentation/reproduction commands together.

Do not perform blind filename replacement across cold historical scripts. The surfaced-tool inventory in `docs/tooling-catalog.md`, `scripts/README.md`, `.github/workflows/README.md`, and `package.json` is the required migration scope.

### 5.9 Surfaced pilot commands

The following commands are already surfaced and therefore are no longer unnamed/disposable pilots. Give them behavior names:

| Current file / alias | Canonical file / alias |
|---|---|
| `stress/winning-lineage-pilot.mjs` / `solver:winning-lineage-pilot` | `stress/collect-known-solution-prefix-survival.mjs` / **solver:collect-known-solution-prefix-survival** |
| `stress/winning-prefix-atlas-pilot.mjs` / `solver:winning-prefix-atlas-pilot` | `stress/collect-known-solution-prefix-branches.mjs` / **solver:collect-known-solution-prefix-branches** |
| `stress/producer-population-pilot.mjs` / `solver:producer-population-pilot` | `stress/compare-search-producer-populations.mjs` / **solver:compare-search-producer-populations** |
| `stress/residual-interface-mining-pilot.mjs` / `solver:residual-interface-pilot` | `stress/analyze-residual-interfaces.mjs` / **solver:analyze-residual-interfaces** |
| `stress/repair-rollback-census-pilot.mjs` / `solver:repair-rollback-pilot` | `stress/census-repair-rollback-windows.mjs` / **solver:census-repair-rollback-windows** |
| `stress/symmetry-repair-seed-pilot.mjs` / `solver:symmetry-repair-seed-pilot` | `stress/compare-symmetry-repair-seed.mjs` / **solver:compare-symmetry-repair-seed** |
| `stress/restart-continuation-population-pilot.mjs` | `stress/compare-repair-restart-continuation-population.mjs` |
| `stress/analyze-equal-work-census-pilot.mjs` | `stress/analyze-equal-work-census.mjs` |

The restart/continuation tool is not currently a package alias, but it is active durable research machinery referenced by current decision documents, so its lifecycle label is still inappropriate. Historical report filenames containing `pilot` remain frozen.

### 5.10 Live workflow and dataset-tool identities

A script rename is incomplete if the workflow, package alias, environment variable, artifact, or concurrency identity keeps the misleading term.

Canonical live mappings:

| Current | Canonical |
|---|---|
| `.github/workflows/atlas-sweep.yml` | `.github/workflows/collect-prune-gap-labels.yml` |
| workflow display/concurrency "atlas-sweep" | "collect-prune-gap-labels" |
| `.github/workflows/cpsat-explicit-prefix-oracle.yml` | `.github/workflows/cpsat-explicit-prefix-reference.yml` |
| workflow/job display "oracle" for that CP-SAT model | "reference" |
| `.github/workflows/family-wide-trove.yml` | `.github/workflows/collect-variant-family-dataset.yml` |
| `family-wide-trove-manifest.mjs` | `build-variant-family-dataset-manifest.mjs` |
| `family-wide-trove-shard-run.mjs` | `collect-variant-family-dataset-shard.mjs` |
| `family-wide-trove-shard-slice.mjs` | `plan-variant-family-dataset-shard.mjs` |
| `family-wide-trove-combine.mjs` | `merge-variant-family-dataset-shards.mjs` |
| `family-trove-doctor.mjs` | `validate-variant-family-dataset-worktree.mjs` |
| npm `family:trove:doctor` | **family:validate-dataset-worktree** |
| env `PATHFINDER_VARIANT_TROVE` | `PATHFINDER_VARIANT_FAMILY_DATASET_ROOT` |
| local `TROVE_BRANCH` | `VARIANT_FAMILY_DATASET_BRANCH` |
| `.github/workflows/audit-export.yml` | `.github/workflows/solver-diagnostics.yml` |
| workflow display "Audit Export" | "Solver diagnostics and hint capture" |
| `stress/confirm-residual-001-archetype-audit.mjs` | `stress/audit-candidate-eligibility-and-participation.mjs` |
| `stress/select-repair-probe-adaptive-sample.mjs` | `stress/select-early-repair-search-adaptive-sample.mjs` |
| `stress/repair-probe-badness-report.mjs` | `stress/early-repair-search-badness-report.mjs` |
| `.github/workflows/solver-repair-probe-adaptive-sample-ab.yml` | `.github/workflows/solver-early-repair-search-adaptive-sample-ab.yml` |
| `portfolio-scheduler-report.mjs` / npm `solver:portfolio-report` | `legacy-latency-portfolio-report.mjs` / **solver:legacy-latency-portfolio-report** |
| `portfolio-historical-replay.mjs` / npm `solver:portfolio-replay` | `legacy-latency-portfolio-replay.mjs` / **solver:legacy-latency-portfolio-replay** |

The `confirm-residual-001` diagnostic explicitly describes itself as durable general tooling, so its permanent name must describe its reusable job rather than the cohort that caused it to be written. The early-repair-search filenames migrate in the same PR as the stage identity so current tools/workflows do not preserve `repair-probe` after the runtime stage has changed.

The dataset-root environment variable uses dual-read/single-prefer-new for one compatibility window because developers or CI may have it configured outside git. New docs/workflows write only `PATHFINDER_VARIANT_FAMILY_DATASET_ROOT`.

When renaming workflows, also migrate current job labels/IDs, concurrency groups, newly emitted artifact names, default input descriptions, and current README/catalog entries. Historical workflow-run artifacts retain their historical names. Fix the stale **modules/Solver.ts** path filter in the diagnostics workflow to the live `modules/solver.ts` spelling.

`method-probe` remains valid terminology because it is genuinely bounded diagnostic single-method execution; do not rename it merely because other uses of "probe" are being corrected.


### 5.11 GitHub Actions result retrieval

The standardized result publisher and protocol names introduced after this plan's original audit are already behavior-descriptive and remain canonical:

- `solver-sweep-result`;
- `pathfinder-solver-sweep-result`;
- `gha-source-run`;
- `pathfinder-gha-source-run`;
- `publish-solver-sweep-result.mjs`;
- `check-solver-sweep-result-contract.mjs`;
- package alias `check:solver-sweep-results`.

Rename only the noun-only retrieval command:

| Current | Canonical |
|---|---|
| `scripts/gha-result.mjs` | `scripts/fetch-gha-result.mjs` |
| package alias `gha:result` | **gha:fetch-result** |

Update `AGENTS.md`, `scripts/README.md`, `docs/tooling-catalog.md`, `.github/workflows/README.md`, the contract checker, package aliases, and current workflow/tooling documentation together. The artifact/provenance protocol strings themselves do not change.

### 5.12 Solver-sweep report combination and live corpus outputs

The generic report combiner has outgrown both `portfolio` and `corpus2` in its surfaced names:

| Current | Canonical |
|---|---|
| `scripts/portfolio-sweep-reports-to-benchmark.mjs` | `scripts/combine-solver-sweep-reports.mjs` |
| package alias `solver:combine-corpus2-batches` | **solver:combine-sweep-reports** |
| live output `reports/stress/benchmark-parallel.json` | `reports/stress/solver-corpus1-latest.json` |
| live output `reports/stress/benchmark-latest-random.json` | `reports/stress/solver-corpus2-latest.json` |

The combiner may continue to describe its output schema in comments as `stress:benchmark`-shaped until PR 9 renames that measuring command, but its executable identity is generic combination, not portfolio scheduling or benchmarking. Update every maintained workflow, current doc, package alias, and current reader of the live output paths. Do not rename dated/frozen benchmark artifacts.

## 6. Data and corpus terminology

Canonical corpus names remain:

- `published`;
- `corpus1`;
- `corpus2`.

The historical files `data/stress/stress-levels.json` and `data/stress/stress-levels-random.json` are not renamed because they are stable data paths with broad historical references. Instead:

1. all current CLI help and docs call them Corpus 1 and Corpus 2;
2. no new command, variable, report, or alias may call Corpus 2 "random" or "randoms";
3. central corpus-path helpers map canonical names to the historical filenames;
4. scripts must consume that helper instead of embedding the old filenames when practical.

Rename the current broad directory concept in documentation from "stress scripts" to **solver research scripts**, but do not physically move `scripts/stress/` in this cleanup. A directory move would create large path/provenance churn for little semantic gain. Add a README note that `scripts/stress/` is a historical path containing the solver-research toolset.

## 7. Current roadmap terminology

`docs/solver-optimization-current-queue.md` currently uses stable workstream numbers as if they were a live rank. Fix the model without renumbering historical references.

Canonical structure:

1. **Immediate execution priority**: ordered list of what should be worked next;
2. **Active workstreams**: stable workstream IDs and status;
3. **Promoted/completed workstreams**;
4. **Closed negative workstreams**;
5. **Deferred workstreams**.

The existing numbers remain **workstream IDs**, not rank. Current documentation must stop calling "#1", "#2", etc. priorities unless referring to the explicit current execution order.

Rename the document to `solver-optimization-workstreams.md`. Update:

- `AGENTS.md`;
- `docs/README.md`;
- solver research operating model;
- evaluation/scheduling/budget docs;
- current tooling help;
- adapters;
- documentation links.

Historical reports keep the old queue filename/text.

The current execution order at the time this plan is written remains owned by that workstream document; this naming plan must not duplicate volatile solver priority beyond specifying the structural vocabulary.

The umbrella workstream currently called "Automatic configuration / portfolio construction" becomes **Automatic solver action selection**. "Portfolio" remains only when describing a measured set/combination of actions or the legacy latency portfolio experiment.

## 8. Shadow, oracle, referee, producer/receptor vocabulary

### 8.1 Shadow

Rename the offline replay instrument:

- `solver-shadow-eval-harness.md` -> `solver-offline-replay-harness.md`;
- `interface-probe-harness.mjs` -> `offline-replay-harness.mjs`.

Use "shadow" only for true parallel execution that does not affect production behavior.

### 8.2 Referee and reference

Use:

- **referee** for the canonical game-rule validator;
- **independent reference solver** for `scripts/solver-oracle/`;
- **CP-SAT reference model** for CP-SAT tooling;
- **validator** for tools that call the referee.

### 8.3 Producer/receptor

Replace the `producer -> receptor` vocabulary in `solver-future-work.md` and current scheduler docs with **producer -> consumer**. Replace "receptor limitation" with **consumer limitation** and "receptor can rediscover" with **consumer can rediscover**.

## 9. Machine-readable rename ledger

PR 1 must create `docs/naming-cleanup-ledger.json` beside this plan. It is a temporary execution ledger, not a runtime schema.

Each entry must contain:

```json
{
  "old": "string",
  "new": "string",
  "kind": "symbol|stage-id|attempt-id|tool|file|doc|field|term|workflow|package-alias|env|protocol|status-value",
  "risk": "low|medium|high",
  "persistence": "none|dual-read|frozen-history",
  "phase": 1,
  "status": "pending|in-progress|done",
  "notes": "short fixed migration note"
}
```

Populate it with every explicit mapping in Sections 4-8 before implementing code renames, including workflow/package/env/protocol mappings. Also add an entry for each potentially confusing live term that the final census intentionally retains; for retained terms, set `old` and `new` to the same canonical spelling and explain the contextual justification in `notes` (for example the ADR-0006 `*-core` convention or genuine bounded `method-probe`). The ledger is the checklist of record. A rename PR marks only its own entries `done`.

When the cleanup is complete, archive the final ledger under `docs/archive/snapshots/` and replace the temporary live file with a short completion note in the permanent naming/vocabulary authority.

## 10. Permanent naming authority

PR 1 must also create `docs/naming-and-vocabulary.md` containing:

- Section 2 naming contract;
- the final canonical solver dimensions;
- corpus names;
- command/event/state-action distinction;
- referee/reference/oracle distinction;
- orientation vs level variant;
- qualified profile/fingerprint/family terminology;
- tool verb vocabulary.

`docs/README.md` and `AGENTS.md` must route naming/rename work to that file and this implementation plan while cleanup remains active. After completion, they route only to `naming-and-vocabulary.md`; this plan moves to `docs/archive/snapshots/`.

## 11. Required PR sequence

Do not reorder these phases unless a prerequisite change on `main` makes an entry already obsolete. If that happens, mark the ledger entry `done` with the superseding commit and continue.

### Mandatory preflight before PR 1

- reconcile this branch with latest `main` under Section 0;
- regenerate the live naming census and close every unclassified surfaced hit;
- verify every explicit mapping still points at a live concept or a documented historical reader;
- populate rename and retained-term ledger entries before code changes;
- run the documentation-link check after resolving any rebase conflicts.

### PR 1: Contract, ledger, and discoverability

Documentation only.

- create `docs/naming-and-vocabulary.md`;
- create and populate `docs/naming-cleanup-ledger.json`;
- link both from `docs/README.md`;
- add a naming/rename route to `AGENTS.md`;
- add the rename propagation checklist from Section 3 to `docs/change-recipes.md`;
- run documentation-link check.

### PR 2: Roadmap/workstream vocabulary

- rename current queue doc to `solver-optimization-workstreams.md`;
- restructure headings as Section 7 requires;
- rename the configuration workstream to "Automatic solver action selection";
- update all live links/adapters;
- no solver priority/status changes beyond removing rank ambiguity.

### PR 3: Solver metric and routing vocabulary

- coverage helper/constant renames;
- archetype -> routing regime, including `STRATEGY_ARCHETYPE_ROUTING` -> `STRATEGY_ROUTING_REGIME_SELECTION`;
- rename `select-archetype-sample.mjs` and `solver-archetype-sample-ab.yml`, including live workflow input/output/artifact/concurrency labels;
- rename `current-missing-exposure-audit.mjs` and its routing-regime fields per Section 4.1;
- routing value compatibility normalization;
- docs/tests/telemetry updates;
- prove thresholds and selected attempt order are byte-for-byte unchanged for representative fixtures.

### PR 4: Attempt identity v2

- land parser/normalizer;
- migrate all live consumers off raw string slicing;
- add historical fixtures;
- switch writers to canonical grammar;
- update `select-attempt-exposure-sample.mjs` CLI/result fields and the current missing-attempt-exposure analyzer's attempt-config fields;
- update CLI examples/docs/tooling;
- keep legacy reads.

This PR is high risk and requires full CI.

### PR 5: Scoring profile, ordering bias, and beam retention taxonomy

- rename profile category symbols;
- rename template category symbols;
- rename diverse-beam mechanism;
- rename coarse dedup terminology and flags;
- update attempt formatting already prepared by PR 4;
- update operational taxonomy and census tooling.

### PR 6: Solver stage and scheduler identity migration

- add `normalizeSolverStageId`;
- migrate every stage mapping in Section 4.6;
- migrate scheduler modes, experiment option/result names, scheduler phase vocabulary, stage policy-status vocabulary, and additive-wall-multiplier policy names;
- rename live filenames/workflows whose identity is the renamed stage, including the early-repair-search adaptive sampler/report/workflow;
- update all stage/scheduler producers, consumers, worker/report telemetry, provenance, budget planners, and public ports;
- rename `techniqueLifecycle` to `stageLifecycle` with dual-read compatibility for retained generated JSON;
- historical fixtures prove old stage IDs and persisted scheduler modes remain readable;
- identity round-trip/collision tests from Section 3.6;
- full CI.

### PR 7: False-goal triggerability API

- file/API/result/status/field renames;
- worker request/progress/result protocol renames;
- editor scan controller/core/state/action renames;
- audit tool/package alias rename;
- legacy adapter during migration only;
- migrate editor, solver facade, ports, tools, workers, and tests atomically;
- remove adapter after no live consumer remains;
- verify `done -> complete` and `timeout -> partial` compatibility plus unchanged partial-search semantics.

### PR 8: Reference/referee/tool/workflow semantics

- hint oracle rename;
- CP-SAT reference names;
- offline replay rename;
- technique census analysis rename, including `analyze-equal-work-census-pilot.mjs` -> `analyze-equal-work-census.mjs` and the new equal-work cell/test/tooling surfaces;
- atlas/dataset/lineage surfaced-tool renames, including the live research-lineage module/types;
- surfaced pilot-command renames from Section 5.9, including the active restart/continuation population tool;
- durable cohort-named diagnostic rename;
- dataset worktree/env-var migration;
- audit diagnostics rename;
- workflow filenames, display/job names, concurrency groups, current artifact names, path filters, package aliases, catalogs, and workflow docs updated together;
- rename the completed-run retrieval helper `gha:result` / `gha-result.mjs` to **gha:fetch-result** / `fetch-gha-result.mjs` while retaining the `solver-sweep-result` and `gha-source-run` protocol names;
- correct the existing **modules/Solver.ts** workflow path-filter case mismatch.

### PR 9: Regression/performance CLI vocabulary

- `solver:bench` -> **solver:regression**;
- `solver:speed-probe` -> **solver:measure-speed**;
- `stress:benchmark` -> **stress:measure-solver**;
- `portfolio-sweep-reports-to-benchmark.mjs` -> `combine-solver-sweep-reports.mjs` and `solver:combine-corpus2-batches` -> **solver:combine-sweep-reports**;
- move maintained live corpus outputs from `benchmark-parallel.json` / `benchmark-latest-random.json` to `solver-corpus1-latest.json` / `solver-corpus2-latest.json` without rewriting frozen artifacts;
- remove deprecated aliases after all live references are migrated;
- update `AGENTS.md`, testing docs, tooling catalog, scripts/workflows READMEs, package scripts.

### PR 10: Repair/prune/budget terminology

- `closeLengthGap` rename;
- hard-prune pipeline rename;
- budget multiplier/time-unit names;
- no resource-policy change.

Coordinate this PR with the active budget-model workstream so a symbol already removed by budget rationalization is marked superseded rather than recreated.

### PR 11: Orientation vs variant

- runtime state/API/geometry/editor/render rename;
- preserve research level variant terminology;
- full app/unit/e2e coverage relevant to rotate/reflect behavior.

### PR 12: Runtime command/event vocabulary

- split `ActionType`;
- update types, processor/dispatcher, glossary, tests;
- no dispatch behavior change.

### PR 13: Expanded normalized level field names

- raw `reqLen`/`reqInt` remain wire compatibility;
- normalized/runtime fields become `requiredLength`/`requiredIntersections`;
- update parser, domain types, solver, UI, editor, tests, generators that consume normalized levels;
- add old-wire round-trip fixtures;
- full CI and representative corpus parsing checks.

### PR 14: Application facade cleanup

- extract/delete `core.ts`;
- direct-import/delete `level-utils.ts`;
- `HinterState`, `ENGINE`, renderer helper, pending-confirmation renames;
- use architecture boundary checks and browser tests.

### PR 15: Cleanup completion

- run repository-wide legacy-term audit;
- remove temporary aliases whose removal rule is satisfied;
- verify historical fixtures still parse;
- mark ledger complete;
- archive this plan and the completed ledger;
- keep `docs/naming-and-vocabulary.md` as permanent authority;
- update docs index/AGENTS routing accordingly.

## 12. Per-phase propagation checklist

Every implementation PR must explicitly check the relevant rows below in its PR description.

### Solver symbols/configuration

- source definition;
- imports/exports;
- type definitions;
- test API;
- test fakes/mocks;
- comments that encode semantics;
- ablation configuration;
- feature flag help;
- current solver architecture docs;
- operational taxonomy;
- optimization workstreams;
- future-work/ledger if current terminology appears there.

### Attempt/stage identity

- formatter;
- parser/normalizer;
- orchestration;
- alternate scheduler/raced execution;
- worker transport;
- attempt/result telemetry;
- baseline compiler;
- report exporters;
- census rows;
- method probe;
- paired trace;
- winning-prefix survival tooling;
- hint provenance;
- action identity;
- stage budget plan;
- stage metadata;
- generated JSON readers;
- historical fixture tests.

### Tool/file/CLI/workflow rename

- physical filename;
- imports/spawns;
- `package.json` and aggregate test/CI aliases;
- shell commands embedded in docs;
- environment-variable names and compatibility reads;
- `scripts/README.md`;
- `docs/tooling-catalog.md`;
- `.github/workflows/README.md`;
- workflow filename and displayed `name:`;
- workflow job IDs/names;
- workflow `paths`/`paths-ignore` exact-case filters;
- workflow concurrency groups, cache keys, new artifact names, and input descriptions;
- workflow YAML run steps;
- tooling census metadata;
- test snapshots;
- report reproduction instructions in current docs only.

### Documentation authority rename

- `AGENTS.md`;
- `docs/README.md`;
- current specialist docs;
- README links;
- workflow comments/metadata;
- adapters;
- documentation-link check.

Frozen reports are excluded unless they are being actively promoted into current authority, in which case copy the relevant semantics into the current doc rather than editing the report.

### Application/state rename

- state slice/type;
- initial state;
- state actions;
- controllers;
- facade/port;
- renderer/input;
- persistence/serialization if present;
- debug snapshots;
- e2e tests;
- architecture and command glossary.

### Corpus/data vocabulary

- canonical corpus resolver;
- CLI parser/help;
- workflow inputs;
- generated manifest metadata;
- current reports/docs;
- no historical data path rewrite.

## 13. Completion audit

The cleanup is complete only when all of the following are true.

1. `ida:` appears only in frozen history, historical fixtures, or explicit legacy-parser documentation.
2. Current code/docs do not call coarse beam state merging "dedup".
3. Current code/docs do not call mechanic-bucket retention "diverse beam".
4. Current code/docs qualify scoring profiles and do not present them as distinct algorithms by name alone.
5. Current routing code/docs say "routing regime", not "archetype".
6. Current runtime orientation code does not use `variant`.
7. False-goal internals use triggerability terminology.
8. Only independent reference implementations use "oracle".
9. Solved-set regression tooling does not use "benchmark".
10. Current stage IDs use the Section 4.6 names, and historical IDs are accepted by one centralized normalizer.
11. Current attempt identities use the Section 4.2 grammar, and historical identities are accepted by one centralized parser.
12. `ActionType` no longer mixes commands and events.
13. Current normalized code uses `requiredLength` and `requiredIntersections`; old wire fields remain readable.
14. `core.ts` and `level-utils.ts` are gone.
15. The current solver workstream document does not confuse workstream ID with execution rank.
16. Every live surfaced tool/package/workflow name is either canonical under Section 2.6 or has an explicit retained-term ledger entry; no surfaced `pilot` remains.
17. Current scheduler mode is `production`; the historical wall-clock experiment is explicitly `legacy-latency-portfolio-experiment`; generic `legacy` is not a live scheduler identity.
18. False-goal internal code, worker protocol, editor state/actions, telemetry, and developer tools use triggerability terminology; only deliberate player-facing copy may say "Trap".
19. Live variant-family dataset tooling/workflows/env vars do not use `trove`; historical branch/report/artifact names may.
20. Workflow names, path filters, concurrency identifiers, and newly emitted artifact names have been audited; no current workflow references a stale case-sensitive source path such as **modules/Solver.ts**.
21. Attempt/action identity formatters pass round-trip, injectivity/collision, legacy-normalization, and deterministic-format tests.
22. `npm run check:documentation-links` passes.
23. Full `npm run ci` passes after the final alias removals.
24. Representative historical attempt/stage/scheduler/generated JSON fixtures parse to the new canonical model.
25. Normalize/denormalize and representative corpus round trips preserve the existing level wire format and persistent fingerprints.
26. No frozen report or historical evidence file was mass-rewritten for cosmetic naming.
27. A final current-`main` naming census has zero unclassified live hits; every retained potentially ambiguous term is justified in the completed ledger.
28. Current solver lifecycle telemetry is named `stageLifecycle`; historical `techniqueLifecycle` JSON remains readable.
29. Current attempt-exposure tooling uses `routingRegime` and `attemptConfigIdentity`, not `archetype` and `technique`, for those exact concepts.
30. No surfaced equal-work analysis command retains `pilot` in its permanent name.
31. Maintained solver-sweep report combination uses `combine-solver-sweep-reports` / **solver:combine-sweep-reports**, and current Corpus 1/2 output paths do not use `parallel`, `random`, or unqualified `benchmark` as corpus identity.

## 14. Stop conditions

Stop an individual rename PR and report the conflict instead of improvising if:

- a proposed rename changes solver behavior or resource allocation;
- a historical identity cannot be parsed without ambiguity;
- two legacy strings collapse onto one new identity while still representing materially different behavior;
- a supposedly local name is part of a persisted schema not covered by this plan;
- current `main` has already replaced the concept with a different architecture;
- a newly discovered live surface would require inventing a canonical name not fixed by this plan;
- a workflow/file rename reveals a stale path or trigger whose correction could change when automation runs.

In those cases, preserve the plan's canonical vocabulary, document the concrete blocker in the ledger, and split the schema/behavior problem into a separately reviewed prerequisite. Do not choose a different name locally.

This plan deliberately front-loads compatibility infrastructure before the highest-risk string migrations. The expected payoff is that the repo eventually reads in one vocabulary instead of requiring agents to maintain a private translation dictionary between historical experiment names, current behavior, and research terminology.

# Naming cleanup implementation plan

Status: **approved implementation plan**. This document is the current authority for the repository naming cleanup identified by the 2026-08-27 naming audit. It is intentionally decision-complete: implementing agents should not invent substitute names, alternate migration schemes, or broader semantic changes while executing it.

This is a **behavior-preserving naming and vocabulary migration** unless a section explicitly says that an obsolete compatibility surface is removed after its consumers are migrated. Do not change solver policy, attempt order, scoring weights, eligibility, budgets, pruning behavior, random seeds, corpus contents, or evidence disposition as part of this work.

Use `docs/change-recipes.md` for every cross-boundary rename. Historical reports, archived snapshots, frozen logs, immutable workflow artifacts, and committed evidence files remain unchanged unless a parser must be taught to read their legacy identifiers.

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
- **benchmark**: performance/cost measurement, not a solved-set regression check.

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

Permanent executable names use this vocabulary:

- `*-check`: deterministic invariant/pass-fail validation;
- `*-validate`: semantic/data validation;
- `*-analyze`: offline analysis of existing evidence;
- `*-compare`: comparison of two or more existing/run outputs;
- `*-measure`: cost/performance measurement;
- `*-run`: execute a search/treatment;
- `*-generate`: generate data;
- `*-collect`: build/rebuild evidence from many runs;
- `*-sweep`: repeat a defined operation across a population or parameter range;
- `*-probe`: bounded diagnostic measurement only;
- `*-audit`: broad systematic review;
- `*-census`: near-exhaustive enumeration over a defined matrix.

`pilot` belongs in report descriptions, not permanent executable names.

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
- tool discovery/catalog metadata.

Use `node scripts/tooling-census.mjs --compact --query=<old-term>` and again with the new term whenever the concept is surfaced through tooling.

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

## 4. Canonical rename inventory

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
| "archetype" when referring to this classifier | "routing regime" | live docs/telemetry labels |
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

### 4.7 False-goal / trap search

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

The word `fraction` must not be used for values such as `6.0` that are additive multipliers.

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

Rename current instrument names:

- `solver-winning-lineage-survival-analysis.md` -> `solver-known-solution-prefix-survival.md`;
- `analyze-lineage-mechanics.mjs` -> `analyze-known-solution-prefix-survival.mjs`.

The word `lineage` may remain in historical reports.

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

- move audio ownership to `modules/audio-service.ts`;
- `SOUND_BUS` -> `audioService`;
- expose `createAudioService`;
- move stable app constants/status enums to `modules/app-constants.ts`;
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

## 5. Research and tooling rename inventory

The following public/surfaced tool names are canonical.

### 5.1 Solver regression and performance

- npm `solver:bench` -> `solver:regression`;
- underlying solved-set command/file should use "regression" terminology;
- keep `solver:bench` as a deprecated npm alias during one migration PR only, then remove it after workflows/docs are updated;
- performance measurement remains `solver:speed-probe` until the tool-convention PR, where it becomes `solver:measure-speed`;
- `stress:benchmark` -> `stress:measure-solver` because it is actual corpus solver measurement.

Current docs must say explicitly: solved-set regression is not a speed benchmark.

### 5.2 Direct solver

- `run-solverv2-direct.mjs` -> `run-solver-direct.mjs`;
- npm `solver:direct` remains canonical because the public alias is already clear.

### 5.3 Hint validation

- `hint-path-oracle.mjs` -> `validate-hint-paths.mjs`;
- corresponding npm/test alias -> `test:hint-path-validation`;
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

Replace the opaque npm alias `audit:newhint:full` with `solver:analyze-diagnostics`. Remove the old alias after current docs/workflows are migrated.

### 5.8 Probe overloading

Rename surfaced tools according to Section 2.6 when touched by this cleanup:

- speed probe -> measure speed;
- reference-model calls -> reference;
- validators -> check/validate;
- isolated technique execution -> run;
- diagnostic bounded samplers may retain `probe`.

Do not perform blind filename replacement across cold historical scripts. The surfaced-tool inventory in `docs/tooling-catalog.md`, `scripts/README.md`, `.github/workflows/README.md`, and `package.json` is the required migration scope.

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
  "kind": "symbol|stage-id|attempt-id|tool|file|doc|field|term",
  "risk": "low|medium|high",
  "persistence": "none|dual-read|frozen-history",
  "phase": 1,
  "status": "pending|in-progress|done",
  "notes": "short fixed migration note"
}
```

Populate it with every explicit mapping in Sections 4-8 before implementing code renames. The ledger is the checklist of record. A rename PR marks only its own entries `done`.

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
- archetype -> routing regime;
- routing value compatibility normalization;
- docs/tests/telemetry updates;
- prove thresholds and selected attempt order are byte-for-byte unchanged for representative fixtures.

### PR 4: Attempt identity v2

- land parser/normalizer;
- migrate all live consumers off raw string slicing;
- add historical fixtures;
- switch writers to canonical grammar;
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

### PR 6: Solver stage identity migration

- add `normalizeSolverStageId`;
- migrate every stage mapping in Section 4.6;
- update all stage producers/consumers/telemetry/provenance/budget planners;
- historical fixtures prove old stage IDs remain readable;
- full CI.

### PR 7: False-goal triggerability API

- file/API/result/status/field renames;
- legacy adapter during migration only;
- migrate editor, solver facade, ports, tools, and tests;
- remove adapter after no live consumer remains;
- verify partial-search semantics are unchanged.

### PR 8: Reference/referee/tool semantics

- hint oracle rename;
- CP-SAT reference names;
- offline replay rename;
- technique census analysis rename;
- atlas/trove/lineage surfaced-tool renames;
- audit diagnostics rename;
- package aliases/catalog/workflow docs updated together.

### PR 9: Regression/performance CLI vocabulary

- `solver:bench` -> `solver:regression`;
- `solver:speed-probe` -> `solver:measure-speed`;
- `stress:benchmark` -> `stress:measure-solver`;
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

### Tool/file/CLI rename

- physical filename;
- imports/spawns;
- `package.json`;
- shell commands embedded in docs;
- `scripts/README.md`;
- `docs/tooling-catalog.md`;
- `.github/workflows/README.md`;
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
16. Current tool names conform to Section 2.6 for every surfaced tool touched by this plan.
17. `npm run check:documentation-links` passes.
18. Full `npm run ci` passes after the final alias removals.
19. Representative historical attempt/stage/generated JSON fixtures parse to the new canonical model.
20. No frozen report or historical evidence file was mass-rewritten for cosmetic naming.

## 14. Stop conditions

Stop an individual rename PR and report the conflict instead of improvising if:

- a proposed rename changes solver behavior or resource allocation;
- a historical identity cannot be parsed without ambiguity;
- two legacy strings collapse onto one new identity while still representing materially different behavior;
- a supposedly local name is part of a persisted schema not covered by this plan;
- current `main` has already replaced the concept with a different architecture.

In those cases, preserve the plan's canonical vocabulary, document the concrete blocker in the ledger, and split the schema/behavior problem into a separately reviewed prerequisite. Do not choose a different name locally.

This plan deliberately front-loads compatibility infrastructure before the highest-risk string migrations. The expected payoff is that the repo eventually reads in one vocabulary instead of requiring agents to maintain a private translation dictionary between historical experiment names, current behavior, and research terminology.

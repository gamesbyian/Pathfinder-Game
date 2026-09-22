# Hint evidence consolidation pre-implementation audit 001

> **Date:** 2026-09-22  
> **Scope:** empirical pre-implementation checks for the hint evidence / execution identity / storage consolidation plan.  
> **Branch:** `chatgpt/hint-determinism-provenance-audit-2026-09-22`  
> **Related plan:** `docs/hint-evidence-execution-identity-storage-consolidation-plan.md`  
> **Related determinism audit:** `reports/2026-09-22-hint-provenance-repeat-run-determinism-audit.md`

## Executive result

The consolidation direction is sound, but five implementation assumptions needed tightening.

1. Effective solver identity should derive from the canonical request contract, not from sweep-local configuration payloads.
2. Reproducibility semantics must include the execution backend. First-success raced execution does not promise a stable winning path.
3. Historical provenance missingness is currently inconsistent with the documented evidence contract and must be fixed before sparse v4 encoding.
4. Most Pathfinder solver report families already retain enough successful-row detail to support central hint ingestion, but direct external/CP-SAT harvesting is an important outlier and current stale hint writers remain.
5. Firestore's five-hint merge cap is a legacy retention rule that predates provenance and now conflicts with both player curation and modern submission/storage expectations.

The audit also confirms that run IDs/digests alone are insufficient durable hint provenance: current canonical hint events do not retain source-run identity, generated run-linked discovery-process evidence is not itself a durable tracked instance, and many originating workflow artifacts are ephemeral.

## 1. Canonical request and execution identity

### Current request contract

`modules/solver/orchestration-contracts.ts` owns the full `SolveOpts` contract. It contains:

- ordinary time/node/work budgets;
- normalized ablation configuration;
- strict total-work behavior;
- scheduler mode and static-portfolio configuration;
- a large family of behavior-affecting budget/reserve/retry overrides;
- per-level/history-derived `primeAttempt`;
- observer/telemetry flags and callbacks;
- direct/test-only fields.

The interface comments explicitly record a prior failure mode in which worker execution silently dropped SolveOpts fields.

### Direct versus Web Worker

`modules/solver/solver-worker-client.ts` now forwards the full structured-cloneable SolveOpts surface, special-casing only `timeBudgetMs` and `yieldFn`, and rejects function-valued options that cannot cross the worker boundary. This is the strongest existing request-parity seam and should become the basis for identity classification.

### Raced backend

`scripts/solver-parallel/race-opts.mjs` deliberately exposes a narrower capability contract. `toRaceLevelOpts()` fails loudly if a caller supplies unsupported SolveOpts fields rather than silently dropping them.

`scripts/solver-parallel/race.mjs` is not merely a transport variant:

- it runs only a subset of solver stages;
- it uses concurrent first-success-wins attempt racing;
- its work/time allocation differs from the sequential ladder;
- its own comments explicitly warn that repeated runs can report different winning attempts because of worker scheduling.

Portfolio sweep reports already record `engine` and `racePoolSize`, but current hint provenance does not.

### Existing reproducibility contract to extend

The general experiment contract already carries `execution.reproducibilityExpected` and validates it as part of compatibility. The checked-in experiment-result schema also reserves that field in the canonical execution object. That is an existing semantic owner and should be evolved/reused rather than shadowed by a hint-only reproducibility namespace.

A boolean expectation is not sufficient to describe why a run is or is not path-stable, so implementation should add a versioned execution/reproducibility mode through the existing contract family or a shared value object it consumes. Historical boolean contracts remain readable.

### Consequence

Do not maintain a separate hand-authored "behavior-affecting options" list in hint code.

Create one complete-by-default field-classification owner over canonical SolveOpts and execution backend semantics. New SolveOpts fields should fail contract tests until classified. Effective-input identity should be a projection of that complete request plus level revision and attempt-specific dimensions.

Reproducibility class must be a first-class execution semantic. The #1996 audit should compare path identity only for execution classes that promise path-stable deterministic results.

## 2. Provenance missingness is an active semantic defect

The September 11 provenance audit measured:

- 675,233 stored provenance events at that time;
- 505,993 events omitting at least `isolatedTechnique`;
- 57,497 nominally cold events with legacy-ambiguous capability context;
- only 24,998 strict-cold events with complete capability context.

That report explicitly concluded that absent legacy booleans are unknown, not modern false.

Current `upgradeProvenanceEntry()` nevertheless fills absent nested:

- `usedExistingHints`;
- `hintGuided`;
- `isolatedTechnique`;

with `false`.

It simultaneously preserves partial sparsity for other solver/search fields rather than expanding every missing field to the same explicit-null shape produced by `makeProvenanceEntry()`.

This creates three different effective representations:

1. fresh canonical events with explicit defaults;
2. upgraded nested historical events with some absences converted to false;
3. historical solver/search fields whose absences remain absent.

That is incompatible with a safe sparse codec. A serializer cannot know whether omission means default or lost historical information until the semantic model distinguishes those cases.

### Required correction

Before v4:

- inventory every provenance field;
- define default / not-applicable / not-observed / historical-unknown semantics;
- change legacy ingress so absence is not promoted into a modern factual false where evidence doctrine says unknown;
- make applicability/replay helpers consume the semantic missingness helper rather than raw `hasOwn` assumptions that an upgrader can accidentally erase.

Do not bulk-rewrite old evidence merely to make it visually uniform.

## 3. Source-run durability and reconstructability

The current tracked hint schema has no source-run field.

`harvest-level-blind-report-hints.mjs` receives `sourceRunId` and `sourceWorkflow`, but those values are used for selection/pending artifacts rather than persisted into each canonical hint provenance event.

`merge-hint-artifacts.mjs` likewise knows the importing source run but normally trusts the provenance already embedded in incoming hint files.

The Resource Contract already says hint provenance should, where practical, reference the originating run/experiment so denominator, failures, protocol and work semantics can be recovered.

However the current `hint-discovery-process` resource is a **generated interface**, not a guarantee that a durable run-linked document exists for every hint. Standard GHA manifests and source artifacts can also expire unless promoted into a durable evidence bundle.

### Measured source-run reconstruction check

The six September 9 source runs used to reconcile #1996 are still available in GitHub Actions at audit time:

- 34315398129;
- 34315357361;
- 34320087947;
- 34320103478;
- 34337871124;
- 34337880617.

Every run still has an unexpired `solver-sweep-result` artifact plus shard artifacts. This explains why the forensic reconciliation can be performed mechanically today. It does **not** establish durable reconstructability: these are GHA-retained artifacts, not semantic payload preserved inside the canonical hint evidence.

### Consequence

A future hint event must not store only an opaque run ID or configuration digest.

Modern Pathfinder discoveries should retain a bounded self-contained execution semantic capsule, interned locally where useful, plus source-run lineage. The digest is the equality/join key; the retained canonical payload makes that digest interpretable after external artifacts disappear.

Attempted-population and failure detail should remain outside the hint itself and be joinable when durable run evidence survives.

## 4. Observation sufficiency by producer family

### Portfolio/full-solver reports

`portfolio-solve-sweep-lib.mjs::buildRow()` retains, for each solved row:

- exact complete solution;
- all compact attempts;
- winning config/action/gate;
- work and status;
- per-attempt seed/gate/work fields where produced.

The report summary carries execution configuration, engine, race-pool size, workers, scheduler and effective configuration.

This is already close to sufficient for central hint persistence once the canonical execution capsule and level-revision binding are added.

### Level-blind sweep reports

Level-blind reports retain exact solutions and attempts. The current report harvester already reconstructs a synthetic solve result and feeds it through shared hint capture.

The missing piece is the originating execution capsule. The source report currently has enough configuration material to construct one, but the current harvester does not persist it into hint provenance.

### Isolated method-probe / technique-census reports

Method-probe rows retain exact solution, work budget/spend, winning configuration/gate and attempts. The isolated harvester already marks these as `isolatedTechnique=true`.

These can use the same ingestion semantic kernel without pretending they are production-ladder runs.

### CP-SAT/external harvesting

The CP-SAT harvest path is materially different.

`cpsat-hint-harvest.mjs` constructs canonical external-solver provenance and writes hints directly. The sweep wrapper's durable summary records only per-level status and counts such as added/rediscovered; it does not retain all successful paths/provenance needed to reconstruct canonical hints centrally.

It also still imports the removed `readLevelsWithHints` / `writeLevelsWithHints` API and manually assigns both `hintRecords` and derived `.hints`.

Therefore CP-SAT cannot simply have direct hint-file transport deleted. It first needs a richer specialist discovery artifact or to remain an approved local/direct HintStore producer. The preferred GHA direction is to emit exact successful external-solver observations and let central ingestion persist them.

### Stale writer surface

The previously identified `hint-candidate-search.mjs` is not the only stale writer. CP-SAT harvesting also depends on the removed corpus I/O facade.

PSC-001's writer census must therefore be rerun comprehensively before re-closing.

## 5. Firestore five-hint cap

Current `review-repository.ts::approveHintAddition()` performs:

`mergeHints(existing, incoming).slice(0, 5)`.

History shows that the five-hint cap existed before the July 11 provenance migration and survived:

- the JavaScript -> TypeScript persistence migration;
- the conversion from bare paths to provenance-rich Hint records;
- the later local-level supplemental hint path.

No provenance-era commit introduced or justified the value 5.

Current surrounding contracts have moved far beyond it:

- submission code explicitly truncates at **1,000** hints as the Firestore document safety margin;
- `local_level_hints` soft-caps at **5,000**;
- player-facing `selectDisplayHints()` independently curates to a default cap of **15**;
- Review/Edit mode intentionally cycles every known solution without player-display curation.

So the five-hint write cap is not needed to implement the modern player-display limit and is far below the explicit current submission/storage safety limits.

### Consequence

Treat the five-hint cap as a legacy storage/presentation conflation and current evidence-loss defect.

The repair should preserve all semantically accepted hints/provenance subject only to an explicit backend capacity policy. Player-facing display curation remains the responsibility of `selectDisplayHints()`, not persistence.

If Firestore document-size limits require a cap, derive and document a capacity policy appropriate to provenance-rich Hint records instead of retaining the unexplained value 5.

## 6. Changes earned for the implementation plan

The pre-implementation order should now be:

1. repair known current contract regressions, including stale hint writers and provenance missingness;
2. build the complete SolveOpts/backend classification and canonical request capsule;
3. define reproducibility classes and update the determinism audit semantics;
4. define the durable execution capsule and specialist-to-hint ingestion projection;
5. remove the Firestore five-hint evidence-loss cap under an explicit capacity policy;
6. migrate Pathfinder solver workflow families to central ingestion where reports are already sufficient;
7. upgrade CP-SAT/other external producers before removing their direct persistence path;
8. only then design/benchmark physical v4 sparse/interned encoding.

## 7. Remaining empirical work before v4 benchmarking

The following can be completed during implementation without blocking the architecture:

- machine census of every SolveOpts field against its semantic classification;
- comprehensive grep/static guard for stale/current hint writers;
- field-by-field provenance missingness table over the full tracked corpus;
- exact workflow-family matrix: source artifact, durability, successful-row sufficiency, partial-failure behavior, and ingestion migration status;
- Firestore serialized-size measurement for representative provenance-rich Hint counts to choose any real document safety threshold;
- v4 byte/decode/diff benchmarks after semantic normalization is fixed.

The key result is that no physical v4 decision is currently blocked by a need for a new evidence warehouse or universal observation schema. The existing research architecture already has the right specialist resources. The missing work is semantic boundary consolidation and prospective completeness.

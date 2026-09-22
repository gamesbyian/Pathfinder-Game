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

## 2.1 Historical `foundAt` migration timestamps are not always discovery timestamps

A before/after check across the July 11 provenance migration found a concrete chronology
reinterpretation.

Before commit `7a651d391b49986626ceffbc4612352ddefb9bd4`,
`data/stress/hints/001.json` was schema v1 with:

- one bare hint path;
- aligned `hintMetadata` containing `solverTechnique=stress-generator-witness`,
  `nodesExpanded=0`, `solveTimeMs=0`, and `metadataStatus=witness`;
- **no discovery timestamp**.

After the migration, the same observation became schema v3 provenance with:

`foundAt: "2026-07-11T01:44:17.863Z"`.

That value is the migration/normalization time, not a retained historical discovery time.

Plain legacy path arrays did not receive this treatment: sampled
`data/hints/001.json` paths migrated to `provenance: []`. The defect is specifically the flat
legacy-metadata adapter path, where `upgradeProvenanceEntry()` calls
`makeProvenanceEntry(..., { foundAt: undefined })` and the constructor supplies `new Date()`.

This matters because `solution-profile-lib.mjs` treats every parseable `foundAt` as dated
chronology and can set `chronologyComplete=true`; the longitudinal-process classifier likewise
uses presence of `foundAt` as part of “fully dated” evidence.

### Required correction

Do not delete the historical witness/event. Its solver/technique metadata remains real.

Instead:

- make historical normalization capable of representing unknown discovery time;
- identify migration-derived timestamps where mechanically provable from pre-migration data/history;
- exclude such timestamps from chronology completeness/frontier claims;
- record the limitation in the hint-provenance Resource Contract and solution-profile chronology
  semantics;
- do not replace the timestamp with a guessed earlier date.

This is an example of why provenance semantic version/missingness must be separate from physical
artifact schema version.

### Historical prevalence check

A bounded head/tail check shows this was the normal old stress-hint format, not one file:

- pre-migration files `001.json` through `010.json` all had schema-v1 `hintMetadata` and zero
  metadata timestamps;
- file 009 already carried seven metadata observations from both targeted enumeration and witness
  production, none dated;
- tail files 448-450 likewise had 18, 1, and 20 undated metadata observations;
- after the migration, every sampled observation was assigned `foundAt` in one narrow migration
  interval from `2026-07-11T01:44:17.863Z` through
  `2026-07-11T01:44:18.004Z`.

This makes a mechanical historical correction feasible. Prefer proving event correspondence from the
pre-migration commit and marking those migrated timestamps as unknown/migration-derived. Do not
classify arbitrary events solely because they happen to fall on July 11.

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

## 4.1 Stale hint I/O consumers are current reachable functionality

The removed `readLevelsWithHints` / `writeLevelsWithHints` facade is still referenced by more
maintained code than the first pass found.

Confirmed current consumers include:

- `scripts/hint-candidate-search.mjs` — writer;
- `scripts/dedupe-hint-provenance.mjs` — writer;
- `scripts/family-parent-hint-replay-batch.mjs` — writer and manual `hintRecords -> hints`
  projection;
- `scripts/stress/cpsat-hint-harvest.mjs` — maintained GHA writer and manual projection;
- `scripts/hint-expansion-audit.mjs` — reader;
- `scripts/hint-workbench-parallel.mjs` — reader/orchestrator whose comments still rely on the old
  writer contract;
- `scripts/validate-hint-paths.mjs` — reader.

Several are normal package entry points:

- `test:hint-path-validation`;
- `hints:expansion-audit`;
- `hints:discover-candidates`;
- `hints:workbench-parallel`.

The CP-SAT path is also exercised by the maintained
`cpsat-hint-harvest-sweep.yml` workflow.

The inspected CI/main-push workflow files do not directly exercise these package commands, so a
green ordinary validation floor does not prove this compatibility seam works.

### Consequence

Phase -1 needs both repair and enforcement:

- migrate all maintained readers/writers off the removed facade;
- add focused smoke/tests for the maintained package entry points or a static ownership check that
  fails on removed-facade imports;
- keep at least one end-to-end persistence test proving `changedHintLevels` semantics for a real
  writer and one read-only consumer.

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

## Continuation findings against current main

Reconstruction point: `main=0494a0a2c2cc698b8c2a0c40782c88b8983d99ca`; PR #1996 head at session restart was still `f80abe0741689e0089bb4368a6b6dcb1ee82217a` and was 33 commits ahead / 0 behind current main. PRs #1994/#1995 are already in main and repair the isolated-harvester corpus API/historical-provenance ingress.

### I/O ownership recheck

The stale current seams were reverified in source:
- writers: `hint-candidate-search.mjs`, `dedupe-hint-provenance.mjs`, `family-parent-hint-replay-batch.mjs`, `stress/cpsat-hint-harvest.mjs`;
- readers/orchestrators: `hint-expansion-audit.mjs`, `hint-workbench-parallel.mjs`, `validate-hint-paths.mjs`.

Four of the reader/candidate/workbench surfaces are directly exposed through package commands. CP-SAT is maintained by workflow. The dedupe and family batch utilities have no package alias, so package reachability alone is not a safe census.

A source-tree validation guard is warranted because GitHub code search returned incomplete/empty results even for known-live symbols during this audit.

### Request semantics

The current `SolveOpts` interface and planning inventory both contain 49 fields, exactly. There are no membership deltas. `race-opts.mjs` already owns a fail-closed narrow projection, so a future classification check should import/compare that boundary rather than duplicate its field list.

Still open: effective canonical defaults and per-field identity participation are not exhaustive enough to construct a stable request hash. Ablation defaults in particular must be obtained from canonical normalization/opt-in ownership.

### Workflow/ingestion findings

`harvest-solver-evidence.yml` is already a central semantic replay point and runs after partial failures. Broad/residual/static-portfolio/combine are deliberately experiment-only. Recombination already has typed constituent source-run provenance and should remain the lineage source for observations acquired in earlier runs.

Two stale workflow-run trigger names remain in the harvester although their workflow files no longer exist: repair-fallback node-reserve sample A/B and elite-prefix-dfs-retry local validation.

CP-SAT is a confirmed specialist exception. `cpsat-hint-harvest.mjs` receives and referee-validates exact `PATH` output, but only retains the exact path in its in-memory pending map immediately before direct hint persistence. Its optional JSON result row omits the path. `cpsat-hint-harvest-sweep.mjs` does not request the JSON result and writes a Markdown summary containing only status / added / rediscovered counts. Therefore current CP-SAT artifacts cannot construct a future semantic Hint without transporting the already-mutated canonical hint files. Centralization requires a richer specialist discovery artifact first.

### Firestore findings

The supplemental backend is not merely lossy for a multi-provenance submission. It cannot represent a later provenance rediscovery of an existing path at all: documents are deterministically path-keyed and create-only, and the repository rejects known signatures before write. `scripts/import-published-levels.mjs` only converges `published_levels`, not `local_level_hints`, into git.

Representative canonical Hint JSON sizes from five provenance-heavy real files vary materially:
- maxima ranged from 43,687 to 168,521 bytes per semantic Hint;
- the largest sampled Hint carried 215 provenance events;
- medians ranged from 361 to 7,526 bytes.

This invalidates fixed path-count capacity as a principled policy. Physical Firestore encoding/document-size measurement is still required before selecting layout/limits.

### Runtime-delivery measurement

Current Vite build copying contributes 741,231,497 raw bytes from canonical hint trees:
- published 171,566,523 B;
- stress-1 83,920,958 B;
- stress-2 485,744,016 B.

Published hints are per-level lazy. Stress hints are only fetched after the admin Dev-Mode corpus switcher selects a stress corpus, but the provenance-rich trees are still copied into every build.

Ten large real files were decoded through Git blobs and projected to path-only JSON. Path-only/raw ratios ranged 0.0582..0.3750, i.e. 62.5%..94.2% raw-byte reduction in this deliberately heavy sample. This establishes materiality, not a corpus-wide estimate; exact all-file and gzip measurement remains required.

### July-11 historical boundary

Commit `7a651d391b49986626ceffbc4612352ddefb9bd4` (2026-07-11) introduced provenance storage and states that all 606 then-existing published/stress hint files were migrated. Existing before/after samples show originally undated flat metadata later carrying a narrow migration-time `foundAt` cluster. The full current-corpus count remains an explicit gate; migration membership/source generation should be preferred over timestamp-range guessing when mechanically identifying synthetic times.

### Resulting architecture pressure

The evidence now favors:
1. semantic discovery events deduped independently from physical occurrence lineage;
2. occurrence lineage as a compact child/source set, preserving constituent acquisition runs through recombination;
3. a single central GHA semantic-ingestion authority fed by specialist artifacts, with CP-SAT temporarily exempt until its artifact is sufficient;
4. historical semantic adapters at ingress, not inferred bulk rewrites;
5. byte-aware external persistence policy;
6. a generated runtime path projection, if the exact full-corpus/gzip benchmark confirms the sampled savings.

Physical schema v4 remains intentionally blocked.

## Continuation findings: empirical closure

The continuation pass converted the remaining planning questions into measured constraints.

### Full current-store field-state census

Current committed hint evidence contains **267,046 semantic Hints and 775,469 provenance events across 1,962 files**.

The complete machine-readable counts live in `docs/hint-evidence-consolidation-inventory.json`. The most consequential result is historical capability-context laundering:

- September 11 measured **505,993 events omitting `isolatedTechnique`**.
- Current raw storage has only **32,254 absent `isolatedTechnique`** entries.
- It now has **507,334 explicit `isolatedTechnique:false`** entries.
- `usedExistingHints` and `hintGuided` now have **zero physical absences**.

The code path explains the transition: `upgradeProvenanceEntry()` substitutes `false` for absent legacy capability booleans, and a later canonical-file write can persist the expanded event. Therefore a current physical `false` is not sufficient evidence that a legacy producer observed false. Historical source-generation semantics must remain part of canonical interpretation.

This is stronger than the original audit conclusion. The semantic bug is not merely that readers can misinterpret omission; read-time normalization has been able to rewrite unknown history into an apparently observed modern value.

### July 11 migration chronology

The migration-stamped `foundAt` population is now exact:

- **662 provenance events**;
- **102 stress-corpus-1 hint files**;
- timestamp window `2026-07-11T01:44:17.863Z` through `2026-07-11T01:44:18.004Z`;
- zero members from published hints or stress corpus 2.

A reconstruction of the repository at the September 11 audit commit contains the same **662 events / 102 files**, confirming that this is a stable historical cohort rather than a recent artifact of file rewrites.

The semantic correction should therefore be an ingress compatibility rule keyed to the proven migration/source cohort, with the narrow timestamp cluster as corroboration. These values mean “migration time retained where original discovery time was unavailable,” not historical discovery time.

### Runtime delivery economics

The build currently copies **741,231,497 raw bytes** of provenance-rich hint JSON into `dist`.

A full-corpus path-only benchmark gives:

| Representation | Bytes | Reduction |
| --- | ---: | ---: |
| Canonical raw JSON | 741,231,497 | — |
| Minified path-only JSON | 149,368,243 | 79.85% |
| Pretty path-only JSON | 308,947,047 | 58.32% |
| Canonical per-file gzip total | 21,176,345 | — |
| Path-only per-file gzip total | 4,924,828 | 76.74% |

A generated runtime path projection is therefore justified. The measurement does **not** justify a second tracked hint store.

### Firestore capacity economics

Representative current JSON-size proxies:

| Unit | p50 | p99 | max |
| --- | ---: | ---: | ---: |
| semantic Hint | 1,437 B | 27,784 B | 574,971 B |
| local path + one event document | 1,892 B | 2,797 B | 3,440 B |
| published encoded Hint array per level | 1,149,023 B | 2,044,991 B | 5,269,927 B |

These are UTF-8 JSON payload measurements before Firestore field/index overhead and, for published levels, before the rest of `levelData`.

The current five-hint `slice()`, 1,000-submission safety margin, and 5,000 supplemental soft cap therefore describe path counts, not storage safety. A future persistence design needs byte-aware preflight and a bounded-growth unit. The very small one-event document distribution makes event/occurrence children attractive; a full semantic Hint per path can grow toward a document limit as provenance accumulates.

### Maintained hint-I/O surface

The source-tree census found **56 source/workflow files** still mentioning the removed `readLevelsWithHints`/`writeLevelsWithHints` names, with at least **19 directly referenced from `package.json`**. The original seven-file list was not exhaustive.

Raw grep count is deliberately not being promoted to an authority: the new audit tool classifies package/workflow-seeded import-graph reachability so historical/dormant utilities can be separated from maintained current paths. That mechanically classified live set is the PSC-001 migration target.

### Solver request/backend semantics

The `SolveOpts` inventory now matches all **49 current fields** exactly and records effective defaults, identity participation, and direct/worker/raced support. A repository test now makes future unclassified fields fail.

One additional parity defect was discovered: `beamFlowCounters` and `pruneDiagnostics` are mutable structured-cloneable objects. Web Worker execution accepts them, but mutations occur only on the worker's private clone and are not returned in `SolveResult`. They are therefore not equivalent to direct execution despite crossing transport successfully.

### Outcome

The semantic architecture is sufficiently specified for Phase -1 implementation. The remaining work before physical schema-v4 migration is implementation validation, not missing architectural discovery: make historical missingness first-class, add occurrence lineage, converge maintained persistence paths, validate Firestore wire limits, and prove reversible semantic/referee equivalence.

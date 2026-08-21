# Architecture unification audit

> **Status:** current engineering review. Preserve behavior and research evidence; do not collapse representations merely because they look similar.
>
> **Verified:** 2026-08-21 against `main` after the solver-authority consolidation work. Re-check named code before implementation because solver orchestration changes quickly.
>
> **Priority:** solve count, correctness, deterministic evidence, and speed outrank architectural neatness. Keep structural refactors separate from solver-policy tuning.

## Executive summary

Treat duplication by semantics:

1. **Intentional plurality:** representations answer different questions. Keep them and make ownership explicit.
2. **Boundary compatibility:** accept old/new external forms, normalize once, keep the adapter.
3. **Parallel internal authority:** modules independently encode one policy/schema/interpretation. Unify them.
4. **Repeated orchestration mechanics:** stages repeat the same budget, telemetry, provenance, and executor plumbing. Generalize the mechanism, not stage behavior.

External forms may vary; internal authorities should not. Shared event counts may still need separate scopes. The problem is duplicated policy or callers having to remember synchronization rules.

Recent work materially improved the highest-risk solver area: canonical stage IDs, stage planning/budgets, attempt identity, telemetry typing, and shared retry execution now exist. Remaining work is mostly boundary cleanup, compatibility migration, conformance, and retiring residual parallel authorities.

## Classification

| Area | Classification | Current direction |
|---|---|---|
| Per-solve vs cumulative work meters | **Keep semantics; clarify ownership** | Per-solve meter stays budget authority; replace/encapsulate mutable global cumulative scope. |
| `workSpent` vs `nodesExpanded` vs elapsed time | **Keep** | Allocation, technique progress, and latency are distinct metrics. |
| Solver stage/retry policy | **Mostly unified** | `stage-policy.ts`, `stage-budget.ts`, `stage-plan.ts`, canonical `stageId`, and shared retry executors now carry much of the policy. Keep removing residual mirrored dispatch. |
| Attempt/result telemetry | **Mostly unified** | Canonical attempt/result typing and `stageId` now cross the ports/provenance boundary; keep compatibility fields only where old artifacts need them. |
| Sequential vs raced orchestration | **Share policy; keep execution distinct** | `RACE_SUPPORTED_STAGE_IDS` documents raced coverage. Continue moving both executors toward shared policy inputs without requiring deterministic race winners. |
| Hint `Hint[]` vs `.hints` + `.hintRecords` | **Boundary compatibility moving inward** | Keep legacy readers; make `Hint[]` the sole mutable in-memory authority. |
| Persistent level id vs fingerprint | **Keep both; fix ownership** | ID = entity, fingerprint = structural revision. Entity-attached persistence should use ID plus revision. |
| Legacy fingerprint calculators | **Keep** | Frozen legacy algorithms are the right versioned-compatibility pattern. |
| Raw game parser vs raw solver parser | **Unify wire meaning** | Parse semantics once, then project to optimized solver representation. |
| Runtime/domain/solver rules | **One specification, optimized implementations** | Share cheap predicates/constants and differential-test optimized solver rules against the canonical referee. |
| Engine flat + grouped facade | **Keep** | Both views come from one mapping and reference-identity tests enforce the contract. |
| Level selector parsing | **Unify** | Canonical tools should use the shared explicit `pos:`/`id:` contract. |
| Firestore fingerprint full scans | **Retire normal fallback** | Query known legacy keys/backfill; reserve scans for unknown historical data. |
| Local vs Firestore published storage | **Encapsulate** | Keep backend plurality behind an application-level published-level abstraction. |
| Corpus activation | **Encapsulate coordination** | One operation should own levels, local hints, supplemental hints, and theme policy. |

## 1. Work accounting: keep two scopes, remove implicit ownership

Each canonical work event increments the same unit in two scopes:

- `prep._workMeter.units`: fresh per `solveLevel()`, authoritative for solve budgets and concurrent-solve independence.
- module-global `workMeter.units`: cumulative process/realm scope used by multi-solve discovery tooling.

These are two scopes of one metric. `workSpent`, nodes, and elapsed time are different metrics.

The remaining risk is the mutable global singleton. `modules/solver/diversification.ts` can compare absolute global work against a session ceiling, so unrelated work in the same realm may affect that session.

### Direction

1. Keep `prep._workMeter` as the sole internal solve-budget authority.
2. Prefer caller-owned session accounting: accumulate `SolveResult.workSpent`, pass remaining work as each nested solve's `workBudget`.
3. If a session must stop inside a nested solve, use an explicit caller-owned live scope rather than process-global state.
4. Keep hot-path accounting direct/monomorphic and reject abstractions with measurable per-move cost.
5. Characterize current discovery stopping behavior before migration and preserve found-hint order/set under pinned work.

`CONNECTIVITY_WORK_UNITS = 12` is allocation currency, not a claim that connectivity literally costs 12 moves. Use pinned work for deterministic policy comparison and wall time for implementation-speed changes. See [`solver-budget-determinism.md`](solver-budget-determinism.md).

## 2. Solver stage and budget authority: consolidation largely landed

Older orchestration accumulated stage booleans and one-off budget fields across retries. The 2026-08-21 consolidation moved major policy into executable shared modules:

- `modules/solver/stage-policy.ts`: stable stage identity/policy.
- `modules/solver/stage-budget.ts`: canonical budget computation and envelopes.
- `modules/solver/stage-plan.ts`: stage eligibility/plan derived from the same budget plan used by dispatch.
- `modules/solver/stage-executors.ts`: shared execution shape for whole-ladder retry tiers.
- `Attempt.stageId`: primary stage identity; legacy booleans are compatibility fallback.
- `modules/solver/attempt-identity.mjs`: one attempt/config identity formatter shared by solver and sweep tooling.

This is the desired pattern: one policy description consumed by orchestration, telemetry, and tooling. Do not regress to new stage-specific copies.

### Remaining checks

- Keep moving residual stage eligibility/order/budget decisions out of ad hoc orchestration branches when a shared policy can express them without obscuring genuinely different execution shapes.
- Keep sequential and raced engines on shared stage identity/policy. Different scheduling and winner timing are legitimate.
- New stages should enter via canonical stage/budget/telemetry infrastructure, not new boolean/report/provenance treaties.
- Structural stage refactors must preserve order, budgets, flags, solved set, and deterministic work before any tuning.

### Budget model

Keep multiple resources explicit:

- `workBudget`: deterministic cross-technique allocation.
- `timeBudgetMs`: latency/deadline.
- `nodeBudget`: technique/diagnostic cap.
- `strictTotalWorkBudget`: experiment-only whole-solve envelope.

A stage budget must make ownership and interaction explicit: allocation/rollover, node-ceiling scope, deadline relation, additive/reserve behavior, expected binding resource, behavior when another resource binds first, and strict-total-work participation.

The historical failure to avoid is partitioned WORK under one shared NODE ceiling, where an early config consumes effective stage capacity and later configs retain nominal work they cannot spend.

## 3. Telemetry and provenance: canonicalize once, preserve legacy only at boundaries

Earlier code had internal `Attempt`, `SolveResult.attempts: unknown[]`, a provenance `AttemptLike`, and a reporter whitelist. Fields could disappear between the live solver and stored evidence.

Current code now has typed attempt/result telemetry at the ports boundary, canonical stage identity, and provenance anchored to the canonical attempt type. Keep that direction.

### Requirements

- One stable external attempt/result projection should originate in the solver layer.
- Workers, reporters, provenance, and ports should consume it rather than redeclare it.
- `stageId` is primary. Emit old booleans only where historical artifact compatibility requires them.
- Keep attempt identity formatting centralized.
- Schema-completeness tests should round-trip all supported telemetry through worker transport, report JSON, and provenance without silent loss.
- Provenance must distinguish technique from invocation/stage. DFS/beam/repair/admissible-order and `stageId` vary independently.

Stored provenance should answer: full production solve or isolated tooling; winning stage; non-default forcing/overrides; and production/default vs force-enabled/research-only invocation.

## 4. Sequential and raced execution: policy parity, not winner parity

`scripts/solver-parallel/race.mjs` is legitimately a different executor. Worker scheduling makes first success timing-sensitive.

Risk begins when it reconstructs solver policy independently. `RACE_SUPPORTED_STAGE_IDS` now makes coverage explicit; continue sharing stage/config identity and budget policy where practical. Tests should compare planned stage/attempt sets, not require raced winner determinism.

Until every stage is shared, document sequential-only vs raced-supported stages explicitly rather than claiming blanket orchestration identity.

## 5. Level identity vs structural revision

Persistent IDs (`P…`, `S…`, `R…`) identify level entities across reorderings. Fingerprints identify exact structure and change when the puzzle changes.

Some persistence still keys entity-like data by fingerprint, including Dev-mode ratings and local supplemental hints. Editing a level can therefore change lookup identity even when the conceptual entity is unchanged.

### Direction

For entity-attached records:

1. key by persistent ID;
2. store current fingerprint/revision;
3. define revision-mismatch behavior per data type: reuse, stale, validate/migrate, or discard;
4. migrate fingerprint-keyed records on read and keep the old record until the new write succeeds.

Keep fingerprints for structural equality/duplicates. Eventually rename numeric/position-derived `EngineLevel.id` to `position`/`sourceIndex` and reserve `id` for durable identity.

## 6. Fingerprint compatibility: reuse versioned keys, avoid normal full scans

`modules/domain/level-fingerprint.ts` has the right pattern: frozen old calculators exposed through `getLegacyLevelFingerprints()`. Consumers try current, then known legacy keys, and migrate hits forward.

`modules/persistence/level-submission-repository.ts` can instead fall back from a current-fingerprint miss to a collection scan plus structural comparison. That is robust as an emergency bridge but scales with collection size and duplicates known compatibility logic.

Query current + frozen legacy fingerprints directly and/or backfill current keys. Keep a bounded full scan only for genuinely unknown/unversioned records, with telemetry so it can be retired.

**Rule:** known versioned compatibility should reconstruct the old key, not normalize collection-wide search as permanent behavior.

## 7. Hint compatibility: normalize at I/O, not throughout tooling

`scripts/level-data-io.mjs` correctly accepts historical file shapes and upgrades them to canonical `Hint[]` records. Node tooling still exposes both:

- `level.hints`: bare `number[][]` paths;
- `level.hintRecords`: canonical `Hint[]` with provenance.

`writeLevelsWithHints()` reconciles both, leaving two mutable authorities.

### Direction

1. Newly touched tooling uses `Hint[]` as the sole mutable authority.
2. Geometry-only code gets a derived `hintPaths(records)` view.
3. Migrate scripts opportunistically, not by flag-day rewrite.
4. Once no writer mutates bare `.hints`, simplify `writeLevelsWithHints()` and keep legacy readers only at the file boundary.

Historical file formats should remain readable.

## 8. Parse raw wire semantics once

`modules/domain/level-codec.ts::parseRawLevel()` and `modules/solver/normalization.ts::normalizeRawLevel()` both interpret wire coordinates, axes, portals, landmarks, hazards, and identity defaults.

Keep the solver's optimized representation, but define wire meaning once. Parse/validate into canonical domain semantics, then project to the solver form. If layering blocks direct reuse, extract a small dependency-free semantic parser shared by both projections.

Goal: one wire interpretation, not one universal runtime object.

## 9. Rule duplication needs a conformance contract

Several implementations intentionally optimize the same gameplay rules:

- `modules/runtime/game-rules.ts::areWinMetricsSatisfied()`;
- `modules/domain/path-validator.ts`;
- `modules/domain/move-rules.ts`;
- `modules/solver/solution.ts::isSolutionState()`;
- solver dynamic move validity.

The solver cannot call a slow referee on every search node, but historical drift proves these copies need one specification.

### Direction

- Share small pure predicates/constants when hot-path cost permits.
- Treat the domain referee as canonical for complete-path correctness.
- Differential-test optimized solver acceptance/movement against domain rules.
- Require conformance fixtures for new mechanics.
- Move universal mode/axis/status literals out of “must stay in sync” comments into a shared dependency-free module.
- Push `MoveState` alias polymorphism into adapters so core rule evaluation accepts one shape.

## 10. Candidate path coordinate formats should be explicit

`modules/domain/path-validator.ts` accepts packed keys, `[x,y]`, and `{x,y}`. Arrays are 1-based; objects heuristically infer 0- vs 1-based coordinates, which is ambiguous for ordinary in-bounds values.

Expose explicit formats/entry points (`packed`, `xy0`, `xy1`). Keep autodetection only as a compatibility adapter during migration; internal callers should never guess coordinate base.

## 11. Unify CLI level selection

`scripts/level-data-io.mjs` requires explicit `pos:` or `id:` for numeric selectors. `scripts/level-blind-capability-sweep.mjs` historically had its own parser and accepted bare numbers/ranges.

Move canonical solver CLIs to the shared selector parser/help. Preserve old syntax only where an actual workflow needs a clearly deprecated compatibility layer.

Do **not** remove the capability sweep's explicit `PUZZLE_FIELDS` allowlist: it is a research-integrity boundary that intentionally requires conscious admission of new mechanics into cold solver input.

## 12. Corpus activation should be one operation

Changing corpora currently coordinates:

- `data.ingest(...)`, with themes re-supplied;
- `data.setHintsSource(...)`;
- `data.setFirestoreHintsSource(...)`.

A missed call can reset themes, select the wrong hint directory, or merge published supplemental hints into stress data.

A `DataService` activation operation should accept levels, local hints, supplemental hints, and theme policy. `dev-corpus.ts` should select a `CorpusConfig`, not maintain the synchronization recipe. Low priority while there is only one coordinator.

## 13. Published-level storage should hide backend plurality

Published levels span committed local data and Firestore staging/`published_levels`; review therefore has backend-specific hint-addition paths and identifiers.

Keep the storage differences, but expose an application-level `PublishedLevelRef`/catalog that resolves backing store and operations such as duplicate lookup and hint addition. Persistent IDs should be the common entity key after the identity migration.

Do not force local files and Firestore into one physical schema.

## 14. Solver aliases are low-value compatibility debt

`modules/ports.ts::SolverApi` exposes `universalSolveLevel`, `solveLevel`, and `solve` for the same basic operation. Pick one internal canonical name, migrate callers opportunistically, and leave deprecated adapters until unused. Do not spend a large refactor window here while higher-value authority work remains.

## Patterns to preserve

| Pattern | Why it is good |
|---|---|
| Frozen legacy fingerprint calculators | Versioned compatibility at the read/migration boundary. |
| Hint file upgrade on read | Accept many external forms, normalize to one internal form. |
| `LEVEL_KEY_FIELDS` | One registry for coordinate-bearing fields. |
| Declarative `ATTEMPT_POLICY` plus stage policy/plan/budget modules | One executable policy source consumed by orchestration/tooling. |
| Engine flat + grouped facade | Compatibility views generated from one mapping and identity-tested. |
| Explicit cold-capability `PUZZLE_FIELDS` | Intentional duplicate declaration as a research/security boundary. |

## Remaining implementation order

Structural changes below should preserve behavior; tune solver policy separately.

### Phase 1: finish solver authority cleanup

- Keep stage/budget/attempt identity canonical as new stages are added.
- Remove remaining mirrored dispatch/policy only when the shared representation stays clear.
- Preserve legacy telemetry fields only at compatibility boundaries.
- Expand round-trip/parity tests as schemas evolve.

### Phase 2: clarify work scopes

- Keep per-solve `_workMeter` authoritative.
- Prefer `remainingWork -> nested solve workBudget` for discovery sessions.
- If live nested cancellation needs it, add a caller-owned cumulative scope.
- Retire mutable global consumption only after equivalent behavior is proved.
- Benchmark hot-path cost.

### Phase 3: finish identity and hint migrations

- Key entity-attached persistence by persistent ID + revision fingerprint.
- Reuse frozen fingerprint calculators and reduce full scans.
- Move touched tooling to canonical `Hint[]` with derived path views.

### Phase 4: semantic boundaries

- Centralize raw wire interpretation.
- Strengthen domain-referee/solver conformance tests and shared constants/predicates.
- Narrow `MoveState` and candidate-coordinate polymorphism behind adapters.
- Move remaining CLIs to shared selectors.

### Phase 5: lower-value surfaces

- Corpus activation abstraction if coordination spreads.
- Published-level storage facade.
- Solver naming aliases and narrow deprecations.

## Verification

Behavior-preserving solver refactors should:

- run targeted characterization tests while editing;
- pass the appropriate repository finish-line gate;
- use explicit `workBudget` with a non-binding deadline for decision-bearing comparisons;
- compare solved sets, not only totals;
- compare `workSpent`, attempt order/config/stage, and deadline truncation;
- referee-validate returned paths;
- test raced planned-policy parity separately from winner timing;
- keep policy optimization in a separately measured change.

Documentation-only changes should run the documentation-link check when feasible.

## Target

Every plurality should have an explicit owner and reason: one wire interpretation with optimized projections; one solver policy/stage authority with multiple executors; one telemetry/provenance contract with multiple reporters; explicit work scopes; distinct work/node/time metrics; durable entity identity plus structural revision; legacy forms normalized at boundaries; compatibility views derived from one authority.

This removes the recurring failure mode where a solver capability works locally but disappears, changes meaning, or diverges across reporting, provenance, workers, alternate executors, or persistence.
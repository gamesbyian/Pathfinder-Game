# Architecture unification audit

> **Status:** current engineering review. Preserve behavior/evidence; do not collapse representations merely because they look similar.
>
> **Verified:** 2026-08-21 after solver-authority consolidation. Re-check named code before implementation; orchestration changes quickly.
>
> **Priority:** solve count, correctness, deterministic evidence, speed, then neatness. Keep structural refactors separate from solver-policy tuning.

## Summary

Classify duplication by semantics:

1. **Intentional plurality:** different representations answer different questions; keep them with explicit ownership.
2. **Boundary compatibility:** accept old/new external forms, normalize once, keep the adapter.
3. **Parallel internal authority:** multiple modules encode one policy/schema/meaning; unify them.
4. **Repeated orchestration mechanics:** stages repeat budget/telemetry/provenance/executor plumbing; generalize mechanics, not stage behavior.

External forms may vary; internal authorities should not. Recent work added canonical stage IDs/planning/budgets, attempt identity, telemetry typing, and shared retry execution. Remaining work is boundary cleanup, compatibility migration, conformance, and residual authority removal.

## Classification

| Area | Classification | Direction |
|---|---|---|
| Per-solve vs cumulative work meters | **Keep scopes; fix ownership** | Per-solve meter remains budget authority; replace/encapsulate mutable global cumulative scope. |
| `workSpent` vs `nodesExpanded` vs elapsed | **Keep** | Allocation, technique progress, latency are distinct. |
| Solver stage/retry policy | **Mostly unified** | `stage-policy.ts`, `stage-budget.ts`, `stage-plan.ts`, `stageId`, shared retry executors; remove residual mirrored dispatch. |
| Attempt/result telemetry | **Mostly unified** | Canonical attempt/result typing + `stageId`; legacy fields only for artifact compatibility. |
| Sequential vs raced orchestration | **Share policy; keep execution distinct** | Shared stage/policy inputs; do not require deterministic race winners. |
| `Hint[]` vs `.hints` + `.hintRecords` | **Normalize inward** | Legacy readers remain; `Hint[]` becomes sole mutable authority. |
| Persistent level ID vs fingerprint | **Keep both** | ID = entity; fingerprint = structural revision. |
| Legacy fingerprint calculators | **Keep** | Frozen versioned compatibility is correct. |
| Raw game vs solver parser | **Unify wire meaning** | Parse semantics once, project to optimized solver form. |
| Runtime/domain/solver rules | **One specification, optimized implementations** | Share cheap predicates/constants; differential-test solver vs referee. |
| Engine flat + grouped facade | **Keep** | Both derive from one mapping with identity tests. |
| Level selector parsing | **Unify** | Shared explicit `pos:`/`id:` parser. |
| Firestore fingerprint full scans | **Retire normal fallback** | Query known legacy keys/backfill; scan only unknown historical data. |
| Local vs Firestore published storage | **Encapsulate** | Hide backend plurality behind published-level abstraction. |
| Corpus activation | **Encapsulate coordination** | One operation owns levels, local/supplemental hints, theme policy. |

## 1. Work accounting

One work unit currently has two scopes:

- `prep._workMeter.units`: fresh per `solveLevel()`, authoritative for budgets/concurrent-solve independence.
- module-global `workMeter.units`: cumulative realm scope used by multi-solve discovery tooling.

Keep the scopes but remove implicit global ownership. Prefer caller-owned session accounting by accumulating `SolveResult.workSpent` and passing remaining `workBudget`; use an explicit live caller scope only when a session must interrupt a nested solve. Keep hot-path accounting direct/monomorphic and characterize discovery stopping behavior before migration.

`CONNECTIVITY_WORK_UNITS = 12` is allocation currency, not literal move cost. Use pinned work for deterministic policy comparisons and wall time for implementation speed. See [`solver-budget-determinism.md`](solver-budget-determinism.md).

## 2. Solver stage and budget authority

The 2026-08-21 consolidation moved major policy into:

- `modules/solver/stage-policy.ts`: stage identity/policy;
- `stage-budget.ts`: budget computation/envelopes;
- `stage-plan.ts`: eligibility/plan from the same budget plan used by dispatch;
- `stage-executors.ts`: shared whole-ladder retry execution shape;
- `Attempt.stageId`: primary identity; legacy booleans are compatibility fallback;
- `attempt-identity.mjs`: shared attempt/config identity formatter.

Keep residual eligibility/order/budget decisions moving toward these authorities when execution semantics stay clear. Sequential/raced engines should share policy identity while retaining different scheduling. New stages must use canonical stage/budget/telemetry infrastructure. Structural migrations preserve order, budgets, flags, solved set, and deterministic work before tuning.

Budget resources remain distinct: `workBudget` (deterministic allocation), `timeBudgetMs` (deadline), `nodeBudget` (technique/diagnostic cap), `strictTotalWorkBudget` (experiment-only whole-solve envelope). Stage budgets must define ownership/rollover, node scope, deadline relation, reserve/additive behavior, expected binding resource, cross-resource behavior, and strict-total participation.

Avoid the historical failure where partitioned WORK shares sit under one shared NODE ceiling and early configs consume capacity later configs nominally own.

## 3. Telemetry and provenance

Typed attempt/result telemetry, canonical `stageId`, and provenance anchored to the canonical attempt type have replaced several parallel schemas. Preserve one solver-originated external projection consumed by workers/reporters/provenance/ports.

Requirements: `stageId` primary; legacy booleans only at compatibility boundaries; centralized attempt identity; round-trip completeness tests through worker/report/provenance; technique separate from invocation/stage. Persist enough context to distinguish full production solve vs isolated tooling, winning stage, forcing/overrides, and production/default vs force-enabled/research invocation.

## 4. Sequential and raced execution

`scripts/solver-parallel/race.mjs` is legitimately a different executor: scheduling makes first-success timing nondeterministic. Risk begins when it reconstructs policy independently.

`RACE_SUPPORTED_STAGE_IDS` makes coverage explicit. Share stage/config identity and budget policy where practical; test planned stage/attempt parity, not winner parity. Document sequential-only vs raced-supported stages until coverage is complete.

## 5. Level identity and fingerprints

Persistent IDs (`P…`, `S…`, `R…`) identify entities; fingerprints identify exact structure/revision. Entity-attached persistence still keyed only by fingerprint can lose continuity after edits.

For entity records: key by persistent ID; store revision fingerprint; define mismatch behavior per data type (reuse/stale/validate-migrate/discard); migrate old fingerprint records on read and keep the old record until the new write succeeds. Keep fingerprints for structural equality/duplicates. Eventually rename numeric/position-derived `EngineLevel.id` to `position`/`sourceIndex` and reserve `id` for durable identity.

### Fingerprint compatibility

`level-fingerprint.ts` correctly freezes old calculators behind `getLegacyLevelFingerprints()`. Consumers should try current + known legacy keys and migrate forward. `level-submission-repository.ts` collection-wide structural scan is acceptable only as bounded fallback for unknown/unversioned records, with telemetry toward retirement.

**Rule:** known versioned compatibility reconstructs the old key; it does not normalize full scans.

## 6. Hint compatibility

`level-data-io.mjs` correctly upgrades historical file shapes to canonical `Hint[]`. Tooling still exposes mutable `level.hints: number[][]` and `level.hintRecords: Hint[]`, reconciled by `writeLevelsWithHints()`.

Move touched tooling to `Hint[]`; provide derived `hintPaths(records)` for geometry-only code; migrate opportunistically; simplify the writer after bare `.hints` mutation disappears. Keep historical formats readable at I/O.

## 7. Wire semantics and rule conformance

`level-codec.ts::parseRawLevel()` and solver `normalizeRawLevel()` both interpret wire coordinates, axes, portals, landmarks, hazards, and identity defaults. Define wire meaning once, then project to optimized solver representation. If layering blocks reuse, extract a small dependency-free semantic parser.

Rule implementations intentionally remain specialized:

- `runtime/game-rules.ts::areWinMetricsSatisfied()`;
- `domain/path-validator.ts`;
- `domain/move-rules.ts`;
- `solver/solution.ts::isSolutionState()`;
- solver dynamic move validity.

Treat the domain referee as canonical for complete paths; share cheap predicates/constants when safe; differential-test optimized movement/acceptance; require conformance fixtures for new mechanics. Move universal mode/axis/status literals out of synchronization comments and narrow `MoveState` alias polymorphism behind adapters.

## 8. Candidate coordinate formats

`path-validator.ts` accepts packed keys, 1-based `[x,y]`, and `{x,y}` with heuristic 0/1-base inference. Expose explicit `packed`/`xy0`/`xy1` formats or entry points. Keep autodetection only as compatibility; internal callers should never guess base.

## 9. CLI level selection

Canonical solver CLIs should use `level-data-io.mjs` explicit `pos:`/`id:` parsing. Preserve old syntax only behind a clearly deprecated compatibility layer.

Keep the capability sweep's explicit `PUZZLE_FIELDS` allowlist: it intentionally forces conscious admission of new mechanics into cold solver input.

## 10. Corpus activation and published storage

Corpus switching coordinates `data.ingest(...)`, `data.setHintsSource(...)`, and `data.setFirestoreHintsSource(...)`; omission can reset themes, choose wrong hints, or merge published supplemental hints into stress data. If coordination spreads beyond the current owner, add a `DataService` activation operation accepting levels/local hints/supplemental hints/theme policy and let `dev-corpus.ts` choose a `CorpusConfig`.

Published levels span committed local data and Firestore staging/`published_levels`. Preserve backend differences but expose an application-level `PublishedLevelRef`/catalog for backing-store resolution, duplicate lookup, hint addition, etc. Persistent ID should become the common entity key after migration. Do not force both stores into one physical schema.

## 11. Low-value solver aliases

`SolverApi` exposes `universalSolveLevel`, `solveLevel`, and `solve` for the same operation. Pick one canonical internal name, migrate opportunistically, leave deprecated adapters until unused. Do not spend a major refactor window here.

## Patterns to preserve

| Pattern | Reason |
|---|---|
| Frozen legacy fingerprint calculators | Versioned read/migration compatibility. |
| Hint upgrade on read | Many external forms -> one internal form. |
| `LEVEL_KEY_FIELDS` | One coordinate-field registry. |
| `ATTEMPT_POLICY` + stage policy/plan/budget modules | Executable policy authority shared by orchestration/tooling. |
| Engine flat + grouped facade | Compatibility views from one mapping, identity-tested. |
| Explicit cold-capability `PUZZLE_FIELDS` | Intentional duplicate declaration as research boundary. |

## Implementation order

1. **Solver authority:** finish residual mirrored dispatch/policy and telemetry compatibility cleanup (§2–4).
2. **Work scopes:** replace mutable global cumulative consumption only after equivalent behavior/hot-path cost are proven (§1).
3. **Identity/hints:** persistent ID + revision, legacy fingerprint migration, canonical `Hint[]` (§5–6).
4. **Semantic boundaries:** one wire interpretation, stronger rule conformance, explicit coordinate formats/shared selectors (§7–9).
5. **Lower-value surfaces:** corpus activation if needed, published-level facade, solver aliases (§10–11).

## Verification

Behavior-preserving solver refactors should run targeted characterization plus the appropriate finish-line gate; use explicit `workBudget` with non-binding deadline for decision-bearing comparisons; compare solved sets, `workSpent`, attempt order/config/stage, and deadline truncation; referee-validate paths; test raced planned-policy parity separately from winner timing; and measure policy optimization in a separate change.

Documentation-only changes should run the documentation-link check when feasible.

## Target

Every plurality should have an owner/reason: one wire interpretation with optimized projections; one solver policy/stage authority with multiple executors; one telemetry/provenance contract with multiple reporters; explicit work scopes; distinct work/node/time metrics; durable entity identity + structural revision; legacy forms normalized at boundaries; compatibility views derived from one authority.

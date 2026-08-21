# Architecture unification debt

> **Status:** live structural-debt queue, verified 2026-08-21 after solver-authority consolidation.
> **Read for:** remaining duplicate authority, compatibility migration, and boundary cleanup.
> **Do not use for:** solver-policy priorities; use [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).

Preserve behavior/evidence. Do not merge representations merely because they look similar. Priority remains solve count, correctness, deterministic evidence, speed, then neatness; keep structural refactors separate from solver-policy tuning.

The fuller 2026-08-21 audit before this compaction is preserved in git history (blob `b7bdc559c64901004dc8032a533e05931b7e0efa`).

## Classification rule

1. **Intentional plurality:** different representations answer different questions; keep with explicit ownership.
2. **Boundary compatibility:** accept old/new external forms, normalize once, keep the adapter.
3. **Parallel internal authority:** multiple modules encode one policy/schema/meaning; unify.
4. **Repeated mechanics:** generalize budget/telemetry/provenance/executor plumbing without forcing identical stage behavior.

External forms may vary; internal authorities should not.

## Remaining debt

| Area | Direction |
|---|---|
| Per-solve vs cumulative work meters | Keep both scopes; replace/encapsulate mutable global cumulative ownership. |
| Solver stage/retry policy | Canonical stage policy/plan/budget/identity has landed; remove residual mirrored dispatch only where behavior stays explicit. |
| Attempt/result telemetry | `stageId` is primary; keep legacy fields only at compatibility boundaries; retain one solver-originated external projection. |
| Sequential vs raced orchestration | Share policy identity/budgets; keep execution distinct and test planned-attempt parity, not winner parity. |
| `Hint[]` vs `.hints` + `.hintRecords` | Normalize inward to mutable `Hint[]`; keep historical shapes readable at I/O. |
| Persistent ID vs fingerprint | Keep both: ID = entity, fingerprint = structural revision; migrate entity persistence toward ID + revision. |
| Firestore fingerprint scans | Try current + known legacy keys first; reserve collection-wide structural scan for unknown/unversioned history. |
| Raw game vs solver parsing | Define wire meaning once, then project to optimized solver representation. |
| Runtime/domain/solver rules | One semantic specification with specialized implementations; referee complete paths and differential-test optimized logic. |
| Candidate coordinates | Replace internal base guessing with explicit `packed` / `xy0` / `xy1`; autodetection is compatibility only. |
| Level selectors | Canonical solver CLIs use shared explicit `pos:` / `id:` parsing. |
| Local vs Firestore published storage | Preserve backend differences behind an application-level published-level abstraction. |
| Corpus activation | Encapsulate coordinated levels/local hints/supplemental hints/theme selection if ownership spreads. |
| Solver aliases | Pick one canonical internal solve name opportunistically; leave adapters until unused. Low priority. |

## Work accounting

`prep._workMeter.units` is fresh per `solveLevel()` and authoritative for budgets/concurrent-solve independence. Module-global `workMeter.units` is cumulative realm scope used by multi-solve discovery tooling. Keep both meanings but prefer caller-owned session accounting by accumulating `SolveResult.workSpent` and passing remaining `workBudget`; use an explicit live caller scope only when a session must interrupt a nested solve.

Keep hot-path accounting direct/monomorphic and characterize discovery stopping behavior before migration. `CONNECTIVITY_WORK_UNITS = 12` is allocation currency, not literal move cost. Use pinned work for deterministic policy comparisons and wall time for implementation speed. See [`solver-budget-determinism.md`](solver-budget-determinism.md).

## Solver authority boundary

Current authorities are `modules/solver/stage-policy.ts`, `stage-budget.ts`, `stage-plan.ts`, `stage-executors.ts`, `Attempt.stageId`, and `attempt-identity.mjs`. New stages must use canonical stage/budget/telemetry infrastructure.

Budget resources remain distinct: `workBudget` (deterministic allocation), `timeBudgetMs` (deadline), `nodeBudget` (technique/diagnostic cap), and `strictTotalWorkBudget` (experiment-only whole-solve envelope). A stage budget must define ownership/rollover, node scope, deadline relation, reserve/additive behavior, expected binding resource, cross-resource behavior, and strict-total participation. Do not partition WORK shares beneath one shared NODE ceiling that early configs can exhaust.

Sequential/raced engines may schedule differently. `RACE_SUPPORTED_STAGE_IDS` makes race coverage explicit. Share stage/config identity and budget policy where practical; do not require deterministic race winners.

## Identity and compatibility

Persistent IDs (`P…`, `S…`, `R…`) identify entities; fingerprints identify exact structure/revision. Entity records should key by persistent ID, store revision fingerprint, define mismatch behavior per data type, and migrate legacy fingerprint records only after a successful new write. Keep frozen legacy calculators behind `getLegacyLevelFingerprints()`.

`level-data-io.mjs` correctly upgrades historical hint shapes. Move touched tooling to `Hint[]`, derive geometry-only paths when needed, and simplify writers only after bare `.hints` mutation disappears.

## Semantic boundaries

`level-codec.ts::parseRawLevel()` and solver `normalizeRawLevel()` should not independently define wire meaning. Extract/reuse dependency-light semantics where layering permits.

Specialized rule implementations may remain in runtime/domain/solver. Treat the domain referee as canonical for complete paths; share cheap predicates/constants when safe; add conformance fixtures for new mechanics. Keep the capability sweep's explicit `PUZZLE_FIELDS` allowlist: deliberate duplicate admission is a research boundary, not accidental authority.

## Patterns to preserve

| Pattern | Why |
|---|---|
| Frozen legacy fingerprint calculators | Versioned read/migration compatibility. |
| Hint upgrade on read | Many external forms -> one internal form. |
| `LEVEL_KEY_FIELDS` | One coordinate-field registry. |
| Stage policy/plan/budget authorities | Executable policy shared by orchestration/tooling. |
| Engine flat + grouped facade | Compatibility views derived from one identity-tested mapping. |
| Explicit cold-capability `PUZZLE_FIELDS` | Conscious mechanic admission boundary. |
| `workSpent` / `nodesExpanded` / elapsed | Allocation, technique progress, and latency are different metrics. |

## Implementation order

1. Finish residual solver dispatch/telemetry compatibility cleanup without policy changes.
2. Replace implicit global work ownership after behavior/hot-path cost are characterized.
3. Migrate persistent entity identity and mutable hints inward.
4. Unify wire interpretation, strengthen rule conformance, and remove coordinate/selector guessing.
5. Address corpus/published-storage facades and solver aliases only when they remove demonstrated repeated work.

## Verification

Behavior-preserving solver refactors need targeted characterization plus the relevant [`testing.md`](testing.md) finish-line gate. Use explicit `workBudget` with a non-binding deadline for decision-bearing comparisons; compare solved sets, `workSpent`, attempt order/config/stage, and deadline truncation; referee-validate paths; test raced planned-policy parity separately from winner timing; measure policy optimization in a separate change.

Target state: every plurality has an owner and a reason; compatibility normalizes at boundaries; current semantics/policy have one internal authority and multiple deliberate projections.

# Architecture unification debt

> **Status:** live structural-debt queue, reconciled 2026-08-27 after budget-model rationalization.
> **Read for:** remaining duplicate authority, compatibility migration, state-lifetime isolation, and boundary cleanup.
> **Do not use for:** solver-policy priorities; use [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).

Preserve behavior/evidence. Do not merge representations merely because they look similar. Correctness and reproducible causal evidence outrank neatness. Keep structural refactors separate from solver-policy tuning unless the structural defect itself invalidates research.

The fuller 2026-08-21 audit before compaction is preserved in git history (blob `b7bdc559c64901004dc8032a533e05931b7e0efa`).

## Classification rule

1. **Intentional plurality:** different representations answer different questions; keep with explicit ownership.
2. **Boundary compatibility:** accept old/new external forms, normalize once, keep the adapter.
3. **Parallel internal authority:** multiple modules encode one policy/schema/meaning; unify.
4. **Repeated mechanics:** generalize budget/telemetry/provenance/executor plumbing without forcing identical stage behavior.
5. **Hidden lifetime coupling:** mutable state survives longer than the conceptual operation that owns it and can change later behavior. Make lifetime explicit, reset/isolate it, or formalize an intentional handoff.

External forms may vary; internal authorities and mutable lifetimes should not be ambiguous.

## Remaining debt

| Area | Direction |
|---|---|
| **Search-stage mutable-state isolation** | **P0 while unexplained sequence dependence exists.** A target action run from fresh preparation versus after unrelated predecessor stages should be search-equivalent at fixed explicit input/config/seed/work unless a documented typed handoff says otherwise. Inventory and isolate caches, memo tables, PRNG state, counters, proxy overrides, and reusable scratch by ownership/lifetime. |
| **Budget semantics / mutable caps** | **High-priority scheduler prerequisite (queue #2).** Base-vs-total naming has begun; next make stage work ownership authoritative, replace shared mutable `prep._workCap` inheritance with explicit attempt/stage budget context, then retire the finite ms-derived additive-stage inventory one behavior-preserving site at a time. Any solve-policy change discovered during migration becomes a scheduler experiment rather than structural cleanup. |
| Per-solve vs cumulative work meters | Keep both meanings only while ownership is explicit; replace/encapsulate mutable global cumulative ownership so it cannot influence solve budgets or nested/concurrent behavior. |
| Solver stage/retry policy | Canonical stage policy/plan/budget/identity has landed; remove residual mirrored dispatch only where behavior stays explicit. New search actions should flow through scheduler/action identity rather than creating another policy authority. |
| Attempt/result telemetry | `stageId` is primary; keep legacy fields only at compatibility boundaries; retain one solver-originated external projection. Telemetry must preserve enough config/seed/budget/protocol identity to reproduce research claims. |
| Sequential vs raced orchestration | Share policy identity/budgets; keep execution distinct and test planned-attempt parity, not winner parity. Do not infer semantic equivalence from similar solve counts. |
| `Hint[]` vs `.hints` + `.hintRecords` | Normalize inward to mutable `Hint[]`; keep historical shapes readable at I/O. |
| Persistent ID vs fingerprint | Keep both: ID = entity, fingerprint = structural revision; migrate entity persistence toward ID + revision. |
| Firestore fingerprint scans | Try current + known legacy keys first; reserve collection-wide structural scan for unknown/unversioned history. |
| Raw game vs solver parsing | Define wire meaning once, then project to optimized solver representation. |
| Runtime/domain/solver rules | One semantic specification with specialized implementations; referee complete paths and differential-test optimized logic. Preserve independent arbiters where independence is useful for catching drift. |
| Candidate coordinates | Replace internal base guessing with explicit `packed` / `xy0` / `xy1`; autodetection is compatibility only. |
| Level selectors | Canonical solver CLIs use shared explicit `pos:` / `id:` parsing. |
| Local vs Firestore published storage | Preserve backend differences behind an application-level published-level abstraction. |
| Corpus activation | Encapsulate coordinated levels/local hints/supplemental hints/theme selection if ownership spreads. |
| Solver aliases | Pick one canonical internal solve name opportunistically; leave adapters until unused. Low priority. |

## Stage-state isolation

The former admissible-order sequence-dependence blocker has been retired by the workstream authority after the attribution error was identified. Keep the isolation contract below as a non-regression rule: if a new same-action, same-input fresh-vs-preceded discrepancy appears, it immediately becomes correctness/research-validity debt again.

A stage/action should have an explicit input contract. For a search action that is supposed to be independent, predecessor execution may change CPU/cache warmth but must not silently change:

- legal/search state;
- score/order inputs;
- random stream/seed;
- memoized mathematical values;
- budget/work accounting;
- proxy/ablation overrides;
- eligibility/config identity.

Diagnosis pattern:

1. reproduce the same action fresh and after a minimal predecessor prefix;
2. snapshot/diff every mutable field the action can read;
3. clear candidate state classes one at a time, starting with supposedly pure lower-bound memo tables and stage overrides;
4. locate the first search decision or budget check that diverges;
5. if predecessor information is genuinely useful, replace accidental shared mutation with a typed producer -> receptor artifact and independent control path;
6. add a regression fixture so later refactors cannot silently reintroduce history dependence.

Do not “fix” this by making isolated experiments run the whole predecessor ladder. That hides the dependency instead of defining it.

## Work accounting

`prep._workMeter.units` is fresh per `solveLevel()` and authoritative for budgets/concurrent-solve independence. Module-global `workMeter.units` is cumulative realm scope used by multi-solve discovery tooling. Keep both meanings only while callers cannot confuse them; prefer caller-owned session accounting by accumulating `SolveResult.workSpent` and passing remaining `workBudget`.

Keep hot-path accounting direct/monomorphic and characterize discovery stopping behavior before migration. `CONNECTIVITY_WORK_UNITS = 12` is allocation currency, not literal move cost. Use pinned work for deterministic policy comparisons and wall time for implementation speed. See [`solver-budget-determinism.md`](solver-budget-determinism.md).

## Solver authority boundary

Current authorities are `modules/solver/stage-policy.ts`, `stage-budget.ts`, `stage-plan.ts`, `stage-executors.ts`, `Attempt.stageId`, and `attempt-identity.mjs`. New actions/stages must use canonical stage/budget/telemetry infrastructure.

Budget resources remain distinct: `workBudget` (legacy-named base deterministic allocation), `timeBudgetMs` (deadline plus inventoried additive-tier compatibility sizing debt), `nodeBudget` (deterministic technique/cumulative diagnostic cap), and `strictTotalWorkBudget` (experiment-only whole-solve work envelope). A stage budget must define ownership/rollover, node scope, deadline relation, reserve/additive behavior, expected binding resource, cross-resource behavior, and strict-total participation. Do not partition WORK shares beneath one shared NODE ceiling that early configs can exhaust.

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
| Independent referee/reference paths | Shared semantics without one implementation hiding another's bug. |

## Implementation order

0. **Budget-model completion for queue #2:** finish stage work-envelope projection and explicit base/total semantics; replace `prep._workCap` inheritance with explicit budget context; isolate module-global multi-solve work ownership; then retire ms-derived additive allocation sites incrementally with parity evidence.
1. Finish residual solver dispatch/telemetry compatibility cleanup only where it directly supports that budget/stage authority or removes demonstrated ambiguity.
2. Reopen stage-history isolation only if a new fresh-vs-preceded discrepancy appears; the former admissible-order blocker is retired in the workstream authority.
3. Migrate persistent entity identity and mutable hints inward.
4. Unify wire interpretation, strengthen rule conformance, and remove coordinate/selector guessing.
5. Address corpus/published-storage facades and solver aliases only when they remove demonstrated repeated work.

Do not allow low-value architecture tidiness to displace queue #0 evidence work or queue #2 budget-model completion. Budget ownership/determinism cleanup is specifically exempt from the usual 'architecture can wait' rule because it is required for trustworthy scheduler evidence.

## Verification

Behavior-preserving solver refactors need targeted characterization plus the relevant [`testing.md`](testing.md) finish-line gate. Use explicit `workBudget` with a non-binding deadline for decision-bearing comparisons; compare solved sets, `workSpent`, attempt order/config/stage, deadline truncation, and fresh-vs-preceded parity where lifetime is touched; referee-validate paths; test raced planned-policy parity separately from winner timing; measure policy optimization in a separate change.

Target state: every plurality has an owner and a reason; every mutable resource has an owner and lifetime; compatibility normalizes at boundaries; current semantics/policy have one internal authority and multiple deliberate projections.
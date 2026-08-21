# Architecture unification audit

> **Status:** current engineering review and migration proposal. This is not an instruction to
> mechanically collapse every duplicated representation. It classifies current plurality by
> semantics and recommends behavior-preserving consolidation where multiple authorities or policy
> implementations can drift.
>
> **Last verified:** 2026-08-20 against `main` at `c30a780c9a176993511156e055dbab2728dbc7d6`.
> Re-check the named files before implementing a proposal; solver orchestration is changing quickly.
>
> **Priority rule:** solver solve count, correctness, deterministic research evidence, and speed take
> precedence over architectural neatness. Refactors should preserve the existing search policy first;
> optimization is a separate decision-bearing change.

## Executive conclusion

Pathfinder does not have one generic "too much duplication" problem. It has four different shapes
that should be treated differently:

1. **Intentional plurality:** two representations or counters answer different questions. Preserve
   both and make their ownership explicit.
2. **Compatibility at a boundary:** old/new external forms are accepted, then normalized. Keep this;
   it is the healthy form of legacy support.
3. **Parallel internal authorities:** two modules independently encode the same policy, schema, or
   interpretation and therefore have to "stay in sync." Unify these.
4. **Patch-stack orchestration:** each new solver stage adds another condition, budget override,
   boolean tag, reporter field, provenance special case, and alternate-executor implementation.
   Generalize the repeated mechanism without changing what the stages do.

A useful rule for future cleanup is:

> **Multiple external forms are fine. Multiple internal authorities are suspicious. Multiple
> implementations of policy are dangerous.**

A second rule follows from the current work-accounting design:

> **Do not unify things merely because they count the same event. Scope and semantics can make two
> counters legitimately different. The smell is when callers must personally remember the treaty
> between them.**

The highest-value work is therefore not deleting aliases or shaving small adapters. It is making
solver stage identity, telemetry/provenance, budget ownership, and executor policy first-class so
new solver research stops creating another synchronization surface each time it ships.

## Classification summary

| Area | Classification | Recommendation |
|---|---|---|
| Per-solve vs cumulative work meters | **Preserve semantics; encapsulate interface** | Per-solve meter remains budget authority; cumulative meter remains a distinct session/tooling scope, but should not be a generally mutable solver-internal singleton API. |
| `workSpent` vs `nodesExpanded` vs elapsed time | **Preserve** | They measure normalized allocation, technique-local progress, and real latency respectively. Never collapse them into one "cost" field. |
| Solver post-ladder/retry stages | **Unify policy representation** | Introduce declarative stage descriptors consumed by orchestration, telemetry, provenance, and alternate executors. |
| Attempt/result telemetry | **Unify authority** | Export one stable telemetry schema; stop re-declaring `AttemptLike`, `unknown[]`, and reporter whitelists independently. |
| Sequential vs raced solver orchestration | **Unify policy; keep execution different** | Both executors should consume the same stage plan while retaining different scheduling semantics. |
| Hint `Hint[]` vs `.hints` + `.hintRecords` | **Boundary compatibility moving inward** | Keep legacy readers; migrate tools toward one canonical in-memory `Hint[]` authority and derive bare paths on demand. |
| Persistent level id vs fingerprint | **Preserve both, fix ownership** | Persistent id identifies the level entity; fingerprint identifies an exact structural revision. Persistence should stop using revision identity where entity identity is intended. |
| Legacy fingerprint calculators | **Preserve** | This is exemplary versioned compatibility: frozen old algorithms at a read/migration boundary. Reuse it instead of inventing other legacy scans. |
| Raw game parser vs raw solver parser | **Unify wire interpretation** | Parse wire semantics once, then project into the solver's optimized representation. |
| Runtime/domain/solver rule implementations | **Keep optimized representations; unify specification/conformance** | Share pure rule predicates where practical and differential-test the solver's optimized implementation against the canonical referee. |
| Engine flat + grouped facade | **Preserve** | Current architecture explicitly makes them identical references and tests that contract. This is codified compatibility, not drift-prone duplication. |
| Level selector parsing | **Unify** | Canonical capability tooling should use the shared explicit `pos:`/`id:` selector contract. |
| Firestore fingerprint full scans | **Retire compatibility patch** | Query known frozen legacy fingerprints or migrate/backfill stored keys; reserve full scans for exceptional unknown data, not the normal bridge. |
| Published local corpus vs Firestore publication paths | **Encapsulate storage plurality** | Keep both stores if needed, but expose one application-level published-level abstraction. |
| Corpus activation (`ingest` + two hint-source setters) | **Encapsulate coordination** | Make corpus activation one operation so callers cannot forget themes or one hint source. |

## 1. Work accounting: intentional dual tracking, but the scope contract should be explicit

### Current design

`modules/solver/work-meter.ts` now documents a concurrency fix that materially changes how its
module-global `workMeter` should be understood.

Every canonical work event increments **two counters of the same unit**:

- `prep._workMeter.units` is fresh per `solveLevel()` call. Every internal work cap and per-solve
  accounting decision uses it. It is the correctness/budget authority and makes concurrent solves
  in one JS realm independent.
- module-global `workMeter.units` is still incremented as a process/realm cumulative total so
  black-box hint-discovery code spanning many sequential `solverApi.solve()` calls can impose one
  ceiling without reaching into each call's `prep`.

This is not the same duality as `workSpent` versus nodes versus time. Those are different *metrics*;
these are two *scopes of the same metric*.

The fix is sound and the two scopes are useful. The remaining architectural issue is that the
cumulative scope is still exposed as the mutable solver-internal singleton `workMeter`. For example,
`modules/solver/diversification.ts` imports it directly and compares absolute global values against
its resumable session ceiling. That makes an important assumption implicit: unrelated concurrent
solver work in the same realm must not be allowed to count against that discovery session.

### Proposal

Do **not** collapse back to one counter. Instead make the scope distinction a public contract:

1. Keep `prep._workMeter` as the only internal solve-budget authority.
2. Rename or wrap the global role as explicitly cumulative/session instrumentation, for example
   `cumulativeWorkMeter`, with a read-only external API such as `readCumulativeWorkUnits()`.
3. Prefer removing the global dependency from high-level discovery sessions entirely if it can be
   done without changing their stopping point: track `SolveResult.workSpent` across completed nested
   solves and pass the session's remaining work into each subsequent solve as an explicit
   `workBudget`. This gives the caller its own scope and cannot absorb another concurrent solve.
4. If a discovery algorithm truly needs a live cumulative counter that can stop *inside* a nested
   solve, introduce an explicit caller-owned work scope rather than falling back to a process
   singleton. Keep the hot-path implementation monomorphic/direct; do not buy architecture purity
   with measurable per-move overhead.
5. Characterize the existing discovery-session stopping behavior before migration and require
   equivalent found-hint order/set under a pinned work ceiling.

### Important semantic guardrail

The canonical work unit is an **allocation/fairness currency**, not a literal CPU stopwatch.
`CONNECTIVITY_WORK_UNITS = 12` was fitted to equalize work rates across heterogeneous techniques.
It therefore should not be used as a claim that every `isConnected` call physically costs exactly
12 `applyMove` calls, or that an optimization which halves the cost of each connectivity call must
halve `workSpent`.

For solver-policy comparisons, pinned work is the right deterministic currency. For pure speed/hot-
path optimization, report wall time as well: a change can make the same declared work substantially
cheaper. `docs/solver-budget-determinism.md` should preserve this distinction explicitly.

## 2. Solver stages have outgrown boolean flags and one-off budget fields

`modules/solver/attempts.ts` already demonstrates the good form: base attempt selection is encoded in
a declarative `ATTEMPT_POLICY`. The orchestration *around* those attempts has not reached the same
shape.

`modules/solver/orchestration.ts`'s `Attempt` currently carries a growing family of diagnostic stage
booleans, including `attractionDiversity`, `dedupNearTieRetry`,
`admissibleOrderNonDefaultRetry`, `connectivityAxisExhaustedRetry`,
`repairElitePrefixDfsRetry`, `mcNeighborBudgetRetry`, `repairLateProbe`, `repairProbe`,
`repairProbeShrinkRecovery`, and `mainLoopLateReserve`. `SolveOpts` likewise carries stage-specific
budget/reserve overrides.

Individually, many of these stages are rational. A feature that helps globally can still have a
small counterfactual population that is worth retrying only after the ordinary solver fails. The
architectural problem is not "retries are hacks." It is that every retry has to hand-wire the same
cross-cutting concerns again.

### Proposal: a first-class stage plan

Introduce a declarative `SolverStage`/`StageSpec` representation whose fields cover at least:

- stable `stageId` and optional variant/tags;
- eligibility predicate;
- attempt/config source or config overlay;
- scheduling/order semantics;
- feature overrides/forcing;
- budget policy;
- whether budget is additive or carved from the ordinary envelope;
- work/node/deadline semantics;
- provenance identity;
- whether the stage is production/default, opt-in, or research-only.

The first migration must be **behaviorally inert**. Encode the current ladder exactly, in the same
order with the same budgets and flags, and have the existing sequential executor interpret it.
Only after equivalence tests should any stage policy itself change.

A useful consequence is that a new counterfactual retry becomes one data entry rather than changes
scattered through orchestration, options, reporters, provenance, and alternate schedulers.

## 3. Budgeting should be one multi-resource model, not one currency

The current budget documentation correctly distinguishes:

- `workBudget`: deterministic cross-technique allocation currency;
- `timeBudgetMs`: outer latency/deadline resource;
- `nodeBudget`: technique-local/diagnostic cap;
- `strictTotalWorkBudget`: experiment-only whole-solve envelope.

That plurality should remain. The failure mode to eliminate is **manual interaction between the
resources**.

Recent retry-tier work has repeatedly shown why. A stage may divide WORK fairly among configs while
all configs share one absolute NODE ceiling. If the node ceiling binds first, config 1 can consume
the stage's effective capacity and leave later configs with nominal work allowance they can no
longer spend. That is not an argument for deleting node tracking; it is an argument for making node
ownership explicit.

### Proposal: `StageBudget` / `BudgetEnvelope`

A stage should declare, rather than reimplement:

- work allocation and whether unused work rolls forward;
- node ceiling and whether it is per-attempt, per-config, per-stage, or whole-solve;
- deadline relationship;
- reserve/additive semantics;
- which resource is expected to bind;
- what happens when another resource binds first;
- whether the stage is subject to `strictTotalWorkBudget`.

This turns "shared node cap + partitioned work cap" from an accidental interaction into an explicit
policy a reviewer can see in one place.

## 4. Attempt/result telemetry is still a parallel-schema system

This is currently the clearest data-integrity cleanup and should precede a large stage refactor.

`modules/solver/orchestration.ts` owns the real `Attempt` shape, but that interface is internal.
`modules/ports.ts` declares `SolveResult.attempts: unknown[]` and its `SolveResult` interface omits
newer result fields such as work/deadline/lifecycle telemetry. `modules/solver/hint-provenance.ts`
therefore declares its own `AttemptLike` and explicitly says it is duck-typing the unexported
attempt objects. Batch tooling performs another hand-maintained projection in
`scripts/portfolio-solve-sweep-lib.mjs::attemptRecord()`.

The comments in that reporter record several previous incidents where a newly added field was
silently omitted and persisted reports misclassified attempts. The same class of drift exists on
current main: `Attempt` has the newer retry-stage flags listed above, while `attemptRecord()` does
not currently project `dedupNearTieRetry`, `admissibleOrderNonDefaultRetry`,
`connectivityAxisExhaustedRetry`, `repairElitePrefixDfsRetry`, `mcNeighborBudgetRetry`, or
`repairLateProbe`.

That means the live solver can know *why* an attempt ran while a persisted sweep erases the answer.

### Proposal

1. Export a stable `SolveAttemptTelemetry` and current `SolveResult` contract from the solver layer.
   The runtime-internal attempt object may remain richer if useful, but external consumers should
   receive one canonical stable projection produced once at the source.
2. Make `modules/ports.ts`, workers, reporters, and provenance import that contract rather than
   re-declare it.
3. Replace the accumulating mutually-overlapping stage booleans with a first-class `stageId` plus
   optional structured stage metadata. During migration, legacy booleans can still be emitted by an
   artifact codec if old reports require them.
4. Centralize `attemptConfigKey` too. `portfolio-solve-sweep-lib.mjs` currently documents that its
   implementation must mirror orchestration exactly; this is precisely the kind of duplicate policy
   that should become one pure shared formatter/identity function.
5. Add schema-completeness tests: a sentinel attempt containing every supported telemetry field
   should survive worker transport, report projection, JSON round-trip, and provenance conversion
   without silent loss.

### Immediate repair before the larger refactor

Even if the stage/schema refactor is deferred, add the currently missing retry-stage identity to
persisted attempt records now. Current research should not continue generating artifacts that erase
known information.

## 5. Hint provenance needs invocation/stage identity, not more special cases

`modules/solver/hint-provenance.ts` currently recognizes ordinary technique/config information,
repair bias, admissible-order, and the attraction-diversity rerun. It does not recognize the newer
retry-stage booleans.

This is especially important because the live optimization queue now treats provenance/invocation
ambiguity as a decision-bearing problem: a valid hint found by an isolated technique is not the same
evidence as a cold production-ladder solve.

### Proposal

Add a structured invocation/stage dimension to solver provenance rather than mapping every new stage
to another bespoke field. It should be possible to answer from a stored hint:

- Was this a full production `solveLevel()` invocation or isolated method tooling?
- Which orchestration stage produced the winning attempt?
- Which non-default feature overrides/forcing were active?
- Was the stage default-on production policy, force-enabled experiment, or research-only?

Keep `technique` (DFS/beam/repair/admissible-order) separate from `stageId`: they vary independently.
Do not overload `forcing.disabledFeatures` to mean every kind of stage identity.

This should share the same canonical telemetry/invocation descriptor as reports. Provenance should
not reverse-engineer the answer from attempt order.

## 6. Sequential and raced execution should share policy, not implementation

`scripts/solver-parallel/race.mjs` is intentionally a different executor: it runs attempts on worker
threads and therefore has different scheduling and winner-timing semantics. That plurality is
legitimate.

The risky part is that the file also independently reconstructs solver orchestration. Its header
says it races the same policy-selected attempts and is purely a scheduling change, but it contains
its own budget-sharing logic, repair/main queues, ablation materialization, and a separately ported
attraction-diversity post-phase. There is no shared first-class stage plan that can mechanically
ensure every subsequently added retry/tail stage exists in both executors with the intended
semantics.

### Proposal

Have sequential and raced execution consume the same `StageSpec[]`:

- sequential executor interprets stage order serially;
- raced executor decides how eligible attempts within a stage are scheduled across workers;
- both report the same canonical stage/config identity and budget envelope;
- a parity test enumerates the planned attempt/stage set without running search and verifies both
  executors consume the same policy input.

Do **not** require raced results to be deterministic in the same sense as sequential results; first
success in a race is inherently timing-sensitive. The unification target is *planned policy*, not
winner timing.

Until that exists, documentation should describe raced execution as a separately mirrored scheduler
and state which post-ladder stages it implements, rather than promising blanket identity that code
cannot enforce.

## 7. Persistent level identity and structural revision are still conflated in persistence

The level-id migration established a useful distinction:

- persistent string ids (`P…`, `S…`, `R…`) identify a level entity across reorderings;
- fingerprints identify an exact structural content/revision and intentionally change when the
  puzzle changes.

Current persistence has not fully adopted that split. Dev-mode ratings are still stored under a
fingerprint key (`level_ratings/{fingerprint}`), and local supplemental hints are stored under
`local_level_hints/{fingerprint}`. Editing a level therefore changes the lookup identity even when
what the application conceptually wants is "this level, now at a new revision."

### Proposal

For records conceptually attached to a level entity:

1. key by persistent id;
2. store the current fingerprint/revision on the record;
3. define explicit behavior when the stored revision and current revision differ (reuse, mark
   stale, validate/migrate, or discard according to the data type);
4. migrate old fingerprint-keyed records on read, retaining the old record until the new write is
   confirmed.

Keep fingerprints for exact-structure equality and duplicate detection. Do not turn persistent ids
into content hashes.

Also continue the naming cleanup over time: `EngineLevel.id` is still numeric/position-derived while
`EngineLevel.persistentId` is the actual durable id. Reserve `id` for durable identity in a future
major representation migration and call the numeric concept `position`/`sourceIndex`.

## 8. Fingerprint compatibility has one excellent pattern and one expensive patch

`modules/domain/level-fingerprint.ts` is a model worth copying. Old fingerprint algorithms are frozen
as self-contained calculators and exposed through `getLegacyLevelFingerprints()`. The rating manager
tries the current key, tries known legacy keys on a miss, and copies a hit forward.

`modules/persistence/level-submission-repository.ts` handles the same versioning problem differently.
After an indexed current-fingerprint miss it performs a full collection scan and recomputes
structural equality under the current algorithm so pre-version-bump documents can still be found.
That is robust as an emergency bridge but scales with collection size and duplicates compatibility
knowledge that already exists in the fingerprint module.

### Proposal

Query the finite set of known current + frozen legacy fingerprint values directly and/or backfill
stored documents to the current fingerprint version. Keep a full structural scan only as a bounded
fallback for genuinely unknown/unversioned historical records, with telemetry so it can eventually
be retired.

General rule: when a compatibility algorithm is known and versioned, **reconstruct the old key**;
do not permanently compensate with a collection-wide search.

## 9. Hint compatibility is healthy at the file boundary but still dual inside tooling

The on-disk direction is good. `scripts/level-data-io.mjs` accepts multiple historical hint formats
and upgrades them to canonical `Hint[]` records. This is exactly "accept many, normalize once."

The remaining compatibility burden is that Node tools receive *both*:

- `level.hints`: bare `number[][]` paths for old geometry-oriented tools;
- `level.hintRecords`: canonical `Hint[]` with provenance.

`writeLevelsWithHints()` then reconciles the two authorities. This has preserved a large existing tool
surface safely, but it also means any new tool can accidentally join the legacy side and prolong the
migration.

### Proposal

1. Declare `Hint[]` the sole target in-memory authority for newly touched tooling.
2. Give geometry-only code an explicit `hintPaths(records)` derived view rather than a synchronized
   sibling property.
3. Migrate scripts opportunistically when they are otherwise modified; do not stage a risky flag-day
   rewrite of every hint tool.
4. Once no writer mutates bare `.hints`, simplify `writeLevelsWithHints()` and retain only legacy
   *readers* at the persistence boundary.

Legacy file formats should remain readable. The cleanup target is dual mutable in-memory authority,
not historical data compatibility.

## 10. Raw level wire semantics are parsed twice

`modules/domain/level-codec.ts::parseRawLevel()` is documented as the shared application parser from
1-based wire data to packed engine data. `modules/solver/normalization.ts::normalizeRawLevel()`
independently interprets the same wire fields into the solver's `NormalizedLevel`, including
coordinates, axis values, portals, landmarks, hazards, and identity defaults.

The solver absolutely should keep an optimized representation. The duplicate part is deciding what
the wire format *means*.

### Proposal

Parse/validate wire semantics once into a canonical domain level, then project that parsed object
into the solver's representation. Keep the solver projection dependency-light and benchmark it, but
make adding a new mechanic require one wire-format interpretation rather than coordinated parser
changes.

If import layering makes direct reuse undesirable, extract a tiny dependency-free wire parser shared
by both projections. The goal is one semantic parser, not one universal runtime object.

## 11. Rule duplication should be governed by a conformance contract

There are good reasons the solver cannot simply call the runtime referee on every search node. Its
bitmasks and typed arrays exist for speed. But several rule implementations currently carry explicit
"must stay in sync" or "mirrors X" comments:

- `modules/runtime/game-rules.ts::areWinMetricsSatisfied()` is the live win arbiter;
- `modules/domain/path-validator.ts` replays moves then independently rechecks length,
  intersections, must-pass/cross, surround, must-turn, and adjacent-turn;
- `modules/domain/move-rules.ts` contains goal-time metric checks and documents historical drift
  from game rules;
- `modules/solver/solution.ts::isSolutionState()` is the optimized solver acceptance predicate;
- solver dynamic move validity has its own optimized representation of movement constraints.

The comments record real occasions where one side had a rule the other lacked. That makes this a
correctness-sensitive parallel-authority area.

### Proposal

- Extract/share small pure semantic predicates where doing so does not harm the hot path.
- Treat the domain referee as canonical for complete-path correctness.
- Keep optimized solver acceptance/move logic, but maintain differential/conformance tests that
  generate/replay states and prove agreement with the domain rules.
- Require a new mechanic to update the conformance fixtures as part of its definition of done.

The aim is **one specification with multiple optimized implementations**, not one slow implementation
forced into every context.

### Related narrow cleanup

`modules/domain/move-rules.ts` and `modules/runtime/game-rules.ts` still hard-code mode/axis/status
values with comments saying they must stay synchronized with Core. Move dependency-free universal
constants into a domain constants module and have Core re-export them. A "MUST stay in sync" comment
for a literal enum value is a cheap, high-confidence unification target.

`MoveState` also accepts nested engine state and several flat aliases (`visitedCounts`/`counts`,
`cellUsage`/`usage`, `isPortalJump`/`jumpSet`, etc.). Move that polymorphism into adapters and let the
core rule accept one exact evaluation-state shape once test callers have migrated.

## 12. Candidate path coordinate formats are ambiguous

`modules/domain/path-validator.ts` accepts packed numeric keys, `[x,y]` arrays, and `{x,y}` objects.
Arrays are interpreted as 1-based coordinates. Objects are heuristically treated as 0- or 1-based,
which is inherently ambiguous for ordinary in-bounds values.

### Proposal

Expose explicit entry points or a required format option (`packed`, `xy0`, `xy1`). Keep the existing
autodetecting wrapper only as a compatibility adapter until callers are migrated. Internal code
should never depend on guessing a coordinate base.

## 13. Canonical CLI level-selection semantics are not universal yet

`scripts/level-data-io.mjs` now has a shared selector contract that deliberately rejects bare numeric
specs as ambiguous and requires explicit `pos:` or `id:` meaning.

`scripts/level-blind-capability-sweep.mjs`, despite being the canonical capability entrypoint, still
implements its own `parseLevelSpec()` and accepts bare numbers/ranges (and strips an optional
`pos:` prefix). This is exactly the sort of small local parser that later becomes a tooling treaty.

### Proposal

Use the shared selector parser/help text in the capability sweep and any remaining solver CLIs. Keep
one compatibility layer only where a workflow actually depends on the old syntax, and deprecate it
explicitly rather than silently supporting different meanings in different tools.

The capability sweep's explicit `PUZZLE_FIELDS` allowlist is **not** duplication to remove. It is a
research-integrity boundary that intentionally requires a conscious edit when a new mechanic is
allowed into cold solver input.

## 14. Corpus activation is a coordinated operation represented as three calls

`modules/dev-corpus.ts` currently knows that changing corpora requires all of the following:

- `data.ingest(...)` with themes explicitly re-supplied because ingest otherwise resets them;
- `data.setHintsSource(...)`;
- `data.setFirestoreHintsSource(...)`.

The switcher handles this correctly, but the comments show the failure mode: forgetting one part can
wipe themes, point at the wrong hint directory, or accidentally merge supplemental published hints
into a stress corpus.

### Proposal

Give `DataService` a first-class corpus/source activation operation whose input describes levels,
local hint source, supplemental hint source, and theme-retention policy. `dev-corpus.ts` should select
a `CorpusConfig`; it should not personally maintain the synchronization recipe.

This is a lower-priority cleanup because there is currently one well-documented coordinator. It
becomes more valuable if another corpus-switching caller appears.

## 15. Published levels span two storage backends and leak that distinction upward

The application has published levels in the local committed corpus and in Firestore staging/
`published_levels`. Review persistence therefore has separate `approveHintAddition()` and
`approveLocalHintAddition()` paths, with different storage mechanics. Local supplemental hints are
also identified by fingerprint while Firestore-published additions target a document id.

Different storage is legitimate. The application-level concept is still "add reviewed hints to a
published level."

### Proposal

Introduce a `PublishedLevelRef`/catalog abstraction that resolves a published level to its backing
store and exposes operations such as duplicate lookup and hint addition. Keep backend-specific
transaction semantics inside repositories. Persistent level ids should become the common entity
identifier once the migration in section 7 is complete.

Do not force local files and Firestore into one physical schema merely for symmetry.

## 16. Solver facade aliases are low-risk compatibility debt

`modules/ports.ts::SolverApi` still exposes `universalSolveLevel`, `solveLevel`, and `solve` for the
same basic operation. This is not causing the current research-integrity problems, so it belongs
near the end of the queue.

### Proposal

Choose one canonical name (`solve` or `solveLevel`) for internal callers, migrate them, and keep the
other names only in an explicitly deprecated adapter until usage reaches zero. Do not spend a large
refactor window on this while stage/telemetry authority is still fragmented.

## Patterns that should be copied, not cleaned up

Several parts of current main already demonstrate the desired architecture:

### Frozen legacy fingerprint calculators

Known old versions are preserved as immutable implementations and only used on a current-key miss.
Compatibility is explicit, versioned, and migrates forward.

### Hint file upgrade on read

Bare arrays and older wrapper schemas are accepted at the I/O boundary and converted into canonical
`Hint[]`. Consumers do not need separate parsers for every historical file format.

### `LEVEL_KEY_FIELDS`

Coordinate-bearing fields are centrally enumerated so remap/iteration operations consume one
declarative registry rather than each forgetting the newest field.

### Declarative `ATTEMPT_POLICY`

Base solver attempt selection already lives in one ordered policy table. The proposed stage plan is
an extension of this successful pattern to the orchestration layers surrounding the attempts.

### Engine grouped facade

The flat and grouped surfaces are constructed from one mapping and tests assert reference identity.
This is how to retain a compatibility view without retaining two implementations.

### Explicit cold-capability allowlist

`PUZZLE_FIELDS` in the level-blind sweep intentionally duplicates awareness of gameplay mechanics so
research metadata is excluded by default. Security/research boundaries sometimes should require a
second explicit declaration.

## Proposed implementation order

This order minimizes the chance that architecture work perturbs solver capability or destroys the
very evidence needed to judge later changes.

### Phase 0 — characterize, do not optimize

- Pin current-main solver result/attempt schemas in tests.
- Add report/provenance round-trip coverage for all current stage flags and budget fields.
- Add/retain sequential solver deterministic fixtures under explicit work budgets.
- Record raced planned-stage parity separately from raced winner timing.

### Phase 1 — repair telemetry/provenance authority

1. Immediately persist the currently dropped retry-stage identity.
2. Export canonical attempt/result telemetry types.
3. Make ports, worker transports, report projection, and hint provenance consume them.
4. Add structured invocation/stage identity while retaining legacy fields during migration.
5. Centralize attempt config identity formatting.

This phase directly supports the current solver queue's provenance-repair work and should happen
before more evidence is accumulated under an ambiguous schema.

### Phase 2 — make orchestration declarative

1. Introduce `StageSpec` and `StageBudget` without changing behavior.
2. Encode every existing main/retry/probe/tail stage exactly.
3. Run equivalence tests and current solved-set/cost gates.
4. Make sequential execution consume the plan.
5. Make raced execution consume the same plan, preserving its own concurrency semantics.

Do not combine this with tuning stage order, fractions, eligibility, or technique configs. A
structural refactor should not get credit/blame for a solver-policy experiment in the same diff.

### Phase 3 — clarify work scopes

- Keep per-solve `_workMeter` authoritative.
- Encapsulate or replace direct global `workMeter` consumption in discovery tooling.
- If cumulative discovery budgeting can be expressed as `remainingWork -> nested solve workBudget`,
  retire the global mutable compatibility surface after proving equivalent behavior.
- If not, introduce an explicit caller-owned cumulative scope.
- Benchmark the hot path; reject an abstraction that measurably taxes every candidate move.

### Phase 4 — finish identity and hint migrations

- Key entity-attached persistence by persistent level id plus revision fingerprint.
- Reuse frozen fingerprint calculators for legacy lookup/backfill; reduce full scans.
- Migrate touched tooling to canonical `Hint[]`; derive geometry paths on demand.

### Phase 5 — semantic boundaries

- Centralize raw wire parsing.
- Add stronger domain-referee/solver conformance tests and share small predicates/constants.
- Narrow `MoveState` and candidate-path format polymorphism behind adapters.
- Move CLI selectors onto the shared parser.

### Phase 6 — low-value surface cleanup

- Corpus activation abstraction if multiple callers justify it.
- Published-level storage facade.
- Solver naming aliases and other narrow deprecations.

## Verification requirements for this cleanup campaign

Architecture work in the solver should be held to a stricter standard than "tests pass" because a
small ordering/budget change can trade solved levels invisibly.

For any solver-internal refactor intended to be behavior-preserving:

- run targeted unit/characterization tests during development;
- run the normal repository CI finish-line gate;
- use explicit `workBudget` with a non-binding deadline for decision-bearing solver comparisons;
- compare solved sets, not only totals;
- compare `workSpent`, attempt order/config/stage identity, and deadline truncation;
- referee-validate returned paths;
- if raced execution changes, separately test planned policy parity and accept that winner timing may
  differ;
- do not mix an architectural migration with a solver-policy optimization unless the policy change is
  separately measured and reported.

For documentation-only changes, run the documentation-link check when possible.

## Final architectural target

The desired endpoint is not a codebase with one representation of everything. It is a codebase in
which every plurality has an explicit reason and owner:

- one canonical semantic wire interpretation, with optimized projections;
- one canonical solver stage plan, with multiple executors;
- one canonical telemetry/provenance contract, with multiple reporters;
- one deterministic work unit, with explicitly scoped counters;
- distinct work/node/time metrics with distinct jobs;
- one durable level identity plus explicit structural revisions;
- legacy formats accepted at boundaries and normalized immediately;
- compatibility views generated from one authority rather than hand-maintained beside it.

That would remove the recurring class of Pathfinder bug where a new capability is implemented
correctly in the solver but silently disappears, changes meaning, or behaves differently when it
crosses a reporter, provenance writer, worker boundary, alternate executor, or persistence layer.

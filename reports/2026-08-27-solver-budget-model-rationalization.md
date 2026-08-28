# Solver budget-model rationalization — 2026-08-27

> **Status:** concluded-positive
> **Last evidence:** 2026-08-27 — budget-semantics audit and behavior-preserving rationalization implemented on top of PR #1539
> **Decision:** Treat work as the canonical allocation currency, distinguish base allocation from whole-solve work, label node budgets as technique-local depth/guards, quarantine wall-clock scheduler evidence, and freeze the remaining ms-derived production allocation sites with a CI ratchet rather than repricing them in a structural change.
> **Remaining gate:** active queue #2 priority — finish work ownership/equal-work substrate, then migrate the inventoried production additive tiers to deadline-independent work one parity-proven site at a time before new scheduler repricing policy.
## Scope

Follow-up to `reports/2026-08-27-wall-clock-budget-test-dependence-audit.md`.

Goal: make the repo's resource vocabulary harder to misuse without changing production solver
ordering, scoring, pruning, eligibility, retry fractions, or effective search allocations.

## Implemented

### One compatibility conversion authority

`modules/solver/budget-units.ts` now owns the frozen legacy ms-to-work conversion
(`LEGACY_MS_TO_WORK_RATE = 3350`) and `legacyMsToWork()`.

The production solver, full hint-ablation generator, and hint workbench no longer copy that number.
This makes the conversion visibly a compatibility boundary rather than a pseudo-throughput law.

### Base work is named as base work

The historical `workBudget` name was misleading: in ordinary production it sizes the main/base
allocation, while additive stages may receive fresh work afterward.

`SolveOpts.baseWorkBudget` is now the preferred name. `workBudget` remains a compatibility alias;
if both are supplied with different values the solve fails loudly. Result artifacts retain the
existing `workBudget` field for compatibility.

`strictTotalWorkBudget` remains the explicit experiment-only mechanism that turns the configured
base allocation into a true whole-solve work cap.

### Deadline-independence regression where the invariant is already true

A solver regression test now runs the main ladder with the same explicit work allocation under two
very different non-binding deadlines and requires identical solution, nodes, work, and attempt
trajectory (excluding latency-shaped telemetry).

This test is deliberately scoped to the already-work-denominated main ladder. It should be widened
only as the additive legacy inventory below is migrated.

### CI budget-boundary ratchet

`scripts/check-solver-budget-boundaries.mjs` runs in `npm run check`.

It enforces:

- no live clock reads in stage policy/plan/budget modules;
- no copied `3350` calibration in the migrated callers;
- no new `timeBudgetMs * fraction` allocation sites beyond the current explicit legacy inventory;
- no new direct `timeBudgetMs -> work` conversions inside orchestration beyond the two known
  compatibility sites;
- the old portfolio scheduler remains visibly marked as a legacy wall-clock experiment;
- method-probe retains its work-bounded/fail-closed research contract.

Removing an inventoried legacy site needs no allowlist replacement. Adding one fails CI.

### Deterministic isolated method-probe mode

`method-probe.mjs` and `method-probe-sweep.yml` now support optional `--work-budget` /
`work_budget`.

In that mode:

- work is one cumulative per-level canonical ceiling;
- `--budget-ms` is treated as a per-attempt wall safety deadline;
- if wall time binds before work/node exhaustion, the row is `deadline-truncated`;
- the run/combiner fail non-zero rather than treating that row as clean equal-work evidence;
- output records `workSpent`, `workBudget`, status, truncation, and deterministic-evidence validity.

Blank `work_budget` preserves the historical wall+node probe behavior and is explicitly marked
non-deterministic evidence.

### Experiment budget-protocol provenance

Experiment preflight manifests may now record one of:

- `production-additive`
- `strict-total-work`
- `technique-local-work`

Current preflight defaults explicitly to `production-additive`, so future artifacts say which
resource semantics produced them instead of requiring reconstruction from workflow history.

### Technique census labeled correctly

The current technique census remains a 50M-node-style isolated capability/depth map. That is useful
and deterministic, but it is not equal-compute across DFS/beam/repair.

Plans, shard outputs, combined output, and workflow help now say
`budgetProtocol: technique-local-node-depth` / `equalCostAcrossTechniques: false`. Cross-technique
scheduler pricing still requires canonical work evidence.

No census search behavior or budget was changed.

### Legacy portfolio quarantined

The ms-pass portfolio experiment and its replay/report tools are now explicitly labeled
`legacy-wall-clock-scheduler-*` and `decisionBearingForEqualWork: false`.

Nothing about its historical execution changed. The labels prevent its elapsed-time thresholds from
quietly becoming inputs to the new fixed-work scheduler research.

### Safer temporary work-cap ownership

`modules/solver/budget-context.ts` introduces a tested `withWorkCapScope()` compatibility bridge.
Four direct additive-stage call paths now lexically own and restore `prep._workCap` instead of each
open-coding save/set/finally.

The multi-seed late-repair loop remains open-coded because its cap intentionally changes per seed;
changing that control flow was outside this behavior-preserving pass.

## Priority disposition

This remaining work is now promoted into [`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) item #2 as an active scheduler prerequisite. The queue owns rank; this report supplies the detailed inventory.

The intended order is ownership/parity substrate → equal-work research substrate → one ms-derived additive site at a time → whole-solve deadline-independence invariant → new fixed-work repricing experiments.

## Explicit remaining debt

### 1. Nine ms-shaped additive allocation sites

Nine production additive-stage setup sites still derive an ms-shaped stage amount from
`timeBudgetMs * fraction` and then convert that to deterministic work:

- repair fallback
- attraction-diversity
- admissible-order
- dedup-near-tie retry
- non-default admissible retry
- connectivity retry
- repair elite-prefix DFS retry
- must-cross-neighbor retry
- goal-attraction legacy-distance retry

They are deterministic for identical inputs, but they violate the stronger target invariant:
changing a non-binding deadline should change latency protection only, never search dose.

These sites are now frozen by the CI ratchet. Migrating them can change production solve sets and
must be handled as either a behavior-preserving representation proof or an explicit scheduler-policy
experiment.

**2026-08-28:** [`additive-tier-participation-audit.md`](2026-08-28-additive-tier-participation-audit.md)
establishes two things about this debt without touching any production code. First, a static trace:
both real interactive production callers (`solver-controller.ts`, `review-controller.ts`) pass
`disableExtraBudgetPasses: true`, which zeroes every one of these 9 sites' own participation
condition (plus `repair-late-probe`/its multi-seed retry) — none of them ever run for a real player,
so migrating any of their formulas carries zero live-play risk. Second, an empirical 10-level
capability-sweep-shaped run: these tiers are not negligible on offline populations (10/10 levels
engaged at least one, 30% were solved by one), and several derive their budget from a fixed
constant/fraction independent of the caller's own `nodeBudget`/`workBudget`
(`REPAIR_LATE_PROBE_NODE_BUDGET = 5,000,000`; `DEDUP_NEAR_TIE_RETRY_BUDGET_FRACTION`/
`CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION`/`MC_NEIGHBOR_BUDGET_RETRY_BUDGET_FRACTION`/
`GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY_BUDGET_FRACTION = 1.0`), so real per-level cost on this sample
ran 1.5x-467x the nominal `workBudget` — a `node_budget` input to a capability sweep or confirmation
workflow is not a real per-level ceiling unless `strictTotalWorkBudget` is also set.

**2026-08-28, same day: first site migrated, and node_budget legibility documented in place.**
`dedup-near-tie-retry` is now sized from the solve's resolved `workBudget` instead of a second
`timeBudgetMs`-derived conversion (proven behavior-preserving for live play and the plain-default
call shape; a genuine, deliberate dose correction — not a no-op — for the offline capability-sweep
call shape specifically). The `node_budget` inputs on the confirmation/sweep workflows and
`level-blind-capability-sweep.mjs` itself now state the starting-allocation-not-ceiling fact this
audit found, in place, rather than only in this report. See
[`2026-08-28-dedup-near-tie-retry-work-dose-migration.md`](2026-08-28-dedup-near-tie-retry-work-dose-migration.md).

**2026-08-28, same day: second site migrated.** `repair-fallback` now follows the identical
pattern (`scaledStageWorkBudget(workBudget, repairBudgetFraction, MIN_ATTEMPT_WORK)` in place of a
second `timeBudgetMs`-derived `legacyMsToWork` conversion), with the same behavior-preservation
profile: byte-identical for live play and the plain-default call shape (`REPAIR_EXTRA_BUDGET_FRACTION`
is the integer `6.0`), a genuine dose correction for the offline capability-sweep call shape. See
[`2026-08-28-repair-fallback-work-dose-migration.md`](2026-08-28-repair-fallback-work-dose-migration.md).
**2026-08-28, same day: third site migrated, and a distinct structural gap found.**
`admissible-order-non-default-retry` follows the identical pattern (integer `1.0` fraction, same
behavior-preservation profile). See
[`2026-08-28-admissible-order-non-default-retry-work-dose-migration.md`](2026-08-28-admissible-order-non-default-retry-work-dose-migration.md).
While planning it, the sibling plain `admissible-order` tier was found to install no fresh work cap
at all under legacy semantics — a distinct, larger question (a new-allocation addition, not a
currency swap) outside this migration's scope; see
[`2026-08-28-admissible-order-work-cap-gap-discovery.md`](2026-08-28-admissible-order-work-cap-gap-discovery.md).

Five of the nine ms-shaped debt sites remain unmigrated.

### 2. One direct per-seed ms-to-work compatibility site

Repair-late-probe multi-seed retry still creates each round's work allowance from the base
`timeBudgetMs`. This is separately inventoried by the ratchet.

### 3. Stage BudgetEnvelope does not yet own work policy completely

`BudgetEnvelope` names wall/work/node dimensions, but the legacy stage projection still primarily
describes wall/node policy while real work setup remains partly in orchestration.

Target direction: make work the primary stage allocation, nodes an explicitly typed local guard, and
wall time deadline metadata rather than a peer allocation currency. Do not route production through
that representation until parity is proven.

### 4. Module-global discovery work meter

Per-solve work is isolated correctly in `prep._workMeter`. Multi-solve discovery tooling still uses
the module-global cumulative `workMeter` for session stopping. Concurrent unrelated work in the same
realm can therefore contaminate that session counter.

Target direction: caller-owned work scopes / accumulation from each solve's `workSpent`, after
characterizing hint/discovery behavior.

**2026-08-28, largely closed:** `modules/solver/diversification.ts`'s `createDiversificationSession`,
`modules/solver/hint-ablation-generator.ts`'s `createHintAblationGenerator` (~30 sites), and
`scripts/hint-workbench.mjs`'s own `runAblationUi`/`runCandidateGrid`/`runPortalGrid` now accumulate a
session-local work counter from each solve's own `workSpent` instead of reading the realm-global
`workMeter`. Only `hint-workbench.mjs`'s `runEnumeration` secondary hang-safety callback (non-binding;
no caller-visible per-step result to intercept from `variety-search.ts`'s own `run()`) still reads the
realm-global counter — remaining debt, explicitly flagged in place. See
[`2026-08-28-discovery-work-meter-session-scope-fix.md`](2026-08-28-discovery-work-meter-session-scope-fix.md)
(also documents a real corner-flip candidate bug found and fixed along the way).

### 5. Equal-work technique census execution

The census is now correctly labeled but still executes equal-node cells. A future supplemental
equal-work census mode would give Priority-1 scheduler research a directly priced action map without
discarding the valuable existing node-depth curves.

**2026-08-28, execution capability added:** `scripts/technique-census-cell.mjs`'s `runCell` now
supports an optional `cell.workBudget` that bounds a cell by canonical work (dividing/sharing it
across gates/configs the same way the default mode divides nodes) instead of raw nodes, mirroring
`method-probe.mjs`'s existing `--work-budget` deterministic mode. Every existing node-budget-only
cell (T1/T3) is completely unaffected — `useWork` gates the new code path off entirely when
`workBudget` is absent. Deliberately **not** done: wiring an actual equal-work plan TIER
(`build-technique-census-plan.mjs` population/scale choice) or `combine-technique-census-shards.mjs`
summary-bucket support for the new `work-budget-reached`/`deadline-truncated` statuses — choosing a
real population/scale for equal-work evidence is itself a decision-bearing research choice needing
its own premise/pilot per the operating model, not a plumbing task. This closes the "the primitive
capability doesn't exist yet" half of the gap; the remaining half is a future gated research step.
See [`2026-08-28-discovery-work-meter-session-scope-fix.md`](2026-08-28-discovery-work-meter-session-scope-fix.md).

### 6. Mutable work cap remains in search compatibility state

`withWorkCapScope()` removes several ownership hazards but search primitives still read
`prep._workCap`. The eventual target is an explicit attempt/stage budget context passed into search,
so prepared-level state cannot carry a previous stage's budget by accident.

## Target model

The repo should converge on four distinct concepts:

1. **base work allocation** — deterministic scheduler currency;
2. **total work cap** — optional whole-solve deterministic envelope;
3. **node depth/guard** — technique-local diagnostic/resource bound;
4. **wall deadline** — latency/hang protection only.

Elapsed milliseconds remain performance telemetry, not search entitlement.

## Production impact of this pass

No production stage order, eligibility, score, prune, node reserve, budget fraction, seed policy, or
effective cap was intentionally changed. The production-facing changes are representation/ownership
only: one shared legacy conversion helper, the `baseWorkBudget` input alias, and lexical restoration
of four already-existing temporary work caps.

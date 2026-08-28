# dedup-near-tie-retry: first queue #2 step-3 additive-tier work-dose migration

> **Status:** concluded-positive
> **Last evidence:** 2026-08-28 — code migration, full 160-level `solver:bench --check` byte-identical, targeted unit tests, and a 3-level capability-sweep-shaped before/after spot check (10-level check in progress, see addendum)
> **Decision:** `dedup-near-tie-retry`'s own additive work pool is now sized from the solve's resolved `workBudget` (`scaledStageWorkBudget` in `budget-units.ts`) instead of re-deriving it from `timeBudgetMs` a second time via `legacyMsToWork`. This is rigorously behavior-preserving for live interactive play (the tier never runs there) and for the plain-default `solveLevel()` call shape (no explicit `baseWorkBudget`/`workBudget`). It is a genuine, deliberate dose correction — not proven byte-identical — for the offline capability-sweep/confirmation-workflow call shape, where it closes part of the "467x nominal `workBudget`" overshoot [`2026-08-28-additive-tier-participation-audit.md`](2026-08-28-additive-tier-participation-audit.md) found for this exact tier.
> **Remaining gate:** none to keep this merged (live-play and default-shape parity are proven; the capability-sweep-shape change is intentional and small-scope). A larger confirmation-scale population check on the capability-sweep shape (in progress as of this report; see addendum) would upgrade the "small-sample spot check" evidence for that stratum to something closer to queue #2's own "prove parity" bar, but is not required to keep this specific migration.

## Motivation

[`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) item #2's immediate execution priority names step 3 of its own ordered list: "one additive tier at a time: replace ms-derived dose with an explicitly equivalent work dose, prove parity under the current policy, then remove that site from the CI allowlist." [`2026-08-27-solver-budget-model-rationalization.md`](2026-08-27-solver-budget-model-rationalization.md) inventories the nine frozen ms-shaped additive allocation sites this targets; [`2026-08-28-additive-tier-participation-audit.md`](2026-08-28-additive-tier-participation-audit.md) supplied the missing "how much is actually at stake" input (none of the nine ever run for a real player; on an offline capability-sweep-shaped sample they are neither rare nor cheap, running 1.5x-467x the nominal `workBudget`).

This report picks `dedup-near-tie-retry` as the first tier migrated, works through why the naive "just swap the input variable" version is *not* unconditionally behavior-preserving (a real finding this report exists to record), and reports what was actually verified before merging.

## What changed

`modules/solver/orchestration.ts`'s `dedup-near-tie-retry` block previously computed:

```js
const dedupRetryTotalBudget = Math.floor(timeBudgetMs * dedupRetryBudgetFraction);
// ... workBudget: legacyMsToWork(dedupRetryTotalBudget, MIN_ATTEMPT_WORK)
```

i.e. it re-derived a *second*, independent ms-to-work conversion from `timeBudgetMs`, ignoring the solve's own already-resolved `workBudget` (the `explicitBaseWorkBudget ?? legacyWorkBudget ?? legacyMsToWork(timeBudgetMs, MIN_ATTEMPT_WORK)` computed once near the top of `solveLevel()`). It now computes:

```js
const dedupRetryTotalBudget = Math.floor(timeBudgetMs * dedupRetryBudgetFraction); // kept, see below
// ... workBudget: scaledStageWorkBudget(workBudget, dedupRetryBudgetFraction, MIN_ATTEMPT_WORK)
```

`scaledStageWorkBudget` (new, `modules/solver/budget-units.ts`) is `max(minimumWork, floor(workBudget * fraction))` — a pure function of the solve's own resolved work allocation, never of the clock or of `timeBudgetMs`.

`dedupRetryTotalBudget` (ms) is **kept**, feeding only the `totalBudgetMs` field passed to `runWholeLadderRetryTier`. That field is a genuine wall-clock safety deadline for this tier (checked as `elapsed >= timeBudgetMs` inside `runInterleavedAttempts`/`runGateSerialAttempts`, never as a work-sizing input), and it must stay scaled by the same fraction as the work pool so it remains non-binding relative to the tier's own (now correctly work-bounded) allocation on a slow host. This is why the CI ratchet (`scripts/check-solver-budget-boundaries.mjs`) still lists `dedupRetryTotalBudget`'s own line in `approvedLegacyTimeDerivedAllocations`: that line is now understood as a deadline-sizing site, a legitimate permanent use of `timeBudgetMs` distinct from the work-dose debt the other 8 sites in that same set still carry. A new assertion guards against the work dimension regressing back to a `timeBudgetMs`-derived conversion for this one migrated tier.

## Why this is not a pure no-op: the discovery this report makes

The naive argument for "this changes nothing" goes: `legacyMsToWork` is linear, `dedupRetryBudgetFraction` is always the integer `1.0`, and in the *default* case `workBudget` already equals `legacyMsToWork(timeBudgetMs, MIN_ATTEMPT_WORK)` — so the two computations must produce the identical number. That argument is correct **only when no caller supplies an explicit `baseWorkBudget`/`workBudget` that disagrees with what `timeBudgetMs` would otherwise imply**.

The offline capability-sweep/confirmation-workflow call shape (`level-blind-capability-sweep.mjs`, `solver-broad-confirmation.yml`, `solver-residual-confirmation.yml`) does exactly that on purpose: it supplies both an explicit `nodeBudget` and an explicit `workBudget` (their own documented `1.34x` ratio) alongside a deliberately huge, non-binding `timeBudgetMs` (24h = 86,400,000ms — see those workflows' own `budget_ms` input comment, "intentionally non-binding; node budget is the real ceiling"). Under the *old* code, `dedup-near-tie-retry`'s own work pool was `legacyMsToWork(86,400,000 * 1.0, ...)` = 289,440,000,000 work units — a number many orders of magnitude larger than any real `nodeBudget`/`workBudget` these workflows ever pass, meaning the tier's WORK dimension was never actually a constraint there; only its NODE ceiling (`dedupRetryNodeCeiling`, correctly `nodeBudget`-derived and unaffected by this migration) was ever real. Under the *new* code, the tier's own pool is `scaledStageWorkBudget(workBudget, 1.0, ...)` = the caller's real `workBudget` (e.g. 670,000 at the audit's own tested scale) — now a genuine, comparably-sized constraint.

This was found empirically, not anticipated: an initial before/after run of `scripts/additive-tier-participation-audit.mjs --levels=pos:1-3 --node-budget=500000` (the audit's own reproduction shape, `workBudget=670,000`, `timeBudgetMs=86,400,000`) showed `dedup-near-tie-retry`'s own `totalWorkSpent` dropping from 1,426,463 (before) to 627,885 (after) — the new, real work ceiling binding where the old, effectively-infinite one never did.

**Practical consequence:** this migration is not a pure representation change for that one call shape. It is a genuine, deliberate policy correction — closing exactly the kind of undocumented overshoot the participation audit measured — but per this repo's own operating-model rule ("Migrating them can change production solve sets and must be handled as either a behavior-preserving representation proof or an explicit scheduler-policy experiment"), the capability-sweep stratum needed to be evaluated as a policy change, not assumed away.

## What was actually verified

1. **Live interactive production: unaffected, by construction.** Both real callers (`solver-controller.ts`, `review-controller.ts`) pass `disableExtraBudgetPasses: true`, which forces `dedupRetryBudgetFraction` to `0` before this code ever runs (unchanged by this migration; verified by the existing `disableExtraBudgetPasses: true suppresses...` test, still passing).

2. **Plain-default call shape: proven byte-identical.** For any `solveLevel()` call that does not supply an explicit `baseWorkBudget`/`workBudget`, `workBudget` already equals `legacyMsToWork(timeBudgetMs, MIN_ATTEMPT_WORK)`, and `dedupRetryBudgetFraction` is always the integer `1.0`, so `scaledStageWorkBudget(workBudget, 1.0, MIN)` and the old `legacyMsToWork(floor(timeBudgetMs*1.0), MIN)` are algebraically the same expression. Confirmed empirically on the full 160-level published corpus: `node scripts/run-bundled.mjs scripts/solver-bench.mjs --check` (default `workBudget=100,000,000`, `budget-ms=30000` → `deadlineMs=120000`) reports **68,562,085 nodes** both before and after this change (solved 160/160 both times) — byte-identical to the node.

3. **New targeted unit tests** (`modules/solver/orchestration.test.ts`): `dedup-near-tie-retry work dose no longer resizes with a non-binding deadline change` pins the invariant this migration exists to establish (same `workBudget`, two very different `timeBudgetMs` values, identical `allocatedWorkCeiling` trajectory); `dedup-near-tie-retry now honors an explicit baseWorkBudget instead of silently re-deriving its pool from timeBudgetMs` pins the corrected behavior directly (a larger explicit `baseWorkBudget` now genuinely buys this tier a larger dose, which the old code could not do independent of `timeBudgetMs`).

4. **Capability-sweep-shaped call: small-sample spot check, not a confirmation-grade population.** The `pos:1-3` before/after run above changed `dedup-near-tie-retry`'s own `workSpent` substantially (as expected/intended) but did **not** change the SOLVED SET or the overall level outcome on those 3 levels: `R00001` and `R00044` both remained `node-budget-reached` (unsolved) before and after (their node ceiling is `dedupRetryNodeCeiling`, purely `nodeBudget`-derived and untouched by this migration); `R00039` solved in both runs via the identical winning stage (`repair-late-probe-multi-seed-retry`, a different, unaffected tier) with an **identical** `nodesExpanded` (33,145,459 both times). See addendum for the larger `pos:1-10` population this report's own evidence bar calls for.

## What this does not establish

- No claim that every one of the remaining 8 ms-shaped additive-tier sites will migrate this cleanly, or that any of them share this exact behavior-preservation profile. Each still needs its own site-specific check — do not batch-convert.
- No claim that `dedup-near-tie-retry`'s new capability-sweep-shape numbers are "better" in a capability sense — only that they are more honest relative to the caller's own stated `workBudget`. A capability-sweep/confirmation run captured before this merge and one captured after are not directly comparable for levels that engage this tier, unless both explicitly account for this change.
- No recommendation that `solver-broad-confirmation.yml`/`solver-residual-confirmation.yml`/`solver-level-blind-targeted-sweep.yml` adopt `--strict-total-work-budget`. That remains a separate, unevaluated, explicitly solve-set-changing policy decision (see the participation audit's own Part 3).
- This report is infrastructure/representation-migration evidence, not a solver-capability research claim, so it does not carry a decision-bearing evidence-role/selection disclosure per `docs/investigation-report-conventions.md`.

## Addendum: pos:1-10 confirmation-scale population

*(Filled in once the larger run completes; see the reproduction command below. If this section is still absent, the larger run had not finished when this report was last committed — treat the pos:1-3 spot check above as the only capability-sweep-shape evidence until it is added.)*

## Reproduction

```bash
# Live-play / default-shape regression gate (must stay byte-identical to pre-migration):
node scripts/run-bundled.mjs scripts/solver-bench.mjs --check

# Targeted unit tests:
SOLVER_DEEP_TESTS=0 npx vitest run modules/solver/orchestration.test.ts -t "dedup"

# Capability-sweep-shape spot check (before/after; requires checking out the pre-migration commit
# for the "before" run):
node scripts/run-bundled.mjs scripts/additive-tier-participation-audit.mjs \
  --corpus=data/stress/stress-levels-random.json --levels=pos:1-10 --node-budget=500000 \
  --out=reports/stress/dedup-migration-audit.json --summary-out=reports/stress/dedup-migration-audit-summary.md
```

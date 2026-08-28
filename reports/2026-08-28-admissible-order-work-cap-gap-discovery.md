# admissible-order has no deliberate work-dimension allocation under legacy semantics

> **Status:** active
> **Last evidence:** 2026-08-28 — code trace of `modules/solver/orchestration.ts`'s plain `admissible-order` tier (not to be confused with `admissible-order-non-default-retry`, a separate, later, already-migrated tier) plus an empirical probe on 3+ levels of the standard capability-sweep-shaped reference sample
> **Decision:** none yet — this is a discovery report, not a fix. `admissible-order`'s own loop installs no fresh `prep._workCap` at all (unlike every other additive tier examined so far), so its real work-dimension dose under legacy (non-`strictTotalWorkBudget`) semantics is an accident of whatever an earlier tier's last attempt happened to leave in that single mutable field — observed empirically as both fully unbounded (`null`, governed only by the ms wall deadline) and an arbitrary small leftover number unrelated to `ADMISSIBLE_ORDER_BUDGET_FRACTION`. This is a materially different, and potentially more consequential, situation than the ms-vs-work currency debt the other 8 sites in queue #2 step 3's inventory carry, and does not fit that item's "swap the currency, prove behavior-preservation" migration shape — there is no existing allocation to swap, so any fix is a genuine *addition*, which needs its own premise/evidence before being executed.
> **Remaining gate:** decide whether this is worth investigating further as a distinct queue item (a repro-scale audit of how often the inherited cap is starving vs. generous vs. null across a real production-shaped population, and whether any currently-unsolved level is affected) before proposing a fix analogous to `repair-fallback`'s 2026-08-20 one.

## How this was found

While migrating `admissible-order-non-default-retry` (queue #2 step 3's third site — see [`2026-08-28-admissible-order-non-default-retry-work-dose-migration.md`](2026-08-28-admissible-order-non-default-retry-work-dose-migration.md)), that tier's own call-site comment pointed at the plain `admissible-order` tier (the one immediately before it in the ladder) as sharing the same "stale inherited `prep._workCap`" risk that motivated `repair-fallback`'s 2026-08-20 fix. Checking `admissible-order`'s own loop (`modules/solver/orchestration.ts`, the block gated on `admissibleOrderTierWillRun`) found:

- It computes `admissibleOrderTotalBudget = Math.floor(timeBudgetMs * admissibleOrderBudgetFraction)`, used only to size `admissibleOrderBudget`, a per-gate **wall-deadline** slice passed to `runAttempt`.
- It never calls `withWorkCapScope`, never computes a `legacyMsToWork`-derived work amount, and never assigns `prep._workCap` at all.
- `admissible-order-search.ts:317` (the search primitive this tier dispatches to) hard-stops on `prep._workMeter.units >= (prep._workCap ?? Infinity)` — exactly the same mechanism every other tier relies on — so whatever `prep._workCap` happens to hold when this tier's `runAttempt` call is dispatched is the *entire* work-dimension constraint on this tier, real allocation or not.

This is different from every one of the 9 inventoried ms-shaped debt sites: those all derive a real (if currency-wrong) number and install it. `admissible-order` derives nothing for this dimension.

## Empirical confirmation

A direct probe (`Solver.solve()` with `attemptBudgetTelemetry: true`, reading `stageId === 'admissible-order'` attempts specifically — not the broader `admissibleOrder` boolean flag, which also matches the separate, later `admissible-order-non-default-retry` tier's own attempts) on the standard `pos:1-10` reference population (`workBudget=670,000`, `nodeBudget=500,000`, `timeBudgetMs=86,400,000`, the same shape [`2026-08-28-additive-tier-participation-audit.md`](2026-08-28-additive-tier-participation-audit.md) uses) found, on the first 3 levels checked:

| Level | `allocatedWorkCeiling` | `allocatedNodeCeiling` | `workSpent` | `outcome` |
|---|---:|---:|---:|---|
| R00001 | `null` | 124,989 | 147,406 | timed-out |
| R00039 | 199,272 | 124,834 | 273,049 | timed-out |
| R00044 | `null` | 124,993 | 136,923 | timed-out |

`allocatedNodeCeiling` is consistently sane and stable (~125,000, the correctly-reserved node slice — `ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION` machinery, unaffected by any of this). `allocatedWorkCeiling` alternates between `null` (this tier's own attempt starts with no ambient cap at all — plausible when nothing upstream ever set `prep._workCap`, e.g. this level had no repair-eligible configs) and a plausible-looking but architecturally arbitrary finite number (199,272 on R00039 — a leftover snapshot from whatever the previous tier's own last `runAttempt` dispatch set `prep._workCap` to, unrelated to `ADMISSIBLE_ORDER_BUDGET_FRACTION`). On both R00001 and R00044, `workSpent` visibly exceeds the small `allocatedWorkCeiling` reported for R00039's case would have implied were it that small too — consistent with the ms wall deadline, not a work cap, being the practical governor in these particular instances.

## Why this has not caused an obvious production regression (a hypothesis, not confirmed)

`ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION`'s own extensive comment (`stage-budget.ts`) documents that this tier's real historical starvation bug was on the **node** dimension — a batch/offline `nodeBudget` ceiling reached before this last-resort tier ever got a turn — and that fix (a node reserve) is real, measured, and unrelated to work. It is plausible nobody has separately diagnosed a **work**-dimension starvation case for this tier because:

1. **Zero live-play risk**, same as every other additive tier: `disableExtraBudgetPasses: true` (both real interactive callers) also zeroes `admissibleOrderBudgetFraction`, so this gap only matters for offline capability-sweep/confirmation-workflow-shaped calls.
2. When `prep._workCap` happens to be `null` (this tier is the very first additive stage to run, or nothing upstream set a cap), the tier is *more* generous than intended, not starved — a silent overshoot, not a silent loss.
3. When `prep._workCap` inherits a real finite leftover, the wall-clock deadline (`admissibleOrderBudget`, still generously sized from `ADMISSIBLE_ORDER_BUDGET_FRACTION * timeBudgetMs`) may in practice bind first in many cases, masking a small/starving work cap the way it appears to on R00039 above (`workSpent` 273,049 well past the reported 199,272 ceiling — the search did not visibly stop early there).

None of this is proven; it is the most likely explanation consistent with a heavily-validated, default-on tier not having an obvious "silently found nothing" failure mode reported against it, despite this architectural gap. A genuine starvation case (a leftover `prep._workCap` small enough, and a wall deadline generous enough, that the work cap binds well before the tier's own intended search) has not been ruled out and would need a targeted probe to find, not this discovery pass.

## What this does not establish

- No claim this is currently causing any real capability loss, in production or in offline evidence. It is a structural gap, not a demonstrated regression.
- No fix proposed or implemented. Installing a fresh cap here (analogous to `repair-fallback`'s 2026-08-20 fix) is a genuine behavior-changing addition — it could only help (converting an accidental unbounded-or-arbitrary dose into a deliberate one) or be neutral, but per the operating model it still needs evidence before being executed, not just a plausibility argument.
- No claim about `admissible-order-non-default-retry`, `connectivity-axis-exhausted-retry`, `repair-elite-prefix-dfs-retry`, `mc-neighbor-budget-retry`, `goal-attraction-legacy-distance-retry`, or `attraction-diversity` sharing this gap — each of those either already installs a fresh cap (verified by direct code read for the ones migrated so far) or uses the shared outer pool deliberately (`attraction-diversity`, per its own call-site comment). This gap is specific to plain `admissible-order`.
- This is not one of queue #2 step 3's nine `approvedLegacyTimeDerivedAllocations` CI-ratchet sites in the sense the other three migrated tiers were (it doesn't have a `legacyMsToWork(...)` call to remove) — it is a separate, adjacent finding the ratchet does not currently track at all.

## Suggested next step (not started)

If this is picked up: a targeted probe across a larger population (not just 3 levels), reading `admissible-order`'s own `allocatedWorkCeiling`/`workSpent` alongside whether that attempt WON, specifically looking for a case where a small inherited cap visibly truncated the search (`workSpent` capped near `allocatedWorkCeiling`, `outcome: budget-starved` or an early `timedOut` well short of the ms deadline) on a level this tier is otherwise known to solve. That would be the smallest evidence that would justify designing a fix; absent it, this stays a documented structural gap rather than an active line item.

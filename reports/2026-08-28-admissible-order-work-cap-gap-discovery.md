# admissible-order has no deliberate work-dimension allocation under legacy semantics

> **Status:** inconclusive
> **Last evidence:** 2026-08-28 — code trace of `modules/solver/orchestration.ts`'s plain `admissible-order` tier (not to be confused with `admissible-order-non-default-retry`, a separate, later, already-migrated tier) plus an empirical probe on the full `pos:1-10` standard capability-sweep-shaped reference population
> **Decision:** the structural gap is real (`admissible-order` installs no fresh `prep._workCap` at all, unlike every other additive tier examined so far), but the full `pos:1-10` reference population found **zero cases of actual work-dimension starvation** — in all 10 levels, `nodesExpanded` tracks `allocatedNodeCeiling` almost exactly (the node reserve is the real, working governor), and `workSpent` never approaches `allocatedWorkCeiling` from below in a way that suggests the search was cut short by it. This downgrades the finding from "plausible correctness risk" to "confirmed structural gap, no demonstrated impact on this sample." Ten levels is not enough to rule out a rarer case; see the remaining gate.
> **Remaining gate:** inconclusive because this population, while real, is small and was not selected to stress this specific dimension. A materially larger or differently-selected population (e.g. levels the node reserve alone does not stop early, so the work dimension would have room to matter) is the smallest evidence that would move this to a confirmed negative (safe to leave as is) or confirmed positive (worth a `repair-fallback`-style fix). Not scheduled; this report exists so the finding is not lost, not to claim it is urgent.

## How this was found

While migrating `admissible-order-non-default-retry` (queue #2 step 3's third site — see [`2026-08-28-admissible-order-non-default-retry-work-dose-migration.md`](2026-08-28-admissible-order-non-default-retry-work-dose-migration.md)), that tier's own call-site comment pointed at the plain `admissible-order` tier (the one immediately before it in the ladder) as sharing the same "stale inherited `prep._workCap`" risk that motivated `repair-fallback`'s 2026-08-20 fix. Checking `admissible-order`'s own loop (`modules/solver/orchestration.ts`, the block gated on `admissibleOrderTierWillRun`) found:

- It computes `admissibleOrderTotalBudget = Math.floor(timeBudgetMs * admissibleOrderBudgetFraction)`, used only to size `admissibleOrderBudget`, a per-gate **wall-deadline** slice passed to `runAttempt`.
- It never calls `withWorkCapScope`, never computes a `legacyMsToWork`-derived work amount, and never assigns `prep._workCap` at all.
- `admissible-order-search.ts:317` (the search primitive this tier dispatches to) hard-stops on `prep._workMeter.units >= (prep._workCap ?? Infinity)` — exactly the same mechanism every other tier relies on — so whatever `prep._workCap` happens to hold when this tier's `runAttempt` call is dispatched is the *entire* work-dimension constraint on this tier, real allocation or not.

This is different from every one of the 9 inventoried ms-shaped debt sites: those all derive a real (if currency-wrong) number and install it. `admissible-order` derives nothing for this dimension.

## Empirical confirmation

A direct probe (`Solver.solve()` with `attemptBudgetTelemetry: true`, reading `stageId === 'admissible-order'` attempts specifically — not the broader `admissibleOrder` boolean flag, which also matches the separate, later `admissible-order-non-default-retry` tier's own attempts) on the full standard `pos:1-10` reference population (`workBudget=670,000`, `nodeBudget=500,000`, `timeBudgetMs=86,400,000`, the same shape [`2026-08-28-additive-tier-participation-audit.md`](2026-08-28-additive-tier-participation-audit.md) uses):

| Level | `allocatedWorkCeiling` | `allocatedNodeCeiling` | `workSpent` | `nodesExpanded` | `outcome` |
|---|---:|---:|---:|---:|---|
| R00001 | `null` | 124,989 | 147,406 | 125,184 | timed-out |
| R00039 | 199,272 | 124,834 | 273,049 | 124,928 | timed-out |
| R00044 | `null` | 124,993 | 136,923 | 125,184 | timed-out |
| R00046 | 242,860 | 124,947 | 149,366 | 125,184 | timed-out |
| R00050 | `null` | 124,989 | 412,976 | 125,184 | timed-out |
| R00059 | 287,040 | 124,991 | 256,514 | 125,184 | timed-out |
| R00073 | `null` | 124,980 | 163,434 | 125,184 | timed-out |
| R00080 | 206,765 | 124,786 | 138,335 | 124,928 | timed-out |
| R00082 | `null` | 124,976 | 149,267 | 125,184 | timed-out |
| R00088 | 256,807 | 124,936 | 138,134 | 125,184 | timed-out |

`allocatedNodeCeiling` is consistently sane and stable (~125,000, the correctly-reserved node slice — `ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION` machinery, unaffected by any of this). `allocatedWorkCeiling` splits 5/10 `null` (this tier's own attempt starts with no ambient cap at all) and 5/10 an architecturally-arbitrary finite number (199,272-287,040, unrelated to `ADMISSIBLE_ORDER_BUDGET_FRACTION`) — a leftover snapshot from whatever the previous tier's own last dispatch set `prep._workCap` to.

**The decisive pattern: `nodesExpanded` tracks `allocatedNodeCeiling` almost exactly in every single row** (within ~100-250 nodes, a normal check-granularity overshoot), regardless of whether `allocatedWorkCeiling` was `null` or a finite few-hundred-thousand number. That means the **node** ceiling — real, deliberate, and unaffected by this gap — is what actually stops this tier's search on every level in this population. Nine of the ten finite-cap/null cases show `workSpent` well *under* what a binding work cap of that magnitude would have allowed before the node ceiling stopped it anyway (e.g. R00080: cap 206,765, spent only 138,335); the tenth (R00039: cap 199,272, spent 273,049) shows the search running *past* its nominal cap, meaning the work cap did not actually bind there either — the node ceiling (nodesExpanded 124,928, matching `allocatedNodeCeiling` 124,834) did. **No row in this population shows the work-dimension gap actually truncating a search that the node/ms dimensions would otherwise have let run further.**

## Why this has not caused an obvious production regression

`ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION`'s own extensive comment (`stage-budget.ts`) documents that this tier's real historical starvation bug was on the **node** dimension — a batch/offline `nodeBudget` ceiling reached before this last-resort tier ever got a turn — and that fix (a node reserve) is real, measured, and now confirmed (above) to be the tier's actual governor on this population. The empirical result above gives a concrete, population-scale reason nobody has separately diagnosed a **work**-dimension starvation case for this tier: on this population, the node ceiling always binds first, so the missing work-dimension allocation never gets a chance to matter, whether it would have been generous (`null`) or accidentally tight (a small stale leftover). Combined with the existing structural protection (`disableExtraBudgetPasses: true` zeroes `admissibleOrderBudgetFraction` for both real interactive callers, so this gap is offline-tooling-only regardless), the practical risk profile here is lower than the initial 3-level spot check suggested.

This does not prove the gap is harmless everywhere — a different population (e.g. levels whose node budget is comparatively generous relative to their real search need, so the node ceiling would not bind first) could still expose real starvation. It does establish that the specific, standard reference population this queue's other confirmations use shows no such case.

## What this does not establish

- No claim this is currently causing any real capability loss, in production or in offline evidence. It is a structural gap, not a demonstrated regression.
- No fix proposed or implemented. Installing a fresh cap here (analogous to `repair-fallback`'s 2026-08-20 fix) is a genuine behavior-changing addition — it could only help (converting an accidental unbounded-or-arbitrary dose into a deliberate one) or be neutral, but per the operating model it still needs evidence before being executed, not just a plausibility argument.
- No claim about `admissible-order-non-default-retry`, `connectivity-axis-exhausted-retry`, `repair-elite-prefix-dfs-retry`, `mc-neighbor-budget-retry`, `goal-attraction-legacy-distance-retry`, or `attraction-diversity` sharing this gap — each of those either already installs a fresh cap (verified by direct code read for the ones migrated so far) or uses the shared outer pool deliberately (`attraction-diversity`, per its own call-site comment). This gap is specific to plain `admissible-order`.
- This is not one of queue #2 step 3's nine `approvedLegacyTimeDerivedAllocations` CI-ratchet sites in the sense the other three migrated tiers were (it doesn't have a `legacyMsToWork(...)` call to remove) — it is a separate, adjacent finding the ratchet does not currently track at all.

## Suggested next step (not started)

If this is picked up: a probe across a population specifically selected where the node ceiling is comparatively generous (so it would not be the tier's own first stopping point), looking for a case where a small inherited work cap visibly truncates the search instead (`workSpent` capped near `allocatedWorkCeiling`, well short of both the node ceiling and the ms deadline) on a level this tier is otherwise known to solve. That is the smallest evidence that would justify designing a fix; absent it, this stays a documented, empirically-inert structural gap rather than an active line item.

# Repair-probe budget-composition bug: `repairBudgetFractionOverride` didn't cover the early probe (2026-07-17)

> **Status:** concluded-positive
> **Last evidence:** 2026-08-07 — follow-up disposition and smoke-pin repair
> **Decision:** keep the override-composition fix; defer proportional probe scaling until a real
> sub-30-second caller demonstrates material latency; the separate smoke-pin repair is complete
> **Remaining gate:** none

## Context

`reports/2026-07-17-attraction-diversity-dose-response.md` flagged, but didn't investigate, an
"unexplained observation": R02401 (corpus-2, repair-gated, single-gate) measured `totalMs: 24971`
at `timeBudgetMs=10000, repairBudgetFractionOverride: 0, attractionDiversityBudgetFractionOverride:
0.5` — well past the `(1+0.5)×10000 = 15000ms` the additive-fraction model predicts, with
`repairBudgetFractionOverride: 0` supposedly zeroing repair's contribution entirely. This is the
first item in the solver-development-roadmap's Campaign 0 (`docs/solver-development-roadmap.md`).

## Root cause

`modules/solver/orchestration.ts`'s `solveLevel()` runs an early, strictly-additive **repair
probe** (`runRepairProbe`) before the main DFS/beam loop, on any level matching the repair feature
gate (`needsRepairFallback`). The probe's cost is governed entirely by its own fixed node budgets
(`REPAIR_PROBE_ORDINARY_NODE_BUDGET = 2,000,000`, retried across
`REPAIR_PROBE_ORDINARY_SEED_SALTS = [0, 1]`, plus `REPAIR_PROBE_BIASED_NODE_BUDGET = 6,000,000` on
must-turn levels) — by design, not `timeBudgetMs`. Those node budgets were calibrated only against
levels where the probe *wins* quickly (see their own comment's "observed winners" data:
~1365ms for the largest observed winning case). Nothing was ever measured for the case where the
probe *never* wins — it still burns its full node budget as pure dead search, every single solve,
and on a heavily-constrained level (more must-pass/must-cross/landmark checks raise real per-node
cost) that dead search alone can cost several seconds of wall time.

Critically, this cost was **never gated by `repairBudgetFractionOverride`** — that override was
wired only into the *later* full-budget repair fallback loop (`REPAIR_EXTRA_BUDGET_FRACTION`), not
the early probe. `repairBudgetFractionOverride: 0` therefore correctly zeroed the fallback loop but
left the probe completely untouched.

Reproduced directly (`R02401`, `timeBudgetMs: 10000, repairBudgetFractionOverride: 0,
attractionDiversityBudgetFractionOverride: 0.5`):

```
measured wall time: 25865 ms
result.totalMs: 25864 status: timeout nodesExpanded: 8697365
{"repair":true,"elapsedMs":5522,...,"nodesExpanded":2000005,"timedOut":true}
{"repair":true,"seedSalt":1,"elapsedMs":5163,...,"nodesExpanded":2000005,"timedOut":true}
... main loop (6 attempts, ~9999ms total) ...
... attraction-diversity pass (6 attempts, ~5001ms total) ...
```

The two `repair:true` probe attempts (ordinary tier, seeds 0 and 1) account for exactly the
unexplained ~10.7s: `10685 + ~9999 + ~5001 ≈ 25685`, matching the observed `25864ms`. The main loop
and the attraction-diversity pass both respected their own budgets correctly — only the probe
ignored the override.

This is more than a dose-response measurement artifact: **both interactive solve UIs**
(`solver-controller.ts`'s "Find 1 Hint", `review-controller.ts`'s review-approval solve) pass
`repairBudgetFractionOverride: 0` specifically to bound their ~30s progress-bar promise, with an
existing code comment already noting the fallback loop "would silently blow past that promise for
a repair-gated level (observed: up to 210s total on a real solve)." The probe was never covered by
that override at all — any repair-gated level a real player hits via either interactive path was
silently exposed to the same class of promise-breaking overshoot this comment already flags for
the fallback loop.

## Fix

`modules/solver/orchestration.ts`: hoisted the `repairBudgetFractionOverride` resolution
(`repairBudgetFraction`) to before the early-probe check (previously computed only just before the
later fallback loop), and added `repairBudgetFraction !== 0` to the probe's gate condition. An
override of exactly `0` now skips the probe outright — the same "no repair-related cost, period"
signal the later fallback loop already honored. Every other value (production default `undefined`,
or any nonzero override) leaves the probe's behavior byte-identical to before this fix.

```
if (repairConfigs.length > 0 && repairBudgetFraction !== 0 && (!cfg || cfg.STRATEGY_REPAIR_PROBE)) {
```

Re-running the R02401 repro after the fix:

```
measured wall time: 15141 ms
result.totalMs: 15140 status: timeout nodesExpanded: 4792843
```

Zero `repair:true` attempts; total wall time now matches the `(1+0.5)×10000 = 15000ms` model
exactly (small overhead from prep/scheduling only).

## Trade-off found and measured (not assumed)

Skipping the probe on `repairBudgetFractionOverride: 0` has a real, measured cost: the 4 known
repair-gated **published** levels (`P00136`, `P00144`, `P00145`, `P00146`) were, before this fix,
*solved by the probe* even under the interactive UI's exact opts
(`timeBudgetMs: 30000, repairBudgetFractionOverride: 0, attractionDiversityBudgetFractionOverride:
0`):

| Level | Before (via probe) | After (via main loop) |
|---|---|---|
| P00136 | 70ms, 1 repair attempt | 393ms, 0 repair attempts |
| P00144 | 364ms, 1 repair attempt | 447ms, 0 repair attempts |
| P00145 | 3528ms, 2 repair attempts | 1784ms, 0 repair attempts |
| P00146 | 81ms, 1 repair attempt | 8113ms, 0 repair attempts |

All 4 still solve, and all 4 stay far under the interactive UI's 30s promise — no regression in
*whether* they solve within budget. But P00146 in particular is ~100x slower per-solve under this
specific path (interactive UI / any `repairBudgetFractionOverride: 0` caller) since it no longer
gets the probe's cheap early win and falls through to the (slower, but still budget-respecting)
main loop instead.

This is judged the correct trade-off, not a regression to walk back: `repairBudgetFractionOverride:
0` is documented (both in this fix and in the pre-existing `solver-controller.ts` comment) as an
explicit "give up repair's speed advantage to guarantee a hard cost ceiling" signal from the
caller — the same trade the fallback loop already made. The probe silently violating that signal
for the 4 (rare) levels it happened to rescue fast, while silently blowing the same signal by 10+
seconds on R02401 (a level it doesn't rescue at all), was the inconsistency worth fixing. The
fallback loop's own comment already accepts a "worse but bounded" outcome for exactly this reason.

## Verification

- `tsc --noEmit`: clean.
- `npm run check:lint`: clean.
- `npx vitest run modules/solver`: 195/195 pass (2 new regression tests in
  `orchestration.test.ts`: `repairBudgetFractionOverride: 0` skips the probe entirely;
  `repairBudgetFractionOverride: undefined` — the production default — still reaches it).
- `npm run solver:bench -- --check`: published corpus 160/160, **no regressions**, 34.9s (vs. the
  pinned baseline). This change is byte-identical in behavior for every default (no-override) call
  — confirmed by construction (the new gate only changes behavior at `repairBudgetFraction === 0`,
  which the default path never reaches) and by this check, which is the only "full corpus" sweep
  meaningful here since production never passes the override.
- `npm run stress:regression`: 5/5 held, 0 regressions (the pinned set's own timings ran ~30-40%
  slower than their recorded baselines this run — consistent CPU-throttling noise across all 5,
  not specific to this change, and the tool's own isolated-retry mechanism didn't need to fire).
- `npm run stress:smoke`: 4 pre-existing failures (`S00017`/`S00031`/`S00036`/`S00118` "MISSING
  from data/stress/stress-levels.json") — confirmed **unrelated to this change** by reproducing
  identically with the fix stashed out. This is a stale pin-file/corpus-id drift issue (the smoke
  set was built 2026-07-10, before later stress-corpus-1 id changes) worth someone's attention
  separately, not a regression from this fix.
- Direct interactive-UI-path re-check on the 4 known repair-gated published levels: see the
  trade-off table above.

## Out-of-scope items — disposition 2026-08-07

- The probe's node budgets are still a fixed absolute cost, unscaled by `timeBudgetMs`, even under
  the *production default* (non-zero, non-override) path — a caller using a very small
  `timeBudgetMs` on a repair-gated level still pays the probe's full worst-case node cost before
  the main loop starts. This fix only closes the `repairBudgetFractionOverride: 0` gap; it doesn't
  make the probe's cost proportional to `timeBudgetMs` in the general case. Worth a dedicated look
  if a future finding shows this mattering in practice (e.g. a UI or tool using a
  smaller-than-30s budget on a repair-gated level). This is explicitly **deferred**, not an active
  implementation task; the canonical trigger is recorded in `docs/future-work.md`.
- The stale smoke-set pin-file gap (`S00017`/`S00031`/`S00036`/`S00118`) was **completed
  2026-08-07**. The replacements are `R01189` (high-intersection/must-cross structural coverage),
  `R00134` and `R00087` (repair winners), and `S00103` (four gates); the refreshed suite holds
  14/14 under one minute. The old `S00017` bug-specific identity was not recoverable from available
  metadata, so its replacement is deliberately labelled structural rather than claiming false
  provenance. The canonical disposition is in
  [`docs/future-work.md`](../docs/future-work.md#older-loose-thread-triage-2026-08-07).

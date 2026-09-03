# Lower-bound memo cache-empty vs cache-warm control

> **Status:** concluded-positive
> **Last evidence:** 2026-09-03 — 50/50 exact matches (published + corpus1), current HEAD.
> **Decision:** `PrepLevel._mpLowerBoundCache` and `PrepLevel._mcLowerBoundCache` — the two caches `docs/solver-mutable-storage-inventory.md` names as "intentionally cross-attempt and cross-gate" and instructs to test with a "cache-empty vs cache-warm control" — are semantically inert. Solving the same level with the memo caches on (default) vs. fully disabled (`ablation: { STRATEGY_LOWER_BOUND_MEMO: false }`, which forces every lookup to recompute from scratch) produced byte-identical `ok`/`status`/`workSpent`/`nodesExpanded`/`solution` on 50/50 sampled levels that actually exercise the caches. An initial pass at a tighter ms deadline found 2 apparent mismatches that turned out to be a wall-clock confound in the check itself, not a real discrepancy — see "A confound, caught and fixed" below.
> **Remaining gate:** none. This closes the specific named control from the mutable-storage inventory for these two caches; reopen only on new suspicion.
> **Evidence role:** research-integrity/correctness check, direct continuation of [`2026-09-03-fresh-vs-preceded-main-search-reproduction-check.md`](2026-09-03-fresh-vs-preceded-main-search-reproduction-check.md) — not a scheduler experiment.

## Why this check

`docs/solver-mutable-storage-inventory.md` inventories every solver mutable store whose physical lifetime can outlive one helper call, and calls out `PrepLevel._mpLowerBoundCache`/`._mcLowerBoundCache` specifically: "**Per `solveLevel()`, but intentionally cross-attempt and cross-gate.** This is mutable stage history even though it cannot cross separate solves... **Include cache-empty vs cache-warm controls in fresh-vs-preceded P0 diagnosis.**" The fresh-vs-preceded reproduction check just closed tested this indirectly (whole-attempt outcome equivalence across real predecessor history), which would have caught a leak but doesn't isolate these two specific named caches. This is the targeted, surgical version of that same instruction, aimed at exactly the suspects the inventory names — a natural, well-motivated next step while the census refresh and cross-generator transfer dispatches continue running unattended.

## Method

`modules/solver/lower-bounds.ts` already ships the exact control this check needs as a built-in ablation flag, `STRATEGY_LOWER_BOUND_MEMO`: both `mustPassLowerBound` (line ~442) and `mustCrossLowerBound` (line ~506) gate their cache lookup on this flag, and each function's own header comment already claims "identical values, fresh compute... this is pure memoization, not an approximation." That claim is exactly the empirical question here.

For each level that actually has must-pass and/or must-cross objectives (`level.mustPassKeys.length > 0 || level.mustCrossKeys.length > 0` — otherwise both lower-bound functions return `0` immediately and never touch either cache), ran `Solver.solveLevel()` twice at a fixed `strictTotalWorkBudget`:

- **warm:** default ablation (caches on, the only way the real production ladder ever runs).
- **cold:** `ablation: { STRATEGY_LOWER_BOUND_MEMO: false }` (both caches bypassed; every lookup recomputes from scratch).

Compared `ok`, `status`, `workSpent`, `nodesExpanded`, and `solution` across the **whole solve** (every stage/tier, not just `main-search`) — broader coverage than the per-attempt reconstruction method used in the main fresh-vs-preceded check, since this is a natural existing ablation `solveLevel()` already applies uniformly end to end.

Sampled the first 25 objective-bearing levels from each of `published` (`data/levels.json`) and `corpus1` (`data/stress/stress-levels.json`) — 50 levels total, 43 more scanned-and-skipped for having neither must-pass nor must-cross objectives at all.

## A confound, caught and fixed

The first pass used `timeBudgetMs=20,000` (chosen as "generous" relative to the 15,000,000 work budget, by analogy with the main check's own generous-ms convention). It found **2/50 apparent mismatches** (`R00058`, `R00064`, both `corpus1`): both warm and cold runs correctly agreed on `ok: false` / `status: 'work-budget-reached'` / `solution: null`, but disagreed on the exact `workSpent`/`nodesExpanded` at which they stopped (e.g. `R00058`: 25,391,231 nodes warm vs. 23,363,793 cold for a nominally-identical 15,000,000-unit work budget).

Before treating this as a real finding, re-ran just those two levels with a much larger `timeBudgetMs=600,000` and logged wall-clock time per run. Result: **both matched exactly** at the larger deadline (`workSpent`/`nodesExpanded` bit-identical), and the wall-clock numbers explained why the first pass didn't: the memo-off (`cold`) run took **34.8s and 71.8s** respectively, against the memo-on (`warm`) run's **9.0s and 15.1s** — a ~2.3-4.8x slowdown from disabling the cache (exactly the caches' own documented purpose: `mustPassLowerBound`'s comment cites ~30% of repair-search CPU time; `mustCrossLowerBound`'s cites ~28% on a must-cross-heavy level). At `timeBudgetMs=20,000`, the slower `cold` run hit the check's own **outer wall-clock deadline** before exhausting the same 15,000,000-unit work budget the faster `warm` run reached — a confound in this check's own ms budget, not a state-isolation issue in the solver. This is precisely the artifact the main fresh-vs-preceded report's Method section already flagged as a risk and used a generous ms budget to avoid; this check's first pass simply hadn't made its own ms budget generous enough for a condition (memo disabled) that measurably changes wall-clock cost per unit of work.

Raised `timeBudgetMs` to 150,000 (comfortably above the slowest observed cold-run time) and re-ran the full 50-level sample.

## Result

**50/50 exact matches.** `ok`, `status`, `workSpent`, `nodesExpanded`, and `solution` were identical between memo-on and memo-off on every sampled level that exercises either cache, including both levels that surfaced the wall-clock confound above (now matching exactly once the confound was removed).

| corpus | eligible levels sampled | skipped (no must-pass/must-cross) | mismatches |
|---|---:|---:|---:|
| `published` | 25 | 24 | 0 |
| `corpus1` | 25 | 41 | 0 |

## Interpretation

Directly confirms `mustPassLowerBound`/`mustCrossLowerBound`'s own header-comment claim ("pure memoization, not an approximation") for real corpus levels, not just by code-reading: fully disabling both caches never changes the outcome, work spent, or nodes expanded of a solve — only how long it takes. This closes the specific "cache-empty vs cache-warm control" `solver-mutable-storage-inventory.md` names for these two caches.

The confound episode is itself worth keeping on record: a check built specifically to avoid wall-clock artifacts (per the main fresh-vs-preceded report's own stated care) still introduced one on its first pass, because "generous" is relative to what's being compared — 20,000ms was generous next to a 15,000,000 work budget in isolation, but not next to a 2-5x wall-clock slowdown from the very ablation under test. Any future check comparing two conditions with a known or suspected performance difference should size its ms deadline against the *slower* condition's expected wall-clock cost, not just against the work budget.

**Scope this does not cover:** only the two lower-bound memo caches, not the other cross-attempt stores `solver-mutable-storage-inventory.md` lists (`PrepLevel._stateBufs`, the `topology.ts`/`scoring.ts`/`lower-bounds.ts` module-scratch buffers) — those either don't have an existing ablation-flag bypass to reuse this exact method, or (per the inventory's own reasoning) are synchronous/non-nested/explicit-length-bounded in a way that doesn't carry the same "intentionally cross-attempt" caveat these two caches specifically got. A future session could extend this method to any store that gains its own bypass flag, but none of the remaining stores currently have one to test against.

## Reproduction

Not committed as a script — a one-off local diagnostic. Method: for each sampled level with `mustPassKeys.length > 0 || mustCrossKeys.length > 0`, run `Solver.solveLevel(level, { strictTotalWorkBudget: true, workBudget: 15_000_000, timeBudgetMs: 150_000, attemptBudgetTelemetry: true })` twice — once as-is, once with `ablation: { STRATEGY_LOWER_BOUND_MEMO: false }` added — and diff `ok`/`status`/`workSpent`/`nodesExpanded`/`solution`.

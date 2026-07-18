# Repair-search elite-splice regression: investigation, fix, and re-verification

**Date**: 2026-07-16. **Fixed in**: `modules/solver/repair-search.ts` (branch
`claude/repair-search-speed-o586ws`). **Related but distinct** from the repair-probe multi-seed
retry work landed just before this (`699bb65`, `37dab58`) — that one tuned probe seed width; this
one is about a mechanism that had gone silently dead inside `repairSearchFromGate` itself. Both
touch the same repair-gated feature cluster (`attempts.ts`'s `needsRepairFallback`), so read this
alongside CLAUDE.md's repair-probe multi-seed-retry gotcha, not instead of it.

## Starting point

A prior investigation (commit-bisected, see the task background this session started from)
isolated a July 10 commit — the one that extracted `dfsFromGate`'s and repair-search's
near-duplicated pruning gauntlets into a shared `evaluatePrunedMove()` (`prune-gauntlet.ts`) — as
the point where full-corpus `solver:bench --check` time jumped from ~24s to ~33s on the
then-156-level corpus, with zero solvability change. Buried in that refactor was a real behavior
fix, not just deduplication: repair-search's random walk used to treat a non-winning goal-cell
entry as an ordinary passable neighbor (could be scored, selected, and walked past); the
consolidated `evaluatePrunedMove` rejects it outright, matching `dfsFromGate`'s existing rule and
the real game rule that touching goal always ends the path (`domain/move-rules.ts`). That fix is
correct and was not to be reverted — the task was to recover the lost speed some other way.

## What I tried, in order

1. **Profiled the current (post-fix) corpus** (`Solver.solve` over all 160 published levels,
   `budgetMs=30000`, a scratch script mirroring `solver-bench.mjs` but recording
   `nodesExpanded`/per-attempt breakdown) to find which levels actually carry the regression's
   cost, rather than assume it's diffuse. Confirmed the effect is concentrated exactly where
   `needsRepairFallback` predicts: only 4 of 160 published levels ever invoke repair
   (P00136, P00144, P00145, P00146), and two of them (P00144, P00146) accounted for nearly all of
   a ~15s repair-attributable total.

2. **Drilled into the worst offender (P00144)** with `scripts/repair-direct-probe.mjs` (calls
   `repairSearchFromGate` directly, bypassing the rest of orchestration). Found the production
   repair *probe* was burning its full node budget on **all 3 retry seeds** (6,000,000 nodes,
   ~8.7s) without ever solving P00144 — even though the level solves in ~530ms via an ordinary
   main-loop beam attempt once the probe finally gives up. This matches the "48 tax-paying levels
   that never actually need repair" phenomenon `orchestration.ts`'s own
   `REPAIR_PROBE_ORDINARY_NODE_BUDGET` comment already documents, but the *degree* of waste here
   (guaranteed full-budget failure) suggested repair itself had gotten meaningfully worse at
   finding solutions, not just that this specific level was always a tax payer.

3. **Directly reproduced the pre-fix shortcut in isolation** to test causality: temporarily
   patched `takePly` so a `'reject'` verdict on a goal-cell candidate became `'pass'` again (i.e.
   restored the old, incorrect behavior), keeping the rest of the file untouched. Re-ran the same
   `repair-direct-probe.mjs` gates: P00144 dropped from "never solves in 6,000,000+ nodes" to
   solving in 30k–65k nodes across both gates. This confirmed the causal link empirically, but
   also required checking whether the *returned* solutions were actually legal (they must never
   revisit goal mid-path) — they were, because `takePly`'s own `chosen === level.goalKey` terminal
   check (line ~175, untouched by the patch) still forces any goal-cell selection to end the walk
   immediately. This observation — that the "walk through goal" framing wasn't quite literal —
   led directly to the real fix below. **This diagnostic patch was reverted immediately after use;
   it never shipped.**

4. **Found the actual mechanism**: `evaluatePrunedMove` now always returns `'solution'` or
   `'reject'` for a goal-cell candidate, never `'pass'` — so it can never reach `takePly`'s
   `survivors` list. That means `chosen` can never equal `level.goalKey` at the point that
   terminal check runs (a real win short-circuits earlier via the `'solution'` verdict). So
   `takePly`'s `'goalInvalid'` return value had become **unreachable dead code** the moment the
   July 10 fix landed. The problem: `'goalInvalid'` was the *only* trigger for
   `repairSearchFromGate`'s near-miss bookkeeping — `computeBadness()`, the 8-slot elite pool,
   and `bestBadnessEver` tracking. With that trigger gone, the elite pool stayed permanently
   empty, `spliceFromElite` was always `false` (short-circuited before its own `rand()` call even
   ran), and **every restart fresh-started from the gate** — silently disabling the entire
   ruin-and-recreate mechanism `ELITE_POOL_SIZE`/`SPLICE_PROBABILITY`'s own comments describe as
   necessary to escape single-best-path premature convergence.

5. **Confirmed the dead-code claim two more ways** before writing the fix: (a) a pure code-path
   proof (evaluatePrunedMove's goal-cell branch is unconditional, not gated behind any ablation
   flag, so this holds regardless of config); (b) empirically, `repair-direct-probe.mjs` on the
   unpatched code always reported `bestBadness=Infinity` (its initial value, never overwritten) —
   compare to the post-fix runs below, which report real numbers.

## The fix

Generalized the near-miss bookkeeping in `repairSearchFromGate` to fire on `'deadend'` as well as
`'goalInvalid'` — since `'solved'` already returns earlier, those are the only two outcomes left,
and `'deadend'` is now the outcome that carries the load `'goalInvalid'` used to. No change to
`evaluatePrunedMove`, `prune-gauntlet.ts`, `dfsFromGate`, or the win/legality check — the fix is
scoped entirely to which failed restarts get *recorded* for future splicing, not to what counts as
a legal move. Also corrected two comments in the same file that described the pre-fix (no longer
accurate) goal-cell behavior, and added a comment explaining why the now-dead `chosen ===
level.goalKey` check is kept anyway (defense-in-depth, same rationale CLAUDE.md documents for the
portal-destination guards elsewhere).

Diff: `modules/solver/repair-search.ts`, +43/-24 lines, one file.

## Verification

- **`solver:bench --check`**: 160/160 solved, no regressions vs. `logs/solver-baseline.json`, run
  twice on each side of the fix for stability (sandbox CPU-throttling can look like a regression
  per CLAUDE.md's own warning — this wasn't that): before 52.0s / 52.1s, after 41.8s / 41.6s.
  **~20% recovered** on the full published corpus.
- **Per-level** (published corpus): P00144 9.2s → 0.38s, P00146 5.7s → 0.08s, P00136 0.43s →
  0.04s. One level, P00145, got *slower* (0.47s → 4.4s) — see "Known accepted tradeoff" below.
- **`npm run ci`**: full pass (899/899 Vitest tests, all node validators, hint-path-oracle
  160/160, type-check clean).
- **Stress corpus** (`data/stress/stress-levels.json`, 8 repair-gated levels, reduced base budget
  3000ms to make failure differences visible fast): before **6/8 solved**, 88.7s total; after
  **8/8 solved**, 7.9s total (~91% reduction, and two outright solve failures fixed, not just
  slowness).
- **Re-checked the two stress failures at the standard 30000ms budget** (to rule out a
  budget-size artifact rather than a real solvability gap): both solve either way at that budget,
  but the cost gap is still severe — `stress-levels.json` #5 (id `S00048`) 60.2s → 1.9s, #30 (id
  `R00134`) 10.0s → 0.3s. So at the standard test budget this is "only" a large speed regression,
  not a solvability one; at smaller budgets (the kind hint-discovery tooling or a tighter CI gate
  might use) it *was* costing outright failures.
- **Throughput sanity check**: compared nodes/ms on a saturating workload (P00145 gate 0,
  node-budget=100,000, forced non-solve) before vs. after — 2.22–2.29 μs/node before,
  2.26–2.41 μs/node after. The added bookkeeping (computeBadness + elite-pool insert/sort/dedup
  per dead-end) is not a measurable per-node cost; the win here is entirely algorithmic (better
  restart diversity), not from making anything individually faster.

## Known, accepted tradeoff: P00145

P00145 (mustPass=4, mustCross=2, reqInt=5, single gate) went from 465ms to 4.4s. Investigated with
`PF_REPAIR_DEBUG=1`: the first probe seed's badness trajectory is real and improving (42 → 25 →
19 → ... → 3 over ~130k restarts, stagnation bursts firing on schedule every 6000 stagnant
restarts) but plateaus at badness 3 and never closes the last gap within the 2,000,000-node probe
budget. This is genuine ILS seed variance — not a bug in the fix — confirmed by two things: (a)
`computeBadness`/elite-pool bookkeeping introduce no rand() calls themselves, so this isn't a
control-flow bug, it's that *populating* the elite pool changes whether `spliceFromElite`'s own
`rand()` draw ever fires (short-circuited to false when the pool is empty), which shifts every
subsequent restart's PRNG trajectory — an expected, accepted side effect of restoring the
mechanism, not a new defect; (b) the existing repair-probe multi-seed retry (`699bb65`, unrelated
to this fix, already in production) rescues P00145 via its second seed, exactly as it's designed
to for cases like this. Net effect across the corpus is strongly positive; this is the kind of
single-level tradeoff the codebase's own docs already expect from a stochastic search (see
`EXIT_GUIDANCE_EPSILON_BOOST`'s S030 history in the same file) and isn't something I chased
further — doing so would mean re-tuning already-delicate constants for one level without the
calibration rigor that requires (see below).

## What remains to investigate

- ~~`REPAIR_PROBE_ORDINARY_SEED_SALTS` / `ELITE_POOL_SIZE` / the probe node budgets
  (`REPAIR_PROBE_ORDINARY_NODE_BUDGET`, `REPAIR_PROBE_BIASED_NODE_BUDGET`) were all calibrated
  against a repair-search that had this bug — i.e., against a version of repair that never
  spliced from elites. Now that splicing actually works, single-seed convergence may be
  meaningfully stronger than the calibration data assumed, so the retry width or per-seed node
  budget might now be narrowable.~~ **Resolved by the follow-up re-verification below: no change
  warranted.**
- **P00145-style single-level regressions**: acceptable today given the corpus-wide win and the
  existing multi-seed retry safety net, but not exhaustively characterized — a full stress-corpus-1
  and -2 sweep (450 + 1700 levels) was not run (only a 14-level, then an 8-level repair-gated
  subset of stress-corpus-1, chosen to keep wall-clock reasonable in this session). A full sweep
  would give higher confidence there's no similarly-sized regression hiding elsewhere in the
  repair-gated cluster, and would be the natural next step before treating this as fully closed
  across all 3 corpora (only the published corpus has that level of confidence right now).
- **The now-fully-dead `'goalInvalid'` / `chosen === level.goalKey` code path** was deliberately
  left in place as defense-in-depth (see the fix's own comment) rather than removed. If a future
  change to `evaluatePrunedMove` or `getNeighbors` ever changes this, that dead branch would
  silently start firing again — which is fine (it's contained and inert), but worth knowing it's
  there.
- **Cheap goal-cell precheck before the apply/undo cycle** (skip `applyMove`/`evaluatePrunedMove`/
  `undoMove` entirely for a goal-cell candidate that's cheaply provable-dead pre-apply, e.g. wrong
  post-move length) was considered per the task's original hint list but not implemented: goal is
  only one of up to 4 neighbors checked per ply, so this is a rare-path optimization with
  negligible aggregate impact given repair-gated levels are now a small fraction of total solve
  time — not worth the added code for the measured benefit.

## Follow-up: elite-splice constants re-verified (2026-07-16) — no change warranted

**Data collection only — no solver code changed.** Answers the "what remains to investigate" item
above: are `ELITE_POOL_SIZE`/`SPLICE_PROBABILITY`/the repair-probe node budgets
(`REPAIR_PROBE_ORDINARY_NODE_BUDGET`/`REPAIR_PROBE_BIASED_NODE_BUDGET`) still well-calibrated now
that splicing is active again? (Only `REPAIR_PROBE_ORDINARY_SEED_SALTS`, the retry width, had
already been re-tuned post-fix, in `7c59c4a`.)

**What the constants actually are, and when they were set.** `git log -L` on
`modules/solver/repair-search.ts` shows `SPLICE_PROBABILITY = 0.75` and `ELITE_POOL_SIZE = 8`
(plus their explanatory comments, which describe genuine splice-active behavior) have been
unchanged since this file's original creation, predating the July 10 regression entirely. They
were calibrated when splicing worked, went dormant during the July 10-15 window while the bug
silently disabled the trigger condition, and came back online unchanged once `e6a9cb9` restored
it — they were never actually re-derived *against* a broken splice mechanism. The genuinely
open question is whether they're still well-calibrated for how repair behaves now that splicing
is active again — which is what this follow-up measures.

**Method.** Re-ran the same calibration family `7c59c4a` used to re-tune the seed-salt width
(P00136, P00144, P00145, P00146 — the 4 real repair-gated published levels — plus P00146's 3
rotated symmetry siblings), this time capturing the actual repair attempt's
`nodesExpanded`/`bestBadness` per attempt (not just pass/fail), via a direct `Solver.solve` call
per level (`timeBudgetMs: 30000, nodeBudget: 8000000`).

| Level | Repair attempt(s) | Outcome |
|---|---|---|
| P00136 | 7,286 nodes | solved, seed 0 |
| P00144 | 255,717 nodes | solved, seed 0 |
| P00145 | seed 0: 2,000,010 nodes, timed out, `bestBadness: 3` — then seed 1: 805,745 nodes | solved, seed 1 |
| P00146 | 42,570 nodes | solved, seed 0 |
| F00146-sym-01 (r) | 21,785 nodes | solved, seed 0 |
| F00146-sym-02 (r²) | 7,915 nodes | solved, seed 0 |
| F00146-sym-03 (r³) | 55,449 nodes | solved, seed 0 |

Six of seven solve on the first seed using **0.4%–12.8%** of `REPAIR_PROBE_ORDINARY_NODE_BUDGET`
(2,000,000) — matching `7c59c4a`'s own qualitative finding ("solve on seed 0 alone, cheaply").
Only P00145 exercises the retry path at all: its first seed runs the probe's **entire** budget
before giving up (`2,000,010` nodes, `bestBadness: 3` — close but genuinely insufficient at this
budget), and its rescuing second seed still needs **~40%** of the same budget (805,745 nodes).

**Interpretation: the "headroom" in 6/7 levels does not mean the budget is oversized.** It's
tempting to read "most levels finish in under 13% of budget" as "the budget has 8x+ headroom,
shrink it." That's the exact trap CLAUDE.md's own repair-probe gotcha already documents for the
seed-*width* constant (rescuing seeds costing 21%–94% of budget across this same family) — the
same reasoning applies to the *budget size* itself, not just the retry count. The budget's job is
to be wide enough for the **worst rescuable case**, not sized to the median: P00145's rescue alone
already uses ~40% of the current 2,000,000-node ceiling, and its *failing* first seed uses the
entire thing before being declared unrescuable at that seed. A sample of one hard case in a family
of seven doesn't license extrapolating "the true worst case is close to 40%," but it does confirm
the current ceiling still comfortably covers the one hard case in hand.

**Conclusion: no change to `ELITE_POOL_SIZE`, `SPLICE_PROBABILITY`, `REPAIR_PROBE_ORDINARY_NODE_BUDGET`,
or `REPAIR_PROBE_BIASED_NODE_BUDGET` is warranted.** The mechanism behaves exactly as its original
(pre-regression) design intended: fast, cheap wins for the large majority of repair-gated levels,
with a budget wide enough to still catch the one member of this calibration family that needs most
of it. This closes the open question above as a verified negative result, not an oversight.

**Scope and caveats:** small sample (7 levels: 4 real + 3 rotated siblings of one of them, the
same family used for the prior seed-salt recalibration — only one of the 7 exercises the
retry/near-ceiling path at all, so this is a single hard-case data point, not a distribution).
Published corpus only — did not extend to the stress-corpus repair-gated population
(`needsRepairFallback`'s broader feature regime: `mustCross >= POLICY.REPAIR_MC_MIN`,
`mustPass >= POLICY.REPAIR_MP_MIN`), left out of scope given the marginal value of a much larger
sweep for what would still be a negative result. As with every other diagnostic-only entry in this
investigation, this required no `solver:bench --check` / full-corpus speed sweep, since no code
changed.

## Files touched

- `modules/solver/repair-search.ts` — the fix (committed, pushed).
- This report (new; later merged with its own follow-up re-verification report into one file).

No other files were changed; `CLAUDE.md`'s Solver Architecture gotchas list gets a short pointer
entry to this report (see that file).

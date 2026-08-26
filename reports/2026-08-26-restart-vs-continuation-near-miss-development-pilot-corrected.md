# Restart-vs-continuation development pilot: near-miss residual stratum (corrected)

> **Status:** concluded-negative
> **Last evidence:** 2026-08-26 — three reruns of `restart-continuation-population-pilot.mjs` over the same 20-level near-miss residual sample at `--work-budget=16000000` (`--restart-split=0.5` twice, `--restart-split=0.8` twice, one of each before and after the metric fix in `870e0afd`)
> **Decision:** this corrects [`2026-08-26-restart-vs-continuation-near-miss-development-pilot.md`](2026-08-26-restart-vs-continuation-near-miss-development-pilot.md), whose headline "continuation clearly beats restart" claim was a metric bug (see "What was wrong" below). Under the corrected metric, on this near-miss stratum at `W=16,000,000`: **neither the naive 50/50 split nor an unequal 0.8/0.2 split shows any measurable difference from continuation** — 17/20 and 19/20 exact best-badness ties respectively, mean delta 0.0 and 0.05 — and no arm converted any of the 20 gates into an actual solve (0/20 all arms, all splits). This is a genuine tie in both dimensions tested, not evidence that restart helps OR that it hurts. Per the audit's own stop-gate wording ("equal-work continuation matches or beats the tested restart schedule"), a tie still means restart earns no promotion, but the correct characterization is **inconclusive/no-detected-difference**, not "continuation wins."
> **Remaining gate:** none for either tested split on this stratum/budget. A materially larger work budget, a different residual stratum, or more seeds (three+) are the remaining open directions — none of which this pilot answers.
> **Evidence role:** discovery (development pilot, not confirmation)
> **Selection:** prespecified population/budget/splits; the metric fix was discovered by comparing the 0.8-split result against the already-published 0.5-split result and finding an internal inconsistency (an 0.8 split, which should preserve most of continuation's own trajectory, appeared numerically *worse* than the 0.5 split in the buggy version) — that anomaly, not a desire for a better-looking result, is what triggered the code review that found the bug. All three post-fix reruns are exact reruns of the same prespecified design; none is a search over alternatives.

## What was wrong

`restart-continuation-harness.ts`'s restart arm ran seed 0 to its share of the budget, then — on failure — a fresh seed 1 for the remainder, and reported the arm's `bestBadness` as **seed 1's own** `out.bestBadness`. But `repairSearchFromGate`'s internal `bestBadnessEver` is a local variable that resets to `Infinity` at the start of every call. A fresh seed 1 has no way to know what near-miss seed 0 found before being abandoned, so whenever seed 0 had already reached a better (lower) badness than seed 1 later achieved on its own, the harness's reported number silently dropped seed 0's progress entirely and reported only seed 1's (worse) number.

This is not a hypothetical concern: it is exactly the discarded-elite-pool mechanism the original (uncorrected) report itself proposed as an explanation for why restart looked worse — except the harness was manufacturing part of that appearance by mis-scoring the arm, not only by the search itself losing ground.

Production code already has the correct convention for this exact situation. `orchestration.ts`'s `STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET` signal computes `ordinaryBestBadness` as `Math.min` across the ordinary repair-probe's own multiple seed-salt rounds (see its `attempts.filter(...).reduce`-style aggregation around line 1232), and a separate `bestProgress` telemetry field collects `bestBadness` across every repair attempt in the ladder for exactly this kind of cross-attempt progress reporting. The fix (`870e0afd`) makes `restart-continuation-harness.ts` match that existing convention: `RepairArmResult.bestBadness` for a failed restart arm is now `Math.min(seed0.bestBadness, seed1.bestBadness)`.

This does not change the primary solved-count result (0/20 in every arm/split — a raw solve is unaffected by how the diagnostic badness field is computed) or the `workSpent` accounting (which was correct throughout and independently re-verified by unit test). It changes only the best-badness diagnostic's value and, with it, the interpretation of the search-quality question.

## Corrected results

Same population as the original report: 20 census-unsolved (`bestBadness<=6`) Corpus 2 levels, commit `fc625d187204a86c94dd18fedf12013906b7863d`, `W=16,000,000` canonical work units.

| split | restart worse | restart equal | restart better | mean delta | median delta |
|---|---:|---:|---:|---:|---:|
| 0.5 (audit's primary form) | 2/20 | 17/20 | 1/20 | 0.0 | 0.0 |
| 0.8 (seed 0 majority, seed 1 insurance tail) | 1/20 | 19/20 | 0/20 | 0.05 | 0.0 |

The 0.5-split deltas are `[0, 1, -2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]` (positive = restart worse); the 0.8-split deltas are `[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]`. Both are essentially flat at zero, not the strongly one-sided pattern the buggy version reported.

Solved counts: 0/20 in every one of the four arm/split combinations run (continuation, restart-0.5, restart-0.8, plus the original pre-fix reruns), fully consistent across every run.

## Interpretation

On this stratum and budget, crediting each restart arm with the best near-miss *either* of its seeds found (matching production's own multi-seed aggregation convention) shows continuation and restart reaching essentially the same search-quality plateau. The 50/50 split does not "waste" the second seed's share in any way visible to this metric — most levels' seed 0 alone (at 50% or 80% of the full budget) already reaches the same best-badness that a full-budget continuation run reaches, meaning **this population's repair search plateaus well before `W/2` and gains little from the remaining half of the budget regardless of whether it goes to the same seed or a fresh one.**

That is itself informative, independent of the restart-vs-continuation question: it suggests the binding constraint on this near-miss stratum is a search-quality/representation ceiling repair hits early (consistent with the operating model's rule to diagnose search-quality failure before prescribing more of the same search), not an allocation-between-seeds question at all. Continuation's own extra work in the second half of its budget is *also* not converting into further badness improvement most of the time (compare each row's `continuation.bestBadness` here against the population's `censusBestBadness` in the original report — they usually match exactly), which is consistent with a plateau rather than continuation actively benefiting from its extra length.

## Disposition

- The naive two-seed 50/50 restart split is **not shown to help** on this stratum/budget (no promotion case), but it is also **not shown to hurt** — retract the prior "closed, continuation wins" framing in favor of "no detected difference, inconclusive for restart-specific value here."
- The unequal 0.8/0.2 split performs identically to continuation to within noise, meaning — if a future design wants seed diversity "for free" as cheap insurance against continuation getting unlucky on a level where restart *would* have helped — a small insurance tail costs essentially nothing on this evidence. This is not itself a positive finding for that design (it was never shown to solve anything this pilot's 20 levels didn't), only a "no downside observed" one.
- The real constraint this pilot surfaces is that neither schedule pushes past this stratum's badness plateau at `W=16,000,000`. Per `docs/solver-optimization-current-queue.md` item #0, the next informative move is not another restart-schedule variant on this same stratum/budget, but either (a) a materially larger `W` to see whether the plateau is a budget ceiling or a genuine representation limit, or (b) the learned-failure/search-quality diagnosis line of work the same queue item already lists as open, since this pilot's plateau pattern is itself a small piece of evidence that something other than scheduling is the binding constraint here.

## Correction hygiene note

Per this repository's investigation-report conventions, the original report is marked `superseded` rather than edited into a different-looking history, and this correction states plainly what was wrong, why, how it was caught, and what changes as a result. The bug was caught by an internal-consistency check (the 0.8-split result contradicting the 0.5-split result in a way that made no structural sense — an unequal split favoring seed 0 should never look *worse* than an even split if the metric were correct), not by external review; readers relying on the original report before this correction should discard its restart-vs-continuation conclusion.

## Reproduction

```bash
# 50/50 (audit's primary form)
node scripts/run-bundled.mjs scripts/stress/restart-continuation-population-pilot.mjs -- \
  --max-badness=6 --sample-every=1 --limit=20 --work-budget=16000000 --restart-split=0.5 \
  --out=tmp/restart-continuation-pilot-badness6-w16m-split50.json

# 0.8/0.2 (insurance-tail form)
node scripts/run-bundled.mjs scripts/stress/restart-continuation-population-pilot.mjs -- \
  --max-badness=6 --sample-every=1 --limit=20 --work-budget=16000000 --restart-split=0.8 \
  --out=tmp/restart-continuation-pilot-badness6-w16m-split80.json
```

Both splits reproduced identical per-level `solved`/`workSpent`/`bestBadness` results across two independent runs each (repair search is deterministic given level/gate/seed/work cap).

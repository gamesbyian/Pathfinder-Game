# Restart-vs-continuation development pilot: near-miss residual stratum (superseded)

> **Status:** superseded
> **Last evidence:** 2026-08-26 — two reproducing runs (identical solved/`workSpent` per level) of `restart-continuation-population-pilot.mjs` over a 20-level near-miss residual sample at `--work-budget=16000000`
> **Decision:** SUPERSEDED by [`2026-08-26-restart-vs-continuation-near-miss-development-pilot-corrected.md`](2026-08-26-restart-vs-continuation-near-miss-development-pilot-corrected.md). This report's headline claim — that continuation measurably beats the naive two-seed 50/50 restart schedule on best-badness (18/20 worse, mean +7.3) — was a metric bug, not a real search-quality difference: `restart-continuation-harness.ts` reported the restart arm's best-badness as seed 1's own `bestBadnessEver` only, but `repairSearchFromGate`'s `bestBadnessEver` resets per call, so any progress seed 0 made before being abandoned was silently dropped from the restart arm's reported number — never credited, even though production's own `orchestration.ts` (lines ~1232-1233) already aggregates multi-seed repair-probe badness via `Math.min` across attempts, confirming that convention, not "last seed only," is correct here. Fixed in `870e0afd`. Under the corrected metric, restart and continuation are statistically indistinguishable on this stratum (17-19/20 exact ties per split). The solved-count result (0/20 both arms) is unaffected by the bug and still stands.
> **Remaining gate:** see the corrected report.
> **Evidence role:** discovery (development pilot, not confirmation)
> **Selection:** prespecified population/budget with one disclosed recalibration before any outcome was inspected (see "Methodology correction" below); the two runs used to produce the reported numbers are exact reruns of the same prespecified design, not a search over alternatives. This status block is left otherwise unedited as a record of the original (incorrect) claim; do not treat anything below this point as current.

## Population

Frozen baseline: the existing raised-cap Corpus 2 census (`reports/stress/benchmark-latest-random.json`, commit `fc625d187204a86c94dd18fedf12013906b7863d`, `budgetMs=86400000`/`nodeBudget=50000000`/`workBudget=67000000` over 1700 levels, 976 solved / 724 unsolved). `modules/solver/repair-search.ts` and `orchestration.ts` are unchanged between that commit and current HEAD, so the census's repair behavior is still current-code-accurate.

Residual population: census-unsolved levels where the primary (seed-0) `repair-probe` attempt actually ran (repair had a genuine chance to act — as opposed to the 279/558 "routing-skipped" cases the census's own lifecycle-failure-map already attributes to a starvation/allocation question for queue item #1, not this one), restricted to `bestBadness <= 6` — a **near-miss stratum** chosen on the census's own pre-existing difficulty label, not on this pilot's outcome. Deep failures (`bestBadness` in the teens/twenties+, most of the 537-level base population) are not close enough for any bounded repair work, continuation or restart, to plausibly close, so including them would mostly measure "population too hard to be informative" rather than answer the scheduling question. This stratum has 43 levels; this pilot used the first 20 in census order (compute-boundedness, not outcome selection).

## Methodology correction (disclosed)

The first attempt used `--work-budget=3000000` and found 0/43 solved in both arms uniformly. Before interpreting that as a result, I measured the actual canonical-work cost of the census's own repair-probe budget (`REPAIR_PROBE_ORDINARY_NODE_BUDGET = 2,000,000` nodes) directly on three of these levels: it cost 8.1M, 9.8M, and 16.0M `workSpent` units respectively. So the first pilot's 3,000,000-unit envelope gave the harness's continuation arm **less** work than the census's own already-failed seed-0 attempt — not a fair test of "does more/differently-scheduled work help," just a shorter replay of a known failure. This was a calibration error caught by an objective node/work-ratio measurement, not by peeking at the restart-vs-continuation comparison's own outcome, so the population/candidate set was not touched — only the work budget was corrected upward to 16,000,000 (comfortably above the observed 8.1–16.0M range) before rerunning.

## Primary result: solved count

0/20 in both arms. No level converted to an actual solution under either schedule at this budget. This makes the raw solved-count comparison a **tie at zero** — informative for ruling out restart superiority (a tie satisfies the audit's own "matches or beats" stop-gate wording), but not informative about whether a still-larger budget would eventually solve any of these gates.

## Supplementary diagnostic: best-badness progress

Per the operating model's rule to diagnose search-quality failure before prescribing more of the same search, each arm's `out.bestBadness` (repair's own progress-toward-solution proxy; lower is better, 0 is a solve) was also recorded — a diagnostic added to `restart-continuation-harness.ts` for this purpose (`RepairArmResult.bestBadness`, null on a solve).

| | value |
|---|---:|
| restart worse than continuation (higher badness) | 18/20 |
| restart equal | 1/20 |
| restart better (lower badness) | 1/20 |
| mean badness delta (restart − continuation) | +7.3 |
| median badness delta | +5.0 |

Per-level detail (`censusBestBadness` = the census's own recorded starting point for context):

| id | censusBestBadness | continuation bestBadness | restart bestBadness |
|---|---:|---:|---:|
| R00342 | 6 | 6 | 17 |
| R00355 | 2 | 2 | 4 |
| R00565 | 6 | 6 | 4 |
| R00765 | 6 | 6 | 16 |
| R01052 | 5 | 4 | 12 |
| R01179 | 6 | 6 | 9 |
| R01229 | 4 | 4 | 5 |
| R02077 | 3 | 3 | 6 |
| R02080 | 2 | 2 | 10 |
| R02162 | 3 | 3 | 13 |
| R02176 | 5 | 5 | 10 |
| R02182 | 4 | 4 | 17 |
| R02392 | 5 | 5 | 7 |
| R02422 | 3 | 3 | 32 |
| R02432 | 6 | 4 | 9 |
| R02437 | 2 | 2 | 32 |
| R02438 | 4 | 4 | 9 |
| R02448 | 6 | 6 | 6 |
| R02452 | 4 | 4 | 6 |
| R02456 | 3 | 3 | 4 |

This is a consistent, one-sided pattern (18-1-1, sign test far from 50/50), not a marginal or mixed one. It also has a plausible mechanism directly named in the audit itself: repair's restart loop builds an elite pool over its run and splices near-misses to make further progress (`repair-search.ts`'s `considerElite`/`spliceFromElite`); cutting a seed off at `W/2` and starting a genuinely fresh seed discards that entire accumulated pool, so the second seed spends much of its own `W/2` re-earning ground the first seed's continuation would have kept for free. The audit's own text anticipated exactly this: "continuing repair can remain valuable well into deep work bands," and "do not build [a mixed restart/continuation] policy before the simplest equal-work comparison establishes headroom." This pilot is that comparison, and it establishes the opposite of headroom for the naive form.

Caveat: best-badness is a heuristic proxy, not the real objective (fewer nodes to a real solve). It is used here only as diagnostic color explaining a tie at the real objective (0 solves both), not as a substitute primary outcome — consistent with the operating model's "do not optimize proxies after the real objective stops moving." The primary decision-bearing claim is the solved-count tie plus the stop-gate language it satisfies; the badness pattern is the reason to believe that tie would likely become a continuation win, not a restart win, at a larger budget on this same stratum.

## Disposition

Per [`solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) item #0's next gate and the audit's own stop rules: **close the naive two-seed 50/50 restart-at-`W/2` schedule** for this near-miss residual stratum at this work level. This is development evidence (Corpus 2 is repeatedly-mined discovery data, and 20/43 of one stratum is not a broad population), so the closure claim is scoped to that stratum/budget, not a project-wide "restart never helps" claim — a differently-shaped restart (unequal split, more than two seeds, or applied to a stratum where continuation itself plateaus much earlier) is not ruled out by this evidence and would need its own prespecified test.

## What remains open

- Whether continuation's own advantage persists, narrows, or reverses at a much larger `W` (this pilot's 16M units is ~1–2x the census's own already-failed repair-probe spend, not an order of magnitude more).
- Whether an *unequal* split (e.g., seed 0 gets the majority of `W`, seed 1 a small tail) recovers some of restart's seed-diversity value (the real capability `STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY` already exploits in production) without paying continuation's full opportunity cost — this is a materially different, still-untested treatment, not a rescue of the tested 50/50 form.
- Whether the deeper (`bestBadness` in the teens+) residual population shows the same or a different pattern — plausibly not decision-relevant since neither schedule is close to solving there either, per this pilot's own filtering rationale.

None of these are pursued here; per the operating model, a clear negative closes the tested form rather than being indefinitely rescued by a nearby variant.

## Reproduction

```bash
node scripts/run-bundled.mjs scripts/stress/restart-continuation-population-pilot.mjs -- \
  --max-badness=6 --sample-every=1 --limit=20 --work-budget=16000000 \
  --out=tmp/restart-continuation-pilot-badness6-w16m.json
```

Two independent runs of this exact command produced byte-identical per-level `solved`/`workSpent` results (repair search is deterministic given level/gate/seed/work cap).

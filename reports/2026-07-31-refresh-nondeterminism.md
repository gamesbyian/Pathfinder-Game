# The corpus refresh is not reproducible, and the cause is its own ms deadline (2026-07-31)

Two full typical-budget refreshes were run on solver code differing by nothing but a test file
(`93162bf5` and `92fdb49a`; the only `modules/` diff between their commits is `search.test.ts`).
They disagree. This is the diagnosis, and it has a demonstrated fix that is **not** applied here,
because applying it changes what the benchmark measures.

## The disagreement

| corpus | solved | flips | `nodesExpanded` identical |
|---|---|---|---|
| corpus-1 | 89 -> 89 | **0** | **102/102** |
| corpus-2 | 506 -> **505** | **5** | 1429/1700 |

Of the 271 differing corpus-2 node counts, **263 are a level at the 20M cumulative cap** biting at a
slightly different point (20,000,041 vs 20,000,162 — benign). The remaining **8 differ with both runs
under the cap**, and all 8 are `success -> success`: they are cost variance, not outcome variance.
The 5 outright flips are budget-edge levels, where that cost variance pushes them across the cap.

Telling detail: on R02420 the node counts differ by 19 while **work differs by 14%**
(31,335,209 -> 26,881,207), and on R02474 by 117 nodes against 19% work. Work is
`applyMove + 12 x isConnected`, so a large work swing at a flat node count means a different
*attempt mix* ran, not a different search.

## The cause

`orchestration.ts`'s work-metered ladder allocates in work units — `gateBudget`, `attBudget` and
`prep._workCap` are all work, and that part is deterministic. But two wall-clock gates survive inside
it:

```
445: const gateElapsed = Date.now() - levelStartTime;
446: if (gateElapsed >= timeBudgetMs) return { solution: null, attempts };
470: runAttempt(..., timeBudgetMs - (Date.now() - levelStartTime), Date.now(), ...)
```

With `--budget-ms=8000` against levels that run tens of seconds, that check decides **how many
attempts fit before the ladder bails** — a function of how fast the machine happens to be at that
moment. `docs/solver-budget-determinism.md`'s claim that `timeBudgetMs` "survives only as an outer
deadline" is literally true and materially misleading: a deadline that truncates still selects which
attempts run, and therefore the result.

## Demonstrated, on one host, back to back

R02374, identical budgets, `--workers=1`, idle machine:

| `--budget-ms` | run 1 | run 2 |
|---|---|---|
| 8000 (binding) | 6,656,794 nodes, ms 8033 | 6,371,354 nodes, ms 8029 |
| 600000 (non-binding) | 15,006,969 nodes / 15,495,515 work | **15,006,969 nodes / 15,495,515 work** |

At 8000ms both runs stop *on the deadline* and disagree. With the clock made non-binding they are
bit-identical on both nodes and work, differing only in wall time (12.7s vs 13.2s) — which is exactly
the property the work budget was introduced to provide.

So the workflow header's "deadlines 20000ms / 8000ms, non-binding by design" is false for corpus-2.
It is the binding constraint on precisely the levels that matter — the slow, near-miss ones.

## The measurement rule this implies, which DOES apply now

**A corpus-2 solved-count difference of +/-5 is not distinguishable from run-to-run noise.** Recorded
in `docs/solver-budget-determinism.md`. Applied to the 2026-07-31 results: the reserved-intersection
wall's +19 (matched nodes, 180 levels) and +28 corpus-wide are well clear of it; a portal-scope
extension measured at +5 is exactly at the floor and is not a demonstrated gain; two mechanisms
reverted at -1 and -2 were inside the band and should be described as showing no effect rather than
as losses.

## The fix, and why it is not applied here

Raise the deadlines until the clock is non-binding, leaving work and node budgets as the only bounds.
That makes the refresh reproducible. It is deliberately **not** done in this report because it is a
change to what the benchmark measures, not a bug fix:

- **Comparability breaks once.** Every prior typical-budget baseline was produced with the 8s
  deadline binding. The first run without it is a step change in the corpus number that is not
  attributable to solver quality.
- **It costs runtime.** R02374 went 8.0s -> 12.7s once unbounded; naively ~1.6x on the slow tail.
- **The 8s figure is load-bearing for a different reason.** The workflow header notes tier sizing
  changes which solutions are found, so this is not a free knob — which is true, and is precisely why
  it should be changed deliberately rather than silently.

The honest options are (a) keep 8000 and treat +/-5 as the noise floor forever, (b) raise it once,
accept a one-time discontinuity, and get exact reproducibility, or (c) keep 8000 for continuity and
add a separate deterministic configuration for A/B work. This report does not choose.

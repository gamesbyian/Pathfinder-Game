# closeLengthGap's own invocation/success rate, and a near-miss trigger extension (2026-07-18)

## Context

[`reports/2026-07-17-length-gap-close-operator.md`](2026-07-17-length-gap-close-operator.md)
shipped `closeLengthGap` — a bounded backtracking DFS that fires when a repair-search restart
deadends with `structuralDeficit(ws, level) === 0` (every non-length/intersection objective
already satisfied) — and measured a 5% single-flag rescue rate on a 20-level `repair-close`
sample. That report flagged a full corpus-2 refresh as the natural next step to get a
population-level number, but that refresh wasn't run this session (deferred — see
`docs/solver-development-roadmap.md`'s CI-trial-run decision point). This report instead asks a
cheaper, purely local question: **when the operator fires, what actually happens?** — how often
does it trigger at all, and when it does, does it fail because it's under-budgeted or because the
locally-reachable neighborhood genuinely has no rescue?

## Method

Added temporary (now permanent, env-gated, zero-overhead-when-unset — same convention as
`_REPAIR_DEBUG`) instrumentation at `closeLengthGap`'s call site (`PF_LENGTH_GAP_DEBUG=1`),
logging one line per invocation: the length/intersection deficit at trigger time
(`computeBadness(ws, level)`, which equals `structuralDeficit + len + int`, and since the base
trigger requires `structuralDeficit === 0` this equals the pure length/intersection gap), the
node budget for that call, nodes actually used, and whether it succeeded.

Ran `scripts/repair-direct-probe.mjs` (single `repairSearchFromGate` call, bypassing the full
attempt ladder, matching the operator's own verification methodology) against a fresh 15-level
`repair-close` sample (seeded random draw from `reports/stress/unsolved-failure-clusters.json`'s
139-level cluster, no overlap with the shipped operator's own 20-level sample): R01957, R02992,
R02823, R01124, R02352, R01930, R01022, R02758, R02832, R02655, R02038, R02815, R02123, R02554,
R02062. `budgetMs=8000`, `nodeBudget=Infinity` (the wall-clock-bounded shape, matching the
production repair fallback).

## Finding 1: a clean bimodal split, not a uniform low rate

| | count | lgc invocations (total) | any solve |
|---|---:|---:|---:|
| Never invoked `closeLengthGap` | 10/15 (67%) | 0 | 0 |
| Invoked `closeLengthGap` (very frequently) | 5/15 (33%) | 2,308–21,463 per run | 0 |

The "never invoked" population's best-ever badness stayed ≥5 for the whole 15-level sample
(range 2–23) — these levels never reach a state where every non-length objective clears, so the
operator is correctly a no-op for them by construction (its trigger condition never becomes
true). The "invoked" population triggers it *constantly*: thousands of times per 8-second run,
one call per restart that deadends at exactly the target signature. Of those calls, the vast
majority (94–99%) terminate via genuine local-subtree exhaustion (`nodesUsed < closeBudget`),
not the 4,000-node budget cap — e.g. R02758: 21,463 invocations, only 40 (0.2%) hit the budget
cap. **This is not a budget-starvation problem**: even where the operator fires relentlessly, the
bounded backtracking neighborhood from any single restart's own trajectory almost never contains
a length-closing detour, and giving it more nodes per call would barely move the needle (the
tree it's exploring is mostly just small and dead, not large-and-cut-off). This is consistent
with, and sharpens, the shipped operator's own 5% single-flag rescue rate: on levels where it
fires at all, it's trying (and failing) very hard, not sitting idle.

Typical deficits at invocation time (lenDeficit distribution across the 4 highest-volume
levels) cluster small — 3–7 in the large majority of calls, with a long thin tail to 20+ — so
this isn't a case of the operator only ever attempting hopelessly large gaps either.

## Finding 2: the closest near-misses of all are invisible to the base trigger

`R02655`'s best-ever near-miss across the 8-second run (`bestBadness=2`) never invoked
`closeLengthGap` even once. Instrumented separately with `PF_REPAIR_DEBUG=1`'s existing badness
breakdown:

```
bestBadness=2 (len=1 int=0 mp=0/6 mc=0 surroundMask=0 mustTurnMask=100000 adjTurnMask=0)
```

Length off by exactly 1 — as close as this deficit term gets without solving — but with one
`mustTurn` cell still pending (`structuralDeficit === 1`, not `0`). The base trigger's condition
is strict equality, so this level's single closest-ever near-miss across the whole run never
gets the operator's attempt at all, despite being a textbook case of "so close, just needs a
[length ± 1]-cost detour through the right unsatisfied cell." This is a real gap in the shipped
operator's coverage, not a hypothetical: it's the literal best-ever state of a real cluster
member.

## Extension: `STRATEGY_REPAIR_LENGTH_GAP_CLOSE_NEAR_MISS`

Widened the trigger from `structuralDeficit(ws, level) === 0` to `<=
LENGTH_GAP_CLOSE_STRUCTURAL_SLACK` (new constant, `= 1`), gated behind a new, independently
ablatable flag so its own marginal contribution (on top of the already-shipped base operator)
can be isolated. **Correctness is unaffected by the looser trigger**: unlike the `=== 0` case,
`structuralDeficit <= 1` is not a "provably stays true for the rest of the walk" invariant (the
operator's own internal backtracking can re-open an already-cleared bit before re-clearing it
differently) — but that was never the source of soundness. `closeLengthGap` only ever reports
`solved: true` via `evaluatePrunedMove`'s `'solution'` verdict, the same full-state
`isSolutionState` gate every other success path in this file relies on. The trigger condition
only controls *when the cheap, bounded attempt is worth making* — never what counts as success.

## Verification

- `tsc --noEmit`: clean.
- `npx vitest run modules/solver/repair-search.test.ts`: 14/14 passing, unchanged.
- **20-level fresh `repair-close` A/B** (seeded sample, no overlap with either prior sample;
  includes R02655 specifically to test the motivating case), `defaultConfig()` vs
  `withFeatureDisabled('STRATEGY_REPAIR_LENGTH_GAP_CLOSE_NEAR_MISS')`, single
  `repairSearchFromGate` call per level/config, `budgetMs=8000`:

  | | solved | total nodes | total ms |
  |---|---:|---:|---:|
  | ON  | 1/20 | 60,880,898 | 153,409 |
  | OFF | 0/20 | 66,567,060 | 160,002 |

  One genuine rescue: **R02319** (not R02655 — R02655's own near-miss didn't resolve within this
  budget even with the wider trigger; the rescue came from a different cluster member also
  sitting on a small residual deficit). 16/20 levels identical. 3/20 show a modest badness
  *regression* with the flag on (R03274: 6→10, R02815: 3→6, R02470: 5→9) — all on levels that
  don't solve either way, plausibly the same "extra attempts eat into the fixed wall-clock
  budget" effect the base operator's own node-budget-bounded framing showed. Excluding the one
  solved level (to remove its early-exit time savings from the comparison), node/time ratios
  (ON/OFF) are 0.96/1.00 — near-neutral cost, not the free win the raw totals above suggest.

- **Published corpus** (in-process A/B, `Solver.solve` directly rather than a git-diff before/
  after, to isolate exactly this flag without touching working-tree state): 160/160 solved with
  the flag on and with it off — solved sets identical, `ON` wall time 32.0s vs `OFF` 34.4s (noise;
  none of the 160 published levels are `repair-close`/`repair-far` members, so this flag almost
  never triggers there, matching the base operator's own published-corpus finding).
  `npm run solver:bench -- --check` (production default, flag on): 160/160, no regressions vs
  `logs/solver-baseline.json`, run twice for stability (~41s both times in this environment;
  the base operator's report recorded ~34–35s in a different environment — read as container
  speed variance, not a regression, since the in-process isolated A/B above already shows this
  flag costs nothing on this corpus).

## Verdict

Shipped **default-enabled**, matching this file's existing `STRATEGY_REPAIR_*` convention and the
base operator's own precedent. Real, modest, honestly-mixed evidence: one confirmed rescue in a
20-level sample (5%, the same rate the base operator itself measured), zero published-corpus cost,
and a small number of near-miss-quality regressions on levels that don't solve either way. Not a
strong result — a single-digit-percent single-flag rescue stacked on top of an already-shipped
single-digit-percent rescue — but consistent with this session's other targeted repair-cluster
fixes, and the diagnostic finding underneath it (Finding 2: the closest near-misses in this
cluster are structurally invisible to a strict-equality trigger) is the more durable contribution
here regardless of this specific flag's eventual fate.

**What this does and doesn't establish**: a 15-level invocation-rate sample and a 20-level A/B
are real evidence, not population-level numbers. `LENGTH_GAP_CLOSE_STRUCTURAL_SLACK = 1` is an
unvalidated starting value (chosen to match the one motivating data point, R02655's
`structuralDeficit === 1` near-miss) — untested whether 2 or higher helps more cluster members at
acceptable cost, or whether R02655 itself would need a larger slack (or a different mechanism
entirely — its own instrumented run shows the wider trigger still didn't close its gap within
budget). **Not yet done, per the roadmap's standard next step**: a full corpus-2 refresh to get a
population-level solved-count delta for this flag stacked on the base operator — deferred this
session (CI-trial-run decision), flagged as the natural continuation once that refresh happens.

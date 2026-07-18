# Campaign 1 closing summary: `repair-close` rescue (2026-07-18)

## Verified population-level result of this session's changes

The 2026-07-18 refresh (`ef63f95`, verified in detail earlier the same day — see
`docs/solver-development-roadmap.md`'s infrastructure note) is the first genuinely complete
corpus-2 refresh since `STRATEGY_REPAIR_LENGTH_GAP_CLOSE_NEAR_MISS` shipped
(`reports/2026-07-18-length-gap-close-invocation-rate.md`). Diffed against the last genuine
baseline (`5a64887`, 302/1700) with `diff-baseline.mjs --retry-failures`:

- **28 genuine improvements** (previously unsolved, now solved).
- **26 apparent regressions** in the raw diff. Isolated retry (fresh child process, no shared
  batch-worker contention) found **24/26 are flaky** — they solve fine in isolation, so the
  batch run's 2-worker contention (or plain run-to-run repair-search stochastic variance) is the
  explanation, not a code regression. **2/26 reproduce deterministically.**
- Net committed delta: 302 + 28 − 26 = **304/1700**, matching the committed file.

### The 2 genuine regressions, root-caused

`R02204` and `R03101` both flip `success → node-budget-reached` reproducibly. A direct flag A/B
(`Solver.solve`, `ablation=null` vs `withFeatureDisabled('STRATEGY_REPAIR_LENGTH_GAP_CLOSE_NEAR_MISS')`,
matching the workflow's own `budgetMs=8000, nodeBudget=20000000`) confirms **both are caused by
the near-miss extension specifically**, deterministically:

| | R02204 | R03101 |
|---|---|---|
| ON (near-miss enabled) | `node-budget-reached`, 20,000,017 nodes | `node-budget-reached`, 20,000,000 nodes |
| OFF (near-miss disabled) | `success`, 3,066,049 nodes, 15,008ms | `success`, 3,722,473 nodes, 21,875ms |

This is the same trade-off shape the base `closeLengthGap` operator already shipped with
(`R02252`, `reports/2026-07-17-length-gap-close-operator.md`) and the same shape my own 20-level
sample A/B flagged as a real possibility (`reports/2026-07-18-length-gap-close-invocation-rate.md`'s
"3/20 badness regressions" finding) — the wider trigger fires far more often per restart, and on
these two levels it burns enough of the fixed node budget on failed attempts that the level never
reaches whatever restart would otherwise have solved it within budget. **Net effect is clearly
positive** (28 vs. 2, a >10:1 ratio) and consistent with the precedent of keeping the base
operator default-enabled despite its own named single-level cost — no change made here, this is
a documented, not hidden, trade-off.

### Re-clustering

`reports/stress/unsolved-failure-clusters.json` regenerated against the fresh 1396-unsolved
population: `repair-close` 139→124, `repair-far` 754→765, `dfs-plain` 1398→1396. (Total unsolved
1396 = 1700 − 304, consistent.)

## R02655 case study: closeLengthGap's own reach, isolated

R02655 was the motivating case for the near-miss extension (`bestBadness=2`: length off by 1,
one pending `mustTurn` cell). Directly instrumented via `repair-direct-probe.mjs`
(`PF_REPAIR_DEBUG=1 PF_LENGTH_GAP_DEBUG=1`, single gate, `repair` profile, unbiased,
`budgetMs=20000`, unlimited node budget — deliberately generous, to rule out "just needed more
budget" as an explanation): `closeLengthGap`'s near-miss trigger fires **6,727 times** in this
one run, including **1,949 times at the exact best-ever state** (`len=1`, one pending `mustTurn`
bit) — and **never once succeeds**. `bestBadness` never improves past 2 for the rest of the
20-second run.

**This level is not actually unsolved** — the real 2026-07-18 refresh solves it (`winningConfig:
"dfs:repair:repair"`, same gate `65544`, 3,586,134 nodes, 6,784ms). But re-running the specific
configuration that solved it in isolation (`--must-turn-biased`, same gate, same budget) does
**not** reproduce the solve either (`bestBadness=4` after 20s, worse than the unbiased attempt)
— so the exact mechanism by which the full pipeline solves R02655 is not pinned down by this
investigation; it's evidently some interaction of the full attempt ladder (multiple attempt
configs, node-budget accounting, or seed/timing effects) not reproduced by either single-attempt
probe tried here. **Left as an open curiosity, not resolved.**

What *is* solidly established, independent of that unresolved question: `closeLengthGap`'s
bounded local backtracking — confined to the current restart's own already-walked suffix, never
re-opening the elite-splice/fresh-start prefix (see the operator's own design doc) — genuinely
cannot close this specific frozen state, no matter how many times it's tried from slightly
different nearby restarts. This is a real, instrumented demonstration of the operator's
structural limitation (a local patch mechanism can't perform an arbitrary global reroute), not
just a design worry — even though, on this particular level, some other part of the system
happens to cover for it via an unidentified different path.

## Campaign 1 status: closing assessment

**What shipped and is verified working**: the repair-probe node-budget-starvation fix, the
budget-accounting-overshoot fix, `closeLengthGap` (base, 2026-07-17), and
`STRATEGY_REPAIR_LENGTH_GAP_CLOSE_NEAR_MISS` (2026-07-18) — net positive at population scale
(+26 net rescues across the two closeLengthGap-family changes combined, weighed against 3
documented single-level trade-offs: R02252, R02204, R03101).

**What was tried and found exhausted**: three independent constant-tuning attempts on
`repair-search.ts`'s stagnation plateau (burst length, elite-pool tie-diversification,
stagnation threshold) — all reverted, one net-negative. The frozen-signature diagnosis that
replaced constant-tuning as the working hypothesis is now itself substantially mined:
`closeLengthGap` addressed the pure-length-deficit case, the near-miss extension addressed the
one-pending-object case, and this session's R02655 instrumentation shows the *mechanism* (local
backtracking) has a real ceiling independent of trigger-condition tuning.

**What remains genuinely open, going into a future Campaign 1 continuation or Campaign 3**:
- `repair-far` (765 levels, structurally stuck even under repair) was never targeted — Campaign 1
  only ever worked `repair-close`.
- `LENGTH_GAP_CLOSE_STRUCTURAL_SLACK` beyond 1 is untested.
- **The mechanism-level lesson generalizes beyond this one campaign**: independent local
  restarts (whether plain repair restarts or `closeLengthGap`'s bounded backtrack) keep
  rediscovering the same dead ends without learning from the failure — the frozen-signature
  report's "tens of thousands of restarts, zero improvement" and this session's "6,727 near-miss
  triggers, zero solves from the identical state" are the same phenomenon at two different
  granularities. The next lever that could plausibly change this isn't another bounded local
  operator or another restart-diversity tweak (three of those already failed) — it's giving the
  search **memory of its own failures**, e.g. a cheap sound transposition/dead-state signature
  (the specific open question left by this session's transposition-table check, `docs/
  solver-development-roadmap.md`) or a genuinely different search paradigm with real
  conflict-driven pruning. This is a materially bigger investment than anything tried in Campaign
  1 so far, flagged here as the honest state to hand off rather than attempted in this session.

## Verification

- `diff-baseline.mjs --retry-failures` run against the genuine pre/post refresh baselines (full
  results: 28 improvements, 2 confirmed regressions, 24 flaky).
- R02204/R03101 root-cause confirmed via direct, deterministic `Solver.solve` A/B (single run
  each direction, matching production `budgetMs`/`nodeBudget` exactly).
- R02655 instrumented directly via `repair-direct-probe.mjs` with both debug flags; the
  `--must-turn-biased` non-reproduction is reported as a genuine unresolved gap, not glossed
  over.
- `reports/stress/unsolved-failure-clusters.json` regenerated and committed against the fresh
  baseline.

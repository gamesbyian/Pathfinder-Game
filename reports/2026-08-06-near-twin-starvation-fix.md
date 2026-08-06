# The 9 near-twin starvation/routing cases are one bug: `solver-stress-refresh.yml` never bounds workBudget (2026-08-06)

Follow-up to `reports/2026-08-06-near-twin-solver-response-comparison.md`, which identified 9 of 40
closest solved/unsolved near-twin pairs (4 `never-attempted`, 5 `starved-zero-nodes`) as "the cheap,
well-defined fix" and recommended checking whether specific profiles were being starved of budget by
an earlier tier, "the same diagnostic `reports/2026-07-30-admissible-order-node-reserve.md` already
used successfully once." This is that diagnosis, and it turned out to be **one root cause for all 9**,
not nine separate scheduling gaps.

## Headline

`solver-stress-refresh.yml`'s corpus-1/corpus-2 sweep steps pass `--budget-ms` (a deliberately
non-binding 24h value, since 2026-08-06) and `--node-budget`, but **never `--work-budget`**.
`portfolio-solve-sweep.mjs` then derives `workBudget` from `budgetMs x DEFAULT_WORK_PER_MS` alone —
with a 24h `budgetMs` this is ~289 **billion** work units, roughly 500-800x larger than 36,000,000
nodes could ever cost. Since `orchestration.ts`'s per-attempt fair-division (`attemptBudgetShare`)
divides *work*, not nodes, a workBudget this large never actually binds — so the **first** attempt
tried (an ordinary main-loop/repair-fallback attempt, or a `--prime-winner` miss replay) is free to
run unchecked until it single-handedly exhausts the entire external `--node-budget` ceiling, leaving
every attempt after it exactly 0 nodes. This is the exact mechanism behind all 9 near-twin
starvation/never-attempted cases.

**`solver-typical-budget-baseline.yml` already has this fixed** — it passes `--work-budget` at
exactly a 1.34x-of-node-budget ratio (`26,800,000`/`20,000,000` for corpus-2, `67,000,000`/
`50,000,000` for corpus-1). That fix was never ported to `solver-stress-refresh.yml` when the latter
moved from a wall-clock-binding `8000ms` budget to a non-binding 24h one on 2026-08-06 — the change
that (as an unmeasured side effect) is what turned this from latent to catastrophic, since under the
old binding 8000ms deadline the derived workBudget (8000 x 3350 = 26.8M) was *itself* a reasonable,
comparable-scale ceiling.

## Diagnosis

### The 4 `never-attempted` cases: 3 are exact `--prime-winner` miss matches

For R02634, R03160, and R02269, the compiled baseline records exactly **one** attempt for the whole
level: `profile: "repair"`, `nodesExpanded` at (or within rounding of) the run's node cap, and a
`randomSeed`. `repairSearchFromGate` seeds itself as `repairPrimarySeed(gateKey, seedSalt)`
(`repair-search.ts`) — recomputing that function for each level's recorded `(gateKey, seedSalt=0)`
reproduces the recorded `randomSeed` **exactly**:

```
R02634  repairPrimarySeed(65542, 0)  = 788388390   (recorded: 788388390)  MATCH
R03160  repairPrimarySeed(524289, 0) = 1807710641  (recorded: 1807710641) MATCH
R02269  repairPrimarySeed(131082, 0) = 562872554   (recorded: 562872554)  MATCH
```

This is only possible if the recorded attempt is a `--prime-winner` replay of a `dfs:repair:repair`
config at `seedSalt: 0` — i.e. a PRIOR baseline round recorded this level as solved via repair (very
plausibly a transient, timing-sensitive result: `orchestration.ts` search is not currently
node/work-deterministic across the repair-search random-walk's node-vs-wall-clock interaction the
way a pinned `workBudget` run is — see `docs/solver-budget-determinism.md`), and this round's replay
**missed**. `primeAttemptFor()` (`portfolio-solve-sweep.mjs`) does not pass `nodeBudget` unless
`--prime-budget-mult` is given (it is not, in this workflow), so per `SolveOpts.primeAttempt`'s own
doc, "the prime shares the solve's own node budget" — uncapped. The miss then ran until it
single-handedly hit the external node ceiling (35,999,936-36,000,000-ish), and because nothing after
a prime *miss* skips the rest of the ladder, the probe/main-loop/repair-fallback/attraction-diversity
tiers all then immediately saw `nodesExpanded >= earlyTierNodeBudget` and returned zero-attempt
results — hence `attemptCount: 1` for the whole level.

The 4th case (R02931) is not this shape — its ladder shows 9 real attempts, most consuming real
nodes; it's closer to a `real-attempt` case that was mis-bucketed by the `nearest-solved-neighbor`
count-threshold, not a starvation instance, and is not covered by this fix's claim.

### The 5 `starved-zero-nodes` cases: same shape, no prime attempt needed

R02657, R00477, R00720, R02911, R02666 don't require a `--prime-winner` replay at all — an
**ordinary** first main-loop attempt does the same thing once nothing bounds it:

| level | 1st real attempt | nodes | of nodeBudget (×0.75, post-AO-reserve) |
|---|---|---:|---:|
| R02657 | `dfs:perimeterSweep/cornerHarvest` | 27,000,243 | 36M × 0.75 = 27M |
| R00477 | `dfs:portalFirstTransfer` | 27,000,044 | 36M × 0.75 = 27M |
| R00720 | `dfs:portalFirstTransfer` | 27,000,220 | 36M × 0.75 = 27M |
| R02911 | probe (4M) then `beam:perimeterSweep/perimeterCW` | 23,000,080 | (27M − 4M probe) |
| R02666 | probe (4M) then `beam:perimeterSweep/perimeterCW` | 23,000,153 | (27M − 4M probe) |

Every other main-loop config in between shows `nodesExpanded: 0` (present in the ladder, never
actually run), then the admissible-order tier's own reserved 25% slice (`ADMISSIBLE_ORDER_NODE_
RESERVE_FRACTION`, `reports/2026-07-30-admissible-order-node-reserve.md`) runs on schedule and also
fails (~8,999,936-9,000,192 nodes, matching its 25% reserve exactly) — that tier's own reserve
mechanism is working exactly as designed; it's the other 70-90% of the ladder that never got a turn.

None of these 5 configs has a `minBudgetFraction` that would explain claiming ~100% of the remaining
budget by design (`cornerHarvest`/`portalFirstTransfer`/`perimeterSweep` are plain DFS/beam entries —
only the two `mcDiverseThread` beam configs and the long-multigate beam floor carry a nonzero
`minBudgetFraction`, and even those top out at 0.45). The only way a single attempt consumes
essentially the *entire* remaining ceiling is if its WORK cap (`prep._workCap`, derived from the
per-attempt *work* share) never binds before the *node* check does — exactly the mechanism above.

## Local reproduction

Reproduced at a scaled-down budget (same ratios, smaller absolute numbers so it runs in seconds
locally) via `Solver.solve()` directly on R02657:

```
node-budget=2,000,000, budget-ms=86,400,000, work-budget=<unset, defaults to ~289B-equivalent-scaled>
  -> cornerHarvest: 1,500,083 nodes (of 1,500,000 = 2M x 0.75 early-tier budget)
  -> 11 other main-loop configs: 0 nodes each
  -> admissible-order tier: 499,968 nodes (its 25% reserve) -- also fails
  IDENTICAL shape to the real baseline.

node-budget=2,000,000, budget-ms=86,400,000, work-budget=2,680,000 (1.34x node-budget, the fix)
  -> cornerHarvest 297,651 / perimeterCCW 318,568 / perimeterCW 313,506 / sideCommitment 318,023 /
     harvestThenFinish 252,429 nodes -- budget now genuinely divided across 5 configs before the
     (smaller-scale) node ceiling is reached, instead of 1 config eating everything.
```

At a larger local scale (`node-budget=8,000,000`, `work-budget=10,720,000`, same 1.34x ratio) across
all 9 levels, **R03160 — one of the 3 confirmed prime-miss `never-attempted` cases — solved outright**
(`status: success`, 2,099,738 nodes, 2 attempts) on a cold, unprimed run. The other 8 remained
unsolved at this reduced scale (8M is well under the real 36M ceiling, so most techniques still don't
get a full shot) but every one showed real, non-zero nodes spent across multiple attempts instead of
one attempt monopolizing the budget — the fairness property is restored; whether it's *enough* budget
for any individual level is a separate, unaffected question.

## The fix

Added `--work-budget` to both sweep steps in `solver-stress-refresh.yml`, derived from the same
`--node-budget` input via shell arithmetic (`node_budget * 134 / 100`) rather than a second static
input, so a future override of `corpus{1,2}_node_budget` can't silently drift out of ratio with it:

```
WORK_BUDGET_C1=$(( ${{ inputs.corpus1_node_budget }} * 134 / 100 ))   # 50,000,000 -> 67,000,000
WORK_BUDGET_C2=$(( ${{ inputs.corpus2_node_budget }} * 134 / 100 ))   # 36,000,000 -> 48,240,000
```

`1.34` is not a new number invented for this fix — it's `DEFAULT_WORK_PER_MS x 8000ms / 20,000,000
nodes`, the exact ratio `solver-typical-budget-baseline.yml` already uses (`26,800,000/20,000,000`
and `67,000,000/50,000,000` — the corpus-1 figure matches this fix's derived value exactly).

## Result (confirmed 2026-08-06, full-scale CI run)

`solver-stress-refresh.yml` was dispatched on `main` at routine (default) settings after this fix
landed — [run 31127713030](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/31127713030),
completed in 38 minutes, committed `57d86bb9`. Same-methodology before/after (both compiled by the
identical workflow, only the `--work-budget` fix differing):

| | corpus-1 | corpus-2 |
|---|---:|---:|
| before (`fa629ab7`, 2026-08-06T05:30) | 95/102 | 684/1700 |
| after (`57d86bb9`, 2026-08-06T21:12) | 96/102 | 725/1700 |
| net | +1 | **+41** |

All 3 confirmed `--prime-winner`-miss `never-attempted` cases now solve outright:

```
R02634  node-budget-reached (36,000,000) -> success, 11 attempts, winner ida:default
R03160  node-budget-reached (36,000,000) -> success,  2 attempts, winner dfs:repair:repair
R02269  node-budget-reached (36,000,000) -> success,  3 attempts, winner beam:perimeterSweep/perimeterCW@beam2000
```

The 5 `starved-zero-nodes` cases (R02657, R00477, R02911, R00720, R02666) are still unsolved at the
36M node cap, but the mechanism is now demonstrably fixed even though the outcome isn't: R02657's
budget now genuinely spreads across 6 main-loop configs (4.2M–4.5M nodes each, where before one
attempt took 27M and the other 5 took 0); R02911's actual near-twin-identified winning profile,
`intersectionHarvest`, now gets a real 1,069,374-node attempt instead of 0. These 5 are now honestly
budget-limited rather than starved — a different, smaller problem than the one this fix targeted.

## Scope and what this does not do

- **CI/offline-batch tooling only.** No solver source (`orchestration.ts`, `attempts.ts`, etc.)
  changed — every production call site (Play/Editor/Review, all of which pass small explicit
  `timeBudgetMs` with no `nodeBudget`) is untouched, so `solver:bench --check` does not apply here;
  there is nothing in the solved/failed-set sense for it to check.
- **`solver-highbudget-unsolved-sweep.yml` has a related but much milder exposure** (default
  `budget_ms=75000` derives `workBudget ≈ 251M` against `node_budget=120M`, only ~2x headroom, not
  the 500-800x seen here) — not confirmed to cause the same catastrophic single-attempt monopoly, and
  not touched by this fix; worth a similar check before its next dispatch if the same symptom shows
  up there.
- **Does not change `--prime-winner`'s own default behavior.** The uncapped-miss-cost design
  documented in `primeAttemptFor()` is still exactly as risky as before *in isolation* — it was
  "proven harmless" only under the old wall-clock-binding regime (see that workflow's own
  2026-07-23 comment), and this fix addresses the now-real risk by making the workBudget ceiling
  bind again, not by capping the prime attempt itself. `--prime-budget-mult` remains available as a
  second, independent lever if a future run wants to bound prime-miss cost directly.

## Reproduce

```bash
node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- \
    --corpus=data/stress/stress-levels-random.json --levels=id:R02657,id:R03160 \
    --scheduler-mode=legacy --budget-ms=86400000 --node-budget=8000000 --work-budget=10720000 \
    --workers=1 --out=<file.json>
```

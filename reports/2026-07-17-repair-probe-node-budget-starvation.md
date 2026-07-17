# Repair-probe node-budget starvation: `repair-close`/`repair-far`'s entire population never reached the main loop (2026-07-17)

## Context

Campaign 1 of the solver-development-roadmap set out to diagnose why repair search stalls short
on the `repair-close` cluster's near-misses, starting from `R01698` (badness 2, must-cross-heavy).
Direct probing with `repair-direct-probe.mjs --races=8` found the corpus-recorded badness=2 only
reproducible at the exact production seed (0) with the must-turn-biased repair config — a real,
narrow near-miss, not a fluke. But investigating *why the rest of the solving pipeline never got a
second attempt at it* uncovered a much larger, systemic issue than any single level's diagnosis.

## Root cause

`orchestration.ts`'s early repair probe (`runRepairProbe`) never accepted or checked the caller's
external `nodeBudget` (`SolveOpts.nodeBudget`, the offline-tooling deterministic ceiling) at all —
it always ran its full internal worst case: the ordinary tier retried across
`REPAIR_PROBE_ORDINARY_SEED_SALTS` (2 seeds × `REPAIR_PROBE_ORDINARY_NODE_BUDGET` = up to
2,000,000 × 2 = 4,000,000 nodes), plus `REPAIR_PROBE_BIASED_NODE_BUDGET` (6,000,000) on any
must-turn level — up to **~10,000,000 nodes**, regardless of how small an external `nodeBudget`
the caller specified. `solveLevel()`'s own re-check *after* the probe returns
(`if (prep._metrics.nodesExpanded >= nodeBudget) ...`) could only report the overshoot after the
fact, never prevent it.

The GitHub Actions corpus-2 batch workflow (`.github/workflows/solver-corpus2-batch-*.yml`) runs
every level with `--node-budget=8000000` — smaller than the probe's own ~10,000,000-node worst
case on any must-turn level. Confirmed at scale against the real corpus-2 benchmark data
(`reports/stress/benchmark-latest-random.json`, the source of the current 237/1700-solved state):

```
total unsolved: 1464
status=node-budget-reached: 626
node-budget-reached AND every recorded attempt is repair (probe-only, main loop never ran): 621
```

**621/621** — an exact match with the combined size of the `repair-close` (114) and `repair-far`
(507) clusters in `reports/stress/unsolved-failure-clusters.json`. Every single member of both
clusters hit `node-budget-reached` with `attemptCount: 3` (2 ordinary-tier probe attempts + 1
biased-tier probe attempt) and **nothing else** — the main DFS/beam loop, the full 6x-budget
repair fallback, and the attraction-diversity last-resort pass **never ran on any of them**. The
overshoot itself was consistent and severe: `nodesExpanded` across all 621 levels ranged
9,871,388–10,000,121 (median 10,000,038) against the 8,000,000 target — a ~25% overshoot, every
time.

**This means the `repair-close`/`repair-far` cluster classification and "badness" ranking
(`reports/stress/unsolved-failure-clusters.json`) reflect only how close the early probe got —
never the full production solving pipeline.** Task 2's rescue-rate test
(`reports/2026-07-17-attraction-diversity-repair-cluster-test.md`) was unaffected by this
specific bug (it used `portfolio-solve-sweep.mjs` directly with no `--node-budget` set, so its
solves genuinely reached the main loop), but the *corpus-2 batch data that produced these
clusters in the first place* was not.

## Fix

`modules/solver/orchestration.ts`'s `runRepairProbe` now accepts the external `nodeBudget` and
caps **each seed-salt round's own node budget** (not just checks whether the ceiling was already
exceeded) by whatever's left of it:

```ts
const nodesSoFar = prep._metrics ? prep._metrics.nodesExpanded : 0;
const remainingExternal = nodeBudget === Infinity ? Infinity : Math.max(0, nodeBudget - nodesSoFar);
const probeNodeBudget = Math.min(fixedProbeNodeBudget, remainingExternal);
if (probeNodeBudget < 50) return { solution: null, attempts };
```

**A first version of this fix was wrong and caught by direct reproduction before landing**: it only
checked `nodesExpanded >= nodeBudget` *before* each round started, without capping the round's own
budget. Since a single round can cost up to 6,000,000 nodes (the biased tier) on its own, a check
that only looks at nodes spent *so far* still lets that one round blow straight through a much
smaller remaining headroom — reproduced directly on R01698: after the fix's first version,
`nodesExpanded` still landed at 10,000,084 against an 8,000,000 ceiling, unchanged from the
pre-fix behavior. The corrected version above (capping the round's *own* budget, not just gating
entry to it) brought that down to 8,000,055 — a negligible gate-level overshoot, the same
precision class as every other `nodeBudget` check in this file.

`solveLevel()`'s call site now threads `nodeBudget` through: `runRepairProbe(repairConfigs,
activeGates, level, prep, yieldFn, cfg, nodeBudget)`.

## Scope and safety

- **Zero effect on any caller that doesn't set a finite `nodeBudget`** (the overwhelming majority:
  interactive Play/Editor/Review, `solver:bench`, `stress:benchmark`, any script that doesn't pass
  `--node-budget`) — `nodeBudget` defaults to `Infinity`, so `remainingExternal` is `Infinity` and
  `probeNodeBudget = min(fixed, Infinity) = fixed`, byte-identical to before this fix.
- Confirmed via `npm run solver:bench -- --check`: published corpus 160/160, no regressions, 34.9s
  (matching the pre-fix baseline — expected, since the published corpus never sets `nodeBudget`
  and never reaches the probe in a starved state anyway).
- New regression test in `orchestration.test.ts`: a repair-gated level with `nodeBudget: 2_500_000`
  (below the ordinary tier's own 4,000,000-node combined worst case) now stays well under
  3,000,000 nodes instead of running to the full ~4,000,000 the fixed-budget-only behavior would
  have produced.

## Verification

- `tsc --noEmit`: clean.
- `npm run check:lint`: clean.
- `npx vitest run modules/solver`: 196/196 pass (1 new regression test).
- `npm run solver:bench -- --check`: published corpus 160/160, no regressions, 34.9s.
- Direct repro on R01698 (`nodeBudget: 8000000, timeBudgetMs: 8000`, matching the exact batch
  workflow settings): pre-fix `nodesExpanded: 10,000,084` (attemptCount 3, all repair); post-fix
  `nodesExpanded: 8,000,055` (attemptCount 3, all repair — this specific level's probe genuinely
  needs close to the full 8,000,000 to reach its own near-miss, so it still doesn't leave headroom
  for the main loop under this particular budget; see the follow-up report for how this plays out
  across a larger sample).

## Follow-ups

- **A 150-level sample sweep at the exact batch-workflow settings, measuring the real yield of this
  fix at scale (how many of the 621 now get real main-loop/fallback/diversity headroom, how many
  now solve), is in progress as a follow-up to this report** — see whichever
  `reports/2026-07-17-repair-probe-node-budget-starvation-impact*.md` file exists alongside this
  one for the results, or check `docs/solver-development-roadmap.md`'s Campaign 1 section if this
  note is stale.
- Whether the GitHub Actions batch workflow's `node_budget` default (8,000,000) should be raised is
  a separate, follow-up decision — now a much better-informed one, since this fix means the
  workflow's node budget is an honest ceiling rather than one the probe silently blows through by
  25%. A full corpus-2 re-run to actually pick that value and measure the real net effect is a
  meaningful resource commitment (20 parallel GitHub Actions jobs), better made once the sample
  data above is in.

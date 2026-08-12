# Worker-count solve-outcome sensitivity: follow-up investigation (2026-08-12)

**Status: one confirmed, previously-unknown bug found and demonstrated; the two pieces of evidence
in the originating report remain only partially explained.** This is a direct follow-up to
[`reports/2026-08-12-worker-count-solve-outcome-sensitivity.md`](2026-08-12-worker-count-solve-outcome-sensitivity.md)
(currently only on branch `claude/must-cross-intersection-propagation-0t3ljg`, not yet merged to
`main` — this report was written from that branch's copy, fetched via `git fetch`) and
[`reports/2026-08-12-neighbor-budget-five-loss-diagnosis.md`](2026-08-12-neighbor-budget-five-loss-diagnosis.md)
on the same branch. Read those first; this report does not restate their evidence.

## Summary

- **A real, confirmed, previously-undocumented bug**: `runRepairProbe`'s per-attempt wall-clock cap
  (`modules/solver/orchestration.ts:954`, a hardcoded `30000`ms) is not the "generous,
  contention-independent safety net" its own adjacent comment claims. Under realistic CPU
  contention it binds *before* the intended ~2,000,000-node probe budget, silently truncating
  search. Demonstrated directly with matched attempt-by-attempt node counts (below) — this is a
  genuine, reproducible instance of "hypothesis 3" (a wall-clock-gated decision not neutralized by
  a non-binding outer deadline), independent of and in addition to the one `docs/solver-budget-
  determinism.md` already documents.
- **This mechanism's direction does not match the corpus-scale gap's direction.** More
  contention → *less* search per probe attempt → *more* failures. But Evidence 2 in the originating
  report found *fewer* workers (less contention) doing *worse* (617 vs 665 solved) — the opposite
  sign. So while this bug is real and worth fixing, it is not a sufficient explanation for Evidence 2
  by itself.
- **`R02823`'s specific local irreproducibility could not be reproduced or explained.** In this
  environment, `R02823` failed identically (deterministic `node-budget-reached`) in *every*
  configuration tried, including running it completely alone with zero contention and zero
  predecessors — twice, with two different tools. The originating report's one successful "alone"
  solve was never itself repeated, so it is not yet known whether it was a stable result or a
  one-off. This is now a separate, still-open question from the general worker-count-sensitivity
  finding.
- **The worker-pool persistent-process state-leak hypothesis (hypothesis 2) is weakened, not
  confirmed.** A targeted code audit of every module-level mutable scratch buffer/cache in the
  solver's hot path found each one either already delta-based (immune to non-zero starting state:
  `workMeter`, `prep._metrics.nodesExpanded`-gated node budgets, the `prep._mpLowerBoundCache`/
  `prep._mcLowerBoundCache` lower-bound memoization) or correctly bounds-cleared per call for the
  *current* level's exact footprint before use (`search-state.ts`'s `_stateBufs`, `topology.ts`'s
  generation-tagged reachability buffers, `scoring.ts`'s pooled objective buffers) — several with
  code comments documenting they were themselves hardened after past bugs of exactly this shape.
  Empirically, `R02823`'s outcome did not change based on predecessor count within one persistent
  worker process (failed identically whether run alone, 5th of 10, or last of 10 in the same
  process) — evidence against the hypothesis for this level, though it does not rule the class of
  bug out everywhere.
- **The shard wall-clock-margin hypothesis is ruled out** for run `#34`: the slowest corpus-2 shard
  used ~78 of its 300-minute ceiling (26%); the slowest corpus-1 shard used ~2.3 of 45 minutes.

## Environment note (read before the evidence below)

This investigation ran in a fresh sandbox, not the environment that produced the originating
report. Two things were verified before trusting any comparison:

- **Solver code is byte-identical.** `git diff --stat` between this session's branch tip
  (`9a7c4e8f`) and the originating report's branch tip (`6cc3cea4`, on
  `claude/must-cross-intersection-propagation-0t3ljg`) shows zero changes under `modules/solver/`
  and zero changes to either stress corpus JSON file — only docs, two new report files, and a
  3-line `scripts/ablation-config.mjs` edit (removing `PRUNE_MC_NEIGHBOR_BUDGET` from the CLI
  tooling's opt-in registry; this has no effect on any of the runs below, all of which pass no
  `--enable-flags`, so `opts.ablation` is `undefined` end to end and every prune reads its
  browser-bundled default regardless of the CLI registry's state — confirmed by reading
  `normalizeAblationConfig`, which returns `null` outright for a `null`/`undefined` input).
- **The sandbox is a 4-core, 15GB machine, Node v22.22.2.** Production/CI targets Node 20
  (`.github/workflows/solver-stress-refresh.yml`'s `setup-node`); this sandbox does not have Node
  20 available to test against, so a Node-major-version effect on the search's exact node-by-node
  behavior could not be ruled in or out here. Flagged as an open variable, not investigated further
  (installing an alternate Node major was judged out of scope for the time available).

## Evidence: `R02823` fails in every local configuration tried

All runs below use the same fixed budget as the originating report and the real workflow:
`--node-budget=36000000 --work-budget=48240000`, non-binding deadline (`--budget-ms=86400000` for
the `portfolio-solve-sweep.mjs` runs; `--budget-ms=600000` for the `level-blind-capability-
sweep.mjs` runs, still far above the ~65s actual runtime), no `--enable-flags`/`--disable-flags`
(default ablation config, matching the originating report's "OFF arm").

| scenario | tool | workers | contention | result |
|---|---|---|---:|---|
| alone | `level-blind-capability-sweep.mjs` | 1 | none | `node-budget-reached`, 36,000,188 nodes |
| alone, repeated | `level-blind-capability-sweep.mjs` | 1 | none | `node-budget-reached`, 36,000,052 nodes (same outcome, near-identical node count) |
| alone | `portfolio-solve-sweep.mjs` | 2 | none | `node-budget-reached`, 36,000,068 nodes |
| last of 10, sequential | `level-blind-capability-sweep.mjs` | 1 | some (see caveat) | `node-budget-reached` |
| 4th of 5, sequential | `portfolio-solve-sweep.mjs` | 1 | some (see caveat) | `node-budget-reached`, 36,000,159 nodes |
| 4th of 5, contended | `portfolio-solve-sweep.mjs` | 4 | yes (4 procs / 4 cores) | `node-budget-reached`, 36,000,186 nodes |

**Caveat on the "sequential" rows**: the 10-level and 5-level sequential (`--workers=1`) runs were
launched as background jobs and, checking the actual wall-clock overlap after the fact, ran
*concurrently with each other* for part of their duration (not intentional — background jobs were
started while an earlier one was still in flight). So neither "sequential" row is a clean
zero-contention baseline; both may have experienced some of the same wall-clock pressure as the
explicit `--workers=4` row. The two "alone" rows are the only ones run in true isolation (nothing
else executing), and both still failed.

**The clean result**: `R02823` fails identically whether run completely alone or with contention,
in this environment. This directly contradicts the originating report's Evidence 1, which found a
single alone run *solving* the level in 9,308,917 nodes via `dfs:repair:repair(mustTurnBiased)`.
That alone-success was never itself repeated in the originating investigation to check its own
stability. Given every other search behavior verified below is exactly reproducible run-to-run on
a fixed host, the most likely explanation for this specific discrepancy is a difference between
this sandbox and whatever host produced the original "solved alone" result — not worker count or
predecessor state, since those are exactly what is held constant across the two "alone" rows above
while the result stays `node-budget-reached` either way.

## Confirmed mechanism: `runRepairProbe`'s 30-second wall-clock cap is not actually non-binding

While investigating, the four *other* neighbor-budget losses (`R00635`, `R02119`, `R02422`,
`R02867` — all confirmed solvable, unlike `R02823`) were re-solved as part of the same `--workers=1`
vs `--workers=4` comparison batch (`pos:98,450,753,1154,1198`). All four solved in both arms, via
the identical winning attempt config and — for `R00635` — the byte-identical solution path. But the
node cost of the *losing* attempts before that winner ran differed substantially between arms:

`R00635`, `--workers=1` sequential vs `--workers=4` contended (`portfolio-solve-sweep.mjs`, same
level, same code, same budgets):

| attempt (in ladder order) | profile / seed | `--workers=1` nodes | `--workers=4` nodes | outcome (both) |
|---|---|---:|---:|---|
| 1 | `repair`, seed `554456023` | 2,000,014 | 1,110,690 | timed-out |
| 2 | `repair`, seed `3208325734`, salt 1 | 2,000,019 | 1,114,904 | timed-out |
| 3 | `repair`, seed `554456023` (2nd variant) | 1,974,492 | 1,324,223 | timed-out |
| 4 (winner) | `intersectionHarvest@beam5000` | 432,531 | 432,531 | **success**, identical solution |

Total level cost: 6,407,056 nodes (`--workers=1`) vs 3,982,348 nodes (`--workers=4`) — a 38% node
count difference to reach the *exact same* winning solution.

The first three attempts are all repair-probe attempts, dispatched from `runRepairProbe`
(`modules/solver/orchestration.ts:896-961`). Their per-attempt call is:

```js
// modules/solver/orchestration.ts:954
const r = await runAttempt(gateKey, level, prep, repairConfig, 30000, Date.now(), yieldFn, gateNodeBudget, nodesOut, seedSalt);
```

`30000` is a **hardcoded 30-second wall-clock budget**, passed as the `capMs` argument. The
adjacent comment (lines 949-952) explicitly frames this as safe to ignore:

> "attBudget (ms) is a generous safety-net trip-wire only, well above any observed real-world cost
> for a probe-worthy (node-budget-bounded) win — the node budget above is the actual,
> contention-independent decision"

`runAttempt` threads this `capMs` down into the actual search loop
(`dfsFromGate`/`repairSearchFromGate`/`beamSearchFromGate` in `search.ts`/`repair-search.ts`), each
of which exits on **whichever bound is hit first**:

```js
// modules/solver/search.ts:525 (representative; repair-search.ts:… has the same OR pattern)
if (Date.now() - startTime >= budgetMs || nodesExpandedTotal + frontierIndex >= nodeBudget || ...) { ... return null; }
```

Under `--workers=1` with nothing else running, each repair-probe attempt reliably reaches its
intended ~2,000,000-node cap inside 30 real seconds. Under `--workers=4` on this 4-core sandbox
(4 solver processes sharing 4 cores — not even oversubscribed, just fully subscribed), the *same*
attempts hit the 30-second wall clock at only ~1,100,000-1,300,000 nodes — 35-45% short of their
intended budget — because the process's real-world node-processing rate drops under CPU sharing,
and the wall-clock check has no way to know that. The node-budget accounting inside `runRepairProbe`
(`gateNodeBudget`, `remainingExternal`, etc.) is completely unaffected — it correctly reserves and
tracks node counts — but never gets the chance to be the *binding* constraint, because the
wall-clock check trips first.

This is a genuine violation of the canonical work-budget model's documented host-independence
invariant (`docs/solver-budget-determinism.md`: "Given an explicit `workBudget` and a deadline that
never fires, a solve is bit-identical on any host under any load"), located specifically in one
literal (`orchestration.ts:954`'s `30000`) that is structurally different from every other
`runAttempt` call site in the file — every other site derives its ms budget from the caller's
`timeBudgetMs` (which callers can and do set to a non-binding 24h value); this is the only one that
is a small fixed constant *regardless of what the caller's outer deadline is*, which is exactly what
makes it able to bind even when every other part of the ladder is correctly non-binding.

**For `R00635` this did not change the outcome** — the eventual winner (`intersectionHarvest@beam5000`)
is a beam attempt outside `runRepairProbe`, running to the identical 432,531 nodes and finding the
identical solution regardless of how much the earlier probe attempts were truncated. But for any
level whose *only* solution the ladder can find lies within the repair probe's own bounded search
(rather than a later, unaffected tier), this same truncation could plausibly flip a solve to a
failure under contention. This was not directly demonstrated for any specific level in this session
— `R02823`'s own probe attempts (see below) mostly did reach their full node quota even under
`--workers=4`, so this specific mechanism does not appear to be what makes `R02823` fail — but the
mechanism itself is real and demonstrated, and is very likely present, to varying degree, on other
repair-gated levels across both stress corpora.

**Why this does not fully explain the corpus-scale gap (Evidence 2).** The mechanism's direction is
"more contention → less search per probe attempt → more failures." A GitHub Actions shard running
`corpus2_workers=2` puts *two* processes on one runner's cores (more contention per shard), while
`corpus2_workers=1` puts *one* process on the same runner (less contention, ordinarily *more*
headroom per attempt). If this mechanism dominated at corpus scale, `workers=1` should show *fewer*
probe truncations and therefore *more* solves than `workers=2` — the opposite of what Evidence 2
found (617 at `workers=1` vs 665 at `workers=2`). So this bug is real, reproducible, and worth
fixing on its own terms, but it is not — at least not by this directional argument — a sufficient
explanation for the specific corpus-scale gap the originating report measured. It should be
understood as an independent, second confirmed instance of "hypothesis 3" (a wall-clock decision
that isn't actually neutralized by a non-binding deadline), found via the investigation protocol,
rather than as the root cause of either piece of evidence in the originating report.

## `R02823`'s own probe attempts, for completeness

For contrast with `R00635` above, `R02823`'s first three (probe-tier) attempts under the same
`--workers=1` vs `--workers=4` comparison:

| attempt | `--workers=1` nodes | `--workers=4` nodes |
|---|---:|---:|
| 1 | 2,000,000 | 2,000,000 |
| 2 | 2,000,012 | 2,000,012 |
| 3 | 3,411,791 | 1,847,678 |

Attempts 1-2 reach their full node quota in *both* arms (so the wall-clock mechanism above is not
truncating them here); attempt 3 does show the same truncation pattern as `R00635`'s attempts, but
neither arm goes on to solve the level regardless — both exhaust the full external 36,000,000-node
ceiling and report `node-budget-reached`. So the confirmed mechanism is present in this level's own
telemetry too, just not (as far as this data shows) the deciding factor in why it fails here.

## Ruled out / weakened this session

- **Shard wall-clock margin for run `#34`** (`31555042628`): pulled actual job step durations via
  the GitHub Actions API. Slowest corpus-2 shard (`Capability shard 2/20`) ran 77.8 of its 300-minute
  `timeout` ceiling (26%); slowest corpus-1 shard ran 2.3 of 45 minutes (5%). No shard came close to
  truncation. Ruled out.
- **Worker-pool persistent-process state leak (hypothesis 2), specifically for `R02823`.** Audited
  every module-level mutable buffer/cache reachable from the solver's hot path
  (`work-meter.ts`'s `workMeter.units`, `orchestration.ts`'s `prep._metrics`/lower-bound caches,
  `search-state.ts`'s `_stateBufs` pool, `topology.ts`'s generation-tagged reachability scratch,
  `lower-bounds.ts`'s MST scratch arrays, `scoring.ts`'s pooled objective buffers). Every one is
  either keyed/delta-based against a fresh per-solve object (`prep`, recreated every `solveLevel()`
  call) or explicitly cleared for the *current* level's exact footprint before each use, with
  several carrying comments documenting they were hardened after past bugs of exactly this shape
  (the MST scratch buffer bug, the reachability generation-counter rollover). Found no new instance.
  Empirically, `R02823` failed identically regardless of queue position (alone / 5th-of-10 /
  10th-of-10 / 4th-of-5), which is the outcome this hypothesis predicts should vary. Not proven
  impossible everywhere, but not supported by anything found or measured this session.
- **Solver code / corpus data drift between the two compared commits**: re-confirmed independently
  (see "Environment note" above) — zero diff in `modules/solver/` or either stress corpus JSON.

## Still open

1. **Why did `R02823` solve once, for the originating report's author, and never for this session
   across five different local configurations?** Not resolved. The search is proven deterministic
   on a fixed host (repeat runs are byte-close in node count and identical in outcome), so this
   points to *something* about execution context differing between the two sessions — most likely
   the underlying machine/Node version, since solver code and corpus data are confirmed identical —
   but this was not identified. Suggest, if anyone revisits this: get the exact Node version and
   CPU architecture the originating report's session ran on, and if different, try to reproduce on
   a matching one.
2. **What actually explains Evidence 2's corpus-scale, directionally-consistent 48-level gap?** The
   mechanism found this session runs the wrong direction to explain it. Two candidates not yet
   tested: (a) GitHub-hosted runners are not guaranteed identical hardware between separate
   workflow-dispatch runs (even though each run's 20 shards run in parallel, a *different* dispatch
   on a *different* day could draw different runner generations) — if the solver has any genuine
   hardware-dependent behavior beyond the contention effect found here, comparing run `#33` and
   run `#34` is implicitly also comparing whatever hardware GitHub happened to assign each time,
   confounded with the worker-count difference; (b) a *different* wall-clock-gated decision,
   elsewhere in the ladder, whose directional sensitivity to contention runs the other way from the
   one found here. Neither was investigated further this session.
3. **A proper fix for the confirmed `runRepairProbe` bug** (`orchestration.ts:954`). Not implemented
   here — this is hot-path orchestration code, and CLAUDE.md's own rules require a regression test
   plus a full `solver:bench --check` and a before/after cost comparison on the full corpus before
   any hot-path change can be considered verified; that full validation pass was judged out of scope
   for the time available this session, and the task's instructions explicitly warned against
   touching in-flight experiment configuration. The scoped fix is straightforward in shape: replace
   the flat `30000` with a value that cannot bind before the attempt's own `gateNodeBudget` under
   any realistic per-node cost (e.g., derived from `gateNodeBudget` and a conservative worst-case
   nodes/sec floor, or simply raised by an order of magnitude, since the comment's own intent was
   "never actually the binding constraint") — but implementing and validating it is real follow-up
   work, not attempted here.

## Reproducing

```bash
# Clean alone (no contention) — reproduces R02823 failing even in isolation:
node scripts/run-bundled.mjs scripts/level-blind-capability-sweep.mjs -- \
  --corpus=data/stress/stress-levels-random.json --levels="pos:1154" \
  --budget-ms=600000 --node-budget=36000000 --work-budget=48240000 --workers=1 \
  --out=<file> --summary-out=<file>

# Contention comparison — reproduces the confirmed runRepairProbe wall-clock truncation on R00635:
node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- \
  --corpus=data/stress/stress-levels-random.json --levels=pos:98,pos:450,pos:753,pos:1154,pos:1198 \
  --scheduler-mode=legacy --budget-ms=86400000 --node-budget=36000000 --work-budget=48240000 \
  --workers=1 --out=<file-w1> --summary-out=<summary-w1>
# then --workers=4 --out=<file-w4> --summary-out=<summary-w4>, and diff attempts[].nodesExpanded for R00635.
```
